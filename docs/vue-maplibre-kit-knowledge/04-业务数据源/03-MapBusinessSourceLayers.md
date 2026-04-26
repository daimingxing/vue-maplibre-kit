# MapBusinessSourceLayers

适合谁读：已经创建业务 source 和 layers，需要把它们渲染到地图上的开发者。

先读哪篇：[02-createMapBusinessSourceRegistry](./02-createMapBusinessSourceRegistry.md)。

对应示例：[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)、[NGGI03](../../../examples/views/NG/GI/NGGI03.vue)。

## 模板接入

```vue
<MapLibreInit ref="mapRef" :map-options="mapOptions" :controls="controls">
  <template #dataSource>
    <MapBusinessSourceLayers :source="source" :layers="layers" />
  </template>
</MapLibreInit>
```

`source` 来自 `createMapBusinessSource`，`layers` 来自图层工厂或 `createLayerGroup`。

## 适合声明什么

- 正式业务 source。
- 长期存在的点、线、面、符号图层。
- 业务图层的默认样式、几何过滤、属性过滤。

## 不适合声明什么

- 一次性调试图层。
- 用户点击后短暂出现的高亮层。
- 只在某个操作中临时存在的分析结果。

这些临时需求更适合使用 `businessMap.layers` 命令式添加或写入 `feature-state`。
