import { computed, shallowRef } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type { LineDraftPreviewPluginApi } from '../plugins/line-draft-preview';
import type { MapCommonLineFeature } from '../shared/map-common-tools';
import { useLineDraftPreview } from './useLineDraftPreview';

/** 线草稿插件类型常量。 */
const LINE_DRAFT_PREVIEW_PLUGIN_TYPE = 'lineDraftPreview';

/**
 * 创建测试用线要素。
 * @param id 要素 ID
 * @returns 标准线要素
 */
function createLineFeature(id: string): MapCommonLineFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      name: '测试线',
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [120, 30],
        [120.01, 30.01],
      ],
    },
  };
}

/**
 * 创建可被线草稿门面消费的地图公开实例。
 * @param api 线草稿插件 API
 * @returns 地图公开实例
 */
function createMapExpose(api: LineDraftPreviewPluginApi | null): MapLibreInitExpose {
  return {
    plugins: {
      has: () => Boolean(api),
      getApi: () => api,
      getState: () => ({
        hasFeatures: true,
        featureCount: 1,
      }),
      list: () =>
        api
          ? [
              {
                id: 'lineDraftPreview',
                type: LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
              },
            ]
          : [],
    },
  } as unknown as MapLibreInitExpose;
}

describe('useLineDraftPreview', () => {
  it('应透出底层线草稿读写动作', () => {
    const lineFeature = createLineFeature('line-1');
    const api = {
      data: computed(() => ({
        type: 'FeatureCollection',
        features: [lineFeature],
      })),
      lineStyle: computed(() => ({ layout: {}, paint: {} })),
      fillStyle: computed(() => ({ layout: {}, paint: {} })),
      getFeatureById: vi.fn(() => lineFeature),
      isFeatureById: vi.fn(() => true),
      isSelectedFeature: vi.fn(() => false),
      getSelectedFeatureSnapshot: vi.fn(() => null),
      previewLine: vi.fn(() => lineFeature),
      replacePreviewRegion: vi.fn(() => true),
      clear: vi.fn(),
      saveProperties: vi.fn(() => ({
        success: true,
        target: 'map',
        featureId: 'line-1',
        properties: { id: 'line-1', name: '已保存' },
        message: '保存成功',
        blockedKeys: [],
        removedKeys: [],
      })),
      removeProperties: vi.fn(() => ({
        success: true,
        target: 'map',
        featureId: 'line-1',
        properties: { id: 'line-1' },
        message: '删除成功',
        blockedKeys: [],
        removedKeys: ['name'],
      })),
    } as unknown as LineDraftPreviewPluginApi;

    const preview = useLineDraftPreview(shallowRef(createMapExpose(api)));

    expect(preview.getData()?.features).toHaveLength(1);
    expect(preview.previewLine({
      lineFeature,
      segmentIndex: 0,
      extendLengthMeters: 10,
    })).toBe(lineFeature);
    expect(preview.replacePreviewRegion({ lineFeature, widthMeters: 5 })).toBe(true);
    expect(preview.saveProperties('line-1', { name: '已保存' }).success).toBe(true);
    expect(preview.removeProperties('line-1', ['name']).removedKeys).toEqual(['name']);
  });

  it('应在插件未注册时安全降级', () => {
    const preview = useLineDraftPreview(shallowRef(createMapExpose(null)));
    const lineFeature = createLineFeature('line-1');

    expect(preview.getData()).toBeNull();
    expect(preview.previewLine({ lineFeature, segmentIndex: 0, extendLengthMeters: 10 })).toBeNull();
    expect(preview.replacePreviewRegion({ lineFeature, widthMeters: 5 })).toBe(false);
    expect(preview.saveProperties('line-1', { name: '已保存' }).success).toBe(false);
    expect(preview.removeProperties('line-1', ['name']).success).toBe(false);
  });
});
