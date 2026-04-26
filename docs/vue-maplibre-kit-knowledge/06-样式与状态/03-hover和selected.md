# hover 和 selected

适合谁读：需要点击选中、悬停高亮，并让样式随状态变化的开发者。

先读哪篇：[02-表达式工具](./02-表达式工具.md)。

对应示例：[NGGI03](../../../examples/views/NG/GI/NGGI03.vue)、[NGGI10](../../../examples/views/NG/GI/NGGI10.vue)。

## 状态链路

1. 在 `mapInteractive.layers` 中声明参与交互的图层。
2. 开启 `enableFeatureStateHover` 或 `enableFeatureStateSelected`。
3. 图层样式使用 `createFeatureStateExpression`。
4. 交互核心自动写入 `feature-state.hover` 和 `feature-state.selected`。

## 示例

```ts
const interactive = {
  enabled: true,
  layers: {
    "asset-point-layer": {
      hitPriority: 30,
      enableFeatureStateHover: true,
      enableFeatureStateSelected: true,
    },
  },
};
```

样式侧：

```ts
const pointStyle = createCircleLayerStyle({
  paint: {
    "circle-color": createFeatureStateExpression({
      default: "#f97316",
      hover: "#facc15",
      selected: "#2563eb",
    }),
  },
});
```

## hitPriority

当点、线、面重叠时，`hitPriority` 数字越大越优先命中。示例中点优先级高于线，线高于面，符合属性编辑和点击查询的直觉。
