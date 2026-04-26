<template>
  <section class="nggi-page">
    <MapLibreInit
      ref="mapRef"
      :map-options="kit.mapOptions"
      :controls="kit.controls"
      :map-interactive="interactive"
    >
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI03 图层显隐/样式/feature-state</h3>
      <button type="button" @click="toggleLine">切换线图层</button>
      <button type="button" @click="setLineColor">修改线颜色</button>
      <button type="button" @click="setPointState">写入点状态</button>
      <p>{{ message }}</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  createFeatureStateExpression,
  useBusinessMap,
  type MapBusinessLayerDescriptor,
  type MapLayerInteractiveOptions,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import {
  EXAMPLE_LINE_LAYER_ID,
  EXAMPLE_POINT_LAYER_ID,
  EXAMPLE_SOURCE_ID,
  createExampleKit,
} from "./nggi-example.shared";

const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const message = ref("等待操作");
const lineVisible = ref(true);

applyStateStyles(kit.layers);

const interactive: MapLayerInteractiveOptions = {
  enabled: true,
  layers: {
    [EXAMPLE_POINT_LAYER_ID]: {
      hitPriority: 30,
      enableFeatureStateHover: true,
    },
    [EXAMPLE_LINE_LAYER_ID]: {
      hitPriority: 20,
      enableFeatureStateHover: true,
    },
  },
  onHoverEnter: (context) => {
    message.value = `hover 高亮：${String(context.properties?.name || "未知要素")}`;
  },
  onHoverLeave: () => {
    message.value = "hover 已清理";
  },
};

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
 * 将 hover 与主动 feature-state 接入示例图层样式。
 * @param layers 图层描述数组
 */
function applyStateStyles(layers: MapBusinessLayerDescriptor[]): void {
  const pointLayer = findLayer(layers, EXAMPLE_POINT_LAYER_ID);
  const lineLayer = findLayer(layers, EXAMPLE_LINE_LAYER_ID);

  if (pointLayer?.style?.paint) {
    const pointPaint = pointLayer.style.paint as Record<string, unknown>;
    pointPaint["circle-color"] = createFeatureStateExpression({
      default: "#f97316",
      hover: "#facc15",
      states: {
        active: "#ef4444",
      },
      order: ["active", "hover"],
    });
    pointPaint["circle-radius"] = createFeatureStateExpression({
      default: 7,
      hover: 10,
      states: {
        active: 12,
      },
      order: ["active", "hover"],
    });
    pointPaint["circle-stroke-color"] = createFeatureStateExpression({
      default: "#ffffff",
      hover: "#111827",
      states: {
        active: "#7f1d1d",
      },
      order: ["active", "hover"],
    });
  }

  if (lineLayer?.style?.paint) {
    const linePaint = lineLayer.style.paint as Record<string, unknown>;
    linePaint["line-color"] = createFeatureStateExpression({
      default: "#0f766e",
      hover: "#facc15",
      states: {
        active: "#ef4444",
      },
      order: ["active", "hover"],
    });
    linePaint["line-width"] = createFeatureStateExpression({
      default: 4,
      hover: 7,
      states: {
        active: 8,
      },
      order: ["active", "hover"],
    });
  }
}

/**
 * 切换线图层显隐。
 */
function toggleLine(): void {
  lineVisible.value = !lineVisible.value;
  const result = businessMap.layers.setVisible(EXAMPLE_LINE_LAYER_ID, lineVisible.value);
  message.value = result.message;
}

/**
 * 修改线图层颜色。
 */
function setLineColor(): void {
  const result = businessMap.layers.setPaint(EXAMPLE_LINE_LAYER_ID, {
    "line-color": "#7c3aed",
  });
  message.value = result.message;
}

/**
 * 给点要素写入 feature-state。
 */
function setPointState(): void {
  const result = businessMap.layers.setFeatureState(EXAMPLE_SOURCE_ID, "point-a", {
    active: true,
  });
  message.value = `${EXAMPLE_POINT_LAYER_ID} 已写入 active 状态：${result.message}`;
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
