# 事件与要素查询

## 事件绑定
使用 map.on 绑定事件，常见事件包括 load、click、mousemove、moveend 等。

## queryRenderedFeatures 示例
```ts
/** 监听鼠标移动并查询当前像素下的要素 */
function bindFeatureQuery(map: maplibregl.Map, outputId: string) {
  map.on('mousemove', (e) => {
    const features = map.queryRenderedFeatures(e.point)
    const displayProperties = ['type', 'properties', 'id', 'layer', 'source', 'sourceLayer', 'state']
    const displayFeatures = features.map((feat) => {
      const displayFeat: Record<string, unknown> = {}
      displayProperties.forEach((prop) => {
        displayFeat[prop] = (feat as any)[prop]
      })
      return displayFeat
    })
    const el = document.getElementById(outputId)
    if (el) {
      el.innerHTML = JSON.stringify(displayFeatures, null, 2)
    }
  })
}
```

## 关键点
- queryRenderedFeatures 以屏幕像素位置为输入
- 输出通常用于悬浮提示、交互高亮与数据联动
