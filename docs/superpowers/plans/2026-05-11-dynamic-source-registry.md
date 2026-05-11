# 动态业务 Source 注册表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `sourceRegistry` 升级为支持动态新增、删除、批量替换的页面级业务 source 容器，并让 `createLayerGroup({ sourceId })` 统一生成全局唯一业务图层 ID。

**Architecture:** `createMapBusinessSourceRegistry()` 改为唯一推荐入口，创建空的可响应注册表后通过 `setSources/addSource/removeSource/clearSources` 管理 source，不保留数组初始化旧写法。`createLayerGroup()` 保留现有 `defaultPolicy/defaultStyle/layers` 能力，新增必填 `sourceId`，把 `LayerGroupItem.id` 解释为 source 内逻辑图层名，并统一生成 `${sourceId}-${id}`。示例和知识库同步迁移到新写法，动态 source 靠 registry，动态 layer 靠 `createMapBusinessSource({ layers: ref/computed/getter })`。

**Tech Stack:** Vue 3、TypeScript、Vitest、MapLibre GL JS、项目现有 `vue-maplibre-kit/business` 公开门面、`docs/vue-maplibre-kit-knowledge` 知识库。

---

## 已确认边界

- 项目未发布，本轮允许破坏式 API 收敛，不保留 `createMapBusinessSourceRegistry([source])` 旧写法。
- `createCircleBusinessLayer`、`createLineBusinessLayer`、`createFillBusinessLayer`、`createSymbolBusinessLayer` 继续保留，作为高级显式 layerId 原子入口。
- `createLayerGroup()` 作为推荐批量业务图层入口升级，不新增 `createSourceLayerGroup`、`createBatchLayers` 等平行 helper。
- 第一轮不新增批量 source helper。若后续示例证明 `Promise.all + createMapBusinessSource` 模板仍然明显重复，再单独设计。
- 动态 layer 已由 `layers: ref/computed/getter` 支持，本轮只补文档和示例说明；不要为 layer 再引入独立 registry。

---

## 文件结构

- Modify: `src/MapLibre/facades/createMapBusinessSource.spec.ts`，先写动态 registry 行为测试。
- Modify: `src/MapLibre/facades/createMapBusinessSource.ts`，实现可响应 registry 与新增方法。
- Modify: `src/MapLibre/facades/businessPreset.spec.ts`，先写 `createLayerGroup({ sourceId })` 新语义测试。
- Modify: `src/MapLibre/facades/businessPreset.ts`，升级 `LayerGroupOptions` 与 `createLayerGroup()`。
- Modify: `src/MapLibre/facades/useBusinessMap.spec.ts`、`src/MapLibre/facades/useMapFeatureActions.spec.ts`、`src/MapLibre/facades/useMapFeaturePropertyEditor.spec.ts`、`src/MapLibre/facades/useMapFeatureQuery.spec.ts`，迁移 registry 初始化写法。
- Modify: `src/MapLibre/facades/businessPreset.spec.ts`、`src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`、`src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.spec.ts`、`src/MapLibre/plugins/map-dxf-export/useMapDxfExportPlugin.spec.ts`、`src/MapLibre/exporters/dxf/exportBusinessSourcesToDxf.spec.ts`，迁移插件和 DXF 测试中的 registry 初始化写法。
- Modify: `examples/views/NG/GI/nggi-example.shared.ts`，迁移共享示例的 `createLayerGroup({ sourceId })` 和 registry 写法。
- Modify: `examples/views/NG/GI/NGGI01.vue`，展示 `sourceId + 逻辑 layer id` 的新语义。
- Modify: `examples/views/NG/GI/NGGI02.vue`，增加动态新增 source 和动态新增 layer 的示例按钮。
- Modify: `examples/views/NG/GI/NGGI00.vue`，迁移大型验证页的 registry 初始化和 layer 组写法。
- Modify: `docs/vue-maplibre-kit-knowledge/04-业务数据源/02-createMapBusinessSourceRegistry.md`，重写动态 registry 推荐用法，删除数组初始化旧方法。
- Modify: `docs/vue-maplibre-kit-knowledge/04-业务数据源/03-MapBusinessSourceLayers.md`，补动态 `listSources()` 渲染与响应式 `layers` 说明。
- Modify: `docs/vue-maplibre-kit-knowledge/05-业务图层/02-createLayerGroup.md`，重写 `sourceId` 新语义。
- Modify: `docs/vue-maplibre-kit-knowledge/12-命令式能力/01-useBusinessMap总览.md`，迁移轻量页面 registry 写法。
- Modify: `docs/vue-maplibre-kit-knowledge/15-API参考/01-business-api.md`，更新 registry 与 `createLayerGroup` 方法说明。
- Modify: `docs/vue-maplibre-kit-knowledge/14-示例索引/02-按功能查示例.md`，标记 NGGI02 可查看动态 source/layer。
- Modify: `docs/problem-record.md`，记录“动态 source 由 registry 管理、动态 layer 由 source 的响应式 layers 输入管理”的边界。

