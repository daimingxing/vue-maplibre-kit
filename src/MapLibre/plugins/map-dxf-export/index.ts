import type { MapDxfExportOptions } from './types';
import {
  mapDxfExportPlugin,
  MAP_DXF_EXPORT_PLUGIN_TYPE,
  type MapDxfExportPluginDescriptor,
} from './useMapDxfExportPlugin';

/**
 * 创建 DXF 导出插件描述对象。
 * @param options DXF 导出插件配置
 * @param id 插件唯一标识；未传时默认使用 mapDxfExport
 * @returns 标准化后的插件描述对象
 */
export function createMapDxfExportPlugin(
  options: MapDxfExportOptions,
  id = 'mapDxfExport'
): MapDxfExportPluginDescriptor {
  return {
    id,
    type: MAP_DXF_EXPORT_PLUGIN_TYPE,
    options,
    plugin: mapDxfExportPlugin,
  };
}

export { mapDxfExportPlugin, MAP_DXF_EXPORT_PLUGIN_TYPE };
export type { MapDxfExportPluginDescriptor };
export type {
  MapDxfExportControlOptions,
  MapDxfExportOptions,
  MapDxfExportPluginApi,
  MapDxfExportResult,
  MapDxfExportState,
  MapDxfExportTaskOptions,
  MapDxfFeatureFilter,
  MapDxfLayerNameResolver,
  ResolvedMapDxfExportControlOptions,
  ResolvedMapDxfExportOptions,
  ResolvedMapDxfExportTaskOptions,
} from './types';
