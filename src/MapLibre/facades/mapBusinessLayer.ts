import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  FilterSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import {
  createCircleLayerStyle,
  createFillLayerStyle,
  createLineLayerStyle,
  createSymbolLayerStyle,
  type MapLayerStyle,
} from '../shared/map-layer-style-config';

/** 轻量图层 where 条件允许的值类型。 */
export type MapBusinessLayerWhereValue = string | number | boolean | null;

/** 轻量图层 where 等值条件集合。 */
export type MapBusinessLayerWhere = Record<string, MapBusinessLayerWhereValue>;

/** 轻量图层允许声明的几何类型。 */
export type MapBusinessLayerGeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon';

/**
 * 轻量业务图层描述对象公共基类。
 * @template TType 图层类型
 * @template Layout 对应图层的 layout 类型
 * @template Paint 对应图层的 paint 类型
 */
interface MapBusinessLayerBaseDescriptor<TType extends string, Layout, Paint> {
  /** 当前图层类型。 */
  type: TType;
  /** 当前图层唯一标识。 */
  layerId: string;
  /** 当前图层样式。 */
  style?: MapLayerStyle<Layout, Paint>;
  /** 当前图层允许渲染的几何类型。 */
  geometryTypes?: MapBusinessLayerGeometryType[];
  /** 当前图层的简单等值过滤条件。 */
  where?: MapBusinessLayerWhere;
  /** 当前图层的原始 MapLibre 过滤表达式。 */
  filter?: FilterSpecification;
  /** 当前图层是否参与交互。 */
  interactive?: boolean;
}

/** 轻量业务点图层描述对象。 */
export interface MapCircleBusinessLayerDescriptor
  extends MapBusinessLayerBaseDescriptor<
    'circle',
    CircleLayerSpecification['layout'],
    CircleLayerSpecification['paint']
  > {}

/** 轻量业务线图层描述对象。 */
export interface MapLineBusinessLayerDescriptor
  extends MapBusinessLayerBaseDescriptor<
    'line',
    LineLayerSpecification['layout'],
    LineLayerSpecification['paint']
  > {}

/** 轻量业务面图层描述对象。 */
export interface MapFillBusinessLayerDescriptor
  extends MapBusinessLayerBaseDescriptor<
    'fill',
    FillLayerSpecification['layout'],
    FillLayerSpecification['paint']
  > {}

/** 轻量业务符号图层描述对象。 */
export interface MapSymbolBusinessLayerDescriptor
  extends MapBusinessLayerBaseDescriptor<
    'symbol',
    SymbolLayerSpecification['layout'],
    SymbolLayerSpecification['paint']
  > {}

/** 轻量业务图层描述对象联合类型。 */
export type MapBusinessLayerDescriptor =
  | MapCircleBusinessLayerDescriptor
  | MapLineBusinessLayerDescriptor
  | MapFillBusinessLayerDescriptor
  | MapSymbolBusinessLayerDescriptor;

/** 轻量业务图层渲染样式联合类型。 */
export type ResolvedMapBusinessLayerStyle =
  | MapLayerStyle<CircleLayerSpecification['layout'], CircleLayerSpecification['paint']>
  | MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
  | MapLayerStyle<FillLayerSpecification['layout'], FillLayerSpecification['paint']>
  | MapLayerStyle<SymbolLayerSpecification['layout'], SymbolLayerSpecification['paint']>;

/**
 * 创建轻量业务点图层描述对象。
 * @param options 点图层配置
 * @returns 标准化后的点图层描述对象
 */
export function createCircleBusinessLayer(
  options: Omit<MapCircleBusinessLayerDescriptor, 'type'>
): MapCircleBusinessLayerDescriptor {
  return {
    type: 'circle',
    ...options,
  };
}

/**
 * 创建轻量业务线图层描述对象。
 * @param options 线图层配置
 * @returns 标准化后的线图层描述对象
 */
export function createLineBusinessLayer(
  options: Omit<MapLineBusinessLayerDescriptor, 'type'>
): MapLineBusinessLayerDescriptor {
  return {
    type: 'line',
    ...options,
  };
}

/**
 * 创建轻量业务面图层描述对象。
 * @param options 面图层配置
 * @returns 标准化后的面图层描述对象
 */
export function createFillBusinessLayer(
  options: Omit<MapFillBusinessLayerDescriptor, 'type'>
): MapFillBusinessLayerDescriptor {
  return {
    type: 'fill',
    ...options,
  };
}

