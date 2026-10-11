import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import { ref, watchEffect } from 'vue';
import type { TerraDrawMouseEvent } from 'terra-draw';
import type { MapSnapBinding } from '../types';
import type {
  MapFeatureSnapCandidate,
  MapFeatureSnapDecision,
  MapFeatureSnapGeometryType,
  MapFeatureSnapInvalidReason,
  MapFeatureSnapKind,
  MapFeatureSnapMode,
  MapFeatureSnapOptions,
  MapFeatureSnapParent,
  MapFeatureSnapParticipant,
  MapFeatureSnapPreviewSnapshot,
  MapFeatureSnapResolvedFeature,
  MapFeatureSnapResult,
  MapFeatureSnapRelation,
  MapFeatureSnapRule,
  MapFeatureSnapSegmentInfo,
  MapFeatureSnapStateTarget,
  MapFeatureSnapTarget,
} from './types';
import {
  createSnapIntersectionStore,
  type SnapIntersectionPoint,
  type SnapIntersectionRule,
} from './mapFeatureSnapIntersections';

type PreviewFeatureCollection = FeatureCollection;

/** 当前吸附目标写入 feature-state 的样式覆写。 */
interface SnapPreviewTargetStyle {
  /** 原要素颜色覆写；未声明时为 null。 */
  color: string | null;
  /** 原要素透明度覆写；未声明时为 null。 */
  opacity: number | null;
  /** 线要素宽度覆写；未声明时为 null。 */
  lineWidth: number | null;
  /** 点要素半径覆写；未声明时为 null。 */
  pointRadius: number | null;
}

interface ScreenPoint {
  x: number;
  y: number;
}

type ResolvedMapFeatureSnapRule = MapFeatureSnapRule & {
  /** 系统归一化后的规则 ID。 */
  id: string;
};

type SnapFeatureBase = Feature<Geometry, Record<string, any> | null>;

type SnapFeatureLike = SnapFeatureBase & {
  /** MapLibre 渲染要素 source ID。 */
  source?: string;
  /** MapLibre 渲染要素 source-layer。 */
  sourceLayer?: string;
  /** MapLibre 渲染要素所在图层。 */
  layer?: { id?: string };
};

interface SnapCandidate {
  rule: ResolvedMapFeatureSnapRule;
  feature: SnapFeatureLike;
  layerId: string;
  sourceId: string | null;
  coordinate: [number, number];
  /** 交点节点固定坐标；direct 与 nearby 不提供。 */
  snapCoordinate?: [number, number];
  distancePx: number;
  snapKind: MapFeatureSnapKind;
  segment: MapFeatureSnapSegmentInfo | null;
  parents: MapFeatureSnapParent[];
  /** 当前目标通过真实 segment 还是端点延长参与。 */
  attachment?: 'real' | 'extended';
}

interface ResolvePointerOptions {
  point: ScreenPoint;
  lngLat: { lng: number; lat: number };
}

/** 归一化后的近邻候选配置。 */
interface ResolvedNearbyOptions {
  enabled: boolean;
  maxDistanceMeters: number;
  paddingPx: number;
}

/** 原始屏幕指针在单个真实要素上的最近投影。 */
interface FeatureProjection {
  coordinate: [number, number];
  point: ScreenPoint;
  distancePx: number;
}

/** 同一业务 feature 身份下单个渲染切片对应的近邻候选。 */
interface NearbyAlternative {
  candidate: SnapCandidate;
  projection: FeatureProjection;
  meterGap: number;
}

/** 吸附预览数据源 ID。 */
export const MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID = '__mapFeatureSnapPreviewSource';

/** 吸附预览点图层 ID。 */
export const MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID = '__mapFeatureSnapPreviewPointLayer';

/**
 * 交点插件内部图层 ID。
 * 这里直接使用固定字符串，避免把吸附层绑定到交点插件实现文件上，
 * 从而把 Vue 渲染层依赖带进纯算法绑定模块。
 */
const INTERSECTION_PREVIEW_LAYER_ID = 'intersection-preview-layer';
const INTERSECTION_MATERIALIZED_LAYER_ID = 'intersection-materialized-layer';
const INTERSECTION_PREVIEW_SNAP_PRIORITY = 100;
const INTERSECTION_MATERIALIZED_SNAP_PRIORITY = 110;
const POLYGON_EDGE_PREVIEW_LAYER_ID = 'polygonEdgePreviewLineLayer';
const POLYGON_EDGE_SNAP_PRIORITY = 90;

const DEFAULT_TOLERANCE_PX = 16;
const DEFAULT_SNAP_MODES: MapFeatureSnapMode[] = ['vertex', 'segment'];
const DEFAULT_NEARBY_MAX_METERS = 1;
const DEFAULT_NEARBY_PADDING_PX = 2;
const EARTH_RADIUS_METERS = 6371008.8;

/** 地图吸附插件内部绑定句柄。 */
export type MapFeatureSnapBinding = MapSnapBinding & {
  /** 读取当前已经提交并可供交互消费的指针快照。 */
  getPreviewSnapshot: () => MapFeatureSnapPreviewSnapshot | null;
};

/**
 * 创建一个“未命中吸附”的空结果。
 * @returns 统一的空吸附结果对象
 */
export function createEmptyMapFeatureSnapResult(): MapFeatureSnapResult {
  return {
    resolution: { status: 'unmatched' },
    matched: false,
    lngLat: null,
    distancePx: null,
    snapKind: null,
    ruleId: null,
    targetFeature: null,
    targetLayerId: null,
    targetSourceId: null,
    targetCoordinate: null,
    anchorCoordinate: null,
    segment: null,
    parents: [],
    candidates: [],
  };
}

/**
 * 读取当前吸附预览写入原要素的状态样式。
 * @param options 当前吸附插件配置
 * @returns 只包含显式配置字段的状态样式
 */
function createTargetStyle(options: MapFeatureSnapOptions | null | undefined): SnapPreviewTargetStyle {
  return {
    color: options?.preview?.targetColor ?? null,
    opacity: options?.preview?.targetOpacity ?? null,
    lineWidth: options?.preview?.targetLineWidth ?? null,
    pointRadius: options?.preview?.targetPointRadius ?? null,
  };
}

/**
 * 比较当前和已写入的吸附目标样式，避免相同候选重复写入 feature-state。
 * @param next 本次准备写入的样式
 * @param current 当前活动目标已经写入的样式
 * @returns 样式字段完全相同时返回 true
 */
function isSameTargetStyle(
  next: SnapPreviewTargetStyle,
  current: SnapPreviewTargetStyle | null
): boolean {
  return current?.color === next.color
    && current.opacity === next.opacity
    && current.lineWidth === next.lineWidth
    && current.pointRadius === next.pointRadius;
}

/**
 * 创建空的吸附预览数据源。
 * @returns 不包含任何预览要素的 GeoJSON 集合
 */
function createEmptyPreviewFeatureCollection(): PreviewFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

/**
 * 判断当前值是否为合法二维坐标。
 * @param coordinate 待判断的坐标值
 * @returns 是否为 [lng, lat] 结构
 */
function isLngLatCoordinate(coordinate: unknown): coordinate is [number, number] {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    typeof coordinate[0] === 'number' &&
    typeof coordinate[1] === 'number'
  );
}

/**
 * 读取当前规则实际启用的吸附方式。
 * @param rule 当前规则
 * @param geometryType 当前候选几何类型
 * @returns 当前规则最终生效的吸附方式集合
 */
function getResolvedSnapModes(
  rule: ResolvedMapFeatureSnapRule,
  geometryType: MapFeatureSnapGeometryType
): MapFeatureSnapMode[] {
  const snapModes = rule.snapTo?.length ? [...rule.snapTo] : [...DEFAULT_SNAP_MODES];
  if (geometryType === 'Point') {
    return snapModes.includes('vertex') ? ['vertex'] : [];
  }

  return snapModes;
}

/**
 * 读取当前规则实际启用的吸附范围。
 * @param rule 当前规则
 * @param defaultTolerancePx 全局默认吸附范围
 * @returns 当前规则最终生效的吸附范围
 */
function getResolvedTolerancePx(
  rule: MapFeatureSnapRule,
  defaultTolerancePx: number
): number {
  return rule.tolerancePx ?? defaultTolerancePx;
}

/**
 * 统一归一化近邻候选配置，保证查询范围与最终过滤使用同一组数值。
 * @param options 原始近邻配置
 * @returns 包含启用态、米制距离和屏幕余量的稳定配置
 */
function resolveNearbyOptions(
  options: MapFeatureSnapOptions['nearby']
): ResolvedNearbyOptions {
  const enabled = Boolean(options)
    && (typeof options !== 'object' || options.enabled !== false);
  const rawMaxDistanceMeters = typeof options === 'object'
    ? options.maxDistanceMeters ?? DEFAULT_NEARBY_MAX_METERS
    : DEFAULT_NEARBY_MAX_METERS;
  const rawPaddingPx = typeof options === 'object'
    ? options.paddingPx ?? DEFAULT_NEARBY_PADDING_PX
    : DEFAULT_NEARBY_PADDING_PX;
  return {
    enabled,
    maxDistanceMeters: Number.isFinite(rawMaxDistanceMeters)
      ? Math.max(0, rawMaxDistanceMeters)
      : DEFAULT_NEARBY_MAX_METERS,
    paddingPx: Number.isFinite(rawPaddingPx)
      ? Math.max(0, rawPaddingPx)
      : DEFAULT_NEARBY_PADDING_PX,
  };
}

/**
 * 将候选路径中的一个坐标投影到屏幕平面。
 * @param map 当前地图实例
 * @param coordinate 待投影坐标
 * @returns 屏幕平面坐标
 */
function projectCoordinate(map: MaplibreMap, coordinate: [number, number]): ScreenPoint {
  const projectedPoint = map.project(coordinate);
  return {
    x: projectedPoint.x,
    y: projectedPoint.y,
  };
}

