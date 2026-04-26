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
      <p>绘图控件已开启普通线图层吸附。</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { MapBusinessSourceLayers, MapLibreInit } from "vue-maplibre-kit/business";
import { createMapFeatureSnapPlugin } from "vue-maplibre-kit/plugins/map-feature-snap";
import {
  EXAMPLE_LINE_LAYER_ID,
  createExampleInteractive,
  createExampleKit,
} from "./nggi-example.shared";

const kit = createExampleKit("draw");
const interactive = createExampleInteractive(() => {});
const plugins = [
  createMapFeatureSnapPlugin({
    enabled: true,
    defaultTolerancePx: 12,
    ordinaryLayers: {
      enabled: true,
      rules: [
        {
          id: "nggi-line-snap",
          layerIds: [EXAMPLE_LINE_LAYER_ID],
          geometryTypes: ["LineString"],
          snapTo: ["vertex", "segment"],
        },
      ],
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
</style>
