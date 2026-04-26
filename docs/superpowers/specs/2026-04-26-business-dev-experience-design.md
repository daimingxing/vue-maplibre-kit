# 业务层开发体验优化设计

日期：2026-04-26

## 背景

当前项目的稳定性问题已经处理完成，下一阶段目标是优化业务层开发体验。现有封装已经具备 `vue-maplibre-kit/business`、插件子入口、几何工具、全局配置和稳定 CSS 出口，业务能力底座完整。

本次设计不重构 `NGGI00.vue`。`NGGI00.vue` 继续作为综合验证页，新增 `NGGI01` 之后的小示例承担业务开发者上手入口。

## 事实依据

- `package.json` 已提供 `vue-maplibre-kit/style.css` 出口。
- `src/business.ts` 已集中导出 `MapLibreInit`、`MapBusinessSourceLayers`、`useBusinessMap`、source 工厂、图层工厂、样式工厂和常用类型。
- `useBusinessMap()` 当前已有 `sources`、`selection`、`feature`、`editor`、`draft`、`intersection`、`effect` 分组。
- `mapPluginResolver.ts` 已存在 `resolveLineDraftPreviewApi`、`resolveIntersectionPreviewApi`、`resolveMapDxfExportApi` 等解析能力，但业务入口尚未完整暴露。
- `useIntersectionPreview()` 已覆盖交点刷新、生成正式交点、读取 GeoJSON、设置正式交点属性等动作。
- `useLineDraftPreview()` 当前只暴露状态、按 ID 读取和清空；底层线草稿插件 API 已有生成线、生成线廊、保存属性、删除属性和完整数据读取能力。
- `multi-select` 插件 API 已有激活、退出、切换、清空和读取选中集能力，但业务层缺少短路径。

## 目标

本轮采用“轻量业务 API + 小示例”方案，目标是让业务开发者完成基础功能时优先使用业务动作 API，而不是直接进入 `rawHandles.map` 或 MapLibre 原生 API。

基础功能需要覆盖：

1. 地图初始化、控件、交互和 `mapKey`。
2. 业务 source、业务图层和图层配置。
3. 命令式维护 source 数据和图层状态。
4. 给 source 增加要素。
5. 切换图层显示。
6. 改变图层样式和单个要素样式。
7. 图层点击、悬停等交互事件。
8. 交互事件中使用 `MglPopup`。
9. `snap`、`line-draft`、`intersection`、`multi-select` 插件的声明和业务使用。
10. 修改要素属性并体现 `propertyPolicy`。

## 非目标

- 不重写插件系统。
- 不把全部 MapLibre 原生 API 包装一遍。
- 不把 `NGGI00.vue` 拆分或重构。
- 不引入大型 DSL 或一次性配置框架。
- 不为了示例隐藏 GIS 基础概念，只缩短推荐路径。

## 总体方案

新增少量薄门面，保留现有底层能力作为高级出口。业务层推荐路径为：

1. 用预设创建控件和插件。
2. 用图层组与简单样式工厂声明 source 和 layer。
3. 用 `useBusinessMap()` 获取统一业务动作。
4. 用小示例学习单个场景。

## 新增业务动作分组

### `businessMap.sources`

在现有 `sources` 分组上补充要素维护动作：

```ts
businessMap.sources.addFeature("primary", feature);
businessMap.sources.updateFeature("primary", "line_1", {
  name: "新名称",
});
businessMap.sources.removeFeature("primary", "line_1");
businessMap.sources.replaceFeatures("primary", nextFeatures);
```

设计原则：

- 复用现有 `MapBusinessSourceRegistry` 和 `replaceFeatures()`，不直接操作 MapLibre 原生 source。
- `addFeature()` 需要校验目标 source 存在、要素 ID 可解析、ID 不重复。
- `updateFeature()` 只更新 GeoJSON 要素本体或属性补丁，属性保存仍优先走 `editor` 和 `propertyPolicy`。
- `removeFeature()` 删除业务 source 内的要素，并保持响应式数据更新。

### `businessMap.layers`

新增图层运行时动作分组：

