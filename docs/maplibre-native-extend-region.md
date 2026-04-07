# 基于公共几何工具生成线廊

本文档保留原文件路径，但示例能力已迁移为中立命名：

- `MapTunnelLineExtensionTool` -> `MapLineExtensionTool`
- `MapTunnelRegionTool` -> `MapLineCorridorTool`

## 推荐导入方式

```ts
import { MapLineExtensionTool, MapLineCorridorTool } from 'vue-maplibre-kit/geometry';
```

## 适用场景

- 页面想自行管理临时 GeoJSON source / layer，不依赖官方线草稿插件
- 需要直接复用线延长与线廊生成算法
- 需要在不同业务场景下自定义草稿生命周期

## 说明

如果你的页面只是需要标准的“临时线草稿 + 线廊草稿”能力，优先使用官方插件：

```ts
import { createLineDraftPreviewPlugin } from 'vue-maplibre-kit/plugins/line-draft-preview';
```

如果你需要完全自管数据源和图层，再直接使用 `geometry` 子路径中的工具类。
