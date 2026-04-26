# MapLibre 原生能力

当需要直接调用 MapLibre GL JS 原生 API 时，可以通过 `mapRef.value.rawHandles.map` 获取原生地图实例。

## 参考资料

- `docs/knowledge-base/maplibre-gl/reference/04-sources-and-layers.md`
- `docs/knowledge-base/maplibre-gl/reference/07-events-and-query.md`
- `docs/knowledge-base/vue-maplibre-gl/reference/03-map-component.md`
- `docs/knowledge-base/vue-maplibre-gl/reference/05-sources-and-layers.md`

## source 和 layer

底层知识库说明了 MapLibre 的基本顺序：地图加载完成后，先 `addSource()`，再 `addLayer()`。

```ts
/**
 * 添加原生 GeoJSON source 和 line layer。
 * @param map 原生 MapLibre 地图实例
 */
export function addNativeLine(map): void {
  map.addSource('native-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
  });

  map.addLayer({
    id: 'native-line',
    type: 'line',
    source: 'native-source',
    paint: {
      'line-color': '#1677ff',
      'line-width': 3,
    },
  });
}
```

如果只做运行时 GeoJSON source/layer，优先用 `businessMap.layers.addGeoJsonSource()` 和 `businessMap.layers.addLayer()`。

## 要素查询

`queryRenderedFeatures()` 以屏幕像素位置为输入，适合做非常规命中分析。

```ts
/**
 * 查询鼠标位置下的渲染要素。
 * @param map 原生 MapLibre 地图实例
 */
export function bindNativeQuery(map): void {
  /**
   * 处理鼠标移动查询。
   * @param event MapLibre 鼠标事件
   */
  function handleMove(event): void {
    const features = map.queryRenderedFeatures(event.point);
    console.log(features);
  }

  map.on('mousemove', handleMove);
}
```

普通业务交互优先通过图层 `interactive` 回调和 `businessMap.feature.toBusinessContext()` 处理。

## vue-maplibre-gl 宿主

`rawHandles.mapInstance` 来自 `vue-maplibre-gl` 的地图宿主包装对象。底层知识库说明其负责创建 MapLibre Map 实例、生命周期、事件绑定和响应式属性更新。

只有需要读取宿主包装态或排查封装层生命周期时，才需要访问 `mapInstance`。

## 清理要求

- 手动添加的原生 layer/source，需要手动清理。
- 清理顺序为先 `removeLayer()`，再 `removeSource()`。
- 手动绑定的 `map.on()` 事件，需要对应 `map.off()`。
- 不要复用业务图层和插件图层的 ID，避免与声明式渲染冲突。

