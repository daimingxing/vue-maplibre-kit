<template>
  <mgl-map :mapKey="mapKey" v-bind="{ ...mergedOptions, ...$attrs } as Record<string, unknown>">
    <!-- 控件 -->
    <!-- 导航控件 缩放与罗盘 -->
    <mgl-navigation-control
      v-if="controls.MglNavigationControl?.isUse"
      v-bind="getControlProps(controls.MglNavigationControl)"
    />
    <!-- 全屏控件 -->
    <mgl-fullscreen-control
      v-if="controls.MglFullscreenControl?.isUse"
      v-bind="getControlProps(controls.MglFullscreenControl)"
    />
    <!-- 定位控件 -->
    <mgl-geolocation-control
      v-if="controls.MglGeolocationControl?.isUse"
      v-bind="getControlProps(controls.MglGeolocationControl)"
    />
    <!-- 比例尺控件 -->
    <mgl-scale-control
      v-if="controls.MglScaleControl?.isUse"
      v-bind="getControlProps(controls.MglScaleControl)"
    />
    <!-- 归属信息控件 -->
    <mgl-attribution-control
      v-if="controls.MglAttributionControl?.isUse"
      v-bind="getControlProps(controls.MglAttributionControl)"
    />
    <!-- 帧率控件 -->
    <mgl-frame-rate-control
      v-if="controls.MglFrameRateControl?.isUse"
      v-bind="getControlProps(controls.MglFrameRateControl)"
    />
    <!-- 样式切换控件 -->
    <mgl-style-switch-control
      v-if="controls.MglStyleSwitchControl?.isUse"
      v-bind="getControlProps(controls.MglStyleSwitchControl)"
    />
    <!-- 自定义控件容器 -->
    <slot name="MglCustomControl"></slot>

    <!-- 数据源与图层插槽 -->
    <slot name="dataSource"></slot>

    <!-- 动态地图插件渲染项 -->
    <component
      :is="pluginRenderItem.component"
      v-for="pluginRenderItem in pluginRenderItems"
      :key="pluginRenderItem.id"
      v-bind="pluginRenderItem.props"
    />
    <terradraw-line-decoration-layers
      v-if="drawLineDecorationLayerProps"
      v-bind="drawLineDecorationLayerProps"
    />
    <terradraw-line-decoration-layers
      v-if="measureLineDecorationLayerProps"
      v-bind="measureLineDecorationLayerProps"
    />

    <!-- mgl-marker 插槽，暂时弃用，使用maplibre-gl-terradraw的marker -->
    <!-- <slot name="marker"></slot> -->
  </mgl-map>
</template>

<script setup lang="ts">
/**
 * 局部引入 vue-maplibre-gl 组件，作为整个地图的核心容器（外壳）。
 * 作用：
 * 1. 挂载底图实例
 * 2. 统一管理各种控件（缩放、全屏、比例尺等）
 * 3. 统一管理绘图和测量工具（TerraDraw）
 * 4. 统一托管 TerraDraw / Measure 线装饰能力
 * 5. 承载各种地图插件（如延长线扩展）
 *
 * 推荐外部页面使用 `import { useMap } from 'vue-maplibre-gl'` 配合 `mapKey` 获取原始地图实例。
 */
import { type PropType, computed, watch, shallowRef, onBeforeUnmount } from 'vue';
import {
  MglMap,
  MglStyleSwitchControl,
  MglNavigationControl,
  MglFullscreenControl,
  MglGeolocationControl,
  MglScaleControl,
  MglAttributionControl,
  MglFrameRateControl,
  useMap,
} from 'vue-maplibre-gl';
import {
  MaplibreTerradrawControl,
  MaplibreMeasureControl,
  type TerradrawModeClass,
} from '@watergis/maplibre-gl-terradraw';
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css';
import type { MapGeoJSONFeature, MapOptions } from 'maplibre-gl';
import type {
  MapControlsConfig,
  MapLayerInteractiveOptions,
  MeasureControlOptions,
  TerradrawSnapSharedOptions,
  TerradrawControlOptions,
  TerradrawFeature,
  TerradrawInteractiveOptions,
  TerradrawLineDecorationOptions,
} from '../shared/mapLibre-contols-types';
import { terradrawStyleConfig, measureStyleConfig } from '../terradraw/terradraw-config';
import {
  drawDecorationWeakLineStyleConfig,
  drawPatternDecorationPreviewLineStyleConfig,
  measureDecorationWeakLineStyleConfig,
  measurePatternDecorationPreviewLineStyleConfig,
  resolveDecorationBaseLineStyleConfig,
} from '../terradraw/terradraw-decoration-base-line';
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawMarkerMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawRectangleMode,
  TerraDrawCircleMode,
  TerraDrawFreehandMode,
  TerraDrawFreehandLineStringMode,
  TerraDrawAngledRectangleMode,
  TerraDrawSensorMode,
  TerraDrawSectorMode,
  type TerraDrawMouseEvent,
} from 'terra-draw';
import { cloneDeep, merge } from 'lodash-es';
import {
  createTerradrawInteractive,
  type TerradrawInteractiveBinding,
} from '../terradraw/useTerradrawInteractive';
import TerradrawLineDecorationLayers from '../terradraw/TerradrawLineDecorationLayers.vue';
import {
  createTerradrawLineDecoration,
  type TerradrawLineDecorationBinding,
} from '../terradraw/useTerradrawLineDecoration';
import { useMapInteractive } from '../composables/useMapInteractive';
import { useMapPluginHost } from './useMapPluginHost';
import { type MapCommonFeature } from '../shared/map-common-tools';
import type {
  AnyMapPluginDescriptor,
  ResolvedTerradrawSnapOptions,
  MapPluginStateChangePayload,
} from '../plugins/types';

