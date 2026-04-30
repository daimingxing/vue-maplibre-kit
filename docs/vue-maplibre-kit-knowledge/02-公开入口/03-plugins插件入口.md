# plugins 插件入口

适合：需要注册 snap、线草稿、交点、面边线、多选、DXF 导出插件的业务开发者。

先读：[插件注册总览](../09-插件/01-插件注册总览.md)。

对应示例：`NGGI06`、`NGGI07`、`NGGI08`、`NGGI09`、`NGGI10`、`NGGI11`、`NGGI12`。

## 推荐导入

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
```

`createBusinessPlugins()` 是业务插件预设工厂，返回 `MapPluginDescriptor[]`，直接传给 `MapLibreInit` 的 `plugins` 属性。

## 基本用法

```ts
const plugins = createBusinessPlugins({
  sourceRegistry: registry,
  snap: {
    layerIds: ["pipe-line"],
  },
  lineDraft: true,
  intersection: {
    targetLayerIds: ["pipe-line"],
  },
  polygonEdge: true,
  multiSelect: {
    targetLayerIds: ["pipe-line"],
  },
  dxfExport: true,
});
```

补充规则：

- `sourceRegistry` 推荐放在顶层，供 `intersection` 和 `dxfExport` 复用。
- `intersection` 不支持 `true`；自动模式必须传入 `targetSourceIds` 或 `targetLayerIds`，并提供顶层或局部 `sourceRegistry`。
- 高级模式可以只传 `intersection.getCandidates`，此时候选线完全由业务方提供。
- `dxfExport: true` 使用顶层 `sourceRegistry`、库内默认值和全局 DXF 默认值。
- `dxfExport` 对象写法允许把 `sourceCrs`、`targetCrs`、`fileName` 等任务默认值扁平写在业务预设层。

## 读取插件能力

注册负责“装上插件”，读取负责“调用插件”。读取统一从业务门面走：

```ts
const businessMap = useBusinessMap({
  mapRef: () => mapRef.value,
  sourceRegistry: registry,
});

const selected = businessMap.plugins.multiSelect.getSelectedFeatures();
await businessMap.plugins.dxfExport.downloadDxf();
```

动态修改插件配置时，请替换 `descriptor/options` 顶层引用。推荐写法是 `computed(() => createBusinessPlugins(...))`，不要原地改写嵌套配置对象后期待宿主重新同步。

## 聚合入口也暴露什么

`vue-maplibre-kit/plugins` 同时重新导出六个单插件的工厂、常量和类型：

- `map-feature-snap`
- `line-draft-preview`
- `intersection-preview`
- `polygon-edge-preview`
- `map-feature-multi-select`
- `map-dxf-export`

这些能力适合高级定制。普通业务页面先使用 `createBusinessPlugins()`。

## generatedKind 常量

部分插件会创建临时或正式的生成要素，并在要素属性和交互上下文里写入 `generatedKind`。`vue-maplibre-kit/plugins` 会统一导出这些公开常量：

- `LINE_DRAFT_PREVIEW_EXTENSION_KIND`：线延长草稿，值为 `line-extension-draft`。
- `LINE_DRAFT_PREVIEW_CORRIDOR_KIND`：线廊面草稿，值为 `line-corridor-draft`。
- `INTERSECTION_PREVIEW_KIND`：预览交点，值为 `intersection-preview`。
- `INTERSECTION_MATERIALIZED_KIND`：正式交点，值为 `intersection-materialized`。
- `POLYGON_EDGE_PREVIEW_KIND`：面边线预览要素，值为 `polygon-edge-preview`。

snap、multiSelect、dxfExport 不创建业务生成要素，因此没有 `generatedKind` 常量。
