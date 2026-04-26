# root 根入口

适合：需要查完整公开能力、写高级扩展或维护库导出的开发者。

先读：[公开入口总览](index.md)。

对应源码：`src/entries/root.ts`。

## 定位

`vue-maplibre-kit` 是能力最全的根入口。它保留组件、门面、插件系统类型、底层工具和共享类型，适合做完整 API 索引。

普通业务页面不需要优先从根入口引入，因为根入口内容多，会增加记忆负担。

## 常见导出

| 能力 | 说明 |
| --- | --- |
| `MapLibreInit` | 地图根组件 |
| `MglPopup` | 地图弹窗组件 |
| `useBusinessMap` | 高层业务聚合门面 |
| `defineMapPlugin` | 自定义插件定义函数 |
| `useMapEffect` | feature-state 动效门面 |
| `useMapSelection` | 普通图层选中态门面 |
| `createMapBusinessSource` | 业务 source 工厂 |
| `create*BusinessLayer` | 点线面符号业务图层工厂 |
| `create*LayerStyle` | 图层样式工厂 |
| `collectLineIntersections` | 线交点计算工具 |

## 什么时候用根入口

- 你在写库级扩展，需要插件系统类型。
- 你在维护公开导出，需要核对完整 API。
- 你需要同时引用业务门面和底层工具，但不想拆多个入口。

## 什么时候不用根入口

业务页面优先使用：

```ts
import { MapLibreInit, useBusinessMap } from "vue-maplibre-kit/business";
```

插件注册优先使用：

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
```
