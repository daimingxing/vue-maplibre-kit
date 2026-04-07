import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';

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

/** 线草稿预览插件配置。 */
export interface LineDraftPreviewOptions {
  /** 是否启用线草稿预览。 */
  enabled?: boolean;
  /** 需要继承交互配置的正式线图层 ID。 */
  inheritInteractiveFromLayerId: string;
  /** 业务层可选传入的局部样式覆写。 */
  styleOverrides?: LineDraftPreviewStyleOverrides;
}
