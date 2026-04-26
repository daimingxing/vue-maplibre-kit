# mapControls 默认值

`mapControls` 对应 `MapControlsConfig`，用于给内置控件注册默认显示状态和参数。

## 支持的控件键

| 控件键 | 说明 |
| --- | --- |
| `MglNavigationControl` | 缩放和罗盘控件 |
| `MglFullscreenControl` | 全屏控件 |
| `MglGeolocationControl` | 浏览器定位控件 |
| `MglScaleControl` | 比例尺控件 |
| `MglAttributionControl` | 版权归属控件 |
| `MglFrameRateControl` | 帧率调试控件 |
| `MglStyleSwitchControl` | 底图样式切换控件 |
| `MglCustomControl` | 自定义控件容器 |
| `MaplibreTerradrawControl` | 绘图控件 |
| `MaplibreMeasureControl` | 测量控件 |

## 基础控件

所有控件都遵循基础字段：

- `isUse`：是否启用并渲染控件。
- `position`：控件位置，使用 MapLibre 的 `ControlPosition`。

```ts
import { defineMapGlobalConfig } from 'vue-maplibre-kit/config';

/**
 * 定义基础控件默认值。
 * @returns 全局默认配置
 */
export function createControlConfig() {
  return defineMapGlobalConfig({
    mapControls: {
      MglNavigationControl: {
        isUse: true,
        position: 'top-left',
        showCompass: true,
        showZoom: true,
      },
      MglScaleControl: {
        isUse: true,
        position: 'bottom-left',
        maxWidth: 120,
        unit: 'metric',
      },
    },
  });
}
```

## TerraDraw 绘图控件

```ts
defineMapGlobalConfig({
  mapControls: {
    MaplibreTerradrawControl: {
      isUse: true,
      position: 'top-left',
      modes: ['point', 'linestring', 'polygon', 'rectangle', 'circle', 'freehand'],
      open: false,
      snapping: {
        enabled: true,
        tolerancePx: 12,
        useNative: true,
        useMapTargets: true,
      },
      interactive: {
        enabled: true,
        cursor: 'pointer',
      },
    },
  },
});
```

## 测量控件

```ts
defineMapGlobalConfig({
  mapControls: {
    MaplibreMeasureControl: {
      isUse: true,
      position: 'top-left',
      modes: ['point', 'linestring', 'polygon', 'circle', 'freehand'],
      measureUnitType: 'metric',
      distancePrecision: 2,
      areaPrecision: 2,
      computeElevation: false,
    },
  },
});
```

## 合并规则

控件配置按控件 key 合并。单个控件内部会递归回填全局默认值，页面字段优先。数组会整体替换，避免 MapLibre 表达式或模式数组被按下标错误合并。

```txt
空对象 -> 全局 mapControls -> 页面 mapControls
```

## 边界

- `MglFrameRateControl` 建议只在开发调试中启用。
- TerraDraw 的 `modeOptions` 可传深度配置或模式实例，适合高级场景。
- 测量控件的 `computeElevation` 依赖地图地形数据配置，未配置 DEM source 时不要开启。

