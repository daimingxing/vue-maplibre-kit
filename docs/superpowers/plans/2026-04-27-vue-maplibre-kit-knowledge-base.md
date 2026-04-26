# vue-maplibre-kit 知识库建设实施计划

> **给执行智能体：** 执行本计划时必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐项勾选任务。本文只规划知识库写作，不改业务代码。

**目标：** 建设一套面向外部业务项目开发者的 `vue-maplibre-kit` 知识库，做到渐进式披露、总分结构、覆盖公开入口、声明式能力、命令式能力、插件能力、全局配置、几何工具、底层逃生通道和示例索引。

**架构：** 新知识库以首页索引为总入口，详细文档按能力分层拆分。业务开发者优先阅读 `business + plugins + useBusinessMap` 推荐路径，高级开发者再进入插件子路径、根入口 API 和 `rawHandles` 底层逃生通道。

**技术栈：** Vue 3、TypeScript、MapLibre GL JS、vue-maplibre-gl、maplibre-gl-terradraw、Markdown。

---

## 一、文档边界

- 新知识库目录：`docs/vue-maplibre-kit-knowledge/`
- 旧知识库目录：`docs/vue-mapLibre-kit知识库/`
- 旧知识库只作为迁移来源，不继续扩写。
- 底层依赖知识库目录：`docs/knowledge-base/`
- 示例来源：`examples/views/NG/GI/NGGI00.vue` 到 `examples/views/NG/GI/NGGI11.vue`
- 公开入口来源：`src/entries/root.ts`、`src/entries/business.ts`、`src/entries/plugins.ts`、`src/entries/config.ts`、`src/entries/geometry.ts`

## 二、总体目录

```txt
docs/vue-maplibre-kit-knowledge/
  index.md
  00-开始使用/
    index.md
    01-安装与样式.md
    02-最小地图.md
    03-推荐引入方式.md
  01-核心概念/
    index.md
    01-地图实例与生命周期.md
    02-source-layer-feature.md
    03-响应式数据维护.md
    04-声明式与命令式.md
  02-公开入口/
    index.md
    01-root根入口.md
    02-business业务入口.md
    03-plugins插件入口.md
    04-config全局配置入口.md
    05-geometry几何入口.md
    06-插件子路径.md
  03-地图与控件/
    index.md
    01-MapLibreInit.md
    02-mapOptions.md
    03-mapControls.md
    04-自定义控件.md
  04-业务数据源/
    index.md
    01-createMapBusinessSource.md
    02-createMapBusinessSourceRegistry.md
    03-MapBusinessSourceLayers.md
    04-要素新增更新删除.md
  05-业务图层/
    index.md
    01-图层工厂.md
    02-createLayerGroup.md
    03-运行时图层动作.md
    04-图层过滤.md
  06-样式与状态/
    index.md
    01-样式工厂.md
    02-表达式工具.md
    03-hover和selected.md
    04-feature-state.md
  07-交互与查询/
    index.md
    01-点击和hover.md
    02-要素查询.md
    03-选中态.md
    04-Popup.md
  08-属性编辑/
    index.md
    01-propertyPolicy.md
    02-属性面板状态.md
    03-保存与删除属性.md
    04-TerraDraw属性.md
  09-插件/
    index.md
    01-插件注册总览.md
    02-snap吸附.md
    03-lineDraft线草稿.md
    04-intersection交点.md
    05-multiSelect多选.md
    06-dxfExport导出DXF.md
    07-单插件子路径高级用法.md
  10-几何工具/
    index.md
    01-线延长.md
    02-线廊.md
    03-线测量.md
    04-交点计算.md
    05-来源引用.md
  11-全局配置/
    index.md
    01-配置入口.md
    02-mapOptions默认值.md
    03-mapControls默认值.md
    04-plugins默认值.md
    05-styles默认值.md
    06-优先级和覆盖规则.md
  12-命令式能力/
    index.md
    01-useBusinessMap总览.md
    02-layers命令.md
    03-feature命令.md
    04-editor命令.md
    05-plugins命令.md
  13-底层逃生通道/
    index.md
    01-何时使用逃生通道.md
    02-rawHandles.md
    03-MapLibre原生能力.md
    04-TerraDraw原生能力.md
    05-自定义插件.md
  14-示例索引/
    index.md
    01-NGGI00到NGGI11.md
    02-按功能查示例.md
  15-API参考/
    index.md
    01-business-api.md
    02-plugins-api.md
    03-config-api.md
    04-geometry-api.md
    05-root-api.md
```

