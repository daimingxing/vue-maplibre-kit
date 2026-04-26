# lineDraft 线草稿

lineDraft 插件负责托管线延长草稿和线廊面草稿。推荐通过 `createBusinessPlugins({ lineDraft: ... })` 注册，通过 `useBusinessMap().plugins.lineDraft` 读取草稿状态与命令式动作。

## 推荐注册

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const plugins = createBusinessPlugins({
  lineDraft: {
    enabled: true,
    styleOverrides: {
      line: { paint: { "line-color": "#d97706", "line-width": 5 } },
      fill: { paint: { "fill-color": "#facc15", "fill-opacity": 0.28 } },
    },
    onHoverEnter: (context) => {
      message.value = `草稿移入：${String(context.featureId ?? "无 ID")}`;
    },
    onClick: (context) => {
      message.value = `草稿点击：${String(context.generatedKind ?? "未知类型")}`;
    },
  },
});
```

## 配置重点

- `enabled` 控制插件是否启用。
- `styleOverrides.line` 覆盖草稿线图层样式。
- `styleOverrides.fill` 覆盖线廊面图层样式。
- `onHoverEnter`、`onHoverLeave`、`onClick`、`onDoubleClick`、`onContextMenu` 处理草稿图层交互。

## 状态读取

```ts
const draft = businessMap.plugins.lineDraft;

draft.state.value;
draft.hasFeatures.value;
draft.featureCount.value;
draft.getData();
draft.getFeatureById(featureId);
```

`getData()` 返回当前草稿 `FeatureCollection`；插件未注册时返回 `null`。

## 命令式动作

```ts
/**
 * 生成示例线草稿。
 * @returns 无返回值
 */
function addDraft(): void {
  draft.previewLine({
    lineFeature,
    segmentIndex: 0,
    extendLengthMeters: 800,
    origin: featureRef,
  });
}

/**
 * 生成示例线廊草稿。
 * @returns 无返回值
 */
function addRegion(): void {
  draft.replacePreviewRegion({
    lineFeature,
    widthMeters: 120,
  });
}
```

常用动作：

- `previewLine(options)`：生成或替换线延长草稿。
- `replacePreviewRegion(options)`：生成或替换线廊草稿。
- `saveProperties(featureId, patch, options)`：写回草稿属性。
- `removeProperties(featureId, keys, options)`：删除草稿属性。
- `clear()`：清空全部线草稿。

## 业务配合

真实业务通常先通过 `businessMap.feature.toBusinessContext(context)` 或 `businessMap.feature.resolveSelectedLine()` 拿到正式线要素，再传给 lineDraft。`origin` 建议使用 `MapSourceFeatureRef`，方便后续知道草稿来自哪条正式要素。

## 示例引用

- `examples/views/NG/GI/NGGI08.vue`：选中线段、生成延长线、生成线廊、读写草稿属性、读取草稿 GeoJSON。
- `examples/views/NG/GI/NGGI06.vue`：五插件总览中的 `previewLine`、`previewRegion`、`clearDraft`。

## 风险提示

- `segmentIndex` 表示使用第几段线生成延长线，真实业务应从当前命中线段或用户选择中解析，不宜长期固定为 `0`。
- `extendLengthMeters` 和 `widthMeters` 单位都是米，示例值只服务于当前深圳示例视口。
- 草稿属性写回只影响插件托管的草稿 GeoJSON，不等价于写回正式业务 source。