---

### Task 1: 动态 Registry 失败测试

**Files:**

- Modify: `src/MapLibre/facades/createMapBusinessSource.spec.ts`

- [ ] **Step 1: 增加测试辅助函数**

在现有 `createFeatureCollection()` 后新增：

```ts
/**
 * 创建最小业务 source。
 * @param sourceId source 唯一标识
 * @param featureId 要素唯一标识
 * @returns 测试用业务 source
 */
function createTestSource(sourceId: string, featureId: string) {
  return createMapBusinessSource({
    sourceId,
    data: ref(createFeatureCollection([createPointFeature(featureId)])),
    promoteId: "id",
  });
}
```

- [ ] **Step 2: 写空注册表与新增 source 测试**

在 `describe('createMapBusinessSource', () => {` 内新增：

```ts
it("registry 支持空初始化后动态新增 source", () => {
  const registry = createMapBusinessSourceRegistry();
  const source = createTestSource("business-a", "feature-a");

  expect(registry.listSources()).toEqual([]);

  registry.addSource(source);

  expect(registry.getSource("business-a")).toBe(source);
  expect(registry.listSources()).toEqual([source]);
  expect(
    registry.resolveFeature(
      registry.createFeatureRef("business-a", "feature-a"),
    )?.properties?.id,
  ).toBe("feature-a");
});
```

- [ ] **Step 3: 写批量替换 source 测试**

继续新增：

```ts
it("registry 支持批量替换 source 列表", () => {
  const registry = createMapBusinessSourceRegistry();
  const sourceA = createTestSource("business-a", "feature-a");
  const sourceB = createTestSource("business-b", "feature-b");
  const sourceC = createTestSource("business-c", "feature-c");

  registry.setSources([sourceA, sourceB]);

  expect(registry.listSources()).toEqual([sourceA, sourceB]);
  expect(
    registry.resolveFeature(
      registry.createFeatureRef("business-b", "feature-b"),
    )?.properties?.id,
  ).toBe("feature-b");

  registry.setSources([sourceC]);

  expect(registry.getSource("business-a")).toBeNull();
  expect(registry.listSources()).toEqual([sourceC]);
  expect(
    registry.resolveFeature(
      registry.createFeatureRef("business-c", "feature-c"),
    )?.properties?.id,
  ).toBe("feature-c");
});
```

- [ ] **Step 4: 写删除与清空测试**

继续新增：

```ts
it("registry 支持删除和清空 source", () => {
  const registry = createMapBusinessSourceRegistry();
  const sourceA = createTestSource("business-a", "feature-a");
  const sourceB = createTestSource("business-b", "feature-b");

  registry.setSources([sourceA, sourceB]);

  expect(registry.removeSource("business-a")).toBe(true);
  expect(registry.removeSource("missing-source")).toBe(false);
  expect(registry.getSource("business-a")).toBeNull();
  expect(registry.listSources()).toEqual([sourceB]);

  registry.clearSources();

  expect(registry.listSources()).toEqual([]);
  expect(registry.getSource("business-b")).toBeNull();
});
```

- [ ] **Step 5: 写重复 sourceId 动态失败测试**

替换现有“重复 sourceId 时会直接抛出异常”测试内容为：

```ts
it("registry 动态写入重复 sourceId 时会直接抛出异常，避免静默覆盖", () => {
  const primarySource = createTestSource("business-duplicate", "feature-1");
  const secondarySource = createTestSource("business-duplicate", "feature-2");
  const registry = createMapBusinessSourceRegistry();

  expect(() => {
    registry.setSources([primarySource, secondarySource]);
  }).toThrowError(
    "[createMapBusinessSourceRegistry] 检测到重复 sourceId：business-duplicate",
  );

  registry.addSource(primarySource);

  expect(() => {
    registry.addSource(secondarySource);
  }).toThrowError(
    "[createMapBusinessSourceRegistry] 检测到重复 sourceId：business-duplicate",
  );
});
```

- [ ] **Step 6: 运行失败测试**

Run:

```powershell
npx vitest run src/MapLibre/facades/createMapBusinessSource.spec.ts
```

Expected: FAIL，错误包含 `createMapBusinessSourceRegistry` 需要参数、`addSource is not a function` 或 `setSources is not a function`。

---

### Task 2: 实现动态 Registry

**Files:**

- Modify: `src/MapLibre/facades/createMapBusinessSource.ts`

- [ ] **Step 1: 扩展 registry 接口**

把 `MapBusinessSourceRegistry` 接口扩展为：

