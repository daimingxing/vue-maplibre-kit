import { computed, watch, type ComputedRef } from 'vue';
import { cloneDeep } from 'lodash-es';
import { createFillLayerStyle, createLineLayerStyle } from '../../shared/map-layer-style-config';
import type {
  MapLayerInteractiveContext,
  MapLayerInteractiveOptions,
} from '../../shared/mapLibre-contols-types';
import type {
  FeatureProperties,
  FeaturePropertySaveMode,
  MapFeatureId,
  SaveFeaturePropertiesResult,
} from '../../composables/useMapDataUpdate';
import {
  createMapSourceFeatureRef,
  extractManagedPreviewOriginFromProperties,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '../../shared/map-common-tools';
import type { MapLayerStyle } from '../../shared/map-layer-style-config';
import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';
import type { LineDraftPreviewOptions } from './types';
import { LINE_DRAFT_PREVIEW_LINE_LAYER_ID, useLineDraftPreviewStore } from './useLineDraftPreviewStore';

/** 线草稿预览状态变化载荷。 */
export interface LineDraftPreviewStateChangePayload {
  /** 当前线草稿中是否至少存在一个要素。 */
  hasFeatures: boolean;
  /** 当前线草稿要素总数。 */
  featureCount: number;
}

/** 线草稿预览插件 API。 */
export interface LineDraftPreviewPluginApi {
  /** 获取线草稿要素数据源。 */
  data: ComputedRef<MapCommonFeatureCollection>;
  /** 获取线草稿线图层样式。 */
  lineStyle: ComputedRef<
    MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
  >;
  /** 获取线草稿线廊图层样式。 */
  fillStyle: ComputedRef<
    MapLayerStyle<FillLayerSpecification['layout'], FillLayerSpecification['paint']>
  >;
  /** 按业务 ID 获取线草稿要素。 */
  getFeatureById: (featureId: MapFeatureId | null) => MapCommonFeature | null;
  /** 判断指定业务 ID 是否属于线草稿要素。 */
  isFeatureById: (featureId: MapFeatureId | null) => boolean;
  /** 判断当前选中的要素是否属于线草稿。 */
  isSelectedFeature: () => boolean;
  /** 获取当前选中要素的标准化快照。 */
  getSelectedFeatureSnapshot: () => MapCommonFeature | null;
  /** 生成或替换线延长草稿。 */
  previewLine: (previewOptions: {
    lineFeature: MapCommonLineFeature;
    segmentIndex: number;
    extendLengthMeters: number;
    origin?: MapSourceFeatureRef | null;
  }) => MapCommonLineFeature | null;
  /** 生成或替换线廊草稿。 */
  replacePreviewRegion: (previewOptions: {
    lineFeature: MapCommonLineFeature;
    widthMeters: number;
  }) => boolean;
  /** 清空全部线草稿。 */
  clear: () => void;
  /** 保存线草稿要素属性。 */
  saveProperties: (saveOptions: {
    featureId: MapFeatureId;
    newProperties: FeatureProperties;
    mode?: FeaturePropertySaveMode;
  }) => SaveFeaturePropertiesResult;
}

interface UseLineDraftPreviewControllerOptions {
  /** 读取业务层传入的线草稿预览配置。 */
  getOptions: () => LineDraftPreviewOptions | null | undefined;
  /** 读取业务层传入的普通图层交互配置。 */
  getMapInteractive: () => MapLayerInteractiveOptions | null | undefined;
  /** 普通图层交互层提供的选中上下文读取能力。 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null;
  /** 普通图层交互层提供的 hover 状态清理能力。 */
  clearHoverState: () => void;
  /** 普通图层交互层提供的选中状态清理能力。 */
  clearSelectedFeature: () => void;
  /** 将渲染态要素转换为标准 GeoJSON 快照。 */
  toFeatureSnapshot: (feature: any) => MapCommonFeature | null;
  /** 线草稿状态变化回调。 */
  onStateChange?: (payload: LineDraftPreviewStateChangePayload) => void;
}

/**
 * 线草稿预览插件控制器。
 * 负责将“临时草稿数据管理、样式覆写、交互继承、对外 API”打包成一个可复用插件。
 * @param options 插件初始化选项
 * @returns 线草稿插件能力集合
 */
export function useLineDraftPreviewController(options: UseLineDraftPreviewControllerOptions) {
  const {
    getOptions,
    getMapInteractive,
    getSelectedFeatureContext,
    clearHoverState,
    clearSelectedFeature,
    toFeatureSnapshot,
    onStateChange,
  } = options;

  /**
   * 当前线草稿预览是否启用。
   * 仅当业务层显式传入配置，且 enabled !== false 时才会生效。
   */
  const enabled = computed(() => {
    const previewOptions = getOptions();
    return Boolean(previewOptions) && previewOptions?.enabled !== false;
  });

  /**
   * 线延长草稿图层样式。
   * 默认保持橙色虚线风格，业务层若传入 line 样式覆写，则只覆盖对应字段。
   */
  const lineStyle = computed(() =>
    createLineLayerStyle({
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#f56c6c',
          '#e6a23c',
        ],
        'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 4],
        'line-dasharray': [1.5, 1.2],
        ...((getOptions()?.styleOverrides?.line?.paint || {}) as any),
      },
      layout: {
        ...((getOptions()?.styleOverrides?.line?.layout || {}) as any),
      },
    })
  );

  /**
   * 线廊草稿图层样式。
   * 默认保持基础面图层表现，业务层若传入 fill 样式覆写，则只覆盖对应字段。
   */
  const fillStyle = computed(() =>
    createFillLayerStyle({
      layout: {
        ...((getOptions()?.styleOverrides?.fill?.layout || {}) as any),
      },
      paint: {
        ...((getOptions()?.styleOverrides?.fill?.paint || {}) as any),
      },
    })
  );

  const binding = useLineDraftPreviewStore({
    isEnabled: () => enabled.value,
  });

  /**
   * 暴露给渲染层的线草稿数据源。
   * 使用 computed 包一层，便于调用方统一按响应式对象消费。
   */
  const data = computed(() => binding.featureCollection.value);

  /**
   * 配置临时图层（线延长草稿）的鼠标点击和悬浮行为。
   * 插件会从正式线图层继承交互配置，减少业务层重复声明。
   */
  const mergedMapInteractive = computed<MapLayerInteractiveOptions | null>(() => {
    const baseInteractive = getMapInteractive();
    if (!enabled.value) {
      return baseInteractive || null;
    }

    const inheritLayerId = getOptions()?.inheritInteractiveFromLayerId;
    if (!baseInteractive || !inheritLayerId) {
      return baseInteractive || null;
    }

    const inheritedLayerConfig = baseInteractive.layers?.[inheritLayerId];
    if (!inheritedLayerConfig) {
      return baseInteractive || null;
    }

    return {
      ...baseInteractive,
      layers: {
        ...(baseInteractive.layers || {}),
        [LINE_DRAFT_PREVIEW_LINE_LAYER_ID]: cloneDeep(inheritedLayerConfig),
      },
    };
  });

  watch(
    () => ({
      hasFeatures: binding.hasFeatures.value,
      featureCount: binding.featureCount.value,
    }),
    (payload) => {
      onStateChange?.(payload);
    },
    { immediate: true }
  );

  /**
   * 获取当前选中要素的标准化快照。
   * 如果当前选中的是线草稿要素，则优先返回内部数据源中的最新快照。
   */
  const getSelectedFeatureSnapshot = (): MapCommonFeature | null => {
    const selectedFeatureContext = getSelectedFeatureContext();
    if (!selectedFeatureContext?.feature) {
      return null;
    }

    if (binding.isLineDraftFeatureSource(selectedFeatureContext.sourceId)) {
      return binding.getFeatureById(selectedFeatureContext.featureId);
    }

    return toFeatureSnapshot(selectedFeatureContext.feature);
  };

  /**
   * 判断当前选中的要素是否属于线草稿。
   */
  const isSelectedFeature = (): boolean => {
    const selectedFeatureContext = getSelectedFeatureContext();
    return binding.isLineDraftFeatureSource(selectedFeatureContext?.sourceId);
  };

  /**
   * 清空全部线草稿要素，并同步清理普通图层交互状态。
   */
  const clear = (): void => {
    binding.clearLineDraftFeatures();
    clearHoverState();
    if (isSelectedFeature()) {
      clearSelectedFeature();
    }
  };

  /**
   * 生成或替换线延长草稿。
   * @param previewOptions 线延长草稿生成配置
   * @returns 最新生成的线延长草稿；生成失败时返回 null
   */
  const previewLine = (previewOptions: {
    lineFeature: MapCommonLineFeature;
    segmentIndex: number;
    extendLengthMeters: number;
    origin?: MapSourceFeatureRef | null;
  }): MapCommonLineFeature | null => {
    const previewOrigin = resolvePreviewOrigin(previewOptions.lineFeature, previewOptions.origin);
    if (!previewOrigin) {
      return null;
    }

    return binding.previewLineExtension({
      lineFeature: previewOptions.lineFeature,
      segmentIndex: previewOptions.segmentIndex,
      extendLengthMeters: previewOptions.extendLengthMeters,
      origin: previewOrigin,
    });
  };

  /**
   * 解析当前线草稿对应的正式来源引用。
   * @param lineFeature 当前正在操作的线要素
   * @param explicitOrigin 显式传入的正式来源引用
   * @returns 标准化后的正式来源引用；找不到时返回 null
   */
  const resolvePreviewOrigin = (
    lineFeature: MapCommonLineFeature,
    explicitOrigin?: MapSourceFeatureRef | null
  ): MapSourceFeatureRef | null => {
    const normalizedExplicitOrigin = createMapSourceFeatureRef(
      explicitOrigin?.sourceId || null,
      explicitOrigin?.featureId ?? null
    );
    if (normalizedExplicitOrigin) {
      return normalizedExplicitOrigin;
    }

    const featureOrigin = extractManagedPreviewOriginFromProperties(lineFeature.properties || {});
    if (featureOrigin) {
      return featureOrigin;
    }

    const selectedFeatureContext = getSelectedFeatureContext();
    return createMapSourceFeatureRef(
      selectedFeatureContext?.sourceId || null,
      selectedFeatureContext?.featureId ?? null
    );
  };

  /**
   * 生成或替换线廊草稿。
   * @param previewOptions 线廊草稿生成配置
   * @returns 是否生成成功
   */
  const replacePreviewRegion = (previewOptions: {
    lineFeature: MapCommonLineFeature;
    widthMeters: number;
  }): boolean => {
    return binding.replaceLineCorridorPreview(previewOptions);
  };

  /**
   * 保存线草稿要素属性。
   * @param saveOptions 属性写回配置
   * @returns 结构化写回结果
   */
  const saveProperties = (saveOptions: {
    featureId: MapFeatureId;
    newProperties: FeatureProperties;
    mode?: FeaturePropertySaveMode;
  }): SaveFeaturePropertiesResult => {
    return binding.saveLineDraftFeatureProperties(saveOptions);
  };

  return {
    enabled,
    data,
    lineStyle,
    fillStyle,
    mergedMapInteractive,
    getFeatureById: binding.getFeatureById,
    isFeatureById: binding.isLineDraftFeatureById,
    isFeatureSource: binding.isLineDraftFeatureSource,
    getSelectedFeatureSnapshot,
    isSelectedFeature,
    previewLine,
    replacePreviewRegion,
    clear,
    saveProperties,
  };
}
