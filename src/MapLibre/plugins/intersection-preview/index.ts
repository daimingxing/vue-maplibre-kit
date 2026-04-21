import type { IntersectionPreviewOptions } from './types';
import {
  intersectionPreviewPlugin,
  INTERSECTION_PREVIEW_LAYER_ID,
  INTERSECTION_PREVIEW_PLUGIN_TYPE,
  INTERSECTION_PREVIEW_SOURCE_ID,
  type IntersectionPreviewPluginDescriptor,
} from './useIntersectionPreviewPlugin';

/**
 * 创建交点预览插件描述对象。
 * @param options 交点预览插件配置
 * @param id 插件唯一标识；未传时默认使用 intersectionPreview
 * @returns 标准化后的插件描述对象
 */
export function createIntersectionPreviewPlugin(
  options: IntersectionPreviewOptions,
  id = 'intersectionPreview'
): IntersectionPreviewPluginDescriptor {
  return {
    id,
    type: INTERSECTION_PREVIEW_PLUGIN_TYPE,
    options,
    plugin: intersectionPreviewPlugin,
  };
}

export {
  intersectionPreviewPlugin,
  INTERSECTION_PREVIEW_LAYER_ID,
  INTERSECTION_PREVIEW_PLUGIN_TYPE,
  INTERSECTION_PREVIEW_SOURCE_ID,
};
export type { IntersectionPreviewPluginDescriptor };
export type {
  IntersectionPreviewContext,
  IntersectionPreviewOptions,
  IntersectionPreviewPluginApi,
  IntersectionPreviewScope,
  IntersectionPreviewState,
  UseIntersectionPreviewControllerOptions,
} from './types';
