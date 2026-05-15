import type { Feature, Point } from 'geojson';
import type { GeoJSONSourceSpecification } from 'maplibre-gl';
import type { MapFeatureId } from '../composables/useMapDataUpdate';
import type {
  MapCommonFeature,
  MapCommonLineFeature,
  MapCommonProperties,
  MapSourceFeatureRef,
} from './map-common-tools';
import { buildGeneratedFeatureProperties } from './map-common-tools';

/** 坐标比较容差，避免浮点误差把端点交点误判成普通交点。 */
const ENDPOINT_EPSILON = 1e-9;

/** 交点预览要素 generatedKind 固定值。 */
export const INTERSECTION_PREVIEW_KIND = 'intersection-preview';

/** 正式交点要素 generatedKind 固定值。 */
export const INTERSECTION_MATERIALIZED_KIND = 'intersection-materialized';

/** 交点求交范围。 */
export type IntersectionScope = 'all' | 'selected';

/** 单条参与求交的线对象。 */
export interface MapIntersectionCandidate {
  /** 当前业务线要素。 */
  feature: MapCommonLineFeature;
  /** 当前业务线来源引用。 */
  ref: MapSourceFeatureRef;
}

/** 交点候选来源输入。 */
export interface MapIntersectionSource {
  /** 当前来源对应的 sourceId。 */
  sourceId: string;
  /** 当前来源对应的 layerId。 */
  layerId: string;
  /** 当前来源最新 GeoJSON 数据。 */
  data: GeoJSONSourceSpecification['data'];
}

/** 交点参与方摘要。 */
export interface MapIntersectionParticipants {
  /** 左侧线摘要名称。 */
  leftLabel: string | null;
  /** 右侧线摘要名称。 */
  rightLabel: string | null;
}

/** 交点领域对象。 */
export interface MapIntersectionPoint {
  /** 交点临时稳定 ID。 */
  intersectionId: string;
  /** 交点坐标。 */
  point: { lng: number; lat: number };
  /** 当前交点来自哪种求交范围。 */
  scope: IntersectionScope;
  /** 当前交点左侧线来源引用。 */
  leftRef: MapSourceFeatureRef;
  /** 当前交点右侧线来源引用。 */
  rightRef: MapSourceFeatureRef;
  /** 当前交点左侧命中的线段索引。 */
  leftSegmentIndex: number;
  /** 当前交点右侧命中的线段索引。 */
  rightSegmentIndex: number;
  /** 当前交点是否命中了任意一侧端点。 */
  isEndpointHit: boolean;
  /** 当前交点参与方摘要。 */
  participants: MapIntersectionParticipants;
}

/** 交点计算配置。 */
export interface CollectLineIntersectionsOptions {
  /** 当前求交范围。 */
  scope: IntersectionScope;
  /** 当前选中线来源引用，仅 selected 模式使用。 */
  selectedRef?: MapSourceFeatureRef | null;
  /** 参与求交的业务线集合。 */
  candidates: MapIntersectionCandidate[];
  /** 是否保留端点相交。 */
  includeEndpoint?: boolean;
  /** 交点坐标归一化小数位。 */
  coordDigits?: number;
  /** 是否忽略同一条线自身求交。 */
  ignoreSelf?: boolean;
}

/** 单段线段交点结果。 */
interface SegmentIntersection {
  /** 交点经度。 */
  lng: number;
  /** 交点纬度。 */
  lat: number;
  /** 在线段 A 上的参数位置。 */
  t: number;
  /** 在线段 B 上的参数位置。 */
  u: number;
}

/**
 * 判断两个数字是否近似相等。
 * @param left 左值
 * @param right 右值
 * @returns 是否在容差范围内
 */
function isNear(left: number, right: number): boolean {
  return Math.abs(left - right) <= ENDPOINT_EPSILON;
}

/**
 * 将坐标值归一化成固定小数字符串。
 * @param value 原始坐标值
 * @param coordDigits 保留小数位
 * @returns 固定精度字符串
 */