## 三、写作规范

- 所有文档使用中文。
- 每篇文档开头写清楚“适合谁读”“先读哪篇”“对应示例”。
- 推荐写法放前面，高级写法放后面。
- 业务页面默认推荐：

```ts
import { MapLibreInit, MapBusinessSourceLayers, useBusinessMap } from "vue-maplibre-kit/business";
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
```

- 插件读取默认推荐：

```ts
const businessMap = useBusinessMap(mapRef);
const lineDraft = businessMap.plugins.lineDraft;
const dxfExport = businessMap.plugins.dxfExport;
```

- 不在业务文档里推荐直接引用 `src/MapLibre/**`。
- 单插件子路径只放在高级用法：

```ts
import { createMapDxfExportPlugin } from "vue-maplibre-kit/plugins/map-dxf-export";
```

- 代码片段必须能被外部项目复制，导入路径使用包名路径。
- 参数表必须以当前源码为准，不从旧报告或记忆推断。
- 每篇详细文档都要链接到至少一个示例或说明“当前没有专门示例”。
- 底层逃生通道必须按“公开门面优先、内置低层门面其次、rawHandles 最后”的顺序讲。

## 四、实施任务

### Task 1：首页与总索引

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/00-开始使用/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/14-示例索引/index.md`

- [ ] **Step 1：创建首页**

首页包含：
- 这是什么库。
- 业务开发者推荐阅读路径。
- 插件开发者推荐阅读路径。
- 公开入口总览。
- 五个插件能力入口。
- 示例索引入口。
- 底层逃生通道入口。

- [ ] **Step 2：创建开始使用索引**

写清：
- 安装依赖和样式应该读哪篇。
- 最小地图应该读哪篇。
- 推荐引入方式应该读哪篇。
- 第一个业务 source/layer 应该跳到哪篇。

- [ ] **Step 3：创建示例索引首页**

把 `NGGI00` 到 `NGGI11` 做成表格：
- 示例名。
- 演示能力。
- 使用入口。
- 对应文档章节。
- 是否适合复制到真实项目。

- [ ] **Step 4：人工检查链接**

检查首页链接不指向不存在文件。由于此任务会先创建骨架，允许链接指向后续任务将创建的文件。

### Task 2：公开入口文档

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/02-公开入口/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/02-公开入口/01-root根入口.md`
- 创建：`docs/vue-maplibre-kit-knowledge/02-公开入口/02-business业务入口.md`
- 创建：`docs/vue-maplibre-kit-knowledge/02-公开入口/03-plugins插件入口.md`
- 创建：`docs/vue-maplibre-kit-knowledge/02-公开入口/04-config全局配置入口.md`
- 创建：`docs/vue-maplibre-kit-knowledge/02-公开入口/05-geometry几何入口.md`
- 创建：`docs/vue-maplibre-kit-knowledge/02-公开入口/06-插件子路径.md`

- [ ] **Step 1：根据源码列入口能力**

依据：
- `src/entries/root.ts`
- `src/entries/business.ts`
- `src/entries/plugins.ts`
- `src/entries/config.ts`
- `src/entries/geometry.ts`
- `package.json`

- [ ] **Step 2：写推荐入口规则**

规则：
- 业务页面优先 `vue-maplibre-kit/business`。
- 插件注册优先 `vue-maplibre-kit/plugins`。
- 全局默认值只从 `vue-maplibre-kit/config`。
- 几何计算只从 `vue-maplibre-kit/geometry`。
- 根入口作为能力全集索引，不作为业务页面首选。

- [ ] **Step 3：写 `createBusinessPlugins` 归属**

明确：
- 推荐从 `vue-maplibre-kit/plugins` 引入。
- `vue-maplibre-kit/business` 中保留兼容导出。
- 根入口不导出它。

- [ ] **Step 4：写插件子路径高级用法**

