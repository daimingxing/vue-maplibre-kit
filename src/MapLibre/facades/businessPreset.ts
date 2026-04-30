import type { FilterSpecification } from 'maplibre-gl';
import {
  createMapDxfExportPlugin,
  type MapDxfExportOptions,
  type MapDxfExportTaskOptions,
} from '../plugins/map-dxf-export';
import { createLineDraftPreviewPlugin } from '../plugins/line-draft-preview';
import { createMapFeatureMultiSelectPlugin } from '../plugins/map-feature-multi-select';
import { createMapFeatureSnapPlugin, type MapFeatureSnapOptions } from '../plugins/map-feature-snap';
import {
  createIntersectionPreviewPlugin,
  type IntersectionPreviewOptions,
} from '../plugins/intersection-preview';
import {
  createPolygonEdgePreviewPlugin,
  type PolygonEdgePreviewOptions,
} from '../plugins/polygon-edge-preview';
import type { MapPluginDescriptor } from '../plugins/types';
import {
  createCircleLayerStyle,
  createFillLayerStyle,
  createLineLayerStyle,
  type MapLayerStyle,
} from '../shared/map-layer-style-config';
import type { MapFeaturePropertyPolicy } from '../shared/map-feature-data';
import {
  createCircleBusinessLayer,
  createFillBusinessLayer,
  createLineBusinessLayer,
  createSymbolBusinessLayer,
  type MapBusinessLayerDescriptor,
  type MapBusinessLayerGeometryType,
  type MapBusinessLayerWhere,
} from './mapBusinessLayer';
import type { MapBusinessSourceRegistry } from './createMapBusinessSource';

/** 简单线样式配置。 */
export interface SimpleLineStyleOptions {
  /** 线颜色。 */
  color?: string;
  /** 线宽，单位像素。 */
  width?: number;
  /** 线透明度，范围 0 - 1。 */
  opacity?: number;
}

/** 简单点样式配置。 */
export interface SimpleCircleStyleOptions {
  /** 点颜色。 */
  color?: string;
  /** 点半径，单位像素。 */
  radius?: number;
  /** 点透明度，范围 0 - 1。 */
  opacity?: number;
  /** 描边颜色。 */
  strokeColor?: string;
  /** 描边宽度，单位像素。 */
  strokeWidth?: number;
}

/** 简单面样式配置。 */
export interface SimpleFillStyleOptions {
  /** 面颜色。 */
  color?: string;
  /** 面透明度，范围 0 - 1。 */
  opacity?: number;
  /** 轮廓颜色。 */
  outlineColor?: string;
}

/** 图层组子项输入。 */
export interface LayerGroupItem {
  /** 图层类型。 */
  type: MapBusinessLayerDescriptor['type'];
  /** 简写图层 ID，会映射为 layerId。 */
  id: string;
  /** 当前图层样式。 */
  style?: MapBusinessLayerDescriptor['style'];
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
  /** 子图层默认属性治理规则。 */
  defaultPolicy?: MapFeaturePropertyPolicy;
  /** 子图层默认样式。 */
  defaultStyle?: MapBusinessLayerDescriptor['style'];
  /** 子图层声明列表。 */
  layers: LayerGroupItem[];
}

/** 吸附插件简写配置。 */
export interface BusinessSnapPresetOptions extends Partial<MapFeatureSnapOptions> {
  /** 参与业务图层吸附的图层 ID；未显式传 businessLayers 时，会用它生成一条默认吸附规则。 */
  layerIds?: string[];
}

/** 交点插件业务预设配置。 */
export interface BusinessIntersectionPresetOptions
  extends Omit<IntersectionPreviewOptions, 'targetSourceIds' | 'sourceRegistry'> {
  /** 参与求交的来源 source 列表；未传时可仅按 targetLayerIds 限定。 */
  targetSourceIds?: string[];
  /** 当前页面业务 source 注册表；未提供时默认使用 createBusinessPlugins 的顶层 sourceRegistry 配置。 */
  sourceRegistry?: MapBusinessSourceRegistry;
}

/** DXF 导出插件业务预设配置。 */
export interface BusinessDxfExportPresetOptions
  extends Omit<MapDxfExportOptions, 'sourceRegistry' | 'defaults'>,
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
  multiSelect?: boolean | Parameters<typeof createMapFeatureMultiSelectPlugin>[0];
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
      ...(options.color ? { 'line-color': options.color } : {}),
      ...(options.width !== undefined ? { 'line-width': options.width } : {}),
      ...(options.opacity !== undefined ? { 'line-opacity': options.opacity } : {}),
    },
  });
}

/**
 * 创建简单点图层样式。
 * @param options 简单点样式配置
 * @returns 现有点图层样式对象
 */
