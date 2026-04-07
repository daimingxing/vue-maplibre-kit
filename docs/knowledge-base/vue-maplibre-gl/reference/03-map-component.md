# 地图组件 MglMap

## 作用
MglMap 是地图容器组件，负责创建 MapLibre Map 实例并管理生命周期、事件绑定与响应式属性更新。

## 关键属性
- width、height：容器尺寸，默认 100%
- mapStyle：地图样式对象或样式 URL
- center、zoom、bearing、pitch、minZoom、maxZoom、maxBounds 等：对应 MapLibre MapOptions
- interactive、scrollZoom、dragPan、doubleClickZoom 等：交互控制
- language：地图语言设置
- mapKey：多实例注册键

## 行为与生命周期
- 挂载时创建 Map 实例并注入到子组件
- 通过 ResizeObserver 监听容器尺寸变化，自动 resize
- WebGL 上下文丢失时自动重建
- 对多项属性设置 watcher，变更时同步调用 Map 实例方法

## 示例
```vue
<template>
  <mgl-map
    :center="[121.47, 31.23]"
    :zoom="10"
    :mapStyle="styleUrl"
    height="500px"
  />
</template>

<script>
export default {
  data() {
    return {
      styleUrl: 'https://demotiles.maplibre.org/style.json'
    }
  }
}
</script>
```
