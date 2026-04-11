import type { GeoJSONSource } from 'maplibre-gl';
import type { TerraDraw } from 'terra-draw';
import type { Ref } from 'vue';
import type { MapInstance } from 'vue-maplibre-gl';
import {
  cleanUndefinedProperties,
  clonePlainData,
  removeFeaturePropertiesInCollection,
  saveFeaturePropertiesInCollection,
  type MapFeatureDataId as MapFeatureId,
  type MapFeatureDataProperties as FeatureProperties,
  type MapFeatureDataSaveMode as FeaturePropertySaveMode,
  type MapFeaturePropertyPolicy,
} from '../shared/map-feature-data';

export type { MapFeatureId, FeatureProperties, FeaturePropertySaveMode, MapFeaturePropertyPolicy };

/**
 * TerraDraw 内部保留属性名集合。
 *
 * 【是什么】
 * TerraDraw 在进行图形绘制和编辑时，会在要素的 properties 中写入大量状态字段（如当前模式、是否正在绘制、捕捉点等）。
 * 这些字段是引擎正常运行的基础。
 *
 * 【干嘛用的】
 * 当业务层想要更新或替换 TerraDraw 要素的业务属性时，如果直接全量替换（replace），
 * 可能会不小心删掉这些底层保留字段，导致 TerraDraw 内部状态崩溃或报错。
 * 因此提供此列表，用于在执行属性更新或删除时，过滤并保护这些字段不被业务操作覆盖或删除。
 */
export const TERRADRAW_RESERVED_PROPERTY_KEYS = [
  'mode',
  'currentlyDrawing',
  'edited',
  'closingPoint',
  'snappingPoint',
  'coordinatePoint',
  'coordinatePointFeatureId',
  'coordinatePointIds',
  'provisionalCoordinateCount',
  'committedCoordinateCount',
  'marker',
  'selected',
  'midPoint',
  'selectionPointFeatureId',
  'selectionPoint',
] as const;

/**
 * Measure 控件默认会补充的系统测量字段。
 * 这些字段主要服务于测量结果展示和引擎内部逻辑，业务面板默认应隐藏。
 */
export const TERRADRAW_MEASURE_SYSTEM_PROPERTY_KEYS = [
  'distance',
  'distanceUnit',
  'unit',
  'segments',
  'area',
  'radiusKilometers',
  'elevation',
  'elevationUnit',
] as const;

/**
 * 通用属性写回结果。
 */
export interface SaveFeaturePropertiesResult {
  success: boolean;
  target: 'map' | 'terradraw';
  featureId: MapFeatureId;
  properties?: FeatureProperties;
  message: string;
  blockedKeys?: string[];
  removedKeys?: string[];
  removedReservedKeys?: string[];
}

interface BaseSaveFeaturePropertiesOptions {
  /**
   * 需要更新的目标要素唯一标识
   */
  featureId: MapFeatureId;
  /**
   * 最新要写回的属性对象
   */
  newProperties: FeatureProperties;
  /**
   * 属性写回模式：
   * 1. replace: 仅覆盖本次传入且允许编辑的业务字段，不会因为缺少某个键就自动删掉旧字段
   * 2. merge: 显式表达局部合并语义，当前阶段同样只覆盖本次传入且允许编辑的字段
   * 3. 如果需要删除字段，必须显式调用 removeProperties 对应链路
   * @default 'replace'
   */
  mode?: FeaturePropertySaveMode;
  /**
   * 业务层属性治理配置，用于控制字段的可见性、可编辑性和可删除性。
   *
   * 常见场景：
   * 1. 正式业务源把 `id`、`name` 这类表内字段声明为稳定字段
   * 2. 把 `internal`、`debugFlag` 这类系统或调试字段隐藏出业务面板
   * 3. 让业务层统一复用同一套字段治理规则，而不是每个页面自己过滤
   *
   * @example
   * {
   *   fixedKeys: ['id', 'name'],
   *   hiddenKeys: ['internal'],
   *   readonlyKeys: ['bizCode']
   * }
   */
  propertyPolicy?: MapFeaturePropertyPolicy | null;
  /**
   * 强保护但仍可见的字段列表。
   *
   * 这些字段优先级高于业务层 `propertyPolicy`，通常用于保护：
   * 1. `promoteId` / `featureIdKey` 对应的业务主键
   * 2. 不允许业务层编辑或删除、但仍希望在面板中可见的系统字段
   *
   * @example ['id', 'sourceFeatureId']
   */
  protectedKeys?: readonly string[];
  /**
   * 强保护且默认隐藏的字段列表。
   *
   * 这些字段不会暴露给业务面板，也不允许写回或删除。
   * 常见于 TerraDraw / Measure / 线草稿的内部状态字段。
   *
   * @example ['distance', 'segments', 'managedPreviewOriginSourceId']
   */
  hiddenKeys?: readonly string[];
}

