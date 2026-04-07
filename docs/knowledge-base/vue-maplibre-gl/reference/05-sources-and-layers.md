# 数据源与图层

## 组件清单
数据源组件：
- MglGeoJsonSource
- MglVectorSource
- MglRasterSource
- MglRasterDemSource
- MglImageSource
- MglVideoSource
- MglCanvasSource

图层组件：
- MglBackgroundLayer
- MglCircleLayer
- MglFillLayer
- MglFillExtrusionLayer
- MglHeatmapLayer
- MglHillshadeLayer
- MglLineLayer
- MglRasterLayer
- MglSymbolLayer

## 组合方式
Source 组件作为容器，子元素为 Layer 组件；或在 Layer 上直接传入 source。

## 数据源 (Source) 详解
在 MapLibre 中，**Source 负责提供数据，Layer 负责定义数据的样式**。一个 Source 可以被多个 Layer 共享渲染。

### 1. 常见数据源类型及作用
*   **MglGeoJsonSource (`geojson`)**: 最常用的数据源。用于加载前端生成的、或接口返回的 GeoJSON 格式的矢量数据（点、线、面）。适合数据量适中、需要频繁更新和交互的业务数据。
*   **MglVectorSource (`vector`)**: 矢量瓦片数据源。用于加载按金字塔层级切割好的 `.mvt` 或 `.pbf` 格式的矢量切片（如 Mapbox/MapTiler 提供的底图数据）。适合海量数据、全国/全球级别的渲染。
*   **MglRasterSource (`raster`)**: 栅格瓦片数据源。用于加载传统的图片切片（如天地图卫星影像、高德瓦片、WMS 服务）。
*   **MglRasterDemSource (`raster-dem`)**: 包含高程信息的特殊栅格瓦片。专门配合 `MglHillshadeLayer` 使用，用于渲染 3D 地形阴影。
*   **MglImageSource (`image`)**: 图像数据源。将一张单张静态图片（如一张手绘地图）贴到地图指定的四个角坐标上。
*   **MglVideoSource (`video`)**: 视频数据源。将视频流贴到地图指定的地理范围内。
*   **MglCanvasSource (`canvas`)**: HTML Canvas 数据源。将一个活动的 Canvas 元素的内容作为纹理实时贴到地图上。

### 2. 所有 Source 组件的通用属性
*   **`sourceId` (必填)**: `String`。当前数据源在地图实例中的唯一标识符。Layer 通过 `sourceId` 或在 Layer 内部嵌套的方式与该 Source 绑定。

### 3. MglGeoJsonSource 核心属性详解
`MglGeoJsonSource` 是业务开发中最核心的数据源组件。
*   **`data`**: `Object | String`。地图数据。可以是完整的 GeoJSON 对象或 URL 字符串。支持响应式更新。
*   **`promoteId`**: `String | Object` ⭐⭐⭐。将 `properties` 里的某个字段提升为 Feature 顶层的原生 `id`，用于支持 Feature State（悬停高亮等）。
*   **`cluster`**: `Boolean`。是否开启点聚合功能（仅限 Point）。
*   **`clusterRadius`**: `Number`。点聚合的半径（默认 `50`）。
*   **`clusterMaxZoom`**: `Number`。执行点聚合的最大缩放级别。
*   **`lineMetrics`**: `Boolean`。是否计算线的几何指标。若需在 `MglLineLayer` 中使用 `line-gradient`，必须设为 `true`。
*   **`generateId`**: `Boolean`。是否让引擎自动为每个 Feature 生成递增的唯一 ID。
*   **`tolerance`**: `Number`。几何图形简化的容差值（默认 `0.375`）。
*   **`buffer`**: `Number`。切片周围保留的缓冲区域大小（默认 `128`）。

### 4. 其他类型 Source 的独有属性详解

