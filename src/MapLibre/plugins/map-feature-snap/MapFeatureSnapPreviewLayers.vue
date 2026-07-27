<template>
  <mgl-geo-json-source v-if="enabled" :sourceId="MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID" :data="data">
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
 * 负责渲染统一吸附插件维护的吸附点，不向业务层暴露内部 source/layer 结构。
 */
import { MglCircleLayer, MglGeoJsonSource, useMap } from 'vue-maplibre-gl';
import { type PropType, watch } from 'vue';
import type { FeatureCollection } from 'geojson';
import type { CircleLayerSpecification, Map as MaplibreMap } from 'maplibre-gl';
import type { MapLayerStyle } from '../../shared/map-layer-style-config';
import {
  MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID,
  MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID,
} from './useMapFeatureSnapBinding';

const props = defineProps({
  /** 当前 MapLibre 实例的 mapKey。 */
  mapKey: {
    type: [String, Symbol],
    default: undefined,
  },
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
});

const mapInstance = useMap(props.mapKey);

/**
 * 将最新吸附点样式写入已存在的 MapLibre 图层。
 * vue-maplibre-gl 只在图层创建时读取 paint，因此重复 init 后必须显式补写。
 * @returns 无返回值；图层尚未创建时等待后续组件挂载
 */
function syncPointPaint(): void {
  const map = mapInstance.map as MaplibreMap | undefined;
  if (!map?.getLayer(MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID)) {
    return;
  }

  Object.entries(props.pointStyle.paint || {}).forEach(([property, value]) => {
    map.setPaintProperty(MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID, property, value);
  });
}

watch(
  () => props.pointStyle.paint,
  () => {
    syncPointPaint();
  },
  { deep: true }
);
</script>
