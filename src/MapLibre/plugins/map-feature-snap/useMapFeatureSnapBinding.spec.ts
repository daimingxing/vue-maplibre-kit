import { describe, expect, it, vi } from 'vitest';
import { createMapFeatureSnapBinding } from './useMapFeatureSnapBinding';

const INTERSECTION_PREVIEW_LAYER_ID = 'intersection-preview-layer';
const INTERSECTION_MATERIALIZED_LAYER_ID = 'intersection-materialized-layer';
const POLYGON_EDGE_PREVIEW_LAYER_ID = 'polygonEdgePreviewLineLayer';

/**
 * 创建测试用地图桩对象。
 * @returns 最小可用地图桩
 */
function createMapStub() {
  const eventMap = new Map<string, (...args: any[]) => void>();

  return {
    on: vi.fn((eventName: string, handler: (...args: any[]) => void) => {
      eventMap.set(eventName, handler);
    }),
    off: vi.fn((eventName: string) => {
      eventMap.delete(eventName);
    }),
    getLayer: vi.fn((layerId: string) => {
      if (
        layerId === INTERSECTION_PREVIEW_LAYER_ID ||
        layerId === INTERSECTION_MATERIALIZED_LAYER_ID ||
        layerId === POLYGON_EDGE_PREVIEW_LAYER_ID
      ) {
        return { id: layerId };
      }

      return null;
    }),
    queryRenderedFeatures: vi.fn(() => {
      return [
        {
          id: 'intersection-a',
          source: 'intersection-materialized-source',
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
      ];
    }),
    project: vi.fn((coordinate: [number, number]) => {
      return {
        x: coordinate[0],
        y: coordinate[1],
      };
    }),
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

describe('createMapFeatureSnapBinding', () => {
  it('应在未声明 ordinaryLayers 时也自动把交点层纳入吸附候选', () => {
    const map = createMapStub();
    const binding = createMapFeatureSnapBinding({
      map: map as any,
      getOptions: () => ({
        enabled: true,
      }),
    });

    const result = binding.resolvePointer({
      point: {
        x: 5,
        y: 5,
      },
      lngLat: {
        lng: 5,
        lat: 5,
      },
    });

    expect(result.matched).toBe(true);
    expect(result.targetLayerId).toBe(INTERSECTION_MATERIALIZED_LAYER_ID);
    expect(result.snapKind).toBe('vertex');
    expect(map.queryRenderedFeatures).toHaveBeenCalledTimes(1);

    binding.destroy();
  });

  it('业务过滤器抛错时应跳过当前候选而不中断吸附流程', () => {
    const error = new Error('filter failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const map = {
      ...createMapStub(),
      getLayer: vi.fn(() => ({ id: 'business-line-layer' })),
      queryRenderedFeatures: vi.fn(() => [
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
      ]),
    };
    const binding = createMapFeatureSnapBinding({
      map: map as any,
      getOptions: () => ({
        enabled: true,
        ordinaryLayers: {
          rules: [
            {
              id: 'business-rule',
              layerIds: ['business-line-layer'],
              filter: () => {
                throw error;
              },
            },
          ],
        },
      }),
    });

    const result = binding.resolvePointer({
      point: {
        x: 5,
        y: 0,
      },
      lngLat: {
        lng: 5,
        lat: 0,
      },
    });

    expect(result.matched).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "[MapFeatureSnap] 吸附规则 'business-rule' filter 执行失败，已跳过当前候选",
      error
    );

    binding.destroy();
    errorSpy.mockRestore();
  });

  it('应支持通过 businessLayers 配置业务图层吸附', () => {
    const map = {
      ...createMapStub(),
      getLayer: vi.fn(() => ({ id: 'business-line-layer' })),
      queryRenderedFeatures: vi.fn(() => [
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
      ]),
    };
    const binding = createMapFeatureSnapBinding({
      map: map as any,
      getOptions: () => ({
        enabled: true,
        businessLayers: {
          rules: [
            {
              id: 'business-rule',
              layerIds: ['business-line-layer'],
              snapTo: ['segment'],
            },
          ],
        },
      }),
    });

    const result = binding.resolvePointer({
      point: {
        x: 5,
        y: 0,
      },
      lngLat: {
        lng: 5,
        lat: 0,
      },
    });

    expect(result.matched).toBe(true);
    expect(result.ruleId).toBe('business-rule');
    expect(result.snapKind).toBe('segment');

    binding.destroy();
  });

  it('应允许关闭交点内置吸附目标', () => {
    const map = createMapStub();
    const binding = createMapFeatureSnapBinding({
      map: map as any,
      getOptions: () => ({
        enabled: true,
        intersection: {
          enabled: false,
        },
        polygonEdge: {
          enabled: false,
        },
      }),
    });

    const result = binding.resolvePointer({
      point: {
        x: 5,
        y: 5,
      },
      lngLat: {
        lng: 5,
        lat: 5,
      },
    });

    expect(result.matched).toBe(false);
    expect(map.queryRenderedFeatures).not.toHaveBeenCalled();

    binding.destroy();
  });

  it('应允许关闭面边线内置吸附目标', () => {
    const map = {
      ...createMapStub(),
      queryRenderedFeatures: vi.fn(() => [
        {
          id: 'edge-a',
          source: 'polygon-edge-source',
          properties: {
            id: 'edge-a',
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
      ]),
    };
    const binding = createMapFeatureSnapBinding({
      map: map as any,
      getOptions: () => ({
        enabled: true,
        intersection: {
          enabled: false,
        },
        polygonEdge: false,
      }),
    });

    const result = binding.resolvePointer({
      point: {
        x: 5,
        y: 0,
      },
      lngLat: {
        lng: 5,
        lat: 0,
      },
    });

    expect(result.matched).toBe(false);

    binding.destroy();
  });
});
