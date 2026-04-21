import {
  buildIntersectionPointFeature,
  collectLineIntersections,
  type IntersectionScope,
} from '../../shared/map-intersection-tools';
import { useIntersectionPreviewStore } from './useIntersectionPreviewStore';
import type {
  IntersectionPreviewContext,
  IntersectionPreviewState,
  UseIntersectionPreviewControllerOptions,
} from './types';

/**
 * 创建交点预览控制器。
 * 控制器负责把业务线求交结果组装成临时点图层数据，
 * 同时向外暴露读取上下文、切换范围和显隐控制等基础能力。
 *
 * @param options 控制器配置
 * @returns 交点预览控制器
 */
export function useIntersectionPreviewController(
  options: UseIntersectionPreviewControllerOptions
) {
  const store = useIntersectionPreviewStore();

  /**
   * 读取当前最新求交范围。
   * 这里不使用 computed，是因为插件 options 来自宿主描述对象的浅引用；
   * 仅修改 options.scope 这种嵌套字段时，Vue 不会自动追踪到变化。
   *
   * @returns 当前最新求交范围
   */
  const getCurrentScope = (): IntersectionScope => {
    return options.getOptions()?.scope || 'all';
  };

  /**
   * 读取当前控制器状态。
   * @returns 标准化状态对象
   */
  const buildState = (): IntersectionPreviewState => {
    return {
      visible: store.visible.value,
      scope: getCurrentScope(),
      count: store.count.value,
      selectedId: store.selectedId.value,
      lastError: store.lastError.value,
    };
  };

  /**
   * 按插件配置过滤可参与求交的业务线。
   * @returns 过滤后的业务线候选集合
   */
  const getFilteredCandidates = () => {
    const pluginOptions = options.getOptions();
    const sourceIdSet = new Set(pluginOptions?.targetSourceIds || []);
    const layerIdSet = new Set(pluginOptions?.targetLayerIds || []);

    return options.getCandidates().filter((candidate) => {
      if (!sourceIdSet.has(candidate.ref.sourceId || '')) {
        return false;
      }

      if (!layerIdSet.size) {
        return true;
      }

      return layerIdSet.has(candidate.ref.layerId || '');
    });
  };

  /**
   * 将最新交点结果写入 store。
   * @param contexts 最新交点上下文列表
   */
  const commitContexts = (contexts: IntersectionPreviewContext[]): void => {
    const nextContextMap: Record<string, IntersectionPreviewContext> = {};
    const features = contexts.flatMap((context) => {
      if (!context.feature) {
        return [];
      }

      nextContextMap[context.intersectionId] = context;
      return [context.feature];
    });

    store.replace(
      {
        type: 'FeatureCollection',
        features,
      },
      nextContextMap
    );
  };

  /**
   * 清空当前交点并广播状态。
   */
  const clear = (): void => {
    store.clear();
    options.onStateChange?.(buildState());
  };

  /**
   * 重新计算交点集合。
   */
  const refresh = (): void => {
    const pluginOptions = options.getOptions();
    if (!pluginOptions || pluginOptions.enabled === false) {
      clear();
      return;
    }

    store.visible.value = pluginOptions.visible !== false;
    store.lastError.value = null;

    try {
      const selectedContext = options.getSelectedFeatureContext();
      const selectedRef =
        selectedContext?.sourceId && selectedContext.featureId !== null
          ? {
              sourceId: selectedContext.sourceId,
              featureId: selectedContext.featureId,
              layerId: selectedContext.layerId,
            }
          : null;
      const intersections = collectLineIntersections({
        scope: getCurrentScope(),
        selectedRef,
        candidates: getFilteredCandidates(),
        includeEndpoint: pluginOptions.includeEndpoint,
        coordDigits: pluginOptions.coordDigits,
        ignoreSelf: pluginOptions.ignoreSelf,
      });
      const contexts = intersections.map<IntersectionPreviewContext>((intersection) => {
        return {
          ...intersection,
          feature: buildIntersectionPointFeature(intersection, {
            generatedKind: 'intersection-preview',
          }),
        };
      });

      commitContexts(contexts);
    } catch (error) {
      clear();
      store.lastError.value = error instanceof Error ? error.message : '交点计算失败';
    }

    options.onStateChange?.(buildState());
  };

  /**
   * 按交点 ID 读取交点上下文。
   * @param intersectionId 交点 ID
   * @returns 命中的交点上下文
   */
  const getById = (intersectionId: string | null): IntersectionPreviewContext | null => {
    if (!intersectionId) {
      return null;
    }

    return store.contextMap.value[intersectionId] || null;
  };

  /**
   * 读取当前选中的交点上下文。
   * @returns 当前选中的交点上下文
   */
  const getSelected = (): IntersectionPreviewContext | null => {
    return getById(store.selectedId.value);
  };

  /**
   * 设置当前选中的交点。
   * @param intersectionId 目标交点 ID
   */
  const setSelected = (intersectionId: string | null): void => {
    store.setSelectedId(intersectionId);
    options.onStateChange?.(buildState());
  };

  /**
   * 切换当前求交范围。
   * 当前实现不直接改写外部配置对象，只负责在控制器内部重新计算。
   *
   * @param nextScope 目标范围
   */
  const setScope = (nextScope: IntersectionScope): void => {
    const pluginOptions = options.getOptions();
    if (pluginOptions) {
      pluginOptions.scope = nextScope;
    }

    refresh();
  };

  /**
   * 显示交点图层。
   */
  const show = (): void => {
    store.visible.value = true;
    options.onStateChange?.(buildState());
  };

  /**
   * 隐藏交点图层。
   */
  const hide = (): void => {
    store.visible.value = false;
    options.onStateChange?.(buildState());
  };

  return {
    data: store.data,
    visible: store.visible,
    refresh,
    clear,
    show,
    hide,
    setScope,
    setSelected,
    getData: () => store.data.value,
    getById,
    getSelected,
  };
}
