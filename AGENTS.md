# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue 3 组件库，封装 MapLibre GL JS，提供插件化架构的地图容器 `MapLibreInit`，集成 TerraDraw 绘图工具。以 ES 模块多入口方式发布。

## 维护原则

### npm 库优先

- 本项目是 **npm 组件库**，不是业务项目
- 所有设计服务于"外部项目消费"目标
- 判断标准：**真实项目安装后，能否仅依赖公开出口完成接入**

### 门面模式

- 对外能力必须通过门面出口暴露：`src/index.ts`、`src/geometry.ts`、`src/plugins/*.ts`
- 业务层、示例层、`views/` 禁止直接依赖 `src/MapLibre/**` 内部实现
- 示例需要底层能力时，先导出到门面入口，再通过门面消费
- `@/` 别名仅用于库内部实现，业务模拟层使用门面路径

### NGGI 业务模拟规则

- `src/views/NG/GI/**` 是业务层模拟页面，演示真实项目如何消费 npm 包
- 引用库能力使用包名或公开子路径：`vue-maplibre-kit`、`vue-maplibre-kit/geometry`、`vue-maplibre-kit/plugins/...`
- mock 数据、示例资源放在页面邻近目录，不污染库核心目录
- 禁止直接 import 库内部私有模块

### 新增能力执行规则

新增能力时同步检查：
- `src` 门面导出是否完整
- `package.json` 的 `exports` 是否需要补充
- Vite / TypeScript 别名是否需要同步
- 示例页是否已改用公开出口

### 示例与核心边界

- `src/MapLibre/**`：库核心实现区，避免被业务模拟层直接引用
- `src/views/**`：开发演示区，不属于库发布物，不决定核心实现耦合方式

## Commands

- `npm run dev` — 开发服务器
- `npm run build` — 类型检查 + 构建库
- `npm run preview` — 预览构建结果

## Build Configuration

Vite 库模式多入口：
- `src/index.ts` → 主入口（MapLibreInit + 核心类型）
- `src/geometry.ts` → 几何工具
- `src/plugins/*.ts` → 插件入口（tree-shaking）

外部依赖（不打包）：vue, maplibre-gl, vue-maplibre-gl, terra-draw, @watergis/maplibre-gl-terradraw, element-plus, geojson, mitt, lodash-es

## Architecture

### 核心容器 `src/MapLibre/core/mapLibre-init.vue`

挂载 MapLibre 地图，管理控件、TerraDraw 绘图/测量工具、图层交互、插件系统。

### 插件系统 `src/MapLibre/plugins/`

- 通过 `defineMapPlugin()` 定义，`plugins` prop 注册
- 插件接收 `MapPluginContext`，返回 `MapPluginInstance`（可贡献渲染项、交互补丁、snap 服务、API）
- 内置插件：`map-feature-snap`（捕捉）、`line-draft-preview`（线预览）

### 关键模式

- 中文注释和 JSDoc
- Composable 模式（`use*`、`create*`）
- `shallowRef` 避免深度响应
- 描述符数组注册插件，支持动态增删和实例复用
- 门面优先导出，示例消费门面而非内部路径

## 开发决策检查清单

1. 改动是否符合"npm 库优先"目标？
2. 业务模拟层是否只依赖门面出口？
3. 示例页需要新能力时，是否已先补齐公共门面？
4. mock 数据、示例资源是否留在业务模拟层？
