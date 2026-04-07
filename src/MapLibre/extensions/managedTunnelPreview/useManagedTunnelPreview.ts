import { computed, ref, watch } from 'vue';
import {
  MapTunnelLineExtensionTool,
  MapTunnelRegionTool,
  buildMapSourceFeatureRefKey,
  extractManagedPreviewOriginFromProperties,
  MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '../../shared/map-common-tools';
import type {
  FeatureProperties,
  FeaturePropertySaveMode,
  MapFeatureId,
  SaveFeaturePropertiesResult,
} from '../../composables/useMapDataUpdate';

/** 托管临时巷道预览数据源 ID */
export const MANAGED_TUNNEL_PREVIEW_SOURCE_ID = 'managed_tunnel_preview_source';

/** 托管临时巷道预览线图层 ID */
export const MANAGED_TUNNEL_PREVIEW_LINE_LAYER_ID = 'managedTunnelPreviewLineLayer';

/** 托管临时巷道预览区域图层 ID */
export const MANAGED_TUNNEL_PREVIEW_FILL_LAYER_ID = 'managedTunnelPreviewFillLayer';

/** 托管临时巷道预览区域 generatedKind 固定值 */
export const MANAGED_TUNNEL_PREVIEW_REGION_KIND = 'tunnel-region-preview';

interface UseManagedTunnelPreviewOptions {
  /** 读取当前托管预览是否启用 */
  isEnabled: () => boolean;
}

interface PreviewTunnelLineExtensionOptions {
  /** 当前需要参与延长的线要素 */
  lineFeature: MapCommonLineFeature;
  /** 当前命中的线段索引 */
  segmentIndex: number;
  /** 本次延长长度（米） */
  extendLengthMeters: number;
  /** 当前预览线对应的正式来源引用 */
  origin: MapSourceFeatureRef;
}

interface ReplaceTunnelPreviewRegionOptions {
  /** 当前需要生成预览区域的线要素 */
  lineFeature: MapCommonLineFeature;
  /** 区域半宽（米） */
  widthMeters: number;
}

interface SaveManagedFeaturePropertiesOptions {
  /** 目标要素业务 ID */
  featureId: MapFeatureId;
  /** 需要写回的属性对象 */
  newProperties: FeatureProperties;
  /** 属性写回模式 */
  mode?: FeaturePropertySaveMode;
}

/**
 * 创建空的托管预览要素集合。
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
 * 在托管预览集合中按业务 ID 查找要素索引。
 * @param features 当前要素列表
 * @param featureId 目标业务 ID
 * @returns 命中的要素索引；未命中时返回 -1
 */
function findFeatureIndexById(features: MapCommonFeature[], featureId: MapFeatureId): number {
  return features.findIndex((feature) => getFeatureBusinessId(feature) === featureId);
}

/**
 * 过滤掉指定临时线及其派生预览要素。
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
 * 收集本次需要被替换掉的旧临时线业务 ID。
 * @param features 当前托管预览要素列表
 * @param nextLineFeature 最新生成的临时延长线
 * @returns 需要清理的旧临时线业务 ID 集合
 */
function collectReplacedTemporaryTunnelLineIds(
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
    if (!MapTunnelLineExtensionTool.isTemporaryExtensionFeature(feature)) {
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
 * 计算普通地图要素属性写回后的新属性集合。
 * @param currentProperties 当前属性对象
 * @param newProperties 最新写回属性对象
 * @param mode 写回模式
 * @returns 计算后的属性对象
 */
function resolveNextMapProperties(
  currentProperties: FeatureProperties,
  newProperties: FeatureProperties,
  mode: FeaturePropertySaveMode
): FeatureProperties {
  if (mode === 'merge') {
    return {
      ...currentProperties,
      ...newProperties,
    };
  }

  return clonePlainData(newProperties);
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
 * 创建统一的成功结果，便于与现有属性写回接口保持一致。
 * @param featureId 当前目标要素业务 ID
 * @param properties 最新属性对象
 * @param message 成功说明
 * @returns 结构化成功结果
 */
function createSuccessResult(
  featureId: MapFeatureId,
  properties: FeatureProperties,
  message: string
): SaveFeaturePropertiesResult {
  return {
    success: true,
    target: 'map',
    featureId,
    properties,
    message,
  };
}

/**
 * 托管临时巷道预览管理器。
 * 负责在组件内部维护临时延长线与其派生预览区域，避免业务页直接操作临时图层数据。
 * @param options 管理器初始化选项
 * @returns 托管预览的数据与操作方法
 */
export function useManagedTunnelPreview(options: UseManagedTunnelPreviewOptions) {
  const { isEnabled } = options;
  const featureCollection = ref<MapCommonFeatureCollection>(createEmptyFeatureCollection());

  /**
   * 读取当前托管预览中的全部要素列表。
   * @returns 当前托管预览要素数组
   */
  const getCurrentFeatures = (): MapCommonFeature[] => {
    return (featureCollection.value.features || []) as MapCommonFeature[];
  };

  /**
   * 将新的要素数组整体写回托管预览数据源。
   * @param nextFeatures 最新要素数组
   */
  const commitFeatures = (nextFeatures: MapCommonFeature[]): void => {
    featureCollection.value = {
      type: 'FeatureCollection',
      features: clonePlainData(nextFeatures),
    };
  };

  /**
   * 按业务 ID 获取托管预览要素快照。
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
   * 判断指定业务 ID 是否属于托管预览要素。
   * @param featureId 目标业务 ID
   * @returns 是否存在对应的托管预览要素
   */
  const isManagedFeatureById = (featureId: MapFeatureId | null): boolean => {
    return getFeatureById(featureId) !== null;
  };

  /**
   * 判断指定 sourceId 是否为托管预览数据源。
   * @param sourceId 待判断的数据源 ID
   * @returns 是否命中托管预览数据源
   */
  const isManagedFeatureSource = (sourceId: string | null | undefined): boolean => {
    return sourceId === MANAGED_TUNNEL_PREVIEW_SOURCE_ID;
  };

  /**
   * 在托管预览中生成或替换临时延长线。
   * @param extensionOptions 延长配置
   * @returns 最新生成的临时延长线；生成失败时返回 null
   */
  const previewTunnelLineExtension = (
    extensionOptions: PreviewTunnelLineExtensionOptions
  ): MapCommonLineFeature | null => {
    if (!isEnabled()) {
      return null;
    }

    const nextLineFeature = MapTunnelLineExtensionTool.extendSelectedLineSegment(
      extensionOptions.lineFeature,
      extensionOptions.segmentIndex,
      extensionOptions.extendLengthMeters,
      extensionOptions.origin
    );

    if (!nextLineFeature) {
      return null;
    }

    const currentFeatures = getCurrentFeatures();
    // 同一条来源线的同一段只保留一份预览结果，
    // 这样业务层重复点击“延长”时，看到的始终是最新预览，而不是不断叠加旧草稿。
    const replacedLineIds = collectReplacedTemporaryTunnelLineIds(currentFeatures, nextLineFeature);
    const nextFeatures = filterOutDerivedFeaturesByLineIds(currentFeatures, replacedLineIds).concat(
      clonePlainData(nextLineFeature)
    );

    commitFeatures(nextFeatures);
    return clonePlainData(nextLineFeature);
  };

  /**
   * 在托管预览中生成或替换指定线要素对应的预览区域。
   * @param regionOptions 区域生成配置
   * @returns 是否生成成功
   */
  const replaceTunnelPreviewRegion = (
    regionOptions: ReplaceTunnelPreviewRegionOptions
  ): boolean => {
    if (!isEnabled()) {
      return false;
    }

    // 这里复用正式区域生成工具，但写入到托管预览源中。
    // 这样几何算法仍然只有一份实现，临时态和正式态的视觉结果也保持一致。
    const nextFeatures = MapTunnelRegionTool.replaceRegionFeatures(
      getCurrentFeatures(),
      regionOptions.lineFeature,
      regionOptions.widthMeters,
      {
        generatedKind: MANAGED_TUNNEL_PREVIEW_REGION_KIND,
      }
    );

    if (!nextFeatures) {
      return false;
    }

    commitFeatures(nextFeatures);
    return true;
  };

  /**
   * 清空全部托管预览要素。
   */
  const clearTunnelPreviewFeatures = (): void => {
    commitFeatures([]);
  };

  /**
   * 保存托管预览要素属性。
   * @param saveOptions 属性写回配置
   * @returns 结构化写回结果
   */
  const saveManagedFeatureProperties = (
    saveOptions: SaveManagedFeaturePropertiesOptions
  ): SaveFeaturePropertiesResult => {
    const { featureId, newProperties, mode = 'replace' } = saveOptions;

    if (!isEnabled()) {
      return createFailureResult(featureId, '托管临时巷道预览未启用');
    }

    const currentFeatures = clonePlainData(getCurrentFeatures());
    const featureIndex = findFeatureIndexById(currentFeatures, featureId);

    if (featureIndex === -1) {
      return createFailureResult(featureId, `未找到 ID 为 '${featureId}' 的托管预览要素`);
    }

    const currentProperties = clonePlainData(currentFeatures[featureIndex].properties || {});
    const nextProperties = resolveNextMapProperties(currentProperties, newProperties, mode);
    currentFeatures[featureIndex].properties = nextProperties;

    // 托管预览同样采用“更新内存态 + 回写完整集合”的方式，
    // 这样与普通 GeoJSON 源的属性写回语义保持一致，页面层无需关心底层差异。
    commitFeatures(currentFeatures);
    return createSuccessResult(featureId, nextProperties, '托管预览要素属性写回成功');
  };

  const hasFeatures = computed(() => getCurrentFeatures().length > 0);
  const featureCount = computed(() => getCurrentFeatures().length);

  watch(
    () => isEnabled(),
    (enabled) => {
      if (!enabled && getCurrentFeatures().length) {
        clearTunnelPreviewFeatures();
      }
    },
    { immediate: true }
  );

  return {
    featureCollection,
    hasFeatures,
    featureCount,
    previewTunnelLineExtension,
    replaceTunnelPreviewRegion,
    clearTunnelPreviewFeatures,
    saveManagedFeatureProperties,
    getFeatureById,
    isManagedFeatureById,
    isManagedFeatureSource,
  };
}
