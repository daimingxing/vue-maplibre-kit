/**
 * 公共几何能力入口。
 * 这里统一暴露与业务语义弱耦合的几何工具、来源引用工具和公共类型。
 */

/** 通用线延长工具类。需要延长线、截取线段或做线方向推算时使用。 */
export { MapLineExtensionTool } from '../MapLibre/shared/map-common-tools';

/** 线廊生成工具类。需要按线生成区域或替换区域时使用。 */
export { MapLineCorridorTool } from '../MapLibre/shared/map-common-tools';

/** 通用线测量工具类。需要测整条线长度或测线内区间长度时使用。 */
export { MapLineMeasureTool } from '../MapLibre/shared/map-common-tools';

/** 交点转正式点要素工具。需要把临时交点落成正式点要素时使用。 */
export { buildIntersectionPointFeature } from '../MapLibre/shared/map-intersection-tools';

/** 交点候选线构建工具。需要从 source data 提取参与求交的线时使用。 */
export { buildIntersectionCandidates } from '../MapLibre/shared/map-intersection-tools';

/** 正式交点点要素构建工具。需要生成可长期保留的正式交点点要素时使用。 */
export { buildMaterializedIntersectionFeature } from '../MapLibre/shared/map-intersection-tools';

/** 业务线交点计算工具。需要按 all 或 selected 范围收集交点时使用。 */
export { collectLineIntersections } from '../MapLibre/shared/map-intersection-tools';

/** 来源引用键生成工具。需要把 sourceId 和 featureId 拼成稳定字符串键时使用。 */
export { buildMapSourceFeatureRefKey } from '../MapLibre/shared/map-common-tools';

/** 托管预览来源属性构建工具。需要给草稿或预览要素补来源信息时使用。 */
export { buildManagedPreviewOriginProperties } from '../MapLibre/shared/map-common-tools';

/** 标准来源引用工厂。需要把 sourceId 和 featureId 归一化成统一引用对象时使用。 */
export { createMapSourceFeatureRef } from '../MapLibre/shared/map-common-tools';

/** 托管预览来源属性解析工具。需要从要素属性中还原正式来源引用时使用。 */
export { extractManagedPreviewOriginFromProperties } from '../MapLibre/shared/map-common-tools';

/** 托管预览来源 sourceId 属性名常量。需要识别预览来源字段时使用。 */
export { MANAGED_PREVIEW_ORIGIN_SOURCE_ID_PROPERTY } from '../MapLibre/shared/map-common-tools';

/** 托管预览来源 featureId 属性名常量。需要识别预览要素原始 ID 时使用。 */
export { MANAGED_PREVIEW_ORIGIN_FEATURE_ID_PROPERTY } from '../MapLibre/shared/map-common-tools';

/** 托管预览来源唯一键属性名常量。需要识别预览来源唯一键时使用。 */
export { MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY } from '../MapLibre/shared/map-common-tools';

/** 通用 GeoJSON 要素类型。处理普通业务要素时使用。 */
export type { MapCommonFeature } from '../MapLibre/shared/map-common-tools';

/** 通用 GeoJSON 要素集合类型。处理 FeatureCollection 时使用。 */
export type { MapCommonFeatureCollection } from '../MapLibre/shared/map-common-tools';

/** 通用线要素类型。只处理线数据时使用。 */
export type { MapCommonLineFeature } from '../MapLibre/shared/map-common-tools';

/** 通用面要素类型。只处理面数据时使用。 */
export type { MapCommonPolygonFeature } from '../MapLibre/shared/map-common-tools';

/** 通用属性对象类型。描述 GeoJSON properties 时使用。 */
export type { MapCommonProperties } from '../MapLibre/shared/map-common-tools';

/** 线交互解析入参类型。按点击上下文解析最新线要素时使用。 */
export type { MapLineInteractionResolveOptions } from '../MapLibre/shared/map-common-tools';

/** 线交互快照类型。读取命中线和命中线段结果时使用。 */
export type { MapLineInteractionSnapshot } from '../MapLibre/shared/map-common-tools';

/** 线内定位结果类型。读取点在线上的段索引、比例和里程时使用。 */
export type { MapLineLocatedPoint } from '../MapLibre/shared/map-common-tools';

/** 线内区间测量结果类型。读取两点沿线距离时使用。 */
export type { MapLinePartialMeasureResult } from '../MapLibre/shared/map-common-tools';

/** 线段命中结果类型。读取当前命中的线段索引和长度时使用。 */
export type { MapLineSegmentSelection } from '../MapLibre/shared/map-common-tools';

/** 标准来源引用类型。跨 source 传递 sourceId 和 featureId 时使用。 */
export type { MapSourceFeatureRef } from '../MapLibre/shared/map-common-tools';

/** 交点计算配置类型。声明交点收集入参时使用。 */
export type { CollectLineIntersectionsOptions } from '../MapLibre/shared/map-intersection-tools';

/** 交点求交范围类型。区分 all 与 selected 两类范围时使用。 */
export type { IntersectionScope } from '../MapLibre/shared/map-intersection-tools';

/** 参与求交的业务线候选类型。 */
export type { MapIntersectionCandidate } from '../MapLibre/shared/map-intersection-tools';

/** 交点候选来源类型。 */
export type { MapIntersectionSource } from '../MapLibre/shared/map-intersection-tools';

/** 交点领域对象类型。 */
export type { MapIntersectionPoint } from '../MapLibre/shared/map-intersection-tools';
