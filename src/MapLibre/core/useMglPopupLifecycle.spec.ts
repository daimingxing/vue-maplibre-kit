import { nextTick, reactive, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LngLatLike, PopupOptions } from 'maplibre-gl';
import type { MapInstance } from 'vue-maplibre-gl';
import { useMglPopupLifecycle } from './useMglPopupLifecycle';

type PopupEventName = 'close' | 'open';

const popupInstances: PopupStub[] = [];
const mapStub = {
  on: vi.fn(),
  off: vi.fn(),
};

class PopupStub {
  readonly options: PopupOptions;
  readonly handlers: Partial<Record<PopupEventName, () => void>> = {};
  readonly setDOMContent = vi.fn(() => this);
  readonly setLngLat = vi.fn(() => this);
  readonly addTo = vi.fn(() => {
    this.isOpenValue = true;
    return this;
  });
  readonly remove = vi.fn(() => {
    this.isOpenValue = false;
    this.handlers.close?.();
    return this;
  });

  private isOpenValue = false;

  /**
   * 创建 Popup 测试替身。
   * @param options Popup 初始化配置
   */
  constructor(options: PopupOptions) {
    this.options = options;
    popupInstances.push(this);
  }

  /**
   * 注册 Popup 事件。
   * @param eventName 事件名称
   * @param handler 事件回调
   * @returns 当前实例
   */
  on(eventName: PopupEventName, handler: () => void): this {
    this.handlers[eventName] = handler;
    return this;
  }

  /**
   * 判断 Popup 是否打开。
   * @returns 打开时返回 true
   */
  isOpen(): boolean {
    return this.isOpenValue;
  }
}

/**
 * 创建测试用地图实例。
 * @returns 地图实例
 */
function createMapInstance(): MapInstance {
  return {
    component: undefined,
    map: mapStub as unknown as MapInstance['map'],
    isMounted: true,
    isLoaded: true,
    language: undefined,
  };
}

describe('useMglPopupLifecycle', () => {
  beforeEach(() => {
    popupInstances.length = 0;
    vi.clearAllMocks();
  });

  it('options 变化时应重建 Popup 并保留当前显示状态', async () => {
    const props = reactive({
      visible: true,
      lngLat: [113.9, 22.5] as LngLatLike,
      options: {
        closeButton: true,
        maxWidth: '240px',
      } as PopupOptions,
    });
    const emit = vi.fn();

    useMglPopupLifecycle({
      props,
      emit,
      mapInstance: createMapInstance(),
      popupContentRef: ref({ nodeType: 1 } as Node),
      PopupCtor: PopupStub as never,
    });

    await nextTick();
    props.options = {
      closeButton: false,
      maxWidth: '360px',
    };
    await nextTick();

    expect(popupInstances).toHaveLength(2);
    expect(popupInstances[0].remove).toHaveBeenCalledTimes(1);
    expect(popupInstances[1].options).toMatchObject({
      closeButton: false,
      maxWidth: '360px',
    });
    expect(popupInstances[1].setLngLat).toHaveBeenCalledWith([113.9, 22.5]);
    expect(popupInstances[1].addTo).toHaveBeenCalledWith(mapStub);
    expect(emit).not.toHaveBeenCalledWith('update:visible', false);
    expect(emit).not.toHaveBeenCalledWith('close');
  });

  it('options 内容不变但对象引用变化时不应重建 Popup', async () => {
    const props = reactive({
      visible: true,
      lngLat: [113.9, 22.5] as LngLatLike,
      options: {
        closeButton: true,
        closeOnClick: true,
        maxWidth: '420px',
      } as PopupOptions,
    });

    useMglPopupLifecycle({
      props,
      emit: vi.fn(),
      mapInstance: createMapInstance(),
      popupContentRef: ref({ nodeType: 1 } as Node),
      PopupCtor: PopupStub as never,
    });

    await nextTick();
    props.options = {
      closeButton: true,
      closeOnClick: true,
      maxWidth: '420px',
    };
    await nextTick();

    expect(popupInstances).toHaveLength(1);
    expect(popupInstances[0].setLngLat).toHaveBeenCalledWith([113.9, 22.5]);
    expect(popupInstances[0].addTo).toHaveBeenCalledWith(mapStub);
  });

  it('内容 DOM 晚于地图加载就绪时也应初始化 Popup', async () => {
    const props = reactive({
      visible: true,
      lngLat: [113.9, 22.5] as LngLatLike,
      options: {
        closeButton: true,
      } as PopupOptions,
    });
    const popupContentRef = ref<Node | null>(null);

    useMglPopupLifecycle({
      props,
      emit: vi.fn(),
      mapInstance: createMapInstance(),
      popupContentRef,
      PopupCtor: PopupStub as never,
    });

    await nextTick();
    expect(popupInstances).toHaveLength(0);

    popupContentRef.value = { nodeType: 1 } as Node;
    await nextTick();

    expect(popupInstances).toHaveLength(1);
    expect(popupInstances[0].setLngLat).toHaveBeenCalledWith([113.9, 22.5]);
    expect(popupInstances[0].addTo).toHaveBeenCalledWith(mapStub);
  });
});