/**
 * 创建轻量业务符号图层描述对象。
 * @param options 符号图层配置
 * @returns 标准化后的符号图层描述对象
 */
export function createSymbolBusinessLayer(
  options: Omit<MapSymbolBusinessLayerDescriptor, 'type'>
): MapSymbolBusinessLayerDescriptor {
  return {
    type: 'symbol',
    ...options,
  };
}

/**
 * 将多几何类型统一折叠为 MapLibre 图层可识别的基础类型。
 * @param geometryType 业务层声明的几何类型
 * @returns 折叠后的基础类型；无法识别时返回 null
 */
function normalizeGeometryType(
  geometryType: MapBusinessLayerGeometryType
): 'Point' | 'LineString' | 'Polygon' | null {
  switch (geometryType) {
    case 'Point':
    case 'MultiPoint':
      return 'Point';
    case 'LineString':
    case 'MultiLineString':
      return 'LineString';
    case 'Polygon':
    case 'MultiPolygon':
      return 'Polygon';
    default:
      return null;
  }
}

/**
 * 根据 geometryTypes 构建 MapLibre 过滤表达式。
 * @param geometryTypes 业务层声明的几何类型列表
 * @returns 对应的过滤表达式；为空时返回 undefined
 */
function buildGeometryTypesFilter(
  geometryTypes?: MapBusinessLayerGeometryType[]
): FilterSpecification | undefined {
  const normalizedTypes = Array.from(
    new Set(
      (geometryTypes || [])
        .map((geometryType) => normalizeGeometryType(geometryType))
        .filter(Boolean) as Array<'Point' | 'LineString' | 'Polygon'>
    )
  );

  if (!normalizedTypes.length) {
    return undefined;
  }

  if (normalizedTypes.length === 1) {
    return ['==', '$type', normalizedTypes[0]] as FilterSpecification;
  }

  return [
    'any',
    ...normalizedTypes.map((geometryType) => ['==', '$type', geometryType] as FilterSpecification),
  ] as FilterSpecification;
}

/**
 * 根据 where 等值条件构建 MapLibre 过滤表达式。
 * @param where 业务层声明的等值条件
 * @returns 对应的过滤表达式；为空时返回 undefined
 */
function buildWhereFilter(where?: MapBusinessLayerWhere): FilterSpecification | undefined {
  const whereEntries = Object.entries(where || {});
  if (!whereEntries.length) {
    return undefined;
  }

  const conditionList = whereEntries.map((entry) => {
    const [propertyKey, propertyValue] = entry;
    return ['==', propertyKey, propertyValue] as FilterSpecification;
  });

  if (conditionList.length === 1) {
    return conditionList[0];
  }

  return ['all', ...conditionList] as FilterSpecification;
}

/**
 * 统一构建轻量业务图层最终生效的过滤表达式。
 * 最终组合顺序固定为：geometryTypes -> where -> filter。
 * @param layer 当前图层描述对象
 * @returns 最终过滤表达式；未配置任何过滤条件时返回 undefined
 */
export function buildMapBusinessLayerFilter(
  layer: MapBusinessLayerDescriptor
): FilterSpecification | undefined {
  const filterList = [
    buildGeometryTypesFilter(layer.geometryTypes),
    buildWhereFilter(layer.where),
    layer.filter,
  ].filter(Boolean) as FilterSpecification[];

  if (!filterList.length) {
    return undefined;
  }

  if (filterList.length === 1) {
    return filterList[0];
  }

  return ['all', ...filterList] as FilterSpecification;
}

/**
 * 解析轻量业务图层最终生效的样式。
 * 若业务层未显式传入 style，则自动回退到对应图层的默认样式工厂。
 * @param layer 当前图层描述对象
 * @returns 最终可直接渲染的图层样式
 */
export function resolveMapBusinessLayerStyle(
  layer: MapBusinessLayerDescriptor
): ResolvedMapBusinessLayerStyle {
  switch (layer.type) {
    case 'circle':
      return layer.style || createCircleLayerStyle();
    case 'line':
      return layer.style || createLineLayerStyle();
    case 'fill':
      return layer.style || createFillLayerStyle();
    case 'symbol':
      return layer.style || createSymbolLayerStyle();
    default:
      return createCircleLayerStyle();
  }
}
