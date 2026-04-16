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
