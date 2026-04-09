import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import type { EventArgs } from '@watergis/maplibre-gl-terradraw';
import type {
  TerradrawControlType,
  TerradrawFeatureId,
  TerradrawFeature,
  TerradrawFinishContext,
  TerradrawChangeContext,
  TerradrawInteractiveContext,
  TerradrawInteractiveOptions,
  TerradrawManagedControl,
} from '../shared/mapLibre-controls-types';
import type { MapSnapBinding } from '../plugins/types';

interface CreateTerradrawInteractiveOptions {
  /** 当前地图实例 */
  map: MaplibreMap;
  /** 当前 TerraDraw / Measure 控件实例 */
  control: TerradrawManagedControl;
  /** 当前控件来源类型 */
  controlType: TerradrawControlType;
  /** 读取最新的业务层交互配置 */
  getInteractive: () => TerradrawInteractiveOptions | null | undefined;
  /** 读取当前普通图层吸附绑定 */
  getSnapBinding?: () => MapSnapBinding | null | undefined;
}

export interface TerradrawInteractiveBinding {
  /** 销毁当前交互管理器，解绑所有事件 */
  destroy: () => void;
  /** 主动清除当前 hover 状态 */
  clearHoverState: () => void;
}

interface InteractiveMouseEvent extends MouseEvent {
  __mapInteractiveHandled__?: boolean;
}

const TERRADRAW_FEATURE_QUERY_OPTIONS = {
  ignoreSelectFeatures: true,
  ignoreCoordinatePoints: true,
  ignoreCurrentlyDrawing: true,
  ignoreClosingPoints: true,
  ignoreSnappingPoints: true,
};

/**
 * 递归冻结对象，确保缓存快照不会被业务层意外修改。
 * @param value 待冻结的任意值
 * @returns 冻结后的原始值
 */
function deepFreezeTerradrawValue<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  if (Array.isArray(value)) {
    value.forEach((item) => {
      deepFreezeTerradrawValue(item);
    });
    return value;
  }

  Object.keys(value as Record<string, unknown>).forEach((key) => {
    const nextValue = (value as Record<string, unknown>)[key];
    deepFreezeTerradrawValue(nextValue);
  });

  return value;
}

/**
 * 深拷贝并冻结 TerraDraw 要素，避免高频路径反复复制且阻断外部误改缓存。
 * @param feature TerraDraw 要素快照
 * @returns 深拷贝后的只读要素快照
 */
function cloneTerradrawFeature(feature: TerradrawFeature): TerradrawFeature {
  const clonedFeature =
    typeof globalThis.structuredClone === 'function'
      ? globalThis.structuredClone(feature)
      : JSON.parse(JSON.stringify(feature));

  return deepFreezeTerradrawValue(clonedFeature);
}

/**
 * 判断两个 TerraDraw 要素是否为同一个业务目标。
 * @param previous 上一次命中的要素
 * @param next 本次命中的要素
 * @returns 是否命中同一个要素
 */
function isSameTerradrawFeature(
  previous: TerradrawFeature | null,
  next: TerradrawFeature | null
): boolean {
  if (!previous || !next) return false;
  return previous.id === next.id;
}

/**
 * 判断给定值是否为可用的 TerraDraw 要素 ID。
 * @param featureId 待判断的要素 ID
 * @returns 是否为 string / number 类型的有效要素 ID
 */
function isTerradrawFeatureId(featureId: unknown): featureId is TerradrawFeatureId {
  return typeof featureId === 'string' || typeof featureId === 'number';
}

/**
 * 创建 TerraDraw / Measure 业务交互管理器。
 * @param options 创建参数
 * @returns 包含 destroy / clearHoverState 的交互管理器句柄
 */
