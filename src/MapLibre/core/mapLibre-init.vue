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
 * 业务层优先通过组件公开实例 `mapInitRef` 消费能力；
 * 仅在非常底层的扩展场景下，才建议再回退到原始地图实例。
 */
import { type PropType, computed, onBeforeUnmount } from 'vue';
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
} from '@watergis/maplibre-gl-terradraw';
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css';
import type { MapGeoJSONFeature, MapOptions } from 'maplibre-gl';
import type { TerraDrawMouseEvent } from 'terra-draw';
import type {
  MapControlsConfig,
  MapLayerInteractiveOptions,
  MeasureControlOptions,
  TerradrawControlType,
  TerradrawSnapSharedOptions,
  TerradrawControlOptions,
  TerradrawFeature,
} from '../shared/mapLibre-controls-types';
import type { MapFeaturePropertyPolicy } from '../shared/map-feature-data';
import { terradrawStyleConfig, measureStyleConfig } from '../terradraw/terradraw-config';
import {
  drawDecorationWeakLineStyleConfig,
  drawPatternDecorationPreviewLineStyleConfig,
  measureDecorationWeakLineStyleConfig,
  measurePatternDecorationPreviewLineStyleConfig,
  resolveDecorationBaseLineStyleConfig,
} from '../terradraw/terradraw-decoration-base-line';
import { cloneDeep, merge } from 'lodash-es';
import TerradrawLineDecorationLayers from '../terradraw/TerradrawLineDecorationLayers.vue';
import { instantiateTerradrawModeOptions } from '../terradraw/terradraw-mode-factory';
import {
  createTerradrawReadySyncManager,
  syncTerradrawLineAndPolygonSnapping,
} from '../terradraw/terradraw-snap-sync';
import { useMapInteractive } from '../composables/useMapInteractive';
import { usePluginLayerInteractive } from '../composables/usePluginLayerInteractive';
import { useMapPluginHost } from './useMapPluginHost';
import { useTerradrawControlLifecycle } from './useTerradrawControlLifecycle';
import { type MapCommonFeature } from '../shared/map-common-tools';
import type {
  AnyMapPluginDescriptor,
  MapSelectionService,
  ResolvedTerradrawSnapOptions,
  MapPluginStateChangePayload,
} from '../plugins/types';
import {
  createMapLibreRawHandles,
  type MapFeatureStatePatch,
  type MapFeatureStateTarget,
  type MapLibreInitExpose,
  type MapLibreRawHandles,
} from './mapLibre-init.types';
import { resolveMapControls, resolveMapInitOptions } from './mapLibre-init.config';

type MapLibreComponentOptions = Partial<MapOptions & { mapStyle: string | object }>;
type DrawControlConstructorOptions = ConstructorParameters<typeof MaplibreTerradrawControl>[0];
type MeasureControlConstructorOptions = ConstructorParameters<typeof MaplibreMeasureControl>[0];
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
 * 读取当前 Draw / Measure 控件的属性治理配置。
 * @param controlType 当前控件类型
 * @returns 当前控件对应的属性治理配置
 */
function getTerradrawPropertyPolicy(
  controlType: TerradrawControlType
): MapFeaturePropertyPolicy | null {
  if (controlType === 'measure') {
    return controls.value.MaplibreMeasureControl?.propertyPolicy || null;
  }

  return controls.value.MaplibreTerradrawControl?.propertyPolicy || null;
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
} satisfies MapLibreComponentOptions;

// 合并默认配置和业务层传入的配置。
// Vue-maplibre-gl 底层认的是 mapStyle，但 Mapbox 原生叫 style，这里做一下兼容。
const mergedOptions = computed(() => {
  const options = resolveMapInitOptions(defaultOptions, props.mapOptions) as MapLibreComponentOptions;

  // 兼容原生的 style 属性到 vue-maplibre-gl 的 mapStyle
  if (options.style && !options.mapStyle) {
    options.mapStyle = options.style;
  }

  return options;
});

/**
 * 读取当前地图最终生效的控件配置。
 * 合并顺序固定为：库内空对象 -> 全局控件默认值 -> 页面局部覆写。
 */
const controls = computed(() => resolveMapControls(props.controls));

// 初始化地图实例引用。
// 后续普通图层交互、吸附模块、绘图控件和测量控件都统一复用这一个 map 句柄。
const map = useMap(props.mapKey as string | symbol | undefined);

