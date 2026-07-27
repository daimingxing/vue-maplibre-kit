import type { LineString, MultiLineString } from 'geojson';
import { MapLineMeasureTool } from './map-common-tools';

const POINT_SCALE = 1_000_000_000;
const POINT_EPSILON = 1 / POINT_SCALE;
const CROSS_EPSILON = 1e-15;
const PARAM_EPSILON = 1e-10;
const METER_EPSILON = 1e-6;

/** 共享线算法使用的二维经纬度坐标。 */
export type MapLineCoord = [number, number];

/** 可参与共享连接和求交算法的线输入。 */
export interface MapLineInput<T = unknown> {
  /** 当前线在一次计算中的稳定身份。 */
  id: string;
  /** 当前线所属求交分组。 */
  groupId: string;
  /** 当前线的完整 GeoJSON geometry。 */
  geometry: LineString | MultiLineString;
  /** 调用方需要随父线保留的领域数据。 */
  data: T;
}

/** 共享线算法展开后的单条 segment。 */
export interface MapLineSegment<T = unknown> {
  /** segment 起点。 */
  start: MapLineCoord;
  /** segment 终点。 */
  end: MapLineCoord;
  /** segment 对应的真实父线。 */
  line: MapLineInput<T>;
  /** MultiLineString 中的 path 下标。 */
  pathIndex: number;
  /** 当前 path 中的原始 segment 下标。 */
  segmentIndex: number;
  /** 是否为端点向外生成的虚拟连接 segment。 */
  virtual: boolean;
}

/** 两条 segment 形成的离散交点。 */
export interface MapLineIntersection<T = unknown> {
  /** 归一化后的交点坐标。 */
  coordinate: MapLineCoord;
  /** 第一条参与 segment。 */
  first: MapLineSegment<T>;
  /** 第二条参与 segment。 */
  second: MapLineSegment<T>;
}

/** 查找分组线交点的配置。 */
export interface FindLineIntersectionsOptions<T = unknown> {
  /** 待求交线集合。 */
  lines: MapLineInput<T>[];
  /** 每个开放端点向外探测的最大距离，单位米。 */
  extensionMeters: number;
  /** 允许组内求交的 groupId 集合。 */
  sameGroupIds: ReadonlySet<string>;
  /** 允许跨组求交的 groupId 集合；跨组双方都必须存在于集合中。 */
  crossGroupIds: ReadonlySet<string>;
}

type EndpointSide = 'start' | 'end';

interface InternalLineSegment<T> extends MapLineSegment<T> {
  /** 父线在本次输入中的稳定序号。 */
  lineIndex: number;
  /** 当前 segment 在有效 path segment 中的顺序。 */
  pathOrder: number;
  /** 当前 path 的有效 segment 数量。 */
  pathSize: number;
  /** 当前 path 是否首尾闭合。 */
  pathClosed: boolean;
  /** 虚拟 segment 对应的父线端点；真实 segment 为空。 */
  endpointSide: EndpointSide | null;
  /** 虚拟 segment 相邻的真实 segment；真实 segment 为空。 */
  parentSegment: InternalLineSegment<T> | null;
  /** 截取虚拟 segment 时确认的未归一化命中；真实 segment 和完整 probe 为空。 */
  extensionHit: MapLineCoord | null;
}

interface InternalPath<T> {
  /** 当前 path 对应父线。 */
  line: MapLineInput<T>;
  /** 父线稳定序号。 */
  lineIndex: number;
  /** 当前 path 下标。 */
  pathIndex: number;
  /** 当前 path 的有效真实 segment。 */
  segments: InternalLineSegment<T>[];
  /** 当前 path 是否闭合。 */
  closed: boolean;
}

interface FlattenLineResult<T> {
  /** 全部真实 segment。 */
  segments: InternalLineSegment<T>[];
  /** 保留端点语义的有效 path。 */
  paths: InternalPath<T>[];
}

