import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import { useMapFeatureSnapController } from './useMapFeatureSnapController';

const INTERSECTION_MATERIALIZED_LAYER_ID = 'intersection-materialized-layer';
const POLYGON_EDGE_PREVIEW_LAYER_ID = 'polygonEdgePreviewLineLayer';

/**
 * 创建吸附控制器测试用地图桩。
 * @param features 当前查询应返回的渲染要素
 * @returns 最小地图桩对象
 */
function createMapStub(features: any[]) {
  return {
    on: vi.fn(),
    off: vi.fn(),
    getLayer: vi.fn((layerId: string) => ({ id: layerId })),
    queryRenderedFeatures: vi.fn((_bbox: unknown, options?: { layers?: string[] }) => {
      const layers = options?.layers || [];
      return features.filter((feature) => layers.includes(feature.layer.id));
    }),
    project: vi.fn((coordinate: [number, number]) => ({
      x: coordinate[0],
      y: coordinate[1],
    })),
    unproject: vi.fn((point: [number, number] | { x: number; y: number }) => {
      if (Array.isArray(point)) {
        return {
          lng: point[0],
          lat: point[1],
        };
      }

      return {
        lng: point.x,
        lat: point.y,
      };
    }),
  };
}

describe('useMapFeatureSnapController', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    resetMapGlobalConfig();
  });

  it('应继承全局 snap 预览默认值，并允许实例局部覆写', () => {
    setMapGlobalConfig({
      plugins: {
        snap: {
          preview: {
            pointColor: '#1677ff',
            lineWidth: 6,
          },
        },
      },
    });

    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        preview: {
          lineColor: '#ff4d4f',
        },
      }),
      getMap: () => null,
    });

    const pointPaint = controller.previewPointStyle.value.paint;
    const linePaint = controller.previewLineStyle.value.paint;
    if (!pointPaint || !linePaint) {
      throw new Error('吸附预览样式缺少 paint，无法继续断言');
    }

    expect(pointPaint['circle-color']).toBe('#1677ff');
    expect(linePaint['line-color']).toBe('#ff4d4f');
    expect(linePaint['line-width']).toBe(6);
  });

  it('应字段级合并全局 snap 控件默认值和实例局部配置', () => {
    setMapGlobalConfig({
      plugins: {
        snap: {
          control: {
            enabled: false,
            position: 'bottom-left',
            label: '全局吸附',
          },
        },
      },
    });

    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        control: {
          enabled: true,
        },
      }),
      getMap: () => null,
    });

    expect(controller.controlOptions.value).toEqual({
      enabled: true,
      position: 'bottom-left',
      label: '全局吸附',
      panelEnabled: false,
    });
  });

  it('应字段级合并 snap 右键面板配置，并默认关闭面板', () => {
    setMapGlobalConfig({
      plugins: {
        snap: {
          control: {
            panel: true,
          },
        },
      },
    });

    const enabledController = useMapFeatureSnapController({
      getOptions: () => ({
        control: {
          enabled: true,
        },
      }),
      getMap: () => null,
    });
    const disabledController = useMapFeatureSnapController({
      getOptions: () => ({
        control: {
          panel: {
            enabled: false,
          },
        },
      }),
      getMap: () => null,
    });

    expect(enabledController.controlOptions.value.panelEnabled).toBe(true);
    expect(disabledController.controlOptions.value.panelEnabled).toBe(false);

    enabledController.destroy();
    disabledController.destroy();
  });

  it('应暴露业务吸附规则面板项，并用运行期开关停用对应规则', async () => {
    const map = createMapStub([
      {
        id: 'line-a',
        source: 'business-source',
        properties: {
          id: 'line-a',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
        layer: {
          id: 'business-line-layer',
        },
      },
    ]);
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        control: {
          panel: {
            enabled: true,
          },
        },
        businessLayers: {
          enabled: true,
          rules: [
            {
              id: 'business-line',
              label: '业务线',
              layerIds: ['business-line-layer'],
              snapTo: ['segment'],
            },
          ],
        },
      }),
      getMap: () => map as any,
    });

    expect(controller.controlRuleItems.value).toEqual([
      {
        id: 'business-line',
        label: '业务线',
        enabled: true,
      },
    ]);
    expect(controller.resolveMapEvent({
      point: { x: 5, y: 1 },
      lngLat: { lng: 5, lat: 1 },
    }).matched).toBe(true);

    controller.toggleRule('business-line');
    await Promise.resolve();

    expect(controller.controlRuleItems.value[0].enabled).toBe(false);
    expect(controller.resolveMapEvent({
      point: { x: 5, y: 1 },
      lngLat: { lng: 5, lat: 1 },
    }).matched).toBe(false);

    controller.destroy();
  });

  it('业务规则未显式传 id 时仍应在面板展示并支持运行期停用', async () => {
    const map = createMapStub([
      {
        id: 'line-a',
        source: 'business-source',
        properties: {
          id: 'line-a',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
        layer: {
          id: 'business-line-layer',
        },
      },
    ]);
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        businessLayers: {
          enabled: true,
          rules: [
            {
              layerIds: ['business-line-layer'],
              snapTo: ['segment'],
            },
          ],
        },
      }),
      getMap: () => map as any,
    });

    expect(controller.controlRuleItems.value).toEqual([
      {
        id: 'business-layer:0:business-line-layer',
        label: 'business-line-layer',
        enabled: true,
      },
    ]);
    expect(controller.resolveMapEvent({
      point: { x: 5, y: 1 },
      lngLat: { lng: 5, lat: 1 },
    }).matched).toBe(true);

    controller.toggleRule('business-layer:0:business-line-layer');
    await Promise.resolve();

    expect(controller.controlRuleItems.value[0].enabled).toBe(false);
    expect(controller.resolveMapEvent({
      point: { x: 5, y: 1 },
      lngLat: { lng: 5, lat: 1 },
    }).matched).toBe(false);

    controller.destroy();
  });

  it('同图层多条无 id 规则应生成不同面板 ID 并可独立停用', async () => {
    const map = createMapStub([
      {
        id: 'main-line',
        source: 'business-source',
        properties: {
          type: 'main',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
        layer: {
          id: 'pipe-line',
        },
      },
      {
        id: 'branch-line',
        source: 'business-source',
        properties: {
          type: 'branch',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 50],
            [10, 50],
          ],
        },
        layer: {
          id: 'pipe-line',
        },
      },
    ]);
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        businessLayers: {
          enabled: true,
          rules: [
            {
              layerIds: ['pipe-line'],
              snapTo: ['vertex'],
              tolerancePx: 4,
              filter: (context) => context.properties?.type === 'main',
            },
            {
              layerIds: ['pipe-line'],
              snapTo: ['segment'],
              tolerancePx: 4,
              filter: (context) => context.properties?.type === 'branch',
            },
          ],
        },
      }),
      getMap: () => map as any,
    });

    expect(controller.controlRuleItems.value.map((rule) => rule.id)).toEqual([
      'business-layer:0:pipe-line',
      'business-layer:1:pipe-line',
    ]);

    controller.toggleRule('business-layer:0:pipe-line');
    await Promise.resolve();

    expect(controller.controlRuleItems.value).toMatchObject([
      {
        id: 'business-layer:0:pipe-line',
        enabled: false,
      },
      {
        id: 'business-layer:1:pipe-line',
        enabled: true,
      },
    ]);
    expect(controller.resolveMapEvent({
      point: { x: 0, y: 0 },
      lngLat: { lng: 0, lat: 0 },
    }).matched).toBe(false);
    expect(controller.resolveMapEvent({
      point: { x: 5, y: 51 },
      lngLat: { lng: 5, lat: 51 },
    }).matched).toBe(true);

    controller.destroy();
  });

  it('应仅在绘图或测量控件启用时展示 TerraDraw 吸附目标', () => {
    const optionsRef = ref({
      enabled: true,
      control: {
        panel: {
          enabled: true,
          terradraw: true,
        },
      },
      terradraw: {
        defaults: {
          enabled: true,
        },
      },
      internalContext: {
        terradraw: {
          drawEnabled: false,
          measureEnabled: false,
        },
      },
    });
    const controller = useMapFeatureSnapController({
      getOptions: () => optionsRef.value,
      getMap: () => null,
      listPlugins: () => [],
    });

    expect(controller.controlGroups.value.flatMap((group) => group.items)).toEqual([]);

    optionsRef.value = {
      ...optionsRef.value,
      internalContext: {
        terradraw: {
          drawEnabled: true,
          measureEnabled: false,
        },
      },
    };

    expect(controller.controlGroups.value.flatMap((group) => group.items)).toEqual([
      {
        id: 'terradraw',
        kind: 'target',
        label: 'TerraDraw 绘图/测量',
        enabled: true,
      },
    ]);

    controller.destroy();
  });

  it('应根据已注册插件展示 intersection 与 polygonEdge 吸附目标', () => {
    const optionsRef = ref({
      enabled: true,
      control: {
        panel: {
          enabled: true,
          intersection: true,
          polygonEdge: true,
        },
      },
    });
    const controller = useMapFeatureSnapController({
      getOptions: () => optionsRef.value,
      getMap: () => null,
      listPlugins: () => [
        { id: 'intersectionPreview', type: 'intersectionPreview' },
        { id: 'polygonEdgePreview', type: 'polygonEdgePreview' },
      ],
    });

    expect(controller.controlGroups.value).toEqual([
      {
        id: 'plugin-targets',
        label: '插件目标',
        items: [
          {
            id: 'intersection',
            kind: 'target',
            label: '交点',
            enabled: true,
          },
          {
            id: 'polygonEdge',
            kind: 'target',
            label: '面边线',
            enabled: true,
          },
        ],
      },
    ]);

    controller.destroy();
  });

  it('panel 字段为 false 时应隐藏对应插件目标', () => {
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        control: {
          panel: {
            enabled: true,
            intersection: false,
            polygonEdge: true,
          },
        },
      }),
      getMap: () => null,
      listPlugins: () => [
        { id: 'intersectionPreview', type: 'intersectionPreview' },
        { id: 'polygonEdgePreview', type: 'polygonEdgePreview' },
      ],
    });

    expect(controller.controlGroups.value[0].items).toEqual([
      {
        id: 'polygonEdge',
        kind: 'target',
        label: '面边线',
        enabled: true,
      },
    ]);

    controller.destroy();
  });

  it('应支持运行期切换 intersection 与 polygonEdge 吸附目标', () => {
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        control: {
          panel: {
            enabled: true,
            intersection: true,
            polygonEdge: true,
          },
        },
      }),
      getMap: () => null,
      listPlugins: () => [
        { id: 'intersectionPreview', type: 'intersectionPreview' },
        { id: 'polygonEdgePreview', type: 'polygonEdgePreview' },
      ],
    });

    controller.toggleTarget('intersection');
    controller.toggleTarget('polygonEdge');

    expect(controller.controlGroups.value[0].items).toEqual([
      {
        id: 'intersection',
        kind: 'target',
        label: '交点',
        enabled: false,
      },
      {
        id: 'polygonEdge',
        kind: 'target',
        label: '面边线',
        enabled: false,
      },
    ]);

    controller.destroy();
  });

  it('关闭插件目标后应在有效配置中禁用对应内置目标', () => {
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        control: {
          panel: {
            enabled: true,
            intersection: true,
            polygonEdge: true,
          },
        },
        intersection: true,
        polygonEdge: true,
      }),
      getMap: () => null,
      listPlugins: () => [
        { id: 'intersectionPreview', type: 'intersectionPreview' },
        { id: 'polygonEdgePreview', type: 'polygonEdgePreview' },
      ],
    });

    controller.setTargetEnabled('intersection', false);
    controller.setTargetEnabled('polygonEdge', false);

    expect(controller.effectiveOptions.value).toMatchObject({
      intersection: {
        enabled: false,
      },
      polygonEdge: {
        enabled: false,
      },
    });

    controller.destroy();
  });

  it('关闭 TerraDraw 插件目标后应关闭原生、地图目标和已绘制目标吸附', () => {
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        control: {
          panel: {
            enabled: true,
            terradraw: true,
          },
        },
        terradraw: {
          defaults: {
            enabled: true,
            useNative: true,
            useMapTargets: true,
            drawnTargets: true,
          },
        },
        internalContext: {
          terradraw: {
            drawEnabled: true,
            measureEnabled: false,
          },
        },
      }),
      getMap: () => null,
      listPlugins: () => [],
    });

    controller.setTargetEnabled('terradraw', false);

    expect(controller.resolveTerradrawSnapOptions('draw', undefined)).toMatchObject({
      enabled: false,
      useNative: false,
      useMapTargets: false,
      drawnTargets: {
        enabled: false,
      },
    });

    controller.destroy();
  });

  it('resolveTerradrawSnapOptions 应按 全局默认 -> 控件默认 -> 实例局部 覆写合并', () => {
    setMapGlobalConfig({
      plugins: {
        snap: {
          defaultTolerancePx: 24,
          terradraw: {
            defaults: {
              enabled: true,
              useNative: false,
            },
            draw: {
              useMapTargets: false,
            },
          },
        },
      },
    });

    const controller = useMapFeatureSnapController({
      getOptions: () => ({}),
      getMap: () => null,
    });

    expect(
      controller.resolveTerradrawSnapOptions('draw', {
        tolerancePx: 40,
      }),
    ).toEqual({
      enabled: true,
      tolerancePx: 40,
      useNative: false,
      useMapTargets: false,
      drawnTargets: {
        enabled: false,
        geometryTypes: ['Point', 'LineString', 'Polygon'],
        snapTo: ['vertex', 'segment'],
      },
    });
  });

  it('应按 defaults、控件级配置归一化 TerraDraw 已绘制要素吸附目标', () => {
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        terradraw: {
          defaults: {
            enabled: true,
            drawnTargets: {
              geometryTypes: ['Point', 'LineString'],
              snapTo: ['vertex'],
            },
          },
          draw: {
            drawnTargets: true,
          },
          measure: {
            drawnTargets: false,
          },
        },
      }),
      getMap: () => null,
    });

    expect(controller.resolveTerradrawSnapOptions('draw', undefined).drawnTargets).toEqual({
      enabled: true,
      geometryTypes: ['Point', 'LineString'],
      snapTo: ['vertex'],
    });
    expect(controller.resolveTerradrawSnapOptions('measure', undefined).drawnTargets).toEqual({
      enabled: false,
      geometryTypes: ['Point', 'LineString', 'Polygon'],
      snapTo: ['vertex', 'segment'],
    });

    controller.destroy();
  });

  it('应按字段合并 snap 内置目标全局默认值和实例局部配置', () => {
    setMapGlobalConfig({
      plugins: {
        snap: {
          intersection: {
            priority: 130,
            tolerancePx: 12,
            snapTo: ['vertex'],
          },
          polygonEdge: {
            tolerancePx: 4,
            snapTo: ['vertex'],
          },
        },
      },
    });

    const map = createMapStub([
      {
        id: 'intersection-a',
        source: 'intersection-source',
        properties: {
          id: 'intersection-a',
        },
        geometry: {
          type: 'Point',
          coordinates: [5, 5],
        },
        layer: {
          id: INTERSECTION_MATERIALIZED_LAYER_ID,
        },
      },
      {
        id: 'business-a',
        source: 'business-source',
        properties: {
          id: 'business-a',
        },
        geometry: {
          type: 'Point',
          coordinates: [5, 5],
        },
        layer: {
          id: 'business-point-layer',
        },
      },
      {
        id: 'polygon-edge-a',
        source: 'polygon-edge-source',
        properties: {
          id: 'polygon-edge-a',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
        layer: {
          id: POLYGON_EDGE_PREVIEW_LAYER_ID,
        },
      },
    ]);
    const intersectionController = useMapFeatureSnapController({
      getOptions: () => ({
        intersection: {
          tolerancePx: 8,
        },
        polygonEdge: false,
        businessLayers: {
          enabled: true,
          rules: [
            {
              id: 'business-point',
              layerIds: ['business-point-layer'],
              priority: 120,
              tolerancePx: 12,
              snapTo: ['vertex'],
            },
          ],
        },
      }),
      getMap: () => map as any,
    });

    const priorityResult = intersectionController.resolveMapEvent({
      point: { x: 5, y: 5 },
      lngLat: { lng: 5, lat: 5 },
    });
    const toleranceResult = intersectionController.resolveMapEvent({
      point: { x: 5, y: 17 },
      lngLat: { lng: 5, lat: 17 },
    });
    intersectionController.destroy();

    const polygonController = useMapFeatureSnapController({
      getOptions: () => ({
        intersection: false,
        polygonEdge: {
          priority: 95,
        },
      }),
      getMap: () => map as any,
    });
    const polygonSegmentResult = polygonController.resolveMapEvent({
      point: { x: 5, y: 1 },
      lngLat: { lng: 5, lat: 1 },
    });
    const polygonVertexResult = polygonController.resolveMapEvent({
      point: { x: 0, y: 1 },
      lngLat: { lng: 0, lat: 1 },
    });

    expect(priorityResult.targetLayerId).toBe(INTERSECTION_MATERIALIZED_LAYER_ID);
    expect(toleranceResult.targetLayerId).toBe('business-point-layer');
    expect(polygonSegmentResult.targetLayerId).not.toBe(POLYGON_EDGE_PREVIEW_LAYER_ID);
    expect(polygonVertexResult.targetLayerId).toBe(POLYGON_EDGE_PREVIEW_LAYER_ID);
    expect(polygonVertexResult.snapKind).toBe('vertex');

    polygonController.destroy();
  });

  it('destroy 后应停止配置监听并销毁当前吸附绑定', async () => {
    const map = {
      on: vi.fn(),
      off: vi.fn(),
    };
    let enabled = true;
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled,
      }),
      getMap: () => map as any,
    });

    expect(map.on).toHaveBeenCalledTimes(4);

    controller.destroy();
    enabled = false;
    await Promise.resolve();

    expect(map.off).toHaveBeenCalledTimes(4);
    expect(controller.binding.value).toBeNull();
  });

  it('运行期关闭后应立即停用普通图层吸附、控件吸附和吸附预览', async () => {
    const map = createMapStub([
      {
        id: 'line-a',
        source: 'business-source',
        properties: {
          id: 'line-a',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
        layer: {
          id: 'business-line-layer',
        },
      },
    ]);
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        businessLayers: {
          enabled: true,
          rules: [
            {
              id: 'business-line',
              layerIds: ['business-line-layer'],
              snapTo: ['segment'],
            },
          ],
        },
        terradraw: {
          draw: {
            enabled: true,
          },
        },
      }),
      getMap: () => map as any,
    });

    expect(controller.isActive.value).toBe(true);
    expect(controller.resolveMapEvent({
      point: { x: 5, y: 1 },
      lngLat: { lng: 5, lat: 1 },
    }).matched).toBe(true);

    controller.deactivate();

    expect(controller.isActive.value).toBe(false);
    expect(controller.previewEnabled.value).toBe(false);
    expect(controller.resolveMapEvent({
      point: { x: 5, y: 1 },
      lngLat: { lng: 5, lat: 1 },
    }).matched).toBe(false);
    expect(controller.resolveTerradrawSnapOptions('draw', undefined).enabled).toBe(false);

    await Promise.resolve();

    controller.activate();
    await Promise.resolve();

    expect(controller.isActive.value).toBe(true);
    expect(controller.resolveTerradrawSnapOptions('draw', undefined).enabled).toBe(true);

    controller.destroy();
  });
});
