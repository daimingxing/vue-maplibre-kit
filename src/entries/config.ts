import type {
  CircleLayerSpecification,
  ControlPosition,
  FillLayerSpecification,
  LineLayerSpecification,
  MapOptions,
  RasterLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import type {
  MapControlsConfig,
  MapSelectionDeactivateBehavior,
  TerradrawSnapSharedOptions,
} from '../MapLibre/shared/mapLibre-controls-types';
import type {
  MapFeatureSnapPreviewOptions,
  MapFeatureSnapTargetOptions,
} from '../MapLibre/plugins/map-feature-snap/types';
import type { LineDraftPreviewStyleOverrides } from '../MapLibre/plugins/line-draft-preview/types';
import type {
  IntersectionPreviewStateStyles,
  IntersectionPreviewStyleOverrides,
  IntersectionPreviewScope,
} from '../MapLibre/plugins/intersection-preview/types';
import type {
  PolygonEdgePreviewStateStyles,
  PolygonEdgePreviewStyleRule,
} from '../MapLibre/plugins/polygon-edge-preview/types';
import type { MapDxfExportTaskOptions } from '../MapLibre/plugins/map-dxf-export/types';
import type { MapLayerStyleOverrides } from '../MapLibre/shared/map-layer-style-config';
import { cloneDeep } from 'lodash-es';
import { isReactive, isRef } from 'vue';

/** 地图初始化全局默认配置类型。 */
export type MapKitGlobalMapOptions = Partial<MapOptions & { mapStyle: string | object }>;

/** 地图控件全局默认配置类型。 */
export type MapKitGlobalControls = MapControlsConfig;

/** 全局点图层样式默认值。 */
export type MapCircleLayerStyleDefaults = MapLayerStyleOverrides<
  CircleLayerSpecification['layout'],
  CircleLayerSpecification['paint']
>;

/** 全局线图层样式默认值。 */
export type MapLineLayerStyleDefaults = MapLayerStyleOverrides<
  LineLayerSpecification['layout'],
  LineLayerSpecification['paint']
>;

/** 全局面图层样式默认值。 */
export type MapFillLayerStyleDefaults = MapLayerStyleOverrides<
  FillLayerSpecification['layout'],
  FillLayerSpecification['paint']
>;

/** 全局符号图层样式默认值。 */
export type MapSymbolLayerStyleDefaults = MapLayerStyleOverrides<
  SymbolLayerSpecification['layout'],
  SymbolLayerSpecification['paint']
>;

/** 全局栅格图层样式默认值。 */
export type MapRasterLayerStyleDefaults = MapLayerStyleOverrides<
  RasterLayerSpecification['layout'],
  RasterLayerSpecification['paint']
>;

/** 地图吸附插件全局默认配置。 */
export interface MapFeatureSnapGlobalDefaults {
  /** 全局默认吸附范围。 */
  defaultTolerancePx?: number;
  /** 全局吸附预览样式。 */
  preview?: MapFeatureSnapPreviewOptions;
  /** 交点插件内置吸附目标默认配置。 */
  intersection?: boolean | MapFeatureSnapTargetOptions;
  /** 面边线插件内置吸附目标默认配置。 */
  polygonEdge?: boolean | MapFeatureSnapTargetOptions;
  /** TerraDraw / Measure 吸附默认值。 */
  terradraw?: {
    /** Draw / Measure 共用默认值。 */
    defaults?: TerradrawSnapSharedOptions;
    /** Draw 控件默认值。 */
    draw?: TerradrawSnapSharedOptions | boolean;
    /** Measure 控件默认值。 */
    measure?: TerradrawSnapSharedOptions | boolean;
  };
}

/** 线草稿预览插件全局默认配置。 */
export interface LineDraftPreviewGlobalDefaults {
  /** 全局线草稿样式覆写。 */
  styleOverrides?: LineDraftPreviewStyleOverrides;
}

/** 交点预览插件全局默认配置。 */
export interface IntersectionPreviewGlobalDefaults {
  /** 当前交点层默认是否可见。 */
  visible?: boolean;
  /** 点击预览交点时是否自动生成正式交点点要素。 */
  materializeOnClick?: boolean;
  /** 当前求交范围。 */
  scope?: IntersectionPreviewScope;
  /** 是否保留端点交点。 */
  includeEndpoint?: boolean;
  /** 交点坐标归一化小数位。 */
  coordDigits?: number;
  /** 是否忽略同一条线自交。 */
  ignoreSelf?: boolean;
  /** 全局预览交点状态样式配置。 */
  previewStateStyles?: IntersectionPreviewStateStyles;
  /** 全局正式交点状态样式配置。 */
  materializedStateStyles?: IntersectionPreviewStateStyles;
  /** 全局预览交点样式覆写。 */
  previewStyleOverrides?: IntersectionPreviewStyleOverrides;
  /** 全局正式交点样式覆写。 */
  materializedStyleOverrides?: IntersectionPreviewStyleOverrides;
}

/** 面边线预览插件全局默认配置。 */
export interface PolygonEdgePreviewGlobalDefaults {
  /** 全局面边线状态样式。 */
  style?: PolygonEdgePreviewStateStyles;
  /** 全局面边线来源面样式规则。 */
  styleRules?: PolygonEdgePreviewStyleRule[];
}

/** 要素多选插件全局默认配置。 */
export interface MapFeatureMultiSelectGlobalDefaults {
  /** 控件显示位置。 */
  position?: ControlPosition;
  /** 退出多选后的处理策略。 */
  deactivateBehavior?: MapSelectionDeactivateBehavior;
  /** 是否允许使用 Esc 退出。 */
  closeOnEscape?: boolean;
}

/** DXF 导出插件全局默认配置。 */
export interface MapDxfExportGlobalDefaults {
  /** 全局 DXF 任务默认值。 */
  defaults?: MapDxfExportTaskOptions;
  /** 全局 DXF 控件默认值。 */
  control?: {
    /** 是否渲染控件。 */
    enabled?: boolean;
    /** 控件显示位置。 */
    position?: ControlPosition;
    /** 控件文案。 */
    label?: string;
  };
}

/** 地图全局默认配置。 */
export interface MapKitGlobalConfig {
  /** 地图初始化全局默认配置。 */
  mapOptions?: MapKitGlobalMapOptions;
  /** 地图控件全局默认配置。 */
  mapControls?: MapKitGlobalControls;
  /** 地图插件全局默认配置。 */
  plugins?: {
    /** 吸附插件全局默认配置。 */
    snap?: MapFeatureSnapGlobalDefaults;
    /** 线草稿插件全局默认配置。 */
    lineDraft?: LineDraftPreviewGlobalDefaults;
    /** 交点预览插件全局默认配置。 */
    intersection?: IntersectionPreviewGlobalDefaults;
    /** 面边线预览插件全局默认配置。 */
    polygonEdge?: PolygonEdgePreviewGlobalDefaults;
    /** 多选插件全局默认配置。 */
    multiSelect?: MapFeatureMultiSelectGlobalDefaults;
    /** DXF 插件全局默认配置。 */
    dxfExport?: MapDxfExportGlobalDefaults;
  };
  /** 图层样式工厂全局默认配置。 */
  styles?: {
    /** 点图层样式默认值。 */
    circle?: MapCircleLayerStyleDefaults;
    /** 线图层样式默认值。 */
    line?: MapLineLayerStyleDefaults;
    /** 面图层样式默认值。 */
    fill?: MapFillLayerStyleDefaults;
    /** 符号图层样式默认值。 */
    symbol?: MapSymbolLayerStyleDefaults;
    /** 栅格图层样式默认值。 */
    raster?: MapRasterLayerStyleDefaults;
  };
}

/** 空全局配置快照。 */
const EMPTY_MAP_GLOBAL_CONFIG = Object.freeze({}) as Readonly<MapKitGlobalConfig>;

/** 当前应用级全局配置快照。 */
let currentMapGlobalConfig: Readonly<MapKitGlobalConfig> = EMPTY_MAP_GLOBAL_CONFIG;

/** Vue 响应式配置值提示。 */
const VUE_STATE_CONFIG_WARNING = '[setMapGlobalConfig] 检测到 Vue 响应式配置值，建议传入普通对象快照';

/**
 * 判断是否为 Vue 响应式对象或 ref。
 * 使用 Vue 官方运行时 API，避免依赖内部实现细节。
 *
 * @param value 待判断值
 * @returns 是否为 Vue 响应式值
 */
function isVueStateValue(value: unknown): value is object {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return isReactive(value) || isRef(value);
}

/**
 * 判断配置中是否包含 Vue 响应式值。
 * 全局配置按普通对象快照处理，传入响应式值时需要提示业务层先解包。
 *
 * @param value 待检查值
 * @param visitedSet 已检查对象集合
 * @returns 是否包含 Vue 响应式值
 */
function hasVueStateValue(value: unknown, visitedSet = new WeakSet<object>()): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (visitedSet.has(value)) {
    return false;
  }

  if (isVueStateValue(value)) {
    return true;
  }

  visitedSet.add(value);
  return Reflect.ownKeys(value).some((propertyKey) => {
    return hasVueStateValue((value as Record<PropertyKey, unknown>)[propertyKey], visitedSet);
  });
}

