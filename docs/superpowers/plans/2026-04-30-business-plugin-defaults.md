# 业务插件默认配置迭代实施计划

> **给执行代理的要求：** 实施本计划时必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项执行。步骤使用复选框语法跟踪进度。

**目标：** 统一业务插件全局默认值与页面局部配置的边界，让 `createBusinessPlugins()`、`config.plugins.*` 和知识库文档表达一致。

**架构：** 全局配置只负责“插件启用后的默认行为”，不负责插件是否注册或启用；页面局部配置负责运行期上下文、业务范围和交互回调。对全局支持的字段，统一按“插件内置默认值 -> 全局默认值 -> 页面局部配置”合并。

**技术栈：** Vue 3、TypeScript、Vitest、MapLibre GL JS、现有 `defineMapPlugin()` 插件体系。

**实施状态：** 已完成。源码、测试、知识库和审查报告已按本计划同步，验证命令 `npm run ts:check`、`npm test`、`npm run build` 均已通过。

---

## 文件结构

- 修改 `src/entries/config.ts`：调整全局插件配置类型，移除 `multiSelect.enabled`，扩展 `intersection` 默认行为字段。
- 修改 `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.ts`：让 `snap.intersection` 和 `snap.polygonEdge` 支持字段级局部覆写。
- 修改 `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.ts`：新增交点插件合并后配置读取，支持全局默认行为字段。
- 修改 `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.ts`：如有必要，改为读取合并后的交点配置，保持 `setScope()`、`show()`、`hide()` 热更新行为。
- 修改 `src/MapLibre/plugins/map-feature-multi-select/useMapFeatureMultiSelectService.ts`：移除对全局 `multiSelect.enabled` 的读取。
- 修改 `src/MapLibre/facades/businessPreset.ts`：增强 `createBusinessPlugins()` 顶层 `sourceRegistry`、`dxfExport: true`、DXF 扁平默认参数解析，并禁止 `intersection: true`。
- 修改 `src/MapLibre/facades/businessPreset.spec.ts`：覆盖业务预设新配置形状。
- 修改相关插件测试：覆盖全局默认值与局部逐字段覆写。
- 修改知识库和文档：
  - `docs/vue-maplibre-kit-knowledge/11-全局配置/04-plugins默认值.md`
  - `docs/vue-maplibre-kit-knowledge/11-全局配置/index.md`
  - `docs/vue-maplibre-kit-knowledge/15-API参考/03-config-api.md`
  - `docs/vue-maplibre-kit-knowledge/09-插件/index.md`
  - `docs/vue-maplibre-kit-knowledge/09-插件/01-插件注册总览.md`
  - `docs/vue-maplibre-kit-knowledge/09-插件/04-intersection交点.md`
  - `docs/vue-maplibre-kit-knowledge/09-插件/06-dxfExport导出DXF.md`
  - `docs/vue-maplibre-kit-knowledge/02-公开入口/04-config全局配置入口.md`
- 如遇到理解障碍、测试异常或实现取舍，更新 `docs/problem-record.md`。

---

### 任务 1：补齐配置类型边界

**文件：**
- 修改：`src/entries/config.ts`
- 测试：`src/MapLibre/facades/useBusinessMap.spec.ts` 或新增/更新现有配置入口断言

- [ ] **步骤 1：写失败测试**

在已有配置入口相关测试中增加断言，确认 `MapKitGlobalConfig.plugins` 文档型源码包含 `polygonEdge`，并确认 `multiSelect` 全局默认值不再包含插件级 `enabled`。如果现有测试只做字符串断言，按当前风格补充字符串断言即可。

示例断言：

```ts
expect(configEntrySource).toContain('polygonEdge?: PolygonEdgePreviewGlobalDefaults');
expect(configEntrySource).not.toContain('enabled?: boolean;\\n  /** 控件显示位置。 */\\n  position?: ControlPosition;');
```

运行：

```powershell
npx vitest run src/MapLibre/facades/useBusinessMap.spec.ts
```

预期：测试失败，提示当前 `multiSelect.enabled` 仍存在或文档断言未满足。

- [ ] **步骤 2：修改全局配置类型**

在 `MapFeatureMultiSelectGlobalDefaults` 中移除插件级 `enabled`，保留：