type MapLibreComponentOptions = Partial<MapOptions & { mapStyle: string | object }>;
type TerradrawModePatch = Record<string, unknown>;
interface TerradrawSnappingPatch extends TerradrawModePatch {
  /** TerraDraw 模式指针容差。 */
  pointerDistance: number;
  /** TerraDraw 模式吸附配置。 */
  snapping: Record<string, unknown>;
}
type TerradrawModeOptionsInput = NonNullable<TerradrawControlOptions['modeOptions']>;
type MeasureModeOptionsInput = NonNullable<MeasureControlOptions['modeOptions']>;
type SelectSnapModeName = 'polygon' | 'linestring';

interface SelectCoordinateFlags {
  /** 是否允许显示中点。 */
  midpoints: boolean;
  /** 是否允许拖拽坐标点。 */
  draggable: boolean;
  /** 是否允许删除坐标点。 */
  deletable: boolean;
  /** TerraDraw select 模式下的坐标吸附配置。 */
  snappable?: false | Record<string, unknown>;
}

interface SelectFeatureFlags {
  /** 是否允许拖拽整个要素。 */
  draggable: boolean;
  /** 是否允许旋转整个要素。 */
  rotateable: boolean;
  /** 是否允许缩放整个要素。 */
  scaleable: boolean;
  /** 坐标级交互配置。 */
  coordinates: SelectCoordinateFlags;
}

type SelectSnapFlagsMap = Record<SelectSnapModeName, { feature: SelectFeatureFlags }>;

/**
 * 判断当前模式配置值是否已经是 TerraDraw 模式实例。
 * @param modeOption 待判断的模式配置值
 * @returns 是否为可直接复用的模式实例
 */
function isTerradrawModeInstance(modeOption: unknown): modeOption is TerradrawModeClass {
  return Boolean(
    modeOption &&
      typeof modeOption === 'object' &&
      typeof (modeOption as { mode?: unknown }).mode === 'string' &&
      typeof (modeOption as { updateOptions?: unknown }).updateOptions === 'function'
  );
}

/**
 * 将业务层传入的模式配置统一转换为 TerraDraw 模式实例。
 * 已经是模式实例的值会直接复用，未知模式键则保持原值，避免误删业务层扩展。
 * @param modeOptions TerraDraw / Measure 模式配置集合
 * @returns 可直接传给底层控件的模式实例集合
 */
function instantiateTerradrawModeOptions(
  modeOptions: TerradrawModeOptionsInput | MeasureModeOptionsInput | null | undefined
): Record<string, TerradrawModeClass | object> {
  const instantiatedModeOptions: Record<string, TerradrawModeClass | object> = {};

  Object.entries(modeOptions || {}).forEach(([modeName, modeOption]) => {
    if (!modeOption) {
      return;
    }

    if (isTerradrawModeInstance(modeOption)) {
      instantiatedModeOptions[modeName] = modeOption;
      return;
    }

    switch (modeName) {
      case 'point':
        instantiatedModeOptions.point = new TerraDrawPointMode(
          modeOption as ConstructorParameters<typeof TerraDrawPointMode>[0]
        );
        break;
      case 'marker':
        instantiatedModeOptions.marker = new TerraDrawMarkerMode(
          modeOption as ConstructorParameters<typeof TerraDrawMarkerMode>[0]
        );
        break;
      case 'linestring':
        instantiatedModeOptions.linestring = new TerraDrawLineStringMode(
          modeOption as ConstructorParameters<typeof TerraDrawLineStringMode>[0]
        );
        break;
      case 'polygon':
        instantiatedModeOptions.polygon = new TerraDrawPolygonMode(
          modeOption as ConstructorParameters<typeof TerraDrawPolygonMode>[0]
        );
        break;
      case 'rectangle':
        instantiatedModeOptions.rectangle = new TerraDrawRectangleMode(
          modeOption as ConstructorParameters<typeof TerraDrawRectangleMode>[0]
        );
        break;
      case 'circle':
        instantiatedModeOptions.circle = new TerraDrawCircleMode(
          modeOption as ConstructorParameters<typeof TerraDrawCircleMode>[0]
        );
        break;
      case 'freehand':
        instantiatedModeOptions.freehand = new TerraDrawFreehandMode(
          modeOption as ConstructorParameters<typeof TerraDrawFreehandMode>[0]
        );
        break;
      case 'freehand-linestring':
        instantiatedModeOptions['freehand-linestring'] = new TerraDrawFreehandLineStringMode(
          modeOption as ConstructorParameters<typeof TerraDrawFreehandLineStringMode>[0]
        );
        break;
      case 'angled-rectangle':
        instantiatedModeOptions['angled-rectangle'] = new TerraDrawAngledRectangleMode(
          modeOption as ConstructorParameters<typeof TerraDrawAngledRectangleMode>[0]
        );
        break;
      case 'sensor':
        instantiatedModeOptions.sensor = new TerraDrawSensorMode(
          modeOption as ConstructorParameters<typeof TerraDrawSensorMode>[0]
        );
        break;
      case 'sector':
        instantiatedModeOptions.sector = new TerraDrawSectorMode(
          modeOption as ConstructorParameters<typeof TerraDrawSectorMode>[0]
        );
        break;
      case 'select':
        instantiatedModeOptions.select = new TerraDrawSelectMode(
          modeOption as ConstructorParameters<typeof TerraDrawSelectMode>[0]
        );
        break;
      default:
        // 对未知模式键保持透传，避免把业务侧的扩展配置静默丢掉。
        instantiatedModeOptions[modeName] = modeOption;
        break;
    }
  });

  return instantiatedModeOptions;
}

