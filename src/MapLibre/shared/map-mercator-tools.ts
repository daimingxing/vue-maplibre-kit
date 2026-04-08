import type { Position } from 'geojson';

/** Web Mercator 投影常用的地球半径（米）。 */
const MERCATOR_RADIUS_METERS = 6378137;

/** 墨卡托平面坐标。 */
export interface MercatorPoint {
  /** X 轴坐标。 */
  x: number;
  /** Y 轴坐标。 */
  y: number;
}

/**
 * 将角度转换为弧度。
 * @param degree 角度值
 * @returns 对应弧度值
 */
export function toRadians(degree: number): number {
  return (degree * Math.PI) / 180;
}

/**
 * 将弧度转换为角度。
 * @param radians 弧度值
 * @returns 对应角度值
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * 将经纬度坐标转换为 Web Mercator 米制坐标。
 * @param position 经纬度坐标
 * @returns 墨卡托平面坐标
 */
export function lngLatToMercatorPoint(position: Position): MercatorPoint {
  const [lng, lat] = position;
  const clampedLatitude = Math.max(Math.min(lat, 85.0511287798), -85.0511287798);

  return {
    x: MERCATOR_RADIUS_METERS * toRadians(lng),
    y: MERCATOR_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4 + toRadians(clampedLatitude) / 2)),
  };
}

/**
 * 将 Web Mercator 米制坐标还原为经纬度坐标。
 * @param point 墨卡托平面坐标
 * @returns 经纬度坐标
 */
export function mercatorPointToLngLat(point: MercatorPoint): Position {
  return [
    toDegrees(point.x / MERCATOR_RADIUS_METERS),
    toDegrees(2 * Math.atan(Math.exp(point.y / MERCATOR_RADIUS_METERS)) - Math.PI / 2),
  ];
}

/**
 * 计算两个平面点的向量差。
 * @param target 目标点
 * @param source 起始点
 * @returns 从 source 指向 target 的向量
 */
export function subtractMercatorPoint(
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
export function addMercatorPoint(left: MercatorPoint, right: MercatorPoint): MercatorPoint {
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
export function scaleMercatorPoint(point: MercatorPoint, scale: number): MercatorPoint {
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
export function getMercatorVectorLength(vector: MercatorPoint): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

/**
 * 将平面向量归一化。
 * @param vector 原始向量
 * @returns 单位向量；零向量时返回 null
 */
export function normalizeMercatorVector(vector: MercatorPoint): MercatorPoint | null {
  const vectorLength = getMercatorVectorLength(vector);
  if (vectorLength === 0) {
    return null;
  }

  return {
    x: vector.x / vectorLength,
    y: vector.y / vectorLength,
  };
}

/**
 * 计算点到线段的最近投影点。
 * @param point 目标点
 * @param start 线段起点
 * @param end 线段终点
 * @returns 最近投影点及其在线段内的比例
 */
export function projectPointToSegment(
  point: MercatorPoint,
  start: MercatorPoint,
  end: MercatorPoint
): { point: MercatorPoint; ratio: number } {
  const segmentVector = subtractMercatorPoint(end, start);
  const segmentLengthSquared = segmentVector.x * segmentVector.x + segmentVector.y * segmentVector.y;

  if (segmentLengthSquared === 0) {
    return {
      point: start,
      ratio: 0,
    };
  }

  const pointVector = subtractMercatorPoint(point, start);
  const rawRatio = (pointVector.x * segmentVector.x + pointVector.y * segmentVector.y) / segmentLengthSquared;
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
 * 根据线段方向计算其左侧法向量。
 * @param start 线段起点
 * @param end 线段终点
 * @returns 左法向量；零长度线段返回 null
 */
export function getLeftNormalVector(
  start: MercatorPoint,
  end: MercatorPoint
): MercatorPoint | null {
  const direction = normalizeMercatorVector(subtractMercatorPoint(end, start));
  if (!direction) {
    return null;
  }

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
export function getInfiniteLineIntersection(
  firstStart: MercatorPoint,
  firstEnd: MercatorPoint,
  secondStart: MercatorPoint,
  secondEnd: MercatorPoint
): MercatorPoint | null {
  const firstVector = subtractMercatorPoint(firstEnd, firstStart);
  const secondVector = subtractMercatorPoint(secondEnd, secondStart);
  const determinant = firstVector.x * secondVector.y - firstVector.y * secondVector.x;

  if (Math.abs(determinant) < 1e-9) {
    return null;
  }

  const delta = subtractMercatorPoint(secondStart, firstStart);
  const ratio = (delta.x * secondVector.y - delta.y * secondVector.x) / determinant;

  return {
    x: firstStart.x + firstVector.x * ratio,
    y: firstStart.y + firstVector.y * ratio,
  };
}
