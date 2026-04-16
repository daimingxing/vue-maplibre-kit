import { describe, expect, it, vi } from 'vitest';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type { MapDxfExportPluginApi } from '../plugins/map-dxf-export/types';
import { resolveMapDxfExportApi } from './mapPluginResolver';

/** DXF 导出插件类型常量。 */
const MAP_DXF_EXPORT_PLUGIN_TYPE = 'mapDxfExport';

describe('resolveMapDxfExportApi', () => {
  it('应能解析 DXF 导出插件 API', () => {
    const pluginApi: MapDxfExportPluginApi = {
      exportDxf: vi.fn(),
      downloadDxf: vi.fn(),
      getResolvedOptions: vi.fn(),
    } as unknown as MapDxfExportPluginApi;
    const mapExpose = {
      plugins: {
        has: () => true,
        getApi: () => pluginApi,
        getState: () => null,
        list: () => [
          {
            id: 'mapDxfExport',
            type: MAP_DXF_EXPORT_PLUGIN_TYPE,
          },
        ],
      },
    } as unknown as MapLibreInitExpose;

    expect(resolveMapDxfExportApi(mapExpose)).toBe(pluginApi);
  });

  it('应在插件未注册时返回 null', () => {
    const mapExpose = {
      plugins: {
        has: () => false,
        getApi: () => null,
        getState: () => null,
        list: () => [],
      },
    } as unknown as MapLibreInitExpose;

    expect(resolveMapDxfExportApi(mapExpose)).toBeNull();
  });
});
