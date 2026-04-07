import type { ManagedTunnelPreviewOptions } from '../../shared/mapLibre-contols-types';
import type { MapExtensionDescriptor } from '../types';

/** 托管临时巷道预览扩展类型标识 */
export const MANAGED_TUNNEL_PREVIEW_EXTENSION_TYPE = 'managedTunnelPreview';

/** 托管临时巷道预览扩展描述对象 */
export interface ManagedTunnelPreviewExtensionDescriptor extends MapExtensionDescriptor<
  typeof MANAGED_TUNNEL_PREVIEW_EXTENSION_TYPE,
  ManagedTunnelPreviewOptions
> {}

/**
 * 创建托管临时巷道预览扩展描述对象。
 * 业务层通过该工厂函数显式注册扩展，而不是再给 map-libre-init 传专属 prop。
 * @param options 托管临时巷道预览配置
 * @param id 扩展唯一标识；未传时默认使用 managedTunnelPreview
 * @returns 标准化后的扩展描述对象
 */
export function createManagedTunnelPreviewExtension(
  options: ManagedTunnelPreviewOptions,
  id = 'managedTunnelPreview'
): ManagedTunnelPreviewExtensionDescriptor {
  return {
    id,
    type: MANAGED_TUNNEL_PREVIEW_EXTENSION_TYPE,
    options,
  };
}

export { default as ManagedTunnelPreviewLayers } from './ManagedTunnelPreviewLayers.vue';
export {
  useManagedTunnelPreviewExtension,
  type ManagedTunnelPreviewExtensionApi,
  type ManagedTunnelPreviewStateChangePayload,
} from './useManagedTunnelPreviewExtension';
export {
  MANAGED_TUNNEL_PREVIEW_FILL_LAYER_ID,
  MANAGED_TUNNEL_PREVIEW_LINE_LAYER_ID,
  MANAGED_TUNNEL_PREVIEW_REGION_KIND,
  MANAGED_TUNNEL_PREVIEW_SOURCE_ID,
  useManagedTunnelPreview,
} from './useManagedTunnelPreview';
