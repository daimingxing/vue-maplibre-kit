/**
 * vue-maplibre-kit 根入口。
 * 推荐业务页面优先按下面顺序找能力：
 * 1. `useBusinessMap`：高频业务能力聚合入口
 * 2. `createMapBusinessSource` / `createMapBusinessSourceRegistry`：业务数据源门面
 * 3. `createCircleBusinessLayer` 等：业务图层描述门面
 * 4. `useMapFeatureQuery` / `useMapFeatureActions` / `useMapFeaturePropertyEditor`：按需拆开的低层业务门面
 */

/**
 * 地图根组件。
 * 业务页面通常先挂载它，再继续接入业务 source、插件和各类门面。
 */
export { default as MapLibreInit } from './MapLibre/core/mapLibre-init.vue';

/**
 * 地图弹窗组件。
 * 适合承载点击点位、hover 要素等轻量信息展示。
 */
export { default as MglPopup } from './MapLibre/core/mgl-popup.vue';

/** 地图公开实例与 feature-state 相关类型。 */
export type {
  MapFeatureStatePatch,
  MapFeatureStateTarget,
  MapLibreInitExpose,
} from './MapLibre/core/mapLibre-init.types';

/**
 * 地图插件定义入口。
 * 当业务层需要扩展自定义插件时，从这里开始声明插件即可。
 */
export { defineMapPlugin } from './MapLibre/plugins/types';

/** 地图插件体系配套类型。 */
export type {
  AnyMapPluginDescriptor,
  MapPluginContext,
  MapPluginDefinition,
  MapPluginDescriptor,
  MapPluginHostExpose,
  MapPluginInstance,
  MapPluginRenderItem,
  MapPluginServices,
  MapPluginStateChangePayload,
  MapSelectionBindingController,
  MapSelectionService,
  MapSnapBinding,
  MapSnapService,
  ResolvedTerradrawSnapOptions,
} from './MapLibre/plugins/types';

/** 地图交互、TerraDraw 与选中态相关公共类型。 */
export type {
  MapControlsConfig,
  MapLayerInteractiveContext,
  MapLayerInteractiveLayerOptions,
  MapLayerInteractiveOptions,
  MapLayerSelectedFeature,
  MapLayerSelectionChangeContext,
  MapSelectionChangeReason,
  MapSelectionDeactivateBehavior,
  MapSelectionLayerGroup,
  MapSelectionFilterContext,
  MapSelectionMode,
  MapSelectionQueryOptions,
  MapSelectionState,
  MapSelectionToolOptions,
  MeasureControlOptions,
  ResolvedMapSelectionToolOptions,
  TerradrawControlOptions,
  TerradrawControlType,
  TerradrawFeature,
  TerradrawFeatureId,
  TerradrawInteractiveContext,
  TerradrawInteractiveOptions,
  TerradrawLineDecorationOptions,
  TerradrawLineDecorationResolveContext,
  TerradrawLineDecorationStyle,
  TerradrawManagedControl,
} from './MapLibre/shared/mapLibre-controls-types';

/**
 * 地图 feature-state 特效门面。
 * 闪烁、高亮、状态表达式等页面效果可以从这里取能力。
 */
export {
  createFeatureStateExpression,
  useMapEffect,
  withFeatureState,
} from './MapLibre/composables/useMapEffect';

/** feature-state 特效相关配套类型。 */
export type {
  FeatureStateExpressionOptions,
  MapEffectTargetInput,
  UseMapEffectResult,
} from './MapLibre/composables/useMapEffect';

/**
 * 普通图层选中态门面。
 * 进入多选、退出多选、读取选中集合时优先使用它。
 */
export { useMapSelection } from './MapLibre/composables/useMapSelection';

/** 普通图层选中态配套类型。 */
export type { UseMapSelectionResult } from './MapLibre/composables/useMapSelection';

/**
 * 选中态辅助函数集合。
 * 适合在已拿到选中结果后做轻量提取与分组。
 */
export {
  getSelectedFeatureIds,
  getSelectedPropertyValues,
  groupSelectedFeaturesByLayer,
} from './MapLibre/composables/mapSelection';

/**
 * 原始 GeoJSON 属性写回工具集合。
 * 只有在业务门面不够用、需要直接处理底层属性保存逻辑时再使用。
 */
export {
  TERRADRAW_MEASURE_SYSTEM_PROPERTY_KEYS,
  TERRADRAW_RESERVED_PROPERTY_KEYS,
  omitTerradrawReservedProperties,
  removeMapFeatureProperties,
  removeTerradrawFeatureProperties,
  saveFeatureProperties,
  saveMapFeatureProperties,
  saveTerradrawFeatureProperties,
  updateFeatureProperties,
} from './MapLibre/composables/useMapDataUpdate';

/** 原始 GeoJSON 属性写回相关类型。 */
export type {
  FeatureProperties,
  MapFeatureId,
  MapFeaturePropertyPolicy,
  RemoveMapFeaturePropertiesOptions,
  RemoveTerradrawFeaturePropertiesOptions,
  SaveFeaturePropertiesOptions,
  SaveFeaturePropertiesResult,
  SaveMapFeaturePropertiesOptions,
  SaveTerradrawFeaturePropertiesOptions,
  UpdateFeaturePropertyOptions,
} from './MapLibre/composables/useMapDataUpdate';

/** 属性面板渲染结构类型。 */
export type {
  MapFeaturePropertyPanelItem,
  MapFeaturePropertyPanelState,
} from './MapLibre/shared/map-feature-data';

