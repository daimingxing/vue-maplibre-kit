# mapOptions

适合谁读：需要配置中心点、缩放级别、地图样式的开发者。

先读哪篇：[01-MapLibreInit](./01-MapLibreInit.md)。

对应示例：[NGGI01](../../../examples/views/NG/GI/NGGI01.vue)。

## 基本写法

`mapOptions` 兼容 MapLibre GL 初始化参数，并额外允许用 `mapStyle` 表达地图样式。

```ts
import type { MapOptions } from "vue-maplibre-kit/business";

const mapOptions: Partial<MapOptions & { mapStyle: object }> = {
  mapStyle: {
    version: 8,
    sources: {},
    layers: [
      {
        id: "blank-bg",
        type: "background",
        paint: { "background-color": "#eef2f3" },
      },
    ],
  },
  center: [113.9, 22.5],
  zoom: 10,
};
```

## 空白底图

示例页使用空白 style，避免依赖外部瓦片服务。真实项目可以换成自己的 MapLibre style URL 或 style 对象。

## 与全局配置的关系

如果项目注册了全局 `mapOptions` 默认值，页面级 `mapOptions` 会覆盖当前页面关心的字段。全局配置由 `vue-maplibre-kit/config` 管理，本章只讲页面级初始化。
