# 样式表达式工具增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加业务友好的 properties 动态取值表达式工具，并让 `createSimpleLineStyle`、`createSimpleCircleStyle`、`createSimpleFillStyle` 支持表达式值。

**Architecture:** 在 `map-feature-property-expression.ts` 中集中提供低阶 `getFeatureProperty` 与类型化 `getFeatureColor`、`getFeatureNumber`、`getFeatureString`、`getFeatureBoolean`。所有 helper 返回 MapLibre 原生表达式数组，可直接写进样式工厂，也可嵌套进 `createFeatureStateExpression`、`matchFeatureProperty`、`whenFeaturePropertyEquals`、`whenFeaturePropertyIn` 的返回值分支。简单样式工厂只放开输入类型并继续透传到完整样式工厂，不改图层创建和插件宿主链路。

**Tech Stack:** Vue 3、TypeScript、Vitest、MapLibre GL JS 5.22、项目现有业务门面、`docs/vue-maplibre-kit-knowledge` 知识库。

---

## 已确认事实

- `docs/knowledge-base/maplibre-gl/reference/05-styles-and-expressions.md` 已说明 `['get', 'color']` 可从 `properties` 动态取值。
- MapLibre 官方表达式参考 `https://maplibre.org/maplibre-style-spec/expressions/` 已确认存在 `get`、`coalesce`、`to-color`、`to-number`、`to-string`、`to-boolean`。
- 本地 `node_modules/maplibre-gl/src/data/bucket/fill_bucket.test.ts` 已出现 `['to-color', ['get', 'foo'], '#000']` 用法。
- 本仓库已有 `to-number`、`to-string` 示例，见 `src/MapLibre/terradraw/useTerradrawLineDecoration.ts` 和 `src/MapLibre/terradraw/terradraw-config.ts`。
- 当前工作区已有既有变更 `examples/views/NG/GI/mock/map2.geojson`，本计划不触碰该文件。

---

## 文件结构

- Modify: `src/MapLibre/shared/map-feature-property-expression.spec.ts`，增加属性读取、typed helper、嵌套表达式测试。
- Modify: `src/MapLibre/shared/map-feature-property-expression.ts`，导出 `MapExpressionValue`、`getFeatureProperty`、`getFeatureColor`、`getFeatureNumber`、`getFeatureString`、`getFeatureBoolean`。
- Modify: `src/MapLibre/composables/useMapEffect.spec.ts`，增加 `createFeatureStateExpression` 嵌套 typed helper 的回归测试。
- Modify: `src/MapLibre/facades/businessPreset.spec.ts`，增加三个 `createSimple*Style` 接收表达式值的测试。
- Modify: `src/MapLibre/facades/businessPreset.ts`，放开简单样式工厂参数类型。
- Modify: `src/entries/business.ts`，补业务入口导出和 `mapExpressions` 聚合。
- Modify: `src/entries/root.ts`，补根入口导出。
- Modify: `docs/vue-maplibre-kit-knowledge/06-样式与状态/01-样式工厂.md`，补简单样式动态取值示例。
- Modify: `docs/vue-maplibre-kit-knowledge/06-样式与状态/02-表达式工具.md`，补 typed helper 和嵌套说明。
- Add: `docs/vue-maplibre-kit-knowledge/06-样式与状态/05-原生表达式.md`，作为 MapLibre 原生表达式逃生通道。
- Modify: `docs/vue-maplibre-kit-knowledge/06-样式与状态/index.md`，补新教程入口。
- Modify: `docs/problem-record.md`，记录本轮表达式语法确认和设计边界。

---

### Task 1: 表达式 helper 测试

**Files:**
- Modify: `src/MapLibre/shared/map-feature-property-expression.spec.ts`

- [ ] **Step 1: 扩展导入**

把测试文件顶部导入扩展为包含：

```ts
import {
  getFeatureBoolean,
  getFeatureColor,
  getFeatureNumber,
  getFeatureProperty,
  getFeatureString,
  matchFeatureProperty,
  whenFeaturePropertyEquals,
  whenFeaturePropertyIn,
} from './map-feature-property-expression';
```

- [ ] **Step 2: 写 typed helper 失败测试**

