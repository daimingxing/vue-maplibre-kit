import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('plugins generatedKind 常量', () => {
  it('应从公开插件子路径导出全部生成要素 generatedKind', async () => {
    (globalThis as any).window = globalThis;

    const lineDraft = await import('./line-draft-preview');
    const intersection = await import('./intersection-preview');
    const polygonEdge = await import('./polygon-edge-preview');
    const plugins = await import('../plugins');

    expect(lineDraft.LINE_DRAFT_PREVIEW_CORRIDOR_KIND).toBe('line-corridor-draft');
    expect(lineDraft.LINE_DRAFT_PREVIEW_EXTENSION_KIND).toBe('line-extension-draft');
    expect(intersection.INTERSECTION_PREVIEW_KIND).toBe('intersection-preview');
    expect(intersection.INTERSECTION_MATERIALIZED_KIND).toBe('intersection-materialized');
    expect(polygonEdge.POLYGON_EDGE_PREVIEW_KIND).toBe('polygon-edge-preview');
    expect(plugins.LINE_DRAFT_PREVIEW_EXTENSION_KIND).toBe(lineDraft.LINE_DRAFT_PREVIEW_EXTENSION_KIND);
    expect(plugins.INTERSECTION_PREVIEW_KIND).toBe(intersection.INTERSECTION_PREVIEW_KIND);
    expect(plugins.INTERSECTION_MATERIALIZED_KIND).toBe(intersection.INTERSECTION_MATERIALIZED_KIND);
    expect(plugins.POLYGON_EDGE_PREVIEW_KIND).toBe(polygonEdge.POLYGON_EDGE_PREVIEW_KIND);
  }, 10000);

  it('lineDraft 延长线常量应直接定义公开值，避免绑定工具类静态字段', () => {
    const storeSource = readFileSync(
      resolve(__dirname, '../MapLibre/plugins/line-draft-preview/useLineDraftPreviewStore.ts'),
      'utf-8'
    );
    const layersSource = readFileSync(
      resolve(__dirname, '../MapLibre/plugins/line-draft-preview/LineDraftPreviewLayers.vue'),
      'utf-8'
    );

    expect(storeSource).toContain(
      "export const LINE_DRAFT_PREVIEW_EXTENSION_KIND = 'line-extension-draft'"
    );
    expect(storeSource).not.toContain(
      'LINE_DRAFT_PREVIEW_EXTENSION_KIND = MapLineExtensionTool.TEMPORARY_EXTENSION_KIND'
    );
    expect(layersSource).toContain('LINE_DRAFT_PREVIEW_EXTENSION_KIND');
    expect(layersSource).not.toContain('MapLineExtensionTool.TEMPORARY_EXTENSION_KIND');
  });
});
