# Polygon Edge Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增面边线临时预览插件，并统一插件生成要素元数据、吸附配置命名和公开门面。

**Architecture:** 先在 shared 层补统一生成元数据 helper，再让现有草稿线和交点插件迁移到新字段且兼容旧字段。新增 `polygon-edge-preview` 插件独立维护临时边线 source/layer，通过 `createBusinessPlugins()` 注册，通过 `useBusinessMap().plugins.polygonEdge` 读取，并让 snap 具名配置 `businessLayers`、`intersection`、`polygonEdge`。

**Tech Stack:** Vue 3、TypeScript、MapLibre GL、vue-maplibre-gl、Vitest、GeoJSON。

---

### Task 1: 生成要素元数据 helper

**Files:**
- Modify: `src/MapLibre/shared/map-common-tools.ts`
- Test: `src/MapLibre/shared/map-common-tools.spec.ts`

- [ ] **Step 1: Write failing tests**

在 `map-common-tools.spec.ts` 增加用例：

```ts
it('应构建统一的插件生成要素元数据', () => {
  const properties = buildGeneratedFeatureProperties({
    generatedKind: 'polygon-edge-preview',
    groupId: 'polygon-edge::source-a::land-1',
    parentRef: {
      sourceId: 'source-a',
      featureId: 'land-1',
      layerId: 'land-fill-layer',
    },
  });

  expect(properties).toEqual({
    generatedKind: 'polygon-edge-preview',
    generatedGroupId: 'polygon-edge::source-a::land-1',
    generatedParentSourceId: 'source-a',
    generatedParentFeatureId: 'land-1',
    generatedParentLayerId: 'land-fill-layer',
    managedPreviewOriginSourceId: 'source-a',
    managedPreviewOriginFeatureId: 'land-1',
    managedPreviewOriginLayerId: 'land-fill-layer',
    managedPreviewOriginKey: 'source-a::land-1',
  });
});

it('应优先从统一字段提取插件生成要素来源引用', () => {
  const parentRef = extractGeneratedParentRef({
    generatedParentSourceId: 'source-a',
    generatedParentFeatureId: 'land-1',
    generatedParentLayerId: 'land-fill-layer',
  });

  expect(parentRef).toEqual({
    sourceId: 'source-a',
    featureId: 'land-1',
    layerId: 'land-fill-layer',
  });
});

it('应兼容旧托管预览来源字段', () => {
  const parentRef = extractGeneratedParentRef({
    managedPreviewOriginSourceId: 'source-a',
    managedPreviewOriginFeatureId: 'land-1',
    managedPreviewOriginLayerId: 'land-fill-layer',
  });

  expect(parentRef).toEqual({
    sourceId: 'source-a',
    featureId: 'land-1',
    layerId: 'land-fill-layer',
  });
});
```

- [ ] **Step 2: Run red test**

Run: `npm test -- src/MapLibre/shared/map-common-tools.spec.ts`

Expected: FAIL，提示 `buildGeneratedFeatureProperties` 或 `extractGeneratedParentRef` 未导出。

- [ ] **Step 3: Implement helper**

在 `map-common-tools.ts` 增加：

