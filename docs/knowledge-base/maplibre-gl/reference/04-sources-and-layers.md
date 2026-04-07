# 数据源与图层

## 基本模式
在地图加载完成后，先添加数据源，再添加图层：
- map.addSource(id, source)
- map.addLayer(layer, beforeId?)

## GeoJSON 数据源与图层示例
```ts
/** 添加 GeoJSON 数据源与填充图层 */
function addGeoJsonLayer(map: maplibregl.Map) {
  map.addSource('geojson-source', {
    type: 'geojson',
    data: 'data.geojson'
  })

  map.addLayer({
    id: 'geojson-layer',
    type: 'fill',
    source: 'geojson-source',
    paint: {
      'fill-color': '#0080ff',
      'fill-opacity': 0.5
    }
  })
}

map.on('load', () => addGeoJsonLayer(map))
```

## 插入到指定图层之前
```ts
/** 在首个 symbol 图层之前插入填充图层 */
function addLayerBelowLabels(map: maplibregl.Map) {
  const layers = map.getStyle().layers || []
  const firstSymbol = layers.find((layer) => layer.type === 'symbol')
  const beforeId = firstSymbol?.id

  map.addSource('urban-areas', {
    type: 'geojson',
    data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_urban_areas.geojson'
  })

  map.addLayer(
    {
      id: 'urban-areas-fill',
      type: 'fill',
      source: 'urban-areas',
      paint: { 'fill-color': '#f08', 'fill-opacity': 0.4 }
    },
    beforeId
  )
}
```
