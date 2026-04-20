import { computed, ref, watch } from 'vue';
import {
  MapLineCorridorTool,
  MapLineExtensionTool,
  buildMapSourceFeatureRefKey,
  extractManagedPreviewOriginFromProperties,
  MANAGED_PREVIEW_ORIGIN_FEATURE_ID_PROPERTY,
  MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY,
  MANAGED_PREVIEW_ORIGIN_LAYER_ID_PROPERTY,
  MANAGED_PREVIEW_ORIGIN_SOURCE_ID_PROPERTY,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '../../shared/map-common-tools';
import type {
  FeatureProperties,
  MapFeatureId,
  SaveFeaturePropertiesResult,
} from '../../composables/useMapDataUpdate';
import {
  removeFeaturePropertiesInCollection,
  saveFeaturePropertiesInCollection,
  type MapFeaturePropertyPolicy,
} from '../../shared/map-feature-data';

/** 线草稿预览数据源 ID。 */
export const LINE_DRAFT_PREVIEW_SOURCE_ID = 'lineDraftSource';

/** 线草稿预览线图层 ID。 */
export const LINE_DRAFT_PREVIEW_LINE_LAYER_ID = 'lineDraftLineLayer';

/** 线草稿预览面图层 ID。 */
export const LINE_DRAFT_PREVIEW_FILL_LAYER_ID = 'lineDraftFillLayer';

/** 线草稿预览线廊草稿 generatedKind 固定值。 */
export const LINE_DRAFT_PREVIEW_CORRIDOR_KIND = 'line-corridor-draft';

/** 线草稿内部托管来源字段。 */
export const LINE_DRAFT_PREVIEW_HIDDEN_PROPERTY_KEYS = [
  MANAGED_PREVIEW_ORIGIN_SOURCE_ID_PROPERTY,
  MANAGED_PREVIEW_ORIGIN_FEATURE_ID_PROPERTY,
  MANAGED_PREVIEW_ORIGIN_LAYER_ID_PROPERTY,
  MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY,
] as const;

interface UseLineDraftPreviewStoreOptions {
  /** 读取当前线草稿预览是否启用。 */
  isEnabled: () => boolean;
}

interface PreviewLineDraftOptions {
  /** 当前需要参与延长的线要素。 */
  lineFeature: MapCommonLineFeature;
  /** 当前命中的线段索引。 */
  segmentIndex: number;
  /** 本次延长长度（米）。 */
  extendLengthMeters: number;
  /** 当前草稿线对应的正式来源引用。 */
  origin: MapSourceFeatureRef;
}

interface ReplaceLineCorridorPreviewOptions {
  /** 当前需要生成线廊草稿的线要素。 */
  lineFeature: MapCommonLineFeature;
  /** 线廊半宽（米）。 */
  widthMeters: number;
}

interface SaveLineDraftFeaturePropertiesOptions {
  /** 目标要素业务 ID。 */
  featureId: MapFeatureId;
  /** 需要写回的属性对象。 */
  newProperties: FeatureProperties;
  /** 当前草稿要素继承的业务属性治理配置。 */
  propertyPolicy?: MapFeaturePropertyPolicy | null;
  /** 当前草稿要素继承的强保护键。 */
  protectedKeys?: readonly string[];
}

interface RemoveLineDraftFeaturePropertiesOptions {
  /** 目标要素业务 ID。 */
  featureId: MapFeatureId;
  /** 需要删除的属性键列表。 */
  propertyKeys: readonly string[];
  /** 当前草稿要素继承的业务属性治理配置。 */
  propertyPolicy?: MapFeaturePropertyPolicy | null;
  /** 当前草稿要素继承的强保护键。 */
  protectedKeys?: readonly string[];
}

/**
 * 创建空的线草稿要素集合。
 * @returns 空的 FeatureCollection
 */
function createEmptyFeatureCollection(): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

/**
 * 对普通对象进行深拷贝，避免响应式对象或引用共享导致副作用。
 * @param value 需要克隆的值
 * @returns 深拷贝后的新值
 */
function clonePlainData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 统一提取要素的业务 ID。
 * @param feature 目标要素
 * @returns 业务 ID；不存在时返回 null
 */
function getFeatureBusinessId(feature: MapCommonFeature | null | undefined): MapFeatureId | null {
  if (!feature) {
    return null;
  }

  const propertyId = feature.properties?.id;
  if (propertyId !== undefined && propertyId !== null) {
    return propertyId as MapFeatureId;
  }

  if (feature.id === undefined || feature.id === null) {
    return null;
  }

  return feature.id as MapFeatureId;
}

/**
 * 在线草稿集合中按业务 ID 查找要素索引。
 * @param features 当前要素列表
 * @param featureId 目标业务 ID
 * @returns 命中的要素索引；未命中时返回 -1
 */
function findFeatureIndexById(features: MapCommonFeature[], featureId: MapFeatureId): number {
  return features.findIndex((feature) => getFeatureBusinessId(feature) === featureId);
}

/**
 * 过滤掉指定临时线草稿及其派生预览要素。
 * @param features 当前要素列表
 * @param lineIds 需要剔除的临时线业务 ID 集合
 * @returns 过滤后的要素列表
 */
function filterOutDerivedFeaturesByLineIds(
  features: MapCommonFeature[],
  lineIds: Set<string>
): MapCommonFeature[] {
  if (!lineIds.size) {
    return features;
  }

  return features.filter((feature) => {
    const featureId = getFeatureBusinessId(feature);
    if (featureId !== null && lineIds.has(String(featureId))) {
      return false;
    }

    const generatedFromLineId = feature.properties?.generatedFromLineId;
    if (generatedFromLineId !== undefined && generatedFromLineId !== null) {
      return !lineIds.has(String(generatedFromLineId));
    }

    return true;
  });
}

/**
 * 收集本次需要被替换掉的旧临时线草稿业务 ID。
 * @param features 当前线草稿要素列表
 * @param nextLineFeature 最新生成的临时延长线
 * @returns 需要清理的旧临时线业务 ID 集合
 */
function collectReplacedLineDraftIds(
  features: MapCommonFeature[],
  nextLineFeature: MapCommonLineFeature
): Set<string> {
  const sourceOriginKey = getManagedPreviewOriginKey(nextLineFeature);
  const sourceSegmentIndex = Number(nextLineFeature.properties?.generatedFromSegmentIndex ?? -1);
  const replacedLineIds = new Set<string>();

  if (!sourceOriginKey) {
    return replacedLineIds;
  }

  features.forEach((feature) => {
    if (!MapLineExtensionTool.isTemporaryExtensionFeature(feature)) {
      return;
    }

    if (getManagedPreviewOriginKey(feature) !== sourceOriginKey) {
      return;
    }

    if (Number(feature.properties?.generatedFromSegmentIndex ?? -1) !== sourceSegmentIndex) {
      return;
    }

    const featureId = getFeatureBusinessId(feature);
    if (featureId !== null) {
      replacedLineIds.add(String(featureId));
    }
  });

  return replacedLineIds;
}

/**
 * 提取托管临时预览要素的正式来源唯一键。
 * @param feature 待解析的托管预览要素
 * @returns 命中的正式来源唯一键；不存在时返回 null
 */
function getManagedPreviewOriginKey(feature: MapCommonFeature | null | undefined): string | null {
  const propertyOriginKey =
    (feature?.properties?.[MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY] as string | undefined) || null;
  if (propertyOriginKey) {
    return propertyOriginKey;
  }

  return buildMapSourceFeatureRefKey(
    extractManagedPreviewOriginFromProperties(feature?.properties)
  );
}

/**
 * 创建统一的失败结果，便于与现有属性写回接口保持一致。
 * @param featureId 当前目标要素业务 ID
 * @param message 失败原因
 * @returns 结构化失败结果
 */
function createFailureResult(
  featureId: MapFeatureId,
  message: string
): SaveFeaturePropertiesResult {
  return {
    success: false,
    target: 'map',
    featureId,
    message,
  };
}

/**
 * 线草稿预览存储器。
 * 负责在插件内部维护临时延长线与其派生线廊草稿，避免业务页直接操作临时图层数据。
 * @param options 存储器初始化选项
 * @returns 线草稿数据与操作方法
 */
export function useLineDraftPreviewStore(options: UseLineDraftPreviewStoreOptions) {
  const { isEnabled } = options;
  const featureCollection = ref<MapCommonFeatureCollection>(createEmptyFeatureCollection());

  /**
   * 读取当前线草稿中的全部要素列表。
   * @returns 当前线草稿要素数组
   */
  const getCurrentFeatures = (): MapCommonFeature[] => {
    return (featureCollection.value.features || []) as MapCommonFeature[];
  };

  /**
   * 将新的要素数组整体写回线草稿数据源。
   * @param nextFeatures 最新要素数组
   */
  const commitFeatures = (nextFeatures: MapCommonFeature[]): void => {
    featureCollection.value = {
      type: 'FeatureCollection',
      features: clonePlainData(nextFeatures),
    };
  };

  /**
   * 将最新集合整体写回线草稿数据源。
   * @param nextCollection 最新线草稿集合
   */
  const commitFeatureCollection = (nextCollection: MapCommonFeatureCollection): void => {
    featureCollection.value = nextCollection;
  };

  /**
   * 按业务 ID 获取线草稿要素快照。
   * @param featureId 目标业务 ID
   * @returns 命中的要素快照；未命中时返回 null
   */
  const getFeatureById = (featureId: MapFeatureId | null): MapCommonFeature | null => {
    if (featureId === null || featureId === undefined) {
      return null;
    }

    const targetFeature =
      getCurrentFeatures().find((feature) => getFeatureBusinessId(feature) === featureId) || null;

    return targetFeature ? clonePlainData(targetFeature) : null;
  };

  /**
   * 判断指定业务 ID 是否属于线草稿要素。
   * @param featureId 目标业务 ID
   * @returns 是否存在对应的线草稿要素
   */
  const isLineDraftFeatureById = (featureId: MapFeatureId | null): boolean => {
    return getFeatureById(featureId) !== null;
  };

  /**
   * 判断指定 sourceId 是否为线草稿数据源。
   * @param sourceId 待判断的数据源 ID
   * @returns 是否命中线草稿数据源
   */
  const isLineDraftFeatureSource = (sourceId: string | null | undefined): boolean => {
    return sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID;
  };

  /**
   * 在线草稿中生成或替换临时延长线。
   * @param previewOptions 延长配置
   * @returns 最新生成的临时延长线；生成失败时返回 null
   */
  const previewLineExtension = (
    previewOptions: PreviewLineDraftOptions
  ): MapCommonLineFeature | null => {
    if (!isEnabled()) {
      return null;
    }

    const nextLineFeature = MapLineExtensionTool.extendSelectedLineSegment(
      previewOptions.lineFeature,
      previewOptions.segmentIndex,
      previewOptions.extendLengthMeters,
      previewOptions.origin
    );

    if (!nextLineFeature) {
      return null;
    }

    const currentFeatures = getCurrentFeatures();
    const replacedLineIds = collectReplacedLineDraftIds(currentFeatures, nextLineFeature);
    const nextFeatures = filterOutDerivedFeaturesByLineIds(currentFeatures, replacedLineIds).concat(
      clonePlainData(nextLineFeature)
    );

    commitFeatures(nextFeatures);
    return clonePlainData(nextLineFeature);
  };

  /**
   * 在线草稿中生成或替换指定线要素对应的线廊草稿。
   * @param previewOptions 线廊生成配置
   * @returns 是否生成成功
   */
  const replaceLineCorridorPreview = (
    previewOptions: ReplaceLineCorridorPreviewOptions
  ): boolean => {
    if (!isEnabled()) {
      return false;
    }

    const nextFeatures = MapLineCorridorTool.replaceRegionFeatures(
      getCurrentFeatures(),
      previewOptions.lineFeature,
      previewOptions.widthMeters,
      {
        generatedKind: LINE_DRAFT_PREVIEW_CORRIDOR_KIND,
      }
    );

    if (!nextFeatures) {
      return false;
    }

    commitFeatures(nextFeatures);
    return true;
  };

  /**
   * 清空全部线草稿要素。
   */
  const clearLineDraftFeatures = (): void => {
    commitFeatures([]);
  };

  /**
   * 保存线草稿要素属性。
   * @param saveOptions 属性写回配置
   * @returns 结构化写回结果
   */
  const saveLineDraftFeatureProperties = (
    saveOptions: SaveLineDraftFeaturePropertiesOptions
  ): SaveFeaturePropertiesResult => {
    const {
      featureId,
      newProperties,
      propertyPolicy = null,
      protectedKeys = [],
    } = saveOptions;

    if (!isEnabled()) {
      return createFailureResult(featureId, '线草稿预览未启用');
    }

    const currentFeatures = getCurrentFeatures();
    const featureIndex = findFeatureIndexById(currentFeatures, featureId);

    if (featureIndex === -1) {
      return createFailureResult(featureId, `未找到 ID 为 '${featureId}' 的线草稿要素`);
    }

    const result = saveFeaturePropertiesInCollection({
      featureCollection: featureCollection.value,
      featureId,
      featureIndex,
      newProperties,
      propertyPolicy,
      protectedKeys,
      hiddenKeys: LINE_DRAFT_PREVIEW_HIDDEN_PROPERTY_KEYS,
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

    commitFeatureCollection(result.data as MapCommonFeatureCollection);
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
   * 显式删除线草稿要素属性。
   * @param saveOptions 删除配置
   * @returns 结构化写回结果
   */
  const removeLineDraftFeatureProperties = (
    saveOptions: RemoveLineDraftFeaturePropertiesOptions
  ): SaveFeaturePropertiesResult => {
    const { featureId, propertyKeys, propertyPolicy = null, protectedKeys = [] } = saveOptions;

    if (!isEnabled()) {
      return createFailureResult(featureId, '线草稿预览未启用');
    }

    const currentFeatures = getCurrentFeatures();
    const featureIndex = findFeatureIndexById(currentFeatures, featureId);

    if (featureIndex === -1) {
      return createFailureResult(featureId, `未找到 ID 为 '${featureId}' 的线草稿要素`);
    }

    const result = removeFeaturePropertiesInCollection({
      featureCollection: featureCollection.value,
      featureId,
      featureIndex,
      propertyKeys,
      propertyPolicy,
      protectedKeys,
      hiddenKeys: LINE_DRAFT_PREVIEW_HIDDEN_PROPERTY_KEYS,
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

    commitFeatureCollection(result.data as MapCommonFeatureCollection);
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

  const hasFeatures = computed(() => getCurrentFeatures().length > 0);
  const featureCount = computed(() => getCurrentFeatures().length);

  watch(
    () => isEnabled(),
    (enabled) => {
      if (!enabled && getCurrentFeatures().length) {
        clearLineDraftFeatures();
      }
    },
    { immediate: true }
  );

  return {
    featureCollection,
    hasFeatures,
    featureCount,
    previewLineExtension,
    replaceLineCorridorPreview,
    clearLineDraftFeatures,
    saveLineDraftFeatureProperties,
    removeLineDraftFeatureProperties,
    getFeatureById,
    isLineDraftFeatureById,
    isLineDraftFeatureSource,
  };
}
