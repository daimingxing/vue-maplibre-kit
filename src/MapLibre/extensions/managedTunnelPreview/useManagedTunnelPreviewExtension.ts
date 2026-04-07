import { computed, watch, type ComputedRef } from 'vue';
import { cloneDeep } from 'lodash-es';
import { createFillLayerStyle, createLineLayerStyle } from '../../shared/map-layer-style-config';
import type {
  ManagedTunnelPreviewOptions,
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
  MANAGED_TUNNEL_PREVIEW_LINE_LAYER_ID,
  useManagedTunnelPreview,
} from './useManagedTunnelPreview';
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

export interface ManagedTunnelPreviewStateChangePayload {
  /** 当前托管预览中是否至少存在一个要素 */
  hasFeatures: boolean;
  /** 当前托管预览要素总数 */
  featureCount: number;
}

export interface ManagedTunnelPreviewExtensionApi {
  /** 获取托管预览要素数据源 */
  data: ComputedRef<MapCommonFeatureCollection>;
  /** 获取托管预览线图层样式 */
  lineStyle: ComputedRef<
    MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
  >;
  /** 获取托管预览区域图层样式 */
  fillStyle: ComputedRef<
    MapLayerStyle<FillLayerSpecification['layout'], FillLayerSpecification['paint']>
  >;
  /** 按业务 ID 获取托管预览要素 */
  getFeatureById: (featureId: MapFeatureId | null) => MapCommonFeature | null;
  /** 判断指定业务 ID 是否属于托管预览要素 */
  isFeatureById: (featureId: MapFeatureId | null) => boolean;
  /** 判断当前选中的要素是否属于托管预览 */
  isSelectedFeature: () => boolean;
  /** 获取当前选中要素的标准化快照 */
  getSelectedFeatureSnapshot: () => MapCommonFeature | null;
  /** 生成或替换托管临时延长线 */
  previewLine: (previewOptions: {
    lineFeature: MapCommonLineFeature;
    segmentIndex: number;
    extendLengthMeters: number;
    origin?: MapSourceFeatureRef | null;
  }) => MapCommonLineFeature | null;
  /** 生成或替换托管临时预览区域 */
  replacePreviewRegion: (previewOptions: {
    lineFeature: MapCommonLineFeature;
    widthMeters: number;
  }) => boolean;
  /** 清空全部托管临时预览 */
  clear: () => void;
  /** 保存托管临时预览要素属性 */
  saveProperties: (saveOptions: {
    featureId: MapFeatureId;
    newProperties: FeatureProperties;
    mode?: FeaturePropertySaveMode;
  }) => SaveFeaturePropertiesResult;
}

interface UseManagedTunnelPreviewExtensionOptions {
  /** 读取业务层传入的托管临时预览配置 */
  getOptions: () => ManagedTunnelPreviewOptions | null | undefined;
  /** 读取业务层传入的普通图层交互配置 */
  getMapInteractive: () => MapLayerInteractiveOptions | null | undefined;
  /** 普通图层交互层提供的选中上下文读取能力 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null;
  /** 普通图层交互层提供的 hover 状态清理能力 */
  clearHoverState: () => void;
  /** 普通图层交互层提供的选中状态清理能力 */
  clearSelectedFeature: () => void;
  /** 将渲染态要素转换为标准 GeoJSON 快照 */
  toFeatureSnapshot: (feature: any) => MapCommonFeature | null;
  /** 托管预览状态变化回调 */
  onStateChange?: (payload: ManagedTunnelPreviewStateChangePayload) => void;
}

/**
 * 托管临时巷道预览扩展控制器。
 * 负责将“临时预览数据管理、样式覆写、交互继承、对外 API”打包成一个可复用扩展。
 * @param options 扩展初始化选项
 * @returns 托管临时预览扩展能力集合
 */
