import { describe, expect, it, vi } from 'vitest';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type { MapDxfExportPluginApi } from '../plugins/map-dxf-export/types';
import type {
  MapFeatureMultiSelectPluginApi,
  MapFeatureMultiSelectState,
} from '../plugins/map-feature-multi-select';
import {
  resolveMapDxfExportApi,
  resolveMapFeatureMultiSelectApi,
  resolveMapFeatureMultiSelectState,
} from './mapPluginResolver';

/** DXF 导出插件类型常量。 */
const MAP_DXF_EXPORT_PLUGIN_TYPE = 'mapDxfExport';
/** 多选插件类型常量。 */
const MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE = 'mapFeatureMultiSelect';

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

describe('resolveMapFeatureMultiSelectApi', () => {
  it('应能按插件类型解析多选插件 API 和状态', () => {
    const pluginApi: MapFeatureMultiSelectPluginApi = {
      activate: vi.fn(),
      deactivate: vi.fn(),
      toggle: vi.fn(),
      clear: vi.fn(),
      isActive: vi.fn(() => true),
      getSelectedFeatures: vi.fn(() => []),
    };
    const pluginState: MapFeatureMultiSelectState = {
      isActive: true,
      selectionMode: 'multiple',
      selectedFeatures: [],
      selectedCount: 0,
      deactivateBehavior: 'clear',
    };
    const mapExpose = {
      plugins: {
        has: () => true,
        getApi: () => pluginApi,
        getState: () => pluginState,
        list: () => [
          {
            id: 'mapFeatureMultiSelect',
            type: MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
          },
        ],
      },
    } as unknown as MapLibreInitExpose;

    expect(resolveMapFeatureMultiSelectApi(mapExpose)).toBe(pluginApi);
    expect(resolveMapFeatureMultiSelectState(mapExpose)).toBe(pluginState);
  });

  it('应在历史 pluginId 不匹配时返回 null', () => {
    const mapExpose = {
      plugins: {
        has: () => true,
        getApi: () => ({}),
        getState: () => ({}),
        list: () => [
          {
            id: 'mapFeatureMultiSelect',
            type: MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
          },
        ],
      },
    } as unknown as MapLibreInitExpose;

    expect(resolveMapFeatureMultiSelectApi(mapExpose, 'otherPlugin')).toBeNull();
    expect(resolveMapFeatureMultiSelectState(mapExpose, 'otherPlugin')).toBeNull();
  });
});
