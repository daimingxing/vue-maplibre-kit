import type { Feature, LineString, MultiLineString } from 'geojson';
import type { ControlPosition, Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import type {
  TerradrawControlType,
  TerradrawSnapSharedOptions,
} from '../../shared/mapLibre-controls-types';
import type {
  MapFeatureSnapGeometryType,
  MapFeatureSnapMode,
  MapFeatureSnapParent,
  MapFeatureSnapResult,
} from '../../shared/map-feature-snap-types';

export type {
  MapFeatureSnapDrawnTargetOptions,
  MapFeatureSnapGeometryType,
  MapFeatureSnapKind,
  MapFeatureSnapMode,
  MapFeatureSnapParent,
  MapFeatureSnapResult,
  MapFeatureSnapSegmentInfo,
} from '../../shared/map-feature-snap-types';

/** 单条吸附规则高级过滤上下文。 */
export interface MapFeatureSnapRuleFilterContext {
  /** 当前匹配中的规则配置。 */
  rule: MapFeatureSnapRule;
  /** 当前候选渲染要素。 */
  feature: MapGeoJSONFeature;
  /** 当前候选图层 ID。 */
  layerId: string;
  /** 当前候选 source ID。 */
  sourceId: string | null;
  /** 当前候选 source-layer。 */
  sourceLayer: string | null;
  /** 当前候选属性对象。 */
  properties: Record<string, any> | null;
  /** 当前地图实例。 */
  map: MaplibreMap;
}

/** 单条普通图层吸附规则。 */
export interface MapFeatureSnapRule {
  /** 规则唯一标识；不传时由系统根据来源和 layerIds 自动生成。 */
  id?: string;
  /** 规则展示名称；配置面板优先展示该名称，未传时展示 id。 */
  label?: string;
  /** 是否启用当前规则。 */
  enabled?: boolean;
  /** 参与当前规则候选查询的图层 ID 集合。 */
  layerIds: string[];
  /** 当前规则命中优先级。 */
  priority?: number;
  /** 当前规则局部吸附范围。 */
  tolerancePx?: number;
  /** 当前规则允许命中的几何类型。 */
  geometryTypes?: MapFeatureSnapGeometryType[];
  /** 当前规则允许采用的吸附方式。 */
  snapTo?: MapFeatureSnapMode[];
  /** 对候选属性对象做浅层严格匹配的条件集合。 */
  where?: Record<string, unknown>;
  /** 业务层高级过滤函数。 */
  filter?: (context: MapFeatureSnapRuleFilterContext) => boolean;
  /** 运行期读取当前规则是否可见；显隐只过滤候选，不参与交点几何签名。 */
  isVisible?: () => boolean;
}

/** 完整 source resolver 返回的单条线要素。 */
export interface MapFeatureSnapResolvedFeature {
  /** 未经过 MapLibre tile 裁剪的完整线要素。 */
  feature: Feature<LineString | MultiLineString, Record<string, any> | null>;
  /** 要素所属 source ID。 */
  sourceId: string;
  /** vector source 时要素所属的 source-layer。 */
  sourceLayer?: string;
  /** 要素命中的业务 layer ID。 */
  layerId: string;
}

/** 完整业务线要素 resolver 的地图运行态上下文。 */
export interface MapFeatureSnapFeatureResolverContext {
  /** 当前地图 zoom，用于计算 source 与 layer filter。 */
  zoom: number;
}

/** 按单条 snap rule 读取完整业务线要素的 resolver。 */
export type MapFeatureSnapFeatureResolver = (
  rule: MapFeatureSnapRule,
  context?: MapFeatureSnapFeatureResolverContext
) => MapFeatureSnapResolvedFeature[];

/** 吸附预览图层配置。 */
export interface MapFeatureSnapPreviewOptions {
  /** 是否启用吸附预览。 */
  enabled?: boolean;
  /** 吸附点颜色。 */
  pointColor?: string;
  /** 吸附点半径。 */
  pointRadius?: number;
  /** 命中原要素写入 feature-state 时使用的高亮颜色。 */
  targetColor?: string;
  /** 命中原要素写入 feature-state 时使用的透明度，范围 0 到 1。 */
  targetOpacity?: number;
  /** 命中线要素写入 feature-state 时使用的线宽，单位像素。 */
  targetLineWidth?: number;
}

/** 吸附预览需要同步写入状态的附属原要素。 */
export interface MapFeatureSnapStateTarget {
  /** 原要素所在 source ID。 */
  source: string;
  /** vector source 时原要素所属的 source-layer。 */
  sourceLayer?: string;
  /** 原要素在 source 内的真实 ID。 */
  id: string | number;
}

/** 根据当前吸附结果补充附属原要素状态的 resolver。 */
export type MapFeatureSnapStateTargetResolver = (
  result: MapFeatureSnapResult
) => MapFeatureSnapStateTarget[];

/** 业务图层吸附配置。 */
export interface MapFeatureSnapBusinessLayerOptions {
  /** 是否启用业务图层吸附。 */
  enabled?: boolean;
  /** 业务图层吸附规则集合。 */
  rules: MapFeatureSnapRule[];
}

/** 内置吸附目标配置。 */
export interface MapFeatureSnapTargetOptions {
  /** 是否启用当前内置吸附目标。 */
  enabled?: boolean;
  /** 当前内置目标命中优先级。 */
  priority?: number;
  /** 当前内置目标局部吸附范围。 */
  tolerancePx?: number;
  /** 当前内置目标允许采用的吸附方式。 */
  snapTo?: MapFeatureSnapMode[];
}

/** 吸附右键面板插件目标标识。 */
export type MapFeatureSnapPanelTargetKey = 'intersection' | 'polygonEdge' | 'terradraw';

/** 吸附右键面板配置。 */
export interface MapFeatureSnapControlPanelOptions {
  /** 是否启用右键配置面板。 */
  enabled?: boolean;
  /** 是否展示业务图层吸附规则；默认 true。 */
  businessLayers?: boolean;
  /** 是否展示交点吸附目标开关；默认 true。 */
  intersection?: boolean;
  /** 是否展示面边线吸附目标开关；默认 true。 */
  polygonEdge?: boolean;
  /** 是否展示 TerraDraw 绘图/测量吸附目标开关；默认 true。 */
  terradraw?: boolean;
}

/** 吸附右键面板项类型。 */
export type MapFeatureSnapControlItemKind = 'rule' | 'target';

/** 吸附右键面板单项。 */
export interface MapFeatureSnapControlItem {
  /** 面板项唯一标识。 */
  id: string;
  /** 面板项类别。 */
  kind: MapFeatureSnapControlItemKind;
  /** 面板展示名称。 */
  label: string;
  /** 当前运行期是否启用。 */
  enabled: boolean;
}

/** 吸附右键面板分组。 */
export interface MapFeatureSnapControlGroup {
  /** 分组唯一标识。 */
  id: string;
  /** 分组展示名称。 */
  label: string;
  /** 分组中的面板项。 */
  items: MapFeatureSnapControlItem[];
}

/** 地图吸附插件配置。 */
export interface MapFeatureSnapOptions {
  /** 是否启用整个吸附插件。 */
  enabled?: boolean;
  /** 吸附运行期开关控件配置。 */
  control?: {
    /** 是否显示吸附开关控件。 */
    enabled?: boolean;
    /** 控件显示位置。 */
    position?: ControlPosition;
    /** 控件可访问文本。 */
    label?: string;
    /** 右键配置面板；默认关闭。 */
    panel?: boolean | MapFeatureSnapControlPanelOptions;
  };
  /** 全局默认吸附范围。 */
  defaultTolerancePx?: number;
  /** 吸附预览配置。 */
  preview?: MapFeatureSnapPreviewOptions;
  /** 根据当前吸附结果补充需要同步高亮的附属原要素。 */
  stateTargetResolver?: MapFeatureSnapStateTargetResolver;
  /** 按业务规则读取完整线要素的 resolver；交点索引不使用渲染裁剪坐标。 */
  intersectionFeatureResolver?: MapFeatureSnapFeatureResolver;
  /** 交点计算使用的端点虚拟延长长度，单位米；0 表示禁用虚拟延长。 */
  intersectionExtensionMeters?: number;
  /** 业务图层吸附配置。 */
  businessLayers?: MapFeatureSnapBusinessLayerOptions;
  /** 交点插件内置吸附目标配置。 */
  intersection?: boolean | MapFeatureSnapTargetOptions;
  /** 面边线插件内置吸附目标配置。 */
  polygonEdge?: boolean | MapFeatureSnapTargetOptions;
  /** TerraDraw / Measure 吸附公共默认配置。 */
  terradraw?: {
    /** TerraDraw / Measure 共用默认值。 */
    defaults?: TerradrawSnapSharedOptions;
    /** 绘图控件默认值。 */
    draw?: TerradrawSnapSharedOptions | boolean;
    /** 测量控件默认值。 */
    measure?: TerradrawSnapSharedOptions | boolean;
  };
  /**
   * 组件内部注入的运行期上下文。
   * 业务侧不需要传该字段，公开文档也不推荐业务直接使用。
   */
  internalContext?: {
    /** 当前 MapLibre 实例的 mapKey，仅供预览层读取正确地图实例。 */
    mapKey?: string | symbol;
    /** TerraDraw / Measure 控件当前是否启用。 */
    terradraw?: {
      /** 绘图控件是否启用。 */
      drawEnabled?: boolean;
      /** 测量控件是否启用。 */
      measureEnabled?: boolean;
    };
  };
}

/** 地图吸附插件 API。 */
export interface MapFeatureSnapPluginApi {
  /** 运行期开启吸附能力。 */
  activate: () => void;
  /** 运行期关闭吸附能力。 */
  deactivate: () => void;
  /** 运行期切换吸附能力。 */
  toggle: () => void;
  /** 设置插件吸附目标运行期开关。 */
  setTargetEnabled: (targetId: MapFeatureSnapPanelTargetKey, enabled: boolean) => void;
  /** 切换插件吸附目标运行期开关。 */
  toggleTarget: (targetId: MapFeatureSnapPanelTargetKey) => void;
  /** 读取当前运行期吸附是否开启。 */
  isActive: () => boolean;
  /** 主动清空当前吸附预览。 */
  clearPreview: () => void;
  /** 设置运行期规则查询作用域；null 恢复全局查询。 */
  setRuleScope: (ruleIds: string[] | null) => void;
  /** 根据普通地图事件解析吸附结果。 */
  resolveMapEvent: (event: MapMouseEvent) => MapFeatureSnapResult;
  /** 将同一帧地图事件合并，并把最新事件的吸附结果交给调用方。 */
  scheduleMapEvent?: (
    event: MapMouseEvent,
    onResolved: (result: MapFeatureSnapResult) => void
  ) => void;
  /** 读取控件最终吸附配置。 */
  resolveTerradrawSnapOptions: (
    controlType: TerradrawControlType,
    localConfig: TerradrawSnapSharedOptions | boolean | null | undefined
  ) => import('../types').ResolvedTerradrawSnapOptions;
}

/** 地图吸附插件状态。 */
export interface MapFeatureSnapState {
  /** 当前吸附能力是否运行期开启。 */
  isActive: boolean;
}
