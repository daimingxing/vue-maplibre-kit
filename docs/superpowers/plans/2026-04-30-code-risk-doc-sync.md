# 代码风险修复与知识库同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复已确认的代码风险，同步更新知识库，并把已确认不改的设计边界写入注释和文档，避免后续审查重复误报。

**Architecture:** 本轮只处理会影响外部项目消费的门面契约和插件预设行为，不重构 TerraDraw 控件生命周期、不新增插件诊断 API、不改变插件宿主的顶层引用监听策略。代码改动先用最小失败测试锁定，再实现最小修复；文档改动紧跟代码契约，优先修可复制示例和 API 参考。

**Tech Stack:** Vue 3、TypeScript、Vitest、MapLibre GL JS、GeoJSON、项目现有业务门面与插件系统。

---

## 文件结构

- Modify: `src/MapLibre/facades/businessPreset.spec.ts`
  - 增加 intersection 预设校验用例：`getCandidates` 高级模式可独立成立；自动模式必须有 `sourceRegistry`。
- Modify: `src/MapLibre/facades/businessPreset.ts`
  - 调整 `resolveIntersectionOptions()` 校验逻辑与错误信息。
- Modify: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.ts`
  - 自动候选提取支持把 `MultiLineString` 拆成多条 `LineString` 候选。
- Modify: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`
  - 增加自动候选里 `MultiLineString` 能参与交点计算的覆盖，或在插件级测试中覆盖候选提取。
- Modify: `src/MapLibre/facades/createMapBusinessSource.spec.ts`
  - 增加 `replaceFeatures()` 在缺失 ID / 重复 ID 时返回 `false` 且不提交快照的测试。
- Modify: `src/MapLibre/facades/createMapBusinessSource.ts`
  - `replaceFeatures()` 校验失败时不提交无效快照。
- Modify: `src/MapLibre/facades/useMapLayerActions.spec.ts`
  - 增加 `addGeoJsonSource()`、`addLayer()`、`removeLayer()`、`removeSource()` 原生异常转结构化失败的测试。
- Modify: `src/MapLibre/facades/useMapLayerActions.ts`
  - 用 `try/catch` 包裹 MapLibre 原生 source/layer 动作，返回 `MapLayerActionResult`。
- Modify: `src/MapLibre/core/useTerradrawControlLifecycle.ts`
  - 保留现有行为，只补充更明确的函数级/行间注释。
- Modify: `src/MapLibre/core/useMapPluginHost.ts`
  - 保留插件初始化失败隔离策略和顶层引用监听策略，只补充说明原因。
- Modify: `docs/vue-maplibre-kit-knowledge/**`
  - 同步 `useBusinessMap({ mapRef, sourceRegistry })`、六插件、`polygonEdge`、`NGGI12`、`resetMapGlobalConfig`、动态插件配置与 TerraDraw 构造期配置契约。
- Modify: `docs/审查报告/01-代码风险与隐患审查报告.md`
  - 标注本轮已修复、已确认不改、已过期的审查项。
- Modify: `docs/审查报告/03-知识库文档审查报告.md`
  - 标注本轮知识库修复状态。
- Modify: `docs/problem-record.md`
  - 记录本轮踩坑与设计边界。

---

### Task 1: intersection 预设校验

**Files:**
- Modify: `src/MapLibre/facades/businessPreset.spec.ts`
- Modify: `src/MapLibre/facades/businessPreset.ts`

- [ ] **Step 1: 写失败测试，覆盖 getCandidates 高级模式**

在 `src/MapLibre/facades/businessPreset.spec.ts` 的 intersection 相关用例附近新增：

```ts
  it('intersection 使用 getCandidates 高级模式时不强制要求目标范围和 sourceRegistry', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const getCandidates = () => [];

    const plugins = createBusinessPlugins({
      intersection: {
        getCandidates,
      },
    });

    expect(plugins).toHaveLength(1);
    expect(plugins[0].type).toBe('intersectionPreview');
    expect((plugins[0].options as any).getCandidates).toBe(getCandidates);
    expect((plugins[0].options as any).targetSourceIds).toEqual([]);
  });
```