interface BaseRemoveFeaturePropertiesOptions {
  /**
   * 需要更新的目标要素唯一标识
   */
  featureId: MapFeatureId;
  /**
   * 需要删除的属性键列表
   */
  propertyKeys: readonly string[];
  /**
   * 业务层属性治理配置，用于控制字段的可见性、可编辑性和可删除性。
   *
   * 这里与保存接口保持一致，保证“能否删除”与“能否编辑/可见”使用同一套规则来源。
   *
   * @example
   * {
   *   fixedKeys: ['id', 'name'],
   *   hiddenKeys: ['internal'],
   *   readonlyKeys: ['bizCode']
   * }
   */
  propertyPolicy?: MapFeaturePropertyPolicy | null;
  /**
   * 强保护但仍可见的字段列表。
   *
   * 这些字段不会被删除，通常用于业务主键或必须保留的系统字段。
   *
   * @example ['id', 'sourceFeatureId']
   */
  protectedKeys?: readonly string[];
  /**
   * 强保护且默认隐藏的字段列表。
   *
   * 这些字段不会进入业务删除能力，常用于引擎内部属性或托管来源字段。
   *
   * @example ['distance', 'segments', 'managedPreviewOriginSourceId']
   */
  hiddenKeys?: readonly string[];
}

export interface SaveMapFeaturePropertiesOptions extends BaseSaveFeaturePropertiesOptions {
  /**
   * 地图实例对象
   */
  mapInstance: MapInstance;
  /**
   * 需要更新的数据源 ID
   */
  sourceId: string;
  /**
   * 绑定的 Vue 响应式 GeoJSON 数据引用，用于同步更新状态
   */
  geoJsonRef: Ref<any>;
  /**
   * 自定义要素匹配器；不传时默认匹配顶层 id 或 properties.id
   */
  featureMatcher?: (feature: any, featureId: MapFeatureId) => boolean;
}

export interface RemoveMapFeaturePropertiesOptions extends BaseRemoveFeaturePropertiesOptions {
  /**
   * 地图实例对象
   */
  mapInstance: MapInstance;
  /**
   * 需要更新的数据源 ID
   */
  sourceId: string;
  /**
   * 绑定的 Vue 响应式 GeoJSON 数据引用，用于同步更新状态
   */
  geoJsonRef: Ref<any>;
  /**
   * 自定义要素匹配器；不传时默认匹配顶层 id 或 properties.id
   */
  featureMatcher?: (feature: any, featureId: MapFeatureId) => boolean;
}

export interface SaveTerradrawFeaturePropertiesOptions extends BaseSaveFeaturePropertiesOptions {
  /**
   * TerraDraw 实例
   */
  terradraw: Pick<TerraDraw, 'hasFeature' | 'updateFeatureProperties' | 'getSnapshotFeature'>;
  /**
   * 当前页面已持有的属性快照；不传时会尝试从 TerraDraw 当前快照读取
   */
  currentProperties?: FeatureProperties;
  /**
   * 需要过滤掉的 TerraDraw 保留属性；默认使用内置保留字段列表
   */
  reservedPropertyKeys?: readonly string[];
}

