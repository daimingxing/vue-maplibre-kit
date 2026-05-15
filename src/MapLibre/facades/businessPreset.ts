import type { FilterSpecification } from "maplibre-gl";
import {
  createMapDxfExportPlugin,
  type MapDxfExportOptions,
  type MapDxfExportTaskOptions,
} from "../plugins/map-dxf-export";
import { createLineDraftPreviewPlugin } from "../plugins/line-draft-preview";
import { createMapFeatureMultiSelectPlugin } from "../plugins/map-feature-multi-select";
import {
  createMapFeatureSnapPlugin,
  type MapFeatureSnapBusinessLayerOptions,
  type MapFeatureSnapOptions,
  type MapFeatureSnapRule,
} from "../plugins/map-feature-snap";
import {
  createIntersectionPreviewPlugin,
  type IntersectionPreviewOptions,
} from "../plugins/intersection-preview";
import {
  createPolygonEdgePreviewPlugin,
  type PolygonEdgePreviewOptions,
} from "../plugins/polygon-edge-preview";
import type { MapPluginDescriptor } from "../plugins/types";
import {
  createCircleLayerStyle,
  createFillLayerStyle,
  createLineLayerStyle,
  type MapLayerStyle,
} from "../shared/map-layer-style-config";
import type { MapFeaturePropertyPolicy } from "../shared/map-feature-data";
import type { MapExpression } from "../shared/map-feature-property-expression";
import {
  createCircleBusinessLayer,
  createFillBusinessLayer,
  createLineBusinessLayer,
  createSymbolBusinessLayer,
  type MapBusinessLayerDescriptor,
  type MapBusinessLayerGeometryType,
  type MapBusinessLayerWhere,
} from "./mapBusinessLayer";
import type { MapBusinessSourceRegistry } from "./createMapBusinessSource";

/** 可写入 MapLibre 样式字段的业务值。 */
type MapStyleValue<T> = T | MapExpression;

/** 样式颜色值。 */
type MapStyleColor = MapStyleValue<string>;

/** 样式数值。 */
type MapStyleNumber = MapStyleValue<number>;

/** 简单线样式配置。 */
export interface SimpleLineStyleOptions {
  /** 线颜色。 */
  color?: MapStyleColor;
  /** 线宽，单位像素。 */
  width?: MapStyleNumber;
  /** 线透明度，范围 0 - 1。 */
  opacity?: MapStyleNumber;
}

/** 简单点样式配置。 */
export interface SimpleCircleStyleOptions {
  /** 点颜色。 */
  color?: MapStyleColor;
  /** 点半径，单位像素。 */
  radius?: MapStyleNumber;
  /** 点透明度，范围 0 - 1。 */
  opacity?: MapStyleNumber;
  /** 描边颜色。 */
  strokeColor?: MapStyleColor;
  /** 描边宽度，单位像素。 */
  strokeWidth?: MapStyleNumber;
}

/** 简单面样式配置。 */
export interface SimpleFillStyleOptions {
  /** 面颜色。 */
  color?: MapStyleColor;
  /** 面透明度，范围 0 - 1。 */
  opacity?: MapStyleNumber;
  /** 轮廓颜色。 */
  outlineColor?: MapStyleColor;
}

/** 图层组子项输入。 */
export interface LayerGroupItem {
  /** 图层类型。 */
  type: MapBusinessLayerDescriptor["type"];
  /** 简写图层 ID，会映射为 layerId。 */
  id: string;
  /** 当前图层样式。 */
  style?: MapBusinessLayerDescriptor["style"];
  /** 当前图层属性治理规则。 */
  policy?: MapFeaturePropertyPolicy;
  /** 当前图层允许渲染的几何类型。 */
  geometryTypes?: MapBusinessLayerGeometryType[];
  /** 当前图层的简单等值过滤条件；复杂 MapLibre 过滤表达式请使用 filter。 */
  where?: MapBusinessLayerWhere;
  /** 当前图层的原始 MapLibre 过滤表达式。 */
  filter?: FilterSpecification;
  /** 当前图层是否参与交互。 */
  interactive?: boolean;
}

