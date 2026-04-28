## 2026-04-28 polygonEdge 类型检查记录

- 问题：面边线图层样式表达式使用数组字面量时，TypeScript 会推断成普通数组，无法满足 MapLibre 的 `ExpressionSpecification` 类型。
- 处理：把表达式构建函数返回值显式标注为 `ExpressionSpecification`，并对可选颜色、宽度、透明度补默认值。
- 经验：后续新增 MapLibre 表达式时，复杂表达式建议集中到函数中构建，并显式声明返回类型，避免在图层 `paint` 对象里被推断成宽泛数组。

- 问题：snap 内置目标的 `snapTo` 默认值 `["vertex"]` 被推断成 `string[]`，无法赋值给 `MapFeatureSnapMode[]`。
- 处理：为局部变量显式标注 `MapFeatureSnapMode[]`。
- 经验：插件配置里的字面量数组如果会与联合字符串类型混用，优先给变量或常量加明确类型。

## 2026-04-28 polygonEdge 示例补充记录

- 问题：`tsconfig.app.json` 会同时检查示例与 spec 文件，当前 spec 文件存在一批历史类型噪声，直接运行会掩盖新增示例是否有问题。
- 处理：先用 `Select-String` 过滤 `NGGI00.vue`、`NGGI06.vue`、`NGGI12.vue`、`src/App.vue` 的 app 类型检查输出，确认新增示例文件无新增类型错误；再执行库构建类型检查、全量测试和构建。
- 经验：示例页改动后，除了库构建检查，还需要单独关注示例文件名过滤结果；后续可以考虑给示例单独拆一份不包含 spec 的 tsconfig。

- 问题：全量测试中 `businessPreset.spec.ts` 首个动态 import 用例在并发负载下偶发超过 Vitest 默认 5 秒超时。
- 处理：给该用例单独设置 10 秒超时，避免测试结果受机器瞬时负载影响。
- 经验：依赖动态导入较重模块的测试，如果全量运行时接近默认超时，应给用例设置局部超时，不要扩大全局测试超时。
