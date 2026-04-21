import { computed, ref } from 'vue';
import type { MapCommonFeatureCollection } from '../../shared/map-common-tools';
import type { IntersectionPreviewContext } from './types';

/**
 * 创建空交点要素集合。
 * @returns 空的 FeatureCollection
 */
function createEmptyCollection(): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

/**
 * 创建交点预览 store。
 * 这里只负责维护临时点集、显隐和按 ID 检索的上下文映射，
 * 不承担求交计算本身。
 *
 * @returns 交点预览 store
 */
export function useIntersectionPreviewStore() {
  const data = ref<MapCommonFeatureCollection>(createEmptyCollection());
  const visible = ref(true);
  const selectedId = ref<string | null>(null);
  const contextMap = ref<Record<string, IntersectionPreviewContext>>({});
  const lastError = ref<string | null>(null);

  const count = computed(() => data.value.features.length);

  /**
   * 用最新交点集合替换当前 store 状态。
   * @param nextData 最新点要素集合
   * @param nextContextMap 最新上下文映射
   */
  const replace = (
    nextData: MapCommonFeatureCollection,
    nextContextMap: Record<string, IntersectionPreviewContext>
  ): void => {
    data.value = nextData;
    contextMap.value = nextContextMap;

    if (selectedId.value && !nextContextMap[selectedId.value]) {
      selectedId.value = null;
    }
  };

  /**
   * 清空当前交点集合。
   */
  const clear = (): void => {
    replace(createEmptyCollection(), {});
    lastError.value = null;
  };

  /**
   * 设置当前选中的交点 ID。
   * @param intersectionId 目标交点 ID
   */
  const setSelectedId = (intersectionId: string | null): void => {
    selectedId.value = intersectionId;
  };

  return {
    data,
    visible,
    selectedId,
    contextMap,
    lastError,
    count,
    replace,
    clear,
    setSelectedId,
  };
}
