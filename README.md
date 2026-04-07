# vue-maplibre-kit

一个基于 Vue 3、MapLibre GL 与 TerraDraw 的 WebGIS 能力库。

当前版本采用“核心宿主 + 显式导入插件”的结构：

- 核心入口只负责地图容器、交互托管、绘制与测量控件整合。
- 官方能力以子路径插件形式提供，例如吸附插件、线草稿预览插件。
- 通用几何能力通过 `geometry` 子路径单独导出，避免业务语义直接进入公共 API。

## 安装

```bash
npm install vue-maplibre-kit
```

## 公共入口

```ts
import { MapLibreInit, type MapLibreInitExpose } from 'vue-maplibre-kit';
import { createMapFeatureSnapPlugin } from 'vue-maplibre-kit/plugins/map-feature-snap';
import {
  createLineDraftPreviewPlugin,
  type LineDraftPreviewPluginApi,
} from 'vue-maplibre-kit/plugins/line-draft-preview';
import { MapLineExtensionTool, MapLineCorridorTool } from 'vue-maplibre-kit/geometry';
```

## 接入方式

```vue
<template>
  <map-libre-init
    ref="mapInitRef"
    :mapOptions="mapOptions"
    :controls="mapControls"
    :mapInteractive="mapInteractive"
    :plugins="mapPlugins"
    @pluginStateChange="handlePluginStateChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MapLibreInit, type MapLibreInitExpose } from 'vue-maplibre-kit';
import { createMapFeatureSnapPlugin } from 'vue-maplibre-kit/plugins/map-feature-snap';
import {
  createLineDraftPreviewPlugin,
  LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  type LineDraftPreviewPluginApi,
} from 'vue-maplibre-kit/plugins/line-draft-preview';
import type { MapPluginStateChangePayload } from 'vue-maplibre-kit';

const mapInitRef = ref<MapLibreInitExpose | null>(null);

const mapFeatureSnapPlugin = createMapFeatureSnapPlugin({
  enabled: true,
  ordinaryLayers: {
    rules: [
      {
        id: 'demo-line-snap',
        layerIds: ['lineLayer'],
        snapTo: ['vertex', 'segment'],
      },
    ],
  },
});

const lineDraftPreviewPlugin = createLineDraftPreviewPlugin({
  enabled: true,
  inheritInteractiveFromLayerId: 'lineLayer',
});

const mapPlugins = [mapFeatureSnapPlugin, lineDraftPreviewPlugin];

/**
 * 通过插件宿主读取线草稿插件 API。
 * 业务层不再访问固定字段，而是通过插件 ID 查询对应 API。
 * @returns 当前线草稿插件 API；未初始化时返回 null
 */
function getLineDraftPreviewApi(): LineDraftPreviewPluginApi | null {
  return (
    mapInitRef.value?.plugins?.getApi<LineDraftPreviewPluginApi>(lineDraftPreviewPlugin.id) || null
  );
}

/**
 * 统一处理插件状态变化。
 * @param payload 插件状态变化载荷
 */
function handlePluginStateChange(payload: MapPluginStateChangePayload): void {
  if (payload.pluginType !== LINE_DRAFT_PREVIEW_PLUGIN_TYPE) {
    return;
  }

  console.log('lineDraftPreview state', payload.state);
}
</script>
```

## 设计约定

- `plugins` 按声明顺序执行，渲染顺序与交互补丁覆盖顺序也按该顺序处理。
- `mapInitRef.value.plugins` 只提供查询接口：
  `has(pluginId)`
  `getApi(pluginId)`
  `getState(pluginId)`
  `list()`
- “按需加载”的实现方式是“显式导入插件 + 子路径导出 + tree-shaking”，而不是按字符串名动态注册。

## 官方子路径

- `vue-maplibre-kit`
  核心地图容器、插件契约、宿主查询接口、基础类型
- `vue-maplibre-kit/plugins/map-feature-snap`
  普通图层吸附预览与 TerraDraw / Measure 吸附桥接
- `vue-maplibre-kit/plugins/line-draft-preview`
  线草稿与线廊草稿管理、渲染、交互继承
- `vue-maplibre-kit/geometry`
  线延长、线廊生成、来源引用等中立几何工具

## 示例

完整示例请参考：

- [src/views/NG/GI/NGGI00.vue](./src/views/NG/GI/NGGI00.vue)

该示例展示了以下内容：

- 显式导入并注册插件
- 通过宿主读取插件 API
- 正式业务数据与临时草稿数据分流
- 普通图层交互、吸附、线草稿和 TerraDraw 的协同方式

## 许可证

[MIT](./LICENSE)
