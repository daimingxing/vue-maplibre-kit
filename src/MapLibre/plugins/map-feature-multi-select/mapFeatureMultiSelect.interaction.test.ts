import { describe, expect, it, vi, afterEach } from 'vitest';
import { ref } from 'vue';
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import type {
  MapLayerInteractiveOptions,
  MapLayerSelectedFeature,
  MapLayerSelectionChangeContext,
  MapSelectionGestures,
  MapSelectionRangeResolver,
  MapSelectionUndoHistory,
} from '../../shared/mapLibre-controls-types';
import { resolveMapSelectionGestures } from '../../shared/map-selection-gestures';
import { createMapInteractiveBinding } from '../../composables/useMapInteractive';
import type { MapSelectionBindingController, MapSelectionService } from '../types';

interface MapHandlerMap {
  mousedown?: (event: MapMouseEvent) => void;
  click?: (event: MapMouseEvent) => void;
  mousemove?: (event: MapMouseEvent) => void;
  mouseout?: (event: MapMouseEvent) => void;
  dblclick?: (event: MapMouseEvent) => void;
  contextmenu?: (event: MapMouseEvent) => void;
}

interface WindowHandlerMap {
  mousemove?: (event: MouseEvent) => void;
  mouseup?: (event: MouseEvent) => void;
  keydown?: (event: KeyboardEvent) => void;
}

interface PointerModifiers {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  button?: number;
}

/**
 * 创建带稳定身份的渲染要素。
 * @param id 要素 ID
 * @param layerId 图层 ID
 * @param coordinates 点坐标
 * @returns MapLibre 渲染要素
 */
function renderedFeature(
  id: string,
  layerId = 'layer-a',
  coordinates: [number, number] = [id.charCodeAt(id.length - 1), 0]
): MapGeoJSONFeature {
  return {
    type: 'Feature',
    id,
    properties: { name: id },
    geometry: { type: 'Point', coordinates },
    source: `source-${layerId}`,
    sourceLayer: undefined,
    layer: { id: layerId },
  } as MapGeoJSONFeature;
}

/**
 * 创建地图鼠标事件。
 * @param coordinate 屏幕与经纬度坐标
 * @param options 修饰键与命中要素
 * @returns 最小 MapMouseEvent
 */
function mapEvent(
  coordinate: [number, number],
  options: PointerModifiers & { feature?: MapGeoJSONFeature | null } = {}
): MapMouseEvent {
  return {
    point: { x: coordinate[0], y: coordinate[1] },
    lngLat: { lng: coordinate[0], lat: coordinate[1] },
    originalEvent: {
      button: options.button ?? 0,
      shiftKey: options.shiftKey === true,
      ctrlKey: options.ctrlKey === true,
      altKey: options.altKey === true,
      clientX: coordinate[0],
      clientY: coordinate[1],
      preventDefault: vi.fn(),
    } as unknown as MouseEvent,
    preventDefault: vi.fn(),
  } as MapMouseEvent;
}

/**
 * 创建 DOM 鼠标事件。
 * @param coordinate 屏幕坐标
 * @param modifiers 修饰键
 * @returns 最小 MouseEvent
 */
function mouseEvent(coordinate: [number, number], modifiers: PointerModifiers = { shiftKey: true }): MouseEvent {
  return {
    button: modifiers.button ?? 0,
    shiftKey: modifiers.shiftKey === true,
    ctrlKey: modifiers.ctrlKey === true,
    altKey: modifiers.altKey === true,
    clientX: coordinate[0],
    clientY: coordinate[1],
    preventDefault: vi.fn(),
  } as unknown as MouseEvent;
}

/**
 * 把两端快照原样加入范围结果。
 * @param anchor 范围起点
 * @param endpoint 范围终点
 * @returns 解析成功结果
 */
function resolvePair(
  anchor: MapLayerSelectedFeature,
  endpoint: MapLayerSelectedFeature
): { status: 'resolved'; features: MapLayerSelectedFeature[] } {
  return { status: 'resolved', features: [anchor, endpoint] };
}

/**
 * 创建多选交互测试夹具。
 * @param options 手势、范围解析器与命中要素
 * @returns 地图事件入口、选中变化记录与绑定
 */
