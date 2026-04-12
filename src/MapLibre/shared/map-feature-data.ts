/**
 * 通用要素 ID 类型。
 */
export type MapFeatureDataId = string | number;

/**
 * 通用属性对象类型。
 */
export type MapFeatureDataProperties = Record<string, any>;

/**
 * 单个属性键的局部治理规则。
 */
export interface MapFeaturePropertyRule {
  /** 当前字段是否对业务面板可见。 */
  visible?: boolean;
  /** 当前字段是否允许业务层修改。 */
  editable?: boolean;
  /** 当前字段是否允许业务层删除。 */
  removable?: boolean;
}

/**
 * 地图要素属性治理配置。
 */
export interface MapFeaturePropertyPolicy {
  /** 表内稳定字段：默认可见、可改、不可删。 */
  fixedKeys?: readonly string[];
  /** 业务层不应看到的字段。 */
  hiddenKeys?: readonly string[];
  /** 只读字段：默认可见、不可改、不可删。 */
  readonlyKeys?: readonly string[];
  /** 允许删除的稳定字段。 */
  removableKeys?: readonly string[];
  /** 单键级别的细粒度覆写规则。 */
  rules?: Record<string, MapFeaturePropertyRule>;
}

/**
 * 属性面板单行描述。
 */
export interface MapFeaturePropertyPanelItem {
  /** 当前属性键。 */
  key: string;
  /** 当前属性值。 */
  value: any;
  /** 当前属性是否允许编辑。 */
  editable: boolean;
  /** 当前属性是否允许删除。 */
  removable: boolean;
  /** 当前属性是否为运行时临时字段。 */
  temporary: boolean;
}

/**
 * 业务层属性面板态。
 */
export interface MapFeaturePropertyPanelState {
  /** 已过滤后的可见属性对象。 */
  properties: MapFeatureDataProperties;
  /** 适合直接渲染表格的属性行列表。 */
  items: MapFeaturePropertyPanelItem[];
}

/**
 * 通用要素匹配函数。
 * @param feature 当前遍历到的要素
 * @param featureId 目标要素 ID
 * @returns 当前要素是否命中目标
 */
export type MapFeatureDataMatcher<TFeature = any> = (
  feature: TFeature,
  featureId: MapFeatureDataId
) => boolean;

/**
 * 集合内属性写回配置。
 */
export interface SaveFeaturePropertiesInCollectionOptions<
  TCollection extends { features?: any[] } = { features?: any[] },
> {
  /** 当前完整要素集合。 */
  featureCollection: TCollection;
  /** 目标要素 ID。 */
  featureId: MapFeatureDataId;
  /** 最新属性对象。 */
  newProperties: MapFeatureDataProperties;
  /** 自定义要素匹配器。 */
  featureMatcher?: MapFeatureDataMatcher;
  /** 已知的要素下标，可跳过查找。 */
  featureIndex?: number;
  /** 当前要素的业务属性治理配置。 */
  propertyPolicy?: MapFeaturePropertyPolicy | null;
  /** 强保护但仍可见的字段列表。 */
  protectedKeys?: readonly string[];
  /** 强保护且默认隐藏的字段列表。 */
  hiddenKeys?: readonly string[];
}

/**
 * 集合内删除属性配置。
 */
export interface RemoveFeaturePropertiesInCollectionOptions<
  TCollection extends { features?: any[] } = { features?: any[] },
> {
  /** 当前完整要素集合。 */
  featureCollection: TCollection;
  /** 目标要素 ID。 */
  featureId: MapFeatureDataId;
  /** 需要删除的属性键列表。 */
  propertyKeys: readonly string[];
  /** 自定义要素匹配器。 */
  featureMatcher?: MapFeatureDataMatcher;
  /** 已知的要素下标，可跳过查找。 */
  featureIndex?: number;
  /** 当前要素的业务属性治理配置。 */
  propertyPolicy?: MapFeaturePropertyPolicy | null;
  /** 强保护但仍可见的字段列表。 */
  protectedKeys?: readonly string[];
  /** 强保护且默认隐藏的字段列表。 */
  hiddenKeys?: readonly string[];
}

