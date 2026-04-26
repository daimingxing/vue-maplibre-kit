# snap 吸附

snap 插件负责把绘制、测量和普通业务图层的吸附能力接入地图。推荐通过 `createBusinessPlugins({ snap: ... })` 注册，通过 `useBusinessMap().plugins.snap` 读取少量主动动作。

## 推荐注册

```ts
import { createBusinessPlugins, type MapFeatureSnapRule } from "vue-maplibre-kit/plugins";

const snapRules = [
  {
    id: "point-snap",
    layerIds: [pointLayerId],
    geometryTypes: ["Point"],
    snapTo: ["vertex"],
    priority: 30,
    tolerancePx: 14,
  },
  {
    id: "line-snap",
    layerIds: [lineLayerId],
    geometryTypes: ["LineString"],
    snapTo: ["vertex", "segment"],
    priority: 20,
    tolerancePx: 12,
  },
] satisfies MapFeatureSnapRule[];

const plugins = createBusinessPlugins({
  snap: {
    layerIds: [pointLayerId, lineLayerId],
    defaultTolerancePx: 12,
    preview: {
      enabled: true,
      pointColor: "#dc2626",
      pointRadius: 7,
      lineColor: "#2563eb",
      lineWidth: 5,
    },
    ordinaryLayers: {
      enabled: true,
      rules: snapRules,
    },
  },
});
```

## 配置重点

- `layerIds` 是业务预设提供的简写；未显式传 `ordinaryLayers` 时，会生成一条默认普通图层吸附规则。
- `defaultTolerancePx` 是全局默认吸附范围，规则级 `tolerancePx` 可以覆盖它。
- `preview` 控制吸附点、命中线段的预览样式。
- `ordinaryLayers.rules` 声明普通业务图层候选来源，每条规则可指定 `layerIds`、`geometryTypes`、`snapTo`、`priority`、`where` 和 `filter`。
- `terradraw.defaults`、`terradraw.draw`、`terradraw.measure` 用于绘图控件和测量控件的吸附公共配置。

## 交互行为

snap 主要是注册型插件：业务页把规则传入 `plugins` 后，绘图和测量交互会在地图事件中即时使用吸附结果。普通业务图层吸附是否生效，取决于目标图层是否可查询、几何类型是否匹配、规则是否启用，以及指针位置是否在吸附容差内。

## 命令式动作

```ts
const snap = businessMap.plugins.snap;

snap.clearPreview();
snap.resolveMapEvent(event);
snap.resolveTerradrawSnapOptions("draw", true);
```

`clearPreview()` 成功拿到插件时返回 `true`，可用于按钮或流程切换时主动清理吸附预览。`resolveMapEvent()` 适合高级业务交互自行解析一次普通地图事件的吸附结果。

## 示例引用

- `examples/views/NG/GI/NGGI07.vue`：点、线、面三类普通业务图层吸附规则。
- `examples/views/NG/GI/NGGI06.vue`：通过 `businessMap.plugins.snap.clearPreview()` 证明 snap 已接入统一插件分组。

## 风险提示

- `snap: true` 只启用基础能力，普通业务图层吸附通常还要提供 `layerIds` 或 `ordinaryLayers.rules`。
- 规则优先级会影响重叠候选的命中结果；点、线、面同时存在时应显式配置 `priority`。
- `filter` 是高级动态过滤能力，业务条件复杂时应保持函数逻辑可测试，避免把后端状态码含义写散在规则里。
