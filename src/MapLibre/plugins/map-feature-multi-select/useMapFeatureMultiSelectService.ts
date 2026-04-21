import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import type {
  MapSelectionState,
  ResolvedMapSelectionToolOptions,
} from '../../shared/mapLibre-controls-types';
import { getMapGlobalMultiSelectDefaults } from '../../shared/map-global-config';
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
    enabled: rawOptions?.enabled ?? globalDefaults?.enabled ?? true,
    position: rawOptions?.position ?? globalDefaults?.position ?? 'top-right',
    deactivateBehavior:
      rawOptions?.deactivateBehavior ?? globalDefaults?.deactivateBehavior ?? 'clear',
    closeOnEscape: rawOptions?.closeOnEscape ?? globalDefaults?.closeOnEscape ?? true,
    targetLayerIds: rawOptions?.targetLayerIds || null,
    excludeLayerIds: [...(rawOptions?.excludeLayerIds || [])],
    canSelect: rawOptions?.canSelect,
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
  deactivate: () => void;
  toggle: () => void;
  clear: () => void;
  isActive: () => boolean;
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
   */
  const deactivate = (): void => {
    bindingRef.value?.deactivate();
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

  watch(
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

  onBeforeUnmount(() => {
    bindingRef.value = null;
  });

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
  };
}
