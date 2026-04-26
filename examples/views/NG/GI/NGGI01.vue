<template>
  <section class="nggi-page">
    <MapLibreInit :map-options="mapOptions" :controls="controls" />
    <aside class="nggi-panel">
      <h3>NGGI01 最小地图和控件</h3>
      <p>使用 MapLibreInit 与 createMapControlsPreset 创建最小地图。</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { MapLibreInit } from "vue-maplibre-kit/business";
import { createExampleControls, createExampleMapOptions } from "./nggi-example.shared";

const mapOptions = createExampleMapOptions();
const controls = createExampleControls("minimal");
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
  width: 260px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}
</style>
