import { computed, shallowRef } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  MapFeatureMultiSelectPluginApi,
  MapFeatureMultiSelectState,
} from '../plugins/map-feature-multi-select';
import { useMapFeatureMultiSelect } from './useMapFeatureMultiSelect';

/** 多选插件类型常量。 */
const MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE = 'mapFeatureMultiSelect';

/**
 * 创建测试用地图公开实例。
 * @param api 多选插件 API
 * @param state 多选插件状态
 * @returns 地图公开实例
 */
function createMapExpose(
  api: MapFeatureMultiSelectPluginApi | null,
  state: MapFeatureMultiSelectState | null
): MapLibreInitExpose {
  return {
    plugins: {
      has: () => Boolean(api),
      getApi: () => api,
      getState: () => state,
      list: () =>
        api
          ? [
              {
                id: 'mapFeatureMultiSelect',
                type: MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
              },
            ]
          : [],
    },
  } as unknown as MapLibreInitExpose;
}

describe('useMapFeatureMultiSelect', () => {
  it('应暴露多选插件状态和动作', () => {
    const state = computed<MapFeatureMultiSelectState>(() => ({
      isActive: true,
      selectionMode: 'multiple',
      selectedFeatures: [],
      selectedCount: 2,
      deactivateBehavior: 'clear',
    }));
    const api: MapFeatureMultiSelectPluginApi = {
      activate: vi.fn(),
      deactivate: vi.fn(),
      toggle: vi.fn(),
      clear: vi.fn(),
      isActive: vi.fn(() => true),
      getSelectedFeatures: vi.fn(() => []),
    };

    const multiSelect = useMapFeatureMultiSelect(shallowRef(createMapExpose(api, state.value)));

    multiSelect.activate();
    multiSelect.toggle();
    multiSelect.clear();

    expect(multiSelect.isActive.value).toBe(true);
    expect(multiSelect.selectedCount.value).toBe(2);
    expect(multiSelect.getSelectedFeatures()).toEqual([]);
    expect(api.activate).toHaveBeenCalledTimes(1);
    expect(api.toggle).toHaveBeenCalledTimes(1);
    expect(api.clear).toHaveBeenCalledTimes(1);
  });

  it('应在插件未注册时安全降级', () => {
    const multiSelect = useMapFeatureMultiSelect(shallowRef(createMapExpose(null, null)));

    expect(multiSelect.isActive.value).toBe(false);
    expect(multiSelect.selectedCount.value).toBe(0);
    expect(multiSelect.getSelectedFeatures()).toEqual([]);
  });
});
