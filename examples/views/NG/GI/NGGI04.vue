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
      <MglPopup v-model:visible="popupVisible" :lng-lat="popupLngLat">
        <strong>{{ popupTitle }}</strong>
        <pre>{{ popupProperties }}</pre>
      </MglPopup>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI04 交互和 MglPopup</h3>
      <p>{{ message }}</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  MglPopup,
  type MapLayerInteractiveContext,
} from "vue-maplibre-kit/business";
import { createExampleInteractive, createExampleKit } from "./nggi-example.shared";

const kit = createExampleKit("basic");
const message = ref("点击任意示例要素打开弹窗");
const popupTitle = ref("要素详情");
const popupProperties = ref("暂无属性");
const popupVisible = ref(false);
const popupLngLat = ref<[number, number] | null>(null);

/**
 * 将要素属性转换为可读文本。
 * @param properties 当前要素属性
 * @returns 格式化后的属性文本
 */
function formatProperties(properties: MapLayerInteractiveContext["properties"]): string {
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
    popupProperties.value = "暂无属性";
    popupVisible.value = false;
    return;
  }

  popupTitle.value = String(context.properties?.name || "未命名要素");
  popupProperties.value = formatProperties(context.properties);
  popupLngLat.value = [context.lngLat.lng, context.lngLat.lat];
  popupVisible.value = true;
}

const interactive = {
  ...createExampleInteractive((text) => {
    message.value = text;
  }),
  onClick: (context: MapLayerInteractiveContext) => {
    message.value = `点击：${String(context.properties?.name || "空白区域")}`;
    showPopup(context);
  },
  onBlankClick: () => {
    message.value = "点击：空白区域";
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
</style>
