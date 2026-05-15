import type { LineLayerSpecification } from 'maplibre-gl';
import type {
  MapCommonFeature,
  MapCommonFeatureCollection,
  MapSourceFeatureRef,
} from '../../shared/map-common-tools';
import type { MapLayerStyle } from '../../shared/map-layer-style-config';

/** 面边线预览线样式简写配置。 */
export interface PolygonEdgePreviewSimpleLineStyle {
  /** 线颜色。 */
  color?: string;
  /** 线宽，单位像素。 */
  width?: number;
  /** 线透明度，范围 0 到 1。 */
  opacity?: number;
  /** 虚线配置。 */
  dasharray?: number[];
}

/** 面边线预览状态样式集合。 */
export interface PolygonEdgePreviewStateStyles {
  /** 默认态样式。 */
  normal?: PolygonEdgePreviewSimpleLineStyle;
  /** hover 态样式。 */
  hover?: PolygonEdgePreviewSimpleLineStyle;
  /** selected 态样式。 */
  selected?: PolygonEdgePreviewSimpleLineStyle;
  /** highlighted 态样式。 */
  highlighted?: PolygonEdgePreviewSimpleLineStyle;
}

/** 面边线来源面属性匹配规则。 */
export interface PolygonEdgePreviewStyleRule {
  /** 对来源面属性做浅层等值匹配。 */
  where?: Record<string, unknown>;
  /** 命中后的状态样式。 */
  style?: PolygonEdgePreviewStateStyles;
}

/** 面边线预览插件配置。 */
export interface PolygonEdgePreviewOptions {
  /** 是否启用面边线预览插件。 */
  enabled?: boolean;
  /** 默认状态样式。 */
  style?: PolygonEdgePreviewStateStyles;
  /** 来源面样式规则。 */
  styleRules?: PolygonEdgePreviewStyleRule[];
  /** 鼠标移入边线回调。 */
  onHoverEnter?: (context: PolygonEdgePreviewContext) => void;
  /** 鼠标移出边线回调。 */
  onHoverLeave?: (context: PolygonEdgePreviewContext) => void;
  /** 点击边线回调。 */
  onClick?: (context: PolygonEdgePreviewContext) => void;
  /** 双击边线回调。 */
  onDoubleClick?: (context: PolygonEdgePreviewContext) => void;
  /** 右键边线回调。 */
  onContextMenu?: (context: PolygonEdgePreviewContext) => void;
}

/** 面边线状态值。 */
export type PolygonEdgePreviewEdgeState = 'normal' | 'highlighted' | 'selected';

/** 面边线生成结果。 */
export interface PolygonEdgePreviewGenerateResult {
  /** 是否生成成功。 */
  success: boolean;
  /** 结果说明。 */
  message: string;
  /** 生成的边线数量。 */
  edgeCount: number;
  /** 当前面分组 ID。 */
  polygonId: string | null;
}

/** 面边线生成入参。 */
export interface PolygonEdgePreviewGenerateOptions {
  /** 来源面要素。 */
  feature: MapCommonFeature | null | undefined;
  /** 来源正式业务要素引用。 */
  origin: MapSourceFeatureRef | null | undefined;
}

/** 面边线交互上下文。 */
export interface PolygonEdgePreviewContext {
  /** 当前边线要素。 */
  feature: MapCommonFeature | null;
  /** 当前边线 ID。 */
  edgeId: string | null;
  /** 当前 ring ID。 */
  ringId: string | null;
  /** 当前面分组 ID。 */
  polygonId: string | null;
  /** 当前边线是否属于外环。 */
  isOuterRing: boolean;
  /** 当前边线来源引用。 */
  originRef: MapSourceFeatureRef | null;
}

/** 面边线插件状态。 */
export interface PolygonEdgePreviewState {
  /** 当前是否已有边线。 */
  hasFeatures: boolean;
  /** 当前边线数量。 */
  featureCount: number;
  /** 当前选中边线 ID。 */
  selectedEdgeId: string | null;
}

/** 面边线插件 API。 */
export interface PolygonEdgePreviewPluginApi {
  /** 获取当前边线数据源。 */
  data: import('vue').ComputedRef<MapCommonFeatureCollection>;
  /** 获取当前线图层样式。 */
  lineStyle: import('vue').ComputedRef<
    MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
  >;
  /** 从显式面要素生成边线。 */
  generateFromFeature: (
    options: PolygonEdgePreviewGenerateOptions
  ) => PolygonEdgePreviewGenerateResult;
  /** 从当前选中面要素生成边线。 */
  generateFromSelected: () => PolygonEdgePreviewGenerateResult;
  /** 按边线 ID 获取要素。 */
  getFeatureById: (edgeId: string | null) => MapCommonFeature | null;
  /** 获取当前数据。 */
  getData: () => MapCommonFeatureCollection;
  /** 高亮整个面。 */
  highlightPolygon: (polygonId: string | null) => boolean;
  /** 高亮单个 ring。 */
  highlightRing: (ringId: string | null) => boolean;
  /** 高亮单条边。 */
  highlightEdge: (edgeId: string | null) => boolean;
  /** 选中单条边。 */
  selectEdge: (edgeId: string | null) => boolean;
  /** 清理高亮状态。 */
  clearHighlight: () => void;
  /** 清空全部边线。 */
  clear: () => void;
}