```ts
export const GENERATED_GROUP_ID_PROPERTY = 'generatedGroupId';
export const GENERATED_PARENT_SOURCE_ID_PROPERTY = 'generatedParentSourceId';
export const GENERATED_PARENT_FEATURE_ID_PROPERTY = 'generatedParentFeatureId';
export const GENERATED_PARENT_LAYER_ID_PROPERTY = 'generatedParentLayerId';

export interface BuildGeneratedFeaturePropertiesOptions {
  /** 生成要素类型标识。 */
  generatedKind: string;
  /** 同一组生成要素的稳定分组 ID。 */
  groupId?: string | null;
  /** 来源正式业务要素引用。 */
  parentRef?: MapSourceFeatureRef | null;
}

export function buildGeneratedFeatureProperties(
  options: BuildGeneratedFeaturePropertiesOptions
): MapCommonProperties {
  const { generatedKind, groupId = null, parentRef = null } = options;

  return {
    generatedKind,
    ...(groupId ? { [GENERATED_GROUP_ID_PROPERTY]: groupId } : {}),
    ...(parentRef?.sourceId ? { [GENERATED_PARENT_SOURCE_ID_PROPERTY]: parentRef.sourceId } : {}),
    ...(parentRef?.featureId !== null && parentRef?.featureId !== undefined
      ? { [GENERATED_PARENT_FEATURE_ID_PROPERTY]: parentRef.featureId }
      : {}),
    ...(parentRef?.layerId ? { [GENERATED_PARENT_LAYER_ID_PROPERTY]: parentRef.layerId } : {}),
    ...buildManagedPreviewOriginProperties(parentRef),
  };
}

export function extractGeneratedParentRef(
  properties: MapCommonProperties | null | undefined
): MapSourceFeatureRef | null {
  const nextRef = createMapSourceFeatureRef(
    (properties?.[GENERATED_PARENT_SOURCE_ID_PROPERTY] as string | null | undefined) || null,
    (properties?.[GENERATED_PARENT_FEATURE_ID_PROPERTY] as MapFeatureId | null | undefined) ??
      null,
    (properties?.[GENERATED_PARENT_LAYER_ID_PROPERTY] as string | null | undefined) || null
  );

  return nextRef || extractManagedPreviewOriginFromProperties(properties);
}
```

- [ ] **Step 4: Run green test**

Run: `npm test -- src/MapLibre/shared/map-common-tools.spec.ts`

Expected: PASS。

### Task 2: 迁移草稿线和交点生成字段

**Files:**
- Modify: `src/MapLibre/shared/map-common-tools.ts`
- Modify: `src/MapLibre/shared/map-intersection-tools.ts`
- Modify: `src/MapLibre/plugins/line-draft-preview/useLineDraftPreviewStore.ts`
- Modify: `src/MapLibre/plugins/line-draft-preview/useLineDraftPreviewController.ts`
- Modify: `src/MapLibre/facades/useMapFeatureActions.ts`
- Test: existing related specs

- [ ] **Step 1: Write failing tests**

在现有草稿线和交点测试中断言新字段：

```ts
expect(feature.properties?.generatedGroupId).toBeTruthy();
expect(feature.properties?.generatedParentSourceId).toBe('source-a');
expect(feature.properties?.generatedParentFeatureId).toBe('line-1');
```

交点正式化要素断言：

```ts
expect(feature.properties?.generatedKind).toBe('intersection-materialized');
expect(feature.properties).toHaveProperty('generatedGroupId');
```

- [ ] **Step 2: Run red tests**

Run:

```bash
npm test -- src/MapLibre/plugins/line-draft-preview/useLineDraftPreviewController.spec.ts src/MapLibre/shared/map-intersection-tools.spec.ts src/MapLibre/facades/useMapFeatureActions.spec.ts
```

Expected: FAIL，缺少统一字段。

- [ ] **Step 3: Implement migration**

替换新增属性写入点：

- `MapLineExtensionTool.extendSelectedLineSegment()` 使用 `buildGeneratedFeatureProperties()`。
- `MapLineCorridorTool.createRegionFeature()` 使用 `buildGeneratedFeatureProperties()`。
- `buildIntersectionPointFeature()` 和正式化交点构造逻辑使用统一字段。
- 来源读取改为 `extractGeneratedParentRef()`，旧字段继续兼容。

- [ ] **Step 4: Run green tests**

Run:

```bash
npm test -- src/MapLibre/plugins/line-draft-preview/useLineDraftPreviewController.spec.ts src/MapLibre/shared/map-intersection-tools.spec.ts src/MapLibre/facades/useMapFeatureActions.spec.ts
```

Expected: PASS。

### Task 3: polygon-edge-preview 纯算法和 store

**Files:**
- Create: `src/MapLibre/plugins/polygon-edge-preview/types.ts`
- Create: `src/MapLibre/plugins/polygon-edge-preview/usePolygonEdgePreviewStore.ts`
- Test: `src/MapLibre/plugins/polygon-edge-preview/usePolygonEdgePreviewStore.spec.ts`

- [ ] **Step 1: Write failing tests**

测试 `Polygon` 外环、内环和 `MultiPolygon`：

