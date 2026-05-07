import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { MapPluginContext } from '../types';
import type { MapFeatureSnapOptions } from './types';
import {
  mapFeatureSnapPlugin,
  MAP_FEATURE_SNAP_PLUGIN_TYPE,
  type MapFeatureSnapPluginDescriptor,
} from './useMapFeatureSnapPlugin';

vi.mock('vue-maplibre-gl', () => ({}));

/**
 * 创建吸附插件测试上下文。
 * @param optionsRef 插件配置引用
 * @returns 标准插件上下文
 */
function createPluginContext(
  optionsRef: { value: MapFeatureSnapOptions | any }
): MapPluginContext<typeof MAP_FEATURE_SNAP_PLUGIN_TYPE, MapFeatureSnapOptions> {
  return {
    descriptor: {
      id: 'mapFeatureSnap',
      type: MAP_FEATURE_SNAP_PLUGIN_TYPE,
      options: optionsRef.value,
      plugin: mapFeatureSnapPlugin,
    } as MapFeatureSnapPluginDescriptor,
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

describe('mapFeatureSnapPlugin', () => {
  it('应渲染吸附开关控件并通过 API 切换运行期吸附状态', () => {
    const optionsRef = ref({
      enabled: true,
      control: {
        enabled: true,
        position: 'top-right',
        label: '吸附',
      },
    } as MapFeatureSnapOptions);
    const pluginInstance = mapFeatureSnapPlugin.createInstance(createPluginContext(optionsRef));
    const api = pluginInstance.getApi?.();
    const renderItems = pluginInstance.getRenderItems?.() || [];
    const controlItem = renderItems.find((item) => item.id === 'mapFeatureSnap-control');

    expect(controlItem?.props).toMatchObject({
      position: 'top-right',
      isActive: true,
      label: '吸附',
    });
    expect(api?.isActive()).toBe(true);

    api?.toggle();

    expect(api?.isActive()).toBe(false);
    expect(pluginInstance.getRenderItems?.().find((item) => item.id === 'mapFeatureSnap-control')?.props)
      .toMatchObject({
        isActive: false,
      });

    pluginInstance.destroy?.();
  });
});
