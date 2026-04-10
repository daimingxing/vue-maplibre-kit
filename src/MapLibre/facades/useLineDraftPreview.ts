import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { MapFeatureId } from '../composables/useMapDataUpdate';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  LineDraftPreviewStateChangePayload,
  LineDraftPreviewPluginApi,
} from '../plugins/line-draft-preview';
import type { MapCommonFeature } from '../shared/map-common-tools';
import { resolveLineDraftPreviewApi, resolveLineDraftPreviewState } from './mapPluginResolver';

/** useLineDraftPreview 初始化配置。 */
export interface UseLineDraftPreviewOptions {
  /** 可选的线草稿插件 ID。 */
  pluginId?: string;
}

/** useLineDraftPreview 返回结果。 */
export interface UseLineDraftPreviewResult {
  /** 当前线草稿插件状态。 */
  state: ComputedRef<LineDraftPreviewStateChangePayload | null>;
  /** 当前是否已有线草稿。 */
  hasFeatures: ComputedRef<boolean>;
  /** 当前线草稿数量。 */
  featureCount: ComputedRef<number>;
  /** 按要素 ID 获取当前线草稿要素。 */
  getFeatureById: (featureId: MapFeatureId | null) => MapCommonFeature | null;
  /** 清空全部线草稿。 */
  clear: () => boolean;
}

/**
 * 读取当前地图中的线草稿能力门面。
 * 业务层无需再自己监听 `pluginStateChange`，只需要直接读取这里暴露的状态与动作。
 * @param mapRef 地图组件公开实例引用
 * @param options 可选配置
 * @returns 线草稿能力门面
 */
export function useLineDraftPreview(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>,
  options: UseLineDraftPreviewOptions = {}
): UseLineDraftPreviewResult {
  const { pluginId } = options;

  /**
   * 读取当前 mapRef 对应的地图公开实例。
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
    return resolveLineDraftPreviewApi(getMapExpose(), pluginId);
  };

  const state = computed<LineDraftPreviewStateChangePayload | null>(() => {
    return resolveLineDraftPreviewState(getMapExpose(), pluginId);
  });

  const hasFeatures = computed<boolean>(() => {
    return Boolean(state.value?.hasFeatures) && (state.value?.featureCount || 0) > 0;
  });

  const featureCount = computed<number>(() => {
    return state.value?.featureCount || 0;
  });

  /**
   * 按要素 ID 读取当前线草稿要素。
   * @param featureId 目标线草稿要素 ID
   * @returns 命中的线草稿要素；找不到时返回 null
   */
  const getFeatureById = (featureId: MapFeatureId | null): MapCommonFeature | null => {
    return getLineDraftPreviewApi()?.getFeatureById(featureId) || null;
  };

  /**
   * 清空当前页面中的全部线草稿。
   * @returns 是否成功拿到线草稿能力并执行清空
   */
  const clear = (): boolean => {
    const lineDraftPreviewApi = getLineDraftPreviewApi();
    if (!lineDraftPreviewApi) {
      return false;
    }

    lineDraftPreviewApi.clear();
    return true;
  };

  return {
    state,
    hasFeatures,
    featureCount,
    getFeatureById,
    clear,
  };
}
