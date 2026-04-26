# 几何工具

本目录说明 `vue-maplibre-kit/geometry` 暴露的几何辅助能力。它们不依赖 Vue 组件生命周期，适合在业务事件、表格操作、插件回调和离线数据处理中复用。

## 入口

```ts
import {
  MapLineExtensionTool,
  MapLineCorridorTool,
  MapLineMeasureTool,
  buildIntersectionCandidates,
  collectLineIntersections,
  buildMaterializedIntersectionFeature,
  createMapSourceFeatureRef,
  buildMapSourceFeatureRefKey,
} from 'vue-maplibre-kit/geometry';
```

## 能力分组

| 分组 | 主要导出 | 适合场景 |
| --- | --- | --- |
| 线延长 | `MapLineExtensionTool` | 点击线段后生成临时延长线、识别命中线段、过滤零长度线段 |
| 线廊 | `MapLineCorridorTool` | 按中心线生成面区域、替换同一条线已有的线廊面 |
| 线测量 | `MapLineMeasureTool` | 计算整线长度、两点沿线区间长度、点到线的投影里程 |
| 交点 | `buildIntersectionCandidates`、`collectLineIntersections`、`buildMaterializedIntersectionFeature` | 从多个业务 source 中找线线交点，并把交点落成正式点要素 |
| 来源引用 | `createMapSourceFeatureRef`、`buildMapSourceFeatureRefKey` | 在预览要素、属性面板、插件动作之间稳定传递 `sourceId + featureId` |

## 读取顺序

1. 需要延长选中线，先看 [01-线延长.md](./01-线延长.md)。
2. 需要由线生成管廊面，先看 [02-线廊.md](./02-线廊.md)。
3. 需要测量线长或线内里程，先看 [03-线测量.md](./03-线测量.md)。
4. 需要根据多条业务线找交点，先看 [04-交点计算.md](./04-交点计算.md)。
5. 需要把预览要素关联回正式 source/feature，先看 [05-来源引用.md](./05-来源引用.md)。

## 使用边界

- 几何工具只处理 GeoJSON 数据和来源引用，不直接操作地图图层。
- 运行时写回 source、更新图层、调用插件，应交给 `useBusinessMap()` 或业务 source 注册表。
- 线延长、线廊和线测量当前以 `LineString` 为主；`MultiLineString` 需要业务层先拆分。
- 交点计算会忽略无法收敛成单点的重合线段，这与当前源码实现一致。

