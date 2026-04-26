# geometry API

适合：查 `vue-maplibre-kit/geometry` 导出的开发者。

先读：[几何工具](../10-几何工具/index.md)。

源码来源：`src/entries/geometry.ts`。

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `MapLineExtensionTool` | 类 | 线延长、线段方向推算 |
| `MapLineCorridorTool` | 类 | 按线生成线廊面 |
| `MapLineMeasureTool` | 类 | 整线和线内区间测量 |
| `collectLineIntersections` | 函数 | 收集业务线交点 |
| `buildIntersectionCandidates` | 函数 | 构造交点候选线 |
| `buildIntersectionPointFeature` | 函数 | 构造交点点要素 |
| `buildMaterializedIntersectionFeature` | 函数 | 构造正式交点要素 |
| `createMapSourceFeatureRef` | 函数 | 构造来源引用 |
| `buildMapSourceFeatureRefKey` | 函数 | 构造来源引用键 |
| `buildManagedPreviewOriginProperties` | 函数 | 构造托管预览来源属性 |
| `extractManagedPreviewOriginFromProperties` | 函数 | 从属性还原来源引用 |

## 常用类型

| 类型 | 用途 |
| --- | --- |
| `MapCommonFeature` | 通用 GeoJSON 要素 |
| `MapCommonFeatureCollection` | 通用 FeatureCollection |
| `MapCommonLineFeature` | 通用线要素 |
| `MapCommonPolygonFeature` | 通用面要素 |
| `MapCommonProperties` | 通用 properties |
| `MapSourceFeatureRef` | sourceId + featureId 来源引用 |
| `MapIntersectionPoint` | 交点领域对象 |
| `MapIntersectionCandidate` | 求交候选线 |