/**
 * 提取 select 模式的原始配置快照，供吸附补丁合并默认 flags。
 * @param modeOption 当前 select 模式配置
 * @returns 仅包含可安全读取字段的普通对象；无法提取时返回 null
 */
function extractSelectModeOptionsSnapshot(
  modeOption: TerradrawModeOptionsInput['select'] | MeasureModeOptionsInput['select'] | null | undefined
): Record<string, unknown> | null {
  if (!modeOption) {
    return null;
  }

  if (isTerradrawModeInstance(modeOption)) {
    const runtimeFlags = Reflect.get(modeOption as object, 'flags');
    return runtimeFlags && typeof runtimeFlags === 'object'
      ? {
          flags: cloneDeep(runtimeFlags as Record<string, unknown>),
        }
      : null;
  }

  return cloneDeep(modeOption as Record<string, unknown>);
}

const props = defineProps({
  // 用于区分多个地图实例的唯一名字。如果你一个页面有两个地图，就靠它来区分。
  mapKey: {
    type: [String, Symbol] as PropType<string | symbol>,
    default: undefined,
  },
  // 地图的基础配置，比如初始中心点、缩放级别、底图样式(style)等。
  mapOptions: {
    // 支持 MapOptions 原生属性及 MglMap 专属属性 (如 mapStyle)
    type: Object as PropType<Partial<MapOptions & { mapStyle: string | object }>>,
    default: () => ({}),
  },
  // 决定要在地图上显示哪些基础控件（比如放大缩小按钮、全屏按钮、测量工具等）
  controls: {
    type: Object as PropType<MapControlsConfig>,
    default: () => ({}),
  },
  // 普通图层的交互配置（鼠标变小手、点击弹窗等）
  mapInteractive: {
    type: Object as PropType<MapLayerInteractiveOptions | null>,
    default: null,
  },
  // 挂载的插件列表，外部通过显式注册的方式启用地图能力。
  plugins: {
    type: Array as PropType<AnyMapPluginDescriptor[]>,
    default: () => [],
  },
});

const emit = defineEmits<{
  (event: 'pluginStateChange', payload: MapPluginStateChangePayload<unknown>): void;
}>();

/**
 * 提取 TerraDraw 控件（绘图/测量）当前在地图上画出来的所有图形数据。
 * @param controlRef 控件的响应式引用（里面存着控件实例）
 * @returns 包含所有图形数据的 GeoJSON 数组；如果控件没开，返回 null
 */
function getControlFeatures<TControl extends MaplibreTerradrawControl | MaplibreMeasureControl>(
  controlRef: { value: TControl | null } | null | undefined
): TerradrawFeature[] | null {
  const control = controlRef?.value;
  if (!control) {
    return null;
  }

  return control.getFeatures()?.features || null;
}

function getDrawControl() {
  return drawControlRef.value;
}

function getMeasureControl() {
  return measureControlRef.value;
}

function getDrawFeatures(): TerradrawFeature[] | null {
  return getControlFeatures(drawControlRef);
}

function getMeasureFeatures(): TerradrawFeature[] | null {
  return getControlFeatures(measureControlRef);
}

