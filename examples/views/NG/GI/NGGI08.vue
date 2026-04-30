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
      <h3>NGGI08 line-draft</h3>
      <p>当前线段：{{ selectedLineText }}</p>
      <button type="button" @click="readSelectedLine">读取选中线段</button>
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
  useBusinessMap,
  type MapCommonLineFeature,
  type MapLayerInteractiveOptions,
  type MapLibreInitExpose,
  type MapSourceFeatureRef,
} from "vue-maplibre-kit/business";
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
import { EXAMPLE_LINE_LAYER_ID, createExampleKit } from "./nggi-example.shared";

// 本页只演示 line-draft 插件：选中线段、生成延长线、生成线廊、读写草稿属性。
const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
// businessMap 用来把点击事件转换成业务要素，并读取当前选中的线要素。
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
// draft 从 businessMap.plugins 读取，业务层只需要记住统一插件分组。
const draft = businessMap.plugins.lineDraft;
const message = ref("等待生成草稿");
// selectedLine 保存用户点击到的线；如果没点线，按钮会回退使用 line-a 作为静态示例。
const selectedLine = shallowRef<MapCommonLineFeature | null>(null);
const selectedLineRef = shallowRef<MapSourceFeatureRef | null>(null);
const plugins = createBusinessPlugins({
  // lineDraft 对象写法用于配置页面级样式和交互回调，未声明字段继续使用插件默认值。
  lineDraft: {
    enabled: true,
    styleOverrides: {
      line: { paint: { "line-color": "#d97706", "line-width": 5 } },
      fill: { paint: { "fill-color": "#facc15", "fill-opacity": 0.28 } },
    },
    onHoverEnter: (context) => {
      // 插件图层也会派发交互上下文，可以像普通图层一样更新面板。
      message.value = `草稿移入：${String(context.featureId ?? "无 ID")}`;
    },
    onClick: (context) => {
      showDraftData(`草稿点击：${String(context.generatedKind ?? "未知类型")}`);
    },
  },
});

const selectedLineText = computed(() => {
  const id = selectedLine.value?.properties?.id || selectedLine.value?.id;
  return id === undefined || id === null ? "尚未点击线要素，默认使用 line-a" : String(id);
});

const draftItems = computed(() =>
  (draft.getData()?.features || []).map((feature) => ({
    id: String(feature.properties?.id || feature.id || "未知草稿"),
    kind: String(feature.properties?.generatedKind || "未知类型"),
    status: String(feature.properties?.status || "未设置"),
    editable: String(feature.properties?.editable || "未设置"),
  }))
);

const interactive: MapLayerInteractiveOptions = {
  enabled: true,
  layers: {
    [EXAMPLE_LINE_LAYER_ID]: {
      // 只关心线图层命中，避免点/面点击干扰“选中线段”示例。
      hitPriority: 20,
    },
  },
  onClick: (context) => {
    // toBusinessContext 会把原始 MapLibre 命中结果转成 sourceId、featureId、feature。
    const businessContext = businessMap.feature.toBusinessContext(context);
    if (!isLineFeature(businessContext.feature)) {
      message.value = "请点击一条线要素，再演示选中线段生成草稿";
      return;
    }

    selectedLine.value = businessContext.feature;
    selectedLineRef.value = businessContext.featureRef;
    message.value = `已选中线要素：${String(businessContext.featureId)}`;
  },
};

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
 * 读取当前选中的线要素。
 * 真实业务里通常先点击线，再通过 `resolveSelectedLine` 或点击上下文拿到线要素。
 */
function readSelectedLine(): void {
  // resolveSelectedLine 会从地图当前选中态里读取最新线要素；selectedLine 是本页保存的回退值。
  const currentLine = businessMap.feature.resolveSelectedLine() || selectedLine.value;
  if (!currentLine) {
    message.value = "还没有选中线要素；本例生成按钮会回退使用 line-a";
    return;
  }

  selectedLine.value = currentLine;
  message.value = `当前选中线段 GeoJSON：\n${JSON.stringify(currentLine, null, 2)}`;
}

/**
 * 生成延长线草稿。
 */
function previewLine(): void {
  const lineFeature = selectedLine.value || kit.source.resolveFeature("line-a");
  if (!isLineFeature(lineFeature)) {
    return;
  }

  draft.previewLine({
    lineFeature,
    // segmentIndex 表示使用第几段线段生成延长线；这里保留 0 作为静态入门示例。
    segmentIndex: 0,
    // 延长距离单位是米，示例取 800 米方便肉眼观察。
    extendLengthMeters: 800,
    origin: selectedLineRef.value || kit.source.toFeatureRef("line-a", EXAMPLE_LINE_LAYER_ID),
  });
  message.value = "已生成延长线草稿";
}

/**
 * 生成线廊草稿。
 */
function previewRegion(): void {
  const lineFeature = selectedLine.value || kit.source.resolveFeature("line-a");
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
    // 这两个字段会直接写回草稿 GeoJSON 的 properties。
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

  // 删除后右侧“草稿属性”列表会立刻少掉 editable，方便确认动作生效。
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
