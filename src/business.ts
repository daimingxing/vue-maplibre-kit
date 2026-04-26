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
  createSimpleCircleStyle,
  createSimpleFillStyle,
  createSimpleLineStyle,
} from './MapLibre/facades/businessPreset';
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

/** 线草稿门面。业务页面直接读取线草稿状态和清空动作时使用。 */
export { useLineDraftPreview } from './MapLibre/facades/useLineDraftPreview';

/** 交点门面。业务页面直接读取交点状态和交点动作时使用。 */
export { useIntersectionPreview } from './MapLibre/facades/useIntersectionPreview';

/** 多选插件门面。业务页面直接读取多选状态和动作时使用。 */
export { useMapFeatureMultiSelect } from './MapLibre/facades/useMapFeatureMultiSelect';

/** 图层运行时动作门面。业务页面需要临时修改图层显隐、样式或 feature-state 时使用。 */
export { useMapLayerActions } from './MapLibre/facades/useMapLayerActions';

/** 通用 Popup 状态门面。业务页面管理弹窗显隐与载荷时优先使用。 */
export { useMapPopupState } from './MapLibre/facades/useMapPopupState';

/** DXF 导出插件 API 解析工具。业务页面主动读取 DXF 导出能力时使用。 */
export { resolveMapDxfExportApi } from './MapLibre/facades/mapPluginResolver';

/** 线草稿、交点、多选等插件 API 解析工具。高级业务页面主动读取插件能力时使用。 */
export {
  resolveIntersectionPreviewApi,
  resolveIntersectionPreviewState,
  resolveLineDraftPreviewApi,
  resolveLineDraftPreviewState,
  resolveMapFeatureMultiSelectApi,
  resolveMapFeatureMultiSelectState,
} from './MapLibre/facades/mapPluginResolver';

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

/** 简单线样式工厂。 */
export { createSimpleLineStyle } from './MapLibre/facades/businessPreset';

/** 简单点样式工厂。 */
export { createSimpleCircleStyle } from './MapLibre/facades/businessPreset';

/** 简单面样式工厂。 */
export { createSimpleFillStyle } from './MapLibre/facades/businessPreset';

/** 业务图层组工厂。 */
export { createLayerGroup } from './MapLibre/facades/businessPreset';

/** 地图控件预设工厂。 */
export { createMapControlsPreset } from './MapLibre/facades/businessPreset';

/** 常用业务插件预设工厂。 */
export { createBusinessPlugins } from './MapLibre/facades/businessPreset';

/** 交点转正式点要素工具。 */
export { buildIntersectionPointFeature } from './MapLibre/shared/map-intersection-tools';

/** 交点候选线构建工具。 */
export { buildIntersectionCandidates } from './MapLibre/shared/map-intersection-tools';

/** 正式交点点要素构建工具。 */
export { buildMaterializedIntersectionFeature } from './MapLibre/shared/map-intersection-tools';

/** 业务线交点计算工具。 */
export { collectLineIntersections } from './MapLibre/shared/map-intersection-tools';

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
  createSimpleLineStyle,
  createSimpleCircleStyle,
  createSimpleFillStyle,
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

/** 通用 GeoJSON 要素类型。业务层需要处理普通业务要素快照时使用。 */
export type { MapCommonFeature } from './MapLibre/shared/map-common-tools';

/** 通用 GeoJSON 要素集合类型。业务层需要处理 FeatureCollection 时使用。 */
export type { MapCommonFeatureCollection } from './MapLibre/shared/map-common-tools';

/** 通用线要素类型。业务层只处理线数据时使用。 */
export type { MapCommonLineFeature } from './MapLibre/shared/map-common-tools';

/** 通用属性对象类型。业务层需要描述 GeoJSON properties 时使用。 */
export type { MapCommonProperties } from './MapLibre/shared/map-common-tools';

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

/** 地图根组件底层逃生句柄类型。 */
export type { MapLibreRawHandles } from './MapLibre/core/mapLibre-init.types';

/** 地图初始化配置类型。业务层声明 mapOptions 时优先使用。 */
export type { MapOptions } from 'maplibre-gl';

/** 业务要素 ID 类型。业务层维护表格行、表单和图层要素关联时使用。 */
export type { MapFeatureId } from './MapLibre/composables/useMapDataUpdate';

/** feature-state 目标类型。 */
export type { MapFeatureStateTarget } from './MapLibre/core/mapLibre-init.types';

/** 属性治理规则类型。 */
export type { MapFeaturePropertyPolicy } from './MapLibre/composables/useMapDataUpdate';