#### 4.1 MglVectorSource (矢量瓦片源)
*   **`url`**: `String`。指向 TileJSON 格式的配置文件的 URL（例如 `mapbox://mapbox.mapbox-streets-v8`）。
*   **`tiles`**: `Array<String>`。矢量瓦片的服务端点 URL 数组，通常包含 `{z}`, `{x}`, `{y}` 占位符。*注意：`url` 和 `tiles` 二选一使用。*
*   **`minzoom` / `maxzoom`**: `Number`。提供瓦片数据的最小和最大缩放级别。
*   **`scheme`**: `'xyz' | 'tms'`。瓦片坐标系的类型，默认为 `'xyz'`。
*   **`promoteId`**: `String | Object`。与 GeoJSON 类似，提升矢量切片内部的属性作为顶层 ID。

#### 4.2 MglRasterSource (栅格瓦片源)
*   **`url`**: `String`。指向 TileJSON 格式的配置文件的 URL。
*   **`tiles`**: `Array<String>`。图片瓦片的 URL 数组，支持 `{z}`, `{x}`, `{y}` 占位符。
*   **`tileSize`**: `Number`。栅格瓦片的尺寸，默认通常是 `512`（或某些旧版服务的 `256`）。
*   **`minzoom` / `maxzoom`**: `Number`。
*   **`scheme`**: `'xyz' | 'tms'`。

#### 4.3 MglRasterDemSource (高程栅格源)
*   **`url` / `tiles` / `tileSize` / `minzoom` / `maxzoom`**: 同上。
*   **`encoding`**: `'mapbox' | 'terrarium'`。高程数据的编码方式。由于 DEM 数据是通过 RGB 像素值计算高度的，需指定提供商使用的编码公式，默认是 `'mapbox'`。

#### 4.4 MglImageSource (单张图片源)
*   **`url` (必填)**: `String`。要加载的图片地址。
*   **`coordinates` (必填)**: `Array<Array<Number>>`。一个包含 4 个经纬度坐标对的数组，分别对应图片的左上、右上、右下、左下四个角。图片会被拉伸并贴合在这个多边形区域内。

#### 4.5 MglVideoSource (视频源)
*   **`urls` (必填)**: `Array<String>`。视频源的 URL 数组。建议提供多种格式（如 `.mp4`, `.webm`）以兼容不同浏览器。
*   **`coordinates` (必填)**: `Array<Array<Number>>`。同 ImageSource，定义视频播放的四个角。

#### 4.6 MglCanvasSource (Canvas 纹理源)
*   **`canvas` (必填)**: `String | HTMLCanvasElement`。可以传入一个已存在于 DOM 中的 `<canvas>` 元素的 ID，或者直接传入该 DOM 元素对象。
*   **`coordinates` (必填)**: `Array<Array<Number>>`。定义 Canvas 内容渲染的四个角。
*   **`animate`**: `Boolean`。如果 Canvas 内部有动画（如 ECharts 渲染），设为 `true` 告诉地图在每一帧都重新抓取 Canvas 内容。

## Layer 属性详解
MapLibre 中图层（Layer）的所有核心属性（Props）可以分为以下几大类：

### 1. 核心标识属性
- **layerId** / **layer-id** (必填): 当前图层在地图实例中的唯一标识符。用于图层查找、层级控制或通过代码动态修改样式。

### 2. 视觉与渲染属性
- **paint** (绘制属性): 决定数据“画成什么样”（颜色、透明度、粗细等纯视觉效果）。修改 paint 属性性能开销极小，因为它是直接在 GPU 渲染阶段改变像素颜色。
  - *示例*: `line-color`, `fill-opacity`, `circle-radius`。
- **layout** (布局属性): 决定数据“如何放置和构造几何图形”（元素的排版、显示隐藏、线头形状等）。修改 layout 属性性能开销较大，因为它会触发地图引擎重新计算几何形状和碰撞检测。
  - *示例*: `visibility` ('visible' | 'none'), `line-join`, `text-field`。

### 3. 数据过滤与表达式 (Filter & Expressions)
MapLibre (及其前身 Mapbox GL JS) 的**表达式 (Expressions)** 是其数据驱动样式的灵魂。它允许你使用一种类似于 LISP 的语法（即 `['操作符', 参数1, 参数2, ...]` 的 JSON 数组形式）在 GPU 渲染阶段进行复杂的逻辑计算。表达式不仅可以用于 `filter` 过滤数据，更广泛地用于 `paint` 和 `layout` 属性中，实现**数据驱动样式 (Data-driven styling)**。

