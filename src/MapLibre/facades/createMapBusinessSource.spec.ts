import { nextTick, ref, toRaw } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { FeatureProperties } from '../composables/useMapDataUpdate';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../shared/map-common-tools';
import * as mapFeatureData from '../shared/map-feature-data';
import { createMapBusinessSource, createMapBusinessSourceRegistry } from './createMapBusinessSource';
import {
  createCircleBusinessLayer,
  type MapBusinessLayerDescriptor,
} from './mapBusinessLayer';

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
  it('异步业务源在 null 或 undefined 首屏时会自动兜底为空 FeatureCollection，并允许后续回填', async () => {
    const data = ref<MapCommonFeatureCollection | null | undefined>(undefined);
    const source = createMapBusinessSource({
      sourceId: 'business-async',
      data,
      promoteId: 'id',
    });

    expect(toRaw(source.sourceProps.data as MapCommonFeatureCollection)).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(data.value).toEqual({
      type: 'FeatureCollection',
      features: [],
    });

    data.value = null;
    await nextTick();

    expect(toRaw(source.sourceProps.data as MapCommonFeatureCollection)).toEqual({
      type: 'FeatureCollection',
      features: [],
    });

    data.value = createFeatureCollection([createPointFeature('feature-async')]);
    await nextTick();

    expect((source.sourceProps.data as MapCommonFeatureCollection).features).toHaveLength(1);
    expect(source.resolveFeature('feature-async')?.properties?.id).toBe('feature-async');
  });

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
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
    expect(errorSpy).toHaveBeenCalledWith(
      "[createMapBusinessSource] source 'business-invalid-strategy' 必须且只能配置一种 ID 策略：promoteId、featureIdKey、getFeatureId"
    );

    errorSpy.mockRestore();
  });

  it('replaceFeatures 遇到重复业务 ID 时应返回 false 且保留旧快照', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const source = createMapBusinessSource({
      sourceId: 'business-replace',
      promoteId: 'id',
      data: ref(
        createFeatureCollection([
          createPointFeature('origin', {
            properties: { id: 'origin', name: '旧要素' },
          }),
        ])
      ),
      layers: ref([]),
    });

    const success = source.replaceFeatures([
      createPointFeature('dup-a', {
        properties: { id: 'dup', name: '重复 A' },
      }),
      createPointFeature('dup-b', {
        properties: { id: 'dup', name: '重复 B' },
      }),
    ]);

    expect(success).toBe(false);
    expect(source.resolveFeature('origin')?.properties?.name).toBe('旧要素');
    expect(source.resolveFeature('dup')).toBeNull();

    warnSpy.mockRestore();
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

  it('layers 支持 ref 与 getter 输入，并在非法值时回退为空数组', () => {
    const layerList: MapBusinessLayerDescriptor[] = [
      createCircleBusinessLayer({
        layerId: 'circle-ref',
      }),
    ];
    const layerRef = ref(layerList) as unknown as { value: MapBusinessLayerDescriptor[] };
    const getterLayers = (): MapBusinessLayerDescriptor[] => layerRef.value;
    const getterSource = createMapBusinessSource({
      sourceId: 'business-layer-getter',
      data: ref(createFeatureCollection([createPointFeature('feature-1')])),
      promoteId: 'id',
      layers: getterLayers,
    });
    const refSource = createMapBusinessSource({
      sourceId: 'business-layer-ref',
      data: ref(createFeatureCollection([createPointFeature('feature-2')])),
      promoteId: 'id',
      layers: layerRef as any,
    });

    expect(getterSource.getLayers()).toEqual(layerRef.value);
    expect(refSource.getLayers()).toEqual(layerRef.value);

    layerRef.value = [
      createCircleBusinessLayer({
        layerId: 'circle-next',
      }),
    ];

    expect(getterSource.getLayers()).toEqual(layerRef.value);
    expect(refSource.getLayers()).toEqual(layerRef.value);

    const invalidSource = createMapBusinessSource({
      sourceId: 'business-layer-invalid',
      data: ref(createFeatureCollection([createPointFeature('feature-3')])),
      promoteId: 'id',
      layers: ref('invalid-layer-input') as any,
    });

    expect(invalidSource.getLayers()).toEqual([]);
  });

  it('source 默认 propertyPolicy 会被 layer 继承，并允许按字段局部覆写', () => {
    const source = createMapBusinessSource({
      sourceId: 'business-policy',
      data: ref(
        createFeatureCollection([
          createPointFeature('feature-1', {
            properties: {
              name: '原始名称',
              mark: '锁定值',
              tag: '默认字段',
              status: 'draft',
            },
          }),
        ])
      ),
      promoteId: 'id',
      propertyPolicy: {
        readonlyKeys: ['name'],
        fixedKeys: ['tag'],
        rules: {
          status: {
            editable: false,
          },
        },
      },
      layers: [
        createCircleBusinessLayer({
          layerId: 'circle-layer',
          propertyPolicy: {
            fixedKeys: ['name'],
            hiddenKeys: ['tag'],
            rules: {
              status: {
                removable: false,
              },
            },
          },
        }),
      ],
    });

    expect(source.resolvePropertyPolicy(undefined)).toEqual({
      readonlyKeys: ['name'],
      fixedKeys: ['tag'],
      rules: {
        status: {
          editable: false,
        },
      },
    });
    expect(source.resolvePropertyPolicy('circle-layer')).toEqual({
      fixedKeys: ['name'],
      hiddenKeys: ['tag'],
      rules: {
        status: {
          editable: false,
          removable: false,
        },
      },
    });

    const sourcePanel = source.resolvePropertyPanelState('feature-1');
    const layerPanel = source.resolvePropertyPanelState('feature-1', 'circle-layer');

    expect(sourcePanel?.items.find((item) => item.key === 'name')).toMatchObject({
      editable: false,
      removable: false,
      temporary: false,
    });
    expect(sourcePanel?.items.find((item) => item.key === 'tag')).toMatchObject({
      editable: true,
      removable: false,
      temporary: false,
    });
    expect(layerPanel?.items.find((item) => item.key === 'name')).toMatchObject({
      editable: true,
      removable: false,
      temporary: false,
    });
    expect(layerPanel?.properties).not.toHaveProperty('tag');

    const sourceSaveResult = source.saveProperties('feature-1', {
      name: 'source-should-block',
    });

    expect(sourceSaveResult.success).toBe(false);
    expect(sourceSaveResult.blockedKeys).toEqual(['name']);
    expect(source.resolveFeature('feature-1')?.properties?.name).toBe('原始名称');

    const layerSaveResult = source.saveProperties(
      'feature-1',
      {
        name: 'layer-allowed',
      },
      'circle-layer'
    );

    expect(layerSaveResult.success).toBe(true);
    expect(layerSaveResult.blockedKeys).toEqual([]);
    expect(layerSaveResult.properties?.name).toBe('layer-allowed');

    const removeResult = source.removeProperties('feature-1', ['status'], 'circle-layer');

    expect(removeResult.success).toBe(false);
    expect(removeResult.blockedKeys).toEqual(['status']);
    expect(removeResult.removedKeys).toEqual([]);
    expect(source.resolveFeature('feature-1')?.properties?.status).toBe('draft');
  });
});