- [ ] **Step 2: 写失败测试，覆盖自动模式缺少 sourceRegistry**

把当前“缺少目标范围”测试改成两条明确契约：

```ts
  it('intersection 自动模式缺少目标范围时应提示补充 targetSourceIds 或 targetLayerIds', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const sourceRegistry = createMapBusinessSourceRegistry([]);

    expect(() =>
      createBusinessPlugins({
        sourceRegistry,
        intersection: {} as any,
      })
    ).toThrow('createBusinessPlugins({ intersection }) 自动模式需要 targetSourceIds 或 targetLayerIds');
  });

  it('intersection 自动模式缺少 sourceRegistry 时应提示补充数据来源', async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;

    expect(() =>
      createBusinessPlugins({
        intersection: {
          targetLayerIds: ['pipe-line'],
        },
      })
    ).toThrow('createBusinessPlugins({ intersection }) 自动模式需要 sourceRegistry；高级模式请改用 getCandidates');
  });
```

- [ ] **Step 3: 运行目标测试确认失败**

Run:

```powershell
npm test -- src/MapLibre/facades/businessPreset.spec.ts
```

Expected: 新增 `getCandidates` 用例因旧校验失败；自动模式缺 `sourceRegistry` 用例因旧逻辑未抛错失败。

- [ ] **Step 4: 修改 `resolveIntersectionOptions()`**

在 `src/MapLibre/facades/businessPreset.ts` 中替换 `resolveIntersectionOptions()`：

```ts
/**
 * 解析交点插件预设配置。
 * @param context 当前业务插件预设总配置
 * @param options 交点插件局部配置
 * @returns 标准交点插件配置
 */
function resolveIntersectionOptions(
  context: BusinessPluginsOptions,
  options: BusinessIntersectionPresetOptions
): IntersectionPreviewOptions {
  const hasTargetScope = Boolean(options.targetSourceIds?.length || options.targetLayerIds?.length);
  const hasCustomCandidates = typeof options.getCandidates === 'function';
  const sourceRegistry = options.sourceRegistry || context.sourceRegistry;

  if (!hasTargetScope && !hasCustomCandidates) {
    throw new Error(
      'createBusinessPlugins({ intersection }) 自动模式需要 targetSourceIds 或 targetLayerIds'
    );
  }

  if (!hasCustomCandidates && !sourceRegistry) {
    throw new Error(
      'createBusinessPlugins({ intersection }) 自动模式需要 sourceRegistry；高级模式请改用 getCandidates'
    );
  }

  return {
    ...options,
    targetSourceIds: options.targetSourceIds || [],
    sourceRegistry,
  };
}
```

- [ ] **Step 5: 运行目标测试确认通过**

Run:

```powershell
npm test -- src/MapLibre/facades/businessPreset.spec.ts
```

Expected: PASS。

---

### Task 2: intersection 自动模式支持 MultiLineString

**Files:**
- Modify: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.ts`
- Modify: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`

- [ ] **Step 1: 写失败测试**

优先在现有交点控制器或插件测试里补覆盖。如果直接测试控制器更简单，在 `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts` 新增一个包含 `MultiLineString` 拆分后的候选输入用例，先锁定交点算法接受多条候选线：

```ts
  it('应支持 MultiLineString 拆分后的候选线参与交点计算', () => {
    const controller = createController({
      getCandidates: () => [
        {
          sourceId: 'business-source',
          layerId: 'multi-line-layer',
          featureId: 'multi-line-1',
          feature: {
            type: 'Feature',
            id: 'multi-line-1',
            properties: { id: 'multi-line-1' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [0, 0],
                [10, 10],
              ],
            },
          },
        },
        {
          sourceId: 'business-source',
          layerId: 'multi-line-layer',
          featureId: 'line-2',
          feature: {
            type: 'Feature',
            id: 'line-2',
            properties: { id: 'line-2' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [0, 10],
                [10, 0],
              ],
            },
          },
        },
      ],
    });

    controller.refresh();

    expect(controller.featureCount.value).toBe(1);
  });
```