```ts
export interface MapFeatureMultiSelectGlobalDefaults {
  /** 控件显示位置。 */
  position?: ControlPosition;
  /** 退出多选后的处理策略。 */
  deactivateBehavior?: MapSelectionDeactivateBehavior;
  /** 是否允许使用 Esc 退出。 */
  closeOnEscape?: boolean;
}
```

扩展 `IntersectionPreviewGlobalDefaults`：

```ts
export interface IntersectionPreviewGlobalDefaults {
  /** 当前交点层默认是否可见。 */
  visible?: boolean;
  /** 点击预览交点时是否自动生成正式交点点要素。 */
  materializeOnClick?: boolean;
  /** 当前求交范围。 */
  scope?: IntersectionPreviewScope;
  /** 是否保留端点交点。 */
  includeEndpoint?: boolean;
  /** 交点坐标归一化小数位。 */
  coordDigits?: number;
  /** 是否忽略同一条线自交。 */
  ignoreSelf?: boolean;
  /** 全局预览交点状态样式配置。 */
  previewStateStyles?: IntersectionPreviewStateStyles;
  /** 全局正式交点状态样式配置。 */
  materializedStateStyles?: IntersectionPreviewStateStyles;
  /** 全局预览交点样式覆写。 */
  previewStyleOverrides?: IntersectionPreviewStyleOverrides;
  /** 全局正式交点样式覆写。 */
  materializedStyleOverrides?: IntersectionPreviewStyleOverrides;
}
```

同时补充 `IntersectionPreviewScope` 类型导入。

- [ ] **步骤 3：运行类型检查**

运行：

```powershell
npx vue-tsc -p tsconfig.app.json --noEmit --pretty false
```

预期：如有类型错误，只允许来自本任务涉及的配置类型变化，并在本任务内修复。

---

### 任务 2：修正 snap 内置目标的逐字段覆写

**文件：**
- 修改：`src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.ts`
- 测试：`src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts`

- [ ] **步骤 1：写失败测试**

新增测试：全局配置 `snap.intersection` / `snap.polygonEdge` 提供 `priority`、`snapTo`，页面局部只覆写 `tolerancePx`，最终结果保留全局未覆写字段。

示例：

```ts
it('应按字段合并 snap 内置目标全局默认值和实例局部配置', () => {
  setMapGlobalConfig({
    plugins: {
      snap: {
        intersection: {
          priority: 110,
          tolerancePx: 12,
          snapTo: ['vertex'],
        },
        polygonEdge: {
          priority: 90,
          tolerancePx: 14,
          snapTo: ['vertex', 'segment'],
        },
      },
    },
  });

  const controller = useMapFeatureSnapController({
    getOptions: () => ({
      intersection: {
        tolerancePx: 8,
      },
      polygonEdge: {
        priority: 95,
      },
    }),
    getMap: () => null,
  });

  expect((controller as any).resolvedOptions?.value?.intersection).toEqual({
    priority: 110,
    tolerancePx: 8,
    snapTo: ['vertex'],
  });
  expect((controller as any).resolvedOptions?.value?.polygonEdge).toEqual({
    priority: 95,
    tolerancePx: 14,
    snapTo: ['vertex', 'segment'],
  });

  controller.destroy();
});
```

如果 `resolvedOptions` 没有对外暴露，不要为了测试暴露内部实现；改为通过现有 binding 或公开结果测试最终吸附目标配置。

- [ ] **步骤 2：实现合并函数**

在 `useMapFeatureSnapController.ts` 增加局部函数：

```ts
function mergeSnapTargetOptions(
  globalConfig: boolean | MapFeatureSnapTargetOptions | undefined,
  localConfig: boolean | MapFeatureSnapTargetOptions | undefined
): boolean | MapFeatureSnapTargetOptions | undefined {
  if (typeof localConfig === 'boolean') {
    return localConfig;
  }

  if (typeof globalConfig === 'boolean') {
    return localConfig == null ? globalConfig : localConfig;
  }

  if (!globalConfig && !localConfig) {
    return undefined;
  }

  return {
    ...(globalConfig || {}),
    ...(localConfig || {}),
  };
}
```

将 `intersection`、`polygonEdge` 合并逻辑改为：

