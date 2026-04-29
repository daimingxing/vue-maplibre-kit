import { getCurrentInstance, nextTick, onBeforeUnmount, type Ref, watch } from 'vue';
import { Popup, type LngLatLike, type PopupOptions } from 'maplibre-gl';
import type { MapInstance } from 'vue-maplibre-gl';

type PopupCtor = new (options?: PopupOptions) => Popup;

export interface MglPopupLifecycleProps {
  /** 控制 Popup 是否显示。 */
  visible: boolean;
  /** 经纬度坐标；为空时不显示弹窗。 */
  lngLat: LngLatLike | null;
  /** 原生 Popup 配置项。 */
  options?: PopupOptions;
}

export type MglPopupLifecycleEmit = {
  (eventName: 'update:visible', value: boolean): void;
  (eventName: 'close'): void;
  (eventName: 'open'): void;
};

export interface UseMglPopupLifecycleOptions {
  /** Popup 组件 props。 */
  props: MglPopupLifecycleProps;
  /** 组件事件发送函数。 */
  emit: MglPopupLifecycleEmit;
  /** 当前地图实例。 */
  mapInstance: MapInstance;
  /** Popup 内容 DOM。 */
  popupContentRef: Ref<Node | null>;
  /** Popup 构造器，测试时可替换。 */
  PopupCtor?: PopupCtor;
}

const DEFAULT_POPUP_OPTIONS: PopupOptions = {
  closeOnClick: true,
  closeButton: true,
};

/**
 * 稳定序列化 Popup 配置。
 * @param value 待序列化值
 * @returns 可用于比较配置内容的字符串
 */
function stringifyPopupOptions(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyPopupOptions(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stringifyPopupOptions((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

/**
 * 管理 MglPopup 原生实例生命周期。
 * @param options 生命周期配置
 */
export function useMglPopupLifecycle(options: UseMglPopupLifecycleOptions): void {
  const { props, emit, mapInstance, popupContentRef, PopupCtor = Popup } = options;
  let popup: Popup | null = null;
  let isInternalUpdate = false;
  let popupOptionsKey = stringifyPopupOptions(props.options || DEFAULT_POPUP_OPTIONS);

  /**
   * 读取当前 Popup 配置。
   * @returns Popup 初始化配置
   */
  function getPopupOptions(): PopupOptions {
    return props.options || DEFAULT_POPUP_OPTIONS;
  }

  /**
   * 显示 Popup。
   */
  function showPopup(): void {
    // 坐标为空时不显示弹窗，避免把空值传给 MapLibre 原生 API。
    if (!popup || !mapInstance.map || !props.lngLat) {
      return;
    }

    popup.setLngLat(props.lngLat).addTo(mapInstance.map);
  }

  /**
   * 隐藏 Popup。
   */
  function hidePopup(): void {
    if (popup && popup.isOpen()) {
      popup.remove();
    }
  }

  /**
   * 销毁当前 Popup 实例。
   * @param internal 是否为内部重建触发
   */
  function destroyPopup(internal = false): void {
    const currentPopup = popup;
    if (!currentPopup) {
      return;
    }

    isInternalUpdate = internal;
    currentPopup.remove();
    isInternalUpdate = false;
    popup = null;
  }

  /**
   * 初始化 Popup。
   */
  function initPopup(): void {
    if (!mapInstance.map || !popupContentRef.value) {
      return;
    }

    popup = new PopupCtor(getPopupOptions());
    popup.setDOMContent(popupContentRef.value);

    popup.on('close', () => {
      if (isInternalUpdate) {
        return;
      }

      emit('update:visible', false);
      emit('close');
    });

    popup.on('open', () => {
      emit('open');
    });

    if (props.visible) {
      showPopup();
    }
  }

  /**
   * 重建 Popup 并按当前 props 恢复显示状态。
   */
  function recreatePopup(): void {
    if (!popup) {
      initPopup();
      return;
    }

    destroyPopup(true);
    initPopup();
  }

  watch(
    () => ({
      isLoaded: mapInstance.isLoaded,
      hasContent: Boolean(popupContentRef.value),
    }),
    ({ isLoaded, hasContent }) => {
      if (isLoaded && hasContent && !popup) {
        initPopup();
      }
    },
    { immediate: true }
  );

  watch(
    () => props.visible,
    (newVal) => {
      if (newVal) {
        if (!props.lngLat) {
          hidePopup();
          return;
        }

        nextTick(() => {
          showPopup();
        });
      } else {
        hidePopup();
      }
    }
  );

  watch(
    () => props.lngLat,
    (newLngLat) => {
      if (!popup || !props.visible) {
        return;
      }

      // 坐标变为空时，主动隐藏弹窗，避免停留在旧坐标位置。
      if (!newLngLat) {
        hidePopup();
        return;
      }

      popup.setLngLat(newLngLat);
    },
    { deep: true }
  );

  watch(
    () => stringifyPopupOptions(props.options || DEFAULT_POPUP_OPTIONS),
    (nextOptionsKey) => {
      if (nextOptionsKey === popupOptionsKey) {
        return;
      }

      popupOptionsKey = nextOptionsKey;
      recreatePopup();
    },
    { deep: true }
  );

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      destroyPopup(true);
    });
  }
}
