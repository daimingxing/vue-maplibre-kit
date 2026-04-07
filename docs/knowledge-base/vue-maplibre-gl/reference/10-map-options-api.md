# MapOptions API 核心配置项参考

本文档整理了 MapLibre GL JS 中 `MapOptions`（即初始化地图实例时的配置参数）的常用核心属性。在使用 `vue-maplibre-gl` 的 `<MglMap>` 容器或我们封装的 `<MapLibreInit>` 组件时，可以通过 `mapOptions` 对象整体传入，也可以作为扁平属性（通过 `v-bind="$attrs"` 机制）逐一传入。

## 基础视图配置 (Base View Options)

* **`center`**: `LngLatLike` (默认: `[0, 0]`)
  初始地图的中心点坐标。支持 `[longitude, latitude]` 数组格式或对象格式。在未指定时会尝试从 style 中读取。

* **`zoom`**: `number` (默认: `0`)
  初始地图的缩放级别。未指定时会尝试从 style 中读取。

* **`bearing`**: `number` (默认: `0`)
  初始地图的方位角（旋转角度），以正北为基准逆时针测量的度数。

* **`pitch`**: `number` (默认: `0`)
  初始地图的倾斜角度（0-85度）。

* **`style`** (在 Vue 组件中通常映射为 **`mapStyle`**): `string | object`
  地图样式，可以是 URL（如 `https://demotiles.maplibre.org/style.json`）或者一个完整的 MapLibre Style 规范的 JSON 对象。

* **`bounds`**: `LngLatBoundsLike`
  地图的初始边界。如果设置了 `bounds`，它将覆盖 `center` 和 `zoom` 配置。

## 限制与约束 (Limits & Constraints)

* **`minZoom`** / **`maxZoom`**: `number`
  地图允许的最小与最大缩放级别（0-24）。

* **`minPitch`** / **`maxPitch`**: `number`
  地图允许的最小与最大倾斜角度（最大通常为 85度）。

* **`maxBounds`**: `LngLatBoundsLike`
  设置一个边界框，限制用户只能在该区域内进行平移或缩放操作。

## 交互控制 (Interaction Handlers)

* **`interactive`**: `boolean` (默认: `true`)
  如果设置为 `false`，则地图将不接受任何鼠标、触摸或键盘交互事件。

* **`dragPan`**: `boolean | object` (默认: `true`)
  是否允许拖拽平移。可传入对象配置缓动和最大速度。

* **`scrollZoom`**: `boolean | object` (默认: `true`)
  是否允许鼠标滚轮缩放。

* **`boxZoom`**: `boolean` (默认: `true`)
  是否允许通过按住 Shift 键并拖拽鼠标绘制一个边界框来进行缩放。

* **`dragRotate`**: `boolean` (默认: `true`)
  是否允许按住右键（或 Ctrl + 左键）并拖拽来旋转和倾斜地图。

* **`doubleClickZoom`**: `boolean` (默认: `true`)
  是否允许双击缩放。

* **`keyboard`**: `boolean` (默认: `true`)
  是否允许键盘交互（如方向键平移，+/- 键缩放）。

* **`cooperativeGestures`**: `boolean` (默认: `false`)
  开启后，单指滑动网页时不会触发地图拖动，必须双指操作或按住特定键（适用于将地图嵌入在长滚动网页中的场景）。

## 渲染与表现 (Rendering & Performance)

* **`antialias`** (通常通过 **`canvasContextAttributes`** 传入): `boolean` (默认: `false`)
  如果开启，会在支持的设备上使用多重采样抗锯齿（MSAA），提升特定图层（如自定义 3D 图层）的渲染质量，但会消耗更多性能。

* **`renderWorldCopies`**: `boolean` (默认: `true`)
  当缩小到足够小，是否将多个世界的拷贝渲染在水平方向上。

* **`crossSourceCollisions`**: `boolean` (默认: `true`)
  是否在不同数据源之间执行碰撞检测（防重叠计算）。

* **`fadeDuration`**: `number` (默认: `300`)
  控制标签文本等元素的淡入淡出动画持续时间（毫秒）。

## UI 控件配置 (UI Controls)

* **`attributionControl`**: `boolean | object` (默认: `true`)
  是否自动在右下角添加版权信息控件。如果传 `false` 可以禁用内置控件。

* **`logoPosition`**: `'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'`
  控制 MapLibre Logo 的显示位置。

## 在 `MapLibreInit` 组件中的使用建议

我们在封装中结合了扁平化传参与集中式传参的优势：

```vue
<template>
  <MapLibreInit 
    :mapOptions="sharedOptions" 
    :pitch="45" 
    @click="onMapClick"
  />
</template>

<script setup>
import { reactive } from 'vue'

// 集中管理大部分配置，便于复用
const sharedOptions = reactive({
  bearing: 15,
  maxZoom: 18,
  dragRotate: false,
  cooperativeGestures: true
})
</script>
```

**解析**：
* 传入的 `mapOptions` 会被对象展开。
* `v-bind="$attrs"` 的机制会将直接写在模板上的属性（如 `:pitch="45"`）合并，如果发生命名冲突，模板直接绑定的属性优先级**更高**。
