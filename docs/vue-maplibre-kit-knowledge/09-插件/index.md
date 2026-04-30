# 09-插件

本目录记录 `vue-maplibre-kit` 的业务插件接入方式。插件注册统一优先使用 `vue-maplibre-kit/plugins` 暴露的 `createBusinessPlugins`，业务页面读取插件状态与动作统一走 `useBusinessMap().plugins.*`。

## 阅读顺序

1. [插件注册总览](./01-插件注册总览.md)
2. [snap 吸附](./02-snap吸附.md)
3. [lineDraft 线草稿](./03-lineDraft线草稿.md)
4. [intersection 交点](./04-intersection交点.md)
5. [polygonEdge 面边线](./08-polygonEdge面边线.md)
6. [multiSelect 多选](./05-multiSelect多选.md)
7. [dxfExport 导出 DXF](./06-dxfExport导出DXF.md)
8. [单插件子路径高级用法](./07-单插件子路径高级用法.md)

## 核心约定

- 注册入口：从 `vue-maplibre-kit/plugins` 引入 `createBusinessPlugins`。
- 读取入口：从 `vue-maplibre-kit/business` 引入 `useBusinessMap`，再通过 `businessMap.plugins.snap`、`businessMap.plugins.lineDraft`、`businessMap.plugins.intersection`、`businessMap.plugins.polygonEdge`、`businessMap.plugins.multiSelect`、`businessMap.plugins.dxfExport` 读取能力。
- 示例来源：`examples/views/NG/GI/NGGI06.vue` 是业务插件总览；`NGGI07.vue` 到 `NGGI12.vue` 分别对应插件独立示例。
- 门面边界：业务模拟层应使用包名路径，不直接引用 `src/MapLibre/**`。

## 业务插件速查

| 插件 | 注册配置键 | 读取路径 | 典型用途 | 示例 |
| --- | --- | --- | --- | --- |
| snap | `snap` | `businessMap.plugins.snap` | 绘制、测量、普通业务图层吸附 | `NGGI07.vue` |
| lineDraft | `lineDraft` | `businessMap.plugins.lineDraft` | 生成延长线、线廊草稿、草稿属性维护 | `NGGI08.vue` |
| intersection | `intersection` | `businessMap.plugins.intersection` | 线交点预览、正式交点生成与属性维护 | `NGGI09.vue` |
| polygonEdge | `polygonEdge` | `businessMap.plugins.polygonEdge` | 面边线临时预览、边线高亮、边线吸附目标 | `NGGI12.vue` |
| multiSelect | `multiSelect` | `businessMap.plugins.multiSelect` | 多选模式、选中集读取、选中态样式联动 | `NGGI10.vue` |
| dxfExport | `dxfExport` | `businessMap.plugins.dxfExport` | 生成或下载 DXF，读取导出状态 | `NGGI11.vue` |

## generatedKind 速查

`generatedKind` 是插件生成要素的公开元数据。需要判断生成要素类型时，优先读取 `context.generatedKind` 或 `feature.properties.generatedKind`，再按需要使用公开常量。

| 插件 | generatedKind | 公开常量 |
| --- | --- | --- |
| snap | 无 | 无 |
| lineDraft | `line-extension-draft` | `LINE_DRAFT_PREVIEW_EXTENSION_KIND` |
| lineDraft | `line-corridor-draft` | `LINE_DRAFT_PREVIEW_CORRIDOR_KIND` |
| intersection | `intersection-preview` | `INTERSECTION_PREVIEW_KIND` |
| intersection | `intersection-materialized` | `INTERSECTION_MATERIALIZED_KIND` |
| polygonEdge | `polygon-edge-preview` | `POLYGON_EDGE_PREVIEW_KIND` |
| multiSelect | 无 | 无 |
| dxfExport | 无 | 无 |

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
  sourceRegistry: kit.registry,
  snap: { layerIds: [lineLayerId] },
  lineDraft: true,
  intersection: {
    targetLayerIds: [lineLayerId],
  },
  polygonEdge: true,
  multiSelect: { enabled: true, targetLayerIds: [lineLayerId] },
  dxfExport: true,
});
```

关键规则：

- `sourceRegistry` 放在顶层，供 `intersection` 和 `dxfExport` 复用。
- `intersection` 不支持 `true`；自动模式必须传入 `targetSourceIds` 或 `targetLayerIds`，并提供顶层或局部 `sourceRegistry`。
- 高级模式可以只传 `intersection.getCandidates`，此时候选线完全由业务方提供。
- `dxfExport: true` 使用顶层 `sourceRegistry`、库内默认值和全局 DXF 默认值。
- `dxfExport` 对象写法允许把 `sourceCrs`、`targetCrs`、`fileName` 等任务默认值扁平写在业务预设层。
- 动态修改插件配置时，请替换 `descriptor/options` 顶层引用。推荐用 `computed(() => createBusinessPlugins(...))` 生成新描述对象，不推荐原地改写嵌套配置对象。

插件初始化失败时，宿主会在控制台输出错误并跳过当前插件，避免单个插件拖垮地图。业务层如果发现 `businessMap.plugins.*` 能力不可用，应先检查插件注册配置和控制台错误。

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
- `examples/views/NG/GI/NGGI12.vue`
