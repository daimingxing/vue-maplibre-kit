# 09-插件

本目录记录 `vue-maplibre-kit` 的业务插件接入方式。插件注册统一优先使用 `vue-maplibre-kit/plugins` 暴露的 `createBusinessPlugins`，业务页面读取插件状态与动作统一走 `useBusinessMap().plugins.*`。

## 阅读顺序

1. [插件注册总览](./01-插件注册总览.md)
2. [snap 吸附](./02-snap吸附.md)
3. [lineDraft 线草稿](./03-lineDraft线草稿.md)
4. [intersection 交点](./04-intersection交点.md)
5. [multiSelect 多选](./05-multiSelect多选.md)
6. [dxfExport 导出 DXF](./06-dxfExport导出DXF.md)
7. [单插件子路径高级用法](./07-单插件子路径高级用法.md)

## 核心约定

- 注册入口：从 `vue-maplibre-kit/plugins` 引入 `createBusinessPlugins`。
- 读取入口：从 `vue-maplibre-kit/business` 引入 `useBusinessMap`，再通过 `businessMap.plugins.snap`、`businessMap.plugins.lineDraft`、`businessMap.plugins.intersection`、`businessMap.plugins.multiSelect`、`businessMap.plugins.dxfExport` 读取能力。
- 示例来源：`examples/views/NG/GI/NGGI06.vue` 是五插件总览；`NGGI07.vue` 到 `NGGI11.vue` 分别对应五个插件的独立示例。
- 门面边界：业务模拟层应使用包名路径，不直接引用 `src/MapLibre/**`。

## 五插件速查

| 插件 | 注册配置键 | 读取路径 | 典型用途 | 示例 |
| --- | --- | --- | --- | --- |
| snap | `snap` | `businessMap.plugins.snap` | 绘制、测量、普通业务图层吸附 | `NGGI07.vue` |
| lineDraft | `lineDraft` | `businessMap.plugins.lineDraft` | 生成延长线、线廊草稿、草稿属性维护 | `NGGI08.vue` |
| intersection | `intersection` | `businessMap.plugins.intersection` | 线交点预览、正式交点生成与属性维护 | `NGGI09.vue` |
| multiSelect | `multiSelect` | `businessMap.plugins.multiSelect` | 多选模式、选中集读取、选中态样式联动 | `NGGI10.vue` |
| dxfExport | `dxfExport` | `businessMap.plugins.dxfExport` | 生成或下载 DXF，读取导出状态 | `NGGI11.vue` |

## 最小接入骨架

```ts
import { shallowRef } from "vue";
import {
  MapLibreInit,
  useBusinessMap,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({
  mapRef: () => mapRef.value,
  sourceRegistry: kit.registry,
});

const plugins = createBusinessPlugins({
  snap: { layerIds: [lineLayerId] },
  lineDraft: true,
  intersection: {
    enabled: true,
    targetSourceIds: [kit.source.sourceId],
    targetLayerIds: [lineLayerId],
    sourceRegistry: kit.registry,
  },
  multiSelect: { enabled: true, targetLayerIds: [lineLayerId] },
  dxfExport: {
    enabled: true,
    sourceRegistry: kit.registry,
  },
});
```

模板中把 `plugins` 传给地图容器：

```vue
<MapLibreInit ref="mapRef" :plugins="plugins" />
```

## 事实来源

- `src/entries/plugins.ts`
- `src/MapLibre/facades/businessPreset.ts`
- `src/MapLibre/facades/useBusinessMap.ts`
- `examples/views/NG/GI/NGGI06.vue`
- `examples/views/NG/GI/NGGI07.vue`
- `examples/views/NG/GI/NGGI08.vue`
- `examples/views/NG/GI/NGGI09.vue`
- `examples/views/NG/GI/NGGI10.vue`
- `examples/views/NG/GI/NGGI11.vue`
