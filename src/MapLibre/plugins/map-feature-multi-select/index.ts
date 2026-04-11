import type { MapFeatureMultiSelectOptions } from './types';
import {
  mapFeatureMultiSelectPlugin,
  MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
  type MapFeatureMultiSelectPluginDescriptor,
} from './useMapFeatureMultiSelectPlugin';
import type { MapFeatureMultiSelectPluginApi, MapFeatureMultiSelectState } from './types';

/**
 * 创建要素多选插件描述对象。
 * @param options 要素多选插件配置
 * @param id 插件唯一标识；未传时默认使用 mapFeatureMultiSelect
 * 同一个 map 实例内，当前 type 的插件只允许注册一个，id 不再用于同类型实例消歧。
 * @returns 标准化后的插件描述对象
 */
export function createMapFeatureMultiSelectPlugin(
  options: MapFeatureMultiSelectOptions,
  id = 'mapFeatureMultiSelect'
): MapFeatureMultiSelectPluginDescriptor {
  return {
    id,
    type: MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
    options,
    plugin: mapFeatureMultiSelectPlugin,
  };
}

export { mapFeatureMultiSelectPlugin, MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE };
export type {
  MapFeatureMultiSelectOptions,
  MapFeatureMultiSelectPluginApi,
  MapFeatureMultiSelectPluginDescriptor,
  MapFeatureMultiSelectState,
};
