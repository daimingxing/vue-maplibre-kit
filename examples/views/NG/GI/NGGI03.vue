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
      <p>点击点或线要素可切换选中，点击空白区域可清空选中。</p>
      <button type="button" @click="toggleLine">切换线图层</button>
      <button type="button" @click="setLineColor">修改线颜色</button>
      <button type="button" @click="setPointState">写入点状态</button>
      <p>当前选中：{{ selectedText }}</p>
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

// 本页专门演示“图层动作”和“feature-state 表达式”的区别：
// 1. setVisible / setPaint 改的是整层
// 2. setFeatureState 改的是某个要素的状态
const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const message = ref("等待操作");
const selectedText = ref("未选中");
const lineVisible = ref(true);

applyStateStyles(kit.layers);

const interactive: MapLayerInteractiveOptions = {
  enabled: true,
  layers: {
    [EXAMPLE_POINT_LAYER_ID]: {
      hitPriority: 30,
      // 开启后，交互核心会自动给当前 hover 的要素写入 feature-state.hover。
      enableFeatureStateHover: true,
      // 点击命中要素后，交互核心会自动维护 feature-state.selected。
      enableFeatureStateSelected: true,
    },
    [EXAMPLE_LINE_LAYER_ID]: {
      hitPriority: 20,
      // 线图层也开启 hover 状态，方便看出点线都能复用同一套状态表达式。
      enableFeatureStateHover: true,
      // 显式开启 selected，方便示例页直接体现“点击即选中”。
      enableFeatureStateSelected: true,
    },
  },
  onHoverEnter: (context) => {
    message.value = `hover 高亮：${getFeatureName(context.properties, context.featureId)}`;
  },
  onHoverLeave: () => {
    message.value = "hover 已清理";
  },
  onBlankClick: () => {
    message.value = "点击空白区域，已清空选中";
    selectedText.value = "未选中";
  },
  onSelectionChange: (context) => {
    if (context.selectedCount === 0) {
      selectedText.value = "未选中";
      return;
    }

    const current = context.selectedFeatures[context.selectedFeatures.length - 1];
    // 这里取最后一个命中项，便于在单选示例里直观看到“当前选中的是谁”。
    selectedText.value = getFeatureName(current?.properties, current?.featureId);
    message.value = `已选中 ${selectedText.value}`;
  },
};

/**
 * 统一读取要素显示名称。
 * @param properties 要素属性
 * @param featureId 要素 ID
 * @returns 优先使用名称，缺失时回退到要素 ID
 */
function getFeatureName(
  properties?: Record<string, unknown> | null,
  featureId?: string | number | null
): string {
  return String(properties?.name || featureId || "未知要素");
}

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
 * 将 hover、selected 与主动 feature-state 接入示例图层样式。
 * @param layers 图层描述数组
 */
function applyStateStyles(layers: MapBusinessLayerDescriptor[]): void {
  const pointLayer = findLayer(layers, EXAMPLE_POINT_LAYER_ID);
  const lineLayer = findLayer(layers, EXAMPLE_LINE_LAYER_ID);

  if (pointLayer?.style?.paint) {
    const pointPaint = pointLayer.style.paint as Record<string, unknown>;
    // createFeatureStateExpression 会生成 MapLibre 表达式：
    // active > selected > hover，方便同时观察“按钮写状态”和“点击选中”的优先级。
    pointPaint["circle-color"] = createFeatureStateExpression({
      default: "#f97316",
      hover: "#facc15",
      selected: "#2563eb",
      states: {
        active: "#ef4444",
      },
      order: ["active", "selected", "hover"],
    });
    // 半径也使用同样的状态表达式，让状态变化在视觉上更明显。
    pointPaint["circle-radius"] = createFeatureStateExpression({
      default: 7,
      hover: 10,
      selected: 11,
      states: {
        active: 12,
      },
      order: ["active", "selected", "hover"],
    });
    pointPaint["circle-stroke-color"] = createFeatureStateExpression({
      default: "#ffffff",
      hover: "#111827",
      selected: "#1e3a8a",
      states: {
        active: "#7f1d1d",
      },
      order: ["active", "selected", "hover"],
    });
    pointPaint["circle-stroke-width"] = createFeatureStateExpression({
      default: 2,
      hover: 3,
      selected: 4,
      states: {
        active: 4,
      },
      order: ["active", "selected", "hover"],
    });
  }

  if (lineLayer?.style?.paint) {
    const linePaint = lineLayer.style.paint as Record<string, unknown>;
    // 线颜色与线宽都接入 hover/active，展示同一工具适用于不同 paint 字段。
    linePaint["line-color"] = createFeatureStateExpression({
      default: "#0f766e",
      hover: "#facc15",
      selected: "#2563eb",
      states: {
        active: "#ef4444",
      },
      order: ["active", "selected", "hover"],
    });
    linePaint["line-width"] = createFeatureStateExpression({
      default: 4,
      hover: 7,
      selected: 8,
      states: {
        active: 9,
      },
      order: ["active", "selected", "hover"],
    });
    linePaint["line-opacity"] = createFeatureStateExpression({
      default: 0.9,
      hover: 1,
      selected: 1,
      states: {
        active: 1,
      },
      order: ["active", "selected", "hover"],
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
    // setPaint 是整层样式修改；它会覆盖这里指定的 paint 字段。
    "line-color": "#7c3aed",
  });
  message.value = result.message;
}

/**
 * 给点要素写入 feature-state。
 */
function setPointState(): void {
  // 这里的 sourceId 必须与图层绑定的 source 一致，featureId 对应 GeoJSON 的 promoteId/id。
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
