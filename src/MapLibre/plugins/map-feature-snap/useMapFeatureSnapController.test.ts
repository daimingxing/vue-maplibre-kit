import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import { useMapFeatureSnapController } from './useMapFeatureSnapController';
import type { MapFeatureSnapOptions } from './types';

const INTERSECTION_LAYER_IDS = [
  'intersection-preview-layer',
  'intersection-materialized-layer',
];

let activeScope: EffectScope | null = null;

afterEach(() => {
  activeScope?.stop();
  activeScope = null;
  vi.useRealTimers();
});

/**
 * 创建可记录吸附查询图层的最小地图替身。
 * @returns 地图替身和 queryRenderedFeatures 调用记录
 */
function createMapStub(features: unknown[] = []) {
  const queryRenderedFeatures = vi.fn(() => features);
  const map = {
    getLayer: vi.fn(() => ({})),
    queryRenderedFeatures,
    on: vi.fn(),
    off: vi.fn(),
    project: vi.fn((coordinate: [number, number]) => ({ x: coordinate[0], y: coordinate[1] })),
    unproject: vi.fn((coordinate: [number, number]) => ({ lng: coordinate[0], lat: coordinate[1] })),
  } as unknown as MaplibreMap;

  return { map, queryRenderedFeatures };
}

/**
 * 在独立 Vue effect scope 中创建吸附控制器。
 * @param map 当前测试地图替身
 * @param pluginTypes 当前宿主已注册的插件类型
 * @returns 吸附控制器
 */
function createController(
  map: MaplibreMap,
  pluginTypes: string[],
  options: Partial<MapFeatureSnapOptions> = {}
) {
  activeScope = effectScope();
  return activeScope.run(() => useMapFeatureSnapController({
    getOptions: () => ({
      enabled: true,
      polygonEdge: false,
      ...options,
    }),
    getMap: () => map,
    listPlugins: () => pluginTypes.map((type) => ({ id: type, type })),
  }))!;
}

/**
 * 创建仅包含吸附解析必需字段的地图鼠标事件。
 * @returns 地图鼠标事件
 */
function createMapEvent(): MapMouseEvent {
  return {
    point: { x: 10, y: 10 },
    lngLat: { lng: 114, lat: 22 },
  } as MapMouseEvent;
}

/**
 * 读取最后一次渲染要素查询携带的图层 ID。
 * @param queryRenderedFeatures queryRenderedFeatures mock
 * @returns 查询图层 ID 集合
 */
function readQueriedLayerIds(queryRenderedFeatures: ReturnType<typeof vi.fn>): string[] {
  const call = queryRenderedFeatures.mock.calls.at(-1);
  return (call?.[1] as { layers?: string[] } | undefined)?.layers ?? [];
}

describe('useMapFeatureSnapController', () => {
  it('未注册 intersectionPreview 时不生成旧交点规则', () => {
    const { map, queryRenderedFeatures } = createMapStub();
    const controller = createController(map, []);

    controller.resolveMapEvent(createMapEvent());

    expect(readQueriedLayerIds(queryRenderedFeatures)).not.toEqual(
      expect.arrayContaining(INTERSECTION_LAYER_IDS)
    );
  });

  it('注册 intersectionPreview 时保留旧交点规则', () => {
    const { map, queryRenderedFeatures } = createMapStub();
    const controller = createController(map, ['intersectionPreview']);

    controller.resolveMapEvent(createMapEvent());

    expect(readQueriedLayerIds(queryRenderedFeatures)).toEqual(
      expect.arrayContaining(INTERSECTION_LAYER_IDS)
    );
  });

  it('setRuleScope 限制普通候选并可用 null 恢复全局查询', () => {
    const feature = {
      type: 'Feature',
      id: 'other-point',
      properties: {},
      geometry: { type: 'Point', coordinates: [0, 0] },
      source: 'source-other',
      layer: { id: 'other-layer' },
    };
    const { map } = createMapStub([feature]);
    activeScope = effectScope();
    const controller = activeScope.run(() => useMapFeatureSnapController({
      getOptions: () => ({
        enabled: true,
        intersection: false,
        polygonEdge: false,
        businessLayers: {
          rules: [{ id: 'other', layerIds: ['other-layer'], snapTo: ['vertex'] }],
        },
      }),
      getMap: () => map,
      listPlugins: () => [],
    }))!;

    controller.setRuleScope(['path']);
    expect(controller.resolveMapEvent(createMapEvent()).matched).toBe(false);

    controller.setRuleScope(null);
    expect(controller.resolveMapEvent(createMapEvent()).snapKind).toBe('vertex');
  });

  it('普通 options 顶层替换复用现有 binding', async () => {
    const { map } = createMapStub();
    const optionsRef = ref({
      enabled: true,
      polygonEdge: false as const,
      defaultTolerancePx: 10,
    });
    activeScope = effectScope();
    activeScope.run(() => useMapFeatureSnapController({
      getOptions: () => optionsRef.value,
      getMap: () => map,
      listPlugins: () => [],
    }));
    const initialBindingEventCount = vi.mocked(map.on).mock.calls.length;

    optionsRef.value = {
      ...optionsRef.value,
      defaultTolerancePx: 20,
    };
    await nextTick();

    expect(map.on).toHaveBeenCalledTimes(initialBindingEventCount);
  });

  it('局部 preview 配置覆盖全局默认的吸附点样式', () => {
    const { map } = createMapStub();
    const controller = createController(map, [], {
      preview: {
        pointColor: '#e11d48',
        pointRadius: 11,
      },
    });

    expect(controller.previewPointStyle.value.paint).toMatchObject({
      'circle-color': '#e11d48',
      'circle-radius': 11,
    });
  });

});