function normalizeCoordinate(value: number, coordDigits: number): string {
  return value.toFixed(coordDigits);
}

/**
 * 为来源引用生成稳定排序键。
 * @param ref 来源引用
 * @returns 稳定排序键
 */
function buildRefKey(ref: MapSourceFeatureRef): string {
  return `${ref.sourceId || ''}:${String(ref.featureId ?? '')}:${ref.layerId || ''}`;
}

/**
 * 判断两条来源引用是否指向同一业务线。
 * @param left 左侧来源引用
 * @param right 右侧来源引用
 * @returns 是否为同一条线
 */
function isSameRef(left: MapSourceFeatureRef, right: MapSourceFeatureRef): boolean {
  return (
    left.sourceId === right.sourceId &&
    left.featureId === right.featureId &&
    left.layerId === right.layerId
  );
}

/**
 * 计算两条线段之间的有限线段交点。
 * 平行或仅重合但无法收敛为单点时返回 null。
 *
 * @param startA 线段 A 起点
 * @param endA 线段 A 终点
 * @param startB 线段 B 起点
 * @param endB 线段 B 终点
 * @returns 交点结果
 */
function getSegmentIntersection(
  startA: [number, number],
  endA: [number, number],
  startB: [number, number],
  endB: [number, number]
): SegmentIntersection | null {
  const deltaAX = endA[0] - startA[0];
  const deltaAY = endA[1] - startA[1];
  const deltaBX = endB[0] - startB[0];
  const deltaBY = endB[1] - startB[1];
  const denominator = deltaAX * deltaBY - deltaAY * deltaBX;

  if (isNear(denominator, 0)) {
    return null;
  }

  const offsetX = startB[0] - startA[0];
  const offsetY = startB[1] - startA[1];
  const t = (offsetX * deltaBY - offsetY * deltaBX) / denominator;
  const u = (offsetX * deltaAY - offsetY * deltaAX) / denominator;

  if (t < -ENDPOINT_EPSILON || t > 1 + ENDPOINT_EPSILON) {
    return null;
  }

  if (u < -ENDPOINT_EPSILON || u > 1 + ENDPOINT_EPSILON) {
    return null;
  }

  return {
    lng: startA[0] + t * deltaAX,
    lat: startA[1] + t * deltaAY,
    t,
    u,
  };
}

/**
 * 判断当前交点是否命中了线段端点。
 * @param intersection 当前交点结果
 * @returns 是否命中端点
 */
function isEndpointIntersection(intersection: SegmentIntersection): boolean {
  return (
    isNear(intersection.t, 0) ||
    isNear(intersection.t, 1) ||
    isNear(intersection.u, 0) ||
    isNear(intersection.u, 1)
  );
}

/**
 * 构造交点稳定 ID。
 * 这里先对参与线引用排序，再拼上命中线段索引和归一化坐标，
 * 从而保证 A-B 与 B-A 在同一坐标上生成同一个临时 ID。
 *
 * @param leftRef 左侧来源引用
 * @param leftSegmentIndex 左侧线段索引
 * @param rightRef 右侧来源引用
 * @param rightSegmentIndex 右侧线段索引
 * @param lng 交点经度
 * @param lat 交点纬度
 * @param coordDigits 保留小数位
 * @returns 临时稳定 ID
 */
function buildIntersectionId(
  leftRef: MapSourceFeatureRef,
  leftSegmentIndex: number,
  rightRef: MapSourceFeatureRef,
  rightSegmentIndex: number,
  lng: number,
  lat: number,
  coordDigits: number
): string {
  const leftKey = buildRefKey(leftRef);
  const rightKey = buildRefKey(rightRef);
  const orderedPair =
    leftKey <= rightKey
      ? [
          leftRef.sourceId || '',
          String(leftRef.featureId ?? ''),
          leftSegmentIndex,
          rightRef.sourceId || '',
          String(rightRef.featureId ?? ''),
          rightSegmentIndex,
        ]
      : [
          rightRef.sourceId || '',
          String(rightRef.featureId ?? ''),
          rightSegmentIndex,
          leftRef.sourceId || '',
          String(leftRef.featureId ?? ''),
          leftSegmentIndex,
        ];

  return [
    'intersection',
    ...orderedPair,
    normalizeCoordinate(lng, coordDigits),
    normalizeCoordinate(lat, coordDigits),
  ].join(':');
}

