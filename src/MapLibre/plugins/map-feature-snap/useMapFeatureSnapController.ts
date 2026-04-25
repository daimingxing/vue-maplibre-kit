import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { createCircleLayerStyle, createLineLayerStyle } from '../../shared/map-layer-style-config';
import type { TerradrawControlType, TerradrawSnapSharedOptions } from '../../shared/mapLibre-controls-types';
import { getMapGlobalSnapDefaults } from '../../shared/map-global-config';
import type { ResolvedTerradrawSnapOptions } from '../types';
import { createEmptyMapFeatureSnapResult, createMapFeatureSnapBinding, type MapFeatureSnapBinding } from './useMapFeatureSnapBinding';
import type { MapFeatureSnapOptions, MapFeatureSnapPreviewOptions } from './types';

const DEFAULT_TOLERANCE_PX = 16;

interface UseMapFeatureSnapControllerOptions {
  /** 读取业务层注册的吸附插件配置。 */
  getOptions: () => MapFeatureSnapOptions | null | undefined;
  /** 读取当前地图实例。 */
  getMap: () => MaplibreMap | null | undefined;
}

/**
 * 将任意控件级吸附配置归一化为对象结构。
 * @param config 业务层传入的原始吸附配置
 * @returns 标准化后的局部吸附配置
 */
function normalizeSnapConfig(
  config: TerradrawSnapSharedOptions | boolean | null | undefined
): TerradrawSnapSharedOptions {
  if (config === false) {
    return {
      enabled: false,
    };
  }

  if (config === true) {
    return {
      enabled: true,
    };
  }

  return {
    ...(config || {}),
  };
}

/**
 * 合并单个控件级 TerraDraw 吸附配置。
 * 对象配置按浅合并处理；布尔值视为显式整项接管。
 *
 * @param globalConfig 全局默认配置
 * @param localConfig 实例局部配置
 * @returns 合并后的控件吸附配置
 */
function mergeSnapControlConfig(
  globalConfig: TerradrawSnapSharedOptions | boolean | null | undefined,
  localConfig: TerradrawSnapSharedOptions | boolean | null | undefined
): TerradrawSnapSharedOptions | boolean | undefined {
  if (typeof localConfig === 'boolean') {
    return localConfig;
  }

  if (typeof globalConfig === 'boolean') {
    return localConfig == null ? globalConfig : localConfig;
  }

  if (!globalConfig && !localConfig) {
    return undefined;
  }

  return {
    ...(globalConfig || {}),
    ...(localConfig || {}),
  };
}

/**
 * 合并吸附预览配置。
 * @param globalPreview 全局预览默认值
 * @param localPreview 实例局部预览配置
 * @returns 合并后的预览配置
 */
function mergeSnapPreviewOptions(
  globalPreview: MapFeatureSnapPreviewOptions | undefined,
  localPreview: MapFeatureSnapPreviewOptions | undefined
): MapFeatureSnapPreviewOptions | undefined {
  if (!globalPreview && !localPreview) {
    return undefined;
  }

  return {
    ...(globalPreview || {}),
    ...(localPreview || {}),
  };
}

/**
 * 合并普通图层吸附插件配置。
 * 第一版只把适合做应用级默认值的字段接入全局配置；
 * ordinaryLayers 仍然保持实例级，避免把页面专属图层绑定信息提升到全局。
 *
 * @param localOptions 实例局部插件配置
 * @returns 最终生效的吸附插件配置
 */
function resolveMapFeatureSnapOptions(
  localOptions: MapFeatureSnapOptions | null | undefined
): MapFeatureSnapOptions | undefined {
  const globalDefaults = getMapGlobalSnapDefaults();
  if (!globalDefaults && !localOptions) {
    return undefined;
  }

  return {
    ...(globalDefaults || {}),
    ...(localOptions || {}),
    preview: mergeSnapPreviewOptions(globalDefaults?.preview, localOptions?.preview),
    ordinaryLayers: localOptions?.ordinaryLayers,
    terradraw:
      globalDefaults?.terradraw || localOptions?.terradraw
        ? {
            ...(globalDefaults?.terradraw || {}),
            ...(localOptions?.terradraw || {}),
            defaults: {
              ...(globalDefaults?.terradraw?.defaults || {}),
              ...(localOptions?.terradraw?.defaults || {}),
            },
            draw: mergeSnapControlConfig(
              globalDefaults?.terradraw?.draw,
              localOptions?.terradraw?.draw
            ),
            measure: mergeSnapControlConfig(
              globalDefaults?.terradraw?.measure,
              localOptions?.terradraw?.measure
            ),
          }
        : undefined,
  };
}

/**
 * 地图吸附插件控制器。
 * 负责管理吸附绑定、预览样式以及 TerraDraw / Measure 的最终吸附配置。
 * @param options 插件初始化选项
 * @returns 吸附插件能力集合
 */
