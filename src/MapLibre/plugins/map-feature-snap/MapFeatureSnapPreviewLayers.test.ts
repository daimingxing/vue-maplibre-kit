import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapPluginHost } from '../../core/useMapPluginHost';
import { createMapFeatureSnapPlugin } from './index';
import MapFeatureSnapPreviewLayers from './MapFeatureSnapPreviewLayers.vue';
import { MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID } from './useMapFeatureSnapBinding';

const { useMapMock } = vi.hoisted(() => ({ useMapMock: vi.fn() }));
const map = {
  getLayer: vi.fn(() => ({ id: MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID })),
  setPaintProperty: vi.fn(),
};

vi.mock('vue-maplibre-gl', () => ({
  MglCircleLayer: defineComponent({ template: '<div />' }),
  MglCustomControl: defineComponent({ template: '<div><slot /></div>' }),
  MglGeoJsonSource: defineComponent({ template: '<div><slot /></div>' }),
  useMap: (key?: string | symbol) => {
    useMapMock(key);
    return { map };
  },
}));

describe('MapFeatureSnapPreviewLayers', () => {
  beforeEach(() => {
    useMapMock.mockClear();
    map.getLayer.mockClear();
    map.setPaintProperty.mockClear();
  });

  it('更新 pointStyle 后同步既有吸附点图层的 paint', async () => {
    const wrapper = mount(MapFeatureSnapPreviewLayers, {
      props: {
        enabled: true,
        data: { type: 'FeatureCollection', features: [] },
        pointStyle: { layout: {}, paint: { 'circle-color': '#ff7a00', 'circle-radius': 6 } },
      },
    });

    await wrapper.setProps({
      pointStyle: { layout: {}, paint: { 'circle-color': '#e11d48', 'circle-radius': 11 } },
    });
    await nextTick();

    expect(map.setPaintProperty).toHaveBeenCalledWith(
      MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
      'circle-color',
      '#e11d48'
    );
    expect(map.setPaintProperty).toHaveBeenCalledWith(
      MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
      'circle-radius',
      11
    );
  });

  it('按传入 mapKey 读取实际地图实例', () => {
    mount(MapFeatureSnapPreviewLayers, {
      props: {
        enabled: true,
        mapKey: 'horizontal-3568',
        data: { type: 'FeatureCollection', features: [] },
        pointStyle: { layout: {}, paint: {} },
      },
    });

    expect(useMapMock).toHaveBeenCalledWith('horizontal-3568');
  });

  it('重复替换插件 options 时更新渲染项的吸附点样式', async () => {
    const Host = defineComponent({
      setup() {
        const descriptors = ref([createMapFeatureSnapPlugin({
          enabled: true,
          internalContext: { mapKey: 'horizontal-3568' },
          preview: { pointColor: '#ff7a00', pointRadius: 6 },
        })]);
        const host = useMapPluginHost({
          getDescriptors: () => descriptors.value,
          getMap: () => null,
          getMapInstance: () => ({}) as never,
          getBaseMapInteractive: () => null,
          getSelectedFeatureContext: () => null,
          clearHoverState: vi.fn(),
          clearSelectedFeature: vi.fn(),
          clearPluginHoverState: vi.fn(),
          clearPluginSelectedFeature: vi.fn(),
          toFeatureSnapshot: () => null,
        });
        return { descriptors, renderItems: host.renderItems };
      },
      template: '<component v-for="item in renderItems" :is="item.component" :key="item.id" v-bind="item.props" />',
    });
    const wrapper = mount(Host);

    wrapper.vm.descriptors = [createMapFeatureSnapPlugin({
      enabled: true,
      internalContext: { mapKey: 'horizontal-3568' },
      preview: { pointColor: '#e11d48', pointRadius: 11 },
    })];
    await nextTick();

    expect(map.setPaintProperty).toHaveBeenCalledWith(
      MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
      'circle-color',
      '#e11d48'
    );
    expect(useMapMock).toHaveBeenCalledWith('horizontal-3568');
  });
});
