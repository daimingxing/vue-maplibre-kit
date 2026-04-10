/**
 * 通用要素 ID 类型。
 */
export type MapFeatureDataId = string | number;

/**
 * 通用属性写回模式。
 */
export type MapFeatureDataSaveMode = 'replace' | 'merge';

/**
 * 通用属性对象类型。
 */
export type MapFeatureDataProperties = Record<string, any>;

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
  /** 属性写回模式。 */
  mode?: MapFeatureDataSaveMode;
  /** 自定义要素匹配器。 */
  featureMatcher?: MapFeatureDataMatcher;
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
 * 计算地图要素属性写回后的新属性集合。
 * @param currentProperties 当前属性对象
 * @param newProperties 最新属性对象
 * @param mode 写回模式
 * @returns 计算后的属性对象
 */
export function resolveNextFeatureProperties(
  currentProperties: MapFeatureDataProperties,
  newProperties: MapFeatureDataProperties,
  mode: MapFeatureDataSaveMode
): MapFeatureDataProperties {
  if (mode === 'merge') {
    return {
      ...currentProperties,
      ...newProperties,
    };
  }

  return clonePlainData(newProperties);
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
    ...clonePlainData(featureCollection),
    features: clonePlainData(nextFeatures),
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
    mode = 'replace',
  } = options;

  if (!featureCollection || !Array.isArray(featureCollection.features)) {
    return {
      success: false,
      message: '绑定的 GeoJSON 数据格式不正确',
    };
  }

  const invalidFeatureIndexes = collectInvalidGeoJsonFeatureIndexes(
    featureCollection.features
  );
  if (invalidFeatureIndexes.length > 0) {
    return {
      success: false,
      message:
        '绑定的 GeoJSON 数据格式不正确：features 中存在非 GeoJSON Feature 项（序号：' +
        invalidFeatureIndexes.map((index) => index + 1).join('、') +
        '）',
    };
  }

  const matcher = featureMatcher || createDefaultFeatureMatcher();
  const nextFeatures = clonePlainData(featureCollection.features);
  const featureIndex = nextFeatures.findIndex((feature: any) => {
    return matcher(feature, featureId);
  });

  if (featureIndex === -1) {
    return {
      success: false,
      message: `未在数据源中找到 ID 为 '${featureId}' 的要素`,
    };
  }

  // 先取出当前属性，再根据 replace / merge 语义生成最新属性快照。
  const currentProperties = clonePlainData(nextFeatures[featureIndex].properties || {});
  const nextProperties = resolveNextFeatureProperties(currentProperties, newProperties, mode);

  nextFeatures[featureIndex].properties = nextProperties;

  return {
    success: true,
    data: replaceFeatureCollectionFeatures(featureCollection, nextFeatures),
    properties: nextProperties,
    message: '地图要素属性写回成功',
  };
}
