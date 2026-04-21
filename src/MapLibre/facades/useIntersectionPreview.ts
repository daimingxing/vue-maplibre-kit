import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { MapCommonFeatureCollection } from '../shared/map-common-tools';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  IntersectionPreviewContext,
  IntersectionPreviewPluginApi,
  IntersectionPreviewScope,
  IntersectionPreviewState,
} from '../plugins/intersection-preview';
import {
  resolveIntersectionPreviewApi,
  resolveIntersectionPreviewState,
} from './mapPluginResolver';

/** useIntersectionPreview 返回结果。 */
export interface UseIntersectionPreviewResult {
  /** 当前交点插件状态。 */
  state: ComputedRef<IntersectionPreviewState | null>;
  /** 当前交点数量。 */
  count: ComputedRef<number>;
  /** 当前交点图层是否可见。 */
  visible: ComputedRef<boolean>;
  /** 当前求交范围。 */
  scope: ComputedRef<IntersectionPreviewScope>;
  /** 当前选中的交点 ID。 */
  selectedId: ComputedRef<string | null>;
  /** 最近一次错误信息。 */
  lastError: ComputedRef<string | null>;
  /** 重新计算当前交点集合。 */
  refresh: () => boolean;
  /** 清空当前交点集合。 */
  clear: () => boolean;
  /** 显示当前交点图层。 */
  show: () => boolean;
  /** 隐藏当前交点图层。 */
  hide: () => boolean;
  /** 切换当前求交范围。 */
  setScope: (scope: IntersectionPreviewScope) => boolean;
  /** 读取当前交点要素集合。 */
  getData: () => MapCommonFeatureCollection | null;
  /** 按交点 ID 读取交点上下文。 */
  getById: (intersectionId: string | null) => IntersectionPreviewContext | null;
  /** 读取当前选中的交点上下文。 */
  getSelected: () => IntersectionPreviewContext | null;
}

/**
 * 读取当前地图中的交点能力门面。
 * @param mapRef 地图组件公开实例引用
 * @returns 交点能力门面
 */
export function useIntersectionPreview(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
): UseIntersectionPreviewResult {
  /**
   * 读取当前 mapRef 对应的地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 读取当前页面注册的交点插件 API。
   * @returns 当前交点插件 API
   */
  const getIntersectionPreviewApi = (): IntersectionPreviewPluginApi | null => {
    return resolveIntersectionPreviewApi(getMapExpose());
  };

  const state = computed<IntersectionPreviewState | null>(() => {
    return resolveIntersectionPreviewState(getMapExpose());
  });

  /**
   * 安全执行交点插件动作。
   * @param action 需要执行的动作
   * @returns 是否成功拿到交点插件并执行动作
   */
  const runAction = (action: (api: IntersectionPreviewPluginApi) => void): boolean => {
    const intersectionApi = getIntersectionPreviewApi();
    if (!intersectionApi) {
      return false;
    }

    action(intersectionApi);
    return true;
  };

  return {
    state,
    count: computed(() => state.value?.count || 0),
    visible: computed(() => Boolean(state.value?.visible)),
    scope: computed(() => state.value?.scope || 'all'),
    selectedId: computed(() => state.value?.selectedId || null),
    lastError: computed(() => state.value?.lastError || null),
    refresh: () => runAction((api) => api.refresh()),
    clear: () => runAction((api) => api.clear()),
    show: () => runAction((api) => api.show()),
    hide: () => runAction((api) => api.hide()),
    setScope: (scope) => runAction((api) => api.setScope(scope)),
    getData: () => getIntersectionPreviewApi()?.getData() || null,
    getById: (intersectionId) => getIntersectionPreviewApi()?.getById(intersectionId) || null,
    getSelected: () => getIntersectionPreviewApi()?.getSelected() || null,
  };
}
