# vue-maplibre-kit 知识库

这套知识库面向真实业务项目的开发者，目标是让你只记少量公开入口，就能完成地图初始化、业务数据渲染、交互查询、属性编辑、插件注册、DXF 导出和底层扩展。

## 推荐阅读路径

| 你要做什么 | 先读 |
| --- | --- |
| 第一次接入地图 | [开始使用](00-开始使用/index.md) |
| 判断应该从哪里 import | [公开入口](02-公开入口/index.md) |
| 渲染业务 source 和 layer | [业务数据源](04-业务数据源/index.md)、[业务图层](05-业务图层/index.md) |
| 做点击、hover、弹窗、查找要素 | [交互与查询](07-交互与查询/index.md) |
| 做属性编辑 | [属性编辑](08-属性编辑/index.md) |
| 注册 snap、线草稿、交点、多选、DXF | [插件](09-插件/index.md) |
| 调用命令式动作 | [命令式能力](12-命令式能力/index.md) |
| 统一配置地图默认值 | [全局配置](11-全局配置/index.md) |
| 做线延长、线廊、交点计算 | [几何工具](10-几何工具/index.md) |
| 要下探 MapLibre 或 TerraDraw | [底层逃生通道](13-底层逃生通道/index.md) |
| 按例子找能力 | [示例索引](14-示例索引/index.md) |
| 查完整导出 | [API 参考](15-API参考/index.md) |

## 最推荐的业务入口

业务页面优先从两个入口开始：

```ts
import { MapLibreInit, MapBusinessSourceLayers, useBusinessMap } from "vue-maplibre-kit/business";
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
```

注册插件用 `createBusinessPlugins()`，读取插件状态和动作统一用 `useBusinessMap().plugins.*`：

```ts
const businessMap = useBusinessMap(mapRef);

const snap = businessMap.plugins.snap;
const lineDraft = businessMap.plugins.lineDraft;
const intersection = businessMap.plugins.intersection;
const multiSelect = businessMap.plugins.multiSelect;
const dxfExport = businessMap.plugins.dxfExport;
```

## 知识库地图

- [开始使用](00-开始使用/index.md)：安装样式、最小地图、推荐引入方式。
- [核心概念](01-核心概念/index.md)：地图实例、source/layer/feature、响应式数据、声明式与命令式。
- [公开入口](02-公开入口/index.md)：`business`、`plugins`、`config`、`geometry`、根入口和插件子路径。
- [地图与控件](03-地图与控件/index.md)：`MapLibreInit`、`mapOptions`、`mapControls`、自定义控件。
- [业务数据源](04-业务数据源/index.md)：业务 GeoJSON source、source 注册表、响应式数据维护。
- [业务图层](05-业务图层/index.md)：业务图层工厂、图层组、运行时图层动作。
- [样式与状态](06-样式与状态/index.md)：样式工厂、表达式、hover、selected、feature-state。
- [交互与查询](07-交互与查询/index.md)：点击、hover、Popup、要素查询和选中态。
- [属性编辑](08-属性编辑/index.md)：`propertyPolicy`、属性面板状态、保存和删除属性。
- [插件](09-插件/index.md)：五个业务插件的注册、配置、交互和命令式动作。
- [几何工具](10-几何工具/index.md)：线延长、线廊、线测量、交点和来源引用。
- [全局配置](11-全局配置/index.md)：`setMapGlobalConfig()` 与全局默认值。
- [命令式能力](12-命令式能力/index.md)：`useBusinessMap()` 的分组动作。
- [底层逃生通道](13-底层逃生通道/index.md)：`rawHandles`、MapLibre、TerraDraw 和自定义插件。
- [示例索引](14-示例索引/index.md)：`NGGI00` 到 `NGGI11` 的功能地图。
- [API 参考](15-API参考/index.md)：按公开入口列出导出能力。

## 重要边界

- 推荐业务代码使用包名路径，例如 `vue-maplibre-kit/business`。
- 不建议业务项目直接引用 `src/MapLibre/**`，那是库内部实现。
- 单插件子路径属于高级用法，普通业务页面优先用 `createBusinessPlugins()`。
- `NGGI00` 是完整业务验证页，小示例 `NGGI01` 到 `NGGI11` 更适合按功能学习。
