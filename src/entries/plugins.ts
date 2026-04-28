/**
 * 插件聚合入口。
 * 业务页面需要注册常用插件时，优先从 `vue-maplibre-kit/plugins` 引入。
 * 单插件子路径仍保留给高级按需接入场景。
 */

/** 常用业务插件预设工厂。 */
export { createBusinessPlugins } from '../MapLibre/facades/businessPreset';

/** 常用业务插件预设配置类型。 */
export type {
  BusinessPluginsOptions,
  BusinessSnapPresetOptions,
} from '../MapLibre/facades/businessPreset';

/** 吸附插件工厂、常量和类型。 */
export * from '../plugins/map-feature-snap';

/** 线草稿插件工厂、常量和类型。 */
export * from '../plugins/line-draft-preview';

/** 交点插件工厂、常量和类型。 */
export * from '../plugins/intersection-preview';

/** 面边线预览插件工厂、常量和类型。 */
export * from '../plugins/polygon-edge-preview';

/** 多选插件工厂、常量和类型。 */
export * from '../plugins/map-feature-multi-select';

/** DXF 导出插件工厂、常量和类型。 */
export * from '../plugins/map-dxf-export';
