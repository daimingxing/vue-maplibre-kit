# multiSelect 多选

multiSelect 插件负责把地图选择模式切换为多选，维护选中集，并配合 feature-state 样式展示选中效果。推荐通过 `createBusinessPlugins({ multiSelect: ... })` 注册，通过 `useBusinessMap().plugins.multiSelect` 读取状态与动作。

## 推荐注册

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const plugins = createBusinessPlugins({
  multiSelect: {
    enabled: true,
    deactivateBehavior: "retain",
    targetLayerIds: [pointLayerId, lineLayerId],
    canSelect: (context) => context.layerId !== null,
  },
});
```

## 配置重点

multiSelect 继承地图选择工具配置，常见配置包括：

- `enabled`：是否启用插件。
- `targetLayerIds`：允许参与多选的图层。
- `deactivateBehavior`：退出多选后的选中集处理方式；示例使用 `"retain"` 保留选中。
- `canSelect`：高级过滤函数，用于按命中上下文决定某个要素是否可选。
- `position`：内置控件位置。

## 状态读取

```ts
const multiSelect = businessMap.plugins.multiSelect;

multiSelect.isActive.value;
multiSelect.selectionMode.value;
multiSelect.selectedCount.value;
multiSelect.selectedFeatures.value;
```

`selectedFeatures` 中包含 `featureId`、`layerId`、`sourceId`、`sourceLayer`、`properties` 和 `snapshot` 等选中快照信息，适合驱动右侧表格、批量编辑面板或提交按钮状态。

## 命令式动作

```ts
multiSelect.activate();
multiSelect.deactivate();
multiSelect.toggle();
multiSelect.clear();
multiSelect.getActive();
multiSelect.getSelectedFeatures();
```

动作返回 `boolean`，表示是否成功拿到插件并执行动作。`getSelectedFeatures()` 会返回当前完整选中集；插件未注册时返回空数组。

## 选中态样式

multiSelect 只维护选择状态，图层样式需要业务层通过 feature-state 表达式接入。示例中使用 `createFeatureStateExpression` 把 `selected` 状态映射为不同颜色、半径和线宽。

```ts
pointPaint["circle-color"] = createFeatureStateExpression({
  default: "#f97316",
  selected: "#22c55e",
});
linePaint["line-width"] = createFeatureStateExpression({
  default: 4,
  selected: 8,
});
```

## 生成要素与 generatedKind

multiSelect 只维护选中集和 feature-state，不创建新的地图要素，因此不会写入 `context.generatedKind`。选中来源应通过 `selectedFeatures` 中的 `sourceId`、`layerId`、`featureId` 和 `snapshot` 判断。

## 示例引用

- `examples/views/NG/GI/NGGI10.vue`：切换多选、清空选中、读取选中要素、选中态样式接入。
- `examples/views/NG/GI/NGGI06.vue`：业务插件总览中的多选状态和选中 ID 展示。

## 风险提示

- 多选能否命中要素取决于业务图层是否参与交互，以及 `targetLayerIds`、`canSelect` 是否允许该要素。
- 退出多选后的选中集是否保留由 `deactivateBehavior` 决定，批量编辑场景应明确该策略。
- 选中态视觉效果不是插件自动替换样式；需要业务图层主动使用 feature-state 表达式。
