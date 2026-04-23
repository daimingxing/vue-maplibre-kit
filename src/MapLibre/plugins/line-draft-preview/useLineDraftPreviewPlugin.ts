import { computed, ref } from 'vue';
import { defineMapPlugin, type MapPluginDescriptor } from '../types';
import type { LineDraftPreviewOptions } from './types';
import LineDraftPreviewLayers from './LineDraftPreviewLayers.vue';
import {
  LINE_DRAFT_PREVIEW_CORRIDOR_KIND,
  LINE_DRAFT_PREVIEW_FILL_LAYER_ID,
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
} from './useLineDraftPreviewStore';
import {
  useLineDraftPreviewController,
  type LineDraftPreviewPluginApi,
  type LineDraftPreviewStateChangePayload,
} from './useLineDraftPreviewController';

/** 线草稿预览插件类型标识。 */
export const LINE_DRAFT_PREVIEW_PLUGIN_TYPE = 'lineDraftPreview';
/** 线草稿图层命中优先级。 */
const LINE_DRAFT_LAYER_HIT_PRIORITY = 90;

/** 线草稿预览插件描述对象。 */
export interface LineDraftPreviewPluginDescriptor
  extends MapPluginDescriptor<typeof LINE_DRAFT_PREVIEW_PLUGIN_TYPE, LineDraftPreviewOptions> {}

/**
 * 线草稿预览插件定义。
 * 该插件负责临时线草稿与线廊草稿的内部数据管理、渲染与插件专用交互托管。
 */
export const lineDraftPreviewPlugin = defineMapPlugin<
  typeof LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  LineDraftPreviewOptions,
  LineDraftPreviewPluginApi,
  LineDraftPreviewStateChangePayload
>({
  type: LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  createInstance(context) {
    const pluginState = ref<LineDraftPreviewStateChangePayload>({
      hasFeatures: false,
      featureCount: 0,
    });
    const pluginController = useLineDraftPreviewController({
      getOptions: () => context.getOptions() as LineDraftPreviewOptions,
      getSelectedFeatureContext: context.getSelectedFeatureContext,
      clearPluginHoverState: context.clearPluginHoverState,
      clearPluginSelectedFeature: context.clearPluginSelectedFeature,
      onStateChange: (stateSnapshot) => {
        pluginState.value = stateSnapshot;
      },
    });
    const pluginApi = computed<LineDraftPreviewPluginApi>(() => ({
      data: pluginController.data,
      lineStyle: pluginController.lineStyle,
      fillStyle: pluginController.fillStyle,
      getFeatureById: pluginController.getFeatureById,
      isFeatureById: pluginController.isFeatureById,
      isSelectedFeature: pluginController.isSelectedFeature,
      getSelectedFeatureSnapshot: pluginController.getSelectedFeatureSnapshot,
      previewLine: pluginController.previewLine,
      replacePreviewRegion: pluginController.replacePreviewRegion,
      clear: pluginController.clear,
      saveProperties: pluginController.saveProperties,
      removeProperties: pluginController.removeProperties,
    }));

    /**
     * 读取指定草稿要素的插件交互上下文。
     * @param featureId 草稿要素 ID
     * @returns 标准化后的草稿上下文
     */
    const resolveDraftContext = (featureId: string | number | null) => {
      return pluginController.getFeatureContext(featureId);
    };

    /**
     * 创建线草稿线图层交互配置。
     * 只有线层参与插件交互托管，线廊填充层仍保持非交互。
     *
     * @returns 标准化后的插件图层交互配置
     */
    const createDraftLayerInteractiveConfig = () => ({
      cursor: 'pointer',
      hitPriority: LINE_DRAFT_LAYER_HIT_PRIORITY,
      enableFeatureStateHover: true,
      enableFeatureStateSelected: true,
      onHoverEnter: (contextSnapshot: { featureId: string | number | null }) => {
        const draftContext = resolveDraftContext(contextSnapshot.featureId);
        draftContext && context.getOptions()?.onHoverEnter?.(draftContext);
      },
      onHoverLeave: (contextSnapshot: { featureId: string | number | null }) => {
        const draftContext = resolveDraftContext(contextSnapshot.featureId);
        draftContext && context.getOptions()?.onHoverLeave?.(draftContext);
      },
      onFeatureSelect: (contextSnapshot: { featureId: string | number | null }) => {
        pluginController.setSelectedFeatureId(contextSnapshot.featureId);
      },
      onFeatureDeselect: () => {
        pluginController.setSelectedFeatureId(null);
      },
      onClick: (contextSnapshot: { featureId: string | number | null }) => {
        const draftContext = resolveDraftContext(contextSnapshot.featureId);
        draftContext && context.getOptions()?.onClick?.(draftContext);
      },
      onDoubleClick: (contextSnapshot: { featureId: string | number | null }) => {
        const draftContext = resolveDraftContext(contextSnapshot.featureId);
        draftContext && context.getOptions()?.onDoubleClick?.(draftContext);
      },
      onContextMenu: (contextSnapshot: { featureId: string | number | null }) => {
        const draftContext = resolveDraftContext(contextSnapshot.featureId);
        draftContext && context.getOptions()?.onContextMenu?.(draftContext);
      },
    });

    return {
      getRenderItems: () => [
        {
          id: context.descriptor.id,
          component: LineDraftPreviewLayers,
          props: {
            enabled: pluginController.enabled.value,
            data: pluginController.data.value,
            lineStyle: pluginController.lineStyle.value,
            fillStyle: pluginController.fillStyle.value,
          },
        },
      ],
      getMapInteractivePatch: () => null,
      getPluginLayerInteractivePatch: () => ({
        layers: {
          [LINE_DRAFT_PREVIEW_LINE_LAYER_ID]: createDraftLayerInteractiveConfig(),
        },
      }),
      resolveSelectedFeatureSnapshot: () => {
        if (!pluginController.isSelectedFeature()) {
          return null;
        }

        return pluginController.getSelectedFeatureSnapshot();
      },
      getApi: () => pluginApi.value,
      state: pluginState,
    };
  },
});

/** 线草稿预览 source ID。 */
export { LINE_DRAFT_PREVIEW_SOURCE_ID };

/** 线草稿预览线图层 ID。 */
export { LINE_DRAFT_PREVIEW_LINE_LAYER_ID };

/** 线草稿预览面图层 ID。 */
export { LINE_DRAFT_PREVIEW_FILL_LAYER_ID };

/** 线草稿预览线廊 generatedKind 固定值。 */
export { LINE_DRAFT_PREVIEW_CORRIDOR_KIND };
