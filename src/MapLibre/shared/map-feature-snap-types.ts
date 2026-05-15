import type { MapGeoJSONFeature } from 'maplibre-gl';

/** 地图吸附类型。 */
export type MapFeatureSnapKind = 'vertex' | 'segment';

/** 单条吸附规则可命中的几何类型。 */
export type MapFeatureSnapGeometryType = 'Point' | 'LineString' | 'Polygon';

/** 单条吸附规则支持的吸附方式。 */
export type MapFeatureSnapMode = 'vertex' | 'segment';

/** TerraDraw 已绘制要素吸附目标配置。 */
export interface MapFeatureSnapDrawnTargetOptions {
  /** 是否启用 TerraDraw 已绘制要素吸附。 */
  enabled?: boolean;
  /** 已绘制要素允许参与吸附的几何类型。 */
  geometryTypes?: MapFeatureSnapGeometryType[];
  /** 已绘制要素允许采用的吸附方式。 */
  snapTo?: MapFeatureSnapMode[];
  /** 已绘制要素吸附优先级。 */
  priority?: number;
  /** 已绘制要素吸附范围。 */
  tolerancePx?: number;
}

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
