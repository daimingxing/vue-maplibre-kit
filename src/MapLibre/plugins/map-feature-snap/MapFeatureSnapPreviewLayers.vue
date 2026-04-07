<template>
  <mgl-geo-json-source v-if="enabled" :sourceId="MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID" :data="data">
    <mgl-line-layer
      :layer-id="MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID"
      :layout="lineStyle.layout"
      :paint="lineStyle.paint"
      :filter="['==', 'kind', 'segment']"
      :interactive="false"
    />
    <mgl-circle-layer
      :layer-id="MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID"
      :layout="pointStyle.layout"
      :paint="pointStyle.paint"
      :filter="['==', 'kind', 'point']"
      :interactive="false"
    />
  </mgl-geo-json-source>
</template>

<script setup lang="ts">
/**
 * 吸附预览图层组件。
 * 负责渲染统一吸附插件维护的“吸附点 + 命中线段”预览，不向业务层暴露内部 source/layer 结构。
 */
import { MglCircleLayer, MglGeoJsonSource, MglLineLayer } from 'vue-maplibre-gl';
import { type PropType } from 'vue';
import type { FeatureCollection } from 'geojson';
import type { CircleLayerSpecification, LineLayerSpecification } from 'maplibre-gl';
import type { MapLayerStyle } from '../../shared/map-layer-style-config';
import {
  MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID,
} from './useMapFeatureSnapBinding';

defineProps({
  /** 是否渲染吸附预览图层。 */
  enabled: {
    type: Boolean,
    default: false,
  },
  /** 当前吸附预览数据源。 */
  data: {
    type: Object as PropType<FeatureCollection>,
    required: true,
  },
  /** 吸附点图层样式。 */
  pointStyle: {
    type: Object as PropType<
      MapLayerStyle<CircleLayerSpecification['layout'], CircleLayerSpecification['paint']>
    >,
    required: true,
  },
  /** 命中线段高亮图层样式。 */
  lineStyle: {
    type: Object as PropType<
      MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
    >,
    required: true,
  },
});
</script>
