# business 业务入口

适合：编写真实业务地图页面的开发者。

先读：[最小地图](../00-开始使用/02-最小地图.md)。

对应示例：`NGGI00`、`NGGI01`、`NGGI02`、`NGGI03`、`NGGI04`、`NGGI05`。

## 定位

`vue-maplibre-kit/business` 是业务页面的首选入口。它把地图组件、业务 source、业务图层、属性编辑、弹窗、样式、表达式和 `useBusinessMap()` 收口在一个路径里。

## 推荐导入

```ts
import {
  MapLibreInit,
  MapBusinessSourceLayers,
  MglPopup,
  useBusinessMap,
  createMapBusinessSource,
  createLineBusinessLayer,
  createSimpleLineStyle,
} from "vue-maplibre-kit/business";
```

## 高频能力

| 导出 | 用途 |
| --- | --- |
| `MapLibreInit` | 挂载地图 |
| `MapBusinessSourceLayers` | 声明式渲染业务 source 和图层 |
| `MglPopup` | 展示点击要素属性，支持 `options` 运行时更新 |
| `MglCustomControl` | 挂自定义地图控件 |
| `useBusinessMap` | 统一读取 source、selection、feature、layers、editor、effect、plugins |
| `useMapLayerActions` | 单独使用图层命令式动作 |
| `useMapPopupState` | 管理弹窗状态 |
| `createMapBusinessSource` | 创建单个业务 source |
| `createMapBusinessSourceRegistry` | 管理多个业务 source |
| `create*BusinessLayer` | 创建业务图层描述 |
| `createSimple*Style` | 快速创建常用样式 |
| `createLayerGroup` | 批量创建业务图层 |

## `createBusinessPlugins` 的位置

`business` 入口保留 `createBusinessPlugins` 作为兼容导出，但新业务页面推荐从 `plugins` 入口引入：

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";
```

## 插件读取

不要分别记多个插件 composable。业务页面统一从 `useBusinessMap().plugins.*` 读取：

```ts
const businessMap = useBusinessMap({
  mapRef: () => mapRef.value,
  sourceRegistry: registry,
});

businessMap.plugins.snap.clearPreview();
businessMap.plugins.lineDraft.clear();
businessMap.plugins.intersection.refresh();
businessMap.plugins.polygonEdge.clear();
businessMap.plugins.multiSelect.toggle();
businessMap.plugins.dxfExport.downloadDxf();
```
