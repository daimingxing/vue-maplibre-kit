<template>
  <section class="nggi-page">
    <MapLibreInit
      :map-options="kit.mapOptions"
      :controls="kit.controls"
      :map-interactive="interactive"
    >
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
      <MglPopup
        v-model:visible="popupVisible"
        :lng-lat="popupLngLat"
        :options="popupOptions"
      >
        <div class="popup-body" :class="{ 'is-wide': popupWide }">
          <strong>{{ popupTitle }}</strong>
          <pre>{{ popupProperties }}</pre>
        </div>
      </MglPopup>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI04 交互和 MglPopup</h3>
      <p>{{ message }}</p>
      <div class="popup-options">
        <button type="button" @click="toggleWidePopup">
          {{ popupWide ? "窄弹窗" : "宽弹窗" }}
        </button>
        <button type="button" @click="toggleCloseButton">
          {{ popupCloseButton ? "隐藏关闭按钮" : "显示关闭按钮" }}
        </button>
      </div>
      <p>弹窗宽度：{{ popupMaxWidth }}</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  MglPopup,
  type MapLayerInteractiveContext,
} from "vue-maplibre-kit/business";
import type { PopupOptions } from "maplibre-gl";
import {
  createExampleInteractive,
  createExampleKit,
} from "./nggi-example.shared";

// 本页演示最常见的业务交互：点击地图要素 -> 打开弹窗 -> 展示该要素 properties。
const kit = createExampleKit("basic");
const message = ref("点击任意示例要素打开弹窗");
const popupTitle = ref("要素详情");
const popupProperties = ref("暂无属性");
const popupVisible = ref(false);
// MglPopup 需要经纬度数组；没有命中要素时用 null 表示不显示定位。
const popupLngLat = ref<[number, number] | null>(null);
const popupWide = ref(false);
const popupCloseButton = ref(true);
const popupMaxWidth = computed(() => (popupWide.value ? "420px" : "260px"));
const popupOptions = computed<PopupOptions>(() => ({
  closeButton: popupCloseButton.value,
  closeOnClick: true,
  maxWidth: popupMaxWidth.value,
}));

/**
 * 将要素属性转换为可读文本。
 * @param properties 当前要素属性
 * @returns 格式化后的属性文本
 */
function formatProperties(
  properties: MapLayerInteractiveContext["properties"]
): string {
  if (!properties) {
    return "暂无属性";
  }

  return JSON.stringify(properties, null, 2);
}

/**
 * 更新弹窗状态。
 * @param context 地图交互上下文
 */
function showPopup(context: MapLayerInteractiveContext): void {
  if (!context.lngLat || !context.feature) {
    // 没有 feature 表示当前不是有效业务要素点击，直接收起弹窗。
    popupProperties.value = "暂无属性";
    popupVisible.value = false;
    return;
  }

  popupTitle.value = String(context.properties?.name || "未命名要素");
  popupProperties.value = formatProperties(context.properties);
  // MapLibre 事件里 lngLat 是对象；MglPopup 入参统一使用 [lng, lat]。
  popupLngLat.value = [context.lngLat.lng, context.lngLat.lat];
  popupVisible.value = true;
}

/**
 * 切换弹窗最大宽度。
 */
function toggleWidePopup(): void {
  popupWide.value = !popupWide.value;
}

/**
 * 切换弹窗关闭按钮显示状态。
 */
function toggleCloseButton(): void {
  popupCloseButton.value = !popupCloseButton.value;
}

const interactive = {
  ...createExampleInteractive((text) => {
    message.value = text;
  }),
  // 覆盖共享示例的 onClick，把“点击要素”扩展成“点击并打开弹窗”。
  onClick: (context: MapLayerInteractiveContext) => {
    message.value = `点击：${String(context.properties?.name || "空白区域")}`;
    showPopup(context);
  },
  onBlankClick: () => {
    message.value = "点击：空白区域";
    // 空白点击时主动关闭弹窗，是业务弹窗最常见的交互习惯。
    popupVisible.value = false;
    popupLngLat.value = null;
    popupProperties.value = "暂无属性";
  },
};
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
  width: 280px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}

pre {
  overflow: auto;
  max-width: 260px;
  max-height: 180px;
  margin: 8px 0 0;
  font-size: 12px;
  white-space: pre-wrap;
}

.popup-options {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.popup-options button {
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
  color: #1f2937;
  cursor: pointer;
}
.popup-body {
  width: 240px;
}

.popup-body.is-wide {
  width: 400px;
}

.popup-body pre {
  max-width: 100%;
}
</style>