在 `describe('map-feature-property-expression', () => {` 中新增断言：

```ts
expect(getFeatureProperty('color')).toEqual(['get', 'color']);
expect(getFeatureColor('color', '#79b8ff')).toEqual([
  'to-color',
  ['coalesce', ['get', 'color'], '#79b8ff'],
]);
expect(getFeatureNumber('width', 3)).toEqual([
  'to-number',
  ['coalesce', ['get', 'width'], 3],
]);
expect(getFeatureString('label', '')).toEqual([
  'to-string',
  ['coalesce', ['get', 'label'], ''],
]);
expect(getFeatureBoolean('disabled', false)).toEqual([
  'to-boolean',
  ['coalesce', ['get', 'disabled'], false],
]);
```

- [ ] **Step 3: 写嵌套表达式失败测试**

新增三类嵌套断言：

```ts
expect(
  whenFeaturePropertyEquals(
    'status',
    'warning',
    getFeatureColor('warningColor', '#ef4444'),
    getFeatureColor('color', '#64748b')
  )
).toEqual([
  'case',
  ['==', ['get', 'status'], 'warning'],
  ['to-color', ['coalesce', ['get', 'warningColor'], '#ef4444']],
  ['to-color', ['coalesce', ['get', 'color'], '#64748b']],
]);

expect(
  whenFeaturePropertyIn(
    'status',
    ['warning', 'checking'],
    getFeatureNumber('activeWidth', 6),
    getFeatureNumber('width', 3)
  )
).toEqual([
  'match',
  ['get', 'status'],
  ['warning', 'checking'],
  ['to-number', ['coalesce', ['get', 'activeWidth'], 6]],
  ['to-number', ['coalesce', ['get', 'width'], 3]],
]);

expect(
  matchFeatureProperty(
    'kind',
    {
      pipe: getFeatureColor('pipeColor', '#1677ff'),
      area: getFeatureColor('areaColor', '#79b8ff'),
    },
    getFeatureColor('color', '#64748b')
  )
).toEqual([
  'match',
  ['get', 'kind'],
  'pipe',
  ['to-color', ['coalesce', ['get', 'pipeColor'], '#1677ff']],
  'area',
  ['to-color', ['coalesce', ['get', 'areaColor'], '#79b8ff']],
  ['to-color', ['coalesce', ['get', 'color'], '#64748b']],
]);
```

- [ ] **Step 4: 运行失败测试**

Run: `npx vitest run src/MapLibre/shared/map-feature-property-expression.spec.ts`

Expected: FAIL，提示新函数未导出或不存在。

---

### Task 2: 实现表达式 helper

**Files:**
- Modify: `src/MapLibre/shared/map-feature-property-expression.ts`

- [ ] **Step 1: 导出表达式类型和低阶读取函数**

把文件顶部的 `type MapExpressionValue = any;` 改为：

```ts
/** 简化后的 MapLibre 表达式值。 */
export type MapExpressionValue = any;

/** 可参与属性比较的字面量值。 */
type FeaturePropertyComparableValue = string | number | boolean | null;

/** 业务属性名。 */
type FeaturePropertyKey = string;

/**
 * 生成读取 feature properties 的 `get` 表达式。
 * @param propertyKey 属性键名
 * @returns MapLibre `get` 表达式
 */
export function getFeatureProperty(propertyKey: FeaturePropertyKey): MapExpressionValue {
  return ['get', propertyKey];
}
```

删除或替换原私有 `getFeaturePropertyExpression()`，所有内部调用统一使用 `getFeatureProperty(propertyKey)`。

- [ ] **Step 2: 增加四个 typed helper**

在 `getFeatureProperty()` 后新增：