/**
 * 提取交点参与方摘要。
 * @param left 左侧线对象
 * @param right 右侧线对象
 * @returns 参与方摘要
 */
function buildParticipants(
  left: MapIntersectionCandidate,
  right: MapIntersectionCandidate
): MapIntersectionParticipants {
  return {
    leftLabel: String(left.feature.properties?.name || left.ref.featureId || '') || null,
    rightLabel: String(right.feature.properties?.name || right.ref.featureId || '') || null,
  };
}

/**
 * 从任意 GeoJSON data 入参中安全提取 FeatureCollection 要素数组。
 * @param data 当前来源数据
 * @returns 可继续参与求交处理的要素数组
 */
function getFeatureCollectionFeatures(
  data: GeoJSONSourceSpecification['data']
): MapCommonFeature[] {
  if (!data || typeof data === 'string' || data.type !== 'FeatureCollection') {
    return [];
  }

  return (data.features || []) as MapCommonFeature[];
}

/**
 * 将业务来源列表转换成交点候选线集合。
 * helper 会自动：
 * 1. 跳过非 LineString 要素
 * 2. 优先读取 properties.id 作为业务 featureId
 * 3. 若 properties.id 不存在，则回退顶层 feature.id
 *
 * @param sources 当前允许参与求交的来源列表
 * @returns 标准化后的交点候选线集合
 */
export function buildIntersectionCandidates(
  sources: MapIntersectionSource[]
): MapIntersectionCandidate[] {
  return sources.flatMap((source) => {
    return getFeatureCollectionFeatures(source.data).flatMap((feature) => {
      if (feature.geometry?.type !== 'LineString') {
        return [];
      }

      const featureId =
        (feature.properties?.id as string | number | null | undefined) ?? feature.id ?? null;
      if (featureId === null || featureId === undefined || featureId === '') {
        return [];
      }

      return [
        {
          feature: feature as MapCommonLineFeature,
          ref: {
            sourceId: source.sourceId,
            featureId,
            layerId: source.layerId,
          },
        },
      ];
    });
  });
}

/**
 * 在 selected 模式下过滤出当前选中线。
 * @param options 交点计算配置
 * @returns 当前选中线候选集合
 */
function resolveLeftCandidates(
  options: CollectLineIntersectionsOptions
): MapIntersectionCandidate[] {
  if (options.scope !== 'selected') {
    return options.candidates;
  }

  if (!options.selectedRef) {
    return [];
  }

  return options.candidates.filter((candidate) => isSameRef(candidate.ref, options.selectedRef!));
}

/**
 * 收集业务线之间的交点结果。
 * 首版只处理可收敛成单点的普通线段交点，
 * 重合线段和多点重叠场景统一忽略。
 *
 * @param options 交点计算配置
 * @returns 交点领域对象列表
 */
