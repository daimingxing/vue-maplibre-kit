import type { FeatureCollection, Geometry } from 'geojson';
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import { ref } from 'vue';
import type { TerraDrawMouseEvent } from 'terra-draw';
import type { MapSnapBinding } from '../types';
import type {
  MapFeatureSnapGeometryType,
  MapFeatureSnapKind,
  MapFeatureSnapMode,
  MapFeatureSnapOptions,
  MapFeatureSnapResult,
  MapFeatureSnapRule,
  MapFeatureSnapSegmentInfo,
} from './types';

type PreviewFeatureCollection = FeatureCollection;

interface ScreenPoint {
  x: number;
  y: number;
}

interface SnapCandidate {
  rule: MapFeatureSnapRule;
  feature: MapGeoJSONFeature;
  layerId: string;
  sourceId: string | null;
  coordinate: [number, number];
  distancePx: number;
  snapKind: MapFeatureSnapKind;
  segment: MapFeatureSnapSegmentInfo | null;
}

interface ResolvePointerOptions {
  point: ScreenPoint;
  lngLat: { lng: number; lat: number };
}

/** 吸附预览数据源 ID。 */
export const MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID = '__mapFeatureSnapPreviewSource';

/** 吸附预览点图层 ID。 */
export const MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID = '__mapFeatureSnapPreviewPointLayer';

