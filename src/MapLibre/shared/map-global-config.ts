import {
  getMapGlobalConfig,
  type IntersectionPreviewGlobalDefaults,
  type LineDraftPreviewGlobalDefaults,
  type MapDxfExportGlobalDefaults,
  type MapFeatureMultiSelectGlobalDefaults,
  type MapFeatureSnapGlobalDefaults,
  type MapKitGlobalConfig,
  type PolygonEdgePreviewGlobalDefaults,
} from '../../config';

/** 全局样式默认值类型键。 */
export type MapGlobalStyleKind = keyof NonNullable<MapKitGlobalConfig['styles']>;

/**
 * 读取地图初始化全局默认配置。
 * @returns 地图初始化全局默认配置；未注册时返回空对象
 */
export function getMapGlobalMapOptions(): NonNullable<MapKitGlobalConfig['mapOptions']> {
  return getMapGlobalConfig().mapOptions || {};
}

/**
 * 读取地图控件全局默认配置。
 * @returns 地图控件全局默认配置；未注册时返回空对象
 */
export function getMapGlobalMapControls(): NonNullable<MapKitGlobalConfig['mapControls']> {
  return getMapGlobalConfig().mapControls || {};
}

/**
 * 读取指定图层类型的全局 style 默认值。
 * @param kind 图层类型
 * @returns 对应图层的全局 style 默认值；未注册时返回 undefined
 */
export function getMapGlobalStyleDefaults<TKind extends MapGlobalStyleKind>(
  kind: TKind
): NonNullable<NonNullable<MapKitGlobalConfig['styles']>[TKind]> | undefined {
  return getMapGlobalConfig().styles?.[kind] as
    | NonNullable<NonNullable<MapKitGlobalConfig['styles']>[TKind]>
    | undefined;
}

/**
 * 读取吸附插件全局默认配置。
 * @returns 吸附插件全局默认配置
 */
export function getMapGlobalSnapDefaults(): MapFeatureSnapGlobalDefaults | undefined {
  return getMapGlobalConfig().plugins?.snap;
}

/**
 * 读取线草稿插件全局默认配置。
 * @returns 线草稿插件全局默认配置
 */
export function getMapGlobalLineDraftDefaults(): LineDraftPreviewGlobalDefaults | undefined {
  return getMapGlobalConfig().plugins?.lineDraft;
}

/**
 * 读取交点预览插件全局默认配置。
 * @returns 交点预览插件全局默认配置
 */
export function getMapGlobalIntersectionDefaults():
  | IntersectionPreviewGlobalDefaults
  | undefined {
  return getMapGlobalConfig().plugins?.intersection;
}

/**
 * 读取面边线预览插件全局默认配置。
 * @returns 面边线预览插件全局默认配置
 */
export function getMapGlobalPolygonEdgeDefaults():
  | PolygonEdgePreviewGlobalDefaults
  | undefined {
  return getMapGlobalConfig().plugins?.polygonEdge;
}

/**
 * 读取多选插件全局默认配置。
 * @returns 多选插件全局默认配置
 */
export function getMapGlobalMultiSelectDefaults():
  | MapFeatureMultiSelectGlobalDefaults
  | undefined {
  return getMapGlobalConfig().plugins?.multiSelect;
}

/**
 * 读取 DXF 插件全局默认配置。
 * @returns DXF 插件全局默认配置
 */
export function getMapGlobalDxfExportDefaults(): MapDxfExportGlobalDefaults | undefined {
  return getMapGlobalConfig().plugins?.dxfExport;
}
