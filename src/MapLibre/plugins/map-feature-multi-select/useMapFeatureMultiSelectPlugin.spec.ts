import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { MapPluginContext } from '../types';
import type { MapFeatureMultiSelectOptions } from './types';
import {
  mapFeatureMultiSelectPlugin,
  MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
  type MapFeatureMultiSelectPluginDescriptor,
} from './useMapFeatureMultiSelectPlugin';

vi.mock('vue-maplibre-gl', () => ({}));

/**
 * 创建多选插件测试上下文。
 * @param optionsRef 插件配置引用
 * @returns 标准插件上下文
 */
function createPluginContext(
  optionsRef: { value: MapFeatureMultiSelectOptions | any }
): MapPluginContext<typeof MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE, MapFeatureMultiSelectOptions> {
  return {
    descriptor: {
      id: 'mapFeatureMultiSelect',
      type: MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
      options: optionsRef.value,
      plugin: mapFeatureMultiSelectPlugin,
    } as MapFeatureMultiSelectPluginDescriptor,
    getOptions: () => optionsRef.value,
    getMap: () => null,
    getMapInstance: () => ({}) as any,
    getBaseMapInteractive: () => null,
    getSelectedFeatureContext: () => null,
    clearHoverState: () => undefined,
    clearSelectedFeature: () => undefined,
    clearPluginHoverState: () => undefined,
    clearPluginSelectedFeature: () => undefined,
    toFeatureSnapshot: () => null,
  };
}

describe('mapFeatureMultiSelectPlugin', () => {
  it('应在插件实例上暴露 destroy 清理入口', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const optionsRef = ref({
      enabled: true,
    } as any);
    const pluginInstance = mapFeatureMultiSelectPlugin.createInstance(createPluginContext(optionsRef));

    expect(typeof pluginInstance.destroy).toBe('function');
    expect(() => pluginInstance.destroy?.()).not.toThrow();
    warnSpy.mockRestore();
  });
});
