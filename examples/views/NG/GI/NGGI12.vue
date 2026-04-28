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
      <h3>NGGI12 polygon-edge</h3>
      <button type="button" @click="generateEdge">生成边线</button>
      <button type="button" @click="toggleStyleMode">切换配置样式</button>
      <button type="button" @click="highlightPolygon">高亮整个面</button>
      <button type="button" @click="highlightRing">高亮 ring</button>
      <button type="button" @click="highlightEdge">高亮单边</button>
      <button type="button" @click="selectEdge">选中单边</button>
      <button type="button" @click="clearHighlight">清理高亮</button>
      <button type="button" @click="clearEdge">去除边线</button>
      <p>样式方案：{{ styleModeText }}</p>
      <p>边线数量：{{ polygonEdge.featureCount.value }}</p>
      <p>选中边线：{{ polygonEdge.selectedEdgeId.value || "无" }}</p>
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
  type MapCommonFeature,
  type MapLayerInteractiveOptions,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import {
  createBusinessPlugins,
  type BusinessPluginsOptions,
  type PolygonEdgePreviewStateStyles,
} from "vue-maplibre-kit/plugins";
import {
  EXAMPLE_FILL_LAYER_ID,
  EXAMPLE_LINE_LAYER_ID,
  createExampleKit,
} from "./nggi-example.shared";

type EdgeStyleMode = "default" | "warning";

// 本页只演示 polygon-edge-preview：从面生成临时边线、切换边线样式、用 API 高亮与清理。
const kit = createExampleKit("draw");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const polygonEdge = businessMap.plugins.polygonEdge;
const styleMode = ref<EdgeStyleMode>("default");
const message = ref("点击“生成边线”，会把 area-a 的面边界拆成临时线。");

const styleModeText = computed(() => (styleMode.value === "default" ? "蓝绿方案" : "橙红方案"));

const plugins = computed(() =>
  createBusinessPlugins({
    snap: {
      // layerIds 会自动生成一条默认业务图层吸附规则；详细说明见本轮回复。
      layerIds: [EXAMPLE_LINE_LAYER_ID, EXAMPLE_FILL_LAYER_ID],
      polygonEdge: {
        enabled: true,
        priority: 90,
        snapTo: ["vertex", "segment"],
      },
    },
    polygonEdge: {
      enabled: true,
      style: resolveEdgeStyle(),
      styleRules: [
        {
          where: {
            kind: "area",
          },
          style: {
            normal:
              styleMode.value === "default"
                ? { color: "#2563eb", width: 4, opacity: 0.95 }
                : { color: "#f97316", width: 4, opacity: 0.95 },
          },
        },
      ],
      onHoverEnter: (context) => {
        message.value = `hover 边线：${context.edgeId || "未知边线"}`;
      },
      onClick: (context) => {
        message.value = `点击边线：${context.edgeId || "未知边线"}`;
      },
    },
  } satisfies BusinessPluginsOptions)
);

const interactive: MapLayerInteractiveOptions = {
  enabled: true,
  layers: {
    [EXAMPLE_FILL_LAYER_ID]: {
      hitPriority: 10,
    },
  },
  onClick: (context) => {
    const businessContext = businessMap.feature.toBusinessContext(context);
    if (!isPolygonFeature(businessContext.feature)) {
      message.value = "请点击面要素，或直接用按钮生成 area-a 的边线。";
      return;
    }

    const result = polygonEdge.generateFromFeature({
      feature: businessContext.feature,
      origin: businessContext.featureRef,
    });
    message.value = result.success
      ? `已从点击面生成边线：${result.edgeCount} 条`
      : result.message;
  },
};

/**
 * 解析当前面边线状态样式。
 * @returns 面边线插件样式配置
 */
