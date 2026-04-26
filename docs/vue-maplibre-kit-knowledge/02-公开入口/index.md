# 公开入口

适合：正在判断应该从哪个 import 路径接入能力的开发者。

先读：[推荐引入方式](../00-开始使用/03-推荐引入方式.md)。

对应示例：`NGGI00` 到 `NGGI11` 都使用公开包名路径接入。

## 入口总览

| 入口 | 定位 | 推荐程度 |
| --- | --- | --- |
| `vue-maplibre-kit/business` | 业务页面主入口 | 首选 |
| `vue-maplibre-kit/plugins` | 常用插件注册入口 | 首选 |
| `vue-maplibre-kit/config` | 全局默认配置入口 | 首选 |
| `vue-maplibre-kit/geometry` | 几何工具入口 | 按需 |
| `vue-maplibre-kit` | 根入口，能力全集 | 高级 |
| `vue-maplibre-kit/plugins/*` | 单插件子路径 | 高级 |

## 业务页面默认写法

```ts
import { MapLibreInit, MapBusinessSourceLayers, useBusinessMap } from "vue-maplibre-kit/business";
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
```

## 章节

- [root 根入口](01-root根入口.md)
- [business 业务入口](02-business业务入口.md)
- [plugins 插件入口](03-plugins插件入口.md)
- [config 全局配置入口](04-config全局配置入口.md)
- [geometry 几何入口](05-geometry几何入口.md)
- [插件子路径](06-插件子路径.md)

## 选择规则

- 写业务地图页面，先看 `vue-maplibre-kit/business`。
- 注册常用插件，先看 `vue-maplibre-kit/plugins`。
- 配应用级默认配置，只用 `vue-maplibre-kit/config`。
- 做线、面、交点等纯计算，用 `vue-maplibre-kit/geometry`。
- 需要自定义插件或底层类型，再看根入口和插件子路径。
