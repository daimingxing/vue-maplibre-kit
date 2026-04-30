import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
});
