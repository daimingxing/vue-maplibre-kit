# config 全局配置入口

适合：需要在应用启动阶段统一设置地图默认值的开发者。

先读：[全局配置](../11-全局配置/index.md)。

对应源码：`src/entries/config.ts`。

## 推荐导入

```ts
import {
  defineMapGlobalConfig,
  setMapGlobalConfig,
  getMapGlobalConfig,
  resetMapGlobalConfig,
} from "vue-maplibre-kit/config";
```

## 能力说明

| 导出 | 用途 |
| --- | --- |
| `defineMapGlobalConfig` | 提供类型辅助，不产生副作用 |
| `setMapGlobalConfig` | 注册应用级全局默认配置 |
| `getMapGlobalConfig` | 读取当前全局配置快照 |
| `resetMapGlobalConfig` | 清空全局配置，常用于测试 |
| `MapKitGlobalConfig` | 全局配置总类型 |

## 配置分组

```ts
setMapGlobalConfig({
  mapOptions: {},
  mapControls: {},
  plugins: {
    snap: {},
    lineDraft: {},
    intersection: {},
    multiSelect: {},
    dxfExport: {},
  },
  styles: {
    circle: {},
    line: {},
    fill: {},
    symbol: {},
    raster: {},
  },
});
```

## 注意

- 全局配置是应用级默认值，不是页面状态。
- `setMapGlobalConfig()` 当前按整份替换处理。
- 配置会被深拷贝并冻结。
- 不建议传 Vue 响应式对象或 `ref`。