/**
 * 深度冻结对象快照。
 * @param value 待冻结对象
 * @param frozenSet 已处理对象集合
 * @returns 冻结后的对象
 */
function deepFreeze<T>(value: T, frozenSet = new WeakSet<object>()): Readonly<T> {
  if (value === null || typeof value !== 'object') {
    return value as Readonly<T>;
  }

  if (isVueStateValue(value)) {
    return value as Readonly<T>;
  }

  if (frozenSet.has(value)) {
    return value as Readonly<T>;
  }

  frozenSet.add(value);
  Reflect.ownKeys(value).forEach((propertyKey) => {
    deepFreeze((value as Record<PropertyKey, unknown>)[propertyKey], frozenSet);
  });

  return Object.freeze(value) as Readonly<T>;
}

/**
 * 深拷贝并冻结全局配置快照。
 * @param config 原始全局配置
 * @returns 可安全复用的快照对象
 */
function freezeMapGlobalConfig(config: MapKitGlobalConfig): Readonly<MapKitGlobalConfig> {
  if (hasVueStateValue(config)) {
    console.warn(VUE_STATE_CONFIG_WARNING);
  }

  return deepFreeze(cloneDeep(config));
}

/**
 * 定义地图全局默认配置。
 * 该函数只提供类型辅助，不产生任何运行时副作用。
 *
 * @param config 全局默认配置
 * @returns 原样返回配置对象
 */
export function defineMapGlobalConfig(config: MapKitGlobalConfig): MapKitGlobalConfig {
  return config;
}

/**
 * 注册地图全局默认配置。
 * 第一版按“整份替换”处理，不做 patch 合并。
 *
 * @param config 全局默认配置
 * @returns 最新注册的只读配置快照
 */
export function setMapGlobalConfig(config: MapKitGlobalConfig): Readonly<MapKitGlobalConfig> {
  currentMapGlobalConfig = freezeMapGlobalConfig(config);
  return currentMapGlobalConfig;
}

/**
 * 读取当前地图全局默认配置。
 * @returns 最新注册的只读配置快照；未注册时返回空对象
 */
export function getMapGlobalConfig(): Readonly<MapKitGlobalConfig> {
  return currentMapGlobalConfig;
}

/**
 * 清空当前地图全局默认配置。
 */
export function resetMapGlobalConfig(): void {
  currentMapGlobalConfig = EMPTY_MAP_GLOBAL_CONFIG;
}
