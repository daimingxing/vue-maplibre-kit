import { computed, ref } from 'vue';
import { defineMapPlugin, type MapPluginDescriptor } from '../types';
import PolygonEdgePreviewLayers from './PolygonEdgePreviewLayers.vue';
import type { PolygonEdgePreviewOptions, PolygonEdgePreviewPluginApi, PolygonEdgePreviewState } from './types';
import {
  POLYGON_EDGE_PREVIEW_KIND,
  POLYGON_EDGE_PREVIEW_LINE_LAYER_ID,
  POLYGON_EDGE_PREVIEW_SOURCE_ID,
} from './usePolygonEdgePreviewStore';
import { usePolygonEdgePreviewController } from './usePolygonEdgePreviewController';

/** 面边线预览插件类型标识。 */
export const POLYGON_EDGE_PREVIEW_PLUGIN_TYPE = 'polygonEdgePreview';

/** 面边线图层命中优先级。 */
const POLYGON_EDGE_LAYER_HIT_PRIORITY = 85;

/** 面边线预览插件描述对象。 */
export interface PolygonEdgePreviewPluginDescriptor
  extends MapPluginDescriptor<typeof POLYGON_EDGE_PREVIEW_PLUGIN_TYPE, PolygonEdgePreviewOptions> {}

/**
 * 面边线预览插件定义。
 * 负责渲染纯临时面边线，并通过插件图层交互暴露边线上下文。
 */
export const polygonEdgePreviewPlugin = defineMapPlugin<
  typeof POLYGON_EDGE_PREVIEW_PLUGIN_TYPE,
  PolygonEdgePreviewOptions,
  PolygonEdgePreviewPluginApi,
  PolygonEdgePreviewState
>({
  type: POLYGON_EDGE_PREVIEW_PLUGIN_TYPE,
  createInstance(context) {
    const pluginState = ref<PolygonEdgePreviewState>({
      hasFeatures: false,
      featureCount: 0,
      selectedEdgeId: null,
    });
    const controller = usePolygonEdgePreviewController({
      getOptions: () => context.getOptions() as PolygonEdgePreviewOptions,
      getSelectedFeatureContext: context.getSelectedFeatureContext,
      clearPluginHoverState: context.clearPluginHoverState,
      clearPluginSelectedFeature: context.clearPluginSelectedFeature,
      onStateChange: (stateSnapshot) => {
        pluginState.value = stateSnapshot;
      },
    });
    const pluginApi = computed<PolygonEdgePreviewPluginApi>(() => controller.api);

    /**
     * 按边线 ID 解析交互上下文。
     * @param edgeId 边线 ID
     * @returns 边线交互上下文
     */
    const resolveEdgeContext = (edgeId: string | number | null) => {
      return controller.getFeatureContext(edgeId === null ? null : String(edgeId));
    };

    /**
     * 创建边线图层交互配置。
     * @returns 插件图层交互配置
     */
    const createEdgeLayerInteractiveConfig = () => ({
      cursor: 'pointer',
      hitPriority: POLYGON_EDGE_LAYER_HIT_PRIORITY,
      enableFeatureStateHover: true,
      enableFeatureStateSelected: true,
      onHoverEnter: (contextSnapshot: { featureId: string | number | null }) => {
        if (contextSnapshot.featureId === null) {
          return;
        }

        const edgeContext = resolveEdgeContext(contextSnapshot.featureId);
        edgeContext && context.getOptions()?.onHoverEnter?.(edgeContext);
      },
      onHoverLeave: (contextSnapshot: { featureId: string | number | null }) => {
        if (contextSnapshot.featureId === null) {
          return;
        }

        const edgeContext = resolveEdgeContext(contextSnapshot.featureId);
        edgeContext && context.getOptions()?.onHoverLeave?.(edgeContext);
      },
      onFeatureSelect: (contextSnapshot: { featureId: string | number | null }) => {
        if (contextSnapshot.featureId === null) {
          return;
        }

        controller.selectEdge(String(contextSnapshot.featureId));
      },
      onFeatureDeselect: () => {
        controller.selectEdge(null);
      },
      onClick: (contextSnapshot: { featureId: string | number | null }) => {
        if (contextSnapshot.featureId === null) {
          return;
        }

        const edgeContext = resolveEdgeContext(contextSnapshot.featureId);
        edgeContext && context.getOptions()?.onClick?.(edgeContext);
      },
      onDoubleClick: (contextSnapshot: { featureId: string | number | null }) => {
        if (contextSnapshot.featureId === null) {
          return;
        }

        const edgeContext = resolveEdgeContext(contextSnapshot.featureId);
        edgeContext && context.getOptions()?.onDoubleClick?.(edgeContext);
      },
      onContextMenu: (contextSnapshot: { featureId: string | number | null }) => {
        if (contextSnapshot.featureId === null) {
          return;
        }

        const edgeContext = resolveEdgeContext(contextSnapshot.featureId);
        edgeContext && context.getOptions()?.onContextMenu?.(edgeContext);
      },
    });

    return {
      getRenderItems: () => [
        {
          id: context.descriptor.id,
          component: PolygonEdgePreviewLayers,
          props: {
            enabled: controller.enabled.value,
            data: controller.data.value,
            lineStyle: controller.lineStyle.value,
          },
        },
      ],
      getMapInteractivePatch: () => null,
      getPluginLayerInteractivePatch: () => ({
        layers: {
          [POLYGON_EDGE_PREVIEW_LINE_LAYER_ID]: createEdgeLayerInteractiveConfig(),
        },
      }),
      resolveSelectedFeatureSnapshot: () => {
        return controller.selectedEdgeId.value
          ? controller.api.getFeatureById(controller.selectedEdgeId.value)
          : null;
      },
      getApi: () => pluginApi.value,
      state: pluginState,
      destroy: () => {
        controller.destroy();
      },
    };
  },
});

export {
  POLYGON_EDGE_PREVIEW_KIND,
  POLYGON_EDGE_PREVIEW_LINE_LAYER_ID,
  POLYGON_EDGE_PREVIEW_SOURCE_ID,
};
