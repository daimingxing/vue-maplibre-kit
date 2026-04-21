import { computed, ref } from 'vue';
import { createCircleLayerStyle } from '../../shared/map-layer-style-config';
import { defineMapPlugin, type MapPluginDescriptor } from '../types';
import { useIntersectionPreviewController } from './useIntersectionPreviewController';
import IntersectionPreviewLayers from './IntersectionPreviewLayers.vue';
import type {
  IntersectionPreviewContext,
  IntersectionPreviewOptions,
  IntersectionPreviewPluginApi,
  IntersectionPreviewState,
} from './types';

/** 交点预览插件类型标识。 */
export const INTERSECTION_PREVIEW_PLUGIN_TYPE = 'intersectionPreview';
/** 交点预览 source ID。 */
export const INTERSECTION_PREVIEW_SOURCE_ID = 'intersection-preview-source';
/** 交点预览图层 ID。 */
export const INTERSECTION_PREVIEW_LAYER_ID = 'intersection-preview-layer';

/** 交点预览插件描述对象。 */
export interface IntersectionPreviewPluginDescriptor
  extends MapPluginDescriptor<typeof INTERSECTION_PREVIEW_PLUGIN_TYPE, IntersectionPreviewOptions> {}

/**
 * 解析交点图层样式。
 * @returns 默认交点图层样式
 */
function createDefaultIntersectionStyle() {
  return createCircleLayerStyle({
    paint: {
      // 默认半径为 5，hover / selected 抬到 6，保证状态变化可见但不会过度跳变。
      'circle-radius': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        6,
        ['boolean', ['feature-state', 'hover'], false],
        6,
        5,
      ],
      'circle-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f5222d',
        ['boolean', ['feature-state', 'hover'], false],
        '#fa8c16',
        '#ff7a45',
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        3,
        2,
      ],
    },
  });
}

/**
 * 交点预览插件定义。
 * 当前版本负责维护交点临时点图层、交点状态和基础交互回调。
 */
export const intersectionPreviewPlugin = defineMapPlugin<
  typeof INTERSECTION_PREVIEW_PLUGIN_TYPE,
  IntersectionPreviewOptions,
  IntersectionPreviewPluginApi,
  IntersectionPreviewState
>({
  type: INTERSECTION_PREVIEW_PLUGIN_TYPE,
  createInstance(context) {
    const pluginState = ref<IntersectionPreviewState>({
      visible: false,
      scope: context.getOptions()?.scope || 'all',
      count: 0,
      selectedId: null,
      lastError: null,
    });
    const controller = useIntersectionPreviewController({
      getOptions: () => context.getOptions(),
      getCandidates: () => {
        return context.getOptions()?.getCandidates?.() || [];
      },
      getSelectedFeatureContext: context.getSelectedFeatureContext,
      onStateChange: (stateSnapshot) => {
        pluginState.value = stateSnapshot;
      },
    });

    /**
     * 根据图层交互上下文解析交点上下文。
     * @param featureId 当前命中的交点 ID
     * @returns 命中的交点上下文
     */
    const resolveIntersectionContext = (featureId: string | number | null) => {
      return controller.getById(featureId === null ? null : String(featureId));
    };

    /**
     * 同步当前交点选中态。
     * @param intersection 当前命中的交点上下文
     */
    const syncSelectedIntersection = (intersection: IntersectionPreviewContext | null): void => {
      controller.setSelected(intersection?.intersectionId || null);
      pluginState.value = {
        ...pluginState.value,
        selectedId: intersection?.intersectionId || null,
      };
    };

    controller.refresh();

    return {
      getRenderItems: () => [
        {
          id: context.descriptor.id,
          component: IntersectionPreviewLayers,
          props: {
            enabled: controller.visible.value,
            sourceId: INTERSECTION_PREVIEW_SOURCE_ID,
            layerId: INTERSECTION_PREVIEW_LAYER_ID,
            data: controller.data.value,
            style: createDefaultIntersectionStyle(),
          },
        },
      ],
      getMapInteractivePatch: () => {
        return {
          layers: {
            [INTERSECTION_PREVIEW_LAYER_ID]: {
              cursor: 'pointer',
              enableFeatureStateHover: true,
              enableFeatureStateSelected: true,
              onFeatureSelect: (contextSnapshot) => {
                syncSelectedIntersection(
                  resolveIntersectionContext(contextSnapshot.featureId)
                );
              },
              onFeatureDeselect: () => {
                syncSelectedIntersection(null);
              },
              onClick: (contextSnapshot) => {
                const intersection = resolveIntersectionContext(contextSnapshot.featureId);
                syncSelectedIntersection(intersection);
                intersection && context.getOptions()?.onClick?.(intersection);
              },
              onContextMenu: (contextSnapshot) => {
                const intersection = resolveIntersectionContext(contextSnapshot.featureId);
                syncSelectedIntersection(intersection);
                intersection && context.getOptions()?.onContextMenu?.(intersection);
              },
            },
          },
        };
      },
      getApi: () =>
        ({
          refresh: controller.refresh,
          clear: controller.clear,
          show: controller.show,
          hide: controller.hide,
          setScope: controller.setScope,
          getData: controller.getData,
          getById: controller.getById,
          getSelected: controller.getSelected,
        }) as IntersectionPreviewPluginApi,
      state: computed(() => pluginState.value),
    };
  },
});
