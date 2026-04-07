# 入门指南与基础配置

本章节介绍如何快速安装 `@watergis/maplibre-gl-terradraw` 并将其集成到现有的 MapLibre GL JS 项目中（包括在 Vue 中的集成方式）。

## 1. 安装

该插件可以通过 npm 等包管理工具进行安装。我们推荐使用 npm 作为依赖管理工具。

```bash
npm install -D @watergis/maplibre-gl-terradraw
```

_注：本插件自带了 `terra-draw` 作为核心依赖，通常无需重复安装。_

## 2. 引入样式

为了确保绘制工具栏在地图上正常显示，必须在入口文件（如 `main.ts` 或 `App.vue`）或组件内部引入随包分发的 CSS/SCSS 文件。

```javascript
// 在组件顶部或入口文件引入样式
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css';
// 也可以引入 scss： import '@watergis/maplibre-gl-terradraw/package/maplibre-gl-terradraw.scss';
```

## 3. 基本使用

该库通过暴露 `MaplibreTerradrawControl` 类来实现，其实质是一个 MapLibre 原生的 Control（即继承或实现了 `IControl` 接口）。

### 原生 JS 示例

```javascript
import maplibregl from 'maplibre-gl';
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw';

// 1. 初始化地图
const map = new maplibregl.Map({
    container: 'map', // DOM id
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [0, 0],
    zoom: 2
});

// 2. 地图加载完成后，添加控件
map.on('load', () => {
    // 初始化 TerraDraw 控制器
    const drawControl = new MaplibreTerradrawControl({
        // 默认展开工具栏
        open: true
    });
    
    // 挂载到地图左上角
    map.addControl(drawControl, 'top-left');
});
```

### Vue 3 (搭配 `vue-maplibre-gl`) 示例

如果您正在使用 `vue-maplibre-gl`，可以在其 `map:load` 事件回调中挂载控件。

```vue
<template>
  <div class="map-container">
    <mgl-map
      :mapStyle="'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'"
      :center="[0, 0]"
      :zoom="2"
      @map:load="onMapLoad"
    />
  </div>
</template>

<script setup>
import { shallowRef } from 'vue';
import { MglMap } from 'vue-maplibre-gl';
import 'vue-maplibre-gl/dist/vue-maplibre-gl.css';
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw';
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css';

const drawControlRef = shallowRef(null);

const onMapLoad = (event) => {
  const map = event.map; // 拿到原生 maplibre 实例
  
  // 实例化控件
  const drawControl = new MaplibreTerradrawControl({
    open: true
  });
  
  drawControlRef.value = drawControl;
  
  // 添加到地图
  map.addControl(drawControl, 'top-right');
};
</script>

<style scoped>
.map-container {
  height: 100vh;
  width: 100%;
}
</style>
```

完成上述步骤后，您的地图上就会出现一个完整的、带有诸多绘制选项的侧边工具栏。您可以直接点击按钮在地图上绘制点、线、面。

## 4. 设置坐标精度

在默认情况下，Terra Draw 引擎使用 9 位小数作为坐标精度。如果您的业务需求不需要这么高的精度（例如为了减小 GeoJSON 数据体积），可以在初始化时通过 `adapterOptions` 修改它：

```javascript
const drawControl = new MaplibreTerradrawControl({
    modes: ['point', 'linestring', 'polygon', 'select', 'delete'],
    open: true,
    adapterOptions: {
        // 将坐标精度从默认的 9 位修改为 6 位
        coordinatePrecision: 6
    }
});
map.addControl(drawControl, 'top-left');
```