```ts
intersection: mergeSnapTargetOptions(globalDefaults?.intersection, localOptions?.intersection),
polygonEdge: mergeSnapTargetOptions(globalDefaults?.polygonEdge, localOptions?.polygonEdge),
```

- [ ] **步骤 3：运行 targeted 测试**

运行：

```powershell
npx vitest run src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts
```

预期：通过。

---

### 任务 3：让 intersection 行为字段支持全局默认和局部覆写

**文件：**
- 修改：`src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.ts`
- 修改：`src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.ts`
- 测试：`src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.spec.ts`
- 测试：`src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`

- [ ] **步骤 1：写失败测试**

新增测试覆盖：

- 全局 `scope: 'selected'`，局部未写时生效。
- 局部 `scope: 'all'` 可覆盖全局。
- 全局 `includeEndpoint`、`coordDigits`、`ignoreSelf` 可被局部单字段覆盖。
- 全局 `visible` 只作为初始化默认值，运行期 `show()` / `hide()` 不重建插件。
- 全局 `materializeOnClick` 可被局部覆盖。

示例断言思路：

```ts
setMapGlobalConfig({
  plugins: {
    intersection: {
      scope: 'selected',
      includeEndpoint: true,
      coordDigits: 4,
      ignoreSelf: true,
      visible: false,
      materializeOnClick: false,
    },
  },
});
```

局部配置：

```ts
{
  targetSourceIds: ['source-a'],
  sourceRegistry,
  scope: 'all',
  coordDigits: 6,
}
```

预期：`scope` 使用 `'all'`，`coordDigits` 使用 `6`，`includeEndpoint` 和 `ignoreSelf` 保留全局值。

- [ ] **步骤 2：实现交点配置归一化**

在 `useIntersectionPreviewPlugin.ts` 中增加函数：

```ts
function resolveIntersectionOptions(
  localOptions: IntersectionPreviewOptions | null | undefined
): IntersectionPreviewOptions | null | undefined {
  const globalDefaults = getMapGlobalIntersectionDefaults();
  if (!globalDefaults && !localOptions) {
    return localOptions;
  }

  return {
    ...(localOptions || {}),
    visible: localOptions?.visible ?? globalDefaults?.visible,
    materializeOnClick: localOptions?.materializeOnClick ?? globalDefaults?.materializeOnClick,
    scope: localOptions?.scope ?? globalDefaults?.scope,
    includeEndpoint: localOptions?.includeEndpoint ?? globalDefaults?.includeEndpoint,
    coordDigits: localOptions?.coordDigits ?? globalDefaults?.coordDigits,
    ignoreSelf: localOptions?.ignoreSelf ?? globalDefaults?.ignoreSelf,
    previewStateStyles: resolveIntersectionStateStyles(
      {},
      globalDefaults?.previewStateStyles,
      localOptions?.previewStateStyles
    ),
    materializedStateStyles: resolveIntersectionStateStyles(
      {},
      globalDefaults?.materializedStateStyles,
      localOptions?.materializedStateStyles
    ),
    previewStyleOverrides: resolveIntersectionStyleOverrides(
      globalDefaults?.previewStyleOverrides,
      localOptions?.previewStyleOverrides
    ),
    materializedStyleOverrides: resolveIntersectionStyleOverrides(
      globalDefaults?.materializedStyleOverrides,
      localOptions?.materializedStyleOverrides
    ),
  } as IntersectionPreviewOptions;
}
```

执行时要避免把样式默认值重复合并两次。最终实现可以拆成“行为配置归一化”和“样式解析”两层，只要结果满足测试即可。

- [ ] **步骤 3：替换运行时读取入口**

将交点插件内读取配置的地方统一通过合并后的配置读取：

```ts
const getResolvedOptions = () => resolveIntersectionOptions(context.getOptions());
```

传给控制器：

```ts
const controller = useIntersectionPreviewController({
  getOptions: getResolvedOptions,
  getCandidates: () => {
    const pluginOptions = getResolvedOptions();
    if (pluginOptions?.getCandidates) {
      return pluginOptions.getCandidates();
    }
    return buildCandidatesFromSourceRegistry(pluginOptions);
  },
  ...
});
```

同时更新 `pluginState` 初始值、`shouldMaterializeOnClick`、样式解析函数使用合并后配置。

- [ ] **步骤 4：保护热更新行为**

确认并保持：

