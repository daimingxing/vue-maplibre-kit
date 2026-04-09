import { toValue, type MaybeRefOrGetter } from 'vue';
import type { MapFeatureId } from '../composables/useMapDataUpdate';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import {
  LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
  type LineDraftPreviewPluginApi,
} from '../plugins/line-draft-preview';
import {
  createMapSourceFeatureRef,
  type MapCommonFeature,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '../shared/map-common-tools';
import type { MapLayerInteractiveContext } from '../shared/mapLibre-controls-types';
import type { MapBusinessSourceRegistry } from './createMapBusinessSource';

/**
 * useMapFeatureQuery 初始化配置。
 */
export interface UseMapFeatureQueryOptions {
  /** 地图组件公开实例引用。 */
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>;
  /** 业务 source 注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
  /** 可选的线草稿插件 ID。 */
  lineDraftPreviewPluginId?: string;
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
  /** 解析当前选中的最新要素。 */
  resolveSelectedFeature: () => MapCommonFeature | null;
  /** 解析当前选中的线要素。 */
  resolveSelectedLine: () => MapCommonLineFeature | null;
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
 * 读取当前 mapRef 对应的线草稿插件 API。
 * @param mapExpose 地图公开实例
 * @param lineDraftPreviewPluginId 可选的插件 ID
 * @returns 命中的线草稿插件 API
 */
function resolveLineDraftPreviewApi(
  mapExpose: MapLibreInitExpose | null | undefined,
  lineDraftPreviewPluginId?: string
): LineDraftPreviewPluginApi | null {
  if (!mapExpose?.plugins) {
    return null;
  }

  if (lineDraftPreviewPluginId) {
    return mapExpose.plugins.getApi<LineDraftPreviewPluginApi>(lineDraftPreviewPluginId) || null;
  }

  const targetPlugin = mapExpose.plugins.list().find((plugin) => {
    return plugin.type === LINE_DRAFT_PREVIEW_PLUGIN_TYPE;
  });

  if (!targetPlugin) {
    return null;
  }

  return mapExpose.plugins.getApi<LineDraftPreviewPluginApi>(targetPlugin.id) || null;
}

/**
 * 读取当前地图的业务要素查询门面。
 * 负责统一解析正式业务 source 与线草稿 source 的最新要素快照。
 * @param options 查询门面配置
 * @returns 业务层可直接使用的查询结果
 */
export function useMapFeatureQuery(options: UseMapFeatureQueryOptions): UseMapFeatureQueryResult {
  const { mapRef, sourceRegistry, lineDraftPreviewPluginId } = options;

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
    return resolveLineDraftPreviewApi(getMapExpose(), lineDraftPreviewPluginId);
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
   * 解析当前选中的最新要素。
   * @returns 当前选中的标准化要素快照
   */
  const resolveSelectedFeature = (): MapCommonFeature | null => {
    const featureRef = getSelectedFeatureRef();

    return resolveFeature(featureRef) || getMapExpose()?.getSelectedMapFeatureSnapshot?.() || null;
  };

  /**
   * 解析当前选中的线要素。
   * @returns 当前选中线要素；不是线时返回 null
   */
  const resolveSelectedLine = (): MapCommonLineFeature | null => {
    const selectedFeature = resolveSelectedFeature();
    return isLineFeature(selectedFeature) ? selectedFeature : null;
  };

  return {
    getFeatureRef,
    getSelectedFeatureRef,
    resolveFeature,
    resolveSelectedFeature,
    resolveSelectedLine,
  };
}
