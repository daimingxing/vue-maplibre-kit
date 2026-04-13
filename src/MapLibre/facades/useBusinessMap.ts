import type { MaybeRefOrGetter } from 'vue';
import { useMapEffect, type UseMapEffectResult } from '../composables/useMapEffect';
import { useMapSelection, type UseMapSelectionResult } from '../composables/useMapSelection';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type { MapBusinessSourceRegistry } from './createMapBusinessSource';
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

/** useBusinessMap 初始化配置。 */
export interface UseBusinessMapOptions {
  /** 地图组件公开实例引用。 */
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>;
  /** 正式业务数据源注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
}

/** useBusinessMap 的业务数据源分组。 */
export interface UseBusinessMapSources {
  /** 当前页面使用的业务数据源注册表。 */
  registry: MapBusinessSourceRegistry;
  /** 读取指定业务 source。 */
  getSource: MapBusinessSourceRegistry['getSource'];
  /** 列出全部已注册业务 source。 */
  listSources: MapBusinessSourceRegistry['listSources'];
  /** 创建标准来源引用。 */
  createFeatureRef: MapBusinessSourceRegistry['createFeatureRef'];
}

/** useBusinessMap 的统一要素分组。 */
export interface UseBusinessMapFeatureGroup
  extends UseMapFeatureQueryResult,
    UseMapFeatureActionsResult {}

/** useBusinessMap 返回结果。 */
export interface UseBusinessMapResult {
  /** 当前业务页使用的地图实例引用。 */
  mapRef: UseBusinessMapOptions['mapRef'];
  /** 正式业务数据源分组。 */
  sources: UseBusinessMapSources;
  /** 普通图层选中态能力。 */
  selection: UseMapSelectionResult;
  /** 要素查询与动作能力。 */
  feature: UseBusinessMapFeatureGroup;
  /** 属性编辑能力。 */
  editor: UseMapFeaturePropertyEditorResult;
  /** 线草稿能力。 */
  draft: UseLineDraftPreviewResult;
  /** feature-state 特效能力。 */
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
  const editor = useMapFeaturePropertyEditor(options);
  const draft = useLineDraftPreview(mapRef);
  const effect = useMapEffect(mapRef);

  return {
    mapRef,
    sources,
    selection,
    feature,
    editor,
    draft,
    effect,
  };
}
