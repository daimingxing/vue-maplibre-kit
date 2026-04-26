import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  MapFeatureMultiSelectPluginApi,
  MapFeatureMultiSelectState,
} from '../plugins/map-feature-multi-select';
import type {
  MapLayerSelectedFeature,
  MapSelectionMode,
} from '../shared/mapLibre-controls-types';
import {
  resolveMapFeatureMultiSelectApi,
  resolveMapFeatureMultiSelectState,
} from './mapPluginResolver';

/** 缺省空多选状态。 */
const defaultMultiSelectState: MapFeatureMultiSelectState = {
  isActive: false,
  selectionMode: 'single',
  selectedFeatures: [],
  selectedCount: 0,
  deactivateBehavior: 'clear',
};

/** useMapFeatureMultiSelect 返回结果。 */
export interface UseMapFeatureMultiSelectResult {
  /** 当前多选模式是否已激活。 */
  isActive: ComputedRef<boolean>;
  /** 当前选择模式。 */
  selectionMode: ComputedRef<MapSelectionMode>;
  /** 当前选中项数量。 */
  selectedCount: ComputedRef<number>;
  /** 当前选中要素快照。 */
  selectedFeatures: ComputedRef<MapLayerSelectedFeature[]>;
  /** 激活多选模式。 */
  activate: () => boolean;
  /** 退出多选模式。 */
  deactivate: () => boolean;
  /** 切换多选模式。 */
  toggle: () => boolean;
  /** 清空当前选中集。 */
  clear: () => boolean;
  /** 读取当前多选模式是否已激活。 */
  getActive: () => boolean;
  /** 读取当前完整选中集。 */
  getSelectedFeatures: () => MapLayerSelectedFeature[];
}

/**
 * 读取当前地图中的多选插件能力门面。
 * @param mapRef 地图组件公开实例引用
 * @returns 多选插件能力门面
 */
export function useMapFeatureMultiSelect(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
): UseMapFeatureMultiSelectResult {
  /**
   * 读取当前 mapRef 对应的地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 读取当前页面注册的多选插件 API。
   * @returns 当前多选插件 API
   */
  const getMultiSelectApi = (): MapFeatureMultiSelectPluginApi | null => {
    return resolveMapFeatureMultiSelectApi(getMapExpose());
  };

  const state = computed<MapFeatureMultiSelectState>(() => {
    return resolveMapFeatureMultiSelectState(getMapExpose()) || defaultMultiSelectState;
  });

  /**
   * 安全执行多选插件动作。
   * @param action 需要执行的动作
   * @returns 是否成功拿到插件并执行动作
   */
  const runAction = (action: (api: MapFeatureMultiSelectPluginApi) => void): boolean => {
    const multiSelectApi = getMultiSelectApi();
    if (!multiSelectApi) {
      return false;
    }

    action(multiSelectApi);
    return true;
  };

  return {
    isActive: computed(() => state.value.isActive),
    selectionMode: computed(() => state.value.selectionMode),
    selectedCount: computed(() => state.value.selectedCount),
    selectedFeatures: computed(() => [...state.value.selectedFeatures]),
    activate: () => runAction((api) => api.activate()),
    deactivate: () => runAction((api) => api.deactivate()),
    toggle: () => runAction((api) => api.toggle()),
    clear: () => runAction((api) => api.clear()),
    getActive: () => getMultiSelectApi()?.isActive() || false,
    getSelectedFeatures: () => getMultiSelectApi()?.getSelectedFeatures() || [],
  };
}