```ts
/**
 * 生成带默认值的属性取值表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认值
 * @returns MapLibre `coalesce` 表达式
 */
function getFeaturePropertyWithFallback(
  propertyKey: FeaturePropertyKey,
  fallbackValue: MapExpressionValue
): MapExpressionValue {
  return ['coalesce', getFeatureProperty(propertyKey), fallbackValue];
}

/**
 * 读取属性并转换为颜色表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认颜色
 * @returns MapLibre `to-color` 表达式
 */
export function getFeatureColor(propertyKey: FeaturePropertyKey, fallbackValue: string): MapExpressionValue {
  return ['to-color', getFeaturePropertyWithFallback(propertyKey, fallbackValue)];
}

/**
 * 读取属性并转换为数值表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认数值
 * @returns MapLibre `to-number` 表达式
 */
export function getFeatureNumber(propertyKey: FeaturePropertyKey, fallbackValue: number): MapExpressionValue {
  return ['to-number', getFeaturePropertyWithFallback(propertyKey, fallbackValue)];
}

/**
 * 读取属性并转换为字符串表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认字符串
 * @returns MapLibre `to-string` 表达式
 */
export function getFeatureString(propertyKey: FeaturePropertyKey, fallbackValue: string): MapExpressionValue {
  return ['to-string', getFeaturePropertyWithFallback(propertyKey, fallbackValue)];
}

/**
 * 读取属性并转换为布尔表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认布尔值
 * @returns MapLibre `to-boolean` 表达式
 */
export function getFeatureBoolean(propertyKey: FeaturePropertyKey, fallbackValue: boolean): MapExpressionValue {
  return ['to-boolean', getFeaturePropertyWithFallback(propertyKey, fallbackValue)];
}
```

- [ ] **Step 3: 运行表达式测试**

Run: `npx vitest run src/MapLibre/shared/map-feature-property-expression.spec.ts`

Expected: PASS。

---

### Task 3: feature-state 嵌套回归

**Files:**
- Modify: `src/MapLibre/composables/useMapEffect.spec.ts`

- [ ] **Step 1: 增加测试导入**

把当前导入改为包含：

```ts
import {
  createFeatureStateExpression,
  type UseMapEffectResult,
  useMapEffect,
} from './useMapEffect';
import { getFeatureColor } from '../shared/map-feature-property-expression';
```

- [ ] **Step 2: 增加嵌套回归测试**

在 `describe('useMapEffect', () => {` 中新增：

```ts
it('feature-state 表达式允许嵌套 properties 取值表达式', () => {
  expect(
    createFeatureStateExpression({
      default: getFeatureColor('color', '#79b8ff'),
      hover: getFeatureColor('hoverColor', '#facc15'),
      selected: '#2563eb',
    })
  ).toEqual([
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    '#2563eb',
    [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      ['to-color', ['coalesce', ['get', 'hoverColor'], '#facc15']],
      ['to-color', ['coalesce', ['get', 'color'], '#79b8ff']],
    ],
  ]);
});
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run src/MapLibre/composables/useMapEffect.spec.ts`

Expected: PASS。

---

### Task 4: 简单样式工厂支持表达式

**Files:**
- Modify: `src/MapLibre/facades/businessPreset.spec.ts`
- Modify: `src/MapLibre/facades/businessPreset.ts`

- [ ] **Step 1: 写失败测试**

在 `businessPreset.spec.ts` 顶部新增：

```ts
import { getFeatureColor, getFeatureNumber } from '../shared/map-feature-property-expression';
```

在“应创建常用简单样式”用例后新增测试，覆盖：

```ts
const lineStyle = createSimpleLineStyle({
  color: getFeatureColor('color', '#2563eb'),
  width: getFeatureNumber('width', 3),
  opacity: getFeatureNumber('opacity', 0.8),
});
const circleStyle = createSimpleCircleStyle({
  color: getFeatureColor('color', '#16a34a'),
  radius: getFeatureNumber('radius', 8),
  strokeColor: getFeatureColor('strokeColor', '#ffffff'),
  strokeWidth: getFeatureNumber('strokeWidth', 2),
});
const fillStyle = createSimpleFillStyle({
  color: getFeatureColor('color', '#f97316'),
  opacity: getFeatureNumber('opacity', 0.2),
  outlineColor: getFeatureColor('outlineColor', '#ffffff'),
});
```

断言各 paint 字段等于对应 `to-color` 或 `to-number` 表达式。

- [ ] **Step 2: 运行失败测试**

Run: `npx vitest run src/MapLibre/facades/businessPreset.spec.ts`

Expected: FAIL，表达式数组不能赋给当前 `string` / `number` 类型，或新 helper 缺失。

- [ ] **Step 3: 放开简单样式参数类型**