export function useManagedTunnelPreviewExtension(options: UseManagedTunnelPreviewExtensionOptions) {
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
   * 当前托管临时预览是否启用。
   * 仅当业务层显式传入配置，且 enabled !== false 时才会生效。
   */
  const enabled = computed(() => {
    const previewOptions = getOptions();
    return Boolean(previewOptions) && previewOptions?.enabled !== false;
  });

  /**
   * 托管临时延长线图层样式。
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
   * 托管临时预览区域图层样式。
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

  const binding = useManagedTunnelPreview({
    isEnabled: () => enabled.value,
  });

  /**
   * 暴露给渲染层的托管预览数据源。
   * 使用 computed 包一层，便于调用方统一按响应式对象消费。
   */
  const data = computed(() => binding.featureCollection.value);

  /**
   * 配置临时图层（延长线）的鼠标点击和悬浮行为。
   *
   * 作用：让临时延长线表现得像真正的业务线一样。
   * 做法：你指定一个正式线图层的ID (inheritInteractiveFromLayerId)，
   *       插件就会把那个图层的【鼠标变小手】、【点击事件】、【Hover效果】
   *       原封不动地复制到临时延长线上。
   *
   * 这样你就不用为临时延长线单独写一套点击逻辑了。
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
        [MANAGED_TUNNEL_PREVIEW_LINE_LAYER_ID]: cloneDeep(inheritedLayerConfig),
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
   * 如果当前选中的是托管预览要素，则优先返回内部数据源中的最新快照。
   */
  const getSelectedFeatureSnapshot = (): MapCommonFeature | null => {
    const selectedFeatureContext = getSelectedFeatureContext();
    if (!selectedFeatureContext?.feature) {
      return null;
    }

    if (binding.isManagedFeatureSource(selectedFeatureContext.sourceId)) {
      return binding.getFeatureById(selectedFeatureContext.featureId);
    }

    return toFeatureSnapshot(selectedFeatureContext.feature);
  };

  /**
   * 判断当前选中的要素是否属于托管临时预览。
   */
  const isSelectedFeature = (): boolean => {
    const selectedFeatureContext = getSelectedFeatureContext();
    return binding.isManagedFeatureSource(selectedFeatureContext?.sourceId);
  };

  /**
   * 清空全部托管临时预览要素，并同步清理普通图层交互状态。
   */
  const clear = (): void => {
    binding.clearTunnelPreviewFeatures();
    clearHoverState();
    if (isSelectedFeature()) {
      clearSelectedFeature();
    }
  };

  /**
   * 生成或替换托管临时延长线预览。
   * @param previewOptions 临时延长线生成配置
   * @returns 最新生成的临时延长线；生成失败时返回 null
   */
  const previewLine = (previewOptions: {
    /** 当前参与延长的线要素 */
    lineFeature: MapCommonLineFeature;
    /** 当前命中的线段索引 */
    segmentIndex: number;
    /** 本次延长长度（米） */
    extendLengthMeters: number;
    /** 当前预览线对应的正式来源引用 */
    origin?: MapSourceFeatureRef | null;
  }): MapCommonLineFeature | null => {
    const previewOrigin = resolvePreviewOrigin(previewOptions.lineFeature, previewOptions.origin);
    if (!previewOrigin) {
      return null;
    }

    return binding.previewTunnelLineExtension({
      lineFeature: previewOptions.lineFeature,
      segmentIndex: previewOptions.segmentIndex,
      extendLengthMeters: previewOptions.extendLengthMeters,
      origin: previewOrigin,
    });
  };

  /**
   * 弄清楚这条"临时虚线"到底是从哪条"正式实线"延伸出来的。
   *
   * 因为在多数据源场景下，图层A和图层B可能都有叫 "line_1" 的线。
   * 为了防止把图层A的线画到图层B去，我们需要记住它的"祖宗"是谁（即 sourceId + featureId）。
   *
   * @param lineFeature 当前正在操作的线（可能是正式线，也可能是已经生成的虚线）
   * @param explicitOrigin 如果你明确知道它的来源，可以直接传进来
   * @returns 包含 sourceId 和 featureId 的"祖宗"信息；找不到返回 null
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
   * 生成或替换托管临时预览区域。
   * @param previewOptions 临时预览区域生成配置
   * @returns 是否生成成功
   */
  const replacePreviewRegion = (previewOptions: {
    /** 当前参与生成区域的线要素 */
    lineFeature: MapCommonLineFeature;
    /** 当前区域宽度（米） */
    widthMeters: number;
  }): boolean => {
    return binding.replaceTunnelPreviewRegion(previewOptions);
  };

  /**
   * 保存托管临时预览要素属性。
   * @param saveOptions 属性写回配置
   * @returns 结构化写回结果
   */
  const saveProperties = (saveOptions: {
    /** 目标要素业务 ID */
    featureId: MapFeatureId;
    /** 需要写回的最新属性对象 */
    newProperties: FeatureProperties;
    /** 写回模式 */
    mode?: FeaturePropertySaveMode;
  }): SaveFeaturePropertiesResult => {
    return binding.saveManagedFeatureProperties(saveOptions);
  };

  return {
    enabled,
    data,
    lineStyle,
    fillStyle,
    mergedMapInteractive,
    getFeatureById: binding.getFeatureById,
    isFeatureById: binding.isManagedFeatureById,
    isFeatureSource: binding.isManagedFeatureSource,
    getSelectedFeatureSnapshot,
    isSelectedFeature,
    previewLine,
    replacePreviewRegion,
    clear,
    saveProperties,
  };
}
