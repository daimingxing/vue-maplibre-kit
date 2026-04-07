<template>
  <mgl-map :mapKey="mapKey" v-bind="{ ...mergedOptions, ...$attrs } as any">
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

    <!-- 动态地图扩展图层 -->
    <component
      :is="extensionRenderItem.component"
      v-for="extensionRenderItem in extensionRenderItems"
      :key="extensionRenderItem.id"
      v-bind="extensionRenderItem.props"
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
  MglCustomControl,
  useMap,
  MglMarker,
} from 'vue-maplibre-gl';
import { MaplibreTerradrawControl, MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw';
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css';
import type { MapOptions } from 'maplibre-gl';
import type {
  MapControlsConfig,
  MapLayerInteractiveOptions,
  TerradrawSnapSharedOptions,
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
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawRectangleMode,
  TerraDrawCircleMode,
  TerraDrawFreehandMode,
  TerraDrawAngledRectangleMode,
  TerraDrawSensorMode,
  TerraDrawSectorMode,
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
import {
  type MapCommonFeature,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '../shared/map-common-tools';
import {
  ManagedTunnelPreviewLayers,
  MANAGED_TUNNEL_PREVIEW_EXTENSION_TYPE,
  type ManagedTunnelPreviewExtensionApi,
  type ManagedTunnelPreviewExtensionDescriptor,
  useManagedTunnelPreviewExtension,
} from '../extensions/managedTunnelPreview';
import {
  MAP_FEATURE_SNAP_EXTENSION_TYPE,
  MapFeatureSnapPreviewLayers,
  type MapFeatureSnapExtensionDescriptor,
  useMapFeatureSnapExtension,
  type ResolvedTerradrawSnapOptions,
} from '../extensions/mapFeatureSnap';
import type {
  MapExtensionDescriptor,
  MapExtensionRenderItem,
  MapExtensionStateChangePayload,
} from '../extensions/types';
import type {
  FeatureProperties,
  FeaturePropertySaveMode,
  MapFeatureId,
  SaveFeaturePropertiesResult,
} from '../composables/useMapDataUpdate';

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
  // 挂载的插件列表（比如临时延长线插件），外部通过传入配置对象来激活插件功能
  extensions: {
    type: Array as PropType<MapExtensionDescriptor[]>,
    default: () => [],
  },
});

const emit = defineEmits<{
  (event: 'extensionStateChange', payload: MapExtensionStateChangePayload<unknown>): void;
}>();

/**
 * 提取 TerraDraw 控件（绘图/测量）当前在地图上画出来的所有图形数据。
 * @param controlRef 控件的响应式引用（里面存着控件实例）
 * @returns 包含所有图形数据的 GeoJSON 数组；如果控件没开，返回 null
 */
function getControlFeatures(controlRef: { value: any } | null | undefined): any[] | null {
  const control = controlRef?.value;
  if (!control) {
    return null;
  }

  const drawInstance = control.getTerraDrawInstance?.();
  if (!drawInstance) {
    return null;
  }

  return drawInstance.getSnapshot();
}

function getDrawControl() {
  return drawControlRef.value;
}

function getMeasureControl() {
  return measureControlRef.value;
}

function getDrawFeatures(): any[] | null {
  return getControlFeatures(drawControlRef);
}

function getMeasureFeatures(): any[] | null {
  return getControlFeatures(measureControlRef);
}

/**
 * 将 MapLibre 内部复杂的渲染要素(RenderedFeature) 转换为标准的 GeoJSON 格式。
 * 为什么要转？因为内部格式太复杂且包含很多无关信息，业务层只想要干净的 { type, id, properties, geometry } 数据。
 * @param feature 当前命中的 MapLibre 渲染态要素
 * @returns 干净的标准 GeoJSON 要素；无法转换时返回 null
 */
function toMapFeatureSnapshot(feature: any): MapCommonFeature | null {
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
const getControlProps = (config: any) => {
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
  } as any;

  // 兼容原生的 style 属性到 vue-maplibre-gl 的 mapStyle
  if (options.style && !options.mapStyle) {
    options.mapStyle = options.style;
  }

  return options;
});

// 初始化地图实例引用。
// 后续普通图层交互、吸附模块、绘图控件和测量控件都统一复用这一个 map 句柄。
const map = useMap(props.mapKey as any);

