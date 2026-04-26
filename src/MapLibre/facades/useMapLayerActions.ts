import { toValue, type MaybeRefOrGetter } from 'vue';
import type { MapLibreInitExpose, MapFeatureStatePatch } from '../core/mapLibre-init.types';

/** 图层快捷动作结果。 */
export interface MapLayerActionResult {
  /** 当前动作是否成功。 */
  success: boolean;
  /** 结果说明。 */
  message: string;
}

/** useMapLayerActions 返回结果。 */
export interface UseMapLayerActionsResult {
  /** 显示指定图层。 */
  show: (layerId: string) => MapLayerActionResult;
  /** 隐藏指定图层。 */
  hide: (layerId: string) => MapLayerActionResult;
  /** 设置指定图层是否可见。 */
  setVisible: (layerId: string, visible: boolean) => MapLayerActionResult;
  /** 批量设置图层 paint 属性。 */
  setPaint: (layerId: string, paint: Record<string, unknown>) => MapLayerActionResult;
  /** 批量设置图层 layout 属性。 */
  setLayout: (layerId: string, layout: Record<string, unknown>) => MapLayerActionResult;
  /** 设置单个要素的 feature-state。 */
  setFeatureState: (
    sourceId: string,
    featureId: string | number,
    state: MapFeatureStatePatch,
    sourceLayer?: string
  ) => MapLayerActionResult;
}

/**
 * 构造图层动作结果。
 * @param success 当前动作是否成功
 * @param message 结果说明
 * @returns 标准化动作结果
 */
function createLayerActionResult(success: boolean, message: string): MapLayerActionResult {
  return {
    success,
    message,
  };
}

/**
 * 读取当前地图的原生图层操作对象。
 * @param mapExpose 地图公开实例
 * @returns 原生地图实例；地图未就绪时返回 null
 */
function getRawMap(mapExpose: MapLibreInitExpose | null | undefined): any | null {
  return mapExpose?.rawHandles?.map || null;
}

/**
 * 读取当前地图的图层快捷动作。
 * @param mapRef 地图组件公开实例引用
 * @returns 图层运行时动作集合
 */
export function useMapLayerActions(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
): UseMapLayerActionsResult {
  /**
   * 读取当前 mapRef 对应的地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 确认指定图层是否存在。
   * @param layerId 目标图层 ID
   * @returns 原生地图实例；地图或图层不存在时返回 null
   */
  const getMapWithLayer = (layerId: string): any | null => {
    const rawMap = getRawMap(getMapExpose());
    if (!rawMap?.getLayer?.(layerId)) {
      return null;
    }

    return rawMap;
  };

  /**
   * 执行依赖现有图层的原生地图动作。
   * @param layerId 目标图层 ID
   * @param action 需要执行的动作
   * @returns 标准化动作结果
   */
  const runLayerAction = (
    layerId: string,
    action: (rawMap: any) => void
  ): MapLayerActionResult => {
    const rawMap = getMapWithLayer(layerId);
    if (!rawMap) {
      return createLayerActionResult(false, `未找到图层：${layerId}`);
    }

    action(rawMap);
    return createLayerActionResult(true, '图层动作已执行');
  };

  /**
   * 批量设置图层属性。
   * @param layerId 目标图层 ID
   * @param values 属性补丁
   * @param setter 原生 setter 名称
   * @returns 标准化动作结果
   */
  const setLayerValues = (
    layerId: string,
    values: Record<string, unknown>,
    setter: 'setPaintProperty' | 'setLayoutProperty'
  ): MapLayerActionResult => {
    return runLayerAction(layerId, (rawMap) => {
      Object.entries(values).forEach(([key, value]) => {
        rawMap[setter](layerId, key, value);
      });
    });
  };

  return {
    show: (layerId) => setLayerValues(layerId, { visibility: 'visible' }, 'setLayoutProperty'),
    hide: (layerId) => setLayerValues(layerId, { visibility: 'none' }, 'setLayoutProperty'),
    setVisible: (layerId, visible) =>
      setLayerValues(layerId, { visibility: visible ? 'visible' : 'none' }, 'setLayoutProperty'),
    setPaint: (layerId, paint) => setLayerValues(layerId, paint, 'setPaintProperty'),
    setLayout: (layerId, layout) => setLayerValues(layerId, layout, 'setLayoutProperty'),
    setFeatureState: (sourceId, featureId, state, sourceLayer) => {
      const success = Boolean(
        getMapExpose()?.setMapFeatureState(
          {
            source: sourceId,
            id: featureId,
            sourceLayer,
          },
          state
        )
      );

      return createLayerActionResult(success, success ? '要素状态已更新' : '要素状态更新失败');
    },
  };
}
