import type { ResolvedTerradrawSnapOptions } from '../plugins/types';
import type { MapFeatureSnapResult } from '../plugins/map-feature-snap';
import type { TerradrawSnapSharedOptions } from '../shared/mapLibre-controls-types';
import {
  TerraDraw,
  type TerraDrawMouseEvent,
} from 'terra-draw';

/** TerraDraw 模式局部补丁。 */
type TerradrawModePatch = Record<string, unknown>;

/** TerraDraw ready 前的挂起同步状态。 */
interface TerradrawReadySyncState {
  /** ready 前暂存的同步任务；同名任务只保留最后一次。 */
  tasks: Map<string, () => void>;
  /** 当前实例已注册的 ready 监听器。 */
  handler?: () => void;
}

/** TerraDraw ready 可执行守卫。 */
type EnsureTerradrawReadyForModeSync = (
  drawInstance: TerraDraw | null | undefined,
  taskKey: string,
  retryTask: () => void
) => drawInstance is TerraDraw;

/** TerraDraw 需要同步吸附配置的绘制模式。 */
const TERRADRAW_SNAP_MODE_NAMES = ['point', 'linestring', 'polygon'] as const;

/**
 * TerraDraw 模式吸附补丁。
 * 统一描述 linestring / polygon 模式需要写回的吸附配置。
 */
interface TerradrawSnappingPatch extends TerradrawModePatch {
  /** TerraDraw 模式指针容差。 */
  pointerDistance: number;
  /** TerraDraw 模式吸附配置。 */
  snapping: {
    toLine?: boolean;
    toCoordinate?: boolean;
    toCustom?: (event: TerraDrawMouseEvent) => [number, number] | undefined;
  };
}

/** TerraDraw 合并地图与已绘制要素后的内部吸附状态。 */
type TerradrawCustomSnapResolution =
  | { status: 'matched'; coordinate: [number, number] }
  | { status: 'unmatched' }
  | { status: 'invalid' };

/** TerraDraw 自定义吸附可使用的候选来源。 */
interface TerradrawCustomSnapSources {
  /** 解析普通地图业务图层吸附结果。 */
  resolveMapResult?: (event: TerraDrawMouseEvent) => MapFeatureSnapResult | null | undefined;
  /** 解析 TerraDraw 已绘制要素吸附结果。 */
  resolveDrawnResult?: (event: TerraDrawMouseEvent) => MapFeatureSnapResult | null | undefined;
}

type TerradrawModeDragCallback = (event: TerraDrawMouseEvent, setMapDraggability: (enabled: boolean) => void) => void;

interface TerradrawGuardableMode {
  onClick?: (event: TerraDrawMouseEvent) => void;
  onMouseMove?: (event: TerraDrawMouseEvent) => void;
  onDragStart?: TerradrawModeDragCallback;
  onDrag?: TerradrawModeDragCallback;
  onDragEnd?: TerradrawModeDragCallback;
  /** TerraDraw 内置 mode 的 provisional 清理入口；仅在 invalid 拖拽中使用。 */
  cleanUp?: () => void;
}

interface TerradrawModeGuardState {
  coordinator: TerradrawSnapInputCoordinator;
  dragBlocked: boolean;
}

const terradrawModeGuardStates = new WeakMap<object, TerradrawModeGuardState>();

/**
 * 判断错误是否来自 TerraDraw 未注册指定模式。
 * @param error 捕获到的异常
 * @returns 是否为缺失模式异常
 */
function isMissingTerradrawModeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('No mode with this name present');
}

/**
 * 安全地同步 TerraDraw 某个模式的最新配置。
 * 若当前控件未启用该模式，则静默忽略，避免同步吸附配置时打断正常页面逻辑。
 * @param drawInstance 当前 TerraDraw 实例
 * @param modeName 需要同步的模式名称
 * @param modeOptions 该模式最新的局部配置
 */
function safeUpdateTerradrawModeOptions(
  drawInstance: TerraDraw | null | undefined,
  modeName: string,
  modeOptions: TerradrawModePatch
): void {
  if (!drawInstance?.updateModeOptions) {
    return;
  }

  try {
    drawInstance.updateModeOptions(modeName, modeOptions);
  } catch (error) {
    if (isMissingTerradrawModeError(error)) {
      return;
    }

    console.warn(`[MapFeatureSnap] 同步模式 '${modeName}' 吸附配置失败`, error);
  }
}

/**
 * 构建 TerraDraw 自定义吸附解析器。
 * 同时读取业务图层吸附和已绘制要素吸附，并按屏幕距离选择最近结果。
 * @param options 自定义吸附解析来源
 * @returns TerraDraw mode 可使用的 toCustom 回调
 */