export interface RemoveTerradrawFeaturePropertiesOptions extends BaseRemoveFeaturePropertiesOptions {
  /**
   * TerraDraw 实例
   */
  terradraw: Pick<TerraDraw, 'hasFeature' | 'updateFeatureProperties' | 'getSnapshotFeature'>;
  /**
   * 当前页面已持有的属性快照；不传时会尝试从 TerraDraw 当前快照读取
   */
  currentProperties?: FeatureProperties;
  /**
   * 需要过滤掉的 TerraDraw 保留属性；默认使用内置保留字段列表
   */
  reservedPropertyKeys?: readonly string[];
}

export type SaveFeaturePropertiesOptions =
  | ({ target: 'map' } & SaveMapFeaturePropertiesOptions)
  | ({ target: 'terradraw' } & SaveTerradrawFeaturePropertiesOptions);

/**
 * 兼容旧版命名：仅针对普通 GeoJSON source 的属性更新。
 */
export type UpdateFeaturePropertyOptions = SaveMapFeaturePropertiesOptions;

/**
 * 兼容 TerraDraw 旧版保留键过滤能力。
 * @param properties 待写回属性对象
 * @param reservedPropertyKeys TerraDraw 保留字段列表
 * @returns 清洗后的属性对象以及被拦截的保留字段
 */
export function omitTerradrawReservedProperties(
  properties: FeatureProperties,
  reservedPropertyKeys: readonly string[] = TERRADRAW_RESERVED_PROPERTY_KEYS
): {
  sanitizedProperties: FeatureProperties;
  removedReservedKeys: string[];
} {
  const reservedKeySet = new Set(reservedPropertyKeys);
  const removedReservedKeys: string[] = [];

  const sanitizedProperties = Object.fromEntries(
    Object.entries(properties).filter(([key]) => {
      if (reservedKeySet.has(key)) {
        removedReservedKeys.push(key);
        return false;
      }

      return true;
    })
  );

  return {
    sanitizedProperties,
    removedReservedKeys,
  };
}

/**
 * 创建统一的失败结果。
 * @param target 当前操作目标
 * @param featureId 当前目标要素 ID
 * @param message 失败原因
 * @param blockedKeys 被阻止的字段列表
 * @param removedKeys 已删除的字段列表
 * @returns 结构化失败结果
 */
function createFailureResult(
  target: 'map' | 'terradraw',
  featureId: MapFeatureId,
  message: string,
  blockedKeys: string[] = [],
  removedKeys: string[] = []
): SaveFeaturePropertiesResult {
  return {
    success: false,
    target,
    featureId,
    message,
    blockedKeys,
    removedKeys,
  };
}

/**
 * 创建统一的成功结果。
 * @param target 当前操作目标
 * @param featureId 当前目标要素 ID
 * @param properties 最新属性对象
 * @param message 成功说明
 * @param blockedKeys 被阻止的字段列表
 * @param removedKeys 已删除的字段列表
 * @param removedReservedKeys 被保留字段列表
 * @returns 结构化成功结果
 */
function createSuccessResult(
  target: 'map' | 'terradraw',
  featureId: MapFeatureId,
  properties: FeatureProperties,
  message: string,
  blockedKeys: string[] = [],
  removedKeys: string[] = [],
  removedReservedKeys: string[] = []
): SaveFeaturePropertiesResult {
  return {
    success: true,
    target,
    featureId,
    properties,
    message,
    blockedKeys,
    removedKeys,
    removedReservedKeys,
  };
}

/**
 * 合并多个字符串数组并去重。
 * @param groups 原始字符串数组组
 * @returns 去重后的字符串列表
 */
function mergeKeyGroups(...groups: Array<readonly string[] | undefined>): string[] {
  return [...new Set(groups.flatMap((group) => [...(group || [])]))];
}

/**
 * 构造一个仅用于属性治理计算的伪 FeatureCollection。
 * @param currentProperties 当前属性对象
 * @returns 单要素集合
 */
