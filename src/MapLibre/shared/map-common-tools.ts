import type { Feature, FeatureCollection, Geometry, LineString, Polygon, Position } from 'geojson';
import { point as turfPoint } from '@turf/helpers';
import { distance as turfDistance } from '@turf/distance';
import { destination as turfDestination } from '@turf/destination';
import type { MapFeatureId } from '../composables/useMapDataUpdate';
import {
  addMercatorPoint,
  getInfiniteLineIntersection,
  getLeftNormalVector,
  getMercatorVectorLength,
  lngLatToMercatorPoint,
  mercatorPointToLngLat,
  projectPointToSegment,
  scaleMercatorPoint,
  subtractMercatorPoint,
  type MercatorPoint,
  toDegrees,
  toRadians,
} from './map-mercator-tools';

/** 通用 GeoJSON 属性对象 */
export type MapCommonProperties = Record<string, any>;

/** 通用 GeoJSON FeatureCollection 类型 */
export type MapCommonFeatureCollection = FeatureCollection<Geometry, MapCommonProperties>;

/** 通用 GeoJSON Feature 类型 */
export type MapCommonFeature = Feature<Geometry, MapCommonProperties>;

/** 通用线要素类型 */
export type MapCommonLineFeature = Feature<LineString, MapCommonProperties>;

/** 通用面要素类型 */
export type MapCommonPolygonFeature = Feature<Polygon, MapCommonProperties>;

/** 正式业务要素来源引用 */
export interface MapSourceFeatureRef {
  /** 正式业务 source 的唯一标识 */
  sourceId: string | null;
  /** 正式业务 source 内的要素 ID */
  featureId: MapFeatureId | null;
  /** 当前命中的业务图层 ID。 */
  layerId?: string | null;
}

/** 托管临时预览来源 sourceId 属性名 */
export const MANAGED_PREVIEW_ORIGIN_SOURCE_ID_PROPERTY = 'managedPreviewOriginSourceId';

/** 托管临时预览来源 featureId 属性名 */
export const MANAGED_PREVIEW_ORIGIN_FEATURE_ID_PROPERTY = 'managedPreviewOriginFeatureId';

/** 托管临时预览来源 layerId 属性名 */
export const MANAGED_PREVIEW_ORIGIN_LAYER_ID_PROPERTY = 'managedPreviewOriginLayerId';

/** 托管临时预览来源唯一键属性名 */
export const MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY = 'managedPreviewOriginKey';

/** 插件生成要素分组 ID 属性名。 */
export const GENERATED_GROUP_ID_PROPERTY = 'generatedGroupId';

/** 插件生成要素来源 sourceId 属性名。 */
export const GENERATED_PARENT_SOURCE_ID_PROPERTY = 'generatedParentSourceId';

/** 插件生成要素来源 featureId 属性名。 */
export const GENERATED_PARENT_FEATURE_ID_PROPERTY = 'generatedParentFeatureId';

/** 插件生成要素来源 layerId 属性名。 */
export const GENERATED_PARENT_LAYER_ID_PROPERTY = 'generatedParentLayerId';

/** 插件生成要素属性构建配置。 */
export interface BuildGeneratedFeaturePropertiesOptions {
  /** 生成要素类型标识。 */
  generatedKind: string;
  /** 同一组生成要素的稳定分组 ID。 */
  groupId?: string | null;
  /** 来源正式业务要素引用。 */
  parentRef?: MapSourceFeatureRef | null;
}

/** 线段命中结果 */
export interface MapLineSegmentSelection {
  /** 命中的线段索引 */
  index: number;
  /** 命中线段的长度（米） */
  lengthMeters: number;
}

/** 线交互解析结果 */
export interface MapLineInteractionSnapshot {
  /** 当前用于业务计算的线要素快照 */
  lineFeature: MapCommonLineFeature;
  /** 当前点击位置对应的线段命中结果 */
  segmentSelection: MapLineSegmentSelection | null;
}

/** 线交互解析入参 */
export interface MapLineInteractionResolveOptions {
  /** 当前点击命中的线要素 */
  feature: MapCommonFeature | null | undefined;
  /** 当前点击命中的要素来源引用 */
  featureRef?: MapSourceFeatureRef | null;
  /** 当前点击位置 */
  lngLat: { lng: number; lat: number };
  /** 业务层提供的最新要素解析函数 */
  resolveLatestFeature?: (
    featureRef: MapSourceFeatureRef | null
  ) => MapCommonFeature | null | undefined;
}

