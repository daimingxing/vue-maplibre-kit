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
    const mapResult = options.resolveMapResult?.(event) || null;
    const drawnResult = options.resolveDrawnResult?.(event) || null;
    const matchedResults = [mapResult, drawnResult].filter(
      (result): result is MapFeatureSnapResult => Boolean(result?.matched && result.targetCoordinate)
    );

    if (!matchedResults.length) {
      return undefined;
    }

    const bestResult = matchedResults.sort((left, right) => {
      const leftDistance = left.distancePx ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distancePx ?? Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    })[0];

    return bestResult.targetCoordinate || undefined;
  };
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
  } = options;

  if (!ensureReadyForModeSync(drawInstance, taskKey, retryTask)) {
    return;
  }

  const resolvedSnapOptions = resolveSnapOptions(localSnapConfig);
  const customSnapResolver = buildTerradrawCustomSnapResolver({
    resolveMapResult: resolvedSnapOptions.useMapTargets ? resolveMapResult : undefined,
    resolveDrawnResult: resolvedSnapOptions.drawnTargets.enabled ? resolveDrawnResult : undefined,
  });
  const snappingPatch = buildTerradrawModeSnappingPatch(
    resolvedSnapOptions,
    customSnapResolver
  );

  TERRADRAW_SNAP_MODE_NAMES.forEach((modeName) => {
    safeUpdateTerradrawModeOptions(drawInstance, modeName, snappingPatch);
  });
}
