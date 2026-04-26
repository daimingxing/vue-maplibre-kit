import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  MapDxfExportPluginApi,
  MapDxfExportState,
} from '../plugins/map-dxf-export';
import type {
  LineDraftPreviewPluginApi,
  LineDraftPreviewStateChangePayload,
} from '../plugins/line-draft-preview/useLineDraftPreviewController';
import type {
  IntersectionPreviewPluginApi,
  IntersectionPreviewState,
} from '../plugins/intersection-preview';
import type {
  MapFeatureMultiSelectPluginApi,
  MapFeatureMultiSelectState,
} from '../plugins/map-feature-multi-select';

const MAP_DXF_EXPORT_PLUGIN_TYPE = 'mapDxfExport';
const LINE_DRAFT_PREVIEW_PLUGIN_TYPE = 'lineDraftPreview';
const INTERSECTION_PREVIEW_PLUGIN_TYPE = 'intersectionPreview';
const MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE = 'mapFeatureMultiSelect';

/** 按类型解析出的插件目标。 */
export interface ResolvedMapPluginTarget {
  /** 当前插件唯一标识。 */
  id: string;
  /** 当前插件类型。 */
  type: string;
}

/**
 * 按插件类型解析目标插件。
 * 同一个 map 实例内，同类型插件应当唯一，因此这里直接按 type 定位唯一目标。
 * `pluginId` 仅作为历史兼容参数保留，用于额外校验命中的唯一插件是否符合旧调用方预期。
 * @param mapExpose 地图公开实例
 * @param pluginType 目标插件类型
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的插件目标；找不到时返回 null
 */
export function resolveMapPluginTargetByType(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginType: string,
  pluginId?: string
): ResolvedMapPluginTarget | null {
  const pluginHost = mapExpose?.plugins;
  if (!pluginHost) {
    return null;
  }

  const matchedPluginList = pluginHost.list().filter((plugin) => plugin.type === pluginType);
  if (!matchedPluginList.length) {
    return null;
  }

  if (matchedPluginList.length > 1) {
    throw new Error(
      `[resolveMapPluginTargetByType] 当前 map 实例存在多个 type 为 '${pluginType}' 的插件实例，请检查插件注册配置`
    );
  }

  const matchedPlugin = matchedPluginList[0];
  if (pluginId && matchedPlugin.id !== pluginId) {
    return null;
  }

  return matchedPlugin;
}

/**
 * 读取线草稿插件 API。
 * @param mapExpose 地图公开实例
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的线草稿插件 API；找不到时返回 null
 */
export function resolveLineDraftPreviewApi(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): LineDraftPreviewPluginApi | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getApi<LineDraftPreviewPluginApi>(pluginTarget.id) || null;
}

/**
 * 读取线草稿插件状态。
 * @param mapExpose 地图公开实例
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的线草稿插件状态；找不到时返回 null
 */
export function resolveLineDraftPreviewState(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): LineDraftPreviewStateChangePayload | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getState<LineDraftPreviewStateChangePayload>(pluginTarget.id) || null;
}

/**
 * 读取交点预览插件 API。
 * @param mapExpose 地图公开实例
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的交点预览插件 API；找不到时返回 null
 */
export function resolveIntersectionPreviewApi(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): IntersectionPreviewPluginApi | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    INTERSECTION_PREVIEW_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getApi<IntersectionPreviewPluginApi>(pluginTarget.id) || null;
}

/**
 * 读取交点预览插件状态。
 * @param mapExpose 地图公开实例
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的交点预览插件状态；找不到时返回 null
 */
export function resolveIntersectionPreviewState(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): IntersectionPreviewState | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    INTERSECTION_PREVIEW_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getState<IntersectionPreviewState>(pluginTarget.id) || null;
}

/**
 * 读取要素多选插件 API。
 * @param mapExpose 地图公开实例
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的要素多选插件 API；找不到时返回 null
 */
export function resolveMapFeatureMultiSelectApi(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): MapFeatureMultiSelectPluginApi | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getApi<MapFeatureMultiSelectPluginApi>(pluginTarget.id) || null;
}

/**
 * 读取要素多选插件状态。
 * @param mapExpose 地图公开实例
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的要素多选插件状态；找不到时返回 null
 */
export function resolveMapFeatureMultiSelectState(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): MapFeatureMultiSelectState | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getState<MapFeatureMultiSelectState>(pluginTarget.id) || null;
}

/**
 * 读取 DXF 导出插件 API。
 * @param mapExpose 地图公开实例
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的 DXF 导出插件 API；找不到时返回 null
 */
export function resolveMapDxfExportApi(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): MapDxfExportPluginApi | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    MAP_DXF_EXPORT_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getApi<MapDxfExportPluginApi>(pluginTarget.id) || null;
}

/**
 * 读取 DXF 导出插件状态。
 * @param mapExpose 地图公开实例
 * @param pluginId 历史兼容参数；传入时会额外校验唯一插件 ID
 * @returns 命中的 DXF 导出插件状态；找不到时返回 null
 */
export function resolveMapDxfExportState(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): MapDxfExportState | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    MAP_DXF_EXPORT_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getState<MapDxfExportState>(pluginTarget.id) || null;
}
