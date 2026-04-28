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
      <h3>NGGI06 六插件总览</h3>
      <button type="button" @click="previewLine">生成草稿线</button>
      <button type="button" @click="previewRegion">生成线廊</button>
      <button type="button" @click="refreshIntersection">刷新交点</button>
      <button type="button" @click="materializeIntersection">生成正式交点</button>
      <button type="button" @click="removeIntersection">删除正式交点</button>
      <button type="button" @click="generatePolygonEdge">生成面边线</button>
      <button type="button" @click="highlightPolygonEdge">高亮面边线</button>
      <button type="button" @click="clearPolygonEdge">清空面边线</button>
      <button type="button" @click="toggleMultiSelect">切换多选</button>
      <button type="button" @click="clearSnapPreview">清理吸附预览</button>
      <button type="button" @click="exportDxf">导出 DXF 文本</button>
      <button type="button" @click="clearDraft">清空草稿</button>
      <p>交点数：{{ businessMap.plugins.intersection.count.value }}</p>
      <p>正式交点：{{ businessMap.plugins.intersection.materializedCount.value }}</p>
      <p>多选数：{{ businessMap.plugins.multiSelect.selectedCount.value }}</p>
      <p>草稿数：{{ businessMap.plugins.lineDraft.featureCount.value }}</p>
      <p>面边线：{{ businessMap.plugins.polygonEdge.featureCount.value }}</p>
      <p>DXF 最近文件：{{ businessMap.plugins.dxfExport.lastFileName.value || "未导出" }}</p>
      <p>{{ message }}</p>
      <pre>{{ overviewText }}</pre>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  useBusinessMap,
  type MapCommonFeature,
  type MapCommonLineFeature,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
import {
  EXAMPLE_FILL_LAYER_ID,
  EXAMPLE_LINE_LAYER_ID,
  EXAMPLE_SOURCE_ID,
  createExampleInteractive,
  createExampleKit,
} from "./nggi-example.shared";

const kit = createExampleKit("full");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const message = ref("插件总览：先生成草稿线、刷新交点，再切换多选观察状态");
const interactive = createExampleInteractive((text) => {
  message.value = text;
});
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
  polygonEdge: {
    enabled: true,
    style: {
      normal: { color: "#2563eb", width: 3, opacity: 0.92 },
      hover: { color: "#f97316", width: 5 },
      selected: { color: "#dc2626", width: 6 },
      highlighted: { color: "#16a34a", width: 5 },
    },
  },
  multiSelect: { enabled: true, targetLayerIds: [EXAMPLE_LINE_LAYER_ID] },
  dxfExport: {
    enabled: true,
    sourceRegistry: kit.registry,
    defaults: {
      fileName: "nggi06-five-plugins.dxf",
      lineWidth: 2,
      pointMode: "circle",
      // DXF 点圆半径使用地图坐标单位，本例坐标范围下 0.003 比较容易看见。
      pointRadius: 0.003,
    },
    control: { enabled: false },
  },
});

const overviewText = computed(() =>
  JSON.stringify(
    {
      draftFeatureCount: businessMap.plugins.lineDraft.featureCount.value,
      intersectionCount: businessMap.plugins.intersection.count.value,
      materializedCount: businessMap.plugins.intersection.materializedCount.value,
      polygonEdgeCount: businessMap.plugins.polygonEdge.featureCount.value,
      polygonEdgeSelected: businessMap.plugins.polygonEdge.selectedEdgeId.value,
      multiSelectActive: businessMap.plugins.multiSelect.isActive.value,
      selectedFeatureIds: businessMap.plugins.multiSelect
        .getSelectedFeatures()
        .map((feature) => feature.featureId),
      snapActive: "已通过 createBusinessPlugins 注册，绘制时会参与吸附",
      dxfExporting: businessMap.plugins.dxfExport.isExporting.value,
      dxfLastFileName: businessMap.plugins.dxfExport.lastFileName.value,
      dxfLastEntityCount: businessMap.plugins.dxfExport.lastEntityCount.value,
    },
    null,
    2
  )
);

/**
 * 判断当前要素是否为线要素。
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
 * 判断当前要素是否为面要素。
 * @param feature 待判断要素
 * @returns 是否为面要素
 */
function isPolygonFeature(feature: unknown): feature is MapCommonFeature {
  return Boolean(
    feature &&
      typeof feature === "object" &&
      "geometry" in feature &&
      ((feature as MapCommonFeature).geometry.type === "Polygon" ||
        (feature as MapCommonFeature).geometry.type === "MultiPolygon")
  );
}

/**
 * 读取本例固定演示线。
 * 总览页只承担“看见插件能力连起来”的职责，所以用 line-a 降低操作步骤。
 * @returns 示例线要素
 */
function getDemoLine(): MapCommonLineFeature | null {
  const lineFeature = kit.source.resolveFeature("line-a");
  return isLineFeature(lineFeature) ? lineFeature : null;
}

/**
 * 读取本例固定演示面。
 * @returns 示例面要素
 */
function getDemoPolygon(): MapCommonFeature | null {
  const polygonFeature = kit.source.resolveFeature("area-a");
  return isPolygonFeature(polygonFeature) ? polygonFeature : null;
}

/**
 * 生成线延长草稿。
 * 这一步补齐总览页之前缺少的 line-draft 核心动作展示。
 */
