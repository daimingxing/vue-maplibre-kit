# 数据交互与样式定制

本章介绍如何通过 `getTerraDrawInstance()` 将外部的 GeoJSON 数据加载到地图中，以及如何修改各个绘制模式下生成的图形样式。

## 1. 加载 GeoJSON 数据 (addFeatures)

在许多场景下，我们需要从后端读取已有的 GeoJSON 数据并在地图上回显。您可以使用 Terra Draw 实例的 `addFeatures()` 方法。

> ⚠️ **注意**：必须确保地图样式（Style）加载完成之后，再执行添加数据的操作，否则会报错。建议放在 `map.once('load', () => {...})` 回调中执行。

```javascript
map.once('load', () => {
    const drawInstance = drawControl.getTerraDrawInstance();
    if (drawInstance) {
        const geojson = [
            {
                id: '6b438f48-f6da-4649-9212-76f5a1506296',
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [26.93, 25.21],
                            [-4.04, 25.21],
                            [-4.04, -7.83],
                            [26.93, -7.83],
                            [26.93, 25.21]
                        ]
                    ]
                },
                properties: {
                    // 必填：必须指定 mode，让引擎知道这个图形是由哪个模式接管的
                    mode: 'rectangle' 
                }
            }
        ];
        drawInstance.addFeatures(geojson);
    }
});
```

## 2. 自定义图形样式

插件默认使用 Terra Draw 提供的配色。您可以在初始化 `MaplibreTerradrawControl` 时，通过 `modeOptions` 为特定的绘制模式配置样式（颜色、线宽、透明度等）。

> 此处需要从 `terra-draw` 核心库引入对应的 Mode 类。Terra Draw 的样式配置非常细致，以下列出了常用的模式及其可配置的完整属性说明。

```javascript
import { 
    TerraDrawPointMode, 
    TerraDrawLineStringMode, 
    TerraDrawPolygonMode,
    TerraDrawRectangleMode,
    TerraDrawCircleMode,
    TerraDrawFreehandMode,
    TerraDrawAngledRectangleMode,
    TerraDrawSensorMode,
    TerraDrawSectorMode
} from 'terra-draw';

const drawControl = new MaplibreTerradrawControl({
    modes: ['point', 'linestring', 'polygon', 'delete'],
    open: true,
    modeOptions: {
        // 1. 自定义画点样式
        point: new TerraDrawPointMode({
            styles: {
                pointColor: '#FF0000',          // 点的填充颜色
                pointWidth: 6,                  // 点的半径大小
                pointOutlineColor: '#FFFFFF',   // 边框颜色
                pointOutlineWidth: 2            // 边框宽度
            }
        }),
        
        // 2. 自定义画线样式
        linestring: new TerraDrawLineStringMode({
            styles: {
                lineStringColor: '#00FF00',     // 线的颜色
                lineStringWidth: 4,             // 线的宽度
                closingPointColor: '#FFFFFF',   // 绘制过程中，当前鼠标位置/末端提示点的颜色
                closingPointWidth: 4,           // 末端提示点的大小
                closingPointOutlineColor: '#000000', // 末端提示点的边框颜色
                closingPointOutlineWidth: 1     // 末端提示点的边框宽度
            }
        }),
        
        // 3. 自定义多边形样式
        polygon: new TerraDrawPolygonMode({
            styles: {
                fillColor: '#0000FF',           // 面填充颜色
                fillOpacity: 0.4,               // 面填充透明度 (0 - 1)
                outlineColor: '#0000FF',        // 边框颜色
                outlineWidth: 3,                // 边框宽度
                closingPointColor: '#FFFFFF',   // 绘制过程中，当前多边形闭合提示点的颜色
                closingPointWidth: 4,
                closingPointOutlineColor: '#000000',
                closingPointOutlineWidth: 1
            }
        }),
        
        // 4. 自定义矩形样式 (属性与多边形类似)
        rectangle: new TerraDrawRectangleMode({
            styles: {
                fillColor: '#FF00FF',           // 矩形填充颜色
                fillOpacity: 0.4,               // 矩形填充透明度
                outlineColor: '#FF00FF',        // 边框颜色
                outlineWidth: 3
            }
        }),
        
        // 5. 自定义圆形样式
        circle: new TerraDrawCircleMode({
            styles: {
                fillColor: '#00FFFF',           // 圆形填充颜色
                fillOpacity: 0.4,               // 圆形填充透明度
                outlineColor: '#00FFFF',        // 边框颜色
                outlineWidth: 3
            }
        }),
        
        // 6. 自定义自由手绘模式样式
        freehand: new TerraDrawFreehandMode({
            styles: {
                lineStringColor: '#FF8800',     // 手绘线的颜色
                lineStringWidth: 4              // 手绘线的宽度
            }
        }),
        
        // 7. 自定义有角度矩形样式
        'angled-rectangle': new TerraDrawAngledRectangleMode({
            styles: {
                fillColor: '#8800FF',
                fillOpacity: 0.4,
                outlineColor: '#8800FF',
                outlineWidth: 3
            }
        }),
        
        // 8. 自定义传感器(雷达)模式样式
        sensor: new TerraDrawSensorMode({
            styles: {
                fillColor: '#0088FF',
                fillOpacity: 0.4,
                outlineColor: '#0088FF',
                outlineWidth: 3
            }
        }),
        
        // 9. 自定义扇区模式样式
        sector: new TerraDrawSectorMode({
            styles: {
                fillColor: '#88FF00',
                fillOpacity: 0.4,
                outlineColor: '#88FF00',
                outlineWidth: 3
            }
        })
    }
});
map.addControl(drawControl, 'top-left');
```

