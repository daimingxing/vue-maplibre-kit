import type { LineDraftPreviewOptions } from './types';
import {
  lineDraftPreviewPlugin,
  LINE_DRAFT_PREVIEW_CORRIDOR_KIND,
  LINE_DRAFT_PREVIEW_FILL_LAYER_ID,
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
  type LineDraftPreviewPluginDescriptor,
} from './useLineDraftPreviewPlugin';
import type {
  LineDraftPreviewPluginApi,
  LineDraftPreviewStateChangePayload,
} from './useLineDraftPreviewController';

/**
 * 创建线草稿预览插件描述对象。
 * @param options 线草稿预览插件配置
 * @param id 插件唯一标识；未传时默认使用 lineDraftPreview
 * 同一个 map 实例内，当前 type 的插件只允许注册一个，id 不再用于同类型实例消歧。
 * @returns 标准化后的插件描述对象
 */
export function createLineDraftPreviewPlugin(
  options: LineDraftPreviewOptions,
  id = 'lineDraftPreview'
): LineDraftPreviewPluginDescriptor {
  return {
    id,
    type: LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
    options,
    plugin: lineDraftPreviewPlugin,
  };
}

export {
  lineDraftPreviewPlugin,
  LINE_DRAFT_PREVIEW_CORRIDOR_KIND,
  LINE_DRAFT_PREVIEW_FILL_LAYER_ID,
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
};
export type {
  LineDraftPreviewPluginApi,
  LineDraftPreviewPluginDescriptor,
  LineDraftPreviewStateChangePayload,
};
export type {
  LineDraftPreviewContext,
  LineDraftPreviewFillStyleOverrides,
  LineDraftPreviewLineStyleOverrides,
  LineDraftPreviewOptions,
  LineDraftPreviewStyleOverrides,
} from './types';
