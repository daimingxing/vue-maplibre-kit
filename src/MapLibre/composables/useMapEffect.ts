import {
  computed,
  onBeforeUnmount,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import type {
  MapFeatureStatePatch,
  MapFeatureStateTarget,
  MapLibreInitExpose,
} from '../core/mapLibre-init.types';

/** 简化后的 MapLibre 表达式值。 */
type MapExpressionValue = any;

/** 可直接写入 feature-state 的底层地图对象。 */
interface RawMapFeatureStateHost {
  /** MapLibre 原生的 setFeatureState 方法。 */
  setFeatureState?: (target: MapFeatureStateTarget, state: MapFeatureStatePatch) => void;
  /** vue-maplibre-gl 常见的 map 包装字段。 */
  map?: unknown;
  /** 兼容 Ref / 包装对象。 */
  value?: unknown;
}

/** useMapEffect 可接收的目标输入。 */
export type MapEffectTargetInput =
  | MapLibreInitExpose
  | RawMapFeatureStateHost
  | null
  | undefined;

/** 单个 feature-state 分支配置。 */
export interface FeatureStateExpressionOptions {
  /** 默认值；既可以是字面量，也可以是原生 MapLibre 表达式。 */
  default: MapExpressionValue;
  /** feature-state.selected 为 true 时返回的值。 */
  selected?: MapExpressionValue;
  /** feature-state.hover 为 true 时返回的值。 */
  hover?: MapExpressionValue;
  /** feature-state.isFlashing 为 true 时返回的值。 */
  isFlashing?: MapExpressionValue;
  /** 额外自定义的 feature-state 分支。 */
  states?: Record<string, MapExpressionValue>;
  /** 状态优先级，越靠前优先级越高。 */
  order?: string[];
}

/** 单个闪烁目标的内部调度记录。 */
interface FlashingTargetRecord {
  /** 当前闪烁目标。 */
  target: MapFeatureStateTarget;
  /** 当前目标使用的闪烁频率。 */
  intervalMs: number;
  /** 当前目标独立定时器句柄。 */
  timer: ReturnType<typeof globalThis.setInterval> | null;
  /** 当前目标最近一次写入的闪烁布尔值。 */
  flashToggle: boolean;
}

/** useMapEffect 返回结果。 */
export interface UseMapEffectResult {
  /** 当前所有正在闪烁的要素目标。 */
  flashingTargets: ComputedRef<MapFeatureStateTarget[]>;
  /** 当前是否至少存在一个闪烁目标。 */
  hasFlashing: ComputedRef<boolean>;
  /** 判断指定要素当前是否处于闪烁状态。 */
  isFeatureFlashing: (
    targetOrSource: MapFeatureStateTarget | string,
    id?: MapFeatureStateTarget['id']
  ) => boolean;
  /** 开启指定要素闪烁。 */
  startFlash: {
    /** 直接传入标准目标对象；第二个参数可选传入独立闪烁频率。 */
    (target: MapFeatureStateTarget, intervalMs?: number): boolean;
    /** 传入 sourceId + featureId；第三个参数可选传入独立闪烁频率。 */
    (
      targetOrSource: string,
      id: MapFeatureStateTarget['id'],
      intervalMs?: number
    ): boolean;
  };
  /** 停止指定要素闪烁。 */
  stopFlash: (
    targetOrSource: MapFeatureStateTarget | string,
    id?: MapFeatureStateTarget['id']
  ) => boolean;
  /** 清空当前全部闪烁目标。 */
  clearFlash: () => void;
}

/**
 * 构建 feature-state 判断表达式。
 * @param stateKey feature-state 键名
 * @param activeValue 状态为 true 时使用的值
 * @param defaultValue 状态为 false 时回退的值
 * @returns 标准的 MapLibre case 表达式
 */
export function withFeatureState(
  stateKey: string,
  activeValue: MapExpressionValue,
  defaultValue: MapExpressionValue
): any {
  return ['case', ['boolean', ['feature-state', stateKey], false], activeValue, defaultValue];
}

/**
 * 构建多状态优先级表达式。
 * 适合业务层用简洁对象描述 selected / hover / isFlashing 等常见样式分支，
 * 同时仍允许 default 或各状态值继续传入原生表达式。
 * @param options 状态表达式配置
 * @returns 最终可直接写入 paint/layout 的表达式或字面量
 */
export function createFeatureStateExpression(
  options: FeatureStateExpressionOptions
): MapExpressionValue {
  const { default: defaultValue, selected, hover, isFlashing, states, order } = options;
  const orderedKeys = [...new Set([...(order || ['isFlashing', 'selected', 'hover'])])];
  const stateValueMap = new Map<string, MapExpressionValue>();

  if (typeof isFlashing !== 'undefined') {
    stateValueMap.set('isFlashing', isFlashing);
  }
  if (typeof selected !== 'undefined') {
    stateValueMap.set('selected', selected);
  }
  if (typeof hover !== 'undefined') {
    stateValueMap.set('hover', hover);
  }

  Object.entries(states || {}).forEach(([stateKey, stateValue]) => {
    if (typeof stateValue !== 'undefined') {
      stateValueMap.set(stateKey, stateValue);
    }
  });

  const mergedOrder = [...new Set([...orderedKeys, ...stateValueMap.keys()])];
  let expression: MapExpressionValue = defaultValue;

  for (let index = mergedOrder.length - 1; index >= 0; index -= 1) {
    const stateKey = mergedOrder[index];
    if (!stateValueMap.has(stateKey)) {
      continue;
    }

    expression = withFeatureState(stateKey, stateValueMap.get(stateKey), expression);
  }

  return expression;
}

/**
 * 规范化 feature-state 目标。
 * @param targetOrSource 目标对象或 sourceId
 * @param id 要素原生 ID
 * @returns 标准化后的目标；参数不足时返回 null
 */
function normalizeFeatureStateTarget(
  targetOrSource: MapFeatureStateTarget | string,
  id?: MapFeatureStateTarget['id']
): MapFeatureStateTarget | null {
  if (typeof targetOrSource === 'string') {
    if (typeof id === 'undefined' || id === null) {
      return null;
    }

    return {
      source: targetOrSource,
      id,
    };
  }

  return targetOrSource;
}

/**
 * 生成内部注册表使用的稳定 key。
 * @param target 标准化后的目标
 * @returns 唯一 key
 */
function buildFeatureStateKey(target: MapFeatureStateTarget): string {
  return `${target.source}::${target.sourceLayer || ''}::${target.id}`;
}

/**
 * 规范化闪烁频率。
 * @param nextIntervalMs 业务层传入的频率
 * @param defaultIntervalMs useMapEffect 默认频率
 * @returns 合法频率；非法值统一回退到默认值
 */
function normalizeFlashIntervalMs(nextIntervalMs: unknown, defaultIntervalMs: number): number {
  if (
    typeof nextIntervalMs === 'number' &&
    Number.isFinite(nextIntervalMs) &&
    nextIntervalMs > 0
  ) {
    return nextIntervalMs;
  }

  return defaultIntervalMs;
}

/**
 * 从任意输入中解析底层原生 map。
 * 兼容原生 map、vue-maplibre-gl 返回对象以及 Ref 包装对象。
 * @param target 当前目标输入
 * @returns 具备 setFeatureState 的底层 map；不存在时返回 null
 */
function resolveRawMapFeatureStateHost(target: unknown): RawMapFeatureStateHost | null {
  if (!target || typeof target !== 'object') {
    return null;
  }

  const rawTarget = target as RawMapFeatureStateHost;

  if (typeof rawTarget.setFeatureState === 'function') {
    return rawTarget;
  }

  if (rawTarget.value) {
    const valueHost = resolveRawMapFeatureStateHost(rawTarget.value);
    if (valueHost) {
      return valueHost;
    }
  }

  if (rawTarget.map) {
    const mapHost = resolveRawMapFeatureStateHost(rawTarget.map);
    if (mapHost) {
      return mapHost;
    }
  }

  return null;
}

/**
 * 解析当前输入对应的 feature-state 写入器。
 * 优先复用 MapLibreInitExpose 提供的门面方法，避免业务层直连底层 map。
 * @param targetInput 当前传入的地图目标
 * @returns 可用的 feature-state 写入器；不可用时返回 null
 */
function resolveFeatureStateWriter(
  targetInput: MaybeRefOrGetter<MapEffectTargetInput>
): ((target: MapFeatureStateTarget, state: MapFeatureStatePatch) => boolean) | null {
  const resolvedTarget = toValue(targetInput);

  if (!resolvedTarget) {
    return null;
  }

  if (
    typeof (resolvedTarget as MapLibreInitExpose).setMapFeatureState === 'function'
  ) {
    return (target, state) => {
      return (resolvedTarget as MapLibreInitExpose).setMapFeatureState(target, state);
    };
  }

  const rawMapHost = resolveRawMapFeatureStateHost(resolvedTarget);
  if (!rawMapHost?.setFeatureState) {
    return null;
  }

  return (target, state) => {
    rawMapHost.setFeatureState?.(target, state);
    return true;
  };
}

/**
 * 地图动效调度器 Hook。
 * 现在既支持直接传入 `mapInitRef`，也兼容历史上的底层 map 输入，
 * 推荐业务层优先传入 `MapLibreInit` 的公开实例引用。
 * @param targetInput 地图目标输入
 * @param intervalMs 闪烁频率（毫秒），默认 500ms
 * @returns 闪烁控制方法与响应式状态
 */
export function useMapEffect(
  targetInput: MaybeRefOrGetter<MapEffectTargetInput>,
  intervalMs = 500
): UseMapEffectResult {
  const flashingRegistry = new Map<string, FlashingTargetRecord>();
  const flashingTargetsRef = shallowRef<MapFeatureStateTarget[]>([]);
  const flashingKeySet = computed(() => {
    return new Set(flashingTargetsRef.value.map((target) => buildFeatureStateKey(target)));
  });
  const flashingTargets = computed(() => {
    return [...flashingTargetsRef.value];
  });
  const hasFlashing = computed(() => flashingTargetsRef.value.length > 0);

  /**
   * 同步对外暴露的闪烁目标快照，保证业务层读取结果具备响应式。
   */
  function syncFlashingTargets(): void {
    flashingTargetsRef.value = [...flashingRegistry.values()].map((record) => record.target);
  }

  /**
   * 将最新状态写入底层地图。
   * @param target 目标要素
   * @param state 需要写入的状态补丁
   * @returns 是否写入成功
   */
  function applyFeatureState(target: MapFeatureStateTarget, state: MapFeatureStatePatch): boolean {
    const writer = resolveFeatureStateWriter(targetInput);
    if (!writer) {
      return false;
    }

    return writer(target, state);
  }

  /**
   * 停止指定目标的独立定时器。
   * @param record 当前目标记录
   */
  function stopTargetTimer(record: FlashingTargetRecord): void {
    if (record.timer !== null) {
      clearInterval(record.timer);
      record.timer = null;
    }
  }

  /**
   * 启动或重启指定目标的独立闪烁定时器。
   * @param record 当前目标记录
   */
  function startTargetTimer(record: FlashingTargetRecord): void {
    stopTargetTimer(record);
    record.timer = globalThis.setInterval(() => {
      record.flashToggle = !record.flashToggle;
      applyFeatureState(record.target, { isFlashing: record.flashToggle });
    }, record.intervalMs);
  }

  /**
   * 判断指定要素当前是否处于闪烁状态。
   * @param targetOrSource 目标对象或 sourceId
   * @param id 要素原生 ID
   * @returns 当前是否正在闪烁
   */
  function isFeatureFlashing(
    targetOrSource: MapFeatureStateTarget | string,
    id?: MapFeatureStateTarget['id']
  ): boolean {
    const target = normalizeFeatureStateTarget(targetOrSource, id);
    if (!target) {
      return false;
    }

    return flashingKeySet.value.has(buildFeatureStateKey(target));
  }

  /**
   * 开启指定要素闪烁。
   * @param targetOrSource 目标对象或 sourceId
   * @param idOrInterval 目标对象模式下表示频率；sourceId 模式下表示要素 ID
   * @param nextIntervalMs sourceId 模式下可选传入独立闪烁频率
   * @returns 是否成功启用或更新闪烁
   */
  function startFlash(target: MapFeatureStateTarget, intervalMs?: number): boolean;
  function startFlash(
    targetOrSource: string,
    id: MapFeatureStateTarget['id'],
    intervalMs?: number
  ): boolean;
  function startFlash(
    targetOrSource: MapFeatureStateTarget | string,
    idOrInterval?: MapFeatureStateTarget['id'] | number,
    nextIntervalMs?: number
  ): boolean {
    const target =
      typeof targetOrSource === 'string'
        ? normalizeFeatureStateTarget(targetOrSource, idOrInterval as MapFeatureStateTarget['id'])
        : normalizeFeatureStateTarget(targetOrSource);
    if (!target) {
      return false;
    }

    const targetIntervalMs = normalizeFlashIntervalMs(
      typeof targetOrSource === 'string' ? nextIntervalMs : idOrInterval,
      intervalMs
    );
    const targetKey = buildFeatureStateKey(target);
    const existedRecord = flashingRegistry.get(targetKey);
    if (existedRecord) {
      existedRecord.target = target;
      existedRecord.intervalMs = targetIntervalMs;
      startTargetTimer(existedRecord);
      syncFlashingTargets();
      return true;
    }

    const targetRecord: FlashingTargetRecord = {
      target,
      intervalMs: targetIntervalMs,
      timer: null,
      flashToggle: false,
    };

    flashingRegistry.set(targetKey, targetRecord);
    syncFlashingTargets();
    startTargetTimer(targetRecord);
    return true;
  }

  /**
   * 停止指定要素闪烁，并将其 isFlashing 状态恢复为 false。
   * @param targetOrSource 目标对象或 sourceId
   * @param id 要素原生 ID
   * @returns 目标是否原本处于闪烁状态
   */
  function stopFlash(
    targetOrSource: MapFeatureStateTarget | string,
    id?: MapFeatureStateTarget['id']
  ): boolean {
    const target = normalizeFeatureStateTarget(targetOrSource, id);
    if (!target) {
      return false;
    }

    const targetKey = buildFeatureStateKey(target);
    const existedRecord = flashingRegistry.get(targetKey);
    const existed = Boolean(existedRecord);
    if (existedRecord) {
      stopTargetTimer(existedRecord);
      flashingRegistry.delete(targetKey);
    }

    if (existed) {
      syncFlashingTargets();
    }

    applyFeatureState(target, { isFlashing: false });

    return existed;
  }

  /**
   * 清空当前全部闪烁目标，并统一恢复样式状态。
   */
  function clearFlash(): void {
    if (flashingRegistry.size === 0) {
      return;
    }

    [...flashingRegistry.values()].forEach((record) => {
      stopTargetTimer(record);
      applyFeatureState(record.target, { isFlashing: false });
    });

    flashingRegistry.clear();
    syncFlashingTargets();
  }

  onBeforeUnmount(() => {
    clearFlash();
  });

  return {
    flashingTargets,
    hasFlashing,
    isFeatureFlashing,
    startFlash,
    stopFlash,
    clearFlash,
  };
}
