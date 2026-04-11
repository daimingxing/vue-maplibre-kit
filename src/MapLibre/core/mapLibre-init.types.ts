import type { MapGeoJSONFeature } from 'maplibre-gl';
import type {
  MaplibreMeasureControl,
  MaplibreTerradrawControl,
} from '@watergis/maplibre-gl-terradraw';
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

/** map-libre-init 组件对外暴露的公共 API。 */
export interface MapLibreInitExpose {
  /** 获取底层绘图控件实例。 */
  getDrawControl: () => MaplibreTerradrawControl | null;
  /** 获取底层测量控件实例。 */
  getMeasureControl: () => MaplibreMeasureControl | null;
  /** 获取当前地图上绘制的几何图形数据。 */
  getDrawFeatures: () => TerradrawFeature[] | null;
  /** 获取当前地图上测量的几何图形数据。 */
  getMeasureFeatures: () => TerradrawFeature[] | null;
  /** 获取当前普通图层交互选中的要素数据对象。 */
  getSelectedMapFeature: () => MapGeoJSONFeature | null;
  /** 获取当前普通图层交互选中要素的完整交互上下文。 */
  getSelectedMapFeatureContext: () => MapLayerInteractiveContext | null;
  /** 获取当前普通图层交互选中的标准化要素快照。 */
  getSelectedMapFeatureSnapshot: () => MapCommonFeature | null;
  /** 获取当前地图注册的普通图层选择服务。 */
  getMapSelectionService: () => MapSelectionService | null;
  /** 读取当前 Draw / Measure 控件的属性治理配置。 */
  getTerradrawPropertyPolicy: (controlType: TerradrawControlType) => MapFeaturePropertyPolicy | null;
  /** 清空当前普通图层的整个选中集。 */
  clearSelectedMapFeature: () => void;
  /** 为指定要素写入 feature-state。 */
  setMapFeatureState: (target: MapFeatureStateTarget, state: MapFeatureStatePatch) => boolean;
  /** 地图插件宿主查询接口。 */
  plugins: MapPluginHostExpose;
}