在 `businessPreset.ts` 顶部新增：

```ts
import type { MapExpressionValue } from '../shared/map-feature-property-expression';
```

在简单样式接口前新增：

```ts
/** 可写入 MapLibre 样式字段的业务值。 */
type MapStyleValue<T> = T | MapExpressionValue;

/** 样式颜色值。 */
type MapStyleColor = MapStyleValue<string>;

/** 样式数值。 */
type MapStyleNumber = MapStyleValue<number>;
```

把 `SimpleLineStyleOptions`、`SimpleCircleStyleOptions`、`SimpleFillStyleOptions` 中的颜色字段改为 `MapStyleColor`，数值字段改为 `MapStyleNumber`。

如果 MapLibre paint 类型仍因表达式数组推断报错，只对具体字段做最小断言，例如：

```ts
...(options.color ? { 'line-color': options.color as any } : {}),
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/MapLibre/facades/businessPreset.spec.ts`

Expected: PASS。

---

### Task 5: 公开入口补齐

**Files:**
- Modify: `src/entries/business.ts`
- Modify: `src/entries/root.ts`

- [ ] **Step 1: 补业务入口导入和导出**

在 `business.ts` 中从 `map-feature-property-expression` 导入并导出：

```ts
getFeatureProperty,
getFeatureColor,
getFeatureNumber,
getFeatureString,
getFeatureBoolean,
```

同时在 `mapExpressions` 中加入这五个函数，顺序放在 `createFeatureStateExpression` 后、`whenFeaturePropertyEquals` 前。

- [ ] **Step 2: 补根入口导出**

在 `root.ts` 现有表达式工具导出附近新增：

```ts
export { getFeatureProperty } from '../MapLibre/shared/map-feature-property-expression';
export { getFeatureColor } from '../MapLibre/shared/map-feature-property-expression';
export { getFeatureNumber } from '../MapLibre/shared/map-feature-property-expression';
export { getFeatureString } from '../MapLibre/shared/map-feature-property-expression';
export { getFeatureBoolean } from '../MapLibre/shared/map-feature-property-expression';
```

- [ ] **Step 3: 运行类型检查**

Run: `npx vue-tsc -p tsconfig.app.json --noEmit --pretty false`

Expected: PASS。

---

### Task 6: 知识库和原生表达式教程

**Files:**
- Modify: `docs/vue-maplibre-kit-knowledge/06-样式与状态/01-样式工厂.md`
- Modify: `docs/vue-maplibre-kit-knowledge/06-样式与状态/02-表达式工具.md`
- Add: `docs/vue-maplibre-kit-knowledge/06-样式与状态/05-原生表达式.md`
- Modify: `docs/vue-maplibre-kit-knowledge/06-样式与状态/index.md`

- [ ] **Step 1: 更新样式工厂文档**

在 `01-样式工厂.md` 中新增“根据 properties 动态取值”小节，示例必须包含：

```ts
const lineStyle = createSimpleLineStyle({
  color: getFeatureColor("color", "#1677ff"),
  width: getFeatureNumber("width", 3),
  opacity: getFeatureNumber("opacity", 0.8),
});

const fillStyle = createSimpleFillStyle({
  color: getFeatureColor("color", "#79b8ff"),
  opacity: getFeatureNumber("opacity", 0.35),
});
```

并给出包含 `properties.color`、`properties.opacity` 的 GeoJSON 片段。

- [ ] **Step 2: 更新表达式工具文档**

在 `02-表达式工具.md` 中新增 `getFeatureProperty` 与四个 typed helper 的说明，并明确：

- `getFeatureProperty()` 是低阶工具，只生成 `['get', key]`。
- `getFeatureColor()`、`getFeatureNumber()`、`getFeatureString()`、`getFeatureBoolean()` 会处理默认值和类型转换。
- 这些 helper 可嵌套进 `createFeatureStateExpression`、`matchFeatureProperty`、`whenFeaturePropertyEquals`、`whenFeaturePropertyIn` 的返回值分支。

- [ ] **Step 3: 新增原生表达式教程**

创建 `05-原生表达式.md`，章节包含：

