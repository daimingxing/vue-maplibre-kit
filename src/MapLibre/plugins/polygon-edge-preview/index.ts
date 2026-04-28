export {
  polygonEdgePreviewPlugin,
  POLYGON_EDGE_PREVIEW_KIND,
  POLYGON_EDGE_PREVIEW_LINE_LAYER_ID,
  POLYGON_EDGE_PREVIEW_PLUGIN_TYPE,
  POLYGON_EDGE_PREVIEW_SOURCE_ID,
  type PolygonEdgePreviewPluginDescriptor,
} from './usePolygonEdgePreviewPlugin';

import { polygonEdgePreviewPlugin } from './usePolygonEdgePreviewPlugin';
import type { PolygonEdgePreviewPluginDescriptor } from './usePolygonEdgePreviewPlugin';
import type { PolygonEdgePreviewOptions } from './types';

export type {
  PolygonEdgePreviewContext,
  PolygonEdgePreviewGenerateOptions,
  PolygonEdgePreviewGenerateResult,
  PolygonEdgePreviewOptions,
  PolygonEdgePreviewPluginApi,
  PolygonEdgePreviewSimpleLineStyle,
  PolygonEdgePreviewState,
  PolygonEdgePreviewStateStyles,
  PolygonEdgePreviewStyleRule,
} from './types';

/**
 * 创建面边线预览插件描述对象。
 * @param options 插件配置
 * @returns 面边线预览插件描述对象
 */
export function createPolygonEdgePreviewPlugin(
  options: PolygonEdgePreviewOptions = { enabled: true }
): PolygonEdgePreviewPluginDescriptor {
  return {
    id: 'polygonEdgePreview',
    type: 'polygonEdgePreview',
    options,
    plugin: polygonEdgePreviewPlugin,
  };
}
