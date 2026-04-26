import { toValue, type MaybeRefOrGetter } from 'vue';
import type { MapMouseEvent } from 'maplibre-gl';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type { MapFeatureSnapPluginApi } from '../plugins/map-feature-snap';
import type { ResolvedTerradrawSnapOptions } from '../plugins/types';
import type { TerradrawControlType, TerradrawSnapSharedOptions } from '../shared/mapLibre-controls-types';
import type { MapFeatureSnapResult } from '../shared/map-feature-snap-types';
import { createEmptyMapFeatureSnapResult } from '../plugins/map-feature-snap/useMapFeatureSnapBinding';
import { resolveMapFeatureSnapApi } from './mapPluginResolver';

/** useMapFeatureSnap 返回结果。 */
export interface UseMapFeatureSnapResult {
  /** 清空当前吸附预览。 */
  clearPreview: () => boolean;
  /** 根据普通地图事件解析吸附结果。 */
  resolveMapEvent: (event: MapMouseEvent) => MapFeatureSnapResult;
  /** 读取 TerraDraw / Measure 最终吸附配置。 */
  resolveTerradrawSnapOptions: (
    controlType: TerradrawControlType,
    localConfig: TerradrawSnapSharedOptions | boolean | null | undefined
  ) => ResolvedTerradrawSnapOptions | null;
}

/**
 * 读取当前地图中的吸附插件能力门面。
 * snap 主要是注册型插件，业务层通常配置后交给绘制控件使用；
 * 这里仅暴露少量主动动作，方便示例和高级页面统一从 `businessMap.plugins.snap` 取能力。
 *
 * @param mapRef 地图组件公开实例引用
 * @returns 吸附插件能力门面
 */
export function useMapFeatureSnap(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
): UseMapFeatureSnapResult {
  /**
   * 读取当前 mapRef 对应的地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 读取当前页面注册的吸附插件 API。
   * @returns 当前吸附插件 API
   */
  const getSnapApi = (): MapFeatureSnapPluginApi | null => {
    return resolveMapFeatureSnapApi(getMapExpose());
  };

  return {
    clearPreview: () => {
      const snapApi = getSnapApi();
      if (!snapApi) {
        return false;
      }

      snapApi.clearPreview();
      return true;
    },
    resolveMapEvent: (event) => {
      return getSnapApi()?.resolveMapEvent(event) || createEmptyMapFeatureSnapResult();
    },
    resolveTerradrawSnapOptions: (controlType, localConfig) => {
      return getSnapApi()?.resolveTerradrawSnapOptions(controlType, localConfig) || null;
    },
  };
}
