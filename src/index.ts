export { default as MapLibreInit } from './MapLibre/core/mapLibre-init.vue';
export { default as MglPopup } from './MapLibre/core/mgl-popup.vue';
export type {
  MapFeatureStatePatch,
  MapFeatureStateTarget,
  MapLibreInitExpose,
} from './MapLibre/core/mapLibre-init.types';
export {
  defineMapPlugin,
  type AnyMapPluginDescriptor,
  type MapPluginContext,
  type MapPluginDefinition,
  type MapPluginDescriptor,
  type MapPluginHostExpose,
  type MapPluginInstance,
  type MapPluginRenderItem,
  type MapPluginServices,
  type MapPluginStateChangePayload,
  type MapSelectionBindingController,
  type MapSelectionService,
  type MapSnapBinding,
  type MapSnapService,
  type ResolvedTerradrawSnapOptions,
} from './MapLibre/plugins/types';
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
  TerradrawControlOptions,
  MeasureControlOptions,
  ResolvedMapSelectionToolOptions,
  TerradrawInteractiveContext,
  TerradrawInteractiveOptions,
  TerradrawLineDecorationOptions,
  TerradrawLineDecorationStyle,
  TerradrawLineDecorationResolveContext,
  TerradrawControlType,
  TerradrawFeature,
  TerradrawFeatureId,
  TerradrawManagedControl,
} from './MapLibre/shared/mapLibre-controls-types';
export {
  TERRADRAW_RESERVED_PROPERTY_KEYS,
  TERRADRAW_MEASURE_SYSTEM_PROPERTY_KEYS,
  omitTerradrawReservedProperties,
  removeMapFeatureProperties,
  removeTerradrawFeatureProperties,
  saveFeatureProperties,
  saveMapFeatureProperties,
  saveTerradrawFeatureProperties,
  updateFeatureProperties,
} from './MapLibre/composables/useMapDataUpdate';
export type {
  FeatureProperties,
  MapFeatureId,
  MapFeaturePropertyPolicy,
  RemoveMapFeaturePropertiesOptions,
  RemoveTerradrawFeaturePropertiesOptions,
  SaveFeaturePropertiesOptions,
  SaveMapFeaturePropertiesOptions,
  SaveFeaturePropertiesResult,
  SaveTerradrawFeaturePropertiesOptions,
  UpdateFeaturePropertyOptions,
} from './MapLibre/composables/useMapDataUpdate';
export type {
  MapFeaturePropertyPanelItem,
  MapFeaturePropertyPanelState,
} from './MapLibre/shared/map-feature-data';
export {
  createFeatureStateExpression,
  useMapEffect,
  withFeatureState,
} from './MapLibre/composables/useMapEffect';
export type {
  FeatureStateExpressionOptions,
  MapEffectTargetInput,
  UseMapEffectResult,
} from './MapLibre/composables/useMapEffect';
export {
  getSelectedFeatureIds,
  getSelectedPropertyValues,
  groupSelectedFeaturesByLayer,
} from './MapLibre/composables/mapSelection';
export { useMapSelection, type UseMapSelectionResult } from './MapLibre/composables/useMapSelection';
export {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  type CreateMapBusinessSourceOptions,
  type MapBusinessSource,
  type MapBusinessSourceOptions,
  type MapBusinessSourceProps,
  type MapBusinessSourceRegistry,
} from './MapLibre/facades/createMapBusinessSource';
export { default as MapBusinessSourceLayers } from './MapLibre/facades/MapBusinessSourceLayers.vue';
export {
  createCircleBusinessLayer,
  createFillBusinessLayer,
  createLineBusinessLayer,
  createSymbolBusinessLayer,
  type MapBusinessLayerDescriptor,
  type MapBusinessLayerGeometryType,
  type MapBusinessLayerWhere,
  type MapBusinessLayerWhereValue,
} from './MapLibre/facades/mapBusinessLayer';
export {
  useMapFeatureQuery,
  type ResolveTerradrawPropertyPanelStateOptions,
  type UseMapFeatureQueryOptions,
  type UseMapFeatureQueryResult,
} from './MapLibre/facades/useMapFeatureQuery';
export {
  useMapFeatureActions,
  type MapFeatureActionResult,
  type MapFeatureActionTarget,
  type MapFeatureLineActionResult,
  type MapFeaturePropertyActionResult,
  type PreviewSelectedLineOptions,
  type RemoveBusinessFeaturePropertiesOptions,
  type RemoveTerradrawFeaturePropertiesActionOptions,
  type ReplaceSelectedLineCorridorOptions,
  type SaveBusinessFeaturePropertiesOptions,
  type SaveTerradrawFeaturePropertiesActionOptions,
  type UseMapFeatureActionsOptions,
  type UseMapFeatureActionsResult,
} from './MapLibre/facades/useMapFeatureActions';
export {
  useLineDraftPreview,
  type UseLineDraftPreviewResult,
} from './MapLibre/facades/useLineDraftPreview';
export {
  useMapFeaturePropertyEditor,
  type MapFeaturePropertyEditorActionResult,
  type MapFeaturePropertyEditorMapTarget,
  type MapFeaturePropertyEditorSaveItemPayload,
  type MapFeaturePropertyEditorState,
  type MapFeaturePropertyEditorTarget,
  type MapFeaturePropertyEditorTerradrawTarget,
  type UseMapFeaturePropertyEditorOptions,
  type UseMapFeaturePropertyEditorResult,
} from './MapLibre/facades/useMapFeaturePropertyEditor';
export {
  useBusinessMap,
  type UseBusinessMapFeatureGroup,
  type UseBusinessMapOptions,
  type UseBusinessMapResult,
  type UseBusinessMapSources,
} from './MapLibre/facades/useBusinessMap';
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
export type {
  MapLayerStyle,
  MapLayerStyleOverrides,
} from './MapLibre/shared/map-layer-style-config';
export type {
  MapCommonFeature,
  MapCommonFeatureCollection,
  MapCommonLineFeature,
  MapCommonPolygonFeature,
  MapSourceFeatureRef,
} from './MapLibre/shared/map-common-tools';