- 什么时候需要原生表达式。
- 表达式数组结构。
- `['get', 'color']` 读取属性。
- `['coalesce', ['get', 'color'], '#79b8ff']` 提供默认值。
- `['to-color', ['coalesce', ['get', 'color'], '#79b8ff']]`。
- `['to-number', ['coalesce', ['get', 'width'], 3]]`。
- `['to-string', ['coalesce', ['get', 'label'], '']]`。
- `['to-boolean', ['coalesce', ['get', 'disabled'], false]]`。
- `case`、`match`、`feature-state` 示例。
- 在 `createLineLayerStyle({ paint })` 和 `createSimpleLineStyle()` 中分别使用的示例。

教程参考链接必须包含本地资料和官方资料：

```md
参考资料：[MapLibre 样式与表达式速记](../../../knowledge-base/maplibre-gl/reference/05-styles-and-expressions.md)、[MapLibre 官方表达式参考](https://maplibre.org/maplibre-style-spec/expressions/)。
```

- [ ] **Step 4: 更新索引**

在 `index.md` 表格中新增：

```md
| [05-原生表达式](./05-原生表达式.md) | 表达式工具不够用时如何直接写 MapLibre 表达式 |
```

- [ ] **Step 5: 手动核对表达式拼写**

文档中原生表达式操作名只能使用已确认的 MapLibre 名称：`get`、`coalesce`、`to-color`、`to-number`、`to-string`、`to-boolean`、`case`、`match`、`boolean`、`feature-state`、`==`。

---

### Task 7: 问题记录

**Files:**
- Modify: `docs/problem-record.md`

- [ ] **Step 1: 追加本轮记录**

在文件末尾追加：

```md
## 2026-05-06 样式表达式 helper 设计

- 问题：业务层需要根据 GeoJSON `properties.color`、`properties.width` 等字段动态控制样式，但业务开发者不熟悉 MapLibre 原生表达式。
- 确认：MapLibre 原生表达式支持 `get` 读取属性，支持 `coalesce` 提供默认值，支持 `to-color`、`to-number`、`to-string`、`to-boolean` 做类型转换。
- 处理：新增 `getFeatureColor`、`getFeatureNumber`、`getFeatureString`、`getFeatureBoolean` 等业务 helper，并让 `createSimple*Style` 支持表达式值。
- 边界：原生表达式仍作为逃生通道保留在知识库中；常见样式场景优先使用业务 helper，避免业务页直接堆复杂数组表达式。
```

- [ ] **Step 2: 确认不触碰既有用户变更**

Run: `git diff -- examples/views/NG/GI/mock/map2.geojson`

Expected: 输出为空，说明本轮没有修改该已有变更文件。

---

### Task 8: 全量验证

**Files:**
- No file edits unless verification exposes issue.

- [ ] **Step 1: 运行聚焦测试**

Run:

```powershell
npx vitest run src/MapLibre/shared/map-feature-property-expression.spec.ts src/MapLibre/composables/useMapEffect.spec.ts src/MapLibre/facades/businessPreset.spec.ts
```

Expected: PASS。

- [ ] **Step 2: 运行 TypeScript 检查**

Run: `npm run ts:check`

Expected: PASS。

- [ ] **Step 3: 运行测试套件**

Run: `npm test`

Expected: PASS。

- [ ] **Step 4: 运行构建**

Run: `npm run build`

Expected: PASS。

- [ ] **Step 5: 查看最终变更**

Run: `git status --short`

Expected: 本轮变更只包含计划内源码、测试、知识库和问题记录；`examples/views/NG/GI/mock/map2.geojson` 仍可能作为既有变更存在，但不应出现本轮 diff。

---

## 自检

- Spec coverage: 覆盖四个 typed helper、`getFeatureProperty`、简单样式工厂表达式输入、现有表达式工具嵌套、业务入口和根入口、知识库更新、原生表达式逃生通道、自动检查。
- Placeholder scan: 本计划没有 `TBD`、`TODO` 或“后续补充”式步骤；每个代码任务都给出目标代码形状或明确命令。
- Type consistency: 统一使用 `MapExpressionValue`、`getFeatureColor`、`getFeatureNumber`、`getFeatureString`、`getFeatureBoolean`，不引入额外 DSL 名称。
