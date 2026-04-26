<template>
  <section class="nggi-page">
    <MapLibreInit
      ref="mapRef"
      :map-options="kit.mapOptions"
      :controls="kit.controls"
      :plugins="plugins"
    >
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI09 intersection</h3>
      <button type="button" @click="intersection.refresh">刷新交点</button>
      <button type="button" @click="intersection.materialize()">生成正式点</button>
      <button type="button" @click="saveIntersection">设置交点属性</button>
      <button type="button" @click="readIntersectionData">读取 GeoJSON</button>
      <button type="button" @click="intersection.clear">清空预览</button>
      <p>预览交点：{{ intersection.count.value }}</p>
      <p>正式交点：{{ intersection.materializedCount.value }}</p>
      <pre>{{ message }}</pre>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  useIntersectionPreview,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import { createIntersectionPreviewPlugin } from "vue-maplibre-kit/plugins/intersection-preview";
import { EXAMPLE_LINE_LAYER_ID, createExampleKit } from "./nggi-example.shared";

const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const intersection = useIntersectionPreview(() => mapRef.value);
const message = ref("等待交点操作");
const plugins = [
  createIntersectionPreviewPlugin({
    enabled: true,
    visible: true,
    targetSourceIds: [kit.source.sourceId],
    targetLayerIds: [EXAMPLE_LINE_LAYER_ID],
    sourceRegistry: kit.registry,
    includeEndpoint: false,
    coordDigits: 6,
    materializedProperties: { status: "materialized" },
    onHoverEnter: (context) => {
      message.value = `交点移入：${context.intersectionId}`;
    },
    onClick: (context) => {
      message.value = `交点点击：${context.intersectionId}`;
    },
  }),
];

/**
 * 设置正式交点业务属性。
 */
function saveIntersection(): void {
  const materializedFeature = intersection.getMaterializedData()?.features[0];
  const intersectionId =
    typeof materializedFeature?.properties?.intersectionId === "string"
      ? materializedFeature.properties.intersectionId
      : null;

  if (!intersectionId) {
    message.value = "请先生成正式交点";
    return;
  }

  const success = intersection.updateMaterializedProperties(intersectionId, {
    status: "checked",
    checker: "业务人员",
  });
  message.value = success ? "交点属性已更新" : "交点属性更新失败";
}

/**
 * 读取预览交点和正式交点 GeoJSON。
 */
function readIntersectionData(): void {
  message.value = JSON.stringify(
    {
      preview: intersection.getData()?.features.length || 0,
      materialized: intersection.getMaterializedData()?.features.length || 0,
      selected: intersection.getSelected()?.intersectionId || null,
    },
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
