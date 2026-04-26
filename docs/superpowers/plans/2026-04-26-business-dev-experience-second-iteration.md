# 业务层开发体验优化二期迭代计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 验证两份审查报告中的问题，修复真实影响业务层上手体验的问题，并让 NGGI01-NGGI10 的示例效果可见、可读、可测试。

**架构：** 继续保持业务层通过 `vue-maplibre-kit/business` 与 `vue-maplibre-kit/plugins/*` 消费公开门面，不改 `NGGI00.vue`，不引入命令式业务 source 增删改。运行时地图 source/layer 操作只作为 `businessMap.layers` 的 MapLibre 逃生型快捷动作。

**技术栈：** Vue 3、MapLibre GL JS、vue-maplibre-gl、Vitest、vue-tsc。

---

## 一、报告问题验证结论

### 1. 已验证属实，纳入本次迭代

- `NGGI04` 弹窗示例存在真实失效风险：`MglPopup` 写在 `MapLibreInit` 默认插槽内，但 `src/MapLibre/core/mapLibre-init.vue` 当前只渲染 `MglCustomControl` 与 `dataSource` 命名插槽，没有渲染默认插槽。
- `NGGI03` 的 feature-state 示例不可见：`createFeatureStateExpression()` 结果只赋给 `activeColor` 后 `void activeColor`，没有挂到点图层 paint 表达式上。
- `NGGI08` 的“读取草稿 GeoJSON”只展示 `count/ids/kinds` 摘要，没有展示完整 `FeatureCollection`；属性修改和删除后也没有固定属性面板，观众不容易确认变化。
- `NGGI09` 的“生成正式点”直接调用 `intersection.materialize()`，默认依赖当前选中交点；没有选中交点时按钮无效。读取 GeoJSON 同样只展示摘要。
- `NGGI10` 多选没有选中样式变化；虽然多选状态能变化，但示例没有把 `feature-state.selected` 和图层样式表达式连接起来。
- `NGGI02` 改名后只显示要素数量，不持续展示要素属性，导致动作结果不可见。
- `NGGI01` 没有覆盖基础功能清单中的 `mapKey` 与 `mapInteractive`，当前只展示 `MapLibreInit + mapOptions + controls`。如果保留为“最小地图”，需要另一个入门示例覆盖 `mapKey + mapInteractive`；本次直接让 `NGGI01` 承担这个最小交互示例。
- `useMapLayerActions.ts` 目前只有 `show/hide/setVisible/setPaint/setLayout/setFeatureState`，没有单独 spec 文件；后续扩展运行时 source/layer 动作时需要补独立测试。

### 2. 部分属实，但仅做低风险处理

- `draft` 与 `plugins.lineDraft`、`intersection` 与 `plugins.intersection` 是同一对象的双入口。确实可能让新用户困惑，但当前项目未发布且已有示例使用两类入口；本次先通过类型注释和示例统一推荐 `businessMap.plugins.*`，暂不删除顶层兼容入口。
- `createBusinessPlugins({ snap: true })` 不会生成普通业务图层吸附规则。这个行为合理，因为没有 `layerIds` 就无法推断业务图层目标；需要在 JSDoc 中写清楚 `true` 只启用插件基础能力和插件内部默认目标，需要普通业务图层吸附时传 `{ layerIds: [...] }` 或完整 `ordinaryLayers`。
- `useMapLayerActions.ts` 内部使用 `any` 访问原生 map。问题属实但优先级低；本次扩展 source/layer 动作时顺手收敛为最小运行时接口，避免继续扩大 `any`。
- `setPaint/setLayout` 与声明式图层样式可能冲突。问题属实，但属于运行时动作的自然边界；本次在 JSDoc 和 NGGI03 注释中说明“持久样式优先维护响应式 layer style，临时样式才用运行时动作”。
- `createLayerGroup` 的 `where` 只支持浅层等值匹配。它不是缺陷，本来就是第一期边界；本次只补注释说明复杂条件使用 `filter`。

### 3. 暂不采纳

