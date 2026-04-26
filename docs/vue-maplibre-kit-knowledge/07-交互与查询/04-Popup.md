# Popup

适合谁读：需要在点击要素后展示轻量详情的开发者。

先读哪篇：[01-点击和hover](./01-点击和hover.md)。

对应示例：[NGGI04](../../../examples/views/NG/GI/NGGI04.vue)。

## 基本写法

```vue
<template>
  <MapLibreInit :map-options="mapOptions" :controls="controls" :map-interactive="interactive">
    <MglPopup v-model:visible="popupVisible" :lng-lat="popupLngLat">
      <strong>{{ popupTitle }}</strong>
      <pre>{{ popupText }}</pre>
    </MglPopup>
  </MapLibreInit>
</template>
```

## 点击后打开

```ts
import { ref } from "vue";
import type { MapLayerInteractiveContext } from "vue-maplibre-kit/business";

const popupVisible = ref(false);
const popupLngLat = ref<[number, number] | null>(null);
const popupTitle = ref("要素详情");
const popupText = ref("暂无属性");

/**
 * 根据地图点击上下文打开 Popup。
 * @param context 地图交互上下文
 */
function showPopup(context: MapLayerInteractiveContext): void {
  if (!context.feature || !context.lngLat) {
    popupVisible.value = false;
    return;
  }

  popupTitle.value = String(context.properties?.name || "未命名要素");
  popupText.value = JSON.stringify(context.properties || {}, null, 2);
  popupLngLat.value = [context.lngLat.lng, context.lngLat.lat];
  popupVisible.value = true;
}
```

## 空白点击关闭

```ts
const interactive = {
  onClick: showPopup,
  onBlankClick: () => {
    popupVisible.value = false;
    popupLngLat.value = null;
  },
};
```

Popup 适合轻量展示；复杂编辑表单建议放在独立业务面板，并通过 `MapSourceFeatureRef` 传递目标。
