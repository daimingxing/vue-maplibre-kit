import { toValue, type MaybeRefOrGetter } from 'vue';
import {
  TERRADRAW_MEASURE_SYSTEM_PROPERTY_KEYS as TERRADRAW_MEASURE_SYSTEM_KEYS,
  TERRADRAW_RESERVED_PROPERTY_KEYS as TERRADRAW_RESERVED_KEYS,
  type FeatureProperties,
  type MapFeatureId,
} from '../composables/useMapDataUpdate';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import {
  LINE_DRAFT_PREVIEW_HIDDEN_PROPERTY_KEYS,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
} from '../plugins/line-draft-preview/useLineDraftPreviewStore';
import type { LineDraftPreviewPluginApi } from '../plugins/line-draft-preview/useLineDraftPreviewController';
import {
  createMapSourceFeatureRef,
  extractManagedPreviewOriginFromProperties,
  type MapCommonFeature,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '../shared/map-common-tools';
import {
  clonePlainData,
  resolveMapFeaturePropertyPanelState,
  type MapFeaturePropertyPanelState,
} from '../shared/map-feature-data';
import type {
  MapLayerInteractiveContext,
  MapLayerSelectedFeature,
  MapLayerSelectionChangeContext,
  MapSelectionChangeReason,
  TerradrawControlType,
} from '../shared/mapLibre-controls-types';
import type { MapBusinessSourceRegistry } from './createMapBusinessSource';
import { resolveLineDraftPreviewApi } from './mapPluginResolver';

/**
 * TerraDraw 属性面板态查询入参。
 * 这一步只负责“读当前可展示的面板态”，不做实际写回。
 */
export interface ResolveTerradrawPropertyPanelStateOptions {
  /** 当前控件类型。 */
  controlType: TerradrawControlType;
  /** 目标要素 ID。 */
  featureId: MapFeatureId;
  /** 当前页面已持有的属性快照。 */
  currentProperties?: FeatureProperties;
}

/**
 * useMapFeatureQuery 初始化配置。
 */
export interface UseMapFeatureQueryOptions {
  /** 地图组件公开实例引用。 */
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>;
  /** 业务 source 注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
}

/**
 * useMapFeatureQuery 返回结果。
 */
export interface UseMapFeatureQueryResult {
  /** 将上下文对象归一化为标准来源引用。 */
  getFeatureRef: (
    contextOrRefLike:
      | Pick<MapLayerInteractiveContext, 'sourceId' | 'featureId'>
      | {
          sourceId?: string | null;
          featureId?: MapFeatureId | null;
        }
      | null
      | undefined
  ) => MapSourceFeatureRef | null;
  /** 获取当前选中要素的标准来源引用。 */
  getSelectedFeatureRef: () => MapSourceFeatureRef | null;
  /** 根据来源引用解析最新要素。 */
  resolveFeature: (featureRef: MapSourceFeatureRef | null) => MapCommonFeature | null;
  /** 根据来源引用解析属性面板态。 */
  resolveFeaturePropertyPanelState: (
    featureRef: MapSourceFeatureRef | null
  ) => MapFeaturePropertyPanelState | null;
  /** 解析当前选中的最新要素。 */
  resolveSelectedFeature: () => MapCommonFeature | null;
  /** 解析当前选中的属性面板态。 */
  resolveSelectedFeaturePropertyPanelState: () => MapFeaturePropertyPanelState | null;
  /** 解析当前选中的线要素。 */
  resolveSelectedLine: () => MapCommonLineFeature | null;
  /** 将普通图层交互上下文转换为业务层友好的视图对象。 */
  toBusinessContext: (
    context: MapLayerInteractiveContext | null | undefined
  ) => MapBusinessFeatureContext;
  /** 将选中集变化上下文转换为业务层友好的视图对象。 */
  toSelectionBusinessContext: (
    context: MapLayerSelectionChangeContext | null | undefined
  ) => MapBusinessSelectionContext;
  /** 解析 TerraDraw / Measure 当前要素的属性面板态。 */
  resolveTerradrawPropertyPanelState: (
    options: ResolveTerradrawPropertyPanelStateOptions
  ) => MapFeaturePropertyPanelState | null;
}

/** 业务层友好的单条选中项视图。 */
export interface MapBusinessSelectionItem {
  /** 当前选中项的标准来源引用。 */
  featureRef: MapSourceFeatureRef | null;
  /** 当前选中项对应的最新业务要素。 */
  feature: MapCommonFeature | null;
  /** 当前选中项最终可直接消费的属性对象。 */
  properties: Record<string, any> | null;
  /** 当前选中项业务 ID。 */
  featureId: MapFeatureId | null;
  /** 当前选中项所属图层 ID。 */
  layerId: string | null;
  /** 当前选中项所属 source ID。 */
  sourceId: string | null;
  /** 当前选中项所属 source-layer。 */
  sourceLayer: string | null;
  /** 当前选中项几何类型。 */
  geometryType: string | null;
  /** 当前选中项是否为点要素。 */
  isPoint: boolean;
  /** 当前选中项是否为线要素。 */
  isLine: boolean;
  /** 当前选中项是否为面要素。 */
  isPolygon: boolean;
}

/** 普通图层交互上下文对应的业务层视图。 */
export interface MapBusinessFeatureContext {
  /** 当前主目标要素的标准来源引用。 */
  featureRef: MapSourceFeatureRef | null;
  /** 当前主目标对应的最新业务要素。 */
  feature: MapCommonFeature | null;
  /** 当前主目标最终可直接消费的属性对象。 */
  properties: Record<string, any> | null;
  /** 当前主目标业务 ID。 */
  featureId: MapFeatureId | null;
  /** 当前命中的图层 ID。 */
  layerId: string | null;
  /** 当前命中的 source ID。 */
  sourceId: string | null;
  /** 当前命中的 source-layer。 */
  sourceLayer: string | null;
  /** 当前主目标几何类型。 */
  geometryType: string | null;
  /** 当前主目标是否为点要素。 */
  isPoint: boolean;
  /** 当前主目标是否为线要素。 */
  isLine: boolean;
  /** 当前主目标是否为面要素。 */
  isPolygon: boolean;
  /** 当前事件对应的经纬度坐标。 */
  lngLat: { lng: number; lat: number } | null;
  /** 当前选中项数量。 */
  selectedCount: number;
  /** 当前完整选中集快照。 */
  selectedFeatures: MapLayerSelectedFeature[];
}

/** 选中集变化对应的触发目标视图。 */
export interface MapBusinessSelectionTrigger {
  /** 触发本次选中集变化的主目标标准来源引用。 */
  featureRef: MapSourceFeatureRef | null;
  /** 触发本次选中集变化的主目标最新业务要素。 */
  feature: MapCommonFeature | null;
  /** 触发本次选中集变化的主目标属性对象。 */
  properties: Record<string, any> | null;
  /** 触发本次选中集变化的主目标业务 ID。 */
  featureId: MapFeatureId | null;
  /** 触发本次选中集变化的主目标图层 ID。 */
  layerId: string | null;
  /** 触发本次选中集变化的主目标 source ID。 */
  sourceId: string | null;
  /** 触发本次选中集变化的主目标 source-layer。 */
  sourceLayer: string | null;
  /** 触发本次选中集变化的主目标几何类型。 */
  geometryType: string | null;
  /** 触发本次选中集变化的主目标是否为点要素。 */
  isPoint: boolean;
  /** 触发本次选中集变化的主目标是否为线要素。 */
  isLine: boolean;
  /** 触发本次选中集变化的主目标是否为面要素。 */
  isPolygon: boolean;
  /** 触发本次选中集变化的事件经纬度坐标。 */
  lngLat: { lng: number; lat: number } | null;
}

/** 选中集变化上下文对应的业务层视图。 */
export interface MapBusinessSelectionContext {
  /** 当前选中集变化原因。 */
  reason: MapSelectionChangeReason | null;
  /** 触发本次选中集变化的主目标信息。 */
  trigger: MapBusinessSelectionTrigger;
  /** 当前完整选中集的业务层视图。 */
  selected: MapBusinessSelectionItem[];
  /** 本次新增选中项的业务层视图。 */
  added: MapBusinessSelectionItem[];
  /** 本次移除选中项的业务层视图。 */
  removed: MapBusinessSelectionItem[];
  /** 当前选中项数量。 */
  selectedCount: number;
  /** 当前完整选中集快照。 */
  selectedFeatures: MapLayerSelectedFeature[];
}

/**
 * 判断当前要素是否为线要素。
 * @param feature 待判断要素
 * @returns 是否为 LineString
 */
function isLineFeature(
  feature: MapCommonFeature | null | undefined
): feature is MapCommonLineFeature {
  return feature?.geometry?.type === 'LineString';
}

/**
 * 判断给定几何类型是否属于点类型。
 * @param geometryType 待判断几何类型
 * @returns 是否为点或多点
 */
function isPointGeometryType(geometryType: string | null): boolean {
  return geometryType === 'Point' || geometryType === 'MultiPoint';
}

/**
 * 判断给定几何类型是否属于线类型。
 * @param geometryType 待判断几何类型
 * @returns 是否为线或多线
 */
function isLineGeometryType(geometryType: string | null): boolean {
  return geometryType === 'LineString' || geometryType === 'MultiLineString';
}

/**
 * 判断给定几何类型是否属于面类型。
 * @param geometryType 待判断几何类型
 * @returns 是否为面或多面
 */
function isPolygonGeometryType(geometryType: string | null): boolean {
  return geometryType === 'Polygon' || geometryType === 'MultiPolygon';
}

/**
 * 将任意 feature-like 对象裁剪为标准 GeoJSON 要素快照。
 * @param featureLike 任意 feature-like 对象
 * @returns 可安全下发给业务层的普通要素；不完整时返回 null
 */
function toPlainCommonFeature(
  featureLike:
    | Pick<MapCommonFeature, 'type' | 'id' | 'geometry' | 'properties'>
    | null
    | undefined
): MapCommonFeature | null {
  if (!featureLike?.geometry || featureLike.type !== 'Feature') {
    return null;
  }

  return {
    type: 'Feature',
    ...(featureLike.id === undefined ? {} : { id: featureLike.id }),
    geometry: clonePlainData(featureLike.geometry),
    properties: featureLike.properties ? clonePlainData(featureLike.properties) : null,
  } as MapCommonFeature;
}

/**
 * 深拷贝当前选中集快照，避免业务层误改交互核心内部状态。
 * @param selectedFeatures 当前选中集快照
 * @returns 可安全消费的选中集副本
 */
function cloneSelectedFeatureList(
  selectedFeatures: MapLayerSelectedFeature[] | null | undefined
): MapLayerSelectedFeature[] {
  if (!selectedFeatures?.length) {
    return [];
  }

  return clonePlainData(selectedFeatures);
}

/**
 * 读取当前地图的业务要素查询门面。
 * 负责统一解析正式业务 source、线草稿 source 与 TerraDraw 的最新属性面板态。
 * @param options 查询门面配置
 * @returns 业务层可直接使用的查询结果
 */
export function useMapFeatureQuery(options: UseMapFeatureQueryOptions): UseMapFeatureQueryResult {
  const { mapRef, sourceRegistry } = options;

  /**
   * 获取当前 mapRef 对应的公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 读取当前页面注册的线草稿插件 API。
   * @returns 当前线草稿插件 API
   */
  const getLineDraftPreviewApi = (): LineDraftPreviewPluginApi | null => {
    return resolveLineDraftPreviewApi(getMapExpose());
  };

  /**
   * 读取当前 TerraDraw / Measure 控件实例。
   * @param controlType 当前控件类型
   * @returns 当前控件实例
   */
  const getTerradrawControl = (controlType: TerradrawControlType) => {
    const mapExpose = getMapExpose();
    return controlType === 'measure'
      ? mapExpose?.getMeasureControl?.() || null
      : mapExpose?.getDrawControl?.() || null;
  };

  /**
   * 将上下文对象归一化为标准来源引用。
   * @param contextOrRefLike 任意包含 sourceId 与 featureId 的对象
   * @returns 标准来源引用
   */
  const getFeatureRef = (
    contextOrRefLike:
      | Pick<MapLayerInteractiveContext, 'sourceId' | 'featureId' | 'layerId'>
      | {
          sourceId?: string | null;
          featureId?: MapFeatureId | null;
          layerId?: string | null;
        }
      | null
      | undefined
  ): MapSourceFeatureRef | null => {
    return createMapSourceFeatureRef(
      contextOrRefLike?.sourceId || null,
      contextOrRefLike?.featureId ?? null,
      contextOrRefLike?.layerId || null
    );
  };

  /**
   * 获取当前选中要素的标准来源引用。
   * @returns 当前选中要素来源引用
   */
  const getSelectedFeatureRef = (): MapSourceFeatureRef | null => {
    return getFeatureRef(getMapExpose()?.getSelectedMapFeatureContext?.() || null);
  };

  /**
   * 根据来源引用解析最新要素。
   * @param featureRef 目标来源引用
   * @returns 命中的要素；找不到时返回 null
   */
  const resolveFeature = (featureRef: MapSourceFeatureRef | null): MapCommonFeature | null => {
    if (!featureRef?.sourceId || featureRef.featureId === null) {
      return null;
    }

    if (featureRef.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID) {
      return getLineDraftPreviewApi()?.getFeatureById(featureRef.featureId) || null;
    }

    return sourceRegistry.resolveFeature(featureRef);
  };

  /**
   * 解析线草稿要素的属性面板态。
   * 线草稿会继承正式来源原图层的 propertyPolicy，
   * 同时再额外隐藏自己的内部来源字段。
   *
   * @param featureRef 线草稿来源引用
   * @returns 命中的属性面板态；找不到时返回 null
   */
  const resolveLineDraftPropertyPanelState = (
    featureRef: MapSourceFeatureRef
  ): MapFeaturePropertyPanelState | null => {
    const targetFeature = getLineDraftPreviewApi()?.getFeatureById(featureRef.featureId) || null;
    if (!targetFeature) {
      return null;
    }

    const originRef = extractManagedPreviewOriginFromProperties(targetFeature.properties || {});
    const originSource = originRef?.sourceId ? sourceRegistry.getSource(originRef.sourceId) : null;

    return resolveMapFeaturePropertyPanelState(targetFeature.properties || {}, {
      propertyPolicy: originSource?.resolvePropertyPolicy(originRef?.layerId) || null,
      protectedKeys: originSource?.protectedPropertyKeys || [],
      hiddenKeys: LINE_DRAFT_PREVIEW_HIDDEN_PROPERTY_KEYS,
    });
  };

  /**
   * 根据来源引用解析属性面板态。
   * 这是“从任意来源要素读取 panelState”的统一入口：
   * 正式业务源、线草稿、TerraDraw 都会在这里被收口成同一种结果结构。
   *
   * @param featureRef 目标来源引用
   * @returns 命中的属性面板态；找不到时返回 null
   */
  const resolveFeaturePropertyPanelState = (
    featureRef: MapSourceFeatureRef | null
  ): MapFeaturePropertyPanelState | null => {
    if (!featureRef?.sourceId || featureRef.featureId === null) {
      return null;
    }

    if (featureRef.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID) {
      return resolveLineDraftPropertyPanelState(featureRef);
    }

    return sourceRegistry.resolveFeaturePropertyPanelState(featureRef);
  };

  /**
   * 解析当前选中的最新要素。
   * @returns 当前选中的标准化要素快照
   */
  const resolveSelectedFeature = (): MapCommonFeature | null => {
    const featureRef = getSelectedFeatureRef();

    return resolveFeature(featureRef) || getMapExpose()?.getSelectedMapFeatureSnapshot?.() || null;
  };

  /**
   * 解析当前选中的属性面板态。
   * 适合业务层直接拿来驱动属性面板，而不用再自己判断来源类型。
   *
   * @returns 当前选中的属性面板态
   */
  const resolveSelectedFeaturePropertyPanelState = (): MapFeaturePropertyPanelState | null => {
    const featureRef = getSelectedFeatureRef();
    const panelState = resolveFeaturePropertyPanelState(featureRef);
    if (panelState) {
      return panelState;
    }

    const selectedFeature = getMapExpose()?.getSelectedMapFeatureSnapshot?.() || null;
    if (!selectedFeature?.properties) {
      return null;
    }

    return resolveMapFeaturePropertyPanelState(selectedFeature.properties);
  };

  /**
   * 解析当前选中的线要素。
   * @returns 当前选中线要素；不是线时返回 null
   */
  const resolveSelectedLine = (): MapCommonLineFeature | null => {
    const selectedFeature = resolveSelectedFeature();
    return isLineFeature(selectedFeature) ? selectedFeature : null;
  };

  /**
   * 将普通图层交互上下文转换为业务层友好的视图对象。
   * @param context 普通图层交互上下文
   * @returns 业务层可直接消费的上下文
   */
  const toBusinessContext = (
    context: MapLayerInteractiveContext | null | undefined
  ): MapBusinessFeatureContext => {
    const featureRef = getFeatureRef(context);
    const fallbackFeature = toPlainCommonFeature(
      context?.feature as unknown as MapCommonFeature | null | undefined
    );
    const resolvedFeature = resolveFeature(featureRef);
    const feature = resolvedFeature || fallbackFeature;
    const geometryType = feature?.geometry?.type || null;
    const selectedFeatures = cloneSelectedFeatureList(context?.selectedFeatures);

    return {
      featureRef,
      feature,
      properties: feature?.properties
        ? clonePlainData(feature.properties)
        : context?.properties
          ? clonePlainData(context.properties)
          : null,
      featureId:
        featureRef?.featureId ??
        context?.featureId ??
        ((feature?.id as MapFeatureId | null | undefined) ?? null),
      layerId: context?.layerId || null,
      sourceId: context?.sourceId || featureRef?.sourceId || null,
      sourceLayer: context?.sourceLayer || null,
      geometryType,
      isPoint: isPointGeometryType(geometryType),
      isLine: isLineGeometryType(geometryType),
      isPolygon: isPolygonGeometryType(geometryType),
      lngLat: context?.lngLat ? { ...context.lngLat } : null,
      selectedCount: context?.selectedCount ?? selectedFeatures.length,
      selectedFeatures,
    };
  };

  /**
   * 将单条选中项快照转换为业务层友好的视图对象。
   * @param selectedFeature 当前选中项快照
   * @returns 业务层可直接消费的选中项
   */
  const createBusinessSelectionItem = (
    selectedFeature: MapLayerSelectedFeature
  ): MapBusinessSelectionItem => {
    const featureRef = createMapSourceFeatureRef(
      selectedFeature.sourceId || null,
      selectedFeature.featureId ?? null,
      selectedFeature.layerId || null
    );
    const snapshotFeature = toPlainCommonFeature(selectedFeature.snapshot);
    const resolvedFeature = resolveFeature(featureRef);
    const feature = resolvedFeature || snapshotFeature;
    const geometryType = feature?.geometry?.type || null;

    return {
      featureRef,
      feature,
      properties: feature?.properties
        ? clonePlainData(feature.properties)
        : snapshotFeature?.properties
          ? clonePlainData(snapshotFeature.properties)
          : selectedFeature.properties
            ? clonePlainData(selectedFeature.properties)
            : null,
      featureId:
        selectedFeature.featureId ??
        featureRef?.featureId ??
        ((feature?.id as MapFeatureId | null | undefined) ?? null),
      layerId: selectedFeature.layerId || null,
      sourceId: selectedFeature.sourceId || featureRef?.sourceId || null,
      sourceLayer: selectedFeature.sourceLayer || null,
      geometryType,
      isPoint: isPointGeometryType(geometryType),
      isLine: isLineGeometryType(geometryType),
      isPolygon: isPolygonGeometryType(geometryType),
    };
  };

  /**
   * 将选中集快照列表转换为业务层友好的视图数组。
   * @param selectedFeatures 当前选中项快照列表
   * @returns 标准化后的业务层选中项数组
   */
  const toBusinessSelectionItems = (
    selectedFeatures: MapLayerSelectedFeature[] | null | undefined
  ): MapBusinessSelectionItem[] => {
    return (selectedFeatures || []).map((selectedFeature) => {
      return createBusinessSelectionItem(selectedFeature);
    });
  };

  /**
   * 将选中集变化上下文转换为业务层友好的视图对象。
   * @param context 选中集变化上下文
   * @returns 业务层可直接消费的选中集变化结果
   */
  const toSelectionBusinessContext = (
    context: MapLayerSelectionChangeContext | null | undefined
  ): MapBusinessSelectionContext => {
    const baseContext = toBusinessContext(context);

    return {
      reason: context?.reason || null,
      trigger: {
        featureRef: baseContext.featureRef,
        feature: baseContext.feature,
        properties: baseContext.properties,
        featureId: baseContext.featureId,
        layerId: baseContext.layerId,
        sourceId: baseContext.sourceId,
        sourceLayer: baseContext.sourceLayer,
        geometryType: baseContext.geometryType,
        isPoint: baseContext.isPoint,
        isLine: baseContext.isLine,
        isPolygon: baseContext.isPolygon,
        lngLat: baseContext.lngLat,
      },
      selected: toBusinessSelectionItems(context?.selectedFeatures),
      added: toBusinessSelectionItems(context?.addedFeatures),
      removed: toBusinessSelectionItems(context?.removedFeatures),
      selectedCount: baseContext.selectedCount,
      selectedFeatures: baseContext.selectedFeatures,
    };
  };

  /**
   * 解析 TerraDraw / Measure 当前要素的属性面板态。
   * 这里会叠加两类规则：
   * 1. 控件级 propertyPolicy
   * 2. TerraDraw / Measure 内部保留字段隐藏规则
   *
   * @param options 当前查询配置
   * @returns 当前属性面板态；找不到时返回 null
   */
  const resolveTerradrawPropertyPanelState = (
    options: ResolveTerradrawPropertyPanelStateOptions
  ): MapFeaturePropertyPanelState | null => {
    const { controlType, featureId, currentProperties } = options;
    const control = getTerradrawControl(controlType);
    const terradrawInstance = control?.getTerraDrawInstance?.();
    const featureProperties =
      currentProperties || terradrawInstance?.getSnapshotFeature?.(featureId)?.properties || null;

    if (!featureProperties) {
      return null;
    }

    const hiddenKeys =
      controlType === 'measure'
        ? [...TERRADRAW_RESERVED_KEYS, ...TERRADRAW_MEASURE_SYSTEM_KEYS]
        : [...TERRADRAW_RESERVED_KEYS];

    return resolveMapFeaturePropertyPanelState(featureProperties, {
      propertyPolicy: getMapExpose()?.getTerradrawPropertyPolicy?.(controlType) || null,
      hiddenKeys,
    });
  };

  return {
    getFeatureRef,
    getSelectedFeatureRef,
    resolveFeature,
    resolveFeaturePropertyPanelState,
    resolveSelectedFeature,
    resolveSelectedFeaturePropertyPanelState,
    resolveSelectedLine,
    toBusinessContext,
    toSelectionBusinessContext,
    resolveTerradrawPropertyPanelState,
  };
}