如果现有 helper 名称不是 `createController`，按文件中真实 helper 调整，不新增重复工具函数。

- [ ] **Step 2: 运行目标测试确认当前覆盖基础可用**

Run:

```powershell
npm test -- src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts
```

Expected: 现有控制器测试通过；如果新增用例本身已经通过，继续在插件候选提取层补更直接测试或用 Task 2 Step 3 实现后由集成行为覆盖。

- [ ] **Step 3: 增加 MultiLineString 拆分函数**

在 `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.ts` 的候选提取工具附近新增：

```ts
/**
 * 将业务线要素拆成自动求交候选支持的 LineString 要素。
 * @param feature 当前业务要素
 * @returns 可参与求交计算的线要素列表
 */
function toLineCandidateFeatures(feature: MapCommonFeature): MapCommonLineFeature[] {
  if (feature.geometry?.type === 'LineString') {
    return [feature as MapCommonLineFeature];
  }

  if (feature.geometry?.type !== 'MultiLineString') {
    return [];
  }

  return feature.geometry.coordinates.map((coordinates, index) => ({
    ...feature,
    id: feature.id === undefined ? feature.id : `${String(feature.id)}::${index}`,
    properties: {
      ...(feature.properties || {}),
      multiLineIndex: index,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  })) as MapCommonLineFeature[];
}
```

- [ ] **Step 4: 替换自动候选过滤逻辑**

把 `buildCandidatesFromSourceRegistry()` 中当前只接收 `LineString` 的 `features: ...filter(...)` 替换为：

```ts
              features: (sourceData.features || []).flatMap((feature) => {
                if (!matchesLayerWhere(feature as MapCommonFeature, layer)) {
                  return [];
                }

                return toLineCandidateFeatures(feature as MapCommonFeature);
              }) as MapCommonLineFeature[],
```

- [ ] **Step 5: 运行交点相关测试**

Run:

```powershell
npm test -- src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts src/MapLibre/facades/businessPreset.spec.ts
```

Expected: PASS。

---

### Task 3: replaceFeatures 校验失败不提交快照

**Files:**
- Modify: `src/MapLibre/facades/createMapBusinessSource.spec.ts`
- Modify: `src/MapLibre/facades/createMapBusinessSource.ts`

- [ ] **Step 1: 写失败测试**

在 `src/MapLibre/facades/createMapBusinessSource.spec.ts` 中新增：

```ts
  it('replaceFeatures 遇到重复业务 ID 时应返回 false 且保留旧快照', () => {
    const source = createMapBusinessSource({
      sourceId: 'business-replace',
      promoteId: 'id',
      data: ref({
        type: 'FeatureCollection',
        features: [
          createPointFeature('origin', {
            properties: { id: 'origin', name: '旧要素' },
          }),
        ],
      }),
      layers: ref([]),
    });

    const success = source.replaceFeatures([
      createPointFeature('dup-a', {
        properties: { id: 'dup', name: '重复 A' },
      }),
      createPointFeature('dup-b', {
        properties: { id: 'dup', name: '重复 B' },
      }),
    ]);

    expect(success).toBe(false);
    expect(source.resolveFeature('origin')?.feature.properties?.name).toBe('旧要素');
    expect(source.resolveFeature('dup')).toBeNull();
  });
```

- [ ] **Step 2: 运行目标测试确认失败**

Run:

```powershell
npm test -- src/MapLibre/facades/createMapBusinessSource.spec.ts
```

Expected: 新用例失败，表现为 `success` 仍是 `true` 或旧快照被替换。

- [ ] **Step 3: 修改 `replaceFeatures()`**

在 `src/MapLibre/facades/createMapBusinessSource.ts` 中替换 source 内部 `replaceFeatures()`：