/** 线内定位结果 */
export interface MapLineLocatedPoint {
  /** 当前点命中的线段索引 */
  segmentIndex: number;
  /** 当前点在线段内的归一化比例，0 表示起点，1 表示终点 */
  ratio: number;
  /** 当前点吸附到线上的坐标 */
  snappedCoordinate: Position;
  /** 当前点从整条线起点累计到当前位置的长度（米） */
  distanceFromStartMeters: number;
  /** 原始输入点到线上投影点的距离（米） */
  distanceToLineMeters: number;
}

/** 线内区间测量结果 */
export interface MapLinePartialMeasureResult {
  /** 起点在线上的定位结果 */
  start: MapLineLocatedPoint;
  /** 终点在线上的定位结果 */
  end: MapLineLocatedPoint;
  /** 两点沿线之间的路径长度（米） */
  lengthMeters: number;
}

/** 线廊生成的附加配置 */
export interface MapLineCorridorOptions {
  /** 生成区域的类型标识 */
  generatedKind?: string;
  /** 生成区域的业务类型名称 */
  regionType?: string;
  /** 生成区域的业务 ID */
  regionId?: string;
}

/**
 * 通用线测量工具类。
 * 负责计算整条线长度，以及线内任意两点之间的沿线长度。
 */
export class MapLineMeasureTool {
  /**
   * 计算两个坐标点之间的球面距离（米）。
   * @param start 起点坐标
   * @param end 终点坐标
   * @returns 两点之间的距离
   */
  static getDistanceInMeters(start: Position, end: Position): number {
    return turfDistance(turfPoint(start), turfPoint(end), { units: 'meters' });
  }

  /**
   * 计算线要素总长度（米）。
   * @param feature 目标线要素
   * @returns 线要素总长度；非线要素时返回 null
   */
  static getFeatureLengthInMeters(
    feature: MapCommonFeature | MapCommonLineFeature | null | undefined
  ): number | null {
    if (feature?.geometry?.type !== 'LineString') {
      return null;
    }

    return MapLineExtensionTool.getLineLengthInMeters(feature.geometry.coordinates);
  }

  /**
   * 计算折线总长度（米）。
   * @param coordinates 折线坐标数组
   * @returns 折线总长度
   */
  static getCoordinatesLengthInMeters(coordinates: Position[]): number {
    return MapLineExtensionTool.getLineLengthInMeters(coordinates);
  }

  /**
   * 计算线要素内两个坐标点之间的沿线长度（米）。
   * 坐标点不必正好落在线顶点上，方法会自动投影到最近线段再计算。
   * @param feature 目标线要素
   * @param start 起点坐标
   * @param end 终点坐标
   * @returns 线内区间测量结果；非线要素或无法测量时返回 null
   */
  static measureFeatureBetweenCoordinates(
    feature: MapCommonFeature | MapCommonLineFeature | null | undefined,
    start: Position,
    end: Position
  ): MapLinePartialMeasureResult | null {
    if (feature?.geometry?.type !== 'LineString') {
      return null;
    }

    return MapLineMeasureTool.measureBetweenCoordinates(feature.geometry.coordinates, start, end);
  }

  /**
   * 计算折线内两个坐标点之间的沿线长度（米）。
   * 坐标点不必正好落在线顶点上，方法会自动投影到最近线段再计算。
   * @param coordinates 折线坐标数组
   * @param start 起点坐标
   * @param end 终点坐标
   * @returns 线内区间测量结果；无法测量时返回 null
   */
  static measureBetweenCoordinates(
    coordinates: Position[],
    start: Position,
    end: Position
  ): MapLinePartialMeasureResult | null {
    const normalizedCoordinates = MapLineExtensionTool.normalizeLineCoordinates(coordinates);
    if (normalizedCoordinates.length < 2) {
      return null;
    }

    const cumulativeDistances =
      MapLineMeasureTool.buildCumulativeDistanceFromStart(normalizedCoordinates);
    const startLocation = MapLineMeasureTool.locatePointOnLine(
      normalizedCoordinates,
      cumulativeDistances,
      start
    );
    const endLocation = MapLineMeasureTool.locatePointOnLine(
      normalizedCoordinates,
      cumulativeDistances,
      end
    );

    if (!startLocation || !endLocation) {
      return null;
    }

    return {
      start: startLocation,
      end: endLocation,
      lengthMeters: Math.abs(
        endLocation.distanceFromStartMeters - startLocation.distanceFromStartMeters
      ),
    };
  }

