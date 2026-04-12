import { reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { GeoJSONSourceSpecification } from 'maplibre-gl';
import type {
  FeatureProperties,
  MapFeatureId,
  SaveFeaturePropertiesResult,
} from '../composables/useMapDataUpdate';
import {
  clonePlainData,
  removeFeaturePropertiesInCollection,
  replaceFeatureCollectionFeatures,
  resolveMapFeaturePropertyPanelState,
  saveFeaturePropertiesInCollection,
  type MapFeaturePropertyPanelState,
  type MapFeaturePropertyPolicy,
} from '../shared/map-feature-data';
import {
  createMapSourceFeatureRef,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapSourceFeatureRef,
} from '../shared/map-common-tools';

/**
 * 业务 GeoJSON source 可透传给组件的属性集合。
 * 这里与 `MglGeoJsonSource` 的公开 source 级能力保持一致，
 * 但仍由业务层自己决定如何声明子图层。
 */
export interface MapBusinessSourceProps {
  /** 数据源唯一标识。 */
  sourceId: string;
  /** 当前要渲染的 GeoJSON 数据。 */
  data: GeoJSONSourceSpecification['data'];
  /** 最大缩放级别。 */
  maxzoom?: GeoJSONSourceSpecification['maxzoom'];
  /** 版权信息。 */
  attribution?: GeoJSONSourceSpecification['attribution'];
  /** 数据缓冲区大小。 */
  buffer?: GeoJSONSourceSpecification['buffer'];
  /** 简化容差。 */
  tolerance?: GeoJSONSourceSpecification['tolerance'];
  /** 是否启用聚合。 */
  cluster?: GeoJSONSourceSpecification['cluster'];
  /** 聚合半径。 */
  clusterRadius?: GeoJSONSourceSpecification['clusterRadius'];
  /** 聚合最大缩放级别。 */
  clusterMaxZoom?: GeoJSONSourceSpecification['clusterMaxZoom'];
  /** 聚合最小点数量。 */
  clusterMinPoints?: GeoJSONSourceSpecification['clusterMinPoints'];
  /** 聚合属性配置。 */
  clusterProperties?: GeoJSONSourceSpecification['clusterProperties'];
  /** 是否启用 lineMetrics。 */
  lineMetrics?: GeoJSONSourceSpecification['lineMetrics'];
  /** 是否自动生成顶层 id。 */
  generateId?: GeoJSONSourceSpecification['generateId'];
  /** 顶层 ID 提升字段。 */
  promoteId?: GeoJSONSourceSpecification['promoteId'];
  /** source 级过滤条件。 */
  filter?: GeoJSONSourceSpecification['filter'];
}

/**
 * 业务 source 透传配置。
 */
export type MapBusinessSourceOptions = Omit<
  MapBusinessSourceProps,
  'sourceId' | 'data' | 'promoteId'
>;

/**
 * `promoteId` 策略。
 */
interface MapBusinessSourcePromoteIdStrategy {
  /** 业务 ID 来自 properties 下的指定字段。 */
  promoteId: string;
  /** 其他 ID 策略互斥。 */
  featureIdKey?: never;
  /** 其他 ID 策略互斥。 */
  getFeatureId?: never;
}

/**
 * `featureIdKey` 策略。
 */
interface MapBusinessSourceFeatureIdKeyStrategy {
  /** 业务 ID 来自 properties 下的指定字段。 */
  featureIdKey: string;
  /** 其他 ID 策略互斥。 */
  promoteId?: never;
  /** 其他 ID 策略互斥。 */
  getFeatureId?: never;
}

/**
 * `getFeatureId` 策略。
 */
interface MapBusinessSourceGetterStrategy {
  /** 通过函数解析业务 ID。 */
  getFeatureId: (feature: MapCommonFeature) => MapFeatureId | null;
  /** 其他 ID 策略互斥。 */
  promoteId?: never;
  /** 其他 ID 策略互斥。 */
  featureIdKey?: never;
}

/**
 * 业务 source 创建配置。
 */
type MapBusinessSourceBaseOptions = {
  /** 数据源唯一标识。 */
  sourceId: string;
  /** 业务页面持有的原始 GeoJSON 数据引用。 */
  data: Ref<MapCommonFeatureCollection>;
  /** 透传给 `MglGeoJsonSource` 的扩展 source 配置。 */
  sourceOptions?: MapBusinessSourceOptions;
  /** 是否同步补齐顶层 `feature.id`。 */
  syncFeatureIdToTopLevel?: boolean;
  /** 业务层声明的属性规则输入；面板态与保存/删除都会复用它。 */
  propertyPolicy?: MapFeaturePropertyPolicy;
};

/**
 * `promoteId` 路径的创建配置。
 */
type CreateMapBusinessSourcePromoteIdOptions = MapBusinessSourceBaseOptions &
  MapBusinessSourcePromoteIdStrategy;

/**
 * `featureIdKey` 路径的创建配置。
 */
type CreateMapBusinessSourceFeatureIdKeyOptions = MapBusinessSourceBaseOptions &
  MapBusinessSourceFeatureIdKeyStrategy;

/**
 * `getFeatureId` 路径的创建配置。
 */
type CreateMapBusinessSourceGetterOptions = MapBusinessSourceBaseOptions &
  MapBusinessSourceGetterStrategy;

/**
 * 业务 source 创建配置。
 */
export type CreateMapBusinessSourceOptions =
  | CreateMapBusinessSourcePromoteIdOptions
  | CreateMapBusinessSourceFeatureIdKeyOptions
  | CreateMapBusinessSourceGetterOptions;

/**
 * 业务 source 对外门面。
 */
export interface MapBusinessSource {
  /** 当前 source ID。 */
  sourceId: string;
  /** 当前 source 使用的业务规则输入。 */
  propertyPolicy: MapFeaturePropertyPolicy | null;
  /** 当前 source 自动追加的强保护字段，例如业务主键。 */
  protectedPropertyKeys: readonly string[];
  /** 适合直接 `v-bind` 给 `MglGeoJsonSource` 的属性对象。 */
  sourceProps: MapBusinessSourceProps;
  /** 按业务 ID 解析最新要素。 */
  resolveFeature: (featureId: MapFeatureId | null) => MapCommonFeature | null;
  /** 按业务 ID 解析属性面板态。 */
  resolvePropertyPanelState: (featureId: MapFeatureId | null) => MapFeaturePropertyPanelState | null;
  /** 用最新要素数组整体替换当前 source。 */
  replaceFeatures: (nextFeatures: MapCommonFeature[]) => boolean;
  /** 按业务 ID 写回属性。 */
  saveProperties: (featureId: MapFeatureId, newProperties: FeatureProperties) => SaveFeaturePropertiesResult;
  /** 按业务 ID 显式删除属性。 */
  removeProperties: (
    featureId: MapFeatureId,
    propertyKeys: readonly string[]
  ) => SaveFeaturePropertiesResult;
  /** 将业务 ID 归一化为标准来源引用。 */
  toFeatureRef: (featureId: MapFeatureId | null) => MapSourceFeatureRef | null;
  /** 判断任意要素是否命中当前 source 的业务 ID。 */
  matchesFeature: (feature: MapCommonFeature | null | undefined, featureId: MapFeatureId) => boolean;
}

/**
 * 业务 source 注册表。
 */
export interface MapBusinessSourceRegistry {
  /** 读取指定 source。 */
  getSource: (sourceId: string | null | undefined) => MapBusinessSource | null;
  /** 列出全部已注册 source。 */
  listSources: () => MapBusinessSource[];
  /** 按标准来源引用解析要素。 */
  resolveFeature: (featureRef: MapSourceFeatureRef | null) => MapCommonFeature | null;
  /** 按标准来源引用解析属性面板态。 */
  resolveFeaturePropertyPanelState: (
    featureRef: MapSourceFeatureRef | null
  ) => MapFeaturePropertyPanelState | null;
  /** 替换指定 source 的完整要素数组。 */
  replaceFeatures: (sourceId: string, nextFeatures: MapCommonFeature[]) => boolean;
  /** 向指定 source 写回属性。 */
  saveProperties: (
    sourceId: string,
    featureId: MapFeatureId,
    newProperties: FeatureProperties
  ) => SaveFeaturePropertiesResult;
  /** 向指定 source 显式删除属性。 */
  removeProperties: (
    sourceId: string,
    featureId: MapFeatureId,
    propertyKeys: readonly string[]
  ) => SaveFeaturePropertiesResult;
  /** 创建标准来源引用。 */
  createFeatureRef: (sourceId: string, featureId: MapFeatureId | null) => MapSourceFeatureRef | null;
}

interface NormalizedBusinessSourceSnapshot {
  /** 标准化后的完整集合。 */
  featureCollection: MapCommonFeatureCollection;
  /** 当前 ID 校验是否通过。 */
  valid: boolean;
  /** 校验失败时的说明文本。 */
  validationMessage: string;
  /** 当前要素索引表。 */
  featureIndexMap: Map<MapFeatureId, number>;
}

/**
 * 判断当前配置是否属于可稳定复用索引的 ID 策略。
 * `promoteId / featureIdKey` 都依赖单个稳定属性键，且该键会被保护，
 * 因此本地单要素属性写回后不需要重新全量扫描整个集合。
 * @param options 业务 source 配置
 * @returns 是否为稳定 ID 路径
 */
function hasStableBusinessSourceIdStrategy(
  options: CreateMapBusinessSourceOptions
): options is CreateMapBusinessSourcePromoteIdOptions | CreateMapBusinessSourceFeatureIdKeyOptions {
  return hasPromoteIdStrategy(options) || hasFeatureIdKeyStrategy(options);
}

/**
 * 解析当前配置到底采用了哪一种 ID 策略。
 * @param options 业务 source 配置
 * @returns 策略类型
 */
function resolveBusinessSourceIdStrategy(
  options: CreateMapBusinessSourceOptions
): 'promoteId' | 'featureIdKey' | 'getFeatureId' | 'invalid' {
  const strategyList = [
    options.promoteId ? 'promoteId' : null,
    options.featureIdKey ? 'featureIdKey' : null,
    options.getFeatureId ? 'getFeatureId' : null,
  ].filter(Boolean) as Array<'promoteId' | 'featureIdKey' | 'getFeatureId'>;

  if (strategyList.length !== 1) {
    return 'invalid';
  }

  return strategyList[0];
}

/**
 * 判断当前配置是否命中了 `promoteId` 策略。
 * @param options 业务 source 配置
 * @returns 是否为 `promoteId` 路径
 */
function hasPromoteIdStrategy(
  options: CreateMapBusinessSourceOptions
): options is CreateMapBusinessSourcePromoteIdOptions {
  return resolveBusinessSourceIdStrategy(options) === 'promoteId';
}

/**
 * 判断当前配置是否命中了 `featureIdKey` 策略。
 * @param options 业务 source 配置
 * @returns 是否为 `featureIdKey` 路径
 */
function hasFeatureIdKeyStrategy(
  options: CreateMapBusinessSourceOptions
): options is CreateMapBusinessSourceFeatureIdKeyOptions {
  return resolveBusinessSourceIdStrategy(options) === 'featureIdKey';
}

/**
 * 判断当前配置是否命中了 `getFeatureId` 策略。
 * @param options 业务 source 配置
 * @returns 是否为 `getFeatureId` 路径
 */
function hasGetFeatureIdStrategy(
  options: CreateMapBusinessSourceOptions
): options is CreateMapBusinessSourceGetterOptions {
  return resolveBusinessSourceIdStrategy(options) === 'getFeatureId';
}

/**
 * 构建业务 source 配置错误提示。
 * @param sourceId 当前 source ID
 * @returns 中文错误提示
 */
function buildBusinessSourceStrategyMessage(sourceId: string): string {
  return `[createMapBusinessSource] source '${sourceId}' 必须且只能配置一种 ID 策略：promoteId、featureIdKey、getFeatureId`;
}

/**
 * 计算当前 source 是否需要把业务 ID 同步到顶层 `feature.id`。
 * @param options 业务 source 配置
 * @returns 是否需要补齐顶层 ID
 */
function shouldSyncTopLevelFeatureId(options: CreateMapBusinessSourceOptions): boolean {
  if (options.syncFeatureIdToTopLevel !== undefined) {
    return options.syncFeatureIdToTopLevel;
  }

  return !hasPromoteIdStrategy(options) && resolveBusinessSourceIdStrategy(options) !== 'invalid';
}

/**
 * 按当前策略从单条要素中提取业务 ID。
 * @param feature 当前要素
 * @param options 业务 source 配置
 * @returns 业务 ID；无法解析时返回 null
 */
function resolveBusinessFeatureId(
  feature: MapCommonFeature | null | undefined,
  options: CreateMapBusinessSourceOptions
): MapFeatureId | null {
  if (!feature) {
    return null;
  }

  if (hasPromoteIdStrategy(options)) {
    const propertyId = feature.properties?.[options.promoteId];
    return propertyId === undefined || propertyId === null ? null : (propertyId as MapFeatureId);
  }

  if (hasFeatureIdKeyStrategy(options)) {
    const propertyId = feature.properties?.[options.featureIdKey];
    return propertyId === undefined || propertyId === null ? null : (propertyId as MapFeatureId);
  }

  if (hasGetFeatureIdStrategy(options)) {
    return options.getFeatureId(feature);
  }

  return null;
}

/**
 * 解析当前 source 需要额外强保护的字段。
 * 这里主要把稳定 ID 字段提升成“可见但不可改、不可删”的系统保护键。
 * @param options 业务 source 配置
 * @returns 需要保护的属性键
 */
function resolveBusinessSourceProtectedKeys(
  options: CreateMapBusinessSourceOptions
): readonly string[] {
  if (hasPromoteIdStrategy(options)) {
    return [options.promoteId];
  }

  if (hasFeatureIdKeyStrategy(options)) {
    return [options.featureIdKey];
  }

  return [];
}

/**
 * 构建业务 source 校验失败文本。
 * @param sourceId 当前 source ID
 * @param missingIndexes 缺失业务 ID 的要素下标
 * @param duplicatedIds 重复业务 ID 列表
 * @returns 适合日志与界面提示的中文文本
 */
function buildBusinessSourceValidationMessage(
  sourceId: string,
  missingIndexes: number[],
  duplicatedIds: Array<string | number>
): string {
  const messageList: string[] = [];

  if (missingIndexes.length > 0) {
    messageList.push(
      `存在无法解析稳定 ID 的要素（序号：${missingIndexes.map((index) => index + 1).join('、')}）`
    );
  }

  if (duplicatedIds.length > 0) {
    messageList.push(`存在重复业务 ID（${duplicatedIds.join('、')}）`);
  }

  return `[createMapBusinessSource] source '${sourceId}' ${messageList.join('；')}，当前 resolve/save 能力将不可用`;
}

/**
 * 将当前业务 source 数据标准化为“适合渲染与查询”的快照。
 * @param featureCollection 原始 FeatureCollection
 * @param options 业务 source 配置
 * @returns 标准化结果
 */
function normalizeBusinessSourceData(
  featureCollection: MapCommonFeatureCollection,
  options: CreateMapBusinessSourceOptions
): NormalizedBusinessSourceSnapshot {
  const strategy = resolveBusinessSourceIdStrategy(options);
  if (strategy === 'invalid') {
    return {
      // 无效策略属于配置错误兜底路径，这里优先保证内部快照与外部输入隔离，
      // 避免业务层继续原地修改原始集合时反向污染 sourceProps.data。
      featureCollection: clonePlainData(featureCollection),
      valid: false,
      validationMessage: buildBusinessSourceStrategyMessage(options.sourceId),
      featureIndexMap: new Map(),
    };
  }

  const syncTopLevelId = shouldSyncTopLevelFeatureId(options);
  const sourceFeatures = (featureCollection.features || []) as MapCommonFeature[];
  const nextFeatures = sourceFeatures.slice();
  const duplicatedIdSet = new Set<string | number>();
  const usedIdSet = new Set<string | number>();
  const featureIndexMap = new Map<MapFeatureId, number>();
  const missingIndexes: number[] = [];

  sourceFeatures.forEach((feature, index) => {
    const resolvedFeatureId = resolveBusinessFeatureId(feature, options);

    // 顶层 `feature.id` 仅在确有差异时才浅拷贝当前要素，
    // 避免为了补 ID 而复制整份 FeatureCollection。
    if (syncTopLevelId && resolvedFeatureId !== null && feature.id !== resolvedFeatureId) {
      nextFeatures[index] = {
        ...feature,
        id: resolvedFeatureId,
      };
    }

    if (resolvedFeatureId === null) {
      missingIndexes.push(index);
      return;
    }

    if (usedIdSet.has(resolvedFeatureId)) {
      duplicatedIdSet.add(resolvedFeatureId);
      return;
    }

    usedIdSet.add(resolvedFeatureId);
    featureIndexMap.set(resolvedFeatureId, index);
  });

  const nextCollection: MapCommonFeatureCollection = {
    ...featureCollection,
    features: nextFeatures,
  };

  const duplicatedIds = [...duplicatedIdSet];
  if (!missingIndexes.length && !duplicatedIds.length) {
    return {
      featureCollection: nextCollection,
      valid: true,
      validationMessage: '',
      featureIndexMap,
    };
  }

  return {
    featureCollection: nextCollection,
    valid: false,
    validationMessage: buildBusinessSourceValidationMessage(
      options.sourceId,
      missingIndexes,
      duplicatedIds
    ),
    featureIndexMap,
  };
}

/**
 * 将标准化结果同步到可供模板直接消费的 `sourceProps`。
 * 这里保持对象引用稳定，避免业务层在模板里频繁拿到新对象。
 * @param sourceProps 已创建的响应式 source props
 * @param snapshot 最新标准化快照
 * @param sourceId 当前 source ID
 * @param sourceOptions 透传的 source 配置
 * @param options 原始业务 source 配置
 */
function syncBusinessSourceProps(
  sourceProps: MapBusinessSourceProps,
  snapshot: NormalizedBusinessSourceSnapshot,
  sourceId: string,
  sourceOptions: MapBusinessSourceOptions,
  options: CreateMapBusinessSourceOptions
): void {
  // 统一保留 source 级配置透传能力，保证 lineMetrics、cluster 等原生能力不丢失。
  Object.assign(sourceProps, sourceOptions);

  // 门面约定的核心字段始终由库负责输出，不允许被透传配置覆盖。
  sourceProps.sourceId = sourceId;
  sourceProps.data = snapshot.featureCollection;

  // 只有 `promoteId` 策略才需要向 `MglGeoJsonSource` 透传 `promoteId`。
  sourceProps.promoteId = hasPromoteIdStrategy(options) ? options.promoteId : undefined;
}

/**
 * 创建单个业务 source 门面。
 * @param options 业务 source 配置
 * @returns 标准化后的业务 source 门面
 */
export function createMapBusinessSource(options: CreateMapBusinessSourceOptions): MapBusinessSource {
  const { sourceId, data, sourceOptions = {}, propertyPolicy = null } = options;
  const protectedKeys = resolveBusinessSourceProtectedKeys(options);
  const sourceProps = reactive({}) as MapBusinessSourceProps;
  const snapshotRef = ref<NormalizedBusinessSourceSnapshot>(
    normalizeBusinessSourceData(data.value, options)
  );
  let lastValidationMessage = '';
  let isInternalSyncing = false;

  /**
   * 只在校验结果发生变化时输出一次错误日志，避免控制台被重复刷屏。
   */
  const syncValidationLog = () => {
    const validationMessage = snapshotRef.value.validationMessage;

    if (!validationMessage) {
      lastValidationMessage = '';
      return;
    }

    if (validationMessage !== lastValidationMessage) {
      console.error(validationMessage);
      lastValidationMessage = validationMessage;
    }
  };

  /**
   * 将最新快照同步回业务源与模板输出。
   * @param snapshot 最新标准化快照
   */
  const commitSnapshot = (snapshot: NormalizedBusinessSourceSnapshot): void => {
    snapshotRef.value = snapshot;
    syncBusinessSourceProps(sourceProps, snapshot, sourceId, sourceOptions, options);
    syncValidationLog();
    isInternalSyncing = true;
    data.value = snapshot.featureCollection;
  };

  watch(
    data,
    (nextCollection) => {
      if (isInternalSyncing) {
        isInternalSyncing = false;
        syncBusinessSourceProps(sourceProps, snapshotRef.value, sourceId, sourceOptions, options);
        syncValidationLog();
        return;
      }

      snapshotRef.value = normalizeBusinessSourceData(nextCollection, options);
      syncBusinessSourceProps(sourceProps, snapshotRef.value, sourceId, sourceOptions, options);
      syncValidationLog();
    },
    { immediate: true }
  );

  /**
   * 判断单条要素是否命中目标业务 ID。
   * @param feature 待匹配要素
   * @param featureId 目标业务 ID
   * @returns 是否命中
   */
  const matchesFeature = (
    feature: MapCommonFeature | null | undefined,
    featureId: MapFeatureId
  ): boolean => {
    if (!feature) {
      return false;
    }

    if (resolveBusinessFeatureId(feature, options) === featureId) {
      return true;
    }

    return shouldSyncTopLevelFeatureId(options) && feature.id === featureId;
  };

  /**
   * 按业务 ID 读取当前快照中的原始要素。
   * @param featureId 目标业务 ID
   * @returns 当前最新要素；找不到时返回 null
   */
  const getCurrentFeature = (featureId: MapFeatureId | null): MapCommonFeature | null => {
    if (featureId === null || !snapshotRef.value.valid) {
      return null;
    }

    const featureIndex = snapshotRef.value.featureIndexMap.get(featureId);
    if (featureIndex === undefined) {
      return null;
    }

    const targetFeature = snapshotRef.value.featureCollection.features?.[
      featureIndex
    ] as MapCommonFeature | null;
    return targetFeature || null;
  };

  /**
   * 为当前增量写回构造下一份快照。
   * @param nextCollection 最新集合
   * @returns 最新快照
   */
  const buildNextSnapshotForLocalMutation = (
    nextCollection: MapCommonFeatureCollection
  ): NormalizedBusinessSourceSnapshot => {
    // `promoteId / featureIdKey` 路径的业务 ID 依赖稳定字段，
    // 且这些字段已被保护，本地单要素属性写回不会改变索引拓扑。
    if (hasStableBusinessSourceIdStrategy(options)) {
      return {
        ...snapshotRef.value,
        featureCollection: nextCollection,
      };
    }

    // getFeatureId 路径无法自动推断哪些字段会影响业务 ID，
    // 因此保守起见，这里仍执行一次全量标准化，保证索引与校验始终正确。
    if (hasGetFeatureIdStrategy(options)) {
      return normalizeBusinessSourceData(nextCollection, options);
    }

    return {
      ...snapshotRef.value,
      featureCollection: nextCollection,
    };
  };

  /**
   * 按业务 ID 解析最新要素。
   * @param featureId 目标业务 ID
   * @returns 命中的要素；未命中或当前 ID 校验失败时返回 null
   */
  const resolveFeature = (featureId: MapFeatureId | null): MapCommonFeature | null => {
    syncValidationLog();
    const targetFeature = getCurrentFeature(featureId);
    return targetFeature ? clonePlainData(targetFeature) : null;
  };

  /**
   * 按业务 ID 解析属性面板态。
   * 这一步会把“原始 properties + propertyPolicy + protectedKeys”
   * 统一转换成业务层可直接渲染的 panelState。
   *
   * @param featureId 目标业务 ID
   * @returns 命中的属性面板态；找不到时返回 null
   */
  const resolvePropertyPanelState = (
    featureId: MapFeatureId | null
  ): MapFeaturePropertyPanelState | null => {
    const targetFeature = getCurrentFeature(featureId);
    if (!targetFeature) {
      return null;
    }

    return resolveMapFeaturePropertyPanelState(targetFeature.properties || {}, {
      propertyPolicy,
      protectedKeys,
    });
  };

  /**
   * 用最新要素数组整体替换当前 source。
   * @param nextFeatures 最新要素数组
   * @returns 是否写回成功
   */
  const replaceFeatures = (nextFeatures: MapCommonFeature[]): boolean => {
    const nextCollection = replaceFeatureCollectionFeatures(data.value, nextFeatures);
    const normalizedSnapshot = normalizeBusinessSourceData(nextCollection, options);

    // replace 是业务层显式提交的最新结果，这里直接把标准化后的集合写回本地数据引用。
    commitSnapshot(normalizedSnapshot);
    return true;
  };

  /**
   * 按业务 ID 保存属性。
   * 这里复用与 panelState 相同的字段规则，保证“面板里能改”和“真正写得进去”保持一致。
   *
   * @param featureId 目标业务 ID
   * @param newProperties 本次需要保存的属性键值
   * @returns 结构化写回结果
   */
  const saveProperties = (
    featureId: MapFeatureId,
    newProperties: FeatureProperties
  ): SaveFeaturePropertiesResult => {
    syncValidationLog();

    if (!snapshotRef.value.valid) {
      return {
        success: false,
        target: 'map',
        featureId,
        message: snapshotRef.value.validationMessage,
      };
    }

    const result = saveFeaturePropertiesInCollection({
      featureCollection: snapshotRef.value.featureCollection,
      featureId,
      featureIndex: snapshotRef.value.featureIndexMap.get(featureId),
      newProperties,
      propertyPolicy,
      protectedKeys,
      featureMatcher: (feature, currentFeatureId) => {
        return matchesFeature(feature as MapCommonFeature, currentFeatureId);
      },
    });

    if (!result.success || !result.data || !result.properties) {
      return {
        success: false,
        target: 'map',
        featureId,
        message: result.message,
        blockedKeys: result.blockedKeys,
        removedKeys: result.removedKeys,
      };
    }

    commitSnapshot(buildNextSnapshotForLocalMutation(result.data as MapCommonFeatureCollection));

    return {
      success: true,
      target: 'map',
      featureId,
      properties: result.properties,
      message: result.message,
      blockedKeys: result.blockedKeys,
      removedKeys: result.removedKeys,
    };
  };

  /**
   * 按业务 ID 显式删除属性。
   * 删除同样复用与 panelState 相同的字段规则，只有最终判定为 removable 的字段才能删掉。
   *
   * @param featureId 目标业务 ID
   * @param propertyKeys 需要删除的属性键列表
   * @returns 结构化写回结果
   */
  const removeProperties = (
    featureId: MapFeatureId,
    propertyKeys: readonly string[]
  ): SaveFeaturePropertiesResult => {
    syncValidationLog();

    if (!snapshotRef.value.valid) {
      return {
        success: false,
        target: 'map',
        featureId,
        message: snapshotRef.value.validationMessage,
      };
    }

    const result = removeFeaturePropertiesInCollection({
      featureCollection: snapshotRef.value.featureCollection,
      featureId,
      featureIndex: snapshotRef.value.featureIndexMap.get(featureId),
      propertyKeys,
      propertyPolicy,
      protectedKeys,
      featureMatcher: (feature, currentFeatureId) => {
        return matchesFeature(feature as MapCommonFeature, currentFeatureId);
      },
    });

    if (!result.success || !result.data || !result.properties) {
      return {
        success: false,
        target: 'map',
        featureId,
        message: result.message,
        blockedKeys: result.blockedKeys,
        removedKeys: result.removedKeys,
      };
    }

    commitSnapshot(buildNextSnapshotForLocalMutation(result.data as MapCommonFeatureCollection));

    return {
      success: true,
      target: 'map',
      featureId,
      properties: result.properties,
      message: result.message,
      blockedKeys: result.blockedKeys,
      removedKeys: result.removedKeys,
    };
  };

  /**
   * 将业务 ID 归一化为标准来源引用。
   * @param featureId 目标业务 ID
   * @returns 标准来源引用
   */
  const toFeatureRef = (featureId: MapFeatureId | null): MapSourceFeatureRef | null => {
    return createMapSourceFeatureRef(sourceId, featureId);
  };

  return {
    sourceId,
    propertyPolicy,
    protectedPropertyKeys: protectedKeys,
    sourceProps,
    resolveFeature,
    resolvePropertyPanelState,
    replaceFeatures,
    saveProperties,
    removeProperties,
    toFeatureRef,
    matchesFeature,
  };
}

/**
 * 创建业务 source 注册表。
 * @param sources 当前页面需要统一管理的业务 source 列表
 * @returns 注册表门面
 */
export function createMapBusinessSourceRegistry(
  sources: MapBusinessSource[]
): MapBusinessSourceRegistry {
  const sourceMap = new Map<string, MapBusinessSource>();

  sources.forEach((source) => {
    if (sourceMap.has(source.sourceId)) {
      console.error(
        `[createMapBusinessSourceRegistry] 检测到重复 sourceId：${source.sourceId}，后续重复 source 将被忽略`
      );
      return;
    }

    sourceMap.set(source.sourceId, source);
  });

  /**
   * 读取指定 source。
   * @param sourceId 目标 source ID
   * @returns 命中的业务 source；找不到时返回 null
   */
  const getSource = (sourceId: string | null | undefined): MapBusinessSource | null => {
    if (!sourceId) {
      return null;
    }

    return sourceMap.get(sourceId) || null;
  };

  /**
   * 列出当前全部业务 source。
   * @returns 当前注册表中的 source 列表
   */
  const listSources = (): MapBusinessSource[] => {
    return [...sourceMap.values()];
  };

  /**
   * 按标准来源引用解析业务要素。
   * @param featureRef 目标来源引用
   * @returns 命中的要素；找不到时返回 null
   */
  const resolveFeature = (featureRef: MapSourceFeatureRef | null): MapCommonFeature | null => {
    if (!featureRef?.sourceId || featureRef.featureId === null) {
      return null;
    }

    return getSource(featureRef.sourceId)?.resolveFeature(featureRef.featureId) || null;
  };

  /**
   * 按标准来源引用解析属性面板态。
   * @param featureRef 目标来源引用
   * @returns 命中的属性面板态；找不到时返回 null
   */
  const resolveFeaturePropertyPanelState = (
    featureRef: MapSourceFeatureRef | null
  ): MapFeaturePropertyPanelState | null => {
    if (!featureRef?.sourceId || featureRef.featureId === null) {
      return null;
    }

    return getSource(featureRef.sourceId)?.resolvePropertyPanelState(featureRef.featureId) || null;
  };

  /**
   * 替换指定 source 的要素列表。
   * @param sourceId 目标 source ID
   * @param nextFeatures 最新要素数组
   * @returns 是否写回成功
   */
  const replaceFeatures = (sourceId: string, nextFeatures: MapCommonFeature[]): boolean => {
    return getSource(sourceId)?.replaceFeatures(nextFeatures) || false;
  };

  /**
   * 向指定 source 写回属性。
   * @param sourceId 目标 source ID
   * @param featureId 目标业务 ID
   * @param newProperties 最新属性对象
   * @returns 结构化写回结果
   */
  const saveProperties = (
    sourceId: string,
    featureId: MapFeatureId,
    newProperties: FeatureProperties
  ): SaveFeaturePropertiesResult => {
    const targetSource = getSource(sourceId);
    if (!targetSource) {
      return {
        success: false,
        target: 'map',
        featureId,
        message: `未找到 sourceId 为 '${sourceId}' 的业务数据源`,
      };
    }

    return targetSource.saveProperties(featureId, newProperties);
  };

  /**
   * 向指定 source 显式删除属性。
   * @param sourceId 目标 source ID
   * @param featureId 目标业务 ID
   * @param propertyKeys 需要删除的属性键列表
   * @returns 结构化写回结果
   */
  const removeProperties = (
    sourceId: string,
    featureId: MapFeatureId,
    propertyKeys: readonly string[]
  ): SaveFeaturePropertiesResult => {
    const targetSource = getSource(sourceId);
    if (!targetSource) {
      return {
        success: false,
        target: 'map',
        featureId,
        message: `未找到 sourceId 为 '${sourceId}' 的业务数据源`,
      };
    }

    return targetSource.removeProperties(featureId, propertyKeys);
  };

  /**
   * 统一创建标准来源引用。
   * @param sourceId 目标 source ID
   * @param featureId 目标业务 ID
   * @returns 标准来源引用
   */
  const createFeatureRef = (
    sourceId: string,
    featureId: MapFeatureId | null
  ): MapSourceFeatureRef | null => {
    return createMapSourceFeatureRef(sourceId, featureId);
  };

  return {
    getSource,
    listSources,
    resolveFeature,
    resolveFeaturePropertyPanelState,
    replaceFeatures,
    saveProperties,
    removeProperties,
    createFeatureRef,
  };
}