/**
 * 根据插件的名字（类型），从业务层传进来的 extensions 列表里，把那个插件的配置找出来。
 * @param extensionType 插件类型（比如 'managedTunnelPreview'）
 * @returns 找出来的插件配置对象；没找到返回 null
 */
const resolveExtensionDescriptorByType = (extensionType: string): MapExtensionDescriptor | null => {
  return (
    props.extensions.find((extensionDescriptor) => extensionDescriptor.type === extensionType) ||
    null
  );
};

/**
 * 找一找：业务层有没有启用【临时延长线/预览区域】插件？
 * 只有在外部传进来的 extensions 数组里包含了这个插件，这里才会有值。
 */
const managedTunnelPreviewDescriptor = computed<ManagedTunnelPreviewExtensionDescriptor | null>(
  () => {
    return (
      (resolveExtensionDescriptorByType(
        MANAGED_TUNNEL_PREVIEW_EXTENSION_TYPE
      ) as ManagedTunnelPreviewExtensionDescriptor | null) || null
    );
  }
);

/**
 * 统一吸附扩展描述对象。
 * 业务层通过扩展工厂函数显式注册，容器层统一负责普通图层吸附预览与 TerraDraw / Measure 对接。
 */
const mapFeatureSnapDescriptor = computed<MapFeatureSnapExtensionDescriptor | null>(() => {
  return (
    (resolveExtensionDescriptorByType(
      MAP_FEATURE_SNAP_EXTENSION_TYPE
    ) as MapFeatureSnapExtensionDescriptor | null) || null
  );
});

/**
 * 统一吸附扩展控制器。
 * 容器层通过它拿到普通图层吸附绑定、预览图层样式以及 TerraDraw / Measure 的最终吸附配置。
 */
const mapFeatureSnapExtension = useMapFeatureSnapExtension({
  getOptions: () => mapFeatureSnapDescriptor.value?.options,
  getMap: () => map.map || null,
});

/**
 * 启动【临时延长线/预览区域】的逻辑核心。
 * 把底层的地图操作、图层状态、交互事件都喂给它，它就能自动管好那些临时的虚线和面。
 */
const managedTunnelPreviewExtension = useManagedTunnelPreviewExtension({
  /** 读取业务层注册的托管预览扩展配置 */
  getOptions: () => managedTunnelPreviewDescriptor.value?.options,
  /** 读取业务层传入的普通图层交互配置 */
  getMapInteractive: () => props.mapInteractive,
  /** 读取普通图层交互层当前选中的上下文 */
  getSelectedFeatureContext: () => mapInteractiveBinding.getSelectedFeatureContext() || null,
  /** 清理普通图层 hover 状态 */
  clearHoverState: () => mapInteractiveBinding.clearHoverState(),
  /** 清理普通图层选中状态 */
  clearSelectedFeature: () => mapInteractiveBinding.clearSelectionState(),
  /** 将渲染态要素转换为标准 GeoJSON 快照 */
  toFeatureSnapshot: toMapFeatureSnapshot,
  /** 将扩展内部状态变化以通用事件的形式回传给业务层 */
  onStateChange: (payload) => {
    if (!managedTunnelPreviewDescriptor.value) {
      return;
    }

    emit('extensionStateChange', {
      extensionId: managedTunnelPreviewDescriptor.value.id,
      extensionType: managedTunnelPreviewDescriptor.value.type,
      state: payload,
    });
  },
});

/** 托管临时预览是否启用 */
const managedTunnelPreviewEnabled = managedTunnelPreviewExtension.enabled;
/** 托管临时预览数据源 */
const managedTunnelPreviewData = managedTunnelPreviewExtension.data;
/** 托管临时延长线图层样式 */
const managedTunnelPreviewLineStyle = managedTunnelPreviewExtension.lineStyle;
/** 托管临时预览区域图层样式 */
const managedTunnelPreviewFillStyle = managedTunnelPreviewExtension.fillStyle;
/** 合并托管临时预览图层后的普通图层交互配置 */
const mergedMapInteractive = managedTunnelPreviewExtension.mergedMapInteractive;