/**
 * 集合内属性写回结果。
 */
export interface SaveFeaturePropertiesInCollectionResult<
  TCollection extends { features?: any[] } = { features?: any[] },
> {
  /** 当前写回是否成功。 */
  success: boolean;
  /** 最新集合快照。 */
  data?: TCollection;
  /** 最新属性对象。 */
  properties?: MapFeatureDataProperties;
  /** 被阻止处理的属性键。 */
  blockedKeys?: string[];
  /** 本次显式删除成功的属性键。 */
  removedKeys?: string[];
  /** 结果说明。 */
  message: string;
}

interface ResolveFeaturePropertyAccessOptions {
  /** 属性治理配置。 */
  propertyPolicy?: MapFeaturePropertyPolicy | null;
  /** 强保护但仍可见的字段列表。 */
  protectedKeys?: readonly string[];
  /** 强保护且默认隐藏的字段列表。 */
  hiddenKeys?: readonly string[];
}

interface FeaturePropertyAccess {
  /** 当前字段是否可见。 */
  visible: boolean;
  /** 当前字段是否可编辑。 */
  editable: boolean;
  /** 当前字段是否可删除。 */
  removable: boolean;
  /** 当前字段是否为临时字段。 */
  temporary: boolean;
}

interface MutateFeaturePropertiesBaseOptions extends ResolveFeaturePropertyAccessOptions {
  /** 当前属性对象。 */
  currentProperties: MapFeatureDataProperties;
}

interface MutateFeaturePropertiesOptions extends MutateFeaturePropertiesBaseOptions {
  /** 最新属性对象。 */
  newProperties: MapFeatureDataProperties;
}

interface RemoveFeaturePropertiesOptions extends MutateFeaturePropertiesBaseOptions {
  /** 需要删除的属性键列表。 */
  propertyKeys: readonly string[];
}

interface MutateFeaturePropertiesResult {
  /** 当前操作是否成功。 */
  success: boolean;
  /** 最新属性对象。 */
  properties?: MapFeatureDataProperties;
  /** 被忽略的字段列表。 */
  blockedKeys: string[];
  /** 成功删除的字段列表。 */
  removedKeys: string[];
  /** 结果说明。 */
  message: string;
}

/**
 * 对普通对象做深拷贝。
 * @param value 待克隆的值
 * @returns 深拷贝后的新值
 */
export function clonePlainData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 清理属性对象中的 undefined 字段。
 * @param properties 待清理属性对象
 * @returns 清理后的属性对象
 */
