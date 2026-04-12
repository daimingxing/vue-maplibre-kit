import { describe, expect, it } from 'vitest';
import type { MapCommonFeature, MapCommonFeatureCollection } from './map-common-tools';
import { replaceFeatureCollectionFeatures } from './map-feature-data';

/**
 * 创建测试用点要素。
 * @param id 要素 ID
 * @param properties 业务属性
 * @returns 标准点要素
 */
function createPointFeature(
  id: string,
  properties: Record<string, any> = {}
): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      ...properties,
    },
    geometry: {
      type: 'Point',
      coordinates: [0, 0],
    },
  };
}

/**
 * 创建测试用要素集合。
 * @param features 要素列表
 * @returns 标准集合
 */
function createFeatureCollection(features: MapCommonFeature[]): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

describe('replaceFeatureCollectionFeatures', () => {
  it('会返回新的集合对象和新的 features 数组', () => {
    const currentCollection = createFeatureCollection([createPointFeature('old-1')]);
    const nextFeatures = [createPointFeature('new-1')];

    const result = replaceFeatureCollectionFeatures(currentCollection, nextFeatures);

    expect(result).not.toBe(currentCollection);
    expect(result.features).not.toBe(currentCollection.features);
    expect(result.features).not.toBe(nextFeatures);
    expect(result.features).toEqual(nextFeatures);
  });

  it('不会被外部 nextFeatures 的后续数组修改污染', () => {
    const currentCollection = createFeatureCollection([createPointFeature('old-1')]);
    const nextFeatures = [createPointFeature('new-1')];

    const result = replaceFeatureCollectionFeatures(currentCollection, nextFeatures);
    nextFeatures.push(createPointFeature('new-2'));
    nextFeatures[0] = createPointFeature('override-1');

    expect(result.features).toHaveLength(1);
    expect(result.features?.[0]).toEqual(createPointFeature('new-1'));
  });
});