/** 图层组创建配置。 */
export interface LayerGroupOptions {
  /** 当前图层组所属 source ID，会作为最终全局唯一 layerId 的前缀，格式为 `${sourceId}-${id}`。 */
  sourceId: string;
  /** 子图层默认属性治理规则。 */
  defaultPolicy?: MapFeaturePropertyPolicy;
  /** 子图层默认样式。 */
  defaultStyle?: MapBusinessLayerDescriptor["style"];
  /** 子图层声明列表。 */
  layers: LayerGroupItem[];
}

/** createBusinessPlugins({ snap.businessLayers }) 的单条简写值。 */
export type BusinessSnapLayerRuleValue =
  | string
  | string[]
  | (Omit<MapFeatureSnapRule, "id"> & {
      /** 参与当前规则候选查询的图层 ID 集合。 */
      layerIds: string[];
    });

/** createBusinessPlugins({ snap.businessLayers }) 的命名规则简写。 */
export type BusinessSnapLayerRules = Record<string, BusinessSnapLayerRuleValue>;

/** 吸附插件简写配置。 */
export interface BusinessSnapPresetOptions extends Omit<
  Partial<MapFeatureSnapOptions>,
  "businessLayers"
> {
  /** 旧版业务图层吸附简写；推荐改用 businessLayers 命名规则写法。 */
  layerIds?: string[];
  /**
   * 业务图层吸附配置。
   * 传 { enabled, rules } 时按完整写法原样使用；传 Record<规则名, 图层或规则> 时展开为 rules。
   */
  businessLayers?: MapFeatureSnapBusinessLayerOptions | BusinessSnapLayerRules;
  /** 简便 businessLayers 写法展开单条规则时使用的默认值。 */
  ruleDefaults?: Partial<Omit<MapFeatureSnapRule, "id" | "label" | "layerIds">>;
}

/** 交点插件业务预设配置。 */
export interface BusinessIntersectionPresetOptions extends Omit<
  IntersectionPreviewOptions,
  "targetSourceIds" | "sourceRegistry"
> {
  /** 参与求交的来源 source 列表；未传时可仅按 targetLayerIds 限定。 */
  targetSourceIds?: string[];
  /** 当前页面业务 source 注册表；未提供时默认使用 createBusinessPlugins 的顶层 sourceRegistry 配置。 */
  sourceRegistry?: MapBusinessSourceRegistry;
}

/** DXF 导出插件业务预设配置。 */
export interface BusinessDxfExportPresetOptions
  extends
    Omit<MapDxfExportOptions, "sourceRegistry" | "defaults">,
    MapDxfExportTaskOptions {
  /** 当前页面业务 source 注册表；未提供时默认使用 createBusinessPlugins 的顶层 sourceRegistry 配置。 */
  sourceRegistry?: MapBusinessSourceRegistry;
  /** DXF 导出任务默认值。 */
  defaults?: MapDxfExportTaskOptions;
}

/** 业务插件预设配置。 */
export interface BusinessPluginsOptions {
  /** 当前页面业务 source 注册表，供交点和 DXF 导出插件复用。 */
  sourceRegistry?: MapBusinessSourceRegistry;
  /** 吸附插件配置；传 true 时只启用基础能力和插件内部默认目标，业务图层吸附需传 layerIds 或 businessLayers。 */
  snap?: boolean | BusinessSnapPresetOptions;
  /** 线草稿插件配置；传 true 时启用默认配置。 */
  lineDraft?: boolean | Parameters<typeof createLineDraftPreviewPlugin>[0];
  /** 交点插件配置；必须传 targetSourceIds 或 targetLayerIds。 */
  intersection?: BusinessIntersectionPresetOptions;
  /** 面边线预览插件配置；传 true 时启用默认配置。 */
  polygonEdge?: boolean | PolygonEdgePreviewOptions;
  /** 多选插件配置；传 true 时启用默认配置。 */
  multiSelect?:
    | boolean
    | Parameters<typeof createMapFeatureMultiSelectPlugin>[0];
  /** DXF 导出插件配置；传 true 时使用顶层 sourceRegistry 和全局默认值。 */
  dxfExport?: boolean | BusinessDxfExportPresetOptions;
}

