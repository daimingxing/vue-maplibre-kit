import { computed, ref, watch, type ComputedRef } from 'vue';
import type { ExpressionSpecification, LineLayerSpecification } from 'maplibre-gl';
import { createLineLayerStyle, type MapLayerStyle } from '../../shared/map-layer-style-config';
import { getMapGlobalPolygonEdgeDefaults } from '../../shared/map-global-config';
import {
  createMapSourceFeatureRef,
  extractGeneratedParentRef,
  type MapCommonFeature,
} from '../../shared/map-common-tools';
import type { MapLayerInteractiveContext } from '../../shared/mapLibre-controls-types';
import type {
  PolygonEdgePreviewContext,
  PolygonEdgePreviewGenerateOptions,
  PolygonEdgePreviewGenerateResult,
  PolygonEdgePreviewOptions,
  PolygonEdgePreviewPluginApi,
  PolygonEdgePreviewSimpleLineStyle,
  PolygonEdgePreviewState,
  PolygonEdgePreviewStateStyles,
  PolygonEdgePreviewStyleRule,
} from './types';
import {
  usePolygonEdgePreviewStore,
} from './usePolygonEdgePreviewStore';

/** 默认面边线状态样式。 */
const DEFAULT_STATE_STYLES: Required<PolygonEdgePreviewStateStyles> = {
  normal: {
    color: '#409eff',
    width: 3,
    opacity: 0.9,
  },
  hover: {
    color: '#f56c6c',
    width: 5,
    opacity: 1,
  },
  selected: {
    color: '#e6a23c',
    width: 6,
    opacity: 1,
  },
  highlighted: {
    color: '#67c23a',
    width: 5,
    opacity: 1,
  },
};

const STYLE_PROPERTY_MAP = {
  normal: {
    color: 'edgeNormalColor',
    width: 'edgeNormalWidth',
    opacity: 'edgeNormalOpacity',
  },
  hover: {
    color: 'edgeHoverColor',
    width: 'edgeHoverWidth',
    opacity: 'edgeHoverOpacity',
  },
  selected: {
    color: 'edgeSelectedColor',
    width: 'edgeSelectedWidth',
    opacity: 'edgeSelectedOpacity',
  },
  highlighted: {
    color: 'edgeHighlightedColor',
    width: 'edgeHighlightedWidth',
    opacity: 'edgeHighlightedOpacity',
  },
} as const;

interface UsePolygonEdgePreviewControllerOptions {
  /** 读取插件配置。 */
  getOptions: () => PolygonEdgePreviewOptions | null | undefined;
  /** 读取当前普通图层选中上下文。 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null;
  /** 清理插件图层 hover 状态。 */
  clearPluginHoverState: () => void;
  /** 清理插件图层选中状态。 */
  clearPluginSelectedFeature: () => void;
  /** 状态变化回调。 */
  onStateChange?: (payload: PolygonEdgePreviewState) => void;
}

/**
 * 合并单个状态样式。
 * @param baseStyle 基础样式
 * @param patchStyle 覆写样式
 * @returns 合并后的样式
 */
function mergeLineStyle(
  baseStyle: PolygonEdgePreviewSimpleLineStyle,
  patchStyle: PolygonEdgePreviewSimpleLineStyle | null | undefined
): PolygonEdgePreviewSimpleLineStyle {
  return {
    ...baseStyle,
    ...(patchStyle || {}),
  };
}

/**
 * 解析最终状态样式。
 * @param options 当前插件配置
 * @returns 最终状态样式
 */
function resolveStateStyles(
  options: PolygonEdgePreviewOptions | null | undefined
): Required<PolygonEdgePreviewStateStyles> {
  const globalStyle = getMapGlobalPolygonEdgeDefaults()?.style || {};
  const localStyle = options?.style || {};

  return {
    normal: mergeLineStyle(
      mergeLineStyle(DEFAULT_STATE_STYLES.normal, globalStyle.normal),
      localStyle.normal
    ),
    hover: mergeLineStyle(
      mergeLineStyle(DEFAULT_STATE_STYLES.hover, globalStyle.hover),
      localStyle.hover
    ),
    selected: mergeLineStyle(
      mergeLineStyle(DEFAULT_STATE_STYLES.selected, globalStyle.selected),
      localStyle.selected
    ),
    highlighted: mergeLineStyle(
      mergeLineStyle(DEFAULT_STATE_STYLES.highlighted, globalStyle.highlighted),
      localStyle.highlighted
    ),
  };
}

