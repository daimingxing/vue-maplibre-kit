import { onBeforeUnmount, watch } from 'vue';
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import type { MapInstance } from 'vue-maplibre-gl';
import type {
  MapLayerInteractiveContext,
  MapLayerInteractiveEventType,
  MapLayerInteractiveLayerOptions,
  MapLayerInteractiveOptions,
  MapLayerSelectedFeature,
  MapLayerSelectionChangeContext,
  MapSelectionChangeReason,
  MapSelectionFilterContext,
  MapSelectionMode,
  ResolvedMapSelectionToolOptions,
} from '../shared/mapLibre-contols-types';
import type { MapSnapBinding, MapSelectionService } from '../plugins/types';
import type { MapCommonFeature } from '../shared/map-common-tools';

export interface UseMapInteractiveOptions {
  /** 地图实例引用，通常是通过 useMap() 获取的 */
  mapInstance: MapInstance;
  /** 获取最新的业务交互配置 */
  getInteractive: () => MapLayerInteractiveOptions | null | undefined;
  /** 获取当前普通图层吸附绑定 */
  getSnapBinding?: () => MapSnapBinding | null | undefined;
  /** 获取当前普通图层选择服务 */
  getSelectionService?: () => MapSelectionService | null | undefined;
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

interface BoxSelectionSession {
  /** 框选起点 */
  startPoint: { x: number; y: number };
  /** 框选终点 */
  currentPoint: { x: number; y: number };
  /** 框选浮层元素 */
  boxElement: HTMLDivElement | null;
  /** 当前拖拽是否已经超过最小阈值 */
  hasDragged: boolean;
  /** 进入框选前拖拽平移是否开启 */
  dragPanWasEnabled: boolean;
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

/** 框选触发的最小拖拽距离（像素）。 */
const BOX_SELECTION_MIN_DISTANCE = 4;

/** 选择服务缺省配置。 */
const defaultSelectionOptions: ResolvedMapSelectionToolOptions = {
  enabled: false,
  deactivateBehavior: 'clear',
  closeOnEscape: true,
  targetLayerIds: null,
  excludeLayerIds: [],
};

/**
 * 深拷贝简单可序列化对象。
 * @param value 待复制的值
 * @returns 深拷贝后的新值
 */
function cloneSerializable<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 将渲染态要素转换为标准 GeoJSON 快照。
 * @param feature 当前渲染态要素
 * @returns 标准化后的 GeoJSON 快照；无法转换时返回 null
 */
function toFeatureSnapshot(feature: MapGeoJSONFeature | null | undefined): MapCommonFeature | null {
  if (!feature?.geometry?.type) {
    return null;
  }

  return {
    type: 'Feature',
    id: feature.id,
    properties: cloneSerializable(feature.properties || {}),
    geometry: cloneSerializable(feature.geometry),
  } as MapCommonFeature;
}

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
      interactive.onSelectionChange ||
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
  const { mapInstance, getInteractive, getSnapBinding, getSelectionService } = options;

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

    binding = createMapInteractiveBinding(
      mapInstance.map,
      interactive,
      getSnapBinding,
      getSelectionService
    );
  };

  const stopInteractiveWatch = watch(
    () => ({
      isLoaded: mapInstance.isLoaded,
      interactive: getInteractive(),
    }),
    () => {
      syncBinding();
    },
    { immediate: true, deep: true }
  );
  const stopSelectionServiceWatch = watch(
    () => getSelectionService?.() || null,
    () => {
      syncBinding();
    }
  );