/**
 * 创建简单线图层样式。
 * @param options 简单线样式配置
 * @returns 现有线图层样式对象
 */
export function createSimpleLineStyle(options: SimpleLineStyleOptions = {}) {
  return createLineLayerStyle({
    paint: {
      ...(options.color ? { "line-color": options.color as any } : {}),
      ...(options.width !== undefined
        ? { "line-width": options.width as any }
        : {}),
      ...(options.opacity !== undefined
        ? { "line-opacity": options.opacity as any }
        : {}),
    },
  });
}

/**
 * 创建简单点图层样式。
 * @param options 简单点样式配置
 * @returns 现有点图层样式对象
 */
export function createSimpleCircleStyle(
  options: SimpleCircleStyleOptions = {},
) {
  return createCircleLayerStyle({
    paint: {
      ...(options.color ? { "circle-color": options.color as any } : {}),
      ...(options.radius !== undefined
        ? { "circle-radius": options.radius as any }
        : {}),
      ...(options.opacity !== undefined
        ? { "circle-opacity": options.opacity as any }
        : {}),
      ...(options.strokeColor
        ? { "circle-stroke-color": options.strokeColor as any }
        : {}),
      ...(options.strokeWidth !== undefined
        ? { "circle-stroke-width": options.strokeWidth as any }
        : {}),
    },
  });
}

/**
 * 创建简单面图层样式。
 * @param options 简单面样式配置
 * @returns 现有面图层样式对象
 */
export function createSimpleFillStyle(options: SimpleFillStyleOptions = {}) {
  return createFillLayerStyle({
    paint: {
      ...(options.color ? { "fill-color": options.color as any } : {}),
      ...(options.opacity !== undefined
        ? { "fill-opacity": options.opacity as any }
        : {}),
      ...(options.outlineColor
        ? { "fill-outline-color": options.outlineColor as any }
        : {}),
    },
  });
}

/**
 * 归一化图层组 source ID。
 * @param sourceId 原始 source ID
 * @returns 去除两侧空白后的 source ID
 */
function normalizeLayerGroupSourceId(sourceId: string): string {
  const nextSourceId = sourceId.trim();

  if (!nextSourceId) {
    throw new Error("[createLayerGroup] sourceId 不能为空");
  }

  return nextSourceId;
}

/**
 * 归一化图层组内的逻辑图层 ID。
 * @param layerId 原始逻辑图层 ID
 * @returns 去除两侧空白后的逻辑图层 ID
 */
function normalizeLayerGroupItemId(layerId: string): string {
  const nextLayerId = layerId.trim();

  if (!nextLayerId) {
    throw new Error("[createLayerGroup] layer id 不能为空");
  }

  return nextLayerId;
}

/**
 * 拼接最终 MapLibre 图层 ID。
 * @param sourceId 当前 source ID
 * @param itemId source 内逻辑图层 ID
 * @returns 全局唯一图层 ID
 */
function createLayerGroupLayerId(sourceId: string, itemId: string): string {
  return `${sourceId}-${itemId}`;
}

/**
 * 合并图层组中的默认配置与子图层配置。
 * @param options 图层组配置
 * @param item 子图层配置
 * @param sourceId 标准 source ID
 * @returns 标准业务图层描述对象公共字段
 */
function createLayerBase(
  options: LayerGroupOptions,
  item: LayerGroupItem,
  sourceId: string,
) {
  const itemId = normalizeLayerGroupItemId(item.id);

  return {
    layerId: createLayerGroupLayerId(sourceId, itemId),
    propertyPolicy: item.policy || options.defaultPolicy,
    style: item.style || options.defaultStyle,
    geometryTypes: item.geometryTypes,
    where: item.where,
    filter: item.filter,
    interactive: item.interactive,
  };
}

