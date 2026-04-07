# 绘制模式与工具栏配置

`MaplibreTerradrawControl` 在初始化时提供了一个配置对象。你可以通过配置项来选择在工具栏中**展示哪些绘制按钮**以及**默认的展开状态**。

## 1. 初始化配置说明

```typescript
interface MaplibreTerradrawControlOptions {
    modes?: string[]; // 需要显示的工具栏模式（如不传则展示所有模式）
    open?: boolean;   // 控件初始时是否处于展开状态
}
```

默认情况下，`@watergis/maplibre-gl-terradraw` 会渲染以下所有的绘图模式：

```javascript
const drawControl = new MaplibreTerradrawControl({
    // 如果不填 modes 数组，默认会开启如下所有选项：
    modes: [
        'point',              // 画点
        'linestring',         // 画线
        'polygon',            // 画多边形
        'rectangle',          // 画矩形
        'circle',             // 画圆
        'freehand',           // 自由手绘模式（鼠标拖拽绘线）
        'angled-rectangle',   // 有角度的矩形
        'sensor',             // 扇形/传感器模式
        'sector',             // 扇区模式
        'select',             // 选取模式（用于选中、编辑已有图形）
        'delete-selection',   // 删除选中图形
        'delete',             // 直接点击删除模式
        'download'            // 下载绘制的 GeoJSON 数据
    ],
    open: true                // 默认是否展开工具栏，true为展开
});
```

## 2. 隐藏不需要的功能（按需加载）

如果你的项目中**仅仅需要画多边形和测线**，或者你不想提供 `download` 功能给终端用户，可以通过传递只包含所需字符串的 `modes` 数组来实现。

例如，一个极简的多边形绘制工具栏：

```javascript
const minimalistDrawControl = new MaplibreTerradrawControl({
    modes: [
        'polygon', 
        'select', 
        'delete-selection'
    ],
    open: false // 初始折叠
});

map.addControl(minimalistDrawControl, 'top-right');
```

这样，工具栏只会显示“画多边形”、“指针（选择）”和“删除”三个按钮。

## 3. 深度定制绘制行为 (modeOptions)

此插件尝试为每个 Terra Draw 模式提供优化的默认选项。然而，这些预配置选项可能并不符合您的所有需求。
比如：您可能只希望用户使用多边形工具，但**不希望用户拖动整个多边形**或**禁止在边缘上添加/删除节点**。

您可以通过传入 `modeOptions` 对具体模式（如 `select`）进行深度的配置覆盖：

```javascript
import { TerraDrawSelectMode } from 'terra-draw';

const drawControl = new MaplibreTerradrawControl({
    modes: ['polygon', 'select', 'delete'],
    open: true,
    modeOptions: {
        select: new TerraDrawSelectMode({
            flags: {
                polygon: {
                    feature: {
                        draggable: false,  // 禁止拖拽整个多边形
                        rotateable: true,  // 允许旋转
                        scaleable: true,   // 允许缩放
                        coordinates: {
                            midpoints: false, // 禁止显示中点
                            draggable: true,  // 允许拖拽单个节点
                            deletable: false  // 禁止删除节点
                        }
                    }
                }
            }
        })
    }
});
```

## 4. 结合测量控件使用

除了标准的绘图工具，`@watergis/maplibre-gl-terradraw` 还提供了一个内置的测量工具控件：`MaplibreMeasureControl`。

**提示**：您可以将主绘制控件与测量控件同时挂载在同一个 MapLibre 实例中，但为了界面整洁，建议放在不同的角落，例如主控件放 `top-left`，测量控件放 `top-right`。

```javascript
import { MaplibreTerradrawControl, MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw';

// 1. 标准绘制控件
const drawControl = new MaplibreTerradrawControl({
    modes: ['polygon', 'rectangle', 'select', 'delete'],
    open: true
});
map.addControl(drawControl, 'top-left');

// 2. 测量控件（专用于测量长度、面积）
const measureControl = new MaplibreMeasureControl({
    modes: ['linestring', 'polygon', 'delete-selection', 'delete'],
    open: true
});
map.addControl(measureControl, 'top-right');
```
