import {
  buildIntersectionPointFeature,
  buildMaterializedIntersectionFeature,
  collectLineIntersections,
  type IntersectionScope,
} from '../../shared/map-intersection-tools';
import type { MapCommonFeature, MapCommonProperties } from '../../shared/map-common-tools';
import { useIntersectionPreviewStore } from './useIntersectionPreviewStore';
import type {
  IntersectionPreviewContext,
  IntersectionPreviewState,
  UseIntersectionPreviewControllerOptions,
} from './types';

/** 正式交点系统保留属性。 */
const MATERIALIZED_RESERVED_PROPERTY_KEYS = new Set([
  'id',
  'intersectionId',
  'scope',
  'isEndpointHit',
  'leftSourceId',
  'leftFeatureId',
  'rightSourceId',
  'rightFeatureId',
  'leftSegmentIndex',
  'rightSegmentIndex',
  'generatedKind',
]);

/**
 * 清洗正式交点的业务自定义属性。
 * 系统保留字段始终由插件自己维护，业务层只允许补充额外属性。
 *
 * @param properties 原始属性对象
 * @returns 仅保留业务自定义字段后的属性对象
 */
function sanitizeMaterializedProperties(
  properties?: MapCommonProperties | null
): MapCommonProperties {
  const nextProperties: MapCommonProperties = {};

  Object.entries(properties || {}).forEach(([propertyKey, propertyValue]) => {
    if (MATERIALIZED_RESERVED_PROPERTY_KEYS.has(propertyKey)) {
      return;
    }

    nextProperties[propertyKey] = propertyValue;
  });

  return nextProperties;
}

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
  intersection: Parameters<typeof buildMaterializedIntersectionFeature>[0],
  extraProperties: MapCommonProperties = {}
): IntersectionPreviewContext {
  return {
    ...intersection,
    feature: buildMaterializedIntersectionFeature(
      intersection,
      sanitizeMaterializedProperties(extraProperties)
    ) as MapCommonFeature,
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
   * 读取正式交点当前保留的业务自定义属性。
   * @param context 当前正式交点上下文
   * @returns 可继续复用的业务属性对象
   */
  const getMaterializedCustomProperties = (
    context: IntersectionPreviewContext | null | undefined
  ): MapCommonProperties => {
    return sanitizeMaterializedProperties((context?.feature?.properties || null) as MapCommonProperties);
  };

  /**
   * 判断指定来源引用是否命中了“正式交点属性继承来源图层”。
   * @param layerId 当前参与方图层 ID
   * @returns 是否命中继承来源图层
   */
  const isInheritedLayer = (layerId: string | null | undefined): boolean => {
    const inheritLayerId = options.getOptions()?.inheritMaterializedPropertiesFromLayerId;
    return Boolean(inheritLayerId && layerId && inheritLayerId === layerId);
  };

  /**
   * 判断两个来源引用是否指向同一条业务线。
   * @param left 左侧来源引用
   * @param right 右侧来源引用
   * @returns 指向同一条线时返回 true
   */
  const isSameFeatureRef = (
    left: { sourceId?: string | null; featureId?: string | number | null; layerId?: string | null } | null,
    right: { sourceId?: string | null; featureId?: string | number | null; layerId?: string | null } | null
  ): boolean => {
    if (!left || !right) {
      return false;
    }

    return (
      left.sourceId === right.sourceId &&
      left.featureId === right.featureId &&
      left.layerId === right.layerId
    );
  };

  /**
   * 解析当前正式交点需要继承属性的业务线来源。
   * @param intersection 当前交点上下文
   * @returns 命中的正式业务线来源；未命中时返回 null
   */
  const resolveInheritedFeatureRef = (
    intersection: IntersectionPreviewContext
  ): typeof intersection.leftRef | null => {
    const leftMatched = isInheritedLayer(intersection.leftRef.layerId || null);
    const rightMatched = isInheritedLayer(intersection.rightRef.layerId || null);

    if (!leftMatched && !rightMatched) {
      return null;
    }

    if (leftMatched && !rightMatched) {
      return intersection.leftRef;
    }

    if (!leftMatched && rightMatched) {
      return intersection.rightRef;
    }

    if (getCurrentScope() === 'selected') {
      const selectedContext = options.getSelectedFeatureContext();
      if (isSameFeatureRef(selectedContext || null, intersection.leftRef)) {
        return intersection.leftRef;
      }

      if (isSameFeatureRef(selectedContext || null, intersection.rightRef)) {
        return intersection.rightRef;
      }
    }

    return intersection.leftRef;
  };

  /**
   * 解析正式交点首次落点时需要继承的业务属性。
   * @param intersection 当前交点上下文
   * @returns 当前交点可继承的业务属性
   */
  const resolveInheritedMaterializedProperties = (
    intersection: IntersectionPreviewContext
  ): MapCommonProperties => {
    const sourceRegistry = options.getOptions()?.sourceRegistry;
    const inheritedRef = resolveInheritedFeatureRef(intersection);
    if (!sourceRegistry || !inheritedRef?.sourceId || inheritedRef.featureId === null) {
      return {};
    }

    const inheritedFeature = sourceRegistry.resolveFeature(inheritedRef);
    return sanitizeMaterializedProperties(
      (inheritedFeature?.properties || null) as MapCommonProperties
    );
  };

  /**
   * 解析当前交点首次落点时的默认业务属性。
   * @param intersection 当前交点上下文
   * @returns 当前交点应注入的默认业务属性
   */
  const resolveMaterializedProperties = (
    intersection: IntersectionPreviewContext
  ): MapCommonProperties => {
    const inheritedProperties = resolveInheritedMaterializedProperties(intersection);
    const propertyResolver = options.getOptions()?.materializedProperties;
    if (!propertyResolver) {
      return inheritedProperties;
    }

    const rawProperties =
      typeof propertyResolver === 'function' ? propertyResolver(intersection) : propertyResolver;

    return {
      ...inheritedProperties,
      ...sanitizeMaterializedProperties(rawProperties),
    };
  };

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
        createMaterializedIntersectionContext(
          latestPreviewContext,
          getMaterializedCustomProperties(nextMaterializedContextMap[intersectionId])
        );
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

    // 兼容入口在双层共存时默认返回正式点，避免门面读取到过期的预览层上下文。
    return (
      store.materializedContextMap.value[intersectionId] || store.contextMap.value[intersectionId] || null
    );
  };

  /**
   * 按交点 ID 读取预览交点上下文。
   * @param intersectionId 目标交点 ID
   * @returns 命中的预览交点上下文
   */
  const getPreviewById = (intersectionId: string | null): IntersectionPreviewContext | null => {
    if (!intersectionId) {
      return null;
    }

    return store.contextMap.value[intersectionId] || null;
  };

  /**
   * 按交点 ID 读取正式交点上下文。
   * @param intersectionId 目标交点 ID
   * @returns 命中的正式交点上下文
   */
  const getMaterializedById = (intersectionId: string | null): IntersectionPreviewContext | null => {
    if (!intersectionId) {
      return null;
    }

    return store.materializedContextMap.value[intersectionId] || null;
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

    const currentMaterializedContext = store.materializedContextMap.value[intersection.intersectionId];
    const nextCustomProperties = currentMaterializedContext
      ? getMaterializedCustomProperties(currentMaterializedContext)
      : resolveMaterializedProperties(intersection);

    store.replaceMaterialized({
      ...store.materializedContextMap.value,
      [intersection.intersectionId]: createMaterializedIntersectionContext(
        intersection,
        nextCustomProperties
      ),
    });
    options.onStateChange?.(buildState());
    return true;
  };

  /**
   * 删除指定正式交点点要素。
   * @param intersectionId 目标交点 ID；不传时默认使用当前选中交点
   * @returns 是否删除成功
   */
  const removeMaterialized = (
    intersectionId: string | null = store.selectedId.value
  ): boolean => {
    if (!intersectionId || !store.materializedContextMap.value[intersectionId]) {
      return false;
    }

    const nextContextMap = {
      ...store.materializedContextMap.value,
    };

    delete nextContextMap[intersectionId];
    store.replaceMaterialized(nextContextMap);
    options.onStateChange?.(buildState());
    return true;
  };

  /**
   * 更新指定正式交点点要素的业务属性。
   * @param intersectionId 目标交点 ID
   * @param patch 业务属性补丁
   * @returns 是否更新成功
   */
  const updateMaterializedProperties = (
    intersectionId: string,
    patch: MapCommonProperties
  ): boolean => {
    const currentContext = store.materializedContextMap.value[intersectionId];
    if (!currentContext) {
      return false;
    }

    const nextCustomProperties = {
      ...getMaterializedCustomProperties(currentContext),
      ...sanitizeMaterializedProperties(patch),
    };

    store.replaceMaterialized({
      ...store.materializedContextMap.value,
      [intersectionId]: createMaterializedIntersectionContext(
        currentContext,
        nextCustomProperties
      ),
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
    removeMaterialized,
    updateMaterializedProperties,
    clearMaterialized,
    show,
    hide,
    setScope,
    setSelected,
    getData: () => store.data.value,
    getMaterializedData: () => store.materializedData.value,
    getById,
    getPreviewById,
    getMaterializedById,
    getSelected,
  };
}