/**
 * 判断业务图层吸附配置是否为底层完整写法。
 * @param businessLayers 业务图层吸附配置
 * @returns 是否为完整 businessLayers 配置
 */
function isFullSnapBusinessLayersConfig(
  businessLayers: BusinessSnapPresetOptions["businessLayers"],
): businessLayers is MapFeatureSnapBusinessLayerOptions {
  return Boolean(
    businessLayers &&
    typeof businessLayers === "object" &&
    !Array.isArray(businessLayers) &&
    Array.isArray((businessLayers as MapFeatureSnapBusinessLayerOptions).rules),
  );
}

/**
 * 归一化业务吸附简写中的图层 ID。
 * @param layerIds 单个或多个图层 ID
 * @returns 图层 ID 数组
 */
function normalizeBusinessSnapLayerIds(layerIds: string | string[]): string[] {
  return Array.isArray(layerIds) ? layerIds : [layerIds];
}

/**
 * 展开命名业务吸附规则简写。
 * @param id 规则 ID
 * @param value 单条规则简写值
 * @param ruleDefaults 规则默认值
 * @returns 标准吸附规则
 */
function resolveBusinessSnapRuleValue(
  id: string,
  value: BusinessSnapLayerRuleValue,
  ruleDefaults: BusinessSnapPresetOptions["ruleDefaults"],
): MapFeatureSnapRule {
  if (typeof value === "string" || Array.isArray(value)) {
    return {
      id,
      label: id,
      ...(ruleDefaults || {}),
      layerIds: normalizeBusinessSnapLayerIds(value),
    };
  }

  return {
    id,
    label: value.label ?? id,
    ...(ruleDefaults || {}),
    ...value,
    layerIds: value.layerIds,
  };
}

/**
 * 解析业务图层吸附配置。
 * @param businessLayers 命名规则简写或完整规则配置
 * @param layerIds 旧版图层 ID 简写
 * @param ruleDefaults 规则默认值
 * @returns 标准业务图层吸附配置
 */
function resolveBusinessSnapLayers(
  businessLayers: BusinessSnapPresetOptions["businessLayers"],
  layerIds: BusinessSnapPresetOptions["layerIds"],
  ruleDefaults: BusinessSnapPresetOptions["ruleDefaults"],
): MapFeatureSnapBusinessLayerOptions | undefined {
  if (!businessLayers) {
    if (!layerIds?.length) {
      return undefined;
    }

    return {
      enabled: true,
      rules: [
        {
          id: "business-layer-snap",
          label: "业务图层",
          ...(ruleDefaults || {}),
          layerIds,
        },
      ],
    };
  }

  if (isFullSnapBusinessLayersConfig(businessLayers)) {
    return businessLayers;
  }

  return {
    enabled: true,
    rules: Object.entries(businessLayers).map(([id, value]) =>
      resolveBusinessSnapRuleValue(id, value, ruleDefaults),
    ),
  };
}

/**
 * 创建业务图层组。
 * @param options 图层组配置
 * @returns 标准业务图层描述数组
 */
export function createLayerGroup(
  options: LayerGroupOptions,
): MapBusinessLayerDescriptor[] {
  const sourceId = normalizeLayerGroupSourceId(options.sourceId);

  return options.layers.map((item) => {
    const base = createLayerBase(options, item, sourceId);

    switch (item.type) {
      case "line":
        return createLineBusinessLayer(
          base as Parameters<typeof createLineBusinessLayer>[0],
        );
      case "fill":
        return createFillBusinessLayer(
          base as Parameters<typeof createFillBusinessLayer>[0],
        );
      case "symbol":
        return createSymbolBusinessLayer(
          base as Parameters<typeof createSymbolBusinessLayer>[0],
        );
      case "circle":
      default:
        return createCircleBusinessLayer(
          base as Parameters<typeof createCircleBusinessLayer>[0],
        );
    }
  });
}

/**
 * 解析吸附插件预设配置。
 * @param options 吸附插件预设配置
 * @returns 标准吸附插件配置
 */
