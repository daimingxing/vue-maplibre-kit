<template>
  <section class="nggi-page">
    <MapLibreInit
      :map-options="kit.mapOptions"
      :controls="kit.controls"
      :map-interactive="interactive"
      :plugins="plugins"
    >
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI07 snap</h3>
      <p>绘图控件已开启点、线、面普通业务图层吸附。</p>
      <ul>
        <li v-for="rule in snapRules" :key="rule.id">
          {{ rule.name }}：{{ rule.summary }}
        </li>
      </ul>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { MapBusinessSourceLayers, MapLibreInit } from "vue-maplibre-kit/business";
import type { MapFeatureSnapRule } from "vue-maplibre-kit/plugins/map-feature-snap";
import { createMapFeatureSnapPlugin } from "vue-maplibre-kit/plugins/map-feature-snap";
import {
  EXAMPLE_FILL_LAYER_ID,
  EXAMPLE_LINE_LAYER_ID,
  EXAMPLE_POINT_LAYER_ID,
  createExampleInteractive,
  createExampleKit,
} from "./nggi-example.shared";

const kit = createExampleKit("draw");
const interactive = createExampleInteractive(() => {});
const snapRules = [
  {
    id: "nggi-point-snap",
    name: "巡检点",
    summary: "命中点图层顶点，适合从既有节点开始绘制。",
    layerIds: [EXAMPLE_POINT_LAYER_ID],
    geometryTypes: ["Point"],
    snapTo: ["vertex"],
    // 点要素优先级最高，避免点线面重叠时误吸附到边界。
    priority: 30,
    // 点目标较小，示例放宽到 14px 便于演示命中效果。
    tolerancePx: 14,
  },
  {
    id: "nggi-line-snap",
    name: "管线",
    summary: "命中线图层顶点与线段，适合沿管线补绘。",
    layerIds: [EXAMPLE_LINE_LAYER_ID],
    geometryTypes: ["LineString"],
    snapTo: ["vertex", "segment"],
    // 线要素优先级低于点、高于面，符合管线编辑的常见操作顺序。
    priority: 20,
    // 12px 与全局默认值一致，用于展示规则级配置可单独声明。
    tolerancePx: 12,
  },
  {
    id: "nggi-fill-snap",
    name: "作业面",
    summary: "命中面边界顶点与边线，适合贴合作业范围绘制。",
    layerIds: [EXAMPLE_FILL_LAYER_ID],
    geometryTypes: ["Polygon"],
    snapTo: ["vertex", "segment"],
    // 面要素通常作为范围底图，重叠时最后命中。
    priority: 10,
    // 面边界吸附范围稍小，降低绘制时跨越边界误命中的概率。
    tolerancePx: 10,
  },
] satisfies Array<MapFeatureSnapRule & { name: string; summary: string }>;
const plugins = [
  createMapFeatureSnapPlugin({
    enabled: true,
    // 全局默认范围兜底，具体业务规则仍可按类型覆盖。
    defaultTolerancePx: 12,
    preview: {
      enabled: true,
      // 红色预览点用于区别示例业务点图层的橙色圆点。
      pointColor: "#dc2626",
      // 7px 与示例点图层半径接近，方便对齐观察。
      pointRadius: 7,
      // 蓝色线段高亮用于区别示例业务线图层的绿色线。
      lineColor: "#2563eb",
      // 5px 略粗于业务线宽，确保命中线段可见。
      lineWidth: 5,
    },
    ordinaryLayers: {
      enabled: true,
      rules: snapRules,
    },
  }),
];
</script>

<style scoped>
.nggi-page {
  position: relative;
  height: 100vh;
}

.nggi-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
  width: 280px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}

ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

li {
  margin-top: 6px;
  line-height: 1.5;
}
</style>