/** 吸附预览线图层 ID。 */
export const MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID = '__mapFeatureSnapPreviewLineLayer';

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
  };
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
  rule: MapFeatureSnapRule,
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
function getResolvedTolerancePx(rule: MapFeatureSnapRule, defaultTolerancePx: number): number {
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
function getFeatureSourceId(feature: MapGeoJSONFeature): string | null {
  return typeof feature.source === 'string' ? feature.source : null;
}

/**
 * 判断当前候选要素是否满足规则声明的属性匹配条件。
 * @param feature 当前候选要素
 * @param rule 当前规则
 * @returns 是否通过浅层属性匹配
 */
function matchesRuleWhere(feature: MapGeoJSONFeature, rule: MapFeatureSnapRule): boolean {
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
  rule: MapFeatureSnapRule,
  layerId: string
): boolean {
  if (!matchesRuleWhere(feature, rule)) {
    return false;
  }

  if (!rule.filter) {
    return true;
  }

  return rule.filter({
    rule,
    feature,
    layerId,
    sourceId: getFeatureSourceId(feature),
    sourceLayer: feature.sourceLayer || null,
    properties: feature.properties || null,
    map,
  });
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
function resolveFeatureGeometryType(feature: MapGeoJSONFeature): MapFeatureSnapGeometryType | null {
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
  feature: MapGeoJSONFeature,
  rule: MapFeatureSnapRule,
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
  feature: MapGeoJSONFeature,
  rule: MapFeatureSnapRule,
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

  if (next.distancePx !== current.distancePx) {
    return next.distancePx < current.distancePx;
  }

  if (next.snapKind !== current.snapKind) {
    return next.snapKind === 'vertex';
  }

  return false;
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
  rules: MapFeatureSnapRule[],
  pointer: ResolvePointerOptions
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

  if (!availableLayerIds.length) {
    return null;
  }

  const maxTolerancePx = rules.reduce((maxTolerance, rule) => {
    return Math.max(maxTolerance, getResolvedTolerancePx(rule, DEFAULT_TOLERANCE_PX));
  }, 0);

  const bbox = [
    [pointer.point.x - maxTolerancePx, pointer.point.y - maxTolerancePx],
    [pointer.point.x + maxTolerancePx, pointer.point.y + maxTolerancePx],
  ] as [[number, number], [number, number]];

  const candidateFeatures = map.queryRenderedFeatures(bbox, {
    layers: availableLayerIds,
  }) as MapGeoJSONFeature[];

  let bestCandidate: SnapCandidate | null = null;

  rules.forEach((rule) => {
    if (rule.enabled === false) {
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
    targetFeature: candidate.feature,
    targetLayerId: candidate.layerId,
    targetSourceId: candidate.sourceId,
    targetCoordinate: candidate.coordinate,
    segment: candidate.segment,
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
 * 读取当前启用的普通图层吸附规则集合。
 * @param options 地图吸附插件配置
 * @returns 当前启用的规则集合
 */
function getEnabledSnapRules(
  options: MapFeatureSnapOptions | null | undefined
): MapFeatureSnapRule[] {
  if (!isSnapPluginEnabled(options)) {
    return [];
  }

  const ordinaryLayerOptions = options?.ordinaryLayers;
  if (!ordinaryLayerOptions?.rules?.length) {
    return [];
  }

  if (ordinaryLayerOptions.enabled === false) {
    return [];
  }

  return ordinaryLayerOptions.rules.filter((rule) => rule.enabled !== false);
}

/**
 * 根据吸附结果构建预览图层数据源。
 * @param result 当前吸附结果
 * @returns 可直接喂给 GeoJSONSource 的预览数据
 */
function buildPreviewData(result: MapFeatureSnapResult): PreviewFeatureCollection {
  if (!result.matched || !result.targetCoordinate) {
    return createEmptyPreviewFeatureCollection();
  }

  const features: PreviewFeatureCollection['features'] = [
    {
      type: 'Feature',
      id: 'map-feature-snap-preview-point',
      properties: {
        kind: 'point',
      },
      geometry: {
        type: 'Point',
        coordinates: result.targetCoordinate,
      },
    },
  ];

  if (result.segment) {
    features.push({
      type: 'Feature',
      id: 'map-feature-snap-preview-segment',
      properties: {
        kind: 'segment',
      },
      geometry: {
        type: 'LineString',
        coordinates: [result.segment.startCoordinate, result.segment.endCoordinate],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 创建统一地图吸附绑定。
 * @param options 绑定初始化参数
 * @returns 吸附绑定句柄
 */
export function createMapFeatureSnapBinding(options: {
  map: MaplibreMap;
  getOptions: () => MapFeatureSnapOptions | null | undefined;
}): MapFeatureSnapBinding {
  const { map, getOptions } = options;
  const previewData = ref<PreviewFeatureCollection>(createEmptyPreviewFeatureCollection());

  let hasDisposed = false;
  let previewFrameHandle: number | null = null;
  let pendingPreviewEvent: MapMouseEvent | null = null;

  /**
   * 取消当前已调度但尚未执行的预览同步。
   */
  function cancelPreviewSync(): void {
    if (previewFrameHandle === null) {
      pendingPreviewEvent = null;
      return;
    }

    if (typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(previewFrameHandle);
    } else {
      globalThis.clearTimeout(previewFrameHandle);
    }

    previewFrameHandle = null;
    pendingPreviewEvent = null;
  }

  /**
   * 主动清空当前吸附预览。
   */
  function clearPreview(): void {
    cancelPreviewSync();
    previewData.value = createEmptyPreviewFeatureCollection();
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
    const normalizedRules = enabledRules.map((rule) => ({
      ...rule,
      tolerancePx: getResolvedTolerancePx(rule, defaultTolerancePx),
    }));

    return toSnapResult(resolveSnapCandidate(map, normalizedRules, pointer));
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
    pendingPreviewEvent = null;

    if (!latestEvent) {
      return;
    }

    const snapOptions = getOptions();
    if (!isSnapPluginEnabled(snapOptions) || snapOptions?.preview?.enabled === false) {
      previewData.value = createEmptyPreviewFeatureCollection();
      return;
    }

    previewData.value = buildPreviewData(resolveMapEvent(latestEvent));
  }

  /**
   * 调度一次吸附预览同步。
   * @param event 最新的鼠标移动事件
   */
  function schedulePreviewSync(event: MapMouseEvent): void {
    pendingPreviewEvent = event;

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
    schedulePreviewSync(event);
  }

  /**
   * 处理地图 mouseout 事件，避免预览残留。
   */
  function handleMouseOut(): void {
    clearPreview();
  }

  map.on('mousemove', handleMouseMove);
  map.on('mouseout', handleMouseOut);
  map.on('movestart', clearPreview);
  map.on('zoomstart', clearPreview);

  return {
    previewData,
    resolveMapEvent,
    resolvePointer,
    resolveTerradrawEvent,
    clearPreview,
    destroy: () => {
      if (hasDisposed) {
        return;
      }

      hasDisposed = true;
      clearPreview();

      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
      map.off('movestart', clearPreview);
      map.off('zoomstart', clearPreview);
    },
  };
}
