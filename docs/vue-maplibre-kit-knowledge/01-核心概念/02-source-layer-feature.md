# source、layer、feature

适合谁读：对 MapLibre 概念不熟，或容易把数据和渲染混在一起的开发者。

先读哪篇：[01-地图实例与生命周期](./01-地图实例与生命周期.md)。

对应示例：[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)。

## source 是数据

业务 source 持有 GeoJSON `FeatureCollection`，并声明如何识别业务要素 ID。推荐使用 `createMapBusinessSource` 创建。

```ts
import { ref } from "vue";
import { createMapBusinessSource, type MapCommonFeatureCollection } from "vue-maplibre-kit/business";

const sourceData = ref<MapCommonFeatureCollection>({ type: "FeatureCollection", features: [] });

const source = createMapBusinessSource({
  sourceId: "asset-source",
  data: sourceData,
  promoteId: "id",
});
```

## layer 是渲染

layer 描述同一份 source 里的要素如何显示。一个 source 可以对应多个图层，例如点、线、面分层渲染。

```ts
import { createCircleBusinessLayer, createSimpleCircleStyle } from "vue-maplibre-kit/business";

const pointLayer = createCircleBusinessLayer({
  layerId: "asset-point-layer",
  geometryTypes: ["Point", "MultiPoint"],
  style: createSimpleCircleStyle({ color: "#f97316", radius: 7 }),
});
```

## feature 是业务要素

feature 是 GeoJSON 中的单条业务记录。组件库通过 `promoteId`、`featureIdKey` 或 `getFeatureId` 识别它。业务表格、弹窗、属性面板应围绕同一套 feature ID 协作。

## 三者关系

`MapBusinessSourceLayers` 把一个业务 source 和一组业务 layer 渲染到地图中：

```vue
<MapLibreInit :map-options="mapOptions" :controls="controls">
  <template #dataSource>
    <MapBusinessSourceLayers :source="source" :layers="layers" />
  </template>
</MapLibreInit>
```
