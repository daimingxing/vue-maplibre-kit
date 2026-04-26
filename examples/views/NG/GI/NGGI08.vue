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
      <h3>NGGI08 line-draft</h3>
      <button type="button" @click="previewLine">生成延长线</button>
      <button type="button" @click="previewRegion">生成线廊</button>
      <button type="button" @click="saveDraft">修改草稿属性</button>
      <button type="button" @click="removeDraftProp">删除草稿属性</button>
      <button type="button" @click="readDraftData">读取草稿 GeoJSON</button>
      <button type="button" @click="draft.clear">清空</button>
      <p>草稿数：{{ draft.featureCount.value }}</p>
      <pre>{{ message }}</pre>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  useLineDraftPreview,
  type MapCommonLineFeature,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import { createLineDraftPreviewPlugin } from "vue-maplibre-kit/plugins/line-draft-preview";
import { createExampleKit } from "./nggi-example.shared";

const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const draft = useLineDraftPreview(() => mapRef.value);
const message = ref("等待生成草稿");
const plugins = [
  createLineDraftPreviewPlugin({
    enabled: true,
    styleOverrides: {
      line: { paint: { "line-color": "#d97706", "line-width": 5 } },
      fill: { paint: { "fill-color": "#facc15", "fill-opacity": 0.28 } },
    },
    onHoverEnter: (context) => {
      message.value = `草稿移入：${String(context.featureId ?? "无 ID")}`;
    },
    onClick: (context) => {
      message.value = `草稿点击：${String(context.generatedKind ?? "未知类型")}`;
    },
  }),
];

/**
 * 判断要素是否为线要素。
 * @param feature 待判断要素
 * @returns 是否为线要素
 */
function isLineFeature(feature: unknown): feature is MapCommonLineFeature {
  return Boolean(
    feature &&
      typeof feature === "object" &&
      "geometry" in feature &&
      (feature as MapCommonLineFeature).geometry.type === "LineString"
  );
}

/**
 * 生成延长线草稿。
 */
function previewLine(): void {
  const lineFeature = kit.source.resolveFeature("line-a");
  if (!isLineFeature(lineFeature)) {
    return;
  }

  draft.previewLine({
    lineFeature,
    segmentIndex: 0,
    // 延长距离单位是米，示例取 800 米方便肉眼观察。
    extendLengthMeters: 800,
    origin: kit.source.toFeatureRef("line-a"),
  });
  message.value = "已生成延长线草稿";
}

/**
 * 生成线廊草稿。
 */
function previewRegion(): void {
  const lineFeature = kit.source.resolveFeature("line-a");
  if (!isLineFeature(lineFeature)) {
    return;
  }

  draft.replacePreviewRegion({
    lineFeature,
    // 线廊半宽单位是米，示例取 120 米保证在当前缩放级别可见。
    widthMeters: 120,
  });
  message.value = "已生成线廊面草稿";
}

/**
 * 修改草稿要素属性。
 */
function saveDraft(): void {
  const firstFeature = draft.getData()?.features[0];
  const featureId = firstFeature?.properties?.id;
  if (featureId === undefined || featureId === null) {
    message.value = "请先生成草稿";
    return;
  }

  const result = draft.saveProperties(featureId, {
    status: "pending-submit",
    editable: "已修改草稿属性",
  });
  message.value = result.message;
}

/**
 * 删除草稿要素属性。
 */
function removeDraftProp(): void {
  const firstFeature = draft.getData()?.features[0];
  const featureId = firstFeature?.properties?.id;
  if (featureId === undefined || featureId === null) {
    message.value = "请先生成草稿";
    return;
  }

  const result = draft.removeProperties(featureId, ["editable"]);
  message.value = result.message;
}

/**
 * 读取草稿线和草稿面的 GeoJSON 实例。
 */
function readDraftData(): void {
  const data = draft.getData();
  message.value = JSON.stringify(
    {
      count: data?.features.length || 0,
      ids: (data?.features || []).map((feature) => feature.properties?.id || feature.id),
      kinds: (data?.features || []).map((feature) => feature.properties?.generatedKind),
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
