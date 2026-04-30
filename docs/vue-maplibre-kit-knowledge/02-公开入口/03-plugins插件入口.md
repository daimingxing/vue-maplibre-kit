# plugins 插件入口

适合：需要注册 snap、线草稿、交点、面边线、多选、DXF 导出插件的业务开发者。

先读：[插件注册总览](../09-插件/01-插件注册总览.md)。

对应示例：`NGGI06`、`NGGI07`、`NGGI08`、`NGGI09`、`NGGI10`、`NGGI11`。

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
- `intersection` 不支持 `true`，必须传入 `targetSourceIds` 或 `targetLayerIds`。
- `dxfExport: true` 使用顶层 `sourceRegistry`、库内默认值和全局 DXF 默认值。
- `dxfExport` 对象写法允许把 `sourceCrs`、`targetCrs`、`fileName` 等任务默认值扁平写在业务预设层。

## 读取插件能力

注册负责“装上插件”，读取负责“调用插件”。读取统一从业务门面走：

```ts
const businessMap = useBusinessMap(mapRef);

const selected = businessMap.plugins.multiSelect.getSelectedFeatures();
await businessMap.plugins.dxfExport.downloadDxf();
```

## 聚合入口也暴露什么

`vue-maplibre-kit/plugins` 同时重新导出六个单插件的工厂、常量和类型：

- `map-feature-snap`
- `line-draft-preview`
- `intersection-preview`
- `polygon-edge-preview`
- `map-feature-multi-select`
- `map-dxf-export`

这些能力适合高级定制。普通业务页面先使用 `createBusinessPlugins()`。