/**
 * 计算两个屏幕点之间的像素距离。
 * @param start 起点
 * @param end 终点
 * @returns 像素距离
 */
function getScreenDistance(start: ScreenPoint, end: ScreenPoint): number {
  const deltaX = start.x - end.x;
  const deltaY = start.y - end.y;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

/**
 * 计算两个经纬度坐标之间的球面距离。
 * @param start 起点经纬度
 * @param end 终点经纬度
 * @returns 两点距离，单位米
 */
function getCoordinateDistanceMeters(
  start: [number, number],
  end: [number, number]
): number {
  const toRadians = (value: number): number => value * Math.PI / 180;
  const startLat = toRadians(start[1]);
  const endLat = toRadians(end[1]);
  const latDelta = endLat - startLat;
  const lngDelta = toRadians(end[0] - start[0]);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

/**
 * 计算屏幕点到线段的最近投影点。
 * @param point 鼠标屏幕点
 * @param segmentStart 线段起点
 * @param segmentEnd 线段终点
 * @returns 最近投影点及其在线段上的比例
 */
function projectPointToScreenSegment(
  point: ScreenPoint,
  segmentStart: ScreenPoint,
  segmentEnd: ScreenPoint
): { point: ScreenPoint; ratio: number } {
  const segmentVectorX = segmentEnd.x - segmentStart.x;
  const segmentVectorY = segmentEnd.y - segmentStart.y;
  const segmentLengthSquare = segmentVectorX * segmentVectorX + segmentVectorY * segmentVectorY;

  if (segmentLengthSquare <= 0) {
    return {
      point: { ...segmentStart },
      ratio: 0,
    };
  }

  const rawRatio =
    ((point.x - segmentStart.x) * segmentVectorX + (point.y - segmentStart.y) * segmentVectorY) /
    segmentLengthSquare;
  const ratio = Math.max(0, Math.min(1, rawRatio));

  return {
    point: {
      x: segmentStart.x + segmentVectorX * ratio,
      y: segmentStart.y + segmentVectorY * ratio,
    },
    ratio,
  };
}

/**
 * 读取候选要素的 sourceId。
 * @param feature 候选渲染要素
 * @returns sourceId；不存在时返回 null
 */
function getFeatureSourceId(feature: SnapFeatureLike): string | null {
  return typeof feature.source === 'string' ? feature.source : null;
}

/**
 * 判断当前候选要素是否满足规则声明的属性匹配条件。
 * @param feature 当前候选要素
 * @param rule 当前规则
 * @returns 是否通过浅层属性匹配
 */
function matchesRuleWhere(feature: SnapFeatureLike, rule: MapFeatureSnapRule): boolean {
  if (!rule.where) {
    return true;
  }

  const featureProperties = feature.properties || {};
  return Object.entries(rule.where).every(([propertyKey, propertyValue]) => {
    return featureProperties[propertyKey] === propertyValue;
  });
}

/**
 * 判断当前候选要素是否允许参与规则计算。
 * @param map 当前地图实例
 * @param feature 当前候选要素
 * @param rule 当前规则
 * @param layerId 当前候选图层 ID
 * @returns 是否允许参与当前规则吸附
 */
function matchesRuleFilter(
  map: MaplibreMap,
  feature: MapGeoJSONFeature,
  rule: ResolvedMapFeatureSnapRule,
  layerId: string
): boolean {
  if (!matchesRuleWhere(feature, rule)) {
    return false;
  }

  if (!rule.filter) {
    return true;
  }

  try {
    return rule.filter({
      rule,
      feature,
      layerId,
      sourceId: getFeatureSourceId(feature),
      sourceLayer: feature.sourceLayer || null,
      properties: feature.properties || null,
      map,
    });
  } catch (error) {
    // 业务自定义过滤器属于插件外部输入，抛错时只跳过当前候选，避免中断鼠标交互链路。
    console.error(`[MapFeatureSnap] 吸附规则 '${rule.id}' filter 执行失败，已跳过当前候选`, error);
    return false;
  }
}

/**
 * 将线几何标准化为“路径数组”。
 * @param geometry 候选线几何
 * @returns 标准化后的路径数组
 */
function getLineGeometryPaths(geometry: Geometry): [number, number][][] {
  if (geometry.type === 'LineString') {
    return [geometry.coordinates.filter(isLngLatCoordinate)];
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.map((path) => path.filter(isLngLatCoordinate));
  }

  return [];
}

/**
 * 将面几何标准化为“路径数组”。
 * 注意：这里返回的是所有 ring，后续统一按边界线处理。
 * @param geometry 候选面几何
 * @returns 标准化后的 ring 路径数组
 */
function getPolygonGeometryPaths(geometry: Geometry): [number, number][][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring) => ring.filter(isLngLatCoordinate));
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon) =>
      polygon.map((ring) => ring.filter(isLngLatCoordinate))
    );
  }

  return [];
}

/**
 * 将点几何标准化为坐标数组。
 * @param geometry 候选点几何
 * @returns 标准化后的点坐标数组
 */
function getPointGeometryCoordinates(geometry: Geometry): [number, number][] {
  if (geometry.type === 'Point') {
    return isLngLatCoordinate(geometry.coordinates) ? [geometry.coordinates] : [];
  }

  if (geometry.type === 'MultiPoint') {
    return geometry.coordinates.filter(isLngLatCoordinate);
  }

  return [];
}

/**
 * 使用同一个原始屏幕指针计算其在真实要素几何上的最近投影。
 * 点要素返回最近顶点，线和面边界返回最近线段投影；不支持或空几何返回 null。
 * @param map 当前地图实例
 * @param pointer 原始鼠标屏幕坐标
 * @param feature 当前真实渲染要素
 * @returns 最近投影的经纬度、屏幕坐标和指针距离
 */
function resolveFeatureProjection(
  map: MaplibreMap,
  pointer: ScreenPoint,
  feature: SnapFeatureLike
): FeatureProjection | null {
  let nearest: FeatureProjection | null = null;

  /** 按距离保留更近的投影点。 */
  const consider = (coordinate: [number, number], point: ScreenPoint): void => {
    const distancePx = getScreenDistance(pointer, point);
    if (!nearest || distancePx < nearest.distancePx) {
      nearest = { coordinate, point, distancePx };
    }
  };

  const geometryType = resolveFeatureGeometryType(feature);
  if (geometryType === 'Point') {
    getPointGeometryCoordinates(feature.geometry).forEach((coordinate) => {
      consider(coordinate, projectCoordinate(map, coordinate));
    });
    return nearest;
  }

  const paths = geometryType === 'LineString'
    ? getLineGeometryPaths(feature.geometry)
    : geometryType === 'Polygon'
      ? getPolygonGeometryPaths(feature.geometry)
      : [];
  paths.forEach((path) => {
    if (path.length === 1) {
      consider(path[0], projectCoordinate(map, path[0]));
      return;
    }
    for (let index = 0; index < path.length - 1; index += 1) {
      const projected = projectPointToScreenSegment(
        pointer,
        projectCoordinate(map, path[index]),
        projectCoordinate(map, path[index + 1])
      ).point;
      const lngLat = map.unproject([projected.x, projected.y]);
      consider([lngLat.lng, lngLat.lat], projected);
    }
  });
  return nearest;
}

/**
 * 将候选渲染要素几何类型归一化为规则层可判断的三大类。
 * @param feature 当前候选渲染要素
 * @returns 归一化后的几何类型；不支持时返回 null
 */
function resolveFeatureGeometryType(feature: SnapFeatureLike): MapFeatureSnapGeometryType | null {
  const geometryType = feature.geometry?.type;
  if (geometryType === 'Point' || geometryType === 'MultiPoint') {
    return 'Point';
  }

  if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
    return 'LineString';
  }

  if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
    return 'Polygon';
  }

  return null;
}

/**
 * 计算点类候选要素的最佳顶点吸附结果。
 * @param map 当前地图实例
 * @param pointerPoint 当前鼠标屏幕点
 * @param feature 当前候选要素
 * @param rule 当前规则
 * @param layerId 当前候选图层 ID
 * @param tolerancePx 当前候选查询范围
 * @returns 当前候选要素的最佳点吸附结果；未命中返回空数组
 */
function buildPointCandidates(
  map: MaplibreMap,
  pointerPoint: ScreenPoint,
  feature: SnapFeatureLike,
  rule: ResolvedMapFeatureSnapRule,
  layerId: string,
  tolerancePx = getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX)
): SnapCandidate[] {
  const featureGeometryType = resolveFeatureGeometryType(feature);
  if (featureGeometryType !== 'Point') {
    return [];
  }

  const snapModes = getResolvedSnapModes(rule, featureGeometryType);
  if (!snapModes.includes('vertex')) {
    return [];
  }

  const candidates: SnapCandidate[] = [];

  getPointGeometryCoordinates(feature.geometry).forEach((coordinate) => {
    const projectedCoordinate = projectCoordinate(map, coordinate);
    const distancePx = getScreenDistance(pointerPoint, projectedCoordinate);

    if (distancePx > tolerancePx) {
      return;
    }

    candidates.push({
      rule,
      feature,
      layerId,
      sourceId: getFeatureSourceId(feature),
      coordinate,
      distancePx,
      snapKind: 'vertex',
      segment: null,
      parents: [],
    });
  });

  return candidates;
}

/**
 * 计算线类或面类候选要素的最佳吸附结果。
 * @param map 当前地图实例
 * @param pointerPoint 当前鼠标屏幕点
 * @param feature 当前候选要素
 * @param rule 当前规则
 * @param layerId 当前候选图层 ID
 * @param tolerancePx 当前候选查询范围
 * @returns 当前候选要素的候选吸附结果集合
 */
