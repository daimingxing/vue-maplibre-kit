import type {
  MapLayerSelectedFeature,
  MapLayerSelectionChangeContext,
  MapSelectionLayerGroup,
  MapSelectionQueryOptions,
} from '../shared/mapLibre-contols-types';

/**
 * 归一化选中集快捷查询配置。
 * @param options 外部传入的查询配置
 * @returns 归一化后的查询配置
 */
function normalizeMapSelectionQueryOptions(
  options?: MapSelectionQueryOptions
): Required<MapSelectionQueryOptions> {
  return {
    layerId: options?.layerId || '',
    dedupe: options?.dedupe !== false,
  };
}

/**
 * 判断当前选中项是否满足查询条件。
 * @param selectedFeature 当前选中项
 * @param options 查询配置
 * @returns 满足条件时返回 true
 */
function matchesMapSelectionQuery(
  selectedFeature: MapLayerSelectedFeature,
  options: Required<MapSelectionQueryOptions>
): boolean {
  if (!options.layerId) {
    return true;
  }

  return selectedFeature.layerId === options.layerId;
}

/**
 * 在保留原始顺序的前提下收集查询结果。
 * @param selectedFeatures 原始选中集
 * @param options 查询配置
 * @param resolveValue 当前项值提取器
 * @returns 过滤并去重后的结果列表
 */
function collectMapSelectionValues<T>(
  selectedFeatures: MapLayerSelectedFeature[],
  options: Required<MapSelectionQueryOptions>,
  resolveValue: (selectedFeature: MapLayerSelectedFeature) => T | null | undefined
): T[] {
  const valueList: T[] = [];
  const valueSet = new Set<unknown>();

  selectedFeatures.forEach((selectedFeature) => {
    if (!matchesMapSelectionQuery(selectedFeature, options)) {
      return;
    }

    const value = resolveValue(selectedFeature);
    if (value === null || value === undefined) {
      return;
    }

    if (options.dedupe && valueSet.has(value)) {
      return;
    }

    valueList.push(value);

    if (options.dedupe) {
      valueSet.add(value);
    }
  });

  return valueList;
}

/**
 * 提取选中集中的要素 ID 列表。
 * @param selectedFeatures 当前选中集
 * @param options 查询配置
 * @returns 过滤并去重后的要素 ID 列表
 */
export function getSelectedFeatureIds(
  selectedFeatures: MapLayerSelectedFeature[],
  options?: MapSelectionQueryOptions
): Array<string | number> {
  const normalizedOptions = normalizeMapSelectionQueryOptions(options);
  return collectMapSelectionValues(selectedFeatures, normalizedOptions, (selectedFeature) => {
    return selectedFeature.featureId;
  });
}

/**
 * 提取选中集中的指定属性值列表。
 * @param selectedFeatures 当前选中集
 * @param propertyKey 需要提取的属性名
 * @param options 查询配置
 * @returns 过滤并去重后的属性值列表
 */
export function getSelectedPropertyValues<T = unknown>(
  selectedFeatures: MapLayerSelectedFeature[],
  propertyKey: string,
  options?: MapSelectionQueryOptions
): T[] {
  const normalizedOptions = normalizeMapSelectionQueryOptions(options);
  return collectMapSelectionValues<T>(selectedFeatures, normalizedOptions, (selectedFeature) => {
    return selectedFeature.properties?.[propertyKey] as T | null | undefined;
  });
}

/**
 * 将选中集按图层分组，便于业务层直接生成摘要或二次处理。
 * @param selectedFeatures 当前选中集
 * @returns 按图层顺序分组后的结果
 */
export function groupSelectedFeaturesByLayer(
  selectedFeatures: MapLayerSelectedFeature[]
): MapSelectionLayerGroup[] {
  const groupMap = new Map<string | null, MapSelectionLayerGroup>();

  selectedFeatures.forEach((selectedFeature) => {
    const layerId = selectedFeature.layerId || null;
    const currentGroup = groupMap.get(layerId);

    if (currentGroup) {
      currentGroup.features.push(selectedFeature);
      return;
    }

    groupMap.set(layerId, {
      layerId,
      features: [selectedFeature],
    });
  });

  return Array.from(groupMap.values()).map((group) => {
    return {
      layerId: group.layerId,
      features: [...group.features],
    };
  });
}

/**
 * 为选中集变化上下文挂接快捷提取方法。
 * @param selectedFeatures 当前完整选中集
 * @param addedFeatures 本次新增选中项
 * @param removedFeatures 本次移除选中项
 * @returns 上下文方法集合
 */
export function createSelectionChangeContextMethods(
  selectedFeatures: MapLayerSelectedFeature[],
  addedFeatures: MapLayerSelectedFeature[],
  removedFeatures: MapLayerSelectedFeature[]
): Pick<
  MapLayerSelectionChangeContext,
  | 'getSelectedFeatureIds'
  | 'getAddedFeatureIds'
  | 'getRemovedFeatureIds'
  | 'getSelectedPropertyValues'
  | 'getAddedPropertyValues'
  | 'getRemovedPropertyValues'
> {
  return {
    getSelectedFeatureIds: (options?: MapSelectionQueryOptions) => {
      return getSelectedFeatureIds(selectedFeatures, options);
    },
    getAddedFeatureIds: (options?: MapSelectionQueryOptions) => {
      return getSelectedFeatureIds(addedFeatures, options);
    },
    getRemovedFeatureIds: (options?: MapSelectionQueryOptions) => {
      return getSelectedFeatureIds(removedFeatures, options);
    },
    getSelectedPropertyValues: <T = unknown>(
      propertyKey: string,
      options?: MapSelectionQueryOptions
    ): T[] => {
      return getSelectedPropertyValues<T>(selectedFeatures, propertyKey, options);
    },
    getAddedPropertyValues: <T = unknown>(
      propertyKey: string,
      options?: MapSelectionQueryOptions
    ): T[] => {
      return getSelectedPropertyValues<T>(addedFeatures, propertyKey, options);
    },
    getRemovedPropertyValues: <T = unknown>(
      propertyKey: string,
      options?: MapSelectionQueryOptions
    ): T[] => {
      return getSelectedPropertyValues<T>(removedFeatures, propertyKey, options);
    },
  };
}
