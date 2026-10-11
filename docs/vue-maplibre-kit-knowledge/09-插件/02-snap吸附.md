# snap 吸附

snap 插件负责把绘制、测量、业务图层和插件内置目标的吸附能力接入地图。推荐通过 `createBusinessPlugins({ snap: ... })` 注册，通过 `useBusinessMap().plugins.snap` 读取少量主动动作。

## 推荐注册

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const plugins = createBusinessPlugins({
  sourceRegistry,
  snap: {
    defaultTolerancePx: 12,
    intersectionExtensionMeters: 2,
    nearby: {
      maxDistanceMeters: 1,
      paddingPx: 2,
    },
    ruleDefaults: {
      snapTo: ["vertex", "segment"],
    },
    control: {
      enabled: true,
      position: "top-left",
      label: "吸附",
      panel: {
        enabled: true,
        businessLayers: true,
        intersection: true,
        polygonEdge: true,
        terradraw: true,
      },
    },
    preview: {
      enabled: true,
      pointEnabled: true,
      pointColor: "#dc2626",
      pointRadius: 7,
      targetColor: "#2563eb",
      targetPointRadius: 9,
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
        snapTo: ["vertex", "segment", "sameLayerIntersect", "crossLayerIntersect"],
        priority: 20,
      },
      设计线: {
        layerIds: [designLineLayerId],
        geometryTypes: ["LineString"],
        snapTo: ["vertex", "segment", "crossLayerIntersect"],
        priority: 20,
      },
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
- `control.panel.businessLayers`、`control.panel.intersection`、`control.panel.polygonEdge`、`control.panel.terradraw` 只控制右键面板是否允许展示对应运行期开关，默认都是 `true`。实际是否出现，还要看当前页面是否存在业务规则、是否注册交点插件、是否注册面边线插件、是否启用绘图或测量控件。
- `defaultTolerancePx` 是全局默认吸附范围，规则级 `tolerancePx` 可以覆盖它。
- `nearby` 是可选的 Path 候选归组能力。传 `true` 使用 kit 默认值，对象可配置 `maxDistanceMeters` 和 `paddingPx`。它只在当前最高 `rule.priority` 没有获胜 intersection 时形成 `relation = 'nearby'`；每个 target 保留自身真实 geometry 投影，不生成中点、几何中心或公共锚点。归组只作用于 LineString/MultiLineString，Point、Polygon 和运行时 Arrow 保持 direct 单目标。
- `intersectionExtensionMeters` 是 snap 内部交点计算使用的虚拟延长长度，单位米；`0` 表示只计算真实线段交点。非法负数、`NaN` 或无穷值回退到 kit 默认值。
- `preview` 控制独立吸附点和命中原要素的 `snapPreview` 状态；`enabled=false` 只关闭视觉预览，不停止吸附解析，`pointEnabled=false` 只隐藏独立吸附点。未配置的目标颜色、透明度、线宽和点半径不会覆写原要素样式；不创建完整线预览。
- 完整写法中 `businessLayers.rules` 声明业务图层候选来源，每条规则可指定 `id`、`label`、`layerIds`、`geometryTypes`、`snapTo`、`priority`、`where` 和 `filter`。
- 右键配置面板优先显示 `label || id`；未显式传 `id` 的规则会使用系统生成 ID。系统生成 ID 只保证当前规则数组内唯一；如果希望配置重排后面板开关状态仍稳定，应由业务侧显式提供唯一 `id`。
- `intersection` 只控制已注册 `intersectionPreview` 插件产生的旧点位是否参与吸附；未注册该插件时不会创建旧交点 layer rule。snap 原生 `sameLayerIntersect`、`crossLayerIntersect` 不读取该字段。
- `polygonEdge` 控制面边线临时预览线是否参与吸附；传 `false` 或 `{ enabled: false }` 可以关闭。
- `terradraw.defaults`、`terradraw.draw`、`terradraw.measure` 用于绘图控件和测量控件的吸附公共配置。
- `terradraw.*.drawnTargets` 控制 TerraDraw / Measure 已绘制要素是否参与吸附。`false` 表示关闭，`true` 表示使用默认点线面规则，对象表示开启并覆写 `geometryTypes`、`snapTo`、`priority`、`tolerancePx`。

## 交互行为

snap 主要是注册型插件：业务页把规则传入 `plugins` 后，绘图和测量交互会在地图事件中即时使用吸附结果。业务图层吸附是否生效，取决于目标图层是否可查询、几何类型是否匹配、规则是否启用，以及指针位置是否在吸附容差内。

`MapFeatureSnapResult.resolution` 是规范化结果入口：

- `matched` 携带唯一不可变 `decision`；
- `unmatched` 表示当前没有可用吸附节点；
- `invalid` 表示已经形成 target，但坐标、primary、数量或 intersection 证据不满足输出不变量。调用方不得把 `invalid` 当成 raw/unmatched 继续降级、重选或归组 nearby。

TerraDraw 绘制和测量会同时评估普通地图目标与已绘制要素目标：任一已启用来源为 `invalid` 时，本次点击或拖拽输入被阻止，不会改选另一来源，也不会按 raw 坐标落点；只有全部来源为 `unmatched` 时，才保留 TerraDraw 原生或 raw 行为。合法输入仍遵循调用方已有的 `pointerEvents` 和 `validation` 限制。

`decision` 明确区分三种关系：`direct` 只有一个 vertex/segment target；`intersection` 有固定 `snapCoordinate`、至少一个可选 target，并通过至少两个 `participants` 保留形成交点的完整几何证据；`nearby` 至少有两个真实 Path targets，`snapCoordinate` 等于确定性 primary target 的 `geometryCoordinate`。`geometryCoordinate` 始终位于 target 自身真实 geometry，`attachment` 区分 `real` 与端点延长得到的 `extended`。

target 和 participant 的 `key` 标识具体几何位置，不只标识 Feature。同一自交 LineString 的不同非相邻 segment 即使共享同一交点坐标，也会保留不同 `key` 和 `segment`，调用方不得再按 Feature ID 合并。

participant 发现先于当前 rule scope 的 target 可选资格过滤。交点节点可以由不可选择 participant 提供几何上下文；scope 只决定哪些 participant 能成为 targets。若 scope 排除节点的全部 participant，跳过该节点继续比较；一旦形成 targets，证据不完整必须返回 `invalid`，不能回退 direct 或 nearby。

顶层 `matched`、`lngLat`、`snapKind`、`targetCoordinate`、`anchorCoordinate`、`parents` 和 `candidates` 继续作为只读兼容投影存在：`lngLat` 与 `anchorCoordinate` 来自 `decision.snapCoordinate`，顶层目标字段来自 primary target，`parents` 来自 intersection participants，`candidates` 来自 targets。新调用方应直接消费 `resolution.decision`，不得再根据兼容字段数量重建 relation。

插件使用 `decision.snapCoordinate` 渲染吸附点，并通过同一套 `snapPreview` feature-state 高亮全部 targets。候选切换、鼠标离开、插件停用、配置变化、缩放、source/style 重建和销毁均由插件统一维护。点击消费方应冻结完整 decision；nearby 后续只能切换到已冻结 target 的既有 `geometryCoordinate`。

内置吸附按钮是运行期开关，不会改写业务传入的 `plugins` 配置对象。关闭后普通地图事件吸附、TerraDraw 绘图/测量吸附和吸附预览都会停用；再次开启后继续按原配置生效。

开启 `control.panel.enabled` 后，右键吸附按钮会展开运行期开关面板。面板可以控制业务图层规则、交点、面边线和 TerraDraw 绘图/测量是否参与吸附，但不保存用户偏好，也不写回业务配置。

- 交点开关只控制 `intersection-preview` 和 `intersection-materialized` 点是否参与吸附，不影响 intersection 插件刷新、显示或 materialize。
- 面边线开关只控制 `polygon-edge-preview` 线是否参与吸附，不影响 polygonEdge 的生成、高亮、选择或清理。
- TerraDraw 开关控制绘图/测量过程中的吸附总入口；关闭后 TerraDraw 原生吸附、普通地图目标吸附、已绘制要素吸附都不参与。

绘图或测量处于 drawing 状态时，普通业务图层点击会被绘制语义接管，避免“吸附到业务要素后落点绘制”同时触发业务图层点击、选中或弹窗。

## 原生交点吸附

- `sameLayerIntersect` 计算同一 rule 内 `LineString`、`MultiLineString` 的线线交点，包含同一条线的非相邻 segment 自交。
- `crossLayerIntersect` 采用双方 opt-in；两个不同 rule 都声明该模式时才计算它们之间的交点。
- Polygon ring 和 Polygon 与线之间不参与原生交点模式，既有 Polygon vertex/segment 行为保持不变。
- 相邻 segment 公共端点、闭合首尾公共端点和端点-端点重合由 vertex 处理；T 形端点落在线段中部会生成交点候选。
- `createBusinessPlugins` 在存在顶层 `sourceRegistry` 时为交点计算应用 source/layer/filter，避免使用 MapLibre 裁剪后的渲染坐标求交。source `$id` 使用原始 feature id，layer `$id` 使用 `promoteId`；自定义 `intersectionFeatureResolver` 可从第二个参数读取当前 `zoom`。
- 交点只保存在插件实例的紧凑内存数组和 KDBush 中，不创建交点 Feature、source 或 layer。source 数据和交点配置变化时重建；zoom 变化会重新计算 style filter，但过滤后要素集合未变化时由几何签名跳过重建；graphType 运行期显隐只过滤候选。
- mousemove 由 snap binding 使用 `requestAnimationFrame` 合帧，自动预览与 `scheduleMapEvent` 调用方共享本帧最新事件的一次解析结果。插件内部同时保存已经提交的 `result`、原始经纬度和屏幕点快照，即使视觉预览关闭也要求点击消费方使用该快照，不能再按 click 事件独立重判、重新投影或过滤 targets。未提交 decision 可以随 zoom 重算；点击后的业务会话应冻结完整 decision。
- 候选排序先比较 `rule.priority`，再比较 relation（`intersection > direct`）。不同 intersection 节点按 `distancePx`，同一节点同时有 cross/same 证据时 `crossLayerIntersect` 胜出；direct 保持 `vertex > segment`；最后使用稳定 key。只有最高 priority 没有获胜 intersection 时才尝试 nearby。
- 交点命中只显示吸附点，并通过 `snapPreview` 同时高亮最终获胜组合的真实父线；虚拟延长线不会进入预览。

`setRuleScope(ruleIds)` 用于短时会话限制可选 targets：普通候选必须属于 scope rule；intersection participant 仍按完整几何集合发现，随后只把 scope 内 participant 提升为 target。传 `null` 恢复全局查询。scope 不改写业务规则或重建交点索引。

## 命令式动作

```ts
const snap = businessMap.plugins.snap;

snap.isActive.value;
snap.toggle();
snap.activate();
snap.deactivate();
snap.clearPreview();
snap.setRuleScope(["管线"]);
snap.setRuleScope(null);
snap.resolveMapEvent(event);
snap.resolveTerradrawSnapOptions("draw", true);
```

`activate()`、`deactivate()`、`toggle()` 和 `clearPreview()` 成功拿到插件时返回 `true`。`clearPreview()` 会清除独立吸附点、当前预览快照和所有候选原要素的 `snapPreview` 状态。原要素高亮只使用真实 MapLibre `source + id`；没有该 ID 时仍可作为主结果并显示吸附点。`resolveMapEvent()` 适合高级业务交互自行解析一次普通地图事件的吸附结果。

## 生成要素与 generatedKind

snap 只渲染吸附点；原要素高亮通过 `snapPreview` 状态完成。两者都不会作为业务生成要素暴露给业务层，因此不会写入 `context.generatedKind`。

公开常量 `MAP_FEATURE_SNAP_PREVIEW_SOURCE_ID` 和 `MAP_FEATURE_SNAP_PREVIEW_POINT_LAYER_ID` 只用于高级调试、样式覆盖或测试断言。常规业务判断不要依赖 snap 预览 source/layer ID。

## 示例引用

- `examples/views/NG/GI/NGGI07.vue`：点、线、面三类业务图层吸附规则、内置吸附按钮，以及 TerraDraw 已绘制要素跨模式吸附。
- `examples/views/NG/GI/NGGI06.vue`：通过 `businessMap.plugins.snap.toggle()` 和 `clearPreview()` 证明 snap 已接入统一插件分组。

## 风险提示

- `snap: true` 只启用基础能力，业务图层吸附通常还要提供 `businessLayers`。
- 规则优先级会影响重叠候选的命中结果；点、线、面同时存在时应显式配置 `priority`。
- `filter` 是高级动态过滤能力，业务条件复杂时应保持函数逻辑可测试，避免把后端状态码含义写散在规则里。