function createPropertyOnlyCollection(currentProperties: FeatureProperties) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: null,
        properties: clonePlainData(currentProperties),
      },
    ],
  };
}

/**
 * 计算 TerraDraw updateFeatureProperties 所需的最小 patch。
 * @param currentProperties 当前属性对象
 * @param nextProperties 最新属性对象
 * @param reservedPropertyKeys TerraDraw 保留字段列表
 * @returns 最小 patch 对象
 */
function buildTerradrawPropertyPatch(
  currentProperties: FeatureProperties,
  nextProperties: FeatureProperties,
  reservedPropertyKeys: readonly string[] = []
): FeatureProperties {
  const patch: FeatureProperties = {};
  const reservedKeySet = new Set(reservedPropertyKeys);
  const keySet = new Set([
    ...Object.keys(currentProperties || {}),
    ...Object.keys(nextProperties || {}),
  ]);

  keySet.forEach((key) => {
    // TerraDraw 保留字段只允许由引擎自身维护，这里额外做一层防御性保护。
    if (reservedKeySet.has(key)) {
      return;
    }

    const hasCurrent = key in (currentProperties || {});
    const hasNext = key in (nextProperties || {});

    if (!hasNext && hasCurrent) {
      patch[key] = undefined;
      return;
    }

    if (!hasNext) {
      return;
    }

    const currentValue = currentProperties?.[key];
    const nextValue = nextProperties?.[key];

    if (JSON.stringify(currentValue) !== JSON.stringify(nextValue)) {
      patch[key] = nextValue;
    }
  });

  return patch;
}

/**
 * 读取 TerraDraw 当前属性快照。
 * @param terradraw TerraDraw 实例
 * @param featureId 目标要素 ID
 * @param currentProperties 当前页面已有快照
 * @returns 标准化后的属性对象
 */
function getTerradrawCurrentProperties(
  terradraw: Pick<TerraDraw, 'getSnapshotFeature'>,
  featureId: MapFeatureId,
  currentProperties?: FeatureProperties
): FeatureProperties {
  return clonePlainData(currentProperties || terradraw.getSnapshotFeature(featureId)?.properties || {});
}

/**
 * 读取普通 GeoJSON source 对象。
 * @param mapInstance 地图实例
 * @param sourceId 数据源 ID
 * @returns GeoJSON source
 */
function getGeoJsonSource(mapInstance: MapInstance, sourceId: string): GeoJSONSource | null {
  if (!mapInstance.map || !mapInstance.isLoaded) {
    return null;
  }

  return (mapInstance.map.getSource(sourceId) as GeoJSONSource) || null;
}

/**
 * 保存普通 GeoJSON source 要素属性。
 *
 * 机制：定位目标要素 -> 计算治理后的属性结果 -> setData() 更新引擎 -> 同步 Vue 状态。
 * 该方法只替换目标 feature 与外层集合引用，不再重建整份要素内容。
 *
 * @param options 更新配置项
 * @returns 结构化保存结果
 */
export function saveMapFeatureProperties(
  options: SaveMapFeaturePropertiesOptions
): SaveFeaturePropertiesResult {
  const {
    mapInstance,
    sourceId,
    featureId,
    newProperties,
    geoJsonRef,
    featureMatcher,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
    mode = 'replace',
  } = options;

  const source = getGeoJsonSource(mapInstance, sourceId);
  if (!source) {
    return createFailureResult('map', featureId, `未找到 ID 为 '${sourceId}' 的数据源`);
  }

  if (!geoJsonRef.value || !Array.isArray(geoJsonRef.value.features)) {
    return createFailureResult('map', featureId, '绑定的 GeoJSON 数据格式不正确');
  }

  try {
    const result = saveFeaturePropertiesInCollection({
      featureCollection: geoJsonRef.value,
      featureId,
      newProperties,
      featureMatcher,
      propertyPolicy,
      protectedKeys,
      hiddenKeys,
      mode,
    });

    if (!result.success || !result.data || !result.properties) {
      return createFailureResult(
        'map',
        featureId,
        result.message,
        result.blockedKeys || [],
        result.removedKeys || []
      );
    }

    source.setData(result.data);
    geoJsonRef.value = result.data;

    return createSuccessResult(
      'map',
      featureId,
      result.properties,
      result.message,
      result.blockedKeys || [],
      result.removedKeys || []
    );
  } catch (error) {
    console.error('[saveMapFeatureProperties] 更新属性时发生错误:', error);
    return createFailureResult('map', featureId, '地图要素属性写回异常');
  }
}

