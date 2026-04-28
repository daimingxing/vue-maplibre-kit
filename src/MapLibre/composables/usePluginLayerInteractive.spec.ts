import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePluginLayerInteractive } from './usePluginLayerInteractive';

interface MockMapHarness {
  /** 测试用地图对象。 */
  map: any;
  /** 当前注册的事件处理器。 */
  handlers: Record<string, (event: any) => void>;
  /** 更新当前 queryRenderedFeatures 返回结果。 */
  setFeatures: (features: any[]) => void;
}

/**
 * 创建测试用插件渲染要素。
 * @param layerId 图层 ID
 * @param featureId 要素 ID
 * @returns 最小可用的渲染要素
 */
function createRenderedFeature(layerId: string, featureId: string) {
  return {
    type: 'Feature',
    id: featureId,
    source: 'plugin-source',
    properties: {
      id: featureId,
    },
    geometry: {
      type: 'Point',
      coordinates: [120, 30],
    },
    layer: {
      id: layerId,
    },
  } as any;
}

/**
 * 创建测试用地图事件。
 * @returns 最小可用的地图鼠标事件
 */
function createMapEvent() {
  return {
    point: {
      x: 10,
      y: 10,
    },
    lngLat: {
      lng: 120,
      lat: 30,
    },
    originalEvent: {} as MouseEvent,
  } as any;
}

/**
 * 创建测试用地图桩。
 * @returns 地图对象与辅助方法
 */
function createMockMapHarness(): MockMapHarness {
  const handlers: Record<string, (event: any) => void> = {};
  let currentFeatures: any[] = [];

  return {
    handlers,
    map: {
      on: vi.fn((eventName: string, handler: (event: any) => void) => {
        handlers[eventName] = handler;
      }),
      off: vi.fn((eventName: string) => {
        delete handlers[eventName];
      }),
      getLayer: vi.fn(() => ({})),
      queryRenderedFeatures: vi.fn(() => currentFeatures),
      getCanvas: vi.fn(() => ({
        style: {
          cursor: '',
        },
      })),
      getSource: vi.fn(() => ({})),
      setFeatureState: vi.fn(),
    },
    setFeatures: (features: any[]) => {
      currentFeatures = features;
    },
  };
}

describe('usePluginLayerInteractive', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('mousemove 命中插件图层时应按 hitPriority 选择最高优先级目标，并写入 handled 标记', () => {
    const onHoverEnterLow = vi.fn();
    const onHoverEnterHigh = vi.fn();
    const mapHarness = createMockMapHarness();
    const binding = usePluginLayerInteractive({
      mapInstance: {
        isLoaded: true,
        map: mapHarness.map,
      } as any,
      getInteractive: () => ({
        layers: {
          lowLayer: {
            hitPriority: 0,
            onHoverEnter: onHoverEnterLow,
          },
          highLayer: {
            hitPriority: 100,
            onHoverEnter: onHoverEnterHigh,
          },
        },
      }),
      toFeatureSnapshot: (feature) => {
        return feature
          ? ({
              type: 'Feature',
              id: feature.id,
              properties: feature.properties,
              geometry: feature.geometry,
            } as any)
          : null;
      },
    });

    mapHarness.setFeatures([
      createRenderedFeature('lowLayer', 'low-1'),
      createRenderedFeature('highLayer', 'high-1'),
    ]);

    const event = createMapEvent();
    mapHarness.handlers.mousemove(event);

    expect((event.originalEvent as any).__mapInteractiveHandled__).toBe(true);
    expect(onHoverEnterHigh).toHaveBeenCalledTimes(1);
    expect(onHoverEnterLow).not.toHaveBeenCalled();

    binding.destroy();
  });

  it('点击空白处时应清理插件当前选中态', () => {
    const onFeatureDeselect = vi.fn();
    const mapHarness = createMockMapHarness();
    const binding = usePluginLayerInteractive({
      mapInstance: {
        isLoaded: true,
        map: mapHarness.map,
      } as any,
      getInteractive: () => ({
        layers: {
          pointLayer: {
            onFeatureDeselect,
          },
        },
      }),
      toFeatureSnapshot: (feature) => {
        return feature
          ? ({
              type: 'Feature',
              id: feature.id,
              properties: feature.properties,
              geometry: feature.geometry,
            } as any)
          : null;
      },
    });

    mapHarness.setFeatures([createRenderedFeature('pointLayer', 'point-1')]);
    mapHarness.handlers.click(createMapEvent());

    expect(binding.getSelectedFeature()?.id).toBe('point-1');

    mapHarness.setFeatures([]);
    mapHarness.handlers.click(createMapEvent());

    expect(binding.getSelectedFeature()).toBeNull();
    expect(onFeatureDeselect).toHaveBeenCalledTimes(1);

    binding.destroy();
  });

  it('点击吸附到插件图层时应按吸附结果触发选中和点击回调', () => {
    const onClick = vi.fn();
    const onFeatureSelect = vi.fn();
    const mapHarness = createMockMapHarness();
    const snapFeature = createRenderedFeature('edgeLayer', 'edge-1');
    const binding = usePluginLayerInteractive({
      mapInstance: {
        isLoaded: true,
        map: mapHarness.map,
      } as any,
      getInteractive: () => ({
        layers: {
          edgeLayer: {
            onClick,
            onFeatureSelect,
          },
        },
      }),
      getSnapBinding: () =>
        ({
          resolveMapEvent: () => ({
            matched: true,
            lngLat: {
              lng: 120,
              lat: 30,
            },
            distancePx: 6,
            snapKind: 'segment',
            ruleId: 'polygon-edge-preview-snap',
            targetFeature: snapFeature,
            targetLayerId: 'edgeLayer',
            targetSourceId: 'plugin-source',
            targetCoordinate: [120, 30],
            segment: null,
          }),
        }) as any,
      toFeatureSnapshot: (feature) => {
        return feature
          ? ({
              type: 'Feature',
              id: feature.id,
              properties: feature.properties,
              geometry: feature.geometry,
            } as any)
          : null;
      },
    });

    mapHarness.setFeatures([]);
    const event = createMapEvent();
    mapHarness.handlers.click(event);

    expect((event.originalEvent as any).__mapInteractiveHandled__).toBe(true);
    expect(binding.getSelectedFeature()?.id).toBe('edge-1');
    expect(onFeatureSelect).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].snapResult?.ruleId).toBe('polygon-edge-preview-snap');

    binding.destroy();
  });
});
