# vue-maplibre-kit

一个面向 npm 发布的 Vue 3 地图库，核心基于 MapLibre GL JS，并集成 TerraDraw。  
项目目标不是提供一套“业务页面源码”，而是提供一套可以被外部项目稳定消费的地图容器、业务门面、几何工具和插件能力。

## 这个仓库怎么读

如果你第一次进入仓库，建议不要先从 `src/MapLibre` 深处开始翻，也不要先从 `src/views/**` 反推架构。  
更高效的顺序是：

1. 先看公开入口，确认库对外到底暴露了什么。
2. 再看业务门面，确认业务页应该如何接入。
3. 再看核心宿主、插件系统和 TerraDraw 集成。
4. 最后按功能下钻到具体实现。

推荐阅读顺序：

1. `src/business.ts`
2. `src/index.ts`
3. `src/geometry.ts`
4. `src/plugins/*.ts`
5. `src/MapLibre/**`

## 先看哪一个入口

### 业务接入方

优先看 `src/business.ts`。  
这里是给真实业务页面准备的主入口，目标是让业务层先按“我要做什么”找能力，而不是先理解全部底层实现。

### 插件使用方

先看 `src/plugins/*.ts`。  
这里是插件子路径公开入口，适合判断某个插件对外暴露了哪些工厂、常量和类型。

### 几何工具使用方

先看 `src/geometry.ts`。  
这里收口了与业务语义弱耦合的几何工具和来源引用工具。

### 维护者

先看 `src/index.ts`，再看 `src/MapLibre/facades/useBusinessMap.ts`，最后进入 `src/MapLibre/core`。  
这样可以先建立“公开 API -> 高层门面 -> 内核宿主”的阅读地图。

## 仓库导读

### 顶层目录

- `src/`
  发布源码与开发演示入口。
- `docs/`
  过程文档、知识库和补充说明。
- `public/`
  开发演示用静态资源。

### src 目录分层

- `src/index.ts`
  根入口。面向库消费者提供完整公开门面。
- `src/business.ts`
  业务页面优先入口。把高频能力按业务使用场景做了再组织。
- `src/geometry.ts`
  几何工具入口。
- `src/plugins/*.ts`
  插件子路径公开入口。
- `src/MapLibre/core`
  地图宿主、插件宿主、TerraDraw 生命周期等核心编排。
- `src/MapLibre/facades`
  高层业务门面。适合按“查要素、改要素、管弹窗、读草稿”找能力。
- `src/MapLibre/plugins`
  插件内部实现。
- `src/MapLibre/terradraw`
  TerraDraw 模式、吸附同步、线装饰和渲染实现。
- `src/MapLibre/composables`
  偏底层、可复用的组合式能力。
- `src/MapLibre/shared`
  跨模块复用的共享类型、表达式、样式和数据工具。
- `src/views/**`
  开发演示区，用来验证库在接近真实业务接入方式下是否可用。不是发布物，也不应作为核心架构入口来阅读。

## 我想找某类代码，应该去哪

### 找公开 API

先看：

- `src/index.ts`
- `src/business.ts`
- `src/geometry.ts`
- `src/plugins/*.ts`

### 找地图宿主和生命周期

先看：

- `src/MapLibre/core/mapLibre-init.vue`
- `src/MapLibre/core/useMapPluginHost.ts`
- `src/MapLibre/core/useTerradrawControlLifecycle.ts`

### 找高层业务门面

先看：

- `src/MapLibre/facades/useBusinessMap.ts`
- `src/MapLibre/facades/useMapFeatureQuery.ts`
- `src/MapLibre/facades/useMapFeatureActions.ts`
- `src/MapLibre/facades/useMapFeaturePropertyEditor.ts`

### 找插件系统

先看：

- `src/MapLibre/plugins/types.ts`
- `src/plugins/*.ts`
- `src/MapLibre/plugins/*/index.ts`
- 各插件目录下的 `use*Plugin.ts`

### 找 TerraDraw 相关实现

先看：

- `src/MapLibre/terradraw/terradraw-config.ts`
- `src/MapLibre/terradraw/terradraw-mode-factory.ts`
- `src/MapLibre/terradraw/useTerradrawInteractive.ts`
- `src/MapLibre/terradraw/terradraw-snap-sync.ts`

### 找业务 source 和图层组织方式

先看：

- `src/MapLibre/facades/createMapBusinessSource.ts`
- `src/MapLibre/facades/mapBusinessLayer.ts`
- `src/MapLibre/facades/MapBusinessSourceLayers.vue`

## 公开入口设计

当前公开入口分成四类：

- `vue-maplibre-kit`
  完整公开门面，适合低层能力和类型按需导入。
- `vue-maplibre-kit/business`
  业务页优先入口，适合高频业务接入。
- `vue-maplibre-kit/geometry`
  几何工具与来源引用工具。
- `vue-maplibre-kit/plugins/*`
  插件子路径入口，适合显式引入插件能力。

### 典型导入方式

```ts
import {
  MapLibreInit,
  defineMapPlugin,
  type MapLibreInitExpose,
} from 'vue-maplibre-kit';

import {
  useBusinessMap,
  createMapBusinessSourceRegistry,
} from 'vue-maplibre-kit/business';

import {
  MapLineCorridorTool,
} from 'vue-maplibre-kit/geometry';

import {
  createMapFeatureSnapPlugin,
} from 'vue-maplibre-kit/plugins/map-feature-snap';
```

## 维护边界

### npm 库优先

本项目是 npm 组件库，不是业务项目。  
任何结构调整都应优先考虑：

- 外部项目是否能只通过公开出口接入
- 示例层是否没有依赖私有实现
- 构建配置、导出配置和类型路径是否同步

### 门面优先

业务层和示例层需要能力时，应优先从公开门面接入，而不是直接导入 `src/MapLibre/**` 私有实现。

### 示例不反向定义架构

`src/views/**` 用于验证接入方式与可用性，不应反向决定核心目录结构。  
判断核心结构是否合理，应主要看公开出口、门面层和内核层之间的边界是否清晰。

## 目录级导读

下面四个目录已经补充目录级 README，可继续顺着阅读：

- `src/MapLibre/core/README.md`
- `src/MapLibre/facades/README.md`
- `src/MapLibre/plugins/README.md`
- `src/MapLibre/terradraw/README.md`

## 许可证

[MIT](./LICENSE)
