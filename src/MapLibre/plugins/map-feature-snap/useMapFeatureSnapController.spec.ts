import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import { useMapFeatureSnapController } from './useMapFeatureSnapController';

describe('useMapFeatureSnapController', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
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
      drawnTargets: {
        enabled: false,
        geometryTypes: ['Point', 'LineString', 'Polygon'],
        snapTo: ['vertex', 'segment'],
      },
    });
  });

  it('应按 defaults、控件级配置归一化 TerraDraw 已绘制要素吸附目标', () => {
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        terradraw: {
          defaults: {
            enabled: true,
            drawnTargets: {
              geometryTypes: ['Point', 'LineString'],
              snapTo: ['vertex'],
            },
          },
          draw: {
            drawnTargets: true,
          },
          measure: {
            drawnTargets: false,
          },
        },
      }),
      getMap: () => null,
    });

    expect(controller.resolveTerradrawSnapOptions('draw', undefined).drawnTargets).toEqual({
      enabled: true,
      geometryTypes: ['Point', 'LineString'],
      snapTo: ['vertex'],
    });
    expect(controller.resolveTerradrawSnapOptions('measure', undefined).drawnTargets).toEqual({
      enabled: false,
      geometryTypes: ['Point', 'LineString', 'Polygon'],
      snapTo: ['vertex', 'segment'],
    });

    controller.destroy();
  });

  it('destroy 后应停止配置监听并销毁当前吸附绑定', async () => {
    const map = {
      on: vi.fn(),
      off: vi.fn(),
    };
    let enabled = true;
    const controller = useMapFeatureSnapController({
      getOptions: () => ({
        enabled,
      }),
      getMap: () => map as any,
    });

    expect(map.on).toHaveBeenCalledTimes(4);

    controller.destroy();
    enabled = false;
    await Promise.resolve();

    expect(map.off).toHaveBeenCalledTimes(4);
    expect(controller.binding.value).toBeNull();
  });
});