```ts
it('应按每条边生成 Polygon 外环临时边线', () => {
  const store = usePolygonEdgePreviewStore({ isEnabled: () => true });
  const result = store.generateFromFeature({
    feature: createPolygonFeature('land-1', [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 0],
      ],
    ]),
    origin: { sourceId: 'source-a', featureId: 'land-1', layerId: 'land-layer' },
  });

  expect(result.success).toBe(true);
  expect(store.featureCollection.value.features).toHaveLength(3);
  expect(store.featureCollection.value.features[0].properties).toMatchObject({
    generatedKind: 'polygon-edge-preview',
    polygonIndex: 0,
    ringIndex: 0,
    edgeIndex: 0,
    isOuterRing: true,
    generatedParentSourceId: 'source-a',
    generatedParentFeatureId: 'land-1',
  });
});
```

- [ ] **Step 2: Run red test**

Run: `npm test -- src/MapLibre/plugins/polygon-edge-preview/usePolygonEdgePreviewStore.spec.ts`

Expected: FAIL，文件或方法不存在。

- [ ] **Step 3: Implement store**

实现：

- 常量：sourceId、lineLayerId、generatedKind。
- 类型：样式、状态、上下文、API 入参。
- `generateFromFeature()`：按边生成 LineString。
- `highlightPolygon()`、`highlightRing()`、`highlightEdge()`、`selectEdge()`。
- `clearHighlight()`、`clear()`、`getFeatureById()`。

- [ ] **Step 4: Run green test**

Run: `npm test -- src/MapLibre/plugins/polygon-edge-preview/usePolygonEdgePreviewStore.spec.ts`

Expected: PASS。

### Task 4: polygon-edge-preview 插件渲染、交互和门面

**Files:**
- Create: `src/MapLibre/plugins/polygon-edge-preview/PolygonEdgePreviewLayers.vue`
- Create: `src/MapLibre/plugins/polygon-edge-preview/usePolygonEdgePreviewController.ts`
- Create: `src/MapLibre/plugins/polygon-edge-preview/usePolygonEdgePreviewPlugin.ts`
- Create: `src/MapLibre/plugins/polygon-edge-preview/index.ts`
- Create: `src/MapLibre/facades/usePolygonEdgePreview.ts`
- Modify: `src/MapLibre/facades/mapPluginResolver.ts`
- Modify: `src/MapLibre/facades/useBusinessMap.ts`
- Test: plugin and facade specs

- [ ] **Step 1: Write failing tests**

新增测试：

```ts
it('useBusinessMap 应暴露 polygonEdge 插件分组', () => {
  const businessMap = useBusinessMap({ mapRef: ref(createMapExposeWithPolygonEdge()), sourceRegistry });
  expect(typeof businessMap.plugins.polygonEdge.clear).toBe('function');
});
```

- [ ] **Step 2: Run red tests**

Run:

```bash
npm test -- src/MapLibre/facades/useBusinessMap.spec.ts src/MapLibre/plugins/polygon-edge-preview/usePolygonEdgePreviewPlugin.spec.ts
```

Expected: FAIL，插件和门面不存在。

- [ ] **Step 3: Implement plugin and facade**

仿照 `line-draft-preview`：

- 控制器合并全局和局部样式。
- 图层组件渲染 GeoJSON source 和 line layer。
- 插件注册交互补丁，支持 hover、selected、callback。
- 门面读取插件 API，未注册时返回安全兜底方法。

- [ ] **Step 4: Run green tests**

Run:

```bash
npm test -- src/MapLibre/facades/useBusinessMap.spec.ts src/MapLibre/plugins/polygon-edge-preview/usePolygonEdgePreviewPlugin.spec.ts
```

Expected: PASS。

### Task 5: snap 配置迁移和内置目标

**Files:**
- Modify: `src/MapLibre/plugins/map-feature-snap/types.ts`
- Modify: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.ts`
- Modify: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.ts`
- Modify: `src/MapLibre/facades/businessPreset.ts`
- Test: snap and business preset specs

- [ ] **Step 1: Write failing tests**

覆盖：

- `businessLayers` 生成普通业务图层规则。
- `ordinaryLayers` 暂时兼容。
- `intersection: { enabled: false }` 关闭交点内置规则。
- `polygonEdge: { enabled: false }` 关闭面边线内置规则。

