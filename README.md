# vue-maplibre-kit

面向 **npm 发布** 的 Vue 3 地图组件库，核心基于 `MapLibre GL JS`，并集成 `TerraDraw`、业务门面、几何工具和插件系统。

它不是业务页面模板仓库，而是给外部项目稳定消费的地图能力层：**先定义公开门面，再组织内部实现。**

## 30 秒首读清单

第一次进入仓库，优先只看这 6 个文件：

1. `src/business.ts`
2. `src/plugins.ts`
3. `src/index.ts`
4. `src/MapLibre/facades/useBusinessMap.ts`
5. `src/MapLibre/core/mapLibre-init.vue`
6. `docs/file-index.md`

如果还要继续下钻：

- 入口源码：看 `src/entries/*.ts`
- 插件体系：看 `src/plugins.ts`、`src/plugins/*.ts` 和 `src/MapLibre/plugins/README.md`
- TerraDraw：看 `src/MapLibre/terradraw/README.md`
- 精准定位：看 `docs/file-index.md`

## 项目定位

- **这是一个库**：优先考虑“外部项目如何通过公开出口稳定接入”
- **不是业务源码集合**：`examples/**` 只承担验证和演示职责
- **不是内部路径直引项目**：外部消费和示例页都应优先走公开入口

## 推荐阅读路径

### 外部使用者

按这个顺序读最省时间：

1. `README.md`
2. `docs/vue-maplibre-kit-knowledge/index.md`
3. `docs/vue-maplibre-kit-knowledge/00-开始使用/index.md`
4. `docs/vue-maplibre-kit-knowledge/02-公开入口/index.md`
5. `docs/vue-maplibre-kit-knowledge/09-插件/index.md`

### 维护者

按这个顺序更容易建立完整心智模型：

1. `src/business.ts`
2. `src/plugins.ts`
3. `src/entries/*.ts`
4. `src/MapLibre/core/mapLibre-init.vue`
5. `src/MapLibre/core/useMapPluginHost.ts`
6. `src/MapLibre/terradraw/useTerradrawInteractive.ts`
7. `docs/file-index.md`

## 公开入口与使用场景

| 场景 | 推荐入口 | 说明 |
| --- | --- | --- |
| 业务页面接入 | `vue-maplibre-kit/business` | 优先入口，收口高频业务能力；插件状态和动作统一从 `useBusinessMap().plugins.*` 读取 |
| 完整公开能力 | `vue-maplibre-kit` | 根入口，适合组件、类型、底层能力按需引入 |
| 几何计算 | `vue-maplibre-kit/geometry` | 几何工具、来源引用工具 |
| 常用插件注册 | `vue-maplibre-kit/plugins` | 聚合入口，推荐用 `createBusinessPlugins()` 注册 snap、line-draft、intersection、multi-select、dxf-export |
| 单插件高级用法 | `vue-maplibre-kit/plugins/*` | 插件子路径公开入口，仅用于深度定制、常量和高级类型 |
| 地图控件样式 | `vue-maplibre-kit/style.css` | MapLibre、Vue MapLibre、TerraDraw 控件样式 |

### 最小导入示例

```ts
import 'vue-maplibre-kit/style.css';
import { MapLibreInit, useBusinessMap } from 'vue-maplibre-kit/business';
import { createBusinessPlugins } from 'vue-maplibre-kit/plugins';
```

业务插件建议只记两步：注册插件用 `createBusinessPlugins()`，读取插件状态和动作统一用 `useBusinessMap().plugins.*`。
例如 `businessMap.plugins.lineDraft`、`businessMap.plugins.intersection`、`businessMap.plugins.multiSelect`、`businessMap.plugins.snap`、`businessMap.plugins.dxfExport`。

## 知识库

系统化使用说明请从 [vue-maplibre-kit 知识库](docs/vue-maplibre-kit-knowledge/index.md) 开始。

知识库按渐进式披露组织：

- [开始使用](docs/vue-maplibre-kit-knowledge/00-开始使用/index.md)：安装、样式、最小地图、推荐引入方式
- [公开入口](docs/vue-maplibre-kit-knowledge/02-公开入口/index.md)：`business`、`plugins`、`config`、`geometry` 和根入口
- [插件](docs/vue-maplibre-kit-knowledge/09-插件/index.md)：snap、line-draft、intersection、multi-select、dxf-export
- [全局配置](docs/vue-maplibre-kit-knowledge/11-全局配置/index.md)：地图、控件、插件、样式默认值
- [示例索引](docs/vue-maplibre-kit-knowledge/14-示例索引/index.md)：`NGGI00` 到 `NGGI11` 的能力索引
- [API 参考](docs/vue-maplibre-kit-knowledge/15-API参考/index.md)：按公开入口查导出

## 项目术语

### 门面与边界