```ts
export interface MapBusinessSourceRegistry {
  /** 动态注册单个 source；重复 sourceId 会直接抛错。 */
  addSource: (source: MapBusinessSource) => void;
  /** 用一组 source 替换当前注册表；任意重复 sourceId 都会直接抛错。 */
  setSources: (sources: MapBusinessSource[]) => void;
  /** 删除指定 source；返回本次是否真的删除。 */
  removeSource: (sourceId: string | null | undefined) => boolean;
  /** 清空当前注册表。 */
  clearSources: () => void;
  /** 读取指定 source。 */
  getSource: (sourceId: string | null | undefined) => MapBusinessSource | null;
  /** 列出全部已注册 source。 */
  listSources: () => MapBusinessSource[];
  /** 按标准来源引用解析要素。 */
  resolveFeature: (
    featureRef: MapSourceFeatureRef | null,
  ) => MapCommonFeature | null;
  /** 按标准来源引用解析属性面板态。 */
  resolveFeaturePropertyPanelState: (
    featureRef: MapSourceFeatureRef | null,
  ) => MapFeaturePropertyPanelState | null;
  /** 替换指定 source 的完整要素数组。 */
  replaceFeatures: (
    sourceId: string,
    nextFeatures: MapCommonFeature[],
  ) => boolean;
  /** 向指定 source 写回属性。 */
  saveProperties: (
    sourceId: string,
    featureId: MapFeatureId,
    newProperties: FeatureProperties,
    layerId?: string | null,
  ) => SaveFeaturePropertiesResult;
  /** 向指定 source 显式删除属性。 */
  removeProperties: (
    sourceId: string,
    featureId: MapFeatureId,
    propertyKeys: readonly string[],
    layerId?: string | null,
  ) => SaveFeaturePropertiesResult;
  /** 创建标准来源引用。 */
  createFeatureRef: (
    sourceId: string,
    featureId: MapFeatureId | null,
    layerId?: string | null,
  ) => MapSourceFeatureRef | null;
}
```

- [ ] **Step 2: 替换 registry 工厂签名与内部状态**

把 `createMapBusinessSourceRegistry` 函数签名和开头替换为：

```ts
/**
 * 创建业务 source 注册表。
 * @returns 可动态维护业务 source 的注册表门面
 */
export function createMapBusinessSourceRegistry(): MapBusinessSourceRegistry {
  const sourceMap = reactive(new Map<string, MapBusinessSource>());

  /**
   * 校验一组 source 是否存在重复 sourceId。
   * @param sources 当前准备写入的 source 列表
   */
  const assertUniqueSources = (sources: MapBusinessSource[]): void => {
    const usedSourceIds = new Set<string>();

    sources.forEach((source) => {
      if (usedSourceIds.has(source.sourceId)) {
        // 重复 sourceId 会让后续查询和写回目标变得不确定，这里直接 fail-fast。
        throw new Error(
          `[createMapBusinessSourceRegistry] 检测到重复 sourceId：${source.sourceId}`
        );
      }

      usedSourceIds.add(source.sourceId);
    });
  };
```

- [ ] **Step 3: 增加新增、替换、删除、清空方法**

在 `getSource` 前新增：

```ts
/**
 * 动态注册单个 source。
 * @param source 当前需要注册的业务 source
 */
const addSource = (source: MapBusinessSource): void => {
  if (sourceMap.has(source.sourceId)) {
    // 动态追加同样采用 fail-fast，避免业务页误以为已经覆盖成功。
    throw new Error(
      `[createMapBusinessSourceRegistry] 检测到重复 sourceId：${source.sourceId}`,
    );
  }

  sourceMap.set(source.sourceId, source);
};

/**
 * 用一组 source 替换当前注册表。
 * @param sources 最新 source 列表
 */
const setSources = (sources: MapBusinessSource[]): void => {
  assertUniqueSources(sources);
  sourceMap.clear();
  sources.forEach((source) => {
    sourceMap.set(source.sourceId, source);
  });
};

/**
 * 删除指定 source。
 * @param sourceId 目标 source ID
 * @returns 本次是否删除成功
 */
const removeSource = (sourceId: string | null | undefined): boolean => {
  if (!sourceId) {
    return false;
  }

  return sourceMap.delete(sourceId);
};

/**
 * 清空当前注册表。
 */
const clearSources = (): void => {
  sourceMap.clear();
};
```

- [ ] **Step 4: 更新返回对象**

在工厂返回值中加入新方法：

```ts
return {
  addSource,
  setSources,
  removeSource,
  clearSources,
  getSource,
  listSources,
  resolveFeature,
  resolveFeaturePropertyPanelState,
  replaceFeatures,
  saveProperties,
  removeProperties,
  createFeatureRef,
};
```

- [ ] **Step 5: 跑 registry 定向测试**

Run:

```powershell
npx vitest run src/MapLibre/facades/createMapBusinessSource.spec.ts
```

Expected: PASS。

---

### Task 3: createLayerGroup 新语义失败测试

**Files:**

- Modify: `src/MapLibre/facades/businessPreset.spec.ts`

- [ ] **Step 1: 替换 createLayerGroup 测试输入**

