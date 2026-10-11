import { computed, getCurrentInstance, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import type {
  MapLayerSelectedFeature,
  MapSelectionReplaceOptions,
  MapSelectionDeactivateOptions,
  MapSelectionState,
  MapSelectionUndoHistory,
  ResolvedMapSelectionToolOptions,
} from '../../shared/mapLibre-controls-types';
import { getMapGlobalMultiSelectDefaults } from '../../shared/map-global-config';
import { resolveMapSelectionGestures } from '../../shared/map-selection-gestures';
import type { MapSelectionBindingController, MapSelectionService } from '../types';
import type { MapFeatureMultiSelectOptions, ResolvedMapFeatureMultiSelectOptions } from './types';

const defaultSelectionState: MapSelectionState = {
  isActive: false,
  selectionMode: 'single',
  selectedFeatures: [],
  selectedCount: 0,
  deactivateBehavior: 'clear',
};

/**
 * 归一化要素多选插件配置。
 * @param rawOptions 业务层原始配置
 * @returns 归一化后的插件配置
 */
function normalizeMapFeatureMultiSelectOptions(
  rawOptions: MapFeatureMultiSelectOptions | null | undefined
): ResolvedMapFeatureMultiSelectOptions {
  const globalDefaults = getMapGlobalMultiSelectDefaults();

  return {
    enabled: rawOptions?.enabled ?? true,
    position: rawOptions?.position ?? globalDefaults?.position ?? 'top-right',
    deactivateBehavior:
      rawOptions?.deactivateBehavior ?? globalDefaults?.deactivateBehavior ?? 'clear',
    closeOnEscape: rawOptions?.closeOnEscape ?? globalDefaults?.closeOnEscape ?? true,
    targetLayerIds: rawOptions?.targetLayerIds || null,
    excludeLayerIds: [...(rawOptions?.excludeLayerIds || [])],
    canSelect: rawOptions?.canSelect,
    gestures: resolveMapSelectionGestures(rawOptions?.gestures),
    resolveRange: rawOptions?.resolveRange,
    showControl: rawOptions?.showControl !== false,
  };
}

interface UseMapFeatureMultiSelectServiceOptions {
  /** 读取业务层注册的多选插件配置。 */
  getOptions: () => MapFeatureMultiSelectOptions | null | undefined;
}

/**
 * 要素多选插件服务控制器。
 * 负责托管插件状态、交互核心绑定以及对外 API 分发。
 * @param options 插件初始化参数
 * @returns 服务实例与归一化配置
 */
export function useMapFeatureMultiSelectService(
  options: UseMapFeatureMultiSelectServiceOptions
): {
  state: Ref<MapSelectionState>;
  resolvedOptions: Readonly<Ref<ResolvedMapFeatureMultiSelectOptions>>;
  service: MapSelectionService;
  activate: () => void;
  deactivate: (options?: MapSelectionDeactivateOptions) => void;
  toggle: () => void;
  clear: () => void;
  isActive: () => boolean;
  getSelectedFeatures: () => MapLayerSelectedFeature[];
  replaceSelectedFeatures: (
    features: MapLayerSelectedFeature[],
    options?: MapSelectionReplaceOptions
  ) => void;
  undo: () => boolean;
  canUndo: () => boolean;
  clearUndoHistory: () => void;
  snapshotUndoHistory: () => MapSelectionUndoHistory;
  restoreUndoHistory: (history: MapSelectionUndoHistory) => void;
  destroy: () => void;
} {
  const { getOptions } = options;
  const bindingRef = shallowRef<MapSelectionBindingController | null>(null);
  const state = ref<MapSelectionState>({
    ...defaultSelectionState,
  });
  const resolvedOptions = computed(() => normalizeMapFeatureMultiSelectOptions(getOptions()));
  const resolvedSelectionOptions = computed<ResolvedMapSelectionToolOptions>(() => {
    const currentOptions = resolvedOptions.value;
    return {
      enabled: currentOptions.enabled,
      deactivateBehavior: currentOptions.deactivateBehavior,
      closeOnEscape: currentOptions.closeOnEscape,
      targetLayerIds: currentOptions.targetLayerIds,
      excludeLayerIds: [...currentOptions.excludeLayerIds],
      canSelect: currentOptions.canSelect,
      gestures: {
        clickAdd: currentOptions.gestures.clickAdd,
        clickDeselect: currentOptions.gestures.clickDeselect,
        box: { ...currentOptions.gestures.box },
        range: { ...currentOptions.gestures.range },
      },
      resolveRange: currentOptions.resolveRange,
      showControl: currentOptions.showControl,
    };
  });

  /**
   * 将状态补丁安全合并回当前插件状态。
   * @param statePatch 状态补丁
   */
  const syncState = (statePatch: Partial<MapSelectionState>): void => {
    const nextSelectedFeatures = statePatch.selectedFeatures
      ? [...statePatch.selectedFeatures]
      : [...state.value.selectedFeatures];

    state.value = {
      ...state.value,
      ...statePatch,
      selectedFeatures: nextSelectedFeatures,
      selectedCount: statePatch.selectedCount ?? nextSelectedFeatures.length,
      deactivateBehavior:
        statePatch.deactivateBehavior ?? resolvedSelectionOptions.value.deactivateBehavior,
    };
  };

  /**
   * 激活多选模式。
   */
  const activate = (): void => {
    if (!resolvedSelectionOptions.value.enabled) {
      return;
    }

    bindingRef.value?.activate();
  };

  /**
   * 退出多选模式。
   * @param options 是否按退出策略清空并派发变化；现场恢复应关闭派发
   */
  const deactivate = (options?: MapSelectionDeactivateOptions): void => {
    bindingRef.value?.deactivate(options);
  };

  /**
   * 切换多选模式。
   */
  const toggle = (): void => {
    if (bindingRef.value?.isActive()) {
      bindingRef.value.deactivate();
      return;
    }

    activate();
  };

  /**
   * 清空当前选中集。
   */
  const clear = (): void => {
    bindingRef.value?.clear();
  };

  /**
   * 读取当前多选模式是否已激活。
   * @returns 当前多选模式是否已激活
   */
  const isActive = (): boolean => {
    return bindingRef.value?.isActive() ?? state.value.isActive;
  };

  /**
   * 读取当前完整选中集快照。
   * @returns 当前选中集副本
   */
  const getSelectedFeatures = (): MapLayerSelectedFeature[] => {
    return bindingRef.value?.getSelectedFeatures() ?? [...state.value.selectedFeatures];
  };

  /**
   * 原子替换完整选中集。
   * @param features 下一份完整选中集
   * @param options 是否派发变化及原因
   */
  const replaceSelectedFeatures = (
    features: MapLayerSelectedFeature[],
    options?: MapSelectionReplaceOptions
  ): void => {
    bindingRef.value?.replaceSelectedFeatures(features, options);
  };

  /**
   * 回退到上一次用户可见选中变化之前的状态。
   * @returns 发生回退时返回 true；无绑定、未激活或无历史时返回 false
   */
  const undo = (): boolean => {
    return bindingRef.value?.undo() ?? false;
  };

  /**
   * 当前是否存在可回退历史。
   * @returns 有历史时返回 true
   */
  const canUndo = (): boolean => {
    return bindingRef.value?.canUndo() ?? false;
  };

  /**
   * 清空当前多选编辑周期内的 undo 历史。
   */
  const clearUndoHistory = (): void => {
    bindingRef.value?.clearUndoHistory();
  };

  /**
   * 读取当前 undo 历史副本。
   * @returns 可独立恢复的 undo 历史
   */
  const snapshotUndoHistory = (): MapSelectionUndoHistory => {
    return bindingRef.value?.snapshotUndoHistory() ?? { snapshots: [] };
  };

  /**
   * 恢复指定 undo 历史。
   * @param history 待恢复的 undo 历史
   */
  const restoreUndoHistory = (history: MapSelectionUndoHistory): void => {
    bindingRef.value?.restoreUndoHistory(history);
  };

  /**
   * 将交互核心控制器挂接到当前选择服务。
   * @param binding 当前交互核心控制器
   * @returns 解绑函数
   */
  const attachBinding = (binding: MapSelectionBindingController): (() => void) => {
    bindingRef.value = binding;
    syncState({
      isActive: binding.isActive(),
      selectionMode: binding.isActive() ? 'multiple' : 'single',
      deactivateBehavior: resolvedSelectionOptions.value.deactivateBehavior,
    });

    return () => {
      if (bindingRef.value !== binding) {
        return;
      }

      bindingRef.value = null;
      syncState({
        isActive: false,
        selectionMode: 'single',
      });
    };
  };

  const stopOptionsWatch = watch(
    () => ({
      enabled: resolvedOptions.value.enabled,
      deactivateBehavior: resolvedOptions.value.deactivateBehavior,
    }),
    (nextOptions) => {
      syncState({
        deactivateBehavior: nextOptions.deactivateBehavior,
      });

      if (!nextOptions.enabled && bindingRef.value?.isActive()) {
        bindingRef.value.deactivate();
      }
    },
    { immediate: true }
  );

  /**
   * 销毁多选服务。
   * 插件动态重建时不在组件 setup 中，必须由插件宿主显式调用；卸载钩子只是组件场景的兜底。
   */
  const destroy = (): void => {
    stopOptionsWatch();
    bindingRef.value = null;
    state.value = {
      ...defaultSelectionState,
    };
  };

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      destroy();
    });
  }

  const service: MapSelectionService = {
    state,
    getOptions: () => resolvedSelectionOptions.value,
    attachBinding,
    syncState,
    activate,
    deactivate,
    toggle,
    clear,
    isActive,
    getSelectedFeatures,
    replaceSelectedFeatures,
    undo,
    canUndo,
    clearUndoHistory,
    snapshotUndoHistory,
    restoreUndoHistory,
  };

  return {
    state,
    resolvedOptions,
    service,
    activate,
    deactivate,
    toggle,
    clear,
    isActive,
    getSelectedFeatures,
    replaceSelectedFeatures,
    undo,
    canUndo,
    clearUndoHistory,
    snapshotUndoHistory,
    restoreUndoHistory,
    destroy,
  };
}
