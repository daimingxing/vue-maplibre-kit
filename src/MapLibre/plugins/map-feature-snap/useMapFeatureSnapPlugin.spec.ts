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
  optionsRef: { value: MapFeatureSnapOptions | any },
  listPlugins: () => Array<{ id: string; type: string }> = () => []
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
    listPlugins,
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
        panel: {
          enabled: true,
        },
      },
      businessLayers: {
        enabled: true,
        rules: [
          {
            id: 'line-snap',
            label: '线吸附',
            layerIds: ['line-layer'],
          },
        ],
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
      panelEnabled: true,
      groups: [
        {
          id: 'business-layers',
          label: '业务图层',
          items: [
            {
              id: 'line-snap',
              kind: 'rule',
              label: '线吸附',
              enabled: true,
            },
          ],
        },
      ],
    });
    expect(typeof controlItem?.props.onToggleTarget).toBe('function');
    expect(api?.isActive()).toBe(true);

    api?.toggle();

    expect(api?.isActive()).toBe(false);
    expect(pluginInstance.getRenderItems?.().find((item) => item.id === 'mapFeatureSnap-control')?.props)
      .toMatchObject({
        isActive: false,
      });

    pluginInstance.destroy?.();
  });

  it('应把插件列表传给控制器，用于渲染已注册插件吸附目标', () => {
    const optionsRef = ref({
      enabled: true,
      control: {
        enabled: true,
        panel: {
          enabled: true,
          intersection: true,
          polygonEdge: true,
        },
      },
    } as MapFeatureSnapOptions);
    const pluginInstance = mapFeatureSnapPlugin.createInstance(
      createPluginContext(optionsRef, () => [
        { id: 'intersectionPreview', type: 'intersectionPreview' },
        { id: 'polygonEdgePreview', type: 'polygonEdgePreview' },
      ])
    );
    const controlItem = pluginInstance
      .getRenderItems?.()
      .find((item) => item.id === 'mapFeatureSnap-control');

    expect(controlItem?.props.groups).toEqual([
      {
        id: 'plugin-targets',
        label: '插件目标',
        items: [
          {
            id: 'intersection',
            kind: 'target',
            label: '交点',
            enabled: true,
          },
          {
            id: 'polygonEdge',
            kind: 'target',
            label: '面边线',
            enabled: true,
          },
        ],
      },
    ]);

    pluginInstance.destroy?.();
  });
});
