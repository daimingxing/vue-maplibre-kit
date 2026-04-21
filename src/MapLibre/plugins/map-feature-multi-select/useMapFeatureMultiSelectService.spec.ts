import { afterEach, describe, expect, it } from 'vitest';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../../config';
import { useMapFeatureMultiSelectService } from './useMapFeatureMultiSelectService';

describe('useMapFeatureMultiSelectService', () => {
  afterEach(() => {
    resetMapGlobalConfig();
  });

  it('应继承全局 multi-select 默认值，并允许实例局部覆写', () => {
    setMapGlobalConfig({
      plugins: {
        multiSelect: {
          enabled: true,
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
});

