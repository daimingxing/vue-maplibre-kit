import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type {
  FeatureProperties,
  MapFeatureId,
  SaveFeaturePropertiesResult,
} from '../composables/useMapDataUpdate';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  LineDraftPreviewStateChangePayload,
  LineDraftPreviewPluginApi,
} from '../plugins/line-draft-preview';
import type {
  MapCommonFeature,
  MapCommonFeatureCollection,
  MapCommonLineFeature,
  MapSourceFeatureRef,
} from '../shared/map-common-tools';
import type { MapFeaturePropertyPolicy } from '../shared/map-feature-data';
import { resolveLineDraftPreviewApi, resolveLineDraftPreviewState } from './mapPluginResolver';

/** 线草稿生成入参。 */
export interface LineDraftPreviewLineOptions {
  /** 当前需要参与延长的线要素。 */
  lineFeature: MapCommonLineFeature;
  /** 当前命中的线段索引。 */
  segmentIndex: number;
  /** 本次延长长度，单位米。 */
  extendLengthMeters: number;
  /** 当前线要素的正式来源引用。 */
  origin?: MapSourceFeatureRef | null;
}

/** 线廊草稿生成入参。 */
export interface LineDraftPreviewRegionOptions {
  /** 当前需要生成线廊的线要素。 */
  lineFeature: MapCommonLineFeature;
  /** 线廊半宽，单位米。 */
  widthMeters: number;
}

/** 线草稿属性写回可选配置。 */
export interface LineDraftPreviewPropertyOptions {
  /** 当前草稿继承的属性治理规则。 */
  propertyPolicy?: MapFeaturePropertyPolicy | null;
  /** 额外保护字段。 */
  protectedKeys?: readonly string[];
}

/** useLineDraftPreview 返回结果。 */
export interface UseLineDraftPreviewResult {
  /** 当前线草稿插件状态。 */
  state: ComputedRef<LineDraftPreviewStateChangePayload | null>;
  /** 当前是否已有线草稿。 */
  hasFeatures: ComputedRef<boolean>;
  /** 当前线草稿数量。 */
  featureCount: ComputedRef<number>;
  /** 按要素 ID 获取当前线草稿要素。 */
  getFeatureById: (featureId: MapFeatureId | null) => MapCommonFeature | null;
  /** 读取当前线草稿 GeoJSON 集合。 */
  getData: () => MapCommonFeatureCollection | null;
  /** 生成或替换线延长草稿。 */
  previewLine: (previewOptions: LineDraftPreviewLineOptions) => MapCommonLineFeature | null;
  /** 生成或替换线廊草稿。 */
  replacePreviewRegion: (previewOptions: LineDraftPreviewRegionOptions) => boolean;
  /** 保存线草稿要素属性。 */
  saveProperties: (
    featureId: MapFeatureId,
    newProperties: FeatureProperties,
    options?: LineDraftPreviewPropertyOptions
  ) => SaveFeaturePropertiesResult;
  /** 显式删除线草稿要素属性。 */
  removeProperties: (
    featureId: MapFeatureId,
    propertyKeys: readonly string[],
    options?: LineDraftPreviewPropertyOptions
  ) => SaveFeaturePropertiesResult;
  /** 清空全部线草稿。 */
  clear: () => boolean;
}

/**
 * 读取当前地图中的线草稿能力门面。
 * 业务层无需再自己监听 `pluginStateChange`，只需要直接读取这里暴露的状态与动作。
 * @param mapRef 地图组件公开实例引用
 * @returns 线草稿能力门面
 */
