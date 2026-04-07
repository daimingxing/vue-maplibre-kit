import type {
  ControlPosition,
  FillLayerSpecification,
  LineLayerSpecification,
  Map as MaplibreMap,
  MapGeoJSONFeature,
} from 'maplibre-gl';
import type {
  MaplibreTerradrawControl,
  MaplibreMeasureControl,
} from '@watergis/maplibre-gl-terradraw';
import type { TerraDraw, GeoJSONStoreFeatures, GeoJSONStoreGeometries } from 'terra-draw';

/** TerraDraw / Measure 控件的统一实例类型 */
export type TerradrawManagedControl = MaplibreTerradrawControl | MaplibreMeasureControl;

/** TerraDraw 业务交互来源类型 */
export type TerradrawControlType = 'draw' | 'measure';

/** TerraDraw 要素快照类型别名 */
export type TerradrawFeature = GeoJSONStoreFeatures<GeoJSONStoreGeometries>;

/** TerraDraw 要素 ID 类型 */
export type TerradrawFeatureId = string | number;

/** TerraDraw 线装饰模式 */
export type TerradrawLineDecorationMode = 'symbol-repeat' | 'line-pattern' | 'segment-stretch';

/** 测量单位体系 */
export type MeasureUnitType = 'metric' | 'imperial';
/** 公制距离单位 */
export type MetricDistanceUnit = 'kilometer' | 'meter' | 'centimeter';
/** 英制距离单位 */
export type ImperialDistanceUnit = 'mile' | 'foot' | 'inch';
/** 公制面积单位 */
export type MetricAreaUnit = 'square meters' | 'square kilometers' | 'ares' | 'hectares';
/** 英制面积单位 */
export type ImperialAreaUnit = 'square feet' | 'square yards' | 'acres' | 'square miles';
/** 自定义距离单位回调 */
export type DistanceUnitCallBackType = (valueInMeter: number) => {
  distance: number;
  unit: string;
};
/** 自定义面积单位回调 */
export type AreaUnitCallBackType = (valueInSquareMeters: number) => {
  area: number;
  unit: string;
};
/** 测量距离单位类型 */
export type DistanceUnitType =
  | DistanceUnitCallBackType
  | MetricDistanceUnit
  | ImperialDistanceUnit
  | undefined;
/** 测量面积单位类型 */
export type AreaUnitType = AreaUnitCallBackType | MetricAreaUnit | ImperialAreaUnit | undefined;
/** 测量单位符号映射 */
export type MeasureUnitSymbols = Record<
  MetricDistanceUnit | ImperialDistanceUnit | MetricAreaUnit | ImperialAreaUnit | 'meter' | 'foot',
  string
>;

/** 高程缓存配置 */
export interface ElevationCacheConfig {
  /** 是否启用高程缓存 */
  enabled?: boolean;
  /** 最大缓存条目数 */
  maxSize?: number;
  /** 缓存过期时间（毫秒） */
  ttl?: number;
  /** 缓存坐标精度 */
  precision?: number;
}

/** TerraDraw finish 生命周期上下文 */
export interface TerradrawFinishContext {
  /** 当前完成动作对应的模式名称 */
  mode: string;
  /** 当前完成动作类型，例如 draw / edit / dragFeature */
  action: string;
}

/** TerraDraw change 生命周期上下文 */
export interface TerradrawChangeContext {
  /** 变化来源，例如 api */
  origin?: string;
  /** 变化目标，例如 geometry / properties */
  target?: string;
  /** 兼容 TerraDraw 后续补充的其他字段 */
  [key: string]: unknown;
}