覆盖：
- `vue-maplibre-kit/plugins/map-feature-snap`
- `vue-maplibre-kit/plugins/line-draft-preview`
- `vue-maplibre-kit/plugins/intersection-preview`
- `vue-maplibre-kit/plugins/map-feature-multi-select`
- `vue-maplibre-kit/plugins/map-dxf-export`

说明它们适合高级按需接入或自定义插件集，不作为普通业务页面默认路径。

### Task 3：开始使用与核心概念

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/00-开始使用/01-安装与样式.md`
- 创建：`docs/vue-maplibre-kit-knowledge/00-开始使用/02-最小地图.md`
- 创建：`docs/vue-maplibre-kit-knowledge/00-开始使用/03-推荐引入方式.md`
- 创建：`docs/vue-maplibre-kit-knowledge/01-核心概念/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/01-核心概念/01-地图实例与生命周期.md`
- 创建：`docs/vue-maplibre-kit-knowledge/01-核心概念/02-source-layer-feature.md`
- 创建：`docs/vue-maplibre-kit-knowledge/01-核心概念/03-响应式数据维护.md`
- 创建：`docs/vue-maplibre-kit-knowledge/01-核心概念/04-声明式与命令式.md`

- [ ] **Step 1：写安装与样式**

说明：
- `vue-maplibre-kit/style.css`
- peer dependencies 的含义。
- 外部项目安装后只依赖公开出口。

- [ ] **Step 2：写最小地图**

参考：
- `examples/views/NG/GI/NGGI01.vue`

必须讲清：
- `MapLibreInit`
- `mapRef`
- 加载状态。
- 什么时候可以调用命令式能力。

- [ ] **Step 3：写核心概念**

覆盖：
- source 是数据。
- layer 是渲染。
- feature 是业务要素。
- 声明式用于稳定业务图层。
- 命令式用于临时动作、交互反馈、运行时覆盖。

### Task 4：业务数据源和图层

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/04-业务数据源/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/04-业务数据源/01-createMapBusinessSource.md`
- 创建：`docs/vue-maplibre-kit-knowledge/04-业务数据源/02-createMapBusinessSourceRegistry.md`
- 创建：`docs/vue-maplibre-kit-knowledge/04-业务数据源/03-MapBusinessSourceLayers.md`
- 创建：`docs/vue-maplibre-kit-knowledge/04-业务数据源/04-要素新增更新删除.md`
- 创建：`docs/vue-maplibre-kit-knowledge/05-业务图层/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/05-业务图层/01-图层工厂.md`
- 创建：`docs/vue-maplibre-kit-knowledge/05-业务图层/02-createLayerGroup.md`
- 创建：`docs/vue-maplibre-kit-knowledge/05-业务图层/03-运行时图层动作.md`
- 创建：`docs/vue-maplibre-kit-knowledge/05-业务图层/04-图层过滤.md`

- [ ] **Step 1：写业务数据维护推荐方式**

以响应式数组为主：
- 新增要素：修改 `features.value`。
- 更新要素：替换目标 feature。
- 删除要素：过滤目标 feature。

参考：
- `examples/views/NG/GI/NGGI02.vue`

- [ ] **Step 2：写命令式 source/layer**

说明：
- 运行时添加临时 source/layer。
- 适合调试、临时分析图层、一次性高亮。
- 不替代主要业务数据维护。

- [ ] **Step 3：写图层工厂**

覆盖：
- `createCircleBusinessLayer`
- `createFillBusinessLayer`
- `createLineBusinessLayer`
- `createSymbolBusinessLayer`
- `createLayerGroup`
- `geometryTypes`
- `where`

