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
      <h3>NGGI06 四插件总览</h3>
      <button type="button" @click="refreshIntersection">刷新交点</button>
      <button type="button" @click="toggleMultiSelect">切换多选</button>
      <button type="button" @click="clearDraft">清空草稿</button>
      <p>交点数：{{ businessMap.intersection.count.value }}</p>
      <p>多选数：{{ businessMap.plugins.multiSelect.selectedCount.value }}</p>
      <p>草稿数：{{ businessMap.draft.featureCount.value }}</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  createBusinessPlugins,
  useBusinessMap,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import {
  EXAMPLE_LINE_LAYER_ID,
  createExampleInteractive,
  createExampleKit,
} from "./nggi-example.shared";

const kit = createExampleKit("full");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const interactive = createExampleInteractive(() => {});
const plugins = createBusinessPlugins({
  snap: { layerIds: [EXAMPLE_LINE_LAYER_ID] },
  lineDraft: true,
  intersection: {
    enabled: true,
    visible: true,
    targetSourceIds: [kit.source.sourceId],
    targetLayerIds: [EXAMPLE_LINE_LAYER_ID],
    sourceRegistry: kit.registry,
  },
  multiSelect: { enabled: true, targetLayerIds: [EXAMPLE_LINE_LAYER_ID] },
});

/**
 * 重新计算交点。
 */
function refreshIntersection(): void {
  businessMap.intersection.refresh();
}

/**
 * 切换多选插件状态。
 */
function toggleMultiSelect(): void {
  businessMap.plugins.multiSelect.toggle();
}

/**
 * 清空线草稿。
 */
function clearDraft(): void {
  businessMap.draft.clear();
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
