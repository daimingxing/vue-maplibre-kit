# geometry 几何入口

适合：需要做线延长、线廊、线测量、交点计算和来源引用的开发者。

先读：[几何工具](../10-几何工具/index.md)。

对应示例：`NGGI08`、`NGGI09`、`NGGI00`。

## 推荐导入

```ts
import {
  MapLineExtensionTool,
  MapLineCorridorTool,
  MapLineMeasureTool,
  collectLineIntersections,
  createMapSourceFeatureRef,
} from "vue-maplibre-kit/geometry";
```

## 主要能力

| 导出 | 用途 |
| --- | --- |
| `MapLineExtensionTool` | 延长线、解析线段方向 |
| `MapLineCorridorTool` | 按线生成区域或线廊面 |
| `MapLineMeasureTool` | 测整线长度或线内区间距离 |
| `collectLineIntersections` | 收集多条业务线的交点 |
| `buildIntersectionCandidates` | 从 source 数据提取求交候选线 |
| `buildMaterializedIntersectionFeature` | 构造正式交点 GeoJSON |
| `createMapSourceFeatureRef` | 构造 sourceId + featureId 来源引用 |
| `buildMapSourceFeatureRefKey` | 构造稳定来源引用键 |

## 使用建议

- 几何入口只处理数据和计算，不负责地图渲染。
- 渲染结果仍通过业务 source、插件或命令式图层动作展示。
- 需要把预览结果关联回正式要素时，优先使用来源引用工具。
