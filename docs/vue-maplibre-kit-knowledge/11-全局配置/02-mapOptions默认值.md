# mapOptions 默认值

`mapOptions` 对应 MapLibre 初始化参数，类型是：

```ts
type MapKitGlobalMapOptions = Partial<MapOptions & { mapStyle: string | object }>;
```

`mapStyle` 是本库封装层常用的底图样式入口；`style` 仍可作为 MapLibre 原生字段使用。

## 常见配置

```ts
import { defineMapGlobalConfig } from 'vue-maplibre-kit/config';

/**
 * 定义地图初始化默认值。
 * @returns 全局默认配置
 */
export function createOptionConfig() {
  return defineMapGlobalConfig({
    mapOptions: {
      mapStyle: 'https://demotiles.maplibre.org/style.json',
      center: [113.943, 22.548],
      zoom: 8,
      pitch: 0,
      bearing: 0,
      minZoom: 3,
      maxZoom: 20,
      attributionControl: false,
    },
  });
}
```

## 常用字段

| 类型 | 字段示例 | 说明 |
| --- | --- | --- |
| 样式 | `mapStyle`、`style` | 底图样式 URL 或样式对象 |
| 初始视图 | `center`、`zoom`、`bearing`、`pitch`、`bounds` | 初始化视角 |
| 视角限制 | `minZoom`、`maxZoom`、`minPitch`、`maxPitch`、`maxBounds` | 控制缩放、倾斜和平移范围 |
| 交互 | `interactive`、`scrollZoom`、`dragPan`、`dragRotate`、`keyboard` | 控制地图交互行为 |
| 渲染 | `renderWorldCopies`、`pixelRatio`、`crossSourceCollisions` | 控制渲染表现和性能相关参数 |
| 请求 | `transformRequest` | 统一改写瓦片、样式、字体等请求 |
| UI | `attributionControl`、`maplibreLogo`、`logoPosition`、`locale` | 控制原生 UI 表现 |

## 合并规则

`mapOptions` 按顶层字段合并：

```txt
组件内置默认值 -> 全局 mapOptions -> 页面 mapOptions
```

对象型字段不会深度合并。页面一旦传入同名对象字段，就会整体接管该字段。

```ts
// 全局配置
{
  attributionControl: {
    compact: true,
    customAttribution: 'Demo',
  },
}

// 页面配置
{
  attributionControl: {
    compact: false,
  },
}
```

最终只保留页面对象中的 `compact: false`，不会自动继承全局的 `customAttribution`。

## 边界

- `container` 通常由 `MapLibreInit` 封装层维护，业务层不建议放进全局配置。
- `transformRequest` 这类函数可全局配置，但要避免闭包里引用会变化的页面状态。
- MapLibre 原生字段是否可用，以当前安装的 `maplibre-gl` 类型为准。
