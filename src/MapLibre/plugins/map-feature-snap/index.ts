import {
  createEmptyMapFeatureSnapResult,
  createMapFeatureSnapBinding,
  MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID,
  MapFeatureSnapPreviewLayers,
} from '../../extensions/mapFeatureSnap';
import type { MapPluginDescriptor } from '../types';
import type { MapFeatureSnapOptions } from './types';
import { mapFeatureSnapPlugin, MAP_FEATURE_SNAP_PLUGIN_TYPE } from './useMapFeatureSnapPlugin';

/** 地图吸附插件工厂函数返回值。 */
export interface MapFeatureSnapPluginDescriptor
  extends MapPluginDescriptor<typeof MAP_FEATURE_SNAP_PLUGIN_TYPE, MapFeatureSnapOptions> {}

/**
 * 创建地图吸附插件描述对象。
 * @param options 地图吸附插件配置
 * @param id 插件唯一标识；未传时默认使用 mapFeatureSnap
 * @returns 标准化后的插件描述对象
 */
export function createMapFeatureSnapPlugin(
  options: MapFeatureSnapOptions,
  id = 'mapFeatureSnap'
): MapFeatureSnapPluginDescriptor {
  return {
    id,
    type: MAP_FEATURE_SNAP_PLUGIN_TYPE,
    options,
    plugin: mapFeatureSnapPlugin,
  };
}

export {
  createEmptyMapFeatureSnapResult,
  createMapFeatureSnapBinding,
  mapFeatureSnapPlugin,
  MapFeatureSnapPreviewLayers,
  MAP_FEATURE_SNAP_PLUGIN_TYPE,
  MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID,
};
export type {
  MapFeatureSnapGeometryType,
  MapFeatureSnapKind,
  MapFeatureSnapMode,
  MapFeatureSnapOptions,
  MapFeatureSnapOrdinaryLayerOptions,
  MapFeatureSnapPluginApi,
  MapFeatureSnapPreviewOptions,
  MapFeatureSnapResult,
  MapFeatureSnapRule,
  MapFeatureSnapRuleFilterContext,
  MapFeatureSnapSegmentInfo,
} from './types';
