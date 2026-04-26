# `terradraw` 导读

`terradraw` 负责 **TerraDraw 集成实现**，包括模式配置、交互桥接、吸附同步和线装饰渲染。

## 先看哪几个文件

1. `terradraw-config.ts`
2. `terradraw-mode-factory.ts`
3. `useTerradrawInteractive.ts`
4. `terradraw-snap-sync.ts`
5. `useTerradrawLineDecoration.ts`

## 什么时候进入这里

- 想看 TerraDraw 默认模式和配置如何组织
- 想看绘制交互如何接入地图宿主
- 想看 TerraDraw 如何和吸附系统联动
- 想看线装饰、贴图和样式计算

## 文件速览

- `terradraw-config.ts`：默认配置与模式选项收口点
- `terradraw-mode-factory.ts`：模式工厂
- `useTerradrawInteractive.ts`：TerraDraw 交互主流程
- `terradraw-snap-sync.ts`：吸附同步逻辑
- `useTerradrawLineDecoration.ts`：线装饰主逻辑
- `TerradrawLineDecorationLayers.vue`：线装饰图层渲染

## 联动阅读

- 看控件生命周期：`src/MapLibre/core/useTerradrawControlLifecycle.ts`
- 看业务动作如何操作绘制结果：`src/MapLibre/facades/useMapFeatureActions.ts`

## 不建议先从这里找的问题

- 业务属性面板逻辑：去 `facades`
- 插件宿主编排：去 `core`
