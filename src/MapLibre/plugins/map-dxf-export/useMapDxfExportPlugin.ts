import { computed } from 'vue';
import { defineMapPlugin, type MapPluginDescriptor } from '../types';
import MapDxfExportControl from './MapDxfExportControl.vue';
import { useMapDxfExportService } from './useMapDxfExportService';
import type { MapDxfExportOptions, MapDxfExportPluginApi, MapDxfExportState } from './types';

/** DXF 导出插件类型标识。 */
export const MAP_DXF_EXPORT_PLUGIN_TYPE = 'mapDxfExport';

/** DXF 导出插件描述对象。 */
export interface MapDxfExportPluginDescriptor
  extends MapPluginDescriptor<typeof MAP_DXF_EXPORT_PLUGIN_TYPE, MapDxfExportOptions> {}

/**
 * DXF 导出插件定义。
 * 该插件负责统一业务 source 的 DXF 导出能力，并可选渲染一个内置导出控件。
 */
export const mapDxfExportPlugin = defineMapPlugin({
  type: MAP_DXF_EXPORT_PLUGIN_TYPE,
  createInstance(context) {
    const dxfExportService = useMapDxfExportService({
      getOptions: () => context.getOptions() as MapDxfExportOptions,
    });
    const pluginApi = computed<MapDxfExportPluginApi>(() => ({
      exportDxf: dxfExportService.exportDxf,
      downloadDxf: dxfExportService.downloadDxf,
      getResolvedOptions: dxfExportService.getResolvedOptions,
    }));

    return {
      getRenderItems: () => {
        const currentOptions = dxfExportService.resolvedOptions.value;
        if (!currentOptions.enabled || !currentOptions.control.enabled) {
          return [];
        }

        return [
          {
            id: context.descriptor.id,
            component: MapDxfExportControl,
            props: {
              position: currentOptions.control.position,
              label: currentOptions.control.label,
              isExporting: dxfExportService.state.value.isExporting,
              onExport: () => dxfExportService.downloadDxf(),
            },
          },
        ];
      },
      getApi: () => pluginApi.value,
      state: dxfExportService.state as typeof dxfExportService.state & {
        value: MapDxfExportState;
      },
    };
  },
});