  onBeforeUnmount(() => {
    stopInteractiveWatch();
    stopSelectionServiceWatch();
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
  getSnapBinding?: (() => MapSnapBinding | null | undefined) | undefined,
  getSelectionService?: (() => MapSelectionService | null | undefined) | undefined
): MapInteractiveBinding {
  const layerEntries = Object.entries(interactive.layers || {});
  const layerConfigMap = new Map<string, MapLayerInteractiveLayerOptions>(layerEntries);
  const selectionService = getSelectionService?.() || null;
  let hoveredTarget: HoveredLayerTarget | null = null;
  let selectedTargetMap = new Map<string, HoveredLayerTarget>();
  let selectedFeatures: MapLayerSelectedFeature[] = [];
  let primarySelectedTarget: HoveredLayerTarget | null = null;
  let primarySelectedKey: string | null = null;
  let isMultiSelectActive = false;
  let hasDisposed = false;
  let hoverFrameHandle: number | null = null;
  let pendingHoverEvent: MapMouseEvent | null = null;
  let suppressNextClick = false;
  let boxSelectionSession: BoxSelectionSession | null = null;
  let boxZoomWasEnabled = false;
  let hasCapturedBoxZoomState = false;
  let keydownListenerBound = false;

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
   * 获取当前生效的选择模式。
   * @returns 当前选择模式
   */
  const getSelectionMode = (): MapSelectionMode => {
    return isMultiSelectActive ? 'multiple' : 'single';
  };

  /**
   * 读取当前生效的多选工具配置。
   * @returns 多选工具配置；未注册服务时返回关闭态默认值
   */
  const getSelectionOptions = (): ResolvedMapSelectionToolOptions => {
    return selectionService?.getOptions() || defaultSelectionOptions;
  };

  /**
   * 读取当前主选中目标。
   * @returns 当前主选中目标；不存在时返回 null
   */
  const getPrimarySelectedTarget = (): HoveredLayerTarget | null => {
    if (primarySelectedTarget) {
      const primarySelectionKey = createSelectionKey(primarySelectedTarget.feature);
      if (!primarySelectionKey) {
        return primarySelectedTarget;
      }

      if (selectedTargetMap.has(primarySelectionKey)) {
        primarySelectedKey = primarySelectionKey;
        primarySelectedTarget = selectedTargetMap.get(primarySelectionKey) || primarySelectedTarget;
        return primarySelectedTarget;
      }
    }

    let lastTarget: HoveredLayerTarget | null = null;
    let lastKey: string | null = null;

    selectedTargetMap.forEach((target, key) => {
      lastTarget = target;
      lastKey = key;
    });

    primarySelectedKey = lastKey;
    primarySelectedTarget = lastTarget;
    return lastTarget;
  };

  /**
   * 将地图事件屏幕坐标转换为相对地图容器的像素坐标。
   * @param event 原始 DOM 鼠标事件
   * @returns 相对地图容器的像素坐标
   */
  const getRelativePointFromMouseEvent = (event: MouseEvent): { x: number; y: number } => {
    const containerRect = map.getContainer().getBoundingClientRect();

    return {
      x: event.clientX - containerRect.left,
      y: event.clientY - containerRect.top,
    };
  };

  /**
   * 基于原始 DOM 鼠标事件创建统一指针上下文。
   * @param event 原始 DOM 鼠标事件
   * @returns 标准化后的指针上下文
   */
  const createPointerContextFromMouseEvent = (
    event: MouseEvent
  ): Partial<MapLayerInteractiveContext> => {
    const point = getRelativePointFromMouseEvent(event);
    const lngLat = map.unproject([point.x, point.y]);

    return {
      point,
      lngLat: {
        lng: lngLat.lng,
        lat: lngLat.lat,
      },
      rawLngLat: {
        lng: lngLat.lng,
        lat: lngLat.lat,
      },
      originalEvent: event,
      hitFeature: null,
      snapResult: null,
    };
  };

  /**
   * 读取当前完整选中集快照字段。
   * @returns 统一上下文需要的选中态字段
   */
  const createSelectionContextExtras = (): Pick<
    MapLayerInteractiveContext,
    'selectionMode' | 'isMultiSelectActive' | 'selectedFeatures' | 'selectedCount'
  > => {
    return {
      selectionMode: getSelectionMode(),
      isMultiSelectActive,
      selectedFeatures: [...selectedFeatures],
      selectedCount: selectedFeatures.length,
    };
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
    const properties = feature?.properties ? cloneSerializable(feature.properties) : null;

    return {
      feature,
      featureId,
      properties,
      layerId,
      sourceId,
      sourceLayer,
      map,
      ...createSelectionContextExtras(),
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
   * 为当前渲染要素构建稳定选择键。
   * @param feature 当前命中的要素
   * @returns 稳定选择键；不满足多选要求时返回 null
   */
  const createSelectionKey = (feature: MapGeoJSONFeature | null | undefined): string | null => {
    if (!feature) {
      return null;
    }

    const sourceId = typeof feature.source === 'string' ? feature.source : null;
    const featureId =
      typeof feature.id === 'string' || typeof feature.id === 'number' ? feature.id : null;

    if (!sourceId || featureId === null) {
      return null;
    }

    return `${sourceId}::${feature.sourceLayer || ''}::${String(featureId)}`;
  };

  /**
   * 基于命中目标构造公开选中项快照。
   * @param target 当前命中的图层目标
   * @returns 公开选中项快照；缺少稳定键时返回 null
   */
  const createSelectedFeatureRecord = (
    target: HoveredLayerTarget | null
  ): MapLayerSelectedFeature | null => {
    if (!target) {
      return null;
    }

    const key = createSelectionKey(target.feature);
    if (!key) {
      return null;
    }

    const featureId =
      typeof target.feature.id === 'string' || typeof target.feature.id === 'number'
        ? target.feature.id
        : null;

    return {
      key,
      featureId,
      layerId: target.layerId,
      sourceId: typeof target.feature.source === 'string' ? target.feature.source : null,
      sourceLayer: target.feature.sourceLayer || null,
      properties: target.feature.properties ? cloneSerializable(target.feature.properties) : null,
      snapshot: toFeatureSnapshot(target.feature),
    };
  };

  /**
   * 刷新当前公开选中集快照，并同步选择服务状态。
   */
  const syncSelectionState = (): void => {
    selectedFeatures = Array.from(selectedTargetMap.values())
      .map((target) => createSelectedFeatureRecord(target))
      .filter(Boolean) as MapLayerSelectedFeature[];

    selectionService?.syncState({
      isActive: isMultiSelectActive,
      selectionMode: getSelectionMode(),
      selectedFeatures: [...selectedFeatures],
      selectedCount: selectedFeatures.length,
      deactivateBehavior: getSelectionOptions().deactivateBehavior,
    });
  };

  /**
   * 从当前选中集合中读取最后一个稳定键。
   * @returns 最后一个稳定键；不存在时返回 null
   */
  const getLastSelectedKey = (): string | null => {
    let lastKey: string | null = null;

    selectedTargetMap.forEach((_target, key) => {
      lastKey = key;
    });

    return lastKey;
  };

  /**
   * 解析当前允许参与多选的图层集合。
   * @returns 当前可参与多选的图层 ID 列表
   */
  const getSelectableLayerIds = (): string[] => {
    const selectionOptions = getSelectionOptions();
    const baseLayerIds = selectionOptions.targetLayerIds || layerEntries.map(([layerId]) => layerId);
    const excludeLayerIdSet = new Set(selectionOptions.excludeLayerIds);

    return baseLayerIds
      .filter((layerId) => layerConfigMap.has(layerId))
      .filter((layerId) => !excludeLayerIdSet.has(layerId))
      .filter((layerId) => Boolean(map.getLayer(layerId)));
  };

  /**
   * 判断当前命中目标是否允许加入多选集。
   * @param target 当前命中的图层目标
   * @returns 允许加入多选集时返回 true
   */
  const canSelectTarget = (target: HoveredLayerTarget | null): boolean => {
    if (!target) {
      return false;
    }

    const selectionOptions = getSelectionOptions();
    if (!selectionOptions.enabled) {
      return false;
    }

    if (!createSelectionKey(target.feature)) {
      return false;
    }

    if (!getSelectableLayerIds().includes(target.layerId)) {
      return false;
    }

    if (!selectionOptions.canSelect) {
      return true;
    }

    const featureId =
      typeof target.feature.id === 'string' || typeof target.feature.id === 'number'
        ? target.feature.id
        : null;
    const filterContext: MapSelectionFilterContext = {
      feature: target.feature,
      featureId,
      layerId: target.layerId,
      sourceId: typeof target.feature.source === 'string' ? target.feature.source : null,
      sourceLayer: target.feature.sourceLayer || null,
      properties: target.feature.properties ? cloneSerializable(target.feature.properties) : null,
      selectedFeatures: [...selectedFeatures],
      map,
    };

    return selectionOptions.canSelect(filterContext);
  };

  /**
   * 统一触发选中集变化回调。
   * @param addedTargets 本次新增的选中目标
   * @param removedTargets 本次移除的选中目标
   * @param reason 本次变化原因
   * @param extraContext 额外上下文
   */
  const emitSelectionChange = (
    addedTargets: HoveredLayerTarget[],
    removedTargets: HoveredLayerTarget[],
    reason: MapSelectionChangeReason,
    extraContext: Partial<MapLayerInteractiveContext> = {}
  ): void => {
    if (!interactive.onSelectionChange) {
      return;
    }

    const primaryTarget = getPrimarySelectedTarget();
    const selectionExtraContext: Partial<MapLayerInteractiveContext> &
      Pick<MapLayerSelectionChangeContext, 'addedFeatures' | 'removedFeatures' | 'reason'> = {
      ...extraContext,
      selectedFeatures: [...selectedFeatures],
      selectedCount: selectedFeatures.length,
      addedFeatures: addedTargets
        .map((target) => createSelectedFeatureRecord(target))
        .filter(Boolean) as MapLayerSelectedFeature[],
      removedFeatures: removedTargets
        .map((target) => createSelectedFeatureRecord(target))
        .filter(Boolean) as MapLayerSelectedFeature[],
      reason,
    };
    const selectionContext = createInteractiveContext(
      primaryTarget?.feature || null,
      primaryTarget?.layerId || null,
      'selectionchange',
      selectionExtraContext
    ) as MapLayerSelectionChangeContext;

    interactive.onSelectionChange(selectionContext);
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
   * @param clearOptions 清空选中态的附加选项
   */
  const clearSelectionState = (clearOptions: {
    shouldNotifyDeselect?: boolean;
    shouldEmitSelectionChange?: boolean;
    reason?: MapSelectionChangeReason;
    extraContext?: Partial<MapLayerInteractiveContext>;
  } = {}): void => {
    const {
      shouldNotifyDeselect = true,
      shouldEmitSelectionChange = true,
      reason = 'api',
      extraContext = {},
    } = clearOptions;
    const previousSelectedMap = new Map(selectedTargetMap);
    const previousTargets = getCurrentSelectedTargets();

    previousTargets.forEach((target) => {
      setFeatureSelectedState(target, false);
    });

    selectedTargetMap.clear();
    primarySelectedTarget = null;
    primarySelectedKey = null;
    syncSelectionState();

    if (shouldNotifyDeselect) {
      previousTargets.forEach((target) => {
        emitLayerCallback(target.layerConfig.onFeatureDeselect, target, 'featuredeselect', extraContext);
      });
    }

    const removedTargets = Array.from(previousSelectedMap.values());
    if (shouldEmitSelectionChange && removedTargets.length > 0) {
      emitSelectionChange([], removedTargets, reason, extraContext);
    }
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
   * 读取当前完整选中目标集合。
   * 除稳定键选中集外，还会补上“仅单选可见但没有稳定 key”的主选中目标。
   * @returns 当前完整选中目标列表
   */
  const getCurrentSelectedTargets = (): HoveredLayerTarget[] => {
    const targetList = Array.from(selectedTargetMap.values());
    const primaryTarget = getPrimarySelectedTarget();
    const primaryKey = createSelectionKey(primaryTarget?.feature);

    if (primaryTarget && (!primaryKey || !selectedTargetMap.has(primaryKey))) {
      targetList.push(primaryTarget);
    }

    return targetList;
  };

  /**
   * 读取当前稳定键选中集中的最后一个目标。
   * @returns 当前最后一个稳定键选中目标；不存在时返回 null
   */
  const getLastSelectedTarget = (): HoveredLayerTarget | null => {
    const lastKey = getLastSelectedKey();
    if (!lastKey) {
      return null;
    }

    return selectedTargetMap.get(lastKey) || null;
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
   * 从选中集中移除指定稳定键目标。
   * @param selectionKey 待移除的稳定键
   * @param pointerContext 当前点击指针上下文
   * @returns 被移除的目标；不存在时返回 null
   */
  const removeSelectedTargetByKey = (
    selectionKey: string,
    pointerContext: Partial<MapLayerInteractiveContext>
  ): HoveredLayerTarget | null => {
    const removedTarget = selectedTargetMap.get(selectionKey) || null;
    if (!removedTarget) {
      return null;
    }

    selectedTargetMap.delete(selectionKey);
    setFeatureSelectedState(removedTarget, false);

    if (primarySelectedKey === selectionKey) {
      primarySelectedTarget = getLastSelectedTarget();
      primarySelectedKey = createSelectionKey(primarySelectedTarget?.feature) || null;
    }

    syncSelectionState();
    emitLayerCallback(
      removedTarget.layerConfig.onFeatureDeselect,
      removedTarget,
      'featuredeselect',
      pointerContext
    );

    return removedTarget;
  };

  /**
   * 在单选语义下应用新的主选中目标。
   * @param target 当前被点击命中的图层目标
   * @param pointerContext 当前点击指针上下文
   */
  const applySingleSelectedTarget = (
    target: HoveredLayerTarget,
    pointerContext: Partial<MapLayerInteractiveContext>
  ): void => {
    const previousSelectedMap = new Map(selectedTargetMap);
    const previousTargets = getCurrentSelectedTargets();
    const nextSelectionKey = createSelectionKey(target.feature);
    const hasSameStableTarget = nextSelectionKey ? previousSelectedMap.has(nextSelectionKey) : false;
    const isOnlySameTarget =
      previousTargets.length === 1 && isSameTarget(previousTargets[0], target);

    if (isOnlySameTarget) {
      primarySelectedTarget = target;

      if (nextSelectionKey) {
        selectedTargetMap.set(nextSelectionKey, target);
        primarySelectedKey = nextSelectionKey;
      } else {
        selectedTargetMap.clear();
        primarySelectedKey = null;
      }

      syncSelectionState();
      return;
    }

    previousTargets.forEach((previousTarget) => {
      if (!isSameTarget(previousTarget, target)) {
        setFeatureSelectedState(previousTarget, false);
      }
    });

    selectedTargetMap.clear();
    primarySelectedTarget = target;

    if (nextSelectionKey) {
      selectedTargetMap.set(nextSelectionKey, target);
      primarySelectedKey = nextSelectionKey;
    } else {
      primarySelectedKey = null;
    }

    setFeatureSelectedState(target, true);
    syncSelectionState();

    previousTargets.forEach((previousTarget) => {
      if (!isSameTarget(previousTarget, target)) {
        emitLayerCallback(
          previousTarget.layerConfig.onFeatureDeselect,
          previousTarget,
          'featuredeselect',
          pointerContext
        );
      }
    });

    if (!hasSameStableTarget) {
      emitLayerCallback(target.layerConfig.onFeatureSelect, target, 'featureselect', pointerContext);
    }

    const removedTargets = Array.from(previousSelectedMap.values()).filter((previousTarget) => {
      return createSelectionKey(previousTarget.feature) !== nextSelectionKey;
    });
    const addedTargets = nextSelectionKey && !hasSameStableTarget ? [target] : [];

    if (addedTargets.length > 0 || removedTargets.length > 0) {
      emitSelectionChange(addedTargets, removedTargets, 'click', pointerContext);
    }
  };

  /**
   * 在多选语义下切换当前目标的选中状态。
   * @param target 当前被点击命中的图层目标
   * @param pointerContext 当前点击指针上下文
   * @returns 是否真的发生了选中集变化
   */
  const toggleMultiSelectedTarget = (
    target: HoveredLayerTarget,
    pointerContext: Partial<MapLayerInteractiveContext>
  ): boolean => {
    const selectionKey = createSelectionKey(target.feature);
    if (!selectionKey || !canSelectTarget(target)) {
      return false;
    }

    if (selectedTargetMap.has(selectionKey)) {
      const removedTarget = removeSelectedTargetByKey(selectionKey, pointerContext);
      if (!removedTarget) {
        return false;
      }

      emitSelectionChange([], [removedTarget], 'click', pointerContext);
      return true;
    }

    selectedTargetMap.set(selectionKey, target);
    primarySelectedTarget = target;
    primarySelectedKey = selectionKey;
    setFeatureSelectedState(target, true);
    syncSelectionState();
    emitLayerCallback(target.layerConfig.onFeatureSelect, target, 'featureselect', pointerContext);
    emitSelectionChange([target], [], 'click', pointerContext);
    return true;
  };

  /**
   * 将框选命中的目标追加到当前选中集中。
   * 框选仅支持追加，不会对已存在的选中项做反选。
   * @param targets 本次框选命中的目标列表
   * @param pointerContext 当前框选结束时的指针上下文
   */
  const appendBoxSelectionTargets = (
    targets: HoveredLayerTarget[],
    pointerContext: Partial<MapLayerInteractiveContext>
  ): void => {
    const addedTargets: HoveredLayerTarget[] = [];

    targets.forEach((target) => {
      const selectionKey = createSelectionKey(target.feature);
      if (!selectionKey || selectedTargetMap.has(selectionKey) || !canSelectTarget(target)) {
        return;
      }

      selectedTargetMap.set(selectionKey, target);
      setFeatureSelectedState(target, true);
      addedTargets.push(target);
    });

    if (addedTargets.length === 0) {
      return;
    }

    const currentPrimaryTarget = getPrimarySelectedTarget();
    const currentPrimaryKey = createSelectionKey(currentPrimaryTarget?.feature);

    if (!currentPrimaryTarget || !currentPrimaryKey || !selectedTargetMap.has(currentPrimaryKey)) {
      primarySelectedTarget = addedTargets[addedTargets.length - 1];
      primarySelectedKey = createSelectionKey(primarySelectedTarget.feature) || primarySelectedKey;
    }

    syncSelectionState();
    addedTargets.forEach((target) => {
      emitLayerCallback(target.layerConfig.onFeatureSelect, target, 'featureselect', pointerContext);
    });
    emitSelectionChange(addedTargets, [], 'box', pointerContext);
  };

  /**
   * 将原始像素坐标限制在地图容器边界内。
   * @param point 原始像素坐标
   * @returns 限制后的像素坐标
   */
  const clampPointToCanvas = (point: { x: number; y: number }): { x: number; y: number } => {
    const mapContainer = map.getContainer();
    const maxX = mapContainer.clientWidth;
    const maxY = mapContainer.clientHeight;

    return {
      x: Math.max(0, Math.min(maxX, point.x)),
      y: Math.max(0, Math.min(maxY, point.y)),
    };
  };

  /**
   * 收集当前框选范围内允许加入多选集的目标。
   * @param session 当前框选会话
   * @returns 本次框选命中的目标集合
   */
  const collectBoxSelectionTargets = (session: BoxSelectionSession): HoveredLayerTarget[] => {
    const selectableLayerIds = getSelectableLayerIds();
    if (selectableLayerIds.length === 0) {
      return [];
    }

    const startPoint = clampPointToCanvas(session.startPoint);
    const currentPoint = clampPointToCanvas(session.currentPoint);
    const bbox = [
      [Math.min(startPoint.x, currentPoint.x), Math.min(startPoint.y, currentPoint.y)],
      [Math.max(startPoint.x, currentPoint.x), Math.max(startPoint.y, currentPoint.y)],
    ] as [[number, number], [number, number]];
    const renderedFeatures = map.queryRenderedFeatures(bbox, {
      layers: selectableLayerIds,
    }) as MapGeoJSONFeature[];
    const nextTargetMap = new Map<string, HoveredLayerTarget>();
    const selectableLayerIdSet = new Set(selectableLayerIds);

    layerEntries.forEach(([layerId, layerConfig]) => {
      if (!selectableLayerIdSet.has(layerId)) {
        return;
      }

      renderedFeatures.forEach((feature) => {
        if (feature.layer?.id !== layerId) {
          return;
        }

        const nextTarget: HoveredLayerTarget = {
          feature,
          layerId,
          layerConfig,
        };
        const selectionKey = createSelectionKey(feature);
        if (!selectionKey || nextTargetMap.has(selectionKey) || !canSelectTarget(nextTarget)) {
          return;
        }

        nextTargetMap.set(selectionKey, nextTarget);
      });
    });

    return Array.from(nextTargetMap.values());
  };

  /**
   * 销毁当前框选会话，并恢复拖拽平移状态。
   */
  const clearBoxSelectionSession = (): void => {
    const currentSession = boxSelectionSession;
    if (!currentSession) {
      return;
    }

    if (currentSession.boxElement?.parentNode) {
      currentSession.boxElement.parentNode.removeChild(currentSession.boxElement);
    }

    if (currentSession.dragPanWasEnabled && map.dragPan?.isEnabled && !map.dragPan.isEnabled()) {
      map.dragPan.enable();
    }

    boxSelectionSession = null;
    globalThis.removeEventListener('mousemove', handleWindowMouseMove);
    globalThis.removeEventListener('mouseup', handleWindowMouseUp);
  };

  /**
   * 按进入多选模式前的快照恢复原生 boxZoom 开关。
   */
  const restoreBoxZoomState = (): void => {
    if (!hasCapturedBoxZoomState) {
      return;
    }

    if (!map.boxZoom?.enable || !map.boxZoom?.disable) {
      return;
    }

    if (boxZoomWasEnabled) {
      map.boxZoom.enable();
    } else {
      map.boxZoom.disable();
    }

    hasCapturedBoxZoomState = false;
  };

  /**
   * 确保框选浮层元素已经创建并挂载到地图容器。
   * @returns 当前框选浮层元素
   */
  const ensureBoxSelectionElement = (): HTMLDivElement => {
    if (!boxSelectionSession) {
      throw new Error('[MapInteractive] 框选会话不存在，无法创建框选浮层');
    }

    if (boxSelectionSession.boxElement) {
      return boxSelectionSession.boxElement;
    }

    const boxElement = document.createElement('div');
    boxElement.className = 'maplibregl-boxzoom';
    boxElement.style.pointerEvents = 'none';
    map.getContainer().appendChild(boxElement);
    boxSelectionSession.boxElement = boxElement;
    return boxElement;
  };

  /**
   * 根据当前起终点同步框选浮层样式。
   */
  const syncBoxSelectionElement = (): void => {
    if (!boxSelectionSession) {
      return;
    }

    const boxElement = ensureBoxSelectionElement();
    const startPoint = clampPointToCanvas(boxSelectionSession.startPoint);
    const currentPoint = clampPointToCanvas(boxSelectionSession.currentPoint);
    const left = Math.min(startPoint.x, currentPoint.x);
    const top = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(startPoint.x - currentPoint.x);
    const height = Math.abs(startPoint.y - currentPoint.y);

    boxElement.style.transform = `translate(${left}px, ${top}px)`;
    boxElement.style.width = `${width}px`;
    boxElement.style.height = `${height}px`;
  };

  /**
   * 绑定多选模式下的全局键盘监听。
   */
  const attachMultiSelectKeydown = (): void => {
    if (keydownListenerBound) {
      return;
    }

    globalThis.addEventListener('keydown', handleWindowKeyDown);
    keydownListenerBound = true;
  };

  /**
   * 解绑多选模式下的全局键盘监听。
   */
  const detachMultiSelectKeydown = (): void => {
    if (!keydownListenerBound) {
      return;
    }

    globalThis.removeEventListener('keydown', handleWindowKeyDown);
    keydownListenerBound = false;
  };

  /**
   * 激活多选模式，并接管 boxZoom 行为。
   */
  const activateMultiSelectMode = (): void => {
    if (isMultiSelectActive || !getSelectionOptions().enabled) {
      return;
    }

    isMultiSelectActive = true;
    boxZoomWasEnabled = Boolean(map.boxZoom?.isEnabled?.());
    hasCapturedBoxZoomState = true;
    map.boxZoom?.disable?.();
    attachMultiSelectKeydown();
    syncSelectionState();
  };

  /**
   * 退出多选模式，并按配置决定是否保留当前选中集。
   * @param reason 本次退出原因
   */
  const deactivateMultiSelectMode = (reason: MapSelectionChangeReason = 'deactivate'): void => {
    if (!isMultiSelectActive) {
      syncSelectionState();
      return;
    }

    isMultiSelectActive = false;
    clearBoxSelectionSession();
    restoreBoxZoomState();
    detachMultiSelectKeydown();

    if (getSelectionOptions().deactivateBehavior === 'clear') {
      clearSelectionState({
        shouldNotifyDeselect: true,
        shouldEmitSelectionChange: true,
        reason,
      });
      return;
    }

    syncSelectionState();
  };

  /**
   * 处理框选拖拽中的全局 mousemove 事件。
   * @param event 原始 DOM 鼠标事件
   */
  const handleWindowMouseMove = (event: MouseEvent): void => {
    if (!boxSelectionSession) {
      return;
    }

    boxSelectionSession.currentPoint = getRelativePointFromMouseEvent(event);
    const deltaX = boxSelectionSession.currentPoint.x - boxSelectionSession.startPoint.x;
    const deltaY = boxSelectionSession.currentPoint.y - boxSelectionSession.startPoint.y;
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (!boxSelectionSession.hasDragged && dragDistance < BOX_SELECTION_MIN_DISTANCE) {
      return;
    }

    if (!boxSelectionSession.hasDragged) {
      boxSelectionSession.hasDragged = true;

      if (boxSelectionSession.dragPanWasEnabled) {
        map.dragPan?.disable?.();
      }
    }

    syncBoxSelectionElement();
    event.preventDefault();
  };

  /**
   * 处理框选结束时的全局 mouseup 事件。
   * @param event 原始 DOM 鼠标事件
   */
  const handleWindowMouseUp = (event: MouseEvent): void => {
    const currentSession = boxSelectionSession;
    if (!currentSession) {
      return;
    }

    currentSession.currentPoint = getRelativePointFromMouseEvent(event);
    const pointerContext = createPointerContextFromMouseEvent(event);

    if (currentSession.hasDragged) {
      const matchedTargets = collectBoxSelectionTargets(currentSession);
      clearBoxSelectionSession();

      if (matchedTargets.length > 0) {
        appendBoxSelectionTargets(matchedTargets, pointerContext);
      }

      suppressNextClick = true;
      event.preventDefault();
      return;
    }

    clearBoxSelectionSession();
  };

  /**
   * 处理多选模式下接管的 Shift + 左键 mousedown。
   * @param event 当前地图鼠标事件
   */
  const handleMapMouseDown = (event: MapMouseEvent): void => {
    const originalEvent = event.originalEvent as MouseEvent | undefined;
    if (
      !isMultiSelectActive ||
      !originalEvent ||
      originalEvent.button !== 0 ||
      originalEvent.shiftKey !== true
    ) {
      return;
    }

    clearBoxSelectionSession();
    boxSelectionSession = {
      startPoint: getRelativePointFromMouseEvent(originalEvent),
      currentPoint: getRelativePointFromMouseEvent(originalEvent),
      boxElement: null,
      hasDragged: false,
      dragPanWasEnabled: Boolean(map.dragPan?.isEnabled?.()),
    };

    globalThis.addEventListener('mousemove', handleWindowMouseMove);
    globalThis.addEventListener('mouseup', handleWindowMouseUp);

    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    originalEvent.preventDefault();
  };

  /**
   * 处理多选模式下的全局键盘事件。
   * @param event 原始 DOM 键盘事件
   */
  const handleWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !isMultiSelectActive || getSelectionOptions().closeOnEscape === false) {
      return;
    }

    event.preventDefault();
    deactivateMultiSelectMode('deactivate');
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
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }

      if (isMultiSelectActive) {
        if (target) {
          toggleMultiSelectedTarget(target, pointerContext);
          markEventHandled(event);
        } else {
          scheduleBlankClick(event, pointerContext);
        }

        // 多选模式下左键被选择语义完全接管：
        // 1. 命中要素时只做追加/反选，不再透传普通 onClick，避免误触发单选弹窗或详情逻辑
        // 2. 命中空白时仍通过上面的 scheduleBlankClick 触发 onBlankClick
        return;
      }

      if (target) {
        applySingleSelectedTarget(target, pointerContext);
      } else {
        clearSelectionState({
          shouldNotifyDeselect: true,
          shouldEmitSelectionChange: true,
          reason: 'click',
          extraContext: pointerContext,
        });
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
  map.on('mousedown', handleMapMouseDown);
  map.on('click', handleMapClick);
  map.on('dblclick', handleMapDoubleClick);
  map.on('contextmenu', handleMapContextMenu);

  const detachSelectionBinding =
    selectionService?.attachBinding({
      activate: activateMultiSelectMode,
      deactivate: () => deactivateMultiSelectMode('deactivate'),
      clear: () =>
        clearSelectionState({
          shouldNotifyDeselect: true,
          shouldEmitSelectionChange: true,
          reason: 'api',
        }),
      isActive: () => isMultiSelectActive,
    }) || null;

  if (selectionService && selectionService.isActive()) {
    activateMultiSelectMode();
  } else {
    syncSelectionState();
  }

  notifyReady();

  return {
    destroy: () => {
      if (hasDisposed) return;
      hasDisposed = true;

      cancelScheduledHoverSync();
      clearHoverState(false);
      clearBoxSelectionSession();
      detachMultiSelectKeydown();
      restoreBoxZoomState();
      isMultiSelectActive = false;
      clearSelectionState({
        shouldNotifyDeselect: false,
        shouldEmitSelectionChange: false,
      });
      detachSelectionBinding?.();

      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
      map.off('mousedown', handleMapMouseDown);
      map.off('click', handleMapClick);
      map.off('dblclick', handleMapDoubleClick);
      map.off('contextmenu', handleMapContextMenu);
    },
    clearHoverState: () => clearHoverState(),
    clearSelectionState: () =>
      clearSelectionState({
        shouldNotifyDeselect: true,
        shouldEmitSelectionChange: true,
        reason: 'api',
      }),
    getSelectedFeature: () => getPrimarySelectedTarget()?.feature || null,
    getSelectedFeatureContext: () => {
      const currentSelectedTarget = getPrimarySelectedTarget();
      return currentSelectedTarget
        ? createInteractiveContext(
            currentSelectedTarget.feature,
            currentSelectedTarget.layerId,
            'featureselect'
          )
        : null;
    },
  };
}
