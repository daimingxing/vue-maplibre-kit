import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  MapLayerSelectedFeature,
  MapSelectionLayerGroup,
  MapSelectionMode,
  MapSelectionQueryOptions,
  MapSelectionState,
} from '../shared/mapLibre-controls-types';
import {
  getSelectedFeatureIds as collectSelectedFeatureIds,
  getSelectedPropertyValues as collectSelectedPropertyValues,
  groupSelectedFeaturesByLayer as collectSelectedFeaturesByLayer,
} from './mapSelection';

/** 缺省空选择态。 */
const defaultMapSelectionState: MapSelectionState = {
  isActive: false,
  selectionMode: 'single',
  selectedFeatures: [],
  selectedCount: 0,
  deactivateBehavior: 'clear',
};

/** useMapSelection 的返回结果。 */
export interface UseMapSelectionResult {
  /** 当前多选模式是否已激活。 */
  isActive: ComputedRef<boolean>;
  /** 当前生效的选择模式。 */
  selectionMode: ComputedRef<MapSelectionMode>;
  /** 当前选中项数量。 */
  selectedCount: ComputedRef<number>;
  /** 当前完整选中集。 */
  selectedFeatures: ComputedRef<MapLayerSelectedFeature[]>;
  /** 当前选中集对应的要素 ID 列表。 */
  selectedFeatureIds: ComputedRef<Array<string | number>>;
  /** 当前是否至少存在一项选中结果。 */
  hasSelection: ComputedRef<boolean>;
  /** 激活多选模式。 */
  activate: () => void;
  /** 退出多选模式。 */
  deactivate: () => void;
  /** 切换多选模式。 */
  toggle: () => void;
  /** 清空当前选中集。 */
  clear: () => void;
  /** 读取当前选中集中的要素 ID 列表。 */
  getSelectedFeatureIds: (options?: MapSelectionQueryOptions) => Array<string | number>;
  /** 读取当前选中集中的属性值列表。 */
  getSelectedPropertyValues: <T = unknown>(
    propertyKey: string,
    options?: MapSelectionQueryOptions
  ) => T[];
  /** 读取当前选中集的图层分组结果。 */
  groupSelectedFeaturesByLayer: () => MapSelectionLayerGroup[];
}

/**
 * 读取当前地图的普通图层选择态门面。
 * @param mapRef 地图组件公开实例引用
 * @returns 适合业务层直接消费的选择态与操作方法
 */
export function useMapSelection(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
): UseMapSelectionResult {
  const mapSelectionService = computed(() => {
    return toValue(mapRef)?.getMapSelectionService?.() || null;
  });

  const selectionState = computed<MapSelectionState>(() => {
    return mapSelectionService.value?.state.value || defaultMapSelectionState;
  });

  const selectedFeatures = computed<MapLayerSelectedFeature[]>(() => {
    return [...selectionState.value.selectedFeatures];
  });

  const selectedFeatureIds = computed<Array<string | number>>(() => {
    return collectSelectedFeatureIds(selectedFeatures.value);
  });

  const isActive = computed(() => selectionState.value.isActive);
  const selectionMode = computed(() => selectionState.value.selectionMode);
  const selectedCount = computed(() => selectionState.value.selectedCount);
  const hasSelection = computed(() => selectedCount.value > 0);

  /**
   * 激活多选模式。
   */
  const activate = (): void => {
    mapSelectionService.value?.activate();
  };

  /**
   * 退出多选模式。
   */
  const deactivate = (): void => {
    mapSelectionService.value?.deactivate();
  };

  /**
   * 切换多选模式。
   */
  const toggle = (): void => {
    mapSelectionService.value?.toggle();
  };

  /**
   * 清空当前选中集。
   */
  const clear = (): void => {
    mapSelectionService.value?.clear();
  };

  /**
   * 读取当前选中集中的要素 ID 列表。
   * @param options 查询配置
   * @returns 过滤后的要素 ID 列表
   */
  const getSelectedFeatureIds = (
    options?: MapSelectionQueryOptions
  ): Array<string | number> => {
    return collectSelectedFeatureIds(selectedFeatures.value, options);
  };

  /**
   * 读取当前选中集中的属性值列表。
   * @param propertyKey 需要提取的属性名
   * @param options 查询配置
   * @returns 过滤后的属性值列表
   */
  const getSelectedPropertyValues = <T = unknown>(
    propertyKey: string,
    options?: MapSelectionQueryOptions
  ): T[] => {
    return collectSelectedPropertyValues<T>(selectedFeatures.value, propertyKey, options);
  };

  /**
   * 读取当前选中集的图层分组结果。
   * @returns 按图层分组后的结果
   */
  const groupSelectedFeaturesByLayer = (): MapSelectionLayerGroup[] => {
    return collectSelectedFeaturesByLayer(selectedFeatures.value);
  };

  return {
    isActive,
    selectionMode,
    selectedCount,
    selectedFeatures,
    selectedFeatureIds,
    hasSelection,
    activate,
    deactivate,
    toggle,
    clear,
    getSelectedFeatureIds,
    getSelectedPropertyValues,
    groupSelectedFeaturesByLayer,
  };
}
