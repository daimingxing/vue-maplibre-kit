# 核心概念

适合谁读：已经能显示地图，需要理解 source、layer、feature、声明式和命令式边界的开发者。

先读哪篇：[开始使用](../00-开始使用/index.md)。

对应示例：[NGGI01](../../../examples/views/NG/GI/NGGI01.vue)、[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)、[NGGI03](../../../examples/views/NG/GI/NGGI03.vue)。

## 本章文件

| 文件 | 解决的问题 |
| --- | --- |
| [01-地图实例与生命周期](./01-地图实例与生命周期.md) | `MapLibreInit`、公开实例和可调用时机 |
| [02-source-layer-feature](./02-source-layer-feature.md) | source、layer、feature 的分工 |
| [03-响应式数据维护](./03-响应式数据维护.md) | 正式业务数据如何新增、更新、删除 |
| [04-声明式与命令式](./04-声明式与命令式.md) | 稳定业务图层和临时运行时动作的边界 |

## 一句话理解

- source 是数据。
- layer 是渲染。
- feature 是业务要素。
- 声明式适合长期存在的业务结构。
- 命令式适合临时动作、交互反馈、调试和一次性覆盖。
