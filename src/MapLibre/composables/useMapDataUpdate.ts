import type { GeoJSONSource } from 'maplibre-gl';
import type { TerraDraw } from 'terra-draw';
import type { Ref } from 'vue';
import type { MapInstance } from 'vue-maplibre-gl';
import {
  cleanUndefinedProperties,
  clonePlainData,
  saveFeaturePropertiesInCollection,
} from '../shared/map-feature-data';

export type { MapFeatureDataId as MapFeatureId } from '../shared/map-feature-data';
export type { MapFeatureDataProperties as FeatureProperties } from '../shared/map-feature-data';
export type { MapFeatureDataSaveMode as FeaturePropertySaveMode } from '../shared/map-feature-data';
import type {
  MapFeatureDataId as MapFeatureId,
  MapFeatureDataProperties as FeatureProperties,
  MapFeatureDataSaveMode as FeaturePropertySaveMode,
} from '../shared/map-feature-data';

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
 * 因此提供此列表，用于在执行属性更新（特别是 replace 模式）时，过滤并保护这些字段不被业务操作覆盖或删除。
 *
 * 【开发中要做什么】
 * 1. 业务开发中：不需要直接关心这个列表。调用 `saveFeatureProperties` 时，底层已自动过滤保护这些字段。
 * 2. 调试或展示时：在 UI 面板展示属性时，通常需要将这些字段隐藏，避免干扰业务人员。
 *    例如在自定义属性编辑器中传入该列表作为 forbiddenKeys。
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

export interface SaveFeaturePropertiesResult {
  success: boolean;
  target: 'map' | 'terradraw';
  featureId: MapFeatureId;
  properties?: FeatureProperties;
  message: string;
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
   * 1. replace: 以新属性集替换旧业务属性
   * 2. merge: 仅合并传入属性，不主动清理旧业务属性
   * @default 'replace'
   */
  mode?: FeaturePropertySaveMode;
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

export type SaveFeaturePropertiesOptions =
  | ({ target: 'map' } & SaveMapFeaturePropertiesOptions)
  | ({ target: 'terradraw' } & SaveTerradrawFeaturePropertiesOptions);

/**
 * 兼容旧版命名：仅针对普通 GeoJSON source 的属性更新。
 */
export type UpdateFeaturePropertyOptions = SaveMapFeaturePropertiesOptions;

function createFailureResult(
  target: 'map' | 'terradraw',
  featureId: MapFeatureId,
  message: string
): SaveFeaturePropertiesResult {
  return {
    success: false,
    target,
    featureId,
    message,
  };
}

function createSuccessResult(
  target: 'map' | 'terradraw',
  featureId: MapFeatureId,
  properties: FeatureProperties,
  message: string,
  removedReservedKeys: string[] = []
): SaveFeaturePropertiesResult {
  return {
    success: true,
    target,
    featureId,
    properties,
    message,
    removedReservedKeys,
  };
}

/**
 * 过滤 TerraDraw 保留字段，仅保留业务允许写回的属性。
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

function buildTerradrawPropertyPatch(options: {
  currentProperties: FeatureProperties;
  sanitizedProperties: FeatureProperties;
  mode: FeaturePropertySaveMode;
  reservedPropertyKeys: readonly string[];
}): FeatureProperties {
  const { currentProperties, sanitizedProperties, mode, reservedPropertyKeys } = options;

  if (mode === 'merge') {
    return sanitizedProperties;
  }

  const reservedKeySet = new Set(reservedPropertyKeys);
  const replacePatch: FeatureProperties = {};

  Object.keys(currentProperties).forEach((key) => {
    if (!reservedKeySet.has(key) && !(key in sanitizedProperties)) {
      replacePatch[key] = undefined;
    }
  });

  return {
    ...replacePatch,
    ...sanitizedProperties,
  };
}

/**
 * 保存普通 GeoJSON source 要素属性。
 *
 * 机制：深拷贝原有数据 -> 定位要素 -> 计算新属性 -> setData() 更新引擎 -> 同步 Vue 状态
 * 该方法采用增量更新策略，不会导致地图重置或视角变化。
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
    mode = 'replace',
  } = options;

  if (!mapInstance.map || !mapInstance.isLoaded) {
    return createFailureResult('map', featureId, '地图尚未加载或实例不存在');
  }

  const source = mapInstance.map.getSource(sourceId) as GeoJSONSource;
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
      mode,
    });

    if (!result.success || !result.data || !result.properties) {
      return createFailureResult('map', featureId, result.message);
    }

    source.setData(result.data);
    geoJsonRef.value = result.data;

    return createSuccessResult('map', featureId, result.properties, result.message);
  } catch (error) {
    console.error('[saveMapFeatureProperties] 更新属性时发生错误:', error);
    return createFailureResult('map', featureId, '地图要素属性写回异常');
  }
}

/**
 * 保存 TerraDraw 要素属性。
 *
 * TerraDraw 底层的 `updateFeatureProperties` 是浅合并接口，本封装在 `replace` 模式下会主动
 * 计算需要清理的旧业务字段，并通过写入 `undefined` 的方式模拟“替换业务属性集合”的语义。
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
    reservedPropertyKeys = TERRADRAW_RESERVED_PROPERTY_KEYS,
    mode = 'replace',
  } = options;

  if (!terradraw || !terradraw.hasFeature(featureId)) {
    return createFailureResult('terradraw', featureId, '目标 TerraDraw 要素已不存在');
  }

  const terradrawCurrentProperties = clonePlainData(
    currentProperties || terradraw.getSnapshotFeature(featureId)?.properties || {}
  );
  const { sanitizedProperties, removedReservedKeys } = omitTerradrawReservedProperties(
    newProperties,
    reservedPropertyKeys
  );
  const terradrawPatch = buildTerradrawPropertyPatch({
    currentProperties: terradrawCurrentProperties,
    sanitizedProperties,
    mode,
    reservedPropertyKeys,
  });

  if (Object.keys(terradrawPatch).length === 0) {
    return createFailureResult('terradraw', featureId, '没有可写回的 TerraDraw 属性变更');
  }

  terradraw.updateFeatureProperties(featureId, terradrawPatch);

  const nextProperties = cleanUndefinedProperties({
    ...terradrawCurrentProperties,
    ...terradrawPatch,
  });

  return createSuccessResult(
    'terradraw',
    featureId,
    nextProperties,
    'TerraDraw 要素属性写回成功',
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