  /**
   * 将输入坐标定位到折线上，并返回它在线内的累计里程信息。
   * @param coordinates 折线坐标数组
   * @param cumulativeDistances 每个顶点的累计里程数组
   * @param target 待定位的目标坐标
   * @returns 在线内的定位结果；无法定位时返回 null
   */
  private static locatePointOnLine(
    coordinates: Position[],
    cumulativeDistances: number[],
    target: Position
  ): MapLineLocatedPoint | null {
    const targetMercatorPoint = lngLatToMercatorPoint(target);
    let bestLocation: MapLineLocatedPoint | null = null;

    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const segmentStart = coordinates[index];
      const segmentEnd = coordinates[index + 1];
      const segmentStartMercator = lngLatToMercatorPoint(segmentStart);
      const segmentEndMercator = lngLatToMercatorPoint(segmentEnd);
      const projectedPoint = projectPointToSegment(
        targetMercatorPoint,
        segmentStartMercator,
        segmentEndMercator
      );
      const snappedCoordinate = mercatorPointToLngLat(projectedPoint.point);
      const distanceToLineMeters = MapLineExtensionTool.getDistanceInMeters(
        target,
        snappedCoordinate
      );
      const segmentLengthMeters = MapLineExtensionTool.getDistanceInMeters(
        segmentStart,
        segmentEnd
      );
      const currentLocation: MapLineLocatedPoint = {
        segmentIndex: index,
        ratio: projectedPoint.ratio,
        snappedCoordinate,
        distanceFromStartMeters:
          cumulativeDistances[index] + segmentLengthMeters * projectedPoint.ratio,
        distanceToLineMeters,
      };

      if (
        !bestLocation ||
        currentLocation.distanceToLineMeters < bestLocation.distanceToLineMeters
      ) {
        bestLocation = currentLocation;
      }
    }

    return bestLocation;
  }

  /**
   * 构建每个顶点相对整条折线起点的累计距离数组。
   * @param coordinates 折线坐标数组
   * @returns 每个顶点对应的累计距离
   */
  private static buildCumulativeDistanceFromStart(coordinates: Position[]): number[] {
    const cumulativeDistances = [0];

    for (let index = 1; index < coordinates.length; index += 1) {
      cumulativeDistances[index] =
        cumulativeDistances[index - 1] +
        MapLineExtensionTool.getDistanceInMeters(coordinates[index - 1], coordinates[index]);
    }

    return cumulativeDistances;
  }
}

/**
 * 创建标准化的正式业务要素来源引用。
 * @param sourceId 正式业务 source 标识
 * @param featureId 正式业务要素 ID
 * @param layerId 当前命中的业务图层 ID
 * @returns 标准化后的来源引用；信息不完整时返回 null
 */
export function createMapSourceFeatureRef(
  sourceId: string | null | undefined,
  featureId: MapFeatureId | null | undefined,
  layerId?: string | null | undefined
): MapSourceFeatureRef | null {
  if (!sourceId || featureId === null || featureId === undefined) {
    return null;
  }

  return {
    sourceId,
    featureId,
    layerId: layerId || null,
  };
}

/**
 * 构建正式业务要素来源唯一键。
 * @param featureRef 正式业务要素来源引用
 * @returns 标准化后的来源唯一键；信息不完整时返回 null
 */
export function buildMapSourceFeatureRefKey(
  featureRef: MapSourceFeatureRef | null | undefined
): string | null {
  if (
    !featureRef?.sourceId ||
    featureRef.featureId === null ||
    featureRef.featureId === undefined
  ) {
    return null;
  }

  return `${featureRef.sourceId}::${String(featureRef.featureId)}`;
}

/**
 * 从属性对象中提取托管临时预览来源引用。
 * @param properties 待解析的属性对象
 * @returns 命中的正式来源引用；不存在或不完整时返回 null
 */
export function extractManagedPreviewOriginFromProperties(
  properties: MapCommonProperties | null | undefined
): MapSourceFeatureRef | null {
  return createMapSourceFeatureRef(
    (properties?.[MANAGED_PREVIEW_ORIGIN_SOURCE_ID_PROPERTY] as string | null | undefined) || null,
    (properties?.[MANAGED_PREVIEW_ORIGIN_FEATURE_ID_PROPERTY] as MapFeatureId | null | undefined) ??
      null,
    (properties?.[MANAGED_PREVIEW_ORIGIN_LAYER_ID_PROPERTY] as string | null | undefined) || null
  );
}

/**
 * 根据正式业务要素来源引用生成托管临时预览来源属性。
 * @param featureRef 正式业务要素来源引用
 * @returns 可直接写入预览要素 properties 的来源属性对象
 */