function buildPathCandidates(
  map: MaplibreMap,
  pointerPoint: ScreenPoint,
  feature: SnapFeatureLike,
  rule: ResolvedMapFeatureSnapRule,
  layerId: string,
  tolerancePx = getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX)
): SnapCandidate[] {
  const featureGeometryType = resolveFeatureGeometryType(feature);
  if (featureGeometryType !== 'LineString' && featureGeometryType !== 'Polygon') {
    return [];
  }

  const snapModes = getResolvedSnapModes(rule, featureGeometryType);
  if (!snapModes.length) {
    return [];
  }

  const paths =
    featureGeometryType === 'LineString'
      ? getLineGeometryPaths(feature.geometry)
      : getPolygonGeometryPaths(feature.geometry);

  const candidates: SnapCandidate[] = [];

  paths.forEach((path, pathIndex) => {
    if (path.length < 1) {
      return;
    }

    if (snapModes.includes('vertex')) {
      path.forEach((coordinate) => {
        const projectedCoordinate = projectCoordinate(map, coordinate);
        const distancePx = getScreenDistance(pointerPoint, projectedCoordinate);

        if (distancePx > tolerancePx) {
          return;
        }

        candidates.push({
          rule,
          feature,
          layerId,
          sourceId: getFeatureSourceId(feature),
          coordinate,
          distancePx,
          snapKind: 'vertex',
          segment: null,
          parents: [],
        });
      });
    }

    if (snapModes.includes('segment')) {
      for (let segmentIndex = 0; segmentIndex < path.length - 1; segmentIndex += 1) {
        const startCoordinate = path[segmentIndex];
        const endCoordinate = path[segmentIndex + 1];
        const projectedStart = projectCoordinate(map, startCoordinate);
        const projectedEnd = projectCoordinate(map, endCoordinate);
        const projectedPoint = projectPointToScreenSegment(
          pointerPoint,
          projectedStart,
          projectedEnd
        ).point;
        const distancePx = getScreenDistance(pointerPoint, projectedPoint);

        if (distancePx > tolerancePx) {
          continue;
        }

        const projectedLngLat = map.unproject([projectedPoint.x, projectedPoint.y]);
        candidates.push({
          rule,
          feature,
          layerId,
          sourceId: getFeatureSourceId(feature),
          coordinate: [projectedLngLat.lng, projectedLngLat.lat],
          distancePx,
          snapKind: 'segment',
          segment: {
            pathIndex,
            ringIndex: pathIndex,
            segmentIndex,
            startCoordinate,
            endCoordinate,
          },
          parents: [],
        });
      }
    }
  });

  return candidates;
}

/**
 * 比较两个候选吸附结果的优先级。
 * @param current 当前候选
 * @param next 新候选
 * @returns next 是否应该替换 current
 */
function shouldReplaceCandidate(current: SnapCandidate | null, next: SnapCandidate): boolean {
  if (!current) {
    return true;
  }

  const currentPriority = current.rule.priority ?? 0;
  const nextPriority = next.rule.priority ?? 0;

  if (nextPriority !== currentPriority) {
    return nextPriority > currentPriority;
  }

  const currentDiscrete = current.snapKind !== 'segment';
  const nextDiscrete = next.snapKind !== 'segment';
  if (nextDiscrete !== currentDiscrete) {
    return nextDiscrete;
  }

  if (next.distancePx !== current.distancePx) {
    return next.distancePx < current.distancePx;
  }

  return createCandidateKey(next).localeCompare(createCandidateKey(current)) < 0;
}

/**
 * 创建距离和优先级完全相同时使用的稳定候选 key。
 * @param candidate 当前候选
 * @returns 按种类、规则和坐标组成的稳定 key
 */
function createCandidateKey(candidate: SnapCandidate): string {
  const kindOrder: Record<MapFeatureSnapKind, number> = {
    vertex: 0,
    sameLayerIntersect: 1,
    crossLayerIntersect: 2,
    segment: 3,
  };
  return [
    kindOrder[candidate.snapKind],
    candidate.rule.id,
    createFeatureCandidateKey(candidate)
      ?? `${candidate.sourceId ?? ''}:${candidate.feature.sourceLayer ?? ''}:${candidate.layerId}:${JSON.stringify(candidate.feature.geometry)}`,
    candidate.coordinate[0],
    candidate.coordinate[1],
  ].join(':');
}

/**
 * 创建系统生成的业务吸附规则 ID。
 * @param rule 原始规则
 * @param index 当前规则序号
 * @returns 稳定规则 ID
 */
export function createGeneratedRuleId(rule: MapFeatureSnapRule, index: number): string {
  const layerKey = rule.layerIds.length ? rule.layerIds.join(',') : `rule-${index}`;
  return `business-layer:${index}:${layerKey}`;
}

/**
 * 归一化业务规则，补齐系统生成 ID。
 * @param rules 原始规则集合
 * @returns 已补齐 ID 的规则集合
 */
function normalizeSnapRules(rules: MapFeatureSnapRule[]): ResolvedMapFeatureSnapRule[] {
  return rules.map((rule, index) => ({
    ...rule,
    id: rule.id || createGeneratedRuleId(rule, index),
  }));
}

/**
 * 安全读取单条规则当前是否启用且可见。
 * @param rule 当前规则
 * @returns 规则允许运行期查询时返回 true
 */
function isRuleAvailable(rule: ResolvedMapFeatureSnapRule): boolean {
  if (rule.enabled === false) {
    return false;
  }
  if (!rule.isVisible) {
    return true;
  }

  try {
    return rule.isVisible() !== false;
  } catch (error) {
    // 显隐 resolver 属于外部配置，异常时关闭当前规则，避免吸附到状态不明的数据。
    console.error(`[MapFeatureSnap] 吸附规则 '${rule.id}' isVisible 执行失败，已跳过当前规则`, error);
    return false;
  }
}

/**
 * 判断普通单规则候选是否命中当前会话作用域。
 * @param ruleId 当前候选规则 ID
 * @param ruleScope 当前作用域；null 表示全局
 * @returns 是否允许参与查询
 */
function isRuleInScope(ruleId: string, ruleScope: ReadonlySet<string> | null): boolean {
  return ruleScope === null || ruleScope.has(ruleId);
}

/**
 * 将完整 resolver 要素补成现有候选过滤逻辑可消费的 MapLibre 要素形状。
 * @param resolved 完整 resolver 输出
 * @returns 带 source 和 layer 元数据的内存要素
 */
function toSnapFeature(
  resolved: MapFeatureSnapResolvedFeature
): SnapFeatureLike {
  return {
    ...resolved.feature,
    source: resolved.sourceId,
    ...(resolved.sourceLayer ? { sourceLayer: resolved.sourceLayer } : {}),
    layer: { id: resolved.layerId },
  } as SnapFeatureLike;
}

/**
 * 从最新 options 解析交点索引使用的全部业务规则和完整线要素。
 * @param map 当前地图实例
 * @param options 当前 snap 配置
 * @returns 可传给静态交点 store 的规则集合
 */
function resolveIntersectionRules(
  map: MaplibreMap,
  options: MapFeatureSnapOptions | null | undefined
): SnapIntersectionRule[] {
  const resolver = options?.intersectionFeatureResolver;
  const businessLayers = options?.businessLayers;
  if (!resolver || businessLayers?.enabled === false || !businessLayers?.rules?.length) {
    return [];
  }

  return normalizeSnapRules(businessLayers.rules).flatMap((rule) => {
    const hasIntersectionMode = rule.snapTo?.some((mode) => (
      mode === 'sameLayerIntersect' || mode === 'crossLayerIntersect'
    ));
    if (!hasIntersectionMode || (
      rule.geometryTypes?.length && !rule.geometryTypes.includes('LineString')
    )) {
      return [];
    }

    try {
      const resolvedFeatures = resolver(rule, { zoom: map.getZoom() }).filter((resolved) => {
        const feature = toSnapFeature(resolved);
        return matchesRuleFilter(map, feature as MapGeoJSONFeature, rule, resolved.layerId);
      });
      return [{ ...rule, resolvedFeatures }];
    } catch (error) {
      console.error(`[MapFeatureSnap] 吸附规则 '${rule.id}' 完整线要素解析失败，已跳过当前规则`, error);
      return [];
    }
  });
}

/**
 * 创建同一交点节点内父线的稳定身份。
 * @param parent 当前交点父线
 * @returns 不包含附着方式的父线身份，用于同一节点优先保留真实证据
 */
function createIntersectionParentIdentity(parent: MapFeatureSnapParent): string {
  return createDecisionKey({
    ruleId: parent.ruleId,
    sourceId: parent.sourceId,
    sourceLayer: parent.sourceLayer,
    layerId: parent.layerId,
    feature: parent.feature as SnapFeatureLike,
    coordinate: parent.geometryCoordinate ?? [Number.NaN, Number.NaN],
    segment: parent.segment ?? null,
  });
}

/**
 * 为单个交点节点创建完整参与者和当前 scope 可选目标。
 * @param map 当前地图实例
 * @param pointerPoint 当前鼠标屏幕坐标
 * @param point 当前唯一交点节点
 * @param ruleMap 最新规则表
 * @param ruleScope 当前会话 target 作用域
 * @param paddingPx 交点相对基础 tolerance 的额外捕获范围
 * @returns participant 完整且 target 已按 scope 与捕获范围筛选的候选
 */
