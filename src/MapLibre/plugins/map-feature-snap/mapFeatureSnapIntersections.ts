import KDBush from 'kdbush';
import {
  findLineIntersections,
  type MapLineInput,
} from '../../shared/map-line-connect-tools';
import type {
  MapFeatureSnapMode,
  MapFeatureSnapResolvedFeature,
  MapFeatureSnapRule,
} from './types';

/** kit 在未传配置时使用的虚拟延长长度，单位米。 */
export const DEFAULT_INTERSECTION_EXTENSION_METERS = 2;

const INTERSECTION_MODES: MapFeatureSnapMode[] = [
  'sameLayerIntersect',
  'crossLayerIntersect',
];

/** 构建交点索引时使用的完整规则。 */
export interface SnapIntersectionRule extends MapFeatureSnapRule {
  /** 已归一化的稳定规则 ID。 */
  id: string;
  /** 当前规则对应的完整业务线要素。 */
  resolvedFeatures: MapFeatureSnapResolvedFeature[];
}

/** 交点一侧的真实父线信息。 */
export interface SnapIntersectionParent {
  /** 父线所属规则 ID。 */
  ruleId: string;
  /** 父线所属 source ID。 */
  sourceId: string;
  /** vector source 时父线所属的 source-layer。 */
  sourceLayer?: string;
  /** 父线命中的 layer ID。 */
  layerId: string;
  /** 完整真实父线要素。 */
  feature: MapFeatureSnapResolvedFeature['feature'];
}

/** 同一坐标下的一组实际求交父线。 */
export interface SnapIntersectionPair {
  /** 当前交点模式。 */
  kind: 'sameLayerIntersect' | 'crossLayerIntersect';
  /** 第一条真实父线。 */
  first: SnapIntersectionParent;
  /** 第二条真实父线。 */
  second: SnapIntersectionParent;
}

/** KDBush 中单个唯一坐标及其全部父线组合。 */
export interface SnapIntersectionPoint {
  /** 唯一交点坐标。 */
  coordinate: [number, number];
  /** 当前坐标下的独立父线组合。 */
  pairs: SnapIntersectionPair[];
}

/** 交点静态索引对外句柄。 */
export interface SnapIntersectionStore {
  /** 按规则和完整要素重建索引，几何签名未变化时返回 false。 */
  rebuild: (rules: SnapIntersectionRule[], extensionMeters?: number) => boolean;
  /** 查询经纬度 bbox 内的交点。 */
  range: (minX: number, minY: number, maxX: number, maxY: number) => SnapIntersectionPoint[];
  /** 释放坐标数组、KDBush 和几何签名。 */
  clear: () => void;
  /** 读取当前唯一坐标数量。 */
  size: () => number;
}

interface IntersectionLineData {
  /** 当前父线所属规则 ID。 */
  ruleId: string;
  /** resolver 返回的完整父线。 */
  resolved: MapFeatureSnapResolvedFeature;
}

/**
 * 归一化交点虚拟延长长度。
 * @param value 原始配置；0 明确禁用虚拟延长
 * @returns 可用于几何 helper 的米数
 */
export function resolveIntersectionExtensionMeters(
  value: number | null | undefined
): number {
  if (value === 0) {
    return 0;
  }
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_INTERSECTION_EXTENSION_METERS;
}

/**
 * 创建每个 mapFeatureSnap 实例独立持有的静态交点索引。
 * @returns 支持签名去重、bbox 查询和显式释放的 store
 */
