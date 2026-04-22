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
 * 根据交点上下文映射构建要素集合。
 * @param contextMap 交点上下文映射
 * @returns 标准要素集合
 */
function createCollectionFromContextMap(
  contextMap: Record<string, IntersectionPreviewContext>
): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: Object.values(contextMap).flatMap((context) => {
      if (!context.feature) {
        return [];
      }

      return [context.feature];
    }),
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
  const materializedData = ref<MapCommonFeatureCollection>(createEmptyCollection());
  const visible = ref(false);
  const selectedId = ref<string | null>(null);
  const contextMap = ref<Record<string, IntersectionPreviewContext>>({});
  const materializedContextMap = ref<Record<string, IntersectionPreviewContext>>({});
  const lastError = ref<string | null>(null);

  const count = computed(() => data.value.features.length);
  const materializedCount = computed(() => materializedData.value.features.length);

  /**
   * 同步当前选中交点是否仍然存在。
   * @param nextPreviewContextMap 最新预览上下文映射
   * @param nextMaterializedContextMap 最新正式交点上下文映射
   */
  const syncSelectedId = (
    nextPreviewContextMap: Record<string, IntersectionPreviewContext>,
    nextMaterializedContextMap: Record<string, IntersectionPreviewContext>
  ): void => {
    if (
      selectedId.value &&
      !nextPreviewContextMap[selectedId.value] &&
      !nextMaterializedContextMap[selectedId.value]
    ) {
      selectedId.value = null;
    }
  };

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
    syncSelectedId(nextContextMap, materializedContextMap.value);
  };

  /**
   * 用最新正式交点点要素集合替换当前 store 状态。
   * @param nextContextMap 最新正式交点上下文映射
   */
  const replaceMaterialized = (
    nextContextMap: Record<string, IntersectionPreviewContext>
  ): void => {
    materializedContextMap.value = nextContextMap;
    materializedData.value = createCollectionFromContextMap(nextContextMap);
    syncSelectedId(contextMap.value, nextContextMap);
  };

  /**
   * 清空当前交点集合。
   */
  const clear = (): void => {
    replace(createEmptyCollection(), {});
    lastError.value = null;
  };

  /**
   * 清空当前正式交点点要素集合。
   */
  const clearMaterialized = (): void => {
    replaceMaterialized({});
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
    materializedData,
    visible,
    selectedId,
    contextMap,
    materializedContextMap,
    lastError,
    count,
    materializedCount,
    replace,
    replaceMaterialized,
    clear,
    clearMaterialized,
    setSelectedId,
  };
}