interface SegmentBounds<T> {
  /** 当前 bbox 对应 segment。 */
  segment: InternalLineSegment<T>;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ExtensionProbe<T> {
  /** 完整探测 segment。 */
  segment: InternalLineSegment<T>;
  /** 与探测起点相邻的真实 segment。 */
  parent: InternalLineSegment<T>;
}

interface ExtensionHit<T> {
  /** 命中坐标。 */
  point: MapLineCoord;
  /** 起点到命中坐标的距离，单位米。 */
  distance: number;
  /** 命中的另一条虚拟探测线；命中真实线时为空。 */
  probe: ExtensionProbe<T> | null;
}

/**
 * 将真实线展开为 segment，并为开放 path 端点生成最近命中的虚拟连接。
 * @param lines 待展开的真实线
 * @param extensionMeters 端点最大延长距离，单位米；非正数或非法值表示不延长
 * @returns 真实 segment 与有效虚拟连接 segment
 */
export function createLineConnectSegments<T>(
  lines: MapLineInput<T>[],
  extensionMeters: number
): MapLineSegment<T>[] {
  const flattened = flattenLines(lines);
  const normalizedExtension = normalizeExtensionMeters(extensionMeters);
  if (normalizedExtension === 0) {
    return flattened.segments;
  }

  return [
    ...flattened.segments,
    ...createVirtualSegments(flattened, normalizedExtension),
  ];
}

/**
 * 按组内和跨组规则计算真实线、虚拟连接线的离散交点。
 * @param options 求交输入和分组开关
 * @returns 保留两侧真实父线信息的交点集合
 */
export function findLineIntersections<T>(
  options: FindLineIntersectionsOptions<T>
): MapLineIntersection<T>[] {
  const segments = createLineConnectSegments(
    options.lines,
    options.extensionMeters
  ) as InternalLineSegment<T>[];
  const bounds = segments
    .map(createSegmentBounds)
    .sort(compareSegmentBounds);
  const intersections: MapLineIntersection<T>[] = [];
  const usedKeys = new Set<string>();

  for (let leftIndex = 0; leftIndex < bounds.length; leftIndex += 1) {
    const left = bounds[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < bounds.length; rightIndex += 1) {
      const right = bounds[rightIndex];
      if (right.minX > left.maxX + CROSS_EPSILON) {
        break;
      }
      if (!isYRangeOverlapping(left, right)) {
        continue;
      }

      const first = left.segment;
      const second = right.segment;
      if (!canGroupsIntersect(first, second, options)) {
        continue;
      }

      const coordinate = resolveIntersection(first, second);
      if (!coordinate) {
        continue;
      }

      const key = createIntersectionKey(coordinate, first, second);
      if (usedKeys.has(key)) {
        continue;
      }
      usedKeys.add(key);
      intersections.push({ coordinate, first, second });
    }
  }

  return intersections.sort((left, right) => {
    return createIntersectionKey(left.coordinate, left.first as InternalLineSegment<T>, left.second as InternalLineSegment<T>)
      .localeCompare(createIntersectionKey(
        right.coordinate,
        right.first as InternalLineSegment<T>,
        right.second as InternalLineSegment<T>
      ));
  });
}

/**
 * 将全部 LineString、MultiLineString 展开为有效真实 segment。
 * @param lines 原始线输入
 * @returns segment 与 path 元数据
 */
function flattenLines<T>(lines: MapLineInput<T>[]): FlattenLineResult<T> {
  const allSegments: InternalLineSegment<T>[] = [];
  const paths: InternalPath<T>[] = [];

  lines.forEach((line, lineIndex) => {
    const coordinatesList = line.geometry.type === 'LineString'
      ? [line.geometry.coordinates]
      : line.geometry.coordinates;

    coordinatesList.forEach((coordinates, pathIndex) => {
      const validCoordinates = coordinates
        .map(toCoordinate)
        .filter((coordinate): coordinate is MapLineCoord => coordinate !== null);
      const draftSegments: Array<{
        start: MapLineCoord;
        end: MapLineCoord;
        segmentIndex: number;
      }> = [];

      for (let index = 1; index < validCoordinates.length; index += 1) {
        const start = normalizePoint(validCoordinates[index - 1]);
        const end = normalizePoint(validCoordinates[index]);
        if (getMeterDistance(start, end) <= METER_EPSILON) {
          continue;
        }
        draftSegments.push({ start, end, segmentIndex: index - 1 });
      }

      if (!draftSegments.length) {
        return;
      }

      const closed = pointsEqual(
        draftSegments[0].start,
        draftSegments.at(-1)?.end ?? draftSegments[0].end
      );
      const pathSegments = draftSegments.map((segment, pathOrder) => ({
        ...segment,
        line,
        lineIndex,
        pathIndex,
        pathOrder,
        pathSize: draftSegments.length,
        pathClosed: closed,
        virtual: false,
        endpointSide: null,
        parentSegment: null,
        extensionHit: null,
      } satisfies InternalLineSegment<T>));

      allSegments.push(...pathSegments);
      paths.push({ line, lineIndex, pathIndex, segments: pathSegments, closed });
    });
  });

  return { segments: allSegments, paths };
}

/**
 * 为所有开放 path 的首尾创建探测线并截取到最近有效命中。
 * @param flattened 已展开的真实线数据
 * @param extensionMeters 最大探测距离，单位米
 * @returns 可参与求交和构网的虚拟 segment
 */
function createVirtualSegments<T>(
  flattened: FlattenLineResult<T>,
  extensionMeters: number
): InternalLineSegment<T>[] {
  const probes = flattened.paths.flatMap((path) => createPathProbes(path, extensionMeters));
  if (!probes.length) {
    return [];
  }

  const realHits = new Map<ExtensionProbe<T>, ExtensionHit<T> | null>();
  probes.forEach((probe) => {
    realHits.set(probe, findNearestRealHit(probe, flattened.segments, extensionMeters));
  });

  const probeHits = collectProbeHits(probes, extensionMeters);
  const selectedHits = new Map<ExtensionProbe<T>, ExtensionHit<T> | null>();
  probes.forEach((probe) => {
    selectedHits.set(probe, selectNearestHit(
      realHits.get(probe) ?? null,
      probeHits.get(probe) ?? []
    ));
  });

  return probes.flatMap((probe) => {
    const selected = selectedHits.get(probe) ?? null;
    if (!selected) {
      return [];
    }

    if (selected.probe) {
      const partnerHit = selectedHits.get(selected.probe) ?? null;
      // virtual-virtual 只有双方都把该坐标选为最近命中时才形成真实可达连接。
      if (!partnerHit?.probe || partnerHit.probe !== probe || !pointsEqual(partnerHit.point, selected.point)) {
        const realHit = realHits.get(probe) ?? null;
        return realHit ? [createTrimmedVirtualSegment(probe, realHit)] : [];
      }
    }

    return [createTrimmedVirtualSegment(probe, selected)];
  });
}

/**
 * 创建单个开放 path 的首尾探测线。
 * @param path 当前真实 path
 * @param extensionMeters 探测长度，单位米
 * @returns path 首尾探测线
 */
function createPathProbes<T>(
  path: InternalPath<T>,
  extensionMeters: number
): ExtensionProbe<T>[] {
  if (path.closed) {
    return [];
  }

  const first = path.segments[0];
  const last = path.segments.at(-1) ?? first;
  const probes = [
    createExtensionProbe(first.start, first.end, first, 'start', extensionMeters),
    createExtensionProbe(last.end, last.start, last, 'end', extensionMeters),
  ];

  return probes.filter((probe): probe is ExtensionProbe<T> => probe !== null);
}

/**
 * 按端点相邻方向创建固定米数的完整探测线。
 * @param origin 发起延长的端点
 * @param neighbor 相邻真实点
 * @param parent 相邻真实 segment
 * @param endpointSide 父 path 端点位置
 * @param extensionMeters 探测长度，单位米
 * @returns 可用探测线；相邻 segment 过短时返回 null
 */
function createExtensionProbe<T>(
  origin: MapLineCoord,
  neighbor: MapLineCoord,
  parent: InternalLineSegment<T>,
  endpointSide: EndpointSide,
  extensionMeters: number
): ExtensionProbe<T> | null {
  const parentLength = getMeterDistance(origin, neighbor);
  if (parentLength <= METER_EPSILON) {
    return null;
  }

  const ratio = extensionMeters / parentLength;
  const end = normalizePoint([
    origin[0] + (origin[0] - neighbor[0]) * ratio,
    origin[1] + (origin[1] - neighbor[1]) * ratio,
  ]);
  if (getMeterDistance(origin, end) <= METER_EPSILON) {
    return null;
  }

  return {
    parent,
    segment: {
      start: normalizePoint(origin),
      end,
      line: parent.line,
      lineIndex: parent.lineIndex,
      pathIndex: parent.pathIndex,
      segmentIndex: parent.segmentIndex,
      pathOrder: parent.pathOrder,
      pathSize: parent.pathSize,
      pathClosed: false,
      virtual: true,
      endpointSide,
      parentSegment: parent,
      extensionHit: null,
    },
  };
}

/**
 * 查找单条探测线命中的最近真实 segment。
 * @param probe 当前探测线
 * @param realSegments 全部真实 segment
 * @param extensionMeters 最大探测距离，单位米
 * @returns 最近真实命中
 */
function findNearestRealHit<T>(
  probe: ExtensionProbe<T>,
  realSegments: InternalLineSegment<T>[],
  extensionMeters: number
): ExtensionHit<T> | null {
  let best: ExtensionHit<T> | null = null;

  realSegments.forEach((segment) => {
    if (segment === probe.parent) {
      return;
    }
    const point = getSegmentJoin(probe.segment, segment);
    if (!point) {
      return;
    }
    const distance = getMeterDistance(probe.segment.start, point);
    if (distance <= METER_EPSILON || distance > extensionMeters + METER_EPSILON) {
      return;
    }
    best = selectNearestHit(best, [{ point, distance, probe: null }]);
  });

  return best;
}

/**
 * 收集虚拟探测线之间的候选命中。
 * @param probes 全部端点探测线
 * @param extensionMeters 最大探测距离，单位米
 * @returns 每条探测线对应的 virtual-virtual 命中列表
 */
function collectProbeHits<T>(
  probes: ExtensionProbe<T>[],
  extensionMeters: number
): Map<ExtensionProbe<T>, ExtensionHit<T>[]> {
  const result = new Map<ExtensionProbe<T>, ExtensionHit<T>[]>();

  for (let firstIndex = 0; firstIndex < probes.length; firstIndex += 1) {
    const first = probes[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < probes.length; secondIndex += 1) {
      const second = probes[secondIndex];
      // 共线重叠没有唯一交点，不能从重叠区间中任取端点生成 virtual-virtual 连接。
      const point = getSegmentCross(first.segment, second.segment);
      if (!point) {
        continue;
      }

      const firstDistance = getMeterDistance(first.segment.start, point);
      const secondDistance = getMeterDistance(second.segment.start, point);
      if (
        firstDistance <= METER_EPSILON
        || secondDistance <= METER_EPSILON
        || firstDistance > extensionMeters + METER_EPSILON
        || secondDistance > extensionMeters + METER_EPSILON
      ) {
        continue;
      }

      appendProbeHit(result, first, { point, distance: firstDistance, probe: second });
      appendProbeHit(result, second, { point, distance: secondDistance, probe: first });
    }
  }

  return result;
}

/**
 * 向探测线命中表追加一条候选。
 * @param target 命中表
 * @param probe 当前探测线
 * @param hit 待追加命中
 */
function appendProbeHit<T>(
  target: Map<ExtensionProbe<T>, ExtensionHit<T>[]>,
  probe: ExtensionProbe<T>,
  hit: ExtensionHit<T>
): void {
  const current = target.get(probe) ?? [];
  current.push(hit);
  target.set(probe, current);
}

/**
 * 从真实命中和虚拟命中中选择距离最近且顺序稳定的一项。
 * @param realHit 最近真实命中
 * @param probeHits 虚拟探测线命中集合
 * @returns 最终最近命中
 */
function selectNearestHit<T>(
  realHit: ExtensionHit<T> | null,
  probeHits: ExtensionHit<T>[]
): ExtensionHit<T> | null {
  return [realHit, ...probeHits]
    .filter((hit): hit is ExtensionHit<T> => hit !== null)
    .sort((left, right) => {
      const distanceDiff = left.distance - right.distance;
      if (Math.abs(distanceDiff) > METER_EPSILON) {
        return distanceDiff;
      }
      return pointKey(left.point).localeCompare(pointKey(right.point));
    })[0] ?? null;
}

/**
 * 将完整探测线截取到已经确认的最近命中。
 * @param probe 原始探测线
 * @param hit 最近真实线或虚拟探测线命中
 * @returns 公开终点已归一化、内部保留精确命中的虚拟 segment
 */
function createTrimmedVirtualSegment<T>(
  probe: ExtensionProbe<T>,
  hit: ExtensionHit<T>
): InternalLineSegment<T> {
  return {
    ...probe.segment,
    // end 是调用方消费的稳定坐标；extensionHit 只修正内部二次求交尾差。
    end: normalizePoint(hit.point),
    extensionHit: hit.point,
  };
}

/**
 * 判断两条 segment 所属分组是否允许求交。
 * @param first 第一条 segment
 * @param second 第二条 segment
 * @param options 当前组内、跨组开关
 * @returns 是否允许求交
 */
function canGroupsIntersect<T>(
  first: InternalLineSegment<T>,
  second: InternalLineSegment<T>,
  options: FindLineIntersectionsOptions<T>
): boolean {
  const firstGroup = first.line.groupId;
  const secondGroup = second.line.groupId;
  if (firstGroup === secondGroup) {
    return options.sameGroupIds.has(firstGroup);
  }

  return options.crossGroupIds.has(firstGroup) && options.crossGroupIds.has(secondGroup);
}

/**
 * 解析两条 segment 是否形成符合业务语义的离散交点。
 * @param first 第一条 segment
 * @param second 第二条 segment
 * @returns 合法交点；平行、共线或被端点规则排除时返回 null
 */
function resolveIntersection<T>(
  first: InternalLineSegment<T>,
  second: InternalLineSegment<T>
): MapLineCoord | null {
  if (isSameSegment(first, second) || areAdjacentRealSegments(first, second)) {
    return null;
  }

  const coordinate = resolveExtensionHit(first, second)
    ?? getSegmentCross(first, second);
  if (!coordinate) {
    return null;
  }

  // 虚拟线起点属于原始 vertex，不能再次作为 intersection 候选。
  if (
    (first.virtual && pointsEqual(coordinate, first.start))
    || (second.virtual && pointsEqual(coordinate, second.start))
  ) {
    return null;
  }

  // 两条真实 segment 的端点重合由 vertex 模式处理，避免重复候选。
  if (
    !first.virtual
    && !second.virtual
    && isSegmentEndpoint(coordinate, first)
    && isSegmentEndpoint(coordinate, second)
  ) {
    return null;
  }

  return normalizePoint(coordinate);
}

/**
 * 读取虚拟 segment 在探测阶段已经确认的交点。
 * @param first 第一条待判定 segment
 * @param second 第二条待判定 segment
 * @returns 已确认且属于当前 segment 组合的精确命中；否则返回 null
 */
function resolveExtensionHit<T>(
  first: InternalLineSegment<T>,
  second: InternalLineSegment<T>
): MapLineCoord | null {
  if (first.virtual && first.extensionHit) {
    if (second.virtual) {
      return second.extensionHit && pointsEqual(first.extensionHit, second.extensionHit)
        ? first.extensionHit
        : null;
    }
    if (isPointOnSegment(first.extensionHit, second)) {
      return first.extensionHit;
    }
  }

  if (
    second.virtual
    && second.extensionHit
    && isPointOnSegment(second.extensionHit, first)
  ) {
    return second.extensionHit;
  }

  return null;
}

/**
 * 判断两条真实 segment 是否属于同一 path 的相邻边。
 * @param first 第一条 segment
 * @param second 第二条 segment
 * @returns 连续边或闭合首尾边返回 true
 */
function areAdjacentRealSegments<T>(
  first: InternalLineSegment<T>,
  second: InternalLineSegment<T>
): boolean {
  if (
    first.virtual
    || second.virtual
    || first.line !== second.line
    || first.pathIndex !== second.pathIndex
  ) {
    return false;
  }

  if (Math.abs(first.pathOrder - second.pathOrder) === 1) {
    return true;
  }

  return first.pathClosed
    && first.pathSize > 1
    && Math.abs(first.pathOrder - second.pathOrder) === first.pathSize - 1;
}

/**
 * 计算两条非平行 segment 的范围内交点。
 * @param first 第一条 segment
 * @param second 第二条 segment
 * @returns 唯一离散交点；平行、共线或范围外时返回 null
 */
function getSegmentCross<T>(
  first: MapLineSegment<T>,
  second: MapLineSegment<T>
): MapLineCoord | null {
  const firstX = first.end[0] - first.start[0];
  const firstY = first.end[1] - first.start[1];
  const secondX = second.end[0] - second.start[0];
  const secondY = second.end[1] - second.start[1];
  const denominator = cross(firstX, firstY, secondX, secondY);
  if (Math.abs(denominator) <= CROSS_EPSILON) {
    // 平行和共线都没有唯一离散交点，统一交给 vertex/segment 既有能力处理。
    return null;
  }

  const deltaX = second.start[0] - first.start[0];
  const deltaY = second.start[1] - first.start[1];
  const firstRatio = cross(deltaX, deltaY, secondX, secondY) / denominator;
  const secondRatio = cross(deltaX, deltaY, firstX, firstY) / denominator;
  if (
    firstRatio < -PARAM_EPSILON
    || firstRatio > 1 + PARAM_EPSILON
    || secondRatio < -PARAM_EPSILON
    || secondRatio > 1 + PARAM_EPSILON
  ) {
    return null;
  }

  const ratio = clamp(firstRatio, 0, 1);
  // 内部保留数学交点尾差，由公开 segment 和 intersection 的返回边界统一归一化。
  return [
    first.start[0] + firstX * ratio,
    first.start[1] + firstY * ratio,
  ];
}

/**
 * 读取两条 segment 可用于虚拟连接的接触点。
 * @param first 第一条 segment
 * @param second 第二条 segment
 * @returns 端点接触或非平行交点；没有连接点时返回 null
 */
function getSegmentJoin<T>(
  first: MapLineSegment<T>,
  second: MapLineSegment<T>
): MapLineCoord | null {
  const endpoints = [first.start, first.end, second.start, second.end];
  const endpoint = endpoints.find((point) => (
    isPointOnSegment(point, first) && isPointOnSegment(point, second)
  ));

  return endpoint ? normalizePoint(endpoint) : getSegmentCross(first, second);
}

/**
 * 判断坐标是否位于指定 segment 范围内。
 * @param point 待判断坐标
 * @param segment 目标 segment
 * @returns 坐标在线段上时返回 true
 */
function isPointOnSegment<T>(
  point: MapLineCoord,
  segment: MapLineSegment<T>
): boolean {
  const segmentX = segment.end[0] - segment.start[0];
  const segmentY = segment.end[1] - segment.start[1];
  const pointX = point[0] - segment.start[0];
  const pointY = point[1] - segment.start[1];
  const crossValue = cross(segmentX, segmentY, pointX, pointY);
  if (Math.abs(crossValue) > CROSS_EPSILON) {
    return false;
  }

  return point[0] >= Math.min(segment.start[0], segment.end[0]) - POINT_EPSILON
    && point[0] <= Math.max(segment.start[0], segment.end[0]) + POINT_EPSILON
    && point[1] >= Math.min(segment.start[1], segment.end[1]) - POINT_EPSILON
    && point[1] <= Math.max(segment.start[1], segment.end[1]) + POINT_EPSILON;
}

/**
 * 创建 segment bbox。
 * @param segment 当前 segment
 * @returns bbox 与 segment 组合对象
 */
function createSegmentBounds<T>(segment: InternalLineSegment<T>): SegmentBounds<T> {
  const end = segment.extensionHit ?? segment.end;
  return {
    segment,
    minX: Math.min(segment.start[0], end[0]),
    minY: Math.min(segment.start[1], end[1]),
    maxX: Math.max(segment.start[0], end[0]),
    maxY: Math.max(segment.start[1], end[1]),
  };
}

/**
 * 按 minX、minY 和 segment 身份稳定排序 bbox。
 * @param left 左侧 bbox
 * @param right 右侧 bbox
 * @returns Array.sort 比较值
 */
function compareSegmentBounds<T>(
  left: SegmentBounds<T>,
  right: SegmentBounds<T>
): number {
  return left.minX - right.minX
    || left.minY - right.minY
    || createSegmentIdentity(left.segment).localeCompare(createSegmentIdentity(right.segment));
}

/**
 * 判断两个 segment bbox 的 Y 区间是否重叠。
 * @param first 第一条 bbox
 * @param second 第二条 bbox
 * @returns Y 区间存在交集时返回 true
 */
function isYRangeOverlapping<T>(
  first: SegmentBounds<T>,
  second: SegmentBounds<T>
): boolean {
  return second.minY <= first.maxY + CROSS_EPSILON
    && second.maxY + CROSS_EPSILON >= first.minY;
}

/**
 * 创建同一数学交点和参与 segment 组合的去重 key。
 * @param coordinate 交点坐标
 * @param first 第一条 segment
 * @param second 第二条 segment
 * @returns 稳定去重 key
 */
function createIntersectionKey<T>(
  coordinate: MapLineCoord,
  first: InternalLineSegment<T>,
  second: InternalLineSegment<T>
): string {
  const segmentKeys = [createSegmentIdentity(first), createSegmentIdentity(second)].sort();
  return `${pointKey(coordinate)}|${segmentKeys[0]}|${segmentKeys[1]}`;
}

/**
 * 创建 segment 在一次计算中的稳定身份。
 * @param segment 当前 segment
 * @returns 稳定身份字符串
 */
function createSegmentIdentity<T>(segment: InternalLineSegment<T>): string {
  return [
    segment.lineIndex,
    segment.pathIndex,
    segment.segmentIndex,
    segment.virtual ? `virtual:${segment.endpointSide}` : 'real',
  ].join(':');
}

/**
 * 判断两条引用是否指向同一 segment。
 * @param first 第一条 segment
 * @param second 第二条 segment
 * @returns 身份相同时返回 true
 */
function isSameSegment<T>(
  first: InternalLineSegment<T>,
  second: InternalLineSegment<T>
): boolean {
  return createSegmentIdentity(first) === createSegmentIdentity(second);
}

/**
 * 判断坐标是否位于 segment 任一端点。
 * @param point 待判断坐标
 * @param segment 当前 segment
 * @returns 命中端点时返回 true
 */
function isSegmentEndpoint<T>(
  point: MapLineCoord,
  segment: MapLineSegment<T>
): boolean {
  return pointsEqual(point, segment.start) || pointsEqual(point, segment.end);
}

/**
 * 将 GeoJSON Position 收敛为有效二维数值坐标。
 * @param value 原始 GeoJSON Position
 * @returns 有效二维坐标；非法时返回 null
 */
function toCoordinate(value: GeoJSON.Position): MapLineCoord | null {
  const x = Number(value?.[0]);
  const y = Number(value?.[1]);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

/**
 * 归一化 helper 接收的虚拟延长长度。
 * @param value 原始米数
 * @returns 可用正数；非法或非正数返回 0
 */
function normalizeExtensionMeters(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * 计算二维向量叉积。
 * @param firstX 第一向量 X
 * @param firstY 第一向量 Y
 * @param secondX 第二向量 X
 * @param secondY 第二向量 Y
 * @returns 叉积标量
 */
function cross(
  firstX: number,
  firstY: number,
  secondX: number,
  secondY: number
): number {
  return firstX * secondY - firstY * secondX;
}

/**
 * 计算两点真实距离。
 * @param start 起点
 * @param end 终点
 * @returns 米制距离
 */
function getMeterDistance(start: MapLineCoord, end: MapLineCoord): number {
  return MapLineMeasureTool.getDistanceInMeters(start, end);
}

/**
 * 判断两个坐标是否属于同一数值精度点。
 * @param first 第一坐标
 * @param second 第二坐标
 * @returns 固定精度 key 相同时返回 true
 */
function pointsEqual(first: MapLineCoord, second: MapLineCoord): boolean {
  return pointKey(first) === pointKey(second);
}

/**
 * 创建固定精度坐标 key。
 * @param point 原始坐标
 * @returns 纳米度级数值精度 key
 */
function pointKey(point: MapLineCoord): string {
  return `${Math.round(point[0] * POINT_SCALE)}:${Math.round(point[1] * POINT_SCALE)}`;
}

/**
 * 归一化浮点坐标，避免同一数学交点产生不同尾差。
 * @param point 原始坐标
 * @returns 固定精度二维坐标
 */
function normalizePoint(point: MapLineCoord): MapLineCoord {
  return [
    Math.round(point[0] * POINT_SCALE) / POINT_SCALE,
    Math.round(point[1] * POINT_SCALE) / POINT_SCALE,
  ];
}

/**
 * 将数值限制在闭区间内。
 * @param value 原始数值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的数值
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
