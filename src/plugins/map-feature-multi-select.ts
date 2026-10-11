/**
 * 要素多选插件公开入口。
 * 业务页面从子路径引入多选插件时，优先从这里找可用能力。
 */

/** 要素多选插件工厂。需要向地图注册多选能力时使用。 */
export { createMapFeatureMultiSelectPlugin } from '../MapLibre/plugins/map-feature-multi-select';

/** 要素多选插件实现体。需要直接组合底层插件定义时使用。 */
export { mapFeatureMultiSelectPlugin } from '../MapLibre/plugins/map-feature-multi-select';

/** 要素多选插件类型常量。按插件 type 判断是否为多选插件时使用。 */
export { MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE } from '../MapLibre/plugins/map-feature-multi-select';

/** 要素多选插件配置类型。初始化多选插件时使用。 */
export type { MapFeatureMultiSelectOptions } from '../MapLibre/plugins/map-feature-multi-select';

/** 要素多选插件 API 类型。业务层直接调用多选插件实例时使用。 */
export type { MapFeatureMultiSelectPluginApi } from '../MapLibre/plugins/map-feature-multi-select';

/** 要素多选插件描述类型。声明单个多选插件配置时使用。 */
export type { MapFeatureMultiSelectPluginDescriptor } from '../MapLibre/plugins/map-feature-multi-select';

/** 要素多选状态类型。读取当前多选结果和模式时使用。 */
export type { MapFeatureMultiSelectState } from '../MapLibre/plugins/map-feature-multi-select';

/** 多选手势配置类型。声明 toggle、box、range 开关时使用。 */
export type { MapSelectionGestures } from '../MapLibre/plugins/map-feature-multi-select';

/** 范围解析器类型。由调用方根据通用要素信息返回范围成员。 */
export type { MapSelectionRangeResolver } from '../MapLibre/plugins/map-feature-multi-select';

/** 范围解析结果类型。表示成功成员或拒绝原因。 */
export type { MapSelectionRangeResolveResult } from '../MapLibre/plugins/map-feature-multi-select';

/** 选中集原子替换选项类型。保存或恢复选中集时使用。 */
export type { MapSelectionReplaceOptions } from '../MapLibre/plugins/map-feature-multi-select';

/** 退出多选模式选项类型。现场恢复时应关闭派发。 */
export type { MapSelectionDeactivateOptions } from '../MapLibre/plugins/map-feature-multi-select';

/** 多选 undo 历史类型。用于临时会话保存和恢复编辑现场。 */
export type { MapSelectionUndoHistory } from '../MapLibre/plugins/map-feature-multi-select';