export function useLineDraftPreview(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
): UseLineDraftPreviewResult {
  /**
   * 读取当前 mapRef 对应的地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 读取当前页面注册的线草稿插件 API。
   * @returns 当前线草稿插件 API
   */
  const getLineDraftPreviewApi = (): LineDraftPreviewPluginApi | null => {
    return resolveLineDraftPreviewApi(getMapExpose());
  };

  const state = computed<LineDraftPreviewStateChangePayload | null>(() => {
    return resolveLineDraftPreviewState(getMapExpose());
  });

  const hasFeatures = computed<boolean>(() => {
    return Boolean(state.value?.hasFeatures) && (state.value?.featureCount || 0) > 0;
  });

  const featureCount = computed<number>(() => {
    return state.value?.featureCount || 0;
  });

  /**
   * 按要素 ID 读取当前线草稿要素。
   * @param featureId 目标线草稿要素 ID
   * @returns 命中的线草稿要素；找不到时返回 null
   */
  const getFeatureById = (featureId: MapFeatureId | null): MapCommonFeature | null => {
    return getLineDraftPreviewApi()?.getFeatureById(featureId) || null;
  };

  /**
   * 构造插件缺失时的属性写回失败结果。
   * @param featureId 目标草稿要素 ID
   * @param message 失败说明
   * @returns 结构化失败结果
   */
  const createMissingResult = (
    featureId: MapFeatureId,
    message: string
  ): SaveFeaturePropertiesResult => {
    return {
      success: false,
      target: 'map',
      featureId,
      message,
    };
  };

  /**
   * 读取当前线草稿 GeoJSON 集合。
   * @returns 当前草稿集合；插件未注册时返回 null
   */
  const getData = (): MapCommonFeatureCollection | null => {
    return getLineDraftPreviewApi()?.data.value || null;
  };

  /**
   * 生成或替换线延长草稿。
   * @param previewOptions 线延长草稿生成配置
   * @returns 生成后的线草稿；插件未注册或生成失败时返回 null
   */
  const previewLine = (
    previewOptions: LineDraftPreviewLineOptions
  ): MapCommonLineFeature | null => {
    return getLineDraftPreviewApi()?.previewLine(previewOptions) || null;
  };

  /**
   * 生成或替换线廊草稿。
   * @param previewOptions 线廊草稿生成配置
   * @returns 是否生成成功
   */
  const replacePreviewRegion = (previewOptions: LineDraftPreviewRegionOptions): boolean => {
    return getLineDraftPreviewApi()?.replacePreviewRegion(previewOptions) || false;
  };

  /**
   * 保存线草稿要素属性。
   * @param featureId 目标草稿要素 ID
   * @param newProperties 最新属性
   * @param options 属性治理配置
   * @returns 结构化写回结果
   */
  const saveProperties = (
    featureId: MapFeatureId,
    newProperties: FeatureProperties,
    options: LineDraftPreviewPropertyOptions = {}
  ): SaveFeaturePropertiesResult => {
    const lineDraftPreviewApi = getLineDraftPreviewApi();
    if (!lineDraftPreviewApi) {
      return createMissingResult(featureId, '当前未注册线草稿插件，无法写回草稿属性');
    }

    return lineDraftPreviewApi.saveProperties({
      featureId,
      newProperties,
      propertyPolicy: options.propertyPolicy,
      protectedKeys: options.protectedKeys,
    });
  };

  /**
   * 显式删除线草稿要素属性。
   * @param featureId 目标草稿要素 ID
   * @param propertyKeys 需要删除的属性键列表
   * @param options 属性治理配置
   * @returns 结构化写回结果
   */
  const removeProperties = (
    featureId: MapFeatureId,
    propertyKeys: readonly string[],
    options: LineDraftPreviewPropertyOptions = {}
  ): SaveFeaturePropertiesResult => {
    const lineDraftPreviewApi = getLineDraftPreviewApi();
    if (!lineDraftPreviewApi) {
      return createMissingResult(featureId, '当前未注册线草稿插件，无法删除草稿属性');
    }

    return lineDraftPreviewApi.removeProperties({
      featureId,
      propertyKeys,
      propertyPolicy: options.propertyPolicy,
      protectedKeys: options.protectedKeys,
    });
  };

  /**
   * 清空当前页面中的全部线草稿。
   * @returns 是否成功拿到线草稿能力并执行清空
   */
  const clear = (): boolean => {
    const lineDraftPreviewApi = getLineDraftPreviewApi();
    if (!lineDraftPreviewApi) {
      return false;
    }

    lineDraftPreviewApi.clear();
    return true;
  };

  return {
    state,
    hasFeatures,
    featureCount,
    getFeatureById,
    getData,
    previewLine,
    replacePreviewRegion,
    saveProperties,
    removeProperties,
    clear,
  };
}
