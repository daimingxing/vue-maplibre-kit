import { onBeforeUnmount, watch } from 'vue';
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import type { MapInstance } from 'vue-maplibre-gl';
import type { MapPluginLayerInteractiveOptions, MapSnapBinding } from '../plugins/types';
import type {
  MapLayerInteractiveContext,
  MapLayerInteractiveEventType,
  MapLayerInteractiveLayerOptions,
  MapLayerSelectedFeature,
} from '../shared/mapLibre-controls-types';
import type { MapCommonFeature } from '../shared/map-common-tools';
import {
  isMapInteractiveEventHandled,
  markMapInteractiveEventHandled,
} from './mapInteractiveEventHandled';
import {
  shouldSnapOverrideRawTarget,
  sortLayerEntriesByHitPriority,
} from './useMapInteractive';

export interface UsePluginLayerInteractiveOptions {
  /** 地图实例引用。 */
  mapInstance: MapInstance;
  /** 读取当前插件托管图层交互配置。 */
  getInteractive: () => MapPluginLayerInteractiveOptions | null | undefined;
  /** 读取当前地图吸附绑定。 */
  getSnapBinding?: () => MapSnapBinding | null | undefined;
  /** 将渲染态要素转换为标准快照。 */
  toFeatureSnapshot: (feature: MapGeoJSONFeature | null | undefined) => MapCommonFeature | null;
}

interface HoveredLayerTarget {
  /** 当前命中的渲染要素。 */
  feature: MapGeoJSONFeature;
  /** 当前命中的图层 ID。 */
  layerId: string;
}

interface EventTargetResolution {
  /** 原始鼠标位置直接命中的目标。 */
  rawTarget: HoveredLayerTarget | null;
  /** 叠加吸附结果后的最终目标。 */
  effectiveTarget: HoveredLayerTarget | null;
  /** 当前事件需要透传给业务回调的指针上下文。 */
  pointerContext: Partial<MapLayerInteractiveContext>;
}