export function buildManagedPreviewOriginProperties(
  featureRef: MapSourceFeatureRef | null | undefined
): MapCommonProperties {
  const originKey = buildMapSourceFeatureRefKey(featureRef);
  if (!originKey || !featureRef) {
    return {};
  }

  return {
    [MANAGED_PREVIEW_ORIGIN_SOURCE_ID_PROPERTY]: featureRef.sourceId,
    [MANAGED_PREVIEW_ORIGIN_FEATURE_ID_PROPERTY]: featureRef.featureId,
    ...(featureRef.layerId
      ? {
          // 图层级治理规则需要依赖原始 layerId，这里一并落到草稿属性里。
          [MANAGED_PREVIEW_ORIGIN_LAYER_ID_PROPERTY]: featureRef.layerId,
        }
      : {}),
    [MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY]: originKey,
  };
}

/**
 * 构建插件生成要素的统一元数据属性。
 * 当前仍同步写入旧托管预览来源字段，保证线草稿、属性治理和查询门面在迁移期不丢失来源。
 *
 * @param options 插件生成要素属性构建配置
 * @returns 可写入 GeoJSON properties 的元数据对象
 */
export function buildGeneratedFeatureProperties(
  options: BuildGeneratedFeaturePropertiesOptions
): MapCommonProperties {
  const { generatedKind, groupId = null, parentRef = null } = options;

  return {
    generatedKind,
    ...(groupId ? { [GENERATED_GROUP_ID_PROPERTY]: groupId } : {}),
    ...(parentRef?.sourceId ? { [GENERATED_PARENT_SOURCE_ID_PROPERTY]: parentRef.sourceId } : {}),
    ...(parentRef?.featureId !== null && parentRef?.featureId !== undefined
      ? { [GENERATED_PARENT_FEATURE_ID_PROPERTY]: parentRef.featureId }
      : {}),
    ...(parentRef?.layerId ? { [GENERATED_PARENT_LAYER_ID_PROPERTY]: parentRef.layerId } : {}),
    ...buildManagedPreviewOriginProperties(parentRef),
  };
}

/**
 * 构建插件生成要素的稳定分组 ID。
 * @param generatedKind 生成要素类型标识
 * @param parentRef 来源正式业务要素引用
 * @returns 稳定分组 ID；来源不完整时返回 null
 */
export function buildGeneratedGroupId(
  generatedKind: string,
  parentRef: MapSourceFeatureRef | null | undefined
): string | null {
  const parentKey = buildMapSourceFeatureRefKey(parentRef);
  if (!parentKey) {
    return null;
  }

  return `${generatedKind}::${parentKey}`;
}

/**
 * 从插件生成要素属性中提取来源引用。
 * 优先读取统一字段，缺失时兼容旧托管预览来源字段。
 *
 * @param properties 待解析的属性对象
 * @returns 标准来源引用；字段不完整时返回 null
 */
export function extractGeneratedParentRef(
  properties: MapCommonProperties | null | undefined
): MapSourceFeatureRef | null {
  const generatedParentRef = createMapSourceFeatureRef(
    (properties?.[GENERATED_PARENT_SOURCE_ID_PROPERTY] as string | null | undefined) || null,
    (properties?.[GENERATED_PARENT_FEATURE_ID_PROPERTY] as MapFeatureId | null | undefined) ??
      null,
    (properties?.[GENERATED_PARENT_LAYER_ID_PROPERTY] as string | null | undefined) || null
  );

  return generatedParentRef || extractManagedPreviewOriginFromProperties(properties);
}

/**
 * 线廊生成工具类。
 * 负责从中心线生成区域面，以及在要素集合中替换旧区域。
 */
export class MapLineCorridorTool {
  /** 默认的生成区域标识 */
  static readonly DEFAULT_GENERATED_KIND = 'line-corridor';

  /**
   * 判断指定要素是否为某条线生成出来的区域面。
   * @param feature 待判断的要素
   * @param lineId 关联线要素业务 ID
   * @param generatedKind 生成区域的类型标识
   * @returns 是否为指定线生成的区域面
   */
  static isGeneratedRegionFeature(
    feature: MapCommonFeature,
    lineId: string | number,
    generatedKind = MapLineCorridorTool.DEFAULT_GENERATED_KIND
  ): feature is MapCommonPolygonFeature {
    return (
      feature.geometry?.type === 'Polygon' &&
      feature.properties?.generatedKind === generatedKind &&
      feature.properties?.generatedFromLineId === lineId
    );
  }