```ts
businessMap.layers.show("primary-line");
businessMap.layers.hide("primary-line");
businessMap.layers.setVisible("primary-line", true);
businessMap.layers.setPaint("primary-line", {
  "line-color": "#f97316",
});
businessMap.layers.setLayout("primary-line", {
  visibility: "none",
});
businessMap.layers.setFeatureState("primary", "line_1", {
  demoStyled: true,
});
```

设计原则：

- 图层显隐和样式修改允许作用于已加载图层。
- 第一版不负责命令式新增任意原生图层；新增业务图层仍推荐通过响应式图层数组声明。
- `setFeatureState()` 复用 `MapLibreInitExpose.setMapFeatureState()`，避免业务层手写 feature-state target。
- 操作失败时返回结构化结果，避免业务层只能从控制台判断。

### `businessMap.plugins`

新增插件短路径分组：

```ts
businessMap.plugins.lineDraft.getData();
businessMap.plugins.lineDraft.previewSelectedLine({ segmentIndex: 0, extendLengthMeters: 10 });
businessMap.plugins.lineDraft.replaceSelectedLineCorridor({ widthMeters: 5 });
businessMap.plugins.lineDraft.clear();
businessMap.plugins.lineDraft.saveProperties(featureId, { status: "pending" });

businessMap.plugins.intersection.getMaterializedData();
businessMap.plugins.intersection.updateMaterializedProperties(intersectionId, {
  status: "checked",
});

businessMap.plugins.multiSelect.activate();
businessMap.plugins.multiSelect.getSelectedFeatures();
```

设计原则：

- `intersection` 优先复用现有 `useIntersectionPreview()`。
- `lineDraft` 需要扩展现有 `useLineDraftPreview()`，补齐底层已有但门面未公开的动作。
- `multiSelect` 新增轻量门面，封装插件 API 解析与空值保护。
- `snap` 主要是配置型插件，不强制新增动作门面，必要时只公开 `clearPreview()` 和 `resolveMapEvent()`。

## 声明简化工厂

### 图层组工厂

新增 `createLayerGroup()`：

```ts
const layers = createLayerGroup({
  defaultPolicy: { fixedKeys: ["id"] },
  defaultStyle: createSimpleLineStyle({ color: "#2563eb", width: 3 }),
  layers: [
    { type: "line", id: "pipe-line", where: { kind: "pipe" } },
    { type: "circle", id: "pipe-point", where: { kind: "node" } },
  ],
});
```

设计原则：

- 子图层只写差异项。
- `id` 映射为现有 `layerId`。
- `type` 映射到现有 `createCircleBusinessLayer`、`createLineBusinessLayer`、`createFillBusinessLayer`、`createSymbolBusinessLayer`。
- `policy`、`style`、`geometryTypes`、`where` 支持继承和局部覆盖。

### 简单样式工厂

新增高频样式简写：

```ts
const lineStyle = createSimpleLineStyle({
  color: "#2563eb",
  width: 3,
  hover: { color: "#22c55e", width: 5 },
  selected: { color: "#f97316", width: 6 },
});
```

建议第一版提供：

- `createSimpleLineStyle()`
- `createSimpleCircleStyle()`
- `createSimpleFillStyle()`

设计原则：

- 只覆盖常用字段，不替代原始 `createLineLayerStyle()` 等完整工厂。
- hover、selected、flashing 通过 `createFeatureStateExpression()` 生成表达式。
- 默认状态优先级沿用现有 `isFlashing -> selected -> hover`。

### 控件预设

新增 `createMapControlsPreset()`：

```ts
const controls = createMapControlsPreset("basic");
```

预设建议：

- `minimal`：导航、比例尺。
- `basic`：导航、全屏、比例尺、绘图。
- `draw`：导航、绘图、测量。
- `full`：常用控件全部启用。

设计原则：

- 预设返回现有 `MapControlsConfig`。
- 允许传第二个参数局部覆盖。
- 不改变现有 `controls` prop。

### 插件预设

新增 `createBusinessPlugins()`：

```ts
const plugins = createBusinessPlugins({
  snap: {
    layerIds: ["pipe-line"],
  },
  lineDraft: true,
  intersection: {
    sourceRegistry,
    targetSourceIds: ["primary"],
  },
  multiSelect: true,
});
```

