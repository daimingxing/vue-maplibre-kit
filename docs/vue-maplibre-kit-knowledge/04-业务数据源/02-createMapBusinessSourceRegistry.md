# createMapBusinessSourceRegistry

适合谁读：页面上有一个或多个业务 source，并希望统一查找要素、保存属性的开发者。

先读哪篇：[01-createMapBusinessSource](./01-createMapBusinessSource.md)。

对应示例：[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)、[NGGI05](../../../examples/views/NG/GI/NGGI05.vue)。

## 基本写法

```ts
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
} from "vue-maplibre-kit/business";

const source = createMapBusinessSource({
  sourceId: "pipe-source",
  features,
  layers,
});

const registry = createMapBusinessSourceRegistry();
registry.addSource(source);
```

registry 会按 `sourceId` 管理 source。重复的 `sourceId` 会让查询目标不确定，因此注册时会直接报错。

## 异步批量写法

适合先请求 sourceId 列表，再并发请求每个 source 数据的页面：

```ts
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
} from "vue-maplibre-kit/business";

const registry = createMapBusinessSourceRegistry();

async function loadSources() {
  const ids = await fetchSourceIds();
  const sources = await Promise.all(
    ids.map(async (id) => {
      const data = await fetchSourceData(id);

      return createMapBusinessSource({
        sourceId: id,
        features: data.features,
        layers: data.layers,
      });
    }),
  );

  registry.setSources(sources);
}
```

`setSources()` 会用新列表替换当前注册表，适合后端批量刷新；单个 source 运行时增删用 `addSource()` 和 `removeSource()` 更直接。

## 常用能力

| 方法                                                   | 用途                         |
| ------------------------------------------------------ | ---------------------------- |
| `addSource(source)`                                    | 注册单个业务 source          |
| `setSources(sources)`                                  | 批量替换当前业务 source 列表 |
| `removeSource(sourceId)`                               | 移除单个业务 source          |
| `clearSources()`                                       | 清空全部业务 source          |
| `getSource(sourceId)`                                  | 读取单个业务 source          |
| `listSources()`                                        | 列出当前页面全部 source      |
| `resolveFeature(featureRef)`                           | 按标准来源引用读取最新要素   |
| `resolveFeaturePropertyPanelState(featureRef)`         | 解析属性面板状态             |
| `replaceFeatures(sourceId, features)`                  | 替换某个 source 的要素数组   |
| `saveProperties(sourceId, featureId, patch, layerId)`  | 保存属性                     |
| `removeProperties(sourceId, featureId, keys, layerId)` | 删除允许删除的属性           |
| `createFeatureRef(sourceId, featureId, layerId)`       | 创建标准来源引用             |

## 与 useBusinessMap 的关系

业务页面通常把 registry 交给 `useBusinessMap`：

```ts
const businessMap = useBusinessMap({
  mapRef: () => mapRef.value,
  sourceRegistry: registry,
});
```

之后可从 `businessMap.sources`、`businessMap.feature`、`businessMap.editor` 读取聚合能力。
