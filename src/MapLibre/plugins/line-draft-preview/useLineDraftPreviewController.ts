import { computed, ref, watch, type ComputedRef } from 'vue';
import { createFillLayerStyle, createLineLayerStyle } from '../../shared/map-layer-style-config';
import { getMapGlobalLineDraftDefaults } from '../../shared/map-global-config';
import type { MapLayerInteractiveContext } from '../../shared/mapLibre-controls-types';
import type {
  FeatureProperties,
  MapFeatureId,
  SaveFeaturePropertiesResult,
} from '../../composables/useMapDataUpdate';
import type { MapFeaturePropertyPolicy } from '../../shared/map-feature-data';
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
import type { LineDraftPreviewContext, LineDraftPreviewOptions } from './types';
import {
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
  useLineDraftPreviewStore,
} from './useLineDraftPreviewStore';

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
    propertyPolicy?: MapFeaturePropertyPolicy | null;
    protectedKeys?: readonly string[];
  }) => SaveFeaturePropertiesResult;
  /** 显式删除线草稿要素属性。 */
  removeProperties: (saveOptions: {
    featureId: MapFeatureId;
    propertyKeys: readonly string[];
    propertyPolicy?: MapFeaturePropertyPolicy | null;
    protectedKeys?: readonly string[];
  }) => SaveFeaturePropertiesResult;
}

interface UseLineDraftPreviewControllerOptions {
  /** 读取业务层传入的线草稿预览配置。 */
  getOptions: () => LineDraftPreviewOptions | null | undefined;
  /** 普通图层交互层提供的选中上下文读取能力。 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null;
  /** 插件托管图层提供的 hover 状态清理能力。 */
  clearPluginHoverState: () => void;
  /** 插件托管图层提供的选中状态清理能力。 */
  clearPluginSelectedFeature: () => void;
  /** 线草稿状态变化回调。 */
  onStateChange?: (payload: LineDraftPreviewStateChangePayload) => void;
}

/**
 * 合并线草稿样式覆写配置。
 * 只对 line / fill 的 layout、paint 做浅合并，避免把插件样式默认值做成深层隐式规则。
 *
 * @param localOverrides 实例局部样式覆写
 * @returns 合并后的样式覆写配置
 */
function resolveLineDraftStyleOverrides(
  localOverrides: LineDraftPreviewOptions['styleOverrides']
): NonNullable<LineDraftPreviewOptions['styleOverrides']> {
  const globalOverrides = getMapGlobalLineDraftDefaults()?.styleOverrides;

  return {
    line: {
      ...(globalOverrides?.line || {}),
      ...(localOverrides?.line || {}),
      layout: {
        ...(globalOverrides?.line?.layout || {}),
        ...(localOverrides?.line?.layout || {}),
      },
      paint: {
        ...(globalOverrides?.line?.paint || {}),
        ...(localOverrides?.line?.paint || {}),
      },
    },
    fill: {
      ...(globalOverrides?.fill || {}),
      ...(localOverrides?.fill || {}),
      layout: {
        ...(globalOverrides?.fill?.layout || {}),
        ...(localOverrides?.fill?.layout || {}),
      },
      paint: {
        ...(globalOverrides?.fill?.paint || {}),
        ...(localOverrides?.fill?.paint || {}),
      },
    },
  };
}

/**
 * 线草稿预览插件控制器。
 * 负责将“临时草稿数据管理、样式覆写、插件事件上下文、对外 API”打包成一个可复用插件。
 * @param options 插件初始化选项
 * @returns 线草稿插件能力集合
 */
