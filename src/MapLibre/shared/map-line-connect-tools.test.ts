import { describe, expect, it } from 'vitest';
import {
  createLineConnectSegments,
  findLineIntersections,
  type MapLineCoord,
  type MapLineInput,
} from './map-line-connect-tools';

const METER_LNG = 1 / 111_319.49;

/**
 * 创建测试用 LineString 输入。
 * @param id 线身份
 * @param groupId 求交分组
 * @param coordinates 线坐标
 * @returns 标准共享线输入
 */
function line(
  id: string,
  groupId: string,
  coordinates: MapLineCoord[]
): MapLineInput<string> {
  return {
    id,
    groupId,
    geometry: {
      type: 'LineString',
      coordinates,
    },
    data: id,
  };
}

/**
 * 使用同组求交配置解析测试线交点。
 * @param lines 待求交线集合
 * @param extensionMeters 虚拟延长长度
 * @returns 交点坐标集合
 */
function findSameIntersections(
  lines: MapLineInput<string>[],
  extensionMeters = 0
): MapLineCoord[] {
  return findLineIntersections({
    lines,
    extensionMeters,
    sameGroupIds: new Set(lines.map((item) => item.groupId)),
    crossGroupIds: new Set(),
  }).map((item) => item.coordinate);
}

describe('map-line-connect-tools', () => {
  it('计算同组不同线的 X 形交点', () => {
    const intersections = findSameIntersections([
      line('a', 'path', [[0, 0], [2, 2]]),
      line('b', 'path', [[0, 2], [2, 0]]),
    ]);

    expect(intersections).toEqual([[1, 1]]);
  });

  it('计算同一 LineString 的非相邻 segment 自交点', () => {
    const intersections = findSameIntersections([
      line('self', 'path', [[0, 0], [2, 2], [0, 2], [2, 0]]),
    ]);

    expect(intersections).toContainEqual([1, 1]);
  });

  it('计算同一 MultiLineString 不同 path 的交点', () => {
    const input: MapLineInput<string> = {
      id: 'multi',
      groupId: 'path',
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[0, 0], [2, 2]],
          [[0, 2], [2, 0]],
        ],
      },
      data: 'multi',
    };

    expect(findSameIntersections([input])).toEqual([[1, 1]]);
  });

  it('相邻 segment 和闭合首尾 segment 的公共端点不生成交点', () => {
    const open = line('open', 'path', [[0, 0], [1, 0], [1, 1]]);
    const closed = line('closed', 'path', [[2, 0], [3, 0], [3, 1], [2, 0]]);

    expect(findSameIntersections([open, closed])).toEqual([]);
  });

  it('端点与端点重合交给 vertex，端点落在线段中部生成 T 形交点', () => {
    const endpointOnly = findSameIntersections([
      line('a', 'path', [[0, 0], [1, 0]]),
      line('b', 'path', [[1, 0], [2, 0]]),
    ]);
    const tee = findSameIntersections([
      line('a', 'path', [[0, 0], [1, 0]]),
      line('b', 'path', [[1, -1], [1, 1]]),
    ]);

    expect(endpointOnly).toEqual([]);
    expect(tee).toEqual([[1, 0]]);
  });

  it('共线重叠不生成离散交点', () => {
    const intersections = findSameIntersections([
      line('a', 'path', [[0, 0], [2, 0]]),
      line('b', 'path', [[1, 0], [3, 0]]),
    ]);

    expect(intersections).toEqual([]);
  });

  it('跨组求交要求双方 group 都声明 crossLayerIntersect', () => {
    const lines = [
      line('a', 'left', [[0, 0], [2, 2]]),
      line('b', 'right', [[0, 2], [2, 0]]),
    ];
    const oneSide = findLineIntersections({
      lines,
      extensionMeters: 0,
      sameGroupIds: new Set(),
      crossGroupIds: new Set(['left']),
    });
    const bothSides = findLineIntersections({
      lines,
      extensionMeters: 0,
      sameGroupIds: new Set(),
      crossGroupIds: new Set(['left', 'right']),
    });

    expect(oneSide).toEqual([]);
    expect(bothSides.map((item) => item.coordinate)).toEqual([[1, 1]]);
  });

  it('空间接近但数学坐标不同的交点不按吸附容差合并', () => {
    const offset = 1e-6;
    const intersections = findSameIntersections([
      line('base-a', 'path', [[0, 0], [2, 0]]),
      line('cross-a', 'path', [[1, -1], [1, 1]]),
      line('base-b', 'path', [[0, offset], [2, offset]]),
      line('cross-b', 'path', [[1 + offset, -1], [1 + offset, 1]]),
    ]);

    expect(intersections).toContainEqual([1, 0]);
    expect(intersections).toContainEqual([1 + offset, offset]);
  });

  it('每个端点的虚拟延长线只保留最近真实线命中', () => {
    const nearX = METER_LNG;
    const farX = METER_LNG * 1.5;
    const segments = createLineConnectSegments([
      line('source', 'path', [[-METER_LNG, 0], [0, 0]]),
      line('near', 'path', [[nearX, -METER_LNG], [nearX, METER_LNG]]),
      line('far', 'path', [[farX, -METER_LNG], [farX, METER_LNG]]),
    ], 2);
    const sourceVirtual = segments.find((item) => item.virtual && item.line.id === 'source');

    expect(sourceVirtual?.start).toEqual([0, 0]);
    expect(sourceVirtual?.end[0]).toBeCloseTo(nearX, 9);
    expect(sourceVirtual?.end[1]).toBeCloseTo(0, 9);
  });

  it('虚拟延长命中在终点归一化后仍生成交点', () => {
    const lines: MapLineInput<string>[] = [
      {
        id: 'cut-drift',
        groupId: 'driftCenterLine',
        geometry: {
          type: 'LineString',
          coordinates: [
            [118.340744565, 43.263893229, 0],
            [118.342815083, 43.26383177, 0],
          ],
        },
        data: 'cut-drift',
      },
      {
        id: 'entry-32',
        groupId: 'driftCenterLine',
        geometry: {
          type: 'LineString',
          coordinates: [
            [118.340857801, 43.263889691, -3790.634],
            [118.341076629, 43.26186629, -3790.634],
          ],
        },
        data: 'entry-32',
      },
    ];

    const segments = createLineConnectSegments(lines, 2);
    const intersections = findLineIntersections({
      lines,
      extensionMeters: 2,
      sameGroupIds: new Set(['driftCenterLine']),
      crossGroupIds: new Set<string>(),
    });

    expect(segments.some((segment) => segment.virtual)).toBe(true);
    expect(intersections).toHaveLength(1);
    expect(intersections[0].coordinate).toEqual([
      118.340857782,
      43.263889868,
    ]);
    expect(
      intersections[0].first.virtual || intersections[0].second.virtual
    ).toBe(true);
  });

  it('虚拟延长起点不重复生成 intersection 候选', () => {
    const source = line('source', 'path', [[-METER_LNG, 0], [0, 0]]);
    const atOrigin = line('at-origin', 'path', [[0, -METER_LNG], [0, METER_LNG]]);
    const target = line('target', 'path', [
      [METER_LNG, -METER_LNG],
      [METER_LNG, METER_LNG],
    ]);
    const intersections = findLineIntersections({
      lines: [source, atOrigin, target],
      extensionMeters: 2,
      sameGroupIds: new Set(['path']),
      crossGroupIds: new Set<string>(),
    });

    const originIntersections = intersections.filter((item) => (
      item.coordinate[0] === 0 && item.coordinate[1] === 0
    ));
    expect(originIntersections).toHaveLength(1);
    expect(originIntersections[0].first.virtual).toBe(false);
    expect(originIntersections[0].second.virtual).toBe(false);
  });

  it('共线目标超过虚拟延长长度时不误判为连接', () => {
    const segments = createLineConnectSegments([
      line('source', 'path', [[-METER_LNG, 0], [0, 0]]),
      line('outside', 'path', [
        [METER_LNG * 2.5, 0],
        [METER_LNG * 3, 0],
        [METER_LNG * 3, METER_LNG],
        [METER_LNG * 2.5, METER_LNG],
        [METER_LNG * 2.5, 0],
      ]),
    ], 2);

    expect(segments.some((item) => item.virtual && item.line.id === 'source')).toBe(false);
  });

  it('共线重叠的虚拟延长线不生成离散连接', () => {
    const segments = createLineConnectSegments([
      line('source', 'path', [[-METER_LNG, 0], [0, 0]]),
      line('outside', 'path', [[METER_LNG * 2.5, 0], [METER_LNG * 3, 0]]),
    ], 2);

    expect(segments.some((item) => item.virtual && item.line.id === 'source')).toBe(false);
  });

  it('两条虚拟延长线可以在各自最近命中处相交', () => {
    const cross = [METER_LNG, 0] as MapLineCoord;
    const segments = createLineConnectSegments([
      line('horizontal', 'path', [[-METER_LNG, 0], [0, 0]]),
      line('vertical', 'path', [[METER_LNG, METER_LNG * 2], [METER_LNG, METER_LNG]]),
    ], 2);
    const virtualSegments = segments.filter((item) => item.virtual);

    expect(virtualSegments).toEqual(expect.arrayContaining([
      expect.objectContaining({ line: expect.objectContaining({ id: 'horizontal' }) }),
      expect.objectContaining({ line: expect.objectContaining({ id: 'vertical' }) }),
    ]));
    virtualSegments.forEach((segment) => {
      expect(segment.end[0]).toBeCloseTo(cross[0], 9);
      expect(segment.end[1]).toBeCloseTo(cross[1], 9);
    });
  });
});
