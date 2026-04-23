import { afterEach, describe, expect, it } from 'vitest';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import { useLineDraftPreviewController } from './useLineDraftPreviewController';

describe('useLineDraftPreviewController', () => {
  afterEach(() => {
    resetMapGlobalConfig();
  });

  it('应先继承全局 line-draft styleOverrides，再应用实例 styleOverrides', () => {
    setMapGlobalConfig({
      plugins: {
        lineDraft: {
          styleOverrides: {
            line: {
              paint: {
                'line-blur': 2,
              },
            },
            fill: {
              paint: {
                'fill-opacity': 0.7,
              },
            },
          },
        },
      },
    });

    const controller = useLineDraftPreviewController({
      getOptions: () =>
        ({
          enabled: true,
          styleOverrides: {
            line: {
              paint: {
                'line-opacity': 0.6,
              },
            },
            fill: {
              paint: {
                'fill-color': '#1677ff',
              },
            },
          },
        }) as any,
      getSelectedFeatureContext: () => null,
      clearPluginHoverState: () => undefined,
      clearPluginSelectedFeature: () => undefined,
    });

    expect(controller.lineStyle.value.paint['line-blur']).toBe(2);
    expect(controller.lineStyle.value.paint['line-opacity']).toBe(0.6);
    expect(controller.fillStyle.value.paint['fill-opacity']).toBe(0.7);
    expect(controller.fillStyle.value.paint['fill-color']).toBe('#1677ff');
  });
});