/**
 * 普通图层交互绑定实例。
 * 宿主创建插件时会通过闭包访问这里的状态，因此需要先占位，后初始化。
 */
let mapInteractiveBinding: ReturnType<typeof useMapInteractive> | null = null;

/**
 * 插件托管图层交互绑定实例。
 * 交点、线草稿等插件图层会走这条独立通道，避免再与普通业务图层交互链耦合。
 */
let pluginLayerInteractiveBinding: ReturnType<typeof usePluginLayerInteractive> | null = null;

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
  clearPluginHoverState: () => pluginLayerInteractiveBinding?.clearHoverState(),
  clearPluginSelectedFeature: () => pluginLayerInteractiveBinding?.clearSelectionState(),
  toFeatureSnapshot: toMapFeatureSnapshot,
  onPluginStateChange: (payload) => {
    emit('pluginStateChange', payload);
  },
});

/** 当前所有需要渲染到地图中的插件渲染项。 */
const pluginRenderItems = pluginHost.renderItems;

/** 业务层交互配置叠加插件补丁后的最终结果。 */
const mergedMapInteractive = pluginHost.mergedMapInteractive;

/** 插件托管图层的最终交互配置。 */
const mergedPluginLayerInteractive = pluginHost.mergedPluginLayerInteractive;

pluginLayerInteractiveBinding = usePluginLayerInteractive({
  mapInstance: map,
  getInteractive: () => mergedPluginLayerInteractive.value,
  toFeatureSnapshot: toMapFeatureSnapshot,
});

mapInteractiveBinding = useMapInteractive({
  mapInstance: map,
  getInteractive: () => mergedMapInteractive.value,
  getSnapBinding: () => pluginHost.getMapSnapService()?.getBinding() || null,
  getSelectionService: () => pluginHost.getMapSelectionService() || null,
});

/**
 * 获取当前普通图层交互封装记录的已选中要素。
 * @returns 当前选中的 MapLibre 要素；未选中时返回 null
 */
function getSelectedMapFeature() {
  if (pluginHost.resolveSelectedFeatureSnapshot()) {
    return pluginLayerInteractiveBinding?.getSelectedFeature() || null;
  }

  return mapInteractiveBinding?.getSelectedFeature() || null;
}

/**
 * 获取当前普通图层交互封装记录的已选中要素上下文。
 * @returns 当前选中的普通图层交互上下文；未选中时返回 null
 */
function getSelectedMapFeatureContext() {
  if (pluginHost.resolveSelectedFeatureSnapshot()) {
    return pluginLayerInteractiveBinding?.getSelectedFeatureContext() || null;
  }

  return mapInteractiveBinding?.getSelectedFeatureContext() || null;
}

/**
 * 清空当前普通图层交互封装记录的整个选中集。
 */
