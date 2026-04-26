<template>
  <section class="nggi-page">
    <MapLibreInit
      ref="mapRef"
      :map-key="mapKey"
      :map-options="mapOptions"
      :controls="controls"
      :map-interactive="mapInteractive"
    />
    <aside class="nggi-panel">
      <h3>NGGI01 地图实例基础状态</h3>
      <p>mapKey：{{ String(mapKey) }}</p>
      <p>mapRef：{{ hasMapRef ? "已绑定" : "等待绑定" }}</p>
      <p>地图加载：{{ isMapReady ? "已就绪" : "加载中" }}</p>
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
  MapLibreInit,
  type MapLayerInteractiveOptions,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import { createExampleControls, createExampleMapOptions } from "./nggi-example.shared";

// 用稳定字符串 mapKey 展示多地图实例隔离场景，避免示例热更新时频繁生成新 Symbol。
const mapKey = "nggi01-basic-map";
// 轮询间隔仅用于示例面板显示宿主加载态，不参与真实业务逻辑。
const MAP_READY_INTERVAL_MS = 200;

const mapOptions = createExampleMapOptions();
const controls = createExampleControls("minimal");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const message = ref("等待地图交互初始化");
const isMapReady = ref(false);
const hasMapRef = computed(() => mapRef.value !== null);
const mapInteractive = reactive<MapLayerInteractiveOptions>({
  enabled: true,
  onReady: () => {
    message.value = "mapInteractive 已就绪";
  },
  onClick: (context) => {
    const lng = context.lngLat?.lng.toFixed(5) || "未知经度";
    const lat = context.lngLat?.lat.toFixed(5) || "未知纬度";
    message.value = `点击位置：${lng}, ${lat}`;
  },
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