function createFixture(
  options: {
    gestures?: MapSelectionGestures;
    resolveRange?: MapSelectionRangeResolver;
    features?: MapGeoJSONFeature[];
  } = {}
) {
  const mapHandlers: MapHandlerMap = {};
  const windowHandlers: WindowHandlerMap = {};
  const selectionChanges: MapLayerSelectionChangeContext[] = [];
  const features = options.features ?? [
    renderedFeature('a'),
    renderedFeature('b'),
    renderedFeature('c'),
  ];
  let pointFeatures = [...features];
  const setFeatureState = vi.fn();
  const map = {
    getLayer: vi.fn(() => ({})),
    getSource: vi.fn(() => ({})),
    queryRenderedFeatures: vi.fn((pointOrBox: unknown) => {
      if (Array.isArray(pointOrBox)) {
        return features;
      }
      return pointFeatures;
    }),
    setFeatureState,
    getContainer: vi.fn(() => ({
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      clientWidth: 800,
      clientHeight: 600,
      appendChild: vi.fn(),
    })),
    getCanvas: vi.fn(() => ({ style: { cursor: '' } })),
    unproject: vi.fn((point: [number, number] | { x: number; y: number }) => {
      const coordinate = Array.isArray(point) ? point : [point.x, point.y];
      return { lng: coordinate[0], lat: coordinate[1] };
    }),
    dragPan: {
      isEnabled: vi.fn(() => true),
      enable: vi.fn(),
      disable: vi.fn(),
    },
    boxZoom: {
      isEnabled: vi.fn(() => true),
      enable: vi.fn(),
      disable: vi.fn(),
    },
    on: vi.fn((event: keyof MapHandlerMap, handler: (event: MapMouseEvent) => void) => {
      mapHandlers[event] = handler;
    }),
    off: vi.fn(),
  } as unknown as MaplibreMap;

  const addEventListener = vi
    .spyOn(globalThis, 'addEventListener')
    .mockImplementation((type: string, handler: EventListenerOrEventListenerObject) => {
      windowHandlers[type as keyof WindowHandlerMap] = handler as (event: never) => void;
    });
  const removeEventListener = vi
    .spyOn(globalThis, 'removeEventListener')
    .mockImplementation((type: string) => {
      delete windowHandlers[type as keyof WindowHandlerMap];
    });

  const interactive: MapLayerInteractiveOptions = {
    enabled: true,
    layers: {
      'layer-a': {},
    },
    onSelectionChange: (context) => {
      selectionChanges.push(context);
    },
  };
  let bindingController: MapSelectionBindingController | null = null;
  const selectionOptions = {
    enabled: true,
    deactivateBehavior: 'clear' as const,
    closeOnEscape: true,
    targetLayerIds: null,
    excludeLayerIds: [],
    gestures: resolveMapSelectionGestures(options.gestures),
    resolveRange: options.resolveRange,
    showControl: true,
  };
  const service: MapSelectionService = {
    state: ref({
      isActive: false,
      selectionMode: 'single',
      selectedFeatures: [],
      selectedCount: 0,
      deactivateBehavior: 'clear',
    }),
    getOptions: () => selectionOptions,
    attachBinding: (binding) => {
      bindingController = binding;
      return () => {
        bindingController = null;
      };
    },
    syncState: vi.fn(),
    activate: () => bindingController?.activate(),
    deactivate: (deactivateOptions) => bindingController?.deactivate(deactivateOptions),
    toggle: () => {
      if (bindingController?.isActive()) {
        bindingController.deactivate();
        return;
      }
      bindingController?.activate();
    },
    clear: () => bindingController?.clear(),
    isActive: () => bindingController?.isActive() ?? false,
    getSelectedFeatures: () => bindingController?.getSelectedFeatures() ?? [],
    replaceSelectedFeatures: (nextFeatures, replaceOptions) => {
      bindingController?.replaceSelectedFeatures(nextFeatures, replaceOptions);
    },
    undo: () => bindingController?.undo() ?? false,
    canUndo: () => bindingController?.canUndo() ?? false,
    clearUndoHistory: () => {
      bindingController?.clearUndoHistory();
    },
    snapshotUndoHistory: () => bindingController?.snapshotUndoHistory() ?? { snapshots: [] },
    restoreUndoHistory: (history: MapSelectionUndoHistory) => {
      bindingController?.restoreUndoHistory(history);
    },
  };

  const binding = createMapInteractiveBinding(
    map,
    () => interactive,
    undefined,
    () => service
  );
  service.activate();

  return {
    map,
    mapHandlers,
    windowHandlers,
    selectionChanges,
    service,
    binding,
    setFeatureState,
    setPointFeatures(nextFeatures: MapGeoJSONFeature[]) {
      pointFeatures = nextFeatures;
    },
    click(feature: MapGeoJSONFeature, modifiers: PointerModifiers = {}) {
      pointFeatures = [feature];
      mapHandlers.click?.(mapEvent(feature.geometry.type === 'Point'
        ? (feature.geometry.coordinates as [number, number])
        : [0, 0], { ...modifiers, feature }));
    },
    mouseDown(coordinate: [number, number], modifiers: PointerModifiers = { shiftKey: true }) {
      mapHandlers.mousedown?.(mapEvent(coordinate, modifiers));
    },
    cleanup() {
      binding.destroy();
      addEventListener.mockRestore();
      removeEventListener.mockRestore();
    },
  };
}

