import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
  createMapLibreRawHandles,
  type MapLibreInitExpose,
} from '../core/mapLibre-init.types';
import type { LineDraftPreviewPluginApi } from '../plugins/line-draft-preview/useLineDraftPreviewController';
import { LINE_DRAFT_PREVIEW_SOURCE_ID } from '../plugins/line-draft-preview/useLineDraftPreviewStore';
import type { MapPluginHostExpose } from '../plugins/types';
import type { MapCommonFeatureCollection, MapCommonLineFeature } from '../shared/map-common-tools';
import type { TerradrawFeature } from '../shared/mapLibre-controls-types';
import type { MapInstance } from 'vue-maplibre-gl';
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
} from './createMapBusinessSource';
import { createLineBusinessLayer } from './mapBusinessLayer';
import { useMapFeatureActions } from './useMapFeatureActions';

/**
 * 创建测试用线要素。
 * @param id 线要素 ID
 * @param coordinates 线坐标串
 * @param properties 额外业务属性
 * @returns 标准线要素
 */
function createLineFeature(
  id: string,
  coordinates: [number, number][],
  properties: Record<string, unknown> = {}
): MapCommonLineFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      ...properties,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

/**
 * 创建测试用要素集合。
 * @param features 要素列表
 * @returns 标准要素集合
 */
function createFeatureCollection(features: MapCommonLineFeature[]): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 创建测试用业务源注册表。
 * @param features 当前正式业务线列表
 * @returns 业务源注册表
 */
function createSourceRegistry(features: MapCommonLineFeature[]) {
  return createMapBusinessSourceRegistry([
    createMapBusinessSource({
      sourceId: 'business-source',
      data: ref(createFeatureCollection(features)),
      promoteId: 'id',
      layers: [
        createLineBusinessLayer({
          layerId: 'line-layer',
        }),
      ],
    }),
  ]);
}

/**
 * 创建测试用线草稿插件 API。
 * @param overrides 需要覆写的插件方法
 * @returns 线草稿插件 API
 */
function createLineDraftApi(
  overrides: Partial<LineDraftPreviewPluginApi> = {}
): LineDraftPreviewPluginApi {
  return {
    data: ref(createFeatureCollection([])),
    lineStyle: ref(null as any),
    fillStyle: ref(null as any),
    getFeatureById: () => null,
    isFeatureById: () => false,
    isSelectedFeature: () => false,
    getSelectedFeatureSnapshot: () => null,
    previewLine: () => null,
    replacePreviewRegion: () => false,
    clear: () => undefined,
    saveProperties: () => {
      return {
        success: true,
        target: 'map' as const,
        featureId: 'draft-1',
        properties: { id: 'draft-1' },
        message: '保存成功',
        blockedKeys: [],
        removedKeys: [],
      };
    },
    removeProperties: () => {
      return {
        success: true,
        target: 'map' as const,
        featureId: 'draft-1',
        properties: { id: 'draft-1' },
        message: '删除成功',
        blockedKeys: [],
        removedKeys: [],
      };
    },
    ...overrides,
  } as LineDraftPreviewPluginApi;
}

/**
 * 创建测试用地图公开实例。
 * @param lineDraftApi 当前线草稿插件 API
 * @returns 可供动作门面消费的公开实例
 */
function createMapExpose(lineDraftApi: LineDraftPreviewPluginApi): MapLibreInitExpose {
  const mapInstance = {
    component: undefined,
    map: undefined,
    isMounted: false,
    isLoaded: false,
    language: undefined,
  } as MapInstance;
  const pluginHost: MapPluginHostExpose = {
    has: (pluginId) => pluginId === 'lineDraftPreview',
    getApi: (pluginId) => (pluginId === 'lineDraftPreview' ? lineDraftApi : null),
    getState: () => null,
    list: () => [
      {
        id: 'lineDraftPreview',
        type: 'lineDraftPreview',
      },
    ],
  };

  return {
    rawHandles: createMapLibreRawHandles({
      mapInstance,
      getDrawControl: () => null,
      getMeasureControl: () => null,
    }),
    getDrawControl: () => null,
    getMeasureControl: () => null,
    getDrawFeatures: () => [] as TerradrawFeature[],
    getMeasureFeatures: () => [] as TerradrawFeature[],
    getSelectedMapFeature: () => null,
    getSelectedMapFeatureContext: () => null,
    getSelectedMapFeatureSnapshot: () => null,
    getMapSelectionService: () => null,
    getTerradrawPropertyPolicy: () => null,
    clearSelectedMapFeature: () => undefined,
    setMapFeatureState: () => true,
    plugins: pluginHost,
  };
}

describe('useMapFeatureActions', () => {
  it('previewLine 会优先使用显式传入的线要素与来源引用生成草稿', () => {
    const businessLine = createLineFeature('line-1', [
      [120, 30],
      [121, 31],
    ]);
    const previewLine = vi.fn(() => {
      return createLineFeature(
        'draft-1',
        [
          [121, 31],
          [121.1, 31.1],
        ],
        {
          generatedKind: 'temporary-extension',
        }
      );
    });
    const sourceRegistry = createSourceRegistry([businessLine]);
    const featureActions = useMapFeatureActions({
      mapRef: ref(
        createMapExpose(
          createLineDraftApi({
            previewLine,
          })
        )
      ),
      sourceRegistry,
    });

    const result = featureActions.previewLine({
      lineFeature: businessLine,
      featureRef: {
        sourceId: 'business-source',
        featureId: 'line-1',
        layerId: 'line-layer',
      },
      segmentIndex: 0,
      extendLengthMeters: 80,
    });

    expect(result.success).toBe(true);
    expect(result.target).toBe('lineDraft');
    expect(result.lineFeature?.properties?.id).toBe('draft-1');
    expect(previewLine).toHaveBeenCalledTimes(1);
    expect(previewLine).toHaveBeenCalledWith({
      lineFeature: businessLine,
      segmentIndex: 0,
      extendLengthMeters: 80,
      origin: {
        sourceId: 'business-source',
        featureId: 'line-1',
        layerId: 'line-layer',
      },
    });
  });

  it('replaceLineCorridor 会在显式来源是线草稿时继续写回草稿池', () => {
    const businessLine = createLineFeature('line-1', [
      [120, 30],
      [121, 31],
    ]);
    const draftLine = createLineFeature(
      'draft-1',
      [
        [121, 31],
        [121.2, 31.2],
      ],
      {
        generatedKind: 'temporary-extension',
      }
    );
    const replacePreviewRegion = vi.fn(() => true);
    const sourceRegistry = createSourceRegistry([businessLine]);
    const replaceFeatures = vi.spyOn(sourceRegistry, 'replaceFeatures');
    const featureActions = useMapFeatureActions({
      mapRef: ref(
        createMapExpose(
          createLineDraftApi({
            replacePreviewRegion,
            isFeatureById: (featureId) => featureId === 'draft-1',
          })
        )
      ),
      sourceRegistry,
    });

    const result = featureActions.replaceLineCorridor({
      lineFeature: draftLine,
      featureRef: {
        sourceId: LINE_DRAFT_PREVIEW_SOURCE_ID,
        featureId: 'draft-1',
        layerId: null,
      },
      widthMeters: 12,
    });

    expect(result.success).toBe(true);
    expect(result.target).toBe('lineDraft');
    expect(replacePreviewRegion).toHaveBeenCalledTimes(1);
    expect(replacePreviewRegion).toHaveBeenCalledWith({
      lineFeature: draftLine,
      widthMeters: 12,
    });
    expect(replaceFeatures).not.toHaveBeenCalled();
  });
});
