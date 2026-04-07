# 与 vue-maplibre-gl 协同

## 场景
当 vue-maplibre-gl 的组件封装无法满足需求时，可以直接调用 MapLibre GL JS 原生 API。

## 访问 Map 实例
vue-maplibre-gl 提供 useMap 获取实例信息，常用于获取 map 对象并调用原生 API。

```ts
import { useMap } from 'vue-maplibre-gl'

/** 获取 map 实例并执行原生调用 */
function useNativeMapApi() {
  const mapInstance = useMap('main-map')
  const map = mapInstance.map
  if (map) {
    map.setStyle('https://demotiles.maplibre.org/style.json')
  }
}
```

## 典型补充能力
- 自定义图层：custom layer 或外部 WebGL 绘制
- 复杂交互：自定义事件逻辑与查询策略
- 深度控制样式：表达式、过滤器与动态属性更新
