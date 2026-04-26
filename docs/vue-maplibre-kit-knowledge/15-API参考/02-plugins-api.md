# plugins API

适合：查 `vue-maplibre-kit/plugins` 和插件子路径导出的开发者。

先读：[插件](../09-插件/index.md)。

源码来源：`src/entries/plugins.ts`。

## 聚合入口

| 导出 | 类型 | 用途 | 推荐程度 |
| --- | --- | --- | --- |
| `createBusinessPlugins` | 函数 | 创建常用业务插件描述列表 | 推荐 |
| `BusinessPluginsOptions` | 类型 | `createBusinessPlugins()` 配置 |
| `BusinessSnapPresetOptions` | 类型 | 业务吸附预设配置 |

## `BusinessPluginsOptions`

| 字段 | 用途 |
| --- | --- |
| `snap` | 吸附插件配置，支持 `true` 或配置对象 |
| `lineDraft` | 线草稿插件配置 |
| `intersection` | 交点插件配置 |
| `multiSelect` | 多选插件配置 |
| `dxfExport` | DXF 导出插件配置 |

## `useBusinessMap().plugins`

| 分组 | 关键方法和状态 |
| --- | --- |
| `snap` | `clearPreview()`、`resolveMapEvent()`、`resolveTerradrawSnapOptions()` |
| `lineDraft` | `state`、`previewLine()`、`replacePreviewRegion()`、`saveProperties()`、`removeProperties()`、`getFeatureById()`、`clear()` |
| `intersection` | `state`、`refresh()`、`clear()`、`materialize()`、`removeMaterialized()`、`updateMaterializedProperties()`、`clearMaterialized()`、`getData()`、`getMaterializedData()` |
| `multiSelect` | `isActive`、`selectionMode`、`selectedCount`、`selectedFeatures`、`activate()`、`deactivate()`、`toggle()`、`clear()`、`getActive()`、`getSelectedFeatures()` |
| `dxfExport` | `state`、`isExporting`、`lastFileName`、`lastWarnings`、`lastError`、`exportDxf()`、`downloadDxf()`、`getResolvedOptions()` |

## 插件子路径

| 子路径 | 用途 |
| --- | --- |
| `vue-maplibre-kit/plugins/map-feature-snap` | 吸附插件工厂、规则、类型 |
| `vue-maplibre-kit/plugins/line-draft-preview` | 线草稿插件工厂、常量、类型 |
| `vue-maplibre-kit/plugins/intersection-preview` | 交点插件工厂、样式类型 |
| `vue-maplibre-kit/plugins/map-feature-multi-select` | 多选插件工厂、类型 |
| `vue-maplibre-kit/plugins/map-dxf-export` | DXF 插件工厂、任务配置、resolver 类型 |

普通业务页面优先使用聚合入口；子路径适合高级定制。
