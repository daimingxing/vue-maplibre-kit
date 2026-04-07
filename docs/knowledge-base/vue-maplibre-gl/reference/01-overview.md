# 概览与能力边界

## 定位
@razorness/vue-maplibre-gl 是面向 Vue 3 的 MapLibre GL JS 组件封装，提供地图、控件、数据源、图层、标记等声明式组件，并支持 TypeScript。

## 核心特性
- 支持 MapLibre GL JS v3.x
- 组件化封装地图、控件、数据源、图层、标记
- 样式切换控件，切换时自动重载数据源与图层
- 支持多实例与全局访问 useMap
- 提供帧率控件
- WebGL 上下文丢失时自动重建

## 适用场景
- Vue 3 项目中需要可声明式管理地图与图层
- 需要对数据源与图层进行细粒度组件化控制
- 需要多地图实例并共享访问入口

## 能力边界
- 组件行为以 MapLibre GL JS 能力为基础，复杂渲染与交互仍需理解 MapLibre 原生 API
- 事件体系与属性映射遵循 MapLibre 事件与规范命名
