import type { Feature, Geometry, LineString, MultiLineString } from 'geojson';
import type { MapGeoJSONFeature } from 'maplibre-gl';

/** 地图吸附类型。 */
export type MapFeatureSnapKind = MapFeatureSnapMode;

/** 单条吸附规则可命中的几何类型。 */
export type MapFeatureSnapGeometryType = 'Point' | 'LineString' | 'Polygon';

/** 单条吸附规则支持的吸附方式。 */
export type MapFeatureSnapMode =
  | 'vertex'
  | 'segment'
  | 'sameLayerIntersect'
  | 'crossLayerIntersect';

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

/** 交点候选对应的一条完整真实父线。 */
export interface MapFeatureSnapParent {
  /** 父线所属规则 ID。 */
  ruleId: string;
  /** 父线所属 source ID。 */
  sourceId: string | null;
  /** vector source 时父线所属的 source-layer。 */
  sourceLayer?: string;
  /** 父线命中的 layer ID。 */
  layerId: string | null;
  /** 未经过渲染裁剪的完整线要素。 */
  feature: Feature<LineString | MultiLineString, Record<string, any> | null>;
  /** 当前父线通过真实 segment 还是端点延长参与。 */
  attachment?: 'real' | 'extended';
  /** 固定交点在当前真实父线上的附着坐标。 */
  geometryCoordinate?: [number, number];
  /** 承载附着坐标的真实 segment。 */
  segment?: MapFeatureSnapSegmentInfo | null;
}

/** snap decision 使用的只读二维坐标。 */
export type MapFeatureSnapCoordinate = readonly [number, number];

/** 一次吸附命中的交互关系。 */
export type MapFeatureSnapRelation = 'direct' | 'intersection' | 'nearby';

/** 构成交点节点的完整几何参与者。 */
export interface MapFeatureSnapParticipant {
  /** 一次可选择几何位置的稳定身份。 */
  readonly key: string;
  /** 参与者所属规则 ID。 */
  readonly ruleId: string;
  /** 参与者所属 source ID。 */
  readonly sourceId: string | null;
  /** vector source 时参与者所属 source-layer。 */
  readonly sourceLayer?: string;
  /** 参与者命中的 layer ID。 */
  readonly layerId: string | null;
  /** 参与者对应的完整或渲染要素。 */
  readonly feature: Feature<Geometry, Record<string, any> | null>;
  /** 当前参与者在自身真实 geometry 上的附着坐标。 */
  readonly geometryCoordinate: MapFeatureSnapCoordinate;
  /** 当前参与者通过真实 segment 还是端点延长参与。 */
  readonly attachment: 'real' | 'extended';
  /** 当前附着位置对应的真实 segment。 */
  readonly segment: MapFeatureSnapSegmentInfo | null;
}

/** 当前 rule scope 下可供调用方选择的真实目标。 */
export interface MapFeatureSnapTarget extends MapFeatureSnapParticipant {
  /** 当前目标的吸附类型。 */
  readonly snapKind: MapFeatureSnapKind;
  /** 指针到交互节点的屏幕距离。 */
  readonly distancePx: number;
}

/** snap Module 对一次指针解析形成的规范化不可变决策。 */
export interface MapFeatureSnapDecision {
  /** 当前命中的交互关系。 */
  readonly relation: MapFeatureSnapRelation;
  /** 当前获胜节点的稳定吸附类型。 */
  readonly snapKind: MapFeatureSnapKind;
  /** 用户可见预览与普通绘制使用的唯一坐标。 */
  readonly snapCoordinate: MapFeatureSnapCoordinate;
  /** 确定性主目标 key。 */
  readonly primaryTargetKey: string;
  /** 当前交互阶段可选择的完整目标集合。 */
  readonly targets: readonly MapFeatureSnapTarget[];
  /** 构成交点的完整几何证据；direct 与 nearby 为空。 */
  readonly participants: readonly MapFeatureSnapParticipant[];
}

/** snap 已形成目标但无法安全输出 decision 的原因。 */
export type MapFeatureSnapInvalidReason =
  | 'non-finite-coordinate'
  | 'invalid-primary-target'
  | 'invalid-cardinality'
  | 'incomplete-intersection-evidence';

/** 明确区分正常未命中与证据错误的解析状态。 */
export type MapFeatureSnapResolution =
  | { readonly status: 'matched'; readonly decision: MapFeatureSnapDecision }
  | { readonly status: 'unmatched' }
  | { readonly status: 'invalid'; readonly reason: MapFeatureSnapInvalidReason };

/** 同一次指针解析中可被稳定识别的一条真实吸附候选。 */
export interface MapFeatureSnapCandidate {
  /** 候选命中的像素距离。 */
  distancePx: number;
  /** 候选吸附方式。 */
  snapKind: MapFeatureSnapKind;
  /** 候选所属规则 ID。 */
  ruleId: string;
  /** 候选目标渲染要素；内存交点候选为 null。 */
  targetFeature: MapGeoJSONFeature | null;
  /** 候选目标图层 ID。 */
  targetLayerId: string | null;
  /** 候选目标 source ID。 */
  targetSourceId: string | null;
  /** 候选真实坐标。 */
  targetCoordinate: [number, number];
  /** 候选命中的线段信息。 */
  segment: MapFeatureSnapSegmentInfo | null;
  /** 真实交点候选的完整父线。 */
  parents: MapFeatureSnapParent[];
}

/** 统一吸附结果。 */
export interface MapFeatureSnapResult {
  /** 规范化解析状态；调用方必须先区分 unmatched 与 invalid。 */
  resolution: MapFeatureSnapResolution;
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
  /** 当前候选组的统一视觉锚点；未提供时调用方兼容使用 targetCoordinate。 */
  anchorCoordinate?: [number, number] | null;
  /** 当前命中的线段信息。 */
  segment: MapFeatureSnapSegmentInfo | null;
  /** 交点候选实际参与求交的完整真实父线；普通 vertex/segment 可省略。 */
  parents?: MapFeatureSnapParent[];
  /** 当前指针位置难以稳定区分的候选集合；首项始终是顶层主候选。 */
  candidates?: MapFeatureSnapCandidate[];
}
