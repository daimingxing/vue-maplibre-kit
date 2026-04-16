import { computed } from 'vue';
import { defineMapPlugin, type MapPluginDescriptor } from '../types';
import MapFeatureMultiSelectControl from './MapFeatureMultiSelectControl.vue';
import { useMapFeatureMultiSelectService } from './useMapFeatureMultiSelectService';
import type {
  MapFeatureMultiSelectOptions,
  MapFeatureMultiSelectPluginApi,
} from './types';

/** 要素多选插件类型标识。 */
export const MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE = 'mapFeatureMultiSelect';

/** 要素多选插件描述对象。 */
export interface MapFeatureMultiSelectPluginDescriptor
  extends MapPluginDescriptor<
    typeof MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
    MapFeatureMultiSelectOptions
  > {}

/**
 * 要素多选插件定义。
 * 该插件负责渲染多选控件、托管多选模式状态，并向交互核心提供选择服务。
 */
export const mapFeatureMultiSelectPlugin = defineMapPlugin({
  type: MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
  createInstance(context) {
    const multiSelectService = useMapFeatureMultiSelectService({
      getOptions: () => context.getOptions() as MapFeatureMultiSelectOptions,
    });
    const pluginApi = computed<MapFeatureMultiSelectPluginApi>(() => ({
      activate: () => multiSelectService.activate(),
      deactivate: () => multiSelectService.deactivate(),
      toggle: () => multiSelectService.toggle(),
      clear: () => multiSelectService.clear(),
      isActive: () => multiSelectService.isActive(),
      getSelectedFeatures: () => [...multiSelectService.state.value.selectedFeatures],
    }));

    return {
      getRenderItems: () => {
        if (!multiSelectService.resolvedOptions.value.enabled) {
          return [];
        }

        return [
          {
            id: context.descriptor.id,
            component: MapFeatureMultiSelectControl,
            props: {
              position: multiSelectService.resolvedOptions.value.position,
              isActive: multiSelectService.state.value.isActive,
              selectedCount: multiSelectService.state.value.selectedCount,
              onToggle: multiSelectService.toggle,
            },
          },
        ];
      },
      getApi: () => pluginApi.value,
      state: multiSelectService.state,
      services: {
        mapSelection: multiSelectService.service,
      },
    };
  },
});
