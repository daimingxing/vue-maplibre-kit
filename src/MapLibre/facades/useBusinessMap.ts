import type { MaybeRefOrGetter } from 'vue';
import type { MapFeatureId } from '../composables/useMapDataUpdate';
import { useMapEffect, type UseMapEffectResult } from '../composables/useMapEffect';
import { useMapSelection, type UseMapSelectionResult } from '../composables/useMapSelection';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type { MapSourceFeatureRef } from '../shared/map-common-tools';
import type { MapBusinessSource, MapBusinessSourceRegistry } from './createMapBusinessSource';
import {
  useIntersectionPreview,
  type UseIntersectionPreviewResult,
} from './useIntersectionPreview';
import { useLineDraftPreview, type UseLineDraftPreviewResult } from './useLineDraftPreview';
import {
  useMapFeatureActions,
  type UseMapFeatureActionsResult,
} from './useMapFeatureActions';
import {
  useMapFeaturePropertyEditor,
  type UseMapFeaturePropertyEditorResult,
} from './useMapFeaturePropertyEditor';
import { useMapFeatureQuery, type UseMapFeatureQueryResult } from './useMapFeatureQuery';
import {
  useMapFeatureMultiSelect,
  type UseMapFeatureMultiSelectResult,
} from './useMapFeatureMultiSelect';
import { useMapLayerActions, type UseMapLayerActionsResult } from './useMapLayerActions';

