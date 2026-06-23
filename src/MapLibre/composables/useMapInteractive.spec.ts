import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MapLayerInteractiveLayerOptions,
  MapSelectionState,
  ResolvedMapSelectionToolOptions,
} from '../shared/mapLibre-controls-types';
import type { MapSelectionBindingController, MapSelectionService } from '../plugins/types';
import {
  shouldSnapOverrideRawTarget,
  sortLayerEntriesByHitPriority,
  useMapInteractive,
} from './useMapInteractive';

/** MapLibre 测试事件集合。 */
type MapEventHandlers = Record<string, (event: any) => void>;

/** MapLibre 测试地图能力集合。 */
type MockMapHarness = ReturnType<typeof createMockMapHarness>;

/** 测试用全局事件处理器集合。 */
type GlobalEventHandlers = Record<string, Set<(event: any) => void>>;

let globalEventHandlers: GlobalEventHandlers = {};

/**
 * 安装 Node 测试环境所需的最小 DOM 与全局事件替身。
 */
function installGlobalDomHarness(): void {
  globalEventHandlers = {};

  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({
      className: '',
      style: {},
      parentNode: null,
    })),
  });
  vi.stubGlobal(
    'addEventListener',
    vi.fn((eventName: string, handler: (event: any) => void) => {
      globalEventHandlers[eventName] ||= new Set();
      globalEventHandlers[eventName].add(handler);
    })
  );
  vi.stubGlobal(
    'removeEventListener',
    vi.fn((eventName: string, handler: (event: any) => void) => {
      globalEventHandlers[eventName]?.delete(handler);
    })
  );
  vi.stubGlobal(
    'dispatchEvent',
    vi.fn((event: any) => {
      globalEventHandlers[event.type]?.forEach((handler) => handler(event));
      return true;
    })
  );
}

beforeEach(() => {
  installGlobalDomHarness();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
  const container = {
    clientWidth: 300,
    clientHeight: 200,
    children: [] as any[],
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      right: 300,
      bottom: 200,
      width: 300,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })),
    appendChild: vi.fn((element: any) => {
      container.children.push(element);
      element.parentNode = container;
    }),
    removeChild: vi.fn((element: any) => {
      container.children = container.children.filter((child) => child !== element);
      element.parentNode = null;
    }),
  };
  const dragPanEnabled = {
    value: true,
  };
  const boxZoomEnabled = {
    value: true,
  };

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
    getContainer: vi.fn(() => container),
    unproject: vi.fn(([x, y]: [number, number]) => ({
      lng: x,
      lat: y,
    })),
    dragPan: {
      isEnabled: vi.fn(() => dragPanEnabled.value),
      enable: vi.fn(() => {
        dragPanEnabled.value = true;
      }),
      disable: vi.fn(() => {
        dragPanEnabled.value = false;
      }),
    },
    boxZoom: {
      isEnabled: vi.fn(() => boxZoomEnabled.value),
      enable: vi.fn(() => {
        boxZoomEnabled.value = true;
      }),
      disable: vi.fn(() => {
        boxZoomEnabled.value = false;
      }),
    },
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
    originalEvent: {
      button: 0,
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as MouseEvent,
    preventDefault: vi.fn(),
  };
}

/**
 * 创建可挂接交互核心的多选服务测试替身。
 * @param options 多选工具配置覆盖项
 * @returns 多选服务及其当前绑定控制器
 */
function createSelectionServiceHarness(
  options: Partial<ResolvedMapSelectionToolOptions> = {}
): {
  service: MapSelectionService;
  getBinding: () => MapSelectionBindingController | null;
} {
  const state = ref<MapSelectionState>({
    isActive: false,
    selectionMode: 'single',
    selectedFeatures: [],
    selectedCount: 0,
    deactivateBehavior: options.deactivateBehavior ?? 'clear',
  });
  const resolvedOptions: ResolvedMapSelectionToolOptions = {
    enabled: options.enabled ?? true,
    deactivateBehavior: options.deactivateBehavior ?? 'clear',
    closeOnEscape: options.closeOnEscape ?? true,
    targetLayerIds: options.targetLayerIds ?? null,
    excludeLayerIds: options.excludeLayerIds ?? [],
    canSelect: options.canSelect,
  };
  let binding: MapSelectionBindingController | null = null;

  const service: MapSelectionService = {
    state,
    getOptions: () => resolvedOptions,
    attachBinding: (nextBinding) => {
      binding = nextBinding;
      return () => {
        if (binding === nextBinding) {
          binding = null;
        }
      };
    },
    syncState: (statePatch) => {
      const nextSelectedFeatures = statePatch.selectedFeatures
        ? [...statePatch.selectedFeatures]
        : [...state.value.selectedFeatures];

      state.value = {
        ...state.value,
        ...statePatch,
        selectedFeatures: nextSelectedFeatures,
        selectedCount: statePatch.selectedCount ?? nextSelectedFeatures.length,
        deactivateBehavior: statePatch.deactivateBehavior ?? resolvedOptions.deactivateBehavior,
      };
    },
    activate: () => binding?.activate(),
    deactivate: () => binding?.deactivate(),
    toggle: () => {
      if (binding?.isActive()) {
        binding.deactivate();
        return;
      }

      binding?.activate();
    },
    clear: () => binding?.clear(),
    isActive: () => binding?.isActive() ?? state.value.isActive,
  };

  return {
    service,
    getBinding: () => binding,
  };
}

/**
 * 挂载普通图层交互测试绑定。
 * @param mapHarness 地图测试上下文
 * @param options 测试行为配置
 * @returns 当前交互绑定
 */