把“应把图层组简写转换为现有业务图层描述”测试里的 `createLayerGroup` 调用改为：

```ts
const layers = createLayerGroup({
  sourceId: "pipe-source",
  defaultPolicy: { fixedKeys: ["id"] },
  defaultStyle: createSimpleLineStyle({ color: "#2563eb" }),
  layers: [
    {
      type: "line",
      id: "main-line",
      where: { kind: "pipe" },
      geometryTypes: ["LineString"],
    },
  ],
});
```

- [ ] **Step 2: 替换期望 layerId**

把同一个测试里的期望改为：

```ts
expect(layers[0]).toMatchObject({
  type: "line",
  layerId: "pipe-source-main-line",
  where: { kind: "pipe" },
  geometryTypes: ["LineString"],
  propertyPolicy: { fixedKeys: ["id"] },
});
```

- [ ] **Step 3: 增加 source 内 id 清理测试**

在 createLayerGroup 测试后新增：

```ts
it("createLayerGroup 会去除 sourceId 和逻辑 layer id 两侧空白后生成 layerId", async () => {
  const businessPreset = await loadBusinessPreset();
  const { createLayerGroup } = businessPreset;
  const layers = createLayerGroup({
    sourceId: " road-source ",
    layers: [
      {
        type: "circle",
        id: " point ",
      },
    ],
  });

  expect(layers[0].layerId).toBe("road-source-point");
});
```

- [ ] **Step 4: 增加非法 id 失败测试**

继续新增：

```ts
it("createLayerGroup 遇到空 sourceId 或空逻辑 layer id 时会直接报错", async () => {
  const businessPreset = await loadBusinessPreset();
  const { createLayerGroup } = businessPreset;

  expect(() => {
    createLayerGroup({
      sourceId: " ",
      layers: [{ type: "circle", id: "point" }],
    });
  }).toThrowError("[createLayerGroup] sourceId 不能为空");

  expect(() => {
    createLayerGroup({
      sourceId: "road-source",
      layers: [{ type: "circle", id: " " }],
    });
  }).toThrowError("[createLayerGroup] layer id 不能为空");
});
```

- [ ] **Step 5: 运行失败测试**

Run:

```powershell
npx vitest run src/MapLibre/facades/businessPreset.spec.ts
```

Expected: FAIL，错误包含 `sourceId` 类型缺失或期望 `pipe-source-main-line` 但收到 `main-line`。

---

### Task 4: 实现 createLayerGroup({ sourceId })

**Files:**

- Modify: `src/MapLibre/facades/businessPreset.ts`

- [ ] **Step 1: 扩展 LayerGroupOptions**

把 `LayerGroupOptions` 改为：

```ts
/** 图层组创建配置。 */
export interface LayerGroupOptions {
  /** 当前图层组所属业务 source ID，用于统一生成全局唯一 layerId。 */
  sourceId: string;
  /** 子图层默认属性治理规则。 */
  defaultPolicy?: MapFeaturePropertyPolicy;
  /** 子图层默认样式。 */
  defaultStyle?: MapBusinessLayerDescriptor["style"];
  /** 子图层声明列表。 */
  layers: LayerGroupItem[];
}
```

- [ ] **Step 2: 增加 id 归一化函数**

在 `createLayerBase()` 前新增：

```ts
/**
 * 清理 createLayerGroup 的 ID 输入。
 * @param value 原始 ID
 * @param label 错误提示名称
 * @returns 去除两侧空白后的 ID
 */
function normalizeLayerGroupId(
  value: string,
  label: "sourceId" | "layer id",
): string {
  const normalizedId = value.trim();

  if (!normalizedId) {
    throw new Error(`[createLayerGroup] ${label} 不能为空`);
  }

  return normalizedId;
}
```

- [ ] **Step 3: 更新 createLayerBase**

把 `createLayerBase()` 改为：

```ts
/**
 * 合并图层组中的默认配置与子图层配置。
 * @param sourceId 当前业务 source ID
 * @param options 图层组配置
 * @param item 子图层配置
 * @returns 标准业务图层描述对象公共字段
 */
function createLayerBase(
  sourceId: string,
  options: LayerGroupOptions,
  item: LayerGroupItem,
) {
  const layerId = normalizeLayerGroupId(item.id, "layer id");

  return {
    layerId: `${sourceId}-${layerId}`,
    propertyPolicy: item.policy || options.defaultPolicy,
    style: item.style || options.defaultStyle,
    geometryTypes: item.geometryTypes,
    where: item.where,
    filter: item.filter,
    interactive: item.interactive,
  };
}
```

- [ ] **Step 4: 更新 createLayerGroup**

把 `createLayerGroup()` 改为：

