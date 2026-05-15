import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  PolygonEdgePreviewContext,
  PolygonEdgePreviewGenerateOptions,
  PolygonEdgePreviewGenerateResult,
  PolygonEdgePreviewPluginApi,
  PolygonEdgePreviewState,
} from '../plugins/polygon-edge-preview';
import { extractGeneratedParentRef, type MapCommonFeatureCollection } from '../shared/map-common-tools';
import {
  resolvePolygonEdgePreviewApi,
  resolvePolygonEdgePreviewState,
} from './mapPluginResolver';

/** usePolygonEdgePreview 返回结果。 */
export interface UsePolygonEdgePreviewResult {
  /** 当前面边线插件状态。 */
  state: ComputedRef<PolygonEdgePreviewState | null>;
  /** 当前是否已有边线。 */
  hasFeatures: ComputedRef<boolean>;
  /** 当前边线数量。 */
  featureCount: ComputedRef<number>;
  /** 当前选中边线 ID。 */
  selectedEdgeId: ComputedRef<string | null>;
  /** 从显式面要素生成边线。 */
  generateFromFeature: (
    options: PolygonEdgePreviewGenerateOptions
  ) => PolygonEdgePreviewGenerateResult;
  /** 从当前选中面生成边线。 */
  generateFromSelected: () => PolygonEdgePreviewGenerateResult;
  /** 高亮整个面。 */
  highlightPolygon: (polygonId: string | null) => boolean;
  /** 高亮单个 ring。 */
  highlightRing: (ringId: string | null) => boolean;
  /** 高亮单条边。 */
  highlightEdge: (edgeId: string | null) => boolean;
  /** 选中单条边。 */
  selectEdge: (edgeId: string | null) => boolean;
  /** 清理高亮。 */
  clearHighlight: () => boolean;
  /** 清空边线。 */
  clear: () => boolean;
  /** 获取当前数据源。 */
  getData: () => MapCommonFeatureCollection | null;
  /** 按边线 ID 获取上下文。 */
  getById: (edgeId: string | null) => PolygonEdgePreviewContext | null;
}

/**
 * 创建面边线插件未注册时的失败结果。
 * @returns 结构化失败结果
 */
function createMissingPluginResult(): PolygonEdgePreviewGenerateResult {
  return {
    success: false,
    message: '当前未注册面边线预览插件',
    edgeCount: 0,
    polygonId: null,
  };
}

/**
 * 读取当前地图中的面边线能力门面。
 * @param mapRef 地图组件公开实例引用
 * @returns 面边线能力门面
 */
export function usePolygonEdgePreview(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
): UsePolygonEdgePreviewResult {
  /**
   * 读取当前地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 读取面边线插件 API。
   * @returns 面边线插件 API
   */
  const getPolygonEdgeApi = (): PolygonEdgePreviewPluginApi | null => {
    return resolvePolygonEdgePreviewApi(getMapExpose());
  };

  const state = computed<PolygonEdgePreviewState | null>(() => {
    return resolvePolygonEdgePreviewState(getMapExpose());
  });

  /**
   * 安全执行布尔动作。
   * @param action 插件动作
   * @returns 插件动作结果；未注册时返回 false
   */
  const runBooleanAction = (action: (api: PolygonEdgePreviewPluginApi) => boolean): boolean => {
    const api = getPolygonEdgeApi();
    return api ? action(api) : false;
  };

  return {
    state,
    hasFeatures: computed(() => Boolean(state.value?.hasFeatures)),
    featureCount: computed(() => state.value?.featureCount || 0),
    selectedEdgeId: computed(() => state.value?.selectedEdgeId || null),
    generateFromFeature: (options) =>
      getPolygonEdgeApi()?.generateFromFeature(options) || createMissingPluginResult(),
    generateFromSelected: () =>
      getPolygonEdgeApi()?.generateFromSelected() || createMissingPluginResult(),
    highlightPolygon: (polygonId) => runBooleanAction((api) => api.highlightPolygon(polygonId)),
    highlightRing: (ringId) => runBooleanAction((api) => api.highlightRing(ringId)),
    highlightEdge: (edgeId) => runBooleanAction((api) => api.highlightEdge(edgeId)),
    selectEdge: (edgeId) => runBooleanAction((api) => api.selectEdge(edgeId)),
    clearHighlight: () => {
      const api = getPolygonEdgeApi();
      if (!api) {
        return false;
      }

      api.clearHighlight();
      return true;
    },
    clear: () => {
      const api = getPolygonEdgeApi();
      if (!api) {
        return false;
      }

      api.clear();
      return true;
    },
    getData: () => getPolygonEdgeApi()?.getData() || null,
    getById: (edgeId) => {
      const feature = getPolygonEdgeApi()?.getFeatureById(edgeId) || null;
      if (!feature) {
        return null;
      }

      return {
        feature,
        edgeId: typeof feature.properties?.edgeId === 'string' ? feature.properties.edgeId : null,
        ringId: typeof feature.properties?.ringId === 'string' ? feature.properties.ringId : null,
        polygonId:
          typeof feature.properties?.polygonId === 'string' ? feature.properties.polygonId : null,
        isOuterRing: feature.properties?.isOuterRing === true,
        originRef: extractGeneratedParentRef(feature.properties || {}),
      };
    },
  };
}
