import { describe, expect, it } from 'vitest';
import type {
  MapFeatureSnapKind,
  MapFeatureSnapRelation,
  MapFeatureSnapResult,
  MapFeatureSnapTarget,
} from './types';
import { buildPreviewData } from './useMapFeatureSnapBinding';

/**
 * 创建只用于预览投影测试的规范化 matched 结果。
 * @param relation 当前交互关系
 * @param snapKind 当前吸附类型
 * @param snapCoordinate 用户可见坐标
 * @param geometryCoordinate 真实目标坐标
 * @returns 兼容字段与 decision 一致的吸附结果
 */
function matchedResult(
  relation: MapFeatureSnapRelation,
  snapKind: MapFeatureSnapKind,
  snapCoordinate: [number, number],
  geometryCoordinate: [number, number]
): MapFeatureSnapResult {
  const target: MapFeatureSnapTarget = {
    key: 'path:0',
    ruleId: 'path',
    sourceId: 'path-source',
    layerId: 'path-layer',
    feature: {
      type: 'Feature',
      id: 'path-1',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[0, 0], [2, 2]] },
    },
    geometryCoordinate,
    attachment: relation === 'intersection' ? 'extended' : 'real',
    segment: null,
    snapKind,
    distancePx: 0,
  };
  return {
    resolution: {
      status: 'matched',
      decision: {
        relation,
        snapKind,
        snapCoordinate,
        primaryTargetKey: target.key,
        targets: [target],
        participants: relation === 'intersection'
          ? [target, { ...target, key: 'context:0', sourceId: 'context-source' }]
          : [],
      },
    },
    matched: true,
    lngLat: { lng: snapCoordinate[0], lat: snapCoordinate[1] },
    distancePx: 0,
    snapKind,
    ruleId: 'path',
    targetFeature: null,
    targetLayerId: 'path-layer',
    targetSourceId: 'path-source',
    targetCoordinate: geometryCoordinate,
    anchorCoordinate: snapCoordinate,
    segment: null,
  };
}

describe('mapFeatureSnap preview', () => {
  it('direct 只渲染一个 decision 吸附点', () => {
    const result = matchedResult('direct', 'vertex', [1, 1], [1, 1]);

    expect(buildPreviewData(result).features).toHaveLength(1);
  });

  it('交点命中也只保留吸附点预览', () => {
    const result = matchedResult('intersection', 'crossLayerIntersect', [1, 1], [0.9, 0.9]);

    expect(buildPreviewData(result).features).toEqual([expect.objectContaining({
      properties: { kind: 'point' },
    })]);
  });

  it('预览始终使用 decision.snapCoordinate，不读取兼容 targetCoordinate', () => {
    const result = matchedResult('intersection', 'sameLayerIntersect', [1.5, 1.5], [1, 1]);

    expect(buildPreviewData(result).features[0]?.geometry).toEqual({
      type: 'Point',
      coordinates: [1.5, 1.5],
    });
  });
});