function previewLine(): void {
  const lineFeature = getDemoLine();
  if (!lineFeature) {
    message.value = "未找到 line-a，无法生成草稿线";
    return;
  }

  const draftFeature = businessMap.plugins.lineDraft.previewLine({
    lineFeature,
    // 总览页使用固定第 0 段，详细的选中线段读取请看 NGGI08。
    segmentIndex: 0,
    // 800 米在当前示例缩放级别下足够明显。
    extendLengthMeters: 800,
    origin: kit.source.toFeatureRef("line-a", EXAMPLE_LINE_LAYER_ID),
  });
  message.value = draftFeature ? "已生成草稿线" : "生成草稿线失败";
}

/**
 * 生成线廊面草稿。
 * line-draft 插件可以同时托管线草稿和面草稿，业务层通过同一个门面读取。
 */
function previewRegion(): void {
  const lineFeature = getDemoLine();
  if (!lineFeature) {
    message.value = "未找到 line-a，无法生成线廊";
    return;
  }

  const success = businessMap.plugins.lineDraft.replacePreviewRegion({
    lineFeature,
    // 120 米半宽让线廊面在当前视口下清楚可见。
    widthMeters: 120,
  });
  message.value = success ? "已生成线廊面草稿" : "生成线廊失败";
}

/**
 * 重新计算交点。
 */
function refreshIntersection(): void {
  const success = businessMap.plugins.intersection.refresh();
  message.value = success ? "已刷新交点预览" : "刷新交点失败";
}

/**
 * 生成首个正式交点。
 * 详细的交点属性、GeoJSON 读取和删除流程请看 NGGI09。
 */
function materializeIntersection(): void {
  const firstFeature = businessMap.plugins.intersection.getData()?.features[0];
  const intersectionId = firstFeature?.properties?.intersectionId || firstFeature?.id;
  if (intersectionId === undefined || intersectionId === null) {
    message.value = "请先刷新交点";
    return;
  }

  const success = businessMap.plugins.intersection.materialize(String(intersectionId));
  message.value = success ? `已生成正式交点：${String(intersectionId)}` : "生成正式交点失败";
}

/**
 * 删除首个正式交点。
 * 总览页只展示入口是否通顺，复杂的属性面板反馈放在 NGGI09 中单独说明。
 */
function removeIntersection(): void {
  const firstFeature = businessMap.plugins.intersection.getMaterializedData()?.features[0];
  const intersectionId = firstFeature?.properties?.intersectionId || firstFeature?.id;
  if (intersectionId === undefined || intersectionId === null) {
    message.value = "当前没有正式交点可删除";
    return;
  }

  const success = businessMap.plugins.intersection.removeMaterialized(String(intersectionId));
  message.value = success ? `已删除正式交点：${String(intersectionId)}` : "删除正式交点失败";
}

/**
 * 从固定示例面生成面边线。
 */
function generatePolygonEdge(): void {
  const polygonFeature = getDemoPolygon();
  if (!polygonFeature) {
    message.value = "未找到 area-a，无法生成面边线";
    return;
  }

  const result = businessMap.plugins.polygonEdge.generateFromFeature({
    feature: polygonFeature,
    origin: kit.source.toFeatureRef("area-a", EXAMPLE_FILL_LAYER_ID),
  });
  message.value = result.success
    ? `已生成面边线：${result.edgeCount} 条`
    : result.message;
}

/**
 * 高亮当前面边线中的第一条边。
 */
function highlightPolygonEdge(): void {
  const firstEdge = businessMap.plugins.polygonEdge.getData()?.features[0];
  const edgeId = firstEdge?.properties?.edgeId;
  if (edgeId === undefined || edgeId === null) {
    message.value = "请先生成面边线";
    return;
  }

  const success = businessMap.plugins.polygonEdge.highlightEdge(String(edgeId));
  message.value = success ? `已高亮边线：${String(edgeId)}` : "高亮面边线失败";
}

/**
 * 清空面边线。
 */
function clearPolygonEdge(): void {
  const success = businessMap.plugins.polygonEdge.clear();
  message.value = success ? "已清空面边线" : "清空面边线失败";
}

/**
 * 生成 DXF 文本。
 * 总览页只展示 dxf-export 插件已经接入统一门面，详细参数请看 NGGI11。
 */
async function exportDxf(): Promise<void> {
  const result = await businessMap.plugins.dxfExport.exportDxf({
    sourceIds: [EXAMPLE_SOURCE_ID],
    fileName: "nggi06-summary-only.dxf",
    // 总览页给一个明显线宽，证明单次导出可以覆盖默认值。
    lineWidth: 3,
  });
  message.value = result
    ? `DXF 已生成：${result.fileName}，实体 ${result.entityCount} 个`
    : "DXF 导出插件未注册";
}

/**
 * 切换多选插件状态。
 */
function toggleMultiSelect(): void {
  const success = businessMap.plugins.multiSelect.toggle();
  message.value = success
    ? `多选已${businessMap.plugins.multiSelect.getActive() ? "开启" : "关闭"}`
    : "切换多选失败";
}

/**
 * 清理吸附预览。
 * snap 通常在绘制控件内部自动工作，这里用主动清理动作证明它也接入了 businessMap.plugins。
 */
function clearSnapPreview(): void {
  const success = businessMap.plugins.snap.clearPreview();
  message.value = success ? "已清理吸附预览" : "吸附插件尚未初始化完成";
}

/**
 * 清空线草稿。
 */
function clearDraft(): void {
  const success = businessMap.plugins.lineDraft.clear();
  message.value = success ? "已清空草稿线和线廊" : "清空草稿失败";
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
  max-height: 180px;
  font-size: 12px;
}
</style>
