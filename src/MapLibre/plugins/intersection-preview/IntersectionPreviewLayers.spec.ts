import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it, vi } from 'vitest';
import IntersectionPreviewLayers from './IntersectionPreviewLayers.vue';

vi.mock('vue-maplibre-gl', () => {
  return {
    MglGeoJsonSource: defineComponent({
      name: 'MglGeoJsonSourceStub',
      props: {
        sourceId: {
          type: String,
          required: true,
        },
        data: {
          type: Object,
          required: true,
        },
        promoteId: {
          type: String,
          default: '',
        },
      },
      setup(props, { slots }) {
        return () =>
          h(
            'section',
            {
              'data-source-id': props.sourceId,
              'data-promote-id': props.promoteId,
            },
            slots.default?.()
          );
      },
    }),
    MglCircleLayer: defineComponent({
      name: 'MglCircleLayerStub',
      props: {
        layerId: {
          type: String,
          required: true,
        },
        layout: {
          type: Object,
          default: () => ({}),
        },
        paint: {
          type: Object,
          default: () => ({}),
        },
        // 保持与 vue-maplibre-gl 一致的声明方式，复现“未传 filter 时会变成 false”的行为。
        filter: [Boolean, Array],
      },
      setup(props) {
        return () =>
          h('div', {
            'data-layer-id': props.layerId,
            'data-filter': JSON.stringify(props.filter),
          });
      },
    }),
  };
});

/**
 * 创建测试用的交点要素集合。
 * @returns 最小可渲染的交点点集
 */
function createPointCollection() {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        id: 'intersection-1',
        properties: {
          id: 'intersection-1',
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [121.98108, 31.191567],
        },
      },
    ],
  };
}

describe('IntersectionPreviewLayers', () => {
  it('应为预览层与正式交点层都显式附加 Point 过滤条件，避免被默认 false 过滤掉', async () => {
    const app = createSSRApp(() =>
      h(IntersectionPreviewLayers as any, {
        enabled: true,
        sourceId: 'intersection-preview-source',
        layerId: 'intersection-preview-layer',
        data: createPointCollection(),
        style: {
          layout: {},
          paint: {},
        },
        materializedEnabled: true,
        materializedSourceId: 'intersection-materialized-source',
        materializedLayerId: 'intersection-materialized-layer',
        materializedData: createPointCollection(),
        materializedStyle: {
          layout: {},
          paint: {},
        },
      })
    );

    const html = await renderToString(app);
    const pointFilter = JSON.stringify(['==', '$type', 'Point']).replaceAll('"', '&quot;');

    expect(html).toContain('data-layer-id="intersection-preview-layer"');
    expect(html).toContain(`data-filter="${pointFilter}"`);
    expect(html).toContain('data-layer-id="intersection-materialized-layer"');
    expect(html).toContain(`data-filter="${pointFilter}"`);
  });
});