export function buildTerradrawCustomSnapResolver(options: {
  /** 解析普通地图业务图层吸附结果。 */
  resolveMapResult?: (event: TerraDrawMouseEvent) => MapFeatureSnapResult | null | undefined;
  /** 解析 TerraDraw 已绘制要素吸附结果。 */
  resolveDrawnResult?: (event: TerraDrawMouseEvent) => MapFeatureSnapResult | null | undefined;
}): (event: TerraDrawMouseEvent) => [number, number] | undefined {
  return (event) => {
    const resolution = resolveTerradrawCustomSnap(event, options);
    return resolution.status === 'matched' ? [...resolution.coordinate] : undefined;
  };
}

/**
 * 合并同一次 TerraDraw 输入的地图与已绘制要素吸附结果。
 * 任一已启用来源返回 invalid 时必须阻断其他来源，只有全部来源正常时才比较 matched 距离。
 * @param event 当前 TerraDraw 指针事件
 * @param sources 当前启用的自定义吸附来源
 * @returns TerraDraw 内部 matched、unmatched 或 invalid 状态
 */
function resolveTerradrawCustomSnap(
  event: TerraDrawMouseEvent,
  sources: TerradrawCustomSnapSources
): TerradrawCustomSnapResolution {
  const results = [
    sources.resolveMapResult?.(event) || null,
    sources.resolveDrawnResult?.(event) || null,
  ].filter((result): result is MapFeatureSnapResult => Boolean(result));

  if (results.some((result) => result.resolution.status === 'invalid')) {
    return { status: 'invalid' };
  }

  const matchedResults = results.filter(
    (result): result is MapFeatureSnapResult & {
      resolution: Extract<MapFeatureSnapResult['resolution'], { status: 'matched' }>;
    } => result.resolution.status === 'matched'
  );
  if (!matchedResults.length) {
    return { status: 'unmatched' };
  }

  const bestResult = [...matchedResults].sort((left, right) => {
    const leftDistance = left.distancePx ?? Number.POSITIVE_INFINITY;
    const rightDistance = right.distancePx ?? Number.POSITIVE_INFINITY;
    return leftDistance - rightDistance;
  })[0];

  return {
    status: 'matched',
    coordinate: [...bestResult.resolution.decision.snapCoordinate],
  };
}

/**
 * 创建可同时供 toCustom 与 mode 输入守卫消费的 TerraDraw 吸附协调器。
 * @returns 更新来源、解析当前事件和阻断 invalid 输入的方法
 */
export function createTerradrawSnapInputCoordinator(): TerradrawSnapInputCoordinator {
  let sources: TerradrawCustomSnapSources = {};
  let cache = new WeakMap<object, TerradrawCustomSnapResolution>();

  const resolve = (event: TerraDrawMouseEvent): TerradrawCustomSnapResolution => {
    const cached = cache.get(event);
    if (cached) {
      return cached;
    }

    const result = resolveTerradrawCustomSnap(event, sources);
    cache.set(event, result);
    return result;
  };

  return {
    setSources: (nextSources) => {
      sources = nextSources;
      cache = new WeakMap<object, TerradrawCustomSnapResolution>();
    },
    toCustom: (event) => {
      const result = resolve(event);
      return result.status === 'matched' ? [...result.coordinate] : undefined;
    },
    isInvalid: (event) => resolve(event).status === 'invalid',
  };
}

/** TerraDraw 吸附输入守卫协调器。 */
export interface TerradrawSnapInputCoordinator {
  /** 更新当前启用的地图与已绘制要素吸附来源。 */
  setSources(sources: TerradrawCustomSnapSources): void;
  /** 返回 matched 的 snapCoordinate；unmatched/invalid 都不提供自定义坐标。 */
  toCustom(event: TerraDrawMouseEvent): [number, number] | undefined;
  /** 判断当前输入是否因 invalid 证据而必须阻断。 */
  isInvalid(event: TerraDrawMouseEvent): boolean;
}

/**
 * 为 TerraDraw 标准绘制 mode 增加 invalid 输入守卫。
 * 不改写原 mode 的 pointerEvents 或 validation；合法输入继续调用原处理器。
 * @param mode 已实例化的 TerraDraw mode
 * @param coordinator 当前控件的吸附协调器
 */
