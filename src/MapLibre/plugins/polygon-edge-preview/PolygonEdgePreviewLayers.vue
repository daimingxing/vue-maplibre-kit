<template>
  <mgl-geo-json-source
    v-if="enabled"
    :sourceId="POLYGON_EDGE_PREVIEW_SOURCE_ID"
    :data="data"
    promoteId="id"
  >
    <mgl-line-layer
      :layer-id="POLYGON_EDGE_PREVIEW_LINE_LAYER_ID"
      :layout="lineStyle.layout"
      :paint="lineStyle.paint"
      :filter="['all', ['==', '$type', 'LineString'], ['==', 'generatedKind', POLYGON_EDGE_PREVIEW_KIND]]"
    />
  </mgl-geo-json-source>
</template>

<script setup lang="ts">
/**
 * 面边线预览图层组件。
 * 负责渲染插件内部临时边线 source 和线图层。
 */
import { type PropType } from 'vue';
import { MglGeoJsonSource, MglLineLayer } from 'vue-maplibre-gl';
import type { LineLayerSpecification } from 'maplibre-gl';
import type { MapCommonFeatureCollection } from '../../shared/map-common-tools';
import type { MapLayerStyle } from '../../shared/map-layer-style-config';
import {
  POLYGON_EDGE_PREVIEW_KIND,
  POLYGON_EDGE_PREVIEW_LINE_LAYER_ID,
  POLYGON_EDGE_PREVIEW_SOURCE_ID,
} from './usePolygonEdgePreviewStore';

defineProps({
  /** 是否渲染面边线预览图层。 */
  enabled: {
    type: Boolean,
    default: false,
  },
  /** 面边线预览数据源。 */
  data: {
    type: Object as PropType<MapCommonFeatureCollection>,
    required: true,
  },
  /** 面边线图层样式。 */
  lineStyle: {
    type: Object as PropType<
      MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
    >,
    required: true,
  },
});
</script>
