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
- `mapPluginResolver.ts` 当前不存在 `multi-select` 解析器；多选插件需要新增 resolver 后才能做业务短路径。
- `useIntersectionPreview()` 已覆盖交点刷新、生成正式交点、读取 GeoJSON、设置正式交点属性等动作。
- `useLineDraftPreview()` 当前只暴露状态、按 ID 读取和清空；底层线草稿插件 API 已有生成线、生成线廊、保存属性、删除属性和完整数据读取能力。
- `multi-select` 插件 API 已有激活、退出、切换、清空和读取选中集能力，但业务层缺少短路径。

## 目标

本轮采用“轻量业务 API + 小示例”方案，目标是让业务开发者完成基础功能时优先使用业务动作 API，而不是直接进入 `rawHandles.map` 或 MapLibre 原生 API。

基础功能需要覆盖：

1. 地图初始化、控件、交互和 `mapKey`。
2. 业务 source、业务图层和图层配置。
3. 维护 source 数据和图层状态。
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

第一期不新增 `addFeature()`、`updateFeature()`、`removeFeature()` 这类更高层的 source 命令式 API。正式业务数据仍推荐由业务层维护响应式 `FeatureCollection`，再交给 `createMapBusinessSource()`。这与现有 `data: Ref<MapCommonFeatureCollection>` 的架构保持一致。

示例优先展示响应式数据维护：

```ts
sourceData.value = {
  ...sourceData.value,
  features: [...sourceData.value.features, newFeature],
};
```

保留现有 `replaceFeatures()` 作为批量写回能力：

```ts
businessMap.sources.registry.replaceFeatures("primary", nextFeatures);
```

第一期设计原则：

- 不引入新的 source 数据维护范式。
- 小示例中沉淀新增、更新、删除 feature 的推荐写法。
- 如果后续确认重复代码仍多，再考虑单独新增 `createFeatureCollectionUpdater()` 这类纯数据工具，而不是挂到 `businessMap.sources` 上。

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
- `lineDraft` 需要扩展现有 `useLineDraftPreview()`，补齐底层已有但门面未公开的动作，至少包括 `getData()`、`previewLine()`、`replacePreviewRegion()`、`saveProperties()`、`removeProperties()`。
- `multiSelect` 需要先新增 `resolveMapFeatureMultiSelectApi()` 和状态解析能力，再新增轻量门面封装插件 API 与空值保护。
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
- `where` 复用现有 `MapBusinessLayerWhere` 语义，只支持浅层等值匹配，并由现有 `buildMapBusinessLayerFilter()` 转换为 MapLibre filter。
- 复杂条件不扩展 `where`，继续使用现有 `filter` 字段传入原生 MapLibre 过滤表达式。

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

第一期设计原则：

- 只覆盖常用字段，不替代原始 `createLineLayerStyle()` 等完整工厂。
- 第一版先支持基础字段，例如线颜色、线宽、点半径、点颜色、面颜色、透明度。
- hover、selected、flashing 状态简写放入第二期；第一期示例仍可直接使用现有 `createFeatureStateExpression()`。
- 如果第二期加入状态简写，默认状态优先级沿用现有 `isFlashing -> selected -> hover`。

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
| `NGGI02.vue` | 业务 source 和图层 | source 声明、图层组、响应式新增、更新、删除要素 |
| `NGGI03.vue` | 图层和要素样式 | 图层显隐、图层 paint/layout 修改、feature-state 修改 |
| `NGGI04.vue` | 图层交互和 Popup | 点击、悬停、右键、`MglPopup` |
| `NGGI05.vue` | 属性编辑和 `propertyPolicy` | 正式业务要素、草稿要素和交点要素的属性编辑路径 |
| `NGGI06.vue` | 插件总览 | 四个插件同时注册，展示最短推荐配置 |
| `NGGI07.vue` | snap 吸附 | snap 声明、普通图层吸附规则、绘图/测量吸附配置 |
| `NGGI08.vue` | line-draft 草稿线和线廊 | 配置、交互事件、生成线和面、读取 GeoJSON、清空草稿、修改草稿属性 |
| `NGGI09.vue` | intersection 交点 | 配置、交互事件、设置交点属性、读取预览和正式交点 GeoJSON |
| `NGGI10.vue` | multi-select 多选 | 配置、交互事件、激活、退出、清空、读取选中要素 |

示例要求：

- 示例必须使用包名路径，例如 `vue-maplibre-kit/business`。
- 每个示例聚焦单一主题，不强制用行数作为硬指标；复杂插件示例允许超过 300 行，但不应演变成新的综合验证页。
- 允许新增示例专用的共享 mock 数据和小型 helper，避免每个示例重复地图基础设施。
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

插件能力拆成 `NGGI06` 到 `NGGI10`，避免单文件承载过多逻辑。`NGGI06` 只做总览，详细业务读写分别放入独立文件。

## 实施顺序建议

1. 新增 `multi-select` 插件 resolver，并补齐现有 resolver 在 `business.ts` 中的公开导出。
2. 扩展 `useLineDraftPreview()`，明确新增 `getData()`、`previewLine()`、`replacePreviewRegion()`、`saveProperties()`、`removeProperties()` 等动作。
3. 新增 `multi-select` 门面，并在 `useBusinessMap()` 中补 `plugins` 短路径。
4. 新增 `businessMap.layers` 快捷动作；第一期跳过 `businessMap.sources.addFeature/updateFeature/removeFeature`。
5. 新增最小版图层组、基础简单样式、控件预设、插件预设工厂。
6. 编写 `NGGI01` 到 `NGGI10` 小示例；复杂插件示例允许拆共享 mock/helper。
7. 补测试并执行 TypeScript 检查。
