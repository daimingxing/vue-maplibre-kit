# 示例索引

适合：想按示例快速找到某个功能怎么写的开发者。

先读：[开始使用](../00-开始使用/index.md)。

示例目录：`examples/views/NG/GI/`。

## 示例总览

| 示例 | 演示能力 | 使用入口 | 适合复制吗 |
| --- | --- | --- | --- |
| `NGGI00` | 完整业务验证页，覆盖地图、source、layer、属性、Popup、插件、DXF、rawHandles | `business`、`plugins`、`geometry` | 适合当完整参考，不建议整页复制 |
| `NGGI01` | 最小地图、`mapRef`、加载状态 | `business` | 适合复制基础骨架 |
| `NGGI02` | 业务 source/layer、响应式增删改、命令式 source/layer | `business` | 适合复制数据维护方式 |
| `NGGI03` | 图层样式、hover、selected、feature-state | `business` | 适合复制状态样式模式 |
| `NGGI04` | 点击要素、空白点击、Popup 显示属性 | `business` | 适合复制交互流程 |
| `NGGI05` | 指定要素属性编辑、`propertyPolicy` | `business` | 适合复制属性面板流程 |
| `NGGI06` | 六个插件总览 | `business`、`plugins` | 适合理解组合方式 |
| `NGGI07` | snap 吸附规则和预览样式 | `business`、`plugins` | 适合复制吸附配置 |
| `NGGI08` | lineDraft 线草稿、线廊、草稿属性、GeoJSON | `business`、`plugins` | 适合复制线段业务流程 |
| `NGGI09` | intersection 交点预览、正式点、属性、删除 | `business`、`plugins` | 适合复制交点流程 |
| `NGGI10` | multiSelect 多选、选中样式、读取选中要素 | `business`、`plugins` | 适合复制多选流程 |
| `NGGI11` | dxfExport 生成/下载 DXF、过滤、颜色、CRS | `business`、`plugins` | 适合复制 DXF 导出流程 |
| `NGGI12` | polygonEdge 面边线、snap 联动和边线高亮 | `business`、`plugins` | 适合复制面边线流程 |

## 章节

- [NGGI00 到 NGGI12](01-NGGI00到NGGI11.md)
- [按功能查示例](02-按功能查示例.md)

## 使用提醒

- 小示例更适合初学者。
- `NGGI00` 更像真实项目总装验证页，适合查完整联动。
- 示例必须使用包名路径，不能反向学习内部 `src/MapLibre/**` import。
