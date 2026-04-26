<template>
  <section class="nggi-page">
    <MapLibreInit ref="mapRef" :map-options="kit.mapOptions" :controls="kit.controls">
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI03 图层显隐/样式/feature-state</h3>
      <button type="button" @click="toggleLine">切换线图层</button>
      <button type="button" @click="setLineColor">修改线颜色</button>
      <button type="button" @click="setPointState">写入点状态</button>
      <p>{{ message }}</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  createFeatureStateExpression,
  useBusinessMap,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import {
  EXAMPLE_LINE_LAYER_ID,
  EXAMPLE_POINT_LAYER_ID,
  EXAMPLE_SOURCE_ID,
  createExampleKit,
} from "./nggi-example.shared";

const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const message = ref("等待操作");
const lineVisible = ref(true);

// feature-state 表达式在样式里常用于 hover/selected 等状态驱动渲染。
const activeColor = createFeatureStateExpression({
  default: "#f97316",
  states: {
    active: "#ef4444",
  },
});
void activeColor;

/**
 * 切换线图层显隐。
 */
function toggleLine(): void {
  lineVisible.value = !lineVisible.value;
  const result = businessMap.layers.setVisible(EXAMPLE_LINE_LAYER_ID, lineVisible.value);
  message.value = result.message;
}

/**
 * 修改线图层颜色。
 */
function setLineColor(): void {
  const result = businessMap.layers.setPaint(EXAMPLE_LINE_LAYER_ID, {
    "line-color": "#7c3aed",
  });
  message.value = result.message;
}

/**
 * 给点要素写入 feature-state。
 */
function setPointState(): void {
  const result = businessMap.layers.setFeatureState(EXAMPLE_SOURCE_ID, "point-a", {
    active: true,
  });
  message.value = `${EXAMPLE_POINT_LAYER_ID}：${result.message}`;
}
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
  display: grid;
  gap: 8px;
  width: 280px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}
</style>