/** TerraDraw 统一业务回调上下文 */
export interface TerradrawInteractiveContext {
  /** 当前命中的主目标要素；空白点击、模式切换等场景下可能为 null */
  feature: TerradrawFeature | null;
  /** 当前事件涉及的全部要素快照（如批量 change / delete） */
  features?: TerradrawFeature[];
  /** 当前主目标要素 ID */
  featureId: TerradrawFeatureId | null;
  /** 当前事件涉及的全部要素 ID */
  featureIds?: TerradrawFeatureId[];
  /** 当前交互来自绘图控件还是测量控件 */
  controlType: TerradrawControlType;
  /** 当前控件实例 */
  control: TerradrawManagedControl;
  /** 当前控件持有的底层 TerraDraw 实例 */
  drawInstance: TerraDraw;
  /** 当前地图实例 */
  map: MaplibreMap;
  /** TerraDraw 当前模式，例如 render / select / polygon */
  mode: string;
  /** 地图事件对应的屏幕像素坐标 */
  point?: { x: number; y: number };
  /** 地图事件对应的经纬度坐标 */
  lngLat?: { lng: number; lat: number };
  /** 地图事件对应的原始经纬度坐标（未经过吸附修正） */
  rawLngLat?: { lng: number; lat: number };
  /** 原始 DOM 鼠标事件 */
  originalEvent?: MouseEvent;
  /** 当前事件命中的普通图层吸附结果 */
  snapResult?: MapFeatureSnapResult | null;
  /** finish 生命周期附带的上下文 */
  finishContext?: TerradrawFinishContext;
  /** change 生命周期附带的变化类型 */
  changeType?: string;
  /** change 生命周期附带的额外上下文 */
  changeContext?: TerradrawChangeContext;
  /** delete 生命周期附带的删除 ID 列表 */
  deletedIds?: TerradrawFeatureId[];
}

/** TerraDraw / Measure 控件业务交互配置 */
export interface TerradrawInteractiveOptions {
  /** 是否启用该业务交互封装；默认 true */
  enabled?: boolean;
  /** hover 命中要素时使用的鼠标样式；传 false 则不处理光标 */
  cursor?: string | false;
  /** TerraDraw 交互管理器初始化完成后的回调 */
  onReady?: (context: TerradrawInteractiveContext) => void;
  /** TerraDraw 模式切换回调 */
  onModeChange?: (context: TerradrawInteractiveContext) => void;
  /** TerraDraw 要素绘制 / 编辑完成回调 */
  onFeatureFinish?: (context: TerradrawInteractiveContext) => void;
  /** TerraDraw 要素几何或属性发生变化回调 */
  onFeatureChange?: (context: TerradrawInteractiveContext) => void;
  /** TerraDraw 要素被选中回调 */
  onFeatureSelect?: (context: TerradrawInteractiveContext) => void;
  /** TerraDraw 要素取消选中回调 */
  onFeatureDeselect?: (context: TerradrawInteractiveContext) => void;
  /** TerraDraw 要素删除回调 */
  onFeatureDelete?: (context: TerradrawInteractiveContext) => void;
  /** 鼠标首次移入 TerraDraw 要素回调 */
  onHoverEnter?: (context: TerradrawInteractiveContext) => void;
  /** 鼠标离开 TerraDraw 要素回调 */
  onHoverLeave?: (context: TerradrawInteractiveContext) => void;
  /** 单击 TerraDraw 要素回调 */
  onClick?: (context: TerradrawInteractiveContext) => void;
  /** 双击 TerraDraw 要素回调 */
  onDoubleClick?: (context: TerradrawInteractiveContext) => void;
  /** 右键 TerraDraw 要素回调 */
  onContextMenu?: (context: TerradrawInteractiveContext) => void;
  /** 单击地图空白处回调 */
  onBlankClick?: (context: TerradrawInteractiveContext) => void;
}

