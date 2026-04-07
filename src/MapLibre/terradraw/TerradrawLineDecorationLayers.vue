<template>
  <terradraw-pattern-raster-item
    v-for="patternRasterItem in patternRasterItems"
    :key="patternRasterItem.key"
    :sourceId="patternRasterItem.sourceId"
    :layerId="patternRasterItem.layerId"
    :beforeLayerId="patternRasterItem.beforeLayerId"
    :image="patternRasterItem.image"
    :coordinates="patternRasterItem.coordinates"
    :canvasWidth="patternRasterItem.canvasWidth"
    :canvasHeight="patternRasterItem.canvasHeight"
    :unitCanvasWidth="patternRasterItem.unitCanvasWidth"
    :phaseCanvasOffset="patternRasterItem.phaseCanvasOffset"
    :style="patternRasterItem.style"
  />
  <terradraw-stretch-raster-item
    v-for="stretchLayerItem in stretchLayerItems"
    :key="stretchLayerItem.key"
    :sourceId="stretchLayerItem.sourceId"
    :layerId="stretchLayerItem.layerId"
    :beforeLayerId="stretchLayerItem.beforeLayerId"
    :url="stretchLayerItem.url"
    :coordinates="stretchLayerItem.coordinates"
    :style="stretchLayerItem.style"
  />
  <mgl-geo-json-source
    v-if="enabled"
    :sourceId="sourceId"
    :data="data"
    :lineMetrics="true"
    promoteId="id"
  >
    <mgl-symbol-layer
      v-for="symbolLayerItem in symbolLayerItems"
      :key="symbolLayerItem.layerId"
      :layer-id="symbolLayerItem.layerId"
      :layout="symbolLayerItem.style.layout"
      :paint="symbolLayerItem.style.paint"
      :filter="symbolLayerItem.filter"
      :interactive="false"
    />
    <mgl-line-layer
      :layer-id="patternLayerId"
      :layout="patternStyle.layout"
      :paint="patternStyle.paint"
      :filter="patternFilter"
      :interactive="false"
    />
  </mgl-geo-json-source>
</template>

<script setup lang="ts">
/**
 * TerraDraw / Measure 线装饰图层组件。
 * 只负责承载内部托管的 GeoJSON source，并渲染：
 * 1. 沿线重复的 symbol 图标
 * 2. 连续纹理 line-pattern 线
 * 3. 按线段拉伸的 segment-stretch 栅格图层
 *
 * 其中：
 * 1. line-pattern 走自定义的 canvas source 离散平铺渲染，
 *    内部统一处理相位连续、样式重建与一次性纹理刷新；
 * 2. segment-stretch 走自定义的 image source 渲染，
 *    内部统一处理 url 更新、旧纹理释放与样式重建。
 *
 * 业务层不会直接使用这个组件；它只会被 map-libre-init 在内部挂载。
 */
import { type PropType } from 'vue';
import { MglGeoJsonSource, MglLineLayer, MglSymbolLayer } from 'vue-maplibre-gl';
import type { LineLayerSpecification } from 'maplibre-gl';
import type { MapCommonFeatureCollection } from '../shared/map-common-tools';
import type { MapLayerStyle } from '../shared/map-layer-style-config';
import TerradrawPatternRasterItem from './TerradrawPatternRasterItem.vue';
import TerradrawStretchRasterItem from './TerradrawStretchRasterItem.vue';
import type {
  TerradrawLineDecorationPatternRasterItem,
  TerradrawLineDecorationStretchLayerItem,
  TerradrawLineDecorationSymbolLayerItem,
} from './useTerradrawLineDecoration';

const patternFilter: NonNullable<LineLayerSpecification['filter']> = [
  'all',
  ['==', '$type', 'LineString'],
  ['==', 'decorationMode', 'line-pattern'],
];

defineProps({
  /** 当前装饰图层是否启用 */
  enabled: {
    type: Boolean,
    default: false,
  },
  /** 内部托管的 GeoJSON source ID */
  sourceId: {
    type: String,
    required: true,
  },
  /** 内部托管的 GeoJSON 数据 */
  data: {
    type: Object as PropType<MapCommonFeatureCollection>,
    required: true,
  },
  /** line-pattern 图层 ID；离散平铺关闭时作为原生 line-pattern fallback 图层使用 */
  patternLayerId: {
    type: String,
    required: true,
  },
  /** symbol-repeat 图层分组列表 */
  symbolLayerItems: {
    type: Array as PropType<TerradrawLineDecorationSymbolLayerItem[]>,
    required: true,
  },
  /** line-pattern 离散纹理图层列表 */
  patternRasterItems: {
    type: Array as PropType<TerradrawLineDecorationPatternRasterItem[]>,
    required: true,
  },
  /** segment-stretch 图层列表 */
  stretchLayerItems: {
    type: Array as PropType<TerradrawLineDecorationStretchLayerItem[]>,
    required: true,
  },
  /** line-pattern 图层样式；离散平铺关闭时作为原生 line-pattern fallback 样式使用 */
  patternStyle: {
    type: Object as PropType<
      MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
    >,
    required: true,
  },
});
</script>
