/**
 * 交点预览插件公开入口。
 * 业务页面从子路径引入交点插件时，优先从这里找可用能力。
 */

/** 交点预览插件工厂。需要向地图注册交点能力时使用。 */
export { createIntersectionPreviewPlugin } from '../MapLibre/plugins/intersection-preview';

/** 交点候选线构建工具。需要从业务 source data 提取参与求交的线时使用。 */
export {
  buildIntersectionCandidates,
  buildIntersectionCandidatesFromSources,
} from '../MapLibre/plugins/intersection-preview';

/** 交点预览 generatedKind 常量。识别预览交点要素时使用。 */
export { INTERSECTION_PREVIEW_KIND } from '../MapLibre/plugins/intersection-preview';

/** 正式交点 generatedKind 常量。识别已落点交点要素时使用。 */
export { INTERSECTION_MATERIALIZED_KIND } from '../MapLibre/plugins/intersection-preview';

/** 交点预览插件实现体。需要直接组合底层插件定义时使用。 */
export { intersectionPreviewPlugin } from '../MapLibre/plugins/intersection-preview';

/** 交点预览图层 ID 常量。需要直接控制交点图层时使用。 */
export { INTERSECTION_PREVIEW_LAYER_ID } from '../MapLibre/plugins/intersection-preview';

/** 正式交点点图层 ID 常量。需要识别正式交点点图层时使用。 */
export { INTERSECTION_MATERIALIZED_LAYER_ID } from '../MapLibre/plugins/intersection-preview';

/** 交点预览插件类型常量。按插件 type 判断是否为交点插件时使用。 */
export { INTERSECTION_PREVIEW_PLUGIN_TYPE } from '../MapLibre/plugins/intersection-preview';

/** 交点预览 source ID 常量。需要识别交点预览来源时使用。 */
export { INTERSECTION_PREVIEW_SOURCE_ID } from '../MapLibre/plugins/intersection-preview';

/** 正式交点点 source ID 常量。需要识别正式交点点来源时使用。 */
export { INTERSECTION_MATERIALIZED_SOURCE_ID } from '../MapLibre/plugins/intersection-preview';

/** 交点预览上下文类型。业务层处理交点动作时使用。 */
export type { IntersectionPreviewContext } from '../MapLibre/plugins/intersection-preview';

/** 交点预览插件配置类型。初始化交点插件时使用。 */
export type { IntersectionPreviewOptions } from '../MapLibre/plugins/intersection-preview';

/** 正式交点默认属性解析器类型。需要定制落点属性时使用。 */
export type {
  IntersectionPreviewMaterializedProperties,
} from '../MapLibre/plugins/intersection-preview';

/** 交点预览插件 API 类型。业务层直接调用交点插件实例时使用。 */
export type { IntersectionPreviewPluginApi } from '../MapLibre/plugins/intersection-preview';

/** 交点预览求交范围类型。区分 all 与 selected 时使用。 */
export type { IntersectionPreviewScope } from '../MapLibre/plugins/intersection-preview';

/** 交点预览状态类型。监听交点状态变化时使用。 */
export type { IntersectionPreviewState } from '../MapLibre/plugins/intersection-preview';

/** 交点图层样式覆写类型。需要定制预览点 / 正式点样式时使用。 */
export type {
  IntersectionPreviewStateStyle,
  IntersectionPreviewStateStyles,
  IntersectionPreviewStyleOverrides,
} from '../MapLibre/plugins/intersection-preview';

/** 交点候选来源类型。声明 sourceId、layerId 和 data 时使用。 */
export type { MapIntersectionSource } from '../MapLibre/plugins/intersection-preview';
