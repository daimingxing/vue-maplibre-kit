import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import type { MapFeatureMultiSelectOptions } from './types';
import { useMapFeatureMultiSelectService } from './useMapFeatureMultiSelectService';

describe('useMapFeatureMultiSelectService', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    resetMapGlobalConfig();
  });

  it('应继承全局 multi-select 默认值，并允许实例局部覆写', () => {
    setMapGlobalConfig({
      plugins: {
        multiSelect: {
          position: 'bottom-left',
          deactivateBehavior: 'retain',
          closeOnEscape: false,
        },
      },
    });

    const service = useMapFeatureMultiSelectService({
      getOptions: () => ({
        position: 'top-left',
      }),
    });

    expect(service.resolvedOptions.value).toEqual({
      enabled: true,
      position: 'top-left',
      deactivateBehavior: 'retain',
      closeOnEscape: false,
      targetLayerIds: null,
      excludeLayerIds: [],
      canSelect: undefined,
    });
  });

  it('destroy 后应解绑当前交互控制器并停止配置监听', async () => {
    const optionsRef = ref<MapFeatureMultiSelectOptions>({
      enabled: true,
      deactivateBehavior: 'clear' as const,
    });
    const binding = {
      activate: vi.fn(),
      deactivate: vi.fn(),
      clear: vi.fn(),
      isActive: vi.fn(() => true),
    };
    const service = useMapFeatureMultiSelectService({
      getOptions: () => optionsRef.value,
    });

    service.service.attachBinding(binding);
    expect(service.state.value.isActive).toBe(true);

    service.destroy();
    optionsRef.value = {
      enabled: false,
      deactivateBehavior: 'retain',
    };
    await nextTick();

    expect(binding.deactivate).not.toHaveBeenCalled();
    expect(service.state.value).toEqual({
      isActive: false,
      selectionMode: 'single',
      selectedFeatures: [],
      selectedCount: 0,
      deactivateBehavior: 'clear',
    });
  });
});
