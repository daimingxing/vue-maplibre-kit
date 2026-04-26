# MapLibreInit

适合谁读：需要理解地图根组件职责和公开实例的开发者。

先读哪篇：[02-mapOptions](./02-mapOptions.md)。

对应示例：[NGGI01](../../../examples/views/NG/GI/NGGI01.vue)、[NGGI02](../../../examples/views/NG/GI/NGGI02.vue)。

## 组件职责

`MapLibreInit` 是地图容器根组件，负责承载 MapLibre 地图、控件、业务数据插槽、普通图层交互和插件宿主。

常用 props：

| prop | 作用 |
| --- | --- |
| `mapKey` | 多地图实例隔离标识 |
| `mapOptions` | 地图初始化参数 |
| `controls` | 控件配置 |
| `mapInteractive` | 普通业务图层交互配置 |
| `plugins` | 插件描述数组 |

## dataSource 插槽

业务 source/layer 推荐放在 `dataSource` 插槽中。

```vue
<MapLibreInit ref="mapRef" :map-options="mapOptions" :controls="controls">
  <template #dataSource>
    <MapBusinessSourceLayers :source="source" :layers="layers" />
  </template>
</MapLibreInit>
```

## 公开实例

`ref` 暴露 `MapLibreInitExpose`。业务层优先把它传给 `useBusinessMap`。

```ts
import { shallowRef } from "vue";
import { type MapLibreInitExpose } from "vue-maplibre-kit/business";

const mapRef = shallowRef<MapLibreInitExpose | null>(null);
```

公开实例中包含选中要素、绘图要素、测量要素、`setMapFeatureState` 和插件宿主等能力。普通业务页面通常不需要逐个调用这些低层方法，而是使用聚合门面。
