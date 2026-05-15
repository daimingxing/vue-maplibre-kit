import { describe, expect, it, vi } from 'vitest';
import type { MapFeatureSnapResult } from '../plugins/map-feature-snap';
import {
  createTerradrawReadySyncManager,
  syncTerradrawLineAndPolygonSnapping,
  buildTerradrawCustomSnapResolver,
} from './terradraw-snap-sync';

/**
 * 创建命中的吸附结果。
 * @param coordinate 命中的经纬度坐标
 * @param distancePx 当前鼠标到吸附点的屏幕距离
 * @returns 最小可用的吸附结果
 */
function createMatchedResult(
  coordinate: [number, number],
  distancePx: number
): MapFeatureSnapResult {
  return {
    matched: true,
    lngLat: {
      lng: coordinate[0],
      lat: coordinate[1],
    },
    distancePx,
    snapKind: 'vertex',
    ruleId: 'test-rule',
    targetFeature: null,
    targetLayerId: 'test-layer',
    targetSourceId: null,
    targetCoordinate: coordinate,
    segment: null,
  };
}

describe('buildTerradrawCustomSnapResolver', () => {
  it('应在业务图层和已绘制要素之间选择最近吸附坐标', () => {
    const resolver = buildTerradrawCustomSnapResolver({
      resolveMapResult: vi.fn(() => createMatchedResult([120, 30], 10)),
      resolveDrawnResult: vi.fn(() => createMatchedResult([120.001, 30.001], 4)),
    });

    expect(
      resolver({
        lng: 120,
        lat: 30,
        containerX: 10,
        containerY: 10,
      } as any)
    ).toEqual([120.001, 30.001]);
  });
});

describe('syncTerradrawLineAndPolygonSnapping', () => {
  it('关闭 useMapTargets 时不应在 TerraDraw 自定义吸附中解析业务图层', () => {
    const resolveMapResult = vi.fn(() => createMatchedResult([120, 30], 1));
    const resolveDrawnResult = vi.fn(() => createMatchedResult([121, 31], 2));
    const updateModeOptions = vi.fn();
    const readySyncManager = createTerradrawReadySyncManager();

    syncTerradrawLineAndPolygonSnapping({
      drawInstance: {
        enabled: true,
        updateModeOptions,
      } as any,
      taskKey: 'test-snapping',
      retryTask: vi.fn(),
      localSnapConfig: true,
      resolveSnapOptions: () => ({
        enabled: true,
        tolerancePx: 12,
        useNative: true,
        useMapTargets: false,
        drawnTargets: {
          enabled: true,
          geometryTypes: ['Point', 'LineString', 'Polygon'],
          snapTo: ['vertex', 'segment'],
        },
      }),
      ensureReadyForModeSync: readySyncManager.ensureReadyForModeSync,
      resolveMapResult,
      resolveDrawnResult,
    });

    const modePatch = updateModeOptions.mock.calls[0][1];
    modePatch.snapping.toCustom({
      lng: 120,
      lat: 30,
      containerX: 10,
      containerY: 10,
    });

    expect(resolveMapResult).not.toHaveBeenCalled();
    expect(resolveDrawnResult).toHaveBeenCalledTimes(1);
  });
});
