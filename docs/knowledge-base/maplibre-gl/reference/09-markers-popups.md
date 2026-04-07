# 标记与弹窗

## Marker
用于在地图上添加点位标记。

## Popup
用于在地图上展示富文本信息窗体。

## 示例
```ts
/** 创建标记并添加到地图 */
function addMarker(map: maplibregl.Map, lng: number, lat: number) {
  return new maplibregl.Marker({ color: '#ef4444' })
    .setLngLat([lng, lat])
    .addTo(map)
}

/** 创建弹窗并添加到地图 */
function addPopup(map: maplibregl.Map, lng: number, lat: number, html: string) {
  return new maplibregl.Popup({ offset: 25 })
    .setLngLat([lng, lat])
    .setHTML(html)
    .addTo(map)
}
```