- `show()` / `hide()` 只改 `store.visible.value`，不改插件描述对象，不重建插件。
- `setScope()` 回写当前插件 options 的 `scope` 并调用 `refresh()`，只刷新交点数据，不重建插件。

如果 `getResolvedOptions()` 每次返回新对象导致 `setScope()` 回写不到原始 options，必须调整 `setScope()`：优先回写原始 `context.getOptions()`，同时 `getResolvedOptions()` 读取时以局部 `scope` 覆盖全局。

- [ ] **步骤 5：运行交点测试**

运行：

```powershell
npx vitest run src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.spec.ts src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts
```

预期：通过。

---

### 任务 4：增强 createBusinessPlugins 业务预设

**文件：**
- 修改：`src/MapLibre/facades/businessPreset.ts`
- 测试：`src/MapLibre/facades/businessPreset.spec.ts`
- 可能修改：`src/entries/plugins.ts` 类型导出

- [ ] **步骤 1：写失败测试**

新增测试覆盖：

```ts
const plugins = createBusinessPlugins({
  sourceRegistry,
  snap: { layerIds: ['pipe-line'] },
  intersection: {
    targetLayerIds: ['pipe-line'],
  },
  lineDraft: true,
  polygonEdge: true,
  multiSelect: true,
  dxfExport: true,
});
```

预期：

- `intersection.options.sourceRegistry === sourceRegistry`
- `intersection.options.targetLayerIds` 为 `['pipe-line']`
- `intersection.options.targetSourceIds` 可为空数组，表示不限制 source，但必须至少提供 `targetLayerIds` 或 `targetSourceIds`
- `dxfExport.options.sourceRegistry === sourceRegistry`
- `dxfExport.options.defaults` 未强行写入，运行时继续走 DXF 全局默认

新增 DXF 扁平写法测试：

```ts
const plugins = createBusinessPlugins({
  sourceRegistry,
  dxfExport: {
    control: { enabled: false },
    sourceCrs: 'EPSG:4326',
    targetCrs: 'EPSG:3857',
    fileName: 'business.dxf',
  },
});

expect((plugins[0].options as any).defaults).toMatchObject({
  sourceCrs: 'EPSG:4326',
  targetCrs: 'EPSG:3857',
  fileName: 'business.dxf',
});
expect((plugins[0].options as any).control).toEqual({ enabled: false });
```

新增类型或运行时保护测试：`intersection: true` 不支持。

- [ ] **步骤 2：调整业务预设类型**

新增顶层上下文：

```ts
export interface BusinessPluginsOptions {
  /** 当前页面业务 source 注册表，供 intersection 和 dxfExport 复用。 */
  sourceRegistry?: MapBusinessSourceRegistry;
  snap?: boolean | BusinessSnapPresetOptions;
  lineDraft?: boolean | Parameters<typeof createLineDraftPreviewPlugin>[0];
  intersection?: BusinessIntersectionPresetOptions;
  polygonEdge?: boolean | PolygonEdgePreviewOptions;
  multiSelect?: boolean | Parameters<typeof createMapFeatureMultiSelectPlugin>[0];
  dxfExport?: boolean | BusinessDxfExportPresetOptions;
}
```

`BusinessIntersectionPresetOptions` 不支持布尔值，且必须包含 `targetSourceIds` 或 `targetLayerIds`。

`BusinessDxfExportPresetOptions` 支持底层 `defaults`，也支持扁平 DXF 任务字段。

- [ ] **步骤 3：实现解析函数**

新增：

```ts
function resolveIntersectionOptions(
  context: BusinessPluginsOptions,
  options: BusinessIntersectionPresetOptions
): IntersectionPreviewOptions {
  if (!options.targetSourceIds?.length && !options.targetLayerIds?.length) {
    throw new Error('createBusinessPlugins({ intersection }) 需要 targetSourceIds 或 targetLayerIds');
  }

  return {
    ...options,
    targetSourceIds: options.targetSourceIds || [],
    sourceRegistry: options.sourceRegistry || context.sourceRegistry,
  };
}
```

新增：

