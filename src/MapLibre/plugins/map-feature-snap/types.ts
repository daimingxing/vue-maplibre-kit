import type { Map as MaplibreMap, MapGeoJSONFeature } from 'maplibre-gl';
import type {
  TerradrawControlType,
  TerradrawSnapSharedOptions,
} from '../../shared/mapLibre-contols-types';

/** 地图吸附类型。 */
export type MapFeatureSnapKind = 'vertex' | 'segment';

/** 单条吸附规则可命中的几何类型。 */
export type MapFeatureSnapGeometryType = 'Point' | 'LineString' | 'Polygon';

/** 单条吸附规则支持的吸附方式。 */
export type MapFeatureSnapMode = 'vertex' | 'segment';

/** 吸附命中的线段信息。 */
export interface MapFeatureSnapSegmentInfo {
  /** 当前命中的坐标路径索引。 */
  pathIndex: number;
  /** 多边形场景下的 ring 索引。 */
  ringIndex: number;
  /** 当前命中的线段索引。 */
  segmentIndex: number;
  /** 命中线段起点坐标。 */
  startCoordinate: [number, number];
  /** 命中线段终点坐标。 */
  endCoordinate: [number, number];
}

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

/** 普通图层吸附配置。 */
export interface MapFeatureSnapOrdinaryLayerOptions {
  /** 是否启用普通图层吸附。 */
  enabled?: boolean;
  /** 普通图层吸附规则集合。 */
  rules: MapFeatureSnapRule[];
}

/** 地图吸附插件配置。 */
export interface MapFeatureSnapOptions {
  /** 是否启用整个吸附插件。 */
  enabled?: boolean;
  /** 全局默认吸附范围。 */
  defaultTolerancePx?: number;
  /** 吸附预览配置。 */
  preview?: MapFeatureSnapPreviewOptions;
  /** 普通图层吸附配置。 */
  ordinaryLayers?: MapFeatureSnapOrdinaryLayerOptions;
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

/** 统一吸附结果。 */
export interface MapFeatureSnapResult {
  /** 当前是否命中吸附。 */
  matched: boolean;
  /** 吸附后的有效经纬度。 */
  lngLat: { lng: number; lat: number } | null;
  /** 当前命中的像素距离。 */
  distancePx: number | null;
  /** 当前命中的吸附方式。 */
  snapKind: MapFeatureSnapKind | null;
  /** 当前命中的规则 ID。 */
  ruleId: string | null;
  /** 当前命中的目标渲染要素。 */
  targetFeature: MapGeoJSONFeature | null;
  /** 当前命中的目标图层 ID。 */
  targetLayerId: string | null;
  /** 当前命中的目标 source ID。 */
  targetSourceId: string | null;
  /** 当前命中的目标坐标。 */
  targetCoordinate: [number, number] | null;
  /** 当前命中的线段信息。 */
  segment: MapFeatureSnapSegmentInfo | null;
}

/** 地图吸附插件 API。 */
export interface MapFeatureSnapPluginApi {
  /** 主动清空当前吸附预览。 */
  clearPreview: () => void;
  /** 根据普通地图事件解析吸附结果。 */
  resolveMapEvent: (event: any) => MapFeatureSnapResult;
  /** 读取控件最终吸附配置。 */
  resolveTerradrawSnapOptions: (
    controlType: TerradrawControlType,
    localConfig: TerradrawSnapSharedOptions | boolean | null | undefined
  ) => import('../types').ResolvedTerradrawSnapOptions;
}
