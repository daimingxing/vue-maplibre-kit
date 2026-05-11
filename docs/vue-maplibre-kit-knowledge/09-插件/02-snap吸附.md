# snap 吸附

snap 插件负责把绘制、测量、业务图层和插件内置目标的吸附能力接入地图。推荐通过 `createBusinessPlugins({ snap: ... })` 注册，通过 `useBusinessMap().plugins.snap` 读取少量主动动作。

## 推荐注册

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const plugins = createBusinessPlugins({
  snap: {
    defaultTolerancePx: 12,
    ruleDefaults: {
      snapTo: ["vertex", "segment"],
    },
    control: {
      enabled: true,
      position: "top-left",
      label: "吸附",
      panel: { enabled: true },
    },
    preview: {
      enabled: true,
      pointColor: "#dc2626",
      pointRadius: 7,
      lineColor: "#2563eb",
      lineWidth: 5,
    },
    businessLayers: {
      巡检点: {
        layerIds: [pointLayerId],
        geometryTypes: ["Point"],
        snapTo: ["vertex"],
        priority: 30,
        tolerancePx: 14,
      },
      管线: {
        layerIds: [lineLayerId],
        geometryTypes: ["LineString"],
        priority: 20,
      },
    },
    intersection: {
      enabled: true,
      priority: 110,
      snapTo: ["vertex"],
    },
    polygonEdge: {
      enabled: true,
      priority: 90,
      snapTo: ["vertex", "segment"],
    },
    terradraw: {
      defaults: {
        drawnTargets: {
          geometryTypes: ["Point", "LineString", "Polygon"],
          snapTo: ["vertex", "segment"],
          priority: 40,
          tolerancePx: 12,
        },
      },
      measure: {
        drawnTargets: false,
      },
    },
  },
});
```

## 最小业务图层吸附

只想快速给一个或多个业务图层开启吸附，且不需要右键面板逐条控制时，可以使用 `layerIds` 超简写：

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const plugins = createBusinessPlugins({
  snap: {
    layerIds: [
      EXAMPLE_POINT_LAYER_ID,
      EXAMPLE_LINE_LAYER_ID,
      EXAMPLE_FILL_LAYER_ID,
    ],
  },
});
```

这会展开为一条默认业务吸附规则，默认 `id` 为 `business-layer-snap`，默认 `label` 为 `业务图层`。它适合“先把吸附跑起来”的场景；如果需要右键面板显示明确名称、分别开关点线面规则、设置不同 `snapTo` / `priority` / `tolerancePx`，应改用 `businessLayers` 命名规则写法。

## 配置重点

- `businessLayers` 在 `createBusinessPlugins({ snap })` 中支持命名简写：对象 key 会展开为规则 `id` 和默认 `label`，value 可写单个 layerId、layerId 数组或单条规则对象。
- `layerIds` 是快速业务图层吸附简写，会兼容展开为一条默认业务规则；需要面板展示和分规则控制时推荐改用 `businessLayers`。
- `ruleDefaults` 只作用于 `businessLayers` 命名简写展开，适合统一配置 `snapTo` 等默认值；完整 `{ enabled, rules }` 写法会原样使用。
- `control` 控制是否渲染内置吸附按钮。按钮左键会运行期开启或关闭整个吸附能力，`label` 用作无障碍提示文本。
- `control.panel.enabled` 默认 `false`；开启后右键吸附按钮会展开业务规则开关面板，再次右键、点击地图或按 Escape 会关闭面板。
- `defaultTolerancePx` 是全局默认吸附范围，规则级 `tolerancePx` 可以覆盖它。
- `preview` 控制吸附点、命中线段的预览样式。
- 完整写法中 `businessLayers.rules` 声明业务图层候选来源，每条规则可指定 `id`、`label`、`layerIds`、`geometryTypes`、`snapTo`、`priority`、`where` 和 `filter`。
- 右键配置面板优先显示 `label || id`；未显式传 `id` 的规则会使用系统生成 ID。系统生成 ID 只保证当前规则数组内唯一；如果希望配置重排后面板开关状态仍稳定，应由业务侧显式提供唯一 `id`。
- `intersection` 控制交点插件内置点位是否参与吸附；传 `false` 或 `{ enabled: false }` 可以关闭。
- `polygonEdge` 控制面边线临时预览线是否参与吸附；传 `false` 或 `{ enabled: false }` 可以关闭。
- `terradraw.defaults`、`terradraw.draw`、`terradraw.measure` 用于绘图控件和测量控件的吸附公共配置。
- `terradraw.*.drawnTargets` 控制 TerraDraw / Measure 已绘制要素是否参与吸附。`false` 表示关闭，`true` 表示使用默认点线面规则，对象表示开启并覆写 `geometryTypes`、`snapTo`、`priority`、`tolerancePx`。

## 交互行为

snap 主要是注册型插件：业务页把规则传入 `plugins` 后，绘图和测量交互会在地图事件中即时使用吸附结果。业务图层吸附是否生效，取决于目标图层是否可查询、几何类型是否匹配、规则是否启用，以及指针位置是否在吸附容差内。

内置吸附按钮是运行期开关，不会改写业务传入的 `plugins` 配置对象。关闭后普通地图事件吸附、TerraDraw 绘图/测量吸附和吸附预览都会停用；再次开启后继续按原配置生效。

开启 `control.panel.enabled` 后，右键吸附按钮会展开业务规则开关面板。面板只影响本次运行期的 `businessLayers.rules` 启用状态，不保存用户偏好，也不控制 `intersection` 和 `polygonEdge` 这类内置目标。

绘图或测量处于 drawing 状态时，普通业务图层点击会被绘制语义接管，避免“吸附到业务要素后落点绘制”同时触发业务图层点击、选中或弹窗。

## 命令式动作

```ts
const snap = businessMap.plugins.snap;

snap.isActive.value;
snap.toggle();
snap.activate();
snap.deactivate();
snap.clearPreview();
snap.resolveMapEvent(event);
snap.resolveTerradrawSnapOptions("draw", true);
```

`activate()`、`deactivate()`、`toggle()` 和 `clearPreview()` 成功拿到插件时返回 `true`。`resolveMapEvent()` 适合高级业务交互自行解析一次普通地图事件的吸附结果。

## 生成要素与 generatedKind

snap 只渲染吸附点和吸附线段预览，不把这些预览作为业务生成要素暴露给业务层，因此不会写入 `context.generatedKind`。

公开常量 `MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID`、`MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID`、`MAP_FEATURE_SNAP_PREVIEW_LINE_LAYER_ID` 只用于高级调试、样式覆盖或测试断言。常规业务判断不要依赖 snap 预览 source/layer ID。

## 示例引用

- `examples/views/NG/GI/NGGI07.vue`：点、线、面三类业务图层吸附规则、内置吸附按钮，以及 TerraDraw 已绘制要素跨模式吸附。
- `examples/views/NG/GI/NGGI06.vue`：通过 `businessMap.plugins.snap.toggle()` 和 `clearPreview()` 证明 snap 已接入统一插件分组。

## 风险提示

- `snap: true` 只启用基础能力，业务图层吸附通常还要提供 `businessLayers`。
- 规则优先级会影响重叠候选的命中结果；点、线、面同时存在时应显式配置 `priority`。
- `filter` 是高级动态过滤能力，业务条件复杂时应保持函数逻辑可测试，避免把后端状态码含义写散在规则里。