```ts
  /**
   * 用最新要素数组整体替换当前 source。
   * @param nextFeatures 最新要素数组
   * @returns 是否写回成功
   */
  const replaceFeatures = (nextFeatures: MapCommonFeature[]): boolean => {
    const nextCollection = replaceFeatureCollectionFeatures(snapshotRef.value.featureCollection, nextFeatures);
    const normalizedSnapshot = normalizeBusinessSourceData(nextCollection, options);

    if (!normalizedSnapshot.valid) {
      console.warn(normalizedSnapshot.validationMessage);
      return false;
    }

    // replace 是业务层显式提交的最新结果，只在索引有效时写回，避免进入“看得见但查不到”的无效状态。
    commitSnapshot(normalizedSnapshot);
    return true;
  };
```

- [ ] **Step 4: 运行目标测试确认通过**

Run:

```powershell
npm test -- src/MapLibre/facades/createMapBusinessSource.spec.ts
```

Expected: PASS。

---

### Task 4: 运行时 source/layer 动作异常结构化

**Files:**
- Modify: `src/MapLibre/facades/useMapLayerActions.spec.ts`
- Modify: `src/MapLibre/facades/useMapLayerActions.ts`

- [ ] **Step 1: 写失败测试**

在 `src/MapLibre/facades/useMapLayerActions.spec.ts` 新增：

```ts
  it('应把 MapLibre 原生 source 和 layer 异常转换为结构化失败结果', () => {
    const rawMap = {
      getLayer: vi.fn((layerId: string) => (layerId === 'runtime-layer' ? { id: layerId } : null)),
      getSource: vi.fn((sourceId: string) => (sourceId === 'runtime-source' ? { id: sourceId } : null)),
      addSource: vi.fn(() => {
        throw new Error('style is not done loading');
      }),
      addLayer: vi.fn(() => {
        throw new Error('layer spec is invalid');
      }),
      removeLayer: vi.fn(() => {
        throw new Error('layer is locked');
      }),
      removeSource: vi.fn(() => {
        throw new Error('Source is in use');
      }),
      setLayoutProperty: vi.fn(),
      setPaintProperty: vi.fn(),
    };
    const actions = useMapLayerActions(shallowRef(createMapExpose(rawMap)));
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    expect(actions.addGeoJsonSource('new-source', data).success).toBe(false);
    expect(actions.addGeoJsonSource('new-source', data).message).toContain('style is not done loading');
    expect(actions.addLayer({ id: 'new-layer', type: 'circle', source: 'runtime-source' }).success).toBe(false);
    expect(actions.removeLayer('runtime-layer').message).toContain('layer is locked');
    expect(actions.removeSource('runtime-source').message).toContain('Source is in use');
  });
```

- [ ] **Step 2: 运行目标测试确认失败**

Run:

```powershell
npm test -- src/MapLibre/facades/useMapLayerActions.spec.ts
```

Expected: 新用例因异常直接抛出而失败。

- [ ] **Step 3: 增加异常消息工具函数**

在 `src/MapLibre/facades/useMapLayerActions.ts` 中靠近 `createLayerActionResult()` 的位置新增：

```ts
/**
 * 把未知异常转换成业务层可展示的短消息。
 * @param error 原始异常
 * @returns 异常消息
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

- [ ] **Step 4: 包裹原生动作**

把四个原生调用改为同一风格：

```ts
      try {
        rawMap.addSource(sourceId, {
          ...options,
          type: 'geojson',
          data,
        });
        return createLayerActionResult(true, 'source 已添加');
      } catch (error) {
        return createLayerActionResult(false, `source 添加失败：${getErrorMessage(error)}`);
      }
```

```ts
      try {
        rawMap.addLayer(layer);
        return createLayerActionResult(true, '图层已添加');
      } catch (error) {
        return createLayerActionResult(false, `图层添加失败：${getErrorMessage(error)}`);
      }
```

```ts
      try {
        rawMap.removeLayer?.(layerId);
        return createLayerActionResult(true, '图层已移除');
      } catch (error) {
        return createLayerActionResult(false, `图层移除失败：${getErrorMessage(error)}`);
      }