/** useBusinessMap 初始化配置。 */
export interface UseBusinessMapOptions {
  /** 地图组件公开实例引用。 */
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>;
  /** 正式业务数据源注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
}

/**
 * useBusinessMap 的业务数据源分组。
 * 当业务层需要按 `sourceId` 读取正式业务源，
 * 或把 `sourceId + featureId` 收口成标准来源引用时，优先从这里取能力。
 */
export interface UseBusinessMapSources {
  /**
   * 当前页面使用的业务数据源注册表。
   * 只有在高层快捷方法不够时，才建议继续下探到 `registry` 本体。
   */
  registry: MapBusinessSourceRegistry;
  /**
   * 按 sourceId 读取正式业务 source。
   * 适合在业务层需要拿到 source 的属性治理规则或完整读写能力时使用。
   *
   * @param sourceId 目标业务 source ID
   * @returns 命中的业务 source；找不到时返回 null
   */
  getSource: (sourceId: string | null | undefined) => MapBusinessSource | null;
  /**
   * 列出当前页面已注册的全部业务 source。
   * 适合调试、初始化校验或动态 source 面板展示。
   *
   * @returns 当前全部业务 source 列表
   */
  listSources: () => MapBusinessSource[];
  /**
   * 将 `sourceId + featureId` 归一化为标准来源引用。
   * 业务层如果需要把上下文对象、表格行或表单项转换成统一目标，
   * 推荐优先走这里，而不是自己手写对象结构。
   *
   * @param sourceId 目标业务 source ID
   * @param featureId 目标要素 ID
   * @param layerId 当前命中的业务图层 ID
   * @returns 标准来源引用；参数不足时返回 null
   */
  createFeatureRef: (
    sourceId: string,
    featureId: MapFeatureId | null,
    layerId?: string | null
  ) => MapSourceFeatureRef | null;
}

/**
 * useBusinessMap 的统一要素分组。
 * 这个分组把“查要素”和“改要素”合并到同一个入口里，
 * 业务层通常先到这里找能力。
 *
 * 常见场景：
 * - 读取当前选中的最新线要素
 * - 根据事件上下文解析 featureRef
 * - 生成线草稿
 * - 替换线廊
 * - 保存当前选中要素属性
 */
export interface UseBusinessMapFeatureGroup
  extends UseMapFeatureQueryResult,
    UseMapFeatureActionsResult {}

/** useBusinessMap 的插件短路径分组。 */
export interface UseBusinessMapPlugins {
  /** 线草稿插件分组。 */
  lineDraft: UseLineDraftPreviewResult;
  /** 交点插件分组。 */
  intersection: UseIntersectionPreviewResult;
  /** 要素多选插件分组。 */
  multiSelect: UseMapFeatureMultiSelectResult;
}

/**
 * useBusinessMap 返回结果。
 * 设计目标不是隐藏全部 GIS 概念，
 * 而是把业务页最常一起使用的能力收口成几个稳定分组，
 * 让业务层优先按“我要做什么”来找入口。
 */
export interface UseBusinessMapResult {
  /** 当前业务页使用的地图实例引用。通常只在极少数高级场景下才需要直接访问。 */
  mapRef: UseBusinessMapOptions['mapRef'];
  /** 正式业务数据源分组。需要读取 source 或构造标准来源引用时使用。 */
  sources: UseBusinessMapSources;
  /** 普通图层选中态分组。进入多选、退出多选、读取选中集时使用。 */
  selection: UseMapSelectionResult;
  /** 要素分组。读取要素、生成线草稿、替换线廊、保存当前选中要素等高频操作都从这里取。 */
  feature: UseBusinessMapFeatureGroup;
  /** 图层运行时动作分组。临时显隐、样式和 feature-state 调整从这里取。 */
  layers: UseMapLayerActionsResult;
  /** 属性编辑分组。打开属性面板、保存单个字段、删除单个字段时使用。 */
  editor: UseMapFeaturePropertyEditorResult;
  /** 插件短路径分组。需要直接调用插件能力时推荐优先使用这里。 */
  plugins: UseBusinessMapPlugins;
  /** feature-state 特效分组。闪烁、高亮等页面级效果从这里取。 */
  effect: UseMapEffectResult;
}

/**
 * 构建业务数据源分组。
 * 这里保留注册表本体，同时把最常用的读取方法直接挂出来，
 * 方便业务层在不关心底层门面拆分的前提下访问 source 能力。
 *
 * @param sourceRegistry 正式业务数据源注册表
 * @returns 稳定的业务数据源分组对象
 */
function createBusinessMapSources(
  sourceRegistry: MapBusinessSourceRegistry
): UseBusinessMapSources {
  return {
    registry: sourceRegistry,
    getSource: sourceRegistry.getSource,
    listSources: sourceRegistry.listSources,
    createFeatureRef: sourceRegistry.createFeatureRef,
  };
}

/**
 * 构建统一要素分组。
 * 这里把“查询”和“动作”两个高频门面合并到同一个业务分组里，
 * 业务层后续只需要记住一个 `feature` 入口即可。
 *
 * @param options 聚合入口初始化配置
 * @returns 统一要素分组
 */
function createBusinessMapFeatureGroup(
  options: UseBusinessMapOptions
): UseBusinessMapFeatureGroup {
  const featureQuery = useMapFeatureQuery(options);
  const featureActions = useMapFeatureActions(options);

  return {
    ...featureQuery,
    ...featureActions,
  };
}

/**
 * 读取当前地图的业务聚合门面。
 * 它不会试图隐藏全部 GIS 概念，而是把业务页最常一起使用的能力
 * 收口成稳定的分组对象，减少业务层自己拼装多个 `use*` 门面的负担。
 *
 * 推荐业务层先按下面的顺序找入口：
 * 1. 选中态相关 -> `businessMap.selection`
 * 2. 要素查询/动作 -> `businessMap.feature`
 * 3. 属性编辑 -> `businessMap.editor`
 * 4. 插件能力 -> `businessMap.plugins`
 * 5. 动效 -> `businessMap.effect`
 *
 * @param options 聚合入口初始化配置
 * @returns 适合业务页直接消费的高层能力分组
 */
export function useBusinessMap(options: UseBusinessMapOptions): UseBusinessMapResult {
  const { mapRef, sourceRegistry } = options;

  // 正式业务数据源通常会被多个业务分组共同依赖，因此统一从顶层暴露。
  const sources = createBusinessMapSources(sourceRegistry);

  // 下面这些能力都继续复用现有门面，避免重复实现底层逻辑。
  const selection = useMapSelection(mapRef);
  const feature = createBusinessMapFeatureGroup(options);
  const layers = useMapLayerActions(mapRef);
  const editor = useMapFeaturePropertyEditor(options);
  const draft = useLineDraftPreview(mapRef);
  const intersection = useIntersectionPreview(mapRef);
  const multiSelect = useMapFeatureMultiSelect(mapRef);
  const plugins: UseBusinessMapPlugins = {
    lineDraft: draft,
    intersection,
    multiSelect,
  };
  const effect = useMapEffect(mapRef);

  return {
    mapRef,
    sources,
    selection,
    feature,
    layers,
    editor,
    plugins,
    effect,
  };
}