```ts
function resolveDxfOptions(
  context: BusinessPluginsOptions,
  options: true | BusinessDxfExportPresetOptions
): MapDxfExportOptions {
  const sourceRegistry = options === true ? context.sourceRegistry : options.sourceRegistry || context.sourceRegistry;
  if (!sourceRegistry) {
    throw new Error('createBusinessPlugins({ dxfExport }) 需要 sourceRegistry');
  }

  if (options === true) {
    return {
      enabled: true,
      sourceRegistry,
    };
  }

  const { control, defaults, sourceRegistry: _sourceRegistry, ...flatDefaults } = options;
  return {
    enabled: options.enabled !== false,
    sourceRegistry,
    control,
    defaults: {
      ...(defaults || {}),
      ...flatDefaults,
    },
  };
}
```

实际代码需保证变量命名不超过三词，避免使用生僻英文，并加函数级中文注释。

- [ ] **步骤 4：运行业务预设测试**

运行：

```powershell
npx vitest run src/MapLibre/facades/businessPreset.spec.ts
```

预期：通过。

---

### 任务 5：清理 multiSelect 全局 enabled

**文件：**
- 修改：`src/MapLibre/plugins/map-feature-multi-select/useMapFeatureMultiSelectService.ts`
- 测试：`src/MapLibre/plugins/map-feature-multi-select/useMapFeatureMultiSelectService.spec.ts`

- [ ] **步骤 1：写失败测试**

更新现有测试，确认全局配置不再控制插件级启用，只能配置行为默认值：

```ts
setMapGlobalConfig({
  plugins: {
    multiSelect: {
      position: 'bottom-left',
      deactivateBehavior: 'retain',
      closeOnEscape: false,
    },
  },
});
```

局部未写时预期：

```ts
expect(service.resolvedOptions.value).toMatchObject({
  enabled: true,
  position: 'bottom-left',
  deactivateBehavior: 'retain',
  closeOnEscape: false,
});
```

- [ ] **步骤 2：修改归一化逻辑**

将：

```ts
enabled: rawOptions?.enabled ?? globalDefaults?.enabled ?? true,
```

改为：

```ts
enabled: rawOptions?.enabled ?? true,
```

其余字段保持：

```ts
position: rawOptions?.position ?? globalDefaults?.position ?? 'top-right',
deactivateBehavior: rawOptions?.deactivateBehavior ?? globalDefaults?.deactivateBehavior ?? 'clear',
closeOnEscape: rawOptions?.closeOnEscape ?? globalDefaults?.closeOnEscape ?? true,
```

- [ ] **步骤 3：运行多选测试**

运行：

```powershell
npx vitest run src/MapLibre/plugins/map-feature-multi-select/useMapFeatureMultiSelectService.spec.ts
```

预期：通过。

---

### 任务 6：同步知识库和文档

**文件：**
- 修改：`docs/vue-maplibre-kit-knowledge/11-全局配置/04-plugins默认值.md`
- 修改：`docs/vue-maplibre-kit-knowledge/11-全局配置/index.md`
- 修改：`docs/vue-maplibre-kit-knowledge/15-API参考/03-config-api.md`
- 修改：`docs/vue-maplibre-kit-knowledge/09-插件/index.md`
- 修改：`docs/vue-maplibre-kit-knowledge/09-插件/01-插件注册总览.md`
- 修改：`docs/vue-maplibre-kit-knowledge/09-插件/04-intersection交点.md`
- 修改：`docs/vue-maplibre-kit-knowledge/09-插件/06-dxfExport导出DXF.md`
- 修改：`docs/vue-maplibre-kit-knowledge/02-公开入口/04-config全局配置入口.md`

- [ ] **步骤 1：更新全局配置原则**

在 `04-plugins默认值.md` 开头加入：

```md
全局 plugins 只配置“插件启用后的默认行为”，不配置插件是否注册或启用。插件是否启用由页面局部的 `createBusinessPlugins()` 决定。

对全局支持的字段，合并顺序统一为：插件内置默认值 -> 全局默认值 -> 页面局部配置。全局不包含页面运行期对象、业务 source/layer 绑定和页面交互回调。
```

- [ ] **步骤 2：更新 intersection 文档**

将旧表述“当前全局只负责视觉”改为：

```md
当前全局负责交点插件启用后的默认行为、算法参数和默认视觉；不负责页面数据范围、运行期对象、正式点业务属性和页面交互回调。
```

补充示例：

