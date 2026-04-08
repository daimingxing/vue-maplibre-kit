# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

`vue-maplibre-kit` is a Vue 3 component library that wraps MapLibre GL JS with a plugin-based architecture. It provides a unified map container (`MapLibreInit`) that manages map controls, drawing/measurement tools (via TerraDraw), layer interactions, and extensible plugins. The library is published as an ES module with multiple entry points.

## 维护原则

### npm 库优先

- 本项目首先是一个 **npm 组件库**，不是业务项目。
- 任何功能设计、目录划分、依赖关系与示例写法，都要优先服务于“发布后被外部项目消费”这一目标。
- 判断一项改动是否合理时，默认先问：**真实业务项目在安装 `vue-maplibre-kit` 后，能否仅依赖公开出口完成接入**。

### 门面模式

- 本项目使用 **门面模式（Facade Pattern）** 管理对外能力暴露。
- 对外可消费能力必须优先通过以下门面出口暴露：
  - `src/index.ts`
  - `src/geometry.ts`
  - `src/plugins/*.ts`
- 业务层、示例层、`views/` 下的模拟页面，不允许直接依赖 `src/MapLibre/**` 下的内部实现细节。
- 如果某个示例或业务模拟页面需要某项底层能力，应先将该能力整理并导出到合适的门面入口，再由页面通过门面入口消费。
- 门面层职责是提供稳定、清晰、低耦合的公共 API；内部目录结构可以重构，但不能让调用方感知内部重排。

### NGGI 业务模拟规则

- `src/views/NG/GI/**`，尤其是 `NGGI00.vue`，定位为 **业务层模拟页面**，用于演示真实项目如何消费 npm 包。
- NGGI 页面必须尽量按照外部业务项目的接入方式编写，而不是按照仓库内部源码直连方式编写。
- NGGI 页面引用库能力时，应优先使用包名或公开子路径，例如：
  - `vue-maplibre-kit`
  - `vue-maplibre-kit/geometry`
  - `vue-maplibre-kit/plugins/...`
- NGGI 页面中的 mock 数据、图片、示例配置、业务表单和演示逻辑，应视为业务层资产，尽量放在页面邻近目录中维护，不要反向污染库核心目录。
- 不要为了方便示例开发，而让 NGGI 页面直接 import 库内部私有模块；这种写法会削弱门面边界，和 npm 库维护目标冲突。

### 新增能力时的执行规则

- 新增通用能力时，先判断它属于：
  - 库内部实现细节
  - 应对外暴露的公共能力
- 若该能力需要被业务层、示例层或第三方项目使用，必须补充到对应门面出口，而不是让调用方绕过门面直接访问内部文件。
- 若新增了新的公开子路径或公共能力，应同步检查：
  - `src` 下的门面导出是否完整
  - `package.json` 的 `exports` 是否需要补充
  - Vite / TypeScript 开发态别名是否需要同步
  - 示例页是否已改为通过公开出口使用该能力

### 示例与核心的边界

- `src/MapLibre/**` 是库核心实现区，允许内部重构，但应尽量避免被业务模拟层直接引用。
- `src/views/**` 是开发演示与业务模拟区，不属于库发布物，不应反向决定核心实现的耦合方式。
- 示例页可以帮助验证 API 设计是否合理，但不能通过“直接引用内部模块”来掩盖公共 API 缺失问题。

## Commands

- **Dev server**: `npm run dev` (Vite dev server)
- **Build**: `npm run build` (runs `vue-tsc -b && vite build` — type-checks then builds library)
- **Preview**: `npm run preview`
- No test runner or linter is configured.

## Build Configuration

Vite library mode with multiple entry points:
- `src/index.ts` → main entry (MapLibreInit component + core types)
- `src/geometry.ts` → geometry utilities (line extension, corridor, measurement tools)
- `src/plugins/map-feature-snap.ts` → snap plugin (re-exports from `src/MapLibre/plugins/map-feature-snap/`)
- `src/plugins/line-draft-preview.ts` → line draft preview plugin (re-exports from `src/MapLibre/plugins/line-draft-preview/`)

External dependencies (not bundled): vue, maplibre-gl, vue-maplibre-gl, terra-draw, @watergis/maplibre-gl-terradraw, element-plus, geojson, mitt, lodash-es.

Path alias: `@/` → `./src/`

