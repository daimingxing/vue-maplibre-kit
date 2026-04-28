<template>
  <section class="nggi-page">
    <MapLibreInit
      ref="mapRef"
      :map-key="mapKey"
      :map-options="mapOptions"
      :controls="controls"
      :map-interactive="mapInteractive"
    >
      <template #dataSource>
        <MapBusinessSourceLayers :source="source" :layers="layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI01 地图实例基础状态</h3>
      <p>mapKey：{{ String(mapKey) }}</p>
      <p>mapRef：{{ hasMapRef ? "已绑定" : "等待绑定" }}</p>
      <p>地图加载：{{ isMapReady ? "已就绪" : "加载中" }}</p>
      <p>createLayerGroup 图层：{{ layers.length }} 个</p>
      <p>交互状态：{{ message }}</p>
      <button type="button" @click="toggleInteractive">
        {{ mapInteractive.enabled === false ? "启用交互" : "停用交互" }}
      </button>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from "vue";
import {
  createLayerGroup,
  createMapBusinessSource,
  createMapControlsPreset,
  createSimpleCircleStyle,
  createSimpleFillStyle,
  createSimpleLineStyle,
  MapBusinessSourceLayers,
  MapLibreInit,
  type MapCommonFeatureCollection,
  type MapLayerInteractiveOptions,
  type MapLibreInitExpose,
  type MapOptions,
} from "vue-maplibre-kit/business";

// 用稳定字符串 mapKey 展示多地图实例隔离场景，避免示例热更新时频繁生成新 Symbol。
const mapKey = "nggi01-basic-map";
// 轮询间隔仅用于示例面板显示宿主加载态，不参与真实业务逻辑。
const MAP_READY_INTERVAL_MS = 200;
// 这些 ID 直接写在页面里，便于观察 createLayerGroup 如何绑定 source 与图层。
const SOURCE_ID = "nggi01-layer-group-source";
const FILL_LAYER_ID = "nggi01-layer-group-fill";
const LINE_LAYER_ID = "nggi01-layer-group-line";
const POINT_LAYER_ID = "nggi01-layer-group-point";

/**
 * 创建无外部瓦片依赖的空白地图样式。
 * @returns MapLibre 样式对象
 */
function createBlankStyle() {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "nggi01-layer-group-bg",
        type: "background",
        paint: {
          "background-color": "#eef2f3",
        },
      },
    ],
  };
}

/**
 * 创建 createLayerGroup 示例用的最小点线面数据。
 * @returns 示例 FeatureCollection
 */
function createGroupData(): MapCommonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "group-area-a",
        properties: {
          id: "group-area-a",
          name: "作业面 A",
          status: "normal",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [113.84, 22.47],
              [113.9, 22.45],
              [113.94, 22.5],
              [113.86, 22.53],
              [113.84, 22.47],
            ],
          ],
        },
      },
      {
        type: "Feature",
        id: "group-line-a",
        properties: {
          id: "group-line-a",
          name: "管线 A",
          status: "normal",
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [113.82, 22.56],
            [113.9, 22.51],
            [113.99, 22.56],
          ],
        },
      },
      {
        type: "Feature",
        id: "group-point-a",
        properties: {
          id: "group-point-a",
          name: "巡检点 A",
          status: "normal",
        },
        geometry: {
          type: "Point",
          coordinates: [113.96, 22.48],
        },
      },
    ],
  };
}

const mapOptions: Partial<MapOptions & { mapStyle: object }> = {
  mapStyle: createBlankStyle(),
  center: [113.9, 22.5],
  // 10 级缩放能让示例点线面同时出现在首屏。
  zoom: 10,
};
const controls = createMapControlsPreset("minimal", {
  MglNavigationControl: { isUse: true, position: "top-left" },
  MglScaleControl: { isUse: true, position: "bottom-left" },
});
const data = ref(createGroupData());
const layers = createLayerGroup({
  defaultPolicy: {
    readonlyKeys: ["id"],
    fixedKeys: ["name", "status"],
  },
  layers: [
    {
      type: "fill",
      id: FILL_LAYER_ID,
      geometryTypes: ["Polygon", "MultiPolygon"],
      style: createSimpleFillStyle({
        color: "#79b8ff",
        opacity: 0.35,
        outlineColor: "#1f6feb",
      }),
    },
    {
      type: "line",
      id: LINE_LAYER_ID,
      geometryTypes: ["LineString", "MultiLineString"],
      style: createSimpleLineStyle({
        color: "#0f766e",
        width: 4,
        opacity: 0.9,
      }),
    },
    {
      type: "circle",
      id: POINT_LAYER_ID,
      geometryTypes: ["Point", "MultiPoint"],
      style: createSimpleCircleStyle({
        color: "#f97316",
        radius: 7,
        opacity: 0.9,
        strokeColor: "#ffffff",
        strokeWidth: 2,
      }),
    },
  ],
});
const source = createMapBusinessSource({
  sourceId: SOURCE_ID,
  data,
  promoteId: "id",
  layers,
});
// mapRef 是所有业务门面读取地图实例的起点，后续示例都会围绕它继续扩展。
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
// message 只负责把交互结果显示到右侧面板，方便观察回调是否触发。
const message = ref("等待地图交互初始化");
const isMapReady = ref(false);
const hasMapRef = computed(() => mapRef.value !== null);
const mapInteractive = reactive<MapLayerInteractiveOptions>({
  enabled: true,
  layers: {
    [POINT_LAYER_ID]: { hitPriority: 30 },
    [LINE_LAYER_ID]: { hitPriority: 20 },
    [FILL_LAYER_ID]: { hitPriority: 10 },
  },
  // 地图交互核心准备好后会触发 onReady，适合做页面级状态提示。
  onReady: () => {
    message.value = "mapInteractive 已就绪";
  },
  onClick: (context) => {
    const featureName = context.properties?.name ? `，命中：${context.properties.name}` : "";
    // toFixed(5) 只是为了让面板里经纬度更短；真实业务可按需要保留更多位。
    const lng = context.lngLat?.lng.toFixed(5) || "未知经度";
    const lat = context.lngLat?.lat.toFixed(5) || "未知纬度";
    message.value = `点击位置：${lng}, ${lat}${featureName}`;
  },
  // 没点到业务图层时会触发空白点击，常用于关闭弹窗或清空右侧面板。
  onBlankClick: () => {
    message.value = "点击空白区域";
  },
});

let readyTimer: ReturnType<typeof globalThis.setInterval> | null = null;

/**
 * 同步地图宿主加载状态。
 */
function syncReadyState(): void {
  isMapReady.value = Boolean(mapRef.value?.rawHandles.mapInstance.isLoaded);
}

/**
 * 切换普通图层交互配置的启停状态。
 */
function toggleInteractive(): void {
  mapInteractive.enabled = mapInteractive.enabled === false;
  message.value = mapInteractive.enabled === false ? "mapInteractive 已停用" : "mapInteractive 已启用";
}

onMounted(() => {
  syncReadyState();
  // 示例页用轮询把地图加载态展示出来；真实项目更推荐用自己的页面状态管理。
  readyTimer = globalThis.setInterval(syncReadyState, MAP_READY_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (!readyTimer) {
    return;
  }

  globalThis.clearInterval(readyTimer);
  readyTimer = null;
});
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
  width: 260px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}
</style>
