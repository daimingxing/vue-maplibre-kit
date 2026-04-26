# 业务数据源

适合谁读：需要把业务 GeoJSON 数据接入地图，并支持增删改查的开发者。

先读哪篇：[核心概念/source-layer-feature](../01-核心概念/02-source-layer-feature.md)。

对应示例：[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)、[NGGI05](../../../examples/views/NG/GI/NGGI05.vue)。

## 本章文件

| 文件 | 解决的问题 |
| --- | --- |
| [01-createMapBusinessSource](./01-createMapBusinessSource.md) | 创建单个业务 source |
| [02-createMapBusinessSourceRegistry](./02-createMapBusinessSourceRegistry.md) | 管理多个业务 source |
| [03-MapBusinessSourceLayers](./03-MapBusinessSourceLayers.md) | 在模板中渲染 source 和 layer |
| [04-要素新增更新删除](./04-要素新增更新删除.md) | 响应式维护正式业务要素 |

## 推荐模型

业务项目自己持有 `FeatureCollection`，组件库通过 `createMapBusinessSource` 消费这份数据，并通过 registry 提供查询和写回入口。