  /**
   * 根据中心线和宽度创建区域面要素。
   * @param lineFeature 中心线要素
   * @param widthMeters 中心线到边界的距离（米）
   * @param options 生成区域的附加配置
   * @returns 新的区域面要素；无法生成时返回 null
   */
  static createRegionFeature(
    lineFeature: MapCommonLineFeature,
    widthMeters: number,
    options: MapLineCorridorOptions = {}
  ): MapCommonPolygonFeature | null {
    const polygonRing = MapLineCorridorTool.buildLineCorridorPolygonRing(
      lineFeature.geometry.coordinates,
      widthMeters
    );
    const lineId = MapLineCorridorTool.getFeatureBusinessId(lineFeature);

    if (!polygonRing || lineId === null) {
      return null;
    }

    const generatedKind = options.generatedKind ?? MapLineCorridorTool.DEFAULT_GENERATED_KIND;
    const regionId = options.regionId ?? `generated_region_${String(lineId)}`;
    const regionType = options.regionType ?? '线廊区域';

    return {
      type: 'Feature',
      id: regionId,
      properties: {
        id: regionId,
        type: regionType,
        ...buildGeneratedFeatureProperties({
          generatedKind,
          groupId: buildGeneratedGroupId(
            generatedKind,
            extractGeneratedParentRef(lineFeature.properties || {})
          ),
          parentRef: extractGeneratedParentRef(lineFeature.properties || {}),
        }),
        generatedFromLineId: lineId,
        widthMeters,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [polygonRing],
      },
    };
  }

  /**
   * 在要素集合中替换指定线对应的旧区域，避免重复叠加。
   * @param features 原始要素集合
   * @param lineFeature 当前选中的线要素
   * @param widthMeters 中心线到边界的距离（米）
   * @param options 生成区域的附加配置
   * @returns 替换后的要素集合；无法生成时返回 null
   */
  static replaceRegionFeatures(
    features: MapCommonFeature[],
    lineFeature: MapCommonLineFeature,
    widthMeters: number,
    options: MapLineCorridorOptions = {}
  ): MapCommonFeature[] | null {
    const lineId = MapLineCorridorTool.getFeatureBusinessId(lineFeature);
    const generatedKind = options.generatedKind ?? MapLineCorridorTool.DEFAULT_GENERATED_KIND;
    const nextRegionFeature = MapLineCorridorTool.createRegionFeature(
      lineFeature,
      widthMeters,
      options
    );

    if (lineId === null || !nextRegionFeature) {
      return null;
    }

    return features
      .filter(
        (feature) => !MapLineCorridorTool.isGeneratedRegionFeature(feature, lineId, generatedKind)
      )
      .concat(nextRegionFeature);
  }

  /**
   * 根据中心线和宽度生成闭合面坐标环。
   * @param coordinates 中心线坐标数组
   * @param widthMeters 中心线到边界的距离（米）
   * @returns 闭合的面坐标环；无法生成时返回 null
   */
  private static buildLineCorridorPolygonRing(
    coordinates: Position[],
    widthMeters: number
  ): Position[] | null {
    const normalizedCoordinates = MapLineExtensionTool.normalizeLineCoordinates(coordinates);
    if (normalizedCoordinates.length < 2) return null;

    const mercatorCoordinates = normalizedCoordinates.map((coordinate) =>
      lngLatToMercatorPoint(coordinate)
    );
    const leftPath = MapLineCorridorTool.buildOffsetPath(mercatorCoordinates, widthMeters, 1);
    const rightPath = MapLineCorridorTool.buildOffsetPath(mercatorCoordinates, widthMeters, -1);

    const ring = [
      ...leftPath.map((coordinate) => mercatorPointToLngLat(coordinate)),
      ...rightPath
        .reverse()
        .map((coordinate) => mercatorPointToLngLat(coordinate)),
    ];

    if (ring.length < 4) return null;

    ring.push([...ring[0]] as Position);
    return ring;
  }

