import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';
import type { MapCommonFeature, MapSourceFeatureRef } from '../../shared/map-common-tools';

/** 线草稿预览线图层样式覆写配置。 */
export interface LineDraftPreviewLineStyleOverrides {
  /** 线图层 layout 局部覆写。 */
  layout?: Partial<NonNullable<LineLayerSpecification['layout']>>;
  /** 线图层 paint 局部覆写。 */
  paint?: Partial<NonNullable<LineLayerSpecification['paint']>>;
}

/** 线草稿预览面图层样式覆写配置。 */
export interface LineDraftPreviewFillStyleOverrides {
  /** 面图层 layout 局部覆写。 */
  layout?: Partial<NonNullable<FillLayerSpecification['layout']>>;
  /** 面图层 paint 局部覆写。 */
  paint?: Partial<NonNullable<FillLayerSpecification['paint']>>;
}

/** 线草稿预览样式覆写配置。 */
export interface LineDraftPreviewStyleOverrides {
  /** 线草稿图层样式覆写。 */
  line?: LineDraftPreviewLineStyleOverrides;
  /** 线廊草稿图层样式覆写。 */
  fill?: LineDraftPreviewFillStyleOverrides;
}

/** 线草稿交互上下文。 */
export interface LineDraftPreviewContext {
  /** 当前草稿要素快照。 */
  feature: MapCommonFeature | null;
  /** 当前草稿要素 ID。 */
  featureId: string | number | null;
  /** 当前草稿 source ID。 */
  sourceId: string | null;
  /** 当前命中的图层 ID。 */
  layerId: string | null;
  /** 当前草稿追踪到的正式来源引用。 */
  originRef: MapSourceFeatureRef | null;
  /** 当前草稿 generatedKind。 */
  generatedKind: string | null;
}

/** 线草稿预览插件配置。 */
export interface LineDraftPreviewOptions {
  /** 是否启用线草稿预览。 */
  enabled?: boolean;
  /** 业务层可选传入的局部样式覆写。 */
  styleOverrides?: LineDraftPreviewStyleOverrides;
  /** 鼠标移入草稿线回调。 */
  onHoverEnter?: (context: LineDraftPreviewContext) => void;
  /** 鼠标移出草稿线回调。 */
  onHoverLeave?: (context: LineDraftPreviewContext) => void;
  /** 点击草稿线回调。 */
  onClick?: (context: LineDraftPreviewContext) => void;
  /** 双击草稿线回调。 */
  onDoubleClick?: (context: LineDraftPreviewContext) => void;
  /** 右键草稿线回调。 */
  onContextMenu?: (context: LineDraftPreviewContext) => void;
}
