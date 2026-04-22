import { computed, ref } from 'vue';
import type { MapCommonFeature, MapCommonLineFeature } from '../../shared/map-common-tools';
import { buildIntersectionCandidates } from '../../shared/map-intersection-tools';
import { createCircleLayerStyle } from '../../shared/map-layer-style-config';
import { getMapGlobalIntersectionDefaults } from '../../shared/map-global-config';
import type { MapBusinessLayerDescriptor } from '../../facades/mapBusinessLayer';
import { defineMapPlugin, type MapPluginDescriptor } from '../types';
import { useIntersectionPreviewController } from './useIntersectionPreviewController';
import IntersectionPreviewLayers from './IntersectionPreviewLayers.vue';
import type {
  IntersectionPreviewContext,
  IntersectionPreviewOptions,
  IntersectionPreviewPluginApi,
  IntersectionPreviewState,
  IntersectionPreviewStyleOverrides,
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
/** 交点图层命中优先级。 */
const INTERSECTION_LAYER_HIT_PRIORITY = 100;

/** 交点预览插件描述对象。 */
export interface IntersectionPreviewPluginDescriptor
  extends MapPluginDescriptor<typeof INTERSECTION_PREVIEW_PLUGIN_TYPE, IntersectionPreviewOptions> {}

/**
 * 合并交点图层样式覆写。
 * @param globalOverrides 全局样式覆写
 * @param localOverrides 实例样式覆写
 * @returns 合并后的样式覆写
 */
function resolveIntersectionStyleOverrides(
  globalOverrides?: IntersectionPreviewStyleOverrides,
  localOverrides?: IntersectionPreviewStyleOverrides
): IntersectionPreviewStyleOverrides {
  return {
    ...(globalOverrides || {}),
    ...(localOverrides || {}),
    layout: {
      ...(globalOverrides?.layout || {}),
      ...(localOverrides?.layout || {}),
    },
    paint: {
      ...(globalOverrides?.paint || {}),
      ...(localOverrides?.paint || {}),
    },
  };
}

/**
 * 解析预览交点图层样式。
 * @param overrides 业务层局部样式覆写
 * @returns 最终生效的交点图层样式
 */
function createResolvedIntersectionStyle(overrides?: IntersectionPreviewStyleOverrides) {
  return createCircleLayerStyle({
    layout: {
      ...(overrides?.layout || {}),
    },
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
      ...(overrides?.paint || {}),
    },
  });
}

/**
 * 解析正式交点图层样式。
 * @param overrides 业务层局部样式覆写
 * @returns 最终生效的正式交点图层样式
 */
function createResolvedMaterializedStyle(overrides?: IntersectionPreviewStyleOverrides) {
  return createCircleLayerStyle({
    layout: {
      ...(overrides?.layout || {}),
    },
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
      ...(overrides?.paint || {}),
    },
  });
}

/**
 * 判断业务图层是否可作为自动求交候选线来源。
 * 当前自动模式只托管最常见的 line 图层 + where 条件；
 * 如果业务层用了更复杂的原始 filter，请回退到 getCandidates 高级兜底。
 *
 * @param layer 当前业务图层
 * @returns 是否允许自动提取候选线
 */
function isIntersectionTargetLayer(layer: MapBusinessLayerDescriptor): boolean {
  if (layer.type !== 'line') {
    return false;
  }

  if (!layer.geometryTypes?.length) {
    return true;
  }

  return layer.geometryTypes.includes('LineString') || layer.geometryTypes.includes('MultiLineString');
}

/**
 * 判断当前要素是否满足业务图层的简单 where 条件。
 * @param feature 当前业务要素
 * @param layer 当前业务图层
 * @returns 是否满足条件
 */
function matchesLayerWhere(feature: MapCommonFeature, layer: MapBusinessLayerDescriptor): boolean {
  if (!layer.where) {
    return true;
  }

  const featureProperties = feature.properties || {};
  return Object.entries(layer.where).every(([propertyKey, propertyValue]) => {
    return featureProperties[propertyKey] === propertyValue;
  });
}