```ts
/**
 * 创建业务图层组。
 * @param options 图层组配置
 * @returns 标准业务图层描述数组
 */
export function createLayerGroup(
  options: LayerGroupOptions,
): MapBusinessLayerDescriptor[] {
  const sourceId = normalizeLayerGroupId(options.sourceId, "sourceId");

  return options.layers.map((item) => {
    const base = createLayerBase(sourceId, options, item);

    switch (item.type) {
      case "line":
        return createLineBusinessLayer(
          base as Parameters<typeof createLineBusinessLayer>[0],
        );
      case "fill":
        return createFillBusinessLayer(
          base as Parameters<typeof createFillBusinessLayer>[0],
        );
      case "symbol":
        return createSymbolBusinessLayer(
          base as Parameters<typeof createSymbolBusinessLayer>[0],
        );
      case "circle":
      default:
        return createCircleBusinessLayer(
          base as Parameters<typeof createCircleBusinessLayer>[0],
        );
    }
  });
}
```

- [ ] **Step 5: 跑 createLayerGroup 定向测试**

Run:

```powershell
npx vitest run src/MapLibre/facades/businessPreset.spec.ts
```

Expected: 仍可能因为其他测试使用旧 registry 写法失败；createLayerGroup 相关测试应通过。

---

### Task 5: 迁移测试中的 registry 和 createLayerGroup 调用

**Files:**

- Modify: `src/MapLibre/facades/businessPreset.spec.ts`
- Modify: `src/MapLibre/facades/useBusinessMap.spec.ts`
- Modify: `src/MapLibre/facades/useMapFeatureActions.spec.ts`
- Modify: `src/MapLibre/facades/useMapFeaturePropertyEditor.spec.ts`
- Modify: `src/MapLibre/facades/useMapFeatureQuery.spec.ts`
- Modify: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`
- Modify: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.spec.ts`
- Modify: `src/MapLibre/plugins/map-dxf-export/useMapDxfExportPlugin.spec.ts`
- Modify: `src/MapLibre/exporters/dxf/exportBusinessSourcesToDxf.spec.ts`

- [ ] **Step 1: 批量定位旧 registry 写法**

Run:

```powershell
rg "createMapBusinessSourceRegistry\\(\\[" src
```

Expected: 输出所有仍使用数组初始化的测试和源码位置。

- [ ] **Step 2: 迁移单 source registry 写法**

把这种写法：

```ts
const sourceRegistry = createMapBusinessSourceRegistry([source]);
```

改为：

```ts
const sourceRegistry = createMapBusinessSourceRegistry();
sourceRegistry.addSource(source);
```

- [ ] **Step 3: 迁移多 source registry 写法**

把这种写法：

```ts
const sourceRegistry = createMapBusinessSourceRegistry([sourceA, sourceB]);
```

改为：

```ts
const sourceRegistry = createMapBusinessSourceRegistry();
sourceRegistry.setSources([sourceA, sourceB]);
```

- [ ] **Step 4: 迁移空 registry 写法**

把这种写法：

```ts
const sourceRegistry = createMapBusinessSourceRegistry([]);
```

改为：

```ts
const sourceRegistry = createMapBusinessSourceRegistry();
```

- [ ] **Step 5: 迁移测试中的 createLayerGroup 调用**

把所有 `createLayerGroup({` 补上当前 source ID，例如：

```ts
const layers = createLayerGroup({
  sourceId: "pipe-source",
  defaultPolicy: { fixedKeys: ["id"] },
  layers: [
    {
      type: "line",
      id: "main-line",
    },
  ],
});
```

并同步更新断言里的 layerId 为 `${sourceId}-${id}`。

- [ ] **Step 6: 验证旧写法已清空**

Run:

```powershell
rg "createMapBusinessSourceRegistry\\(\\[" src
rg "createMapBusinessSourceRegistry\\(\\[\\]" src
rg "createLayerGroup\\(\\{\\s*$" src
```

Expected: 前两个命令无输出；第三个命令若有输出，逐个确认附近配置已包含 `sourceId`。

- [ ] **Step 7: 跑相关测试**

Run:

```powershell
npx vitest run src/MapLibre/facades/createMapBusinessSource.spec.ts src/MapLibre/facades/businessPreset.spec.ts src/MapLibre/facades/useBusinessMap.spec.ts src/MapLibre/facades/useMapFeatureActions.spec.ts src/MapLibre/facades/useMapFeaturePropertyEditor.spec.ts src/MapLibre/facades/useMapFeatureQuery.spec.ts src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.spec.ts src/MapLibre/plugins/map-dxf-export/useMapDxfExportPlugin.spec.ts src/MapLibre/exporters/dxf/exportBusinessSourcesToDxf.spec.ts
```

Expected: PASS。

---

### Task 6: 更新示例共享 Kit

**Files:**

- Modify: `examples/views/NG/GI/nggi-example.shared.ts`

- [ ] **Step 1: 更新 createExampleLayers 签名**

把函数签名改为：

```ts
/**
 * 创建示例业务图层。
 * @param sourceId 当前业务 source ID
 * @returns 业务图层描述数组
 */
export function createExampleLayers(
  sourceId: string = EXAMPLE_SOURCE_ID
): MapBusinessLayerDescriptor[] {
```

