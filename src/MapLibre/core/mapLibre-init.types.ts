import type { MapLayerInteractiveContext } from '../shared/mapLibre-contols-types';
import type { MapCommonFeature } from '../shared/map-common-tools';
import type { ManagedTunnelPreviewExtensionApi } from '../extensions/managedTunnelPreview';

/** 地图扩展 API 命名空间 */
export interface MapLibreInitExtensionsExpose {
  /** 托管临时巷道预览扩展 API */
  managedTunnelPreview: ManagedTunnelPreviewExtensionApi | null;
}

/** map-libre-init 组件对外暴露的公共 API */
export interface MapLibreInitExpose {
  /** 获取底层绘图控件实例 */
  getDrawControl: () => any;
  /** 获取底层测量控件实例 */
  getMeasureControl: () => any;
  /** 获取当前地图上绘制的几何图形数据 */
  getDrawFeatures: () => any[] | null;
  /** 获取当前地图上测量的几何图形数据 */
  getMeasureFeatures: () => any[] | null;
  /** 获取当前普通图层交互选中的要素数据对象 */
  getSelectedMapFeature: () => any;
  /** 获取当前普通图层交互选中要素的完整交互上下文 */
  getSelectedMapFeatureContext: () => MapLayerInteractiveContext | null;
  /** 获取当前普通图层交互选中的标准化要素快照 */
  getSelectedMapFeatureSnapshot: () => MapCommonFeature | null;
  /** 清空当前普通图层的选中状态 */
  clearSelectedMapFeature: () => void;
  /** 地图扩展 API 命名空间 */
  extensions: MapLibreInitExtensionsExpose;
}
