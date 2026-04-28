import { describe, expect, it, vi } from 'vitest';
import type { MapLayerInteractiveLayerOptions } from '../shared/mapLibre-controls-types';
import {
  shouldSnapOverrideRawTarget,
  sortLayerEntriesByHitPriority,
  useMapInteractive,
} from './useMapInteractive';

/** MapLibre 测试事件集合。 */
type MapEventHandlers = Record<string, (event: any) => void>;

/**
 * 创建测试用图层交互配置。
 * @param hitPriority 当前命中优先级
 * @returns 最小可用的图层交互配置
 */
function createLayerConfig(hitPriority?: number): MapLayerInteractiveLayerOptions {
  return {
    cursor: 'pointer',
    hitPriority,
  };
}

/**
 * 创建最小 MapLibre 测试替身。
 * @returns 可驱动 click 事件的地图测试上下文
 */
function createMockMapHarness() {
  const handlers: MapEventHandlers = {};
  const features: any[] = [];
  const map = {
    on: vi.fn((eventName: string, handler: (event: any) => void) => {
      handlers[eventName] = handler;
    }),
    off: vi.fn(),
    getLayer: vi.fn((layerId: string) => ({ id: layerId })),
    getSource: vi.fn(() => ({ id: 'test-source' })),
    queryRenderedFeatures: vi.fn(() => features),
    setFeatureState: vi.fn(),
    getCanvas: vi.fn(() => ({ style: { cursor: '' } })),
  };

  return {
    handlers,
    map,
    setFeatures: (nextFeatures: any[]) => {
      features.splice(0, features.length, ...nextFeatures);
    },
  };
}

/**
 * 创建渲染态要素测试替身。
 * @param layerId 当前要素所在图层 ID
 * @param featureId 当前要素 ID
 * @returns 最小可用的 MapLibre 渲染要素
 */
function createRenderedFeature(layerId: string, featureId: string) {
  return {
    type: 'Feature',
    id: featureId,
    source: 'test-source',
    properties: {},
    layer: {
      id: layerId,
    },
    geometry: {
      type: 'Point',
      coordinates: [120, 30],
    },
  };
}

/**
 * 创建地图鼠标事件测试替身。
 * @returns 最小可用的 MapLibre 鼠标事件
 */
function createMapEvent() {
  return {
    point: {
      x: 10,
      y: 20,
    },
    lngLat: {
      lng: 120,
      lat: 30,
    },
    originalEvent: {} as MouseEvent,
  };
}

describe('useMapInteractive helpers', () => {
  it('会按 hitPriority 从高到低排序命中图层，同优先级保留原声明顺序', () => {
    const layerEntries: Array<[string, MapLayerInteractiveLayerOptions]> = [
      ['line-layer', createLayerConfig(0)],
      ['preview-layer', createLayerConfig(100)],
      ['materialized-layer', createLayerConfig(100)],
      ['point-layer', createLayerConfig(0)],
    ];

    expect(sortLayerEntriesByHitPriority(layerEntries).map(([layerId]) => layerId)).toEqual([
      'preview-layer',
      'materialized-layer',
      'line-layer',
      'point-layer',
    ]);
  });

  it('只有吸附目标优先级更高时，才允许吸附结果覆盖真实命中目标', () => {
    expect(shouldSnapOverrideRawTarget(createLayerConfig(100), createLayerConfig(0))).toBe(false);
    expect(shouldSnapOverrideRawTarget(createLayerConfig(100), createLayerConfig(100))).toBe(false);
    expect(shouldSnapOverrideRawTarget(createLayerConfig(0), createLayerConfig(100))).toBe(true);
    expect(shouldSnapOverrideRawTarget(null, createLayerConfig(100))).toBe(true);
  });

  it('指针事件被外部绘制语义接管时不应触发普通图层点击', () => {
    const onClick = vi.fn();
    const mapHarness = createMockMapHarness();
    const binding = useMapInteractive({
      mapInstance: {
        isLoaded: true,
        map: mapHarness.map,
      } as any,
      getInteractive: () => ({
        layers: {
          pointLayer: {
            onClick,
          },
        },
      }),
      shouldIgnorePointerEvent: () => true,
    });

    mapHarness.setFeatures([createRenderedFeature('pointLayer', 'point-1')]);
    mapHarness.handlers.click(createMapEvent());

    expect(onClick).not.toHaveBeenCalled();
    binding.destroy();
  });
});
