# rawHandles

`MapLibreInit` 的公开实例提供 `rawHandles`。它是访问底层地图、宿主实例和 TerraDraw 控件的统一逃生入口。

## 结构

```ts
interface MapLibreRawHandles {
  readonly map: MapLibreRawMap;
  readonly mapInstance: MapInstance;
  readonly drawControl: MaplibreTerradrawControl | null;
  readonly measureControl: MaplibreMeasureControl | null;
}
```

## 获取方式

```ts
import { ref, onMounted } from 'vue';
import type { MapLibreInitExpose } from 'vue-maplibre-kit/business';

const mapRef = ref<MapLibreInitExpose | null>(null);

/**
 * 读取底层 MapLibre 地图实例。
 * @returns 原生地图实例；地图未就绪时返回 null
 */
function getRawMap() {
  return mapRef.value?.rawHandles?.map || null;
}

onMounted(() => {
  const rawMap = getRawMap();
  if (!rawMap) {
    return;
  }
});
```

## 生命周期注意

- 地图未挂载时，`map` 可能不可用。
- 控件未启用时，`drawControl` 和 `measureControl` 为 `null`。
- 操作 source/layer 前，需要确认地图 style 已加载。
- 绑定原生事件后，需要在组件卸载时解绑。

## style 已加载检查

```ts
/**
 * 在地图样式加载完成后执行动作。
 * @param map 原生 MapLibre 地图实例
 * @param action 需要执行的动作
 */
export function runOnLoad(map, action: () => void): void {
  if (map.isStyleLoaded?.()) {
    action();
    return;
  }

  map.once('load', action);
}
```

## 事件解绑

```ts
import { onBeforeUnmount } from 'vue';

/**
 * 绑定并自动解绑地图点击事件。
 * @param map 原生 MapLibre 地图实例
 */
export function bindRawClick(map): void {
  /**
   * 处理地图点击事件。
   * @param event MapLibre 点击事件
   */
  function handleClick(event): void {
    console.log(event.lngLat);
  }

  map.on('click', handleClick);

  onBeforeUnmount(() => {
    map.off('click', handleClick);
  });
}
```

## 与公开门面的关系

`rawHandles.map` 能做的很多事情，`businessMap.layers` 已经提供了安全包装。优先使用公开门面，只有缺少对应 API 时再下探。