/**
 * 将 MapLibre 内部复杂的渲染要素(RenderedFeature) 转换为标准的 GeoJSON 格式。
 * 为什么要转？因为内部格式太复杂且包含很多无关信息，业务层只想要干净的 { type, id, properties, geometry } 数据。
 * @param feature 当前命中的 MapLibre 渲染态要素
 * @returns 干净的标准 GeoJSON 要素；无法转换时返回 null
 */
function toMapFeatureSnapshot(feature: MapGeoJSONFeature | null | undefined): MapCommonFeature | null {
  if (!feature?.geometry?.type) {
    return null;
  }

  return {
    type: 'Feature',
    id: feature.id,
    properties: cloneDeep(feature.properties || {}),
    geometry: cloneDeep(feature.geometry),
  } as MapCommonFeature;
}

/**
 * 从控件配置中剔除 `isUse` 属性。
 * 因为 `isUse` 只是我们用来判断“是否要显示这个控件”的开关，不需要（也不能）作为 prop 传给底层组件。
 * @param config 业务层传进来的某个控件配置对象
 * @returns 过滤掉 isUse 后的干净属性对象
 */
const getControlProps = <TConfig extends { isUse?: boolean }>(config: TConfig | null | undefined) => {
  if (!config) return {};
  const { isUse, ...rest } = config;
  return rest;
};

// 默认地图配置（如果业务层啥都不传，地图就按这个长相显示）
const defaultOptions = {
  mapStyle: 'https://demotiles.maplibre.org/style.json',
  center: [114.305556, 22.543056] as [number, number],
  zoom: 0,
  attributionControl: false,
};

// 合并默认配置和业务层传入的配置。
// Vue-maplibre-gl 底层认的是 mapStyle，但 Mapbox 原生叫 style，这里做一下兼容。
const mergedOptions = computed(() => {
  const options = {
    ...defaultOptions,
    ...props.mapOptions,
  } as MapLibreComponentOptions;

  // 兼容原生的 style 属性到 vue-maplibre-gl 的 mapStyle
  if (options.style && !options.mapStyle) {
    options.mapStyle = options.style;
  }

  return options;
});

// 初始化地图实例引用。
// 后续普通图层交互、吸附模块、绘图控件和测量控件都统一复用这一个 map 句柄。
const map = useMap(props.mapKey as string | symbol | undefined);

/**
 * 普通图层交互绑定实例。
 * 宿主创建插件时会通过闭包访问这里的状态，因此需要先占位，后初始化。
 */
let mapInteractiveBinding: ReturnType<typeof useMapInteractive> | null = null;

/**
 * 创建地图插件宿主。
 * mapLibreInit 自身不再直接识别任何具体插件，只消费宿主聚合后的渲染项、交互补丁与服务接口。
 */
const pluginHost = useMapPluginHost({
  getDescriptors: () => props.plugins,
  getMap: () => map.map || null,
  getMapInstance: () => map,
  getBaseMapInteractive: () => props.mapInteractive,
  getSelectedFeatureContext: () => mapInteractiveBinding?.getSelectedFeatureContext() || null,
  clearHoverState: () => mapInteractiveBinding?.clearHoverState(),
  clearSelectedFeature: () => mapInteractiveBinding?.clearSelectionState(),
  toFeatureSnapshot: toMapFeatureSnapshot,
  onPluginStateChange: (payload) => {
    emit('pluginStateChange', payload);
  },
});

/** 当前所有需要渲染到地图中的插件渲染项。 */
const pluginRenderItems = pluginHost.renderItems;

/** 业务层交互配置叠加插件补丁后的最终结果。 */
const mergedMapInteractive = pluginHost.mergedMapInteractive;

/**
 * 将内部线装饰管理器句柄转换为渲染组件所需的 props。
 * @param bindingRef 线装饰管理器响应式引用
 * @returns 可直接透传给渲染组件的 props；未启用时返回 null
 */
function createLineDecorationLayerProps(bindingRef: {
  value: TerradrawLineDecorationBinding | null;
}) {
  return computed(() => {
    const binding = bindingRef.value;
    if (!binding || !binding.enabled.value) {
      return null;
    }

    return {
      enabled: binding.enabled.value,
      sourceId: binding.sourceId,
      data: binding.data.value,
      patternLayerId: binding.patternLayerId,
      symbolLayerItems: binding.symbolLayerItems.value,
      patternRasterItems: binding.patternRasterItems.value,
      stretchLayerItems: binding.stretchLayerItems.value,
      patternStyle: binding.patternStyle.value,
    };
  });
}

mapInteractiveBinding = useMapInteractive({
  mapInstance: map,
  getInteractive: () => mergedMapInteractive.value,
  getSnapBinding: () => pluginHost.getMapSnapService()?.getBinding() || null,
});

/**
 * 获取当前普通图层交互封装记录的已选中要素。
 * @returns 当前选中的 MapLibre 要素；未选中时返回 null
 */
function getSelectedMapFeature() {
  return mapInteractiveBinding?.getSelectedFeature() || null;
}

