import { describe, expect, it } from 'vitest';
import type { MapCommonLineFeature } from '../../shared/map-common-tools';
import type { MapSourceFeatureRef } from '../../shared/map-common-tools';
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
});