/**
 * 业务数据源创建入口。
 * 业务页面需要把 GeoJSON 数据包装成稳定 source 门面时，从这里开始。
 */
export {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
} from './MapLibre/facades/createMapBusinessSource';

/** 业务数据源门面配套类型。 */
export type {
  CreateMapBusinessSourceOptions,
  MapBusinessSource,
  MapBusinessSourceOptions,
  MapBusinessSourceProps,
  MapBusinessSourceRegistry,
} from './MapLibre/facades/createMapBusinessSource';

/**
 * 业务 source 图层组件。
 * 适合把 `createMapBusinessSource` 和业务图层描述直接渲染到页面上。
 */
export { default as MapBusinessSourceLayers } from './MapLibre/facades/MapBusinessSourceLayers.vue';

/**
 * 业务图层描述创建入口。
 * 业务层可以用这些工厂函数声明 point/line/fill/symbol 图层，而不必手写完整 MapLibre 图层结构。
 */
export {
  createCircleBusinessLayer,
  createFillBusinessLayer,
  createLineBusinessLayer,
  createSymbolBusinessLayer,
} from './MapLibre/facades/mapBusinessLayer';

/** 业务图层描述与过滤条件相关类型。 */
export type {
  MapBusinessLayerDescriptor,
  MapBusinessLayerGeometryType,
  MapBusinessLayerWhere,
  MapBusinessLayerWhereValue,
} from './MapLibre/facades/mapBusinessLayer';

/**
 * 地图要素查询门面。
 * 适合读取当前选中要素、来源引用和属性面板态。
 */
export { useMapFeatureQuery } from './MapLibre/facades/useMapFeatureQuery';

/** 地图要素查询门面配套类型。 */
export type {
  ResolveTerradrawPropertyPanelStateOptions,
  UseMapFeatureQueryOptions,
  UseMapFeatureQueryResult,
} from './MapLibre/facades/useMapFeatureQuery';

/**
 * 地图要素动作门面。
 * 保存属性、删除属性、生成线草稿、替换线廊等动作都从这里取。
 */
export { useMapFeatureActions } from './MapLibre/facades/useMapFeatureActions';

/** 地图要素动作门面配套类型。 */
export type {
  MapFeatureActionResult,
  MapFeatureActionTarget,
  MapFeatureLineActionResult,
  MapFeaturePropertyActionResult,
  PreviewSelectedLineOptions,
  RemoveBusinessFeaturePropertiesOptions,
  RemoveTerradrawFeaturePropertiesActionOptions,
  ReplaceSelectedLineCorridorOptions,
  SaveBusinessFeaturePropertiesOptions,
  SaveTerradrawFeaturePropertiesActionOptions,
  UseMapFeatureActionsOptions,
  UseMapFeatureActionsResult,
} from './MapLibre/facades/useMapFeatureActions';

/**
 * 统一属性编辑门面。
 * 适合用“当前编辑目标 + 单键保存/删除”的方式驱动属性面板。
 */
export { useMapFeaturePropertyEditor } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 统一属性编辑门面配套类型。 */
export type {
  MapFeaturePropertyEditorActionResult,
  MapFeaturePropertyEditorMapTarget,
  MapFeaturePropertyEditorSaveItemPayload,
  MapFeaturePropertyEditorState,
  MapFeaturePropertyEditorTarget,
  MapFeaturePropertyEditorTerradrawTarget,
  UseMapFeaturePropertyEditorOptions,
  UseMapFeaturePropertyEditorResult,
} from './MapLibre/facades/useMapFeaturePropertyEditor';

/**
 * 线草稿门面。
 * 业务层需要读取线草稿状态、数量或手动清理草稿时使用。
 */
export { useLineDraftPreview } from './MapLibre/facades/useLineDraftPreview';

/** 线草稿门面配套类型。 */
export type { UseLineDraftPreviewResult } from './MapLibre/facades/useLineDraftPreview';

/**
 * 高层业务聚合门面。
 * 如果业务页只是想尽快开始开发，通常优先从它进入，而不是自己拼多个低层门面。
 */
export { useBusinessMap } from './MapLibre/facades/useBusinessMap';

/** 高层业务聚合门面配套类型。 */
export type {
  UseBusinessMapFeatureGroup,
  UseBusinessMapOptions,
  UseBusinessMapResult,
  UseBusinessMapSources,
} from './MapLibre/facades/useBusinessMap';

/**
 * 图层样式工厂集合。
 * 需要快速生成 circle/line/fill/symbol/raster 样式时使用。
 */
export {
  createCircleLayerStyle,
  createFillLayerStyle,
  createLineLayerStyle,
  createRasterLayerStyle,
  createSymbolLayerStyle,
  defaultCircleLayerStyle,
  defaultFillLayerStyle,
  defaultLineLayerStyle,
  defaultRasterLayerStyle,
  defaultSymbolLayerStyle,
} from './MapLibre/shared/map-layer-style-config';

/** 图层样式工厂配套类型。 */
export type {
  MapLayerStyle,
  MapLayerStyleOverrides,
} from './MapLibre/shared/map-layer-style-config';

/** 公共 GeoJSON 要素与标准来源引用类型。 */
export type {
  MapCommonFeature,
  MapCommonFeatureCollection,
  MapCommonLineFeature,
  MapCommonPolygonFeature,
  MapSourceFeatureRef,
} from './MapLibre/shared/map-common-tools';
