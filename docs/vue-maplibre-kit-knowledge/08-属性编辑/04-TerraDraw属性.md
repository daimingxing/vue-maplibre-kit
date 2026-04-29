# TerraDraw 属性

适合谁读：需要读取或编辑绘图、测量控件要素属性的开发者。

先读哪篇：[03-保存与删除属性](./03-保存与删除属性.md)。

对应示例：[NGGI05](../../../examples/views/NG/GI/NGGI05.vue) 展示了属性规则分离；当前没有独立 TerraDraw 属性编辑示例。

## 控件级规则

TerraDraw 绘图控件和测量控件可以在 controls 中声明 `propertyPolicy`。

```ts
import type { MapControlsConfig } from "vue-maplibre-kit/business";

const controls: MapControlsConfig = {
  MaplibreMeasureControl: {
    isUse: true,
    propertyPolicy: {
      readonlyKeys: ["id"],
      removableKeys: ["remark"],
    },
  },
};
```

这套规则只作用于 TerraDraw / Measure 要素，不会自动影响正式业务 source。

## 解析面板状态

```ts
const panelState = businessMap.feature.resolveTerradrawPropertyPanelState({
  controlType: "draw",
  featureId: "draw-feature-id",
});
```

绘图和测量要素通常带有内部保留字段。查询门面会隐藏这些内部字段，避免业务面板把系统字段暴露给用户。

## 编辑目标

统一属性编辑器支持地图要素和 TerraDraw 要素两类目标。地图要素使用 `{ type: "map", featureRef }`，TerraDraw 要素使用对应的 TerraDraw 目标结构。

## 建议

- 正式业务资产落库前，先把 TerraDraw 要素转换成业务 GeoJSON。
- TerraDraw 临时属性可以在绘制阶段维护。
- 长期业务属性应进入正式 source 的 `feature.properties`，并由 source 的 `propertyPolicy` 管理。
