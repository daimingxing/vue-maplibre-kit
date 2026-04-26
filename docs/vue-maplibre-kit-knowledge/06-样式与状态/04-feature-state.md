# feature-state

适合谁读：需要主动高亮、闪烁或写入运行时状态的开发者。

先读哪篇：[03-hover和selected](./03-hover和selected.md)。

对应示例：[NGGI03](../../../examples/views/NG/GI/NGGI03.vue)。

## 主动写入状态

```ts
const result = businessMap.layers.setFeatureState("asset-source", "asset-a", {
  active: true,
});
```

这里的 `sourceId` 必须和图层绑定的 source 一致，`featureId` 要能被 MapLibre 识别。普通 GeoJSON source 推荐配置 `promoteId`。

## 状态样式

```ts
const color = createFeatureStateExpression({
  default: "#64748b",
  selected: "#2563eb",
  hover: "#facc15",
  states: { active: "#ef4444" },
  order: ["active", "selected", "hover"],
});
```

## 适用场景

- 用户点击后短暂高亮。
- 表格行 hover 同步地图高亮。
- 分析结果临时标记。
- 闪烁提醒。

## 注意事项

`feature-state` 是运行时状态，不会写回 GeoJSON。需要持久保存的业务状态应保存到 `feature.properties`，再用属性表达式驱动样式。
