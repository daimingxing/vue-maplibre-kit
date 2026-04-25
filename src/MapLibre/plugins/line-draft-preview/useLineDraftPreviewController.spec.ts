import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import { useLineDraftPreviewController } from './useLineDraftPreviewController';
import type { MapCommonFeature } from '../../shared/map-common-tools';

/**
 * 创建线草稿测试要素。
 * @param id 要素 ID
 * @returns 标准测试要素
 */
function createDraftFeature(id: string): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
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

describe('useLineDraftPreviewController', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
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

  it('destroy 后应停止状态监听和启用状态清理监听', async () => {
    const onStateChange = vi.fn();
    const optionsRef = ref({
      enabled: true,
    });
    const controller = useLineDraftPreviewController({
      getOptions: () => optionsRef.value,
      getSelectedFeatureContext: () => null,
      clearPluginHoverState: () => undefined,
      clearPluginSelectedFeature: () => undefined,
      onStateChange,
    });

    onStateChange.mockClear();
    controller.data.value.features.push(createDraftFeature('draft-1'));
    await nextTick();

    expect(onStateChange).toHaveBeenCalledWith({
      hasFeatures: true,
      featureCount: 1,
    });

    onStateChange.mockClear();
    controller.destroy();
    expect(controller.data.value.features).toHaveLength(0);
    optionsRef.value = {
      enabled: false,
    };
    await nextTick();

    expect(onStateChange).not.toHaveBeenCalled();
  });
});