## 3. 基于状态的样式（选中与编辑状态）

除了全局修改某一种模式的常规样式，我们通常更关心图形在**被选中 (Select) 时**以及处于**编辑节点状态时**的样式（比如边框加粗、变色，以及拖拽控制点的颜色）。

在 Terra Draw 中，样式的应用是**按模式 (Per-mode)** 分离的。这意味着当图形被选中时，它会被移交给 `SelectMode` 接管。因此，如果要修改选中状态的样式，必须通过配置 `TerraDrawSelectMode` 来实现。

以下列出了 `SelectMode` 中所有常用的自定义样式属性：

```javascript
import { TerraDrawSelectMode } from 'terra-draw';

const drawControl = new MaplibreTerradrawControl({
    modes: ['polygon', 'select'],
    open: true,
    modeOptions: {
        select: new TerraDrawSelectMode({
            styles: {
                // === 1. 点被选中时的样式 ===
                selectedPointColor: '#FFFF00',         // 选中点的填充色
                selectedPointWidth: 8,                 // 选中点的大小
                selectedPointOutlineColor: '#FF0000',  // 选中点的边框色
                selectedPointOutlineWidth: 3,          // 选中点的边框宽度

                // === 2. 线被选中时的样式 ===
                selectedLineStringColor: '#FFFF00',    // 选中线的颜色
                selectedLineStringWidth: 6,            // 选中线的宽度

                // === 3. 面(多边形/矩形/圆)被选中时的样式 ===
                selectedPolygonColor: '#FFFF00',       // 选中时的填充色
                selectedPolygonOpacity: 0.6,           // 选中时的透明度
                selectedPolygonOutlineColor: '#FF8800',// 选中时的边框色
                selectedPolygonOutlineWidth: 4,        // 选中时的边框宽度
                
                // === 4. 控制点/节点（用于拖拽调整形状的顶点）的样式 ===
                selectionPointColor: '#FFFFFF',        // 控制点的填充色
                selectionPointWidth: 5,                // 控制点的大小
                selectionPointOutlineColor: '#000000', // 控制点的边框色
                selectionPointOutlineWidth: 2,         // 控制点的边框宽度
                
                // === 5. 中点（用于在两点之间添加新节点的中间点）的样式 ===
                midPointColor: '#FF0000',              // 中点的填充色
                midPointWidth: 4,                      // 中点的大小
                midPointOutlineColor: '#FFFFFF',       // 中点的边框色
                midPointOutlineWidth: 1                // 中点的边框宽度
            }
        })
    }
});
```

## 3. 自定义测量控件样式

测量控件 `MaplibreMeasureControl` 由于继承自绘图控件，它同样支持使用上述的 `modeOptions` 来修改绘制的测量线或面的样式。

