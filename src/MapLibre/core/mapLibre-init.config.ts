import type { MapOptions } from 'maplibre-gl';
import type { MapControlsConfig } from '../shared/mapLibre-controls-types';
import { getMapGlobalMapControls, getMapGlobalMapOptions } from '../shared/map-global-config';
import { cloneDeep, mergeWith } from 'lodash-es';

/** MapLibreInit 内部使用的地图配置类型。 */
export type MapLibreInitOptions = Partial<MapOptions & { mapStyle: string | object }>;

/**
 * 解析 MapLibreInit 最终生效的地图配置。
 * 合并顺序固定为：组件默认值 -> 全局配置 -> 页面局部覆写。
 *
 * @param defaultOptions 组件内置默认配置
 * @param localOptions 页面局部覆写
 * @returns 最终生效的地图配置
 */
export function resolveMapInitOptions(
  defaultOptions: MapLibreInitOptions,
  localOptions?: MapLibreInitOptions | null
): MapLibreInitOptions {
  return {
    ...defaultOptions,
    ...getMapGlobalMapOptions(),
    ...(localOptions || {}),
  };
}

/**
 * 按单个控件 key 合并控件配置。
 * 页面配置优先；页面未声明的内部字段继续回落到全局默认配置。
 *
 * @param globalConfig 全局控件配置
 * @param localConfig 页面控件配置
 * @returns 合并后的控件配置
 */
function mergeControlConfigItem<TConfig extends object>(
  globalConfig: TConfig | undefined,
  localConfig: TConfig | undefined
): TConfig | undefined {
  if (!globalConfig && !localConfig) {
    return undefined;
  }

  return mergeWith(
    cloneDeep(globalConfig || {}),
    localConfig || {},
    (_targetValue, sourceValue) => {
      // MapLibre 表达式数组必须整体替换，不能按数组下标合并导致表达式结构损坏。
      if (Array.isArray(sourceValue)) {
        return sourceValue;
      }

      return undefined;
    }
  ) as TConfig;
}

/**
 * 解析 MapLibreInit 最终生效的控件配置。
 * 合并顺序固定为：空对象 -> 全局配置 -> 页面局部覆写。
 * 每个控件项按内部字段递归回填默认值，页面局部字段优先。
 * 对数组表达式采用整体覆盖，避免 MapLibre 表达式被按下标错误合并。
 *
 * @param localControls 页面局部控件配置
 * @returns 最终生效的控件配置
 */
export function resolveMapControls(localControls?: MapControlsConfig | null): MapControlsConfig {
  const globalControls = getMapGlobalMapControls();
  const mergedControls: MapControlsConfig = {};
  const controlKeySet = new Set([
    ...Object.keys(globalControls),
    ...Object.keys(localControls || {}),
  ]) as Set<keyof MapControlsConfig>;

  controlKeySet.forEach((controlKey) => {
    const mergedControl = mergeControlConfigItem(
      globalControls[controlKey],
      localControls?.[controlKey]
    );
    if (!mergedControl) {
      return;
    }

    mergedControls[controlKey] = mergedControl as never;
  });

  return mergedControls;
}
