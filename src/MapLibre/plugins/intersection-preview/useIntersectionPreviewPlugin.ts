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
  IntersectionPreviewStateStyles,
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

/** 预览交点默认状态样式。 */
const DEFAULT_PREVIEW_STATE_STYLES: IntersectionPreviewStateStyles = {
  default: {
    radius: 5,
    color: '#ff7a45',
    strokeColor: '#ffffff',
    strokeWidth: 2,
  },
  hover: {
    radius: 6,
    color: '#fa8c16',
  },
  selected: {
    radius: 6,
    color: '#f5222d',
    strokeWidth: 3,
  },
};

/** 正式交点默认状态样式。 */
const DEFAULT_MATERIALIZED_STATE_STYLES: IntersectionPreviewStateStyles = {
  default: {
    radius: 5,
    color: '#1677ff',
    strokeColor: '#ffffff',
    strokeWidth: 2,
  },
  hover: {
    radius: 6,
    color: '#40a9ff',
  },
  selected: {
    radius: 7,
    color: '#0958d9',
  },
};

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
 * 合并交点状态样式配置。
 * 合并顺序：默认值 -> 全局默认 -> 实例局部。
 *
 * @param fallbackStyles 当前图层内置默认状态样式
 * @param globalStyles 全局状态样式配置
 * @param localStyles 实例状态样式配置
 * @returns 最终状态样式配置
 */
function resolveIntersectionStateStyles(
  fallbackStyles: IntersectionPreviewStateStyles,
  globalStyles?: IntersectionPreviewStateStyles,
  localStyles?: IntersectionPreviewStateStyles
): IntersectionPreviewStateStyles {
  return {
    default: {
      ...(fallbackStyles.default || {}),
      ...(globalStyles?.default || {}),
      ...(localStyles?.default || {}),
    },
    hover: {
      ...(fallbackStyles.hover || {}),
      ...(globalStyles?.hover || {}),
      ...(localStyles?.hover || {}),
    },
    selected: {
      ...(fallbackStyles.selected || {}),
      ...(globalStyles?.selected || {}),
      ...(localStyles?.selected || {}),
    },
  };
}

/**
 * 合并交点插件行为配置。
 * 全局只托管默认行为和算法参数，页面局部仍负责数据范围、业务对象和回调。
 *
 * @param localOptions 页面局部交点插件配置
 * @returns 合并全局默认值后的交点插件配置
 */
function resolveIntersectionOptions(
  localOptions: IntersectionPreviewOptions | null | undefined
): IntersectionPreviewOptions | null | undefined {
  const globalDefaults = getMapGlobalIntersectionDefaults();
  if (!globalDefaults && !localOptions) {
    return localOptions;
  }

  return {
    ...(localOptions || {}),
    visible: localOptions?.visible ?? globalDefaults?.visible,
    materializeOnClick:
      localOptions?.materializeOnClick ?? globalDefaults?.materializeOnClick,
    scope: localOptions?.scope ?? globalDefaults?.scope,
    includeEndpoint: localOptions?.includeEndpoint ?? globalDefaults?.includeEndpoint,
    coordDigits: localOptions?.coordDigits ?? globalDefaults?.coordDigits,
    ignoreSelf: localOptions?.ignoreSelf ?? globalDefaults?.ignoreSelf,
  } as IntersectionPreviewOptions;
}

/**
 * 解析预览交点图层样式。
 * 当前交点图层的 hover / selected 视觉状态由状态样式配置驱动，
 * 最后再叠加原始 styleOverrides，保留低层逃生口。
 *
 * @param stateStyles 当前状态样式配置
 * @param overrides 业务层局部样式覆写
 * @returns 最终生效的交点图层样式
 */
