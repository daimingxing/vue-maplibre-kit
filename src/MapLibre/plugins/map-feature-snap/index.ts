import {
  createEmptyMapFeatureSnapResult,
  createMapFeatureSnapBinding,
  resolveFeatureSnapResult,
  type MapFeatureSnapBinding,
  MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID,
} from './useMapFeatureSnapBinding';
import MapFeatureSnapPreviewLayers from './MapFeatureSnapPreviewLayers.vue';
import type { MapFeatureSnapOptions } from './types';
import {
  mapFeatureSnapPlugin,
  MAP_FEATURE_SNAP_PLUGIN_TYPE,
  type MapFeatureSnapPluginDescriptor,
} from './useMapFeatureSnapPlugin';
import type { ResolvedTerradrawSnapOptions } from '../types';

/**
 * 创建地图吸附插件描述对象。
 * @param options 地图吸附插件配置
 * @param id 插件唯一标识；未传时默认使用 mapFeatureSnap
 * 同一个 map 实例内，当前 type 的插件只允许注册一个，id 不再用于同类型实例消歧。
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
  resolveFeatureSnapResult,
  mapFeatureSnapPlugin,
  MapFeatureSnapPreviewLayers,
  MAP_FEATURE_SNAP_PLUGIN_TYPE,
  MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID,
};
export type {
  MapFeatureSnapBinding,
  MapFeatureSnapPluginDescriptor,
  ResolvedTerradrawSnapOptions,
};
export type {
  MapFeatureSnapGeometryType,
  MapFeatureSnapKind,
  MapFeatureSnapMode,
  MapFeatureSnapOptions,
  MapFeatureSnapBusinessLayerOptions,
  MapFeatureSnapDrawnTargetOptions,
  MapFeatureSnapPluginApi,
  MapFeatureSnapPreviewOptions,
  MapFeatureSnapResult,
  MapFeatureSnapRule,
  MapFeatureSnapRuleFilterContext,
  MapFeatureSnapSegmentInfo,
  MapFeatureSnapTargetOptions,
} from './types';
