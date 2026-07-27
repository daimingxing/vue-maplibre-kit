import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Feature, Geometry, LineString } from 'geojson';
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import type { MapFeatureSnapOptions, MapFeatureSnapResolvedFeature } from './types';
import {
  createMapFeatureSnapBinding,
  resolveFeatureSnapResult,
} from './useMapFeatureSnapBinding';

/**
 * 创建使用经纬度直接映射屏幕坐标的地图替身。
 * @param renderedFeatures queryRenderedFeatures 返回的渲染要素
 * @returns 最小 MapLibre 地图替身
 */
function createMapStub(renderedFeatures: MapGeoJSONFeature[] = []): MaplibreMap {
  return {
    getLayer: vi.fn(() => ({})),
    queryRenderedFeatures: vi.fn(() => renderedFeatures),
    project: vi.fn((coordinate: [number, number]) => ({
      x: coordinate[0],
      y: coordinate[1],
    })),
    unproject: vi.fn((point: [number, number] | { x: number; y: number }) => {
      const coordinate = Array.isArray(point) ? point : [point.x, point.y];
      return { lng: coordinate[0], lat: coordinate[1] };
    }),
    getZoom: vi.fn(() => 0),
    setFeatureState: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as MaplibreMap;
}

/**
 * 创建地图鼠标事件。
 * @param coordinate 屏幕坐标和经纬度坐标
 * @returns 最小 MapMouseEvent
 */
function mapEvent(coordinate: [number, number]): MapMouseEvent {
  return {
    point: { x: coordinate[0], y: coordinate[1] },
    lngLat: { lng: coordinate[0], lat: coordinate[1] },
  } as MapMouseEvent;
}

/**
 * 创建带 MapLibre source/layer 元数据的渲染要素。
 * @param id 要素 ID
 * @param geometry GeoJSON geometry
 * @param layerId 渲染图层 ID
 * @returns MapGeoJSONFeature
 */
function renderedFeature(
  id: string,
  geometry: Geometry,
  layerId: string
): MapGeoJSONFeature {
  return {
    type: 'Feature',
    id,
    properties: {},
    geometry,
    source: `source-${layerId}`,
    layer: { id: layerId },
  } as MapGeoJSONFeature;
}

/**
 * 创建完整 source resolver 使用的线要素。
 * @param id 要素 ID
 * @param coordinates 线坐标
 * @param layerId layer ID
 * @returns 完整线 resolver 输出
 */
function resolvedLine(
  id: string,
  coordinates: [number, number][],
  layerId: string
): MapFeatureSnapResolvedFeature {
  return {
    feature: {
      type: 'Feature',
      id,
      properties: {},
      geometry: { type: 'LineString', coordinates },
    },
    sourceId: `source-${layerId}`,
    layerId,
  };
}

describe('useMapFeatureSnapBinding', () => {
  it('相同 priority 下离散 vertex 即使更远也优先于 segment', () => {
    const lineFeature = renderedFeature(
      'line',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'line-layer'
    );
    const pointFeature = renderedFeature(
      'point',
      { type: 'Point', coordinates: [5, 1] },
      'point-layer'
    );
    const binding = createMapFeatureSnapBinding({
      map: createMapStub([lineFeature, pointFeature]),
      getOptions: () => ({
        enabled: true,
        intersection: false,
        polygonEdge: false,
        businessLayers: {
          rules: [
            { id: 'line', layerIds: ['line-layer'], priority: 10, tolerancePx: 5, snapTo: ['segment'] },
            { id: 'point', layerIds: ['point-layer'], priority: 10, tolerancePx: 5, snapTo: ['vertex'] },
          ],
        },
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5, 0]));

    expect(result.snapKind).toBe('vertex');
    expect(result.ruleId).toBe('point');
    binding.destroy();
  });

  it('cross 交点按双方各自 tolerance 和 priority 独立评估', () => {
    const features = {
      left: [resolvedLine('left', [[0, 0], [10, 10]], 'left-layer')],
      right: [resolvedLine('right', [[0, 10], [10, 0]], 'right-layer')],
    };
    const options: MapFeatureSnapOptions = {
      enabled: true,
      intersection: false,
      polygonEdge: false,
      businessLayers: {
        rules: [
          {
            id: 'left',
            layerIds: ['left-layer'],
            priority: 10,
            tolerancePx: 1,
            snapTo: ['crossLayerIntersect'],
          },
          {
            id: 'right',
            layerIds: ['right-layer'],
            priority: 100,
            tolerancePx: 0.5,
            snapTo: ['crossLayerIntersect'],
          },
        ],
      },
      intersectionExtensionMeters: 0,
      intersectionFeatureResolver: (rule) => features[rule.id as keyof typeof features] ?? [],
    };
    const binding = createMapFeatureSnapBinding({
      map: createMapStub(),
      getOptions: () => options,
    });

    const result = binding.resolveMapEvent(mapEvent([5.8, 5]));

    expect(result.matched).toBe(true);
    expect(result.snapKind).toBe('crossLayerIntersect');
    expect(result.ruleId).toBe('left');
    expect(result.targetCoordinate).toEqual([5, 5]);
    binding.destroy();
  });

  it('rule scope 允许 scoped rule 自身和包含它的 cross，null 恢复全局查询', () => {
    const features: Record<string, MapFeatureSnapResolvedFeature[]> = {
      path: [resolvedLine('path', [[0, 0], [10, 10]], 'path-layer')],
      other: [resolvedLine('other', [[0, 10], [10, 0]], 'other-layer')],
      unrelatedA: [resolvedLine('unrelated-a', [[15, 15], [25, 25]], 'unrelated-a-layer')],
      unrelatedB: [resolvedLine('unrelated-b', [[15, 25], [25, 15]], 'unrelated-b-layer')],
    };
    let scope: string[] | null = ['path'];
    const rules = Object.keys(features).map((id) => ({
      id,
      layerIds: [`${id.replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)}-layer`],
      tolerancePx: 2,
      snapTo: ['crossLayerIntersect'] as const,
    }));
    const binding = createMapFeatureSnapBinding({
      map: createMapStub(),
      getOptions: () => ({
        enabled: true,
        intersection: false,
        polygonEdge: false,
        businessLayers: { rules: [...rules] },
        intersectionExtensionMeters: 0,
        intersectionFeatureResolver: (rule) => features[rule.id ?? ''] ?? [],
      }),
      getRuleScope: () => scope,
    });

    expect(binding.resolveMapEvent(mapEvent([20, 20])).matched).toBe(false);
    expect(binding.resolveMapEvent(mapEvent([5, 5])).snapKind).toBe('crossLayerIntersect');

    scope = null;
    expect(binding.resolveMapEvent(mapEvent([20, 20])).snapKind).toBe('crossLayerIntersect');
    binding.destroy();
  });

  it('zoomend 使用当前 zoom 重新解析完整 source filter', () => {
    const handlers = new Map<string, () => void>();
    const map = createMapStub();
    let zoom = 8;
    vi.mocked(map.getZoom).mockImplementation(() => zoom);
    vi.mocked(map.on).mockImplementation(((type: string, handler: () => void) => {
      handlers.set(type, handler);
      return map;
    }) as typeof map.on);
    const resolvedZooms: number[] = [];
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        businessLayers: {
          rules: [{
            id: 'path',
            layerIds: ['path-layer'],
            snapTo: ['sameLayerIntersect'],
          }],
        },
        intersectionFeatureResolver: (_rule, context) => {
          resolvedZooms.push(context?.zoom ?? -1);
          return [];
        },
      }),
    });

    zoom = 12;
    handlers.get('zoomend')?.();

    expect(resolvedZooms).toEqual([8, 12]);
    binding.destroy();
  });

  it('同一帧 mousemove 只解析最新事件并把结果交给调用方', () => {
    vi.useFakeTimers();
    const feature = renderedFeature(
      'line',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'line-layer'
    );
    const map = createMapStub([feature]);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        businessLayers: {
          rules: [{
            id: 'line',
            layerIds: ['line-layer'],
            snapTo: ['segment'],
          }],
        },
      }),
    });
    const onResolved = vi.fn();

    binding.scheduleMapEvent(mapEvent([1, 0]), onResolved);
    binding.scheduleMapEvent(mapEvent([2, 0]), onResolved);
    vi.runAllTimers();

    expect(map.queryRenderedFeatures).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved.mock.calls[0][0].targetCoordinate).toEqual([2, 0]);
    binding.destroy();
    vi.useRealTimers();
  });

  it('保持 Point、LineString、Polygon 的既有 vertex 和 segment 行为', () => {
    const map = createMapStub();
    const cases: Array<{
      geometry: Geometry;
      snapTo: Array<'vertex' | 'segment'>;
      pointer: [number, number];
      expected: 'vertex' | 'segment';
    }> = [
      {
        geometry: { type: 'Point', coordinates: [1, 1] },
        snapTo: ['vertex'],
        pointer: [1, 1],
        expected: 'vertex',
      },
      {
        geometry: { type: 'LineString', coordinates: [[0, 0], [2, 0]] },
        snapTo: ['segment'],
        pointer: [1, 0],
        expected: 'segment',
      },
      {
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 0]]],
        },
        snapTo: ['segment'],
        pointer: [1, 0],
        expected: 'segment',
      },
    ];

    cases.forEach((item, index) => {
      const result = resolveFeatureSnapResult({
        map,
        pointer: {
          point: { x: item.pointer[0], y: item.pointer[1] },
          lngLat: { lng: item.pointer[0], lat: item.pointer[1] },
        },
        rule: {
          id: `case-${index}`,
          layerIds: [`layer-${index}`],
          tolerancePx: 2,
          snapTo: item.snapTo,
        },
        features: [renderedFeature(`feature-${index}`, item.geometry, `layer-${index}`)],
      });

      expect(result.snapKind).toBe(item.expected);
    });
  });

  it('命中目标切换时写入状态，相同候选不重复写入，离开时清理状态', () => {
    vi.useFakeTimers();
    const handlers = new Map<string, () => void>();
    const first = renderedFeature('first', { type: 'Point', coordinates: [1, 1] }, 'point-layer');
    const second = renderedFeature('second', { type: 'Point', coordinates: [2, 2] }, 'point-layer');
    first.sourceLayer = 'points';
    const map = createMapStub([first]);
    vi.mocked(map.on).mockImplementation(((type: string, handler: () => void) => {
      handlers.set(type, handler);
      return map;
    }) as typeof map.on);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        preview: { targetColor: '#dc2626', targetOpacity: 0.4, targetLineWidth: 8 },
        businessLayers: { rules: [{ id: 'point', layerIds: ['point-layer'], snapTo: ['vertex'] }] },
      }),
    });

    binding.scheduleMapEvent(mapEvent([1, 1]));
    vi.runAllTimers();
    binding.scheduleMapEvent(mapEvent([1, 1]));
    vi.runAllTimers();
    vi.mocked(map.queryRenderedFeatures).mockReturnValue([second]);
    binding.scheduleMapEvent(mapEvent([2, 2]));
    vi.runAllTimers();
    handlers.get('mouseout')?.();

    expect(map.setFeatureState).toHaveBeenCalledTimes(4);
    expect(map.setFeatureState).toHaveBeenNthCalledWith(1, {
      source: 'source-point-layer', sourceLayer: 'points', id: 'first',
    }, {
      snapPreview: true,
      snapPreviewColor: '#dc2626',
      snapPreviewOpacity: 0.4,
      snapPreviewLineWidth: 8,
    });
    expect(map.setFeatureState).toHaveBeenNthCalledWith(2, {
      source: 'source-point-layer', sourceLayer: 'points', id: 'first',
    }, {
      snapPreview: false,
      snapPreviewColor: null,
      snapPreviewOpacity: null,
      snapPreviewLineWidth: null,
    });
    expect(map.setFeatureState).toHaveBeenNthCalledWith(4, {
      source: 'source-point-layer', id: 'second',
    }, {
      snapPreview: false,
      snapPreviewColor: null,
      snapPreviewOpacity: null,
      snapPreviewLineWidth: null,
    });
    binding.destroy();
    vi.useRealTimers();
  });

  it('同一吸附目标的透明度和线宽变化后重新写入状态', () => {
    vi.useFakeTimers();
    const map = createMapStub([
      renderedFeature('point', { type: 'Point', coordinates: [1, 1] }, 'point-layer'),
    ]);
    const optionsRef = ref<MapFeatureSnapOptions>({
      enabled: true,
      preview: { targetOpacity: 0.4, targetLineWidth: 3 },
      businessLayers: { rules: [{ id: 'point', layerIds: ['point-layer'], snapTo: ['vertex'] }] },
    });
    const binding = createMapFeatureSnapBinding({ map, getOptions: () => optionsRef.value });

    binding.scheduleMapEvent(mapEvent([1, 1]));
    vi.runAllTimers();
    vi.mocked(map.setFeatureState).mockClear();
    optionsRef.value = {
      ...optionsRef.value,
      preview: { targetOpacity: 0.7, targetLineWidth: 5 },
    };
    binding.scheduleMapEvent(mapEvent([1, 1]));
    vi.runAllTimers();

    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-point-layer', id: 'point' },
      {
        snapPreview: true,
        snapPreviewColor: '#ff7a00',
        snapPreviewOpacity: 0.7,
        snapPreviewLineWidth: 5,
      },
    );
    binding.destroy();
    vi.useRealTimers();
  });

  it('仅使用真实 source 和 feature ID 写入状态，不使用 renderId 属性替代', () => {
    vi.useFakeTimers();
    const feature = renderedFeature('ignored', { type: 'Point', coordinates: [1, 1] }, 'point-layer');
    delete (feature as { id?: string }).id;
    feature.properties = { renderId: 'render-id' };
    const map = createMapStub([feature]);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        businessLayers: { rules: [{ id: 'point', layerIds: ['point-layer'], snapTo: ['vertex'] }] },
      }),
    });

    binding.scheduleMapEvent(mapEvent([1, 1]));
    vi.runAllTimers();

    expect(map.setFeatureState).not.toHaveBeenCalled();
    binding.destroy();
    vi.useRealTimers();
  });

  it('可为命中的派生边界补充原块面状态目标', () => {
    vi.useFakeTimers();
    const feature = renderedFeature('boundary-id', { type: 'LineString', coordinates: [[0, 0], [2, 2]] }, 'block-layer');
    feature.properties = { sourceRenderId: 'block-area-id' };
    const map = createMapStub([feature]);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        businessLayers: { rules: [{ id: 'block', layerIds: ['block-layer'], snapTo: ['vertex'] }] },
        stateTargetResolver: (result) => result.targetFeature?.properties.sourceRenderId
          ? [{ source: 'block-area-source', id: result.targetFeature.properties.sourceRenderId }]
          : [],
      }),
    });

    binding.scheduleMapEvent(mapEvent([0, 0]));
    vi.runAllTimers();

    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'block-area-source', id: 'block-area-id' },
      expect.objectContaining({ snapPreview: true }),
    );
    binding.destroy();
    vi.useRealTimers();
  });

  it('交点命中同时写入两条真实父线状态，并合并 styledata 和 sourcedata 的补写', () => {
    vi.useFakeTimers();
    const handlers = new Map<string, (event?: { sourceId?: string }) => void>();
    const map = createMapStub();
    vi.mocked(map.on).mockImplementation(((type: string, handler: (event?: { sourceId?: string }) => void) => {
      handlers.set(type, handler);
      return map;
    }) as typeof map.on);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        intersection: false,
        polygonEdge: false,
        preview: { targetColor: '#2563eb' },
        businessLayers: {
          rules: [
            { id: 'left', layerIds: ['left-layer'], tolerancePx: 2, snapTo: ['crossLayerIntersect'] },
            { id: 'right', layerIds: ['right-layer'], tolerancePx: 2, snapTo: ['crossLayerIntersect'] },
          ],
        },
        intersectionFeatureResolver: (rule) => rule.id === 'left'
          ? [{ ...resolvedLine('left-id', [[0, 0], [10, 10]], 'left-layer'), sourceLayer: 'roads' }]
          : [{ ...resolvedLine('right-id', [[0, 10], [10, 0]], 'right-layer'), sourceLayer: 'roads' }],
      }),
    });

    binding.scheduleMapEvent(mapEvent([5, 5]));
    vi.runAllTimers();
    expect(map.setFeatureState).toHaveBeenCalledTimes(2);
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-left-layer', sourceLayer: 'roads', id: 'left-id' },
      {
        snapPreview: true,
        snapPreviewColor: '#2563eb',
        snapPreviewOpacity: null,
        snapPreviewLineWidth: null,
      },
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-right-layer', sourceLayer: 'roads', id: 'right-id' },
      {
        snapPreview: true,
        snapPreviewColor: '#2563eb',
        snapPreviewOpacity: null,
        snapPreviewLineWidth: null,
      },
    );

    vi.mocked(map.setFeatureState).mockClear();
    handlers.get('styledata')?.();
    handlers.get('sourcedata')?.({ sourceId: 'source-left-layer' });
    handlers.get('sourcedata')?.({ sourceId: 'unrelated' });
    vi.runAllTimers();
    expect(map.setFeatureState).toHaveBeenCalledTimes(2);
    binding.destroy();
    vi.useRealTimers();
  });

  it('移动、缩放、销毁和关闭预览都会清理仍活动的原要素状态', () => {
    vi.useFakeTimers();
    const handlers = new Map<string, () => void>();
    const map = createMapStub([
      renderedFeature('point', { type: 'Point', coordinates: [1, 1] }, 'point-layer'),
    ]);
    vi.mocked(map.on).mockImplementation(((type: string, handler: () => void) => {
      handlers.set(type, handler);
      return map;
    }) as typeof map.on);
    const optionsRef = ref<MapFeatureSnapOptions>({
      enabled: true,
      businessLayers: { rules: [{ id: 'point', layerIds: ['point-layer'], snapTo: ['vertex'] }] },
    });
    const binding = createMapFeatureSnapBinding({ map, getOptions: () => optionsRef.value });
    const highlight = (): void => {
      binding.scheduleMapEvent(mapEvent([1, 1]));
      vi.runAllTimers();
    };

    highlight();
    handlers.get('movestart')?.();
    highlight();
    handlers.get('zoomstart')?.();
    highlight();
    optionsRef.value = { ...optionsRef.value, preview: { enabled: false } };
    optionsRef.value = { ...optionsRef.value, preview: { enabled: true } };
    highlight();
    binding.destroy();

    const clearCalls = vi.mocked(map.setFeatureState).mock.calls.filter((call) => {
      const state = call[1] as { snapPreview?: boolean; snapPreviewColor?: string | null };
      return state.snapPreview === false && state.snapPreviewColor === null;
    });
    expect(clearCalls).toHaveLength(4);
    vi.useRealTimers();
  });

  it('source 暂时缺失时状态写入和恢复都不抛出异常', () => {
    vi.useFakeTimers();
    const handlers = new Map<string, (event?: { sourceId?: string }) => void>();
    const map = createMapStub([
      renderedFeature('point', { type: 'Point', coordinates: [1, 1] }, 'point-layer'),
    ]);
    vi.mocked(map.setFeatureState).mockImplementation(() => {
      throw new Error('Source not found');
    });
    vi.mocked(map.on).mockImplementation(((type: string, handler: (event?: { sourceId?: string }) => void) => {
      handlers.set(type, handler);
      return map;
    }) as typeof map.on);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        businessLayers: { rules: [{ id: 'point', layerIds: ['point-layer'], snapTo: ['vertex'] }] },
      }),
    });

    expect(() => {
      binding.scheduleMapEvent(mapEvent([1, 1]));
      vi.runAllTimers();
      handlers.get('styledata')?.();
      handlers.get('sourcedata')?.({ sourceId: 'source-point-layer' });
      binding.destroy();
    }).not.toThrow();
    vi.useRealTimers();
  });
});
