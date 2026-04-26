# `core` 导读

`core` 负责 **地图宿主编排**，聚焦地图初始化、插件宿主、控件生命周期和对外 expose。

## 先看哪几个文件

1. `mapLibre-init.vue`
2. `mapLibre-init.types.ts`
3. `useMapPluginHost.ts`
4. `useTerradrawControlLifecycle.ts`

## 什么时候进入这里

- 想看地图实例怎么创建
- 想看根组件对外暴露了什么
- 想看插件如何被宿主管理
- 想看 TerraDraw / Measure 控件何时创建、更新、销毁

## 文件速览

- `mapLibre-init.vue`：地图根组件与核心挂载入口
- `mapLibre-init.types.ts`：根组件 expose 类型定义
- `useMapPluginHost.ts`：插件宿主，负责插件实例与渲染聚合
- `useTerradrawControlLifecycle.ts`：TerraDraw / Measure 生命周期接线
- `mgl-popup.vue`：地图弹窗承载组件

## 不建议先从这里找的问题

- 业务 source 组织：去 `facades`
- 属性编辑与业务动作：去 `facades`
- 插件私有状态实现：去 `plugins`
