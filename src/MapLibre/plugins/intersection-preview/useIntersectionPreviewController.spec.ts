import { describe, expect, it, vi } from 'vitest';
import type { MapCommonLineFeature, MapSourceFeatureRef } from '../../shared/map-common-tools';
import { useIntersectionPreviewController } from './useIntersectionPreviewController';

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

describe('useIntersectionPreviewController', () => {
  it('会刷新交点集合并按 ID 返回交点上下文', () => {
    const onStateChange = vi.fn();
    const controller = useIntersectionPreviewController({
      getOptions: () => ({
        enabled: true,
        visible: true,
        scope: 'all',
        targetSourceIds: ['line-source'],
        includeEndpoint: true,
        coordDigits: 6,
      }),
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
      getSelectedFeatureContext: () => null,
      onStateChange,
    });

    controller.refresh();
    const data = controller.data.value;
    const [feature] = data.features;
    const context = controller.getById(String(feature.id));

    expect(data.features).toHaveLength(1);
    expect(context?.intersectionId).toBe(String(feature.id));
    expect(context?.feature?.geometry.type).toBe('Point');
    expect(onStateChange).toHaveBeenCalled();
  });

  it('在 selected 模式下没有选中线时返回空集合', () => {
    const controller = useIntersectionPreviewController({
      getOptions: () => ({
        enabled: true,
        visible: true,
        scope: 'selected',
        targetSourceIds: ['line-source'],
        includeEndpoint: true,
        coordDigits: 6,
      }),
      getCandidates: () => [
        {
          feature: createLineFeature('line-a', [
            [0, 0],
            [10, 10],
          ]),
          ref: createFeatureRef('line-a'),
        },
      ],
      getSelectedFeatureContext: () => null,
    });

    controller.refresh();

    expect(controller.data.value.features).toHaveLength(0);
    expect(controller.getSelected()).toBeNull();
  });

  it('切换到 all 范围后会立即按全量候选线重新求交', () => {
    const stateSnapshots: Array<{ scope: 'all' | 'selected'; count: number }> = [];
    const pluginOptions = {
      enabled: true,
      visible: true,
      scope: 'selected' as const,
      targetSourceIds: ['line-source'],
      includeEndpoint: true,
      coordDigits: 6,
    };
    const controller = useIntersectionPreviewController({
      getOptions: () => pluginOptions,
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
      getSelectedFeatureContext: () => null,
      onStateChange: (state) => {
        stateSnapshots.push({
          scope: state.scope,
          count: state.count,
        });
      },
    });

    controller.refresh();
    expect(controller.data.value.features).toHaveLength(0);

    controller.setScope('all');

    expect(controller.data.value.features).toHaveLength(1);
    expect(stateSnapshots.at(-1)).toEqual({
      scope: 'all',
      count: 1,
    });
  });

  it('手动隐藏后重新 refresh 不应被 options.visible 覆盖', () => {
    const controller = useIntersectionPreviewController({
      getOptions: () => ({
        enabled: true,
        visible: true,
        scope: 'all',
        targetSourceIds: ['line-source'],
        includeEndpoint: true,
        coordDigits: 6,
      }),
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
      getSelectedFeatureContext: () => null,
    });

    controller.refresh();
    controller.hide();
    controller.refresh();

    expect(controller.visible.value).toBe(false);
  });
});
