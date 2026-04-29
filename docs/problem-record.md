## 2026-04-29 Popup 与 TerraDraw 配置热更新记录

- 状态：已解决
- 问题：`MglPopup` 初始创建后没有响应 `options` 变化，业务运行时修改 `closeButton`、`closeOnClick`、`maxWidth` 等配置不会同步到原生 Popup。
- 处理：把 Popup 生命周期抽到 `useMglPopupLifecycle()`，监听 `options` 变化后重建原生 Popup，并在内部重建时屏蔽 `close` 事件向外同步，避免误改 `v-model:visible`。
- 经验：MapLibre Popup 的部分配置涉及事件绑定和内部 DOM，统一重建比逐项补丁更稳定；重建时必须恢复当前 `visible` 和 `lngLat`。

- 状态：设计确认不改
- 问题：TerraDraw / Measure 控件的 `position`、`modes`、`modeOptions` 等构造期配置只在首次创建时读取。
- 处理：不做构造期配置热更新和控件重建，避免重建导致临时绘制、测量要素和当前编辑状态丢失。`interactive`、`lineDecoration`、`snapping` 继续沿用现有独立 watcher。
- 经验：绘图控件的构造期配置应尽量在启用前确定；如需切换大块构造配置，业务侧应先保存临时数据，再通过 `isUse` 显式销毁和重新启用控件。

## 2026-04-28 polygonEdge 类型检查记录

- 状态：已解决
- 问题：面边线图层样式表达式使用数组字面量时，TypeScript 会推断成普通数组，无法满足 MapLibre 的 `ExpressionSpecification` 类型。
- 处理：把表达式构建函数返回值显式标注为 `ExpressionSpecification`，并对可选颜色、宽度、透明度补默认值。
- 经验：后续新增 MapLibre 表达式时，复杂表达式建议集中到函数中构建，并显式声明返回类型，避免在图层 `paint` 对象里被推断成宽泛数组。

- 状态：已解决
- 问题：snap 内置目标的 `snapTo` 默认值 `["vertex"]` 被推断成 `string[]`，无法赋值给 `MapFeatureSnapMode[]`。
- 处理：为局部变量显式标注 `MapFeatureSnapMode[]`。
- 经验：插件配置里的字面量数组如果会与联合字符串类型混用，优先给变量或常量加明确类型。

## 2026-04-28 polygonEdge 示例补充记录

- 状态：已解决
- 问题：`tsconfig.app.json` 会同时检查示例与 spec 文件，当前 spec 文件存在一批历史类型噪声，直接运行会掩盖新增示例是否有问题。
- 处理：先用 `Select-String` 过滤 `NGGI00.vue`、`NGGI06.vue`、`NGGI12.vue`、`src/App.vue` 的 app 类型检查输出，确认新增示例文件无新增类型错误；再执行库构建类型检查、全量测试和构建。
- 经验：示例页改动后，除了库构建检查，还需要单独关注示例文件名过滤结果；后续可以考虑给示例单独拆一份不包含 spec 的 tsconfig。

- 状态：已解决
- 问题：全量测试中 `businessPreset.spec.ts` 首个动态 import 用例在并发负载下偶发超过 Vitest 默认 5 秒超时。
- 处理：给该用例单独设置 10 秒超时，避免测试结果受机器瞬时负载影响。
- 经验：依赖动态导入较重模块的测试，如果全量运行时接近默认超时，应给用例设置局部超时，不要扩大全局测试超时。

## 2026-04-28 TerraDraw 已绘制要素吸附记录

- 状态：已解决
- 问题：Draw / Measure 控件注册的 TerraDraw 模式不一定完全一致，同步点、线、面吸附配置时，部分控件可能没有某个模式，`updateModeOptions()` 会抛出缺失模式异常。
- 处理：同步吸附配置时仍统一尝试 `point`、`linestring`、`polygon` 三类模式，但对缺失模式异常静默跳过，只保留真正异常的告警。
- 经验：TerraDraw 模式配置同步要按“能力存在就增强”的思路处理，不能假设 Draw 与 Measure 的模式集合完全相同。

- 状态：已解决
- 问题：TerraDraw 已绘制要素吸附和业务图层吸附都可能命中，单纯返回坐标无法判断谁更近。
- 处理：自定义吸附解析器改为接收完整 `MapFeatureSnapResult`，按 `distancePx` 选择最近的命中结果，再把坐标交给 TerraDraw。
- 经验：跨来源吸附目标需要保留完整命中元数据，避免过早降级成坐标导致优先级和距离信息丢失。