/**
 * 拼装所有要渲染在地图上的插件组件。
 * 这个机制让插件自己决定要渲染什么图层，mapLibre-init 只需要在上面的 template 里用 v-for 盲目渲染就行了。
 */
const extensionRenderItems = computed<MapExtensionRenderItem[]>(() => {
  const renderItems: MapExtensionRenderItem[] = [];

  if (mapFeatureSnapDescriptor.value) {
    renderItems.push({
      id: mapFeatureSnapDescriptor.value.id,
      component: MapFeatureSnapPreviewLayers,
      props: {
        enabled: mapFeatureSnapExtension.previewEnabled.value,
        data: mapFeatureSnapExtension.previewData.value,
        pointStyle: mapFeatureSnapExtension.previewPointStyle.value,
        lineStyle: mapFeatureSnapExtension.previewLineStyle.value,
      },
    });
  }

  if (managedTunnelPreviewDescriptor.value) {
    renderItems.push({
      id: managedTunnelPreviewDescriptor.value.id,
      component: ManagedTunnelPreviewLayers,
      props: {
        enabled: managedTunnelPreviewEnabled.value,
        data: managedTunnelPreviewData.value,
        lineStyle: managedTunnelPreviewLineStyle.value,
        fillStyle: managedTunnelPreviewFillStyle.value,
      },
    });
  }

  return renderItems;
});

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

const mapInteractiveBinding = useMapInteractive({
  mapInstance: map,
  getInteractive: () => mergedMapInteractive.value,
  getSnapBinding: () => mapFeatureSnapExtension.binding.value,
});

/**
 * 获取当前普通图层交互封装记录的已选中要素。
 * @returns 当前选中的 MapLibre 要素；未选中时返回 null
 */
function getSelectedMapFeature() {
  return mapInteractiveBinding.getSelectedFeature();
}

/**
 * 获取当前普通图层交互封装记录的已选中要素上下文。
 * @returns 当前选中的普通图层交互上下文；未选中时返回 null
 */
function getSelectedMapFeatureContext() {
  return mapInteractiveBinding.getSelectedFeatureContext();
}

/**
 * 清空当前普通图层交互封装记录的选中要素。
 */
function clearSelectedMapFeature() {
  mapInteractiveBinding.clearSelectionState();
}

/**
 * 获取当前普通图层交互封装记录的选中要素快照。
 * 若当前选中的是托管临时预览要素，则优先返回内部数据源中的最新快照。
 * @returns 标准化后的 GeoJSON 要素快照；未选中时返回 null
 */
function getSelectedMapFeatureSnapshot(): MapCommonFeature | null {
  return managedTunnelPreviewExtension.getSelectedFeatureSnapshot();
}

/**
 * 外部想拿到各种插件的方法，统一走这里。
 * 用法：mapInitRef.value.extensions.managedTunnelPreview.previewLine(...)
 * 这样设计是为了防止向外暴露的方法太多太乱。
 */
const extensionApis = {
  get managedTunnelPreview(): ManagedTunnelPreviewExtensionApi | null {
    if (!managedTunnelPreviewDescriptor.value) {
      return null;
    }

    return {
      data: managedTunnelPreviewData,
      lineStyle: managedTunnelPreviewLineStyle,
      fillStyle: managedTunnelPreviewFillStyle,
      getFeatureById: managedTunnelPreviewExtension.getFeatureById,
      isFeatureById: managedTunnelPreviewExtension.isFeatureById,
      isSelectedFeature: managedTunnelPreviewExtension.isSelectedFeature,
      getSelectedFeatureSnapshot: managedTunnelPreviewExtension.getSelectedFeatureSnapshot,
      previewLine: managedTunnelPreviewExtension.previewLine,
      replacePreviewRegion: managedTunnelPreviewExtension.replacePreviewRegion,
      clear: managedTunnelPreviewExtension.clear,
      saveProperties: managedTunnelPreviewExtension.saveProperties,
    };
  },
};

/**
 * Select 模式下线要素与面要素的默认可编辑 flags。
 * 当业务层没有显式声明对应 flags 时，吸附模块会回退到这组默认值，确保线/面节点编辑仍然可用。
 */
