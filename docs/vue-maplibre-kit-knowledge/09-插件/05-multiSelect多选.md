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
    gestures: {
      clickAdd: true,
      clickDeselect: true,
      box: true,
      range: true,
    },
    resolveRange: (anchor, endpoint) => {
      if (anchor.layerId !== endpoint.layerId) {
        return { status: "rejected", reason: "rangeUnsupported" };
      }
      return { status: "resolved", features: [anchor, endpoint] };
    },
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
- `showControl`：是否渲染内置多选开关；默认 true。命令会话期间可关闭，以免与会话控件竞争。
- `gestures`：组合手势开关。`clickAdd` 控制普通点击未选中要素时新增，`clickDeselect` 控制普通点击已选中要素时取消，`box` 控制框选，`range` 控制范围选择。`box: true` 表示启用且使用 Shift；对象形式可指定 `enabled` 与 `trigger: "shift" | "ctrl" | "alt"`。`range: true` 表示启用且使用 Shift；对象形式可指定 `enabled` 与 `trigger: "click" | "shift" | "ctrl" | "alt"`。未配置时 `clickAdd`、`clickDeselect` 与框选默认启用，范围默认关闭。修饰键采用精确匹配，额外同时按下其他修饰键不触发该手势。
- `resolveRange`：范围成员解析器。插件只传入通用选中项快照，由调用方返回范围成员或拒绝原因；插件不读取业务图层名或属性名。

按住框选 `trigger` 拖拽且超过阈值时才框选；范围 `trigger` 的拖拽不会框选，只抑制随后 click，避免一次操作同时产生框选和范围。同一修饰键时：未超过阈值按点击规则处理，超过阈值且框选启用则框选。`range.trigger` 为修饰键时，修饰键只执行范围：无起点时普通单击未选中要素建立起点；`clickAdd` 关闭后，有起点的未选中普通单击不追加。无起点时按住修饰键单击仍建立起点。`range.trigger` 为 `click` 时，未选中点击建立或执行范围，已选中点击只按 `clickDeselect` 反选。成功的范围选择只派发一次 `reason: "range"` 的选中变化，并保留原锚点；框选不修改锚点。范围无法解析时派发 `reason: "reject"`，选中集和锚点保持不变。

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
multiSelect.deactivate({ emitChange: false });
multiSelect.toggle();
multiSelect.clear();
multiSelect.getActive();
multiSelect.getSelectedFeatures();
multiSelect.replaceSelectedFeatures(savedFeatures, { emitChange: false });
multiSelect.undo();
multiSelect.canUndo();
multiSelect.clearUndoHistory();
```

动作返回 `boolean`，表示是否成功拿到插件并执行动作。`getSelectedFeatures()` 会返回当前完整选中集；插件未注册时返回空数组。`replaceSelectedFeatures()` 原子替换选中集、feature-state 和数量；会话现场恢复时应传 `{ emitChange: false }`，避免把内部恢复伪装成用户选择变化。`deactivate({ emitChange: false })` 只退出多选模式，不按 `deactivateBehavior` 清空选中集，也不派发变化。`undo()` 回退当前编辑周期内上一次用户可见选中变化，同时恢复主选中项和范围起点；无历史或未激活时返回 `false`。`Delete` 在多选激活且焦点不是输入控件时触发同一流程。常驻多选的完成、取消和退出会清空历史；临时多选会话使用独立历史，完成或取消后恢复会话开始前的常驻历史。`clearUndoHistory()` 始终清空当前历史；不提供 redo。

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
