import type { FeatureCollection } from 'geojson';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import type { TerraDrawMouseEvent } from 'terra-draw';
import type { Component, Ref } from 'vue';
import type { MapInstance } from 'vue-maplibre-gl';
import type {
  MapFeatureSnapResult,
  MapLayerInteractiveContext,
  MapLayerInteractiveOptions,
  TerradrawControlType,
  TerradrawSnapSharedOptions,
} from '../shared/mapLibre-contols-types';
import type { MapCommonFeature } from '../shared/map-common-tools';

/** 地图吸附绑定统一接口。 */
export interface MapSnapBinding {
  /** 当前吸附预览图层数据源。 */
  previewData: Ref<FeatureCollection>;
  /** 根据 MapLibre 鼠标事件解析吸附结果。 */
  resolveMapEvent: (event: MapMouseEvent) => MapFeatureSnapResult;
  /** 根据普通屏幕点和经纬度解析吸附结果。 */
  resolvePointer: (options: {
    point: { x: number; y: number };
    lngLat: { lng: number; lat: number };
  }) => MapFeatureSnapResult;
  /** 根据 TerraDraw 鼠标事件解析吸附结果。 */
  resolveTerradrawEvent: (event: TerraDrawMouseEvent) => MapFeatureSnapResult;
  /** 主动清空吸附预览。 */
  clearPreview: () => void;
  /** 销毁当前吸附绑定。 */
  destroy: () => void;
}

/** TerraDraw / Measure 最终生效的吸附配置。 */
export interface ResolvedTerradrawSnapOptions {
  /** 当前控件是否启用吸附。 */
  enabled: boolean;
  /** 当前控件最终吸附范围。 */
  tolerancePx: number;
  /** 是否启用 TerraDraw 原生吸附。 */
  useNative: boolean;
  /** 是否启用普通图层候选吸附。 */
  useMapTargets: boolean;
}

/** 地图吸附服务统一接口。 */
export interface MapSnapService {
  /** 读取当前吸附绑定。 */
  getBinding: () => MapSnapBinding | null;
  /** 解析控件最终吸附配置。 */
  resolveTerradrawSnapOptions: (
    controlType: TerradrawControlType,
    localConfig: TerradrawSnapSharedOptions | boolean | null | undefined
  ) => ResolvedTerradrawSnapOptions;
  /** 主动清空当前吸附预览。 */
  clearPreview?: () => void;
}

/** 单个插件渲染项。 */
export interface MapPluginRenderItem {
  /** 当前渲染项唯一标识。 */
  id: string;
  /** 当前渲染项对应的组件。 */
  component: Component;
  /** 透传给组件的属性。 */
  props: Record<string, unknown>;
}

/** 插件可贡献的宿主服务集合。 */
export interface MapPluginServices {
  /** 普通图层 / TerraDraw / Measure 共用的吸附服务。 */
  mapSnap?: MapSnapService;
}

/** 宿主消费用的已擦除插件描述对象。 */
export interface AnyMapPluginDescriptor {
  /** 插件唯一标识。 */
  id: string;
  /** 插件类型标识。 */
  type: string;
  /** 插件配置项。 */
  options: unknown;
  /** 插件定义对象。 */
  plugin: MapPluginDefinition<any, any, unknown, unknown>;
}

/** 地图插件描述对象。 */
export interface MapPluginDescriptor<TType extends string = string, TOptions = unknown>
  extends AnyMapPluginDescriptor {
  /** 插件类型标识。 */
  type: TType;
  /** 插件配置项。 */
  options: TOptions;
  /** 插件定义对象。 */
  plugin: MapPluginDefinition<TType, TOptions, unknown, unknown>;
}

/** 插件状态变更统一事件载荷。 */
export interface MapPluginStateChangePayload<TState = unknown> {
  /** 触发状态变化的插件 ID。 */
  pluginId: string;
  /** 触发状态变化的插件类型。 */
  pluginType: string;
  /** 插件最新状态快照。 */
  state: TState;
}

/** 插件运行时上下文。 */
export interface MapPluginContext<TType extends string = string, TOptions = unknown> {
  /** 当前插件描述对象。 */
  descriptor: MapPluginDescriptor<TType, TOptions>;
  /** 读取当前插件最新配置。 */
  getOptions: () => TOptions;
  /** 读取当前地图实例。 */
  getMap: () => MaplibreMap | null | undefined;
  /** 读取当前地图实例包装对象。 */
  getMapInstance: () => MapInstance;
  /** 读取业务层原始普通图层交互配置。 */
  getBaseMapInteractive: () => MapLayerInteractiveOptions | null | undefined;
  /** 读取普通图层当前选中上下文。 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null;
  /** 清理普通图层 hover 状态。 */
  clearHoverState: () => void;
  /** 清理普通图层选中状态。 */
  clearSelectedFeature: () => void;
  /** 将渲染态要素转换为标准 GeoJSON 快照。 */
  toFeatureSnapshot: (feature: any) => MapCommonFeature | null;
}

/** 插件实例统一接口。 */
export interface MapPluginInstance<TApi = unknown, TState = unknown> {
  /** 读取当前插件渲染项。 */
  getRenderItems?: () => MapPluginRenderItem[];
  /** 读取当前插件对普通图层交互的补丁。 */
  getMapInteractivePatch?: () => MapLayerInteractiveOptions | null;
  /** 解析当前选中要素快照。 */
  resolveSelectedFeatureSnapshot?: () => MapCommonFeature | null;
  /** 读取当前插件对外暴露的 API。 */
  getApi?: () => TApi | null;
  /** 当前插件最新状态。 */
  state?: Ref<TState>;
  /** 当前插件贡献的宿主服务。 */
  services?: Partial<MapPluginServices>;
  /** 销毁当前插件实例。 */
  destroy?: () => void;
}

/** 插件定义对象。 */
export interface MapPluginDefinition<
  TType extends string = string,
  TOptions = unknown,
  TApi = unknown,
  TState = unknown,
> {
  /** 插件类型标识。 */
  type: TType;
  /** 根据宿主上下文创建插件实例。 */
  createInstance: (
    context: MapPluginContext<TType, TOptions>
  ) => MapPluginInstance<TApi, TState>;
}

/** 地图插件宿主对外暴露的查询接口。 */
export interface MapPluginHostExpose {
  /** 判断指定插件是否已注册。 */
  has: (pluginId: string) => boolean;
  /** 读取指定插件对外暴露的 API。 */
  getApi: <TApi = unknown>(pluginId: string) => TApi | null;
  /** 读取指定插件当前状态。 */
  getState: <TState = unknown>(pluginId: string) => TState | null;
  /** 列出当前已注册插件。 */
  list: () => Array<{ id: string; type: string }>;
}

/**
 * 定义地图插件。
 * @param pluginDefinition 插件定义对象
 * @returns 原样返回插件定义，便于获得完整泛型推断
 */
export function defineMapPlugin<
  TType extends string,
  TOptions,
  TApi = unknown,
  TState = unknown,
>(pluginDefinition: MapPluginDefinition<TType, TOptions, TApi, TState>) {
  return pluginDefinition;
}
