import type { MapDxfExportTaskOptions, MapDxfTrueColorRules } from './types';

/** DXF 全局默认源坐标系。 */
export const DEFAULT_DXF_SOURCE_CRS = 'EPSG:4326';

/** DXF 全局默认目标坐标系。 */
export const DEFAULT_DXF_TARGET_CRS = 'EPSG:3857';

/**
 * DXF 全局默认 CRS 配置。
 * 业务层未显式传入 sourceCrs / targetCrs 时，会优先回退到这里。
 */
export const DEFAULT_DXF_CRS_OPTIONS: Readonly<
  Pick<MapDxfExportTaskOptions, 'sourceCrs' | 'targetCrs'>
> = Object.freeze({
  sourceCrs: DEFAULT_DXF_SOURCE_CRS,
  targetCrs: DEFAULT_DXF_TARGET_CRS,
});

/**
 * DXF 全局默认 TrueColor 规则。
 * 这里先只预留统一维护入口，不预置任何业务颜色逻辑。
 */
export const DEFAULT_DXF_TRUE_COLOR_RULES: Readonly<MapDxfTrueColorRules> = Object.freeze({});