约束补充：
- `@/` 别名主要服务于库内部实现。
- 业务模拟层若要表达“外部项目如何接入 npm 包”，应优先使用门面路径而不是 `@/MapLibre/**` 形式的内部路径。

## Architecture

### Core Container — `src/MapLibre/core/mapLibre-init.vue`

The central component. It:
1. Mounts the MapLibre GL map via `vue-maplibre-gl`'s `MglMap`
2. Manages standard map controls (navigation, fullscreen, scale, etc.) via `controls` prop
3. Hosts TerraDraw drawing and measurement controls (`MaplibreTerradrawControl`, `MaplibreMeasureControl`)
4. Manages line decoration layers for draw/measure tools
5. Delegates to the **plugin host** for extensible capabilities

Props: `mapKey`, `mapOptions`, `controls`, `mapInteractive`, `plugins`

### Plugin System — `src/MapLibre/plugins/types.ts` + `src/MapLibre/core/useMapPluginHost.ts`

Plugins are defined with `defineMapPlugin()` and registered via the `plugins` prop on `MapLibreInit`. Each plugin:
- Has a `type` string and `createInstance(context)` factory
- Receives a `MapPluginContext` with access to map instance, options, and interaction state
- Returns a `MapPluginInstance` that can contribute: render items (Vue components injected into the map), map interactive patches, snap services, API, and reactive state

The plugin host (`useMapPluginHost`) manages plugin lifecycle (create/reuse/destroy), aggregates render items and interaction patches, and exposes a query interface (`MapPluginHostExpose`).

Built-in plugins:
- **map-feature-snap** (`src/MapLibre/plugins/map-feature-snap/`): Provides snap-to-feature capability for map layers and TerraDraw tools. Contributes a `mapSnap` service.
- **line-draft-preview** (`src/MapLibre/plugins/line-draft-preview/`): Manages temporary line/corridor draft previews with their own data source and rendering.

### Layer Interaction — `src/MapLibre/composables/useMapInteractive.ts`

Unified hover/click/select management for regular map layers. Handles feature-state hover/selected, cursor changes, snap integration, and event delegation with priority ordering.

### Key Patterns

- **Chinese comments**: All code comments and JSDoc are written in Chinese (Simplified).
- **Composable pattern**: Business logic is extracted into `use*` composables and `create*` factory functions.
- **ShallowRef for instances**: Control refs and plugin records use `shallowRef` to avoid deep reactivity on complex objects.
- **Descriptor-based plugin registration**: Plugins are passed as descriptor arrays, enabling dynamic add/remove with instance reuse when type+definition unchanged.
- **TerraDraw mode instantiation**: Mode config objects are deep-merged then manually instantiated into TerraDraw mode classes (TerraDrawLineStringMode, etc.).
- **Facade-first exports**: Public capabilities should be exported from facade entry files first; demos should consume facade exports instead of internal implementation paths.

## TypeScript

- Solution-style tsconfig: `tsconfig.json` references `tsconfig.app.json` (source) and `tsconfig.node.json` (vite config)
- Strict unused checks enabled (`noUnusedLocals`, `noUnusedParameters`)
- Uses `@vue/tsconfig/tsconfig.dom.json` as base for app config

## File Organization

```
src/
  index.ts                    # Main library entry
  geometry.ts                 # Geometry utilities entry
  plugins/                    # Thin re-export entry points for tree-shaking
  MapLibre/
    core/                     # MapLibreInit component + plugin host
    plugins/                  # Plugin implementations (each in own directory)
      types.ts                # Core plugin type system
      map-feature-snap/       # Snap plugin
      line-draft-preview/     # Line draft preview plugin
    composables/              # Shared composables (useMapInteractive, useMapEffect, useMapDataUpdate)
    shared/                   # Shared types and utilities
    terradraw/                # TerraDraw integration (config, interaction, line decoration)
  views/                      # Demo/dev views (not part of library build)
docs/                         # Knowledge base references for MapLibre, TerraDraw, vue-maplibre-gl
```

## 开发决策检查清单

在修改功能、补示例或新增导出前，优先检查以下问题：

1. 这次改动是否仍然符合“npm 库优先”的目标？
2. 业务模拟层是否只依赖门面出口，而没有直连内部实现？
3. 如果示例页需要新能力，是否已经先补齐公共门面？
4. mock 数据、示例资源、业务态代码是否仍然留在业务模拟层，而不是泄漏到核心库目录？
