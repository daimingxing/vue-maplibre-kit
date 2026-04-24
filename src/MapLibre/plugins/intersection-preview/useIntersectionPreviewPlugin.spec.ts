import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapPluginContext } from '../types';
import type { MapLayerInteractiveContext } from '../../shared/mapLibre-controls-types';
import type { MapCommonLineFeature, MapSourceFeatureRef } from '../../shared/map-common-tools';
import { createMapBusinessSource, createMapBusinessSourceRegistry } from '../../facades/createMapBusinessSource';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import { createLineBusinessLayer } from '../../facades/mapBusinessLayer';
import type { IntersectionPreviewOptions } from './types';
import {
  intersectionPreviewPlugin,
  INTERSECTION_PREVIEW_LAYER_ID,
  INTERSECTION_PREVIEW_PLUGIN_TYPE,
  INTERSECTION_PREVIEW_SOURCE_ID,
  INTERSECTION_MATERIALIZED_LAYER_ID,
  INTERSECTION_MATERIALIZED_SOURCE_ID,
  type IntersectionPreviewPluginDescriptor,
} from './useIntersectionPreviewPlugin';

vi.mock('vue-maplibre-gl', () => ({
  MglCircleLayer: {
    name: 'MglCircleLayer',
  },
  MglGeoJsonSource: {
    name: 'MglGeoJsonSource',
  },
}));

afterEach(() => {
  resetMapGlobalConfig();
});

/**
 * 创建测试用线要素。
 * @param id 线要素 ID
 * @param coordinates 线坐标串
 * @returns 标准线要素
 */
function createLineFeature(id: string, coordinates: [number, number][]): MapCommonLineFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      name: id,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

/**
 * 创建测试用来源引用。
 * @param featureId 业务要素 ID
 * @returns 标准来源引用
 */
function createFeatureRef(featureId: string): MapSourceFeatureRef {
  return {
    sourceId: 'line-source',
    featureId,
    layerId: 'line-layer',
  };
}

/**
 * 创建测试用插件配置。
 * @returns 插件配置
 */
function createPluginOptions(): IntersectionPreviewOptions {
  return {
    enabled: true,
    visible: true,
    scope: 'all',
    targetSourceIds: ['line-source'],
    targetLayerIds: ['line-layer'],
    includeEndpoint: true,
    coordDigits: 6,
    getCandidates: () => [
      {
        feature: createLineFeature('line-a', [
          [0, 0],
          [10, 10],
        ]),
        ref: createFeatureRef('line-a'),
      },
      {
        feature: createLineFeature('line-b', [
          [0, 10],
          [10, 0],
        ]),
        ref: createFeatureRef('line-b'),
      },
    ],
  };
}

/**
 * 创建测试用 sourceRegistry。
 * @returns 仅包含两条线 source 的业务注册表
 */
function createSourceRegistry() {
  const primarySource = createMapBusinessSource({
    sourceId: 'line-source',
    data: ref({
      type: 'FeatureCollection',
      features: [
        createLineFeature('line-a', [
          [0, 0],
          [10, 10],
        ]),
      ],
    }),
    promoteId: 'id',
    layers: [
      createLineBusinessLayer({
        layerId: 'line-layer',
        geometryTypes: ['LineString'],
        style: {
          layout: {},
          paint: {},
        },
      }),
    ],
  });
  const secondarySource = createMapBusinessSource({
    sourceId: 'line-source-2',
    data: ref({
      type: 'FeatureCollection',
      features: [
        createLineFeature('line-b', [
          [0, 10],
          [10, 0],
        ]),
      ],
    }),
    promoteId: 'id',
    layers: [
      createLineBusinessLayer({
        layerId: 'line-layer-2',
        geometryTypes: ['LineString'],
        style: {
          layout: {},
          paint: {},
        },
      }),
    ],
  });

  return createMapBusinessSourceRegistry([primarySource, secondarySource]);
}

/**
 * 创建测试用插件上下文。
 * @param optionsRef 插件配置引用
 * @returns 插件上下文
 */
function createPluginContext(
  optionsRef: { value: IntersectionPreviewOptions },
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null = () => null
): MapPluginContext<typeof INTERSECTION_PREVIEW_PLUGIN_TYPE, IntersectionPreviewOptions> {
  return {
    descriptor: {
      id: 'intersectionPreview',
      type: INTERSECTION_PREVIEW_PLUGIN_TYPE,
      options: optionsRef.value,
      plugin: intersectionPreviewPlugin,
    } as IntersectionPreviewPluginDescriptor,
    getOptions: () => optionsRef.value,
    getMap: () => null,
    getMapInstance: () => ({}) as any,
    getBaseMapInteractive: () => null,
    getSelectedFeatureContext,
    clearHoverState: () => undefined,
    clearSelectedFeature: () => undefined,
    clearPluginHoverState: () => undefined,
    clearPluginSelectedFeature: () => undefined,
    toFeatureSnapshot: () => null,
  };
}

