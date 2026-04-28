# 文件索引导读

这份文档是本仓库的 **权威文件索引**。

当你想快速定位某类能力、某个问题或某段实现时，优先看这里，而不是直接在 `src/MapLibre/**` 深层目录里盲搜。

## 使用规则

- **先看公开入口**：判断能力是否已经通过 `src/index.ts`、`src/business.ts`、`src/plugins.ts`、`src/geometry.ts`、`src/plugins/*.ts` 暴露
- **再看门面层**：如果问题带明显业务语义，优先进入 `src/MapLibre/facades`
- **最后下钻内部实现**：只有在需要理解宿主、插件或 TerraDraw 细节时，再进入 `core`、`plugins`、`terradraw`
- **示例页只辅助验证**：`examples/**` 用于演示和验证，不是项目架构的首要真相来源

## 首读入口

### 我第一次看这个仓库

按这个顺序最省时间：

1. `README.md`：先看项目定位、公开入口约定和整体使用方式
2. `src/business.ts`：业务接入主入口，优先看业务页最常用的组件、门面、图层工厂和高频类型
3. `src/plugins.ts`：插件聚合入口，优先看常用插件注册方式
4. `src/index.ts`：库根入口薄转发，实际根入口源码在 `src/entries/root.ts`
5. `src/config.ts`：全局配置入口，实际配置入口源码在 `src/entries/config.ts`
6. `src/geometry.ts`：几何工具入口，实际几何入口源码在 `src/entries/geometry.ts`
7. `src/MapLibre/facades/useBusinessMap.ts`：高层业务门面，适合理解业务层如何统一读取选择、编辑、插件和动效能力
8. `src/MapLibre/core/mapLibre-init.vue`：地图核心宿主，适合理解地图实例、控件、TerraDraw 和插件宿主如何装配

### 我只想知道对外暴露了什么

先看：

- `src/index.ts`
- `src/business.ts`
- `src/config.ts`
- `src/geometry.ts`
- `src/plugins.ts`
- `src/entries/*.ts`
- `src/plugins/*.ts`
- `package.json` 中的 `exports`

## 按问题找文件

### 我想看全局配置默认值怎么组织

先看：

- `src/config.ts`
- `src/entries/config.ts`
- `src/demo-map-global-config.ts`
- `src/main.ts`

适用问题：

- 地图全局默认配置有哪些分组
- 业务项目应该在哪里定义统一默认值
- 应用启动时应当在什么阶段注册全局配置
- `defineMapGlobalConfig`、`setMapGlobalConfig`、`getMapGlobalConfig` 各自负责什么

### 我想看地图初始化与核心宿主

先看：

- `src/MapLibre/core/mapLibre-init.vue`
- `src/MapLibre/core/mapLibre-init.types.ts`
- `src/MapLibre/core/useMapPluginHost.ts`
- `src/MapLibre/core/useTerradrawControlLifecycle.ts`

适用问题：

- 地图实例怎么创建
- 对外 expose 了什么
- 插件宿主怎么挂载
- TerraDraw / Measure 控件什么时候初始化

### 我想看业务接入主入口

先看：

- `src/business.ts`
- `src/entries/business.ts`
- `src/MapLibre/facades/useBusinessMap.ts`

适用问题：

- 业务页应该先 import 什么
- 高层门面聚合了哪些能力
- 业务层如何通过 `useBusinessMap().plugins.*` 统一读取插件状态和动作
- 业务层如何通过 `createBusinessPlugins()` 统一注册常用插件

### 我想看业务 source 和图层组织

先看：

- `src/MapLibre/facades/createMapBusinessSource.ts`
- `src/MapLibre/facades/mapBusinessLayer.ts`
- `src/MapLibre/facades/MapBusinessSourceLayers.vue`

适用问题：

- 业务 GeoJSON source 怎么声明
- 图层描述对象怎么组织
- 属性写回策略在哪里定义

### 我想看要素查询、编辑和动作

先看：

- `src/MapLibre/facades/useMapFeatureQuery.ts`
- `src/MapLibre/facades/useMapFeatureActions.ts`
- `src/MapLibre/facades/useMapFeaturePropertyEditor.ts`
- `src/MapLibre/shared/map-feature-data.ts`

适用问题：

- 当前选中了什么要素
- 属性如何保存 / 删除
- 线草稿如何生成或替换
- 属性面板状态怎么拼装

### 我想看插件系统

先看：

- `src/MapLibre/plugins/types.ts`
- `src/plugins.ts`
- `src/plugins/*.ts`
- `src/MapLibre/core/useMapPluginHost.ts`
- `src/MapLibre/facades/mapPluginResolver.ts`
- `src/MapLibre/plugins/*/index.ts`
- 各插件目录下的 `use*Plugin.ts`

适用问题：