- **公开入口**：对外稳定暴露的 import 路径，例如 `vue-maplibre-kit`、`vue-maplibre-kit/business`
- **门面层（facades）**：把业务侧高频能力收口成更容易消费的 API 层
- **内部实现**：`src/MapLibre/**` 下的私有实现细节，不应作为外部项目默认接入路径

### 数据与图层

- **business source**：业务 GeoJSON 数据源的门面对象，负责数据、图层、属性编辑策略等组织方式
- **business layer**：业务图层描述对象，定义点、线、面、符号等业务图层如何声明
- **feature ref**：用于稳定定位某个要素的来源引用，通常包含 source、id 等上下文
- **feature-state**：MapLibre 的要素状态层，用于 hover、selected、临时高亮等渲染态控制

### 插件系统

- **plugin descriptor**：插件描述对象，声明插件类型、实例工厂和配置
- **plugin host**：插件宿主，负责插件实例创建、复用、销毁、状态桥接和渲染聚合
- **plugin api**：插件对外暴露给门面层或业务层调用的能力集合
- **business plugins**：业务插件预设，常用插件优先用 `createBusinessPlugins()` 生成描述对象列表
- **businessMap.plugins**：业务层读取插件状态和动作的统一入口，避免分别记忆多个插件 `use*` 门面
- **managed preview**：由系统托管的预览要素，例如线草稿、交点预览等临时渲染结果

### TerraDraw 集成

- **TerraDraw mode**：绘制模式，例如点、线、面、矩形、选择等行为单元
- **snap service**：吸附服务，负责普通图层或绘制过程中的吸附能力
- **line decoration**：线装饰渲染能力，负责线上的图案、贴图、重复符号等效果
- **control lifecycle**：控件生命周期，指控件创建、挂载、更新、销毁的编排过程

## 仓库结构

### 顶层目录

- `src/`：发布源码与公开入口
- `docs/`：架构索引、补充说明、过程文档
- `examples/`：开发演示与验证页
- `public/`：示例静态资源

### `src` 关键分层

- `src/index.ts`：根入口
- `src/business.ts`：业务优先入口
- `src/plugins.ts`：插件聚合入口
- `src/geometry.ts`：几何工具入口
- `src/entries/*.ts`：主题化公开入口源码
- `src/plugins/*.ts`：插件子路径公开入口
- `src/MapLibre/core`：地图宿主、插件宿主、控件生命周期
- `src/MapLibre/facades`：高层业务门面
- `src/MapLibre/plugins`：插件内部实现
- `src/MapLibre/terradraw`：TerraDraw 集成与线装饰能力
- `src/MapLibre/shared`：共享类型、样式、数据工具
- `src/MapLibre/composables`：通用组合式能力

## 我想找什么，应该先看哪

- **地图初始化与 expose**：`src/MapLibre/core/mapLibre-init.vue`
- **插件宿主**：`src/MapLibre/core/useMapPluginHost.ts`
- **业务接入总入口**：`src/MapLibre/facades/useBusinessMap.ts`
- **业务 source 与图层组织**：`src/MapLibre/facades/createMapBusinessSource.ts`
- **要素查询 / 编辑 / 动作**：`src/MapLibre/facades/useMapFeatureQuery.ts`、`src/MapLibre/facades/useMapFeatureActions.ts`
- **TerraDraw 模式与配置**：`src/MapLibre/terradraw/terradraw-config.ts`
- **TerraDraw 交互主流程**：`src/MapLibre/terradraw/useTerradrawInteractive.ts`
- **线装饰**：`src/MapLibre/terradraw/useTerradrawLineDecoration.ts`

更完整的“问题 -> 文件”索引，直接看 `docs/file-index.md`。

## 维护约束

### npm 库优先

任何改动都优先检查这三件事：

- 外部项目能否只通过公开出口完成接入
- `package.json` 的 `exports` 是否同步
- 示例页是否仍使用包名路径，而不是直引私有实现

### 私有实现边界

以下路径属于内部实现，不建议外部项目或示例页直接依赖：

- `src/MapLibre/core/**`
- `src/MapLibre/facades/**`
- `src/MapLibre/plugins/**`
- `src/MapLibre/terradraw/**`
- `src/MapLibre/shared/**`

推荐优先通过：

- `vue-maplibre-kit`
- `vue-maplibre-kit/business`
- `vue-maplibre-kit/geometry`
- `vue-maplibre-kit/plugins`
- `vue-maplibre-kit/plugins/*`

## 子目录导读

继续阅读时，优先看这些目录级导读：

- `src/MapLibre/core/README.md`
- `src/MapLibre/facades/README.md`
- `src/MapLibre/plugins/README.md`
- `src/MapLibre/terradraw/README.md`

## 许可证

[MIT](./LICENSE)
