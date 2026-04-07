import type { Feature, FeatureCollection, Geometry, LineString, Polygon, Position } from 'geojson';
import { point as turfPoint } from '@turf/helpers';
import { distance as turfDistance } from '@turf/distance';
import { destination as turfDestination } from '@turf/destination';
import type { MapFeatureId } from '../composables/useMapDataUpdate';

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
}

/** 托管临时预览来源 sourceId 属性名 */
export const MANAGED_PREVIEW_ORIGIN_SOURCE_ID_PROPERTY = 'managedPreviewOriginSourceId';

/** 托管临时预览来源 featureId 属性名 */
export const MANAGED_PREVIEW_ORIGIN_FEATURE_ID_PROPERTY = 'managedPreviewOriginFeatureId';

/** 托管临时预览来源唯一键属性名 */
export const MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY = 'managedPreviewOriginKey';

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

/** 墨卡托平面坐标 */
interface MercatorPoint {
  /** X 轴坐标 */
  x: number;
  /** Y 轴坐标 */
  y: number;
}

const MERCATOR_RADIUS_METERS = 6378137;

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
    const targetMercatorPoint = MapLineMeasureTool.lngLatToMercatorPoint(target);
    let bestLocation: MapLineLocatedPoint | null = null;

    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const segmentStart = coordinates[index];
      const segmentEnd = coordinates[index + 1];
      const segmentStartMercator = MapLineMeasureTool.lngLatToMercatorPoint(segmentStart);
      const segmentEndMercator = MapLineMeasureTool.lngLatToMercatorPoint(segmentEnd);
      const projectedPoint = MapLineMeasureTool.projectPointToSegment(
        targetMercatorPoint,
        segmentStartMercator,
        segmentEndMercator
      );
      const snappedCoordinate = MapLineMeasureTool.mercatorPointToLngLat(projectedPoint.point);
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

  /**
   * 计算点到线段的最近投影点。
   * @param point 目标点
   * @param start 线段起点
   * @param end 线段终点
   * @returns 最近投影点及其在线段内的比例
   */
  private static projectPointToSegment(
    point: MercatorPoint,
    start: MercatorPoint,
    end: MercatorPoint
  ): { point: MercatorPoint; ratio: number } {
    const segmentVector = MapLineMeasureTool.subtractMercatorPoint(end, start);
    const segmentLengthSquared =
      segmentVector.x * segmentVector.x + segmentVector.y * segmentVector.y;

    if (segmentLengthSquared === 0) {
      return {
        point: start,
        ratio: 0,
      };
    }

    const pointVector = MapLineMeasureTool.subtractMercatorPoint(point, start);
    const rawRatio =
      (pointVector.x * segmentVector.x + pointVector.y * segmentVector.y) / segmentLengthSquared;
    const ratio = Math.max(0, Math.min(1, rawRatio));

    return {
      point: {
        x: start.x + segmentVector.x * ratio,
        y: start.y + segmentVector.y * ratio,
      },
      ratio,
    };
  }

  /**
   * 将经纬度坐标转换为 Web Mercator 米制坐标。
   * @param position 经纬度坐标
   * @returns 墨卡托平面坐标
   */
  private static lngLatToMercatorPoint(position: Position): MercatorPoint {
    const [lng, lat] = position;
    const clampedLatitude = Math.max(Math.min(lat, 85.0511287798), -85.0511287798);

    return {
      x: MERCATOR_RADIUS_METERS * MapLineMeasureTool.toRadians(lng),
      y:
        MERCATOR_RADIUS_METERS *
        Math.log(Math.tan(Math.PI / 4 + MapLineMeasureTool.toRadians(clampedLatitude) / 2)),
    };
  }

  /**
   * 将 Web Mercator 米制坐标还原为经纬度坐标。
   * @param point 墨卡托平面坐标
   * @returns 经纬度坐标
   */
  private static mercatorPointToLngLat(point: MercatorPoint): Position {
    return [
      MapLineMeasureTool.toDegrees(point.x / MERCATOR_RADIUS_METERS),
      MapLineMeasureTool.toDegrees(
        2 * Math.atan(Math.exp(point.y / MERCATOR_RADIUS_METERS)) - Math.PI / 2
      ),
    ];
  }

  /**
   * 计算两个平面点的向量差。
   * @param target 目标点
   * @param source 起始点
   * @returns 从 source 指向 target 的向量
   */
  private static subtractMercatorPoint(
    target: MercatorPoint,
    source: MercatorPoint
  ): MercatorPoint {
    return {
      x: target.x - source.x,
      y: target.y - source.y,
    };
  }

  /**
   * 将角度转换为弧度。
   * @param degree 角度值
   * @returns 对应弧度值
   */
  private static toRadians(degree: number): number {
    return (degree * Math.PI) / 180;
  }

  /**
   * 将弧度转换为角度。
   * @param radians 弧度值
   * @returns 对应角度值
   */
  private static toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}