- [ ] **Step 2: 在 createLayerGroup 中传 sourceId**

把 `return createLayerGroup({` 改为：

```ts
return createLayerGroup({
  sourceId,
  defaultPolicy: {
    readonlyKeys: ["id"],
    fixedKeys: ["name", "status"],
    removableKeys: ["editable"],
  },
  layers: [
```

- [ ] **Step 3: 更新共享 layer 常量语义**

把三个常量改成生成后的完整 layerId：

```ts
export const EXAMPLE_POINT_LAYER_ID = `${EXAMPLE_SOURCE_ID}-point`;
export const EXAMPLE_LINE_LAYER_ID = `${EXAMPLE_SOURCE_ID}-line`;
export const EXAMPLE_FILL_LAYER_ID = `${EXAMPLE_SOURCE_ID}-fill`;
```

同时把 `createExampleLayers()` 内部三个 item 的 `id` 改为逻辑名：

```ts
id: "fill";
id: "line";
id: "point";
```

- [ ] **Step 4: 更新 registry 创建写法**

把 `createExampleSourceKit()` 内：

```ts
const registry = createMapBusinessSourceRegistry([source]);
```

改为：

```ts
const registry = createMapBusinessSourceRegistry();
registry.addSource(source);
```

- [ ] **Step 5: 确认共享示例使用公开入口不变**

Run:

```powershell
rg "from \"vue-maplibre-kit" examples/views/NG/GI/nggi-example.shared.ts
```

Expected: 仍只从 `vue-maplibre-kit/business` 等公开入口导入，不引入 `src/MapLibre/**`。

---

### Task 7: 更新 NGGI01 与 NGGI00 示例

**Files:**

- Modify: `examples/views/NG/GI/NGGI01.vue`
- Modify: `examples/views/NG/GI/NGGI00.vue`

- [ ] **Step 1: 更新 NGGI01 的说明注释**

把 `NGGI01.vue` 中描述“这些 ID 直接写在页面里”的注释调整为：

```ts
// sourceId 是全局 source 标识；createLayerGroup 内的 id 是 source 内逻辑图层名。
// 最终 layerId 由库统一生成为 `${sourceId}-${id}`，避免多 source 页面手写拼接。
```

- [ ] **Step 2: 更新 NGGI01 的 createLayerGroup 调用**

把 `createLayerGroup({` 改为：

```ts
const layers = createLayerGroup({
  sourceId: EXAMPLE_SOURCE_ID,
  defaultPolicy: {
```

并把 item 的 `id` 改为 `fill`、`line`、`point`。若页面展示完整 layerId，使用 `layers.map((layer) => layer.layerId)`。

- [ ] **Step 3: 更新 NGGI01 的 registry 写法**

把数组初始化替换为：

```ts
const registry = createMapBusinessSourceRegistry();
registry.addSource(source);
```

- [ ] **Step 4: 更新 NGGI00 的 registry 写法**

把 `businessSourceRegistry` 的数组初始化替换为：

```ts
const businessSourceRegistry = createMapBusinessSourceRegistry();
businessSourceRegistry.setSources([
  businessSource,
  // 保留当前页面已有的其他 source
]);
```

实际迁移时必须复制当前数组里的全部 source 变量，不要新增或删除示例 source。

- [ ] **Step 5: 更新 NGGI00 中的 createLayerGroup 调用**

所有 `createLayerGroup({` 都补上对应 `sourceId`。若当前 item 的 `id` 已经是完整 layerId，改为逻辑 id，并同步更新引用这个 layerId 的常量，保证运行期使用的仍是生成后的完整 layerId。

- [ ] **Step 6: 运行示例类型检查前的旧写法搜索**

Run:

```powershell
rg "createMapBusinessSourceRegistry\\(\\[" examples/views/NG/GI
rg "createLayerGroup\\(" examples/views/NG/GI
```

Expected: 第一条无输出；第二条逐个确认传入对象都包含 `sourceId`。

---

### Task 8: 增加动态 source 和 layer 示例

**Files:**

- Modify: `examples/views/NG/GI/NGGI02.vue`

- [ ] **Step 1: 在模板增加动态按钮**

在现有按钮区增加两个按钮：

```vue
<button type="button" @click="addSource">动态新增 source</button>
<button type="button" @click="addLayer">动态新增 layer</button>
```

按钮文案用于示例页面，不写长段功能说明。

- [ ] **Step 2: 将 layers 改为响应式输入**

把原来的普通 `layers` 改为：

```ts
const layers = shallowRef(createExampleLayers(EXAMPLE_SOURCE_ID));
```

如果文件尚未导入 `shallowRef`，从 `vue` 补充导入。

- [ ] **Step 3: 让 source 使用响应式 layers**

创建 source 时传入：

```ts
layers,
```