function buildIntersectionCandidates(
  map: MaplibreMap,
  pointerPoint: ScreenPoint,
  point: SnapIntersectionPoint,
  ruleMap: Map<string, ResolvedMapFeatureSnapRule>,
  ruleScope: ReadonlySet<string> | null,
  paddingPx: number
): SnapCandidate[] {
  const projected = projectCoordinate(map, point.coordinate);
  const distancePx = getScreenDistance(pointerPoint, projected);
  const validPairs = point.pairs.filter((pair) => {
    const firstRule = ruleMap.get(pair.first.ruleId);
    const secondRule = ruleMap.get(pair.second.ruleId);
    return Boolean(
      firstRule
      && secondRule
      && isRuleAvailable(firstRule)
      && isRuleAvailable(secondRule)
    );
  });
  if (!validPairs.length) {
    return [];
  }

  const parentMap = new Map<string, MapFeatureSnapParent>();
  validPairs.flatMap((pair) => [pair.first, pair.second]).forEach((parent) => {
    const key = createIntersectionParentIdentity(parent);
    const current = parentMap.get(key);
    // 同一父线同时存在真实和延长证据时，真实附着是更强证据。
    if (!current || (current.attachment === 'extended' && parent.attachment === 'real')) {
      parentMap.set(key, parent);
    }
  });
  const parents = [...parentMap.values()].sort((left, right) => (
    createIntersectionParentIdentity(left).localeCompare(createIntersectionParentIdentity(right))
  ));
  const snapKind = validPairs.some((pair) => pair.kind === 'crossLayerIntersect')
    ? 'crossLayerIntersect'
    : 'sameLayerIntersect';

  return parents.flatMap((parent) => {
    const rule = ruleMap.get(parent.ruleId);
    if (!rule || !isRuleInScope(rule.id, ruleScope)) {
      return [];
    }
    if (distancePx > getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX) + paddingPx) {
      return [];
    }
    const feature = toSnapFeature({
      feature: parent.feature,
      sourceId: parent.sourceId ?? '',
      ...(parent.sourceLayer ? { sourceLayer: parent.sourceLayer } : {}),
      layerId: parent.layerId ?? '',
    });
    return [{
      rule,
      feature,
      layerId: parent.layerId ?? '',
      sourceId: parent.sourceId,
      coordinate: parent.geometryCoordinate
        ? [...parent.geometryCoordinate]
        : [Number.NaN, Number.NaN],
      snapCoordinate: [...point.coordinate],
      distancePx,
      snapKind,
      segment: parent.segment ?? null,
      parents,
      attachment: parent.attachment ?? 'real',
    }];
  });
}

/**
 * 从 KDBush 查询鼠标容差范围内的交点候选。
 * @param map 当前地图实例
 * @param store 当前静态交点 store
 * @param rules 当前最新规则集合
 * @param pointer 当前鼠标上下文
 * @param ruleScope 当前会话作用域
 * @param paddingPx 交点相对基础 tolerance 的额外捕获范围
 * @returns 附近交点候选
 */
function resolveIntersectionCandidates(
  map: MaplibreMap,
  store: ReturnType<typeof createSnapIntersectionStore>,
  rules: ResolvedMapFeatureSnapRule[],
  pointer: ResolvePointerOptions,
  ruleScope: ReadonlySet<string> | null,
  paddingPx: number
): SnapCandidate[] {
  const availableRules = rules.filter(isRuleAvailable);
  if (!availableRules.length || store.size() === 0) {
    return [];
  }

  const maxTolerancePx = availableRules.reduce((maxTolerance, rule) => {
    return Math.max(
      maxTolerance,
      getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX) + paddingPx
    );
  }, 0);
  const screenCorners: Array<[number, number]> = [
    [pointer.point.x - maxTolerancePx, pointer.point.y - maxTolerancePx],
    [pointer.point.x + maxTolerancePx, pointer.point.y - maxTolerancePx],
    [pointer.point.x + maxTolerancePx, pointer.point.y + maxTolerancePx],
    [pointer.point.x - maxTolerancePx, pointer.point.y + maxTolerancePx],
  ];
  const lngLatCorners = screenCorners.map((corner) => map.unproject(corner));
  const lngList = lngLatCorners.map((corner) => corner.lng);
  const latList = lngLatCorners.map((corner) => corner.lat);
  const ruleMap = new Map(rules.map((rule) => [rule.id, rule]));

  return store.range(
    Math.min(...lngList),
    Math.min(...latList),
    Math.max(...lngList),
    Math.max(...latList)
  ).flatMap((point) => {
    return buildIntersectionCandidates(
      map,
      pointer.point,
      point,
      ruleMap,
      ruleScope,
      paddingPx
    );
  });
}

/**
 * 根据规则和候选要素列表解析当前指针范围内的普通候选。
 * @param map 当前地图实例
 * @param rules 当前启用的规则集合
 * @param pointer 当前鼠标指针上下文
 * @param paddingPx 候选查询在正常吸附范围外增加的像素余量
 * @returns 当前查询范围内的普通候选
 */
function resolveSnapCandidates(
  map: MaplibreMap,
  rules: ResolvedMapFeatureSnapRule[],
  pointer: ResolvePointerOptions,
  ruleScope: ReadonlySet<string> | null,
  paddingPx: number
): SnapCandidate[] {
  if (!rules.length) {
    return [];
  }

  const availableLayerIds = [
    ...new Set(
      rules
        .flatMap((rule) => rule.layerIds)
        .filter((layerId) => typeof layerId === 'string' && Boolean(map.getLayer(layerId)))
    ),
  ];

  const maxTolerancePx = rules.reduce((maxTolerance, rule) => {
    return Math.max(
      maxTolerance,
      getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX) + paddingPx
    );
  }, 0);

  const bbox = [
    [pointer.point.x - maxTolerancePx, pointer.point.y - maxTolerancePx],
    [pointer.point.x + maxTolerancePx, pointer.point.y + maxTolerancePx],
  ] as [[number, number], [number, number]];

  const candidateFeatures = availableLayerIds.length
    ? map.queryRenderedFeatures(bbox, { layers: availableLayerIds }) as MapGeoJSONFeature[]
    : [];

  const resolvedCandidates: SnapCandidate[] = [];

  rules.forEach((rule) => {
    if (!isRuleAvailable(rule) || !isRuleInScope(rule.id, ruleScope)) {
      return;
    }

    candidateFeatures.forEach((feature) => {
      const layerId = feature.layer?.id;
      if (!layerId || !rule.layerIds.includes(layerId)) {
        return;
      }

      const featureGeometryType = resolveFeatureGeometryType(feature);
      if (!featureGeometryType) {
        return;
      }

      if (rule.geometryTypes?.length && !rule.geometryTypes.includes(featureGeometryType)) {
        return;
      }

      if (!matchesRuleFilter(map, feature, rule, layerId)) {
        return;
      }

      const queryTolerancePx = getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX) + paddingPx;
      const candidates =
        featureGeometryType === 'Point'
          ? buildPointCandidates(map, pointer.point, feature, rule, layerId, queryTolerancePx)
          : buildPathCandidates(map, pointer.point, feature, rule, layerId, queryTolerancePx);

      resolvedCandidates.push(...candidates);
    });
  });

  return resolvedCandidates;
}

/**
 * 读取候选真实要素的稳定身份，用于合并同一要素的多个顶点或线段命中。
 * @param candidate 当前内部候选
 * @returns source、source-layer 与真实要素 ID 组成的身份键；无稳定 ID 时返回 null
 */
function createFeatureCandidateKey(candidate: SnapCandidate): string | null {
  const sourceId = candidate.sourceId ?? candidate.feature.source;
  const featureId = candidate.feature.id;
  if (!sourceId || featureId === null || featureId === undefined || featureId === '') {
    return null;
  }
  return [
    sourceId,
    candidate.feature.sourceLayer ?? '',
    featureId,
  ].join(':');
}

/**
 * 比较同一业务 feature 的不同渲染切片，确保代表切片不依赖查询输入顺序。
 * @param first 第一个渲染切片候选
 * @param second 第二个渲染切片候选
 * @returns first 更优时小于 0，second 更优时大于 0，完全等价时返回 0
 */
function compareNearbyAlternatives(
  first: NearbyAlternative,
  second: NearbyAlternative
): number {
  return first.projection.distancePx - second.projection.distancePx
    || first.meterGap - second.meterGap
    || first.projection.coordinate[0] - second.projection.coordinate[0]
    || first.projection.coordinate[1] - second.projection.coordinate[1]
    || first.candidate.distancePx - second.candidate.distancePx
    || createCandidateKey(first.candidate).localeCompare(createCandidateKey(second.candidate));
}

/**
 * 按当前配置解析与主候选难以稳定区分的真实要素集合。
 * @param map 当前地图实例
 * @param primary 正常吸附范围内选出的主候选
 * @param candidates 扩大查询范围得到的普通候选
 * @param pointer 当前原始鼠标指针
 * @param nearbyOptions 已归一化的近邻候选配置
 * @returns 主候选固定在首位的稳定候选集合
 */
function resolveNearbyCandidates(
  map: MaplibreMap,
  primary: SnapCandidate,
  candidates: SnapCandidate[],
  pointer: ResolvePointerOptions,
  nearbyOptions: ResolvedNearbyOptions
): SnapCandidate[] {
  if (!nearbyOptions.enabled) {
    return [primary];
  }
  // 近邻归组只解决当前视图下难以区分的真实 Path；Point、Polygon 和运行时 Arrow 保持单主候选。
  if (resolveFeatureGeometryType(primary.feature) !== 'LineString') {
    return [primary];
  }
  if (primary.parents.length) {
    return [primary];
  }

  const effectiveTolerancePx = getResolvedTolerancePx(primary.rule, DEFAULT_TOLERANCE_PX);
  const nearbyTolerancePx = effectiveTolerancePx + nearbyOptions.paddingPx;
  const primaryProjection = resolveFeatureProjection(map, pointer.point, primary.feature);
  if (!primaryProjection || primaryProjection.distancePx > effectiveTolerancePx) {
    return [primary];
  }
  const projectedPrimary: SnapCandidate = {
    ...primary,
    coordinate: primaryProjection.coordinate,
    distancePx: primaryProjection.distancePx,
  };
  const primaryFeatureKey = createFeatureCandidateKey(primary);
  const alternatives = new Map<string, NearbyAlternative>();
  const projectionByFeature = new WeakMap<SnapFeatureLike, FeatureProjection | null>();

  candidates.forEach((candidate) => {
    const featureKey = createFeatureCandidateKey(candidate);
    if (!featureKey
      || candidate.feature === primary.feature
      || (primaryFeatureKey !== null && featureKey === primaryFeatureKey)) {
      return;
    }
    // 同一渲染切片可能产生多个 vertex/segment 命中，但不同 geometry 切片必须分别投影。
    if (!projectionByFeature.has(candidate.feature)) {
      projectionByFeature.set(
        candidate.feature,
        resolveFeatureProjection(map, pointer.point, candidate.feature)
      );
    }
    const projection = projectionByFeature.get(candidate.feature);
    if (!projection || projection.distancePx > nearbyTolerancePx) {
      return;
    }
    const meterGap = getCoordinateDistanceMeters(
      primaryProjection.coordinate,
      projection.coordinate
    );
    const screenGapPx = getScreenDistance(primaryProjection.point, projection.point);
    if (meterGap > nearbyOptions.maxDistanceMeters || screenGapPx > nearbyTolerancePx) {
      return;
    }

    const current = alternatives.get(featureKey);
    const next = { candidate, projection, meterGap };
    if (!current || compareNearbyAlternatives(next, current) < 0) {
      alternatives.set(featureKey, next);
    }
  });

  const sortedAlternatives = [...alternatives.values()].sort((first, second) => (
    first.projection.distancePx - second.projection.distancePx
    || first.meterGap - second.meterGap
    || (createFeatureCandidateKey(first.candidate) ?? '')
      .localeCompare(createFeatureCandidateKey(second.candidate) ?? '')
    || createCandidateKey(first.candidate).localeCompare(createCandidateKey(second.candidate))
  ));
  return [
    projectedPrimary,
    ...sortedAlternatives.map(({ candidate, projection }) => ({
      ...candidate,
      coordinate: projection.coordinate,
      distancePx: projection.distancePx,
    })),
  ];
}