#### A. 数据访问表达式 (Data Expressions)
用于从当前正在渲染的要素 (Feature) 中提取数据。
*   **`['get', 'propertyName']`**
    *   **作用**：获取 `properties` 对象中指定键的值。
    *   **示例**：`['get', 'speed']` -> 返回属性中的 speed 值。
*   **`['id']`**：获取要素自身的原生 `id`（不在 `properties` 里的那个 `id`）。
*   **`['has', 'propertyName']`**：判断 `properties` 中是否存在某个键，返回布尔值 `true` 或 `false`。
*   **`['geometry-type']`**：返回要素的几何类型（如 `'Point'`, `'LineString'`, `'Polygon'`）。

#### B. 条件逻辑表达式 (Decision Expressions)
用于根据不同条件返回不同的样式值。最常用的是 `case` 和 `match`。
*   **`['case', condition1, output1, condition2, output2, ..., fallback]`**
    *   **作用**：相当于 `if... else if... else...`。按顺序判断条件，匹配即返回，最后必须提供一个默认值（fallback）。
    *   **示例** (根据速度给线着色)：
        ```json
        [
          "case",
          [">", ["get", "speed"], 100], "#ff0000",
          [">", ["get", "speed"], 50], "#ffff00",
          "#00ff00"
        ]
        ```
*   **`['match', input, label1, output1, label2, output2, ..., fallback]`**
    *   **作用**：相当于 `switch` 语句。当输入值与某个 label 精确匹配时返回对应的 output。**注意：match 的 label 必须是字面量（字符串或数字），不能是表达式。** 相比 `case`，它的性能更好。
    *   **示例** (根据道路类型分类)：
        ```json
        [
          "match",
          ["get", "road_type"],
          "highway", "#ff0000",
          "primary", "#ffaa00",
          "street", "#00ff00",
          "#cccccc"
        ]
        ```

#### C. 高级缩放与插值表达式 (Camera & Interpolation) ⭐⭐⭐
这是 MapLibre 最强大的特性之一，允许样式随着地图的**缩放级别 (`zoom`)** 或数据的**属性值**平滑渐变或突变。
*   **`['step', input, stop_output_0, stop_input_1, stop_output_1, ...]`**
    *   **作用**：阶梯函数。输入值达到某个阈值时，输出值发生**突变**。
    *   **示例** (基于缩放级别改变线宽，zoom < 10 时宽 2，zoom >= 10 时宽 6)：
        ```json
        ["step", ["zoom"], 2, 10, 6]
        ```
*   **`['interpolate', interpolation_type, input, stop_input_1, stop_output_1, ...]`**
    *   **作用**：插值函数。在不同的阈值之间进行**平滑过渡**。最常用的类型是 `['linear']` (线性插值)。
    *   **示例 1：基于 Zoom 的平滑缩放** (在 zoom 5 到 15 之间，圆点半径从 2 平滑放大到 10)：
        ```json
        ["interpolate", ["linear"], ["zoom"], 5, 2, 15, 10]
        ```
    *   **示例 2：基于数据属性的平滑热力图/颜色映射**：
        ```json
        [
          "interpolate", ["linear"], ["get", "temperature"],
          0, "#0000ff",
          20, "#00ff00",
          40, "#ff0000"
        ]
        ```

#### D. Filter 专用表达式与简写 (Filters)
`filter` 属性本身接收一个布尔值表达式。
*   **1. 基于内置特征 ($type / $id)**
    *   只渲染点类型：`['==', '$type', 'Point']`
    *   *(注：在 Mapbox/MapLibre 表达式中，`$type` 表示几何类型，`$id` 表示要素的 ID)*
*   **2. 基于数据属性 (Properties) 的旧版简写**
    要读取 GeoJSON 的 `properties` 里的字段，直接写字段名即可（此为兼容性最好的写法）。
    *   直接比较（推荐）：`['==', 'type', 'highway']` （筛选 properties 中 type 等于 highway 的数据）
    *   *注：虽然官方新版表达式推荐使用 `['get', 'type']`，但在部分组合条件（如 `all` 数组）或特定版本下可能不生效。建议首选直接写字段名的旧版语法。*