- 插件描述对象长什么样
- 插件实例如何创建、复用、销毁
- 插件渲染项如何汇总到地图宿主
- 插件 API 如何通过 `createBusinessPlugins()` 和 `businessMap.plugins.*` 暴露给业务层
- 内部 resolver 如何把插件宿主 API 桥接给业务聚合门面

### 我想看吸附、多选、交点预览、线草稿

优先目录：`src/MapLibre/plugins`

推荐入口：

- 业务注册：`src/plugins.ts`
- 吸附高级入口：`src/plugins/map-feature-snap.ts` 与 `src/MapLibre/plugins/map-feature-snap/*`
- 多选高级入口：`src/plugins/map-feature-multi-select.ts` 与 `src/MapLibre/plugins/map-feature-multi-select/*`
- 交点预览高级入口：`src/plugins/intersection-preview.ts` 与 `src/MapLibre/plugins/intersection-preview/*`
- 线草稿高级入口：`src/plugins/line-draft-preview.ts` 与 `src/MapLibre/plugins/line-draft-preview/*`
- 面边线预览高级入口：`src/plugins/polygon-edge-preview.ts` 与 `src/MapLibre/plugins/polygon-edge-preview/*`

如果需要联动宿主，再看：

- `src/MapLibre/core/useMapPluginHost.ts`
- `src/MapLibre/facades/mapPluginResolver.ts`

`mapPluginResolver.ts` 是门面内部桥接层，不是业务页面首选接入入口。业务页面读取插件能力时优先使用 `useBusinessMap().plugins.*`。

### 我想看 TerraDraw 集成

先看：

- `src/MapLibre/terradraw/terradraw-config.ts`
- `src/MapLibre/terradraw/terradraw-mode-factory.ts`
- `src/MapLibre/terradraw/useTerradrawInteractive.ts`
- `src/MapLibre/core/useTerradrawControlLifecycle.ts`

适用问题：

- 模式默认配置从哪来
- TerraDraw 模式怎么创建
- 绘制交互怎么接到地图宿主上
- 控件生命周期怎么编排

### 我想看线装饰、贴图和样式计算

先看：

- `src/MapLibre/terradraw/useTerradrawLineDecoration.ts`
- `src/MapLibre/terradraw/TerradrawLineDecorationLayers.vue`
- `src/MapLibre/terradraw/TerradrawPatternRasterItem.vue`
- `src/MapLibre/terradraw/TerradrawStretchRasterItem.vue`
- `src/MapLibre/shared/map-layer-style-config.ts`

适用问题：

- 线上的图案或符号如何生成
- 拉伸贴图和 pattern 贴图如何处理
- 线装饰样式怎样归一化

### 我想看共享类型、样式和数据工具

先看：

- `src/MapLibre/shared/map-common-tools.ts`
- `src/MapLibre/shared/map-feature-data.ts`
- `src/MapLibre/shared/map-layer-style-config.ts`
- `src/MapLibre/shared/mapLibre-controls-types.ts`

适用问题：

- 公共 feature 类型和工具在哪里
- 属性面板状态与属性策略在哪里
- 图层样式工厂在哪里
- 控件类型和 TerraDraw 选项在哪里

### 我想看底层交互组合能力

先看：

- `src/MapLibre/composables/useMapInteractive.ts`
- `src/MapLibre/composables/usePluginLayerInteractive.ts`
- `src/MapLibre/composables/useMapDataUpdate.ts`
- `src/MapLibre/composables/useMapEffect.ts`

适用问题：

- 普通图层交互是怎样抽象的
- 插件托管图层交互怎么转成统一结构
- GeoJSON 数据怎样更新
- 副作用和监听怎样组织

## 按角色找文件

### 业务接入方

只需先关注：

- `README.md`
- `src/business.ts`
- `src/MapLibre/facades/useBusinessMap.ts`
- `examples/views/NG/GI/NGGI00.vue`

### 插件开发者

只需先关注：

- `src/MapLibre/plugins/types.ts`
- `src/plugins/*.ts`
- `src/MapLibre/core/useMapPluginHost.ts`
- 目标插件目录的 `index.ts` 与 `use*Plugin.ts`

### TerraDraw 维护者

只需先关注：

- `src/MapLibre/terradraw/README.md`
- `src/MapLibre/terradraw/terradraw-config.ts`
- `src/MapLibre/terradraw/useTerradrawInteractive.ts`
- `src/MapLibre/terradraw/useTerradrawLineDecoration.ts`

## 不建议作为首读入口的地方

- `examples/**`：它更适合验证接入结果，不适合反推完整架构
- `src/MapLibre/shared/**`：这里偏底层工具，适合作为二次下钻目标
- 超大文件中部实现：先看文件头导航，再搜对应关键词，不要一开始从中段硬读

## 相关导读

- 顶层总览：`README.md`
- 宿主导读：`src/MapLibre/core/README.md`
- 门面导读：`src/MapLibre/facades/README.md`
- 插件导读：`src/MapLibre/plugins/README.md`
- TerraDraw 导读：`src/MapLibre/terradraw/README.md`
