import { describe, expect, it } from 'vitest';
import { createMapBusinessSourceRegistry } from './createMapBusinessSource';
import type * as BusinessPresetModule from './businessPreset';

/**
 * 动态读取业务预设模块。
 * @returns 业务预设模块
 */
async function loadBusinessPreset(): Promise<typeof BusinessPresetModule> {
  (globalThis as any).window = globalThis;
  return import('./businessPreset');
}

describe('businessPreset', () => {
  it('应创建常用简单样式', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createSimpleCircleStyle, createSimpleFillStyle, createSimpleLineStyle } =
      businessPreset;
    const lineStyle = createSimpleLineStyle({ color: '#2563eb', width: 3 });
    const circleStyle = createSimpleCircleStyle({ color: '#16a34a', radius: 8 });
    const fillStyle = createSimpleFillStyle({ color: '#f97316', opacity: 0.2 });

    expect(lineStyle.paint!['line-color']).toBe('#2563eb');
    expect(lineStyle.paint!['line-width']).toBe(3);
    expect(circleStyle.paint!['circle-color']).toBe('#16a34a');
    expect(circleStyle.paint!['circle-radius']).toBe(8);
    expect(fillStyle.paint!['fill-color']).toBe('#f97316');
    expect(fillStyle.paint!['fill-opacity']).toBe(0.2);
  }, 10000);

  it('应把图层组简写转换为现有业务图层描述', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createLayerGroup, createSimpleLineStyle } = businessPreset;
    const layers = createLayerGroup({
      defaultPolicy: { fixedKeys: ['id'] },
      defaultStyle: createSimpleLineStyle({ color: '#2563eb' }),
      layers: [
        {
          type: 'line',
          id: 'pipe-line',
          where: { kind: 'pipe' },
          geometryTypes: ['LineString'],
        },
      ],
    });

    expect(layers).toHaveLength(1);
    expect(layers[0]).toMatchObject({
      type: 'line',
      layerId: 'pipe-line',
      where: { kind: 'pipe' },
      geometryTypes: ['LineString'],
      propertyPolicy: { fixedKeys: ['id'] },
    });
  });

  it('应创建控件预设并支持局部覆盖', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createMapControlsPreset } = businessPreset;
    const controls = createMapControlsPreset('basic', {
      MglFullscreenControl: undefined,
    });

    expect(controls.MglNavigationControl).toEqual({});
    expect(controls.MglScaleControl).toEqual({});
    expect(controls.MaplibreTerradrawControl).toEqual({});
    expect(controls.MglFullscreenControl).toBeUndefined();
  });

  it('应创建常用业务插件配置', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const sourceRegistry = createMapBusinessSourceRegistry([]);
    const plugins = createBusinessPlugins({
      snap: {
        layerIds: ['pipe-line'],
      },
      lineDraft: true,
      intersection: {
        sourceRegistry,
        targetSourceIds: ['primary'],
      },
      polygonEdge: true,
      multiSelect: true,
      dxfExport: {
        sourceRegistry,
      },
    });

    expect(plugins.map((plugin) => plugin.type)).toEqual([
      'mapFeatureSnap',
      'lineDraftPreview',
      'intersectionPreview',
      'polygonEdgePreview',
      'mapFeatureMultiSelect',
      'mapDxfExport',
    ]);
    expect((plugins[0].options as any).businessLayers.rules[0].layerIds).toEqual(['pipe-line']);
    expect((plugins[3].options as any).enabled).toBe(true);
  });

  it('应允许 snap 直接传完整 businessLayers 配置', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const plugins = createBusinessPlugins({
      snap: {
        businessLayers: {
          enabled: true,
          rules: [
            {
              id: 'custom-snap',
              layerIds: ['custom-line'],
              snapTo: ['vertex', 'segment'],
            },
          ],
        },
      },
    });

    expect(plugins[0].type).toBe('mapFeatureSnap');
    expect((plugins[0].options as any).layerIds).toBeUndefined();
    expect((plugins[0].options as any).businessLayers.rules[0].id).toBe('custom-snap');
  });

  it('应临时兼容 snap 直接传完整 ordinaryLayers 配置', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const plugins = createBusinessPlugins({
      snap: {
        ordinaryLayers: {
          enabled: true,
          rules: [
            {
              id: 'old-snap',
              layerIds: ['old-line'],
            },
          ],
        },
      },
    });

    expect((plugins[0].options as any).businessLayers.rules[0].id).toBe('old-snap');
    expect((plugins[0].options as any).ordinaryLayers.rules[0].id).toBe('old-snap');
  });
});
