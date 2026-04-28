import { describe, expect, it } from 'vitest';
import {
  MapLineCorridorTool,
  MapLineExtensionTool,
  buildGeneratedFeatureProperties,
  extractGeneratedParentRef,
  type MapCommonLineFeature,
} from './map-common-tools';

describe('插件生成要素元数据工具', () => {
  it('应构建统一的插件生成要素元数据', () => {
    const properties = buildGeneratedFeatureProperties({
      generatedKind: 'polygon-edge-preview',
      groupId: 'polygon-edge::source-a::land-1',
      parentRef: {
        sourceId: 'source-a',
        featureId: 'land-1',
        layerId: 'land-fill-layer',
      },
    });

    expect(properties).toEqual({
      generatedKind: 'polygon-edge-preview',
      generatedGroupId: 'polygon-edge::source-a::land-1',
      generatedParentSourceId: 'source-a',
      generatedParentFeatureId: 'land-1',
      generatedParentLayerId: 'land-fill-layer',
      managedPreviewOriginSourceId: 'source-a',
      managedPreviewOriginFeatureId: 'land-1',
      managedPreviewOriginLayerId: 'land-fill-layer',
      managedPreviewOriginKey: 'source-a::land-1',
    });
  });

  it('应优先从统一字段提取插件生成要素来源引用', () => {
    const parentRef = extractGeneratedParentRef({
      generatedParentSourceId: 'source-a',
      generatedParentFeatureId: 'land-1',
      generatedParentLayerId: 'land-fill-layer',
      managedPreviewOriginSourceId: 'legacy-source',
      managedPreviewOriginFeatureId: 'legacy-feature',
      managedPreviewOriginLayerId: 'legacy-layer',
    });

    expect(parentRef).toEqual({
      sourceId: 'source-a',
      featureId: 'land-1',
      layerId: 'land-fill-layer',
    });
  });

  it('应兼容旧托管预览来源字段', () => {
    const parentRef = extractGeneratedParentRef({
      managedPreviewOriginSourceId: 'source-a',
      managedPreviewOriginFeatureId: 'land-1',
      managedPreviewOriginLayerId: 'land-fill-layer',
    });

    expect(parentRef).toEqual({
      sourceId: 'source-a',
      featureId: 'land-1',
      layerId: 'land-fill-layer',
    });
  });
});

describe('线草稿生成元数据', () => {
  /**
   * 创建测试线要素。
   * @returns 测试线要素
   */
  function createLineFeature(): MapCommonLineFeature {
    return {
      type: 'Feature',
      id: 'line-1',
      properties: {
        id: 'line-1',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [120, 30],
          [121, 31],
        ],
      },
    };
  }

  it('线延长草稿应写入统一插件生成字段', () => {
    const feature = MapLineExtensionTool.extendSelectedLineSegment(
      createLineFeature(),
      0,
      100,
      {
        sourceId: 'source-a',
        featureId: 'line-1',
        layerId: 'line-layer',
      }
    );

    expect(feature?.properties).toMatchObject({
      generatedKind: 'line-extension-draft',
      generatedGroupId: 'line-extension-draft::source-a::line-1',
      generatedParentSourceId: 'source-a',
      generatedParentFeatureId: 'line-1',
      generatedParentLayerId: 'line-layer',
    });
  });

  it('线廊草稿应写入统一插件生成字段', () => {
    const lineFeature = MapLineExtensionTool.extendSelectedLineSegment(
      createLineFeature(),
      0,
      100,
      {
        sourceId: 'source-a',
        featureId: 'line-1',
        layerId: 'line-layer',
      }
    );
    expect(lineFeature).not.toBeNull();

    const feature = MapLineCorridorTool.createRegionFeature(lineFeature!, 20, {
      generatedKind: 'line-corridor-draft',
    });

    expect(feature?.properties).toMatchObject({
      generatedKind: 'line-corridor-draft',
      generatedGroupId: 'line-corridor-draft::source-a::line-1',
      generatedParentSourceId: 'source-a',
      generatedParentFeatureId: 'line-1',
      generatedParentLayerId: 'line-layer',
    });
  });
});