  /**
   * 按指定偏移距离构建折线一侧的边界路径。
   * @param coordinates 原始折线的墨卡托坐标数组
   * @param offsetMeters 偏移距离（米）
   * @param side 偏移方向，1 表示左侧，-1 表示右侧
   * @returns 偏移后的边界路径坐标
   */
  private static buildOffsetPath(
    coordinates: MercatorPoint[],
    offsetMeters: number,
    side: 1 | -1
  ): MercatorPoint[] {
    return coordinates.map((currentCoordinate, index) => {
      if (index === 0) {
        const firstNormal = getLeftNormalVector(currentCoordinate, coordinates[index + 1]);
        return addMercatorPoint(
          currentCoordinate,
          scaleMercatorPoint(firstNormal || { x: 0, y: 0 }, offsetMeters * side)
        );
      }

      if (index === coordinates.length - 1) {
        const lastNormal = getLeftNormalVector(coordinates[index - 1], currentCoordinate);
        return addMercatorPoint(
          currentCoordinate,
          scaleMercatorPoint(lastNormal || { x: 0, y: 0 }, offsetMeters * side)
        );
      }

      const previousCoordinate = coordinates[index - 1];
      const nextCoordinate = coordinates[index + 1];
      const previousNormal = getLeftNormalVector(previousCoordinate, currentCoordinate);
      const nextNormal = getLeftNormalVector(currentCoordinate, nextCoordinate);

      if (!previousNormal || !nextNormal) {
        return currentCoordinate;
      }

      const previousOffsetStart = addMercatorPoint(
        previousCoordinate,
        scaleMercatorPoint(previousNormal, offsetMeters * side)
      );
      const previousOffsetEnd = addMercatorPoint(
        currentCoordinate,
        scaleMercatorPoint(previousNormal, offsetMeters * side)
      );
      const nextOffsetStart = addMercatorPoint(
        currentCoordinate,
        scaleMercatorPoint(nextNormal, offsetMeters * side)
      );
      const nextOffsetEnd = addMercatorPoint(
        nextCoordinate,
        scaleMercatorPoint(nextNormal, offsetMeters * side)
      );

      const intersection = getInfiniteLineIntersection(
        previousOffsetStart,
        previousOffsetEnd,
        nextOffsetStart,
        nextOffsetEnd
      );

      if (!intersection) {
        return {
          x: (previousOffsetEnd.x + nextOffsetStart.x) / 2,
          y: (previousOffsetEnd.y + nextOffsetStart.y) / 2,
        };
      }

      const miterLength = getMercatorVectorLength(
        subtractMercatorPoint(intersection, previousOffsetEnd)
      );
      if (miterLength > offsetMeters * 6) {
        return {
          x: (previousOffsetEnd.x + nextOffsetStart.x) / 2,
          y: (previousOffsetEnd.y + nextOffsetStart.y) / 2,
        };
      }

      return intersection;
    });
  }

  /**
   * 解析要素的业务 ID。
   * @param feature 目标要素
   * @returns 业务 ID；不存在时返回 null
   */
  private static getFeatureBusinessId(feature: MapCommonFeature): string | number | null {
    const propertyId = feature.properties?.id;
    if (propertyId !== undefined && propertyId !== null) {
      return propertyId;
    }

    return feature.id ?? null;
  }
}

/**
 * 线延长草稿工具类。
 * 负责识别命中的线段、计算线长，以及沿指定线段方向生成线延长草稿。
 */
export class MapLineExtensionTool {
  /** 临时延长线要素的 generatedKind 标识 */
  static readonly TEMPORARY_EXTENSION_KIND = 'line-extension-draft';

  /** 临时延长线要素 ID 前缀 */
  static readonly TEMPORARY_EXTENSION_ID_PREFIX = 'lineDraftFeature_';

  /**
   * 计算两点之间的球面距离（米）。
   * @param start 起点坐标
   * @param end 终点坐标
   * @returns 两点之间的距离（米）
   */
  static getDistanceInMeters(start: Position, end: Position): number {
    return turfDistance(turfPoint(start), turfPoint(end), { units: 'meters' });
  }

  /**
   * 计算折线的累计长度（米）。
   * @param coordinates 折线坐标数组
   * @returns 折线总长度（米）
   */
  static getLineLengthInMeters(coordinates: Position[]): number {
    const normalizedCoordinates = MapLineExtensionTool.normalizeLineCoordinates(coordinates);
    let totalLength = 0;

    for (let index = 0; index < normalizedCoordinates.length - 1; index += 1) {
      totalLength += MapLineExtensionTool.getDistanceInMeters(
        normalizedCoordinates[index],
        normalizedCoordinates[index + 1]
      );
    }

    return totalLength;
  }

  /**
   * 精准解析用户“点击了线要素的哪一段”，并返回未被裁剪的完整线数据。
   *
   * @description
   * 地图引擎（如 MapLibre）在渲染长线时，为了性能通常会把屏幕外的坐标点裁剪掉。
   * 如果直接拿点击事件返回的线段去计算长度或提取坐标，结果往往是错误的（因为它不完整）。
   * 本方法会通过 `resolveLatestFeature` 回调，回到真实的业务源中捞出最原始、最完整的线数据，
   * 然后基于这段完整数据，计算出当前经纬度落在了哪两个坐标点之间（即命中线段的索引）。
   *
   * @param options 线交互解析配置（需提供点击坐标、要素标识与获取最新要素的方法）
   * @returns 包含完整线要素（lineFeature）和命中线段信息（segmentSelection）的结果对象；如果无法解析则返回 null
   */
  static resolveLineInteractionSnapshot(
    options: MapLineInteractionResolveOptions
  ): MapLineInteractionSnapshot | null {
    const { feature, featureRef = null, lngLat, resolveLatestFeature } = options;
    const latestFeature = resolveLatestFeature?.(featureRef);
    const lineFeature =
      MapLineExtensionTool.toLineFeatureSnapshot(latestFeature) ??
      MapLineExtensionTool.toLineFeatureSnapshot(feature);

    if (!lineFeature) {
      return null;
    }

    return {
      lineFeature,
      segmentSelection: MapLineExtensionTool.resolveNearestSegmentSelection(
        lineFeature.geometry.coordinates,
        lngLat
      ),
    };
  }

