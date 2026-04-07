<template>
  <mgl-geo-json-source
    v-if="enabled"
    :sourceId="MANAGED_TUNNEL_PREVIEW_SOURCE_ID"
    :data="data"
    promoteId="id"
  >
    <mgl-fill-layer
      :layer-id="MANAGED_TUNNEL_PREVIEW_FILL_LAYER_ID"
      :layout="fillStyle.layout"
      :paint="fillStyle.paint"
      :filter="[
        'all',
        ['==', '$type', 'Polygon'],
        ['==', 'generatedKind', MANAGED_TUNNEL_PREVIEW_REGION_KIND],
      ]"
      :interactive="false"
    />
    <mgl-line-layer
      :layer-id="MANAGED_TUNNEL_PREVIEW_LINE_LAYER_ID"
      :layout="lineStyle.layout"
      :paint="lineStyle.paint"
      :filter="[
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'generatedKind', MapTunnelLineExtensionTool.TEMPORARY_EXTENSION_KIND],
      ]"
    />
  </mgl-geo-json-source>
</template>

<script setup lang="ts">
/**
 * 托管临时巷道预览图层组件。
 * 负责渲染内部预览数据源与临时线/临时区域图层，让 mapLibre-init 不再直接持有具体业务模板。
 */
import { type PropType } from 'vue';
import { MglGeoJsonSource, MglFillLayer, MglLineLayer } from 'vue-maplibre-gl';
import {
  MapTunnelLineExtensionTool,
  type MapCommonFeatureCollection,
} from '../../shared/map-common-tools';
import {
  MANAGED_TUNNEL_PREVIEW_FILL_LAYER_ID,
  MANAGED_TUNNEL_PREVIEW_LINE_LAYER_ID,
  MANAGED_TUNNEL_PREVIEW_REGION_KIND,
  MANAGED_TUNNEL_PREVIEW_SOURCE_ID,
} from './useManagedTunnelPreview';
import type { MapLayerStyle } from '../../shared/map-layer-style-config';
import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';

defineProps({
  /** 是否渲染托管临时巷道预览图层 */
  enabled: {
    type: Boolean,
    default: false,
  },
  /** 托管临时预览数据源 */
  data: {
    type: Object as PropType<MapCommonFeatureCollection>,
    required: true,
  },
  /** 托管临时延长线图层样式 */
  lineStyle: {
    type: Object as PropType<
      MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
    >,
    required: true,
  },
  /** 托管临时区域图层样式 */
  fillStyle: {
    type: Object as PropType<
      MapLayerStyle<FillLayerSpecification['layout'], FillLayerSpecification['paint']>
    >,
    required: true,
  },
});
</script>
