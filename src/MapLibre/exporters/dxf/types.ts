import type { MapBusinessSourceRegistry } from '../../facades/createMapBusinessSource';
import type { MapCommonFeature } from '../../shared/map-common-tools';

/** DXF 默认导出文件名。 */
export const DEFAULT_DXF_FILE_NAME = 'map-export.dxf';

/** DXF 要素过滤函数。 */
export type MapDxfFeatureFilter = (feature: MapCommonFeature, sourceId: string) => boolean;

/** DXF 图层名解析函数。 */
export type MapDxfLayerNameResolver = (feature: MapCommonFeature, sourceId: string) => string;

/**
 * DXF TrueColor 字符串类型。
 *
 * 约定使用十六进制颜色值（`#RRGGBB`），用于映射 DXF 实体颜色。
 * 建议统一使用大写十六进制，便于日志排查与规则对比。
 *
 * @example
 * ```ts
 * const color: MapDxfTrueColor = '#FF8800';
 * ```
 */
export type MapDxfTrueColor = `#${string}`;

/**
 * DXF 图层级 TrueColor 解析函数。
 *
 * 在“按图层统一着色”的场景下使用：
 * - 返回颜色：该图层内实体默认使用该颜色
 * - 返回 `undefined`：表示不在图层级指定颜色，交由后续规则继续处理
 *
 * 参数说明：
 * - `layerName`：当前实体归属的 DXF 图层名
 * - `sourceId`：实体来源的业务 sourceId
 *
 * @example
 * ```ts
 * const layerResolver: MapDxfLayerTrueColorResolver = (layerName) => {
 *   if (layerName === '消防') return '#FF0000';
 *   if (layerName === '道路') return '#666666';
 *   return undefined;
 * };
 * ```
 */
export type MapDxfLayerTrueColorResolver = (
  layerName: string,
  sourceId: string
) => MapDxfTrueColor | undefined;

/**
 * DXF 要素级 TrueColor 解析函数。
 *
 * 用于“同一图层内按要素差异化着色”的场景，优先读取要素属性后返回颜色。
 * - 返回颜色：当前要素使用该颜色
 * - 返回 `undefined`：表示当前要素不指定颜色，交由其他规则处理
 *
 * 参数说明：
 * - `feature`：当前正在导出的业务要素
 * - `sourceId`：要素来源的业务 sourceId
 * - `layerName`：该要素将写入的 DXF 图层名
 *
 * @example
 * ```ts
 * const featureResolver: MapDxfFeatureTrueColorResolver = (feature, _sourceId, layerName) => {
 *   const level = Number(feature.properties?.riskLevel ?? 0);
 *   if (layerName === '风险点' && level >= 3) return '#FF3300';
 *   if (layerName === '风险点' && level >= 1) return '#FFCC00';
 *   return undefined;
 * };
 * ```
 */
export type MapDxfFeatureTrueColorResolver = (
  feature: MapCommonFeature,
  sourceId: string,
  layerName: string
) => MapDxfTrueColor | undefined;

/**
 * DXF TrueColor 规则集合。
 *
 * 用于集中配置“图层级”和“要素级”颜色策略：
 * - `layerTrueColorResolver`：定义图层默认色
 * - `featureTrueColorResolver`：定义要素覆盖色
 *
 * 建议优先设置图层默认色，再通过要素级规则覆盖关键对象颜色。
 *
 * @example
 * ```ts
 * const trueColorRules: MapDxfTrueColorRules = {
 *   layerTrueColorResolver: (layerName) => {
 *     if (layerName === '建筑') return '#333333';
 *     return undefined;
 *   },
 *   featureTrueColorResolver: (feature) => {
 *     if (feature.properties?.isEmergency) return '#FF0000';
 *     return undefined;
 *   },
 * };
 * ```
 */
export interface MapDxfTrueColorRules {
  /** 图层 TrueColor 解析器。 */
  layerTrueColorResolver?: MapDxfLayerTrueColorResolver;
  /** 要素 TrueColor 解析器。 */
  featureTrueColorResolver?: MapDxfFeatureTrueColorResolver;
}

/** DXF 点导出模式。 */
export type MapDxfPointMode = 'point' | 'circle';

/**
 * DXF 统一几何样式配置。
 * - `lineWidth`：统一控制线和面边界的宽度
 * - `pointMode`：点要素导出模式
 * - `pointRadius`：点要素按圆导出时的半径
 */
export interface MapDxfGeometryStyleOptions {
  /**
   * 统一线宽。
   * 这里直接映射到 LWPOLYLINE 的 constantWidth。
   * 传入 `undefined` 表示不指定线宽，交给 CAD 默认行为处理。
   */
  lineWidth?: number;
  /**
   * 点导出模式。
   * - `point`：按 DXF POINT 导出，遵循 CAD 点样式显示
   * - `circle`：按 DXF CIRCLE 导出，便于跨软件稳定显示
   */
  pointMode?: MapDxfPointMode;
  /**
   * 点半径。
   * 仅在 `pointMode='circle'` 时生效，用于控制圆实体半径。
   */
  pointRadius?: number;
}

/** 单次 DXF 导出任务配置。 */
export interface MapDxfExportTaskOptions extends MapDxfTrueColorRules, MapDxfGeometryStyleOptions {
  /** 需要导出的 sourceId 列表；未传时导出全部业务 source。 */
  sourceIds?: string[] | null;
  /** 导出文件名。 */
  fileName?: string;
  /** 源坐标系。 */
  sourceCrs?: string;
  /** 目标坐标系。 */
  targetCrs?: string;
  /** 要素过滤器。 */
  featureFilter?: MapDxfFeatureFilter;
  /** 图层名解析器。 */
  layerNameResolver?: MapDxfLayerNameResolver;
}

/** 归一化后的 DXF 导出任务配置。 */
export interface ResolvedMapDxfExportTaskOptions extends MapDxfTrueColorRules, MapDxfGeometryStyleOptions {
  /** 最终生效的 sourceId 列表；null 表示全部业务 source。 */
  sourceIds: string[] | null;
  /** 最终生效的导出文件名。 */
  fileName: string;
  /** 最终生效的源坐标系。 */
  sourceCrs?: string;
  /** 最终生效的目标坐标系。 */
  targetCrs?: string;
  /** 最终生效的要素过滤器。 */
  featureFilter?: MapDxfFeatureFilter;
  /** 最终生效的图层名解析器。 */
  layerNameResolver?: MapDxfLayerNameResolver;
  /** 最终生效的点导出模式。 */
  pointMode: MapDxfPointMode;
  /** 最终生效的点半径；仅在 `pointMode='circle'` 时参与导出。 */
  pointRadius?: number;
}

/** DXF 导出结果。 */
export interface MapDxfExportResult {
  /** DXF 文本内容。 */
  content: string;
  /** 本次导出的文件名。 */
  fileName: string;
  /** 本次命中的业务 source 数量。 */
  sourceCount: number;
  /** 本次参与处理的业务要素数量。 */
  featureCount: number;
  /** 本次实际写入 DXF 的实体数量。 */
  entityCount: number;
  /** 本次导出过程中产生的警告。 */
  warnings: string[];
}

/** DXF 导出执行参数。 */
export interface ExportBusinessSourcesToDxfOptions {
  /** 业务数据源注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
  /** 已归一化的导出任务配置。 */
  taskOptions: ResolvedMapDxfExportTaskOptions;
}