### Task 5：样式、表达式和 feature-state

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/06-样式与状态/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/06-样式与状态/01-样式工厂.md`
- 创建：`docs/vue-maplibre-kit-knowledge/06-样式与状态/02-表达式工具.md`
- 创建：`docs/vue-maplibre-kit-knowledge/06-样式与状态/03-hover和selected.md`
- 创建：`docs/vue-maplibre-kit-knowledge/06-样式与状态/04-feature-state.md`

- [ ] **Step 1：写样式工厂**

覆盖：
- `createSimpleLineStyle`
- `createSimpleCircleStyle`
- `createSimpleFillStyle`
- `createLineLayerStyle`
- `createCircleLayerStyle`
- `createFillLayerStyle`
- `createSymbolLayerStyle`
- `createRasterLayerStyle`

- [ ] **Step 2：写表达式工具**

覆盖：
- `createFeatureStateExpression`
- `whenFeaturePropertyEquals`
- `whenFeaturePropertyIn`
- `matchFeatureProperty`

- [ ] **Step 3：写 hover 和 selected**

参考：
- `examples/views/NG/GI/NGGI03.vue`
- `examples/views/NG/GI/NGGI10.vue`

说明 `feature-state + 表达式` 的样式变化链路。

### Task 6：交互、查询和属性编辑

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/07-交互与查询/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/07-交互与查询/01-点击和hover.md`
- 创建：`docs/vue-maplibre-kit-knowledge/07-交互与查询/02-要素查询.md`
- 创建：`docs/vue-maplibre-kit-knowledge/07-交互与查询/03-选中态.md`
- 创建：`docs/vue-maplibre-kit-knowledge/07-交互与查询/04-Popup.md`
- 创建：`docs/vue-maplibre-kit-knowledge/08-属性编辑/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/08-属性编辑/01-propertyPolicy.md`
- 创建：`docs/vue-maplibre-kit-knowledge/08-属性编辑/02-属性面板状态.md`
- 创建：`docs/vue-maplibre-kit-knowledge/08-属性编辑/03-保存与删除属性.md`
- 创建：`docs/vue-maplibre-kit-knowledge/08-属性编辑/04-TerraDraw属性.md`

- [ ] **Step 1：写普通图层交互**

参考：
- `examples/views/NG/GI/NGGI04.vue`

覆盖：
- 点击要素。
- 点击空白。
- hover。
- `MglPopup` 展示属性。

- [ ] **Step 2：写要素查询**

覆盖：
- 当前点击要素。
- 当前选中要素。
- 通过 sourceId 和 featureId 找要素。
- 业务要素引用 `MapSourceFeatureRef`。

- [ ] **Step 3：写属性编辑**

参考：
- `examples/views/NG/GI/NGGI05.vue`

覆盖：
- `propertyPolicy` 是字段治理规则。
- feature properties 是真实业务属性。
- 两者必须分开讲。
- 编辑特定要素属性。
- 保存单字段。
- 删除允许删除的字段。

### Task 7：插件知识库

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/09-插件/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/09-插件/01-插件注册总览.md`
- 创建：`docs/vue-maplibre-kit-knowledge/09-插件/02-snap吸附.md`
- 创建：`docs/vue-maplibre-kit-knowledge/09-插件/03-lineDraft线草稿.md`
- 创建：`docs/vue-maplibre-kit-knowledge/09-插件/04-intersection交点.md`
- 创建：`docs/vue-maplibre-kit-knowledge/09-插件/05-multiSelect多选.md`
- 创建：`docs/vue-maplibre-kit-knowledge/09-插件/06-dxfExport导出DXF.md`
- 创建：`docs/vue-maplibre-kit-knowledge/09-插件/07-单插件子路径高级用法.md`

- [ ] **Step 1：写插件总览**

必须讲清：
- 注册从 `createBusinessPlugins` 开始。
- 读取从 `businessMap.plugins.*` 开始。
- 五个插件分组分别是 `snap`、`lineDraft`、`intersection`、`multiSelect`、`dxfExport`。

参考：
- `examples/views/NG/GI/NGGI06.vue`

- [ ] **Step 2：写 snap**

覆盖：
- `createBusinessPlugins({ snap })`
- `layerIds`
- `ordinaryLayers`
- 规则、容差、优先级、预览样式。
- `businessMap.plugins.snap.clearPreview()`
- `resolveMapEvent`
- `resolveTerradrawSnapOptions`

参考：
- `examples/views/NG/GI/NGGI07.vue`

- [ ] **Step 3：写 lineDraft**

覆盖：
- 选择线段。
- 生成草稿线。
- 生成线廊面。
- 获取草稿 GeoJSON。
- 修改草稿属性。
- 删除草稿属性。
- 清空草稿。

参考：
- `examples/views/NG/GI/NGGI08.vue`

- [ ] **Step 4：写 intersection**

覆盖：
- 刷新预览交点。
- 生成正式交点。
- 设置交点属性。
- 删除正式点。
- 读取完整 GeoJSON。
- `preview` 与 `materialized` 的区别。

参考：
- `examples/views/NG/GI/NGGI09.vue`

- [ ] **Step 5：写 multiSelect**

覆盖：
- 激活。
- 取消。
- 清空。
- 读取选中要素。
- selected 样式。
- 限制目标图层。

参考：
- `examples/views/NG/GI/NGGI10.vue`

- [ ] **Step 6：写 dxfExport**

覆盖：
- `exportDxf`
- `downloadDxf`
- `getResolvedOptions`
- 全部导出。
- 按 source / feature 过滤导出。
- `layerNameResolver`
- `layerTrueColorResolver`
- `featureTrueColorResolver`
- `sourceCrs` / `targetCrs`
- `lastWarnings` / `lastError`

参考：
- `examples/views/NG/GI/NGGI11.vue`
- `examples/views/NG/GI/NGGI00.vue`

### Task 8：几何工具

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/10-几何工具/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/10-几何工具/01-线延长.md`
- 创建：`docs/vue-maplibre-kit-knowledge/10-几何工具/02-线廊.md`
- 创建：`docs/vue-maplibre-kit-knowledge/10-几何工具/03-线测量.md`
- 创建：`docs/vue-maplibre-kit-knowledge/10-几何工具/04-交点计算.md`
- 创建：`docs/vue-maplibre-kit-knowledge/10-几何工具/05-来源引用.md`

