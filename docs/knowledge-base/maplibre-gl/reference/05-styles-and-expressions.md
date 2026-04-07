# 样式与表达式

## 样式来源
- style URL：如官方示例 style.json 或 globe.json
- style 对象：直接传入 StyleSpecification

## 动态切换样式
```ts
/** 切换地图样式 */
function switchStyle(map: maplibregl.Map, styleUrl: string) {
  map.setStyle(styleUrl)
}
```

## 表达式使用示例
```ts
/** 添加填充拉伸图层并使用表达式 */
function addExtrusionLayer(map: maplibregl.Map) {
  map.addSource('extrude-polygons', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-120, 10], [120, 10], [120, -10], [-120, -10]]] },
          properties: { height: 150000, color: '#ff0044' }
        }
      ]
    }
  })

  map.addLayer({
    id: 'extrude-polygon-layer',
    type: 'fill-extrusion',
    source: 'extrude-polygons',
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-opacity': 1,
      'fill-extrusion-height': ['get', 'height']
    }
  })
}
```

## 关键点
- style.load 事件中再做依赖样式的操作
- 表达式可用于从 properties 动态取值
