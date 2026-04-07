/**
 * 公共几何能力入口。
 * 这里统一对外暴露中立命名，避免业务侧再直接感知历史业务语义命名。
 */
export {
  MapTunnelLineExtensionTool as MapLineExtensionTool,
  MapTunnelRegionTool as MapLineCorridorTool,
  MapLineMeasureTool,
  buildMapSourceFeatureRefKey,
  buildManagedPreviewOriginProperties,
  createMapSourceFeatureRef,
  extractManagedPreviewOriginFromProperties,
  MANAGED_PREVIEW_ORIGIN_FEATURE_ID_PROPERTY,
  MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY,
  MANAGED_PREVIEW_ORIGIN_SOURCE_ID_PROPERTY,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapCommonLineFeature,
  type MapCommonPolygonFeature,
  type MapCommonProperties,
  type MapLineInteractionResolveOptions,
  type MapLineInteractionSnapshot,
  type MapLineLocatedPoint,
  type MapLinePartialMeasureResult,
  type MapLineSegmentSelection,
  type MapSourceFeatureRef,
} from './MapLibre/shared/map-common-tools';