```

```ts
      try {
        rawMap.removeSource?.(sourceId);
        return createLayerActionResult(true, 'source 已移除');
      } catch (error) {
        return createLayerActionResult(false, `source 移除失败：${getErrorMessage(error)}`);
      }
```

- [ ] **Step 5: 运行目标测试确认通过**

Run:

```powershell
npm test -- src/MapLibre/facades/useMapLayerActions.spec.ts
```

Expected: PASS。

---

### Task 5: 设计边界注释

**Files:**
- Modify: `src/MapLibre/core/useTerradrawControlLifecycle.ts`
- Modify: `src/MapLibre/core/useMapPluginHost.ts`
- Modify: `docs/problem-record.md`

- [ ] **Step 1: 强化 TerraDraw 构造期配置注释**

在 `src/MapLibre/core/useTerradrawControlLifecycle.ts` 的 `getControlMountWatchSource()` 注释中补充：

```ts
   * 这是明确的生命周期契约：position、modeOptions 和控件构造参数只在首次创建时读取。
   * 自动重建会清空临时绘制、测量和编辑状态；业务需要热切换大块配置时，应先保存数据再切换 isUse。
```

- [ ] **Step 2: 强化插件宿主隔离策略注释**

在 `src/MapLibre/core/useMapPluginHost.ts` 的 `createPluginRecord()` catch 前补充：

```ts
      // 插件初始化失败只跳过当前插件，避免单个业务插件拖垮整张地图。
      // 业务层可通过控制台错误和 businessMap.plugins.* 能力不可用来定位配置问题。
```

- [ ] **Step 3: 强化顶层引用监听注释**

在 `src/MapLibre/core/useMapPluginHost.ts` 的 `getDescriptorDependencies()` 注释中补充：

```ts
   * 动态配置请替换 descriptor/options 顶层引用，例如用 computed 重新调用 createBusinessPlugins()。
   * 不深度监听嵌套对象，是为了避免递归遍历函数配置和大对象造成额外开销。
```

- [ ] **Step 4: 记录到问题记录**

在 `docs/problem-record.md` 顶部新增：

```md
## 2026-04-30 代码风险修复与契约边界记录

