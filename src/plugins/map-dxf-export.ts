/**
 * 地图 DXF 导出插件公开入口。
 * 业务页面从子路径引入 DXF 导出插件时，优先从这里读取能力。
 */

/** 地图 DXF 导出插件工厂。需要向地图注册 DXF 导出能力时使用。 */
export { createMapDxfExportPlugin } from '../MapLibre/plugins/map-dxf-export';

/** 地图 DXF 导出插件实现体。需要直接组合底层插件定义时使用。 */
export { mapDxfExportPlugin } from '../MapLibre/plugins/map-dxf-export';

/** DXF 导出插件类型常量。按插件 type 判断是否为 DXF 导出插件时使用。 */
export { MAP_DXF_EXPORT_PLUGIN_TYPE } from '../MapLibre/plugins/map-dxf-export';

/** DXF 全局默认 CRS 配置。业务层未传 sourceCrs / targetCrs 时会回退到这里。 */
export { DEFAULT_DXF_CRS_OPTIONS } from '../MapLibre/plugins/map-dxf-export';

/** DXF 全局默认 TrueColor 规则。当前只提供统一配置入口，默认不预置业务颜色。 */
export { DEFAULT_DXF_TRUE_COLOR_RULES } from '../MapLibre/plugins/map-dxf-export';

/** DXF 全局默认源坐标系。只需要读取默认来源坐标系时使用。 */
export { DEFAULT_DXF_SOURCE_CRS } from '../MapLibre/plugins/map-dxf-export';

/** DXF 全局默认目标坐标系。只需要读取默认目标坐标系时使用。 */
export { DEFAULT_DXF_TARGET_CRS } from '../MapLibre/plugins/map-dxf-export';

/** DXF 默认导出文件名。需要读取库内兜底文件名时使用。 */
export { DEFAULT_DXF_FILE_NAME } from '../MapLibre/plugins/map-dxf-export';

/** DXF 导出插件描述类型。声明单个 DXF 导出插件配置时使用。 */
export type { MapDxfExportPluginDescriptor } from '../MapLibre/plugins/map-dxf-export';

/** DXF 导出控件配置类型。覆写内置按钮位置和文案时使用。 */
export type { MapDxfExportControlOptions } from '../MapLibre/plugins/map-dxf-export';

/** DXF 导出插件配置类型。初始化 DXF 导出插件时使用。 */
export type { MapDxfExportOptions } from '../MapLibre/plugins/map-dxf-export';

/** DXF 导出插件 API 类型。业务层主动触发导出时使用。 */
export type { MapDxfExportPluginApi } from '../MapLibre/plugins/map-dxf-export';

/** DXF 导出结果类型。读取 DXF 文本和统计信息时使用。 */
export type { MapDxfExportResult } from '../MapLibre/plugins/map-dxf-export';

/** DXF 导出状态类型。读取当前导出状态和最近一次结果时使用。 */
export type { MapDxfExportState } from '../MapLibre/plugins/map-dxf-export';

/** DXF 单次导出任务配置类型。业务层局部覆写导出参数时使用。 */
export type { MapDxfExportTaskOptions } from '../MapLibre/plugins/map-dxf-export';

/** DXF 要素过滤器类型。需要按业务规则筛掉部分要素时使用。 */
export type { MapDxfFeatureFilter } from '../MapLibre/plugins/map-dxf-export';

/** DXF 图层名解析器类型。需要按业务字段自定义图层名时使用。 */
export type { MapDxfLayerNameResolver } from '../MapLibre/plugins/map-dxf-export';

/** DXF TrueColor 类型。当前统一使用 #RRGGBB。 */
export type { MapDxfTrueColor } from '../MapLibre/plugins/map-dxf-export';

/** DXF 图层 TrueColor 解析器类型。需要按最终 DXF 图层设置图层色时使用。 */
export type { MapDxfLayerTrueColorResolver } from '../MapLibre/plugins/map-dxf-export';

/** DXF 要素 TrueColor 解析器类型。需要对少量特殊实体单独着色时使用。 */
export type { MapDxfFeatureTrueColorResolver } from '../MapLibre/plugins/map-dxf-export';

/** DXF TrueColor 规则集合类型。需要一次性声明图层色和要素色策略时使用。 */
export type { MapDxfTrueColorRules } from '../MapLibre/plugins/map-dxf-export';

/** 归一化后的 DXF 导出任务配置类型。读取最终生效参数时使用。 */
export type { ResolvedMapDxfExportTaskOptions } from '../MapLibre/plugins/map-dxf-export';
