<template>
  <section class="nggi-page">
    <MapLibreInit ref="mapRef" :map-options="kit.mapOptions" :controls="kit.controls">
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI05 属性编辑/propertyPolicy</h3>
      <button type="button" @click="saveName">保存 name</button>
      <button type="button" @click="removeEditable">删除 editable</button>
      <pre>{{ panelText }}</pre>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  useBusinessMap,
  type MapFeaturePropertyPolicy,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import {
  EXAMPLE_POINT_LAYER_ID,
  createExampleLayers,
  createExampleMapOptions,
  createExampleControls,
  createExampleSourceKit,
  createMixedData,
} from "./nggi-example.shared";

const policy: MapFeaturePropertyPolicy = {
  readonlyKeys: ["id"],
  fixedKeys: ["name", "status"],
  removableKeys: ["editable"],
};
const sourceData = ref(createMixedData());
const layers = createExampleLayers();
const sourceKit = createExampleSourceKit(sourceData, layers, policy);
const kit = {
  mapOptions: createExampleMapOptions(),
  controls: createExampleControls("basic"),
  layers,
  source: sourceKit.source,
  registry: sourceKit.registry,
};
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });

const panelText = computed(() => {
  return JSON.stringify(kit.source.resolvePropertyPanelState("point-a", EXAMPLE_POINT_LAYER_ID), null, 2);
});

/**
 * 通过属性编辑门面保存属性。
 */
function saveName(): void {
  businessMap.editor.saveItem(
    {
      type: "map",
      featureRef: kit.source.toFeatureRef("point-a", EXAMPLE_POINT_LAYER_ID),
    },
    { key: "name", value: "属性已保存" }
  );
}

/**
 * 按 propertyPolicy 删除允许移除的字段。
 */
function removeEditable(): void {
  kit.registry.removeProperties(kit.source.sourceId, "point-a", ["editable"], EXAMPLE_POINT_LAYER_ID);
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
  width: 340px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}

pre {
  overflow: auto;
  max-height: 360px;
  font-size: 12px;
}
</style>
