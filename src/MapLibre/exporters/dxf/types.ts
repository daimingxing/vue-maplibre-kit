import type { MapBusinessSourceRegistry } from '../../facades/createMapBusinessSource';
import type { MapCommonFeature } from '../../shared/map-common-tools';

/** DXF 默认导出文件名。 */
export const DEFAULT_DXF_FILE_NAME = 'map-export.dxf';

/** DXF 全局默认源坐标系。 */
export const DEFAULT_DXF_SOURCE_CRS = 'EPSG:4326';

/** DXF 全局默认目标坐标系。 */
export const DEFAULT_DXF_TARGET_CRS = 'EPSG:3857';

/** DXF 要素过滤函数。 */
export type MapDxfFeatureFilter = (feature: MapCommonFeature, sourceId: string) => boolean;

/** DXF 图层名解析函数。 */
export type MapDxfLayerNameResolver = (feature: MapCommonFeature, sourceId: string) => string;

/** 单次 DXF 导出任务配置。 */
export interface MapDxfExportTaskOptions {
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
export interface ResolvedMapDxfExportTaskOptions {
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
}

/** DXF 全局默认 CRS 配置。业务层未传时回退到这里。 */
export const DEFAULT_DXF_CRS_OPTIONS: Readonly<
  Pick<MapDxfExportTaskOptions, 'sourceCrs' | 'targetCrs'>
> = Object.freeze({
  sourceCrs: DEFAULT_DXF_SOURCE_CRS,
  targetCrs: DEFAULT_DXF_TARGET_CRS,
});

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
