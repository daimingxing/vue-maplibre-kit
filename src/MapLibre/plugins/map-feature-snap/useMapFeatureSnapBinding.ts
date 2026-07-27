import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import { ref, watchEffect } from 'vue';
import type { TerraDrawMouseEvent } from 'terra-draw';
import type { MapSnapBinding } from '../types';
import type {
  MapFeatureSnapGeometryType,
  MapFeatureSnapKind,
  MapFeatureSnapMode,
  MapFeatureSnapOptions,
  MapFeatureSnapParent,
  MapFeatureSnapResolvedFeature,
  MapFeatureSnapResult,
  MapFeatureSnapRule,
  MapFeatureSnapSegmentInfo,
  MapFeatureSnapStateTarget,
} from './types';
import {
  createSnapIntersectionStore,
  type SnapIntersectionPair,
  type SnapIntersectionPoint,
  type SnapIntersectionRule,
} from './mapFeatureSnapIntersections';

type PreviewFeatureCollection = FeatureCollection;

/** 当前吸附目标写入 feature-state 的样式覆写。 */
interface SnapPreviewTargetStyle {
  /** 原要素高亮颜色。 */
  color: string;
  /** 原要素透明度覆写；未声明时为 null。 */
  opacity: number | null;
  /** 线要素宽度覆写；未声明时为 null。 */
  lineWidth: number | null;
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
  distancePx: number;
  snapKind: MapFeatureSnapKind;
  segment: MapFeatureSnapSegmentInfo | null;
  parents: MapFeatureSnapParent[];
}

