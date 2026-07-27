import { describe, expect, it } from 'vitest';
import type { MapFeatureSnapResult } from './types';
import { buildPreviewData } from './useMapFeatureSnapBinding';

describe('mapFeatureSnap preview', () => {
  it('兼容未提供交点父线字段的普通吸附结果', () => {
    const result: MapFeatureSnapResult = {
      matched: true,
      lngLat: { lng: 1, lat: 1 },
      distancePx: 0,
      snapKind: 'vertex',
      ruleId: 'path',
      targetFeature: null,
      targetLayerId: 'path-layer',
      targetSourceId: 'path-source',
      targetCoordinate: [1, 1],
      segment: null,
    };

    expect(buildPreviewData(result).features).toHaveLength(1);
  });

  it('交点命中也只保留吸附点预览', () => {
    const result: MapFeatureSnapResult = {
      matched: true,
      lngLat: { lng: 1, lat: 1 },
      distancePx: 0,
      snapKind: 'crossLayerIntersect',
      ruleId: 'left',
      targetFeature: null,
      targetLayerId: 'left-layer',
      targetSourceId: 'left-source',
      targetCoordinate: [1, 1],
      segment: null,
    };

    expect(buildPreviewData(result).features).toEqual([expect.objectContaining({
      properties: { kind: 'point' },
    })]);
  });
});