*   **3. 多条件组合筛选 (all / any / none)**
    当需要同时满足多个条件时，使用 `all`（相当于 AND）；满足其一使用 `any`（相当于 OR）；都不满足使用 `none`。
    *   **同时满足（AND）示例**：既是点（Point），且 `mark` 属性又是 `'dec'`
        ```json
        ["all", ["==", "$type", "Point"], ["==", "mark", "dec"]]
        ```
    *   **满足其一（OR）示例**：类型是 `highway` 或者是 `railway`
        ```json
        ["any", ["==", "type", "highway"], ["==", "type", "railway"]]
        ```
*   **4. 比较与包含运算符**
    *   包含在数组中：`['in', ['get', 'type'], ['literal', ['road', 'street', 'path']]]`
    *   大于/小于：`['>', ['get', 'population'], 10000]`
    *   是否存在某属性：`['has', 'name']` / `['!', ['has', 'name']]`

### 4. 层级与显示条件属性
- **before** (层级控制): 控制图层的上下层级顺序（相当于 CSS 的 z-index）。传入另一个图层的 `layerId`，表示将当前图层插入到该目标图层的下方。不传则默认覆盖在最上方。
- **minzoom** / **maxzoom** (缩放可见级别): 控制图层在特定缩放级别下才显示（取值范围 0-24）。用于优化地图性能和视觉体验（如缩小地图时隐藏次要图标）。

### 5. 交互属性
- **interactive** (是否可交互): 布尔值。决定该图层是否响应鼠标或触摸事件（如点击、悬停）。纯装饰性图层可设为 `false` 以防遮挡下层重要数据的点击事件。
- **事件绑定**: 支持直接在组件上绑定事件（如 `@click`、`@mouseenter`），仅当 `interactive` 为 true（默认）时生效。

### 6. 标签图层详解 (Symbol Layer) ⭐⭐⭐
在 MapLibre 中，**标签图层（`<mgl-symbol-layer>`）**是专门用于在地图上绘制**文字（Text）**和**图标（Icon）**的图层，是 WebGIS 开发中最核心的图层之一。

#### 为什么使用 Symbol 图层而不是 HTML Marker？
1. **极致的性能**：Symbol 图层由 WebGL 直接在 GPU 层面渲染，即使同时渲染 10,000+ 个文字或图标也能保持 60fps 的流畅度。而 HTML Marker 基于 DOM 节点，超过几百个会导致浏览器严重卡顿。
2. **智能防碰撞 (Collision Detection)**：当地图缩小时点位密集，Symbol 图层会自动计算边界并隐藏重叠的标签，保持地图整洁。
3. **沿线排版 (Line Placement)**：支持将文字沿着弯曲的线段（如道路、管线）排列（`symbol-placement: 'line'`），这是原生 DOM 无法做到的。
4. **文字光晕 (Halo)**：原生支持为文字添加发光描边（`text-halo-color`），确保文字在复杂的地图背景下依然清晰可读。

#### 核心属性配置示例
Symbol 图层的配置主要分为排版（`layout`）和视觉（`paint`）两部分：

```javascript
// layout 属性 (控制内容和排版)
const symbolLayout = {
  // --- 文字部分 ---
  'text-field': ['get', 'name'], // 核心：从 GeoJSON 的 properties 中读取 name 字段作为文字
  'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'], // 字体堆栈
  'text-size': 14,               // 字体大小
  'text-anchor': 'bottom',       // 锚点位置（如 bottom 代表坐标点在文字正下方）
  'text-offset': [0, -1],        // 文字相对锚点的偏移量 [x, y] (单位为 em)
  
  // --- 图标部分 (可选) ---
  // 'icon-image': 'camera-icon', // 引用加载到地图 Sprite 中的图标名称
  // 'icon-size': 1.2,
  
  // --- 排版与碰撞 ---
  'symbol-placement': 'point',   // 'point' (在坐标点) 或 'line' (沿线排布)
  'text-allow-overlap': false,   // 是否允许文字重叠（默认 false，重叠时自动隐藏）
  'icon-allow-overlap': false,   // 是否允许图标重叠
};

// paint 属性 (控制颜色和视觉)
const symbolPaint = {
  'text-color': '#333333',       // 文字主色
  'text-halo-color': '#ffffff',  // 文字外圈的光晕（描边）颜色
  'text-halo-width': 2,          // 光晕的宽度（强烈建议设置，防止看不清文字）
  'text-opacity': 1              // 透明度
};
```