/** TerraDraw / Measure 线装饰单条样式配置 */
export interface TerradrawLineDecorationStyle {
  /** 当前线要素采用哪种装饰模式 */
  mode: TerradrawLineDecorationMode;
  /** SVG 来源，支持 inline SVG、data URI、静态资源 URL/导入结果；segment-stretch 模式下会先自动光栅化再渲染 */
  svg: string;
  /** symbol-repeat 模式下，相邻图标沿线的重复间距（像素）；segment-stretch 模式下忽略 */
  spacing?: number;
  /** symbol-repeat 模式下的图标缩放比例；segment-stretch 模式下忽略 */
  size?: number;
  /** line-pattern / segment-stretch 模式下的线宽（像素） */
  lineWidth?: number;
  /** 装饰层透明度，范围 0 - 1 */
  opacity?: number;
  /** symbol-repeat 模式下图标的额外旋转角度（度）；segment-stretch 模式下忽略 */
  iconRotate?: number;
  /** symbol-repeat 模式下图标是否保持正向朝上；segment-stretch 模式下忽略 */
  keepUpright?: boolean;
}

/** TerraDraw / Measure 线装饰 resolveStyle 回调上下文 */
export interface TerradrawLineDecorationResolveContext {
  /** 当前参与装饰判断的 TerraDraw 线要素快照 */
  feature: TerradrawFeature;
  /** 当前交互来自绘图控件还是测量控件 */
  controlType: TerradrawControlType;
  /** 当前控件实例 */
  control: TerradrawManagedControl;
  /** 当前控件持有的底层 TerraDraw 实例 */
  drawInstance: TerraDraw;
  /** 当前地图实例 */
  map: MaplibreMap;
}

/** TerraDraw / Measure 线装饰配置 */
export interface TerradrawLineDecorationOptions {
  /** 是否启用线装饰能力；默认 false */
  enabled?: boolean;
  /** 当前控件下所有线要素共享的默认装饰样式 */
  defaultStyle?: TerradrawLineDecorationStyle | null;
  /**
   * 按单条线要素动态决定装饰样式。
   * 返回 false 表示当前线要素跳过装饰；
   * 返回 null / undefined 时回退到 defaultStyle；
   * 返回具体样式对象时，将覆盖 defaultStyle。
   */
  resolveStyle?: (
    context: TerradrawLineDecorationResolveContext
  ) => TerradrawLineDecorationStyle | null | false;
}

/** 地图吸附类型 */
export type MapFeatureSnapKind = 'vertex' | 'segment';

/** 单条吸附规则可命中的几何类型 */
export type MapFeatureSnapGeometryType = 'Point' | 'LineString' | 'Polygon';

/** 单条吸附规则支持的吸附方式 */
export type MapFeatureSnapMode = 'vertex' | 'segment';

/** 吸附命中的线段信息 */
export interface MapFeatureSnapSegmentInfo {
  /** 当前命中的坐标路径索引（多几何场景下用于区分第几段路径） */
  pathIndex: number;
  /** 多边形场景下的 ring 索引；非多边形场景固定为 0 */
  ringIndex: number;
  /** 当前命中的线段索引 */
  segmentIndex: number;
  /** 命中线段起点坐标 */
  startCoordinate: [number, number];
  /** 命中线段终点坐标 */
  endCoordinate: [number, number];
}

/** 单条吸附规则高级过滤上下文 */
export interface MapFeatureSnapRuleFilterContext {
  /** 当前匹配中的规则配置 */
  rule: MapFeatureSnapRule;
  /** 当前候选渲染要素 */
  feature: MapGeoJSONFeature;
  /** 当前候选图层 ID */
  layerId: string;
  /** 当前候选 source ID */
  sourceId: string | null;
  /** 当前候选 source-layer */
  sourceLayer: string | null;
  /** 当前候选属性对象 */
  properties: Record<string, any> | null;
  /** 当前地图实例 */
  map: MaplibreMap;
}

