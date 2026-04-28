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
      <p>绘图与测量控件已开启业务图层吸附，并允许已绘制点、线、面跨模式互相吸附。</p>
      <ul>
        <li v-for="rule in snapRules" :key="rule.name">
          {{ rule.name }}：{{ rule.summary }}
        </li>
      </ul>
      <p>先画点、线或面，再切换绘制模式，可吸附到刚刚绘制出的要素。</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { MapBusinessSourceLayers, MapLibreInit } from "vue-maplibre-kit/business";
import { createBusinessPlugins, type MapFeatureSnapRule } from "vue-maplibre-kit/plugins";
import {
  EXAMPLE_FILL_LAYER_ID,
  EXAMPLE_LINE_LAYER_ID,
  EXAMPLE_POINT_LAYER_ID,
  createExampleInteractive,
  createExampleKit,
} from "./nggi-example.shared";

// draw 控件预设会开启 TerraDraw 和测量控件；snap 插件会给这些绘制动作提供吸附能力。
const kit = createExampleKit("draw");
// 吸附本身不依赖普通点击回调，这里保留 interactive 是为了示例结构和其他页面一致。
const interactive = createExampleInteractive(() => {});
// snapRules 是业务层最重要的声明：告诉插件“哪些图层、哪些几何、用什么方式吸附”。
const snapRules = [
  {
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
const plugins = createBusinessPlugins({
  // snap 当前主要是注册型插件：配置写在 plugins prop，吸附结果由地图绘制交互即时使用。
  snap: {
    layerIds: [EXAMPLE_POINT_LAYER_ID, EXAMPLE_LINE_LAYER_ID, EXAMPLE_FILL_LAYER_ID],
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
    businessLayers: {
      enabled: true,
      // businessLayers.rules 表示从业务图层中提取可吸附目标。
      // 如果项目还有自定义绘图图层，也可以继续扩展插件配置。
      rules: snapRules,
    },
    terradraw: {
      defaults: {
        drawnTargets: {
          geometryTypes: ["Point", "LineString", "Polygon"],
          snapTo: ["vertex", "segment"],
          // 已绘制图形比业务面优先级高，便于连续编辑时先命中刚画出的图形。
          priority: 40,
          // 已绘制图形示例使用 12px，与业务图层默认吸附范围保持一致。
          tolerancePx: 12,
        },
      },
      draw: {
        drawnTargets: true,
      },
      measure: {
        drawnTargets: true,
      },
    },
  },
});
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
