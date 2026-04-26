# styles 默认值

`styles` 作用于本库的图层样式工厂默认值，而不是直接修改已经存在的 MapLibre 图层。

## 支持的样式键

| 键 | 对应图层 |
| --- | --- |
| `circle` | 点图层 |
| `line` | 线图层 |
| `fill` | 面图层 |
| `symbol` | 符号图层 |
| `raster` | 栅格图层 |

每个样式键只允许配置 `layout` 和 `paint` 片段。

## 示例

```ts
import { defineMapGlobalConfig } from 'vue-maplibre-kit/config';

/**
 * 定义图层样式工厂默认值。
 * @returns 全局默认配置
 */
export function createStyleConfig() {
  return defineMapGlobalConfig({
    styles: {
      line: {
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#1677ff',
          'line-width': 3,
        },
      },
      circle: {
        paint: {
          'circle-radius': 7,
          'circle-color': '#1677ff',
        },
      },
      fill: {
        paint: {
          'fill-opacity': 0.35,
          'fill-outline-color': '#1677ff',
        },
      },
      symbol: {
        paint: {
          'text-halo-width': 1.5,
        },
      },
      raster: {
        paint: {
          'raster-opacity': 0.92,
        },
      },
    },
  });
}
```

## 生效路径

`styles.*` 主要影响这些公开工厂：

- `createCircleLayerStyle`
- `createLineLayerStyle`
- `createFillLayerStyle`
- `createSymbolLayerStyle`
- `createRasterLayerStyle`
- `createSimpleLineStyle`
- `createSimpleCircleStyle`
- `createSimpleFillStyle`

如果业务层直接传完整 `layer.style`，通常表示页面接管该图层样式，不应期待全局样式继续自动叠加。

## 合并规则

样式片段会按 `layout`、`paint` 内部字段合并，页面或调用处字段优先。MapLibre 表达式数组整体覆盖，不按数组下标合并。

## 边界

- `id`、`type`、`source`、`filter` 不属于全局样式默认值职责。
- `styles` 不会自动改写第三方原生图层。
- 临时运行时改色应使用 `businessMap.layers.setPaint()`，持久默认视觉才放到 `styles`。
