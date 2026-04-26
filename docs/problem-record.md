## 2026-04-26 NGGI02 运行时 source/layer 门面缺口

- 现象：示例需要展示 `businessMap.layers` 命令式添加/移除 GeoJSON source 和 layer，但当前 `UseMapLayerActionsResult` 只暴露 `show`、`hide`、`setVisible`、`setPaint`、`setLayout`、`setFeatureState`。
- 处理：`NGGI02.vue` 按预期 API 使用 `addGeoJsonSource`、`addLayer`、`removeLayer`、`removeSource` 的可选调用，运行时若主线程尚未补门面方法，会在示例面板显示未实现提示。
- 后续：主线程补齐 `businessMap.layers` 的 source/layer 增删门面后，示例无需改调用形态即可展示真实新增和移除效果。
- 结果：已补齐 `businessMap.layers.addGeoJsonSource`、`addLayer`、`removeLayer`、`removeSource`，并新增 `useMapLayerActions.spec.ts` 覆盖运行时 source/layer 增删与降级结果；`NGGI02.vue` 已改为直接调用正式门面方法。
