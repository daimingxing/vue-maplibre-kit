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
      <ul class="selected-list">
        <li v-for="item in selectedItems" :key="item.key">
          {{ item.name }} / {{ item.layerId }}
        </li>
      </ul>
      <pre>{{ message }}</pre>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  createFeatureStateExpression,
  useBusinessMap,
  type MapBusinessLayerDescriptor,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
import {
  EXAMPLE_LINE_LAYER_ID,
  EXAMPLE_POINT_LAYER_ID,
  createExampleInteractive,
  createExampleKit,
} from "./nggi-example.shared";

const kit = createExampleKit("basic");
applySelectStyles(kit.layers);

const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const multiSelect = businessMap.plugins.multiSelect;
const message = ref("等待多选操作");
const interactive = {
  ...createExampleInteractive((text) => {
    message.value = text;
  }),
  onSelectionChange: () => {
    message.value = `多选变化：${multiSelect.getSelectedFeatures().length} 个要素`;
  },
};
const plugins = createBusinessPlugins({
  multiSelect: {
    enabled: true,
    deactivateBehavior: "retain",
    targetLayerIds: [EXAMPLE_POINT_LAYER_ID, EXAMPLE_LINE_LAYER_ID],
    canSelect: (context) => context.layerId !== null,
  },
});

const selectedItems = computed(getSelectedItems);

/**
 * 按图层 ID 读取示例图层描述。
 * @param layers 图层描述数组
 * @param layerId 目标图层 ID
 * @returns 命中的图层描述；未命中时返回 null
 */
function findLayer(
  layers: MapBusinessLayerDescriptor[],
  layerId: string
): MapBusinessLayerDescriptor | null {
  return layers.find((layer) => layer.layerId === layerId) || null;
}

/**
 * 将 selected feature-state 接入多选目标图层样式。
 * @param layers 图层描述数组
 */
function applySelectStyles(layers: MapBusinessLayerDescriptor[]): void {
  const pointLayer = findLayer(layers, EXAMPLE_POINT_LAYER_ID);
  const lineLayer = findLayer(layers, EXAMPLE_LINE_LAYER_ID);

  if (pointLayer?.style?.paint) {
    const pointPaint = pointLayer.style.paint as Record<string, unknown>;
    pointPaint["circle-color"] = createFeatureStateExpression({
      default: "#f97316",
      selected: "#22c55e",
    });
    pointPaint["circle-radius"] = createFeatureStateExpression({
      default: 7,
      selected: 12,
    });
    pointPaint["circle-stroke-color"] = createFeatureStateExpression({
      default: "#ffffff",
      selected: "#14532d",
    });
    pointPaint["circle-stroke-width"] = createFeatureStateExpression({
      default: 2,
      selected: 4,
    });
  }

  if (lineLayer?.style?.paint) {
    const linePaint = lineLayer.style.paint as Record<string, unknown>;
    linePaint["line-color"] = createFeatureStateExpression({
      default: "#0f766e",
      selected: "#22c55e",
    });
    linePaint["line-width"] = createFeatureStateExpression({
      default: 4,
      selected: 8,
    });
  }
}

/**
 * 读取当前面板需要展示的多选摘要。
 * @returns 多选摘要列表
 */
function getSelectedItems() {
  return multiSelect.selectedFeatures.value.map((feature) => ({
    key: feature.key,
    layerId: feature.layerId || "未知图层",
    name: String(feature.properties?.name || feature.featureId || "未命名"),
  }));
}

/**
 * 读取当前多选选中要素。
 */
function readSelected(): void {
  message.value = JSON.stringify(
    multiSelect.getSelectedFeatures().map((feature) => ({
      key: feature.key,
      featureId: feature.featureId,
      layerId: feature.layerId,
      sourceId: feature.sourceId,
      sourceLayer: feature.sourceLayer,
      properties: feature.properties,
      snapshot: feature.snapshot,
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

.selected-list {
  display: grid;
  gap: 4px;
  max-height: 120px;
  margin: 0;
  padding-left: 18px;
  overflow: auto;
  font-size: 12px;
}
</style>
