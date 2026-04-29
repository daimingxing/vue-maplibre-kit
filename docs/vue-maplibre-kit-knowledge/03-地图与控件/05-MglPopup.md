# MglPopup

适合谁读：需要在地图点击、绘图或测量交互中展示 Vue 弹窗内容的开发者。

先读哪篇：[01-MapLibreInit](./01-MapLibreInit.md)。

对应示例：[NGGI04](../../../examples/views/NG/GI/NGGI04.vue)。

## 基础用法

`MglPopup` 放在 `MapLibreInit` 默认插槽里，使用 `v-model:visible` 控制显隐，用 `lngLat` 控制位置。

```vue
<MglPopup v-model:visible="popupVisible" :lng-lat="popupLngLat">
  <strong>{{ popupTitle }}</strong>
  <pre>{{ popupProperties }}</pre>
</MglPopup>
```

```ts
const popupVisible = ref(false);
const popupLngLat = ref<[number, number] | null>(null);

function openPopup(context: MapLayerInteractiveContext): void {
  if (!context.lngLat || !context.feature) {
    popupVisible.value = false;
    popupLngLat.value = null;
    return;
  }

  popupLngLat.value = [context.lngLat.lng, context.lngLat.lat];
  popupVisible.value = true;
}
```

## options 热更新

`options` 透传给 MapLibre 原生 `Popup`。运行时修改 `closeButton`、`closeOnClick`、`maxWidth`、`className` 等配置时，组件会重建原生 Popup，并保留当前 `visible` 和 `lngLat`。

```vue
<MglPopup
  v-model:visible="popupVisible"
  :lng-lat="popupLngLat"
  :options="popupOptions"
>
  <strong>{{ popupTitle }}</strong>
</MglPopup>
```

```ts
const popupWide = ref(false);
const popupCloseButton = ref(true);

const popupOptions = computed<PopupOptions>(() => ({
  closeButton: popupCloseButton.value,
  closeOnClick: true,
  maxWidth: popupWide.value ? "420px" : "260px",
}));
```

内联对象也可以使用：

```vue
<MglPopup
  v-model:visible="popupVisible"
  :lng-lat="popupLngLat"
  :options="{ closeButton: true, closeOnClick: true, maxWidth: '420px' }"
/>
```

组件会按配置内容判断是否需要重建，不会因为内联对象每次渲染产生新引用就反复重建。

## 注意事项

- `lngLat` 为 `null` 时不会显示弹窗。
- 用户点击原生关闭按钮或触发 `closeOnClick` 关闭时，会同步更新 `v-model:visible`。
- `options` 内容真正变化时会重建原生 Popup；弹窗内容插槽和当前坐标会重新挂载到新实例。