function createResolvedIntersectionStyle(
  stateStyles: IntersectionPreviewStateStyles,
  overrides?: IntersectionPreviewStyleOverrides
) {
  const defaultStyle = stateStyles.default || {};
  const hoverStyle = stateStyles.hover || {};
  const selectedStyle = stateStyles.selected || {};

  return createCircleLayerStyle({
    layout: {
      ...(overrides?.layout || {}),
    },
    paint: {
      'circle-radius': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        selectedStyle.radius ?? hoverStyle.radius ?? defaultStyle.radius ?? 5,
        ['boolean', ['feature-state', 'hover'], false],
        hoverStyle.radius ?? defaultStyle.radius ?? 5,
        defaultStyle.radius ?? 5,
      ],
      'circle-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        selectedStyle.color ?? hoverStyle.color ?? defaultStyle.color ?? '#ff7a45',
        ['boolean', ['feature-state', 'hover'], false],
        hoverStyle.color ?? defaultStyle.color ?? '#ff7a45',
        defaultStyle.color ?? '#ff7a45',
      ],
      'circle-stroke-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        selectedStyle.strokeColor ?? hoverStyle.strokeColor ?? defaultStyle.strokeColor ?? '#ffffff',
        ['boolean', ['feature-state', 'hover'], false],
        hoverStyle.strokeColor ?? defaultStyle.strokeColor ?? '#ffffff',
        defaultStyle.strokeColor ?? '#ffffff',
      ],
      'circle-stroke-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        selectedStyle.strokeWidth ?? hoverStyle.strokeWidth ?? defaultStyle.strokeWidth ?? 2,
        ['boolean', ['feature-state', 'hover'], false],
        hoverStyle.strokeWidth ?? defaultStyle.strokeWidth ?? 2,
        defaultStyle.strokeWidth ?? 2,
      ],
      ...(overrides?.paint || {}),
    },
  });
}

/**
 * 解析正式交点图层样式。
 * 当前交点图层的 hover / selected 视觉状态由状态样式配置驱动，
 * 最后再叠加原始 styleOverrides，保留低层逃生口。
 *
 * @param stateStyles 当前状态样式配置
 * @param overrides 业务层局部样式覆写
 * @returns 最终生效的正式交点图层样式
 */
