/**
 * 面边线预览插件公开入口。
 * 业务页面从子路径引入面边线插件时，优先从这里找可用能力。
 */

/** 面边线预览插件工厂。需要向地图注册面边线能力时使用。 */
export { createPolygonEdgePreviewPlugin } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线预览插件实现体。需要直接组合底层插件定义时使用。 */
export { polygonEdgePreviewPlugin } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线预览插件类型常量。按插件 type 判断是否为面边线插件时使用。 */
export { POLYGON_EDGE_PREVIEW_PLUGIN_TYPE } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线预览 generatedKind 常量。识别插件生成边线时使用。 */
export { POLYGON_EDGE_PREVIEW_KIND } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线预览线图层 ID 常量。需要配置吸附或交互时使用。 */
export { POLYGON_EDGE_PREVIEW_LINE_LAYER_ID } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线预览 source ID 常量。需要识别临时边线来源时使用。 */
export { POLYGON_EDGE_PREVIEW_SOURCE_ID } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线预览交互上下文类型。业务层处理边线动作时使用。 */
export type { PolygonEdgePreviewContext } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线生成入参类型。从显式面要素生成边线时使用。 */
export type { PolygonEdgePreviewGenerateOptions } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线生成结果类型。读取生成成功与边线数量时使用。 */
export type { PolygonEdgePreviewGenerateResult } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线预览插件配置类型。初始化面边线插件时使用。 */
export type { PolygonEdgePreviewOptions } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线插件 API 类型。业务层直接调用插件实例时使用。 */
export type { PolygonEdgePreviewPluginApi } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线插件描述类型。声明单个面边线插件配置时使用。 */
export type { PolygonEdgePreviewPluginDescriptor } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线简单线样式类型。配置状态样式时使用。 */
export type { PolygonEdgePreviewSimpleLineStyle } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线插件状态类型。监听边线数据变化时使用。 */
export type { PolygonEdgePreviewState } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线状态样式集合类型。配置 normal、hover、selected、highlighted 时使用。 */
export type { PolygonEdgePreviewStateStyles } from '../MapLibre/plugins/polygon-edge-preview';

/** 面边线来源面样式规则类型。按来源面属性定制边线样式时使用。 */
export type { PolygonEdgePreviewStyleRule } from '../MapLibre/plugins/polygon-edge-preview';
