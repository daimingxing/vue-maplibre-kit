import { ref, toRaw } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { FeatureProperties } from '../composables/useMapDataUpdate';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../shared/map-common-tools';
import * as mapFeatureData from '../shared/map-feature-data';
import { createMapBusinessSource, createMapBusinessSourceRegistry } from './createMapBusinessSource';

/**
 * 创建测试用点要素。
 * @param propertyId properties 中的业务 ID
 * @param options 额外配置
 * @returns 测试要素
 */
function createPointFeature(
  propertyId: string,
  options: {
    topLevelId?: string | number;
    properties?: FeatureProperties;
  } = {}
): MapCommonFeature {
  return {
    type: 'Feature',
    ...(options.topLevelId !== undefined ? { id: options.topLevelId } : {}),
    properties: {
      id: propertyId,
      name: `name-${propertyId}`,
      ...(options.properties || {}),
    },
    geometry: {
      type: 'Point',
      coordinates: [120, 30],
    },
  };
}

/**
 * 创建测试用要素集合。
 * @param features 要素列表
 * @returns 标准要素集合
 */
function createFeatureCollection(features: MapCommonFeature[]): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

describe('createMapBusinessSource', () => {
  it('promoteId 路径初始化时只复制 features 数组，不深拷贝整条 feature', () => {
    const originalFeature = createPointFeature('feature-1', {
      properties: { status: 'normal' },
    });
    const collection = createFeatureCollection([originalFeature]);
    const data = ref(collection);

    const source = createMapBusinessSource({
      sourceId: 'business-promote',
      data,
      promoteId: 'id',
    });
    const normalizedCollection = toRaw(
      source.sourceProps.data as MapCommonFeatureCollection
    ) as MapCommonFeatureCollection;

    expect(normalizedCollection).not.toBe(collection);
    expect(normalizedCollection.features).not.toBe(collection.features);
    expect(toRaw(normalizedCollection.features?.[0] as MapCommonFeature)).toBe(originalFeature);
    expect(normalizedCollection.features?.[0].id).toBeUndefined();
  });

  it('featureIdKey 路径只复制需要补顶层 id 的 feature', () => {
    const featureNeedSync = createPointFeature('feature-1', {
      properties: { bizId: 'feature-1' },
    });
    const featureAlreadySynced = createPointFeature('feature-2', {
      topLevelId: 'feature-2',
      properties: { bizId: 'feature-2' },
    });
    const data = ref(createFeatureCollection([featureNeedSync, featureAlreadySynced]));

    const source = createMapBusinessSource({
      sourceId: 'business-key',
      data,
      featureIdKey: 'bizId',
    });
    const normalizedCollection = toRaw(
      source.sourceProps.data as MapCommonFeatureCollection
    ) as MapCommonFeatureCollection;

    expect(normalizedCollection.features?.[0]).not.toBe(featureNeedSync);
    expect(normalizedCollection.features?.[0].id).toBe('feature-1');
    expect(toRaw(normalizedCollection.features?.[0].properties as FeatureProperties)).toBe(
      featureNeedSync.properties
    );
    expect(toRaw(normalizedCollection.features?.[1] as MapCommonFeature)).toBe(featureAlreadySynced);
  });

  it('缺失 ID 或重复 ID 时仍保留原有校验语义', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const data = ref(
      createFeatureCollection([
        createPointFeature('dup', { properties: { bizId: 'dup' } }),
        createPointFeature('missing', { properties: {} }),
        createPointFeature('dup', { properties: { bizId: 'dup' } }),
      ])
    );

    const source = createMapBusinessSource({
      sourceId: 'business-invalid',
      data,
      featureIdKey: 'bizId',
    });
    const result = source.saveProperties('dup', { name: 'next-name' });

    expect(result.success).toBe(false);
    expect(result.message).toContain("source 'business-invalid'");
    expect(result.message).toContain('存在无法解析稳定 ID 的要素');
    expect(result.message).toContain('存在重复业务 ID（dup）');

    errorSpy.mockRestore();
  });

  it('无效策略路径会克隆原始集合，避免外部修改污染内部快照', () => {
    const collection = createFeatureCollection([
      createPointFeature('feature-1', {
        properties: { status: 'normal' },
      }),
    ]);
    const data = ref(collection);
    const source = createMapBusinessSource({
      sourceId: 'business-invalid-strategy',
      data,
    } as any);
    const normalizedCollection = toRaw(
      source.sourceProps.data as MapCommonFeatureCollection
    ) as MapCommonFeatureCollection;

    expect(normalizedCollection).not.toBe(collection);
    expect(normalizedCollection.features).not.toBe(collection.features);

    collection.features[0].properties!.status = 'polluted';

    expect(
      (
        toRaw(source.sourceProps.data as MapCommonFeatureCollection) as MapCommonFeatureCollection
      ).features[0].properties?.status
    ).toBe('normal');
  });

  it('promoteId 路径本地属性写回后会直接复用增量结果，不再重新标准化', () => {
    const data = ref(
      createFeatureCollection([
        createPointFeature('feature-1', { properties: { status: 'old' } }),
        createPointFeature('feature-2', { properties: { status: 'keep' } }),
      ])
    );
    const source = createMapBusinessSource({
      sourceId: 'business-promote',
      data,
      promoteId: 'id',
    });
    const sentinelCollection = createFeatureCollection([
      createPointFeature('feature-1', { properties: { status: 'new' } }),
      createPointFeature('feature-2', { properties: { status: 'keep' } }),
    ]);
    const saveSpy = vi
      .spyOn(mapFeatureData, 'saveFeaturePropertiesInCollection')
      .mockReturnValueOnce({
        success: true,
        data: sentinelCollection,
        properties: { id: 'feature-1', name: 'name-feature-1', status: 'new' },
        message: '属性保存成功',
        blockedKeys: [],
        removedKeys: [],
      });

    const saveResult = source.saveProperties('feature-1', { status: 'new' });

    expect(saveResult.success).toBe(true);
    expect(toRaw(data.value)).toBe(sentinelCollection);
    expect(toRaw(data.value.features)).toBe(sentinelCollection.features);

    saveSpy.mockRestore();
  });

  it('getFeatureId 路径本地属性写回后仍会回退到全量标准化', () => {
    let getFeatureIdCallCount = 0;
    const data = ref(
      createFeatureCollection([
        createPointFeature('feature-1', { properties: { bizId: 'feature-1', status: 'old' } }),
        createPointFeature('feature-2', { properties: { bizId: 'feature-2', status: 'keep' } }),
      ])
    );
    const source = createMapBusinessSource({
      sourceId: 'business-getter',
      data,
      getFeatureId: (feature) => {
        getFeatureIdCallCount += 1;
        return (feature.properties?.bizId as string | undefined) || null;
      },
    });
    const sentinelCollection = createFeatureCollection([
      createPointFeature('feature-1', { properties: { bizId: 'feature-1', status: 'new' } }),
      createPointFeature('feature-2', { properties: { bizId: 'feature-2', status: 'keep' } }),
    ]);
    const saveSpy = vi
      .spyOn(mapFeatureData, 'saveFeaturePropertiesInCollection')
      .mockReturnValueOnce({
        success: true,
        data: sentinelCollection,
        properties: {
          id: 'feature-1',
          name: 'name-feature-1',
          bizId: 'feature-1',
          status: 'new',
        },
        message: '属性保存成功',
        blockedKeys: [],
        removedKeys: [],
      });

    getFeatureIdCallCount = 0;
    const saveResult = source.saveProperties('feature-1', { status: 'new' });

    expect(saveResult.success).toBe(true);
    expect(getFeatureIdCallCount).toBe(2);
    expect(toRaw(data.value)).not.toBe(sentinelCollection);
    expect(toRaw(data.value.features)).not.toBe(sentinelCollection.features);

    saveSpy.mockRestore();
  });

  it('重复 sourceId 时会直接抛出异常，避免静默忽略后续 source', () => {
    const primarySource = createMapBusinessSource({
      sourceId: 'business-duplicate',
      data: ref(createFeatureCollection([createPointFeature('feature-1')])),
      promoteId: 'id',
    });
    const secondarySource = createMapBusinessSource({
      sourceId: 'business-duplicate',
      data: ref(createFeatureCollection([createPointFeature('feature-2')])),
      promoteId: 'id',
    });

    expect(() => {
      createMapBusinessSourceRegistry([primarySource, secondarySource]);
    }).toThrowError("[createMapBusinessSourceRegistry] 检测到重复 sourceId：business-duplicate");
  });
});