### 7. 其他常用与进阶图层介绍

除了我们之前详细介绍过的**点图层 (`CircleLayer`)**、**线图层 (`LineLayer`)**、**面图层 (`FillLayer`)** 和 **标签图层 (`SymbolLayer`)** 这四大核心金刚外，MapLibre 还支持以下几种重要的图层类型，用于满足不同的业务和视觉需求：

#### 1. 栅格图层 (Raster Layer - `<mgl-raster-layer>`)
*   **作用**：用于渲染由像素图片组成的瓦片底图（如卫星影像、航拍图、旧版切片地图）。
*   **适用场景**：加载天地图/谷歌卫星影像、加载 WMS/WMTS 服务发布的天气云图或业务栅格图。
*   **核心配置**：通常只需调整透明度 `raster-opacity` 或对比度/色相等滤镜属性。依赖 `raster` 类型的 Source。

#### 2. 背景图层 (Background Layer - `<mgl-background-layer>`)
*   **作用**：为整个地图画布铺设一个纯色背景或重复的图案背景。
*   **适用场景**：当没有加载底图或者地图切片还没加载出来时显示的底色，或者用于实现“暗黑模式”的基础色板。
*   **注意**：它不需要绑定任何 Source，直接渲染在最底层。

#### 3. 3D 建筑图层 (Fill Extrusion Layer - `<mgl-fill-extrusion-layer>`)
*   **作用**：将二维的多边形数据（Polygon）向上拉伸成 3D 立体块。
*   **适用场景**：城市三维建筑白模展示、3D 柱状图统计（如按人口密度拉伸各省份高度）。
*   **核心配置**：
    *   `fill-extrusion-height`: 拉伸的高度（通常使用表达式 `['get', 'height']` 从数据中读取）。
    *   `fill-extrusion-base`: 建筑底部的离地高度（用于悬浮建筑）。
    *   `fill-extrusion-color`: 建筑颜色。

#### 4. 热力图层 (Heatmap Layer - `<mgl-heatmap-layer>`)
*   **作用**：将密集的点数据渲染成平滑过渡的热力图，以反映数据的密度或强度分布。
*   **适用场景**：人口密度图、交通事故频发区域、共享单车活跃度。
*   **核心配置**：
    *   `heatmap-weight`: 点的权重（如一个点代表多少人），通常随缩放级别和属性插值。
    *   `heatmap-intensity`: 整体热力图的全局强度，通常随缩放级别放大。
    *   `heatmap-color`: 颜色带映射，必须使用 `['interpolate', ['linear'], ['heatmap-density'], ...]` 表达式。

#### 5. 山体阴影图层 (Hillshade Layer - `<mgl-hillshade-layer>`)
*   **作用**：基于高程模型（DEM）数据渲染出带有光影立体感的地形起伏效果。
*   **适用场景**：户外探险地图、地质地形展示。
*   **核心配置**：依赖 `raster-dem` 类型的 Source，可配置光源方向 `hillshade-illumination-direction` 和阴影颜色。

## 示例
```vue
<template>
  <mgl-map :center="[121.47, 31.23]" :zoom="10">
    <mgl-geo-json-source sourceId="points" :data="geojson">
      <mgl-circle-layer
        layerId="points-layer"
        :paint="{ 'circle-radius': 6, 'circle-color': '#3b82f6' }"
      />
    </mgl-geo-json-source>
  </mgl-map>
</template>

<script>
export default {
  data() {
    return {
      geojson: {
        type: 'FeatureCollection',
        features: []
      }
    }
  }
}
</script>
```