/**
 * 获取当前普通图层交互封装记录的已选中要素上下文。
 * @returns 当前选中的普通图层交互上下文；未选中时返回 null
 */
function getSelectedMapFeatureContext() {
  return mapInteractiveBinding?.getSelectedFeatureContext() || null;
}

/**
 * 清空当前普通图层交互封装记录的选中要素。
 */
function clearSelectedMapFeature() {
  mapInteractiveBinding?.clearSelectionState();
}

/**
 * 获取当前普通图层交互封装记录的选中要素快照。
 * 若当前选中的是托管临时预览要素，则优先返回内部数据源中的最新快照。
 * @returns 标准化后的 GeoJSON 要素快照；未选中时返回 null
 */
function getSelectedMapFeatureSnapshot(): MapCommonFeature | null {
  const pluginSnapshot = pluginHost.resolveSelectedFeatureSnapshot();
  if (pluginSnapshot) {
    return pluginSnapshot;
  }

  return toMapFeatureSnapshot(mapInteractiveBinding?.getSelectedFeature() || null);
}

/**
 * Select 模式下线要素与面要素的默认可编辑 flags。
 * 当业务层没有显式声明对应 flags 时，吸附模块会回退到这组默认值，确保线/面节点编辑仍然可用。
 */
const defaultSelectSnapFlags: SelectSnapFlagsMap = {
  polygon: {
    feature: {
      draggable: true,
      rotateable: true,
      scaleable: true,
      coordinates: {
        midpoints: true,
        draggable: true,
        deletable: true,
      },
    },
  },
  linestring: {
    feature: {
      draggable: true,
      rotateable: true,
      scaleable: true,
      coordinates: {
        midpoints: true,
        draggable: true,
        deletable: true,
      },
    },
  },
};

/**
 * 读取当前控件最终生效的吸附配置。
 * 若当前未注册吸附服务插件，则返回一份“关闭普通层吸附”的兜底配置。
 * @param controlType 当前控件类型
 * @param localSnapConfig 业务层传入的局部吸附配置
 * @returns 最终生效的吸附配置
 */
function resolveTerradrawSnapOptions(
  controlType: 'draw' | 'measure',
  localSnapConfig: TerradrawSnapSharedOptions | boolean | null | undefined
): ResolvedTerradrawSnapOptions {
  const mapSnapService = pluginHost.getMapSnapService();
  if (!mapSnapService) {
    return {
      enabled: false,
      tolerancePx: 16,
      useNative: true,
      useMapTargets: false,
    };
  }

  return mapSnapService.resolveTerradrawSnapOptions(controlType, localSnapConfig);
}

/**
 * 安全地同步 TerraDraw 某个模式的最新配置。
 * 若当前控件未启用该模式，则静默忽略，避免同步吸附配置时打断正常页面逻辑。
 * @param drawInstance 当前 TerraDraw 实例
 * @param modeName 需要同步的模式名称
 * @param modeOptions 该模式最新的局部配置
 */
function safeUpdateTerradrawModeOptions(
  drawInstance: TerraDraw | null | undefined,
  modeName: string,
  modeOptions: TerradrawModePatch
): void {
  if (!drawInstance?.updateModeOptions) {
    return;
  }

  try {
    drawInstance.updateModeOptions(modeName, modeOptions);
  } catch (error) {
    console.warn(`[MapFeatureSnap] 同步模式 '${modeName}' 吸附配置失败`, error);
  }
}

/**
 * 构建绘制/测量线面模式最终使用的 snapping 配置对象。
 * @param resolvedSnapOptions 当前控件最终生效的吸附配置
 * @returns 可直接传给 TerraDraw mode 的局部配置
 */
function buildTerradrawModeSnappingPatch(
  resolvedSnapOptions: ResolvedTerradrawSnapOptions
): TerradrawSnappingPatch {
  const snappingConfig: {
    toLine?: boolean;
    toCoordinate?: boolean;
    toCustom?: (event: TerraDrawMouseEvent) => [number, number] | undefined;
  } = {};

  if (resolvedSnapOptions.enabled && resolvedSnapOptions.useNative) {
    snappingConfig.toLine = true;
    snappingConfig.toCoordinate = true;
  }

  if (resolvedSnapOptions.enabled && resolvedSnapOptions.useMapTargets) {
    snappingConfig.toCustom = (event: TerraDrawMouseEvent) => {
      const snapResult = pluginHost.getMapSnapService()?.getBinding()?.resolveTerradrawEvent(event);
      return snapResult?.matched ? snapResult.targetCoordinate || undefined : undefined;
    };
  }

  return {
    pointerDistance: resolvedSnapOptions.tolerancePx,
    snapping: snappingConfig,
  };
}