/**
 * 合并面边线样式规则。
 * @param options 当前插件配置
 * @returns 全局和局部样式规则
 */
function resolveStyleRules(
  options: PolygonEdgePreviewOptions | null | undefined
): PolygonEdgePreviewStyleRule[] {
  return [
    ...(getMapGlobalPolygonEdgeDefaults()?.styleRules || []),
    ...(options?.styleRules || []),
  ];
}

/**
 * 构建支持按要素覆写的颜色表达式。
 * @param stateStyles 当前状态样式
 * @returns MapLibre 线颜色表达式
 */
function buildColorExpression(
  stateStyles: Required<PolygonEdgePreviewStateStyles>
): ExpressionSpecification {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.selected.color],
      stateStyles.selected.color || DEFAULT_STATE_STYLES.selected.color,
    ],
    ['boolean', ['feature-state', 'hover'], false],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.hover.color],
      stateStyles.hover.color || DEFAULT_STATE_STYLES.hover.color,
    ],
    ['==', ['get', 'edgeState'], 'selected'],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.selected.color],
      stateStyles.selected.color || DEFAULT_STATE_STYLES.selected.color,
    ],
    ['==', ['get', 'edgeState'], 'highlighted'],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.highlighted.color],
      stateStyles.highlighted.color || DEFAULT_STATE_STYLES.highlighted.color,
    ],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.normal.color],
      stateStyles.normal.color || DEFAULT_STATE_STYLES.normal.color,
    ],
  ] as ExpressionSpecification;
}

/**
 * 构建支持按要素覆写的数值表达式。
 * @param stateStyles 当前状态样式
 * @param valueKey 样式字段
 * @returns MapLibre 线宽或透明度表达式
 */
function buildNumberExpression(
  stateStyles: Required<PolygonEdgePreviewStateStyles>,
  valueKey: 'width' | 'opacity'
): ExpressionSpecification {
  const fallbackMap = DEFAULT_STATE_STYLES;

  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.selected[valueKey]],
      getStyleNumber(stateStyles.selected, valueKey, fallbackMap.selected[valueKey] ?? 0),
    ],
    ['boolean', ['feature-state', 'hover'], false],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.hover[valueKey]],
      getStyleNumber(stateStyles.hover, valueKey, fallbackMap.hover[valueKey] ?? 0),
    ],
    ['==', ['get', 'edgeState'], 'selected'],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.selected[valueKey]],
      getStyleNumber(stateStyles.selected, valueKey, fallbackMap.selected[valueKey] ?? 0),
    ],
    ['==', ['get', 'edgeState'], 'highlighted'],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.highlighted[valueKey]],
      getStyleNumber(stateStyles.highlighted, valueKey, fallbackMap.highlighted[valueKey] ?? 0),
    ],
    [
      'coalesce',
      ['get', STYLE_PROPERTY_MAP.normal[valueKey]],
      getStyleNumber(stateStyles.normal, valueKey, fallbackMap.normal[valueKey] ?? 0),
    ],
  ] as ExpressionSpecification;
}

/**
 * 从状态样式中读取数值，缺失时回退默认值。
 * @param style 状态样式
 * @param key 字段名
 * @param fallback 默认值
 * @returns 样式值
 */
function getStyleNumber(
  style: PolygonEdgePreviewSimpleLineStyle,
  key: 'width' | 'opacity',
  fallback: number
): number {
  const value = style[key];
  return typeof value === 'number' ? value : fallback;
}

/**
 * 判断当前要素是否为可生成边线的面要素。
 * @param feature 待判断要素
 * @returns 是否为 Polygon 或 MultiPolygon 要素
 */
function isPolygonFeature(feature: MapCommonFeature | null | undefined): feature is MapCommonFeature {
  return feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon';
}

/**
 * 创建面边线控制器。
 * @param options 控制器配置
 * @returns 面边线插件能力
 */
