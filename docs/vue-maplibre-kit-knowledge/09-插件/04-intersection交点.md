# intersection 交点

intersection 插件负责根据目标线要素计算交点，支持预览交点、正式交点生成、正式交点属性维护和图层显隐。推荐通过 `createBusinessPlugins({ intersection: ... })` 注册，通过 `useBusinessMap().plugins.intersection` 读取能力。

## 推荐注册

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const plugins = createBusinessPlugins({
  sourceRegistry: registry,
  intersection: {
    visible: true,
    targetLayerIds: [lineLayerId],
    includeEndpoint: false,
    coordDigits: 6,
    materializedProperties: { status: "materialized" },
    onHoverEnter: (context) => {
      message.value = `交点移入：${context.intersectionId}`;
    },
    onClick: (context) => {
      message.value = `交点点击：${context.intersectionId}`;
    },
  },
});
```

## 配置重点

- `targetSourceIds` 是参与求交的业务 source 列表。
- `targetLayerIds` 用于限制参与求交的业务图层。
- `sourceRegistry` 推荐放在 `createBusinessPlugins()` 顶层，插件会自动从业务 source 注册表提取候选线。
- `intersection` 不支持 `true`，必须传入 `targetSourceIds` 或 `targetLayerIds`。
- `includeEndpoint` 控制是否把端点接触算作交点。
- `coordDigits` 控制交点坐标归一化小数位，用于去重稳定性。
- `ignoreSelf` 控制是否忽略同一条线自交。
- `materializedProperties` 给正式交点注入默认业务属性。
- `previewStateStyles`、`materializedStateStyles`、`previewStyleOverrides`、`materializedStyleOverrides` 用于样式定制。

全局 `plugins.intersection` 只配置插件启用后的默认行为、算法参数和默认视觉，允许 `visible`、`materializeOnClick`、`scope`、`includeEndpoint`、`coordDigits`、`ignoreSelf`、`previewStateStyles`、`materializedStateStyles`、`previewStyleOverrides`、`materializedStyleOverrides`。页面运行期对象、业务 source/layer 绑定、正式点业务属性和页面交互回调不进入全局配置。

## 状态读取

```ts
const intersection = businessMap.plugins.intersection;

intersection.count.value;
intersection.materializedCount.value;
intersection.visible.value;
intersection.scope.value;
intersection.selectedId.value;
intersection.lastError.value;
```

## 命令式动作

```ts
intersection.refresh();
intersection.materialize(intersectionId);
intersection.updateMaterializedProperties(intersectionId, {
  status: "checked",
  checker: "业务人员",
});
intersection.removeMaterialized(intersectionId);
intersection.clear();
```

常用读取动作：

- `getData()`：读取预览交点 GeoJSON。
- `getMaterializedData()`：读取正式交点 GeoJSON。
- `getSelected()`：读取当前选中的交点上下文。
- `getById(id)`、`getPreviewById(id)`、`getMaterializedById(id)`：按 ID 读取上下文。

图层和范围动作：

- `show()`、`hide()`：控制交点图层显隐。
- `setScope("all" | "selected")`：切换求交范围。
- `clearMaterialized()`：清空正式交点集合。

## 示例引用

- `examples/views/NG/GI/NGGI09.vue`：刷新交点、生成正式点、设置正式点属性、删除正式点、读取 GeoJSON。
- `examples/views/NG/GI/NGGI06.vue`：业务插件总览中的刷新交点、生成正式交点、删除正式交点。

## 风险提示

- `targetSourceIds` 或 `targetLayerIds` 至少传一个；缺少业务 source 或 source 中没有线要素时，刷新不会得到预期交点。
- `includeEndpoint: false` 表示只计算线段真实交叉，不把线端点接触算作交点；端点是否算交点应按业务规则明确。
- `coordDigits` 影响去重，位数过低可能合并近邻交点，位数过高可能让浮点误差形成重复点。
