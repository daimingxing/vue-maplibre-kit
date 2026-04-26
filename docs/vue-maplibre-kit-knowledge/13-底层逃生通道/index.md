# 底层逃生通道

底层逃生通道用于处理公开业务门面暂未覆盖的高级能力。它不是默认接入路径，只有在业务门面和内置低层门面都不够时才使用。

## 推荐顺序

```txt
公开业务门面
-> 内置低层门面
-> rawHandles
-> 自定义插件
```

## 目录

- [01-何时使用逃生通道.md](./01-何时使用逃生通道.md)
- [02-rawHandles.md](./02-rawHandles.md)
- [03-MapLibre原生能力.md](./03-MapLibre原生能力.md)
- [04-TerraDraw原生能力.md](./04-TerraDraw原生能力.md)
- [05-自定义插件.md](./05-自定义插件.md)

## 相关底层知识库

- `docs/knowledge-base/maplibre-gl/reference/04-sources-and-layers.md`
- `docs/knowledge-base/maplibre-gl/reference/07-events-and-query.md`
- `docs/knowledge-base/vue-maplibre-gl/reference/03-map-component.md`
- `docs/knowledge-base/vue-maplibre-gl/reference/05-sources-and-layers.md`
- `docs/knowledge-base/maplibre-gl-terradraw/references/api_and_customization.md`
- `docs/knowledge-base/maplibre-gl-terradraw/references/data_and_style.md`
- `docs/knowledge-base/maplibre-gl-terradraw/references/drawing_modes.md`

## 基本原则

- 能用 `useBusinessMap()` 完成的，不直接访问原生 map。
- 能用 `businessMap.layers` 完成的，不手写 `map.addSource()`、`map.addLayer()`。
- 能通过插件配置完成的，不直接改 TerraDraw 内部状态。
- 使用逃生通道时，要写清楚生命周期、清理逻辑和为什么公开门面不够。

