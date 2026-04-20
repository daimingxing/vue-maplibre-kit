# core 导读

`core` 目录负责地图宿主层编排。  
这里的职责不是承载全部业务语义，而是把地图实例、插件宿主、TerraDraw 生命周期和对外 expose 能力串起来。

## 这个目录负责什么

- 挂载 MapLibre 地图根组件
- 维护插件宿主与插件查询接口
- 协调 TerraDraw / Measure 生命周期
- 向外暴露地图实例常用能力

## 首读顺序

1. `mapLibre-init.vue`
2. `mapLibre-init.types.ts`
3. `useMapPluginHost.ts`
4. `useTerradrawControlLifecycle.ts`
5. `mgl-popup.vue`

## 文件说明

### mapLibre-init.vue

地图根组件。  
如果你想知道“地图初始化后都挂了哪些系统能力”，先看这里。

### mapLibre-init.types.ts

根组件公开类型定义。  
如果你想知道业务层通过 `mapRef` 能拿到什么能力，先看这里。

### useMapPluginHost.ts

插件宿主核心。  
负责插件实例创建、复用、销毁、状态监听、渲染项聚合和交互补丁合并。

### useTerradrawControlLifecycle.ts

TerraDraw / Measure 控件生命周期接线。  
适合定位“控件何时创建、更新、销毁”的问题。

### mgl-popup.vue

轻量弹窗组件。  
职责比较单一，主要用于承载地图上的信息展示节点。

## 阅读时的判断标准

当你面对一个问题时，可以这样判断要不要进 `core`：

- 问题和地图根组件初始化有关，进 `core`
- 问题和插件宿主编排有关，进 `core`
- 问题和 TerraDraw 控件生命周期有关，进 `core`
- 问题和业务属性编辑、业务 source 组织有关，不要先进 `core`，先看 `facades`

## 不建议在这里做什么

- 不要把高层业务动作堆进 `core`
- 不要把插件私有实现直接塞进 `core`
- 不要让 `core` 直接承担业务页面语义
