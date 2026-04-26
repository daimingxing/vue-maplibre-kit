import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import { createMapBusinessSource, createMapBusinessSourceRegistry } from '../../facades/createMapBusinessSource';
import type { MapPluginContext } from '../types';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../../shared/map-common-tools';
import type { MapDxfExportOptions } from './types';
import {
  mapDxfExportPlugin,
  MAP_DXF_EXPORT_PLUGIN_TYPE,
  type MapDxfExportPluginDescriptor,
} from './useMapDxfExportPlugin';

vi.mock('vue-maplibre-gl', () => ({
  MglCustomControl: {
    name: 'MglCustomControl',
  },
}));

/**
 * 创建测试用要素集合。
 * @param features 要素列表
 * @returns 标准要素集合
 */
function createFeatureCollection(features: MapCommonFeature[]): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 创建测试用点要素。
 * @param id 要素 ID
 * @returns 标准点要素
 */
function createPointFeature(id: string): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
    },
    geometry: {
      type: 'Point',
      coordinates: [120, 30],
    },
  };
}

/**
 * 创建测试用 DXF 导出插件配置。
 * @returns 插件配置
 */
function createPluginOptions(): MapDxfExportOptions {
  const source = createMapBusinessSource({
    sourceId: 'business-source',
    data: ref(createFeatureCollection([createPointFeature('feature-1')])),
    promoteId: 'id',
  });

  return {
    sourceRegistry: createMapBusinessSourceRegistry([source]),
  };
}

/**
 * 创建测试用插件上下文。
 * @param optionsRef 插件配置引用
 * @returns 插件上下文
 */
function createPluginContext(
  optionsRef: { value: MapDxfExportOptions }
): MapPluginContext<typeof MAP_DXF_EXPORT_PLUGIN_TYPE, MapDxfExportOptions> {
  return {
    descriptor: {
      id: 'mapDxfExport',
      type: MAP_DXF_EXPORT_PLUGIN_TYPE,
      options: optionsRef.value,
      plugin: mapDxfExportPlugin,
    } as MapDxfExportPluginDescriptor,
    getOptions: () => optionsRef.value,
    getMap: () => null,
    getMapInstance: () => ({}) as any,
    getBaseMapInteractive: () => null,
    getSelectedFeatureContext: () => null,
    clearHoverState: () => undefined,
    clearSelectedFeature: () => undefined,
    clearPluginHoverState: () => undefined,
    clearPluginSelectedFeature: () => undefined,
    toFeatureSnapshot: () => null,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetMapGlobalConfig();
});

describe('mapDxfExportPlugin', () => {
  it('应暴露可读 API，并默认渲染内置控件', () => {
    const optionsRef = ref(createPluginOptions());
    const pluginInstance = mapDxfExportPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到 DXF 导出插件 API');
    }
    const renderItems = pluginInstance.getRenderItems?.() || [];

    expect(pluginApi.getResolvedOptions().fileName).toBe('map-export.dxf');
    expect(pluginApi.getResolvedOptions().sourceCrs).toBe('EPSG:4326');
    expect(pluginApi.getResolvedOptions().targetCrs).toBe('EPSG:3857');
    expect(renderItems).toHaveLength(1);
    expect(renderItems[0].props.position).toBe('top-right');
    expect(renderItems[0].props.label).toBe('导出DXF');
  });

  it('应在关闭控件时不渲染内置按钮', () => {
    const optionsRef = ref({
      ...createPluginOptions(),
      control: {
        enabled: false,
      },
    });
    const pluginInstance = mapDxfExportPlugin.createInstance(createPluginContext(optionsRef));

    expect(pluginInstance.getRenderItems?.()).toEqual([]);
  });

  it('应继承全局 DXF defaults 与 control 配置，并允许实例 defaults 覆写', () => {
    setMapGlobalConfig({
      plugins: {
        dxfExport: {
          defaults: {
            sourceCrs: 'EPSG:4490',
            targetCrs: 'EPSG:4547',
          },
          control: {
            label: '导出CAD',
            position: 'bottom-left',
          },
        },
      },
    });
    const optionsRef = ref({
      ...createPluginOptions(),
      defaults: {
        targetCrs: 'EPSG:3857',
      },
    });
    const pluginInstance = mapDxfExportPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到 DXF 导出插件 API');
    }
    const renderItems = pluginInstance.getRenderItems?.() || [];

    expect(pluginApi.getResolvedOptions().sourceCrs).toBe('EPSG:4490');
    expect(pluginApi.getResolvedOptions().targetCrs).toBe('EPSG:3857');
    expect(renderItems[0].props.position).toBe('bottom-left');
    expect(renderItems[0].props.label).toBe('导出CAD');
  });

  it('应在导出进行中暴露 isExporting 状态', async () => {
    const optionsRef = ref(createPluginOptions());
    const pluginInstance = mapDxfExportPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到 DXF 导出插件 API');
    }

    const exportPromise = pluginApi.exportDxf();

    expect(pluginInstance.state?.value.isExporting).toBe(true);

    await exportPromise;

    expect(pluginInstance.state?.value.isExporting).toBe(false);
  });

  it('应在导出成功后更新状态并触发下载', async () => {
    const optionsRef = ref(createPluginOptions());
    const pluginInstance = mapDxfExportPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到 DXF 导出插件 API');
    }
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        click,
        href: '',
        download: '',
      })),
    });
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    const result = await pluginApi.downloadDxf();

    expect(result?.fileName).toBe('map-export.dxf');
    expect(pluginInstance.state?.value.isExporting).toBe(false);
    expect(pluginInstance.state?.value.lastFileName).toBe('map-export.dxf');
    expect(pluginInstance.state?.value.lastFeatureCount).toBe(1);
    expect(pluginInstance.state?.value.lastEntityCount).toBe(1);
    expect(pluginInstance.state?.value.lastError).toBeNull();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('getResolvedOptions 应返回已合并的 TrueColor 解析器字段', () => {
    const pageLayerTrueColorResolver = vi.fn(() => '#112233');
    const pageFeatureTrueColorResolver = vi.fn(() => '#223344');
    const overrideLayerTrueColorResolver = vi.fn(() => '#445566');
    const optionsRef = ref({
      ...createPluginOptions(),
      defaults: {
        layerTrueColorResolver: pageLayerTrueColorResolver,
        featureTrueColorResolver: pageFeatureTrueColorResolver,
      },
    });
    const pluginInstance = mapDxfExportPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到 DXF 导出插件 API');
    }

    const defaultOptions = pluginApi.getResolvedOptions();
    const overrideOptions = pluginApi.getResolvedOptions({
      layerTrueColorResolver: overrideLayerTrueColorResolver,
    });

    expect(defaultOptions.layerTrueColorResolver).toBe(pageLayerTrueColorResolver);
    expect(defaultOptions.featureTrueColorResolver).toBe(pageFeatureTrueColorResolver);
    expect(overrideOptions.layerTrueColorResolver).toBe(overrideLayerTrueColorResolver);
    expect(overrideOptions.featureTrueColorResolver).toBe(pageFeatureTrueColorResolver);
  });

  it('应在导出失败后更新错误状态', async () => {
    const optionsRef = ref(createPluginOptions());
    const pluginInstance = mapDxfExportPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到 DXF 导出插件 API');
    }

    await expect(
      pluginApi.exportDxf({
        sourceIds: ['missing-source'],
      })
    ).rejects.toThrowError('未找到以下 sourceId：missing-source');

    expect(pluginInstance.state?.value.isExporting).toBe(false);
    expect(pluginInstance.state?.value.lastError).toBe('未找到以下 sourceId：missing-source');
  });
});