不要传 `layers.value`，否则后续新增 layer 不会被 `source.getLayers()` 追踪。

- [ ] **Step 4: 增加动态 source 构建函数**

在 `<script setup>` 中新增：

```ts
/**
 * 创建动态 source 的业务数据。
 * @param index 动态 source 序号
 * @returns 动态 source 数据
 */
function createDynamicData(index: number): MapCommonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      createPointFeature(
        `dynamic-point-${index}`,
        `动态点 ${index}`,
        index - 2,
        1.6,
      ),
      createLineFeature(`dynamic-line-${index}`, `动态线 ${index}`, [
        [index - 2.4, 1.1],
        [index - 1.6, 1.5],
      ]),
    ],
  };
}
```

- [ ] **Step 5: 增加 addSource 动作**

新增：

```ts
let dynamicSourceCount = 0;

/**
 * 动态新增一个业务 source，并同步交给 registry。
 */
function addSource(): void {
  dynamicSourceCount += 1;
  const sourceId = `nggi-dynamic-source-${dynamicSourceCount}`;
  const data = ref(createDynamicData(dynamicSourceCount));
  const sourceLayers = createExampleLayers(sourceId);
  const source = createMapBusinessSource({
    sourceId,
    data,
    promoteId: "id",
    layers: sourceLayers,
  });

  kit.registry.addSource(source);
}
```

- [ ] **Step 6: 增加 addLayer 动作**

新增：

```ts
let dynamicLayerCount = 0;

/**
 * 动态新增当前主 source 的图层声明。
 */
function addLayer(): void {
  dynamicLayerCount += 1;
  layers.value = [
    ...layers.value,
    ...createLayerGroup({
      sourceId: EXAMPLE_SOURCE_ID,
      layers: [
        {
          type: "circle",
          id: `dynamic-point-${dynamicLayerCount}`,
          geometryTypes: ["Point", "MultiPoint"],
          style: createSimpleCircleStyle({
            color: "#7c3aed",
            radius: 4 + dynamicLayerCount,
            strokeColor: "#ffffff",
            strokeWidth: 1,
          }),
        },
      ],
    }),
  ];
}
```

这里 `4 + dynamicLayerCount` 是示例半径递增值，必须保留行间注释说明它只用于让新增图层在视觉上可区分。

- [ ] **Step 7: 模板渲染 registry 中全部 source**

把单个 source 渲染改为：

```vue
<MapBusinessSourceLayers
  v-for="source in kit.registry.listSources()"
  :key="source.sourceId"
  :source="source"
/>
```

如果主 source 的模板原来显式传 `:layers="layers"`，动态 layer 改造后应优先依赖 `source.getLayers()`，避免同一页面两套 layer 输入。

- [ ] **Step 8: 运行示例相关类型检查**

Run:

```powershell
npm run ts:check
```

Expected: PASS。

---

### Task 9: 更新知识库和 API 文档

**Files:**

- Modify: `docs/vue-maplibre-kit-knowledge/04-业务数据源/02-createMapBusinessSourceRegistry.md`
- Modify: `docs/vue-maplibre-kit-knowledge/04-业务数据源/03-MapBusinessSourceLayers.md`
- Modify: `docs/vue-maplibre-kit-knowledge/05-业务图层/02-createLayerGroup.md`
- Modify: `docs/vue-maplibre-kit-knowledge/12-命令式能力/01-useBusinessMap总览.md`
- Modify: `docs/vue-maplibre-kit-knowledge/15-API参考/01-business-api.md`
- Modify: `docs/vue-maplibre-kit-knowledge/14-示例索引/02-按功能查示例.md`
- Modify: `docs/problem-record.md`

- [ ] **Step 1: 重写 registry 基本写法**

把 `02-createMapBusinessSourceRegistry.md` 中：

```ts
const registry = createMapBusinessSourceRegistry([source]);
```

替换为：

```ts
const registry = createMapBusinessSourceRegistry();
registry.addSource(source);
```

并新增批量异步示例：

```ts
const registry = createMapBusinessSourceRegistry();

const ids = await getSourceIds();
const sources = await Promise.all(
  ids.map(async (id) => {
    const sourceId = `business-source-${id}`;
    const data = shallowRef(await getSource(id));

    return createMapBusinessSource({
      sourceId,
      data,
      promoteId: "id",
      layers: createLayerGroup({
        sourceId,
        layers: [{ id: "line", type: "line" }],
      }),
    });
  }),
);

registry.setSources(sources);
```

- [ ] **Step 2: 更新 registry 方法表**

在方法表中加入：

```md
| `addSource(source)` | 动态新增单个业务 source |
| `setSources(sources)` | 批量替换当前业务 source 列表 |
| `removeSource(sourceId)` | 删除指定业务 source |
| `clearSources()` | 清空全部业务 source |
```

并删除任何“创建时传数组”的说明。

- [ ] **Step 3: 更新 MapBusinessSourceLayers 文档**