export function guardTerradrawModeInputs(
  mode: object,
  coordinator: TerradrawSnapInputCoordinator
): void {
  const existingState = terradrawModeGuardStates.get(mode);
  if (existingState) {
    existingState.coordinator = coordinator;
    existingState.dragBlocked = false;
    return;
  }

  const state: TerradrawModeGuardState = { coordinator, dragBlocked: false };
  terradrawModeGuardStates.set(mode, state);
  const guardableMode = mode as TerradrawGuardableMode;
  const original = {
    onClick: guardableMode.onClick,
    onMouseMove: guardableMode.onMouseMove,
    onDragStart: guardableMode.onDragStart,
    onDrag: guardableMode.onDrag,
    onDragEnd: guardableMode.onDragEnd,
  };

  if (original.onClick) {
    guardableMode.onClick = (event) => {
      if (event.button === 'left' && state.coordinator.isInvalid(event)) {
        return;
      }
      original.onClick?.call(guardableMode, event);
    };
  }

  if (original.onMouseMove) {
    guardableMode.onMouseMove = (event) => {
      if (state.coordinator.isInvalid(event)) {
        return;
      }
      original.onMouseMove?.call(guardableMode, event);
    };
  }

  if (original.onDragStart) {
    guardableMode.onDragStart = (event, setMapDraggability) => {
      if (state.coordinator.isInvalid(event)) {
        state.dragBlocked = true;
        return;
      }
      state.dragBlocked = false;
      original.onDragStart?.call(guardableMode, event, setMapDraggability);
    };
  }

  if (original.onDrag) {
    guardableMode.onDrag = (event, setMapDraggability) => {
      if (state.dragBlocked) {
        setMapDraggability(true);
        return;
      }
      if (state.coordinator.isInvalid(event)) {
        state.dragBlocked = true;
        guardableMode.cleanUp?.();
        setMapDraggability(true);
        return;
      }
      original.onDrag?.call(guardableMode, event, setMapDraggability);
    };
  }

  if (original.onDragEnd) {
    guardableMode.onDragEnd = (event, setMapDraggability) => {
      if (state.dragBlocked) {
        state.dragBlocked = false;
        setMapDraggability(true);
        return;
      }
      if (state.coordinator.isInvalid(event)) {
        guardableMode.cleanUp?.();
        setMapDraggability(true);
        return;
      }
      original.onDragEnd?.call(guardableMode, event, setMapDraggability);
    };
  }
}

/**
 * 构建绘制/测量线面模式最终使用的 snapping 配置对象。
 * @param resolvedSnapOptions 当前控件最终生效的吸附配置
 * @param resolveCustomCoordinate 自定义吸附坐标解析器
 * @returns 可直接传给 TerraDraw mode 的局部配置
 */
function buildTerradrawModeSnappingPatch(
  resolvedSnapOptions: ResolvedTerradrawSnapOptions,
  resolveCustomCoordinate?: (event: TerraDrawMouseEvent) => [number, number] | undefined
): TerradrawSnappingPatch {
  const snappingConfig: TerradrawSnappingPatch['snapping'] = {};

  if (resolvedSnapOptions.enabled && resolvedSnapOptions.useNative) {
    snappingConfig.toLine = true;
    snappingConfig.toCoordinate = true;
  }

  const shouldUseCustomTarget =
    resolvedSnapOptions.useMapTargets || resolvedSnapOptions.drawnTargets.enabled;

  if (resolvedSnapOptions.enabled && shouldUseCustomTarget && resolveCustomCoordinate) {
    snappingConfig.toCustom = resolveCustomCoordinate;
  }

  return {
    pointerDistance: resolvedSnapOptions.tolerancePx,
    snapping: snappingConfig,
  };
}

/**
 * 创建 TerraDraw ready 同步管理器。
 * 统一托管 ready 前的挂起任务，避免容器层重复维护 WeakMap 和监听器细节。
 * @returns ready 同步管理方法集合
 */