/** 只读 decision 坐标工厂。 */
function freezeCoordinate(coordinate: readonly [number, number]): readonly [number, number] {
  return Object.freeze([coordinate[0], coordinate[1]] as [number, number]);
}

/**
 * 复制公开 segment，避免 decision 暴露内部仍可修改的引用。
 * @param segment 原始 segment
 * @returns 只读语义下的独立 segment；无 segment 时返回 null
 */
function cloneSegment(segment: MapFeatureSnapSegmentInfo | null): MapFeatureSnapSegmentInfo | null {
  if (!segment) {
    return null;
  }
  return Object.freeze({
    pathIndex: segment.pathIndex,
    ringIndex: segment.ringIndex,
    segmentIndex: segment.segmentIndex,
    startCoordinate: [...segment.startCoordinate] as [number, number],
    endCoordinate: [...segment.endCoordinate] as [number, number],
  });
}

/**
 * 创建可区分同一要素不同几何位置的稳定 key。
 * @param value 目标或 participant 的身份与位置证据
 * @returns 包含来源、要素、坐标和 segment 位置的稳定 key
 */
function createDecisionKey(value: {
  ruleId: string;
  sourceId: string | null;
  sourceLayer?: string;
  layerId: string | null;
  feature: SnapFeatureLike;
  coordinate: readonly [number, number];
  segment: MapFeatureSnapSegmentInfo | null;
}): string {
  const featureIdentity = value.feature.id ?? JSON.stringify(value.feature.geometry);
  const segmentIdentity = value.segment
    ? `${value.segment.pathIndex}:${value.segment.segmentIndex}`
    : 'point';
  return [
    value.ruleId,
    value.sourceId ?? '',
    value.sourceLayer ?? '',
    value.layerId ?? '',
    featureIdentity,
    Number.isFinite(value.coordinate[0]) ? value.coordinate[0].toFixed(9) : String(value.coordinate[0]),
    Number.isFinite(value.coordinate[1]) ? value.coordinate[1].toFixed(9) : String(value.coordinate[1]),
    segmentIdentity,
  ].join(':');
}

/**
 * 将内部候选转换为 decision target。
 * @param candidate 当前内部候选
 * @returns 不暴露内部 rule 引用的不可变 target
 */
function toDecisionTarget(candidate: SnapCandidate): MapFeatureSnapTarget {
  const segment = cloneSegment(candidate.segment);
  const geometryCoordinate = freezeCoordinate(candidate.coordinate);
  return Object.freeze({
    key: createDecisionKey({
      ruleId: candidate.rule.id,
      sourceId: candidate.sourceId,
      sourceLayer: candidate.feature.sourceLayer,
      layerId: candidate.layerId,
      feature: candidate.feature,
      coordinate: candidate.coordinate,
      segment: candidate.segment,
    }),
    ruleId: candidate.rule.id,
    sourceId: candidate.sourceId,
    ...(candidate.feature.sourceLayer ? { sourceLayer: candidate.feature.sourceLayer } : {}),
    layerId: candidate.layerId,
    feature: candidate.feature,
    geometryCoordinate,
    attachment: candidate.attachment ?? 'real',
    segment,
    snapKind: candidate.snapKind,
    distancePx: candidate.distancePx,
  });
}

/**
 * 将交点兼容 parent 转换为规范 participant。
 * @param parent 当前交点父线
 * @returns 带真实附着位置的不可变 participant
 */
function toDecisionParticipant(parent: MapFeatureSnapParent): MapFeatureSnapParticipant {
  const coordinate = parent.geometryCoordinate ?? [Number.NaN, Number.NaN];
  const segment = cloneSegment(parent.segment ?? null);
  const feature = parent.feature as SnapFeatureLike;
  return Object.freeze({
    key: createDecisionKey({
      ruleId: parent.ruleId,
      sourceId: parent.sourceId,
      sourceLayer: parent.sourceLayer,
      layerId: parent.layerId,
      feature,
      coordinate,
      segment: parent.segment ?? null,
    }),
    ruleId: parent.ruleId,
    sourceId: parent.sourceId,
    ...(parent.sourceLayer ? { sourceLayer: parent.sourceLayer } : {}),
    layerId: parent.layerId,
    feature,
    geometryCoordinate: freezeCoordinate(coordinate),
    attachment: parent.attachment ?? 'real',
    segment,
  });
}

/** @returns 坐标两个分量是否都是有限数值。 */
function isFiniteCoordinate(coordinate: readonly [number, number]): boolean {
  return coordinate.every(Number.isFinite);
}

/**
 * 创建证据错误结果，明确阻断所有未命中 fallback。
 * @param reason 无法形成合法 decision 的原因
 * @returns matched=false 且 resolution=invalid 的结果
 */
function createInvalidMapFeatureSnapResult(
  reason: MapFeatureSnapInvalidReason
): MapFeatureSnapResult {
  return {
    ...createEmptyMapFeatureSnapResult(),
    resolution: { status: 'invalid', reason },
  };
}

/**
 * 比较同一 decision 中的目标，保证输入与渲染切片顺序不影响 primary。
 * @param relation 当前交互关系
 * @param left 左候选
 * @param right 右候选
 * @returns Array.sort 比较值
 */
function compareDecisionCandidates(
  relation: MapFeatureSnapRelation,
  left: SnapCandidate,
  right: SnapCandidate
): number {
  const priorityDiff = (right.rule.priority ?? 0) - (left.rule.priority ?? 0);
  if (priorityDiff) {
    return priorityDiff;
  }
  if (relation !== 'intersection') {
    const kindOrder: Record<MapFeatureSnapKind, number> = {
      vertex: 0,
      segment: 1,
      crossLayerIntersect: 2,
      sameLayerIntersect: 3,
    };
    const kindDiff = kindOrder[left.snapKind] - kindOrder[right.snapKind];
    if (kindDiff) {
      return kindDiff;
    }
  }
  return left.distancePx - right.distancePx
    || createDecisionKey({
      ruleId: left.rule.id,
      sourceId: left.sourceId,
      sourceLayer: left.feature.sourceLayer,
      layerId: left.layerId,
      feature: left.feature,
      coordinate: left.coordinate,
      segment: left.segment,
    }).localeCompare(createDecisionKey({
      ruleId: right.rule.id,
      sourceId: right.sourceId,
      sourceLayer: right.feature.sourceLayer,
      layerId: right.layerId,
      feature: right.feature,
      coordinate: right.coordinate,
      segment: right.segment,
    }));
}

/**
 * 将 decision target 投影为旧版候选字段。
 * @param target 当前规范 target
 * @param parents intersection 的兼容父线集合
 * @returns 完全由 decision 派生的兼容候选
 */
function toPublicCandidate(
  target: MapFeatureSnapTarget,
  parents: MapFeatureSnapParent[]
): MapFeatureSnapCandidate {
  const feature = target.feature as SnapFeatureLike;
  return {
    distancePx: target.distancePx,
    snapKind: target.snapKind,
    ruleId: target.ruleId,
    targetFeature: feature.layer ? (feature as MapGeoJSONFeature) : null,
    targetLayerId: target.layerId,
    targetSourceId: target.sourceId,
    targetCoordinate: [...target.geometryCoordinate],
    segment: cloneSegment(target.segment),
    parents,
  };
}

/**
 * 将主候选和同位置近邻候选转换为统一输出对象。
 * @param candidate 当前命中的最佳候选
 * @param candidates 当前指针位置的稳定候选集合
 * @returns 标准化后的吸附结果
 */