/** 单条普通图层吸附规则 */
export interface MapFeatureSnapRule {
  /** 规则唯一标识 */
  id: string;
  /** 是否启用当前规则；默认 true */
  enabled?: boolean;
  /** 参与当前规则候选查询的图层 ID 集合 */
  layerIds: string[];
  /** 当前规则命中优先级；数值越大优先级越高 */
  priority?: number;
  /** 当前规则局部吸附范围（像素） */
  tolerancePx?: number;
  /** 当前规则允许命中的几何类型 */
  geometryTypes?: MapFeatureSnapGeometryType[];
  /** 当前规则允许采用的吸附方式 */
  snapTo?: MapFeatureSnapMode[];
  /** 对候选属性对象做浅层严格匹配的条件集合 */
  where?: Record<string, unknown>;
  /** 业务层高级过滤函数；返回 false 时表示当前候选要素跳过吸附 */
  filter?: (context: MapFeatureSnapRuleFilterContext) => boolean;
}

/** 吸附预览图层配置 */
export interface MapFeatureSnapPreviewOptions {
  /** 是否启用吸附预览；默认 true */
  enabled?: boolean;
  /** 吸附点颜色 */
  pointColor?: string;
  /** 吸附点半径（像素） */
  pointRadius?: number;
  /** 命中线段高亮颜色 */
  lineColor?: string;
  /** 命中线段高亮宽度（像素） */
  lineWidth?: number;
}

/** 普通图层吸附配置 */
export interface MapFeatureSnapOrdinaryLayerOptions {
  /** 是否启用普通图层吸附；存在规则时默认 true */
  enabled?: boolean;
  /** 普通图层吸附规则集合 */
  rules: MapFeatureSnapRule[];
}

/** TerraDraw / Measure 共享吸附配置 */
export interface TerradrawSnapSharedOptions {
  /** 是否启用吸附；默认 true */
  enabled?: boolean;
  /** 当前控件吸附范围（像素） */
  tolerancePx?: number;
  /** 是否启用 TerraDraw 原生吸附；默认 true */
  useNative?: boolean;
  /** 是否启用普通图层候选吸附；默认 true */
  useMapTargets?: boolean;
}

/** 地图吸附扩展配置 */
export interface MapFeatureSnapOptions {
  /** 是否启用整个吸附扩展；默认 true */
  enabled?: boolean;
  /** 全局默认吸附范围（像素）；默认 16 */
  defaultTolerancePx?: number;
  /** 吸附预览配置 */
  preview?: MapFeatureSnapPreviewOptions;
  /** 普通图层吸附配置 */
  ordinaryLayers?: MapFeatureSnapOrdinaryLayerOptions;
  /** TerraDraw / Measure 吸附公共默认配置 */
  terradraw?: {
    /** TerraDraw / Measure 共用默认值 */
    defaults?: TerradrawSnapSharedOptions;
    /** 绘图控件默认值；传 false 表示默认关闭 */
    draw?: TerradrawSnapSharedOptions | boolean;
    /** 测量控件默认值；传 false 表示默认关闭 */
    measure?: TerradrawSnapSharedOptions | boolean;
  };
}

/** 统一吸附结果 */
export interface MapFeatureSnapResult {
  /** 当前是否命中吸附 */
  matched: boolean;
  /** 吸附后的有效经纬度；未命中时为 null */
  lngLat: { lng: number; lat: number } | null;
  /** 当前命中的像素距离；未命中时为 null */
  distancePx: number | null;
  /** 当前命中的吸附方式 */
  snapKind: MapFeatureSnapKind | null;
  /** 当前命中的规则 ID */
  ruleId: string | null;
  /** 当前命中的目标渲染要素 */
  targetFeature: MapGeoJSONFeature | null;
  /** 当前命中的目标图层 ID */
  targetLayerId: string | null;
  /** 当前命中的目标 source ID */
  targetSourceId: string | null;
  /** 当前命中的目标坐标 */
  targetCoordinate: [number, number] | null;
  /** 当前命中的线段信息 */
  segment: MapFeatureSnapSegmentInfo | null;
}

