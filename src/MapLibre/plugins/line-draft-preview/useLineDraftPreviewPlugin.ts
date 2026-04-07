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

/** 线草稿预览插件描述对象。 */
export interface LineDraftPreviewPluginDescriptor
  extends MapPluginDescriptor<typeof LINE_DRAFT_PREVIEW_PLUGIN_TYPE, LineDraftPreviewOptions> {}

/**
 * 线草稿预览插件定义。
 * 该插件负责临时线草稿与线廊草稿的内部数据管理、渲染与交互继承。
 */
export const lineDraftPreviewPlugin = defineMapPlugin({
  type: LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  createInstance(context) {
    const pluginState = ref<LineDraftPreviewStateChangePayload>({
      hasFeatures: false,
      featureCount: 0,
    });
    const pluginController = useLineDraftPreviewController({
      getOptions: () => context.getOptions() as LineDraftPreviewOptions,
      getMapInteractive: context.getBaseMapInteractive,
      getSelectedFeatureContext: context.getSelectedFeatureContext,
      clearHoverState: context.clearHoverState,
      clearSelectedFeature: context.clearSelectedFeature,
      toFeatureSnapshot: context.toFeatureSnapshot,
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
    }));

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
      getMapInteractivePatch: () => pluginController.mergedMapInteractive.value,
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