describe('intersectionPreviewPlugin', () => {
  it('应在插件内部同时声明预览层与正式交点层，并通过插件专用交互通道暴露图层交互', () => {
    const optionsRef = ref(createPluginOptions());
    const pluginInstance = intersectionPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const renderItems = pluginInstance.getRenderItems?.() || [];
    const patch = pluginInstance.getMapInteractivePatch?.();
    const pluginLayerPatch = (pluginInstance as any).getPluginLayerInteractivePatch?.();
    const pluginApi = pluginInstance.getApi?.();

    expect(renderItems).toHaveLength(1);
    expect(renderItems[0].props.sourceId).toBe(INTERSECTION_PREVIEW_SOURCE_ID);
    expect(renderItems[0].props.materializedSourceId).toBe(INTERSECTION_MATERIALIZED_SOURCE_ID);
    expect(typeof pluginApi?.materialize).toBe('function');
    expect(typeof pluginApi?.clearMaterialized).toBe('function');
    expect(patch?.layers).toBeUndefined();
    expect(pluginLayerPatch?.layers?.[INTERSECTION_PREVIEW_LAYER_ID]).toBeTruthy();
    expect(pluginLayerPatch?.layers?.[INTERSECTION_MATERIALIZED_LAYER_ID]).toBeTruthy();
    expect(pluginLayerPatch?.layers?.[INTERSECTION_PREVIEW_LAYER_ID]?.hitPriority).toBeGreaterThan(0);
    expect(pluginLayerPatch?.layers?.[INTERSECTION_MATERIALIZED_LAYER_ID]?.hitPriority).toBeGreaterThan(0);
  });

  it('点击预览交点后应自动生成正式点要素', () => {
    const optionsRef = ref(createPluginOptions());
    const pluginInstance = intersectionPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到交点插件 API');
    }

    const [previewFeature] = pluginApi.getData().features;
    if (!previewFeature?.id) {
      throw new Error('当前预览交点为空，无法继续断言');
    }

    (pluginInstance as any)
      .getPluginLayerInteractivePatch?.()
      ?.layers?.[INTERSECTION_PREVIEW_LAYER_ID]
      ?.onClick?.({
        featureId: previewFeature.id,
      } as any);

    const materializedData = pluginApi.getMaterializedData();

    expect(materializedData.features).toHaveLength(1);
    expect(materializedData.features[0].properties?.generatedKind).toBe('intersection-materialized');
    expect(materializedData.features[0].properties?.id).toBe(previewFeature.id);
  });

  it('预览点与正式点共存时，选中正式点应返回正式点上下文，并支持显式分层查询', () => {
    const optionsRef = ref(createPluginOptions());
    const pluginInstance = intersectionPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到交点插件 API');
    }

    const [previewFeature] = pluginApi.getData().features;
    if (!previewFeature?.id) {
      throw new Error('当前预览交点为空，无法继续断言');
    }

    (pluginInstance as any)
      .getPluginLayerInteractivePatch?.()
      ?.layers?.[INTERSECTION_PREVIEW_LAYER_ID]
      ?.onClick?.({
        featureId: previewFeature.id,
      } as any);

    const materializedFeature = pluginApi.getMaterializedData().features[0];
    if (!materializedFeature?.id) {
      throw new Error('当前正式交点为空，无法继续断言');
    }

    (pluginInstance as any)
      .getPluginLayerInteractivePatch?.()
      ?.layers?.[INTERSECTION_MATERIALIZED_LAYER_ID]
      ?.onClick?.({
        featureId: materializedFeature.id,
      } as any);

    const selectedContext = pluginApi.getSelected();
    const previewContext = pluginApi.getPreviewById(String(previewFeature.id));
    const materializedContext = pluginApi.getMaterializedById(String(materializedFeature.id));

    expect(previewContext?.feature?.properties?.generatedKind).toBe('intersection-preview');
    expect(materializedContext?.feature?.properties?.generatedKind).toBe('intersection-materialized');
    expect(selectedContext?.feature?.properties?.generatedKind).toBe('intersection-materialized');
  });

  it('selected 模式下切换选中线后应自动刷新交点', () => {
    const optionsRef = ref<IntersectionPreviewOptions>({
      ...createPluginOptions(),
      scope: 'selected',
    });
    let selectedFeatureContext: MapLayerInteractiveContext | null = null;
    const pluginInstance = intersectionPreviewPlugin.createInstance(
      createPluginContext(optionsRef, () => selectedFeatureContext)
    );
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到交点插件 API');
    }

    expect(pluginApi.getData().features).toHaveLength(0);

    selectedFeatureContext = {
      featureId: 'line-a',
      sourceId: 'line-source',
      layerId: 'line-layer',
    } as MapLayerInteractiveContext;

    pluginInstance.getMapInteractivePatch?.()?.onSelectionChange?.({} as any);

    expect(pluginApi.getData().features).toHaveLength(1);
  });

  it('selected 模式下切到插件内部交点图层时不应清空当前预览', () => {
    const optionsRef = ref<IntersectionPreviewOptions>({
      ...createPluginOptions(),
      scope: 'selected',
    });
    let selectedFeatureContext: MapLayerInteractiveContext | null = null;
    const pluginInstance = intersectionPreviewPlugin.createInstance(
      createPluginContext(optionsRef, () => selectedFeatureContext)
    );
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到交点插件 API');
    }

    selectedFeatureContext = {
      featureId: 'line-a',
      sourceId: 'line-source',
      layerId: 'line-layer',
    } as MapLayerInteractiveContext;
    pluginInstance.getMapInteractivePatch?.()?.onSelectionChange?.({} as any);

    const [previewFeature] = pluginApi.getData().features;
    if (!previewFeature?.id) {
      throw new Error('未生成预览交点，无法继续断言');
    }

    selectedFeatureContext = {
      featureId: String(previewFeature.id),
      sourceId: INTERSECTION_PREVIEW_SOURCE_ID,
      layerId: INTERSECTION_PREVIEW_LAYER_ID,
    } as MapLayerInteractiveContext;
    pluginInstance.getMapInteractivePatch?.()?.onSelectionChange?.({} as any);

    expect(pluginApi.getData().features).toHaveLength(1);
  });

  it('未传 getCandidates 时应自动从 sourceRegistry 提取目标线', () => {
    const optionsRef = ref<IntersectionPreviewOptions>({
      enabled: true,
      visible: true,
      scope: 'all',
      sourceRegistry: createSourceRegistry(),
      targetSourceIds: ['line-source', 'line-source-2'],
      targetLayerIds: ['line-layer', 'line-layer-2'],
    });

    const pluginInstance = intersectionPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到交点插件 API');
    }

    expect(pluginApi.getData().features).toHaveLength(1);
  });

  it('应允许覆写预览层和正式交点层样式', () => {
    const optionsRef = ref<IntersectionPreviewOptions>({
      ...createPluginOptions(),
      previewStyleOverrides: {
        paint: {
          'circle-color': '#111111',
        },
      },
      materializedStyleOverrides: {
        paint: {
          'circle-radius': 12,
        },
      },
    });

    const pluginInstance = intersectionPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const renderItems = pluginInstance.getRenderItems?.() || [];
    const renderProps = renderItems[0]?.props;

    expect(renderProps.style.paint['circle-color']).toBe('#111111');
    expect(renderProps.materializedStyle.paint['circle-radius']).toBe(12);
  });

  it('应合并全局交点样式与实例样式，且实例优先级更高', () => {
    setMapGlobalConfig({
      plugins: {
        intersection: {
          previewStateStyles: {
            selected: {
              color: '#333333',
            },
          },
          previewStyleOverrides: {
            paint: {
              'circle-color': '#222222',
              'circle-radius': 8,
            },
          },
          materializedStyleOverrides: {
            paint: {
              'circle-radius': 9,
            },
          },
        },
      },
    });

    const optionsRef = ref<IntersectionPreviewOptions>({
      ...createPluginOptions(),
      previewStyleOverrides: {
        paint: {
          'circle-color': '#111111',
        },
      },
    });

    const pluginInstance = intersectionPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const renderItems = pluginInstance.getRenderItems?.() || [];
    const renderProps = renderItems[0]?.props;

    expect(renderProps.style.paint['circle-color']).toBe('#111111');
    expect(renderProps.style.paint['circle-radius']).toBe(8);
    expect(renderProps.materializedStyle.paint['circle-color'][2]).toBe('#0958d9');
    expect(renderProps.materializedStyle.paint['circle-radius']).toBe(9);
  });

  it('应支持通过状态样式配置覆写交点 selected 颜色', () => {
    const optionsRef = ref<IntersectionPreviewOptions>({
      ...createPluginOptions(),
      previewStateStyles: {
        selected: {
          color: '#ffcc00',
        },
      },
      materializedStateStyles: {
        selected: {
          color: '#00aaff',
        },
      },
    });

    const pluginInstance = intersectionPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const renderItems = pluginInstance.getRenderItems?.() || [];
    const renderProps = renderItems[0]?.props;

    expect(renderProps.style.paint['circle-color'][2]).toBe('#ffcc00');
    expect(renderProps.materializedStyle.paint['circle-color'][2]).toBe('#00aaff');
  });

  it('应支持交点 hover enter / leave 回调，并通过插件交互配置触发', () => {
    const onHoverEnter = vi.fn();
    const onHoverLeave = vi.fn();
    const optionsRef = ref<IntersectionPreviewOptions>({
      ...createPluginOptions(),
      onHoverEnter,
      onHoverLeave,
    });
    const pluginInstance = intersectionPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    if (!pluginApi) {
      throw new Error('未获取到交点插件 API');
    }

    const [previewFeature] = pluginApi.getData().features;
    if (!previewFeature?.id) {
      throw new Error('当前预览交点为空，无法继续断言');
    }

    const previewLayerConfig = (pluginInstance as any)
      .getPluginLayerInteractivePatch?.()
      ?.layers?.[INTERSECTION_PREVIEW_LAYER_ID];

    previewLayerConfig?.onHoverEnter?.({
      featureId: previewFeature.id,
    } as any);
    previewLayerConfig?.onHoverLeave?.({
      featureId: previewFeature.id,
    } as any);

    expect(onHoverEnter).toHaveBeenCalledTimes(1);
    expect(onHoverLeave).toHaveBeenCalledTimes(1);
  });
});