/**
 * 构建 Select 模式下线/面节点编辑最终使用的吸附配置。
 * 由于 TerraDraw 对 select.flags 采用浅合并，这里必须显式构造完整的 linestring / polygon flags，
 * 以避免仅传 snappable 时覆盖掉业务层原有 draggable / deletable / midpoints 等配置。
 * @param baseSelectModeOptions 当前业务层原始 select 模式配置
 * @param resolvedSnapOptions 当前控件最终生效的吸附配置
 * @returns 可直接传给 TerraDraw SelectMode 的局部配置
 */
function buildSelectModeSnappingPatch(
  baseSelectModeOptions: Record<string, unknown> | null | undefined,
  resolvedSnapOptions: ResolvedTerradrawSnapOptions
): TerradrawModePatch {
  const baseFlags = merge(
    cloneDeep(defaultSelectSnapFlags),
    cloneDeep(baseSelectModeOptions?.flags || {})
  ) as SelectSnapFlagsMap;
  const snappableConfig =
    resolvedSnapOptions.enabled &&
    (resolvedSnapOptions.useNative || resolvedSnapOptions.useMapTargets)
      ? buildTerradrawModeSnappingPatch(resolvedSnapOptions).snapping
      : false;

  const nextFlags = cloneDeep(baseFlags) as SelectSnapFlagsMap;

  (['polygon', 'linestring'] as const).forEach((modeName) => {
    nextFlags[modeName] = merge(
      {},
      defaultSelectSnapFlags[modeName as 'polygon' | 'linestring'],
      nextFlags[modeName] || {}
    ) as SelectSnapFlagsMap[typeof modeName];

    nextFlags[modeName].feature.coordinates.snappable = snappableConfig;
  });

  return {
    pointerDistance: resolvedSnapOptions.tolerancePx,
    flags: nextFlags,
  };
}

/**
 * 根据最终吸附配置同步绘图控件的吸附能力。
 * @param localSnapConfig 业务层传入的局部吸附配置
 * @param baseSelectModeOptions 当前业务层原始 select 模式配置
 */
function syncDrawSnapping(
  localSnapConfig: TerradrawSnapSharedOptions | boolean | null | undefined,
  baseSelectModeOptions: Record<string, unknown> | null | undefined
): void {
  const drawInstance = drawControlRef.value?.getTerraDrawInstance?.();
  if (!drawInstance) {
    return;
  }

  const resolvedSnapOptions = resolveTerradrawSnapOptions('draw', localSnapConfig);
  const lineAndPolygonPatch = buildTerradrawModeSnappingPatch(resolvedSnapOptions);

  safeUpdateTerradrawModeOptions(drawInstance, 'linestring', lineAndPolygonPatch);
  safeUpdateTerradrawModeOptions(drawInstance, 'polygon', lineAndPolygonPatch);
  safeUpdateTerradrawModeOptions(
    drawInstance,
    'select',
    buildSelectModeSnappingPatch(baseSelectModeOptions, resolvedSnapOptions)
  );
}

/**
 * 根据最终吸附配置同步测量控件的吸附能力。
 * @param localSnapConfig 业务层传入的局部吸附配置
 */
function syncMeasureSnapping(
  localSnapConfig: TerradrawSnapSharedOptions | boolean | null | undefined
): void {
  const drawInstance = measureControlRef.value?.getTerraDrawInstance?.();
  if (!drawInstance) {
    return;
  }

  const resolvedSnapOptions = resolveTerradrawSnapOptions('measure', localSnapConfig);
  const lineAndPolygonPatch = buildTerradrawModeSnappingPatch(resolvedSnapOptions);

  safeUpdateTerradrawModeOptions(drawInstance, 'linestring', lineAndPolygonPatch);
  safeUpdateTerradrawModeOptions(drawInstance, 'polygon', lineAndPolygonPatch);
}

// ==========================================
// 初始化 MaplibreTerradrawControl 绘图控件
// 并在属性改变时动态同步它的行为
// ==========================================
const drawControlRef = shallowRef<MaplibreTerradrawControl | null>(null);
const drawInteractiveRef = shallowRef<TerradrawInteractiveBinding | null>(null);
const drawLineDecorationRef = shallowRef<TerradrawLineDecorationBinding | null>(null);
const drawLineDecorationLayerProps = createLineDecorationLayerProps(drawLineDecorationRef);

/**
 * 销毁绘图控件对应的业务交互管理器。
 */
const destroyDrawInteractive = () => {
  drawInteractiveRef.value?.destroy();
  drawInteractiveRef.value = null;
};

/**
 * 销毁绘图控件对应的线装饰管理器。
 */
const destroyDrawLineDecoration = () => {
  drawLineDecorationRef.value?.destroy();
  drawLineDecorationRef.value = null;
};

/**
 * 根据最新配置同步绘图控件的业务交互管理器。
 * @param interactiveConfig 业务层传入的交互配置
 */
