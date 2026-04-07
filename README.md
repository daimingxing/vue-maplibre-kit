# vue-maplibre-kit

A GIS toolkit based on **Vue 3**, **MapLibre GL**, and **TerraDraw**, designed for building reusable and extensible WebGIS applications.

`vue-maplibre-kit` is extracted from real-world business scenarios and focuses on map initialization, layer management, interaction handling, drawing and measurement, and plugin-based extension. It helps developers integrate GIS capabilities in a more declarative and engineering-oriented way, reducing the complexity of WebGIS development.

## Features

- Built with **Vue 3 + TypeScript**
- Uses **MapLibre GL** for map rendering
- Uses **TerraDraw** for drawing and interaction
- Encapsulates map initialization and base configuration
- Supports layer management and business interaction extension
- Supports common GIS tools such as drawing and measurement
- Supports plugin-based extension for reusable business capabilities
- Designed for real-world scenarios and suitable as a base engine layer for WebGIS projects

## Use Cases

- Map display pages in business systems
- GIS applications requiring drawing, annotation, and measurement
- Admin or enterprise projects that need unified map interaction protocols
- Vue projects that need reusable GIS base capabilities
- Personal or team projects that want to reuse MapLibre + TerraDraw capabilities

## Tech Stack

- [Vue 3](https://vuejs.org/)
- [MapLibre GL JS](https://maplibre.org/)
- [TerraDraw](https://terradraw.io/)
- [@watergis/maplibre-gl-terradraw](https://www.npmjs.com/package/@watergis/maplibre-gl-terradraw)
- TypeScript

## Installation

```bash
npm install vue-maplibre-kit
```

If the package has not been published to npm yet, you can still develop and test it locally:

```bash
npm install
npm run dev
```

## Project Positioning

`vue-maplibre-kit` is not a single map component. It is a GIS capability toolkit centered around **map rendering**, **drawing and interaction**, and **business extensibility**.

It mainly focuses on the following aspects:

1. Standardizing map initialization
2. Standardizing layer and interaction integration
3. Standardizing drawing and measurement integration
4. Supporting business plugin extension
5. Reducing the complexity of directly operating low-level GIS libraries in business pages

## Core Capabilities

### 1. Map Foundation Encapsulation

Provides unified encapsulation for MapLibre map instances, basemap initialization, and map control mounting.

### 2. Layer Management

Supports business layer configuration, rendering, and interaction logic management.

### 3. Interaction Handling

Supports interaction extension such as click, hover, and selection, making GIS page behavior easier to standardize.

### 4. Drawing and Measurement

Built on TerraDraw and its related ecosystem to support common GIS operations such as drawing, editing, and measurement.

### 5. Plugin Extension

Supports mounting complex business logic into the map engine in a plugin-based way, improving reusability and maintainability.

## Development

Start the development environment:

```bash
npm install
npm run dev
```

Build the project:

```bash
npm run build
```

## Design Goals

- **Declarative**: describe map capabilities through configuration as much as possible, instead of directly operating low-level APIs in business code
- **Reusable**: extract common GIS capabilities from specific business scenarios
- **Extensible**: support plugin-based access for complex business capabilities
- **Engineering-oriented**: reduce the maintenance cost of GIS business pages
- **Open and lightweight**: built on open-source ecosystems for long-term evolution

## Roadmap

- Extract more stable public APIs
- Improve layer management and interaction configuration
- Refine drawing and measurement tool encapsulation
- Add more complete example pages
- Improve documentation and usage guides
- Publish to npm for reuse in independent projects

## License

[MIT](./LICENSE)

## Notes

This is an evolving personal GIS toolkit project, currently used to accumulate WebGIS development capabilities based on Vue 3, MapLibre GL, and TerraDraw. Documentation, examples, and release workflows will be improved gradually.

---

# 中文说明

一个基于 **Vue 3**、**MapLibre GL** 和 **TerraDraw** 的 GIS 工具库，用于快速构建可复用、可扩展的 WebGIS 应用。

`vue-maplibre-kit` 从实际业务场景中沉淀而来，围绕地图初始化、图层管理、交互控制、绘制测量和插件扩展等能力进行封装，帮助开发者以更声明式、更工程化的方式集成地图能力，降低 WebGIS 页面开发成本。

## 特性

- 基于 **Vue 3 + TypeScript**
- 基于 **MapLibre GL** 提供地图渲染能力
- 基于 **TerraDraw** 提供绘制与交互能力
- 支持地图初始化与基础配置封装
- 支持图层管理与业务交互扩展
- 支持绘制、测量等常见 GIS 工具能力
- 支持插件化扩展，便于沉淀业务能力
- 面向业务场景设计，适合作为 WebGIS 项目的基础引擎层

## 适用场景

- 业务系统中的地图展示页面
- 需要绘制、标注、测量的 GIS 应用
- 需要统一地图交互协议的中后台项目
- 需要沉淀地图基础能力的 Vue 项目
- 需要复用 MapLibre + TerraDraw 能力的个人或团队项目

## 技术栈

- [Vue 3](https://vuejs.org/)
- [MapLibre GL JS](https://maplibre.org/)
- [TerraDraw](https://terradraw.io/)
- [@watergis/maplibre-gl-terradraw](https://www.npmjs.com/package/@watergis/maplibre-gl-terradraw)
- TypeScript

## 安装

```bash
npm install vue-maplibre-kit
```

如果当前阶段还未正式发布到 npm，也可以先在本地开发和调试：

```bash
npm install
npm run dev
```

## 项目定位

`vue-maplibre-kit` 不是单一地图组件，而是一个围绕 **地图渲染、绘制交互、业务扩展** 的 GIS 能力封装项目。

它更关注以下几个方面：

1. 统一地图初始化方式
2. 统一图层和交互接入方式
3. 统一绘制与测量能力接入方式
4. 支持业务插件扩展
5. 降低业务页面直接操作底层地图库的复杂度

## 核心能力

### 1. 地图基础封装

对 MapLibre 地图实例、底图初始化、地图控件挂载等进行统一封装。

### 2. 图层管理

支持业务图层配置、图层渲染和图层交互逻辑管理。

### 3. 交互能力

支持地图点击、悬浮、选中等交互扩展，便于统一 GIS 页面行为。

### 4. 绘制与测量

基于 TerraDraw 及其相关生态能力，支持绘制、编辑、测量等常用 GIS 操作。

### 5. 插件扩展

支持将复杂业务逻辑以插件方式挂载到地图引擎中，提升复用性与可维护性。

## 开发说明

启动开发环境：

```bash
npm install
npm run dev
```

构建项目：

```bash
npm run build
```

## 设计目标

- **声明式**：尽量通过配置描述地图能力，而不是让业务代码直接操作底层 API
- **可复用**：将通用 GIS 能力从具体业务中抽离出来
- **可扩展**：支持插件化接入复杂业务能力
- **工程化**：降低地图业务页面的维护成本
- **轻量开放**：基于开源生态构建，便于后续持续演进

## 未来规划

- 抽离更稳定的公共 API
- 优化图层管理与交互配置方式
- 完善绘制与测量工具封装
- 补充更完整的示例页面
- 完善文档与使用说明
- 发布到 npm 供独立项目复用

## License

[MIT](./LICENSE)

## 说明

这是一个持续演进中的个人 GIS 工具库项目，当前主要用于沉淀基于 Vue 3、MapLibre GL 和 TerraDraw 的 WebGIS 开发能力。后续会逐步完善文档、示例和发布流程。
