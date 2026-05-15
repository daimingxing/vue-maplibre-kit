# 代码 bug 审查报告

审查日期：2026-05-11

审查范围：`src/` 公开入口、业务门面、插件宿主、业务 source、运行时图层动作、snap / polygonEdge / intersection / dxfExport 等插件链路，以及 `examples/views/NG/GI/**` 业务模拟接入页。

## 总体结论

当前代码主链路没有发现会阻断构建的明显语法或类型错误。`package.json` 的 `exports`、`vite.config.ts` 开发别名、`tsconfig.app.json` paths 与 `src/index.ts`、`src/business.ts`、`src/config.ts`、`src/geometry.ts`、`src/plugins.ts` 及六个插件子路径整体对齐，示例也主要通过 `vue-maplibre-kit/business`、`vue-maplibre-kit/plugins`、`vue-maplibre-kit/geometry` 等公开出口接入。

本轮发现 1 个建议修复的运行期风险，另有 2 个低风险维护项。

复核更新：2026-05-11 已按当前源码重新取证。`BUG-01` 与 `BUG-02` 确认仍存在并已完成修复；`BUG-03` 确认仍存在，但属于低风险类型维护项，本轮不扩大为表达式类型重构。

## 问题汇总

| 编号 | 严重级别 | 结论 | 涉及文件 | 建议 | 复核状态 |
| --- | --- | --- | --- | --- | --- |
| BUG-01 | P2 | `useMapLayerActions` 的部分图层属性操作缺少原生异常边界 | `src/MapLibre/facades/useMapLayerActions.ts` | 给 `show`、`hide`、`setVisible`、`setPaint`、`setLayout` 统一补 `try/catch` 并返回结构化失败 | 已确认并修复 |
| BUG-02 | P3 | `NGGI06` DXF 默认文件名仍写 `five-plugins` | `examples/views/NG/GI/NGGI06.vue` | 改成 `nggi06-six-plugins.dxf` 或更中性的 `nggi06-plugin-summary.dxf` | 已确认并修复 |
| BUG-03 | P3 | 业务预设中简单样式工厂仍有多处 `as any` | `src/MapLibre/facades/businessPreset.ts` | 后续可用更精确的表达式值类型替代，降低类型逃逸 | 确认存在，本轮暂缓 |

## BUG-01：图层属性操作缺少异常边界

### 事实依据

`src/MapLibre/facades/useMapLayerActions.ts` 已经对 `addGeoJsonSource()`、`addLayer()`、`removeLayer()`、`removeSource()` 做了 `try/catch`，并把 MapLibre 原生异常转换成 `MapLayerActionResult`。

同一文件里的 `show()`、`hide()`、`setVisible()`、`setPaint()`、`setLayout()` 会经过 `setLayerValues()` -> `runLayerAction()`，但当前 `runLayerAction()` 在确认图层存在后直接执行回调：

```ts
action(rawMap);
return createLayerActionResult(true, '图层动作已执行');
```

如果 MapLibre 在 `setPaintProperty()` 或 `setLayoutProperty()` 阶段抛出异常，例如属性名无效、样式尚不可写、表达式非法，异常会穿透业务门面。

### 风险影响

业务层调用 `businessMap.layers.setPaint()`、`setLayout()`、`show()`、`hide()` 时，预期拿到的是结构化结果；但异常穿透后会破坏“门面返回失败对象”的一致性。这个问题不一定在常规 demo 中出现，但在真实业务动态样式、用户输入表达式或地图样式切换过程中更容易触发。

### 建议修复

把异常边界上提到 `runLayerAction()`：

- 动作成功时仍返回 `success: true`。
- 动作异常时返回 `success: false` 和 `图层动作失败：${getErrorMessage(error)}`。
- 可保留当前 `add/remove` 的专属错误文案。

建议补充一条 `useMapLayerActions.spec.ts` 用例，模拟 `setPaintProperty()` 抛错，断言不会向外抛异常，而是返回结构化失败。

### 复核状态

已确认并修复。`runLayerAction()` 现在会捕获原生图层动作异常，并返回 `success: false` 与 `图层动作失败：...`。已补充 `setPaintProperty()` 与 `setLayoutProperty()` 抛错时的回归测试。

## BUG-02：NGGI06 示例文件名残留旧语义

### 事实依据

`examples/views/NG/GI/NGGI06.vue` 的页面标题是“NGGI06 六插件总览”，并且已注册 `snap`、`lineDraft`、`intersection`、`polygonEdge`、`multiSelect`、`dxfExport` 六个插件。但 `dxfExport.defaults.fileName` 仍为：

```ts
fileName: "nggi06-five-plugins.dxf"
```

### 风险影响

这不是运行期 bug，但会影响业务示例可信度。`NGGI06` 是推荐业务预设写法的总览页，文件名残留旧“五插件”语义，容易让阅读者误以为 polygonEdge 仍未纳入总览。

### 建议修复

改成 `nggi06-six-plugins.dxf` 或 `nggi06-plugin-summary.dxf`。这是低风险文案修复，可以和文档修复一起处理。

### 复核状态

已确认并修复。`NGGI06` 的 DXF 默认文件名已改为 `nggi06-six-plugins.dxf`。

## BUG-03：简单样式工厂存在类型逃逸

### 事实依据

`src/MapLibre/facades/businessPreset.ts` 中 `createSimpleLineStyle()`、`createSimpleCircleStyle()`、`createSimpleFillStyle()` 为了兼容表达式值，多处使用 `as any` 写入 MapLibre paint 字段。

### 风险影响

当前代码可运行，且这些函数已经通过类型入口暴露为业务便捷 API。风险在于后续字段扩展时，`as any` 会削弱 TypeScript 对 paint 值的保护，错误值可能更晚才在地图运行期暴露。

### 建议修复

后续可把 `MapStyleValue<T>` 与各 layer paint 字段类型进一步对齐，减少 `as any`。这不建议本轮强行改，以免把审查任务扩大成类型系统重构。

### 复核状态

确认存在，本轮暂缓。当前行为已有表达式值测试覆盖，风险主要是类型保护不足；彻底消除需要同步收敛业务表达式类型和 MapLibre paint 字段类型，不纳入本轮 bug 修复。

## 正向观察

- 插件宿主 `useMapPluginHost()` 对插件初始化、API 读取、状态读取、渲染项读取等都有错误边界，单个插件初始化失败会被跳过并输出控制台错误，不会拖垮整张地图。
- `createMapBusinessSource()` 对 `null / undefined` 异步首屏数据、重复 ID、缺失 ID、属性写回策略都有明确处理。
- `createBusinessPlugins()` 对 `intersection` 缺少目标范围、`dxfExport` 缺少 `sourceRegistry` 采取 fail-fast，避免业务页进入半可用状态。
- snap 控制器已把运行期总开关、右键业务规则面板、预览清理、TerraDraw / Measure 吸附配置收口在同一控制器，主路径比较完整。
