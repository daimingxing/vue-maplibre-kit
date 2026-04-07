# 地图初始化与 MapOptions

## 关键选项
- container：容器 ID 或 DOM 元素
- style：样式 URL 或样式对象
- center：初始中心点 [lng, lat]
- zoom：初始缩放级别
- bearing、pitch：地图朝向与俯仰角

## 初始化示例
```ts
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/** 创建并返回地图实例 */
function createMap(containerId: string) {
  return new maplibregl.Map({
    container: containerId,
    style: 'https://demotiles.maplibre.org/style.json',
    center: [0, 0],
    zoom: 2
  })
}

const map = createMap('map')
```

## 生命周期关键点
- 地图样式加载完毕后再添加数据源与图层，常用事件为 load 或 style.load