export function createSimpleCircleStyle(options: SimpleCircleStyleOptions = {}) {
  return createCircleLayerStyle({
    paint: {
      ...(options.color ? { 'circle-color': options.color } : {}),
      ...(options.radius !== undefined ? { 'circle-radius': options.radius } : {}),
      ...(options.opacity !== undefined ? { 'circle-opacity': options.opacity } : {}),
      ...(options.strokeColor ? { 'circle-stroke-color': options.strokeColor } : {}),
      ...(options.strokeWidth !== undefined
        ? { 'circle-stroke-width': options.strokeWidth }
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
      ...(options.color ? { 'fill-color': options.color } : {}),
      ...(options.opacity !== undefined ? { 'fill-opacity': options.opacity } : {}),
      ...(options.outlineColor ? { 'fill-outline-color': options.outlineColor } : {}),
    },
  });
}

/**
 * 合并图层组中的默认配置与子图层配置。
 * @param options 图层组配置
 * @param item 子图层配置
 * @returns 标准业务图层描述对象公共字段
 */
function createLayerBase(options: LayerGroupOptions, item: LayerGroupItem) {
  return {
    layerId: item.id,
    propertyPolicy: item.policy || options.defaultPolicy,
    style: item.style || options.defaultStyle,
    geometryTypes: item.geometryTypes,
    where: item.where,
    filter: item.filter,
    interactive: item.interactive,
  };
}

/**
 * 创建业务图层组。
 * @param options 图层组配置
 * @returns 标准业务图层描述数组
 */
export function createLayerGroup(options: LayerGroupOptions): MapBusinessLayerDescriptor[] {
  return options.layers.map((item) => {
    const base = createLayerBase(options, item);

    switch (item.type) {
      case 'line':
        return createLineBusinessLayer(base as Parameters<typeof createLineBusinessLayer>[0]);
      case 'fill':
        return createFillBusinessLayer(base as Parameters<typeof createFillBusinessLayer>[0]);
      case 'symbol':
        return createSymbolBusinessLayer(base as Parameters<typeof createSymbolBusinessLayer>[0]);
      case 'circle':
      default:
        return createCircleBusinessLayer(base as Parameters<typeof createCircleBusinessLayer>[0]);
    }
  });
}

/**
 * 解析吸附插件预设配置。
 * @param options 吸附插件预设配置
 * @returns 标准吸附插件配置
 */
function resolveSnapOptions(options: true | BusinessSnapPresetOptions): MapFeatureSnapOptions {
  if (options === true) {
    return {
      enabled: true,
    };
  }

  const { layerIds, ...restOptions } = options;
  const businessLayers = options.businessLayers ||
    (layerIds
      ? {
          enabled: true,
          rules: [
            {
              layerIds,
            },
          ],
        }
      : undefined);

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
  options: BusinessIntersectionPresetOptions
): IntersectionPreviewOptions {
  const hasTargetScope = Boolean(options.targetSourceIds?.length || options.targetLayerIds?.length);
  const hasCustomCandidates = typeof options.getCandidates === 'function';
  const sourceRegistry = options.sourceRegistry || context.sourceRegistry;

  if (!hasTargetScope && !hasCustomCandidates) {
    throw new Error(
      'createBusinessPlugins({ intersection }) 自动模式需要 targetSourceIds 或 targetLayerIds'
    );
  }

  if (!hasCustomCandidates && !sourceRegistry) {
    throw new Error(
      'createBusinessPlugins({ intersection }) 自动模式需要 sourceRegistry；高级模式请改用 getCandidates'
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
  options: true | BusinessDxfExportPresetOptions
): MapDxfExportOptions {
  const sourceRegistry =
    options === true ? context.sourceRegistry : options.sourceRegistry || context.sourceRegistry;
  if (!sourceRegistry) {
    throw new Error('createBusinessPlugins({ dxfExport }) 需要 sourceRegistry');
  }

  if (options === true) {
    return {
      enabled: true,
      sourceRegistry,
    };
  }

  const { control, defaults, enabled, sourceRegistry: localRegistry, ...flatDefaults } = options;
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
export function createBusinessPlugins(options: BusinessPluginsOptions): MapPluginDescriptor[] {
  const plugins: MapPluginDescriptor[] = [];

  if (options.snap) {
    plugins.push(createMapFeatureSnapPlugin(resolveSnapOptions(options.snap)));
  }

  if (options.lineDraft) {
    plugins.push(
      createLineDraftPreviewPlugin(options.lineDraft === true ? { enabled: true } : options.lineDraft)
    );
  }

  if (options.intersection) {
    plugins.push(createIntersectionPreviewPlugin(resolveIntersectionOptions(options, options.intersection)));
  }

  if (options.polygonEdge) {
    plugins.push(
      createPolygonEdgePreviewPlugin(
        options.polygonEdge === true ? { enabled: true } : options.polygonEdge
      )
    );
  }

  if (options.multiSelect) {
    plugins.push(
      createMapFeatureMultiSelectPlugin(
        options.multiSelect === true ? { enabled: true } : options.multiSelect
      )
    );
  }

  if (options.dxfExport) {
    plugins.push(createMapDxfExportPlugin(resolveDxfOptions(options, options.dxfExport)));
  }

  return plugins;
}

export type { MapLayerStyle };