function resolveSnapOptions(
  options: true | BusinessSnapPresetOptions,
): MapFeatureSnapOptions {
  if (options === true) {
    return {
      enabled: true,
    };
  }

  const {
    ruleDefaults,
    businessLayers: rawBusinessLayers,
    layerIds,
    ...restOptions
  } = options;
  const businessLayers = resolveBusinessSnapLayers(
    rawBusinessLayers,
    layerIds,
    ruleDefaults,
  );

  return {
    enabled: true,
    ...restOptions,
    businessLayers,
  };
}

/**
 * 解析交点插件预设配置。
 * @param context 当前业务插件预设总配置
 * @param options 交点插件局部配置
 * @returns 标准交点插件配置
 */
function resolveIntersectionOptions(
  context: BusinessPluginsOptions,
  options: BusinessIntersectionPresetOptions,
): IntersectionPreviewOptions {
  const hasTargetScope = Boolean(
    options.targetSourceIds?.length || options.targetLayerIds?.length,
  );
  const hasCustomCandidates = typeof options.getCandidates === "function";
  const sourceRegistry = options.sourceRegistry || context.sourceRegistry;

  if (!hasTargetScope && !hasCustomCandidates) {
    throw new Error(
      "createBusinessPlugins({ intersection }) 自动模式需要 targetSourceIds 或 targetLayerIds",
    );
  }

  if (!hasCustomCandidates && !sourceRegistry) {
    throw new Error(
      "createBusinessPlugins({ intersection }) 自动模式需要 sourceRegistry；高级模式请改用 getCandidates",
    );
  }

  return {
    ...options,
    targetSourceIds: options.targetSourceIds || [],
    sourceRegistry,
  };
}

/**
 * 解析 DXF 导出插件预设配置。
 * @param context 当前业务插件预设总配置
 * @param options DXF 导出插件局部配置
 * @returns 标准 DXF 导出插件配置
 */
function resolveDxfOptions(
  context: BusinessPluginsOptions,
  options: true | BusinessDxfExportPresetOptions,
): MapDxfExportOptions {
  const sourceRegistry =
    options === true
      ? context.sourceRegistry
      : options.sourceRegistry || context.sourceRegistry;
  if (!sourceRegistry) {
    throw new Error("createBusinessPlugins({ dxfExport }) 需要 sourceRegistry");
  }

  if (options === true) {
    return {
      enabled: true,
      sourceRegistry,
    };
  }

  const {
    control,
    defaults,
    enabled,
    sourceRegistry: localRegistry,
    ...flatDefaults
  } = options;
  void localRegistry;

  return {
    enabled: enabled !== false,
    sourceRegistry,
    control,
    defaults: {
      ...(defaults || {}),
      ...flatDefaults,
    },
  };
}

/**
 * 创建常用业务插件预设。
 * @param options 插件预设配置
 * @returns 标准插件描述对象数组
 */
export function createBusinessPlugins(
  options: BusinessPluginsOptions,
): MapPluginDescriptor[] {
  const plugins: MapPluginDescriptor[] = [];

  if (options.snap) {
    plugins.push(createMapFeatureSnapPlugin(resolveSnapOptions(options.snap)));
  }

  if (options.lineDraft) {
    plugins.push(
      createLineDraftPreviewPlugin(
        options.lineDraft === true ? { enabled: true } : options.lineDraft,
      ),
    );
  }

  if (options.intersection) {
    plugins.push(
      createIntersectionPreviewPlugin(
        resolveIntersectionOptions(options, options.intersection),
      ),
    );
  }

  if (options.polygonEdge) {
    plugins.push(
      createPolygonEdgePreviewPlugin(
        options.polygonEdge === true ? { enabled: true } : options.polygonEdge,
      ),
    );
  }

  if (options.multiSelect) {
    plugins.push(
      createMapFeatureMultiSelectPlugin(
        options.multiSelect === true ? { enabled: true } : options.multiSelect,
      ),
    );
  }

  if (options.dxfExport) {
    plugins.push(
      createMapDxfExportPlugin(resolveDxfOptions(options, options.dxfExport)),
    );
  }

  return plugins;
}

export type { MapLayerStyle };