export function usePolygonEdgePreviewController(options: UsePolygonEdgePreviewControllerOptions) {
  const {
    getOptions,
    getSelectedFeatureContext,
    clearPluginHoverState,
    clearPluginSelectedFeature,
    onStateChange,
  } = options;
  const enabled = computed(() => {
    const previewOptions = getOptions();
    return Boolean(previewOptions) && previewOptions?.enabled !== false;
  });
  const selectedEdgeId = ref<string | null>(null);
  const store = usePolygonEdgePreviewStore({
    isEnabled: () => enabled.value,
    getStyleRules: () => resolveStyleRules(getOptions()),
  });

  const stateStyles = computed(() => resolveStateStyles(getOptions()));
  const data = computed(() => store.featureCollection.value);

  const lineStyle: ComputedRef<
    MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
  > = computed(() => {
    const styles = stateStyles.value;

    return createLineLayerStyle({
      paint: {
        'line-color': buildColorExpression(styles),
        'line-width': buildNumberExpression(styles, 'width'),
        'line-opacity': buildNumberExpression(styles, 'opacity'),
        ...(styles.normal.dasharray ? { 'line-dasharray': styles.normal.dasharray } : {}),
      },
    });
  });

  const stopStateWatch = watch(
    () => ({
      hasFeatures: store.hasFeatures.value,
      featureCount: store.featureCount.value,
      selectedEdgeId: selectedEdgeId.value,
    }),
    (payload) => {
      onStateChange?.(payload);
    },
    { immediate: true }
  );

  /**
   * 从显式面要素生成边线。
   * @param generateOptions 生成配置
   * @returns 结构化生成结果
   */
  const generateFromFeature = (
    generateOptions: PolygonEdgePreviewGenerateOptions
  ): PolygonEdgePreviewGenerateResult => {
    const result = store.generateFromFeature(generateOptions);
    if (result.success) {
      selectedEdgeId.value = null;
      clearPluginHoverState();
      clearPluginSelectedFeature();
    }

    return result;
  };

  /**
   * 从当前选中面要素生成边线。
   * @returns 结构化生成结果
   */
  const generateFromSelected = (): PolygonEdgePreviewGenerateResult => {
    const selectedContext = getSelectedFeatureContext();
    const selectedFeature = (selectedContext?.feature as MapCommonFeature | null | undefined) || null;
    if (!isPolygonFeature(selectedFeature)) {
      return {
        success: false,
        message: '当前选中要素不是面要素，无法生成边线',
        edgeCount: 0,
        polygonId: null,
      };
    }

    const origin = createMapSourceFeatureRef(
      selectedContext?.sourceId || null,
      selectedContext?.featureId ?? null,
      selectedContext?.layerId || null
    );

    return generateFromFeature({
      feature: selectedFeature,
      origin,
    });
  };

  /**
   * 构造边线交互上下文。
   * @param edgeId 边线 ID
   * @returns 边线交互上下文
   */
  const getFeatureContext = (edgeId: string | null): PolygonEdgePreviewContext | null => {
    const feature = store.getFeatureById(edgeId);
    if (!feature) {
      return null;
    }

    return {
      feature,
      edgeId: typeof feature.properties?.edgeId === 'string' ? feature.properties.edgeId : null,
      ringId: typeof feature.properties?.ringId === 'string' ? feature.properties.ringId : null,
      polygonId:
        typeof feature.properties?.polygonId === 'string' ? feature.properties.polygonId : null,
      isOuterRing: feature.properties?.isOuterRing === true,
      originRef: extractGeneratedParentRef(feature.properties || {}),
    };
  };

  /**
   * 选中边线。
   * @param edgeId 边线 ID
   * @returns 是否选中成功
   */
  const selectEdge = (edgeId: string | null): boolean => {
    const success = store.selectEdge(edgeId);
    selectedEdgeId.value = success ? edgeId : null;
    return success;
  };

  /**
   * 清空全部边线。
   */
  const clear = (): void => {
    store.clear();
    selectedEdgeId.value = null;
    clearPluginHoverState();
    clearPluginSelectedFeature();
  };

  /**
   * 销毁控制器。
   */
  const destroy = (): void => {
    stopStateWatch();
    clear();
  };

  const api: PolygonEdgePreviewPluginApi = {
    data,
    lineStyle,
    generateFromFeature,
    generateFromSelected,
    getFeatureById: store.getFeatureById,
    getData: () => data.value,
    highlightPolygon: store.highlightPolygon,
    highlightRing: store.highlightRing,
    highlightEdge: store.highlightEdge,
    selectEdge,
    clearHighlight: store.clearHighlight,
    clear,
  };

  return {
    enabled,
    data,
    lineStyle,
    selectedEdgeId,
    getFeatureContext,
    generateFromFeature,
    generateFromSelected,
    selectEdge,
    clear,
    api,
    destroy,
  };
}