补充动态渲染示例：

```vue
<MapBusinessSourceLayers
  v-for="source in sourceRegistry.listSources()"
  :key="source.sourceId"
  :source="source"
/>
```

说明：动态新增 source 后由 registry 驱动渲染；动态新增 layer 时让 `createMapBusinessSource({ layers })` 接收 `ref/computed/getter`，并替换数组触发更新。

- [ ] **Step 4: 重写 createLayerGroup 文档**

把示例更新为：

```ts
const layers = createLayerGroup({
  sourceId: "pipe-source",
  defaultPolicy: { readonlyKeys: ["id"] },
  layers: [
    { id: "line", type: "line" },
    { id: "point", type: "circle" },
  ],
});
```

明确写出生成的 layerId：

```ts
pipe - source - line;
pipe - source - point;
```

- [ ] **Step 5: 更新 useBusinessMap 总览**

把所有 `createMapBusinessSourceRegistry([])` 替换为：

```ts
const sourceRegistry = createMapBusinessSourceRegistry();
```

轻量页面说明保留，但不再提旧数组空写法。

- [ ] **Step 6: 更新 API 参考**

在 `15-API参考/01-business-api.md` 中更新：

```md
| `createMapBusinessSourceRegistry` | 函数 | 创建可动态维护的业务 source 注册表 | 推荐 |
| `createLayerGroup` | 函数 | 按 sourceId 批量创建全局唯一业务图层 | 推荐 |
```

- [ ] **Step 7: 更新示例索引**

在 `14-示例索引/02-按功能查示例.md` 中把 NGGI02 标记为“动态 source/layer 示例”。

- [ ] **Step 8: 更新问题记录**

在 `docs/problem-record.md` 追加一条记录，内容包括：

```md
## 2026-05-11 动态业务 source 与 layer 声明边界

- 现象：业务 source 数量可能由接口动态决定，旧的 `createMapBusinessSourceRegistry([source])` 容易把 registry 理解成一次性静态列表。
- 处理：registry 收敛为 `createMapBusinessSourceRegistry()` 空初始化，再通过 `addSource/setSources/removeSource/clearSources` 动态维护。
- 边界：动态 source 由 registry 管理；动态 layer 由 `createMapBusinessSource({ layers: ref/computed/getter })` 管理，不再新增第二套 layer registry。
- 文档：`createLayerGroup({ sourceId })` 负责统一生成 `${sourceId}-${id}`，`id` 是 source 内逻辑图层名。
```

- [ ] **Step 9: 搜索并清理旧方法**

Run:

```powershell
rg "createMapBusinessSourceRegistry\\(\\[" docs/vue-maplibre-kit-knowledge examples src
rg "createMapBusinessSourceRegistry\\(\\[\\]" docs/vue-maplibre-kit-knowledge examples src
```

Expected: 无输出。若输出来自审查报告或历史说明，本轮不强改；若输出来自知识库、示例、源码，必须迁移。

---

### Task 10: 完整自检

**Files:**

- No direct edits unless verification exposes failures.

- [ ] **Step 1: 运行格式空白检查**

Run:

```powershell
git diff --check
```

Expected: 无输出。

- [ ] **Step 2: 运行 TypeScript 检查**

Run:

```powershell
npm run ts:check
```

Expected: PASS。

- [ ] **Step 3: 运行全量测试**

Run:

```powershell
npm test
```

Expected: PASS。若单个用例 timeout，先单文件重跑，再再次全量重跑确认是否为偶发。

- [ ] **Step 4: 搜索公开入口和文档一致性**

Run:

```powershell
rg "createMapBusinessSourceRegistry\\(\\[" src examples docs/vue-maplibre-kit-knowledge
rg "createMapBusinessSourceRegistry\\(\\[\\]" src examples docs/vue-maplibre-kit-knowledge
rg "createLayerGroup\\(" src examples docs/vue-maplibre-kit-knowledge
```

Expected: 前两条无输出；第三条逐个确认新写法都包含 `sourceId`，或是文档中用于说明函数名的非代码文本。

- [ ] **Step 5: 检查工作区差异**

Run:

```powershell
git status --short
git diff --stat
```

Expected: 只包含本计划列出的源码、示例、知识库和问题记录变更；不要混入无关文件。

---

## Self-Review

- Spec coverage: 动态新增、批量替换、删除、清空 source 已覆盖 Task 1-2；`createLayerGroup({ sourceId })` 新语义已覆盖 Task 3-4；测试迁移、示例动态 source/layer、知识库更新和完整自检分别覆盖 Task 5-10。
- Placeholder scan: 本计划没有待补内容标记；需要复制现有数组内容的 NGGI00 步骤明确要求保留当前已有 source，不允许新增或删除示例 source。
- Type consistency: 统一使用 `addSource/setSources/removeSource/clearSources`；`createLayerGroup` 只新增 `sourceId`，不引入新的平行 helper。
