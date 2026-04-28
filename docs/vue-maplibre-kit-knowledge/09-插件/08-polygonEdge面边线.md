# polygonEdge 面边线

polygonEdge 插件会把 Polygon / MultiPolygon 的边界拆成纯临时 LineString 预览线。它不写回业务 source，主要用于边界高亮、边线状态样式和 snap 吸附。

## 推荐注册

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const plugins = createBusinessPlugins({
  polygonEdge: {
    style: {
      normal: { color: "#409eff", width: 3, opacity: 0.9 },
      hover: { color: "#f56c6c", width: 5 },
      selected: { color: "#e6a23c", width: 6 },
      highlighted: { color: "#67c23a", width: 5 },
    },
    styleRules: [
      {
        where: { type: "boundary" },
        style: {
          normal: { color: "#ff7a00", width: 4 },
          hover: { color: "#f56c6c", width: 5 },
        },
      },
    ],
  },
  snap: {
    polygonEdge: {
      enabled: true,
      snapTo: ["vertex", "segment"],
    },
  },
});
```

`polygonEdge: true` 可以直接启用默认面边线插件。局部页面需要覆盖视觉时，再传对象配置。

## 读取能力

```ts
const businessMap = useBusinessMap({
  mapRef: () => mapRef.value,
  sourceRegistry: registry,
});

const polygonEdge = businessMap.plugins.polygonEdge;

polygonEdge.generateFromSelected();
polygonEdge.highlightPolygon("polygon::source-a::land-1");
polygonEdge.highlightRing("ring::source-a::land-1::0::0");
polygonEdge.highlightEdge("polygon-edge::source-a::land-1::0::0::0");
polygonEdge.selectEdge("polygon-edge::source-a::land-1::0::0::0");
polygonEdge.clear();
```

## 生成字段

每条边线都会带统一生成要素字段：

- `generatedKind`：固定为 `polygon-edge-preview`。
- `generatedGroupId`：同一个来源面生成的边线共享同一分组。
- `generatedParentSourceId`、`generatedParentFeatureId`、`generatedParentLayerId`：来源业务要素引用。
- `polygonId`：来源面的整体分组 ID。
- `ringId`：某个 ring 的分组 ID。
- `edgeId`：单条边线 ID。
- `polygonIndex`：MultiPolygon 子面序号；普通 Polygon 固定为 `0`。
- `ringIndex`：ring 序号；`0` 是外环，`1` 及以后是内环洞。
- `edgeIndex`：当前 ring 内的边序号。
- `isOuterRing`：是否外环。

GeoJSON 中 Polygon 的坐标是 ring 数组。第一个 ring 是外环边界，后续 ring 表示洞。插件可以只高亮一个 ring，因此不一定每次都高亮整个图形。

## 样式规则

`style` 是统一默认状态样式。`styleRules` 按来源面属性匹配，命中后会把样式写到生成边线属性上，因此 hover、selected、highlighted 仍能按特定要素呈现不同视觉。

规则匹配只做浅层等值判断，适合按 `type`、`kind`、`level` 这类稳定业务字段分组。需要更复杂的业务判断时，建议先在来源面属性里整理出明确字段，再交给 `where` 匹配。

## 与 snap 联动

注册 polygonEdge 后，snap 默认会把 `polygonEdgePreviewLineLayer` 作为内置目标，支持吸附到顶点和线段。页面可以通过下面配置关闭：

```ts
const plugins = createBusinessPlugins({
  polygonEdge: true,
  snap: {
    polygonEdge: {
      enabled: false,
    },
  },
});
```

`snap.polygonEdge` 只控制吸附目标；顶层 `polygonEdge` 才是注册面边线插件本身。
