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
      <button type="button" @click="materializeIntersection">生成正式点</button>
      <button type="button" @click="saveIntersection">设置交点属性</button>
      <button type="button" @click="readIntersectionData">读取 GeoJSON</button>
      <button type="button" @click="intersection.clear">清空预览</button>
      <p>预览交点：{{ intersection.count.value }}</p>
      <p>正式交点：{{ intersection.materializedCount.value }}</p>
      <div class="intersection-list">
        <h4>正式点属性</h4>
        <dl v-for="item in materializedItems" :key="item.id">
          <dt>{{ item.id }}</dt>
          <dd>状态：{{ item.status }}</dd>
          <dd>检查人：{{ item.checker }}</dd>
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
    // 保留 6 位小数可兼顾深圳示例范围内的米级识别和去重稳定性。
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

const materializedItems = computed(() =>
  (intersection.getMaterializedData()?.features || []).map((feature) => ({
    id: String(feature.properties?.intersectionId || feature.properties?.id || feature.id || "未知交点"),
    status: String(feature.properties?.status || "未设置"),
    checker: String(feature.properties?.checker || "未设置"),
  }))
);

/**
 * 读取当前选中或首个预览交点 ID。
 * @returns 可用于生成正式点的交点 ID；无预览交点时返回 null
 */
function resolveTargetId(): string | null {
  const selectedId = intersection.getSelected()?.intersectionId;
  if (selectedId) {
    return selectedId;
  }

  const firstFeature = intersection.getData()?.features[0];
  // 未选中时退回首个预览交点，让按钮可直接完成演示流程。
  const featureId = firstFeature?.properties?.intersectionId || firstFeature?.id;
  return featureId === undefined || featureId === null ? null : String(featureId);
}

/**
 * 生成正式交点，优先使用当前选中交点，否则使用首个预览交点。
 */
function materializeIntersection(): void {
  const intersectionId = resolveTargetId();
  if (!intersectionId) {
    message.value = "请先刷新生成预览交点";
    return;
  }

  const success = intersection.materialize(intersectionId);
  message.value = success ? `已生成正式点：${intersectionId}` : "生成正式点失败";
}

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
  message.value = success
    ? `交点属性已更新\n${JSON.stringify(intersection.getMaterializedData(), null, 2)}`
    : "交点属性更新失败";
}

/**
 * 读取预览交点和正式交点 GeoJSON。
 */
function readIntersectionData(): void {
  message.value = JSON.stringify(
    {
      preview: intersection.getData(),
      materialized: intersection.getMaterializedData(),
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

.intersection-list {
  overflow: auto;
  max-height: 140px;
  border-top: 1px solid #e5e7eb;
}

.intersection-list h4 {
  margin: 8px 0 4px;
}

.intersection-list dl {
  margin: 0;
  padding: 6px 0;
  border-top: 1px solid #f1f5f9;
}

.intersection-list dt {
  font-weight: 700;
}

.intersection-list dd {
  margin: 2px 0 0;
  font-size: 12px;
}
</style>