interface ResolvePointerOptions {
  point: ScreenPoint;
  lngLat: { lng: number; lat: number };
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

/** 地图吸附插件内部绑定句柄。 */
export type MapFeatureSnapBinding = MapSnapBinding;

/**
 * 创建一个“未命中吸附”的空结果。
 * @returns 统一的空吸附结果对象
 */
export function createEmptyMapFeatureSnapResult(): MapFeatureSnapResult {
  return {
    matched: false,
    lngLat: null,
    distancePx: null,
    snapKind: null,
    ruleId: null,
    targetFeature: null,
    targetLayerId: null,
    targetSourceId: null,
    targetCoordinate: null,
    segment: null,
    parents: [],
  };
}

/**
 * 读取当前吸附预览写入原要素的状态样式。
 * @param options 当前吸附插件配置
 * @returns 已补齐默认颜色、保留可选透明度和线宽的状态样式
 */
function createTargetStyle(options: MapFeatureSnapOptions | null | undefined): SnapPreviewTargetStyle {
  return {
    color: options?.preview?.targetColor ?? '#ff7a00',
    opacity: options?.preview?.targetOpacity ?? null,
    lineWidth: options?.preview?.targetLineWidth ?? null,
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
    && current.lineWidth === next.lineWidth;
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
 * @returns 当前候选要素的最佳点吸附结果；未命中返回空数组
 */
function buildPointCandidates(
  map: MaplibreMap,
  pointerPoint: ScreenPoint,
  feature: SnapFeatureLike,
  rule: ResolvedMapFeatureSnapRule,
  layerId: string
): SnapCandidate[] {
  const featureGeometryType = resolveFeatureGeometryType(feature);
  if (featureGeometryType !== 'Point') {
    return [];
  }

  const snapModes = getResolvedSnapModes(rule, featureGeometryType);
  if (!snapModes.includes('vertex')) {
    return [];
  }

  const tolerancePx = getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX);
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
 * @returns 当前候选要素的候选吸附结果集合
 */
function buildPathCandidates(
  map: MaplibreMap,
  pointerPoint: ScreenPoint,
  feature: SnapFeatureLike,
  rule: ResolvedMapFeatureSnapRule,
  layerId: string
): SnapCandidate[] {
  const featureGeometryType = resolveFeatureGeometryType(feature);
  if (featureGeometryType !== 'LineString' && featureGeometryType !== 'Polygon') {
    return [];
  }

  const snapModes = getResolvedSnapModes(rule, featureGeometryType);
  if (!snapModes.length) {
    return [];
  }

  const tolerancePx = getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX);
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
 * 判断交点父线组合是否命中当前会话作用域。
 * @param pair 当前交点父线组合
 * @param ruleScope 当前作用域；null 表示全局
 * @returns same 命中自身、cross 任一侧命中时返回 true
 */
function isPairInScope(
  pair: SnapIntersectionPair,
  ruleScope: ReadonlySet<string> | null
): boolean {
  return ruleScope === null
    || ruleScope.has(pair.first.ruleId)
    || ruleScope.has(pair.second.ruleId);
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
 * 为单个交点父线组合创建按规则分别评估的候选。
 * @param map 当前地图实例
 * @param pointerPoint 当前鼠标屏幕坐标
 * @param point 当前唯一交点
 * @param pair 当前父线组合
 * @param ruleMap 最新规则表
 * @param ruleScope 当前会话作用域
 * @returns 通过双方显隐、scope 和 tolerance 的候选
 */
function buildIntersectionCandidates(
  map: MaplibreMap,
  pointerPoint: ScreenPoint,
  point: SnapIntersectionPoint,
  pair: SnapIntersectionPair,
  ruleMap: Map<string, ResolvedMapFeatureSnapRule>,
  ruleScope: ReadonlySet<string> | null
): SnapCandidate[] {
  if (!isPairInScope(pair, ruleScope)) {
    return [];
  }

  const firstRule = ruleMap.get(pair.first.ruleId);
  const secondRule = ruleMap.get(pair.second.ruleId);
  if (!firstRule || !secondRule || !isRuleAvailable(firstRule) || !isRuleAvailable(secondRule)) {
    return [];
  }

  const projected = projectCoordinate(map, point.coordinate);
  const distancePx = getScreenDistance(pointerPoint, projected);
  const evaluationRules = pair.kind === 'sameLayerIntersect'
    ? [firstRule]
    : firstRule.id === secondRule.id
      ? [firstRule]
      : [firstRule, secondRule];
  const parents: MapFeatureSnapParent[] = [pair.first, pair.second];

  return evaluationRules.flatMap((rule) => {
    if (distancePx > getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX)) {
      return [];
    }
    const primary = pair.first.ruleId === rule.id ? pair.first : pair.second;
    const feature = toSnapFeature({
      feature: primary.feature,
      sourceId: primary.sourceId,
      ...(primary.sourceLayer ? { sourceLayer: primary.sourceLayer } : {}),
      layerId: primary.layerId,
    });
    return [{
      rule,
      feature,
      layerId: primary.layerId,
      sourceId: primary.sourceId,
      coordinate: point.coordinate,
      distancePx,
      snapKind: pair.kind,
      segment: null,
      parents,
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
 * @returns 附近交点候选
 */
function resolveIntersectionCandidates(
  map: MaplibreMap,
  store: ReturnType<typeof createSnapIntersectionStore>,
  rules: ResolvedMapFeatureSnapRule[],
  pointer: ResolvePointerOptions,
  ruleScope: ReadonlySet<string> | null
): SnapCandidate[] {
  const availableRules = rules.filter(isRuleAvailable);
  if (!availableRules.length || store.size() === 0) {
    return [];
  }

  const maxTolerancePx = availableRules.reduce((maxTolerance, rule) => {
    return Math.max(maxTolerance, getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX));
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
    return point.pairs.flatMap((pair) => buildIntersectionCandidates(
      map,
      pointer.point,
      point,
      pair,
      ruleMap,
      ruleScope
    ));
  });
}

/**
 * 根据规则和候选要素列表解析当前最佳吸附结果。
 * @param map 当前地图实例
 * @param rules 当前启用的规则集合
 * @param pointer 当前鼠标指针上下文
 * @returns 最终命中的吸附候选
 */
function resolveSnapCandidate(
  map: MaplibreMap,
  rules: ResolvedMapFeatureSnapRule[],
  pointer: ResolvePointerOptions,
  ruleScope: ReadonlySet<string> | null
): SnapCandidate | null {
  if (!rules.length) {
    return null;
  }

  const availableLayerIds = [
    ...new Set(
      rules
        .flatMap((rule) => rule.layerIds)
        .filter((layerId) => typeof layerId === 'string' && Boolean(map.getLayer(layerId)))
    ),
  ];

  const maxTolerancePx = rules.reduce((maxTolerance, rule) => {
    return Math.max(maxTolerance, getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX));
  }, 0);

  const bbox = [
    [pointer.point.x - maxTolerancePx, pointer.point.y - maxTolerancePx],
    [pointer.point.x + maxTolerancePx, pointer.point.y + maxTolerancePx],
  ] as [[number, number], [number, number]];

  const candidateFeatures = availableLayerIds.length
    ? map.queryRenderedFeatures(bbox, { layers: availableLayerIds }) as MapGeoJSONFeature[]
    : [];

  let bestCandidate: SnapCandidate | null = null;

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

      const candidates =
        featureGeometryType === 'Point'
          ? buildPointCandidates(map, pointer.point, feature, rule, layerId)
          : buildPathCandidates(map, pointer.point, feature, rule, layerId);

      candidates.forEach((candidate) => {
        if (shouldReplaceCandidate(bestCandidate, candidate)) {
          bestCandidate = candidate;
        }
      });
    });
  });

  return bestCandidate;
}

/**
 * 将候选吸附结果转换为统一输出对象。
 * @param candidate 当前命中的最佳候选
 * @returns 标准化后的吸附结果
 */
function toSnapResult(candidate: SnapCandidate | null): MapFeatureSnapResult {
  if (!candidate) {
    return createEmptyMapFeatureSnapResult();
  }

  return {
    matched: true,
    lngLat: {
      lng: candidate.coordinate[0],
      lat: candidate.coordinate[1],
    },
    distancePx: candidate.distancePx,
    snapKind: candidate.snapKind,
    ruleId: candidate.rule.id,
    targetFeature: candidate.feature.layer ? (candidate.feature as MapGeoJSONFeature) : null,
    targetLayerId: candidate.layerId,
    targetSourceId: candidate.sourceId,
    targetCoordinate: candidate.coordinate,
    segment: candidate.segment,
    parents: candidate.parents,
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
  if (!result.matched || !result.targetCoordinate) {
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
        coordinates: result.targetCoordinate,
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

    if (result.parents?.length) {
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
   * 主动清空当前吸附预览。
   */
  function clearPreview(): void {
    cancelPreviewSync();
    cancelStateRestore();
    previewData.value = createEmptyPreviewFeatureCollection();
    clearStateTargets();
  }

  const stopPreviewWatch = watchEffect(() => {
    if (getOptions()?.preview?.enabled === false) {
      clearPreview();
    }
  }, { flush: 'sync' });

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
    let bestCandidate = resolveSnapCandidate(map, normalizedRules, pointer, ruleScope);

    resolveIntersectionCandidates(
      map,
      intersectionStore,
      normalizedRules,
      pointer,
      ruleScope
    ).forEach((candidate) => {
      if (shouldReplaceCandidate(bestCandidate, candidate)) {
        bestCandidate = candidate;
      }
    });

    return toSnapResult(bestCandidate);
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

    const snapOptions = getOptions();
    if (!isSnapPluginEnabled(snapOptions)) {
      clearPreview();
      resultHandler?.(createEmptyMapFeatureSnapResult());
      return;
    }

    const result = resolveMapEvent(latestEvent);
    if (snapOptions?.preview?.enabled === false) {
      clearPreview();
    } else {
      previewData.value = buildPreviewData(result);
      syncStateTargets(result, createTargetStyle(snapOptions));
    }
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

  /**
   * 缩放结束后按当前 zoom 重新计算 source 与 layer filter。
   */
  function handleZoomEnd(): void {
    rebuildIntersectionStore();
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
  map.on('movestart', clearPreview);
  map.on('zoomstart', clearPreview);
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
      map.off('movestart', clearPreview);
      map.off('zoomstart', clearPreview);
      map.off('zoomend', handleZoomEnd);
      map.off('styledata', handleStyleData);
      map.off('sourcedata', handleSourceData);
    },
  };
}
