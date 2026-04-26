<template>
  <section class="nggi-page">
    <MapLibreInit :map-options="kit.mapOptions" :controls="kit.controls">
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI02 source + 图层 + 响应式增删改</h3>
      <button type="button" @click="addPoint">新增点</button>
      <button type="button" @click="renameFirst">改名</button>
      <button type="button" @click="removeLast">删除末尾</button>
      <p>当前要素数：{{ kit.sourceData.value.features.length }}</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { MapBusinessSourceLayers, MapLibreInit } from "vue-maplibre-kit/business";
import { createExampleKit, createPointFeature } from "./nggi-example.shared";

const kit = createExampleKit("basic");

/**
 * 新增一个响应式点要素。
 */
function addPoint(): void {
  const count = kit.sourceData.value.features.length;
  const nextFeature = createPointFeature(`point-new-${count}`, `新增点 ${count}`, 0.6, -1.4);
  kit.sourceData.value = {
    ...kit.sourceData.value,
    features: [...kit.sourceData.value.features, nextFeature],
  };
}

/**
 * 修改第一个要素名称。
 */
function renameFirst(): void {
  const firstFeature = kit.sourceData.value.features[0];
  if (!firstFeature?.properties?.id) {
    return;
  }

  kit.registry.saveProperties(kit.source.sourceId, firstFeature.properties.id, {
    name: "已响应式改名",
  });
}

/**
 * 删除最后一个要素。
 */
function removeLast(): void {
  kit.source.replaceFeatures(kit.sourceData.value.features.slice(0, -1));
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
