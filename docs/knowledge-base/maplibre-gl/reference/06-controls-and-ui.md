# 控件与 UI

## 常用控件
- NavigationControl
- ScaleControl
- FullscreenControl
- GeolocateControl
- AttributionControl
- GlobeControl

## 添加控件示例
```ts
/** 添加基础控件 */
function addBasicControls(map: maplibregl.Map) {
  map.addControl(new maplibregl.NavigationControl(), 'top-right')
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left')
}
```

## 地球投影控件示例
```ts
/** 启用地球投影与控件 */
function enableGlobe(map: maplibregl.Map) {
  map.addControl(new maplibregl.GlobeControl(), 'top-right')
  map.on('style.load', () => {
    map.setProjection({ type: 'globe' })
  })
}
```

## 移除控件
```ts
/** 移除控件 */
function removeControl(map: maplibregl.Map, control: maplibregl.IControl) {
  map.removeControl(control)
}
```