此外，测量控件会在地图上生成**文字标签**（例如标注 "100 km" 或 "500 sq km"），因此它还提供了一些额外的专属配置项来修改这些文字标签的样式，这些配置项遵循 MapLibre 的 [SymbolLayer](https://maplibre.org/maplibre-style-spec/layers/#symbol) 规范。

> ⚠️ **高危排坑指南 (Bug Fix)**：
> 在自定义测量标签时，必须注意底层数据结构。测距和测面积的文字标签并不是直接挂载在 `LineString` 或 `Polygon` 上，而是底层在几何图形上隐式生成了不可见的 `Point` 要素。
> 1. 必须使用 `filter: ['==', '$type', 'Point']` 来过滤点数据。
> 2. `layout.text-field` 必须使用 MapLibre 的表达式（如 `['concat', ...]`）拼接，不能用大括号占位符。
> 3. 如果覆盖了 `lineLayerLabelSpec`，**必须同时提供 `routingLineLayerNodeSpec`**，否则源码在调用 `moveLayer` 时会因找不到默认的 node 节点图层而导致程序崩溃。

```javascript
import { TerraDrawLineStringMode, TerraDrawPolygonMode } from 'terra-draw';

const measureControl = new MaplibreMeasureControl({
    modes: ['linestring', 'polygon', 'delete'],
    
    // 1. 图形本身的样式自定义 (与 MaplibreTerradrawControl 一致)
    modeOptions: {
      linestring: new TerraDrawLineStringMode({
        styles: {
          lineStringColor: '#FF5500', // 测量线的颜色
          lineStringWidth: 3,
        }
      }),
      polygon: new TerraDrawPolygonMode({
        styles: {
          fillColor: '#0055FF', // 测量面的颜色
          fillOpacity: 0.2,
          outlineColor: '#0055FF',
          outlineWidth: 2,
        }
      })
    },

    // 2. 测量结果文字标签的样式自定义 (MapLibre 的 SymbolLayer 规范)
    
    // 线段距离标签样式
    lineLayerLabelSpec: {
      id: 'measure-line-label',
      type: 'symbol',
      source: 'measure-line-label', // 必须与下面的 node 图层保持一致
      filter: ['==', '$type', 'Point'], // 必须过滤点数据
      layout: {
        // 必须使用 MapLibre 的表达式写法来拼接动态属性
        'text-field': [
          'concat',
          ['to-string', ['get', 'distance']],
          ' ',
          ['get', 'unit']
        ],
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 14,
        'symbol-placement': 'point', // 由于数据是 Point，必须设为 point
        'text-variable-anchor': ['left', 'right', 'top', 'bottom'], // 自动调整锚点避让
        'text-radial-offset': 0.5,
      },
      paint: {
        'text-color': '#FF5500',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2,
      },
    },

    // 必须同时提供：测距线上的节点样式 (防崩溃)
    routingLineLayerNodeSpec: {
      id: 'td-measure-line-node', // 尽量使用源码默认的 ID
      type: 'circle',
      source: 'measure-line-label', // 必须与 lineLayerLabelSpec 使用同一个 source
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 4,
        'circle-color': '#FFFFFF',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FF5500',
      },
    },
    
    // 多边形面积标签样式
    polygonLayerSpec: {
      id: 'measure-polygon-label',
      type: 'symbol',
      source: 'measure-polygon-label',
      filter: ['==', '$type', 'Point'], // 必须过滤点数据
      layout: {
        'text-field': [
          'concat',
          ['to-string', ['get', 'area']],
          ' ',
          ['get', 'unit']
        ],
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 14,
        'symbol-placement': 'point',
      },
      paint: {
        'text-color': '#0055FF',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2,
      },
    },
    
    // 测点高程标签样式 (如果启用了测点高程)
    pointLayerLabelSpec: {
      // ... 同样的 SymbolLayer 规范
    }
});
```

通过这套机制，您可以为绘制过程中的不同阶段和状态，精确配置符合您系统主题的视觉呈现。

## 4. 获取绘制与测量的数据 (getSnapshot)

在用户完成绘制或测量后，通常需要将数据提取出来发送给后端保存，或者在前端进行其他逻辑处理。无论是 `MaplibreTerradrawControl` 还是 `MaplibreMeasureControl`，都可以通过底层 `TerraDraw` 实例的 `getSnapshot()` 方法获取所有要素的 GeoJSON 集合。

### 4.1 获取绘图数据

```javascript
// 获取控件实例
const drawControl = mapInitRef.value.getDrawControl();
/* 或者直接从地图私有属性中提取 (无需借助组件 ref)
const controls = (map.map as any)._controls || [];
const drawControl = controls.find(c => c instanceof MaplibreTerradrawControl);
*/

if (drawControl) {
    // 提取底层的 Terra Draw 引擎实例
    const drawInstance = drawControl.getTerraDrawInstance();
    // 获取当前绘制的所有图形的 GeoJSON 数据
    const features = drawInstance.getSnapshot();
    
    console.log('提取到的 GeoJSON 集合:', JSON.stringify(features));
}
```

### 4.2 提取测量控件的测算结果

`MaplibreMeasureControl` 的数据获取方式与绘图控件完全一致。其最大的不同点在于：**测量结果会直接注入到每个 Feature 的 `properties` 属性中**。

```javascript
const measureControl = mapInitRef.value.getMeasureControl();
if (measureControl) {
    const drawInstance = measureControl.getTerraDrawInstance();
    const features = drawInstance.getSnapshot();

    features.forEach((f) => {
        if (f.geometry.type === 'LineString' && f.properties?.distance !== undefined) {
            console.log(`[线段测距] 距离: ${f.properties.distance} ${f.properties.distanceUnit}`);
        } else if (f.geometry.type === 'Polygon' && f.properties?.area !== undefined) {
            console.log(`[多边形测面积] 面积: ${f.properties.area} ${f.properties.unit}`);
        } else if (f.geometry.type === 'Polygon' && f.properties?.radiusKilometers !== undefined) {
            console.log(`[圆测半径] 半径: ${f.properties.radiusKilometers} km`);
        }
    });
}
```
> **提示**：如果开启了地形高程测算 (`computeElevation: true`)，`properties` 中还会额外包含 `elevation` 等高程字段。