function toSnapResult(
  candidate: SnapCandidate | null,
  candidates: SnapCandidate[] = candidate ? [candidate] : [],
  relationOverride?: MapFeatureSnapRelation
): MapFeatureSnapResult {
  if (!candidate) {
    return createEmptyMapFeatureSnapResult();
  }

  const relation = relationOverride
    ?? (candidate.snapCoordinate ? 'intersection' : candidates.length > 1 ? 'nearby' : 'direct');
  const sortedCandidates = [...candidates].sort((left, right) => (
    compareDecisionCandidates(relation, left, right)
  ));
  const targetMap = new Map<string, MapFeatureSnapTarget>();
  sortedCandidates.forEach((item) => {
    const target = toDecisionTarget(item);
    if (!targetMap.has(target.key)) {
      targetMap.set(target.key, target);
    }
  });
  const targets = [...targetMap.values()];
  const participantMap = new Map<string, MapFeatureSnapParticipant>();
  if (relation === 'intersection') {
    candidate.parents.map(toDecisionParticipant).forEach((participant) => {
      const current = participantMap.get(participant.key);
      if (!current || (current.attachment === 'extended' && participant.attachment === 'real')) {
        participantMap.set(participant.key, participant);
      }
    });
  }
  const participants = [...participantMap.values()].sort((left, right) => left.key.localeCompare(right.key));
  const primary = targets[0];
  const snapCoordinate = freezeCoordinate(candidate.snapCoordinate ?? primary?.geometryCoordinate ?? candidate.coordinate);

  if (
    !primary
    || !isFiniteCoordinate(snapCoordinate)
    || targets.some((target) => (
      !isFiniteCoordinate(target.geometryCoordinate) || !Number.isFinite(target.distancePx)
    ))
    || participants.some((participant) => !isFiniteCoordinate(participant.geometryCoordinate))
  ) {
    return createInvalidMapFeatureSnapResult('non-finite-coordinate');
  }
  if (
    (relation === 'direct' && (targets.length !== 1 || participants.length !== 0))
    || (relation === 'nearby' && (targets.length < 2 || participants.length !== 0))
    || (relation === 'intersection' && (targets.length < 1 || participants.length < 2))
  ) {
    return createInvalidMapFeatureSnapResult(
      relation === 'intersection' ? 'incomplete-intersection-evidence' : 'invalid-cardinality'
    );
  }
  if (relation === 'intersection') {
    const participantKeys = new Set(participants.map((participant) => participant.key));
    if (targets.some((target) => !participantKeys.has(target.key))) {
      return createInvalidMapFeatureSnapResult('incomplete-intersection-evidence');
    }
  }

  const decision: MapFeatureSnapDecision = Object.freeze({
    relation,
    snapKind: candidate.snapKind,
    snapCoordinate,
    primaryTargetKey: primary.key,
    targets: Object.freeze(targets),
    participants: Object.freeze(participants),
  });
  const parents: MapFeatureSnapParent[] = decision.participants.map((participant) => ({
    ruleId: participant.ruleId,
    sourceId: participant.sourceId,
    ...(participant.sourceLayer ? { sourceLayer: participant.sourceLayer } : {}),
    layerId: participant.layerId,
    feature: participant.feature as MapFeatureSnapParent['feature'],
    attachment: participant.attachment,
    geometryCoordinate: [...participant.geometryCoordinate],
    segment: cloneSegment(participant.segment),
  }));
  const primaryFeature = primary.feature as SnapFeatureLike;
  return {
    resolution: { status: 'matched', decision },
    matched: true,
    lngLat: {
      lng: decision.snapCoordinate[0],
      lat: decision.snapCoordinate[1],
    },
    distancePx: primary.distancePx,
    snapKind: decision.snapKind,
    ruleId: primary.ruleId,
    targetFeature: primaryFeature.layer ? (primaryFeature as MapGeoJSONFeature) : null,
    targetLayerId: primary.layerId,
    targetSourceId: primary.sourceId,
    targetCoordinate: [...primary.geometryCoordinate],
    anchorCoordinate: [...decision.snapCoordinate],
    segment: cloneSegment(primary.segment),
    parents,
    candidates: decision.targets.map((target) => toPublicCandidate(target, parents)),
  };
}

/**
 * 判断当前吸附插件是否启用。
 * @param options 地图吸附插件配置
 * @returns 是否启用
 */
function isSnapPluginEnabled(options: MapFeatureSnapOptions | null | undefined): boolean {
  return Boolean(options) && options?.enabled !== false;
}

/**
 * 判断内置吸附目标是否启用。
 * @param targetOptions 内置吸附目标配置
 * @returns 是否启用
 */
function isBuiltInTargetEnabled(
  targetOptions: MapFeatureSnapOptions['intersection'] | MapFeatureSnapOptions['polygonEdge']
): boolean {
  if (targetOptions === false) {
    return false;
  }

  if (targetOptions && typeof targetOptions === 'object') {
    return targetOptions.enabled !== false;
  }

  return true;
}

/**
 * 读取内置吸附目标的局部覆写配置。
 * @param targetOptions 内置吸附目标配置
 * @returns 局部覆写配置
 */
function getBuiltInTargetPatch(
  targetOptions: MapFeatureSnapOptions['intersection'] | MapFeatureSnapOptions['polygonEdge']
) {
  return targetOptions && typeof targetOptions === 'object' ? targetOptions : {};
}

/**
 * 创建交点图层内置吸附规则。
 * 插件内部交点点位默认可被吸附，业务层可通过 snap.intersection 显式关闭或调整规则。
 *
 * @param options 地图吸附插件配置
 * @returns 交点预览层与正式点层的内置吸附规则
 */
function createBuiltInIntersectionSnapRules(
  options: MapFeatureSnapOptions | null | undefined
): MapFeatureSnapRule[] {
  if (!isBuiltInTargetEnabled(options?.intersection)) {
    return [];
  }

  const targetPatch = getBuiltInTargetPatch(options?.intersection);
  const snapTo: MapFeatureSnapMode[] =
    targetPatch.snapTo?.includes('vertex') === false ? [] : ['vertex'];
  if (!snapTo.length) {
    return [];
  }

  return [
    {
      id: 'intersection-preview-snap',
      layerIds: [INTERSECTION_PREVIEW_LAYER_ID],
      priority: targetPatch.priority ?? INTERSECTION_PREVIEW_SNAP_PRIORITY,
      tolerancePx: targetPatch.tolerancePx,
      geometryTypes: ['Point'],
      snapTo,
    },
    {
      id: 'intersection-materialized-snap',
      layerIds: [INTERSECTION_MATERIALIZED_LAYER_ID],
      priority: targetPatch.priority ?? INTERSECTION_MATERIALIZED_SNAP_PRIORITY,
      tolerancePx: targetPatch.tolerancePx,
      geometryTypes: ['Point'],
      snapTo,
    },
  ];
}

/**
 * 创建面边线图层内置吸附规则。
 * @param options 地图吸附插件配置
 * @returns 面边线插件临时线图层的内置吸附规则
 */
function createBuiltInPolygonEdgeSnapRules(
  options: MapFeatureSnapOptions | null | undefined
): MapFeatureSnapRule[] {
  if (!isBuiltInTargetEnabled(options?.polygonEdge)) {
    return [];
  }

  const targetPatch = getBuiltInTargetPatch(options?.polygonEdge);
  const snapTo = targetPatch.snapTo?.length ? targetPatch.snapTo : DEFAULT_SNAP_MODES;
  return [
    {
      id: 'polygon-edge-preview-snap',
      layerIds: [POLYGON_EDGE_PREVIEW_LAYER_ID],
      priority: targetPatch.priority ?? POLYGON_EDGE_SNAP_PRIORITY,
      tolerancePx: targetPatch.tolerancePx,
      geometryTypes: ['LineString'],
      snapTo,
    },
  ];
}

/**
 * 读取当前启用的普通图层吸附规则集合。
 * @param options 地图吸附插件配置
 * @returns 当前启用的规则集合
 */
function getSnapRules(
  options: MapFeatureSnapOptions | null | undefined
): MapFeatureSnapRule[] {
  if (!isSnapPluginEnabled(options)) {
    return [];
  }

  const builtInRules = [
    ...createBuiltInIntersectionSnapRules(options),
    ...createBuiltInPolygonEdgeSnapRules(options),
  ];
  const businessLayerOptions = options?.businessLayers;
  if (!businessLayerOptions?.rules?.length) {
    return builtInRules;
  }

  if (businessLayerOptions.enabled === false) {
    return builtInRules;
  }

  return [
    ...businessLayerOptions.rules,
    ...builtInRules,
  ];
}

/**
 * 读取当前运行期启用的普通图层吸附规则集合。
 * @param options 地图吸附插件配置
 * @returns 已排除显式关闭规则的集合
 */
function getEnabledSnapRules(
  options: MapFeatureSnapOptions | null | undefined
): MapFeatureSnapRule[] {
  return getSnapRules(options).filter((rule) => rule.enabled !== false);
}

/**
 * 根据吸附结果构建预览图层数据源。
 * @param result 当前吸附结果
 * @returns 可直接喂给 GeoJSONSource 的预览数据
 */
export function buildPreviewData(
  result: MapFeatureSnapResult
): PreviewFeatureCollection {
  const previewCoordinate = result.resolution.status === 'matched'
    ? result.resolution.decision.snapCoordinate
    : null;
  if (!result.matched || !previewCoordinate) {
    return createEmptyPreviewFeatureCollection();
  }

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 'map-feature-snap-preview-point',
      properties: { kind: 'point' },
      geometry: {
        type: 'Point',
        coordinates: [...previewCoordinate],
      },
    }],
  };
}

/**
 * 从给定要素集合中解析吸附结果。
 * 该函数用于 TerraDraw 已绘制要素等非 MapLibre 渲染图层的候选吸附。
 *
 * @param options 解析上下文
 * @returns 吸附结果
 */
export function resolveFeatureSnapResult(options: {
  map: MaplibreMap;
  pointer: ResolvePointerOptions;
  rule: MapFeatureSnapRule;
  features: SnapFeatureLike[];
}): MapFeatureSnapResult {
  const normalizedRule = normalizeSnapRules([options.rule])[0];
  const ruleWithTolerance: ResolvedMapFeatureSnapRule = {
    ...normalizedRule,
    tolerancePx: getResolvedTolerancePx(normalizedRule, DEFAULT_TOLERANCE_PX),
  };
  const candidates = options.features.flatMap((feature) => {
    const layerId = feature.layer?.id || options.rule.layerIds[0] || '__feature_snap__';
    const featureGeometryType = resolveFeatureGeometryType(feature);

    if (!featureGeometryType) {
      return [];
    }

    if (
      ruleWithTolerance.geometryTypes?.length &&
      !ruleWithTolerance.geometryTypes.includes(featureGeometryType)
    ) {
      return [];
    }

    if (!matchesRuleWhere(feature, ruleWithTolerance)) {
      return [];
    }

    return featureGeometryType === 'Point'
      ? buildPointCandidates(options.map, options.pointer.point, feature, ruleWithTolerance, layerId)
      : buildPathCandidates(options.map, options.pointer.point, feature, ruleWithTolerance, layerId);
  });

  const bestCandidate = candidates.reduce<SnapCandidate | null>((current, next) => {
    return shouldReplaceCandidate(current, next) ? next : current;
  }, null);

  return toSnapResult(bestCandidate);
}

