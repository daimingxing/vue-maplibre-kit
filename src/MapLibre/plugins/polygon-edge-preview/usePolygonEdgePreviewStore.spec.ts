import { describe, expect, it } from 'vitest';
import type { Position } from 'geojson';
import { usePolygonEdgePreviewStore } from './usePolygonEdgePreviewStore';
import type { MapCommonFeature } from '../../shared/map-common-tools';

/**
 * 创建 Polygon 测试要素。
 * @param id 要素 ID
 * @param coordinates 面坐标
 * @returns 测试面要素
 */
function createPolygonFeature(id: string, coordinates: Position[][]): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      type: 'boundary',
    },
    geometry: {
      type: 'Polygon',
      coordinates,
    },
  };
}

/**
 * 创建 MultiPolygon 测试要素。
 * @param id 要素 ID
 * @param coordinates 多面坐标
 * @returns 测试多面要素
 */
function createMultiPolygonFeature(id: string, coordinates: Position[][][]): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
    },
    geometry: {
      type: 'MultiPolygon',
      coordinates,
    },
  };
}

describe('usePolygonEdgePreviewStore', () => {
  it('应按每条边生成 Polygon 外环临时边线', () => {
    const store = usePolygonEdgePreviewStore({ isEnabled: () => true });
    const result = store.generateFromFeature({
      feature: createPolygonFeature('land-1', [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 0],
        ],
      ]),
      origin: { sourceId: 'source-a', featureId: 'land-1', layerId: 'land-layer' },
    });

    expect(result.success).toBe(true);
    expect(result.edgeCount).toBe(3);
    expect(store.featureCollection.value.features).toHaveLength(3);
    expect(store.featureCollection.value.features[0].properties).toMatchObject({
      id: 'polygon-edge::source-a::land-1::0::0::0',
      generatedKind: 'polygon-edge-preview',
      generatedGroupId: 'polygon-edge-preview::source-a::land-1',
      generatedParentSourceId: 'source-a',
      generatedParentFeatureId: 'land-1',
      generatedParentLayerId: 'land-layer',
      polygonId: 'polygon::source-a::land-1',
      ringId: 'ring::source-a::land-1::0::0',
      edgeId: 'polygon-edge::source-a::land-1::0::0::0',
      polygonIndex: 0,
      ringIndex: 0,
      edgeIndex: 0,
      isOuterRing: true,
    });
  });

  it('应支持内环洞和单条边高亮状态', () => {
    const store = usePolygonEdgePreviewStore({ isEnabled: () => true });
    store.generateFromFeature({
      feature: createPolygonFeature('land-1', [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 0],
        ],
        [
          [2, 2],
          [4, 2],
          [2, 2],
        ],
      ]),
      origin: { sourceId: 'source-a', featureId: 'land-1', layerId: 'land-layer' },
    });

    const innerEdge = store.featureCollection.value.features.find(
      (feature) => feature.properties?.isOuterRing === false
    );
    expect(innerEdge?.properties?.ringIndex).toBe(1);

    const edgeId = String(innerEdge?.properties?.edgeId);
    expect(store.highlightEdge(edgeId)).toBe(true);
    expect(store.getFeatureById(edgeId)?.properties?.edgeState).toBe('highlighted');

    store.clearHighlight();
    expect(store.getFeatureById(edgeId)?.properties?.edgeState).toBe('normal');
  });

  it('应支持 MultiPolygon 并过滤连续重复坐标造成的零长度边', () => {
    const store = usePolygonEdgePreviewStore({ isEnabled: () => true });
    const result = store.generateFromFeature({
      feature: createMultiPolygonFeature('land-2', [
        [
          [
            [0, 0],
            [0, 0],
            [1, 0],
            [0, 0],
          ],
        ],
        [
          [
            [10, 10],
            [11, 10],
            [10, 10],
          ],
        ],
      ]),
      origin: { sourceId: 'source-a', featureId: 'land-2', layerId: 'land-layer' },
    });

    expect(result.success).toBe(true);
    expect(result.edgeCount).toBe(4);
    expect(
      store.featureCollection.value.features.some(
        (feature) => feature.properties?.polygonIndex === 1
      )
    ).toBe(true);
  });

  it('禁用时不应生成边线', () => {
    const store = usePolygonEdgePreviewStore({ isEnabled: () => false });
    const result = store.generateFromFeature({
      feature: createPolygonFeature('land-1', [
        [
          [0, 0],
          [10, 0],
          [0, 0],
        ],
      ]),
      origin: { sourceId: 'source-a', featureId: 'land-1', layerId: 'land-layer' },
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('面边线预览插件未启用');
    expect(store.featureCollection.value.features).toHaveLength(0);
  });

  it('应按来源面属性写入命中的特定边线样式', () => {
    const store = usePolygonEdgePreviewStore({
      isEnabled: () => true,
      getStyleRules: () => [
        {
          where: {
            type: 'boundary',
          },
          style: {
            normal: {
              color: '#ff7a00',
              width: 4,
            },
            hover: {
              color: '#f56c6c',
            },
          },
        },
      ],
    });

    store.generateFromFeature({
      feature: createPolygonFeature('land-1', [
        [
          [0, 0],
          [10, 0],
          [0, 0],
        ],
      ]),
      origin: { sourceId: 'source-a', featureId: 'land-1', layerId: 'land-layer' },
    });

    expect(store.featureCollection.value.features[0].properties).toMatchObject({
      edgeNormalColor: '#ff7a00',
      edgeNormalWidth: 4,
      edgeHoverColor: '#f56c6c',
    });
  });
});
