import type { MapGeoJSONFeature } from 'maplibre-gl';
import type {
  MaplibreMeasureControl,
  MaplibreTerradrawControl,
} from '@watergis/maplibre-gl-terradraw';
import type {
  MapLayerInteractiveContext,
  TerradrawFeature,
} from '../shared/mapLibre-contols-types';
import type { MapCommonFeature } from '../shared/map-common-tools';
import type { MapPluginHostExpose } from '../plugins/types';

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
  /** 清空当前普通图层的整个选中集。 */
  clearSelectedMapFeature: () => void;
  /** 地图插件宿主查询接口。 */
  plugins: MapPluginHostExpose;
}