- “默认展示 NGGI00”：暂不采纳。小示例的目标是降低上手门槛，默认从 `NGGI01` 开始更符合学习路径；`NGGI00` 保留入口即可。
- “给每个示例增加下一步引导”：暂不作为核心任务。示例面板应优先展示状态和结果，避免把可见区域变成说明文档。
- “扩展简单样式工厂 hover/selected/flashing 简写”：本次先在示例中使用 `createFeatureStateExpression()` 明确展示机制，不急着新增第二套简写 API。等示例验证稳定后再判断是否抽象。
- “新增 `createFeatureCollectionUpdater()`”：当前业务 source 已有 `replaceFeatures/saveProperties/removeProperties`，且用户明确希望避免命令式业务 source 范式混乱，本次不新增。

---

## 二、文件职责规划

- 修改 `src/MapLibre/core/mapLibre-init.vue`：渲染默认插槽，让 `MglPopup` 等地图子组件能自然放入 `MapLibreInit`。
- 修改 `src/MapLibre/facades/useMapLayerActions.ts`：补运行时 GeoJSON source/layer 快捷动作，并收敛原生 map 最小接口。
- 新增 `src/MapLibre/facades/useMapLayerActions.spec.ts`：覆盖图层显隐、paint/layout、feature-state、运行时 source/layer 动作。
- 修改 `src/MapLibre/facades/useBusinessMap.spec.ts`：确认 `businessMap.layers` 暴露新增动作。
- 修改 `src/MapLibre/facades/businessPreset.ts`：补 `snap: true`、运行时样式边界、预设使用场景 JSDoc。
- 修改 `examples/views/NG/GI/nggi-example.shared.ts`：增加可复用的状态样式图层、属性格式化、临时 runtime source/layer 数据。
- 修改 `examples/views/NG/GI/NGGI01.vue`：改成“最小地图 + mapKey + mapInteractive + mapRef 就绪状态”示例，避免与 NGGI02 重复。
- 修改 `examples/views/NG/GI/NGGI02.vue`：增加响应式属性列表和运行时命令式 source/layer 演示。
- 修改 `examples/views/NG/GI/NGGI03.vue`：增加 hover 效果和 `feature-state.active` 可见样式。
- 修改 `examples/views/NG/GI/NGGI04.vue`：修复弹窗展示，并在弹窗中显示点击要素属性。
- 修改 `examples/views/NG/GI/NGGI07.vue`：扩展 snap 规则和预览样式。
- 修改 `examples/views/NG/GI/NGGI08.vue`：展示草稿属性表和完整草稿 GeoJSON。
- 修改 `examples/views/NG/GI/NGGI09.vue`：修复正式交点生成，展示正式点属性和完整 GeoJSON。
- 修改 `examples/views/NG/GI/NGGI10.vue`：增加多选选中样式和选中列表。
- 修改 `docs/problem-record.md`：如遇到 dev server 监听失败、示例运行环境限制或报告内容不实，记录原因与处理方式。

---

## 三、任务拆分

### Task 1: 修复 MapLibreInit 默认插槽与 Popup 示例

**Files:**
- Modify: `src/MapLibre/core/mapLibre-init.vue`
- Modify: `examples/views/NG/GI/NGGI04.vue`
- Test: 视情况新增或扩展 `src/MapLibre/core/mapLibre-init*.spec.ts`

- [ ] **Step 1: 为默认插槽补测试或最小渲染验证**

验证目标：`MapLibreInit` 模板中必须出现默认插槽渲染位置，避免 `MglPopup` 被吞掉。

建议断言方向：

```typescript
expect(template).toContain('<slot></slot>');
```

- [ ] **Step 2: 在 MapLibreInit 模板中渲染默认插槽**

在 `dataSource` 插槽和插件渲染项附近加入默认插槽，保持子组件仍处于 `mgl-map` 上下文内：

```vue
<!-- 默认地图子组件插槽，例如 MglPopup、业务自定义覆盖组件。 -->
<slot></slot>
```

- [ ] **Step 3: 改造 NGGI04 弹窗内容**

弹窗内展示点击要素的核心属性，面板也同步展示最近点击结果：

```vue
<MglPopup v-model:visible="popupVisible" :lng-lat="popupLngLat">
  <strong>{{ popupTitle }}</strong>
  <dl>
    <template v-for="item in popupItems" :key="item.key">
      <dt>{{ item.key }}</dt>
      <dd>{{ item.value }}</dd>
    </template>
  </dl>
</MglPopup>
```

- [ ] **Step 4: 处理空白点击关闭**

`onBlankClick` 中关闭弹窗并清空属性：

```typescript
function closePopup(): void {
  popupVisible.value = false;
  popupLngLat.value = null;
  popupItems.value = [];
}
```

