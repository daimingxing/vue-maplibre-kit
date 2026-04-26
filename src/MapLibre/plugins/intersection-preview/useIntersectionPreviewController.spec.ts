import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { MapCommonLineFeature } from '../../shared/map-common-tools';
import type { MapSourceFeatureRef } from '../../shared/map-common-tools';
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
} from '../../facades/createMapBusinessSource';
import { createLineBusinessLayer } from '../../facades/mapBusinessLayer';
import { useIntersectionPreviewController } from './useIntersectionPreviewController';
import type { IntersectionPreviewOptions } from './types';

/**
 * 创建测试用线要素。
 * @param id 线要素 ID
 * @param coordinates 线坐标串
 * @returns 标准线要素
 */
function createLineFeature(id: string, coordinates: [number, number][]): MapCommonLineFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      name: id,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

/**
 * 创建测试用来源引用。
 * @param featureId 业务要素 ID
 * @returns 标准来源引用
 */
function createFeatureRef(featureId: string): MapSourceFeatureRef {
  return {
    sourceId: 'line-source',
    featureId,
    layerId: 'line-layer',
  };
}

/**
 * 创建测试用交点插件配置。
 * @returns 标准配置
 */
function createPluginOptions(): IntersectionPreviewOptions {
  return {
    enabled: true,
    visible: true,
    scope: 'all',
    targetSourceIds: ['line-source'],
    targetLayerIds: ['line-layer'],
    includeEndpoint: true,
    coordDigits: 6,
    materializedProperties: (context) => {
      return {
        category: 'intersection-node',
        note: `${String(context.leftRef.featureId)} x ${String(context.rightRef.featureId)}`,
      };
    },
    getCandidates: () => [
      {
        feature: createLineFeature('line-a', [
          [0, 0],
          [10, 10],
        ]),
        ref: createFeatureRef('line-a'),
      },
      {
        feature: createLineFeature('line-b', [
          [0, 10],
          [10, 0],
        ]),
        ref: createFeatureRef('line-b'),
      },
    ],
  };
}

describe('useIntersectionPreviewController', () => {
  it('同一交点同时存在预览点与正式点时，getById 应默认返回正式点上下文', () => {
    const controller = useIntersectionPreviewController({
      getOptions: () => createPluginOptions(),
      getCandidates: () => createPluginOptions().getCandidates?.() || [],
      getSelectedFeatureContext: () => null,
    });

    controller.refresh();

    const [previewFeature] = controller.getData().features;
    const intersectionId = String(previewFeature?.id || '');
    expect(intersectionId).not.toBe('');
    expect(controller.materialize(intersectionId)).toBe(true);

    const intersection = controller.getById(intersectionId);
    const preview = controller.getPreviewById(intersectionId);
    const materialized = controller.getMaterializedById(intersectionId);

    expect(preview?.feature?.properties?.generatedKind).toBe('intersection-preview');
    expect(materialized?.feature?.properties?.generatedKind).toBe('intersection-materialized');
    expect(intersection?.feature?.properties?.generatedKind).toBe('intersection-materialized');
  });

  it('应支持正式交点默认属性、属性更新、删除，并在 refresh 后保留业务补丁', () => {
    const controller = useIntersectionPreviewController({
      getOptions: () => createPluginOptions(),
      getCandidates: () => createPluginOptions().getCandidates?.() || [],
      getSelectedFeatureContext: () => null,
    });

    controller.refresh();

    const [previewFeature] = controller.getData().features;
    const intersectionId = String(previewFeature?.id || '');
    expect(intersectionId).not.toBe('');

    expect(controller.materialize(intersectionId)).toBe(true);
    expect(controller.getMaterializedData().features).toHaveLength(1);
    expect(controller.getMaterializedData().features[0].properties?.category).toBe(
      'intersection-node'
    );

    expect(
      controller.updateMaterializedProperties(intersectionId, {
        name: '已确认交点',
        status: 'done',
      })
    ).toBe(true);
    expect(controller.getMaterializedData().features[0].properties?.name).toBe('已确认交点');
    expect(controller.getMaterializedData().features[0].properties?.status).toBe('done');
    expect(controller.getMaterializedData().features[0].properties?.id).toBe(intersectionId);

    controller.refresh();

    expect(controller.getMaterializedData().features).toHaveLength(1);
    expect(controller.getMaterializedData().features[0].properties?.status).toBe('done');
    expect(controller.getMaterializedData().features[0].properties?.id).toBe(intersectionId);

    expect(controller.removeMaterialized(intersectionId)).toBe(true);
    expect(controller.getMaterializedData().features).toHaveLength(0);
  });

  it('物化正式交点时应优先继承 selected 模式下当前选中线一侧的属性，并允许补丁覆盖', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createMapBusinessSource({
        sourceId: 'line-source',
        data: ref({
          type: 'FeatureCollection',
          features: [
            createLineFeature('line-a', [
              [0, 0],
              [10, 10],
            ]),
            {
              ...createLineFeature('line-b', [
                [0, 10],
                [10, 0],
              ]),
              properties: {
                id: 'line-b',
                name: '选中线',
                category: 'selected-line',
                owner: 'right',
              },
            },
          ],
        }),
        promoteId: 'id',
        layers: [
          createLineBusinessLayer({
            layerId: 'line-layer',
          }),
        ],
      }),
    ]);
    const options: IntersectionPreviewOptions = {
      enabled: true,
      visible: true,
      scope: 'selected',
      targetSourceIds: ['line-source'],
      targetLayerIds: ['line-layer'],
      sourceRegistry,
      inheritMaterializedPropertiesFromLayerId: 'line-layer' as any,
      materializedProperties: {
        owner: 'patched',
        status: 'done',
      },
      getCandidates: () => [
        {
          feature: createLineFeature('line-a', [
            [0, 0],
            [10, 10],
          ]),
          ref: createFeatureRef('line-a'),
        },
        {
          feature: {
            ...createLineFeature('line-b', [
              [0, 10],
              [10, 0],
            ]),
            properties: {
              id: 'line-b',
              name: '选中线',
              category: 'selected-line',
              owner: 'right',
            },
          },
          ref: createFeatureRef('line-b'),
        },
      ],
    };
    const controller = useIntersectionPreviewController({
      getOptions: () => options,
      getCandidates: () => options.getCandidates?.() || [],
      getSelectedFeatureContext: () =>
        ({
          featureId: 'line-b',
          sourceId: 'line-source',
          layerId: 'line-layer',
        }) as any,
    });

    controller.refresh();

    const [previewFeature] = controller.getData().features;
    const intersectionId = String(previewFeature?.id || '');
    expect(intersectionId).not.toBe('');
    expect(controller.materialize(intersectionId)).toBe(true);

    const materializedFeature = controller.getMaterializedData().features[0];

    expect(materializedFeature.properties?.name).toBe('选中线');
    expect(materializedFeature.properties?.category).toBe('selected-line');
    expect(materializedFeature.properties?.owner).toBe('patched');
    expect(materializedFeature.properties?.status).toBe('done');
  });
});
