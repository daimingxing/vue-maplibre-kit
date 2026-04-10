import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import {
  LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  type LineDraftPreviewPluginApi,
  type LineDraftPreviewStateChangePayload,
} from '../plugins/line-draft-preview';

/** 已输出过歧义提示的插件类型集合。 */
const warnedPluginTypeSet = new Set<string>();

/** 按类型解析出的插件目标。 */
export interface ResolvedMapPluginTarget {
  /** 当前插件唯一标识。 */
  id: string;
  /** 当前插件类型。 */
  type: string;
}

/**
 * 针对“同类型插件出现多个实例”的情况输出一次提示。
 * @param pluginType 当前插件类型
 */
function warnAmbiguousPluginType(pluginType: string): void {
  if (warnedPluginTypeSet.has(pluginType)) {
    return;
  }

  warnedPluginTypeSet.add(pluginType);
  console.warn(
    `[resolveMapPluginTargetByType] 检测到多个 type 为 '${pluginType}' 的插件实例，当前会优先使用第一个实例；如需精确控制，请显式传入 pluginId`
  );
}

/**
 * 按插件类型解析目标插件。
 * 若未传 pluginId，则默认按 type 自动查找。
 * @param mapExpose 地图公开实例
 * @param pluginType 目标插件类型
 * @param pluginId 可选的目标插件 ID
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

  const pluginList = pluginHost.list();
  if (pluginId) {
    return pluginList.find((plugin) => plugin.id === pluginId && plugin.type === pluginType) || null;
  }

  const matchedPluginList = pluginList.filter((plugin) => plugin.type === pluginType);
  if (!matchedPluginList.length) {
    return null;
  }

  if (matchedPluginList.length > 1) {
    warnAmbiguousPluginType(pluginType);
  }

  return matchedPluginList[0];
}

/**
 * 读取线草稿插件 API。
 * @param mapExpose 地图公开实例
 * @param pluginId 可选的线草稿插件 ID
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
 * @param pluginId 可选的线草稿插件 ID
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