export function useLineDraftPreviewController(options: UseLineDraftPreviewControllerOptions) {
  const {
    getOptions,
    getSelectedFeatureContext,
    clearPluginHoverState,
    clearPluginSelectedFeature,
    onStateChange,
  } = options;
  const resolvedStyleOverrides = computed(() =>
    resolveLineDraftStyleOverrides(getOptions()?.styleOverrides)
  );

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
        ...((resolvedStyleOverrides.value.line?.paint || {}) as any),
      },
      layout: {
        ...((resolvedStyleOverrides.value.line?.layout || {}) as any),
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
        ...((resolvedStyleOverrides.value.fill?.layout || {}) as any),
      },
      paint: {
        ...((resolvedStyleOverrides.value.fill?.paint || {}) as any),
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
  const selectedFeatureId = ref<string | number | null>(null);

  const stopStateWatch = watch(
    () => ({
      hasFeatures: binding.hasFeatures.value,
      featureCount: binding.featureCount.value,
    }),
    (payload) => {
      onStateChange?.(payload);
    },
    { immediate: true }
  );
  const stopFeatureWatch = watch(
    () => binding.featureCollection.value.features,
    () => {
      if (
        selectedFeatureId.value !== null &&
        !binding.isLineDraftFeatureById(selectedFeatureId.value)
      ) {
        selectedFeatureId.value = null;
      }
    },
    { deep: true }
  );

  /**
   * 按草稿要素 ID 构造插件交互上下文。
   * @param featureId 草稿要素 ID
   * @returns 标准化后的草稿交互上下文
   */
  const getFeatureContext = (featureId: MapFeatureId | null): LineDraftPreviewContext | null => {
    const feature = binding.getFeatureById(featureId);

    return {
      feature,
      featureId:
        featureId ??
        ((feature?.properties?.id as MapFeatureId | null | undefined) ??
          ((feature?.id as MapFeatureId | null | undefined) ?? null)),
      sourceId: LINE_DRAFT_PREVIEW_SOURCE_ID,
      layerId: LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
      originRef: extractManagedPreviewOriginFromProperties(feature?.properties || {}),
      generatedKind:
        typeof feature?.properties?.generatedKind === 'string'
          ? feature.properties.generatedKind
          : null,
    };
  };

  /**
   * 获取当前选中要素的标准化快照。
   * 如果当前选中的是线草稿要素，则优先返回内部数据源中的最新快照。
   */
  const getSelectedFeatureSnapshot = (): MapCommonFeature | null => {
    return binding.getFeatureById(selectedFeatureId.value);
  };

  /**
   * 判断当前选中的要素是否属于线草稿。
   */
  const isSelectedFeature = (): boolean => {
    return getSelectedFeatureSnapshot() !== null;
  };

  /**
   * 设置当前选中的草稿要素 ID。
   * @param featureId 目标草稿要素 ID
   */
  const setSelectedFeatureId = (featureId: MapFeatureId | null): void => {
    selectedFeatureId.value = binding.isLineDraftFeatureById(featureId) ? featureId : null;
  };

  /**
   * 清空全部线草稿要素，并同步清理插件图层交互状态。
   */
  const clear = (): void => {
    binding.clearLineDraftFeatures();
    selectedFeatureId.value = null;
    clearPluginHoverState();
    clearPluginSelectedFeature();
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
      explicitOrigin?.featureId ?? null,
      explicitOrigin?.layerId || null
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
      selectedFeatureContext?.featureId ?? null,
      selectedFeatureContext?.layerId || null
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
    propertyPolicy?: MapFeaturePropertyPolicy | null;
    protectedKeys?: readonly string[];
  }): SaveFeaturePropertiesResult => {
    return binding.saveLineDraftFeatureProperties(saveOptions);
  };

  /**
   * 显式删除线草稿要素属性。
   * @param saveOptions 删除配置
   * @returns 结构化写回结果
   */
  const removeProperties = (saveOptions: {
    featureId: MapFeatureId;
    propertyKeys: readonly string[];
    propertyPolicy?: MapFeaturePropertyPolicy | null;
    protectedKeys?: readonly string[];
  }): SaveFeaturePropertiesResult => {
    return binding.removeLineDraftFeatureProperties(saveOptions);
  };

  /**
   * 销毁线草稿控制器。
   * 动态移除插件时，必须停止内部监听并释放临时草稿数据。
   */
  const destroy = (): void => {
    stopStateWatch();
    stopFeatureWatch();
    selectedFeatureId.value = null;
    binding.destroy();
    clearPluginHoverState();
    clearPluginSelectedFeature();
  };

  return {
    enabled,
    data,
    lineStyle,
    fillStyle,
    getFeatureById: binding.getFeatureById,
    getFeatureContext,
    isFeatureById: binding.isLineDraftFeatureById,
    isFeatureSource: binding.isLineDraftFeatureSource,
    getSelectedFeatureSnapshot,
    isSelectedFeature,
    setSelectedFeatureId,
    previewLine,
    replacePreviewRegion,
    clear,
    saveProperties,
    removeProperties,
    destroy,
  };
}
