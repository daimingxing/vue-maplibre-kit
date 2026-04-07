# 性能与注意事项

## WebGL 上下文丢失
组件内部监听 webglcontextlost，在丢失时触发自动重建，适合移动端和后台切换场景。

## 样式切换
样式切换控件会触发 styleSwitched 事件并调用 map.setStyle，数据源与图层会重新注入。

## 数据源与图层的销毁
组件卸载时自动移除图层与数据源，避免残留。

## 尺寸变化
Map 容器使用 ResizeObserver 监听尺寸变化，自动调用 resize。

## TypeScript 使用
组件类型来自库的类型导出，mapStyle 允许 string 或 StyleSpecification。
