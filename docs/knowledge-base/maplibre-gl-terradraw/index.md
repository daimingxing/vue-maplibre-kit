# watergis/maplibre-gl-terradraw 使用指南

欢迎查阅 `@watergis/maplibre-gl-terradraw` 的使用指南。本知识库文档采用“总-分”结构，本文档为**主索引文件**，介绍了该库的核心概念、核心组件以及各子主题的作用。详细的配置和使用说明请参考 `references` 目录下的具体文档。

## 1. 简介

`@watergis/maplibre-gl-terradraw` 是一个为 **MapLibre GL JS** 提供绘图控件（Control）的插件。它底层基于强大的 [Terra Draw](https://github.com/JamesLMilner/terra-draw) 引擎，并在其之上封装了一套开箱即用的 UI 工具栏。

**核心优势**：
- **开箱即用**：自带一套完整、美观的绘制 UI 控件，不需要自行用原生 DOM/Vue 开发工具栏。
- **功能丰富**：支持画点、线、多边形、矩形、圆形、自由手绘（Freehand）等多种模式。
- **无缝集成**：作为标准的 MapLibre Control 插件运行，通过 `map.addControl()` 即可挂载。

## 2. 核心组件

该库主要提供了以下两个地图控件：
1. **`MaplibreTerradrawControl`**：用于标准的几何图形绘制（点、线、面等）及编辑操作。
2. **`MaplibreMeasureControl`**：用于地图上的距离、面积测量功能，并支持结合高程数据（Terrain DEM）计算地形距离。

## 3. 详细指南索引 (References)

为了帮助您从入门到精通，我们提供了以下详细的参考文档。请点击以下链接（或查看 `references/` 目录下的文件）获取具体内容：

- 🚀 **[入门指南与基础配置](./references/getting_started.md)**
  - 安装插件及引入样式。
  - Vue 3 及原生 JS 中的挂载方式。
  - 设置坐标精度 (Coordinate Precision)。
  
- ⚙️ **[绘制模式与选项配置](./references/drawing_modes.md)**
  - 工具栏模式的按需加载与显隐配置。
  - 深度配置绘制行为（`modeOptions`），如限制拖拽或缩放。
  - 同一地图内同时使用绘制控件和测量控件。

- 📊 **[数据交互与样式定制](./references/data_and_style.md)**
  - 加载和渲染外部 GeoJSON 数据。
  - 修改各绘制模式下的图形样式（颜色、线宽、透明度等）。
  - 基于不同状态（如选中状态）的样式重写。

- 📏 **[测量与高程 (Measure & Elevation)](./references/measure_and_elevation.md)**
  - `MaplibreMeasureControl` 测量距离与面积。
  - 结合 MapLibre 栅格高程地形 (Raster DEM / Terrain-RGB) 查询地形起伏并计算实际地表距离。
  - 更改测量文本的字体。

- 🎨 **[UI 与主题定制](./references/ui_customization.md)**
  - 如何使用自定义的 SVG 图标替换默认的绘图按钮图标。
  - 应用流行的毛玻璃主题 (Glass Theme) 或其他 CSS 深度定制方案。

- 🔌 **[高级 API 与编程式控制](./references/api_and_customization.md)**
  - 获取 `TerraDraw` 底层实例。
  - 使用外部 Vue 按钮等编程式控制绘制模式，并同步插件按钮状态。
  - 事件监听（如 `mode-changed`, `select`, `finish` 等）。
