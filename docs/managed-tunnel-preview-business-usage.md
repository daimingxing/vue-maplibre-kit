# 线草稿预览插件接入说明

本文档保留原文件路径，但内容已经切换为新的公共库接入方式。

## 核心结论

- 旧的 `managedTunnelPreview` 扩展已经被新的 `lineDraftPreview` 插件取代。
- 地图容器不再接收 `extensions`，改为接收 `plugins`。
- 页面不再通过 `mapInitRef.value.extensions.xxx` 访问插件，而是统一通过插件宿主查询：
  `mapInitRef.value?.plugins?.getApi(pluginId)`

## 推荐接入方式

```ts
import { createLineDraftPreviewPlugin } from 'vue-maplibre-kit/plugins/line-draft-preview';

const lineDraftPreviewPlugin = createLineDraftPreviewPlugin({
  enabled: true,
  inheritInteractiveFromLayerId: 'lineLayer',
});

const mapPlugins = [lineDraftPreviewPlugin];
```

```vue
<map-libre-init :plugins="mapPlugins" @pluginStateChange="handlePluginStateChange" />
```

## 为什么改成插件宿主查询

- 避免核心容器暴露写死字段，降低与内置插件实现的耦合。
- 方便未来新增第三方插件，而不需要继续修改 `mapLibreInit` 的公开类型。
- 让开源库的公共 API 更稳定，业务页面只需要依赖“插件 ID + 插件契约”。

## 示例参考

完整接入示例请直接参考：

- [src/views/NG/GI/NGGI00.vue](../src/views/NG/GI/NGGI00.vue)