export function useMapFeatureSnapController(options: UseMapFeatureSnapControllerOptions) {
  const { getOptions, getMap } = options;
  const bindingRef = shallowRef<MapFeatureSnapBinding | null>(null);
  const resolvedOptions = computed(() => resolveMapFeatureSnapOptions(getOptions()));

  /**
   * 当前吸附插件是否启用。
   */
  const enabled = computed(() => {
    const snapOptions = resolvedOptions.value;
    return Boolean(snapOptions) && snapOptions?.enabled !== false;
  });

  /**
   * 普通图层吸附预览是否启用。
   */
  const previewEnabled = computed(() => {
    return enabled.value && resolvedOptions.value?.preview?.enabled !== false;
  });

  /**
   * 当前吸附预览图层数据源。
   */
  const previewData = computed(() => {
    return (
      bindingRef.value?.previewData.value || {
        type: 'FeatureCollection',
        features: [],
      }
    );
  });

  /**
   * 吸附点图层样式。
   */
  const previewPointStyle = computed(() => {
    const previewOptions = resolvedOptions.value?.preview;
    return createCircleLayerStyle({
      paint: {
        'circle-radius': previewOptions?.pointRadius ?? 6,
        'circle-color': previewOptions?.pointColor ?? '#ff7a00',
        'circle-opacity': 0.95,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.95,
      },
    });
  });

  /**
   * 命中线段高亮图层样式。
   */
  const previewLineStyle = computed(() => {
    const previewOptions = resolvedOptions.value?.preview;
    return createLineLayerStyle({
      paint: {
        'line-color': previewOptions?.lineColor ?? '#ff7a00',
        'line-width': previewOptions?.lineWidth ?? 4,
        'line-opacity': 0.95,
      },
    });
  });

  /**
   * 销毁当前吸附绑定。
   */
  function destroyBinding(): void {
    bindingRef.value?.destroy();
    bindingRef.value = null;
  }

  /**
   * 根据当前地图实例和插件配置重新同步吸附绑定。
   */
  function syncBinding(): void {
    destroyBinding();

    const map = getMap();
    if (!map || !enabled.value) {
      return;
    }

    bindingRef.value = createMapFeatureSnapBinding({
      map,
      getOptions: () => resolvedOptions.value,
    });
  }

  const stopBindingWatch = watch(
    () => ({
      enabled: enabled.value,
      map: getMap(),
      options: resolvedOptions.value,
    }),
    () => {
      syncBinding();
    },
    { immediate: true, deep: true }
  );

  /**
   * 销毁吸附控制器。
   * 插件被动态移除时不会触发组件卸载钩子，因此需要显式停止当前监听。
   */
  function destroy(): void {
    stopBindingWatch();
    destroyBinding();
  }

  onBeforeUnmount(() => {
    destroy();
  });

  /**
   * 读取当前控件最终生效的 TerraDraw / Measure 吸附配置。
   * 合并顺序为：插件默认值 -> 控件类别默认值 -> 业务层局部覆写。
   * @param controlType 当前控件类型
   * @param localConfig 业务层局部传入的吸附配置
   * @returns 最终生效的吸附配置
   */
  function resolveTerradrawSnapOptions(
    controlType: TerradrawControlType,
    localConfig: TerradrawSnapSharedOptions | boolean | null | undefined
  ): ResolvedTerradrawSnapOptions {
    const snapOptions = resolvedOptions.value;
    const pluginDefaults = normalizeSnapConfig(snapOptions?.terradraw?.defaults);
    const controlDefaults = normalizeSnapConfig(
      controlType === 'draw' ? snapOptions?.terradraw?.draw : snapOptions?.terradraw?.measure
    );
    const localOverrides = normalizeSnapConfig(localConfig);

    const mergedConfig = {
      ...pluginDefaults,
      ...controlDefaults,
      ...localOverrides,
    };

    const defaultTolerancePx = snapOptions?.defaultTolerancePx ?? DEFAULT_TOLERANCE_PX;
    return {
      enabled: mergedConfig.enabled === true,
      tolerancePx: mergedConfig.tolerancePx ?? defaultTolerancePx,
      useNative: mergedConfig.useNative !== false,
      useMapTargets: mergedConfig.useMapTargets !== false,
    };
  }

  return {
    enabled,
    previewEnabled,
    previewData,
    previewPointStyle,
    previewLineStyle,
    binding: bindingRef,
    destroy,
    resolveTerradrawSnapOptions,
    resolveMapEvent: (event: any) =>
      bindingRef.value?.resolveMapEvent(event) || createEmptyMapFeatureSnapResult(),
    clearPreview: () => bindingRef.value?.clearPreview(),
  };
}
