import { onBeforeUnmount, watch } from 'vue';
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import type { MapInstance } from 'vue-maplibre-gl';
import type {
  MapLayerInteractiveContext,
  MapLayerInteractiveEventType,
  MapLayerInteractiveLayerOptions,
  MapLayerInteractiveOptions,
} from '../shared/mapLibre-contols-types';
import type { MapSnapBinding } from '../plugins/types';

export interface UseMapInteractiveOptions {
  /** 地图实例引用，通常是通过 useMap() 获取的 */
  mapInstance: MapInstance;
  /** 获取最新的业务交互配置 */
  getInteractive: () => MapLayerInteractiveOptions | null | undefined;
  /** 获取当前普通图层吸附绑定 */
  getSnapBinding?: () => MapSnapBinding | null | undefined;
}

interface HoveredLayerTarget {
  feature: MapGeoJSONFeature;
  layerId: string;
  layerConfig: MapLayerInteractiveLayerOptions;
}

interface EventTargetResolution {
  rawTarget: HoveredLayerTarget | null;
  effectiveTarget: HoveredLayerTarget | null;
  pointerContext: Partial<MapLayerInteractiveContext>;
}

interface MapInteractiveBinding {
  destroy: () => void;
  clearHoverState: () => void;
  clearSelectionState: () => void;
  getSelectedFeature: () => MapGeoJSONFeature | null;
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null;
}

interface InteractiveMouseEvent extends MouseEvent {
  __mapInteractiveHandled__?: boolean;
}

type LayerInteractiveCallback =
  | MapLayerInteractiveLayerOptions['onHoverEnter']
  | MapLayerInteractiveLayerOptions['onHoverLeave']
  | MapLayerInteractiveLayerOptions['onFeatureSelect']
  | MapLayerInteractiveLayerOptions['onFeatureDeselect']
  | MapLayerInteractiveLayerOptions['onClick']
  | MapLayerInteractiveLayerOptions['onDoubleClick']
  | MapLayerInteractiveLayerOptions['onContextMenu'];

type TopLevelInteractiveCallback =
  | MapLayerInteractiveOptions['onReady']
  | MapLayerInteractiveOptions['onHoverEnter']
  | MapLayerInteractiveOptions['onHoverLeave']
  | MapLayerInteractiveOptions['onClick']
  | MapLayerInteractiveOptions['onDoubleClick']
  | MapLayerInteractiveOptions['onContextMenu']
  | MapLayerInteractiveOptions['onBlankClick'];

type PointerEventType = Extract<MapLayerInteractiveEventType, 'click' | 'dblclick' | 'contextmenu'>;

/**
 * 判断当前普通图层交互配置是否至少声明了一项可执行能力。
 * @param interactive 普通图层交互配置
 * @returns 只要存在顶层回调或图层声明即返回 true
 */
function hasInteractiveHandlers(interactive: MapLayerInteractiveOptions): boolean {
  return Boolean(
    interactive.onReady ||
    interactive.onHoverEnter ||
    interactive.onHoverLeave ||
    interactive.onClick ||
    interactive.onDoubleClick ||
    interactive.onContextMenu ||
    interactive.onBlankClick ||
    (interactive.layers && Object.keys(interactive.layers).length > 0)
  );
}

/**
 * MapLibre 普通图层统一交互管理 Hook。
 * 该 Hook 由容器层内部托管，自动完成事件绑定、hover/selected Feature State 和销毁清理。
 * @param options Hook 初始化参数
 * @returns 普通图层交互管理能力集合
 */
