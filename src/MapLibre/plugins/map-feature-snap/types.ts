import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import type {
  TerradrawControlType,
  TerradrawSnapSharedOptions,
} from '../../shared/mapLibre-controls-types';
import type { MapFeatureSnapResult } from '../../shared/map-feature-snap-types';

export type {
  MapFeatureSnapKind,
  MapFeatureSnapResult,
  MapFeatureSnapSegmentInfo,
} from '../../shared/map-feature-snap-types';

/** 单条吸附规则可命中的几何类型。 */
export type MapFeatureSnapGeometryType = 'Point' | 'LineString' | 'Polygon';

/** 单条吸附规则支持的吸附方式。 */
export type MapFeatureSnapMode = 'vertex' | 'segment';

/** 单条吸附规则高级过滤上下文。 */
export interface MapFeatureSnapRuleFilterContext {
  /** 当前匹配中的规则配置。 */
  rule: MapFeatureSnapRule;
  /** 当前候选渲染要素。 */
  feature: MapGeoJSONFeature;
  /** 当前候选图层 ID。 */
  layerId: string;
  /** 当前候选 source ID。 */
  sourceId: string | null;
  /** 当前候选 source-layer。 */
  sourceLayer: string | null;
  /** 当前候选属性对象。 */
  properties: Record<string, any> | null;
  /** 当前地图实例。 */
  map: MaplibreMap;
}

/** 单条普通图层吸附规则。 */
export interface MapFeatureSnapRule {
  /** 规则唯一标识。 */
  id: string;
  /** 是否启用当前规则。 */
  enabled?: boolean;
  /** 参与当前规则候选查询的图层 ID 集合。 */
  layerIds: string[];
  /** 当前规则命中优先级。 */
  priority?: number;
  /** 当前规则局部吸附范围。 */
  tolerancePx?: number;
  /** 当前规则允许命中的几何类型。 */
  geometryTypes?: MapFeatureSnapGeometryType[];
  /** 当前规则允许采用的吸附方式。 */
  snapTo?: MapFeatureSnapMode[];
  /** 对候选属性对象做浅层严格匹配的条件集合。 */
  where?: Record<string, unknown>;
  /** 业务层高级过滤函数。 */
  filter?: (context: MapFeatureSnapRuleFilterContext) => boolean;
}

/** 吸附预览图层配置。 */
export interface MapFeatureSnapPreviewOptions {
  /** 是否启用吸附预览。 */
  enabled?: boolean;
  /** 吸附点颜色。 */
  pointColor?: string;
  /** 吸附点半径。 */
  pointRadius?: number;
  /** 命中线段高亮颜色。 */
  lineColor?: string;
  /** 命中线段高亮宽度。 */
  lineWidth?: number;
}

/** 业务图层吸附配置。 */
export interface MapFeatureSnapBusinessLayerOptions {
  /** 是否启用业务图层吸附。 */
  enabled?: boolean;
  /** 业务图层吸附规则集合。 */
  rules: MapFeatureSnapRule[];
}

/** 旧普通图层吸附配置类型；仅为迁移期兼容，推荐改用 MapFeatureSnapBusinessLayerOptions。 */
export type MapFeatureSnapOrdinaryLayerOptions = MapFeatureSnapBusinessLayerOptions;

/** 内置吸附目标配置。 */
export interface MapFeatureSnapTargetOptions {
  /** 是否启用当前内置吸附目标。 */
  enabled?: boolean;
  /** 当前内置目标命中优先级。 */
  priority?: number;
  /** 当前内置目标局部吸附范围。 */
  tolerancePx?: number;
  /** 当前内置目标允许采用的吸附方式。 */
  snapTo?: MapFeatureSnapMode[];
}

/** 地图吸附插件配置。 */
export interface MapFeatureSnapOptions {
  /** 是否启用整个吸附插件。 */
  enabled?: boolean;
  /** 全局默认吸附范围。 */
  defaultTolerancePx?: number;
  /** 吸附预览配置。 */
  preview?: MapFeatureSnapPreviewOptions;
  /** 业务图层吸附配置。 */
  businessLayers?: MapFeatureSnapBusinessLayerOptions;
  /** 旧普通图层吸附配置；仅为迁移期兼容，推荐改用 businessLayers。 */
  ordinaryLayers?: MapFeatureSnapBusinessLayerOptions;
  /** 交点插件内置吸附目标配置。 */
  intersection?: boolean | MapFeatureSnapTargetOptions;
  /** 面边线插件内置吸附目标配置。 */
  polygonEdge?: boolean | MapFeatureSnapTargetOptions;
  /** TerraDraw / Measure 吸附公共默认配置。 */
  terradraw?: {
    /** TerraDraw / Measure 共用默认值。 */
    defaults?: TerradrawSnapSharedOptions;
    /** 绘图控件默认值。 */
    draw?: TerradrawSnapSharedOptions | boolean;
    /** 测量控件默认值。 */
    measure?: TerradrawSnapSharedOptions | boolean;
  };
}

/** 地图吸附插件 API。 */
export interface MapFeatureSnapPluginApi {
  /** 主动清空当前吸附预览。 */
  clearPreview: () => void;
  /** 根据普通地图事件解析吸附结果。 */
  resolveMapEvent: (event: MapMouseEvent) => MapFeatureSnapResult;
  /** 读取控件最终吸附配置。 */
  resolveTerradrawSnapOptions: (
    controlType: TerradrawControlType,
    localConfig: TerradrawSnapSharedOptions | boolean | null | undefined
  ) => import('../types').ResolvedTerradrawSnapOptions;
}