### Task 2: 扩展 businessMap.layers 的运行时 source/layer 动作

**Files:**
- Modify: `src/MapLibre/facades/useMapLayerActions.ts`
- Create: `src/MapLibre/facades/useMapLayerActions.spec.ts`
- Modify: `src/MapLibre/facades/useBusinessMap.spec.ts`

- [ ] **Step 1: 定义最小原生地图接口**

避免继续扩大 `any`，只声明当前门面实际需要的方法：

```typescript
interface LayerActionMap {
  getLayer: (layerId: string) => unknown;
  getSource: (sourceId: string) => unknown;
  addSource: (sourceId: string, source: unknown) => void;
  removeSource: (sourceId: string) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  removeLayer: (layerId: string) => void;
  setPaintProperty: (layerId: string, key: string, value: unknown) => void;
  setLayoutProperty: (layerId: string, key: string, value: unknown) => void;
}
```

- [ ] **Step 2: 新增 source/layer 动作**

在 `UseMapLayerActionsResult` 增加：

```typescript
hasSource: (sourceId: string) => boolean;
hasLayer: (layerId: string) => boolean;
addGeoJsonSource: (sourceId: string, data: unknown, options?: Record<string, unknown>) => MapLayerActionResult;
addLayer: (layer: Record<string, unknown>) => MapLayerActionResult;
removeLayer: (layerId: string) => MapLayerActionResult;
removeSource: (sourceId: string) => MapLayerActionResult;
```

边界要求：

- 地图未就绪时返回 `success: false`。
- source/layer 已存在时不重复添加。
- remove 不存在的 layer/source 时返回明确失败消息。
- `addLayer` 需要校验 `layer.id` 是字符串。

- [ ] **Step 3: 写独立单元测试**

覆盖这些行为：

```typescript
expect(actions.addGeoJsonSource('runtime-source', data).success).toBe(true);
expect(rawMap.addSource).toHaveBeenCalledWith('runtime-source', {
  type: 'geojson',
  data,
});
expect(actions.addGeoJsonSource('runtime-source', data).success).toBe(false);
expect(actions.removeSource('missing').success).toBe(false);
```

- [ ] **Step 4: useBusinessMap 暴露测试**

在 `useBusinessMap.spec.ts` 中确认：

```typescript
expect(typeof businessMap.layers.addGeoJsonSource).toBe('function');
expect(typeof businessMap.layers.addLayer).toBe('function');
```

### Task 3: 让 NGGI01 覆盖 mapKey、mapInteractive 与最小就绪状态

**Files:**
- Modify: `examples/views/NG/GI/NGGI01.vue`

- [ ] **Step 1: 增加稳定 mapKey**

在示例中显式传入 `mapKey`，展示多地图或显式地图上下文的最小写法：

```typescript
const mapKey = Symbol("nggi01");
```

- [ ] **Step 2: 增加最小交互配置**

使用空白地图也可以配置 `mapInteractive`，示例只展示回调链路，不依赖业务 source：

```typescript
const interactive = {
  enabled: true,
  onClick: (context) => {
    message.value = context.lngLat
      ? `点击坐标：${context.lngLat.lng.toFixed(5)}, ${context.lngLat.lat.toFixed(5)}`
      : "点击地图";
  },
};
```

经纬度保留 5 位是为了示例面板可读，不代表业务精度限制。

- [ ] **Step 3: 展示 mapRef 就绪状态**

通过 `ref<MapLibreInitExpose | null>` 展示地图公开实例是否可用，避免 `NGGI01` 只是静态配置页。

### Task 4: 让 NGGI02 展示响应式维护与命令式运行时图层

**Files:**
- Modify: `examples/views/NG/GI/NGGI02.vue`
- Modify: `examples/views/NG/GI/nggi-example.shared.ts`

- [ ] **Step 1: 增加属性列表**

面板长期显示 `kit.sourceData.value.features` 的 `id/name/status/kind/editable`，让改名和删除可见。

- [ ] **Step 2: 使用响应式数据维护正式业务 source**

保留当前新增、改名、删除逻辑，但每次操作后更新 `message`。

- [ ] **Step 3: 增加运行时 source/layer 演示**

使用 `businessMap.layers.addGeoJsonSource()` 和 `businessMap.layers.addLayer()` 添加临时点图层，说明它是运行时 MapLibre 动作，不是正式业务 source。

示例按钮：

