import type { MapGeoJSONFeature } from 'maplibre-gl';
import type {
  MaplibreMeasureControl,
  MaplibreTerradrawControl,
} from '@watergis/maplibre-gl-terradraw';
import type { MapInstance } from 'vue-maplibre-gl';
import type {
  MapLayerInteractiveContext,
  TerradrawFeature,
  TerradrawControlType,
} from '../shared/mapLibre-controls-types';
import type { MapFeaturePropertyPolicy } from '../shared/map-feature-data';
import type { MapCommonFeature } from '../shared/map-common-tools';
import type { MapPluginHostExpose, MapSelectionService } from '../plugins/types';

/** MapLibre feature-state 的目标描述。 */
export interface MapFeatureStateTarget {
  /** 目标要素所在的数据源 ID。 */
  source: string;
  /** 目标要素的原生顶层 ID。 */
  id: string | number;
  /** 可选的 source-layer 名称。 */
  sourceLayer?: string;
}

/** MapLibre feature-state 的局部状态补丁。 */
export type MapFeatureStatePatch = Record<string, unknown>;

/**
 * 直接复用 vue-maplibre-gl 宿主上的原始地图类型。
 * 这样 `defineExpose` 和模板 ref 在做类型推导时，会与宿主真实返回值保持同源，
 * 避免编辑器把 `rawHandles.map` 误判成另一份不兼容的 Map 类型。
 */
export type MapLibreRawMap = MapInstance['map'];

/**
 * MapLibreInit 提供的底层逃生句柄集合，用于直接访问底层地图实例和控件。
 * 仅在标准门面 API 无法满足需求时使用，例如：
 * 1. 需要直接调用 MapLibre 原生的 source / layer / feature-state 能力
 * 2. 需要读取 vue-maplibre-gl 宿主状态，判断地图是否已挂载或已加载
 * 3. 需要继续下探 draw / measure 控件，再访问 TerraDraw 实例
 *
 * 使用时需自行关注生命周期：
 * - `map` 在地图尚未挂载完成时可能为 `undefined`
 * - `drawControl` / `measureControl` 在控件未启用时会返回 `null`
 * - 若要操作 source / layer，建议先确认地图样式已完成加载
 */
export interface MapLibreRawHandles {
  /** 当前地图宿主持有的原始 MapLibre 地图实例，适合直接操作 source、layer 与 feature-state。 */
  readonly map: MapLibreRawMap;
  /** vue-maplibre-gl 的地图宿主实例包装对象，适合读取 isMounted、isLoaded 等宿主态。 */
  readonly mapInstance: MapInstance;
  /** 当前绘图控件实例；需要继续访问 TerraDraw 绘图引擎时从这里进入，控件未启用时返回 null。 */
  readonly drawControl: MaplibreTerradrawControl | null;
  /** 当前测量控件实例；需要继续访问 TerraDraw 测量引擎时从这里进入，控件未启用时返回 null。 */
  readonly measureControl: MaplibreMeasureControl | null;
}

/**
 * 创建 MapLibreInit 的底层逃生句柄集合。
 * 使用 getter 直接回读当前宿主与控件引用，避免在组件初始化时缓存一份会过期的快照。
 *
 * @param options 当前地图宿主与控件句柄读取函数
 * @returns 稳定可复用的底层逃生句柄对象
 */
export function createMapLibreRawHandles(options: {
  mapInstance: MapInstance;
  getDrawControl: () => MaplibreTerradrawControl | null;
  getMeasureControl: () => MaplibreMeasureControl | null;
}): MapLibreRawHandles {
  const rawHandles: MapLibreRawHandles = {
    get map(): MapLibreRawMap {
      return options.mapInstance.map;
    },
    get mapInstance(): MapInstance {
      return options.mapInstance;
    },
    get drawControl(): MaplibreTerradrawControl | null {
      return options.getDrawControl();
    },
    get measureControl(): MaplibreMeasureControl | null {
      return options.getMeasureControl();
    },
  };

  return rawHandles;
}

/** map-libre-init 组件对外暴露的公共 API。 */
export interface MapLibreInitExpose {
  /** 底层逃生句柄集合。 */
  rawHandles: MapLibreRawHandles;
  /** 获取底层绘图控件实例。 */
  getDrawControl: () => MaplibreTerradrawControl | null;
  /** 获取底层测量控件实例。 */
  getMeasureControl: () => MaplibreMeasureControl | null;
  /** 获取当前地图上绘制的几何图形数据。 */
  getDrawFeatures: () => TerradrawFeature[] | null;
  /** 获取当前地图上测量的几何图形数据。 */
  getMeasureFeatures: () => TerradrawFeature[] | null;
  /** 获取当前地图交互选中的要素数据对象，插件托管图层优先。 */
  getSelectedMapFeature: () => MapGeoJSONFeature | null;
  /** 获取当前地图交互选中要素的完整交互上下文，插件托管图层优先。 */
  getSelectedMapFeatureContext: () => MapLayerInteractiveContext | null;
  /** 获取当前地图交互选中的标准化要素快照，插件托管图层优先。 */
  getSelectedMapFeatureSnapshot: () => MapCommonFeature | null;
  /** 获取当前地图注册的普通图层选择服务。 */
  getMapSelectionService: () => MapSelectionService | null;
  /** 读取当前 Draw / Measure 控件的属性治理配置。 */
  getTerradrawPropertyPolicy: (controlType: TerradrawControlType) => MapFeaturePropertyPolicy | null;
  /** 清空当前地图交互的整个选中集，同时覆盖插件托管图层与普通业务图层。 */
  clearSelectedMapFeature: () => void;
  /** 为指定要素写入 feature-state。 */
  setMapFeatureState: (target: MapFeatureStateTarget, state: MapFeatureStatePatch) => boolean;
  /** 地图插件宿主查询接口。 */
  plugins: MapPluginHostExpose;
}