/** 普通 MapLibre 图层交互事件类型 */
export type MapLayerInteractiveEventType =
  | 'ready'
  | 'hoverenter'
  | 'hoverleave'
  | 'click'
  | 'dblclick'
  | 'contextmenu'
  | 'blankclick'
  | 'featureselect'
  | 'featuredeselect';

/** 普通 MapLibre 图层交互上下文 */
export interface MapLayerInteractiveContext {
  /** 当前命中的主目标要素；空白点击等场景下可能为 null */
  feature: MapGeoJSONFeature | null;
  /** 当前像素位置原始命中的主目标要素（未经过吸附重定向） */
  hitFeature?: MapGeoJSONFeature | null;
  /** 当前主目标要素 ID */
  featureId: string | number | null;
  /** 当前主目标要素的业务属性对象（即 feature.properties）；空白点击等场景下为 null */
  properties: Record<string, any> | null;
  /** 当前回调对应的交互事件类型 */
  eventType: MapLayerInteractiveEventType;
  /** 当前命中的图层 ID；空白点击等场景下为 null */
  layerId: string | null;
  /** 当前命中的数据源 ID */
  sourceId: string | null;
  /** 当前命中的矢量 source-layer；GeoJSON 数据源场景通常为 null */
  sourceLayer: string | null;
  /** 当前地图实例 */
  map: MaplibreMap;
  /** 地图事件对应的屏幕像素坐标 */
  point?: { x: number; y: number };
  /** 地图事件对应的经纬度坐标 */
  lngLat?: { lng: number; lat: number };
  /** 地图事件对应的原始经纬度坐标（未经过吸附修正） */
  rawLngLat?: { lng: number; lat: number };
  /** 原始 DOM 鼠标事件 */
  originalEvent?: MouseEvent;
  /** 当前事件命中的吸附结果 */
  snapResult?: MapFeatureSnapResult | null;
}

/** 单个普通图层的业务交互配置 */
export interface MapLayerInteractiveLayerOptions {
  /** hover 命中要素时使用的鼠标样式；传 false 则不处理光标 */
  cursor?: string | false;
  /** 是否自动维护 feature-state.hover；默认 true */
  enableFeatureStateHover?: boolean;
  /** 是否自动维护 feature-state.selected；默认 true */
  enableFeatureStateSelected?: boolean;
  /** 鼠标首次移入图层要素回调 */
  onHoverEnter?: (context: MapLayerInteractiveContext) => void;
  /** 鼠标离开图层要素回调 */
  onHoverLeave?: (context: MapLayerInteractiveContext) => void;
  /** 图层要素被选中回调 */
  onFeatureSelect?: (context: MapLayerInteractiveContext) => void;
  /** 图层要素取消选中回调 */
  onFeatureDeselect?: (context: MapLayerInteractiveContext) => void;
  /** 单击图层要素回调 */
  onClick?: (context: MapLayerInteractiveContext) => void;
  /** 双击图层要素回调 */
  onDoubleClick?: (context: MapLayerInteractiveContext) => void;
  /** 右键图层要素回调 */
  onContextMenu?: (context: MapLayerInteractiveContext) => void;
}

/** 托管临时预览线图层样式覆写配置 */
export interface ManagedTunnelPreviewLineStyleOverrides {
  /** 线图层 layout 部分覆写；只传需要修改的字段，未传字段继续使用容器层默认值 */
  layout?: Partial<NonNullable<LineLayerSpecification['layout']>>;
  /** 线图层 paint 部分覆写；只传需要修改的字段，未传字段继续使用容器层默认值 */
  paint?: Partial<NonNullable<LineLayerSpecification['paint']>>;
}

/** 托管临时预览面图层样式覆写配置 */
export interface ManagedTunnelPreviewFillStyleOverrides {
  /** 面图层 layout 部分覆写；只传需要修改的字段，未传字段继续使用容器层默认值 */
  layout?: Partial<NonNullable<FillLayerSpecification['layout']>>;
  /** 面图层 paint 部分覆写；只传需要修改的字段，未传字段继续使用容器层默认值 */
  paint?: Partial<NonNullable<FillLayerSpecification['paint']>>;
}

