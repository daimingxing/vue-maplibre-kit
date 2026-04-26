# propertyPolicy

适合谁读：需要控制哪些字段可见、可编辑、可删除的开发者。

先读哪篇：[属性编辑索引](./index.md)。

对应示例：[NGGI05](../../../examples/views/NG/GI/NGGI05.vue)。

## 它是什么

`propertyPolicy` 是字段治理规则，不是业务数据本身。它告诉属性面板和保存逻辑如何对待 `feature.properties` 中的字段。

```ts
import type { MapFeaturePropertyPolicy } from "vue-maplibre-kit/business";

const policy: MapFeaturePropertyPolicy = {
  readonlyKeys: ["id"],
  fixedKeys: ["name", "status"],
  removableKeys: ["editable"],
};
```

## 常见字段

| 字段 | 含义 |
| --- | --- |
| `readonlyKeys` | 可展示但不允许保存覆盖 |
| `fixedKeys` | 固定展示的业务字段 |
| `hiddenKeys` | 面板中隐藏的字段 |
| `removableKeys` | 允许显式删除的字段 |
| `rules` | 单字段细粒度规则 |

## source 级和 layer 级

source 可以声明默认 `propertyPolicy`，layer 也可以声明自己的 `propertyPolicy`。命中某个 layer 时，最终规则会合并 source 默认规则和 layer 局部规则。

## 保护字段

业务 ID 字段会被作为强保护字段处理。即使业务层没有写入 `readonlyKeys`，也不应该让用户修改主键。
