import type { ControlPosition } from 'maplibre-gl';
import type {
  MapLayerSelectedFeature,
  MapSelectionGestures,
  MapSelectionRangeResolver,
  MapSelectionRangeResolveResult,
  MapSelectionReplaceOptions,
  MapSelectionDeactivateOptions,
  MapSelectionUndoHistory,
  MapSelectionState,
  MapSelectionToolOptions,
  ResolvedMapSelectionToolOptions,
} from '../../shared/mapLibre-controls-types';

export type {
  MapSelectionGestures,
  MapSelectionRangeResolver,
  MapSelectionRangeResolveResult,
  MapSelectionReplaceOptions,
  MapSelectionDeactivateOptions,
  MapSelectionUndoHistory,
};

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
  /**
   * 退出多选模式。
   * 现场恢复应传 `{ emitChange: false }`，避免按退出策略清空或派发变化。
   */
  deactivate: (options?: MapSelectionDeactivateOptions) => void;
  /** 切换多选模式。 */
  toggle: () => void;
  /** 清空当前选中集。 */
  clear: () => void;
  /** 读取当前多选模式是否已激活。 */
  isActive: () => boolean;
  /** 读取当前完整选中集。 */
  getSelectedFeatures: () => MapLayerSelectedFeature[];
  /**
   * 原子替换完整选中集。
   * 用于保存后的现场恢复；默认派发变化回调，会话内部恢复应关闭派发。
   */
  replaceSelectedFeatures: (
    features: MapLayerSelectedFeature[],
    options?: MapSelectionReplaceOptions
  ) => void;
  /**
   * 回退到上一次用户可见选中变化之前的完整选中集、主选中项和范围起点。
   * @returns 发生回退时返回 true；无历史时返回 false
   */
  undo: () => boolean;
  /** 当前是否存在可回退历史。 */
  canUndo: () => boolean;
  /** 清空当前多选编辑周期内的 undo 历史。 */
  clearUndoHistory: () => void;
  /** 读取当前 undo 历史副本。 */
  snapshotUndoHistory: () => MapSelectionUndoHistory;
  /** 恢复指定 undo 历史。 */
  restoreUndoHistory: (history: MapSelectionUndoHistory) => void;
}

/** 要素多选插件状态类型别名。 */
export type MapFeatureMultiSelectState = MapSelectionState;
