import { createFeatureStateExpression } from './MapLibre/composables/useMapEffect';
import { createMapBusinessSource, createMapBusinessSourceRegistry } from './MapLibre/facades/createMapBusinessSource';
import {
  createCircleBusinessLayer,
  createFillBusinessLayer,
  createLineBusinessLayer,
  createSymbolBusinessLayer,
} from './MapLibre/facades/mapBusinessLayer';
import {
  createCircleLayerStyle,
  createFillLayerStyle,
  createLineLayerStyle,
  createRasterLayerStyle,
  createSymbolLayerStyle,
} from './MapLibre/shared/map-layer-style-config';
import {
  matchFeatureProperty,
  whenFeaturePropertyEquals,
  whenFeaturePropertyIn,
} from './MapLibre/shared/map-feature-property-expression';

/**
 * 业务页面专用主入口。
 * 真实业务页面优先从该子路径接入，减少在根入口平铺查找能力的心智负担。
 */

/** 地图根组件。业务页面挂载地图时优先使用。 */
export { default as MapLibreInit } from './MapLibre/core/mapLibre-init.vue';

/** 地图弹窗组件。展示业务要素详情或临时操作面板时使用。 */
export { default as MglPopup } from './MapLibre/core/mgl-popup.vue';

/** 自定义控件组件门面。业务层需要插槽挂自定义按钮时使用。 */
export { MglCustomControl } from 'vue-maplibre-gl';

/** 业务 source + 业务图层渲染组件。业务页面声明图层时优先使用。 */
export { default as MapBusinessSourceLayers } from './MapLibre/facades/MapBusinessSourceLayers.vue';

/** 高层业务聚合门面。业务页面优先从这里读取选择、编辑、草稿和动效能力。 */
export { useBusinessMap } from './MapLibre/facades/useBusinessMap';

/** 通用 Popup 状态门面。业务页面管理弹窗显隐与载荷时优先使用。 */
export { useMapPopupState } from './MapLibre/facades/useMapPopupState';

/** DXF 导出插件 API 解析工具。业务页面主动读取 DXF 导出能力时使用。 */
export { resolveMapDxfExportApi } from './MapLibre/facades/mapPluginResolver';

/** 单个业务数据源工厂。 */
export { createMapBusinessSource } from './MapLibre/facades/createMapBusinessSource';

/** 多业务数据源注册表工厂。 */
export { createMapBusinessSourceRegistry } from './MapLibre/facades/createMapBusinessSource';

/** 点业务图层工厂。 */
export { createCircleBusinessLayer } from './MapLibre/facades/mapBusinessLayer';

/** 面业务图层工厂。 */
export { createFillBusinessLayer } from './MapLibre/facades/mapBusinessLayer';

/** 线业务图层工厂。 */
export { createLineBusinessLayer } from './MapLibre/facades/mapBusinessLayer';

/** 符号业务图层工厂。 */
export { createSymbolBusinessLayer } from './MapLibre/facades/mapBusinessLayer';

/** 点图层样式工厂。 */
export { createCircleLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 面图层样式工厂。 */
export { createFillLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 线图层样式工厂。 */
export { createLineLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 栅格图层样式工厂。 */
export { createRasterLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 符号图层样式工厂。 */
export { createSymbolLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** feature-state 表达式工厂。 */
export { createFeatureStateExpression } from './MapLibre/composables/useMapEffect';

/** 属性等值表达式工厂。 */
export { whenFeaturePropertyEquals } from './MapLibre/shared/map-feature-property-expression';

/** 属性多值命中表达式工厂。 */
export { whenFeaturePropertyIn } from './MapLibre/shared/map-feature-property-expression';

/** 属性映射表达式工厂。 */
export { matchFeatureProperty } from './MapLibre/shared/map-feature-property-expression';

/** 业务 source 高频工厂分组。 */
export const businessSources = {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
} as const;

/** 业务图层高频工厂分组。 */
export const businessLayers = {
  createCircleBusinessLayer,
  createFillBusinessLayer,
  createLineBusinessLayer,
  createSymbolBusinessLayer,
} as const;

/** 业务图层样式工厂分组。 */
export const layerStyles = {
  createCircleLayerStyle,
  createFillLayerStyle,
  createLineLayerStyle,
  createRasterLayerStyle,
  createSymbolLayerStyle,
} as const;

/** 业务表达式工具分组。 */
export const mapExpressions = {
  createFeatureStateExpression,
  whenFeaturePropertyEquals,
  whenFeaturePropertyIn,
  matchFeatureProperty,
} as const;

/** 地图控件总配置类型。 */
export type { MapControlsConfig } from './MapLibre/shared/mapLibre-controls-types';

/** 图层交互上下文类型。 */
export type { MapLayerInteractiveContext } from './MapLibre/shared/mapLibre-controls-types';

/** 图层交互总配置类型。 */
export type { MapLayerInteractiveOptions } from './MapLibre/shared/mapLibre-controls-types';

/** 当前被选中的图层要素类型。 */
export type { MapLayerSelectedFeature } from './MapLibre/shared/mapLibre-controls-types';

/** 选中态变化上下文类型。 */
export type { MapLayerSelectionChangeContext } from './MapLibre/shared/mapLibre-controls-types';

/** 选中图层分组类型。 */
export type { MapSelectionLayerGroup } from './MapLibre/shared/mapLibre-controls-types';

/** 选中模式类型。 */
export type { MapSelectionMode } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 交互上下文类型。 */
export type { TerradrawInteractiveContext } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 线装饰样式类型。 */
export type { TerradrawLineDecorationStyle } from './MapLibre/shared/mapLibre-controls-types';

/** 地图根组件公开实例类型。 */
export type { MapLibreInitExpose } from './MapLibre/core/mapLibre-init.types';

/** 地图初始化配置类型。业务层声明 mapOptions 时优先使用。 */
export type { MapOptions } from 'maplibre-gl';

/** feature-state 目标类型。 */
export type { MapFeatureStateTarget } from './MapLibre/core/mapLibre-init.types';

/** 属性治理规则类型。 */
export type { MapFeaturePropertyPolicy } from './MapLibre/composables/useMapDataUpdate';

/** 属性面板状态类型。 */
export type { MapFeaturePropertyPanelState } from './MapLibre/shared/map-feature-data';

/** 统一属性编辑器状态类型。 */
export type { MapFeaturePropertyEditorState } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 统一属性编辑目标类型。 */
export type { MapFeaturePropertyEditorTarget } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 高层业务聚合门面返回类型。 */
export type { UseBusinessMapResult } from './MapLibre/facades/useBusinessMap';

/** 业务层友好的单条要素上下文类型。 */
export type { MapBusinessFeatureContext } from './MapLibre/facades/useMapFeatureQuery';

/** 业务层友好的选中项类型。 */
export type { MapBusinessSelectionItem } from './MapLibre/facades/useMapFeatureQuery';

/** 业务层友好的选中集变化触发目标类型。 */
export type { MapBusinessSelectionTrigger } from './MapLibre/facades/useMapFeatureQuery';

/** 业务层友好的选中集变化上下文类型。 */
export type { MapBusinessSelectionContext } from './MapLibre/facades/useMapFeatureQuery';

/** 通用 Popup 状态门面返回类型。 */
export type { UseMapPopupStateResult } from './MapLibre/facades/useMapPopupState';