- [ ] **Step 2: Run red tests**

Run:

```bash
npm test -- src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.spec.ts src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts src/MapLibre/facades/businessPreset.spec.ts
```

Expected: FAIL。

- [ ] **Step 3: Implement snap migration**

实现：

- `MapFeatureSnapOptions.businessLayers`。
- `ordinaryLayers` 标记为内部兼容字段。
- `MapFeatureSnapBuiltInTargetOptions` 复用 `enabled/priority/tolerancePx/snapTo`。
- `createBuiltInIntersectionSnapRules(options)`。
- `createBuiltInPolygonEdgeSnapRules(options)`。
- `resolveSnapOptions()` 用 `businessLayers` 生成默认配置。

- [ ] **Step 4: Run green tests**

Run:

```bash
npm test -- src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.spec.ts src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts src/MapLibre/facades/businessPreset.spec.ts
```

Expected: PASS。

### Task 6: 全局配置和公开入口

**Files:**
- Modify: `src/entries/config.ts`
- Modify: `src/MapLibre/shared/map-global-config.ts`
- Modify: `src/entries/plugins.ts`
- Create: `src/plugins/polygon-edge-preview.ts`
- Modify: `package.json`
- Modify: Vite / Vitest / TypeScript path config if present
- Test: `src/config.spec.ts` and entry specs if present

- [ ] **Step 1: Write failing tests**

测试 `defineMapGlobalConfig({ plugins: { polygonEdge } })` 类型和运行时读取。

- [ ] **Step 2: Run red tests**

Run: `npm test -- src/config.spec.ts src/MapLibre/facades/businessPreset.spec.ts`

Expected: FAIL。

- [ ] **Step 3: Implement entries**

新增高级入口并把 `polygonEdge` 加入：

- `createBusinessPlugins()`
- `BusinessPluginsOptions`
- `entries/plugins.ts`
- `package.json exports`
- 全局配置类型和读取 helper

- [ ] **Step 4: Run green tests**

Run: `npm test -- src/config.spec.ts src/MapLibre/facades/businessPreset.spec.ts`

Expected: PASS。

### Task 7: 示例和知识库

**Files:**
- Modify: `docs/file-index.md`
- Modify: `docs/vue-maplibre-kit-knowledge/02-公开入口/03-plugins插件入口.md`
- Modify: `docs/vue-maplibre-kit-knowledge/02-公开入口/06-插件子路径.md`
- Modify: `docs/vue-maplibre-kit-knowledge/09-插件/01-插件注册总览.md`
- Modify: `docs/vue-maplibre-kit-knowledge/09-插件/02-snap吸附.md`
- Create: `docs/vue-maplibre-kit-knowledge/09-插件/08-polygonEdge面边线.md`
- Modify: `docs/vue-maplibre-kit-knowledge/11-全局配置/04-plugins默认值.md`
- Modify: `examples/views/NG/GI/NGGI00.vue` if needed

- [ ] **Step 1: Update docs**

统一写：

- `createBusinessPlugins({ polygonEdge })`
- `businessMap.plugins.polygonEdge`
- `snap.businessLayers`
- 全局 `plugins.snap` 不放业务图层规则
- 全局 `plugins.polygonEdge.style`

- [ ] **Step 2: Search docs for stale names**

Run:

```bash
rg "ordinaryLayers|businessMap\.draft|usePolygonEdgePreview|polygon-edge-preview" docs/vue-maplibre-kit-knowledge docs/file-index.md
```

Expected: `ordinaryLayers` 只出现在兼容说明中。

### Task 8: Full verification

**Files:** all changed files.

- [ ] **Step 1: Run targeted tests**

Run all touched specs.

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: PASS。

- [ ] **Step 3: Run TypeScript check**

Run: `npx vue-tsc -p tsconfig.build.json --noEmit`

Expected: PASS。

- [ ] **Step 4: Run build if type check passes**

Run: `npm run build`

Expected: PASS。

- [ ] **Step 5: Record problems**

若遇到意外情况、理解障碍或踩坑，写入 `docs/problem-record.md`。
