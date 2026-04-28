import { computed } from 'vue';
import { defineMapPlugin, type MapPluginDescriptor } from '../types';
import type { MapFeatureSnapOptions, MapFeatureSnapPluginApi } from './types';
import MapFeatureSnapPreviewLayers from './MapFeatureSnapPreviewLayers.vue';
import { useMapFeatureSnapController } from './useMapFeatureSnapController';
import { createEmptyMapFeatureSnapResult } from './useMapFeatureSnapBinding';

/** 统一地图吸附插件类型标识。 */
export const MAP_FEATURE_SNAP_PLUGIN_TYPE = 'mapFeatureSnap';

/** 吸附预览渲染优先级，确保吸附点和线段提示压在其他临时预览线之上。 */
const SNAP_PREVIEW_RENDER_PRIORITY = 1000;

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
          renderPriority: SNAP_PREVIEW_RENDER_PRIORITY,
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
