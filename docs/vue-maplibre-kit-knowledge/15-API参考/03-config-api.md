# config API

适合：查 `vue-maplibre-kit/config` 导出的开发者。

先读：[全局配置](../11-全局配置/index.md)。

源码来源：`src/entries/config.ts`。

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `defineMapGlobalConfig` | 函数 | 定义全局配置，提供类型辅助 |
| `setMapGlobalConfig` | 函数 | 注册全局配置快照 |
| `getMapGlobalConfig` | 函数 | 读取当前全局配置 |
| `resetMapGlobalConfig` | 函数 | 清空全局配置 |
| `MapKitGlobalConfig` | 类型 | 全局配置总结构 |
| `MapKitGlobalMapOptions` | 类型 | 地图初始化默认值 |
| `MapKitGlobalControls` | 类型 | 地图控件默认值 |
| `MapFeatureSnapGlobalDefaults` | 类型 | snap 全局默认值 |
| `LineDraftPreviewGlobalDefaults` | 类型 | lineDraft 全局默认值 |
| `IntersectionPreviewGlobalDefaults` | 类型 | intersection 全局默认值 |
| `MapFeatureMultiSelectGlobalDefaults` | 类型 | multiSelect 全局默认值 |
| `MapDxfExportGlobalDefaults` | 类型 | dxfExport 全局默认值 |

## `MapKitGlobalConfig`

```ts
interface MapKitGlobalConfig {
  mapOptions?: MapKitGlobalMapOptions;
  mapControls?: MapKitGlobalControls;
  plugins?: {
    snap?: MapFeatureSnapGlobalDefaults;
    lineDraft?: LineDraftPreviewGlobalDefaults;
    intersection?: IntersectionPreviewGlobalDefaults;
    multiSelect?: MapFeatureMultiSelectGlobalDefaults;
    dxfExport?: MapDxfExportGlobalDefaults;
  };
  styles?: {
    circle?: MapCircleLayerStyleDefaults;
    line?: MapLineLayerStyleDefaults;
    fill?: MapFillLayerStyleDefaults;
    symbol?: MapSymbolLayerStyleDefaults;
    raster?: MapRasterLayerStyleDefaults;
  };
}
```
