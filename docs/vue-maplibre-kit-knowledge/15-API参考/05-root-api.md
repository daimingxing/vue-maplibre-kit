# root API

适合：维护公开导出、做高级扩展或需要完整能力索引的开发者。

先读：[root 根入口](../02-公开入口/01-root根入口.md)。

源码来源：`src/entries/root.ts`。

## 推荐级能力

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `MapLibreInit` | 组件 | 地图根组件 |
| `MglPopup` | 组件 | 地图弹窗 |
| `useBusinessMap` | 函数 | 高层业务聚合门面 |
| `createMapBusinessSource` | 函数 | 业务 source 工厂 |
| `createMapBusinessSourceRegistry` | 函数 | source 注册表工厂 |
| `createCircleBusinessLayer` | 函数 | 点图层工厂 |
| `createFillBusinessLayer` | 函数 | 面图层工厂 |
| `createLineBusinessLayer` | 函数 | 线图层工厂 |
| `createSymbolBusinessLayer` | 函数 | 符号图层工厂 |

## 高级能力

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `defineMapPlugin` | 函数 | 定义自定义地图插件 |
| `useMapEffect` | 函数 | feature-state 特效 |
| `withFeatureState` | 函数 | 包装 feature-state 表达式 |
| `useMapSelection` | 函数 | 普通图层选中态 |
| `saveFeatureProperties` | 函数 | 底层属性保存 |
| `removeMapFeatureProperties` | 函数 | 底层属性删除 |
| `useMapFeatureQuery` | 函数 | 要素查询门面 |
| `useMapFeatureActions` | 函数 | 要素动作门面 |
| `useMapFeaturePropertyEditor` | 函数 | 属性编辑门面 |

## 维护提醒

根入口内容多，业务文档不应要求初学者从这里起步。业务页面优先使用 `vue-maplibre-kit/business`，插件注册优先使用 `vue-maplibre-kit/plugins`。