export function useMapInteractive(options: UseMapInteractiveOptions) {
  const { mapInstance, getInteractive, getSnapBinding } = options;

  let binding: MapInteractiveBinding | null = null;

  /**
   * 销毁当前已经挂载的交互绑定实例。
   */
  const destroyBinding = () => {
    binding?.destroy();
    binding = null;
  };

  /**
   * 根据最新地图实例和业务配置重新同步交互绑定。
   */
  const syncBinding = () => {
    destroyBinding();

    if (!mapInstance.isLoaded || !mapInstance.map) {
      return;
    }

    const interactive = getInteractive();
    if (!interactive || interactive.enabled === false || !hasInteractiveHandlers(interactive)) {
      return;
    }

    binding = createMapInteractiveBinding(mapInstance.map, interactive, getSnapBinding);
  };

  const stopWatch = watch(
    () => ({
      isLoaded: mapInstance.isLoaded,
      interactive: getInteractive(),
    }),
    () => {
      syncBinding();
    },
    { immediate: true, deep: true }
  );

  onBeforeUnmount(() => {
    stopWatch();
    destroyBinding();
  });

  return {
    clearHoverState: () => binding?.clearHoverState(),
    clearSelectionState: () => binding?.clearSelectionState(),
    getSelectedFeature: () => binding?.getSelectedFeature() || null,
    getSelectedFeatureContext: () => binding?.getSelectedFeatureContext() || null,
    destroy: destroyBinding,
  };
}

/**
 * 创建普通图层统一交互绑定实例。
 * @param map 当前 MapLibre 地图实例
 * @param interactive 普通图层交互配置
 * @returns 绑定实例
 */
