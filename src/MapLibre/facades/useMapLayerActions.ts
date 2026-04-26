import { toValue, type MaybeRefOrGetter } from 'vue';
import type { GeoJSONSourceSpecification } from 'maplibre-gl';
import type { MapLibreInitExpose, MapFeatureStatePatch } from '../core/mapLibre-init.types';

/** 图层动作门面依赖的最小原生地图接口。 */
interface LayerActionMap {
  /** 按图层 ID 读取原生图层。 */
  getLayer?: (layerId: string) => unknown;
  /** 按 source ID 读取原生 source。 */
  getSource?: (sourceId: string) => unknown;
  /** 添加原生 source。 */
  addSource?: (sourceId: string, source: unknown) => void;
  /** 移除原生 source。 */
  removeSource?: (sourceId: string) => void;
  /** 添加原生图层。 */
  addLayer?: (layer: Record<string, unknown>) => void;
  /** 移除原生图层。 */
  removeLayer?: (layerId: string) => void;
  /** 设置图层 paint 属性。 */
  setPaintProperty?: (layerId: string, key: string, value: unknown) => void;
  /** 设置图层 layout 属性。 */
  setLayoutProperty?: (layerId: string, key: string, value: unknown) => void;
}

/** 图层快捷动作结果。 */
export interface MapLayerActionResult {
  /** 当前动作是否成功。 */
  success: boolean;
  /** 结果说明。 */
  message: string;
}

/** useMapLayerActions 返回结果。 */
export interface UseMapLayerActionsResult {
  /** 判断指定 source 是否存在。 */
  hasSource: (sourceId: string) => boolean;
  /** 判断指定图层是否存在。 */
  hasLayer: (layerId: string) => boolean;
  /** 添加运行时 GeoJSON source。 */
  addGeoJsonSource: (
    sourceId: string,
    data: GeoJSONSourceSpecification['data'],
    options?: Omit<GeoJSONSourceSpecification, 'type' | 'data'>
  ) => MapLayerActionResult;
  /** 添加运行时图层。 */
  addLayer: (layer: Record<string, unknown>) => MapLayerActionResult;
  /** 移除运行时图层。 */
  removeLayer: (layerId: string) => MapLayerActionResult;
  /** 移除运行时 source。 */
  removeSource: (sourceId: string) => MapLayerActionResult;
  /** 显示指定图层。 */
  show: (layerId: string) => MapLayerActionResult;
  /** 隐藏指定图层。 */
  hide: (layerId: string) => MapLayerActionResult;
  /** 设置指定图层是否可见。 */
  setVisible: (layerId: string, visible: boolean) => MapLayerActionResult;
  /** 运行时批量设置图层 paint 属性；持久样式建议维护响应式业务图层 style。 */
  setPaint: (layerId: string, paint: Record<string, unknown>) => MapLayerActionResult;
  /** 运行时批量设置图层 layout 属性；图层重建后可能被声明式配置覆盖。 */
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
function getRawMap(mapExpose: MapLibreInitExpose | null | undefined): LayerActionMap | null {
  return (mapExpose?.rawHandles?.map as LayerActionMap | null | undefined) || null;
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
  const getMapWithLayer = (layerId: string): LayerActionMap | null => {
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
    action: (rawMap: LayerActionMap) => void
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
        rawMap[setter]?.(layerId, key, value);
      });
    });
  };

  /**
   * 读取当前地图；未就绪时返回失败结果。
   * @returns 原生地图和失败结果
   */
  const getMapOrFail = (): { rawMap: LayerActionMap | null; result: MapLayerActionResult | null } => {
    const rawMap = getRawMap(getMapExpose());
    if (!rawMap) {
      return {
        rawMap: null,
        result: createLayerActionResult(false, '地图尚未就绪'),
      };
    }

    return {
      rawMap,
      result: null,
    };
  };

  /**
   * 判断指定 source 是否存在。
   * @param sourceId 目标 source ID
   * @returns 是否存在
   */
  const hasSource = (sourceId: string): boolean => {
    return Boolean(getRawMap(getMapExpose())?.getSource?.(sourceId));
  };

  /**
   * 判断指定图层是否存在。
   * @param layerId 目标图层 ID
   * @returns 是否存在
   */
  const hasLayer = (layerId: string): boolean => {
    return Boolean(getRawMap(getMapExpose())?.getLayer?.(layerId));
  };

  return {
    hasSource,
    hasLayer,
    addGeoJsonSource: (sourceId, data, options = {}) => {
      const { rawMap, result } = getMapOrFail();
      if (result || !rawMap) {
        return result!;
      }

      if (hasSource(sourceId)) {
        return createLayerActionResult(false, `source 已存在：${sourceId}`);
      }

      if (!rawMap.addSource) {
        return createLayerActionResult(false, '当前地图不支持添加 source');
      }

      rawMap.addSource(sourceId, {
        ...options,
        type: 'geojson',
        data,
      });
      return createLayerActionResult(true, 'source 已添加');
    },
    addLayer: (layer) => {
      const { rawMap, result } = getMapOrFail();
      if (result || !rawMap) {
        return result!;
      }

      const layerId = layer.id;
      if (typeof layerId !== 'string' || !layerId) {
        return createLayerActionResult(false, '图层缺少有效 id');
      }

      const layerType = layer.type;
      if (typeof layerType !== 'string' || !layerType) {
        return createLayerActionResult(false, '图层缺少有效 type');
      }

      const sourceId = layer.source;
      if (layerType !== 'background' && (typeof sourceId !== 'string' || !sourceId)) {
        return createLayerActionResult(false, '图层缺少有效 source');
      }

      if (typeof sourceId === 'string' && sourceId && !hasSource(sourceId)) {
        return createLayerActionResult(false, `未找到 source：${sourceId}`);
      }

      if (hasLayer(layerId)) {
        return createLayerActionResult(false, `图层已存在：${layerId}`);
      }

      if (!rawMap.addLayer) {
        return createLayerActionResult(false, '当前地图不支持添加图层');
      }

      rawMap.addLayer(layer);
      return createLayerActionResult(true, '图层已添加');
    },
    removeLayer: (layerId) => {
      const { rawMap, result } = getMapOrFail();
      if (result || !rawMap) {
        return result!;
      }

      if (!hasLayer(layerId)) {
        return createLayerActionResult(false, `未找到图层：${layerId}`);
      }

      rawMap.removeLayer?.(layerId);
      return createLayerActionResult(true, '图层已移除');
    },
    removeSource: (sourceId) => {
      const { rawMap, result } = getMapOrFail();
      if (result || !rawMap) {
        return result!;
      }

      if (!hasSource(sourceId)) {
        return createLayerActionResult(false, `未找到 source：${sourceId}`);
      }

      rawMap.removeSource?.(sourceId);
      return createLayerActionResult(true, 'source 已移除');
    },
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