- [ ] **Step 1：按 `src/entries/geometry.ts` 写工具总览**

覆盖：
- `MapLineExtensionTool`
- `MapLineCorridorTool`
- `MapLineMeasureTool`
- `collectLineIntersections`
- `buildIntersectionCandidates`
- `buildMaterializedIntersectionFeature`
- `createMapSourceFeatureRef`
- `buildMapSourceFeatureRefKey`

- [ ] **Step 2：写典型业务场景**

场景：
- 延长选中的线。
- 根据线生成管廊面。
- 计算线内距离。
- 根据多条业务线找交点。
- 把预览要素关联回正式 source/feature。

### Task 9：全局配置

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/11-全局配置/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/11-全局配置/01-配置入口.md`
- 创建：`docs/vue-maplibre-kit-knowledge/11-全局配置/02-mapOptions默认值.md`
- 创建：`docs/vue-maplibre-kit-knowledge/11-全局配置/03-mapControls默认值.md`
- 创建：`docs/vue-maplibre-kit-knowledge/11-全局配置/04-plugins默认值.md`
- 创建：`docs/vue-maplibre-kit-knowledge/11-全局配置/05-styles默认值.md`
- 创建：`docs/vue-maplibre-kit-knowledge/11-全局配置/06-优先级和覆盖规则.md`

- [ ] **Step 1：迁移旧全局配置文档**

来源：
- `docs/vue-mapLibre-kit知识库/vue-maplibre-kit-全局配置说明.md`

迁移要求：
- 校对 `src/entries/config.ts`。
- 修正旧文档错误相对链接。
- 拆成多篇。
- 不把全局配置长文放在知识库首页。

- [ ] **Step 2：写配置入口**

覆盖：
- `defineMapGlobalConfig`
- `setMapGlobalConfig`
- `getMapGlobalConfig`
- `resetMapGlobalConfig`
- 配置对象会被冻结。
- 不建议传 Vue 响应式对象。

- [ ] **Step 3：写优先级**

说明：
- 全局默认值。
- 页面级配置。
- 单次命令 overrides。
- DXF 导出的优先级示例。

### Task 10：命令式能力

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/12-命令式能力/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/12-命令式能力/01-useBusinessMap总览.md`
- 创建：`docs/vue-maplibre-kit-knowledge/12-命令式能力/02-layers命令.md`
- 创建：`docs/vue-maplibre-kit-knowledge/12-命令式能力/03-feature命令.md`
- 创建：`docs/vue-maplibre-kit-knowledge/12-命令式能力/04-editor命令.md`
- 创建：`docs/vue-maplibre-kit-knowledge/12-命令式能力/05-plugins命令.md`

- [ ] **Step 1：写 `useBusinessMap` 总览**

