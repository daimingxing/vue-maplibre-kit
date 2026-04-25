import { describe, expect, it, vi } from 'vitest';
import { createMapFeatureSnapBinding } from './useMapFeatureSnapBinding';

const INTERSECTION_PREVIEW_LAYER_ID = 'intersection-preview-layer';
const INTERSECTION_MATERIALIZED_LAYER_ID = 'intersection-materialized-layer';

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
        layerId === INTERSECTION_MATERIALIZED_LAYER_ID
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
});
