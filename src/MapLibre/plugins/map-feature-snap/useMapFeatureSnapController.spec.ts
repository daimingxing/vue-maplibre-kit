import { afterEach, describe, expect, it } from 'vitest';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import { useMapFeatureSnapController } from './useMapFeatureSnapController';

describe('useMapFeatureSnapController', () => {
  afterEach(() => {
    resetMapGlobalConfig();
  });

  it('应继承全局 snap 预览默认值，并允许实例局部覆写', () => {
    setMapGlobalConfig({
      plugins: {
        snap: {
          preview: {
            pointColor: '#1677ff',
            lineWidth: 6,
          },
        },
      },
    });

    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        preview: {
          lineColor: '#ff4d4f',
        },
      }),
      getMap: () => null,
    });

    expect(controller.previewPointStyle.value.paint['circle-color']).toBe('#1677ff');
    expect(controller.previewLineStyle.value.paint['line-color']).toBe('#ff4d4f');
    expect(controller.previewLineStyle.value.paint['line-width']).toBe(6);
  });

  it('resolveTerradrawSnapOptions 应按 全局默认 -> 控件默认 -> 实例局部 覆写合并', () => {
    setMapGlobalConfig({
      plugins: {
        snap: {
          defaultTolerancePx: 24,
          terradraw: {
            defaults: {
              enabled: true,
              useNative: false,
            },
            draw: {
              useMapTargets: false,
            },
          },
        },
      },
    });

    const controller = useMapFeatureSnapController({
      getOptions: () => ({}),
      getMap: () => null,
    });

    expect(
      controller.resolveTerradrawSnapOptions('draw', {
        tolerancePx: 40,
      }),
    ).toEqual({
      enabled: true,
      tolerancePx: 40,
      useNative: false,
      useMapTargets: false,
    });
  });
});

