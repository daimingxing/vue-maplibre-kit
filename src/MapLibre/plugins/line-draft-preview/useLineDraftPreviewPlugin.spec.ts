import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { MapPluginContext } from '../types';
import type { LineDraftPreviewOptions } from './types';
import {
  lineDraftPreviewPlugin,
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  type LineDraftPreviewPluginDescriptor,
} from './useLineDraftPreviewPlugin';

vi.mock('vue-maplibre-gl', () => ({
  MglGeoJsonSource: {
    name: 'MglGeoJsonSource',
  },
  MglFillLayer: {
    name: 'MglFillLayer',
  },
  MglLineLayer: {
    name: 'MglLineLayer',
  },
}));

/**
 * 创建线草稿插件测试上下文。
 * @param optionsRef 插件配置引用
 * @returns 标准插件上下文
 */
function createPluginContext(
  optionsRef: { value: LineDraftPreviewOptions | any }
): MapPluginContext<typeof LINE_DRAFT_PREVIEW_PLUGIN_TYPE, LineDraftPreviewOptions> {
  return {
    descriptor: {
      id: 'lineDraftPreview',
      type: LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
      options: optionsRef.value,
      plugin: lineDraftPreviewPlugin,
    } as LineDraftPreviewPluginDescriptor,
    getOptions: () => optionsRef.value,
    getMap: () => null,
    getMapInstance: () => ({}) as any,
    getBaseMapInteractive: () => null,
    getSelectedFeatureContext: () => null,
    clearHoverState: () => undefined,
    clearSelectedFeature: () => undefined,
    clearPluginHoverState: () => undefined,
    clearPluginSelectedFeature: () => undefined,
    toFeatureSnapshot: () => null,
  };
}

describe('lineDraftPreviewPlugin', () => {
  it('应通过插件专用交互通道暴露草稿线图层事件，而不是继续复用普通图层交互补丁', () => {
    const onClick = vi.fn();
    const onContextMenu = vi.fn();
    const onHoverEnter = vi.fn();
    const onHoverLeave = vi.fn();
    const onDoubleClick = vi.fn();
    const optionsRef = ref({
      enabled: true,
      onClick,
      onContextMenu,
      onHoverEnter,
      onHoverLeave,
      onDoubleClick,
    } as any);

    const pluginInstance = lineDraftPreviewPlugin.createInstance(createPluginContext(optionsRef));
    const pluginLayerPatch = (pluginInstance as any).getPluginLayerInteractivePatch?.();

    expect(pluginInstance.getMapInteractivePatch?.()).toBeNull();
    expect(pluginLayerPatch?.layers?.[LINE_DRAFT_PREVIEW_LINE_LAYER_ID]).toBeTruthy();
    expect(pluginLayerPatch?.layers?.lineDraftFillLayer).toBeUndefined();

    pluginLayerPatch?.layers?.[LINE_DRAFT_PREVIEW_LINE_LAYER_ID]?.onHoverEnter?.({
      featureId: 'draft-1',
    } as any);
    pluginLayerPatch?.layers?.[LINE_DRAFT_PREVIEW_LINE_LAYER_ID]?.onHoverLeave?.({
      featureId: 'draft-1',
    } as any);
    pluginLayerPatch?.layers?.[LINE_DRAFT_PREVIEW_LINE_LAYER_ID]?.onClick?.({
      featureId: 'draft-1',
    } as any);
    pluginLayerPatch?.layers?.[LINE_DRAFT_PREVIEW_LINE_LAYER_ID]?.onDoubleClick?.({
      featureId: 'draft-1',
    } as any);
    pluginLayerPatch?.layers?.[LINE_DRAFT_PREVIEW_LINE_LAYER_ID]?.onContextMenu?.({
      featureId: 'draft-1',
    } as any);

    expect(onHoverEnter).toHaveBeenCalledTimes(1);
    expect(onHoverLeave).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
    expect(onContextMenu).toHaveBeenCalledTimes(1);
  });
});
