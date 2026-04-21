<template>
  <mgl-geo-json-source
    v-if="enabled"
    :sourceId="sourceId"
    :data="data"
    promoteId="id"
  >
    <mgl-circle-layer
      :layer-id="layerId"
      :layout="style.layout"
      :paint="style.paint"
    />
  </mgl-geo-json-source>
</template>

<script setup lang="ts">
/**
 * 交点预览图层组件。
 * 负责渲染内部交点点位数据源与圆点图层。
 */
import { type PropType } from 'vue';
import { MglCircleLayer, MglGeoJsonSource } from 'vue-maplibre-gl';
import type { CircleLayerSpecification } from 'maplibre-gl';
import type { MapCommonFeatureCollection } from '../../shared/map-common-tools';
import type { MapLayerStyle } from '../../shared/map-layer-style-config';

defineProps({
  /** 是否渲染交点图层。 */
  enabled: {
    type: Boolean,
    default: false,
  },
  /** 交点数据源 ID。 */
  sourceId: {
    type: String,
    required: true,
  },
  /** 交点图层 ID。 */
  layerId: {
    type: String,
    required: true,
  },
  /** 交点数据源。 */
  data: {
    type: Object as PropType<MapCommonFeatureCollection>,
    required: true,
  },
  /** 交点图层样式。 */
  style: {
    type: Object as PropType<
      MapLayerStyle<CircleLayerSpecification['layout'], CircleLayerSpecification['paint']>
    >,
    required: true,
  },
});
</script>