/** 托管临时巷道预览样式覆写配置 */
export interface ManagedTunnelPreviewStyleOverrides {
  /** 临时延长线图层样式覆写 */
  line?: ManagedTunnelPreviewLineStyleOverrides;
  /** 临时预览区域图层样式覆写 */
  fill?: ManagedTunnelPreviewFillStyleOverrides;
}

/** MapLibre 托管临时巷道预览配置 */
export interface ManagedTunnelPreviewOptions {
  /** 是否启用托管临时巷道预览；默认 true */
  enabled?: boolean;
  /** 需要继承交互配置的正式线图层 ID */
  inheritInteractiveFromLayerId: string;
  /**
   * 业务层可选传入的局部样式覆写。
   * 仅支持覆写 layout / paint，不开放 sourceId / layerId / filter / generatedKind 等图层结构配置。
   */
  styleOverrides?: ManagedTunnelPreviewStyleOverrides;
}

/** 普通 MapLibre 图层业务交互配置 */
export interface MapLayerInteractiveOptions {
  /** 是否启用该业务交互封装；默认 true */
  enabled?: boolean;
  /** 参与交互的图层配置，声明顺序即命中优先级 */
  layers?: Record<string, MapLayerInteractiveLayerOptions>;
  /** 交互管理器初始化完成后的回调 */
  onReady?: (context: MapLayerInteractiveContext) => void;
  /** 鼠标首次移入任意已声明图层要素时触发 */
  onHoverEnter?: (context: MapLayerInteractiveContext) => void;
  /** 鼠标离开当前命中的已声明图层要素时触发 */
  onHoverLeave?: (context: MapLayerInteractiveContext) => void;
  /** 单击地图时触发；命中图层要素时会附带命中上下文 */
  onClick?: (context: MapLayerInteractiveContext) => void;
  /** 双击地图时触发；命中图层要素时会附带命中上下文 */
  onDoubleClick?: (context: MapLayerInteractiveContext) => void;
  /** 右键地图时触发；命中图层要素时会附带命中上下文 */
  onContextMenu?: (context: MapLayerInteractiveContext) => void;
  /** 单击地图空白处回调 */
  onBlankClick?: (context: MapLayerInteractiveContext) => void;
}

/** 基础控件配置接口 */
export interface BaseControlOptions {
  /**
   * 是否使用该控件并渲染
   * @default false
   */
  isUse?: boolean;
  /** 控件在地图上的位置 */
  position?: ControlPosition;
}

/** 导航控件参数提示 */
export interface NavigationControlOptions extends BaseControlOptions {
  /** 是否显示指南针按钮 */
  showCompass?: boolean;
  /** 是否显示缩放按钮 */
  showZoom?: boolean;
  /** 是否通过旋转指南针来反映地图的倾斜角度（pitch） */
  visualizePitch?: boolean;
}

/** 全屏控件参数提示 */
export interface FullscreenControlOptions extends BaseControlOptions {
  /** 全屏时要放大的 DOM 元素或其 ID。如果未指定，将放大整个 document.body */
  container?: HTMLElement | string | null;
}

/** 定位控件参数提示 */
export interface GeolocationControlOptions extends BaseControlOptions {
  /** 传递给浏览器 Geolocation API 的 PositionOptions 对象 */
  positionOptions?: PositionOptions;
  /** 传递给地图 fitBounds 方法的选项，用于控制定位时的视图平移和缩放动画 */
  fitBoundsOptions?: any; // FitBoundsOptions
  /** 是否自动跟踪并持续更新用户的位置 */
  trackUserLocation?: boolean;
  /** 是否在用户位置周围显示代表定位精度的圆圈 */
  showAccuracyCircle?: boolean;
  /** 是否在地图上显示表示用户当前位置的标记点 */
  showUserLocation?: boolean;
}