export function createSnapIntersectionStore(): SnapIntersectionStore {
  let points: SnapIntersectionPoint[] = [];
  let index: KDBush | null = null;
  let geometrySignature: string | null = null;
  let nextObjectId = 1;
  const objectIds = new WeakMap<object, number>();

  /**
   * 读取对象在当前 store 生命周期内的稳定身份。
   * @param value feature 或 geometry 对象
   * @returns 递增数值身份
   */
  function getObjectId(value: object): number {
    const current = objectIds.get(value);
    if (current !== undefined) {
      return current;
    }
    const next = nextObjectId;
    nextObjectId += 1;
    objectIds.set(value, next);
    return next;
  }

  /**
   * 创建不包含运行期显隐和启用状态的几何签名。
   * @param rules 当前完整规则集合
   * @param extensionMeters 已归一化的延长长度
   * @returns 可比较签名
   */
  function createGeometrySignature(
    rules: SnapIntersectionRule[],
    extensionMeters: number
  ): string {
    return JSON.stringify([
      extensionMeters,
      rules.map((rule) => [
        rule.id,
        INTERSECTION_MODES.filter((mode) => rule.snapTo?.includes(mode)),
        rule.resolvedFeatures.map((item) => [
          getObjectId(item.feature),
          getObjectId(item.feature.geometry),
          item.sourceId,
          item.sourceLayer,
          item.layerId,
        ]),
      ]),
    ]);
  }

  /**
   * 将完整规则展开为共享几何 helper 输入。
   * @param rules 当前交点规则
   * @returns 带规则和来源元数据的线输入
   */
  function createLineInputs(
    rules: SnapIntersectionRule[]
  ): MapLineInput<IntersectionLineData>[] {
    return rules.flatMap((rule, ruleIndex) => {
      return rule.resolvedFeatures.map((resolved, featureIndex) => ({
        id: `${ruleIndex}:${featureIndex}:${String(resolved.feature.id ?? '')}`,
        groupId: rule.id,
        geometry: resolved.feature.geometry,
        data: {
          ruleId: rule.id,
          resolved,
        },
      }));
    });
  }

  /**
   * 创建交点一侧的真实父线结构。
   * @param data 共享线 helper 携带的领域数据
   * @returns snap 交点父线
   */
  function createParent(data: IntersectionLineData): SnapIntersectionParent {
    return {
      ruleId: data.ruleId,
      sourceId: data.resolved.sourceId,
      ...(data.resolved.sourceLayer ? { sourceLayer: data.resolved.sourceLayer } : {}),
      layerId: data.resolved.layerId,
      feature: data.resolved.feature,
    };
  }

  /**
   * 按唯一坐标聚合全部实际父线组合。
   * @param rules 当前交点规则
   * @param extensionMeters 已归一化延长长度
   * @returns 可建立 KDBush 的唯一坐标数组
   */
  function buildPoints(
    rules: SnapIntersectionRule[],
    extensionMeters: number
  ): SnapIntersectionPoint[] {
    const sameGroupIds = new Set(
      rules.filter((rule) => rule.snapTo?.includes('sameLayerIntersect')).map((rule) => rule.id)
    );
    const crossGroupIds = new Set(
      rules.filter((rule) => rule.snapTo?.includes('crossLayerIntersect')).map((rule) => rule.id)
    );
    const intersections = findLineIntersections({
      lines: createLineInputs(rules),
      extensionMeters,
      sameGroupIds,
      crossGroupIds,
    });
    const pointMap = new Map<string, SnapIntersectionPoint>();
    const pairKeys = new Map<string, Set<string>>();

    intersections.forEach((intersection) => {
      const coordinateKey = createCoordinateKey(intersection.coordinate);
      const first = createParent(intersection.first.line.data);
      const second = createParent(intersection.second.line.data);
      const kind = first.ruleId === second.ruleId
        ? 'sameLayerIntersect'
        : 'crossLayerIntersect';
      const pairKey = createPairKey(first, second, getObjectId);
      const usedPairKeys = pairKeys.get(coordinateKey) ?? new Set<string>();
      if (usedPairKeys.has(pairKey)) {
        return;
      }
      usedPairKeys.add(pairKey);
      pairKeys.set(coordinateKey, usedPairKeys);

      const current = pointMap.get(coordinateKey);
      if (current) {
        current.pairs.push({ kind, first, second });
        return;
      }
      pointMap.set(coordinateKey, {
        coordinate: intersection.coordinate,
        pairs: [{ kind, first, second }],
      });
    });

    return Array.from(pointMap.values()).sort((left, right) => (
      left.coordinate[0] - right.coordinate[0]
      || left.coordinate[1] - right.coordinate[1]
    ));
  }

  /**
   * 按最新规则重建交点数组和 KDBush。
   * @param rules 当前完整规则集合
   * @param rawExtensionMeters 原始虚拟延长配置
   * @returns 几何签名变化并实际重建时返回 true
   */
  function rebuild(
    rules: SnapIntersectionRule[],
    rawExtensionMeters?: number
  ): boolean {
    const extensionMeters = resolveIntersectionExtensionMeters(rawExtensionMeters);
    const relevantRules = rules.filter((rule) => (
      rule.snapTo?.some((mode) => INTERSECTION_MODES.includes(mode))
    ));
    const nextSignature = createGeometrySignature(relevantRules, extensionMeters);
    if (nextSignature === geometrySignature) {
      return false;
    }

    geometrySignature = nextSignature;
    points = buildPoints(relevantRules, extensionMeters);
    if (!points.length) {
      index = null;
      return true;
    }

    const nextIndex = new KDBush(points.length);
    points.forEach((point) => {
      nextIndex.add(point.coordinate[0], point.coordinate[1]);
    });
    nextIndex.finish();
    index = nextIndex;
    return true;
  }

  /**
   * 查询经纬度 bbox 内的唯一交点。
   * @param minX bbox 最小经度
   * @param minY bbox 最小纬度
   * @param maxX bbox 最大经度
   * @param maxY bbox 最大纬度
   * @returns bbox 内交点，保持静态数组顺序
   */
  function range(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): SnapIntersectionPoint[] {
    if (!index) {
      return [];
    }
    return index.range(minX, minY, maxX, maxY).map((pointIndex) => points[pointIndex]);
  }

  /**
   * 释放当前索引持有的大数组和几何签名。
   */
  function clear(): void {
    points = [];
    index = null;
    geometrySignature = null;
  }

  return {
    rebuild,
    range,
    clear,
    size: () => points.length,
  };
}

/**
 * 创建交点坐标的微小数值精度 key。
 * @param coordinate 原始交点坐标
 * @returns 纳米度精度 key
 */
function createCoordinateKey(coordinate: [number, number]): string {
  return `${Math.round(coordinate[0] * 1_000_000_000)}:${Math.round(coordinate[1] * 1_000_000_000)}`;
}

/**
 * 创建无方向父线组合 key。
 * @param first 第一条父线
 * @param second 第二条父线
 * @param getObjectId store 内对象身份解析器
 * @returns 稳定组合 key
 */
function createPairKey(
  first: SnapIntersectionParent,
  second: SnapIntersectionParent,
  getObjectId: (value: object) => number
): string {
  const keys = [first, second].map((parent) => [
    parent.ruleId,
    parent.sourceId,
    parent.layerId,
    getObjectId(parent.feature),
  ].join(':')).sort();
  return `${keys[0]}|${keys[1]}`;
}