```ts
plugins: {
  intersection: {
    visible: true,
    materializeOnClick: true,
    scope: 'all',
    includeEndpoint: false,
    coordDigits: 6,
    ignoreSelf: true,
    previewStateStyles: {},
    materializedStateStyles: {},
    previewStyleOverrides: {},
    materializedStyleOverrides: {},
  },
},
```

更新“不进入全局”的字段清单，保留：

```md
`enabled`、`targetSourceIds`、`targetLayerIds`、`sourceRegistry`、`getCandidates`、`materializedProperties`、`inheritMaterializedPropertiesFromLayerId`、`onHoverEnter`、`onHoverLeave`、`onClick`、`onContextMenu`
```

- [ ] **步骤 3：更新 multiSelect 文档**

删除 `plugins.multiSelect.enabled`，保留：

```ts
plugins: {
  multiSelect: {
    position: 'top-right',
    deactivateBehavior: 'retain',
    closeOnEscape: true,
  },
},
```

补充说明：

```md
`targetLayerIds`、`excludeLayerIds`、`canSelect` 依赖具体页面图层和业务规则，应在页面局部配置。
```

- [ ] **步骤 4：更新 createBusinessPlugins 文档**

在插件注册总览和插件入口文档中使用新推荐写法：

```ts
const plugins = createBusinessPlugins({
  sourceRegistry: kit.registry,
  snap: { layerIds: [lineLayerId] },
  intersection: {
    targetLayerIds: [lineLayerId],
  },
  lineDraft: true,
  polygonEdge: true,
  multiSelect: true,
  dxfExport: true,
});
```

补充规则：

```md
- `sourceRegistry` 放在顶层，供 `intersection` 和 `dxfExport` 复用。
- `intersection` 不支持 `true`，必须传入 `targetSourceIds` 或 `targetLayerIds`。
- `dxfExport: true` 使用顶层 `sourceRegistry`、库内默认值和全局 DXF 默认值。
- `dxfExport` 对象写法允许把 `sourceCrs`、`targetCrs`、`fileName` 等任务默认值扁平写在业务预设层。
```

- [ ] **步骤 5：补齐 polygonEdge 文档索引**

确认以下文档不再遗漏 `polygonEdge`：

- `docs/vue-maplibre-kit-knowledge/11-全局配置/index.md`
- `docs/vue-maplibre-kit-knowledge/15-API参考/03-config-api.md`
- `docs/vue-maplibre-kit-knowledge/09-插件/index.md`
- `docs/vue-maplibre-kit-knowledge/02-公开入口/04-config全局配置入口.md`

---

### 任务 7：执行完整验证

**文件：**
- 不新增文件
- 修改：按前述任务产生的源码和文档

- [ ] **步骤 1：运行 targeted vitest**

运行：

```powershell
npx vitest run src/MapLibre/facades/businessPreset.spec.ts src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.spec.ts src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts src/MapLibre/plugins/map-feature-multi-select/useMapFeatureMultiSelectService.spec.ts
```

预期：全部通过。

- [ ] **步骤 2：运行 TypeScript 检查**

运行：

```powershell
npm run ts:check
```

预期：通过。

- [ ] **步骤 3：运行完整测试**

运行：

```powershell
npm test
```

预期：通过。

- [ ] **步骤 4：运行构建**

运行：

```powershell
npm run build
```

预期：通过。

- [ ] **步骤 5：检查工作区变更**

运行：

```powershell
git status --short
```

预期：只包含本次源码、测试和文档相关变更；如出现无关文件，保留用户已有变更，不回退。

---

## 自查结果

- 规格覆盖：已覆盖全局配置边界、`intersection` 默认行为字段、`snap` 内置目标字段级合并、`multiSelect.enabled` 移除、`createBusinessPlugins()` 顶层 `sourceRegistry` 和 DXF 简写、知识库同步。
- 占位扫描：本文档不包含未完成标记或“以后再补”类占位。
- 类型一致性：计划中使用的类型名来自当前源码：`BusinessPluginsOptions`、`IntersectionPreviewOptions`、`MapDxfExportOptions`、`MapFeatureSnapTargetOptions`、`MapFeatureMultiSelectGlobalDefaults`。
- 热更新说明：`show()` / `hide()` 继续只修改 `store.visible`；`setScope()` 继续刷新交点数据，不重建整个插件实例。