覆盖分组：
- `sources`
- `selection`
- `feature`
- `layers`
- `editor`
- `effect`
- `plugins`

- [ ] **Step 2：写 layers 命令**

覆盖：
- `hasSource`
- `addGeoJsonSource`
- `removeSource`
- `hasLayer`
- `addLayer`
- `removeLayer`
- `setPaint`
- `setLayout`
- `setFeatureState`

- [ ] **Step 3：写 feature / editor 命令**

覆盖：
- 查找要素。
- 解析属性面板。
- 保存属性。
- 删除属性。
- 生成草稿线。
- 替换线廊。

- [ ] **Step 4：写 plugins 命令**

统一引用五个插件专题，不重复大段 API。

### Task 11：底层逃生通道

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/13-底层逃生通道/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/13-底层逃生通道/01-何时使用逃生通道.md`
- 创建：`docs/vue-maplibre-kit-knowledge/13-底层逃生通道/02-rawHandles.md`
- 创建：`docs/vue-maplibre-kit-knowledge/13-底层逃生通道/03-MapLibre原生能力.md`
- 创建：`docs/vue-maplibre-kit-knowledge/13-底层逃生通道/04-TerraDraw原生能力.md`
- 创建：`docs/vue-maplibre-kit-knowledge/13-底层逃生通道/05-自定义插件.md`

- [ ] **Step 1：写逃生通道原则**

顺序：
- 首选公开业务门面。
- 其次使用内置低层门面。
- 最后使用 `rawHandles`。

- [ ] **Step 2：写 rawHandles 生命周期**

说明：
- 地图未挂载时 `map` 可能为空。
- 控件未启用时 `drawControl` / `measureControl` 可能为空。
- 操作原生 source/layer 前要确认 style 已加载。

- [ ] **Step 3：引用底层知识库**

引用：
- `docs/knowledge-base/maplibre-gl/reference/04-sources-and-layers.md`
- `docs/knowledge-base/maplibre-gl/reference/07-events-and-query.md`
- `docs/knowledge-base/vue-maplibre-gl/reference/03-map-component.md`
- `docs/knowledge-base/vue-maplibre-gl/reference/05-sources-and-layers.md`
- `docs/knowledge-base/maplibre-gl-terradraw/references/api_and_customization.md`
- `docs/knowledge-base/maplibre-gl-terradraw/references/data_and_style.md`
- `docs/knowledge-base/maplibre-gl-terradraw/references/drawing_modes.md`

### Task 12：API 参考

**文件：**
- 创建：`docs/vue-maplibre-kit-knowledge/15-API参考/index.md`
- 创建：`docs/vue-maplibre-kit-knowledge/15-API参考/01-business-api.md`
- 创建：`docs/vue-maplibre-kit-knowledge/15-API参考/02-plugins-api.md`
- 创建：`docs/vue-maplibre-kit-knowledge/15-API参考/03-config-api.md`
- 创建：`docs/vue-maplibre-kit-knowledge/15-API参考/04-geometry-api.md`
- 创建：`docs/vue-maplibre-kit-knowledge/15-API参考/05-root-api.md`

- [ ] **Step 1：从入口文件生成 API 表**

按入口列：
- 导出名。
- 类型。
- 用途。
- 推荐程度。
- 详细文档链接。
- 源码位置。

- [ ] **Step 2：补插件 API 表**

必须覆盖：
- `BusinessPluginsOptions`
- `BusinessSnapPresetOptions`
- `UseBusinessMapPlugins`
- 五个插件分组的关键方法。

- [ ] **Step 3：标注高级 API**

对根入口中的底层工具和插件系统类型标注“高级”，避免业务开发者一上来被 API 全量淹没。

### Task 13：导航和现有文档同步

**文件：**
- 修改：`README.md`
- 修改：`AGENTS.md`
- 修改：`docs/file-index.md`

- [ ] **Step 1：更新 README**

增加知识库入口链接：
- `docs/vue-maplibre-kit-knowledge/index.md`

说明推荐业务入口：
- `vue-maplibre-kit/business`
- `vue-maplibre-kit/plugins`
- `vue-maplibre-kit/config`
- `vue-maplibre-kit/geometry`

- [ ] **Step 2：更新 AGENTS**

加入：
- 写业务示例时优先参考新知识库。
- 示例必须使用公开包名路径。
- 插件统一通过 `createBusinessPlugins` 注册，通过 `businessMap.plugins.*` 读取。

- [ ] **Step 3：更新 file-index**

加入新知识库目录说明。
说明旧 `docs/vue-mapLibre-kit知识库` 只作为迁移来源。

### Task 14：审查和验收

**文件：**
- 检查：`docs/vue-maplibre-kit-knowledge/**`
- 检查：`README.md`
- 检查：`AGENTS.md`
- 检查：`docs/file-index.md`

- [ ] **Step 1：链接检查**

运行：

```powershell
rg "docs/vue-mapLibre-kit知识库|src/MapLibre" docs/vue-maplibre-kit-knowledge README.md AGENTS.md docs/file-index.md
```

预期：
- 允许在“旧知识库迁移说明”和“底层逃生通道源码位置”中出现。
- 不允许在推荐业务用法中要求用户 import 内部路径。

- [ ] **Step 2：公开入口一致性检查**

运行：

```powershell
rg "vue-maplibre-kit/(business|plugins|config|geometry)|businessMap\.plugins|createBusinessPlugins" docs/vue-maplibre-kit-knowledge
```

预期：
- 插件注册文档使用 `vue-maplibre-kit/plugins`。
- 插件读取文档使用 `businessMap.plugins.*`。

- [ ] **Step 3：旧门面写法检查**

运行：

```powershell
rg "businessMap\.(draft|intersection)|useLineDraftPreview|useIntersectionPreview|useMapFeatureMultiSelect" docs/vue-maplibre-kit-knowledge
```

预期：
- 不出现 `businessMap.draft`。
- 不出现顶层 `businessMap.intersection`。
- 单插件 composable 只可出现在高级 API 解释中，不能作为推荐业务写法。

- [ ] **Step 4：文档完整性检查**

人工检查：
- 首页能索引到所有章节。
- 五个插件各有独立文档。
- `NGGI00` 到 `NGGI11` 都出现在示例索引。
- 全局配置已从旧长文拆分。
- 底层逃生通道引用了三份底层依赖知识库。

- [ ] **Step 5：最终提交前检查**

运行：

```powershell
git status --short
```

预期：
- 只包含知识库、README、AGENTS、file-index 相关改动。
- 不包含业务代码改动，除非用户另行要求。

## 五、推荐执行顺序

1. 先执行 Task 1、Task 2、Task 14 的部分检查，建立骨架和入口规则。
2. 再执行 Task 3、Task 4、Task 5、Task 6，完成业务开发主路径。
3. 再执行 Task 7，集中完成插件知识库。
4. 再执行 Task 8、Task 9、Task 10、Task 11，补齐高级能力。
5. 最后执行 Task 12、Task 13、Task 14，补 API 参考和导航，并做总审查。

## 六、可并行拆分建议

- 子智能体 A：负责 `00` 到 `06`，写业务入门、source/layer、样式、交互。
- 子智能体 B：负责 `09-插件`，逐个插件校对源码和示例。
- 子智能体 C：负责 `10` 到 `13`，写几何、全局配置、命令式能力、逃生通道。
- 主智能体：负责首页、公开入口、API 参考、README/AGENTS/file-index 同步、最终审查。

并行时要避免多个智能体同时编辑 `index.md`、`README.md`、`AGENTS.md`、`docs/file-index.md`。这些文件由主智能体统一整合。

## 七、验收标准

- 新知识库能让第一次接触项目的业务开发者从首页走到最小地图、业务图层、插件注册和命令式操作。
- 所有推荐代码都使用公开包名路径。
- `createBusinessPlugins` 的主推荐入口是 `vue-maplibre-kit/plugins`。
- 插件读取统一使用 `useBusinessMap().plugins.*`。
- 五个插件能力都有配置、交互、命令式动作、示例和参数说明。
- 全局配置覆盖 `mapOptions`、`mapControls`、`plugins`、`styles`。
- API 参考覆盖当前 `src/entries/*.ts` 的公开导出。
- 底层逃生通道说明清楚何时用 `rawHandles`，并指向底层依赖知识库。
- 文档没有把旧门面写法当成推荐路径。
