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
    expect(result.anchorCoordinate).toEqual([5, 5]);
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
    expect(binding.getPreviewSnapshot()).toEqual(expect.objectContaining({
      originalCoordinate: [2, 0],
      pointer: { x: 2, y: 0 },
      result: onResolved.mock.calls[0][0],
    }));
    binding.clearPreview();
    expect(binding.getPreviewSnapshot()).toBeNull();
    binding.destroy();
    vi.useRealTimers();
  });

  it('关闭全部视觉预览后仍解析吸附结果并保留交互快照', () => {
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
        preview: { enabled: false },
        businessLayers: {
          rules: [{ id: 'line', layerIds: ['line-layer'], snapTo: ['segment'] }],
        },
      }),
    });
    const onResolved = vi.fn();

    binding.scheduleMapEvent(mapEvent([2, 0]), onResolved);
    vi.runAllTimers();

    expect(onResolved.mock.calls[0][0].matched).toBe(true);
    expect(binding.previewData.value.features).toEqual([]);
    expect(map.setFeatureState).not.toHaveBeenCalled();
    expect(binding.getPreviewSnapshot()?.result.matched).toBe(true);
    binding.destroy();
    vi.useRealTimers();
  });

  it('关闭独立预览点时仍保留原要素状态预览', () => {
    vi.useFakeTimers();
    const feature = renderedFeature('point', { type: 'Point', coordinates: [1, 1] }, 'point-layer');
    const map = createMapStub([feature]);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        preview: { pointEnabled: false, targetPointRadius: 9 },
        businessLayers: {
          rules: [{ id: 'point', layerIds: ['point-layer'], snapTo: ['vertex'] }],
        },
      }),
    });

    binding.scheduleMapEvent(mapEvent([1, 1]));
    vi.runAllTimers();

    expect(binding.previewData.value.features).toEqual([]);
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-point-layer', id: 'point' },
      expect.objectContaining({ snapPreview: true, snapPreviewPointRadius: 9 })
    );
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
        preview: {
          targetColor: '#dc2626', targetOpacity: 0.4, targetLineWidth: 8, targetPointRadius: 10,
        },
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
      snapPreviewPointRadius: 10,
    });
    expect(map.setFeatureState).toHaveBeenNthCalledWith(2, {
      source: 'source-point-layer', sourceLayer: 'points', id: 'first',
    }, {
      snapPreview: false,
      snapPreviewColor: null,
      snapPreviewOpacity: null,
      snapPreviewLineWidth: null,
      snapPreviewPointRadius: null,
    });
    expect(map.setFeatureState).toHaveBeenNthCalledWith(4, {
      source: 'source-point-layer', id: 'second',
    }, {
      snapPreview: false,
      snapPreviewColor: null,
      snapPreviewOpacity: null,
      snapPreviewLineWidth: null,
      snapPreviewPointRadius: null,
    });
    binding.destroy();
    vi.useRealTimers();
  });

  it('同一吸附目标的透明度、线宽和点半径变化后重新写入状态', () => {
    vi.useFakeTimers();
    const map = createMapStub([
      renderedFeature('point', { type: 'Point', coordinates: [1, 1] }, 'point-layer'),
    ]);
    const optionsRef = ref<MapFeatureSnapOptions>({
      enabled: true,
      preview: { targetOpacity: 0.4, targetLineWidth: 3, targetPointRadius: 7 },
      businessLayers: { rules: [{ id: 'point', layerIds: ['point-layer'], snapTo: ['vertex'] }] },
    });
    const binding = createMapFeatureSnapBinding({ map, getOptions: () => optionsRef.value });

    binding.scheduleMapEvent(mapEvent([1, 1]));
    vi.runAllTimers();
    vi.mocked(map.setFeatureState).mockClear();
    optionsRef.value = {
      ...optionsRef.value,
      preview: { targetOpacity: 0.7, targetLineWidth: 5, targetPointRadius: 9 },
    };
    binding.scheduleMapEvent(mapEvent([1, 1]));
    vi.runAllTimers();

    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-point-layer', id: 'point' },
      {
        snapPreview: true,
        snapPreviewColor: null,
        snapPreviewOpacity: 0.7,
        snapPreviewLineWidth: 5,
        snapPreviewPointRadius: 9,
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
        snapPreviewPointRadius: null,
      },
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-right-layer', sourceLayer: 'roads', id: 'right-id' },
      {
        snapPreview: true,
        snapPreviewColor: '#2563eb',
        snapPreviewOpacity: null,
        snapPreviewLineWidth: null,
        snapPreviewPointRadius: null,
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

  it('近邻但不相交的真实线返回稳定候选集合并同时写入原要素状态', () => {
    vi.useFakeTimers();
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'path-layer'
    );
    const nearby = renderedFeature(
      'nearby-id',
      { type: 'LineString', coordinates: [[0, 0.000004], [10, 0.000004]] },
      'path-layer'
    );
    main.properties = { uuid: 'main' };
    nearby.properties = { uuid: 'nearby' };
    const resolve = (features: MapGeoJSONFeature[]) => {
      const map = createMapStub(features);
      const binding = createMapFeatureSnapBinding({
        map,
        getOptions: () => ({
          enabled: true,
          nearby: { maxDistanceMeters: 1, paddingPx: 2 },
          businessLayers: {
            rules: [{ id: 'path', layerIds: ['path-layer'], tolerancePx: 16, snapTo: ['segment'] }],
          },
        }),
      });
      return { map, binding, result: binding.resolveMapEvent(mapEvent([5, 0])) };
    };

    const first = resolve([nearby, main]);
    const second = resolve([main, nearby]);
    expect(first.result.targetFeature?.id).toBe('main-id');
    expect(first.result.candidates?.map((candidate) => candidate.targetFeature?.id)).toEqual([
      'main-id', 'nearby-id',
    ]);
    expect(second.result.candidates?.map((candidate) => candidate.targetFeature?.id)).toEqual([
      'main-id', 'nearby-id',
    ]);

    first.binding.scheduleMapEvent(mapEvent([5, 0]));
    vi.runAllTimers();
    expect(first.map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-path-layer', id: 'main-id' },
      expect.objectContaining({ snapPreview: true })
    );
    expect(first.map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-path-layer', id: 'nearby-id' },
      expect.objectContaining({ snapPreview: true })
    );
    first.binding.destroy();
    second.binding.destroy();
    vi.useRealTimers();
  });

  it('同一真实要素的多个局部命中在单次解析中只执行一次完整投影', () => {
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'main-layer'
    );
    const nearby = renderedFeature(
      'nearby-id',
      {
        type: 'LineString',
        coordinates: [
          [4.97, 0.000004],
          [5.03, 0.000004],
          [4.98, 0.000004],
          [5.02, 0.000004],
          [4.99, 0.000004],
          [5.01, 0.000004],
        ],
      },
      'nearby-layer'
    );
    const map = createMapStub([nearby, main]);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        nearby: { maxDistanceMeters: 1, paddingPx: 2 },
        businessLayers: {
          rules: [
            {
              id: 'main',
              layerIds: ['main-layer'],
              priority: 10,
              tolerancePx: 16,
              snapTo: ['vertex', 'segment'],
            },
            {
              id: 'nearby',
              layerIds: ['nearby-layer'],
              priority: 0,
              tolerancePx: 16,
              snapTo: ['vertex', 'segment'],
            },
          ],
        },
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5, 0]));

    expect(result.candidates?.map((candidate) => candidate.targetFeature?.id)).toEqual([
      'main-id', 'nearby-id',
    ]);
    // 6 次来自候选 segment，另 6 次来自两个真实要素各一次的完整投影。
    expect(map.unproject).toHaveBeenCalledTimes(12);
    binding.destroy();
  });

  it('同一身份的不同渲染切片交换顺序后仍选择最近投影', () => {
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] },
      'main-layer'
    );
    const nearSlice = renderedFeature(
      'shared-id',
      { type: 'LineString', coordinates: [[0.0004, 0.000004], [0.0006, 0.000004]] },
      'nearby-layer'
    );
    const farSlice = renderedFeature(
      'shared-id',
      { type: 'LineString', coordinates: [[0.0004, 0.000008], [0.0006, 0.000008]] },
      'nearby-layer'
    );
    const resolve = (features: MapGeoJSONFeature[]) => {
      const map = createMapStub(features);
      vi.mocked(map.project).mockImplementation((coordinate) => ({
        x: Number(coordinate[0]) * 1_000_000,
        y: Number(coordinate[1]) * 1_000_000,
      }) as never);
      vi.mocked(map.unproject).mockImplementation((point) => {
        const coordinate = Array.isArray(point) ? point : [point.x, point.y];
        return { lng: coordinate[0] / 1_000_000, lat: coordinate[1] / 1_000_000 } as never;
      });
      const binding = createMapFeatureSnapBinding({
        map,
        getOptions: () => ({
          enabled: true,
          nearby: { maxDistanceMeters: 1, paddingPx: 2 },
          businessLayers: {
            rules: [
              { id: 'main', layerIds: ['main-layer'], priority: 10, tolerancePx: 16, snapTo: ['segment'] },
              { id: 'nearby', layerIds: ['nearby-layer'], priority: 0, tolerancePx: 16, snapTo: ['segment'] },
            ],
          },
        }),
      });
      const result = binding.resolveMapEvent({
        point: { x: 500, y: 0 },
        lngLat: { lng: 0.0005, lat: 0 },
      } as MapMouseEvent);
      binding.destroy();
      const candidate = result.candidates.find((item) => item.targetFeature?.id === 'shared-id');
      return {
        coordinate: candidate?.targetCoordinate,
        distancePx: candidate?.distancePx,
      };
    };

    const farFirst = resolve([farSlice, nearSlice, main]);
    const nearFirst = resolve([nearSlice, farSlice, main]);

    expect(farFirst).toEqual({ coordinate: [0.0005, 0.000004], distancePx: 4 });
    expect(nearFirst).toEqual(farFirst);
  });

  it('同一身份的远切片超过米制阈值时仍保留合法近切片', () => {
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] },
      'main-layer'
    );
    const nearSlice = renderedFeature(
      'shared-id',
      { type: 'LineString', coordinates: [[0.0004, 0.000004], [0.0006, 0.000004]] },
      'nearby-layer'
    );
    const tooFarSlice = renderedFeature(
      'shared-id',
      { type: 'LineString', coordinates: [[0.0004, 0.000012], [0.0006, 0.000012]] },
      'nearby-layer'
    );
    const resolve = (features: MapGeoJSONFeature[]) => {
      const map = createMapStub(features);
      vi.mocked(map.project).mockImplementation((coordinate) => ({
        x: Number(coordinate[0]) * 1_000_000,
        y: Number(coordinate[1]) * 1_000_000,
      }) as never);
      vi.mocked(map.unproject).mockImplementation((point) => {
        const coordinate = Array.isArray(point) ? point : [point.x, point.y];
        return { lng: coordinate[0] / 1_000_000, lat: coordinate[1] / 1_000_000 } as never;
      });
      const binding = createMapFeatureSnapBinding({
        map,
        getOptions: () => ({
          enabled: true,
          nearby: { maxDistanceMeters: 1, paddingPx: 2 },
          businessLayers: {
            rules: [
              { id: 'main', layerIds: ['main-layer'], priority: 10, tolerancePx: 16, snapTo: ['segment'] },
              { id: 'nearby', layerIds: ['nearby-layer'], priority: 0, tolerancePx: 16, snapTo: ['segment'] },
            ],
          },
        }),
      });
      const result = binding.resolveMapEvent({
        point: { x: 500, y: 0 },
        lngLat: { lng: 0.0005, lat: 0 },
      } as MapMouseEvent);
      binding.destroy();
      return result.candidates.map((candidate) => ({
        id: candidate.targetFeature?.id,
        coordinate: candidate.targetCoordinate,
        distancePx: candidate.distancePx,
      }));
    };

    const farFirst = resolve([tooFarSlice, nearSlice, main]);
    const nearFirst = resolve([nearSlice, tooFarSlice, main]);

    expect(farFirst).toEqual([
      { id: 'main-id', coordinate: [0.0005, 0], distancePx: 0 },
      { id: 'shared-id', coordinate: [0.0005, 0.000004], distancePx: 4 },
    ]);
    expect(nearFirst).toEqual(farFirst);
  });

  it('vertex 主候选使用原始指针对各路线的投影判断近邻', () => {
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [0, 0.001]] },
      'main-layer'
    );
    const nearby = renderedFeature(
      'nearby-id',
      { type: 'LineString', coordinates: [[0.000005, 0.0001], [0.001, 0.0001]] },
      'nearby-layer'
    );
    const map = createMapStub([main, nearby]);
    vi.mocked(map.project).mockImplementation((coordinate) => ({
      x: Number(coordinate[0]) * 100_000,
      y: Number(coordinate[1]) * 100_000,
    }) as never);
    vi.mocked(map.unproject).mockImplementation((point) => {
      const coordinate = Array.isArray(point) ? point : [point.x, point.y];
      return { lng: coordinate[0] / 100_000, lat: coordinate[1] / 100_000 } as never;
    });
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        nearby: { maxDistanceMeters: 1, paddingPx: 2 },
        businessLayers: {
          rules: [
            {
              id: 'main',
              layerIds: ['main-layer'],
              priority: 10,
              tolerancePx: 16,
              snapTo: ['vertex', 'segment'],
            },
            {
              id: 'nearby',
              layerIds: ['nearby-layer'],
              priority: 0,
              tolerancePx: 16,
              snapTo: ['vertex', 'segment'],
            },
          ],
        },
      }),
    });

    const result = binding.resolveMapEvent({
      point: { x: 0.6, y: 10 },
      lngLat: { lng: 0.000006, lat: 0.0001 },
    } as MapMouseEvent);

    expect(result.snapKind).toBe('vertex');
    expect(result.targetCoordinate).toEqual([0, 0.0001]);
    expect(result.candidates?.map((candidate) => candidate.targetFeature?.id)).toEqual([
      'main-id', 'nearby-id',
    ]);
    expect(result.candidates?.[0].targetCoordinate).toEqual([0, 0.0001]);
    expect(result.candidates?.[1].targetCoordinate).toEqual([0.000006, 0.0001]);
    expect(result.anchorCoordinate).toEqual([0, 0.0001]);
    binding.destroy();
  });

  it('三个以上近邻候选使用确定性 primary 真实投影且不受输入顺序影响', () => {
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] },
      'main-layer'
    );
    const upper = renderedFeature(
      'upper-id',
      { type: 'LineString', coordinates: [[0, 0.000004], [0.001, 0.000004]] },
      'upper-layer'
    );
    const lower = renderedFeature(
      'lower-id',
      { type: 'LineString', coordinates: [[0, -0.000002], [0.001, -0.000002]] },
      'lower-layer'
    );
    const resolve = (features: MapGeoJSONFeature[]) => {
      const map = createMapStub(features);
      vi.mocked(map.project).mockImplementation((coordinate) => ({
        x: Number(coordinate[0]) * 100_000,
        y: Number(coordinate[1]) * 100_000,
      }) as never);
      vi.mocked(map.unproject).mockImplementation((point) => {
        const coordinate = Array.isArray(point) ? point : [point.x, point.y];
        return { lng: coordinate[0] / 100_000, lat: coordinate[1] / 100_000 } as never;
      });
      const binding = createMapFeatureSnapBinding({
        map,
        getOptions: () => ({
          enabled: true,
          nearby: { maxDistanceMeters: 1, paddingPx: 2 },
          businessLayers: {
            rules: [
              { id: 'main', layerIds: ['main-layer'], priority: 10, tolerancePx: 16, snapTo: ['segment'] },
              { id: 'upper', layerIds: ['upper-layer'], priority: 0, tolerancePx: 16, snapTo: ['segment'] },
              { id: 'lower', layerIds: ['lower-layer'], priority: 0, tolerancePx: 16, snapTo: ['segment'] },
            ],
          },
        }),
      });
      const result = binding.resolveMapEvent({
        point: { x: 50, y: 0 },
        lngLat: { lng: 0.0005, lat: 0 },
      } as MapMouseEvent);
      binding.destroy();
      return result;
    };

    const first = resolve([upper, lower, main]);
    const reversed = resolve([lower, main, upper]);

    expect(first.candidates).toHaveLength(3);
    expect(first.anchorCoordinate?.[0]).toBeCloseTo(0.0005, 12);
    expect(first.anchorCoordinate?.[1]).toBeCloseTo(0, 12);
    expect(reversed.anchorCoordinate).toEqual(first.anchorCoordinate);
  });

  it('近邻查询使用规则 tolerancePx 加 2 px，并继续受真实距离门槛约束', () => {
    const resolveAtScreenGap = (
      screenGapPx: number,
      maxDistanceMeters = 2,
      paddingPx = 2
    ) => {
      const latitudeGap = screenGapPx / 2_000_000;
      const main = renderedFeature(
        'main-id',
        { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] },
        'path-layer'
      );
      const nearby = renderedFeature(
        'nearby-id',
        { type: 'LineString', coordinates: [[0, latitudeGap], [0.001, latitudeGap]] },
        'path-layer'
      );
      const map = createMapStub([nearby, main]);
      vi.mocked(map.project).mockImplementation((coordinate) => ({
        x: Number(coordinate[0]),
        y: Number(coordinate[1]) * 2_000_000,
      }) as never);
      vi.mocked(map.unproject).mockImplementation((point) => {
        const coordinate = Array.isArray(point) ? point : [point.x, point.y];
        return { lng: coordinate[0], lat: coordinate[1] / 2_000_000 } as never;
      });
      const binding = createMapFeatureSnapBinding({
        map,
        getOptions: () => ({
          enabled: true,
          nearby: { maxDistanceMeters, paddingPx },
          businessLayers: {
            rules: [{ id: 'path', layerIds: ['path-layer'], tolerancePx: 16, snapTo: ['segment'] }],
          },
        }),
      });
      const result = binding.resolveMapEvent(mapEvent([0.0005, 0]));
      binding.destroy();
      return result;
    };

    expect(resolveAtScreenGap(17.9).candidates).toHaveLength(2);
    expect(resolveAtScreenGap(18.1).candidates).toHaveLength(1);
    expect(resolveAtScreenGap(17.9, 0.5).candidates).toHaveLength(1);
    expect(resolveAtScreenGap(17.9, 2, Number.NaN).candidates).toHaveLength(2);
  });

  it('缺少稳定 ID 的次候选不进入近邻候选组', () => {
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'path-layer'
    );
    const idless = renderedFeature(
      'temporary-id',
      { type: 'LineString', coordinates: [[0, 0.000004], [10, 0.000004]] },
      'path-layer'
    );
    delete idless.id;
    idless.properties = {
      renderId: 'temporary-render-id',
      uuid: 'temporary-uuid',
    };
    const binding = createMapFeatureSnapBinding({
      map: createMapStub([main, idless]),
      getOptions: () => ({
        enabled: true,
        nearby: true,
        businessLayers: {
          rules: [{ id: 'path', layerIds: ['path-layer'], tolerancePx: 16, snapTo: ['segment'] }],
        },
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5, 0]));

    expect(result.targetFeature?.id).toBe('main-id');
    expect(result.candidates).toHaveLength(1);
    binding.destroy();
  });

  it('Point 候选不参与 Path 近邻归组', () => {
    const main = renderedFeature(
      'main-point',
      { type: 'Point', coordinates: [5, 5] },
      'point-layer'
    );
    const nearby = renderedFeature(
      'nearby-point',
      { type: 'Point', coordinates: [5.000001, 5] },
      'point-layer'
    );
    const binding = createMapFeatureSnapBinding({
      map: createMapStub([nearby, main]),
      getOptions: () => ({
        enabled: true,
        nearby: { maxDistanceMeters: 1, paddingPx: 2 },
        businessLayers: {
          rules: [{ id: 'point', layerIds: ['point-layer'], tolerancePx: 16, snapTo: ['vertex'] }],
        },
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5, 5]));

    expect(result.targetFeature?.id).toBe('main-point');
    expect(result.candidates).toHaveLength(1);
    expect(result.anchorCoordinate).toEqual([5, 5]);
    binding.destroy();
  });

  it('缺少真实 source 的次候选不进入近邻候选组', () => {
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'path-layer'
    );
    const sourceLess = renderedFeature(
      'source-less-id',
      { type: 'LineString', coordinates: [[0, 0.000004], [10, 0.000004]] },
      'path-layer'
    );
    delete (sourceLess as { source?: string }).source;
    const binding = createMapFeatureSnapBinding({
      map: createMapStub([main, sourceLess]),
      getOptions: () => ({
        enabled: true,
        nearby: true,
        businessLayers: {
          rules: [{ id: 'path', layerIds: ['path-layer'], tolerancePx: 16, snapTo: ['segment'] }],
        },
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5, 0]));

    expect(result.targetFeature?.id).toBe('main-id');
    expect(result.candidates).toHaveLength(1);
    binding.destroy();
  });

  it('近邻候选集合变化、mouseout 和 destroy 只清理退出或仍活动的目标', () => {
    vi.useFakeTimers();
    const handlers = new Map<string, () => void>();
    const main = renderedFeature(
      'main-id',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'path-layer'
    );
    const nearby = renderedFeature(
      'nearby-id',
      { type: 'LineString', coordinates: [[0, 0.000004], [10, 0.000004]] },
      'path-layer'
    );
    let rendered = [main, nearby];
    const map = createMapStub();
    vi.mocked(map.queryRenderedFeatures).mockImplementation(() => rendered);
    vi.mocked(map.on).mockImplementation(((type: string, handler: () => void) => {
      handlers.set(type, handler);
      return map;
    }) as typeof map.on);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        nearby: true,
        businessLayers: {
          rules: [{ id: 'path', layerIds: ['path-layer'], tolerancePx: 16, snapTo: ['segment'] }],
        },
      }),
    });

    binding.scheduleMapEvent(mapEvent([5, 0]));
    vi.runAllTimers();
    vi.mocked(map.setFeatureState).mockClear();
    rendered = [main];
    binding.scheduleMapEvent(mapEvent([5, 0]));
    vi.runAllTimers();
    expect(map.setFeatureState).toHaveBeenCalledTimes(1);
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-path-layer', id: 'nearby-id' },
      expect.objectContaining({ snapPreview: false, snapPreviewColor: null })
    );

    vi.mocked(map.setFeatureState).mockClear();
    handlers.get('mouseout')?.();
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-path-layer', id: 'main-id' },
      expect.objectContaining({ snapPreview: false })
    );
    vi.mocked(map.setFeatureState).mockClear();
    binding.destroy();
    expect(map.setFeatureState).not.toHaveBeenCalled();
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

  it('鼠标静止时配置变化会重写样式并清理已停用规则', () => {
    vi.useFakeTimers();
    const feature = renderedFeature(
      'line-id',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'path-layer'
    );
    const map = createMapStub([feature]);
    const optionsRef = ref<MapFeatureSnapOptions>({
      enabled: true,
      preview: { targetColor: '#2563eb' },
      businessLayers: {
        rules: [{ id: 'path', layerIds: ['path-layer'], snapTo: ['segment'] }],
      },
    });
    const binding = createMapFeatureSnapBinding({ map, getOptions: () => optionsRef.value });
    binding.scheduleMapEvent(mapEvent([5, 0]));
    vi.runAllTimers();
    vi.mocked(map.setFeatureState).mockClear();

    optionsRef.value = {
      ...optionsRef.value,
      preview: { targetColor: '#dc2626' },
    };
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-path-layer', id: 'line-id' },
      expect.objectContaining({ snapPreview: true, snapPreviewColor: '#dc2626' })
    );

    vi.mocked(map.setFeatureState).mockClear();
    optionsRef.value = {
      ...optionsRef.value,
      businessLayers: {
        rules: [{ id: 'path', layerIds: ['path-layer'], enabled: false, snapTo: ['segment'] }],
      },
    };
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-path-layer', id: 'line-id' },
      expect.objectContaining({ snapPreview: false, snapPreviewColor: null })
    );
    binding.destroy();
    vi.useRealTimers();
  });

  it('zoomend 使用当前屏幕指针重新计算并恢复吸附预览', () => {
    vi.useFakeTimers();
    const handlers = new Map<string, () => void>();
    const map = createMapStub([
      renderedFeature(
        'line-id',
        { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
        'path-layer'
      ),
    ]);
    vi.mocked(map.on).mockImplementation(((type: string, handler: () => void) => {
      handlers.set(type, handler);
      return map;
    }) as typeof map.on);
    const binding = createMapFeatureSnapBinding({
      map,
      getOptions: () => ({
        enabled: true,
        businessLayers: {
          rules: [{ id: 'path', layerIds: ['path-layer'], snapTo: ['segment'] }],
        },
      }),
    });
    binding.scheduleMapEvent(mapEvent([5, 0]));
    vi.runAllTimers();
    handlers.get('zoomstart')?.();
    vi.mocked(map.setFeatureState).mockClear();

    handlers.get('zoomend')?.();

    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-path-layer', id: 'line-id' },
      expect.objectContaining({ snapPreview: true })
    );
    binding.destroy();
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

describe('SnapDecision', () => {
  it('同一自交 LineString 的不同 segment 保留独立 participant', () => {
    const selfIntersecting = [resolvedLine(
      'self',
      [[0, 0], [10, 10], [0, 10], [10, 0]],
      'path-layer'
    )];
    const binding = createMapFeatureSnapBinding({
      map: createMapStub(),
      getOptions: () => ({
        enabled: true,
        intersection: false,
        polygonEdge: false,
        businessLayers: {
          rules: [{
            id: 'path',
            layerIds: ['path-layer'],
            tolerancePx: 1,
            snapTo: ['sameLayerIntersect'],
          }],
        },
        intersectionExtensionMeters: 0,
        intersectionFeatureResolver: () => selfIntersecting,
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5, 5]));

    expect(result.resolution.status).toBe('matched');
    if (result.resolution.status !== 'matched') throw new Error('预期形成自交 intersection decision');
    expect(result.resolution.decision.participants).toHaveLength(2);
    expect(result.resolution.decision.targets).toHaveLength(2);
    expect(new Set(result.resolution.decision.participants.map((item) => item.key)).size).toBe(2);
    binding.destroy();
  });

  it('同一 rule priority 下 intersection 整体高于更近的 direct', () => {
    const point = renderedFeature('point', { type: 'Point', coordinates: [5.1, 5] }, 'point-layer');
    const pathFeatures = [
      resolvedLine('left', [[0, 0], [10, 10]], 'path-layer'),
      resolvedLine('right', [[0, 10], [10, 0]], 'path-layer'),
    ];
    const binding = createMapFeatureSnapBinding({
      map: createMapStub([point]),
      getOptions: () => ({
        enabled: true,
        intersection: false,
        polygonEdge: false,
        nearby: { maxDistanceMeters: 1, paddingPx: 2 },
        businessLayers: {
          rules: [
            { id: 'point', layerIds: ['point-layer'], priority: 10, tolerancePx: 1, snapTo: ['vertex'] },
            { id: 'path', layerIds: ['path-layer'], priority: 10, tolerancePx: 1, snapTo: ['sameLayerIntersect'] },
          ],
        },
        intersectionExtensionMeters: 0,
        intersectionFeatureResolver: (rule) => rule.id === 'path' ? pathFeatures : [],
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5.1, 5]));

    expect(result.resolution.status).toBe('matched');
    expect(result.resolution.status === 'matched' && result.resolution.decision).toEqual(
      expect.objectContaining({
        relation: 'intersection',
        snapKind: 'sameLayerIntersect',
        snapCoordinate: [5, 5],
      })
    );
    expect(result.lngLat).toEqual({ lng: 5, lat: 5 });
    expect(result.anchorCoordinate).toEqual([5, 5]);
    binding.destroy();
  });

  it('rule scope 只限制 target，不删除 cross intersection participant', () => {
    const features: Record<string, MapFeatureSnapResolvedFeature[]> = {
      left: [resolvedLine('left', [[0, 0], [10, 10]], 'left-layer')],
      right: [resolvedLine('right', [[0, 10], [10, 0]], 'right-layer')],
    };
    const binding = createMapFeatureSnapBinding({
      map: createMapStub(),
      getRuleScope: () => ['left'],
      getOptions: () => ({
        enabled: true,
        intersection: false,
        polygonEdge: false,
        businessLayers: {
          rules: [
            { id: 'left', layerIds: ['left-layer'], tolerancePx: 1, snapTo: ['crossLayerIntersect'] },
            { id: 'right', layerIds: ['right-layer'], tolerancePx: 1, snapTo: ['crossLayerIntersect'] },
          ],
        },
        intersectionExtensionMeters: 0,
        intersectionFeatureResolver: (rule) => features[rule.id ?? ''] ?? [],
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5, 5]));
    expect(result.resolution.status).toBe('matched');
    if (result.resolution.status !== 'matched') throw new Error('预期形成 intersection decision');
    expect(result.resolution.decision.relation).toBe('intersection');
    expect(result.resolution.decision.participants).toHaveLength(2);
    expect(result.resolution.decision.targets).toHaveLength(1);
    expect(result.resolution.decision.targets[0].ruleId).toBe('left');
    binding.destroy();
  });

  it('nearby 使用确定性 primary 的真实投影，不生成公共锚点', () => {
    const offset = 0.000005;
    const primary = renderedFeature(
      'primary',
      { type: 'LineString', coordinates: [[0, 0], [10, 0]] },
      'path-layer'
    );
    const secondary = renderedFeature(
      'secondary',
      { type: 'LineString', coordinates: [[0, offset], [10, offset]] },
      'path-layer'
    );
    const binding = createMapFeatureSnapBinding({
      map: createMapStub([secondary, primary]),
      getOptions: () => ({
        enabled: true,
        intersection: false,
        polygonEdge: false,
        nearby: { maxDistanceMeters: 1, paddingPx: 2 },
        businessLayers: {
          rules: [{ id: 'path', layerIds: ['path-layer'], tolerancePx: 1, snapTo: ['segment'] }],
        },
      }),
    });

    const result = binding.resolveMapEvent(mapEvent([5, offset / 4]));
    expect(result.resolution.status).toBe('matched');
    if (result.resolution.status !== 'matched') throw new Error('预期形成 nearby decision');
    expect(result.resolution.decision.relation).toBe('nearby');
    expect(result.resolution.decision.targets).toHaveLength(2);
    expect(result.resolution.decision.snapCoordinate).toEqual([5, 0]);
    expect(result.anchorCoordinate).toEqual([5, 0]);
    binding.destroy();
  });

  it('已形成 target 但坐标证据非有限数值时返回 invalid', () => {
    const result = resolveFeatureSnapResult({
      map: createMapStub(),
      pointer: { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 } },
      rule: { id: 'point', layerIds: ['point-layer'], snapTo: ['vertex'] },
      features: [{
        type: 'Feature',
        id: 'invalid-point',
        properties: {},
        geometry: { type: 'Point', coordinates: [Number.NaN, 0] },
        source: 'point-source',
        layer: { id: 'point-layer' },
      }],
    });

    expect(result.resolution.status).toBe('invalid');
    expect(result.matched).toBe(false);
  });
});