/**
 * 创建统一地图吸附绑定。
 * @param options 绑定初始化参数
 * @returns 吸附绑定句柄
 */
export function createMapFeatureSnapBinding(options: {
  map: MaplibreMap;
  getOptions: () => MapFeatureSnapOptions | null | undefined;
  getRuleScope?: () => readonly string[] | null | undefined;
}): MapFeatureSnapBinding {
  const { map, getOptions } = options;
  const previewData = ref<PreviewFeatureCollection>(createEmptyPreviewFeatureCollection());
  const intersectionStore = createSnapIntersectionStore();
  const activeStateTargets = new Map<string, MapFeatureSnapStateTarget>();
  let activeTargetStyle: SnapPreviewTargetStyle | null = null;

  /**
   * 从吸附结果读取可写入 MapLibre feature-state 的真实目标。
   * @param result 当前吸附结果
   * @returns 按 source、source-layer 和真实 feature ID 去重后的目标
   */
  function resolveStateTargets(result: MapFeatureSnapResult): Map<string, MapFeatureSnapStateTarget> {
    const targets = new Map<string, MapFeatureSnapStateTarget>();
    /**
     * 将具备真实 source 和 feature ID 的目标加入去重集合。
     * @param source MapLibre source ID
     * @param id MapLibre 顶层 feature ID
     * @param sourceLayer vector source 对应的 source-layer
     */
    const appendTarget = (
      source: string | null | undefined,
      id: string | number | null | undefined,
      sourceLayer?: string
    ): void => {
      if (!source || id === null || id === undefined || id === '') {
        return;
      }
      const target = { source, id, ...(sourceLayer ? { sourceLayer } : {}) };
      targets.set(`${source}:${sourceLayer ?? ''}:${String(id)}`, target);
    };

    const candidates = result.candidates?.length ? result.candidates : null;
    if (candidates) {
      candidates.forEach((candidate) => {
        if (candidate.parents.length) {
          candidate.parents.forEach((parent) => {
            appendTarget(parent.sourceId, parent.feature.id, parent.sourceLayer);
          });
          return;
        }
        appendTarget(
          candidate.targetSourceId ?? candidate.targetFeature?.source,
          candidate.targetFeature?.id,
          candidate.targetFeature?.sourceLayer
        );
      });
    } else if (result.parents?.length) {
      result.parents.forEach((parent) => {
        appendTarget(parent.sourceId, parent.feature.id, parent.sourceLayer);
      });
    } else {
      appendTarget(
        result.targetSourceId ?? result.targetFeature?.source,
        result.targetFeature?.id,
        result.targetFeature?.sourceLayer
      );
    }

    getOptions()?.stateTargetResolver?.(result).forEach((target) => {
      appendTarget(target.source, target.id, target.sourceLayer);
    });
    return targets;
  }

  /**
   * 安全写入单个吸附预览状态。
   * source 在样式切换期间可能暂时不存在，此时等待 style/source 事件补写。
   * @param target MapLibre feature-state 目标
   * @param enabled 是否高亮
   * @param style 吸附目标样式；清理状态时传 null
   */
  function writeState(
    target: MapFeatureSnapStateTarget,
    enabled: boolean,
    style: SnapPreviewTargetStyle | null
  ): void {
    try {
      map.setFeatureState(target, {
        snapPreview: enabled,
        snapPreviewColor: style?.color ?? null,
        snapPreviewOpacity: style?.opacity ?? null,
        snapPreviewLineWidth: style?.lineWidth ?? null,
        snapPreviewPointRadius: style?.pointRadius ?? null,
      });
    } catch {
      // style/source 合并期间目标可能短暂不可用，后续地图数据事件会再次补写。
    }
  }

  /**
   * 将最新吸附结果切换为原要素状态预览。
   * @param result 当前吸附结果
   * @param style 当前目标样式覆写
   */
  function syncStateTargets(result: MapFeatureSnapResult, style: SnapPreviewTargetStyle): void {
    const nextTargets = resolveStateTargets(result);
    const styleChanged = !isSameTargetStyle(style, activeTargetStyle);
    activeStateTargets.forEach((target, key) => {
      if (!nextTargets.has(key)) {
        writeState(target, false, null);
      }
    });
    nextTargets.forEach((target, key) => {
      if (!activeStateTargets.has(key) || styleChanged) {
        writeState(target, true, style);
      }
    });
    activeStateTargets.clear();
    nextTargets.forEach((target, key) => activeStateTargets.set(key, target));
    activeTargetStyle = nextTargets.size ? style : null;
  }

  /** 清理全部仍处于高亮状态的原要素。 */
  function clearStateTargets(): void {
    activeStateTargets.forEach((target) => writeState(target, false, null));
    activeStateTargets.clear();
    activeTargetStyle = null;
  }

  /** 重新写入仍活动的目标，用于恢复样式或 source 合并后丢失的 feature-state。 */
  function restoreStateTargets(sourceId?: string): void {
    activeStateTargets.forEach((target) => {
      if (!sourceId || target.source === sourceId) {
        writeState(target, true, activeTargetStyle);
      }
    });
  }

  /**
   * 按最新 source、规则与地图 zoom 刷新交点索引。
   * 几何签名未变化时 store 会直接跳过实际重建。
   */
  function rebuildIntersectionStore(): void {
    const snapOptions = getOptions();
    intersectionStore.rebuild(
      resolveIntersectionRules(map, snapOptions),
      snapOptions?.intersectionExtensionMeters
    );
  }

  const stopIntersectionWatch = watchEffect(() => {
    rebuildIntersectionStore();
  }, { flush: 'sync' });

  let hasDisposed = false;
  let previewFrameHandle: number | null = null;
  let pendingPreviewEvent: MapMouseEvent | null = null;
  let pendingResultHandler: ((result: MapFeatureSnapResult) => void) | null = null;
  let restoreFrameHandle: number | null = null;
  let restoreAllStateTargets = false;
  const pendingRestoreSourceIds = new Set<string>();
  let lastPointer: ResolvePointerOptions | null = null;
  let activePreviewSnapshot: MapFeatureSnapPreviewSnapshot | null = null;

  /**
   * 取消当前已调度但尚未执行的预览同步。
   */
  function cancelPreviewSync(): void {
    if (previewFrameHandle === null) {
      pendingPreviewEvent = null;
      pendingResultHandler = null;
      return;
    }

    if (typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(previewFrameHandle);
    } else {
      globalThis.clearTimeout(previewFrameHandle);
    }

    previewFrameHandle = null;
    pendingPreviewEvent = null;
    pendingResultHandler = null;
  }

  /**
   * 取消尚未执行的状态恢复，避免预览已清理后写回过期状态。
   */
  function cancelStateRestore(): void {
    if (restoreFrameHandle !== null) {
      if (typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(restoreFrameHandle);
      } else {
        globalThis.clearTimeout(restoreFrameHandle);
      }
    }

    restoreFrameHandle = null;
    restoreAllStateTargets = false;
    pendingRestoreSourceIds.clear();
  }

  /**
   * 合并同一帧 style/source 事件后恢复活动状态，避免样式重建期间重复写入。
   */
  function flushStateRestore(): void {
    restoreFrameHandle = null;
    const shouldRestoreAll = restoreAllStateTargets;
    const sourceIds = [...pendingRestoreSourceIds];
    restoreAllStateTargets = false;
    pendingRestoreSourceIds.clear();

    if (shouldRestoreAll) {
      restoreStateTargets();
      return;
    }

    sourceIds.forEach((sourceId) => restoreStateTargets(sourceId));
  }

  /**
   * 调度状态恢复；styledata 优先于同一帧内的任意单 source 恢复。
   * @param sourceId 需要恢复的 source；不传时表示 style 重建后的全部活动目标
   */
  function scheduleStateRestore(sourceId?: string): void {
    if (sourceId) {
      pendingRestoreSourceIds.add(sourceId);
    } else {
      restoreAllStateTargets = true;
    }

    if (restoreFrameHandle !== null) {
      return;
    }

    if (typeof globalThis.requestAnimationFrame === 'function') {
      restoreFrameHandle = globalThis.requestAnimationFrame(flushStateRestore);
      return;
    }

    restoreFrameHandle = globalThis.setTimeout(flushStateRestore, 16) as unknown as number;
  }

  /**
   * 清空当前吸附预览及活动状态。
   * @param preservePointer 是否保留最后屏幕指针供配置或缩放结束后重算
   */
  function resetPreview(preservePointer: boolean): void {
    cancelPreviewSync();
    cancelStateRestore();
    previewData.value = createEmptyPreviewFeatureCollection();
    clearStateTargets();
    activePreviewSnapshot = null;
    if (!preservePointer) {
      lastPointer = null;
    }
  }

  /** 主动清空当前吸附预览，并丢弃旧指针上下文。 */
  function clearPreview(): void {
    resetPreview(false);
  }

  /**
   * 根据当前指针位置解析吸附结果。
   * @param pointer 当前指针上下文
   * @returns 标准化后的吸附结果
   */
  function resolvePointer(pointer: ResolvePointerOptions): MapFeatureSnapResult {
    const snapOptions = getOptions();
    const enabledRules = getEnabledSnapRules(snapOptions);

    if (!enabledRules.length) {
      return createEmptyMapFeatureSnapResult();
    }

    const defaultTolerancePx = snapOptions?.defaultTolerancePx ?? DEFAULT_TOLERANCE_PX;
    const normalizedRules = normalizeSnapRules(enabledRules).map((rule) => ({
      ...rule,
      tolerancePx: getResolvedTolerancePx(rule, defaultTolerancePx),
    }));
    const rawRuleScope = options.getRuleScope?.();
    const ruleScope = rawRuleScope === null || rawRuleScope === undefined
      ? null
      : new Set(rawRuleScope);
    const nearbyOptions = resolveNearbyOptions(snapOptions?.nearby);
    const regularCandidates = resolveSnapCandidates(
      map,
      normalizedRules,
      pointer,
      ruleScope,
      nearbyOptions.enabled ? nearbyOptions.paddingPx : 0
    );
    const directCandidates = regularCandidates.filter((candidate) => {
      const tolerancePx = getResolvedTolerancePx(candidate.rule, defaultTolerancePx);
      return candidate.distancePx <= tolerancePx;
    });
    const intersectionCandidates = resolveIntersectionCandidates(
      map,
      intersectionStore,
      normalizedRules,
      pointer,
      ruleScope,
      nearbyOptions.enabled ? nearbyOptions.paddingPx : 0
    );
    const allCandidates = [...directCandidates, ...intersectionCandidates];
    if (!allCandidates.length) {
      return createEmptyMapFeatureSnapResult();
    }
    const winningPriority = Math.max(...allCandidates.map((item) => item.rule.priority ?? 0));
    const winningIntersections = intersectionCandidates.filter((item) => (
      (item.rule.priority ?? 0) === winningPriority
    ));
    if (winningIntersections.length) {
      const bestIntersection = [...winningIntersections].sort((left, right) => {
        const kindOrder = { crossLayerIntersect: 0, sameLayerIntersect: 1 } as const;
        return left.distancePx - right.distancePx
          || kindOrder[left.snapKind as keyof typeof kindOrder]
            - kindOrder[right.snapKind as keyof typeof kindOrder]
          || JSON.stringify(left.snapCoordinate).localeCompare(JSON.stringify(right.snapCoordinate))
          || createCandidateKey(left).localeCompare(createCandidateKey(right));
      })[0];
      const nodeKey = JSON.stringify(bestIntersection.snapCoordinate);
      const nodeTargets = intersectionCandidates.filter((item) => (
        JSON.stringify(item.snapCoordinate) === nodeKey
      ));
      return toSnapResult(bestIntersection, nodeTargets, 'intersection');
    }

    let bestCandidate: SnapCandidate | null = null;
    directCandidates.forEach((candidate) => {
      if (
        (candidate.rule.priority ?? 0) === winningPriority
        && shouldReplaceCandidate(bestCandidate, candidate)
      ) {
        bestCandidate = candidate;
      }
    });

    const nearbyCandidates = bestCandidate
      ? resolveNearbyCandidates(map, bestCandidate, regularCandidates, pointer, nearbyOptions)
      : [];
    return toSnapResult(
      bestCandidate,
      nearbyCandidates,
      nearbyCandidates.length > 1 ? 'nearby' : 'direct'
    );
  }

  /**
   * 根据 MapLibre 鼠标事件解析吸附结果。
   * @param event MapLibre 鼠标事件
   * @returns 当前事件对应的吸附结果
   */
  function resolveMapEvent(event: MapMouseEvent): MapFeatureSnapResult {
    return resolvePointer({
      point: {
        x: event.point.x,
        y: event.point.y,
      },
      lngLat: {
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      },
    });
  }

  /**
   * 将指定指针的解析结果提交为可消费快照，并按配置同步视觉预览。
   * @param pointer 同一帧使用的原始屏幕坐标与经纬度
   * @returns 当前指针对应的吸附结果
   */
  function commitPreview(pointer: ResolvePointerOptions): MapFeatureSnapResult {
    const snapOptions = getOptions();
    if (!isSnapPluginEnabled(snapOptions)) {
      resetPreview(true);
      return createEmptyMapFeatureSnapResult();
    }

    const result = resolvePointer(pointer);
    const previewEnabled = snapOptions?.preview?.enabled !== false;
    previewData.value = previewEnabled && snapOptions?.preview?.pointEnabled !== false
      ? buildPreviewData(result)
      : createEmptyPreviewFeatureCollection();
    if (previewEnabled) {
      syncStateTargets(result, createTargetStyle(snapOptions));
    } else {
      clearStateTargets();
    }
    activePreviewSnapshot = {
      originalCoordinate: [pointer.lngLat.lng, pointer.lngLat.lat],
      pointer: { ...pointer.point },
      result,
    };
    return result;
  }

  /**
   * 读取当前已经提交并可供交互消费的指针快照。
   * @returns 当前吸附快照；快照已清理时返回 null
   */
  function getPreviewSnapshot(): MapFeatureSnapPreviewSnapshot | null {
    if (!activePreviewSnapshot) {
      return null;
    }
    return {
      originalCoordinate: [...activePreviewSnapshot.originalCoordinate],
      pointer: { ...activePreviewSnapshot.pointer },
      result: activePreviewSnapshot.result,
    };
  }

  const stopPreviewWatch = watchEffect(() => {
    const snapOptions = getOptions();
    // 显式读取有效规则和样式，使运行期规则、target 与 preview 配置变化立即刷新静止指针。
    getEnabledSnapRules(snapOptions);
    createTargetStyle(snapOptions);
    options.getRuleScope?.();
    if (!lastPointer) {
      if (!isSnapPluginEnabled(snapOptions) || snapOptions?.preview?.enabled === false) {
        resetPreview(true);
      }
      return;
    }
    commitPreview(lastPointer);
  }, { flush: 'sync' });

  /**
   * 根据 TerraDraw 鼠标事件解析吸附结果。
   * @param event TerraDraw 鼠标事件
   * @returns 当前事件对应的吸附结果
   */
  function resolveTerradrawEvent(event: TerraDrawMouseEvent): MapFeatureSnapResult {
    return resolvePointer({
      point: {
        x: event.containerX,
        y: event.containerY,
      },
      lngLat: {
        lng: event.lng,
        lat: event.lat,
      },
    });
  }

  /**
   * 在一帧内刷新吸附预览，避免高频 mousemove 下重复计算。
   */
  function flushPreviewFrame(): void {
    previewFrameHandle = null;
    const latestEvent = pendingPreviewEvent;
    const resultHandler = pendingResultHandler;
    pendingPreviewEvent = null;
    pendingResultHandler = null;

    if (!latestEvent) {
      return;
    }

    const pointer = {
      point: { x: latestEvent.point.x, y: latestEvent.point.y },
      lngLat: { lng: latestEvent.lngLat.lng, lat: latestEvent.lngLat.lat },
    };
    lastPointer = pointer;
    const result = commitPreview(pointer);
    resultHandler?.(result);
  }

  /**
   * 合并同一帧地图事件，并按最新事件同步预览和外部结果消费方。
   * @param event 最新的鼠标移动事件
   * @param onResolved 最新事件解析完成后的回调
   */
  function scheduleMapEvent(
    event: MapMouseEvent,
    onResolved?: (result: MapFeatureSnapResult) => void
  ): void {
    lastPointer = {
      point: { x: event.point.x, y: event.point.y },
      lngLat: { lng: event.lngLat.lng, lat: event.lngLat.lat },
    };
    pendingPreviewEvent = event;
    if (onResolved) {
      pendingResultHandler = onResolved;
    }

    if (previewFrameHandle !== null) {
      return;
    }

    if (typeof globalThis.requestAnimationFrame === 'function') {
      previewFrameHandle = globalThis.requestAnimationFrame(() => {
        flushPreviewFrame();
      });
      return;
    }

    previewFrameHandle = globalThis.setTimeout(() => {
      flushPreviewFrame();
    }, 16) as unknown as number;
  }

  /**
   * 处理地图 mousemove 事件并刷新吸附预览。
   * @param event 当前地图鼠标事件
   */
  function handleMouseMove(event: MapMouseEvent): void {
    scheduleMapEvent(event);
  }

  /**
   * 处理地图 mouseout 事件，避免预览残留。
   */
  function handleMouseOut(): void {
    clearPreview();
  }

  /** 视图移动开始时清理旧高亮，但保留屏幕指针供 zoomend 重新投影。 */
  function handleViewStart(): void {
    resetPreview(true);
  }

  /**
   * 缩放结束后按当前 zoom 重新计算 source 与 layer filter。
   */
  function handleZoomEnd(): void {
    rebuildIntersectionStore();
    if (!lastPointer) {
      return;
    }
    const lngLat = map.unproject([lastPointer.point.x, lastPointer.point.y]);
    lastPointer = {
      point: { ...lastPointer.point },
      lngLat: { lng: lngLat.lng, lat: lngLat.lat },
    };
    commitPreview(lastPointer);
  }

  /** style 重建后恢复仍活动的吸附目标状态。 */
  function handleStyleData(): void {
    scheduleStateRestore();
  }

  /**
   * 对应 source 数据合并后恢复该 source 下仍活动的吸附目标状态。
   * @param event MapLibre source 数据事件
   */
  function handleSourceData(event: { sourceId?: string }): void {
    if (event.sourceId) {
      scheduleStateRestore(event.sourceId);
    }
  }

  map.on('mousemove', handleMouseMove);
  map.on('mouseout', handleMouseOut);
  map.on('movestart', handleViewStart);
  map.on('zoomstart', handleViewStart);
  map.on('zoomend', handleZoomEnd);
  map.on('styledata', handleStyleData);
  map.on('sourcedata', handleSourceData);

  return {
    previewData,
    resolveMapEvent,
    scheduleMapEvent,
    resolvePointer,
    resolveTerradrawEvent,
    clearPreview,
    getPreviewSnapshot,
    destroy: () => {
      if (hasDisposed) {
        return;
      }

      hasDisposed = true;
      clearPreview();
      stopPreviewWatch();
      stopIntersectionWatch();
      intersectionStore.clear();

      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
      map.off('movestart', handleViewStart);
      map.off('zoomstart', handleViewStart);
      map.off('zoomend', handleZoomEnd);
      map.off('styledata', handleStyleData);
      map.off('sourcedata', handleSourceData);
    },
  };
}