export function createTerradrawReadySyncManager(): {
  clear: (drawInstance: TerraDraw | null | undefined) => void;
  ensureReadyForModeSync: EnsureTerradrawReadyForModeSync;
} {
  const terradrawReadySyncStateMap = new WeakMap<TerraDraw, TerradrawReadySyncState>();

  /**
   * 获取 TerraDraw ready 重试同步状态；不存在时自动初始化。
   * @param drawInstance 当前 TerraDraw 实例
   * @returns 当前实例对应的重试同步状态
   */
  const getTerradrawReadySyncState = (drawInstance: TerraDraw): TerradrawReadySyncState => {
    const existingState = terradrawReadySyncStateMap.get(drawInstance);
    if (existingState) {
      return existingState;
    }

    const nextState: TerradrawReadySyncState = {
      tasks: new Map<string, () => void>(),
    };
    terradrawReadySyncStateMap.set(drawInstance, nextState);
    return nextState;
  };

  /**
   * 清理某个 TerraDraw 实例上挂起的 ready 同步任务与监听器。
   * @param drawInstance 当前 TerraDraw 实例
   */
  const clear = (drawInstance: TerraDraw | null | undefined): void => {
    if (!drawInstance) {
      return;
    }

    const readySyncState = terradrawReadySyncStateMap.get(drawInstance);
    if (!readySyncState) {
      return;
    }

    if (readySyncState.handler) {
      drawInstance.off('ready', readySyncState.handler);
    }

    terradrawReadySyncStateMap.delete(drawInstance);
  };

  /**
   * 当 TerraDraw 尚未启用时，把同步任务延后到 ready 事件后再执行。
   * @param drawInstance 当前 TerraDraw 实例
   * @param taskKey 当前同步任务标识
   * @param task ready 后需要执行的同步逻辑
   */
  const queueTerradrawReadySync = (
    drawInstance: TerraDraw,
    taskKey: string,
    task: () => void
  ): void => {
    const readySyncState = getTerradrawReadySyncState(drawInstance);
    readySyncState.tasks.set(taskKey, task);

    if (readySyncState.handler) {
      return;
    }

    const handleReady = () => {
      if (!drawInstance.enabled) {
        return;
      }

      const pendingTasks = [...readySyncState.tasks.values()];
      clear(drawInstance);

      pendingTasks.forEach((pendingTask) => {
        pendingTask();
      });
    };

    readySyncState.handler = handleReady;
    drawInstance.on('ready', handleReady);
  };

  /**
   * 确保 TerraDraw 已进入 enabled 状态后再执行模式配置同步。
   * 若当前仍处于初始化阶段，则自动登记一次 ready 后重试，避免刷新时出现竞态告警。
   * @param drawInstance 当前 TerraDraw 实例
   * @param taskKey 当前同步任务标识
   * @param retryTask ready 后重新执行的同步逻辑
   * @returns 当前实例是否已经可以立即执行同步
   */
  const ensureReadyForModeSync: EnsureTerradrawReadyForModeSync = (
    drawInstance,
    taskKey,
    retryTask
  ): drawInstance is TerraDraw => {
    if (!drawInstance?.updateModeOptions) {
      return false;
    }

    if (drawInstance.enabled) {
      // 实例一旦已经启用，说明之前挂起的 ready 重试任务可以直接取消，避免重复执行。
      clear(drawInstance);
      return true;
    }

    queueTerradrawReadySync(drawInstance, taskKey, retryTask);
    return false;
  };

  return {
    clear,
    ensureReadyForModeSync,
  };
}

/**
 * 同步 TerraDraw 的线 / 面模式吸附配置。
 * 当前容器层的 draw / measure 都只需要更新 `linestring` 与 `polygon` 两个模式。
 * @param options 同步所需的上下文参数
 */
export function syncTerradrawLineAndPolygonSnapping(options: {
  drawInstance: TerraDraw | null | undefined;
  taskKey: string;
  retryTask: () => void;
  localSnapConfig: TerradrawSnapSharedOptions | boolean | null | undefined;
  resolveSnapOptions: (
    localSnapConfig: TerradrawSnapSharedOptions | boolean | null | undefined
  ) => ResolvedTerradrawSnapOptions;
  ensureReadyForModeSync: EnsureTerradrawReadyForModeSync;
  resolveMapResult?: (event: TerraDrawMouseEvent) => MapFeatureSnapResult | null | undefined;
  resolveDrawnResult?: (event: TerraDrawMouseEvent) => MapFeatureSnapResult | null | undefined;
  inputCoordinator?: TerradrawSnapInputCoordinator;
}): void {
  const {
    drawInstance,
    taskKey,
    retryTask,
    localSnapConfig,
    resolveSnapOptions,
    ensureReadyForModeSync,
    resolveMapResult,
    resolveDrawnResult,
    inputCoordinator,
  } = options;

  if (!ensureReadyForModeSync(drawInstance, taskKey, retryTask)) {
    return;
  }

  const resolvedSnapOptions = resolveSnapOptions(localSnapConfig);
  const coordinator = inputCoordinator ?? createTerradrawSnapInputCoordinator();
  coordinator.setSources({
    resolveMapResult: resolvedSnapOptions.useMapTargets ? resolveMapResult : undefined,
    resolveDrawnResult: resolvedSnapOptions.drawnTargets.enabled ? resolveDrawnResult : undefined,
  });
  const snappingPatch = buildTerradrawModeSnappingPatch(
    resolvedSnapOptions,
    coordinator.toCustom
  );

  TERRADRAW_SNAP_MODE_NAMES.forEach((modeName) => {
    safeUpdateTerradrawModeOptions(drawInstance, modeName, snappingPatch);
  });
}
