import { computed, getCurrentInstance, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { createCircleLayerStyle, createLineLayerStyle } from '../../shared/map-layer-style-config';
import type { TerradrawControlType, TerradrawSnapSharedOptions } from '../../shared/mapLibre-controls-types';
import { getMapGlobalSnapDefaults } from '../../shared/map-global-config';
import type { ResolvedTerradrawSnapOptions } from '../types';
import {
  createEmptyMapFeatureSnapResult,
  createGeneratedRuleId,
  createMapFeatureSnapBinding,
  type MapFeatureSnapBinding,
} from './useMapFeatureSnapBinding';
import type {
  MapFeatureSnapGeometryType,
  MapFeatureSnapMode,
  MapFeatureSnapOptions,
  MapFeatureSnapPreviewOptions,
  MapFeatureSnapRule,
  MapFeatureSnapTargetOptions,
} from './types';

const DEFAULT_TOLERANCE_PX = 16;
const DEFAULT_DRAWN_TARGET_GEOMETRY_TYPES: MapFeatureSnapGeometryType[] = [
  'Point',
  'LineString',
  'Polygon',
];
const DEFAULT_DRAWN_TARGET_SNAP_MODES: MapFeatureSnapMode[] = ['vertex', 'segment'];

interface UseMapFeatureSnapControllerOptions {
  /** 读取业务层注册的吸附插件配置。 */
  getOptions: () => MapFeatureSnapOptions | null | undefined;
  /** 读取当前地图实例。 */
  getMap: () => MaplibreMap | null | undefined;
}

export interface MapFeatureSnapControlRuleItem {
  /** 规则唯一标识。 */
  id: string;
  /** 面板展示名称。 */
  label: string;
  /** 当前运行期是否启用。 */
  enabled: boolean;
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
 * 合并 TerraDraw 已绘制要素吸附目标配置。
 * 布尔值代表整项开关，对象配置按浅合并处理。
 *
 * @param baseConfig 基础配置
 * @param patchConfig 覆写配置
 * @returns 合并后的配置
 */
function mergeDrawnTargetConfig(
  baseConfig: TerradrawSnapSharedOptions['drawnTargets'],
  patchConfig: TerradrawSnapSharedOptions['drawnTargets']
): TerradrawSnapSharedOptions['drawnTargets'] {
  if (patchConfig === false) {
    return patchConfig;
  }

  if (patchConfig === true) {
    if (baseConfig && typeof baseConfig === 'object') {
      return {
        ...baseConfig,
        enabled: true,
      };
    }

    return true;
  }

  if (baseConfig === false || baseConfig === true) {
    return patchConfig === undefined ? baseConfig : patchConfig;
  }

  if (!baseConfig && !patchConfig) {
    return undefined;
  }

  return {
    ...(baseConfig || {}),
    ...(patchConfig || {}),
  };
}

/**
 * 归一化 TerraDraw 已绘制要素吸附目标配置。
 * @param config 原始配置
 * @returns 完整配置
 */
function normalizeDrawnTargets(
  config: TerradrawSnapSharedOptions['drawnTargets']
): ResolvedTerradrawSnapOptions['drawnTargets'] {
  if (config === false) {
    return {
      enabled: false,
      geometryTypes: DEFAULT_DRAWN_TARGET_GEOMETRY_TYPES,
      snapTo: DEFAULT_DRAWN_TARGET_SNAP_MODES,
    };
  }

  if (config === true) {
    return {
      enabled: true,
      geometryTypes: DEFAULT_DRAWN_TARGET_GEOMETRY_TYPES,
      snapTo: DEFAULT_DRAWN_TARGET_SNAP_MODES,
    };
  }

  return {
    enabled: config?.enabled !== false && Boolean(config),
    geometryTypes: config?.geometryTypes?.length
      ? config.geometryTypes
      : DEFAULT_DRAWN_TARGET_GEOMETRY_TYPES,
    snapTo: config?.snapTo?.length ? config.snapTo : DEFAULT_DRAWN_TARGET_SNAP_MODES,
    ...(config?.priority !== undefined ? { priority: config.priority } : {}),
    ...(config?.tolerancePx !== undefined ? { tolerancePx: config.tolerancePx } : {}),
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
 * 合并吸附开关控件配置。
 * @param globalControl 全局控件默认值
 * @param localControl 实例局部控件配置
 * @returns 合并后的控件配置
 */
function mergeSnapControlOptions(
  globalControl: MapFeatureSnapOptions['control'],
  localControl: MapFeatureSnapOptions['control']
): MapFeatureSnapOptions['control'] {
  if (!globalControl && !localControl) {
    return undefined;
  }

  return {
    ...(globalControl || {}),
    ...(localControl || {}),
    panel: mergeSnapControlPanelOptions(globalControl?.panel, localControl?.panel),
  };
}

function normalizeSnapControlPanelOptions(
  panel: NonNullable<MapFeatureSnapOptions['control']>['panel']
): { enabled?: boolean } | undefined {
  if (typeof panel === 'boolean') {
    return {
      enabled: panel,
    };
  }

  return panel;
}

function mergeSnapControlPanelOptions(
  globalPanel: NonNullable<MapFeatureSnapOptions['control']>['panel'],
  localPanel: NonNullable<MapFeatureSnapOptions['control']>['panel']
): { enabled?: boolean } | undefined {
  const normalizedGlobal = normalizeSnapControlPanelOptions(globalPanel);
  const normalizedLocal = normalizeSnapControlPanelOptions(localPanel);
  if (!normalizedGlobal && !normalizedLocal) {
    return undefined;
  }

  return {
    ...(normalizedGlobal || {}),
    ...(normalizedLocal || {}),
  };
}

function getRuleDisplayLabel(rule: MapFeatureSnapRule): string {
  return rule.label || rule.id || rule.layerIds.join(', ');
}

/**
 * 读取面板开关使用的业务吸附规则 ID。
 * 与吸附绑定保持同一套生成逻辑，避免无 ID 规则能吸附但不能在面板关闭。
 * @param rule 原始业务吸附规则
 * @param index 当前规则序号
 * @returns 面板运行期开关使用的规则 ID
 */
function getRuleControlId(rule: MapFeatureSnapRule, index: number): string {
  return rule.id || createGeneratedRuleId(rule, index);
}

function isSnapControlPanelEnabled(control: MapFeatureSnapOptions['control']): boolean {
  return normalizeSnapControlPanelOptions(control?.panel)?.enabled === true;
}

/**
 * 合并插件内置吸附目标配置。
 * 布尔值表示整项开关；对象配置按字段合并，便于页面只覆写单个默认值。
 *
 * @param globalConfig 全局目标默认配置
 * @param localConfig 实例局部目标配置
 * @returns 合并后的目标配置
 */
function mergeSnapTargetOptions(
  globalConfig: boolean | MapFeatureSnapTargetOptions | undefined,
  localConfig: boolean | MapFeatureSnapTargetOptions | undefined
): boolean | MapFeatureSnapTargetOptions | undefined {
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
 * 合并业务图层吸附插件配置。
 * 第一版只把适合做应用级默认值的字段接入全局配置；
 * businessLayers 仍然保持实例级，避免把页面专属图层绑定信息提升到全局。
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
    control: mergeSnapControlOptions(globalDefaults?.control, localOptions?.control),
    preview: mergeSnapPreviewOptions(globalDefaults?.preview, localOptions?.preview),
    intersection: mergeSnapTargetOptions(globalDefaults?.intersection, localOptions?.intersection),
    polygonEdge: mergeSnapTargetOptions(globalDefaults?.polygonEdge, localOptions?.polygonEdge),
    businessLayers: localOptions?.businessLayers,
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
  const activeRef = ref(true);
  const ruleEnabledOverridesRef = ref<Record<string, boolean>>({});
  const bindingRef = shallowRef<MapFeatureSnapBinding | null>(null);
  const resolvedOptions = computed(() => resolveMapFeatureSnapOptions(getOptions()));
  const effectiveOptions = computed<MapFeatureSnapOptions | undefined>(() => {
    const snapOptions = resolvedOptions.value;
    const overrides = ruleEnabledOverridesRef.value;
    if (!snapOptions?.businessLayers?.rules?.length || !Object.keys(overrides).length) {
      return snapOptions;
    }

    return {
      ...snapOptions,
      businessLayers: {
        ...snapOptions.businessLayers,
        rules: snapOptions.businessLayers.rules.map((rule, index) => {
          const ruleId = getRuleControlId(rule, index);
          if (overrides[ruleId] === undefined) {
            return rule;
          }

          return {
            ...rule,
            enabled: overrides[ruleId],
          };
        }),
      },
    };
  });

  /**
   * 当前吸附插件是否启用。
   */
  const configuredEnabled = computed(() => {
    const snapOptions = resolvedOptions.value;
    return Boolean(snapOptions) && snapOptions?.enabled !== false;
  });

  /** 当前吸附能力是否运行期开启。 */
  const isActive = computed(() => configuredEnabled.value && activeRef.value);

  /** 吸附开关控件配置。 */
  const controlOptions = computed(() => ({
    enabled: resolvedOptions.value?.control?.enabled !== false,
    position: resolvedOptions.value?.control?.position ?? 'top-right',
    label: resolvedOptions.value?.control?.label ?? '吸附',
    panelEnabled: isSnapControlPanelEnabled(resolvedOptions.value?.control),
  }));

  /** 配置面板展示的业务吸附规则。 */
  const controlRuleItems = computed<MapFeatureSnapControlRuleItem[]>(() => {
    const overrides = ruleEnabledOverridesRef.value;
    const rules = resolvedOptions.value?.businessLayers?.rules || [];
    return rules.map((rule, index) => {
      const id = getRuleControlId(rule, index);
      return {
        id,
        label: getRuleDisplayLabel(rule),
        enabled: overrides[id] ?? rule.enabled !== false,
      };
    });
  });

  /**
   * 普通图层吸附预览是否启用。
   */
  const previewEnabled = computed(() => {
    return isActive.value && resolvedOptions.value?.preview?.enabled !== false;
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
    if (!map || !isActive.value) {
      return;
    }

    bindingRef.value = createMapFeatureSnapBinding({
      map,
      getOptions: () => effectiveOptions.value,
    });
  }

  const stopBindingWatch = watch(
    () => ({
      enabled: configuredEnabled.value,
      active: isActive.value,
      map: getMap(),
      options: effectiveOptions.value,
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

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      destroy();
    });
  }

  /**
   * 运行期开启吸附能力。
   */
  function activate(): void {
    activeRef.value = true;
  }

  /**
   * 运行期关闭吸附能力并清空现有预览。
   */
  function deactivate(): void {
    activeRef.value = false;
    destroyBinding();
  }

  /**
   * 运行期切换吸附能力。
   */
  function toggle(): void {
    if (isActive.value) {
      deactivate();
      return;
    }

    activate();
  }

  function setRuleEnabled(ruleId: string, enabled: boolean): void {
    ruleEnabledOverridesRef.value = {
      ...ruleEnabledOverridesRef.value,
      [ruleId]: enabled,
    };
  }

  function toggleRule(ruleId: string): void {
    const currentRule = controlRuleItems.value.find((rule) => rule.id === ruleId);
    if (!currentRule) {
      return;
    }

    setRuleEnabled(ruleId, !currentRule.enabled);
  }

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
      drawnTargets: mergeDrawnTargetConfig(
        mergeDrawnTargetConfig(pluginDefaults.drawnTargets, controlDefaults.drawnTargets),
        localOverrides.drawnTargets
      ),
    };

    const defaultTolerancePx = snapOptions?.defaultTolerancePx ?? DEFAULT_TOLERANCE_PX;
    const resolvedSnapOptions = {
      enabled: mergedConfig.enabled === true,
      tolerancePx: mergedConfig.tolerancePx ?? defaultTolerancePx,
      useNative: mergedConfig.useNative !== false,
      useMapTargets: mergedConfig.useMapTargets !== false,
      drawnTargets: normalizeDrawnTargets(mergedConfig.drawnTargets),
    };

    if (!isActive.value) {
      return {
        ...resolvedSnapOptions,
        enabled: false,
        useNative: false,
        useMapTargets: false,
        drawnTargets: {
          ...resolvedSnapOptions.drawnTargets,
          enabled: false,
        },
      };
    }

    return resolvedSnapOptions;
  }

  return {
    enabled: configuredEnabled,
    isActive,
    controlOptions,
    controlRuleItems,
    previewEnabled,
    previewData,
    previewPointStyle,
    previewLineStyle,
    binding: bindingRef,
    destroy,
    activate,
    deactivate,
    toggle,
    setRuleEnabled,
    toggleRule,
    resolveTerradrawSnapOptions,
    resolveMapEvent: (event: any) =>
      bindingRef.value?.resolveMapEvent(event) || createEmptyMapFeatureSnapResult(),
    clearPreview: () => bindingRef.value?.clearPreview(),
  };
}
