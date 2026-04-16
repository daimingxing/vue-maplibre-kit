import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { LngLatLike } from 'maplibre-gl';

/** Popup 打开入参。 */
export interface MapPopupOpenOptions<TPayload> {
  /** 当前弹窗对应的经纬度坐标。 */
  lngLat: LngLatLike;
  /** 当前弹窗对应的业务载荷。 */
  payload: TPayload;
}

/** 通用 Popup 状态门面返回结果。 */
export interface UseMapPopupStateResult<TPayload> {
  /** 当前弹窗是否可见。 */
  visible: Ref<boolean>;
  /** 当前弹窗是否已打开的语义化别名。 */
  isOpen: ComputedRef<boolean>;
  /** 当前弹窗锚点坐标。 */
  lngLat: Ref<LngLatLike | null>;
  /** 当前弹窗业务载荷。 */
  payload: Ref<TPayload | null>;
  /** 打开弹窗并同步当前业务载荷。 */
  open: (options: MapPopupOpenOptions<TPayload>) => void;
  /** 关闭弹窗并清空状态。 */
  close: () => void;
  /** 仅更新当前业务载荷，不影响显隐与坐标。 */
  setPayload: (payload: TPayload | null) => void;
}

/**
 * 创建页面通用的 Popup 状态门面。
 * 该 helper 只负责“显隐 + 坐标 + 业务载荷”三类状态，
 * 不耦合地图实例，也不接管插槽内容渲染。
 *
 * @returns 可直接被业务页面消费的 Popup 状态与方法
 */
export function useMapPopupState<TPayload = unknown>(): UseMapPopupStateResult<TPayload> {
  const visible = ref(false);
  const lngLat = ref<LngLatLike | null>(null);
  const payload = ref<TPayload | null>(null) as Ref<TPayload | null>;
  const isOpen = computed(() => visible.value);

  /**
   * 打开弹窗，并一次性同步坐标与业务载荷。
   * @param options 当前弹窗打开配置
   */
  const open = (options: MapPopupOpenOptions<TPayload>): void => {
    lngLat.value = options.lngLat;
    payload.value = options.payload;
    visible.value = true;
  };

  /**
   * 关闭弹窗，并将当前坐标与业务载荷一起清空。
   */
  const close = (): void => {
    visible.value = false;
    lngLat.value = null;
    payload.value = null;
  };

  /**
   * 仅更新当前弹窗业务载荷，不改变当前显隐状态与坐标锚点。
   * @param nextPayload 最新业务载荷
   */
  const setPayload = (nextPayload: TPayload | null): void => {
    payload.value = nextPayload;
  };

  return {
    visible,
    isOpen,
    lngLat,
    payload,
    open,
    close,
    setPayload,
  };
}