function createMapInteractiveBinding(
  map: MaplibreMap,
  interactive: MapLayerInteractiveOptions,
  getSnapBinding?: (() => MapSnapBinding | null | undefined) | undefined
): MapInteractiveBinding {
  const layerEntries = Object.entries(interactive.layers || {});
  const layerConfigMap = new Map<string, MapLayerInteractiveLayerOptions>(layerEntries);
  let hoveredTarget: HoveredLayerTarget | null = null;
  let selectedTarget: HoveredLayerTarget | null = null;
  let hasDisposed = false;
  let hoverFrameHandle: number | null = null;
  let pendingHoverEvent: MapMouseEvent | null = null;

  /**
   * 获取当前仍然存在于地图中的交互图层 ID，并保持业务声明的优先级顺序。
   * @returns 当前可参与 hit-test 的图层 ID 列表
   */
  const getLayerIdsInPriorityOrder = (): string[] => {
    return layerEntries
      .map(([layerId]) => layerId)
      .filter((layerId) => Boolean(map.getLayer(layerId)));
  };

  /**
   * 根据当前命中的目标同步地图画布鼠标样式。
   * @param target 当前 hover 命中目标
   */
  const setCanvasCursor = (target: HoveredLayerTarget | null): void => {
    if (!target) {
      map.getCanvas().style.cursor = '';
      return;
    }

    const cursor = target.layerConfig.cursor;
    map.getCanvas().style.cursor = cursor === false ? '' : cursor || 'pointer';
  };

  /**
   * 构造普通图层统一交互上下文。
   * @param feature 当前命中的要素
   * @param layerId 当前命中的图层 ID
   * @param eventType 当前触发的交互事件类型
   * @param extraContext 额外上下文字段
   * @returns 标准化后的交互上下文
   */
  const createInteractiveContext = (
    feature: MapGeoJSONFeature | null,
    layerId: string | null,
    eventType: MapLayerInteractiveEventType,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): MapLayerInteractiveContext => {
    const featureId =
      typeof feature?.id === 'string' || typeof feature?.id === 'number' ? feature.id : null;
    const sourceId = typeof feature?.source === 'string' ? feature.source : null;
    const sourceLayer = feature?.sourceLayer || null;
    const properties = feature?.properties ? JSON.parse(JSON.stringify(feature.properties)) : null;

    return {
      feature,
      featureId,
      properties,
      layerId,
      sourceId,
      sourceLayer,
      map,
      ...extraContext,
      eventType,
    };
  };

  /**
   * 统一触发顶层交互回调。
   * @param callback 顶层回调函数
   * @param target 当前命中的图层目标
   * @param eventType 当前事件类型
   * @param extraContext 额外上下文
   */
  const emitTopLevelCallback = (
    callback: TopLevelInteractiveCallback | undefined,
    target: HoveredLayerTarget | null,
    eventType: MapLayerInteractiveEventType,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): void => {
    if (!callback) {
      return;
    }

    callback(
      createInteractiveContext(
        target?.feature || null,
        target?.layerId || null,
        eventType,
        extraContext
      )
    );
  };

  /**
   * 统一触发图层级交互回调。
   * @param callback 图层级回调函数
   * @param target 当前命中的图层目标
   * @param eventType 当前事件类型
   * @param extraContext 额外上下文
   */
  const emitLayerCallback = (
    callback: LayerInteractiveCallback | undefined,
    target: HoveredLayerTarget | null,
    eventType: MapLayerInteractiveEventType,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): void => {
    if (!callback || !target) {
      return;
    }

    callback(createInteractiveContext(target.feature, target.layerId, eventType, extraContext));
  };

  /**
   * 将命中要素转换为可用于 MapLibre feature-state 的目标描述。
   * @param feature 当前命中的要素
   * @returns feature-state 目标描述；不满足条件时返回 null
   */
  const getFeatureStateTarget = (
    feature: MapGeoJSONFeature
  ): {
    source: string;
    sourceLayer?: string;
    id: string | number;
  } | null => {
    const sourceId = typeof feature.source === 'string' ? feature.source : null;

    if (!sourceId || !map.getSource(sourceId)) return null;
    if (feature.id === undefined || feature.id === null) return null;

    const featureStateTarget: {
      source: string;
      sourceLayer?: string;
      id: string | number;
    } = {
      source: sourceId,
      id: feature.id as string | number,
    };

    if (feature.sourceLayer) {
      featureStateTarget.sourceLayer = feature.sourceLayer;
    }

    return featureStateTarget;
  };

  /**
   * 同步命中目标的 hover feature-state。
   * @param target 当前目标
   * @param hover 目标 hover 状态
   */
  const setFeatureHoverState = (target: HoveredLayerTarget | null, hover: boolean): void => {
    if (!target) return;

    const { feature, layerConfig } = target;
    if (layerConfig.enableFeatureStateHover === false) return;

    const featureStateTarget = getFeatureStateTarget(feature);
    if (!featureStateTarget) return;

    map.setFeatureState(featureStateTarget, { hover });
  };

  /**
   * 同步命中目标的 selected feature-state。
   * @param target 当前目标
   * @param selected 目标选中状态
   */
  const setFeatureSelectedState = (target: HoveredLayerTarget | null, selected: boolean): void => {
    if (!target) return;

    const { feature, layerConfig } = target;
    if (layerConfig.enableFeatureStateSelected === false) return;

    const featureStateTarget = getFeatureStateTarget(feature);
    if (!featureStateTarget) return;

    map.setFeatureState(featureStateTarget, { selected });
  };

  /**
   * 清空当前 hover 状态，并按需触发 leave 回调。
   * @param shouldNotifyLeave 是否触发离开回调
   * @param extraContext 离开回调补充的上下文
   */
  const clearHoverState = (
    shouldNotifyLeave = true,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): void => {
    const previousTarget = hoveredTarget;
    hoveredTarget = null;
    setCanvasCursor(null);
    setFeatureHoverState(previousTarget, false);

    if (!previousTarget || !shouldNotifyLeave) {
      return;
    }

    emitTopLevelCallback(interactive.onHoverLeave, previousTarget, 'hoverleave', extraContext);
    emitLayerCallback(
      previousTarget.layerConfig.onHoverLeave,
      previousTarget,
      'hoverleave',
      extraContext
    );
  };

  /**
   * 清空当前选中状态，并按需触发取消选中回调。
   * @param shouldNotifyDeselect 是否触发取消选中回调
   * @param extraContext 取消选中回调补充的上下文
   */
  const clearSelectionState = (
    shouldNotifyDeselect = true,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): void => {
    const previousTarget = selectedTarget;
    selectedTarget = null;
    setFeatureSelectedState(previousTarget, false);

    if (!previousTarget || !shouldNotifyDeselect) {
      return;
    }

    emitLayerCallback(
      previousTarget.layerConfig.onFeatureDeselect,
      previousTarget,
      'featuredeselect',
      extraContext
    );
  };

  /**
   * 提取地图鼠标事件中的通用指针上下文。
   * @param event 当前地图鼠标事件
   * @returns 标准化后的指针上下文
   */
  const createPointerContext = (
    event: MapMouseEvent,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): Partial<MapLayerInteractiveContext> => {
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
   * 判断当前原始鼠标事件是否已被其他交互模块标记为已消费。
   * @param event 当前地图鼠标事件
   * @returns 已标记时返回 true
   */
  const isEventHandled = (event: MapMouseEvent): boolean => {
    return Boolean(
      (event.originalEvent as InteractiveMouseEvent | undefined)?.__mapInteractiveHandled__
    );
  };

  /**
   * 在原始鼠标事件上写入已处理标记，供其他交互模块共享判断。
   * @param event 当前地图鼠标事件
   */
  const markEventHandled = (event: MapMouseEvent): void => {
    const originalEvent = event.originalEvent as InteractiveMouseEvent | undefined;
    if (!originalEvent) {
      return;
    }

    originalEvent.__mapInteractiveHandled__ = true;
  };

  /**
   * 将空白点击回调延后到微任务阶段，便于等待其他交互模块先行写入处理标记。
   * @param event 当前地图鼠标事件
   * @param pointerContext 当前点击事件的指针上下文
   */
  const scheduleBlankClick = (
    event: MapMouseEvent,
    pointerContext: Partial<MapLayerInteractiveContext>
  ): void => {
    const emitBlankClick = () => {
      if (isEventHandled(event)) {
        return;
      }

      emitTopLevelCallback(interactive.onBlankClick, null, 'blankclick', pointerContext);
    };

    if (typeof globalThis.queueMicrotask === 'function') {
      globalThis.queueMicrotask(emitBlankClick);
      return;
    }

    Promise.resolve().then(emitBlankClick);
  };

  /**
   * 判断两个命中目标是否指向同一条业务要素。
   * @param previous 上一次命中目标
   * @param next 本次命中目标
   * @returns 指向同一条要素时返回 true
   */
  const isSameTarget = (
    previous: HoveredLayerTarget | null,
    next: HoveredLayerTarget | null
  ): boolean => {
    if (!previous || !next) return false;

    return (
      previous.layerId === next.layerId &&
      previous.feature.id === next.feature.id &&
      previous.feature.source === next.feature.source &&
      previous.feature.sourceLayer === next.feature.sourceLayer
    );
  };

  /**
   * 根据当前鼠标事件解析命中的业务图层目标。
   * @param event 当前地图鼠标事件
   * @returns 命中的图层目标；未命中时返回 null
   */
  const getEventTarget = (event: MapMouseEvent): HoveredLayerTarget | null => {
    const availableLayerIds = getLayerIdsInPriorityOrder();
    if (!availableLayerIds.length) {
      return null;
    }

    const availableLayerIdSet = new Set(availableLayerIds);
    const features = map.queryRenderedFeatures(event.point, {
      layers: availableLayerIds,
    }) as MapGeoJSONFeature[];

    if (!features.length) {
      return null;
    }

    for (const [layerId, layerConfig] of layerEntries) {
      if (!availableLayerIdSet.has(layerId)) {
        continue;
      }

      const targetFeature = features.find((feature) => feature.layer?.id === layerId);
      if (targetFeature) {
        return {
          feature: targetFeature,
          layerId,
          layerConfig,
        };
      }
    }

    return null;
  };

  /**
   * 根据普通图层吸附结果构建当前事件的有效命中目标。
   * 只有当吸附目标图层同时声明在普通交互配置里时，才会将其视为有效交互目标。
   * @param event 当前地图鼠标事件
   * @returns 原始命中目标、有效命中目标以及补充后的指针上下文
   */
  const resolveEventTarget = (event: MapMouseEvent): EventTargetResolution => {
    const rawTarget = getEventTarget(event);
    const snapResult = getSnapBinding?.()?.resolveMapEvent(event) || null;
    let effectiveTarget = rawTarget;

    if (
      snapResult?.matched &&
      snapResult.targetFeature &&
      snapResult.targetLayerId &&
      layerConfigMap.has(snapResult.targetLayerId)
    ) {
      effectiveTarget = {
        feature: snapResult.targetFeature,
        layerId: snapResult.targetLayerId,
        layerConfig: layerConfigMap.get(
          snapResult.targetLayerId
        ) as MapLayerInteractiveLayerOptions,
      };
    }

    return {
      rawTarget,
      effectiveTarget,
      pointerContext: createPointerContext(event, {
        ...(snapResult?.matched && snapResult.lngLat ? { lngLat: snapResult.lngLat } : {}),
        hitFeature: rawTarget?.feature || null,
        snapResult,
      }),
    };
  };

  /**
   * 触发交互管理器初始化完成回调。
   */
  const notifyReady = (): void => {
    emitTopLevelCallback(interactive.onReady, null, 'ready');
  };

  /**
   * 将 hover 命中目标同步到内部状态，并分发顶层与图层级回调。
   * @param target 当前 hover 命中目标
   * @param event 当前地图鼠标事件
   */
  const applyHoverTarget = (
    target: HoveredLayerTarget | null,
    pointerContext: Partial<MapLayerInteractiveContext>
  ): void => {
    if (!target) {
      clearHoverState(true, pointerContext);
      return;
    }

    if (isSameTarget(hoveredTarget, target)) {
      hoveredTarget = target;
      setCanvasCursor(target);
      return;
    }

    if (hoveredTarget) {
      clearHoverState(true, pointerContext);
    }

    hoveredTarget = target;
    setCanvasCursor(target);
    setFeatureHoverState(target, true);
    emitTopLevelCallback(interactive.onHoverEnter, target, 'hoverenter', pointerContext);
    emitLayerCallback(target.layerConfig.onHoverEnter, target, 'hoverenter', pointerContext);
  };

  /**
   * 将选中目标同步到内部状态，并触发图层级选中回调。
   * @param target 当前被点击命中的图层目标
   * @param pointerContext 当前点击指针上下文
   */
  const applySelectedTarget = (
    target: HoveredLayerTarget,
    pointerContext: Partial<MapLayerInteractiveContext>
  ): void => {
    if (isSameTarget(selectedTarget, target)) {
      selectedTarget = target;
      return;
    }

    clearSelectionState(true, pointerContext);
    selectedTarget = target;
    setFeatureSelectedState(target, true);
    emitLayerCallback(target.layerConfig.onFeatureSelect, target, 'featureselect', pointerContext);
  };

  /**
   * 统一申请一帧用于处理 hover hit-test，降低高频 mousemove 下的查询次数。
   * @param callback 本帧需要执行的回调
   * @returns 帧句柄
   */
  const requestHoverFrame = (callback: FrameRequestCallback): number => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      return globalThis.requestAnimationFrame(callback);
    }

    return globalThis.setTimeout(() => callback(Date.now()), 16) as unknown as number;
  };

  /**
   * 取消已经调度但尚未执行的 hover 帧任务。
   */
  const cancelScheduledHoverSync = (): void => {
    if (hoverFrameHandle === null) {
      pendingHoverEvent = null;
      return;
    }

    if (typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(hoverFrameHandle);
    } else {
      globalThis.clearTimeout(hoverFrameHandle);
    }

    hoverFrameHandle = null;
    pendingHoverEvent = null;
  };

  /**
   * 调度 hover 目标同步任务，始终只处理最新一次 mousemove。
   * @param event 最新的鼠标移动事件
   */
  const scheduleHoverTargetSync = (event: MapMouseEvent): void => {
    pendingHoverEvent = event;

    if (hoverFrameHandle !== null) {
      return;
    }

    hoverFrameHandle = requestHoverFrame(() => {
      hoverFrameHandle = null;
      const latestEvent = pendingHoverEvent;
      pendingHoverEvent = null;

      if (!latestEvent) {
        return;
      }

      const eventTargetResolution = resolveEventTarget(latestEvent);
      applyHoverTarget(eventTargetResolution.effectiveTarget, eventTargetResolution.pointerContext);
    });
  };

  /**
   * 统一处理 click / dblclick / contextmenu 三类地图指针事件。
   * @param event 当前地图鼠标事件
   * @param eventType 当前事件类型
   * @param topLevelCallback 顶层统一回调
   * @param getLayerCallback 读取图层级回调的函数
   */
  const handlePointerAction = (
    event: MapMouseEvent,
    eventType: PointerEventType,
    topLevelCallback: TopLevelInteractiveCallback | undefined,
    getLayerCallback: (
      layerConfig: MapLayerInteractiveLayerOptions
    ) => LayerInteractiveCallback | undefined
  ): void => {
    const { effectiveTarget: target, pointerContext } = resolveEventTarget(event);

    if (eventType === 'click') {
      if (target) {
        applySelectedTarget(target, pointerContext);
      } else {
        clearSelectionState(true, pointerContext);
      }
    }

    emitTopLevelCallback(topLevelCallback, target, eventType, pointerContext);

    if (!target) {
      if (eventType === 'click') {
        scheduleBlankClick(event, pointerContext);
      }
      return;
    }

    markEventHandled(event);
    emitLayerCallback(getLayerCallback(target.layerConfig), target, eventType, pointerContext);
  };

  /**
   * 处理地图 mousemove 事件，并以节流方式同步 hover 目标。
   * @param event 当前地图鼠标事件
   */
  const handleMouseMove = (event: MapMouseEvent): void => {
    scheduleHoverTargetSync(event);
  };

  /**
   * 处理地图 mouseout 事件，清理残留 hover 状态。
   * @param event 当前地图鼠标事件
   */
  const handleMouseOut = (event: MapMouseEvent): void => {
    cancelScheduledHoverSync();
    clearHoverState(true, createPointerContext(event, { hitFeature: null, snapResult: null }));
  };

  /**
   * 处理地图 click 事件。
   * @param event 当前地图鼠标事件
   */
  const handleMapClick = (event: MapMouseEvent) => {
    handlePointerAction(event, 'click', interactive.onClick, (layerConfig) => layerConfig.onClick);
  };

  /**
   * 处理地图 dblclick 事件。
   * @param event 当前地图鼠标事件
   */
  const handleMapDoubleClick = (event: MapMouseEvent) => {
    handlePointerAction(event, 'dblclick', interactive.onDoubleClick, (layerConfig) => {
      return layerConfig.onDoubleClick;
    });
  };

  /**
   * 处理地图 contextmenu 事件。
   * @param event 当前地图鼠标事件
   */
  const handleMapContextMenu = (event: MapMouseEvent) => {
    handlePointerAction(event, 'contextmenu', interactive.onContextMenu, (layerConfig) => {
      return layerConfig.onContextMenu;
    });
  };

  map.on('mousemove', handleMouseMove);
  map.on('mouseout', handleMouseOut);
  map.on('click', handleMapClick);
  map.on('dblclick', handleMapDoubleClick);
  map.on('contextmenu', handleMapContextMenu);

  notifyReady();

  return {
    destroy: () => {
      if (hasDisposed) return;
      hasDisposed = true;

      cancelScheduledHoverSync();
      clearHoverState(false);
      clearSelectionState(false);

      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
      map.off('click', handleMapClick);
      map.off('dblclick', handleMapDoubleClick);
      map.off('contextmenu', handleMapContextMenu);
    },
    clearHoverState: () => clearHoverState(),
    clearSelectionState: () => clearSelectionState(),
    getSelectedFeature: () => selectedTarget?.feature || null,
    getSelectedFeatureContext: () =>
      selectedTarget
        ? createInteractiveContext(selectedTarget.feature, selectedTarget.layerId, 'featureselect')
        : null,
  };
}