const defaultSelectSnapFlags = {
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
 * 安全地同步 TerraDraw 某个模式的最新配置。
 * 若当前控件未启用该模式，则静默忽略，避免同步吸附配置时打断正常页面逻辑。
 * @param drawInstance 当前 TerraDraw 实例
 * @param modeName 需要同步的模式名称
 * @param modeOptions 该模式最新的局部配置
 */
function safeUpdateTerradrawModeOptions(
  drawInstance: any,
  modeName: string,
  modeOptions: Record<string, any>
): void {
  if (!drawInstance?.updateModeOptions) {
    return;
  }

  try {
    drawInstance.updateModeOptions(modeName as any, modeOptions);
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
): Record<string, any> {
  const snappingConfig: Record<string, any> = {};

  if (resolvedSnapOptions.enabled && resolvedSnapOptions.useNative) {
    snappingConfig.toLine = true;
    snappingConfig.toCoordinate = true;
  }

  if (resolvedSnapOptions.enabled && resolvedSnapOptions.useMapTargets) {
    snappingConfig.toCustom = (event: any) => {
      const snapResult =
        mapFeatureSnapExtension.binding.value?.resolveTerradrawEvent(event) || null;
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
  baseSelectModeOptions: Record<string, any> | null | undefined,
  resolvedSnapOptions: ResolvedTerradrawSnapOptions
): Record<string, any> {
  const baseFlags = merge(
    cloneDeep(defaultSelectSnapFlags),
    cloneDeep(baseSelectModeOptions?.flags || {})
  );
  const snappableConfig =
    resolvedSnapOptions.enabled &&
    (resolvedSnapOptions.useNative || resolvedSnapOptions.useMapTargets)
      ? buildTerradrawModeSnappingPatch(resolvedSnapOptions).snapping
      : false;

  const nextFlags = cloneDeep(baseFlags);

  ['polygon', 'linestring'].forEach((modeName) => {
    nextFlags[modeName] = merge(
      {},
      defaultSelectSnapFlags[modeName as 'polygon' | 'linestring'],
      nextFlags[modeName] || {}
    );

    if (!nextFlags[modeName].feature) {
      nextFlags[modeName].feature = {};
    }

    if (!nextFlags[modeName].feature.coordinates) {
      nextFlags[modeName].feature.coordinates = {};
    }

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
  baseSelectModeOptions: Record<string, any> | null | undefined
): void {
  const drawInstance = drawControlRef.value?.getTerraDrawInstance?.();
  if (!drawInstance) {
    return;
  }

  const resolvedSnapOptions = mapFeatureSnapExtension.resolveTerradrawSnapOptions(
    'draw',
    localSnapConfig
  );
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

  const resolvedSnapOptions = mapFeatureSnapExtension.resolveTerradrawSnapOptions(
    'measure',
    localSnapConfig
  );
  const lineAndPolygonPatch = buildTerradrawModeSnappingPatch(resolvedSnapOptions);

  safeUpdateTerradrawModeOptions(drawInstance, 'linestring', lineAndPolygonPatch);
  safeUpdateTerradrawModeOptions(drawInstance, 'polygon', lineAndPolygonPatch);
}

// ==========================================
// 初始化 MaplibreTerradrawControl 绘图控件
// 并在属性改变时动态同步它的行为
// ==========================================
const drawControlRef = shallowRef<any>(null);
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
const syncDrawInteractive = (interactiveConfig: any) => {
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
    getSnapBinding: () => mapFeatureSnapExtension.binding.value,
  });
};

/**
 * 根据最新配置同步绘图控件的线装饰管理器。
 * @param lineDecorationConfig 业务层传入的线装饰配置
 */
const syncDrawLineDecoration = (lineDecorationConfig: any) => {
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
    mapFeatureSnapDescriptor.value?.options,
  ],
  ([isLoaded, isUse, config]) => {
    if (isLoaded && map.map) {
      if (isUse) {
        const {
          isUse: _,
          position = 'top-left',
          interactive,
          snapping,
          lineDecoration,
          ...rest
        } = (config || {}) as any;
        const terradrawConfig = merge(
          cloneDeep(terradrawStyleConfig),
          resolveDecorationBaseLineStyleConfig(
            lineDecoration,
            drawDecorationWeakLineStyleConfig,
            drawPatternDecorationPreviewLineStyleConfig
          ),
          rest
        );
        const rawModeOptions = cloneDeep(terradrawConfig.modeOptions || {});

        if (!drawControlRef.value) {
          // 1. 深度合并全局样式配置与业务传入的配置
          const mergedConfig = terradrawConfig;

          // 2. 将合并后的普通对象实例化为对应的 TerraDraw Mode
          const modeOptions: any = {};
          if (mergedConfig.modeOptions) {
            const mo = mergedConfig.modeOptions;
            if (mo.point) modeOptions.point = new TerraDrawPointMode(mo.point);
            if (mo.linestring) modeOptions.linestring = new TerraDrawLineStringMode(mo.linestring);
            if (mo.polygon) modeOptions.polygon = new TerraDrawPolygonMode(mo.polygon);
            if (mo.rectangle) modeOptions.rectangle = new TerraDrawRectangleMode(mo.rectangle);
            if (mo.circle) modeOptions.circle = new TerraDrawCircleMode(mo.circle);
            if (mo.freehand) modeOptions.freehand = new TerraDrawFreehandMode(mo.freehand);
            if (mo['angled-rectangle'])
              modeOptions['angled-rectangle'] = new TerraDrawAngledRectangleMode(
                mo['angled-rectangle']
              );
            if (mo.sensor) modeOptions.sensor = new TerraDrawSensorMode(mo.sensor);
            if (mo.sector) modeOptions.sector = new TerraDrawSectorMode(mo.sector);
            if (mo.select) modeOptions.select = new TerraDrawSelectMode(mo.select);
          }

          // 3. 覆盖实例化后的 modeOptions
          mergedConfig.modeOptions = modeOptions;

          const drawControl = new MaplibreTerradrawControl(mergedConfig);
          drawControlRef.value = drawControl;
          map.map.addControl(drawControl, position);
        }

        syncDrawInteractive(interactive);
        syncDrawLineDecoration(lineDecoration);
        syncDrawSnapping(snapping, rawModeOptions.select || null);
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

// 初始化 maplibre-gl-terradraw 测量控件
// ==========================================
// 初始化 MaplibreMeasureControl 测量控件
// 并在属性改变时动态同步它的行为
// ==========================================
const measureControlRef = shallowRef<any>(null);
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
const syncMeasureInteractive = (interactiveConfig: any) => {
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
    getSnapBinding: () => mapFeatureSnapExtension.binding.value,
  });
};

/**
 * 根据最新配置同步测量控件的线装饰管理器。
 * @param lineDecorationConfig 业务层传入的线装饰配置
 */
const syncMeasureLineDecoration = (lineDecorationConfig: any) => {
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
    mapFeatureSnapDescriptor.value?.options,
  ],
  ([isLoaded, isUse, config]) => {
    if (isLoaded && map.map) {
      if (isUse) {
        const {
          isUse: _,
          position = 'top-right',
          interactive,
          snapping,
          lineDecoration,
          ...rest
        } = (config || {}) as any;
        const measureConfig = merge(
          cloneDeep(measureStyleConfig),
          resolveDecorationBaseLineStyleConfig(
            lineDecoration,
            measureDecorationWeakLineStyleConfig,
            measurePatternDecorationPreviewLineStyleConfig
          ),
          rest
        );

        if (!measureControlRef.value) {
          // 1. 深度合并全局样式配置与业务传入的配置
          const mergedConfig = measureConfig;

          // 2. 将合并后的普通对象实例化为对应的 TerraDraw Mode
          const modeOptions: any = {};
          if (mergedConfig.modeOptions) {
            const mo = mergedConfig.modeOptions;
            if (mo.linestring) modeOptions.linestring = new TerraDrawLineStringMode(mo.linestring);
            if (mo.polygon) modeOptions.polygon = new TerraDrawPolygonMode(mo.polygon);
          }

          // 3. 覆盖实例化后的 modeOptions
          mergedConfig.modeOptions = modeOptions;

          const measureControl = new MaplibreMeasureControl(mergedConfig);
          measureControlRef.value = measureControl;
          map.map.addControl(measureControl, position);
        }

        syncMeasureInteractive(interactive);
        syncMeasureLineDecoration(lineDecoration);
        syncMeasureSnapping(snapping);
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
  /** 地图扩展 API 命名空间 */
  extensions: extensionApis,
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