  /**
   * 计算当前点击命中的折线段索引。
   * @param coordinates 折线坐标数组
   * @param lngLat 当前点击位置
   * @returns 最近的线段信息；无法识别时返回 null
   */
  static resolveNearestSegmentSelection(
    coordinates: Position[],
    lngLat: { lng: number; lat: number }
  ): MapLineSegmentSelection | null {
    const normalizedCoordinates = MapLineExtensionTool.normalizeLineCoordinates(coordinates);
    if (normalizedCoordinates.length < 2) return null;

    const clickedPoint = lngLatToMercatorPoint([lngLat.lng, lngLat.lat]);
    let bestSegmentIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < normalizedCoordinates.length - 1; index += 1) {
      const segmentStart = lngLatToMercatorPoint(normalizedCoordinates[index]);
      const segmentEnd = lngLatToMercatorPoint(normalizedCoordinates[index + 1]);
      const projectedPoint = projectPointToSegment(clickedPoint, segmentStart, segmentEnd).point;
      const projectedDistance = getMercatorVectorLength(
        subtractMercatorPoint(projectedPoint, clickedPoint)
      );

      if (projectedDistance < bestDistance) {
        bestDistance = projectedDistance;
        bestSegmentIndex = index;
      }
    }

    if (bestSegmentIndex < 0) return null;