/**
 * 创建标准化的正式业务要素来源引用。
 * @param sourceId 正式业务 source 标识
 * @param featureId 正式业务要素 ID
 * @returns 标准化后的来源引用；信息不完整时返回 null
 */
export function createMapSourceFeatureRef(
  sourceId: string | null | undefined,
  featureId: MapFeatureId | null | undefined
): MapSourceFeatureRef | null {
  if (!sourceId || featureId === null || featureId === undefined) {
    return null;
  }

  return {
    sourceId,
    featureId,
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
      null
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
    [MANAGED_PREVIEW_ORIGIN_KEY_PROPERTY]: originKey,
  };
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
        generatedKind,
        generatedFromLineId: lineId,
        widthMeters,
        ...buildManagedPreviewOriginProperties(
          extractManagedPreviewOriginFromProperties(lineFeature.properties || {})
        ),
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
      MapLineCorridorTool.lngLatToMercatorPoint(coordinate)
    );
    const leftPath = MapLineCorridorTool.buildOffsetPath(mercatorCoordinates, widthMeters, 1);
    const rightPath = MapLineCorridorTool.buildOffsetPath(mercatorCoordinates, widthMeters, -1);

    const ring = [
      ...leftPath.map((coordinate) => MapLineCorridorTool.mercatorPointToLngLat(coordinate)),
      ...rightPath
        .reverse()
        .map((coordinate) => MapLineCorridorTool.mercatorPointToLngLat(coordinate)),
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
        const firstNormal = MapLineCorridorTool.getLeftNormalVector(
          currentCoordinate,
          coordinates[index + 1]
        );
        return MapLineCorridorTool.addMercatorPoint(
          currentCoordinate,
          MapLineCorridorTool.scaleMercatorPoint(firstNormal || { x: 0, y: 0 }, offsetMeters * side)
        );
      }

      if (index === coordinates.length - 1) {
        const lastNormal = MapLineCorridorTool.getLeftNormalVector(
          coordinates[index - 1],
          currentCoordinate
        );
        return MapLineCorridorTool.addMercatorPoint(
          currentCoordinate,
          MapLineCorridorTool.scaleMercatorPoint(lastNormal || { x: 0, y: 0 }, offsetMeters * side)
        );
      }

      const previousCoordinate = coordinates[index - 1];
      const nextCoordinate = coordinates[index + 1];
      const previousNormal = MapLineCorridorTool.getLeftNormalVector(
        previousCoordinate,
        currentCoordinate
      );
      const nextNormal = MapLineCorridorTool.getLeftNormalVector(currentCoordinate, nextCoordinate);

      if (!previousNormal || !nextNormal) {
        return currentCoordinate;
      }

      const previousOffsetStart = MapLineCorridorTool.addMercatorPoint(
        previousCoordinate,
        MapLineCorridorTool.scaleMercatorPoint(previousNormal, offsetMeters * side)
      );
      const previousOffsetEnd = MapLineCorridorTool.addMercatorPoint(
        currentCoordinate,
        MapLineCorridorTool.scaleMercatorPoint(previousNormal, offsetMeters * side)
      );
      const nextOffsetStart = MapLineCorridorTool.addMercatorPoint(
        currentCoordinate,
        MapLineCorridorTool.scaleMercatorPoint(nextNormal, offsetMeters * side)
      );
      const nextOffsetEnd = MapLineCorridorTool.addMercatorPoint(
        nextCoordinate,
        MapLineCorridorTool.scaleMercatorPoint(nextNormal, offsetMeters * side)
      );

      const intersection = MapLineCorridorTool.getInfiniteLineIntersection(
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

      const miterLength = MapLineCorridorTool.getMercatorVectorLength(
        MapLineCorridorTool.subtractMercatorPoint(intersection, previousOffsetEnd)
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
   * 根据线段方向计算其左侧法向量。
   * @param start 线段起点
   * @param end 线段终点
   * @returns 左法向量；零长度线段返回 null
   */
  private static getLeftNormalVector(
    start: MercatorPoint,
    end: MercatorPoint
  ): MercatorPoint | null {
    const direction = MapLineCorridorTool.normalizeMercatorVector(
      MapLineCorridorTool.subtractMercatorPoint(end, start)
    );
    if (!direction) return null;

    return {
      x: -direction.y,
      y: direction.x,
    };
  }

  /**
   * 计算两条无限延长直线的交点。
   * @param firstStart 第一条线的起点
   * @param firstEnd 第一条线的终点
   * @param secondStart 第二条线的起点
   * @param secondEnd 第二条线的终点
   * @returns 交点；平行或近似平行时返回 null
   */
  private static getInfiniteLineIntersection(
    firstStart: MercatorPoint,
    firstEnd: MercatorPoint,
    secondStart: MercatorPoint,
    secondEnd: MercatorPoint
  ): MercatorPoint | null {
    const firstVector = MapLineCorridorTool.subtractMercatorPoint(firstEnd, firstStart);
    const secondVector = MapLineCorridorTool.subtractMercatorPoint(secondEnd, secondStart);
    const determinant = firstVector.x * secondVector.y - firstVector.y * secondVector.x;

    if (Math.abs(determinant) < 1e-9) {
      return null;
    }

    const delta = MapLineCorridorTool.subtractMercatorPoint(secondStart, firstStart);
    const ratio = (delta.x * secondVector.y - delta.y * secondVector.x) / determinant;

    return {
      x: firstStart.x + firstVector.x * ratio,
      y: firstStart.y + firstVector.y * ratio,
    };
  }

  /**
   * 将经纬度坐标转换为 Web Mercator 米制坐标。
   * @param position 经纬度坐标
   * @returns 墨卡托平面坐标
   */
  private static lngLatToMercatorPoint(position: Position): MercatorPoint {
    const [lng, lat] = position;
    const clampedLatitude = Math.max(Math.min(lat, 85.0511287798), -85.0511287798);

    return {
      x: MERCATOR_RADIUS_METERS * MapLineCorridorTool.toRadians(lng),
      y:
        MERCATOR_RADIUS_METERS *
        Math.log(Math.tan(Math.PI / 4 + MapLineCorridorTool.toRadians(clampedLatitude) / 2)),
    };
  }

  /**
   * 将 Web Mercator 米制坐标还原为经纬度坐标。
   * @param point 墨卡托平面坐标
   * @returns 经纬度坐标
   */
  private static mercatorPointToLngLat(point: MercatorPoint): Position {
    return [
      MapLineCorridorTool.toDegrees(point.x / MERCATOR_RADIUS_METERS),
      MapLineCorridorTool.toDegrees(
        2 * Math.atan(Math.exp(point.y / MERCATOR_RADIUS_METERS)) - Math.PI / 2
      ),
    ];
  }

  /**
   * 计算两个平面点的向量差。
   * @param target 目标点
   * @param source 起始点
   * @returns 从 source 指向 target 的向量
   */
  private static subtractMercatorPoint(
    target: MercatorPoint,
    source: MercatorPoint
  ): MercatorPoint {
    return {
      x: target.x - source.x,
      y: target.y - source.y,
    };
  }

  /**
   * 将两个平面向量相加。
   * @param left 左侧向量
   * @param right 右侧向量
   * @returns 相加后的向量
   */
  private static addMercatorPoint(left: MercatorPoint, right: MercatorPoint): MercatorPoint {
    return {
      x: left.x + right.x,
      y: left.y + right.y,
    };
  }

  /**
   * 将平面向量按比例缩放。
   * @param point 原始向量
   * @param scale 缩放倍数
   * @returns 缩放后的向量
   */
  private static scaleMercatorPoint(point: MercatorPoint, scale: number): MercatorPoint {
    return {
      x: point.x * scale,
      y: point.y * scale,
    };
  }

  /**
   * 计算平面向量长度。
   * @param vector 平面向量
   * @returns 向量长度
   */
  private static getMercatorVectorLength(vector: MercatorPoint): number {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }

  /**
   * 将平面向量归一化。
   * @param vector 原始向量
   * @returns 单位向量；零向量时返回 null
   */
  private static normalizeMercatorVector(vector: MercatorPoint): MercatorPoint | null {
    const vectorLength = MapLineCorridorTool.getMercatorVectorLength(vector);
    if (vectorLength === 0) return null;

    return {
      x: vector.x / vectorLength,
      y: vector.y / vectorLength,
    };
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

  /**
   * 将角度转换为弧度。
   * @param degree 角度值
   * @returns 对应弧度值
   */
  private static toRadians(degree: number): number {
    return (degree * Math.PI) / 180;
  }

  /**
   * 将弧度转换为角度。
   * @param radians 弧度值
   * @returns 对应角度值
   */
  private static toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
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
   * 统一解析线交互快照。
   * 优先使用业务层提供的最新原始线要素，避免渲染态几何被裁剪或简化后影响线段命中判断。
   * @param options 线交互解析配置
   * @returns 线要素快照与命中线段结果；无法解析时返回 null
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

    const clickedPoint = MapLineExtensionTool.lngLatToMercatorPoint([lngLat.lng, lngLat.lat]);
    let bestSegmentIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < normalizedCoordinates.length - 1; index += 1) {
      const segmentStart = MapLineExtensionTool.lngLatToMercatorPoint(
        normalizedCoordinates[index]
      );
      const segmentEnd = MapLineExtensionTool.lngLatToMercatorPoint(
        normalizedCoordinates[index + 1]
      );
      const projectedPoint = MapLineExtensionTool.projectPointToSegment(
        clickedPoint,
        segmentStart,
        segmentEnd
      ).point;
      const projectedDistance = MapLineExtensionTool.getMercatorVectorLength(
        MapLineExtensionTool.subtractMercatorPoint(projectedPoint, clickedPoint)
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
        generatedKind: MapLineExtensionTool.TEMPORARY_EXTENSION_KIND,
        generatedFromLineId: sourceLineId,
        generatedFromSegmentIndex: generatedSegmentIndex,
        extendLengthMeters,
        isTemporary: true,
        ...buildManagedPreviewOriginProperties(origin),
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
    const longitudeDelta = MapLineExtensionTool.toRadians(endLng - startLng);
    const startLatitude = MapLineExtensionTool.toRadians(startLat);
    const endLatitude = MapLineExtensionTool.toRadians(endLat);
    const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
    const x =
      Math.cos(startLatitude) * Math.sin(endLatitude) -
      Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta);

    return ((MapLineExtensionTool.toDegrees(Math.atan2(y, x)) + 540) % 360) - 180;
  }

  /**
   * 计算点到线段的最近投影点。
   * @param point 鼠标点击位置
   * @param start 线段起点
   * @param end 线段终点
   * @returns 最近投影点及其在线段上的归一化比例
   */
  private static projectPointToSegment(
    point: MercatorPoint,
    start: MercatorPoint,
    end: MercatorPoint
  ): { point: MercatorPoint; ratio: number } {
    const segmentVector = MapLineExtensionTool.subtractMercatorPoint(end, start);
    const segmentLengthSquared =
      segmentVector.x * segmentVector.x + segmentVector.y * segmentVector.y;

    if (segmentLengthSquared === 0) {
      return {
        point: start,
        ratio: 0,
      };
    }

    const pointVector = MapLineExtensionTool.subtractMercatorPoint(point, start);
    const rawRatio =
      (pointVector.x * segmentVector.x + pointVector.y * segmentVector.y) / segmentLengthSquared;
    const ratio = Math.max(0, Math.min(1, rawRatio));

    return {
      point: {
        x: start.x + segmentVector.x * ratio,
        y: start.y + segmentVector.y * ratio,
      },
      ratio,
    };
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

  /**
   * 将经纬度坐标转换为 Web Mercator 米制坐标。
   * @param position 经纬度坐标
   * @returns 墨卡托平面坐标
   */
  private static lngLatToMercatorPoint(position: Position): MercatorPoint {
    const [lng, lat] = position;
    const clampedLatitude = Math.max(Math.min(lat, 85.0511287798), -85.0511287798);

    return {
      x: MERCATOR_RADIUS_METERS * MapLineExtensionTool.toRadians(lng),
      y:
        MERCATOR_RADIUS_METERS *
        Math.log(Math.tan(Math.PI / 4 + MapLineExtensionTool.toRadians(clampedLatitude) / 2)),
    };
  }

  /**
   * 计算两个平面点的向量差。
   * @param target 目标点
   * @param source 起始点
   * @returns 从 source 指向 target 的向量
   */
  private static subtractMercatorPoint(
    target: MercatorPoint,
    source: MercatorPoint
  ): MercatorPoint {
    return {
      x: target.x - source.x,
      y: target.y - source.y,
    };
  }

  /**
   * 计算平面向量长度。
   * @param vector 平面向量
   * @returns 向量长度
   */
  private static getMercatorVectorLength(vector: MercatorPoint): number {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }

  /**
   * 将角度转换为弧度。
   * @param degree 角度值
   * @returns 对应弧度值
   */
  private static toRadians(degree: number): number {
    return (degree * Math.PI) / 180;
  }

  /**
   * 将弧度转换为角度。
   * @param radians 弧度值
   * @returns 对应角度值
   */
  private static toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}