function mountInteractiveBinding(
  mapHarness: MockMapHarness,
  options: {
    onSelectionChange?: (context: any) => void;
    onClick?: (context: any) => void;
    selectionService?: MapSelectionService;
  } = {}
) {
  return useMapInteractive({
    mapInstance: {
      isLoaded: true,
      map: mapHarness.map,
    } as any,
    getInteractive: () => ({
      layers: {
        pointLayer: {
          onClick: options.onClick,
        },
      },
      onSelectionChange: options.onSelectionChange,
    }),
    getSelectionService: options.selectionService ? () => options.selectionService : undefined,
  });
}

/**
 * 触发指定范围的 Shift 框选。
 * @param mapHarness 地图测试上下文
 */
function dragShiftBox(mapHarness: MockMapHarness): void {
  mapHarness.handlers.mousedown({
    ...createMapEvent(),
    originalEvent: {
      button: 0,
      shiftKey: true,
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
    },
  });

  globalThis.dispatchEvent({
    type: 'mousemove',
    clientX: 20,
    clientY: 20,
    preventDefault: vi.fn(),
  } as unknown as Event);
  globalThis.dispatchEvent({
    type: 'mouseup',
    clientX: 20,
    clientY: 20,
    preventDefault: vi.fn(),
  } as unknown as Event);
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

  it('未注册多选服务时，普通图层点击仍可执行单选并触发选中集变化', () => {
    const onSelectionChange = vi.fn();
    const mapHarness = createMockMapHarness();
    const binding = mountInteractiveBinding(mapHarness, {
      onSelectionChange,
    });

    mapHarness.setFeatures([createRenderedFeature('pointLayer', 'point-1')]);
    mapHarness.handlers.click(createMapEvent());

    expect(mapHarness.map.setFeatureState).toHaveBeenCalledWith(
      {
        source: 'test-source',
        id: 'point-1',
      },
      {
        selected: true,
      }
    );
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange.mock.calls[0][0].reason).toBe('click');
    binding.destroy();
  });

  it('注册多选服务但未激活时，点击业务图层不应退回普通单选', () => {
    const onSelectionChange = vi.fn();
    const mapHarness = createMockMapHarness();
    const selectionServiceHarness = createSelectionServiceHarness();
    const binding = mountInteractiveBinding(mapHarness, {
      onSelectionChange,
      selectionService: selectionServiceHarness.service,
    });

    mapHarness.setFeatures([createRenderedFeature('pointLayer', 'point-1')]);
    mapHarness.handlers.click(createMapEvent());

    expect(mapHarness.map.setFeatureState).not.toHaveBeenCalledWith(
      {
        source: 'test-source',
        id: 'point-1',
      },
      {
        selected: true,
      }
    );
    expect(selectionServiceHarness.service.state.value.selectedCount).toBe(0);
    expect(onSelectionChange).not.toHaveBeenCalled();
    binding.destroy();
  });

  it('激活多选服务后，点击和 Shift 框选仍可产生多选变化', () => {
    const onSelectionChange = vi.fn();
    const mapHarness = createMockMapHarness();
    const selectionServiceHarness = createSelectionServiceHarness();
    const binding = mountInteractiveBinding(mapHarness, {
      onSelectionChange,
      selectionService: selectionServiceHarness.service,
    });

    selectionServiceHarness.service.activate();
    mapHarness.setFeatures([createRenderedFeature('pointLayer', 'point-1')]);
    mapHarness.handlers.click(createMapEvent());

    expect(selectionServiceHarness.service.state.value.selectedCount).toBe(1);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange.mock.calls[0][0].reason).toBe('click');

    mapHarness.setFeatures([
      createRenderedFeature('pointLayer', 'point-1'),
      createRenderedFeature('pointLayer', 'point-2'),
    ]);
    dragShiftBox(mapHarness);

    expect(selectionServiceHarness.service.state.value.selectedCount).toBe(2);
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    expect(onSelectionChange.mock.calls[1][0].reason).toBe('box');
    binding.destroy();
  });

  it('退出多选时仍按 retain 和 clear 配置处理选中集', () => {
    const retainMapHarness = createMockMapHarness();
    const retainServiceHarness = createSelectionServiceHarness({
      deactivateBehavior: 'retain',
    });
    const retainBinding = mountInteractiveBinding(retainMapHarness, {
      selectionService: retainServiceHarness.service,
    });

    retainServiceHarness.service.activate();
    retainMapHarness.setFeatures([createRenderedFeature('pointLayer', 'retain-1')]);
    retainMapHarness.handlers.click(createMapEvent());
    retainServiceHarness.service.deactivate();

    expect(retainServiceHarness.service.state.value.isActive).toBe(false);
    expect(retainServiceHarness.service.state.value.selectedCount).toBe(1);
    retainBinding.destroy();

    const clearMapHarness = createMockMapHarness();
    const clearServiceHarness = createSelectionServiceHarness({
      deactivateBehavior: 'clear',
    });
    const clearBinding = mountInteractiveBinding(clearMapHarness, {
      selectionService: clearServiceHarness.service,
    });

    clearServiceHarness.service.activate();
    clearMapHarness.setFeatures([createRenderedFeature('pointLayer', 'clear-1')]);
    clearMapHarness.handlers.click(createMapEvent());
    clearServiceHarness.service.deactivate();

    expect(clearServiceHarness.service.state.value.isActive).toBe(false);
    expect(clearServiceHarness.service.state.value.selectedCount).toBe(0);
    clearBinding.destroy();
  });
});