/**
 * 显式删除普通 GeoJSON source 要素属性。
 *
 * 机制：定位目标要素 -> 计算治理后的删键结果 -> setData() 更新引擎 -> 同步 Vue 状态。
 *
 * @param options 删除配置项
 * @returns 结构化删除结果
 */
export function removeMapFeatureProperties(
  options: RemoveMapFeaturePropertiesOptions
): SaveFeaturePropertiesResult {
  const {
    mapInstance,
    sourceId,
    featureId,
    propertyKeys,
    geoJsonRef,
    featureMatcher,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
  } = options;

  const source = getGeoJsonSource(mapInstance, sourceId);
  if (!source) {
    return createFailureResult('map', featureId, `未找到 ID 为 '${sourceId}' 的数据源`);
  }

  if (!geoJsonRef.value || !Array.isArray(geoJsonRef.value.features)) {
    return createFailureResult('map', featureId, '绑定的 GeoJSON 数据格式不正确');
  }

  try {
    const result = removeFeaturePropertiesInCollection({
      featureCollection: geoJsonRef.value,
      featureId,
      propertyKeys,
      featureMatcher,
      propertyPolicy,
      protectedKeys,
      hiddenKeys,
    });

    if (!result.success || !result.data || !result.properties) {
      return createFailureResult(
        'map',
        featureId,
        result.message,
        result.blockedKeys || [],
        result.removedKeys || []
      );
    }

    source.setData(result.data);
    geoJsonRef.value = result.data;

    return createSuccessResult(
      'map',
      featureId,
      result.properties,
      result.message,
      result.blockedKeys || [],
      result.removedKeys || []
    );
  } catch (error) {
    console.error('[removeMapFeatureProperties] 删除属性时发生错误:', error);
    return createFailureResult('map', featureId, '地图要素属性删除异常');
  }
}

/**
 * 保存 TerraDraw 要素属性。
 *
 * TerraDraw 底层的 `updateFeatureProperties` 是浅合并接口，
 * 这里先复用统一的属性治理引擎计算出最新属性集合，再转换成最小 patch。
 *
 * @param options 更新配置项
 * @returns 结构化保存结果
 */
export function saveTerradrawFeatureProperties(
  options: SaveTerradrawFeaturePropertiesOptions
): SaveFeaturePropertiesResult {
  const {
    terradraw,
    featureId,
    newProperties,
    currentProperties,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
    reservedPropertyKeys = TERRADRAW_RESERVED_PROPERTY_KEYS,
    mode = 'replace',
  } = options;

  if (!terradraw || !terradraw.hasFeature(featureId)) {
    return createFailureResult('terradraw', featureId, '目标 TerraDraw 要素已不存在');
  }

  const terradrawCurrentProperties = getTerradrawCurrentProperties(
    terradraw,
    featureId,
    currentProperties
  );
  const mergedHiddenKeys = mergeKeyGroups(hiddenKeys, reservedPropertyKeys);
  const result = saveFeaturePropertiesInCollection({
    featureCollection: createPropertyOnlyCollection(terradrawCurrentProperties),
    featureId,
    featureIndex: 0,
    newProperties,
    propertyPolicy,
    protectedKeys,
    hiddenKeys: mergedHiddenKeys,
    mode,
  });

  if (!result.success || !result.properties) {
    return createFailureResult(
      'terradraw',
      featureId,
      result.message,
      result.blockedKeys || [],
      result.removedKeys || []
    );
  }

  const terradrawPatch = buildTerradrawPropertyPatch(
    terradrawCurrentProperties,
    result.properties,
    reservedPropertyKeys
  );
  if (Object.keys(terradrawPatch).length === 0) {
    return createFailureResult(
      'terradraw',
      featureId,
      '没有可写回的 TerraDraw 属性变更',
      result.blockedKeys || [],
      result.removedKeys || []
    );
  }

  terradraw.updateFeatureProperties(featureId, terradrawPatch);
  const removedReservedKeys = (result.blockedKeys || []).filter((key) =>
    reservedPropertyKeys.includes(key)
  );

  return createSuccessResult(
    'terradraw',
    featureId,
    cleanUndefinedProperties({
      ...terradrawCurrentProperties,
      ...terradrawPatch,
    }),
    result.message,
    result.blockedKeys || [],
    result.removedKeys || [],
    removedReservedKeys
  );
}

