import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { MapPluginContext } from '../types';
import type { MapLayerInteractiveContext } from '../../shared/mapLibre-controls-types';
import type { PolygonEdgePreviewOptions } from './types';
import {
  polygonEdgePreviewPlugin,
  POLYGON_EDGE_PREVIEW_LINE_LAYER_ID,
  POLYGON_EDGE_PREVIEW_PLUGIN_TYPE,
  type PolygonEdgePreviewPluginDescriptor,
} from './usePolygonEdgePreviewPlugin';

vi.mock('vue-maplibre-gl', () => ({
  MglGeoJsonSource: {
    name: 'MglGeoJsonSource',
  },
  MglLineLayer: {
    name: 'MglLineLayer',
  },
}));

/**
 * 创建面边线插件测试上下文。
 * @param optionsRef 插件配置引用
 * @returns 插件上下文
 */
function createPluginContext(
  optionsRef: { value: PolygonEdgePreviewOptions | any },
  contextPatch: Partial<
    MapPluginContext<typeof POLYGON_EDGE_PREVIEW_PLUGIN_TYPE, PolygonEdgePreviewOptions>
  > = {}
): MapPluginContext<typeof POLYGON_EDGE_PREVIEW_PLUGIN_TYPE, PolygonEdgePreviewOptions> {
  return {
    descriptor: {
      id: 'polygonEdgePreview',
      type: POLYGON_EDGE_PREVIEW_PLUGIN_TYPE,
      options: optionsRef.value,
      plugin: polygonEdgePreviewPlugin,
    } as PolygonEdgePreviewPluginDescriptor,
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
    ...contextPatch,
  };
}

describe('polygonEdgePreviewPlugin', () => {
  it('应渲染面边线图层并通过插件专用交互通道暴露事件', () => {
    const onClick = vi.fn();
    const optionsRef = ref({
      enabled: true,
      onClick,
    } as PolygonEdgePreviewOptions);
    const pluginInstance = polygonEdgePreviewPlugin.createInstance(createPluginContext(optionsRef));
    const pluginApi = pluginInstance.getApi?.();
    const renderItems = pluginInstance.getRenderItems?.() || [];
    const pluginLayerPatch = pluginInstance.getPluginLayerInteractivePatch?.();

    expect(renderItems).toHaveLength(1);
    expect(renderItems[0].props.enabled).toBe(true);
    expect(pluginInstance.getMapInteractivePatch?.()).toBeNull();
    expect(pluginLayerPatch?.layers?.[POLYGON_EDGE_PREVIEW_LINE_LAYER_ID]).toBeTruthy();

    const result = pluginApi?.generateFromFeature({
      feature: {
        type: 'Feature',
        id: 'land-1',
        properties: { id: 'land-1' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [0, 0],
            ],
          ],
        },
      },
      origin: { sourceId: 'source-a', featureId: 'land-1', layerId: 'land-layer' },
    });
    expect(result?.success).toBe(true);

    const edgeId = String(pluginApi?.getData().features[0]?.properties?.edgeId);
    pluginLayerPatch?.layers?.[POLYGON_EDGE_PREVIEW_LINE_LAYER_ID]?.onClick?.({
      featureId: edgeId,
    } as any);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].edgeId).toBe(edgeId);
  });

  it('从当前选中要素生成边线时应拒绝非面要素', () => {
    const optionsRef = ref({
      enabled: true,
    } as PolygonEdgePreviewOptions);
    const selectedContext = {
      feature: {
        type: 'Feature',
        id: 'line-1',
        properties: { id: 'line-1' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
      },
      sourceId: 'source-a',
      featureId: 'line-1',
      layerId: 'line-layer',
    } as unknown as MapLayerInteractiveContext;
    const pluginInstance = polygonEdgePreviewPlugin.createInstance(
      createPluginContext(optionsRef, {
        getSelectedFeatureContext: () => selectedContext,
      })
    );
    const result = pluginInstance.getApi?.()?.generateFromSelected();

    expect(result).toEqual({
      success: false,
      message: '当前选中要素不是面要素，无法生成边线',
      edgeCount: 0,
      polygonId: null,
    });
    expect(pluginInstance.getApi?.()?.getData().features).toHaveLength(0);
  });

  it('边线事件缺少 featureId 时不应触发业务回调或选中状态', () => {
    const onHoverEnter = vi.fn();
    const onClick = vi.fn();
    const optionsRef = ref({
      enabled: true,
      onHoverEnter,
      onClick,
    } as PolygonEdgePreviewOptions);
    const pluginInstance = polygonEdgePreviewPlugin.createInstance(createPluginContext(optionsRef));
    const pluginLayerPatch = pluginInstance.getPluginLayerInteractivePatch?.();
    const edgeLayerConfig = pluginLayerPatch?.layers?.[POLYGON_EDGE_PREVIEW_LINE_LAYER_ID];

    edgeLayerConfig?.onHoverEnter?.({ featureId: null } as any);
    edgeLayerConfig?.onFeatureSelect?.({ featureId: null } as any);
    edgeLayerConfig?.onClick?.({ featureId: null } as any);

    expect(onHoverEnter).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    expect(pluginInstance.state?.value.selectedEdgeId).toBeNull();
  });
});