```typescript
function addRuntimeLayer(): void {
  const sourceResult = businessMap.layers.addGeoJsonSource(RUNTIME_SOURCE_ID, runtimeData.value);
  const layerResult = businessMap.layers.addLayer(runtimeLayer);
  message.value = `${sourceResult.message}；${layerResult.message}`;
}
```

- [ ] **Step 4: 增加移除运行时图层按钮**

先 remove layer，再 remove source，避免 MapLibre source 被 layer 占用。

### Task 5: 让 NGGI03 的 hover 与 feature-state 样式可见

**Files:**
- Modify: `examples/views/NG/GI/NGGI03.vue`
- Modify: `examples/views/NG/GI/nggi-example.shared.ts`

- [ ] **Step 1: 增加状态样式图层工厂**

新增一个示例专用函数，返回带 `hover/selected/active` 表达式的图层数组。

点图层示例：

```typescript
"circle-color": createFeatureStateExpression({
  default: "#f97316",
  hover: "#22c55e",
  selected: "#2563eb",
  states: {
    active: "#ef4444",
  },
  order: ["active", "selected", "hover"],
})
```

- [ ] **Step 2: 接入 mapInteractive hover**

确保 `map-interactive` 声明对应图层，并启用默认 hover feature-state。

- [ ] **Step 3: 写入点状态后展示结果**

按钮写入 `point-a` 的 `active: true`，面板显示当前 active ID；再提供清除状态按钮，写入 `active: false`。

### Task 6: 扩展 NGGI07 snap 规则与预览样式

**Files:**
- Modify: `examples/views/NG/GI/NGGI07.vue`

- [ ] **Step 1: 增加多规则普通图层吸附**

配置点、线、面三类规则：

```typescript
rules: [
  { id: "point-vertex", layerIds: [EXAMPLE_POINT_LAYER_ID], geometryTypes: ["Point"], snapTo: ["vertex"], priority: 30 },
  { id: "line-all", layerIds: [EXAMPLE_LINE_LAYER_ID], geometryTypes: ["LineString"], snapTo: ["vertex", "segment"], priority: 20 },
  { id: "area-border", layerIds: [EXAMPLE_FILL_LAYER_ID], geometryTypes: ["Polygon"], snapTo: ["vertex", "segment"], priority: 10 },
]
```

- [ ] **Step 2: 增加吸附预览样式**

配置 `preview.pointColor`、`preview.pointRadius`、`preview.lineColor`、`preview.lineWidth`，让命中点和线段有明显变化。

- [ ] **Step 3: 面板展示规则状态**

只展示规则 ID、目标图层和吸附类型，不写长篇教学说明。

### Task 7: 让 NGGI08 线草稿属性和完整 GeoJSON 可见

**Files:**
- Modify: `examples/views/NG/GI/NGGI08.vue`

- [ ] **Step 1: 增加草稿属性视图**

从 `draft.getData()?.features` 派生列表，展示每个草稿的 `id/generatedKind/status/editable`。

- [ ] **Step 2: 修改/删除属性后刷新展示**

`saveDraft()` 与 `removeDraftProp()` 执行后调用 `showDraftProperties()`，避免只显示 result message。

- [ ] **Step 3: 读取完整 GeoJSON**

`readDraftData()` 直接展示完整 `draft.getData()`：

```typescript
message.value = JSON.stringify(draft.getData(), null, 2);
```

- [ ] **Step 4: 点击草稿后显示当前草稿**

在插件 `onClick` 中同步当前草稿 ID 和属性摘要。

### Task 8: 修复 NGGI09 正式交点生成与完整 GeoJSON 展示

**Files:**
- Modify: `examples/views/NG/GI/NGGI09.vue`

- [ ] **Step 1: 改造生成正式点按钮**

优先使用选中交点，没有选中时使用第一个预览交点：

```typescript
function materializeFirst(): void {
  const intersectionId =
    intersection.getSelected()?.intersectionId ||
    intersection.getData()?.features[0]?.properties?.intersectionId;

  if (typeof intersectionId !== "string") {
    message.value = "请先刷新交点";
    return;
  }

  const success = intersection.materialize(intersectionId);
  message.value = success ? "已生成正式交点" : "生成正式交点失败";
}
```

- [ ] **Step 2: 属性更新后显示正式点属性**

`saveIntersection()` 成功后展示 `intersection.getMaterializedData()?.features[0]?.properties`。

