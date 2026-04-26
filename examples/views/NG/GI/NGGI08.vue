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
      <div class="draft-list">
        <h4>草稿属性</h4>
        <dl v-for="item in draftItems" :key="item.id">
          <dt>{{ item.id }}</dt>
          <dd>类型：{{ item.kind }}</dd>
          <dd>状态：{{ item.status }}</dd>
          <dd>editable：{{ item.editable }}</dd>
        </dl>
      </div>
      <pre>{{ message }}</pre>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
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
      showDraftData(`草稿点击：${String(context.generatedKind ?? "未知类型")}`);
    },
  }),
];

const draftItems = computed(() =>
  (draft.getData()?.features || []).map((feature) => ({
    id: String(feature.properties?.id || feature.id || "未知草稿"),
    kind: String(feature.properties?.generatedKind || "未知类型"),
    status: String(feature.properties?.status || "未设置"),
    editable: String(feature.properties?.editable || "未设置"),
  }))
);

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
  showDraftData(result.message);
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
  showDraftData(result.message);
}

/**
 * 展示当前草稿完整 GeoJSON 集合。
 * @param title 展示标题
 */
function showDraftData(title: string): void {
  const data = draft.getData();
  message.value = `${title}\n${JSON.stringify(data, null, 2)}`;
}

/**
 * 读取草稿线和草稿面的完整 GeoJSON 实例。
 */
function readDraftData(): void {
  showDraftData("当前 draft.getData()：");
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

.draft-list {
  overflow: auto;
  max-height: 160px;
  border-top: 1px solid #e5e7eb;
}

.draft-list h4 {
  margin: 8px 0 4px;
}

.draft-list dl {
  margin: 0;
  padding: 6px 0;
  border-top: 1px solid #f1f5f9;
}

.draft-list dt {
  font-weight: 700;
}

.draft-list dd {
  margin: 2px 0 0;
  font-size: 12px;
}
</style>
