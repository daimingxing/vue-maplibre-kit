# business API

适合：查 `vue-maplibre-kit/business` 公开导出的开发者。

先读：[business 业务入口](../02-公开入口/02-business业务入口.md)。

源码来源：`src/entries/business.ts`。

| 导出 | 类型 | 用途 | 推荐程度 |
| --- | --- | --- | --- |
| `MapLibreInit` | 组件 | 地图根组件 | 推荐 |
| `MglPopup` | 组件 | 地图弹窗 | 推荐 |
| `MglCustomControl` | 组件 | 自定义地图控件 | 按需 |
| `MapBusinessSourceLayers` | 组件 | 声明式渲染业务 source 和图层 | 推荐 |
| `useBusinessMap` | 函数 | 高层业务聚合门面 | 推荐 |
| `useMapLayerActions` | 函数 | 图层运行时动作 | 按需 |
| `useMapPopupState` | 函数 | Popup 状态管理 | 按需 |
| `createMapBusinessSource` | 函数 | 创建单业务 source | 推荐 |
| `createMapBusinessSourceRegistry` | 函数 | 管理多个业务 source | 推荐 |
| `createCircleBusinessLayer` | 函数 | 创建点图层描述 | 推荐 |
| `createFillBusinessLayer` | 函数 | 创建面图层描述 | 推荐 |
| `createLineBusinessLayer` | 函数 | 创建线图层描述 | 推荐 |
| `createSymbolBusinessLayer` | 函数 | 创建符号图层描述 | 按需 |
| `createSimpleLineStyle` | 函数 | 创建简单线样式 | 推荐 |
| `createSimpleCircleStyle` | 函数 | 创建简单点样式 | 推荐 |
| `createSimpleFillStyle` | 函数 | 创建简单面样式 | 推荐 |
| `createLayerGroup` | 函数 | 批量创建图层 | 推荐 |
| `createMapControlsPreset` | 函数 | 创建控件预设 | 推荐 |
| `createBusinessPlugins` | 函数 | 兼容导出，推荐从 `plugins` 入口引入 | 兼容 |
| `businessSources` | 对象 | source 工厂分组 | 按需 |
| `businessLayers` | 对象 | layer 工厂分组 | 按需 |
| `layerStyles` | 对象 | 样式工厂分组 | 按需 |
| `mapExpressions` | 对象 | 表达式工具分组 | 按需 |

## `useBusinessMap` 分组

| 分组 | 用途 |
| --- | --- |
| `sources` | source 注册表、source 查询、来源引用 |
| `selection` | 普通图层选中态、选中 ID、选中属性值、按图层分组选中项 |
| `feature` | 要素查询、属性面板、属性保存/删除、线草稿动作 |
| `layers` | source/layer 增删、显隐、paint/layout、feature-state |
| `editor` | 统一属性编辑状态、保存、删除 |
| `effect` | feature-state 动效和表达式辅助 |
| `plugins` | snap、lineDraft、intersection、multiSelect、dxfExport |

## 关键类型

| 类型 | 用途 |
| --- | --- |
| `UseBusinessMapResult` | `useBusinessMap()` 返回值 |
| `UseBusinessMapPlugins` | `businessMap.plugins` 类型 |
| `UseBusinessMapOptions` | `useBusinessMap()` 入参 |
| `MapBusinessSource` | 业务 source |
| `MapBusinessSourceRegistry` | source 注册表 |
| `MapBusinessLayerDescriptor` | 业务图层描述 |
| `MapFeaturePropertyPolicy` | 属性治理规则 |
| `MapSourceFeatureRef` | sourceId + featureId 来源引用 |

插件注册仍推荐：

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
```