const syncDrawInteractive = (interactiveConfig: TerradrawInteractiveOptions | null | undefined) => {
  destroyDrawInteractive();

  if (
    !map.map ||
    !drawControlRef.value ||
    !interactiveConfig ||
    interactiveConfig.enabled === false
  ) {
    return;
  }

  drawInteractiveRef.value = createTerradrawInteractive({
    map: map.map,
    control: drawControlRef.value,
    controlType: 'draw',
    interactive: interactiveConfig,
    getSnapBinding: () => pluginHost.getMapSnapService()?.getBinding() || null,
  });
};

/**
 * 根据最新配置同步绘图控件的线装饰管理器。
 * @param lineDecorationConfig 业务层传入的线装饰配置
 */
const syncDrawLineDecoration = (
  lineDecorationConfig: TerradrawLineDecorationOptions | null | undefined
) => {
  destroyDrawLineDecoration();

  if (
    !map.map ||
    !drawControlRef.value ||
    !lineDecorationConfig ||
    lineDecorationConfig.enabled !== true
  ) {
    return;
  }

  drawLineDecorationRef.value = createTerradrawLineDecoration({
    map: map.map,
    control: drawControlRef.value,
    controlType: 'draw',
    options: lineDecorationConfig,
  });
};

watch(
  () => [
    map.isLoaded,
    props.controls.MaplibreTerradrawControl?.isUse,
    props.controls.MaplibreTerradrawControl,
  ],
  ([isLoaded, isUse, config]) => {
    if (isLoaded && map.map) {
      if (isUse) {
        const {
          isUse: _,
          position = 'top-left',
          interactive,
          lineDecoration,
          ...rest
        } = (config || {}) as TerradrawControlOptions;
        const terradrawConfig = merge(
          cloneDeep(terradrawStyleConfig),
          resolveDecorationBaseLineStyleConfig(
            lineDecoration,
            drawDecorationWeakLineStyleConfig,
            drawPatternDecorationPreviewLineStyleConfig
          ),
          rest
        ) as TerradrawControlOptions;

        if (!drawControlRef.value) {
          const mergedConfig = terradrawConfig;
          // 容器层统一负责把 plain object 配置实例化为 TerraDraw 模式。
          mergedConfig.modeOptions = instantiateTerradrawModeOptions(mergedConfig.modeOptions);

          const drawControl = new MaplibreTerradrawControl(
            mergedConfig as ConstructorParameters<typeof MaplibreTerradrawControl>[0]
          );
          drawControlRef.value = drawControl;
          map.map.addControl(drawControl, position);
        }

        syncDrawInteractive(interactive);
        syncDrawLineDecoration(lineDecoration);
      } else {
        destroyDrawInteractive();
        destroyDrawLineDecoration();
        if (drawControlRef.value) {
          map.map.removeControl(drawControlRef.value);
          drawControlRef.value = null;
        }
      }
    }
  },
  { immediate: true, deep: true }
);

/**
 * 单独监听绘图控件吸附依赖，避免插件列表变化时把交互管理器和线装饰一并重建。
 */
watch(
  () => ({
    isLoaded: map.isLoaded,
    isUse: props.controls.MaplibreTerradrawControl?.isUse,
    snapping: props.controls.MaplibreTerradrawControl?.snapping,
    selectModeOption: props.controls.MaplibreTerradrawControl?.modeOptions?.select,
    resolvedSnapOptions: resolveTerradrawSnapOptions(
      'draw',
      props.controls.MaplibreTerradrawControl?.snapping
    ),
  }),
  ({ isLoaded, isUse, snapping, selectModeOption }) => {
    if (!isLoaded || !isUse || !drawControlRef.value) {
      return;
    }

    syncDrawSnapping(snapping, extractSelectModeOptionsSnapshot(selectModeOption));
  },
  { immediate: true, deep: true }
);

// 初始化 maplibre-gl-terradraw 测量控件
// ==========================================
// 初始化 MaplibreMeasureControl 测量控件
// 并在属性改变时动态同步它的行为
// ==========================================
const measureControlRef = shallowRef<MaplibreMeasureControl | null>(null);
const measureInteractiveRef = shallowRef<TerradrawInteractiveBinding | null>(null);
const measureLineDecorationRef = shallowRef<TerradrawLineDecorationBinding | null>(null);
const measureLineDecorationLayerProps = createLineDecorationLayerProps(measureLineDecorationRef);

/**
 * 销毁测量控件对应的业务交互管理器。
 */
const destroyMeasureInteractive = () => {
  measureInteractiveRef.value?.destroy();
  measureInteractiveRef.value = null;
};

/**
 * 销毁测量控件对应的线装饰管理器。
 */
const destroyMeasureLineDecoration = () => {
  measureLineDecorationRef.value?.destroy();
  measureLineDecorationRef.value = null;
};

/**
 * 根据最新配置同步测量控件的业务交互管理器。
 * @param interactiveConfig 业务层传入的交互配置
 */
