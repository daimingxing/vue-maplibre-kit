# 标记与按钮组件

## MglMarker
用于在地图上创建标记点，内部基于 MapLibre Marker。

### 关键属性
- coordinates：必填，经纬度坐标
- offset：偏移
- anchor：锚点
- color：颜色
- clickTolerance、rotation、rotationAlignment、pitchAlignment、scale

### 示例
```vue
<template>
  <mgl-map :center="[121.47, 31.23]" :zoom="12">
    <mgl-marker :coordinates="[121.47, 31.23]" color="#ef4444" />
  </mgl-map>
</template>
```

## MglButton
提供控件内按钮渲染能力，常用于样式切换控件的按钮自定义。

### 关键属性
- type：default、text、mdi、simple-icons
- path：图标路径
- size、viewbox
