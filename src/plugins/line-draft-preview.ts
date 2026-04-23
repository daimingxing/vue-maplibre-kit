/**
 * 线草稿插件公开入口。
 * 业务页面从子路径引入线草稿插件时，优先从这里找可用能力。
 */

/** 线草稿插件工厂。需要向地图注册线草稿能力时使用。 */
export { createLineDraftPreviewPlugin } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿插件实现体。需要直接组合底层插件定义时使用。 */
export { lineDraftPreviewPlugin } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿线廊类型常量。识别草稿生成的区域要素时使用。 */
export { LINE_DRAFT_PREVIEW_CORRIDOR_KIND } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿填充图层 ID 常量。需要直接控制草稿面图层时使用。 */
export { LINE_DRAFT_PREVIEW_FILL_LAYER_ID } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿线图层 ID 常量。需要直接控制草稿线图层时使用。 */
export { LINE_DRAFT_PREVIEW_LINE_LAYER_ID } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿插件类型常量。按插件 type 判断是否为线草稿插件时使用。 */
export { LINE_DRAFT_PREVIEW_PLUGIN_TYPE } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿 source ID 常量。需要识别线草稿来源时使用。 */
export { LINE_DRAFT_PREVIEW_SOURCE_ID } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿插件 API 类型。业务层直接调用草稿插件实例时使用。 */
export type { LineDraftPreviewPluginApi } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿插件描述类型。声明单个线草稿插件配置时使用。 */
export type { LineDraftPreviewPluginDescriptor } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿状态变更载荷类型。监听线草稿状态变化时使用。 */
export type { LineDraftPreviewStateChangePayload } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿填充样式覆盖类型。只想覆盖草稿面样式的一部分时使用。 */
export type { LineDraftPreviewFillStyleOverrides } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿线样式覆盖类型。只想覆盖草稿线样式的一部分时使用。 */
export type { LineDraftPreviewLineStyleOverrides } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿插件配置类型。初始化线草稿插件时使用。 */
export type { LineDraftPreviewOptions } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿样式覆盖总类型。统一声明草稿线和草稿面的样式覆盖时使用。 */
export type { LineDraftPreviewStyleOverrides } from '../MapLibre/plugins/line-draft-preview';

/** 线草稿交互上下文类型。处理草稿线 hover / click 事件时使用。 */
export type { LineDraftPreviewContext } from '../MapLibre/plugins/line-draft-preview';