export function createTerradrawInteractive(
  options: CreateTerradrawInteractiveOptions
): TerradrawInteractiveBinding {
  const { map, control, controlType, getInteractive, getSnapBinding } = options;
  const drawInstance = control.getTerraDrawInstance();

  if (!drawInstance) {
    return {
      destroy: () => undefined,
      clearHoverState: () => undefined,
    };
  }

  const featureSnapshotCache = new globalThis.Map<TerradrawFeatureId, TerradrawFeature>();
  let hoveredFeatureId: TerradrawFeatureId | null = null;
  let hoveredFeatureSnapshot: TerradrawFeature | null = null;
  let hasDisposed = false;
  let hasNotifiedReady = false;

  /**
   * 读取当前仍然启用的业务交互配置。
   * 若业务层已关闭交互，则返回 null，供事件分发路径直接短路。
   * @returns 当前生效的交互配置；未启用时返回 null
   */
  const getCurrentInteractive = (): TerradrawInteractiveOptions | null => {
    const interactive = getInteractive();
    if (!interactive || interactive.enabled === false) {
      return null;
    }

    return interactive;
  };

  /**
   * 同步 TerraDraw 全量快照到本地缓存，便于 delete 事件在要素已移除后仍能拿到旧数据。
   */
  const syncFeatureSnapshotCache = (): void => {
    featureSnapshotCache.clear();
    drawInstance.getSnapshot().forEach((feature) => {
      if (isTerradrawFeatureId(feature.id)) {
        featureSnapshotCache.set(feature.id, cloneTerradrawFeature(feature));
      }
    });
  };

  /**
   * 将单个 TerraDraw 要素写入缓存并返回稳定快照。
   * @param feature 当前 TerraDraw 要素
   * @returns 可安全下发给业务层的只读快照
   */
  const cacheFeatureSnapshot = (feature: TerradrawFeature): TerradrawFeature => {
    const snapshot = cloneTerradrawFeature(feature);
    if (isTerradrawFeatureId(snapshot.id)) {
      featureSnapshotCache.set(snapshot.id, snapshot);
    }
    return snapshot;
  };

  /**
   * 优先从缓存读取要素快照，缓存缺失时才补充克隆一次。
   * @param feature 当前 TerraDraw 要素
   * @returns 稳定的只读快照；为空时返回 null
   */
  const getFeatureSnapshot = (
    feature: TerradrawFeature | null | undefined
  ): TerradrawFeature | null => {
    if (!feature) return null;

    if (isTerradrawFeatureId(feature.id)) {
      const cachedFeature = featureSnapshotCache.get(feature.id);
      if (cachedFeature) {
        return cachedFeature;
      }
    }

    return cacheFeatureSnapshot(feature);
  };

  /**
   * 批量解析 TerraDraw 要素快照，统一复用缓存中的稳定引用。
   * @param features TerraDraw 要素数组
   * @returns 过滤空值后的稳定快照数组
   */
  const getFeatureSnapshots = (features: TerradrawFeature[] = []): TerradrawFeature[] => {
    return features
      .map((feature) => getFeatureSnapshot(feature))
      .filter((feature): feature is TerradrawFeature => Boolean(feature));
  };

  /**
   * 统一构建回调上下文，确保业务层拿到稳定、完整的事件载荷。
   * @param feature 当前主目标要素
   * @param extraContext 额外上下文
   * @returns TerraDraw 统一回调上下文
   */
  const createInteractiveContext = (
    feature: TerradrawFeature | null,
    extraContext: Partial<TerradrawInteractiveContext> = {}
  ): TerradrawInteractiveContext => {
    return {
      feature,
      featureId: feature?.id ?? extraContext.featureId ?? null,
      controlType,
      control,
      drawInstance,
      map,
      mode: drawInstance.getMode(),
      ...extraContext,
    };
  };

  /**
   * 统一触发业务回调，避免各类事件在外层重复拼装上下文。
   * @param callback 业务层回调函数
   * @param feature 当前主目标要素
   * @param extraContext 额外上下文
   */
  const emitInteractiveCallback = (
    callback: ((context: TerradrawInteractiveContext) => void) | undefined,
    feature: TerradrawFeature | null,
    extraContext: Partial<TerradrawInteractiveContext> = {}
  ): void => {
    if (!callback) return;
    callback(createInteractiveContext(feature, extraContext));
  };

  /**
   * 读取最新交互配置中的回调并统一触发。
   * 通过回调选择器避免在绑定创建时捕获旧的函数引用。
   * @param callbackGetter 从最新配置中读取目标回调
   * @param feature 当前主目标要素
   * @param extraContext 额外上下文
   */
  const emitCurrentInteractiveCallback = (
    callbackGetter: (
      interactive: TerradrawInteractiveOptions
    ) => ((context: TerradrawInteractiveContext) => void) | undefined,
    feature: TerradrawFeature | null,
    extraContext: Partial<TerradrawInteractiveContext> = {}
  ): void => {
    const interactive = getCurrentInteractive();
    if (!interactive) {
      return;
    }

    emitInteractiveCallback(callbackGetter(interactive), feature, extraContext);
  };

  /**
   * 根据要素 ID 从当前快照或缓存中取回要素。
   * @param featureId 要素 ID
   * @returns 匹配到的要素快照
   */
  const getFeatureById = (
    featureId: TerradrawFeatureId | null | undefined
  ): TerradrawFeature | null => {
    if (featureId === null || featureId === undefined) return null;
    const cachedFeature = featureSnapshotCache.get(featureId);
    if (cachedFeature) {
      return cachedFeature;
    }

    const currentFeature = drawInstance.getSnapshotFeature(featureId);
    return currentFeature ? cacheFeatureSnapshot(currentFeature) : null;
  };

  /**
   * 在要素变化后同步当前 hover 快照，避免离开事件拿到旧数据。
   */
  const syncHoveredFeatureSnapshot = (): void => {
    if (hoveredFeatureId === null || hoveredFeatureId === undefined) {
      hoveredFeatureSnapshot = null;
      return;
    }

    hoveredFeatureSnapshot = getFeatureById(hoveredFeatureId);
    if (!hoveredFeatureSnapshot) {
      hoveredFeatureId = null;
    }
  };

  /**
   * 判断当前 TerraDraw 是否处于允许业务交互的 render 模式。
   * @returns 是否允许分发 hover / click 等业务交互
   */
  const isBusinessInteractiveMode = (): boolean => {
    return drawInstance.getMode() === 'render';
  };

  /**
   * 根据 hover 命中状态同步地图鼠标样式。
   * @param isHit 是否命中 TerraDraw 要素
   */
  const syncCursor = (isHit: boolean): void => {
    const interactive = getCurrentInteractive();
    if (!interactive?.cursor || interactive.cursor === false) {
      map.getCanvas().style.cursor = '';
      return;
    }

    map.getCanvas().style.cursor = isHit ? interactive.cursor : '';
  };

  /**
   * 清理当前 hover 状态，并在需要时通知业务层鼠标离开。
   * @param shouldNotifyLeave 是否触发 onHoverLeave 回调
   */
  const clearHoverState = (shouldNotifyLeave = true): void => {
    const previousHoveredFeature = hoveredFeatureSnapshot;
    hoveredFeatureId = null;
    hoveredFeatureSnapshot = null;
    syncCursor(false);

    if (previousHoveredFeature && shouldNotifyLeave) {
      emitCurrentInteractiveCallback(
        (interactive) => interactive.onHoverLeave,
        previousHoveredFeature
      );
    }
  };

  /**
   * 尝试根据地图鼠标事件解析当前命中的 TerraDraw 主业务要素。
   * @param event MapLibre 鼠标事件
   * @returns 命中的 TerraDraw 要素；未命中返回 null
   */
  const getEventFeature = (event: MapMouseEvent): TerradrawFeature | null => {
    const features = drawInstance.getFeaturesAtLngLat(
      {
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      },
      TERRADRAW_FEATURE_QUERY_OPTIONS
    );

    if (!features.length) {
      return null;
    }

    return getFeatureSnapshot(features[0]);
  };

  /**
   * 将 MapLibre 鼠标事件转换为统一上下文中要求的 point / lngLat / originalEvent 字段。
   * @param event MapLibre 鼠标事件
   * @returns 统一事件补充上下文
   */
  const createPointerContext = (
    event: MapMouseEvent,
    extraContext: Partial<TerradrawInteractiveContext> = {}
  ): Partial<TerradrawInteractiveContext> => {
    return {
      point: {
        x: event.point.x,
        y: event.point.y,
      },
      lngLat: {
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      },
      rawLngLat: {
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      },
      originalEvent: event.originalEvent as MouseEvent,
      ...extraContext,
    };
  };

  /**
   * 解析当前鼠标事件对应的普通图层吸附结果，并写回到统一指针上下文。
   * @param event 当前地图鼠标事件
   * @returns 当前事件的吸附结果与补充后的指针上下文
   */
  const resolvePointerContext = (event: MapMouseEvent) => {
    const snapResult = getSnapBinding?.()?.resolveMapEvent(event) || null;
    return {
      snapResult,
      pointerContext: createPointerContext(event, {
        ...(snapResult?.matched && snapResult.lngLat ? { lngLat: snapResult.lngLat } : {}),
        snapResult,
      }),
    };
  };

  const isEventHandled = (event: MapMouseEvent): boolean => {
    return Boolean(
      (event.originalEvent as InteractiveMouseEvent | undefined)?.__mapInteractiveHandled__
    );
  };

  const markEventHandled = (event: MapMouseEvent): void => {
    const originalEvent = event.originalEvent as InteractiveMouseEvent | undefined;
    if (!originalEvent) return;
    originalEvent.__mapInteractiveHandled__ = true;
  };

  const scheduleBlankClick = (
    event: MapMouseEvent,
    blankCallbackGetter?: (
      interactive: TerradrawInteractiveOptions
    ) => ((context: TerradrawInteractiveContext) => void) | undefined
  ): void => {
    const emitBlankClick = () => {
      if (isEventHandled(event)) return;
      const interactive = getCurrentInteractive();
      const blankCallback = interactive && blankCallbackGetter ? blankCallbackGetter(interactive) : null;
      blankCallback?.(createInteractiveContext(null, resolvePointerContext(event).pointerContext));
    };

    if (typeof globalThis.queueMicrotask === 'function') {
      globalThis.queueMicrotask(emitBlankClick);
      return;
    }

    Promise.resolve().then(emitBlankClick);
  };

  /**
   * 处理 hover 命中切换逻辑，负责进入、离开以及覆盖层更新。
   * @param feature 当前命中的 TerraDraw 要素
   * @param event 当前鼠标事件
   */
  const applyHoverFeature = (feature: TerradrawFeature | null, event: MapMouseEvent): void => {
    const { pointerContext } = resolvePointerContext(event);

    if (!feature) {
      clearHoverState();
      return;
    }

    const nextHoveredFeatureId = isTerradrawFeatureId(feature.id) ? feature.id : null;
    syncCursor(true);

    if (
      (nextHoveredFeatureId !== null && hoveredFeatureId === nextHoveredFeatureId) ||
      (nextHoveredFeatureId === null && isSameTerradrawFeature(hoveredFeatureSnapshot, feature))
    ) {
      return;
    }

    if (hoveredFeatureSnapshot) {
      clearHoverState();
      syncCursor(true);
    }

    hoveredFeatureId = nextHoveredFeatureId;
    hoveredFeatureSnapshot = feature;
    emitCurrentInteractiveCallback((interactive) => interactive.onHoverEnter, feature, pointerContext);
  };

  /**
   * 统一处理 TerraDraw ready 生命周期，确保业务层至少收到一次初始化完成通知。
   */
  const notifyReady = (): void => {
    if (hasNotifiedReady) return;
    hasNotifiedReady = true;
    syncFeatureSnapshotCache();
    emitCurrentInteractiveCallback((interactive) => interactive.onReady, null);
  };

  /**
   * 处理地图鼠标移动事件，仅在 render 模式下分发 hover 业务回调。
   * @param event MapLibre 鼠标移动事件
   */
  const handleMouseMove = (event: MapMouseEvent): void => {
    if (!isBusinessInteractiveMode()) {
      clearHoverState();
      return;
    }

    const feature = getEventFeature(event);
    applyHoverFeature(feature, event);
  };

  /**
   * 处理鼠标移出地图事件，统一清空 hover 高亮。
   */
  const handleMouseOut = (): void => {
    clearHoverState();
  };

  /**
   * 统一处理点击类地图事件，避免 click / dblclick / contextmenu 三套逻辑重复。
   * @param event MapLibre 鼠标事件
   * @param featureCallback 命中 TerraDraw 要素时的业务回调
   * @param blankCallback 单击空白处时的业务回调
   */
  const handlePointerAction = (
    event: MapMouseEvent,
    featureCallbackGetter?: (
      interactive: TerradrawInteractiveOptions
    ) => ((context: TerradrawInteractiveContext) => void) | undefined,
    blankCallbackGetter?: (
      interactive: TerradrawInteractiveOptions
    ) => ((context: TerradrawInteractiveContext) => void) | undefined
  ): void => {
    if (!isBusinessInteractiveMode()) {
      clearHoverState(false);
      return;
    }

    const feature = getEventFeature(event);
    const { pointerContext } = resolvePointerContext(event);

    if (feature) {
      markEventHandled(event);
      if (featureCallbackGetter) {
        emitCurrentInteractiveCallback(featureCallbackGetter, feature, pointerContext);
      }
      return;
    }

    if (blankCallbackGetter) {
      scheduleBlankClick(event, blankCallbackGetter);
    }
  };

  /**
   * 处理控件层 mode-changed 事件，并在离开 render 模式时主动清理 hover 状态。
   * @param event 控件事件参数
   */
  const handleModeChanged = (event: EventArgs): void => {
    if (!isBusinessInteractiveMode()) {
      clearHoverState(false);
    }

    syncFeatureSnapshotCache();
    syncHoveredFeatureSnapshot();
    const selectedFeatures = getFeatureSnapshots((event.feature as TerradrawFeature[]) || []);
    emitCurrentInteractiveCallback((interactive) => interactive.onModeChange, selectedFeatures[0] || null, {
      features: selectedFeatures,
      featureIds: selectedFeatures
        .map((feature) => feature.id)
        .filter((featureId): featureId is TerradrawFeatureId => isTerradrawFeatureId(featureId)),
    });
  };

  /**
   * 处理 TerraDraw finish 生命周期事件。
   * @param featureId 完成绘制或编辑的要素 ID
   * @param finishContext finish 事件上下文
   */
  const handleFeatureFinish = (
    featureId: TerradrawFeatureId,
    finishContext: TerradrawFinishContext
  ): void => {
    syncFeatureSnapshotCache();
    syncHoveredFeatureSnapshot();
    const feature = getFeatureById(featureId);
    emitCurrentInteractiveCallback((interactive) => interactive.onFeatureFinish, feature, {
      featureId,
      finishContext,
    });
  };

  /**
   * 处理 TerraDraw change 生命周期事件。
   * @param featureIds 发生变化的要素 ID 列表
   * @param changeType 变化类型
   * @param changeContext 变化附带上下文
   */
  const handleFeatureChange = (
    featureIds: TerradrawFeatureId[],
    changeType: string,
    changeContext?: TerradrawChangeContext
  ): void => {
    if (changeType === 'delete') {
      if (hoveredFeatureId !== null && featureIds.includes(hoveredFeatureId)) {
        clearHoverState(false);
      }
      return;
    }

    syncFeatureSnapshotCache();
    const changedFeatures = featureIds
      .map((featureId) => getFeatureById(featureId))
      .filter((feature): feature is TerradrawFeature => Boolean(feature));

    syncHoveredFeatureSnapshot();

    emitCurrentInteractiveCallback((interactive) => interactive.onFeatureChange, changedFeatures[0] || null, {
      features: changedFeatures,
      featureIds: [...featureIds],
      changeType,
      changeContext,
    });
  };

  /**
   * 处理 TerraDraw select 生命周期事件。
   * @param featureId 被选中的要素 ID
   */
  const handleFeatureSelect = (featureId: TerradrawFeatureId): void => {
    syncFeatureSnapshotCache();
    syncHoveredFeatureSnapshot();
    const feature = getFeatureById(featureId);
    emitCurrentInteractiveCallback((interactive) => interactive.onFeatureSelect, feature, {
      featureId,
    });
  };

  /**
   * 处理 TerraDraw deselect 生命周期事件。
   * @param featureId 被取消选中的要素 ID
   */
  const handleFeatureDeselect = (featureId: TerradrawFeatureId): void => {
    syncFeatureSnapshotCache();
    syncHoveredFeatureSnapshot();
    const feature = getFeatureById(featureId);
    emitCurrentInteractiveCallback((interactive) => interactive.onFeatureDeselect, feature, {
      featureId,
    });
  };

  /**
   * 处理控件层 feature-deleted 事件。
   * @param event 控件事件参数
   */
  const handleFeatureDelete = (event: EventArgs): void => {
    const deletedIds = [...(event.deletedIds || [])];

    if (hoveredFeatureId !== null && deletedIds.includes(hoveredFeatureId)) {
      clearHoverState(false);
    }

    const deletedFeatures = deletedIds
      .map((featureId) => getFeatureById(featureId))
      .filter((feature): feature is TerradrawFeature => Boolean(feature));

    emitCurrentInteractiveCallback((interactive) => interactive.onFeatureDelete, deletedFeatures[0] || null, {
      features: deletedFeatures,
      featureIds: deletedIds,
      deletedIds,
    });

    deletedIds.forEach((featureId) => {
      featureSnapshotCache.delete(featureId);
    });
    syncFeatureSnapshotCache();
    syncHoveredFeatureSnapshot();
  };

  const handleMapClick = (event: MapMouseEvent) =>
    handlePointerAction(
      event,
      (interactive) => interactive.onClick,
      (interactive) => interactive.onBlankClick
    );
  const handleMapDoubleClick = (event: MapMouseEvent) =>
    handlePointerAction(event, (interactive) => interactive.onDoubleClick);
  const handleMapContextMenu = (event: MapMouseEvent) =>
    handlePointerAction(event, (interactive) => interactive.onContextMenu);

  drawInstance.on('ready', notifyReady);
  drawInstance.on('finish', handleFeatureFinish);
  drawInstance.on('change', handleFeatureChange);
  drawInstance.on('select', handleFeatureSelect);
  drawInstance.on('deselect', handleFeatureDeselect);

  control.on('mode-changed', handleModeChanged);
  control.on('feature-deleted', handleFeatureDelete);

  map.on('mousemove', handleMouseMove);
  map.on('mouseout', handleMouseOut);
  map.on('click', handleMapClick);
  map.on('dblclick', handleMapDoubleClick);
  map.on('contextmenu', handleMapContextMenu);

  syncFeatureSnapshotCache();
  notifyReady();

  return {
    destroy: () => {
      if (hasDisposed) return;
      hasDisposed = true;

      clearHoverState(false);

      drawInstance.off('ready', notifyReady);
      drawInstance.off('finish', handleFeatureFinish);
      drawInstance.off('change', handleFeatureChange);
      drawInstance.off('select', handleFeatureSelect);
      drawInstance.off('deselect', handleFeatureDeselect);

      control.off('mode-changed', handleModeChanged);
      control.off('feature-deleted', handleFeatureDelete);

      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
      map.off('click', handleMapClick);
      map.off('dblclick', handleMapDoubleClick);
      map.off('contextmenu', handleMapContextMenu);

      featureSnapshotCache.clear();
    },
    clearHoverState: () => clearHoverState(),
  };
}
