<template>
  <mgl-geo-json-source
    v-if="enabled"
    :sourceId="LINE_DRAFT_PREVIEW_SOURCE_ID"
    :data="data"
    promoteId="id"
  >
    <mgl-fill-layer
      :layer-id="LINE_DRAFT_PREVIEW_FILL_LAYER_ID"
      :layout="fillStyle.layout"
      :paint="fillStyle.paint"
      :filter="[
        'all',
        ['==', '$type', 'Polygon'],
        ['==', 'generatedKind', LINE_DRAFT_PREVIEW_CORRIDOR_KIND],
      ]"
      :interactive="false"
    />
    <mgl-line-layer
      :layer-id="LINE_DRAFT_PREVIEW_LINE_LAYER_ID"
      :layout="lineStyle.layout"
      :paint="lineStyle.paint"
      :filter="[
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'generatedKind', MapLineExtensionTool.TEMPORARY_EXTENSION_KIND],
      ]"
    />
  </mgl-geo-json-source>
</template>

<script setup lang="ts">
/**
 * 线草稿预览图层组件。
 * 负责渲染内部草稿数据源与临时线 / 临时线廊图层，让核心宿主不再持有具体业务模板。
 */
import { type PropType } from 'vue';
import { MglGeoJsonSource, MglFillLayer, MglLineLayer } from 'vue-maplibre-gl';
import {
  MapLineExtensionTool,
  type MapCommonFeatureCollection,
} from '../../shared/map-common-tools';
import {
  LINE_DRAFT_PREVIEW_CORRIDOR_KIND,
  LINE_DRAFT_PREVIEW_FILL_LAYER_ID,
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
} from './useLineDraftPreviewStore';
import type { MapLayerStyle } from '../../shared/map-layer-style-config';
import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';

defineProps({
  /** 是否渲染线草稿预览图层。 */
  enabled: {
    type: Boolean,
    default: false,
  },
  /** 线草稿预览数据源。 */
  data: {
    type: Object as PropType<MapCommonFeatureCollection>,
    required: true,
  },
  /** 线草稿线图层样式。 */
  lineStyle: {
    type: Object as PropType<
      MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
    >,
    required: true,
  },
  /** 线廊草稿图层样式。 */
  fillStyle: {
    type: Object as PropType<
      MapLayerStyle<FillLayerSpecification['layout'], FillLayerSpecification['paint']>
    >,
    required: true,
  },
});
</script>
