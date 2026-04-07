# 事件体系与交互

## Map 事件
组件以 map:* 形式暴露 Map 事件，例如：
- map:load
- map:error
- map:click
- map:move
- map:zoom
- map:render
- map:resize

事件名称与 MapLibre 原生事件一致，仅增加 map: 前缀。

## Layer 事件
图层组件支持以下事件：
- click、dblclick、mousedown、mouseup、mousemove
- mouseenter、mouseleave、mouseover、mouseout
- contextmenu
- touchstart、touchend、touchcancel

## 事件使用示例
```vue
<template>
  <mgl-map :center="[121.47, 31.23]" :zoom="12" @map:click="onMapClick">
    <mgl-geo-json-source sourceId="points" :data="geojson">
      <mgl-circle-layer layerId="points-layer" @click="onLayerClick" />
    </mgl-geo-json-source>
  </mgl-map>
</template>

<script>
export default {
  methods: {
    onMapClick() {},
    onLayerClick() {}
  }
}
</script>
```
