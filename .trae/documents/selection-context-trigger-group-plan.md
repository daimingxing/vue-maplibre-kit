# selection-context-trigger-group 改造计划

## 背景与目标

本次改造采用方案 A：

- 保留 `toSelectionBusinessContext()` 的现有高层能力定位
- 将当前“选中集变化”中的单目标语义字段收口到独立分组，避免多选尤其 box 多选时造成歧义
- 同步更新 `NGGI00.vue` 示例代码，使示例与新结构保持一致
- 在 `NGGI00.vue` 指定位置补充简洁注释，说明 `featureQuery.toSelectionBusinessContext()` 的作用
- 清理 `NGGI00.vue` 中 `featureQuery` / `featureActions` 重复引用的迭代残留

## 设计原则

1. **语义清晰优先**
   - `selected` / `added` / `removed` 保持“集合语义”
   - 当前触发本次选中变化的主目标字段移动到单独分组，避免与集合语义并列混淆

2. **兼容性可控**
   - 优先评估是否保留旧字段一段时间，或通过类型与示例引导迁移
   - 若保留旧字段，需要明确其兼容定位与迁移方向
   - 若不保留旧字段，需要同步修正仓库内调用点与类型断言，保证构建通过

3. **门面优先**
   - 业务层继续通过 `businessMap.feature` / `featureQuery` 消费能力
   - 不让 `NGGI00.vue` 直接依赖底层内部实现细节

## 实施步骤

### 步骤 1：调整 `useMapFeatureQuery.ts` 中的选中上下文类型设计

目标文件：
- `d:\WorkPlace\vue-maplibre-kit\src\MapLibre\facades\useMapFeatureQuery.ts`

计划动作：

1. 为“触发本次选中变化的主目标信息”新增独立类型分组，命名保持简单易懂，例如：
   - `trigger`
   - 或 `primary`

2. 将下列当前单目标语义字段收口到该分组：
   - `featureRef`
   - `feature`
   - `properties`
   - `featureId`
   - `layerId`
   - `sourceId`
   - `sourceLayer`
   - `geometryType`
   - `isPoint`
   - `isLine`
   - `isPolygon`
   - `lngLat`

3. 保留以下明显属于集合语义的字段在顶层：
   - `reason`
   - `selected`
   - `added`
   - `removed`
   - `selectedCount`
   - `selectedFeatures`

4. 重新定义 `MapBusinessSelectionContext`，避免它继续直接暴露一整套单目标字段在顶层造成误解

5. 调整 `toSelectionBusinessContext()` 的返回结构：
   - 仍复用 `toBusinessContext()` 的解析能力
   - 但输出时将单目标结果放入新增分组
   - 顶层只保留选中集变化真正高频且集合语义明确的字段

### 步骤 2：检查仓库内对 `MapBusinessSelectionContext` / `toSelectionBusinessContext()` 的使用点

目标范围：
- `src/views/NG/GI/NGGI00.vue`
- 仓库内相关测试与其他调用点

计划动作：

1. 搜索所有 `toSelectionBusinessContext(` 的调用位置
2. 搜索所有依赖旧顶层字段的 `MapBusinessSelectionContext` 使用位置
3. 按新结构逐一修正读取方式
4. 确认没有遗漏对旧顶层单目标字段的访问

### 步骤 3：同步更新 `NGGI00.vue` 示例

目标文件：
- `d:\WorkPlace\vue-maplibre-kit\src\views\NG\GI\NGGI00.vue`

计划动作：

1. 更新以下两处 `toSelectionBusinessContext()` 调用附近示例逻辑：
   - `#L1972`
   - `#L2515`

2. 在上述两处调用上方或同段注释中，补充简洁说明，明确表达：
   - 该方法用于把底层选中变化上下文转换为业务层更好消费的结构
   - 集合字段与触发目标字段已分组，避免多选场景混淆

3. 根据新结构调整示例读取方式，确保示例代码体现正确使用姿势：
   - 集合相关逻辑继续读 `selected` / `added` / `removed`
   - 若示例需要访问主目标信息，则从新分组字段读取

4. 清理以下重复定义：
   - `const featureQuery = businessMap.feature;`
   - `const featureActions = businessMap.feature;`

5. 统一命名与引用，消除迭代残留，避免同一能力双变量并存造成误导

### 步骤 4：同步修正类型导出与门面可消费性

目标文件：
- `d:\WorkPlace\vue-maplibre-kit\src\business.ts`
- 如有必要，还包括依赖该类型的 facade 导出位置

计划动作：

1. 检查 `MapBusinessSelectionContext` 的导出是否仍然准确
2. 如新增了触发目标分组类型，评估是否需要同时对外导出
3. 确保业务层通过公开门面即可拿到完整类型，不需要下探内部路径

### 步骤 5：同步修正测试

目标范围：
- `src/MapLibre/facades/useMapFeatureQuery.spec.ts`
- 其他受影响测试文件

计划动作：

1. 更新 `toSelectionBusinessContext()` 相关断言
2. 增加或修正以下验证点：
   - 顶层字段以集合语义为主
   - 触发目标字段已收口到新分组
   - 多选场景下 `selected` / `added` / `removed` 仍保持正确
   - 回退到 snapshot 的逻辑仍然成立

3. 如当前缺少“多选/box 语义清晰性”测试，补一条更贴近该问题的断言

### 步骤 6：验证

计划验证方式：

1. 运行项目构建命令，确认 TypeScript 与构建通过
   - 仓库现有验证命令为 `npm run build`

2. 若测试可直接运行，则补充执行受影响测试；若当前仓库未配置独立测试脚本，则至少保证构建与类型检查通过

3. 人工复核以下重点：
   - `MapBusinessSelectionContext` 顶层语义是否清楚
   - `NGGI00.vue` 示例是否体现新的最佳实践
   - 注释是否足够简洁，不堆砌解释
   - 未引入对内部实现路径的新依赖

## 兼容策略建议

实施时优先采用以下策略：

### 推荐策略
- **仓库内直接切换到新结构**
- 若当前尚无大量外部消费历史，可直接更新类型与示例，并同步修正测试

### 备选策略
- 若评估发现已有较多旧结构依赖，则：
  1. 临时保留旧字段
  2. 标注为兼容字段
  3. 示例全面改用新分组字段
  4. 后续再安排一次移除旧字段的收敛改造

本次实施前，优先先查看仓库内调用面大小，再决定采用“直接切换”还是“兼容过渡”。

## 完成标准

满足以下条件视为本次任务完成：

1. `toSelectionBusinessContext()` 返回结构已按方案 A 调整
2. 选中集上下文中的单目标语义字段不再与集合字段并列混放造成歧义
3. `NGGI00.vue` 示例已同步更新
4. `NGGI00.vue` 两处目标位置已补充简洁注释
5. `featureQuery` / `featureActions` 重复残留已清理并统一
6. 相关类型导出与测试已同步更新
7. 构建验证通过
