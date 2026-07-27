import { describe, expect, it } from 'vitest';
import type { Feature, LineString, Position } from 'geojson';
import type {
  MapFeatureSnapMode,
  MapFeatureSnapResolvedFeature,
  MapFeatureSnapRule,
} from './types';
import {
  createSnapIntersectionStore,
  DEFAULT_INTERSECTION_EXTENSION_METERS,
  resolveIntersectionExtensionMeters,
} from './mapFeatureSnapIntersections';

/**
 * 创建测试用完整线要素。
 * @param id 要素 ID
 * @param coordinates 完整线坐标
 * @returns resolver 输出项
 */
function resolvedLine(
  id: string,
  coordinates: Position[]
): MapFeatureSnapResolvedFeature {
  const feature: Feature<LineString, Record<string, unknown>> = {
    type: 'Feature',
    id,
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };

  return {
    feature,
    sourceId: 'source-path',
    layerId: `layer-${id}`,
  };
}

/**
 * 创建交点索引规则。
 * @param id 规则 ID
 * @param snapTo 交点模式
 * @param features 当前规则完整线数据
 * @param isVisible 当前规则显隐读取函数
 * @returns 可直接传给索引的规则
 */
function rule(
  id: string,
  snapTo: MapFeatureSnapMode[],
  features: MapFeatureSnapResolvedFeature[],
  isVisible: () => boolean = () => true
): MapFeatureSnapRule & { id: string; resolvedFeatures: MapFeatureSnapResolvedFeature[] } {
  return {
    id,
    layerIds: features.map((item) => item.layerId),
    snapTo,
    isVisible,
    resolvedFeatures: features,
  };
}

describe('mapFeatureSnapIntersections', () => {
  it('sameLayerIntersect 计算同 rule 的交点并通过 KDBush range 查询', () => {
    const store = createSnapIntersectionStore();
    store.rebuild([
      rule('path', ['sameLayerIntersect'], [
        resolvedLine('a', [[0, 0], [2, 2]]),
        resolvedLine('b', [[0, 2], [2, 0]]),
      ]),
    ], 0);

    expect(store.range(0.9, 0.9, 1.1, 1.1)).toEqual([
      expect.objectContaining({
        coordinate: [1, 1],
        pairs: [expect.objectContaining({ kind: 'sameLayerIntersect' })],
      }),
    ]);
    expect(store.range(2, 2, 3, 3)).toEqual([]);
  });

  it('crossLayerIntersect 只有双方 rule 都声明时才建索引', () => {
    const left = resolvedLine('left', [[0, 0], [2, 2]]);
    const right = resolvedLine('right', [[0, 2], [2, 0]]);
    const store = createSnapIntersectionStore();

    store.rebuild([
      rule('left', ['crossLayerIntersect'], [left]),
      rule('right', ['segment'], [right]),
    ], 0);
    expect(store.range(0, 0, 2, 2)).toEqual([]);

    store.rebuild([
      rule('left', ['crossLayerIntersect'], [left]),
      rule('right', ['crossLayerIntersect'], [right]),
    ], 0);
    expect(store.range(0, 0, 2, 2)[0]?.pairs[0].kind).toBe('crossLayerIntersect');
  });

  it('相近但不同的数学交点保留为两个索引坐标', () => {
    const offset = 1e-6;
    const store = createSnapIntersectionStore();
    store.rebuild([
      rule('path', ['sameLayerIntersect'], [
        resolvedLine('base-a', [[0, 0], [2, 0]]),
        resolvedLine('cross-a', [[1, -1], [1, 1]]),
        resolvedLine('base-b', [[0, offset], [2, offset]]),
        resolvedLine('cross-b', [[1 + offset, -1], [1 + offset, 1]]),
      ]),
    ], 0);

    const coordinates = store.range(0.9, -0.1, 1.1, 0.1).map((item) => item.coordinate);
    expect(coordinates).toContainEqual([1, 0]);
    expect(coordinates).toContainEqual([1 + offset, offset]);
  });

  it('虚拟延长交点进入 KDBush 索引并保留真实父线', () => {
    const cutDrift = resolvedLine('cut-drift', [
      [118.340744565, 43.263893229, 0],
      [118.342815083, 43.26383177, 0],
    ]);
    const entry32 = resolvedLine('entry-32', [
      [118.340857801, 43.263889691, -3790.634],
      [118.341076629, 43.26186629, -3790.634],
    ]);
    const store = createSnapIntersectionStore();

    store.rebuild([
      rule('driftCenterLine', ['sameLayerIntersect'], [cutDrift, entry32]),
    ], 2);

    const points = store.range(
      118.34085777,
      43.26388985,
      118.34085779,
      43.26388989
    );
    expect(store.size()).toBe(1);
    expect(points).toHaveLength(1);
    expect(points[0].coordinate).toEqual([
      118.340857782,
      43.263889868,
    ]);
    expect(points[0].pairs).toHaveLength(1);
    expect([
      points[0].pairs[0].first.feature.id,
      points[0].pairs[0].second.feature.id,
    ]).toEqual(expect.arrayContaining(['cut-drift', 'entry-32']));
  });

  it('显隐函数变化不重建几何，feature 引用变化时重建', () => {
    const firstFeature = resolvedLine('a', [[0, 0], [2, 2]]);
    const secondFeature = resolvedLine('b', [[0, 2], [2, 0]]);
    const store = createSnapIntersectionStore();

    expect(store.rebuild([
      rule('path', ['sameLayerIntersect'], [firstFeature, secondFeature], () => true),
    ], 0)).toBe(true);
    expect(store.rebuild([
      rule('path', ['sameLayerIntersect'], [firstFeature, secondFeature], () => false),
    ], 0)).toBe(false);
    expect(store.rebuild([
      rule('path', ['sameLayerIntersect'], [
        resolvedLine('a', [[0, 0], [2, 2]]),
        secondFeature,
      ]),
    ], 0)).toBe(true);
  });

  it('0 禁用虚拟延长，非法值回退 kit 默认值', () => {
    expect(resolveIntersectionExtensionMeters(0)).toBe(0);
    expect(resolveIntersectionExtensionMeters(-1)).toBe(DEFAULT_INTERSECTION_EXTENSION_METERS);
    expect(resolveIntersectionExtensionMeters(Number.NaN)).toBe(DEFAULT_INTERSECTION_EXTENSION_METERS);
    expect(resolveIntersectionExtensionMeters(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_INTERSECTION_EXTENSION_METERS
    );
  });

  it('clear 释放坐标数组和 KDBush 索引', () => {
    const store = createSnapIntersectionStore();
    store.rebuild([
      rule('path', ['sameLayerIntersect'], [
        resolvedLine('a', [[0, 0], [2, 2]]),
        resolvedLine('b', [[0, 2], [2, 0]]),
      ]),
    ], 0);

    store.clear();

    expect(store.size()).toBe(0);
    expect(store.range(0, 0, 2, 2)).toEqual([]);
  });
});