/**
 * 显式删除 TerraDraw 要素属性。
 *
 * TerraDraw 不支持原生“删除字段”接口，这里通过写入 `undefined` patch 来模拟删键。
 *
 * @param options 删除配置项
 * @returns 结构化删除结果
 */
export function removeTerradrawFeatureProperties(
  options: RemoveTerradrawFeaturePropertiesOptions
): SaveFeaturePropertiesResult {
  const {
    terradraw,
    featureId,
    propertyKeys,
    currentProperties,
    propertyPolicy,
    protectedKeys,
    hiddenKeys,
    reservedPropertyKeys = TERRADRAW_RESERVED_PROPERTY_KEYS,
  } = options;

  if (!terradraw || !terradraw.hasFeature(featureId)) {
    return createFailureResult('terradraw', featureId, '目标 TerraDraw 要素已不存在');
  }

  const terradrawCurrentProperties = getTerradrawCurrentProperties(
    terradraw,
    featureId,
    currentProperties
  );
  const mergedHiddenKeys = mergeKeyGroups(hiddenKeys, reservedPropertyKeys);
  const result = removeFeaturePropertiesInCollection({
    featureCollection: createPropertyOnlyCollection(terradrawCurrentProperties),
    featureId,
    featureIndex: 0,
    propertyKeys,
    propertyPolicy,
    protectedKeys,
    hiddenKeys: mergedHiddenKeys,
  });

  if (!result.success || !result.properties) {
    return createFailureResult(
      'terradraw',
      featureId,
      result.message,
      result.blockedKeys || [],
      result.removedKeys || []
    );
  }

  const terradrawPatch = buildTerradrawPropertyPatch(
    terradrawCurrentProperties,
    result.properties,
    reservedPropertyKeys
  );
  if (Object.keys(terradrawPatch).length === 0) {
    return createFailureResult(
      'terradraw',
      featureId,
      '没有可删除的 TerraDraw 属性变更',
      result.blockedKeys || [],
      result.removedKeys || []
    );
  }

  terradraw.updateFeatureProperties(featureId, terradrawPatch);
  const removedReservedKeys = (result.blockedKeys || []).filter((key) =>
    reservedPropertyKeys.includes(key)
  );

  return createSuccessResult(
    'terradraw',
    featureId,
    cleanUndefinedProperties({
      ...terradrawCurrentProperties,
      ...terradrawPatch,
    }),
    result.message,
    result.blockedKeys || [],
    result.removedKeys || [],
    removedReservedKeys
  );
}

/**
 * 按目标类型统一分发要素属性保存。
 * @param options 保存配置
 * @returns 结构化保存结果
 */
export function saveFeatureProperties(
  options: SaveFeaturePropertiesOptions
): SaveFeaturePropertiesResult {
  if (options.target === 'map') {
    return saveMapFeatureProperties(options);
  }

  return saveTerradrawFeatureProperties(options);
}

/**
 * 兼容旧版 API，保留布尔返回值。
 * @param options 更新配置项
 * @returns boolean 更新是否成功
 */
export function updateFeatureProperties(options: UpdateFeaturePropertyOptions): boolean {
  return saveMapFeatureProperties(options).success;
}
