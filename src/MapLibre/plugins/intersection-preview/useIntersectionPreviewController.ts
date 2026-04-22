import {
  buildIntersectionPointFeature,
  buildMaterializedIntersectionFeature,
  collectLineIntersections,
  type IntersectionScope,
} from '../../shared/map-intersection-tools';
import type { MapCommonFeature } from '../../shared/map-common-tools';
import { useIntersectionPreviewStore } from './useIntersectionPreviewStore';
import type {
  IntersectionPreviewContext,
  IntersectionPreviewState,
  UseIntersectionPreviewControllerOptions,
} from './types';

/**
 * 构建预览交点上下文。
 * @param intersection 原始交点领域对象
 * @returns 携带预览点要素的交点上下文
 */
function createPreviewIntersectionContext(intersection: IntersectionPreviewContext): IntersectionPreviewContext;
function createPreviewIntersectionContext(
  intersection: Parameters<typeof buildIntersectionPointFeature>[0]
): IntersectionPreviewContext;
function createPreviewIntersectionContext(
  intersection: Parameters<typeof buildIntersectionPointFeature>[0]
): IntersectionPreviewContext {
  return {
    ...intersection,
    feature: buildIntersectionPointFeature(intersection, {
      generatedKind: 'intersection-preview',
    }) as MapCommonFeature,
  };
}

/**
 * 构建正式交点上下文。
 * @param intersection 原始交点领域对象
 * @returns 携带正式点要素的交点上下文
 */
function createMaterializedIntersectionContext(
  intersection: Parameters<typeof buildMaterializedIntersectionFeature>[0]
): IntersectionPreviewContext {
  return {
    ...intersection,
    feature: buildMaterializedIntersectionFeature(intersection) as MapCommonFeature,
  };
}

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
  store.visible.value = options.getOptions()?.visible !== false;

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
      materializedCount: store.materializedCount.value,
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

    syncMaterializedContexts(nextContextMap);
  };

  /**
   * 用最新预览上下文同步正式交点点要素快照。
   * @param nextPreviewContextMap 最新预览上下文映射
   */
  const syncMaterializedContexts = (
    nextPreviewContextMap: Record<string, IntersectionPreviewContext>
  ): void => {
    const nextMaterializedContextMap = {
      ...store.materializedContextMap.value,
    };

    Object.keys(nextMaterializedContextMap).forEach((intersectionId) => {
      const latestPreviewContext = nextPreviewContextMap[intersectionId];
      if (!latestPreviewContext) {
        return;
      }

      nextMaterializedContextMap[intersectionId] =
        createMaterializedIntersectionContext(latestPreviewContext);
    });

    store.replaceMaterialized(nextMaterializedContextMap);
  };

  /**
   * 清空当前交点并广播状态。
   */
  const clear = (): void => {
    store.clear();
    options.onStateChange?.(buildState());
  };

  /**
   * 清空当前正式交点点要素集合并广播状态。
   */
  const clearMaterialized = (): void => {
    store.clearMaterialized();
    options.onStateChange?.(buildState());
  };

  /**
   * 重新计算交点集合。
   */
  const refresh = (): void => {
    const pluginOptions = options.getOptions();
    if (!pluginOptions || pluginOptions.enabled === false) {
      store.clear();
      store.clearMaterialized();
      options.onStateChange?.(buildState());
      return;
    }
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
        return createPreviewIntersectionContext(intersection);
      });

      commitContexts(contexts);
    } catch (error) {
      store.clear();
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

    return store.contextMap.value[intersectionId] || store.materializedContextMap.value[intersectionId] || null;
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
   * 将指定交点落成正式交点点要素。
   * @param intersectionId 目标交点 ID；不传时默认使用当前选中交点
   * @returns 是否成功落点
   */
  const materialize = (intersectionId: string | null = store.selectedId.value): boolean => {
    const intersection = getById(intersectionId);
    if (!intersection) {
      return false;
    }

    store.replaceMaterialized({
      ...store.materializedContextMap.value,
      [intersection.intersectionId]: createMaterializedIntersectionContext(intersection),
    });
    options.onStateChange?.(buildState());
    return true;
  };

  /**
   * 切换当前求交范围。
   * 当前实现会同步回写外部描述对象上的 scope，
   * 这样插件宿主、门面与运行时控制器会始终读取到同一份最新范围。
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
    materializedData: store.materializedData,
    visible: store.visible,
    refresh,
    clear,
    materialize,
    clearMaterialized,
    show,
    hide,
    setScope,
    setSelected,
    getData: () => store.data.value,
    getMaterializedData: () => store.materializedData.value,
    getById,
    getSelected,
  };
}
