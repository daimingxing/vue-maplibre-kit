# layers 命令

`businessMap.layers` 负责运行时 source/layer 操作。它适合临时图层、调试图层、点击后的显隐和 feature-state 写入。

## 查询

```ts
const hasSource = businessMap.layers.hasSource('runtime-source');
const hasLayer = businessMap.layers.hasLayer('runtime-layer');
```

## 添加 GeoJSON source

```ts
/**
 * 添加运行时 GeoJSON source。
 * @param businessMap useBusinessMap 返回结果
 */
export function addRuntimeSource(businessMap) {
  const result = businessMap.layers.addGeoJsonSource('runtime-source', {
    type: 'FeatureCollection',
    features: [],
  });

  return result.success;
}
```

返回结果结构：

```ts
{
  success: boolean;
  message: string;
}
```

## 添加图层

```ts
/**
 * 添加运行时线图层。
 * @param businessMap useBusinessMap 返回结果
 */
export function addRuntimeLayer(businessMap) {
  if (!businessMap.layers.hasSource('runtime-source')) {
    return false;
  }

  const result = businessMap.layers.addLayer({
    id: 'runtime-line-layer',
    type: 'line',
    source: 'runtime-source',
    paint: {
      'line-color': '#1677ff',
      'line-width': 3,
    },
  });

  return result.success;
}
```

`addLayer()` 会校验 `id`、`type`、非 background 图层的 `source`，并避免重复添加。

## 移除顺序

MapLibre 原生要求先移除 layer，再移除 source。

```ts
/**
 * 清理运行时图层和 source。
 * @param businessMap useBusinessMap 返回结果
 */
export function removeRuntimeLayer(businessMap) {
  if (businessMap.layers.hasLayer('runtime-line-layer')) {
    businessMap.layers.removeLayer('runtime-line-layer');
  }

  if (businessMap.layers.hasSource('runtime-source')) {
    businessMap.layers.removeSource('runtime-source');
  }
}
```

## 显隐和样式

```ts
businessMap.layers.show('runtime-line-layer');
businessMap.layers.hide('runtime-line-layer');
businessMap.layers.setVisible('runtime-line-layer', true);

businessMap.layers.setPaint('runtime-line-layer', {
  'line-color': '#ff4d4f',
  'line-width': 5,
});

businessMap.layers.setLayout('runtime-line-layer', {
  visibility: 'visible',
});
```

## feature-state

```ts
/**
 * 写入要素选中态。
 * @param businessMap useBusinessMap 返回结果
 * @param featureId 要素 ID
 */
export function markFeatureSelected(businessMap, featureId: string | number) {
  return businessMap.layers.setFeatureState('pipe-source', featureId, {
    selected: true,
  });
}
```

`setFeatureState()` 最终调用 `MapLibreInitExpose.setMapFeatureState()`，目标要素需要有可用的原生顶层 ID。

## 边界

- 地图未就绪时动作会返回失败结果。
- `setPaint()` 和 `setLayout()` 是运行时改动，图层被声明式重建后可能被覆盖。
- 持久业务图层优先用 `MapBusinessSourceLayers` 声明，不建议长期依赖运行时 `addLayer()`。
