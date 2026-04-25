import { computed } from 'vue';
import { defineMapPlugin, type MapPluginDescriptor } from '../types';
import type { MapFeatureSnapOptions, MapFeatureSnapPluginApi } from './types';
import MapFeatureSnapPreviewLayers from './MapFeatureSnapPreviewLayers.vue';
import { useMapFeatureSnapController } from './useMapFeatureSnapController';
import { createEmptyMapFeatureSnapResult } from './useMapFeatureSnapBinding';

/** 统一地图吸附插件类型标识。 */
export const MAP_FEATURE_SNAP_PLUGIN_TYPE = 'mapFeatureSnap';

/** 地图吸附插件描述对象。 */
export interface MapFeatureSnapPluginDescriptor
  extends MapPluginDescriptor<typeof MAP_FEATURE_SNAP_PLUGIN_TYPE, MapFeatureSnapOptions> {}

/**
 * 地图吸附插件定义。
 * 该插件负责普通图层吸附预览与 TerraDraw / Measure 吸附桥接。
 */
export const mapFeatureSnapPlugin = defineMapPlugin({
  type: MAP_FEATURE_SNAP_PLUGIN_TYPE,
  createInstance(context) {
    const pluginController = useMapFeatureSnapController({
      getOptions: () => context.getOptions() as MapFeatureSnapOptions,
      getMap: context.getMap,
    });
    const pluginApi = computed<MapFeatureSnapPluginApi>(() => ({
      clearPreview: () => pluginController.clearPreview(),
      resolveMapEvent: (event: any) =>
        pluginController.resolveMapEvent(event) || createEmptyMapFeatureSnapResult(),
      resolveTerradrawSnapOptions: pluginController.resolveTerradrawSnapOptions,
    }));

    return {
      getRenderItems: () => [
        {
          id: context.descriptor.id,
          component: MapFeatureSnapPreviewLayers,
          props: {
            enabled: pluginController.previewEnabled.value,
            data: pluginController.previewData.value,
            pointStyle: pluginController.previewPointStyle.value,
            lineStyle: pluginController.previewLineStyle.value,
          },
        },
      ],
      getApi: () => pluginApi.value,
      services: {
        mapSnap: {
          getBinding: () => pluginController.binding.value || null,
          resolveTerradrawSnapOptions: pluginController.resolveTerradrawSnapOptions,
          clearPreview: () => pluginController.clearPreview(),
        },
      },
      destroy: () => {
        pluginController.destroy();
      },
    };
  },
});
