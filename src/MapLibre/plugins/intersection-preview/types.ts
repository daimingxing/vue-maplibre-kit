import type { CircleLayerSpecification } from 'maplibre-gl';
import type { MapIntersectionCandidate, MapIntersectionPoint } from '../../shared/map-intersection-tools';
import type {
  MapCommonFeature,
  MapCommonFeatureCollection,
  MapCommonProperties,
} from '../../shared/map-common-tools';
import type { MapBusinessSourceRegistry } from '../../facades/createMapBusinessSource';
import type { MapLayerStyleOverrides } from '../../shared/map-layer-style-config';
import type { MapLayerInteractiveContext } from '../../shared/mapLibre-controls-types';

/** 交点插件求交范围。 */
export type IntersectionPreviewScope = 'all' | 'selected';

/** 交点插件状态。 */
export interface IntersectionPreviewState {
  /** 当前图层是否可见。 */
  visible: boolean;
  /** 当前求交范围。 */
  scope: IntersectionPreviewScope;
  /** 当前交点数量。 */
  count: number;
  /** 当前正式交点点要素数量。 */
  materializedCount: number;
  /** 当前选中的交点 ID。 */
  selectedId: string | null;
  /** 最近一次错误信息。 */
  lastError: string | null;
}

/** 交点上下文。 */
export interface IntersectionPreviewContext extends MapIntersectionPoint {
  /** 当前交点点要素快照。 */
  feature: MapCommonFeature | null;
}

/** 正式交点默认属性解析器。 */
export type IntersectionPreviewMaterializedProperties =
  | MapCommonProperties
  | ((context: IntersectionPreviewContext) => MapCommonProperties);

/** 交点圆点图层样式覆写。 */
export type IntersectionPreviewStyleOverrides = MapLayerStyleOverrides<
  CircleLayerSpecification['layout'],
  CircleLayerSpecification['paint']
>;

/** 交点状态样式片段。 */
export interface IntersectionPreviewStateStyle {
  /** 当前状态的点半径。 */
  radius?: number;
  /** 当前状态的点颜色。 */
  color?: string;
  /** 当前状态的描边颜色。 */
  strokeColor?: string;
  /** 当前状态的描边宽度。 */
  strokeWidth?: number;
}

/** 交点状态样式配置。 */
export interface IntersectionPreviewStateStyles {
  /** 默认态样式。 */
  default?: IntersectionPreviewStateStyle;
  /** hover 态样式。 */
  hover?: IntersectionPreviewStateStyle;
  /** selected 态样式。 */
  selected?: IntersectionPreviewStateStyle;
}

/** 交点插件配置。 */
export interface IntersectionPreviewOptions {
  /** 当前插件是否启用。 */
  enabled?: boolean;
  /** 当前交点层默认是否可见。 */
  visible?: boolean;
  /** 点击预览交点时是否自动生成正式交点点要素。 */
  materializeOnClick?: boolean;
  /** 当前求交范围。 */
  scope?: IntersectionPreviewScope;
  /** 参与求交的来源 source 列表。 */
  targetSourceIds: string[];
  /** 参与求交的来源 layer 列表。 */
  targetLayerIds?: string[];
  /** 业务 source 注册表。传入后，插件会自动从注册表中提取候选线。 */
  sourceRegistry?: MapBusinessSourceRegistry;
  /** 是否保留端点交点。 */
  includeEndpoint?: boolean;
  /** 交点坐标归一化小数位。 */
  coordDigits?: number;
  /** 是否忽略同一条线自交。 */
  ignoreSelf?: boolean;
  /** 外部提供的交点候选线集合。仅在自动 sourceRegistry 模式不够用时作为高级兜底。 */
  getCandidates?: () => MapIntersectionCandidate[];
  /** 生成正式交点点要素时注入的默认业务属性。 */
  materializedProperties?: IntersectionPreviewMaterializedProperties;
  /** 正式交点默认属性继承来源图层 ID。 */
  inheritMaterializedPropertiesFromLayerId?: string;
  /** 预览交点状态样式配置。 */
  previewStateStyles?: IntersectionPreviewStateStyles;
  /** 正式交点状态样式配置。 */
  materializedStateStyles?: IntersectionPreviewStateStyles;
  /** 预览交点图层样式局部覆写。 */
  previewStyleOverrides?: IntersectionPreviewStyleOverrides;
  /** 正式交点图层样式局部覆写。 */
  materializedStyleOverrides?: IntersectionPreviewStyleOverrides;
  /** 鼠标移入交点回调。 */
  onHoverEnter?: (context: IntersectionPreviewContext) => void;
  /** 鼠标移出交点回调。 */
  onHoverLeave?: (context: IntersectionPreviewContext) => void;
  /** 点击交点回调。 */
  onClick?: (context: IntersectionPreviewContext) => void;
  /** 右键交点回调。 */
  onContextMenu?: (context: IntersectionPreviewContext) => void;
}

/** 交点插件 API。 */
export interface IntersectionPreviewPluginApi {
  /** 重新计算交点。 */
  refresh: () => void;
  /** 清空交点集合。 */
  clear: () => void;
  /** 将指定交点写入正式交点点要素集合。 */
  materialize: (intersectionId?: string | null) => boolean;
  /** 删除指定正式交点点要素。 */
  removeMaterialized: (intersectionId?: string | null) => boolean;
  /** 更新指定正式交点点要素的业务属性。 */
  updateMaterializedProperties: (
    intersectionId: string,
    patch: MapCommonProperties
  ) => boolean;
  /** 清空正式交点点要素集合。 */
  clearMaterialized: () => void;
  /** 显示交点层。 */
  show: () => void;
  /** 隐藏交点层。 */
  hide: () => void;
  /** 切换求交范围。 */
  setScope: (scope: IntersectionPreviewScope) => void;
  /** 读取当前交点要素集合。 */
  getData: () => MapCommonFeatureCollection;
  /** 读取当前正式交点点要素集合。 */
  getMaterializedData: () => MapCommonFeatureCollection;
  /** 按交点 ID 读取上下文。 */
  getById: (intersectionId: string | null) => IntersectionPreviewContext | null;
  /** 读取当前选中的交点上下文。 */
  getSelected: () => IntersectionPreviewContext | null;
}

/** 交点控制器配置。 */
export interface UseIntersectionPreviewControllerOptions {
  /** 读取当前插件配置。 */
  getOptions: () => IntersectionPreviewOptions | null | undefined;
  /** 读取当前参与求交的线候选集合。 */
  getCandidates: () => MapIntersectionCandidate[];
  /** 读取当前选中上下文。 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null | undefined;
  /** 状态变化回调。 */
  onStateChange?: (state: IntersectionPreviewState) => void;
}
