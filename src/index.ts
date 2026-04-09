export { default as MapLibreInit } from './MapLibre/core/mapLibre-init.vue';
export { default as MglPopup } from './MapLibre/core/mgl-popup.vue';
export type { MapLibreInitExpose } from './MapLibre/core/mapLibre-init.types';
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
} from './MapLibre/shared/mapLibre-contols-types';
export {
  TERRADRAW_RESERVED_PROPERTY_KEYS,
  omitTerradrawReservedProperties,
  saveFeatureProperties,
  saveMapFeatureProperties,
  saveTerradrawFeatureProperties,
  updateFeatureProperties,
} from './MapLibre/composables/useMapDataUpdate';
export type {
  FeatureProperties,
  FeaturePropertySaveMode,
  MapFeatureId,
  SaveFeaturePropertiesOptions,
  SaveMapFeaturePropertiesOptions,
  SaveFeaturePropertiesResult,
  SaveTerradrawFeaturePropertiesOptions,
  UpdateFeaturePropertyOptions,
} from './MapLibre/composables/useMapDataUpdate';
export { useMapEffect, withFlashColor } from './MapLibre/composables/useMapEffect';
export {
  getSelectedFeatureIds,
  getSelectedPropertyValues,
  groupSelectedFeaturesByLayer,
} from './MapLibre/composables/mapSelection';
export { useMapSelection, type UseMapSelectionResult } from './MapLibre/composables/useMapSelection';
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
