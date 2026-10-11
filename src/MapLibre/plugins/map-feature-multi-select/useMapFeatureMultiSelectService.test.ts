import { describe, expect, it, vi } from 'vitest';
import { useMapFeatureMultiSelectService } from './useMapFeatureMultiSelectService';

describe('useMapFeatureMultiSelectService', () => {
  it('无组件实例时不注册卸载钩子，并仍可通过 destroy 释放', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const service = useMapFeatureMultiSelectService({
      getOptions: () => ({ enabled: true }),
    });
    service.destroy();

    expect(warn.mock.calls.some((args) => String(args[0]).includes('onBeforeUnmount'))).toBe(false);
    warn.mockRestore();
  });
});