function clearSelectedMapFeature() {
  pluginLayerInteractiveBinding?.clearSelectionState();
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
 * 获取当前地图宿主解析出的普通图层选择服务。
 * @returns 当前选择服务；未注册时返回 null
 */
function getMapSelectionService(): MapSelectionService | null {
  return pluginHost.getMapSelectionService() || null;
}

/**
 * 为指定要素写入 feature-state。
 * 业务层应优先通过该门面间接操作底层地图，而不是直接持有原始 map 实例。
 * @param target 目标要素描述
 * @param state 需要写入的状态补丁
 * @returns 是否写入成功
 */
function setMapFeatureState(target: MapFeatureStateTarget, state: MapFeatureStatePatch): boolean {
  const rawMap = map.map;
  if (!rawMap?.setFeatureState) {
    return false;
  }

  rawMap.setFeatureState(target, state);
  return true;
}

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
 * 解析普通图层吸附服务产出的自定义吸附坐标。
 * 只有在启用了普通图层吸附时，才会被传给 TerraDraw 的 `snapping.toCustom`。
 * @param event TerraDraw 当前鼠标事件
 * @returns 当前命中的吸附坐标；未命中时返回 undefined
 */
function resolveTerradrawCustomSnapCoordinate(
  event: TerraDrawMouseEvent
): [number, number] | undefined {
  const snapResult = pluginHost.getMapSnapService()?.getBinding()?.resolveTerradrawEvent(event);
  return snapResult?.matched ? snapResult.targetCoordinate || undefined : undefined;
}

/** TerraDraw ready 前同步任务管理器。 */
const terradrawReadySyncManager = createTerradrawReadySyncManager();

/**
 * 预处理绘图控件配置，生成底层控件构造参数与附属绑定配置。
 * @param config 当前业务层绘图控件配置
 * @returns 绘图控件创建所需的标准化结果
 */
function prepareDrawControlOptions(config: TerradrawControlOptions | null | undefined): {
  position: NonNullable<TerradrawControlOptions['position']>;
  controlOptions: DrawControlConstructorOptions;
} {
  const {
    isUse: _,
    position = 'top-left',
    interactive: _interactive,
    lineDecoration,
    ...rest
  } = (config || {}) as TerradrawControlOptions;
  const controlOptions = merge(
    cloneDeep(terradrawStyleConfig),
    resolveDecorationBaseLineStyleConfig(
      lineDecoration,
      drawDecorationWeakLineStyleConfig,
      drawPatternDecorationPreviewLineStyleConfig
    ),
    rest
  ) as TerradrawControlOptions;

  // 容器层统一负责把 plain object 配置实例化为 TerraDraw 模式。
  controlOptions.modeOptions = instantiateTerradrawModeOptions(controlOptions.modeOptions);

  return {
    position,
    controlOptions: controlOptions as DrawControlConstructorOptions,
  };
}

/**
 * 预处理测量控件配置，生成底层控件构造参数与附属绑定配置。
 * @param config 当前业务层测量控件配置
 * @returns 测量控件创建所需的标准化结果
 */
function prepareMeasureControlOptions(config: MeasureControlOptions | null | undefined): {
  position: NonNullable<MeasureControlOptions['position']>;
  controlOptions: MeasureControlConstructorOptions;
} {
  const {
    isUse: _,
    position = 'top-right',
    interactive: _interactive,
    lineDecoration,
    ...rest
  } = (config || {}) as MeasureControlOptions;
  const controlOptions = merge(
    cloneDeep(measureStyleConfig),
    resolveDecorationBaseLineStyleConfig(
      lineDecoration,
      measureDecorationWeakLineStyleConfig,
      measurePatternDecorationPreviewLineStyleConfig
    ),
    rest
  ) as MeasureControlOptions;

  // 测量控件同样支持直接传配置对象，由容器层统一实例化。
  controlOptions.modeOptions = instantiateTerradrawModeOptions(controlOptions.modeOptions);

  return {
    position,
    controlOptions: controlOptions as MeasureControlConstructorOptions,
  };
}

/**
 * 根据最终吸附配置同步绘图控件的吸附能力。
 * @param localSnapConfig 业务层传入的局部吸附配置
 */
function syncDrawSnapping(localSnapConfig: TerradrawSnapSharedOptions | boolean | null | undefined): void {
  syncTerradrawLineAndPolygonSnapping({
    drawInstance: drawControlRef.value?.getTerraDrawInstance?.(),
    taskKey: 'draw-snapping',
    retryTask: () => {
      syncDrawSnapping(controls.value.MaplibreTerradrawControl?.snapping);
    },
    localSnapConfig,
    resolveSnapOptions: (nextLocalSnapConfig) => {
      return resolveTerradrawSnapOptions('draw', nextLocalSnapConfig);
    },
    ensureReadyForModeSync: terradrawReadySyncManager.ensureReadyForModeSync,
    resolveCustomCoordinate: resolveTerradrawCustomSnapCoordinate,
  });
}

/**
 * 根据最终吸附配置同步测量控件的吸附能力。
 * @param localSnapConfig 业务层传入的局部吸附配置
 */
function syncMeasureSnapping(
  localSnapConfig: TerradrawSnapSharedOptions | boolean | null | undefined
): void {
  syncTerradrawLineAndPolygonSnapping({
    drawInstance: measureControlRef.value?.getTerraDrawInstance?.(),
    taskKey: 'measure-snapping',
    retryTask: () => {
      syncMeasureSnapping(controls.value.MaplibreMeasureControl?.snapping);
    },
    localSnapConfig,
    resolveSnapOptions: (nextLocalSnapConfig) => {
      return resolveTerradrawSnapOptions('measure', nextLocalSnapConfig);
    },
    ensureReadyForModeSync: terradrawReadySyncManager.ensureReadyForModeSync,
    resolveCustomCoordinate: resolveTerradrawCustomSnapCoordinate,
  });
}

/**
 * 统一托管绘图控件的创建、交互、线装饰与吸附同步。
 */
const drawControlLifecycle = useTerradrawControlLifecycle({
  getMapInstance: () => map,
  getSnapBinding: () => pluginHost.getMapSnapService()?.getBinding() || null,
  controlType: 'draw',
  getConfig: () => controls.value.MaplibreTerradrawControl,
  Control: MaplibreTerradrawControl,
  defaultPosition: 'top-left',
  prepareOptions: prepareDrawControlOptions,
  getSnappingWatchSource: () => {
    const resolvedSnapOptions = resolveTerradrawSnapOptions(
      'draw',
      controls.value.MaplibreTerradrawControl?.snapping
    );
    return {
      enabled: resolvedSnapOptions.enabled,
      tolerancePx: resolvedSnapOptions.tolerancePx,
      useNative: resolvedSnapOptions.useNative,
      useMapTargets: resolvedSnapOptions.useMapTargets,
    };
  },
  syncSnapping: () => {
    syncDrawSnapping(controls.value.MaplibreTerradrawControl?.snapping);
  },
  clearReadySync: terradrawReadySyncManager.clear,
});
const drawControlRef = drawControlLifecycle.controlRef;
const drawLineDecorationLayerProps = drawControlLifecycle.lineDecorationLayerProps;

/**
 * 统一托管测量控件的创建、交互、线装饰与吸附同步。
 */
const measureControlLifecycle = useTerradrawControlLifecycle({
  getMapInstance: () => map,
  getSnapBinding: () => pluginHost.getMapSnapService()?.getBinding() || null,
  controlType: 'measure',
  getConfig: () => controls.value.MaplibreMeasureControl,
  Control: MaplibreMeasureControl,
  defaultPosition: 'top-right',
  prepareOptions: prepareMeasureControlOptions,
  getSnappingWatchSource: () => {
    const resolvedSnapOptions = resolveTerradrawSnapOptions(
      'measure',
      controls.value.MaplibreMeasureControl?.snapping
    );
    return {
      enabled: resolvedSnapOptions.enabled,
      tolerancePx: resolvedSnapOptions.tolerancePx,
      useNative: resolvedSnapOptions.useNative,
      useMapTargets: resolvedSnapOptions.useMapTargets,
    };
  },
  syncSnapping: () => {
    syncMeasureSnapping(controls.value.MaplibreMeasureControl?.snapping);
  },
  clearReadySync: terradrawReadySyncManager.clear,
});
const measureControlRef = measureControlLifecycle.controlRef;
const measureLineDecorationLayerProps = measureControlLifecycle.lineDecorationLayerProps;

/**
 * 底层逃生句柄集合。
 * 这里不再额外平铺 TerraDraw 一级字段；业务层需要时继续从 control.getTerraDrawInstance() 取引擎即可，
 * 这样能把逃生面控制在最小范围内。
 */
const rawHandles: MapLibreRawHandles = createMapLibreRawHandles({
  mapInstance: map,
  getDrawControl,
  getMeasureControl,
});

// 将底层控件实例和更业务化的快照获取方法同时暴露给父组件（外界）。
// 这里显式使用公开接口收口 expose 类型，避免编辑器按 getter 的运行时展开结果
// 推导模板 ref，进而把 mapRef 误判成与 MapLibreInitExpose 不兼容的结构。
defineExpose<MapLibreInitExpose>({
  /** 底层逃生句柄集合 */
  rawHandles,
  // 兼容期继续保留旧的 getXxx expose，避免业务页和示例一次性全部切换。
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
  /** 获取当前地图注册的普通图层选择服务 */
  getMapSelectionService,
  /** 读取当前 Draw / Measure 控件的属性治理配置 */
  getTerradrawPropertyPolicy,
  /** 清空当前普通图层的选中状态 */
  clearSelectedMapFeature,
  /** 为指定要素写入 feature-state */
  setMapFeatureState,
  /** 地图插件宿主查询接口 */
  plugins: pluginHost.hostExpose,
});

/**
 * 组件卸载前统一销毁 TerraDraw 控件及其附属运行时资源。
 */
onBeforeUnmount(() => {
  drawControlLifecycle.destroy();
  measureControlLifecycle.destroy();
});
</script>

<style lang="scss">
@import 'maplibre-gl/dist/maplibre-gl.css';
@import 'vue-maplibre-gl/dist/vue-maplibre-gl.css';
</style>