function createResolvedMaterializedStyle(
  stateStyles: IntersectionPreviewStateStyles,
  overrides?: IntersectionPreviewStyleOverrides
) {
  const defaultStyle = stateStyles.default || {};
  const hoverStyle = stateStyles.hover || {};
  const selectedStyle = stateStyles.selected || {};

  return createCircleLayerStyle({
    layout: {
      ...(overrides?.layout || {}),
    },
    paint: {
      'circle-radius': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        selectedStyle.radius ?? hoverStyle.radius ?? defaultStyle.radius ?? 5,
        ['boolean', ['feature-state', 'hover'], false],
        hoverStyle.radius ?? defaultStyle.radius ?? 5,
        defaultStyle.radius ?? 5,
      ],
      'circle-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        selectedStyle.color ?? hoverStyle.color ?? defaultStyle.color ?? '#1677ff',
        ['boolean', ['feature-state', 'hover'], false],
        hoverStyle.color ?? defaultStyle.color ?? '#1677ff',
        defaultStyle.color ?? '#1677ff',
      ],
      'circle-stroke-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        selectedStyle.strokeColor ?? hoverStyle.strokeColor ?? defaultStyle.strokeColor ?? '#ffffff',
        ['boolean', ['feature-state', 'hover'], false],
        hoverStyle.strokeColor ?? defaultStyle.strokeColor ?? '#ffffff',
        defaultStyle.strokeColor ?? '#ffffff',
      ],
      'circle-stroke-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        selectedStyle.strokeWidth ?? hoverStyle.strokeWidth ?? defaultStyle.strokeWidth ?? 2,
        ['boolean', ['feature-state', 'hover'], false],
        hoverStyle.strokeWidth ?? defaultStyle.strokeWidth ?? 2,
        defaultStyle.strokeWidth ?? 2,
      ],
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
    /**
     * 读取合并全局默认值后的交点插件配置。
     * @returns 最终用于运行期行为的交点配置
     */
    const getResolvedOptions = () => resolveIntersectionOptions(context.getOptions());

    const pluginState = ref<IntersectionPreviewState>({
      visible: getResolvedOptions()?.visible !== false,
      scope: getResolvedOptions()?.scope || 'all',
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
     * 读取预览交点最终状态样式。
     * 合并顺序：插件默认 -> 全局默认 -> 当前实例。
     *
     * @returns 最终预览状态样式
     */
    const resolvePreviewStateStyles = (): IntersectionPreviewStateStyles => {
      const globalDefaults = getMapGlobalIntersectionDefaults();
      return resolveIntersectionStateStyles(
        DEFAULT_PREVIEW_STATE_STYLES,
        globalDefaults?.previewStateStyles,
        context.getOptions()?.previewStateStyles
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
    /**
     * 读取正式交点最终状态样式。
     * 合并顺序：插件默认 -> 全局默认 -> 当前实例。
     *
     * @returns 最终正式交点状态样式
     */
    const resolveMaterializedStateStyles = (): IntersectionPreviewStateStyles => {
      const globalDefaults = getMapGlobalIntersectionDefaults();
      return resolveIntersectionStateStyles(
        DEFAULT_MATERIALIZED_STATE_STYLES,
        globalDefaults?.materializedStateStyles,
        context.getOptions()?.materializedStateStyles
      );
    };
    const controller = useIntersectionPreviewController({
      getOptions: getResolvedOptions,
      getCandidates: () => {
        const pluginOptions = getResolvedOptions();
        if (pluginOptions?.getCandidates) {
          return pluginOptions.getCandidates();
        }

        return buildCandidatesFromSourceRegistry(pluginOptions);
      },
      getSelectedFeatureContext: context.getSelectedFeatureContext,
      setScope: (scope) => {
        const rawOptions = context.getOptions();
        if (rawOptions) {
          rawOptions.scope = scope;
        }
      },
      onStateChange: (stateSnapshot) => {
        pluginState.value = stateSnapshot;
      },
    });
    const selectedLayerId = ref<string | null>(null);

    /**
     * 根据图层交互上下文解析交点上下文。
     * @param featureId 当前命中的交点 ID
     * @param layerId 当前命中的图层 ID
     * @returns 命中的交点上下文
     */
    const resolveIntersectionContext = (
      featureId: string | number | null,
      layerId: string | null = null
    ) => {
      const intersectionId = featureId === null ? null : String(featureId);
      if (layerId === INTERSECTION_MATERIALIZED_LAYER_ID) {
        return controller.getMaterializedById(intersectionId);
      }

      if (layerId === INTERSECTION_PREVIEW_LAYER_ID) {
        return controller.getPreviewById(intersectionId);
      }

      return controller.getById(intersectionId);
    };

    /**
     * 同步当前交点选中态。
     * @param intersection 当前命中的交点上下文
     * @param layerId 当前命中的图层 ID
     */
    const syncSelectedIntersection = (
      intersection: IntersectionPreviewContext | null,
      layerId: string | null = null
    ): void => {
      controller.setSelected(intersection?.intersectionId || null);
      selectedLayerId.value = intersection ? layerId : null;
      pluginState.value = {
        ...pluginState.value,
        selectedId: intersection?.intersectionId || null,
      };
    };

    /**
     * 读取当前插件真正选中的交点上下文。
     * 这里会同时区分预览层和正式层，避免正式交点与预览交点共用同一个 ID 时取错快照。
     *
     * @returns 当前插件选中的交点上下文
     */
    const getSelectedIntersectionContext = (): IntersectionPreviewContext | null => {
      return resolveIntersectionContext(controller.getSelected()?.intersectionId || null, selectedLayerId.value);
    };

    /**
     * 当内部数据变化导致当前插件选中目标失效时，同步清理插件交互状态。
     */
    const clearPluginSelectionIfMissing = (): void => {
      if (getSelectedIntersectionContext()) {
        return;
      }

      syncSelectedIntersection(null);
      context.clearPluginHoverState();
      context.clearPluginSelectedFeature();
    };

    /**
     * 判断当前选中变化是否需要触发 selected 模式重算。
     * 这里会忽略插件自身的交点图层选中变化，避免用户点击交点后把当前预览清空。
     *
     * @returns 当前是否需要跟随选中态刷新交点
     */
    const shouldRefreshBySelectionChange = (): boolean => {
      if ((getResolvedOptions()?.scope || 'all') !== 'selected') {
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

    /**
     * 生成交点图层交互配置。
     * @param shouldMaterializeOnClick 点击时是否自动落正式交点点要素
     * @returns 交点图层交互配置
     */
    const createIntersectionLayerInteractiveConfig = (
      layerId: string,
      shouldMaterializeOnClick: boolean
    ) => {
      return {
        cursor: 'pointer',
        // 交点点位应优先于线图层和普通业务点位命中，
        // 否则鼠标落在交点附近时，底下的业务线/点会先把点击抢走。
        hitPriority: INTERSECTION_LAYER_HIT_PRIORITY,
        enableFeatureStateHover: true,
        enableFeatureStateSelected: true,
        onHoverEnter: (contextSnapshot: { featureId: string | number | null }) => {
          const intersection = resolveIntersectionContext(contextSnapshot.featureId, layerId);
          intersection && getResolvedOptions()?.onHoverEnter?.(intersection);
        },
        onHoverLeave: (contextSnapshot: { featureId: string | number | null }) => {
          const intersection = resolveIntersectionContext(contextSnapshot.featureId, layerId);
          intersection && getResolvedOptions()?.onHoverLeave?.(intersection);
        },
        onFeatureSelect: (contextSnapshot: { featureId: string | number | null }) => {
          syncSelectedIntersection(
            resolveIntersectionContext(contextSnapshot.featureId, layerId),
            layerId
          );
        },
        onFeatureDeselect: () => {
          syncSelectedIntersection(null);
        },
        onClick: (contextSnapshot: { featureId: string | number | null }) => {
          const intersection = resolveIntersectionContext(contextSnapshot.featureId, layerId);
          syncSelectedIntersection(intersection, layerId);
          if (shouldMaterializeOnClick && intersection) {
            controller.materialize(intersection.intersectionId);
          }
          intersection && getResolvedOptions()?.onClick?.(intersection);
        },
        onContextMenu: (contextSnapshot: { featureId: string | number | null }) => {
          const intersection = resolveIntersectionContext(contextSnapshot.featureId, layerId);
          syncSelectedIntersection(intersection, layerId);
          intersection && getResolvedOptions()?.onContextMenu?.(intersection);
        },
      };
    };

    /**
     * 对外暴露刷新方法。
     * 刷新后若当前插件选中目标已失效，需要同步清理插件交互层残留状态。
     */
    const refresh = (): void => {
      controller.refresh();
      clearPluginSelectionIfMissing();
    };

    /**
     * 对外暴露清空预览方法。
     */
    const clear = (): void => {
      controller.clear();
      syncSelectedIntersection(null);
      context.clearPluginHoverState();
      context.clearPluginSelectedFeature();
    };

    /**
     * 对外暴露物化方法。
     * @param intersectionId 目标交点 ID
     * @returns 是否物化成功
     */
    const materialize = (intersectionId?: string | null): boolean => {
      return controller.materialize(intersectionId);
    };

    /**
     * 对外暴露删除正式交点方法。
     * @param intersectionId 目标交点 ID
     * @returns 是否删除成功
     */
    const removeMaterialized = (intersectionId?: string | null): boolean => {
      const removed = controller.removeMaterialized(intersectionId);
      clearPluginSelectionIfMissing();
      return removed;
    };

    /**
     * 对外暴露清空全部正式交点方法。
     */
    const clearMaterialized = (): void => {
      controller.clearMaterialized();
      clearPluginSelectionIfMissing();
    };

    refresh();

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
            style: createResolvedIntersectionStyle(
              resolvePreviewStateStyles(),
              resolvePreviewStyleOverrides()
            ),
            materializedEnabled: true,
            materializedSourceId: INTERSECTION_MATERIALIZED_SOURCE_ID,
            materializedLayerId: INTERSECTION_MATERIALIZED_LAYER_ID,
            materializedData: controller.materializedData.value,
            materializedStyle: createResolvedMaterializedStyle(
              resolveMaterializedStateStyles(),
              resolveMaterializedStyleOverrides()
            ),
          },
        },
      ],
      getMapInteractivePatch: () => {
        return {
          onSelectionChange: () => {
            if (!shouldRefreshBySelectionChange()) {
              return;
            }

            refresh();
          },
        };
      },
      getPluginLayerInteractivePatch: () => ({
        layers: {
          [INTERSECTION_PREVIEW_LAYER_ID]: createIntersectionLayerInteractiveConfig(
            INTERSECTION_PREVIEW_LAYER_ID,
            getResolvedOptions()?.materializeOnClick !== false
          ),
          [INTERSECTION_MATERIALIZED_LAYER_ID]: createIntersectionLayerInteractiveConfig(
            INTERSECTION_MATERIALIZED_LAYER_ID,
            false
          ),
        },
      }),
      resolveSelectedFeatureSnapshot: () => {
        return getSelectedIntersectionContext()?.feature || null;
      },
      getApi: () =>
        ({
          refresh,
          clear,
          materialize,
          removeMaterialized,
          updateMaterializedProperties: controller.updateMaterializedProperties,
          clearMaterialized,
          show: controller.show,
          hide: controller.hide,
          setScope: controller.setScope,
          getData: controller.getData,
          getMaterializedData: controller.getMaterializedData,
          getById: controller.getById,
          getPreviewById: controller.getPreviewById,
          getMaterializedById: controller.getMaterializedById,
          getSelected: getSelectedIntersectionContext,
        }) as IntersectionPreviewPluginApi,
      state: computed(() => pluginState.value),
    };
  },
});