设计原则：

- 只覆盖常用默认配置。
- 高级配置继续使用 `createMapFeatureSnapPlugin()`、`createLineDraftPreviewPlugin()`、`createIntersectionPreviewPlugin()`、`createMapFeatureMultiSelectPlugin()`。
- `snap` 的简写需要自动生成普通图层吸附规则。
- `lineDraft` 默认启用基础交互和默认样式。
- `intersection` 必须传入 `sourceRegistry` 和 `targetSourceIds`。
- `multiSelect` 默认启用控件并允许读取选中集。

## 示例拆分

新增小示例，不修改 `NGGI00.vue`：

| 文件 | 主题 | 覆盖内容 |
| --- | --- | --- |
| `NGGI01.vue` | 最小地图和控件 | 地图初始化、`mapOptions`、`mapControls`、`mapInteractive`、`mapKey` |
| `NGGI02.vue` | 业务 source 和图层 | source 声明、图层组、要素新增、要素更新、要素删除 |
| `NGGI03.vue` | 图层和要素样式 | 图层显隐、图层 paint/layout 修改、feature-state 修改 |
| `NGGI04.vue` | 图层交互和 Popup | 点击、悬停、右键、`MglPopup` |
| `NGGI05.vue` | 插件总览 | 四个插件同时注册，展示最短推荐配置 |
| `NGGI06.vue` | snap 吸附 | snap 声明、普通图层吸附规则、绘图/测量吸附配置 |
| `NGGI07.vue` | line-draft 草稿线和线廊 | 配置、交互事件、生成线和面、读取 GeoJSON、清空草稿、修改草稿属性 |
| `NGGI08.vue` | intersection 交点 | 配置、交互事件、设置交点属性、读取预览和正式交点 GeoJSON |
| `NGGI09.vue` | multi-select 多选 | 配置、交互事件、激活、退出、清空、读取选中要素 |
| `NGGI10.vue` | 属性编辑和 `propertyPolicy` | 正式业务要素、草稿要素和交点要素的属性编辑路径 |

示例要求：

- 示例必须使用包名路径，例如 `vue-maplibre-kit/business`。
- 每个示例尽量控制在 150 到 300 行。
- 示例内只保留必要说明，不复制 `NGGI00.vue` 的长注释块。
- 所有示例需要可独立阅读。

## 测试与检查

实现阶段每新增一组 API，需要同步补充：

- 类型导出检查。
- `package.json` exports 检查；仅新增入口时才需要修改。
- 对新工厂函数补单元测试。
- 对 `useBusinessMap()` 新分组补单元测试或现有测试扩展。
- 示例页面通过 TypeScript 检查。
- 最终执行 `npm run build` 或至少执行 `vue-tsc -p tsconfig.build.json`。

## 风险与处理

### 命令式新增图层边界

第一版不提供任意原生 `addLayer()` 门面。业务图层新增仍建议维护响应式图层数组，并通过 `MapBusinessSourceLayers` 渲染。这样能避免命令式图层和声明式图层状态不一致。

### 图层样式修改与声明式样式冲突

`businessMap.layers.setPaint()` 和 `setLayout()` 作用于运行时地图实例，页面重新渲染或图层重建后可能被声明式配置覆盖。示例需要明确推荐：

- 持久样式用响应式 layer style。
- 临时高亮用 feature-state。
- 临时运行时修改才用 `businessMap.layers`。

### 插件示例过载

插件能力拆成 `NGGI05` 到 `NGGI09`，避免单文件承载过多逻辑。`NGGI05` 只做总览，详细业务读写分别放入独立文件。

## 实施顺序建议

1. 补 `mapPluginResolver` 的公开导出和 `businessMap.plugins` 短路径。
2. 扩展 `useLineDraftPreview()`，新增 line-draft 数据读取、生成、属性保存和清空能力。
3. 新增 multi-select 门面。
4. 新增 `businessMap.sources` 和 `businessMap.layers` 快捷动作。
5. 新增图层组、简单样式、控件预设、插件预设工厂。
6. 编写 `NGGI01` 到 `NGGI10` 小示例。
7. 补测试并执行 TypeScript 检查。