/** 属性面板单项类型。业务层自定义属性编辑器列表时使用。 */
export type { MapFeaturePropertyPanelItem } from './MapLibre/shared/map-feature-data';

/** 属性面板状态类型。 */
export type { MapFeaturePropertyPanelState } from './MapLibre/shared/map-feature-data';

/** 统一属性编辑器状态类型。 */
export type { MapFeaturePropertyEditorState } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 统一属性编辑目标类型。 */
export type { MapFeaturePropertyEditorTarget } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 高层业务聚合门面返回类型。 */
export type { UseBusinessMapResult } from './MapLibre/facades/useBusinessMap';

/** 线草稿门面返回类型。 */
export type { UseLineDraftPreviewResult } from './MapLibre/facades/useLineDraftPreview';

/** 交点门面返回类型。 */
export type { UseIntersectionPreviewResult } from './MapLibre/facades/useIntersectionPreview';

/** 多选插件门面返回类型。 */
export type { UseMapFeatureMultiSelectResult } from './MapLibre/facades/useMapFeatureMultiSelect';

/** 图层运行时动作门面返回类型。 */
export type {
  MapLayerActionResult,
  UseMapLayerActionsResult,
} from './MapLibre/facades/useMapLayerActions';

/** 业务预设工厂相关类型。 */
export type {
  BusinessPluginsOptions,
  BusinessSnapPresetOptions,
  LayerGroupItem,
  LayerGroupOptions,
  MapControlsPresetName,
  SimpleCircleStyleOptions,
  SimpleFillStyleOptions,
  SimpleLineStyleOptions,
} from './MapLibre/facades/businessPreset';

/** 业务层友好的单条要素上下文类型。 */
export type { MapBusinessFeatureContext } from './MapLibre/facades/useMapFeatureQuery';

/** 业务层友好的选中项类型。 */
export type { MapBusinessSelectionItem } from './MapLibre/facades/useMapFeatureQuery';

/** 业务层友好的选中集变化触发目标类型。 */
export type { MapBusinessSelectionTrigger } from './MapLibre/facades/useMapFeatureQuery';

/** 业务层友好的选中集变化上下文类型。 */
export type { MapBusinessSelectionContext } from './MapLibre/facades/useMapFeatureQuery';

/** 交点收集配置类型。 */
export type { CollectLineIntersectionsOptions } from './MapLibre/shared/map-intersection-tools';

/** 交点求交范围类型。 */
export type { IntersectionScope } from './MapLibre/shared/map-intersection-tools';

/** 交点候选线类型。 */
export type { MapIntersectionCandidate } from './MapLibre/shared/map-intersection-tools';

/** 交点候选来源类型。 */
export type { MapIntersectionSource } from './MapLibre/shared/map-intersection-tools';

/** 交点领域对象类型。 */
export type { MapIntersectionPoint } from './MapLibre/shared/map-intersection-tools';

/** 交点预览上下文类型。 */
export type { IntersectionPreviewContext } from './MapLibre/plugins/intersection-preview';

/** 交点预览插件配置类型。 */
export type { IntersectionPreviewOptions } from './MapLibre/plugins/intersection-preview';

/** 交点状态样式片段与状态样式配置类型。 */
export type {
  IntersectionPreviewStateStyle,
  IntersectionPreviewStateStyles,
} from './MapLibre/plugins/intersection-preview';

/** 交点预览插件 API 类型。 */
export type { IntersectionPreviewPluginApi } from './MapLibre/plugins/intersection-preview';

/** 交点预览求交范围类型。 */
export type { IntersectionPreviewScope } from './MapLibre/plugins/intersection-preview';

/** 交点预览状态类型。 */
export type { IntersectionPreviewState } from './MapLibre/plugins/intersection-preview';

/** 通用 Popup 状态门面返回类型。 */
export type { UseMapPopupStateResult } from './MapLibre/facades/useMapPopupState';

/** 业务 source 类型。业务层需要复用 source 结构或编写辅助函数时使用。 */
export type { MapBusinessSource } from './MapLibre/facades/createMapBusinessSource';

/** 业务 source 注册表类型。业务层封装页面级 source 集合时使用。 */
export type { MapBusinessSourceRegistry } from './MapLibre/facades/createMapBusinessSource';

/** 业务图层描述类型。业务层抽取图层声明模板时使用。 */
export type { MapBusinessLayerDescriptor } from './MapLibre/facades/mapBusinessLayer';

/** 标准来源引用类型。业务层在弹窗、表格和属性编辑器之间传递要素目标时使用。 */
export type { MapSourceFeatureRef } from './MapLibre/shared/map-common-tools';
