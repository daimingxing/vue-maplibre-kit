# createMapBusinessSource

适合谁读：需要把一份 GeoJSON 包装为业务 source 的开发者。

先读哪篇：[业务数据源索引](./index.md)。

对应示例：[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)。

## 基本写法

```ts
import { ref } from "vue";
import {
  createMapBusinessSource,
  type MapCommonFeatureCollection,
} from "vue-maplibre-kit/business";

const sourceData = ref<MapCommonFeatureCollection>({
  type: "FeatureCollection",
  features: [],
});

const source = createMapBusinessSource({
  sourceId: "asset-source",
  data: sourceData,
  promoteId: "id",
  layers,
});
```

## ID 策略

创建 source 时必须且只能选择一种业务 ID 策略：

| 策略 | 用法 |
| --- | --- |
| `promoteId` | 业务 ID 来自 `properties` 下的指定字段，并透传给 GeoJSON source |
| `featureIdKey` | 业务 ID 来自 `properties` 下的指定字段，但不作为原生 `promoteId` 透传 |
| `getFeatureId` | 用函数从 feature 解析业务 ID |

`promoteId` 是普通业务页面的首选，因为它能让 `feature-state` 和业务 ID 对齐。

## 属性规则

`propertyPolicy` 描述字段治理规则，和真实 `feature.properties` 不是一回事。

```ts
const source = createMapBusinessSource({
  sourceId: "asset-source",
  data: sourceData,
  promoteId: "id",
  propertyPolicy: {
    readonlyKeys: ["id"],
    fixedKeys: ["name", "status"],
    removableKeys: ["remark"],
  },
});
```

`readonlyKeys` 保护字段不被保存覆盖；`removableKeys` 控制字段是否允许被删除。
