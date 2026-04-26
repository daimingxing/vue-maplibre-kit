# createLayerGroup

适合谁读：希望用更短配置批量声明点线面图层的开发者。

先读哪篇：[01-图层工厂](./01-图层工厂.md)。

对应示例：[NGGI02](../../../examples/views/NG/GI/NGGI02.vue) 的共享示例配置。

## 基本写法

```ts
import {
  createLayerGroup,
  createSimpleCircleStyle,
  createSimpleFillStyle,
  createSimpleLineStyle,
} from "vue-maplibre-kit/business";

const layers = createLayerGroup({
  defaultPolicy: {
    readonlyKeys: ["id"],
    fixedKeys: ["name", "status"],
    removableKeys: ["remark"],
  },
  layers: [
    {
      type: "fill",
      id: "asset-area-layer",
      geometryTypes: ["Polygon", "MultiPolygon"],
      style: createSimpleFillStyle({ color: "#79b8ff", opacity: 0.35 }),
    },
    {
      type: "line",
      id: "asset-line-layer",
      geometryTypes: ["LineString", "MultiLineString"],
      style: createSimpleLineStyle({ color: "#0f766e", width: 4 }),
    },
    {
      type: "circle",
      id: "asset-point-layer",
      geometryTypes: ["Point", "MultiPoint"],
      style: createSimpleCircleStyle({ color: "#f97316", radius: 7 }),
    },
  ],
});
```

## 配置继承

`defaultPolicy` 和 `defaultStyle` 会作为子图层默认值。子图层配置了自己的 `policy` 或 `style` 时，会覆盖对应默认值。

## 何时使用

- 一个 source 需要同时声明点、线、面图层。
- 多个图层共享属性治理规则。
- 示例、业务模块或 composable 想返回一组稳定图层描述。