const syncMeasureInteractive = (
  interactiveConfig: TerradrawInteractiveOptions | null | undefined
) => {
  destroyMeasureInteractive();

  if (
    !map.map ||
    !measureControlRef.value ||
    !interactiveConfig ||
    interactiveConfig.enabled === false
  ) {
    return;
  }

  measureInteractiveRef.value = createTerradrawInteractive({
    map: map.map,
    control: measureControlRef.value,
    controlType: 'measure',
    interactive: interactiveConfig,
    getSnapBinding: () => pluginHost.getMapSnapService()?.getBinding() || null,
  });
};

/**
 * 根据最新配置同步测量控件的线装饰管理器。
 * @param lineDecorationConfig 业务层传入的线装饰配置
 */
const syncMeasureLineDecoration = (
  lineDecorationConfig: TerradrawLineDecorationOptions | null | undefined
) => {
  destroyMeasureLineDecoration();

  if (
    !map.map ||
    !measureControlRef.value ||
    !lineDecorationConfig ||
    lineDecorationConfig.enabled !== true
  ) {
    return;
  }

  measureLineDecorationRef.value = createTerradrawLineDecoration({
    map: map.map,
    control: measureControlRef.value,
    controlType: 'measure',
    options: lineDecorationConfig,
  });
};

watch(
  () => [
    map.isLoaded,
    props.controls.MaplibreMeasureControl?.isUse,
    props.controls.MaplibreMeasureControl,
  ],
  ([isLoaded, isUse, config]) => {
    if (isLoaded && map.map) {
      if (isUse) {
        const {
          isUse: _,
          position = 'top-right',
          interactive,
          lineDecoration,
          ...rest
        } = (config || {}) as MeasureControlOptions;
        const measureConfig = merge(
          cloneDeep(measureStyleConfig),
          resolveDecorationBaseLineStyleConfig(
            lineDecoration,
            measureDecorationWeakLineStyleConfig,
            measurePatternDecorationPreviewLineStyleConfig
          ),
          rest
        ) as MeasureControlOptions;

        if (!measureControlRef.value) {
          const mergedConfig = measureConfig;
          // 测量控件同样支持直接传配置对象，由容器层统一实例化。
          mergedConfig.modeOptions = instantiateTerradrawModeOptions(mergedConfig.modeOptions);

          const measureControl = new MaplibreMeasureControl(
            mergedConfig as ConstructorParameters<typeof MaplibreMeasureControl>[0]
          );
          measureControlRef.value = measureControl;
          map.map.addControl(measureControl, position);
        }

        syncMeasureInteractive(interactive);
        syncMeasureLineDecoration(lineDecoration);
      } else {
        destroyMeasureInteractive();
        destroyMeasureLineDecoration();
        if (measureControlRef.value) {
          map.map.removeControl(measureControlRef.value);
          measureControlRef.value = null;
        }
      }
    }
  },
  { immediate: true, deep: true }
);

/**
 * 单独监听测量控件吸附依赖，避免无关插件变化触发整套测量交互重建。
 */
watch(
  () => ({
    isLoaded: map.isLoaded,
    isUse: props.controls.MaplibreMeasureControl?.isUse,
    snapping: props.controls.MaplibreMeasureControl?.snapping,
    resolvedSnapOptions: resolveTerradrawSnapOptions(
      'measure',
      props.controls.MaplibreMeasureControl?.snapping
    ),
  }),
  ({ isLoaded, isUse, snapping }) => {
    if (!isLoaded || !isUse || !measureControlRef.value) {
      return;
    }

    syncMeasureSnapping(snapping);
  },
  { immediate: true, deep: true }
);

// 将底层控件实例和更业务化的快照获取方法同时暴露给父组件（外界）。
defineExpose({
  /** 获取底层绘图控件实例 */
  getDrawControl,
  /** 获取底层测量控件实例 */
  getMeasureControl,
  /** 获取当前地图上绘制的几何图形数据（GeoJSON特征数组） */
  getDrawFeatures,
  /** 获取当前地图上测量的几何图形数据（GeoJSON特征数组） */
  getMeasureFeatures,
  /** 获取当前普通图层交互选中的要素数据对象 */
  getSelectedMapFeature,
  /** 获取当前普通图层交互选中要素的完整交互上下文（含图层、数据源等信息） */
  getSelectedMapFeatureContext,
  /** 获取当前普通图层交互选中的标准化要素快照 */
  getSelectedMapFeatureSnapshot,
  /** 清空当前普通图层的选中状态 */
  clearSelectedMapFeature,
  /** 地图插件宿主查询接口 */
  plugins: pluginHost.hostExpose,
});

/**
 * 组件卸载前统一销毁 TerraDraw 业务交互管理器。
 */
onBeforeUnmount(() => {
  destroyDrawInteractive();
  destroyDrawLineDecoration();
  destroyMeasureInteractive();
  destroyMeasureLineDecoration();
});
</script>

<style lang="scss">
@import 'maplibre-gl/dist/maplibre-gl.css';
@import 'vue-maplibre-gl/dist/vue-maplibre-gl.css';
</style>
