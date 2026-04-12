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
  resolveMapFeaturePropertyPanelState,
  type MapFeaturePropertyPanelState,
} from '../shared/map-feature-data';
import type {
  MapLayerInteractiveContext,
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
  /** 解析 TerraDraw / Measure 当前要素的属性面板态。 */
  resolveTerradrawPropertyPanelState: (
    options: ResolveTerradrawPropertyPanelStateOptions
  ) => MapFeaturePropertyPanelState | null;
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
      | Pick<MapLayerInteractiveContext, 'sourceId' | 'featureId'>
      | {
          sourceId?: string | null;
          featureId?: MapFeatureId | null;
        }
      | null
      | undefined
  ): MapSourceFeatureRef | null => {
    return createMapSourceFeatureRef(
      contextOrRefLike?.sourceId || null,
      contextOrRefLike?.featureId ?? null
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
   * 线草稿会继承正式来源的 propertyPolicy，
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
      propertyPolicy: originSource?.propertyPolicy || null,
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
    resolveTerradrawPropertyPanelState,
  };
}
