import { describe, expect, it } from 'vitest';
import type { MapCommonLineFeature, MapSourceFeatureRef } from './map-common-tools';
import {
  buildIntersectionPointFeature,
  collectLineIntersections,
} from './map-intersection-tools';

/**
 * 创建测试用线要素。
 * @param id 线要素 ID
 * @param coordinates 线坐标串
 * @param name 线名称
 * @returns 标准线要素
 */
function createLineFeature(
  id: string,
  coordinates: [number, number][],
  name = id
): MapCommonLineFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      name,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

/**
 * 创建测试用来源引用。
 * @param featureId 业务要素 ID
 * @returns 标准来源引用
 */
function createFeatureRef(featureId: string): MapSourceFeatureRef {
  return {
    sourceId: 'line-source',
    featureId,
    layerId: 'line-layer',
  };
}

describe('collectLineIntersections', () => {
  it('会为两条业务线生成稳定交点对象', () => {
    const left = createLineFeature('line-a', [
      [0, 0],
      [10, 10],
    ]);
    const right = createLineFeature('line-b', [
      [0, 10],
      [10, 0],
    ]);

    const intersections = collectLineIntersections({
      scope: 'all',
      candidates: [
        {
          feature: left,
          ref: createFeatureRef('line-a'),
        },
        {
          feature: right,
          ref: createFeatureRef('line-b'),
        },
      ],
      includeEndpoint: true,
      coordDigits: 6,
      ignoreSelf: true,
    });

    expect(intersections).toHaveLength(1);
    expect(intersections[0].intersectionId).toContain('intersection:line-source:line-a');
    expect(intersections[0].point).toEqual({ lng: 5, lat: 5 });
    expect(intersections[0].leftRef.featureId).toBe('line-a');
    expect(intersections[0].rightRef.featureId).toBe('line-b');
  });

  it('在 selected 模式下只返回当前选中线与候选线的交点', () => {
    const selected = createLineFeature('line-selected', [
      [0, 0],
      [10, 0],
    ]);
    const hit = createLineFeature('line-hit', [
      [5, -5],
      [5, 5],
    ]);
    const miss = createLineFeature('line-miss', [
      [20, -5],
      [20, 5],
    ]);

    const intersections = collectLineIntersections({
      scope: 'selected',
      selectedRef: createFeatureRef('line-selected'),
      candidates: [
        {
          feature: selected,
          ref: createFeatureRef('line-selected'),
        },
        {
          feature: hit,
          ref: createFeatureRef('line-hit'),
        },
        {
          feature: miss,
          ref: createFeatureRef('line-miss'),
        },
      ],
      includeEndpoint: true,
      coordDigits: 6,
      ignoreSelf: true,
    });

    expect(intersections).toHaveLength(1);
    expect(intersections[0].leftRef.featureId).toBe('line-selected');
    expect(intersections[0].rightRef.featureId).toBe('line-hit');
  });

  it('会保留端点相交标记并支持转正式点要素', () => {
    const left = createLineFeature('line-a', [
      [0, 0],
      [10, 0],
    ]);
    const right = createLineFeature('line-b', [
      [10, 0],
      [10, 10],
    ]);

    const [intersection] = collectLineIntersections({
      scope: 'all',
      candidates: [
        {
          feature: left,
          ref: createFeatureRef('line-a'),
        },
        {
          feature: right,
          ref: createFeatureRef('line-b'),
        },
      ],
      includeEndpoint: true,
      coordDigits: 6,
      ignoreSelf: true,
    });

    const pointFeature = buildIntersectionPointFeature(intersection, {
      kind: 'materialized-node',
    });

    expect(intersection.isEndpointHit).toBe(true);
    expect(pointFeature.geometry.coordinates).toEqual([10, 0]);
    expect(pointFeature.properties?.intersectionId).toBe(intersection.intersectionId);
    expect(pointFeature.properties?.kind).toBe('materialized-node');
  });
});
