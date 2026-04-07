import type { MapFeatureSnapOptions } from '../../shared/mapLibre-contols-types';
import type { MapExtensionDescriptor } from '../types';

/** 统一地图吸附扩展类型标识 */
export const MAP_FEATURE_SNAP_EXTENSION_TYPE = 'mapFeatureSnap';

/** 统一地图吸附扩展描述对象 */
export interface MapFeatureSnapExtensionDescriptor extends MapExtensionDescriptor<
  typeof MAP_FEATURE_SNAP_EXTENSION_TYPE,
  MapFeatureSnapOptions
> {}

/**
 * 创建统一地图吸附扩展描述对象。
 * 业务层只负责声明吸附效果所需配置，底层实现、预览图层与 TerraDraw 接入都由容器层统一处理。
 * @param options 地图吸附扩展配置
 * @param id 扩展唯一标识；未传时默认使用 mapFeatureSnap
 * @returns 标准化后的吸附扩展描述对象
 */
export function createMapFeatureSnapExtension(
  options: MapFeatureSnapOptions,
  id = 'mapFeatureSnap'
): MapFeatureSnapExtensionDescriptor {
  return {
    id,
    type: MAP_FEATURE_SNAP_EXTENSION_TYPE,
    options,
  };
}

export { default as MapFeatureSnapPreviewLayers } from './MapFeatureSnapPreviewLayers.vue';
export {
  createEmptyMapFeatureSnapResult,
  createMapFeatureSnapBinding,
  MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID,
  type MapFeatureSnapBinding,
} from './useMapFeatureSnap';
export {
  useMapFeatureSnapExtension,
  type ResolvedTerradrawSnapOptions,
} from './useMapFeatureSnapExtension';