export function cleanUndefinedProperties(
  properties: MapFeatureDataProperties
): MapFeatureDataProperties {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

/**
 * 生成缺省要素匹配器。
 * 默认优先匹配顶层 id，其次匹配 properties.id。
 * @returns 通用匹配器
 */
export function createDefaultFeatureMatcher(): MapFeatureDataMatcher {
  return (feature: any, featureId: MapFeatureDataId) => {
    return feature?.id === featureId || feature?.properties?.id === featureId;
  };
}

/**
 * 生成适合业务层直接消费的属性面板态。
 * @param properties 原始属性对象
 * @param options 面板态解析配置
 * @returns 过滤后的属性面板态
 */
export function resolveMapFeaturePropertyPanelState(
  properties: MapFeatureDataProperties,
  options: ResolveFeaturePropertyAccessOptions = {}
): MapFeaturePropertyPanelState {
  const nextProperties: MapFeatureDataProperties = {};
  const items: MapFeaturePropertyPanelItem[] = [];
  const propertyEntries = Object.entries(properties || {});

  propertyEntries.forEach(([key, rawValue]) => {
    const access = resolveFeaturePropertyAccess(key, options);
    if (!access.visible) {
      return;
    }

    // 只克隆最终需要暴露给业务层的值，避免先深拷贝整份属性对象造成额外分配。
    const value =
      rawValue !== null && typeof rawValue === 'object' ? clonePlainData(rawValue) : rawValue;
    nextProperties[key] = value;
    items.push({
      key,
      value,
      editable: access.editable,
      removable: access.removable,
      temporary: access.temporary,
    });
  });

  return {
    properties: nextProperties,
    items,
  };
}

/**
 * 用最新的 features 替换整个要素集合中的要素数组。
 * @param featureCollection 当前完整要素集合
 * @param nextFeatures 最新要素数组
 * @returns 替换后的新集合
 */
export function replaceFeatureCollectionFeatures<
  TCollection extends { features?: any[] } = { features?: any[] },
>(featureCollection: TCollection, nextFeatures: any[]): TCollection {
  return {
    ...featureCollection,
    // 这里只保证集合对象与 features 数组引用都是新的，
    // 让“整体替换”保持不可变语义，同时避免逐条深拷贝带来的额外成本。
    features: Array.isArray(nextFeatures) ? nextFeatures.slice() : [],
  };
}

/**
 * 判断当前值是否为可接受的对象类型。
 * 这里显式排除数组，避免把数组误判为 GeoJSON Feature / geometry / properties。
 * @param value 待判断的值
 * @returns 是否为普通对象或 null
 */
function isObjectLike(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 判断单条数据是否符合最基础的 GeoJSON Feature 结构。
 * 当前采用“轻校验”策略：
 * 1. 必须是对象
 * 2. 必须显式包含 geometry 与 properties 字段
 * 3. geometry 允许为对象或 null
 * 4. properties 允许为对象或 null
 * @param feature 待判断的单条要素数据
 * @returns 是否满足最基础的 GeoJSON Feature 结构
 */
function isValidGeoJsonFeature(feature: unknown): boolean {
  if (!isObjectLike(feature)) {
    return false;
  }

  if (!('geometry' in feature) || !('properties' in feature)) {
    return false;
  }

  const geometry = feature.geometry;
  const properties = feature.properties;
  const isGeometryValid = geometry === null || isObjectLike(geometry);
  const isPropertiesValid = properties === null || isObjectLike(properties);

  return isGeometryValid && isPropertiesValid;
}

/**
 * 收集当前 features 数组中不合法的要素下标。
 * @param features 当前待校验的要素数组
 * @returns 不合法要素的下标列表
 */
function collectInvalidGeoJsonFeatureIndexes(features: unknown[]): number[] {
  const invalidIndexes: number[] = [];

  features.forEach((feature, index) => {
    if (!isValidGeoJsonFeature(feature)) {
      invalidIndexes.push(index);
    }
  });

  return invalidIndexes;
}

/**
 * 创建字符串集合，统一去除空键值。
 * @param keys 原始键列表
 * @returns 干净的键集合
 */
function createKeySet(keys?: readonly string[] | null): Set<string> {
  return new Set((keys || []).filter((key) => typeof key === 'string' && key.trim() !== ''));
}

/**
 * 判断当前属性键是否被业务策略显式声明。
 * @param key 当前属性键
 * @param policy 当前治理策略
 * @returns 是否为显式声明字段
 */
function isDeclaredPolicyKey(key: string, policy?: MapFeaturePropertyPolicy | null): boolean {
  if (!policy) {
    return false;
  }

  if (
    policy.fixedKeys?.includes(key) ||
    policy.hiddenKeys?.includes(key) ||
    policy.readonlyKeys?.includes(key) ||
    policy.removableKeys?.includes(key)
  ) {
    return true;
  }

  return Boolean(policy.rules && key in policy.rules);
}

/**
 * 解析单个属性键的业务访问权限。
 * @param key 当前属性键
 * @param options 权限解析配置
 * @returns 当前属性键的访问权限
 */
function resolveFeaturePropertyAccess(
  key: string,
  options: ResolveFeaturePropertyAccessOptions
): FeaturePropertyAccess {
  const { propertyPolicy, protectedKeys, hiddenKeys } = options;
  const protectedKeySet = createKeySet(protectedKeys);
  const hiddenKeySet = createKeySet(hiddenKeys);

  // 强隐藏规则优先级最高，业务配置不能放开。
  if (hiddenKeySet.has(key)) {
    return {
      visible: false,
      editable: false,
      removable: false,
      temporary: false,
    };
  }

  // 强保护规则次高：仍可见，但不可编辑、不可删除。
  if (protectedKeySet.has(key)) {
    return {
      visible: true,
      editable: false,
      removable: false,
      temporary: false,
    };
  }

  const hiddenPolicySet = createKeySet(propertyPolicy?.hiddenKeys);
  const readonlyPolicySet = createKeySet(propertyPolicy?.readonlyKeys);
  const fixedPolicySet = createKeySet(propertyPolicy?.fixedKeys);
  const removablePolicySet = createKeySet(propertyPolicy?.removableKeys);
  const declared = isDeclaredPolicyKey(key, propertyPolicy);
  const rule = propertyPolicy?.rules?.[key];
  let visible = true;
  let editable = true;
  let removable = true;
  let temporary = !declared;

  if (hiddenPolicySet.has(key)) {
    visible = false;
    editable = false;
    removable = false;
    temporary = false;
  } else if (readonlyPolicySet.has(key)) {
    visible = true;
    editable = false;
    removable = false;
    temporary = false;
  } else if (fixedPolicySet.has(key)) {
    visible = true;
    editable = true;
    removable = removablePolicySet.has(key);
    temporary = false;
  }

  // 单键规则覆盖集合规则，但仍不能突破强隐藏/强保护约束。
  if (rule) {
    if (rule.visible !== undefined) {
      visible = rule.visible;
    }
    if (rule.editable !== undefined) {
      editable = rule.editable;
    }
    if (rule.removable !== undefined) {
      removable = rule.removable;
    }
    temporary = false;
  }

  if (!visible) {
    editable = false;
    removable = false;
  }

  return {
    visible,
    editable,
    removable,
    temporary,
  };
}

/**
 * 按治理规则执行属性写回。
 * 这里只负责显式增改：
 * 1. 只处理本次传入的字段
 * 2. 只写入允许编辑的字段
 * 3. 不会隐式删掉旧字段
 * 4. 删除字段必须显式走 `removeFeatureProperties`
 *
 * @param options 写回配置
 * @returns 治理后的写回结果
 */
function mutateFeatureProperties(
  options: MutateFeaturePropertiesOptions
): MutateFeaturePropertiesResult {
  const {
    currentProperties,
    newProperties,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
  } = options;
  const nextProperties = clonePlainData(currentProperties || {});
  const nextEntries = Object.entries(cleanUndefinedProperties(clonePlainData(newProperties || {})));
  const blockedKeys: string[] = [];

  if (nextEntries.length === 0) {
    return {
      success: false,
      blockedKeys,
      removedKeys: [],
      message: '没有可写回的属性变更',
    };
  }

  nextEntries.forEach(([key, value]) => {
    const access = resolveFeaturePropertyAccess(key, {
      propertyPolicy,
      protectedKeys,
      hiddenKeys,
    });

    if (!access.editable) {
      blockedKeys.push(key);
      return;
    }

    nextProperties[key] = value;
  });

  const changedKeys = nextEntries
    .map(([key]) => key)
    .filter((key) => !blockedKeys.includes(key));

  if (changedKeys.length === 0) {
    return {
      success: false,
      blockedKeys,
      removedKeys: [],
      message: `以下字段不允许修改：${blockedKeys.join('、')}`,
    };
  }

  return {
    success: true,
    properties: nextProperties,
    blockedKeys,
    removedKeys: [],
    message:
      blockedKeys.length > 0
        ? `已保存允许修改的属性，以下字段已忽略：${blockedKeys.join('、')}`
        : '属性保存成功',
  };
}

/**
 * 按治理规则执行显式删键。
 * @param options 删除配置
 * @returns 治理后的删除结果
 */
function removeFeatureProperties(
  options: RemoveFeaturePropertiesOptions
): MutateFeaturePropertiesResult {
  const { currentProperties, propertyKeys, propertyPolicy, protectedKeys, hiddenKeys } = options;
  const nextProperties = clonePlainData(currentProperties || {});
  const blockedKeys: string[] = [];
  const removedKeys: string[] = [];
  const uniqueKeys = [...new Set((propertyKeys || []).filter(Boolean))];

  if (uniqueKeys.length === 0) {
    return {
      success: false,
      blockedKeys,
      removedKeys,
      message: '没有可删除的属性键',
    };
  }

  uniqueKeys.forEach((key) => {
    const access = resolveFeaturePropertyAccess(key, {
      propertyPolicy,
      protectedKeys,
      hiddenKeys,
    });

    if (!access.removable) {
      blockedKeys.push(key);
      return;
    }

    if (!(key in nextProperties)) {
      return;
    }

    delete nextProperties[key];
    removedKeys.push(key);
  });

  if (removedKeys.length === 0) {
    return {
      success: false,
      blockedKeys,
      removedKeys,
      message:
        blockedKeys.length > 0
          ? `以下字段不允许删除：${blockedKeys.join('、')}`
          : '未命中任何可删除的属性键',
    };
  }

  return {
    success: true,
    properties: nextProperties,
    blockedKeys,
    removedKeys,
    message:
      blockedKeys.length > 0
        ? `已删除允许删除的属性，以下字段已忽略：${blockedKeys.join('、')}`
        : '属性删除成功',
  };
}

/**
 * 在完整要素集合中定位目标要素下标。
 * @param features 当前要素数组
 * @param featureId 目标要素 ID
 * @param featureMatcher 自定义匹配器
 * @param featureIndex 已知下标
 * @returns 命中的要素下标；未命中时返回 -1
 */
function resolveFeatureIndex(
  features: any[],
  featureId: MapFeatureDataId,
  featureMatcher?: MapFeatureDataMatcher,
  featureIndex?: number
): number {
  if (
    featureIndex !== undefined &&
    Number.isInteger(featureIndex) &&
    featureIndex >= 0 &&
    featureIndex < features.length
  ) {
    return featureIndex;
  }

  const matcher = featureMatcher || createDefaultFeatureMatcher();
  return features.findIndex((feature: any) => {
    return matcher(feature, featureId);
  });
}

/**
 * 创建带有单要素增量替换的新集合。
 * @param featureCollection 原始集合
 * @param featureIndex 目标要素下标
 * @param nextProperties 最新属性对象
 * @returns 仅替换目标要素的新集合
 */
function replaceSingleFeaturePropertiesInCollection<
  TCollection extends { features?: any[] } = { features?: any[] },
>(
  featureCollection: TCollection,
  featureIndex: number,
  nextProperties: MapFeatureDataProperties
): TCollection {
  const currentFeatures = Array.isArray(featureCollection.features) ? featureCollection.features : [];
  const nextFeatures = currentFeatures.slice();
  const currentFeature = currentFeatures[featureIndex] || {};
  nextFeatures[featureIndex] = {
    ...currentFeature,
    properties: clonePlainData(nextProperties),
  };

  return {
    ...featureCollection,
    features: nextFeatures,
  };
}

/**
 * 在完整要素集合中按稳定 ID 写回属性。
 * @param options 写回配置
 * @returns 结构化写回结果
 */
export function saveFeaturePropertiesInCollection<
  TCollection extends { features?: any[] } = { features?: any[] },
>(
  options: SaveFeaturePropertiesInCollectionOptions<TCollection>
): SaveFeaturePropertiesInCollectionResult<TCollection> {
  const {
    featureCollection,
    featureId,
    newProperties,
    featureMatcher,
    featureIndex,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
  } = options;

  if (!featureCollection || !Array.isArray(featureCollection.features)) {
    return {
      success: false,
      blockedKeys: [],
      removedKeys: [],
      message: '绑定的 GeoJSON 数据格式不正确',
    };
  }

  const invalidFeatureIndexes = collectInvalidGeoJsonFeatureIndexes(featureCollection.features);
  if (invalidFeatureIndexes.length > 0) {
    return {
      success: false,
      blockedKeys: [],
      removedKeys: [],
      message:
        '绑定的 GeoJSON 数据格式不正确：features 中存在非 GeoJSON Feature 项（序号：' +
        invalidFeatureIndexes.map((index) => index + 1).join('、') +
        '）',
    };
  }

  const targetFeatureIndex = resolveFeatureIndex(
    featureCollection.features,
    featureId,
    featureMatcher,
    featureIndex
  );

  if (targetFeatureIndex === -1) {
    return {
      success: false,
      blockedKeys: [],
      removedKeys: [],
      message: `未在数据源中找到 ID 为 '${featureId}' 的要素`,
    };
  }

  const currentFeature = featureCollection.features[targetFeatureIndex] || {};
  const result = mutateFeatureProperties({
    currentProperties: clonePlainData(currentFeature.properties || {}),
    newProperties,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
  });

  if (!result.success || !result.properties) {
    return {
      success: false,
      blockedKeys: result.blockedKeys,
      removedKeys: result.removedKeys,
      message: result.message,
    };
  }

  return {
    success: true,
    data: replaceSingleFeaturePropertiesInCollection(
      featureCollection,
      targetFeatureIndex,
      result.properties
    ),
    properties: result.properties,
    blockedKeys: result.blockedKeys,
    removedKeys: result.removedKeys,
    message: result.message,
  };
}

/**
 * 在完整要素集合中按稳定 ID 显式删除属性。
 * @param options 删除配置
 * @returns 结构化删除结果
 */
export function removeFeaturePropertiesInCollection<
  TCollection extends { features?: any[] } = { features?: any[] },
>(
  options: RemoveFeaturePropertiesInCollectionOptions<TCollection>
): SaveFeaturePropertiesInCollectionResult<TCollection> {
  const {
    featureCollection,
    featureId,
    propertyKeys,
    featureMatcher,
    featureIndex,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
  } = options;

  if (!featureCollection || !Array.isArray(featureCollection.features)) {
    return {
      success: false,
      blockedKeys: [],
      removedKeys: [],
      message: '绑定的 GeoJSON 数据格式不正确',
    };
  }

  const invalidFeatureIndexes = collectInvalidGeoJsonFeatureIndexes(featureCollection.features);
  if (invalidFeatureIndexes.length > 0) {
    return {
      success: false,
      blockedKeys: [],
      removedKeys: [],
      message:
        '绑定的 GeoJSON 数据格式不正确：features 中存在非 GeoJSON Feature 项（序号：' +
        invalidFeatureIndexes.map((index) => index + 1).join('、') +
        '）',
    };
  }

  const targetFeatureIndex = resolveFeatureIndex(
    featureCollection.features,
    featureId,
    featureMatcher,
    featureIndex
  );

  if (targetFeatureIndex === -1) {
    return {
      success: false,
      blockedKeys: [],
      removedKeys: [],
      message: `未在数据源中找到 ID 为 '${featureId}' 的要素`,
    };
  }

  const currentFeature = featureCollection.features[targetFeatureIndex] || {};
  const result = removeFeatureProperties({
    currentProperties: clonePlainData(currentFeature.properties || {}),
    propertyKeys,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
  });

  if (!result.success || !result.properties) {
    return {
      success: false,
      blockedKeys: result.blockedKeys,
      removedKeys: result.removedKeys,
      message: result.message,
    };
  }

  return {
    success: true,
    data: replaceSingleFeaturePropertiesInCollection(
      featureCollection,
      targetFeatureIndex,
      result.properties
    ),
    properties: result.properties,
    blockedKeys: result.blockedKeys,
    removedKeys: result.removedKeys,
    message: result.message,
  };
}