function resolveEdgeStyle(): PolygonEdgePreviewStateStyles {
  if (styleMode.value === "warning") {
    return {
      normal: { color: "#f97316", width: 3, opacity: 0.9 },
      hover: { color: "#ef4444", width: 6, opacity: 1 },
      selected: { color: "#991b1b", width: 7, opacity: 1 },
      highlighted: { color: "#facc15", width: 5, opacity: 1 },
    };
  }

  return {
    normal: { color: "#2563eb", width: 3, opacity: 0.9 },
    hover: { color: "#0f766e", width: 6, opacity: 1 },
    selected: { color: "#7c3aed", width: 7, opacity: 1 },
    highlighted: { color: "#16a34a", width: 5, opacity: 1 },
  };
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
 * 读取示例面要素。
 * @returns 示例面要素
 */
function getDemoPolygon(): MapCommonFeature | null {
  const polygonFeature = kit.source.resolveFeature("area-a");
  return isPolygonFeature(polygonFeature) ? polygonFeature : null;
}

/**
 * 读取第一条面边线。
 * @returns 第一条边线要素
 */
function getFirstEdge(): MapCommonFeature | null {
  return (polygonEdge.getData()?.features[0] as MapCommonFeature | undefined) || null;
}

/**
 * 从固定示例面生成临时边线。
 */
function generateEdge(): void {
  const polygonFeature = getDemoPolygon();
  if (!polygonFeature) {
    message.value = "未找到 area-a，无法生成边线。";
    return;
  }

  const result = polygonEdge.generateFromFeature({
    feature: polygonFeature,
    origin: kit.source.toFeatureRef("area-a", EXAMPLE_FILL_LAYER_ID),
  });
  message.value = result.success
    ? `已生成临时边线：${result.edgeCount} 条，polygonId=${result.polygonId}`
    : result.message;
}

/**
 * 切换当前面边线配置样式。
 * 已生成的边线会继续保留，图层会按新的插件配置重新渲染。
 */
function toggleStyleMode(): void {
  styleMode.value = styleMode.value === "default" ? "warning" : "default";
  if (polygonEdge.featureCount.value > 0) {
    // styleRules 会在生成边线时写入每条边的属性；切换方案后重新生成，保证特定要素样式同步更新。
    generateEdge();
  }

  message.value = `已切换为${styleModeText.value}`;
}

/**
 * 高亮整个面。
 */
function highlightPolygon(): void {
  const polygonId = getFirstEdge()?.properties?.polygonId;
  if (polygonId === undefined || polygonId === null) {
    message.value = "请先生成边线。";
    return;
  }

  const success = polygonEdge.highlightPolygon(String(polygonId));
  message.value = success ? `已高亮整个面：${String(polygonId)}` : "高亮整个面失败。";
}

/**
 * 高亮第一条边线所在的 ring。
 */
function highlightRing(): void {
  const ringId = getFirstEdge()?.properties?.ringId;
  if (ringId === undefined || ringId === null) {
    message.value = "请先生成边线。";
    return;
  }

  const success = polygonEdge.highlightRing(String(ringId));
  message.value = success ? `已高亮 ring：${String(ringId)}` : "高亮 ring 失败。";
}

/**
 * 高亮第一条边线。
 */
function highlightEdge(): void {
  const edgeId = getFirstEdge()?.properties?.edgeId;
  if (edgeId === undefined || edgeId === null) {
    message.value = "请先生成边线。";
    return;
  }

  const success = polygonEdge.highlightEdge(String(edgeId));
  message.value = success ? `已高亮边线：${String(edgeId)}` : "高亮边线失败。";
}

/**
 * 选中第一条边线。
 */
function selectEdge(): void {
  const edgeId = getFirstEdge()?.properties?.edgeId;
  if (edgeId === undefined || edgeId === null) {
    message.value = "请先生成边线。";
    return;
  }

  const success = polygonEdge.selectEdge(String(edgeId));
  message.value = success ? `已选中边线：${String(edgeId)}` : "选中边线失败。";
}

/**
 * 清理边线高亮和选中状态。
 */
function clearHighlight(): void {
  const success = polygonEdge.clearHighlight();
  message.value = success ? "已清理边线高亮和选中状态。" : "面边线插件尚未注册。";
}

/**
 * 去除全部临时边线。
 */
function clearEdge(): void {
  const success = polygonEdge.clear();
  message.value = success ? "已去除全部临时边线。" : "面边线插件尚未注册。";
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
  width: 300px;
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