/** 比例尺控件参数提示 */
export interface ScaleControlOptions extends BaseControlOptions {
  /** 比例尺的最大物理宽度（像素） */
  maxWidth?: number;
  /** 比例尺使用的单位系统：'imperial'（英制）、'metric'（公制）或 'nautical'（海里） */
  unit?: 'imperial' | 'metric' | 'nautical';
}

/** 归属信息控件参数提示 */
export interface AttributionControlOptions extends BaseControlOptions {
  /** 是否使用紧凑模式显示归属信息（默认在大屏幕上为 false，小屏幕上为 true） */
  compact?: boolean;
  /** 自定义的归属信息文本或 HTML，可为单个字符串或字符串数组 */
  customAttribution?: string | string[];
}

/** 帧率控件参数提示 */
export interface FrameRateControlOptions extends BaseControlOptions {
  /** 帧率图表的背景颜色 */
  background?: string;
  /** 图表中每个柱子的宽度（像素） */
  barWidth?: number;
  /** 帧率文本和图表的颜色 */
  color?: string;
  /** 帧率文本的字体样式 */
  font?: string;
  /** 帧率图表的高度（像素） */
  graphHeight?: number;
  /** 帧率图表的宽度（像素） */
  graphWidth?: number;
  /** 图表距离顶部的距离 */
  graphTop?: number;
  /** 图表距离右侧的距离 */
  graphRight?: number;
  /** 控件的整体宽度 */
  width?: number;
}

/** 样式切换控件参数提示 */
export interface StyleSwitchControlOptions extends BaseControlOptions {
  /** 可供切换的地图样式列表 (MapStyle[]) */
  mapStyles?: any[];
  /** 当前选中的地图样式 (支持 v-model) */
  modelValue?: any;
  /** 样式切换面板是否默认展开 */
  isOpen?: boolean;
}

/** 自定义控件参数提示 */
export interface CustomControlOptions extends BaseControlOptions {
  /** 是否移除默认的控件容器样式类 (mapboxgl-ctrl, mapboxgl-ctrl-group) */
  noClasses?: boolean;
}

/** 绘图控件参数提示 (@watergis/maplibre-gl-terradraw) */
export interface TerradrawControlOptions extends BaseControlOptions {
  /**
   * 需要显示的工具栏模式列表（如不传则展示所有模式）。
   * 可选值包括：'point', 'linestring', 'polygon', 'rectangle', 'circle', 'freehand',
   * 'angled-rectangle', 'sensor', 'sector', 'select', 'delete-selection', 'delete', 'download'
   */
  modes?: string[];
  /** 初始化时是否默认展开工具栏，true为展开，false为折叠 */
  open?: boolean;
  /** 是否在删除要素前弹出确认框 */
  showDeleteConfirmation?: boolean;
  /**
   * 绘图底层的其他配置选项 (如修改默认的坐标精度)。
   * 例如: { coordinatePrecision: 6 } 可以将坐标精度从默认的9位修改为6位。
   */
  adapterOptions?: {
    coordinatePrecision?: number;
    // [key: string]: any;
  };
  /**
   * 对具体模式进行深度的行为配置覆盖。
   * 可以传入对应的 TerraDraw Mode 实例来重写默认行为，
   * 例如禁止拖拽多边形、禁止在边缘添加节点等。
   */
  modeOptions?: any;
  /** 绘图控件吸附配置；支持业务层局部开启、关闭和范围覆写 */
  snapping?: boolean | TerradrawSnapSharedOptions;
  /** TerraDraw 线装饰配置；业务层只声明 SVG 与模式，底层渲染细节由容器层统一接管 */
  lineDecoration?: TerradrawLineDecorationOptions;
  /** TerraDraw 业务交互回调配置（由 mapLibre-init 统一接管） */
  interactive?: TerradrawInteractiveOptions;
  /** 兼容其他配置 */
  // [key: string]: any;
}

