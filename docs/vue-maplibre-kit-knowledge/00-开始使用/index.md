# 开始使用

适合谁读：第一次在业务项目中接入 `vue-maplibre-kit` 的开发者。

先读哪篇：[01-安装与样式](./01-安装与样式.md)，再读 [02-最小地图](./02-最小地图.md)。

对应示例：[NGGI01](../../../examples/views/NG/GI/NGGI01.vue)、[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)。

## 推荐路径

1. 安装包、导入 `vue-maplibre-kit/style.css`。
2. 用 `MapLibreInit` 挂载第一张地图。
3. 用 `vue-maplibre-kit/business` 接入业务 source、图层和 `useBusinessMap`。
4. 第一个业务数据源继续读：[业务数据源](../04-业务数据源/index.md)。
5. 第一个业务图层继续读：[业务图层](../05-业务图层/index.md)。

## 本章文件

| 文件 | 解决的问题 |
| --- | --- |
| [01-安装与样式](./01-安装与样式.md) | 安装依赖、样式入口、peer dependencies 的含义 |
| [02-最小地图](./02-最小地图.md) | `MapLibreInit`、`mapRef`、加载态和命令式调用时机 |
| [03-推荐引入方式](./03-推荐引入方式.md) | 业务入口、插件入口、配置入口、几何入口的选择规则 |

## 默认推荐导入

```ts
import { MapLibreInit, MapBusinessSourceLayers, useBusinessMap } from "vue-maplibre-kit/business";
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
import "vue-maplibre-kit/style.css";
```

普通业务页面优先使用公开包名路径，不需要了解组件库内部目录结构。
