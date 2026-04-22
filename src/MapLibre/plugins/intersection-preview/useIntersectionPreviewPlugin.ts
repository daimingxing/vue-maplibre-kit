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
/** 正式交点点 source ID。 */
export const INTERSECTION_MATERIALIZED_SOURCE_ID = 'intersection-materialized-source';
/** 正式交点点图层 ID。 */
export const INTERSECTION_MATERIALIZED_LAYER_ID = 'intersection-materialized-layer';

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
 * 解析正式交点点图层样式。
 * @returns 默认正式交点点图层样式
 */
function createDefaultMaterializedStyle() {
  return createCircleLayerStyle({
    paint: {
      'circle-radius': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        7,
        ['boolean', ['feature-state', 'hover'], false],
        6,
        5,
      ],
      'circle-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#0958d9',
        ['boolean', ['feature-state', 'hover'], false],
        '#40a9ff',
        '#1677ff',
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
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
      visible: context.getOptions()?.visible !== false,
      scope: context.getOptions()?.scope || 'all',
      count: 0,
      materializedCount: 0,
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

    /**
     * 判断当前选中变化是否需要触发 selected 模式重算。
     * 这里会忽略插件自身的交点图层选中变化，避免用户点击交点后把当前预览清空。
     *
     * @returns 当前是否需要跟随选中态刷新交点
     */
    const shouldRefreshBySelectionChange = (): boolean => {
      if ((context.getOptions()?.scope || 'all') !== 'selected') {
        return false;
      }

      const selectedFeatureContext = context.getSelectedFeatureContext();
      if (!selectedFeatureContext) {
        return true;
      }

      return (
        selectedFeatureContext.sourceId !== INTERSECTION_PREVIEW_SOURCE_ID &&
        selectedFeatureContext.sourceId !== INTERSECTION_MATERIALIZED_SOURCE_ID
      );
    };

    controller.refresh();

    /**
     * 生成交点图层交互配置。
     * @param shouldMaterializeOnClick 点击时是否自动落正式交点点要素
     * @returns 交点图层交互配置
     */
    const createIntersectionLayerInteractiveConfig = (
      shouldMaterializeOnClick: boolean
    ) => {
      return {
        cursor: 'pointer',
        enableFeatureStateHover: true,
        enableFeatureStateSelected: true,
        onFeatureSelect: (contextSnapshot: { featureId: string | number | null }) => {
          syncSelectedIntersection(resolveIntersectionContext(contextSnapshot.featureId));
        },
        onFeatureDeselect: () => {
          syncSelectedIntersection(null);
        },
        onClick: (contextSnapshot: { featureId: string | number | null }) => {
          const intersection = resolveIntersectionContext(contextSnapshot.featureId);
          syncSelectedIntersection(intersection);
          if (shouldMaterializeOnClick && intersection) {
            controller.materialize(intersection.intersectionId);
          }
          intersection && context.getOptions()?.onClick?.(intersection);
        },
        onContextMenu: (contextSnapshot: { featureId: string | number | null }) => {
          const intersection = resolveIntersectionContext(contextSnapshot.featureId);
          syncSelectedIntersection(intersection);
          intersection && context.getOptions()?.onContextMenu?.(intersection);
        },
      };
    };

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
            materializedEnabled: true,
            materializedSourceId: INTERSECTION_MATERIALIZED_SOURCE_ID,
            materializedLayerId: INTERSECTION_MATERIALIZED_LAYER_ID,
            materializedData: controller.materializedData.value,
            materializedStyle: createDefaultMaterializedStyle(),
          },
        },
      ],
      getMapInteractivePatch: () => {
        return {
          onSelectionChange: () => {
            if (!shouldRefreshBySelectionChange()) {
              return;
            }

            controller.refresh();
          },
          layers: {
            [INTERSECTION_PREVIEW_LAYER_ID]: createIntersectionLayerInteractiveConfig(
              context.getOptions()?.materializeOnClick !== false
            ),
            [INTERSECTION_MATERIALIZED_LAYER_ID]:
              createIntersectionLayerInteractiveConfig(false),
          },
        };
      },
      getApi: () =>
        ({
          refresh: controller.refresh,
          clear: controller.clear,
          materialize: controller.materialize,
          clearMaterialized: controller.clearMaterialized,
          show: controller.show,
          hide: controller.hide,
          setScope: controller.setScope,
          getData: controller.getData,
          getMaterializedData: controller.getMaterializedData,
          getById: controller.getById,
          getSelected: controller.getSelected,
        }) as IntersectionPreviewPluginApi,
      state: computed(() => pluginState.value),
    };
  },
});
