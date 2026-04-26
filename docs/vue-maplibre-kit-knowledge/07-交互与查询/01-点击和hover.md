# 点击和 hover

适合谁读：需要监听业务图层交互事件的开发者。

先读哪篇：[交互与查询索引](./index.md)。

对应示例：[NGGI04](../../../examples/views/NG/GI/NGGI04.vue)、[NGGI03](../../../examples/views/NG/GI/NGGI03.vue)。

## 基本写法

```ts
import type { MapLayerInteractiveOptions } from "vue-maplibre-kit/business";

const interactive: MapLayerInteractiveOptions = {
  enabled: true,
  layers: {
    "asset-point-layer": { hitPriority: 30 },
    "asset-line-layer": { hitPriority: 20 },
    "asset-area-layer": { hitPriority: 10 },
  },
  onClick: (context) => {
    console.log(context.properties?.name || "空白区域");
  },
  onHoverEnter: (context) => {
    console.log(context.featureId);
  },
  onBlankClick: () => {
    console.log("点击空白区域");
  },
};
```

把它传给 `MapLibreInit`：

```vue
<MapLibreInit :map-options="mapOptions" :controls="controls" :map-interactive="interactive" />
```

## 上下文字段

常用字段包括：

| 字段 | 含义 |
| --- | --- |
| `feature` | 当前命中的原生渲染要素，空白点击时为 null |
| `featureId` | 当前命中的要素 ID |
| `properties` | 当前要素属性 |
| `layerId` | 命中的图层 ID |
| `sourceId` | 命中的 source ID |
| `lngLat` | 事件经纬度 |
| `selectedFeatures` | 当前选中集快照 |

## 空白点击

空白点击常用于关闭 Popup、清空属性面板或取消当前编辑目标。
