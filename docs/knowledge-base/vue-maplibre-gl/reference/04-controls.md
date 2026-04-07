# 控件体系

## 位置体系
控件位置基于 Position 枚举：
- top-left
- top-right
- bottom-left
- bottom-right

## 控件清单
- MglNavigationControl：缩放与罗盘控件
- MglFullscreenControl：全屏控件
- MglGeolocationControl：定位控件
- MglScaleControl：比例尺控件
- MglAttributionControl：归属信息控件
- MglFrameRateControl：帧率控件
- MglCustomControl：自定义控件容器
- MglStyleSwitchControl：样式切换控件

## 典型参数
- MglNavigationControl：showCompass、showZoom、visualizePitch
- MglFullscreenControl：container
- MglGeolocationControl：positionOptions、fitBoundsOptions、trackUserLocation
- MglScaleControl：maxWidth、unit
- MglAttributionControl：compact、customAttribution
- MglFrameRateControl：background、barWidth、color、font、graphWidth 等
- MglCustomControl：noClasses
- MglStyleSwitchControl：mapStyles、modelValue、isOpen

## 样式切换控件要点
MglStyleSwitchControl 接收 mapStyles 列表，切换时触发 styleSwitched 事件并调用 map.setStyle。

## 示例
```vue
<template>
  <mgl-map :center="[121.47, 31.23]" :zoom="11">
    <mgl-navigation-control position="top-right" />
    <mgl-scale-control position="bottom-left" unit="metric" />
  </mgl-map>
</template>
```
