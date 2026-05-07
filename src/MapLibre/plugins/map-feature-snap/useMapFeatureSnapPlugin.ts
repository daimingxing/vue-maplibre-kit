import { computed } from 'vue';
import { defineMapPlugin, type MapPluginDescriptor, type MapPluginRenderItem } from '../types';
import type { MapFeatureSnapOptions, MapFeatureSnapPluginApi, MapFeatureSnapState } from './types';
import MapFeatureSnapControl from './MapFeatureSnapControl.vue';
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
      activate: () => pluginController.activate(),
      deactivate: () => pluginController.deactivate(),
      toggle: () => pluginController.toggle(),
      isActive: () => pluginController.isActive.value,
      clearPreview: () => pluginController.clearPreview(),
      resolveMapEvent: (event: any) =>
        pluginController.resolveMapEvent(event) || createEmptyMapFeatureSnapResult(),
      resolveTerradrawSnapOptions: pluginController.resolveTerradrawSnapOptions,
    }));
    const pluginState = computed<MapFeatureSnapState>(() => ({
      isActive: pluginController.isActive.value,
    }));

    return {
      getRenderItems: () => {
        const renderItems: MapPluginRenderItem[] = [
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
        ];

        if (pluginController.enabled.value && pluginController.controlOptions.value.enabled) {
          renderItems.push({
            id: `${context.descriptor.id}-control`,
            component: MapFeatureSnapControl,
            props: {
              position: pluginController.controlOptions.value.position,
              isActive: pluginController.isActive.value,
              label: pluginController.controlOptions.value.label,
              onToggle: pluginController.toggle,
            },
          });
        }

        return renderItems;
      },
      getApi: () => pluginApi.value,
      state: pluginState,
      services: {
        mapSnap: {
          isActive: () => pluginController.isActive.value,
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