interface PluginLayerInteractiveBinding {
  /** 销毁当前绑定。 */
  destroy: () => void;
  /** 清理 hover 状态。 */
  clearHoverState: () => void;
  /** 清理选中状态。 */
  clearSelectionState: () => void;
  /** 读取当前选中的渲染要素。 */
  getSelectedFeature: () => MapGeoJSONFeature | null;
  /** 读取当前选中的交互上下文。 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null;
}

type LayerInteractiveCallbackResolver = (
  layerConfig: MapLayerInteractiveLayerOptions
) => ((context: MapLayerInteractiveContext) => void) | undefined;

type PointerEventType = Extract<MapLayerInteractiveEventType, 'click' | 'dblclick' | 'contextmenu'>;

/**
 * 深拷贝简单可序列化对象。
 * @param value 待复制的值
 * @returns 深拷贝后的副本
 */
function cloneSerializable<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 判断当前插件图层交互配置是否至少声明了一层。
 * @param interactive 插件图层交互配置
 * @returns 已声明图层时返回 true
 */
function hasInteractiveLayers(interactive: MapPluginLayerInteractiveOptions): boolean {
  return Boolean(interactive.layers && Object.keys(interactive.layers).length > 0);
}

/**
 * 插件托管图层统一交互管理 Hook。
 * 它只负责插件图层的命中、hover、selected 与事件消费，不参与业务普通图层逻辑。
 *
 * @param options Hook 初始化参数
 * @returns 插件图层交互能力集合
 */
export function usePluginLayerInteractive(options: UsePluginLayerInteractiveOptions) {
  const { mapInstance, getInteractive, getSnapBinding, toFeatureSnapshot } = options;
  let binding: PluginLayerInteractiveBinding | null = null;

  /**
   * 判断当前是否满足创建插件图层交互绑定的最小条件。
   * @returns 当前是否应启用插件交互绑定
   */
  const isBindingEnabled = (): boolean => {
    const interactive = getInteractive();
    return Boolean(interactive && interactive.enabled !== false && hasInteractiveLayers(interactive));
  };

  /**
   * 销毁当前已经挂载的交互绑定实例。
   */
  const destroyBinding = (): void => {
    binding?.destroy();
    binding = null;
  };

  /**
   * 根据最新地图实例和插件配置重新同步交互绑定。
   */
  const syncBinding = (): void => {
    destroyBinding();

    if (!mapInstance.isLoaded || !mapInstance.map || !isBindingEnabled()) {
      return;
    }

    binding = createPluginLayerInteractiveBinding(
      mapInstance.map,
      getInteractive,
      getSnapBinding,
      toFeatureSnapshot
    );
  };

  const stopBindingWatch = watch(
    () => ({
      isLoaded: mapInstance.isLoaded,
      hasMap: Boolean(mapInstance.map),
      isBindingEnabled: isBindingEnabled(),
    }),
    () => {
      syncBinding();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    stopBindingWatch();
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
 * 创建插件托管图层交互绑定实例。
 * @param map 当前地图实例
 * @param getInteractive 读取最新交互配置的方法
 * @param toFeatureSnapshot 渲染态快照转换函数
 * @returns 绑定实例
 */
function createPluginLayerInteractiveBinding(
  map: MaplibreMap,
  getInteractive: () => MapPluginLayerInteractiveOptions | null | undefined,
  getSnapBinding: (() => MapSnapBinding | null | undefined) | undefined,
  toFeatureSnapshot: (feature: MapGeoJSONFeature | null | undefined) => MapCommonFeature | null
): PluginLayerInteractiveBinding {
  let hoveredTarget: HoveredLayerTarget | null = null;
  let selectedTarget: HoveredLayerTarget | null = null;
  let hasDisposed = false;

  /**
   * 读取当前仍然启用的插件图层交互配置。
   * @returns 当前生效的交互配置；未启用时返回 null
   */
  const getCurrentInteractive = (): MapPluginLayerInteractiveOptions | null => {
    const interactive = getInteractive();
    if (!interactive || interactive.enabled === false || !hasInteractiveLayers(interactive)) {
      return null;
    }

    return interactive;
  };

  /**
   * 读取当前交互配置中的图层声明列表。
   * @returns 当前图层声明列表
   */
  const getLayerEntries = (): Array<[string, MapLayerInteractiveLayerOptions]> => {
    return Object.entries(getCurrentInteractive()?.layers || {});
  };

  /**
   * 按图层 ID 读取最新的交互配置。
   * @param layerId 当前图层 ID
   * @returns 当前图层配置；未声明时返回 null
   */
  const getLayerConfig = (
    layerId: string | null | undefined
  ): MapLayerInteractiveLayerOptions | null => {
    if (!layerId) {
      return null;
    }

    return getCurrentInteractive()?.layers?.[layerId] || null;
  };

  /**
   * 获取当前仍然存在于地图中的插件交互图层 ID。
   * @returns 可参与命中的插件图层 ID 列表
   */
  const getLayerIdsInPriorityOrder = (): string[] => {
    return getLayerEntries()
      .map(([layerId]) => layerId)
      .filter((layerId) => Boolean(map.getLayer(layerId)));
  };

  /**
   * 将地图鼠标事件转换为统一指针上下文。
   * @param event 当前地图鼠标事件
   * @param extraContext 额外补充字段
   * @returns 标准化后的指针上下文
   */
  const createPointerContext = (
    event: MapMouseEvent,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): Partial<MapLayerInteractiveContext> => {
    return {
      point: event.point,
      lngLat: event.lngLat
        ? {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          }
        : undefined,
      rawLngLat: event.lngLat
        ? {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          }
        : undefined,
      originalEvent: event.originalEvent,
      hitFeature: null,
      snapResult: null,
      ...extraContext,
    };
  };

  /**
   * 创建当前插件选中集快照。
   * 当前插件交互不承接多选语义，因此始终只会返回 0 或 1 个选中项。
   *
   * @returns 当前选中集字段
   */
  const createSelectionContextExtras = (): Pick<
    MapLayerInteractiveContext,
    'selectionMode' | 'isMultiSelectActive' | 'selectedFeatures' | 'selectedCount'
  > => {
    const selectedFeatureList = selectedTarget ? [createSelectedFeatureRecord(selectedTarget)] : [];

    return {
      selectionMode: 'single',
      isMultiSelectActive: false,
      selectedFeatures: selectedFeatureList,
      selectedCount: selectedFeatureList.length,
    };
  };

  /**
   * 将当前选中目标转换为选中项快照。
   * @param target 当前选中目标
   * @returns 标准化后的选中项记录
   */
  const createSelectedFeatureRecord = (
    target: HoveredLayerTarget
  ): MapLayerSelectedFeature => {
    const snapshot = toFeatureSnapshot(target.feature);
    const featureId =
      typeof target.feature.id === 'string' || typeof target.feature.id === 'number'
        ? target.feature.id
        : null;
    const sourceId = typeof target.feature.source === 'string' ? target.feature.source : null;

    return {
      key: `${sourceId || 'unknown'}::${target.layerId}::${String(featureId ?? '')}`,
      featureId,
      layerId: target.layerId,
      sourceId,
      sourceLayer: target.feature.sourceLayer || null,
      properties: cloneSerializable(target.feature.properties || null),
      snapshot,
    };
  };

  /**
   * 根据当前命中的目标同步地图画布鼠标样式。
   * @param target 当前命中目标
   */
  const setCanvasCursor = (target: HoveredLayerTarget | null): void => {
    const layerConfig = getLayerConfig(target?.layerId);
    if (!target || !layerConfig) {
      map.getCanvas().style.cursor = '';
      return;
    }

    const cursor = layerConfig.cursor;
    map.getCanvas().style.cursor = cursor === false ? '' : cursor || 'pointer';
  };

  /**
   * 构造插件图层统一交互上下文。
   * @param feature 当前命中的要素
   * @param layerId 当前命中的图层 ID
   * @param eventType 当前事件类型
   * @param extraContext 额外上下文
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

    return {
      feature,
      featureId,
      properties: feature?.properties ? cloneSerializable(feature.properties) : null,
      layerId,
      sourceId,
      sourceLayer: feature?.sourceLayer || null,
      map,
      ...createSelectionContextExtras(),
      ...extraContext,
      eventType,
    };
  };

  /**
   * 统一触发图层级交互回调。
   * @param target 当前命中的目标
   * @param eventType 当前事件类型
   * @param callbackResolver 当前事件的回调读取器
   * @param extraContext 额外上下文
   */
  const emitLayerCallback = (
    target: HoveredLayerTarget | null,
    eventType: MapLayerInteractiveEventType,
    callbackResolver: LayerInteractiveCallbackResolver,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): void => {
    const layerConfig = getLayerConfig(target?.layerId);
    const callback = layerConfig ? callbackResolver(layerConfig) : undefined;
    if (!callback || !target) {
      return;
    }

    callback(createInteractiveContext(target.feature, target.layerId, eventType, extraContext));
  };

  /**
   * 将命中要素转换为 feature-state 目标描述。
   * @param feature 当前命中的要素
   * @returns 可用于 feature-state 的目标描述
   */
  const getFeatureStateTarget = (
    feature: MapGeoJSONFeature
  ): {
    source: string;
    sourceLayer?: string;
    id: string | number;
  } | null => {
    const sourceId = typeof feature.source === 'string' ? feature.source : null;
    if (!sourceId || !map.getSource(sourceId)) {
      return null;
    }

    if (feature.id === undefined || feature.id === null) {
      return null;
    }

    return {
      source: sourceId,
      ...(feature.sourceLayer ? { sourceLayer: feature.sourceLayer } : {}),
      id: feature.id as string | number,
    };
  };

  /**
   * 同步当前目标的 hover feature-state。
   * @param target 当前目标
   * @param hover 目标 hover 状态
   */
  const setFeatureHoverState = (target: HoveredLayerTarget | null, hover: boolean): void => {
    if (!target) {
      return;
    }

    const layerConfig = getLayerConfig(target.layerId);
    if (hover && layerConfig?.enableFeatureStateHover === false) {
      return;
    }

    const featureStateTarget = getFeatureStateTarget(target.feature);
    if (!featureStateTarget) {
      return;
    }

    map.setFeatureState(featureStateTarget, { hover });
  };

  /**
   * 同步当前目标的 selected feature-state。
   * @param target 当前目标
   * @param selected 目标选中状态
   */
  const setFeatureSelectedState = (target: HoveredLayerTarget | null, selected: boolean): void => {
    if (!target) {
      return;
    }

    const layerConfig = getLayerConfig(target.layerId);
    if (selected && layerConfig?.enableFeatureStateSelected === false) {
      return;
    }

    const featureStateTarget = getFeatureStateTarget(target.feature);
    if (!featureStateTarget) {
      return;
    }

    map.setFeatureState(featureStateTarget, { selected });
  };

  /**
   * 判断两个命中目标是否指向同一条要素。
   * @param left 左侧目标
   * @param right 右侧目标
   * @returns 指向同一条要素时返回 true
   */
  const isSameTarget = (
    left: HoveredLayerTarget | null | undefined,
    right: HoveredLayerTarget | null | undefined
  ): boolean => {
    if (!left && !right) {
      return true;
    }

    if (!left || !right) {
      return false;
    }

    return (
      left.layerId === right.layerId &&
      left.feature.id === right.feature.id &&
      left.feature.source === right.feature.source &&
      left.feature.sourceLayer === right.feature.sourceLayer
    );
  };

  /**
   * 清空当前 hover 状态，并按需触发离开回调。
   * @param shouldNotifyLeave 是否触发离开回调
   * @param extraContext 离开回调补充上下文
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

    emitLayerCallback(
      previousTarget,
      'hoverleave',
      (layerConfig) => layerConfig.onHoverLeave,
      extraContext
    );
  };

  /**
   * 清空当前选中状态，并按需触发取消选中回调。
   * @param shouldNotifyDeselect 是否触发取消选中回调
   * @param extraContext 取消选中回调补充上下文
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
      previousTarget,
      'featuredeselect',
      (layerConfig) => layerConfig.onFeatureDeselect,
      extraContext
    );
  };

  /**
   * 将 hover 命中目标同步到内部状态。
   * @param target 当前 hover 命中目标
   * @param pointerContext 当前事件上下文
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
    emitLayerCallback(target, 'hoverenter', (layerConfig) => layerConfig.onHoverEnter, pointerContext);
  };

  /**
   * 将当前目标设置为插件主选中目标。
   * @param target 当前命中目标
   * @param pointerContext 当前事件上下文
   */
  const applySelectedTarget = (
    target: HoveredLayerTarget,
    pointerContext: Partial<MapLayerInteractiveContext>
  ): void => {
    if (isSameTarget(selectedTarget, target)) {
      selectedTarget = target;
      return;
    }

    if (selectedTarget) {
      clearSelectionState(true, pointerContext);
    }

    selectedTarget = target;
    setFeatureSelectedState(target, true);
    emitLayerCallback(
      target,
      'featureselect',
      (layerConfig) => layerConfig.onFeatureSelect,
      pointerContext
    );
  };

  /**
   * 根据当前鼠标事件解析命中的插件图层目标。
   * @param event 当前地图鼠标事件
   * @returns 命中的插件图层目标；未命中时返回 null
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

    for (const [layerId] of sortLayerEntriesByHitPriority(getLayerEntries())) {
      if (!availableLayerIdSet.has(layerId)) {
        continue;
      }

      const targetFeature = features.find((feature) => feature.layer?.id === layerId);
      if (targetFeature) {
        return {
          feature: targetFeature,
          layerId,
        };
      }
    }

    return null;
  };

  /**
   * 根据吸附结果解析插件图层的有效命中目标。
   * 当鼠标没有精确压在线上，但已经吸附到插件图层时，也允许触发 hover、点击和选中。
   *
   * @param event 当前地图鼠标事件
   * @returns 原始命中、最终命中与统一指针上下文
   */
  const resolveEventTarget = (event: MapMouseEvent): EventTargetResolution => {
    const rawTarget = getEventTarget(event);
    const snapResult = getSnapBinding?.()?.resolveMapEvent(event) || null;
    let effectiveTarget = rawTarget;
    const rawLayerConfig = getLayerConfig(rawTarget?.layerId || null);
    const snapLayerConfig = getLayerConfig(snapResult?.targetLayerId || null);

    if (
      snapResult?.matched &&
      snapResult.targetFeature &&
      snapResult.targetLayerId &&
      shouldSnapOverrideRawTarget(rawLayerConfig, snapLayerConfig)
    ) {
      effectiveTarget = {
        feature: snapResult.targetFeature,
        layerId: snapResult.targetLayerId,
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
   * 统一处理 click / dblclick / contextmenu 三类插件图层事件。
   * @param event 当前地图鼠标事件
   * @param eventType 当前事件类型
   * @param callbackResolver 读取图层级回调的函数
   */
  const handlePointerAction = (
    event: MapMouseEvent,
    eventType: PointerEventType,
    callbackResolver: LayerInteractiveCallbackResolver
  ): void => {
    if (isMapInteractiveEventHandled(event)) {
      return;
    }

    const { effectiveTarget: target, pointerContext } = resolveEventTarget(event);

    if (!target) {
      if (eventType === 'click') {
        clearSelectionState(true, pointerContext);
      }
      return;
    }

    markMapInteractiveEventHandled(event);
    applySelectedTarget(target, pointerContext);
    emitLayerCallback(target, eventType, callbackResolver, pointerContext);
  };

  /**
   * 处理地图 mousemove 事件。
   * @param event 当前地图鼠标事件
   */
  const handleMouseMove = (event: MapMouseEvent): void => {
    if (isMapInteractiveEventHandled(event)) {
      clearHoverState(true, createPointerContext(event, { hitFeature: null, snapResult: null }));
      return;
    }

    const { effectiveTarget: target, pointerContext } = resolveEventTarget(event);
    if (target) {
      markMapInteractiveEventHandled(event);
    }

    applyHoverTarget(target, pointerContext);
  };

  /**
   * 处理地图 mouseout 事件。
   * @param event 当前地图鼠标事件
   */
  const handleMouseOut = (event: MapMouseEvent): void => {
    clearHoverState(true, createPointerContext(event, { hitFeature: null }));
  };

  /**
   * 处理地图 click 事件。
   * @param event 当前地图鼠标事件
   */
  const handleMapClick = (event: MapMouseEvent): void => {
    handlePointerAction(event, 'click', (layerConfig) => layerConfig.onClick);
  };

  /**
   * 处理地图 dblclick 事件。
   * @param event 当前地图鼠标事件
   */
  const handleMapDoubleClick = (event: MapMouseEvent): void => {
    handlePointerAction(event, 'dblclick', (layerConfig) => layerConfig.onDoubleClick);
  };

  /**
   * 处理地图 contextmenu 事件。
   * @param event 当前地图鼠标事件
   */
  const handleMapContextMenu = (event: MapMouseEvent): void => {
    handlePointerAction(event, 'contextmenu', (layerConfig) => layerConfig.onContextMenu);
  };

  map.on('mousemove', handleMouseMove);
  map.on('mouseout', handleMouseOut);
  map.on('click', handleMapClick);
  map.on('dblclick', handleMapDoubleClick);
  map.on('contextmenu', handleMapContextMenu);

  return {
    destroy: () => {
      if (hasDisposed) {
        return;
      }

      hasDisposed = true;
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
    getSelectedFeatureContext: () => {
      return selectedTarget
        ? createInteractiveContext(selectedTarget.feature, selectedTarget.layerId, 'featureselect')
        : null;
    },
  };
}