- [ ] **Step 3: 读取完整 GeoJSON**

展示预览和正式点完整集合：

```typescript
message.value = JSON.stringify({
  preview: intersection.getData(),
  materialized: intersection.getMaterializedData(),
}, null, 2);
```

### Task 9: 让 NGGI10 多选样式和选中列表可见

**Files:**
- Modify: `examples/views/NG/GI/NGGI10.vue`
- Modify: `examples/views/NG/GI/nggi-example.shared.ts`

- [ ] **Step 1: 使用带 selected 表达式的图层**

点图层通过 `circle-color/circle-radius`，线图层通过 `line-color/line-width` 展示 `feature-state.selected`。

- [ ] **Step 2: 面板展示选中要素列表**

显示 `featureId/layerId/sourceId/name`，并在 `onSelectionChange` 时刷新。

- [ ] **Step 3: 读取选中要素展示完整快照**

`readSelected()` 展示 `multiSelect.getSelectedFeatures()` 的完整可序列化信息，而不只展示三列摘要。

### Task 10: 补文档注释和示例路径一致性检查

**Files:**
- Modify: `src/MapLibre/facades/businessPreset.ts`
- Modify: `src/MapLibre/facades/useBusinessMap.ts`
- Modify: `src/MapLibre/facades/useMapLayerActions.ts`

- [ ] **Step 1: 标注推荐插件入口**

在 `UseBusinessMapResult` 注释中说明新示例推荐 `businessMap.plugins.lineDraft` 与 `businessMap.plugins.intersection`，顶层 `draft/intersection` 作为短兼容入口保留。

- [ ] **Step 2: 标注 snap true 边界**

`BusinessPluginsOptions.snap` 注释补充：

```typescript
/** 传 true 只启用吸附基础能力和插件内部默认目标；需要普通业务图层吸附时请传 { layerIds: [...] } 或完整 ordinaryLayers。 */
```

- [ ] **Step 3: 标注运行时样式边界**

`setPaint/setLayout` 注释补充：

```typescript
/** 运行时临时修改。持久样式建议维护响应式业务图层 style，避免图层重建后被声明式配置覆盖。 */
```

- [ ] **Step 4: 标注 where 升级路径**

`LayerGroupItem.where` 注释补充：

```typescript
/** 当前图层的简单等值过滤条件；复杂 MapLibre 过滤表达式请使用 filter。 */
```

### Task 11: 自动检查与人工审查

**Files:**
- Test commands only

- [ ] **Step 1: 运行单元测试**

```powershell
npm run test
```

预期：全部通过。

- [ ] **Step 2: 运行构建类型检查**

```powershell
npx vue-tsc -p tsconfig.build.json --noEmit
```

预期：通过。

- [ ] **Step 3: 运行构建**

```powershell
npm run build
```

预期：通过。

- [ ] **Step 4: 检查空白和换行**

```powershell
git diff --check
```

预期：无错误。Windows 环境如仅出现 LF/CRLF 提示，需要记录但不作为本轮失败。

- [ ] **Step 5: 示例人工冒烟**

如果 dev server 可启动，逐页检查：

- `NGGI02`：改名后属性列表变化；运行时 source/layer 可添加和移除。
- `NGGI03`：hover 可见，写入 active 后点样式变化。
- `NGGI04`：点击要素弹窗出现并展示属性。
- `NGGI07`：吸附点和吸附线段预览样式明显。
- `NGGI08`：属性修改/删除可见，读取完整草稿 GeoJSON。
- `NGGI09`：无需先点击交点也能生成第一个正式点，读取完整 GeoJSON。
- `NGGI10`：多选后要素样式变化，选中列表同步。

---

## 四、验收标准

- 新增或修改的所有业务层示例仍只从 `vue-maplibre-kit/business` 与 `vue-maplibre-kit/plugins/*` 引入能力，不引用 `src/MapLibre/**`。
- `NGGI00.vue` 不改动。
- 不新增命令式正式业务 source 的 `addFeature/updateFeature/removeFeature` API。
- 所有新增函数具备函数级中文注释；魔法数、单位、边界兼容逻辑具备行间中文注释。
- 自动检查通过：`npm run test`、`npx vue-tsc -p tsconfig.build.json --noEmit`、`npm run build`、`git diff --check`。
- 示例的每个按钮操作都有可见反馈，不能只依赖控制台或不可见内部状态。
