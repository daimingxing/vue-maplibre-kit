<template>
  <section class="nggi-page">
    <MapLibreInit
      ref="mapRef"
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
      <h3>NGGI10 multi-select</h3>
      <button type="button" @click="multiSelect.toggle">切换多选</button>
      <button type="button" @click="multiSelect.clear">清空选中</button>
      <button type="button" @click="readSelected">读取选中要素</button>
      <p>是否激活：{{ multiSelect.isActive.value ? "是" : "否" }}</p>
      <p>选中数量：{{ multiSelect.selectedCount.value }}</p>
      <pre>{{ message }}</pre>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  useMapFeatureMultiSelect,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import { createMapFeatureMultiSelectPlugin } from "vue-maplibre-kit/plugins/map-feature-multi-select";
import {
  EXAMPLE_LINE_LAYER_ID,
  EXAMPLE_POINT_LAYER_ID,
  createExampleInteractive,
  createExampleKit,
} from "./nggi-example.shared";

const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const multiSelect = useMapFeatureMultiSelect(() => mapRef.value);
const message = ref("等待多选操作");
const interactive = {
  ...createExampleInteractive((text) => {
    message.value = text;
  }),
  onSelectionChange: () => {
    message.value = `多选变化：${multiSelect.getSelectedFeatures().length} 个要素`;
  },
};
const plugins = [
  createMapFeatureMultiSelectPlugin({
    enabled: true,
    deactivateBehavior: "retain",
    targetLayerIds: [EXAMPLE_POINT_LAYER_ID, EXAMPLE_LINE_LAYER_ID],
    canSelect: (context) => context.layerId !== null,
  }),
];

/**
 * 读取当前多选选中要素。
 */
function readSelected(): void {
  message.value = JSON.stringify(
    multiSelect.getSelectedFeatures().map((feature) => ({
      id: feature.featureId,
      layerId: feature.layerId,
      name: feature.properties?.name || null,
    })),
    null,
    2
  );
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

pre {
  overflow: auto;
  max-height: 220px;
  font-size: 12px;
}
</style>