/**
 * 读取选中集中的要素 ID 列表。
 * @param features 选中项快照
 * @returns 要素 ID 列表
 */
function featureIds(features: MapLayerSelectedFeature[]): string[] {
  return features.map((feature) => String(feature.featureId));
}

describe('map-feature-multi-select 交互切面', () => {
  let fixture: ReturnType<typeof createFixture>;

  afterEach(() => {
    fixture?.cleanup();
  });

  it('未配置手势时 clickAdd、clickDeselect 与框选启用，range 关闭', () => {
    fixture = createFixture();
    const [first, second] = [renderedFeature('a'), renderedFeature('b')];

    fixture.click(first);
    fixture.click(second);

    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a', 'b']);
    expect(fixture.selectionChanges.map((change) => change.reason)).toEqual(['click', 'click']);

    fixture.click(second);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(fixture.selectionChanges.at(-1)?.reason).toBe('click');
  });

  it('clickAdd 只新增未选中要素，clickDeselect 关闭时已选中点击不变', () => {
    fixture = createFixture({
      gestures: { clickAdd: true, clickDeselect: false, box: false, range: false },
    });
    const [first, second] = [renderedFeature('a'), renderedFeature('b')];

    fixture.click(first);
    fixture.click(first);
    fixture.click(second);

    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a', 'b']);
  });

  it('clickDeselect 只取消已选中要素，clickAdd 关闭时未选中点击不变', () => {
    fixture = createFixture({
      gestures: { clickAdd: false, clickDeselect: true, box: false, range: false },
    });
    fixture.service.replaceSelectedFeatures([
      {
        key: 'source-layer-a::::a',
        featureId: 'a',
        layerId: 'layer-a',
        sourceId: 'source-layer-a',
        sourceLayer: null,
        properties: { name: 'a' },
        snapshot: {
          type: 'Feature',
          id: 'a',
          properties: { name: 'a' },
          geometry: { type: 'Point', coordinates: [97, 0] },
        },
      },
    ], { emitChange: false });

    fixture.click(renderedFeature('b'));
    fixture.click(renderedFeature('a'));

    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual([]);
  });

  it('连续点击范围模式：未选中点击建立起点并执行范围，已选中点击只反选', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: {
        clickAdd: false,
        clickDeselect: true,
        box: false,
        range: { enabled: true, trigger: 'click' },
      },
      resolveRange,
    });
    const [first, second, third] = [renderedFeature('a'), renderedFeature('b'), renderedFeature('c')];

    fixture.click(first);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);

    fixture.click(second);
    expect(featureIds(fixture.service.getSelectedFeatures()).sort()).toEqual(['a', 'b']);
    expect(fixture.selectionChanges.at(-1)?.reason).toBe('range');

    fixture.click(second);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(resolveRange.mock.calls[0]?.[0].featureId).toBe('a');

    fixture.click(third);
    expect(resolveRange).toHaveBeenCalledTimes(2);
    expect(resolveRange.mock.calls[1]?.[0].featureId).toBe('a');
  });

  it('clickAdd 开启时最近一次单击新增成为范围起点，范围成员不滚动起点', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: {
        clickAdd: true,
        box: false,
        range: { enabled: true, trigger: 'shift' },
      },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'));
    fixture.click(renderedFeature('c'), { shiftKey: true });

    expect(resolveRange.mock.calls[0]?.[0].featureId).toBe('b');
    expect(featureIds(fixture.service.getSelectedFeatures()).sort()).toEqual(['a', 'b', 'c']);

    fixture.click(renderedFeature('a'), { shiftKey: true });
    expect(resolveRange.mock.calls[1]?.[0].featureId).toBe('b');
  });

  it('修饰键范围关闭 clickAdd 时，普通单击即可设起点，后续未选中单击不追加', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: {
        clickAdd: false,
        clickDeselect: true,
        box: false,
        range: { enabled: true, trigger: 'shift' },
      },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);

    fixture.click(renderedFeature('b'));
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(resolveRange).not.toHaveBeenCalled();

    fixture.click(renderedFeature('c'), { shiftKey: true });
    expect(resolveRange.mock.calls[0]?.[0].featureId).toBe('a');
    expect(featureIds(fixture.service.getSelectedFeatures()).sort()).toEqual(['a', 'c']);

    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'));
    fixture.click(renderedFeature('c'), { shiftKey: true });
    expect(resolveRange.mock.calls[1]?.[0].featureId).toBe('b');
  });

  it('反选非起点时起点不变，反选起点后下一次未选中点击重新建立起点', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: {
        clickAdd: false,
        clickDeselect: true,
        box: false,
        range: { enabled: true, trigger: 'click' },
      },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'));
    fixture.click(renderedFeature('b'));
    fixture.click(renderedFeature('c'));

    expect(resolveRange).toHaveBeenCalledTimes(2);
    expect(resolveRange.mock.calls[1]?.[0].featureId).toBe('a');

    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'));
    fixture.click(renderedFeature('a'));
    expect(resolveRange.mock.calls[2]?.[0].featureId).toBe('b');
  });

  it('修饰键必须精确匹配，额外按下其他修饰键不触发范围', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: {
        clickAdd: true,
        box: false,
        range: { enabled: true, trigger: 'shift' },
      },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'), { shiftKey: true, ctrlKey: true });
    fixture.click(renderedFeature('b'), { ctrlKey: true });
    expect(resolveRange).not.toHaveBeenCalled();
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);

    fixture.click(renderedFeature('b'), { shiftKey: true });
    expect(resolveRange).toHaveBeenCalledTimes(1);
  });

  it('Ctrl 与 Alt 范围触发分别只响应对应修饰键', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: {
        clickAdd: true,
        box: false,
        range: { enabled: true, trigger: 'ctrl' },
      },
      resolveRange,
    });
    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'), { shiftKey: true });
    fixture.click(renderedFeature('b'), { ctrlKey: true });
    expect(resolveRange).toHaveBeenCalledTimes(1);
    fixture.cleanup();

    const altResolve = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: {
        clickAdd: true,
        box: false,
        range: { enabled: true, trigger: 'alt' },
      },
      resolveRange: altResolve,
    });
    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'), { ctrlKey: true });
    fixture.click(renderedFeature('b'), { altKey: true });
    expect(altResolve).toHaveBeenCalledTimes(1);
  });

  it('首次 Shift 点击建立锚点，成功范围选择追加成员并保留原锚点', () => {
    const resolveRange = vi.fn((anchor: MapLayerSelectedFeature, endpoint: MapLayerSelectedFeature) => ({
      status: 'resolved' as const,
      features: [anchor, endpoint, renderedFeature('c')].map((feature, index) => ({
        key: `source-layer-a::::${['a', 'b', 'c'][index]}`,
        featureId: ['a', 'b', 'c'][index],
        layerId: 'layer-a',
        sourceId: 'source-layer-a',
        sourceLayer: null,
        properties: { name: ['a', 'b', 'c'][index] },
        snapshot: {
          type: 'Feature' as const,
          id: ['a', 'b', 'c'][index],
          properties: { name: ['a', 'b', 'c'][index] },
          geometry: { type: 'Point' as const, coordinates: [index, 0] },
        },
      })),
    }));
    fixture = createFixture({
      gestures: { clickAdd: true, box: false, range: true },
      resolveRange,
    });

    fixture.click(renderedFeature('a'), { shiftKey: true });
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);

    fixture.click(renderedFeature('b'), { shiftKey: true });
    expect(featureIds(fixture.service.getSelectedFeatures()).sort()).toEqual(['a', 'b', 'c']);
    expect(fixture.selectionChanges.filter((change) => change.reason === 'range')).toHaveLength(1);

    fixture.click(renderedFeature('b'), { shiftKey: true });
    expect(resolveRange).toHaveBeenCalledTimes(2);
    expect(resolveRange.mock.calls[1]?.[0].featureId).toBe('a');
  });

  it('框选不改变范围锚点，超过阈值的拖拽抑制随后 click', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: { clickAdd: true, box: true, range: true },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    fixture.mouseDown([10, 10], { shiftKey: true });
    fixture.windowHandlers.mousemove?.(mouseEvent([20, 20]));
    fixture.windowHandlers.mouseup?.(mouseEvent([20, 20]));
    fixture.click(renderedFeature('b'), { shiftKey: true });

    expect(resolveRange).not.toHaveBeenCalled();
    expect(fixture.selectionChanges.some((change) => change.reason === 'box')).toBe(true);
    expect(fixture.selectionChanges.some((change) => change.reason === 'range')).toBe(false);

    fixture.click(renderedFeature('b'), { shiftKey: true });
    expect(resolveRange).toHaveBeenCalledTimes(1);
    expect(resolveRange.mock.calls[0]?.[0].featureId).toBe('a');
  });

  it('未超过移动阈值的 Shift 点击按范围处理', () => {
    fixture = createFixture({
      gestures: { clickAdd: true, box: false, range: true },
      resolveRange: resolvePair,
    });

    fixture.click(renderedFeature('a'), { shiftKey: true });
    fixture.mouseDown([10, 10], { shiftKey: true });
    fixture.windowHandlers.mousemove?.(mouseEvent([11, 11]));
    fixture.windowHandlers.mouseup?.(mouseEvent([11, 11]));
    fixture.click(renderedFeature('b'), { shiftKey: true });

    expect(fixture.selectionChanges.some((change) => change.reason === 'box')).toBe(false);
    expect(fixture.selectionChanges.at(-1)?.reason).toBe('range');
  });

  it('关闭 box 后超过阈值的 Shift 拖拽不会框选，并抑制随后的范围 click', () => {
    fixture = createFixture({
      gestures: { clickAdd: true, box: false, range: true },
      resolveRange: resolvePair,
    });
    fixture.click(renderedFeature('a'), { shiftKey: true });
    fixture.mouseDown([10, 10], { shiftKey: true });
    fixture.windowHandlers.mousemove?.(mouseEvent([20, 20]));
    fixture.windowHandlers.mouseup?.(mouseEvent([20, 20]));
    fixture.click(renderedFeature('b'), { shiftKey: true });

    expect(fixture.selectionChanges.some((change) => change.reason === 'box')).toBe(false);
    expect(fixture.selectionChanges.some((change) => change.reason === 'range')).toBe(false);
  });

  it('Ctrl 框选只在精确按下 Ctrl 拖拽时生效', () => {
    fixture = createFixture({
      gestures: {
        clickAdd: true,
        box: { enabled: true, trigger: 'ctrl' },
        range: false,
      },
    });

    fixture.mouseDown([10, 10], { shiftKey: true });
    fixture.windowHandlers.mousemove?.(mouseEvent([20, 20]));
    fixture.windowHandlers.mouseup?.(mouseEvent([20, 20]));
    expect(fixture.selectionChanges.some((change) => change.reason === 'box')).toBe(false);

    fixture.mouseDown([10, 10], { ctrlKey: true });
    fixture.windowHandlers.mousemove?.(mouseEvent([20, 20], { ctrlKey: true }));
    fixture.windowHandlers.mouseup?.(mouseEvent([20, 20], { ctrlKey: true }));
    expect(fixture.selectionChanges.some((change) => change.reason === 'box')).toBe(true);
  });

  it('框选与范围使用不同修饰键时，范围修饰键拖拽不会框选', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: {
        clickAdd: true,
        box: { enabled: true, trigger: 'ctrl' },
        range: { enabled: true, trigger: 'alt' },
      },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    fixture.mouseDown([10, 10], { altKey: true });
    fixture.windowHandlers.mousemove?.(mouseEvent([20, 20], { altKey: true }));
    fixture.windowHandlers.mouseup?.(mouseEvent([20, 20], { altKey: true }));
    fixture.click(renderedFeature('b'), { altKey: true });

    expect(fixture.selectionChanges.some((change) => change.reason === 'box')).toBe(false);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(resolveRange).not.toHaveBeenCalled();

    fixture.mouseDown([10, 10], { ctrlKey: true });
    fixture.windowHandlers.mousemove?.(mouseEvent([20, 20], { ctrlKey: true }));
    fixture.windowHandlers.mouseup?.(mouseEvent([20, 20], { ctrlKey: true }));
    expect(fixture.selectionChanges.some((change) => change.reason === 'box')).toBe(true);
  });

  it('范围拒绝不改变选中集和锚点，并带上 reject 原因', () => {
    fixture = createFixture({
      gestures: { clickAdd: true, box: false, range: true },
      resolveRange: () => ({
        status: 'rejected',
        reason: 'groupMismatch',
      }),
    });

    fixture.click(renderedFeature('a'), { shiftKey: true });
    fixture.click(renderedFeature('b'), { shiftKey: true });

    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    const rejectChange = fixture.selectionChanges.at(-1);
    expect(rejectChange?.reason).toBe('reject');
    expect(rejectChange?.rangeReject?.reason).toBe('groupMismatch');
    expect(rejectChange?.rangeReject?.start.featureId).toBe('a');
    expect(rejectChange?.rangeReject?.end.featureId).toBe('b');

    fixture.click(renderedFeature('b'), { shiftKey: true });
    expect(fixture.selectionChanges.filter((change) => change.reason === 'reject')).toHaveLength(2);
  });

  it('原子替换选中集时同步数量、feature-state，并可静默恢复', () => {
    fixture = createFixture();
    const first = renderedFeature('a');
    const second = renderedFeature('b');
    fixture.click(first);
    const snapshot = fixture.service.getSelectedFeatures();

    fixture.click(second);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a', 'b']);
    fixture.selectionChanges.length = 0;

    fixture.service.replaceSelectedFeatures(snapshot, { emitChange: false });
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(fixture.selectionChanges).toHaveLength(0);
    expect(fixture.setFeatureState).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'source-layer-a', id: 'b' }),
      { selected: false }
    );

    fixture.service.replaceSelectedFeatures([], { emitChange: true, reason: 'clear' });
    expect(fixture.service.getSelectedFeatures()).toEqual([]);
    expect(fixture.selectionChanges.at(-1)?.reason).toBe('clear');
  });

  it('静默退出多选模式时不按 deactivateBehavior 清空或派发变化', () => {
    fixture = createFixture();
    const selected = renderedFeature('a');
    fixture.click(selected);
    fixture.selectionChanges.length = 0;

    fixture.service.deactivate({ emitChange: false });

    expect(fixture.service.isActive()).toBe(false);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(fixture.selectionChanges).toHaveLength(0);
  });

  it('关闭 clickAdd 后普通点击不再追加，关闭 range 后修饰键点击不会解析范围', () => {
    const resolveRange = vi.fn(() => ({
      status: 'resolved' as const,
      features: [],
    }));
    fixture = createFixture({
      gestures: { clickAdd: false, clickDeselect: false, box: true, range: false },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'), { shiftKey: true });

    expect(fixture.service.getSelectedFeatures()).toEqual([]);
    expect(resolveRange).not.toHaveBeenCalled();
  });

  it('连续多次 undo 按操作逆序恢复选中集，且不提供 redo', () => {
    fixture = createFixture();
    const [first, second, third] = [renderedFeature('a'), renderedFeature('b'), renderedFeature('c')];

    fixture.click(first);
    fixture.click(second);
    fixture.click(third);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a', 'b', 'c']);

    expect(fixture.service.undo()).toBe(true);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a', 'b']);
    expect(fixture.selectionChanges.at(-1)?.reason).toBe('undo');

    expect(fixture.service.undo()).toBe(true);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);

    fixture.click(third);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a', 'c']);
    expect(fixture.service.undo()).toBe(true);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(fixture.service.undo()).toBe(true);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual([]);
    expect(fixture.service.undo()).toBe(false);
  });

  it('范围选择作为一次原子操作回退，并恢复范围起点', () => {
    const resolveRange = vi.fn((anchor: MapLayerSelectedFeature, endpoint: MapLayerSelectedFeature) => ({
      status: 'resolved' as const,
      features: [anchor, endpoint, renderedFeature('c')].map((feature, index) => ({
        key: `source-layer-a::::${['a', 'b', 'c'][index]}`,
        featureId: ['a', 'b', 'c'][index],
        layerId: 'layer-a',
        sourceId: 'source-layer-a',
        sourceLayer: null,
        properties: { name: ['a', 'b', 'c'][index] },
        snapshot: {
          type: 'Feature' as const,
          id: ['a', 'b', 'c'][index],
          properties: { name: ['a', 'b', 'c'][index] },
          geometry: { type: 'Point' as const, coordinates: [index, 0] },
        },
      })),
    }));
    fixture = createFixture({
      gestures: { clickAdd: true, box: false, range: true },
      resolveRange,
    });
    const [first, second] = [renderedFeature('a'), renderedFeature('b')];

    fixture.click(first);
    fixture.click(second, { shiftKey: true });
    expect(featureIds(fixture.service.getSelectedFeatures()).sort()).toEqual(['a', 'b', 'c']);
    expect(fixture.selectionChanges.filter((change) => change.reason === 'range')).toHaveLength(1);

    expect(fixture.service.undo()).toBe(true);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(fixture.selectionChanges.at(-1)?.reason).toBe('undo');

    fixture.click(second, { shiftKey: true });
    expect(resolveRange.mock.calls.at(-1)?.[0].featureId).toBe('a');
  });

  it('重选清空可回退到清空前的选中集、主选中项和起点', () => {
    const resolveRange = vi.fn(resolvePair);
    fixture = createFixture({
      gestures: { clickAdd: true, box: false, range: true },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'));
    fixture.service.replaceSelectedFeatures([], { emitChange: true, reason: 'clear' });
    expect(fixture.service.getSelectedFeatures()).toEqual([]);
    expect(fixture.selectionChanges.at(-1)?.reason).toBe('clear');

    expect(fixture.service.undo()).toBe(true);
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a', 'b']);
    fixture.click(renderedFeature('c'), { shiftKey: true });
    expect(resolveRange.mock.calls.at(-1)?.[0].featureId).toBe('b');
  });

  it('范围拒绝和无实际变化不进入 undo 历史', () => {
    const resolveRange = vi.fn(() => ({
      status: 'rejected' as const,
      reason: 'groupMismatch' as const,
    }));
    fixture = createFixture({
      gestures: { clickAdd: true, box: false, range: true },
      resolveRange,
    });

    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'), { shiftKey: true });
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    expect(fixture.selectionChanges.at(-1)?.reason).toBe('reject');

    expect(fixture.service.undo()).toBe(true);
    expect(fixture.service.getSelectedFeatures()).toEqual([]);
    expect(fixture.service.undo()).toBe(false);
  });

  it('可以保存并恢复 undo 历史', () => {
    fixture = createFixture();
    fixture.click(renderedFeature('a'));
    const history = fixture.service.snapshotUndoHistory();

    fixture.click(renderedFeature('b'));
    fixture.service.clearUndoHistory();
    expect(fixture.service.canUndo()).toBe(false);

    fixture.service.restoreUndoHistory(history);
    expect(fixture.service.canUndo()).toBe(true);
    expect(fixture.service.undo()).toBe(true);
    expect(fixture.service.getSelectedFeatures()).toEqual([]);
  });

  it('退出多选会清空 undo 历史', () => {
    fixture = createFixture();
    fixture.click(renderedFeature('a'));
    expect(fixture.service.canUndo()).toBe(true);

    fixture.service.deactivate();
    fixture.service.activate();
    expect(fixture.service.canUndo()).toBe(false);
    expect(fixture.service.undo()).toBe(false);
  });

  it('Delete 在有历史时回退，无历史或可编辑焦点时不接管', () => {
    fixture = createFixture();
    fixture.click(renderedFeature('a'));
    fixture.click(renderedFeature('b'));

    const undoEvent = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true });
    const preventUndo = vi.spyOn(undoEvent, 'preventDefault');
    fixture.windowHandlers.keydown?.(undoEvent);

    expect(preventUndo).toHaveBeenCalled();
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);

    const input = document.createElement('input');
    document.body.appendChild(input);
    const inputEvent = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true, bubbles: true });
    Object.defineProperty(inputEvent, 'target', { value: input });
    const preventInput = vi.spyOn(inputEvent, 'preventDefault');
    fixture.windowHandlers.keydown?.(inputEvent);
    expect(preventInput).not.toHaveBeenCalled();
    expect(featureIds(fixture.service.getSelectedFeatures())).toEqual(['a']);
    input.remove();

    fixture.service.undo();
    expect(fixture.service.getSelectedFeatures()).toEqual([]);
    const idleEvent = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true });
    const preventIdle = vi.spyOn(idleEvent, 'preventDefault');
    fixture.windowHandlers.keydown?.(idleEvent);
    expect(preventIdle).not.toHaveBeenCalled();
  });
});
