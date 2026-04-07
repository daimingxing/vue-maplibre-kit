# 相机控制与状态

## 常用相机方法
- flyTo：带动画的飞行
- easeTo：平滑过渡
- fitBounds：自动适配边界
- setCenter、setZoom：快速设置状态

## 示例
```ts
/** 相机飞行到指定位置 */
function flyToLocation(map: maplibregl.Map, lng: number, lat: number) {
  map.flyTo({ center: [lng, lat], zoom: 12 })
}

/** 适配边界 */
function fitToBounds(map: maplibregl.Map, bounds: maplibregl.LngLatBoundsLike) {
  map.fitBounds(bounds, { padding: 20 })
}
```

## 状态读取
```ts
/** 获取当前相机状态 */
function getCameraState(map: maplibregl.Map) {
  return {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch()
  }
}
```