/**
 * 从业务 source 注册表中自动提取交点候选线。
 * 业务层只需声明 sourceRegistry + targetSourceIds + targetLayerIds，
 * 插件会自行把最新业务线数据转换成求交候选集合。
 *
 * @param pluginOptions 当前交点插件配置
 * @returns 标准化后的交点候选线集合
 */
function buildCandidatesFromSourceRegistry(
  pluginOptions: IntersectionPreviewOptions | null | undefined
) {
  const sourceRegistry = pluginOptions?.sourceRegistry;
  if (!sourceRegistry) {
    return [];
  }

  const sourceIdSet = new Set(pluginOptions?.targetSourceIds || []);
  const layerIdSet = new Set(pluginOptions?.targetLayerIds || []);

  return sourceRegistry.listSources().flatMap((source) => {
    if (sourceIdSet.size && !sourceIdSet.has(source.sourceId)) {
      return [];
    }

    const sourceData = source.sourceProps.data;
    if (!sourceData || typeof sourceData === 'string' || sourceData.type !== 'FeatureCollection') {
      return [];
    }

    return source
      .getLayers()
      .filter((layer) => {
        if (!isIntersectionTargetLayer(layer)) {
          return false;
        }

        if (!layerIdSet.size) {
          return true;
        }

        return layerIdSet.has(layer.layerId);
      })
      .flatMap((layer) => {
        return buildIntersectionCandidates([
          {
            sourceId: source.sourceId,
            layerId: layer.layerId,
            data: {
              type: 'FeatureCollection',
              // 自动模式只托管常见 line + where 场景；
              // 更复杂的 raw filter 仍交给 getCandidates 手动兜底。
              features: (sourceData.features || []).filter((feature) => {
                if ((feature as MapCommonFeature).geometry?.type !== 'LineString') {
                  return false;
                }

                return matchesLayerWhere(feature as MapCommonFeature, layer);
              }) as MapCommonLineFeature[],
            },
          },
        ]);
      });
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
    /**
     * 读取预览交点最终样式覆写。
     * 合并顺序：全局默认 -> 当前实例。
     *
     * @returns 最终预览样式覆写
     */
    const resolvePreviewStyleOverrides = (): IntersectionPreviewStyleOverrides => {
      const globalDefaults = getMapGlobalIntersectionDefaults();
      return resolveIntersectionStyleOverrides(
        globalDefaults?.previewStyleOverrides,
        context.getOptions()?.previewStyleOverrides
      );
    };
    /**
     * 读取正式交点最终样式覆写。
     * 合并顺序：全局默认 -> 当前实例。
     *
     * @returns 最终正式交点样式覆写
     */
    const resolveMaterializedStyleOverrides = (): IntersectionPreviewStyleOverrides => {
      const globalDefaults = getMapGlobalIntersectionDefaults();
      return resolveIntersectionStyleOverrides(
        globalDefaults?.materializedStyleOverrides,
        context.getOptions()?.materializedStyleOverrides
      );
    };
    const controller = useIntersectionPreviewController({
      getOptions: () => context.getOptions(),
      getCandidates: () => {
        const pluginOptions = context.getOptions();
        if (pluginOptions?.getCandidates) {
          return pluginOptions.getCandidates();
        }

        return buildCandidatesFromSourceRegistry(pluginOptions);
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
        // 交点点位应优先于线图层和普通业务点位命中，
        // 否则鼠标落在交点附近时，底下的业务线/点会先把点击抢走。
        hitPriority: INTERSECTION_LAYER_HIT_PRIORITY,
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
            style: createResolvedIntersectionStyle(resolvePreviewStyleOverrides()),
            materializedEnabled: true,
            materializedSourceId: INTERSECTION_MATERIALIZED_SOURCE_ID,
            materializedLayerId: INTERSECTION_MATERIALIZED_LAYER_ID,
            materializedData: controller.materializedData.value,
            materializedStyle: createResolvedMaterializedStyle(resolveMaterializedStyleOverrides()),
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
          removeMaterialized: controller.removeMaterialized,
          updateMaterializedProperties: controller.updateMaterializedProperties,
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
