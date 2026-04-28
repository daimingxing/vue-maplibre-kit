/**
 * 地图吸附插件公开入口。
 * 业务页面从子路径引入吸附插件时，优先从这里找可用能力。
 */

/** 吸附结果空值工厂。需要创建一个标准空吸附结果时使用。 */
export { createEmptyMapFeatureSnapResult } from '../MapLibre/plugins/map-feature-snap';

/** 吸附绑定工厂。需要把普通图层与吸附规则绑定起来时使用。 */
export { createMapFeatureSnapBinding } from '../MapLibre/plugins/map-feature-snap';

/** 地图吸附插件工厂。需要向地图注册吸附能力时使用。 */
export { createMapFeatureSnapPlugin } from '../MapLibre/plugins/map-feature-snap';

/** 地图吸附插件实现体。需要直接组合底层插件定义时使用。 */
export { mapFeatureSnapPlugin } from '../MapLibre/plugins/map-feature-snap';

/** 吸附预览图层组件。需要手动渲染吸附预览时使用。 */
export { MapFeatureSnapPreviewLayers } from '../MapLibre/plugins/map-feature-snap';

/** 吸附插件类型常量。按插件 type 判断是否为吸附插件时使用。 */
export { MAP_FEATURE_SNAP_PLUGIN_TYPE } from '../MapLibre/plugins/map-feature-snap';

/** 吸附预览线图层 ID 常量。需要直接控制吸附线预览图层时使用。 */
export { MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID } from '../MapLibre/plugins/map-feature-snap';

/** 吸附预览点图层 ID 常量。需要直接控制吸附点预览图层时使用。 */
export { MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID } from '../MapLibre/plugins/map-feature-snap';

/** 吸附预览 source ID 常量。需要识别吸附预览来源时使用。 */
export { MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID } from '../MapLibre/plugins/map-feature-snap';

/** 吸附绑定类型。描述一组图层吸附关系时使用。 */
export type { MapFeatureSnapBinding } from '../MapLibre/plugins/map-feature-snap';

/** 吸附插件描述类型。声明单个吸附插件配置时使用。 */
export type { MapFeatureSnapPluginDescriptor } from '../MapLibre/plugins/map-feature-snap';

/** TerraDraw 吸附配置解析结果类型。读取最终生效的 TerraDraw 吸附参数时使用。 */
export type { ResolvedTerradrawSnapOptions } from '../MapLibre/plugins/map-feature-snap';

/** 吸附几何类型。限制某条吸附规则能作用到哪些几何时使用。 */
export type { MapFeatureSnapGeometryType } from '../MapLibre/plugins/map-feature-snap';

/** 吸附类型。区分端点、线段等不同吸附目标时使用。 */
export type { MapFeatureSnapKind } from '../MapLibre/plugins/map-feature-snap';

/** 吸附模式类型。配置吸附行为模式时使用。 */
export type { MapFeatureSnapMode } from '../MapLibre/plugins/map-feature-snap';

/** 吸附插件配置类型。初始化地图吸附插件时使用。 */
export type { MapFeatureSnapOptions } from '../MapLibre/plugins/map-feature-snap';

/** 业务图层吸附配置类型。给业务图层声明吸附规则时使用。 */
export type { MapFeatureSnapBusinessLayerOptions } from '../MapLibre/plugins/map-feature-snap';

/** 旧普通图层吸附配置类型。仅为迁移期兼容，推荐改用 MapFeatureSnapBusinessLayerOptions。 */
export type { MapFeatureSnapOrdinaryLayerOptions } from '../MapLibre/plugins/map-feature-snap';

/** 吸附插件 API 类型。业务层直接调用吸附插件实例时使用。 */
export type { MapFeatureSnapPluginApi } from '../MapLibre/plugins/map-feature-snap';

/** 吸附预览配置类型。覆盖吸附点线预览样式时使用。 */
export type { MapFeatureSnapPreviewOptions } from '../MapLibre/plugins/map-feature-snap';

/** 吸附结果类型。读取一次吸附命中结果时使用。 */
export type { MapFeatureSnapResult } from '../MapLibre/plugins/map-feature-snap';

/** 吸附规则类型。声明单条吸附约束时使用。 */
export type { MapFeatureSnapRule } from '../MapLibre/plugins/map-feature-snap';

/** 吸附规则过滤上下文类型。动态判断规则是否生效时使用。 */
export type { MapFeatureSnapRuleFilterContext } from '../MapLibre/plugins/map-feature-snap';

/** 吸附线段信息类型。需要读取命中线段细节时使用。 */
export type { MapFeatureSnapSegmentInfo } from '../MapLibre/plugins/map-feature-snap';

/** 内置吸附目标配置类型。配置交点或面边线默认吸附规则时使用。 */
export type { MapFeatureSnapTargetOptions } from '../MapLibre/plugins/map-feature-snap';
