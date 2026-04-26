# `facades` 导读

`facades` 负责 **高层业务门面**，把业务侧最常用的查询、编辑、动作和 source 组织能力收口成稳定入口。

## 先看哪几个文件

1. `useBusinessMap.ts`
2. `createMapBusinessSource.ts`
3. `mapBusinessLayer.ts`
4. `useMapFeatureQuery.ts`
5. `useMapFeatureActions.ts`
6. `useMapFeaturePropertyEditor.ts`

## 什么时候进入这里

- 业务页想知道先调用什么 API
- 想看业务 source 和图层怎么组织
- 想看要素查询、属性编辑、业务动作怎么封装
- 想看高层门面怎样读取插件 API

## 文件速览

- `useBusinessMap.ts`：业务接入总入口
- `createMapBusinessSource.ts`：业务 source 工厂与注册表
- `mapBusinessLayer.ts`：业务图层描述对象
- `useMapFeatureQuery.ts`：要素查询门面
- `useMapFeatureActions.ts`：要素动作门面
- `useMapFeaturePropertyEditor.ts`：属性编辑门面
- `mapPluginResolver.ts`：门面层读取插件 API 的解析工具

## 不建议先从这里找的问题

- 地图根组件初始化：去 `core`
- 插件实例内部实现：去 `plugins`
- TerraDraw 细节和线装饰：去 `terradraw`