export function collectLineIntersections(
  options: CollectLineIntersectionsOptions
): MapIntersectionPoint[] {
  const {
    candidates,
    scope,
    includeEndpoint = true,
    coordDigits = 6,
    ignoreSelf = true,
  } = options;
  const resultMap = new Map<string, MapIntersectionPoint>();
  const leftCandidates = resolveLeftCandidates(options);

  leftCandidates.forEach((leftCandidate, leftIndex) => {
    candidates.forEach((rightCandidate, rightIndex) => {
      if (scope === 'all' && rightIndex <= leftIndex) {
        return;
      }

      if (ignoreSelf && isSameRef(leftCandidate.ref, rightCandidate.ref)) {
        return;
      }

      const leftCoordinates = leftCandidate.feature.geometry.coordinates;
      const rightCoordinates = rightCandidate.feature.geometry.coordinates;

      for (let leftSegmentIndex = 0; leftSegmentIndex < leftCoordinates.length - 1; leftSegmentIndex += 1) {
        for (
          let rightSegmentIndex = 0;
          rightSegmentIndex < rightCoordinates.length - 1;
          rightSegmentIndex += 1
        ) {
          const intersection = getSegmentIntersection(
            leftCoordinates[leftSegmentIndex] as [number, number],
            leftCoordinates[leftSegmentIndex + 1] as [number, number],
            rightCoordinates[rightSegmentIndex] as [number, number],
            rightCoordinates[rightSegmentIndex + 1] as [number, number]
          );

          if (!intersection) {
            continue;
          }

          const endpointHit = isEndpointIntersection(intersection);
          if (!includeEndpoint && endpointHit) {
            continue;
          }

          const intersectionId = buildIntersectionId(
            leftCandidate.ref,
            leftSegmentIndex,
            rightCandidate.ref,
            rightSegmentIndex,
            intersection.lng,
            intersection.lat,
            coordDigits
          );

          resultMap.set(intersectionId, {
            intersectionId,
            point: {
              lng: Number(normalizeCoordinate(intersection.lng, coordDigits)),
              lat: Number(normalizeCoordinate(intersection.lat, coordDigits)),
            },
            scope,
            leftRef: leftCandidate.ref,
            rightRef: rightCandidate.ref,
            leftSegmentIndex,
            rightSegmentIndex,
            isEndpointHit: endpointHit,
            participants: buildParticipants(leftCandidate, rightCandidate),
          });
        }
      }
    });
  });

  return Array.from(resultMap.values());
}

/**
 * 将交点上下文转换成正式点要素。
 * @param intersection 交点领域对象
 * @param extraProperties 额外业务属性
 * @returns 标准点要素
 */
export function buildIntersectionPointFeature(
  intersection: MapIntersectionPoint,
  extraProperties: MapCommonProperties = {}
): Feature<Point, MapCommonProperties> {
  const generatedKind =
    typeof extraProperties.generatedKind === 'string' ? extraProperties.generatedKind : null;
  const generatedProperties = generatedKind
    ? buildGeneratedFeatureProperties({
        generatedKind,
        groupId: `${generatedKind}::${intersection.intersectionId}`,
      })
    : {};

  return {
    type: 'Feature',
    id: intersection.intersectionId as MapFeatureId,
    geometry: {
      type: 'Point',
      coordinates: [intersection.point.lng, intersection.point.lat],
    },
    properties: {
      id: intersection.intersectionId,
      intersectionId: intersection.intersectionId,
      scope: intersection.scope,
      isEndpointHit: intersection.isEndpointHit,
      leftSourceId: intersection.leftRef.sourceId,
      leftFeatureId: intersection.leftRef.featureId,
      rightSourceId: intersection.rightRef.sourceId,
      rightFeatureId: intersection.rightRef.featureId,
      leftSegmentIndex: intersection.leftSegmentIndex,
      rightSegmentIndex: intersection.rightSegmentIndex,
      ...generatedProperties,
      ...extraProperties,
    },
  };
}

/**
 * 将交点上下文转换成正式交点点要素。
 * @param intersection 交点领域对象
 * @param extraProperties 额外业务属性
 * @returns 适合持久保留的正式交点点要素
 */
export function buildMaterializedIntersectionFeature(
  intersection: MapIntersectionPoint,
  extraProperties: MapCommonProperties = {}
): Feature<Point, MapCommonProperties> {
  return buildIntersectionPointFeature(intersection, {
    name: '交点',
    mark: 'intersection',
    generatedKind: INTERSECTION_MATERIALIZED_KIND,
    ...extraProperties,
  });
}