/** 测量控件参数提示 (@watergis/maplibre-gl-terradraw) */
export interface MeasureControlOptions extends BaseControlOptions {
  /**
   * 需要显示的测量工具栏模式列表。
   * 仅支持：'point' (测点高程), 'linestring' (测线), 'polygon' (测面), 'circle' (测圆), 'freehand' (自由测线), 'freehand-polygon' (自由测面), 'delete', 'download'
   */
  modes?: string[];
  /** 初始化时是否默认展开工具栏 */
  open?: boolean;
  /** 是否在删除测量要素前弹出确认框 */
  showDeleteConfirmation?: boolean;
  /** 自定义测量点标签的样式规范 */
  pointLayerLabelSpec?: any;
  /** 自定义测量线标签的样式规范 */
  lineLayerLabelSpec?: any;
  /** 自定义测量路由线节点的样式规范 */
  routingLineLayerNodeSpec?: any;
  /** 自定义测量面标签的样式规范 */
  polygonLayerSpec?: any;
  /** 测量单位体系：metric 为公制，imperial 为英制 */
  measureUnitType?: MeasureUnitType;
  /** 测距结果保留的小数位数 */
  distancePrecision?: number;
  /** 强制指定距离单位；也支持自定义单位换算回调 */
  distanceUnit?: DistanceUnitType;
  /** 测面积结果保留的小数位数 */
  areaPrecision?: number;
  /** 强制指定面积单位；也支持自定义单位换算回调 */
  areaUnit?: AreaUnitType;
  /** 自定义测量单位符号映射，例如将 kilometer 显示为 km */
  measureUnitSymbols?: MeasureUnitSymbols;
  /** 是否结合 MapLibre 的地形数据计算真实的 3D 地表距离 */
  computeElevation?: boolean;
  /** 指定特定的 DEM source 的 ID (结合 computeElevation 使用) */
  terrainSource?: string;
  /** 高程查询缓存配置，适合高频测量或复杂地形场景 */
  elevationCacheConfig?: ElevationCacheConfig;
  /** 自定义测量文本的字体栈，需对应地图的 glyphs 配置，如 ['Noto Sans Regular'] */
  textFont?: string[];
  /** 其他适配器配置 */
  adapterOptions?: any;
  /** 具体模式深度配置 */
  modeOptions?: any;
  /** 测量控件吸附配置；支持业务层局部开启、关闭和范围覆写 */
  snapping?: boolean | TerradrawSnapSharedOptions;
  /** 测量线装饰配置；业务层只声明 SVG 与模式，底层渲染细节由容器层统一接管 */
  lineDecoration?: TerradrawLineDecorationOptions;
  /** 测量控件业务交互回调配置（由 mapLibre-init 统一接管） */
  interactive?: TerradrawInteractiveOptions;
}

/** 整合所有控件的类型定义 */
export interface MapControlsConfig {
  /** 导航控件（缩放与罗盘）配置 */
  MglNavigationControl?: NavigationControlOptions;
  /** 全屏控件配置 */
  MglFullscreenControl?: FullscreenControlOptions;
  /** 定位控件配置 */
  MglGeolocationControl?: GeolocationControlOptions;
  /** 比例尺控件配置 */
  MglScaleControl?: ScaleControlOptions;
  /** 归属信息控件配置 */
  MglAttributionControl?: AttributionControlOptions;
  /** 帧率控件配置 */
  MglFrameRateControl?: FrameRateControlOptions;
  /** 样式切换控件配置 */
  MglStyleSwitchControl?: StyleSwitchControlOptions;
  /** 自定义控件配置 */
  MglCustomControl?: CustomControlOptions;
  /** 绘图控件配置 */
  MaplibreTerradrawControl?: TerradrawControlOptions;
  /** 测量控件配置 */
  MaplibreMeasureControl?: MeasureControlOptions;
  /** 兼容其他自定义控件 */
  // [key: string]: any;
}
