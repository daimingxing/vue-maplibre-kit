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
      :filter="POINT_FILTER"
    />
  </mgl-geo-json-source>
  <mgl-geo-json-source
    v-if="materializedEnabled"
    :sourceId="materializedSourceId"
    :data="materializedData"
    promoteId="id"
  >
    <mgl-circle-layer
      :layer-id="materializedLayerId"
      :layout="materializedStyle.layout"
      :paint="materializedStyle.paint"
      :filter="POINT_FILTER"
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

/**
 * 交点图层只允许渲染 Point。
 * 这里显式传 filter，是为了避开 vue-maplibre-gl 中 “未传 filter 时布尔 prop 默认为 false”
 * 导致整层被错误过滤掉的问题。
 */
const POINT_FILTER = ['==', '$type', 'Point'] as const;

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
  /** 是否渲染正式交点点图层。 */
  materializedEnabled: {
    type: Boolean,
    default: false,
  },
  /** 正式交点点 source ID。 */
  materializedSourceId: {
    type: String,
    default: '',
  },
  /** 正式交点点图层 ID。 */
  materializedLayerId: {
    type: String,
    default: '',
  },
  /** 正式交点点数据源。 */
  materializedData: {
    type: Object as PropType<MapCommonFeatureCollection>,
    default: () => ({
      type: 'FeatureCollection',
      features: [],
    }),
  },
  /** 正式交点点图层样式。 */
  materializedStyle: {
    type: Object as PropType<
      MapLayerStyle<CircleLayerSpecification['layout'], CircleLayerSpecification['paint']>
    >,
    default: () => ({
      layout: {},
      paint: {},
    }),
  },
});
</script>
