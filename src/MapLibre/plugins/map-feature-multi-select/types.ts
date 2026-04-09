import type { ControlPosition } from 'maplibre-gl';
import type {
  MapLayerSelectedFeature,
  MapSelectionState,
  MapSelectionToolOptions,
  ResolvedMapSelectionToolOptions,
} from '../../shared/mapLibre-controls-types';

/** 要素多选插件配置。 */
export interface MapFeatureMultiSelectOptions extends MapSelectionToolOptions {
  /** 控件显示位置。 */
  position?: ControlPosition;
}

/** 归一化后的要素多选插件配置。 */
export interface ResolvedMapFeatureMultiSelectOptions extends ResolvedMapSelectionToolOptions {
  /** 控件显示位置。 */
  position: ControlPosition;
}

/** 要素多选插件对外 API。 */
export interface MapFeatureMultiSelectPluginApi {
  /** 激活多选模式。 */
  activate: () => void;
  /** 退出多选模式。 */
  deactivate: () => void;
  /** 切换多选模式。 */
  toggle: () => void;
  /** 清空当前选中集。 */
  clear: () => void;
  /** 读取当前多选模式是否已激活。 */
  isActive: () => boolean;
  /** 读取当前完整选中集。 */
  getSelectedFeatures: () => MapLayerSelectedFeature[];
}

/** 要素多选插件状态类型别名。 */
export type MapFeatureMultiSelectState = MapSelectionState;
