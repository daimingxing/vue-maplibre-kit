# createMapBusinessSourceRegistry

适合谁读：页面上有一个或多个业务 source，并希望统一查找要素、保存属性的开发者。

先读哪篇：[01-createMapBusinessSource](./01-createMapBusinessSource.md)。

对应示例：[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)、[NGGI05](../../../examples/views/NG/GI/NGGI05.vue)。

## 基本写法

```ts
import { createMapBusinessSourceRegistry } from "vue-maplibre-kit/business";

const registry = createMapBusinessSourceRegistry([source]);
```

registry 会按 `sourceId` 管理 source。重复的 `sourceId` 会让查询目标不确定，因此创建时会直接报错。

## 常用能力

| 方法 | 用途 |
| --- | --- |
| `getSource(sourceId)` | 读取单个业务 source |
| `listSources()` | 列出当前页面全部 source |
| `resolveFeature(featureRef)` | 按标准来源引用读取最新要素 |
| `resolveFeaturePropertyPanelState(featureRef)` | 解析属性面板状态 |
| `replaceFeatures(sourceId, features)` | 替换某个 source 的要素数组 |
| `saveProperties(sourceId, featureId, patch, layerId)` | 保存属性 |
| `removeProperties(sourceId, featureId, keys, layerId)` | 删除允许删除的属性 |
| `createFeatureRef(sourceId, featureId, layerId)` | 创建标准来源引用 |

## 与 useBusinessMap 的关系

业务页面通常把 registry 交给 `useBusinessMap`：

```ts
const businessMap = useBusinessMap({
  mapRef: () => mapRef.value,
  sourceRegistry: registry,
});
```

之后可从 `businessMap.sources`、`businessMap.feature`、`businessMap.editor` 读取聚合能力。