    return {
      index: bestSegmentIndex,
      lengthMeters: MapLineExtensionTool.getDistanceInMeters(
        normalizedCoordinates[bestSegmentIndex],
        normalizedCoordinates[bestSegmentIndex + 1]
      ),
    };
  }

  /**
   * 判断指定要素是否为临时延长线要素。
   * @param feature 待判断的要素
   * @param generatedKind 临时要素类型标识
   * @returns 是否为临时延长线
   */
  static isTemporaryExtensionFeature(
    feature: MapCommonFeature,
    generatedKind = MapLineExtensionTool.TEMPORARY_EXTENSION_KIND
  ): feature is MapCommonLineFeature {
    return (
      feature.geometry?.type === 'LineString' && feature.properties?.generatedKind === generatedKind
    );
  }

  /**
   * 将指定线段沿当前方向延长，并生成一条独立的临时延长线段。
   * @param lineFeature 当前选中的线要素
   * @param segmentIndex 当前选中的线段索引
   * @param extendLengthMeters 需要延长的长度（米）
   * @param origin 当前临时预览线对应的正式来源引用
   * @returns 临时延长线要素；无法延长时返回 null
   */
  static extendSelectedLineSegment(
    lineFeature: MapCommonLineFeature,
    segmentIndex: number,
    extendLengthMeters: number,
    origin: MapSourceFeatureRef | null = null
  ): MapCommonLineFeature | null {
    const normalizedCoordinates = MapLineExtensionTool.normalizeLineCoordinates(
      lineFeature.geometry.coordinates
    );

    if (segmentIndex < 0 || segmentIndex >= normalizedCoordinates.length - 1) {
      return null;
    }

    const segmentStart = normalizedCoordinates[segmentIndex];
    const segmentEnd = normalizedCoordinates[segmentIndex + 1];
    const currentSegmentLength = MapLineExtensionTool.getDistanceInMeters(
      segmentStart,
      segmentEnd
    );

    if (currentSegmentLength <= 0) {
      return null;
    }

    const segmentBearing = MapLineExtensionTool.getSegmentBearing(segmentStart, segmentEnd);
    const extendedEndCoordinate = turfDestination(
      turfPoint(segmentEnd),
      extendLengthMeters,
      segmentBearing,
      { units: 'meters' }
    ).geometry.coordinates as Position;
    const sourceLineId = MapLineExtensionTool.getFeatureBusinessId(lineFeature);
    const generatedSegmentIndex = MapLineExtensionTool.resolveGeneratedSegmentIndex(
      lineFeature,
      segmentIndex
    );

    if (sourceLineId === null) {
      return null;
    }

    const temporaryLineId = MapLineExtensionTool.buildTemporaryExtensionId(
      origin,
      generatedSegmentIndex
    );

    if (!temporaryLineId) {
      return null;
    }

    return {
      type: 'Feature',
      id: temporaryLineId,
      properties: {
        ...(lineFeature.properties || {}),
        id: temporaryLineId,
        ...buildGeneratedFeatureProperties({
          generatedKind: MapLineExtensionTool.TEMPORARY_EXTENSION_KIND,
          groupId: buildGeneratedGroupId(MapLineExtensionTool.TEMPORARY_EXTENSION_KIND, origin),
          parentRef: origin,
        }),
        generatedFromLineId: sourceLineId,
        generatedFromSegmentIndex: generatedSegmentIndex,
        extendLengthMeters,
        isTemporary: true,
      },
      geometry: {
        type: 'LineString',
        coordinates: [segmentEnd, extendedEndCoordinate],
      },
    };
  }

  /**
   * 过滤连续重复坐标，避免零长度线段影响几何计算。
   * @param coordinates 原始折线坐标数组
   * @returns 去重后的有效坐标数组
   */
  static normalizeLineCoordinates(coordinates: Position[]): Position[] {
    return coordinates.filter((coordinate, index) => {
      if (index === 0) return true;

      const previousCoordinate = coordinates[index - 1];
      return previousCoordinate[0] !== coordinate[0] || previousCoordinate[1] !== coordinate[1];
    });
  }

  /**
   * 将任意线要素转换为可安全用于业务计算的线要素快照。
   * @param feature 原始线要素
   * @returns 线要素快照；非线要素时返回 null
   */
  private static toLineFeatureSnapshot(
    feature: MapCommonFeature | null | undefined
  ): MapCommonLineFeature | null {
    if (feature?.geometry?.type !== 'LineString') {
      return null;
    }

    return {
      type: 'Feature',
      id:
        (feature.properties?.id as string | number | undefined) ??
        (feature.id as string | number | undefined),
      properties: JSON.parse(JSON.stringify(feature.properties || {})),
      geometry: {
        type: 'LineString',
        coordinates: JSON.parse(JSON.stringify(feature.geometry.coordinates || [])) as Position[],
      },
    };
  }

  /**
   * 计算指定线段的方位角。
   * @param start 线段起点
   * @param end 线段终点
   * @returns 方位角，范围为 -180 到 180 度
   */
  private static getSegmentBearing(start: Position, end: Position): number {
    const [startLng, startLat] = start;
    const [endLng, endLat] = end;
    const longitudeDelta = toRadians(endLng - startLng);
    const startLatitude = toRadians(startLat);
    const endLatitude = toRadians(endLat);
    const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
    const x =
      Math.cos(startLatitude) * Math.sin(endLatitude) -
      Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta);

    return ((toDegrees(Math.atan2(y, x)) + 540) % 360) - 180;
  }

  /**
   * 生成临时延长线要素 ID。
   * @param origin 当前临时延长线对应的正式来源引用
   * @param segmentIndex 被延长的线段索引
   * @returns 临时延长线要素 ID
   */
  private static buildTemporaryExtensionId(
    origin: MapSourceFeatureRef | null,
    segmentIndex: number
  ): string | null {
    const originKey = buildMapSourceFeatureRefKey(origin);
    if (!originKey || !origin) {
      return null;
    }

    const sourceIdToken = encodeURIComponent(origin.sourceId || 'unknown_source');
    const featureIdToken = encodeURIComponent(String(origin.featureId ?? 'unknown_feature'));
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return `${MapLineExtensionTool.TEMPORARY_EXTENSION_ID_PREFIX}${sourceIdToken}_${featureIdToken}_${segmentIndex}_${Date.now()}_${randomSuffix}`;
  }

  /**
   * 解析当前临时延长线应该继承的正式线段索引。
   * 如果当前线本身已经是托管临时预览线，则继续沿用它最初记录的正式线段索引。
   * @param lineFeature 当前参与延长的线要素
   * @param currentSegmentIndex 当前命中的线段索引
   * @returns 应写入临时预览属性的正式线段索引
   */
  private static resolveGeneratedSegmentIndex(
    lineFeature: MapCommonLineFeature,
    currentSegmentIndex: number
  ): number {
    const originalSegmentIndex = Number(lineFeature.properties?.generatedFromSegmentIndex);
    if (Number.isInteger(originalSegmentIndex) && originalSegmentIndex >= 0) {
      return originalSegmentIndex;
    }

    return currentSegmentIndex;
  }

  /**
   * 解析要素的业务 ID。
   * @param feature 目标要素
   * @returns 业务 ID；不存在时返回 null
   */
  private static getFeatureBusinessId(feature: MapCommonFeature): string | number | null {
    const propertyId = feature.properties?.id;
    if (propertyId !== undefined && propertyId !== null) {
      return propertyId;
    }

    return feature.id ?? null;
  }
}