- 问题：TerraDraw / Measure 的 `position`、`modeOptions` 和控件构造参数被审查反复识别为“配置变化不自动重建”。
- 处理：这不是本轮 bug。控件构造期配置只在首次创建时读取，避免自动重建清空临时绘制、测量和编辑状态；需要热切换时由业务侧保存数据后切换 `isUse` 或重新挂载。
- 问题：插件初始化失败会被宿主跳过，业务侧看到的是插件能力不可用。
- 处理：保留插件隔离策略，避免单插件拖垮地图；通过控制台错误和文档说明定位配置错误，暂不新增 diagnostics / onPluginError API。
- 问题：插件配置变更只按 descriptor/options 顶层引用触发同步。
- 处理：保留顶层引用监听策略；动态配置应使用 `computed(() => createBusinessPlugins(...))` 或替换 options 引用，不支持原地改写嵌套对象作为稳定契约。
```

---

### Task 6: 知识库同步

**Files:**
- Modify: `docs/vue-maplibre-kit-knowledge/index.md`
- Modify: `docs/vue-maplibre-kit-knowledge/02-公开入口/02-business业务入口.md`
- Modify: `docs/vue-maplibre-kit-knowledge/02-公开入口/03-plugins插件入口.md`
- Modify: `docs/vue-maplibre-kit-knowledge/02-公开入口/06-插件子路径.md`
- Modify: `docs/vue-maplibre-kit-knowledge/09-插件/index.md`
- Modify: `docs/vue-maplibre-kit-knowledge/09-插件/04-intersection交点.md`
- Modify: `docs/vue-maplibre-kit-knowledge/09-插件/08-polygonEdge面边线.md`
- Modify: `docs/vue-maplibre-kit-knowledge/11-全局配置/01-配置入口.md`
- Modify: `docs/vue-maplibre-kit-knowledge/11-全局配置/03-mapControls默认值.md`
- Modify: `docs/vue-maplibre-kit-knowledge/12-命令式能力/index.md`
- Modify: `docs/vue-maplibre-kit-knowledge/12-命令式能力/05-plugins命令.md`
- Modify: `docs/vue-maplibre-kit-knowledge/14-示例索引/index.md`
- Modify: `docs/vue-maplibre-kit-knowledge/14-示例索引/01-NGGI00到NGGI11.md`
- Modify: `docs/vue-maplibre-kit-knowledge/14-示例索引/02-按功能查示例.md`
- Modify: `docs/vue-maplibre-kit-knowledge/15-API参考/02-plugins-api.md`

- [ ] **Step 1: 修正 `useBusinessMap(mapRef)` 旧写法**

把所有旧写法替换为：

```ts
const businessMap = useBusinessMap({
  mapRef: () => mapRef.value,
  sourceRegistry: registry,
});
```

Run:

```powershell
rg -n "useBusinessMap\\(mapRef\\)" docs/vue-maplibre-kit-knowledge
```

Expected: 无输出。

- [ ] **Step 2: 修正插件数量和 polygonEdge**

把“五个插件 / 五个内置插件能力”改成“六个插件 / 六个内置插件能力”，插件顺序统一为：

```md
snap、lineDraft、intersection、polygonEdge、multiSelect、dxfExport
```

Run:

```powershell
rg -n "五个插件|五个业务插件|五个内置插件" docs/vue-maplibre-kit-knowledge
```

Expected: 无输出。

- [ ] **Step 3: 补充 polygonEdge API 参考**

在 `docs/vue-maplibre-kit-knowledge/15-API参考/02-plugins-api.md` 中补齐：

```md
| `polygonEdge` | `boolean \| PolygonEdgePreviewOptions` | 面边线预览插件配置 |
| `plugins.polygonEdge` | `UsePolygonEdgePreviewResult` | 面边线生成、高亮、选择和清理 |
| `vue-maplibre-kit/plugins/polygon-edge-preview` | 面边线预览插件、常量和高级类型 |
```

能力表至少包含：

```md
| `featureCount` | 当前临时边线数量 |
| `selectedEdgeId` | 当前选中的边线 ID |
| `generateFromFeature()` | 从指定面要素生成边线 |
| `generateFromSelected()` | 从当前选中面要素生成边线 |
| `clearHighlight()` | 清理高亮状态 |
| `getData()` | 读取边线 FeatureCollection |
| `clear()` | 清空边线 |
```

- [ ] **Step 4: 补充 NGGI12 示例索引**

在示例索引中增加：

```md
| `NGGI12` | polygonEdge 面边线、snap 联动和边线高亮 | `business`、`plugins` | 适合复制面边线流程 |
```

把 `NGGI00 到 NGGI11` 标题改为 `NGGI00 到 NGGI12`，或新增 `02-NGGI12.md` 后在索引中链接。

- [ ] **Step 5: 修复全局配置入口文本损坏**

在 `docs/vue-maplibre-kit-knowledge/11-全局配置/01-配置入口.md` 修复为：

```md
| `resetMapGlobalConfig()` | 清空当前全局配置 | 会回到空配置 |
```

Run:

```powershell
rg -n "esetMapGlobalConfig|```text|\\r" docs/vue-maplibre-kit-knowledge/11-全局配置/01-配置入口.md
```

Expected: 不再出现损坏函数名。

- [ ] **Step 6: 写明不改的契约边界**

在控件配置、插件总览或命令式能力章节补充：

```md
动态修改插件配置时，请替换 `descriptor/options` 顶层引用。推荐写法是 `computed(() => createBusinessPlugins(...))`，不要原地改写嵌套配置对象后期待宿主重新同步。
```

```md
TerraDraw / Measure 的 `position`、`modeOptions` 和底层控件构造参数只在控件首次创建时读取。自动重建会清空临时绘制、测量和编辑状态；业务需要切换这类配置时，应先保存数据，再切换 `isUse` 或重新挂载地图容器。
```

```md
插件初始化失败时，宿主会在控制台输出错误并跳过当前插件，避免单个插件拖垮地图。业务层如果发现 `businessMap.plugins.*` 能力不可用，应先检查插件注册配置和控制台错误。
```

```md
`generatedKind` 是生成要素公开元数据，可用于业务层区分 intersection、lineDraft、polygonEdge 等生成要素类型。常规业务逻辑优先依赖门面能力，不建议依赖具体 preview sourceId。
```

---

### Task 7: 审查报告回写

**Files:**
- Modify: `docs/审查报告/01-代码风险与隐患审查报告.md`
- Modify: `docs/审查报告/03-知识库文档审查报告.md`

- [ ] **Step 1: 回写代码风险报告状态**

在每个相关小节标题下追加状态行：

```md
状态：本轮修复。
```

用于 intersection 校验、MultiLineString、replaceFeatures、运行时 source/layer 异常。

对不改项追加：

```md
状态：已确认设计边界，本轮不改；已补充源码注释和知识库说明。
```

用于 TerraDraw 构造期配置、插件初始化失败隔离、插件配置顶层引用监听、generatedKind 公开元数据。

对已过期项追加：

```md
状态：当前代码已包含 `examples/**/*.spec.ts`，该风险已过期。
```

用于示例层测试范围。

- [ ] **Step 2: 回写知识库报告状态**

对已修复文档项追加：

```md
状态：本轮修复。
```

---

### Task 8: 全量验证

**Files:**
- No file changes.

- [ ] **Step 1: 搜索残留旧文案**

Run:

```powershell
rg -n "useBusinessMap\\(mapRef\\)|五个插件|五个业务插件|五个内置插件|NGGI00 到 NGGI11|esetMapGlobalConfig" docs/vue-maplibre-kit-knowledge docs/审查报告
```

Expected: 只允许审查报告历史描述中出现，并且附近必须有“状态”说明；知识库正文无旧文案。

- [ ] **Step 2: 运行目标测试**

Run:

```powershell
npm test -- src/MapLibre/facades/businessPreset.spec.ts src/MapLibre/facades/createMapBusinessSource.spec.ts src/MapLibre/facades/useMapLayerActions.spec.ts src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts
```

Expected: PASS。

- [ ] **Step 3: 运行全量测试**

Run:

```powershell
npm test
```

Expected: PASS。确认输出中包含 `examples/**/*.spec.ts` 相关测试或没有被排除。

- [ ] **Step 4: 运行 TypeScript 检查**

Run:

```powershell
npm run ts:check
```

Expected: PASS。

- [ ] **Step 5: 运行构建**

Run:

```powershell
npm run build
```

Expected: PASS。

---

## 自检清单

- [ ] 已修复 intersection 自动模式静默无候选风险。
- [ ] 已允许 intersection `getCandidates` 高级模式不伪造 target。
- [ ] 已让自动模式 `MultiLineString` 参与候选线计算。
- [ ] 已阻止 `replaceFeatures()` 提交无效快照。
- [ ] 已把 MapLibre 原生 source/layer 异常转换为结构化结果。
- [ ] 已把 TerraDraw 构造期配置不热更新写成明确契约。
- [ ] 已把插件初始化失败隔离策略写成明确契约。
- [ ] 已把插件配置顶层引用监听写成明确契约。
- [ ] 已确认 examples 测试范围在 `vitest.config.ts` 中包含 `examples/**/*.spec.ts`。
- [ ] 已把 `generatedKind` 定义为公开元数据，而不是内部字段泄露。
- [ ] 知识库可复制代码、插件数量、NGGI12、polygonEdge API、全局配置损坏文本已同步。
- [ ] 审查报告已回写状态，避免下轮重复提出已确认边界。
