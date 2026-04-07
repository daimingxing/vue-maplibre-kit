# 测量与高程 (Measure & Elevation)

`@watergis/maplibre-gl-terradraw` 专门提供了一个强大的 `MaplibreMeasureControl`，不仅可以测量平面的 2D 距离和面积，还支持结合 MapLibre 的地形数据计算真实的 3D 地表距离。

## 1. 基础测量控件使用

初始化测量控件的方法与常规的绘图控件基本一致。您可以选择只开启线段和多边形以实现测距和测面积功能。

```javascript
import { MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw';

const measureControl = new MaplibreMeasureControl({
    // 支持所有的 TerraDraw 模式（除 point、select、delete-selection 外）
    modes: [
        'linestring', // 测线（距离）
        'polygon',    // 测面（面积）
        'circle',     // 测圆（半径及面积）
        'delete',
        'download'
    ],
    open: true
});
map.addControl(measureControl, 'top-left');
```

## 2. 结合高程数据 (Terrain DEM) 测量

当地图开启了 3D 地形 (Terrain) 时，简单的两点间直线距离（2D）可能不准确。`MaplibreMeasureControl` 支持读取地形数据源，自动计算出带高程起伏的实际地表距离。

### 2.1 开启高程计算

在初始化时，开启 `computeElevation: true`，插件会尝试从地图样式中读取高程。

```javascript
// 假设您的地图中已经添加了名为 'my-dem-source' 的 raster-dem 源
map.addSource('my-dem-source', {
    type: 'raster-dem',
    tiles: ['https://example.com/terrain-tiles/{z}/{x}/{y}.webp'],
    tileSize: 512,
    maxzoom: 15
});
map.setTerrain({ source: 'my-dem-source', exaggeration: 1 });

// 初始化测量控件，开启高程计算
const measureControlWithElevation = new MaplibreMeasureControl({
    modes: ['linestring', 'delete'],
    open: true,
    computeElevation: true,         // 开启计算高程
    terrainSource: 'my-dem-source'  // （可选）指定特定的 DEM source，不传则自动寻找
});

map.addControl(measureControlWithElevation, 'top-left');
```

这样，当用户在山地上画一条线时，插件会沿途查询栅格 DEM 数据，计算出的长度将会是包含地形起伏的**地表距离**。

## 3. 自定义测量文本字体

默认情况下，测量控件在地图上绘制距离/面积文本时，使用的是 MapLibre 默认的字体。你可以通过在地图的 `glyphs` 配置中提供的字体栈来更改测量文本的字体：

```javascript
const measureControl = new MaplibreMeasureControl({
    modes: ['linestring', 'polygon', 'delete'],
    open: true,
    // 假设您的 map.style 中 glyphs 支持 'Noto Sans Regular'
    textFont: ['Noto Sans Regular'] 
});
map.addControl(measureControl, 'top-left');
```

通过以上功能，您可以非常方便地在 WebGIS 系统中实现专业的距离、面积和体积评估工具。