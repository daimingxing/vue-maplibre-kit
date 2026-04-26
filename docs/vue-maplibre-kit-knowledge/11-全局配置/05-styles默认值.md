# styles 默认值

> `styles.*` 只作用于样式工厂默认值路径。  
> 如果业务层直接传完整 `layer.style`，则视为页面完全接管，不会自动叠加全局 style。  
> `styles.*` 本质就是对应 `LayerSpecification` 的 `layout` / `paint` 局部默认值，下面保持“可直接复制进 `defineMapGlobalConfig`”的真实代码模板风格。

### 12.1 `styles.circle`

```ts
styles: {
  circle: {
    layout: {
      // 'circle-sort-key': 0, // 点要素绘制排序值
      // visibility: 'visible', // 图层显隐
    },
    paint: {
      // 'circle-radius': 6, // 圆点半径
      // 'circle-radius-transition': { duration: 300, delay: 0 }, // radius 过渡配置
      // 'circle-color': '#1677ff', // 圆点颜色
      // 'circle-color-transition': { duration: 300, delay: 0 }, // color 过渡配置
      // 'circle-blur': 0, // 圆点模糊程度
      // 'circle-blur-transition': { duration: 300, delay: 0 }, // blur 过渡配置
      // 'circle-opacity': 1, // 圆点透明度
      // 'circle-opacity-transition': { duration: 300, delay: 0 }, // opacity 过渡配置
      // 'circle-translate': [0, 0], // 圆点屏幕空间偏移量
      // 'circle-translate-transition': { duration: 300, delay: 0 }, // translate 过渡配置
      // 'circle-translate-anchor': 'map', // translate 参考系
      // 'circle-pitch-scale': 'map', // 地图倾斜时圆点缩放参考
      // 'circle-pitch-alignment': 'viewport', // 地图倾斜时圆点对齐平面
      // 'circle-stroke-width': 2, // 圆点描边宽度
      // 'circle-stroke-width-transition': { duration: 300, delay: 0 }, // stroke-width 过渡配置
      // 'circle-stroke-color': '#ffffff', // 圆点描边颜色
      // 'circle-stroke-color-transition': { duration: 300, delay: 0 }, // stroke-color 过渡配置
      // 'circle-stroke-opacity': 1, // 圆点描边透明度
      // 'circle-stroke-opacity-transition': { duration: 300, delay: 0 }, // stroke-opacity 过渡配置
    },
  },
},
```

### 12.2 `styles.line`

```ts
styles: {
  line: {
    layout: {
      // 'line-cap': 'round', // 线端点样式
      // 'line-join': 'round', // 线拐角样式
      // 'line-miter-limit': 2, // miter 拐角回退阈值
      // 'line-round-limit': 1.05, // round 拐角回退阈值
      // 'line-sort-key': 0, // 线要素绘制排序值
      // visibility: 'visible', // 图层显隐
    },
    paint: {
      // 'line-opacity': 1, // 线透明度
      // 'line-opacity-transition': { duration: 300, delay: 0 }, // opacity 过渡配置
      // 'line-color': '#1677ff', // 线颜色
      // 'line-color-transition': { duration: 300, delay: 0 }, // color 过渡配置
      // 'line-translate': [0, 0], // 线屏幕空间偏移量
      // 'line-translate-transition': { duration: 300, delay: 0 }, // translate 过渡配置
      // 'line-translate-anchor': 'map', // translate 参考系
      // 'line-width': 3, // 线宽
      // 'line-width-transition': { duration: 300, delay: 0 }, // width 过渡配置
      // 'line-gap-width': 0, // 线内部间隙宽度
      // 'line-gap-width-transition': { duration: 300, delay: 0 }, // gap-width 过渡配置
      // 'line-offset': 0, // 线相对原始几何偏移量
      // 'line-offset-transition': { duration: 300, delay: 0 }, // offset 过渡配置
      // 'line-blur': 0, // 线模糊程度
      // 'line-blur-transition': { duration: 300, delay: 0 }, // blur 过渡配置
      // 'line-dasharray': [2, 2], // 虚线样式数组
      // 'line-dasharray-transition': { duration: 300, delay: 0 }, // dasharray 过渡配置
      // 'line-pattern': 'pattern-name', // 线纹理图案名称
      // 'line-pattern-transition': { duration: 300, delay: 0 }, // pattern 过渡配置
      // 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#1677ff', 1, '#ff4d4f'], // 沿线渐变色
    },
  },
},
```

### 12.3 `styles.fill`

```ts
styles: {
  fill: {
    layout: {
      // 'fill-sort-key': 0, // 面要素绘制排序值
      // visibility: 'visible', // 图层显隐
    },
    paint: {
      // 'fill-antialias': true, // 是否启用填充边缘抗锯齿
      // 'fill-opacity': 0.35, // 面透明度
      // 'fill-opacity-transition': { duration: 300, delay: 0 }, // opacity 过渡配置
      // 'fill-color': '#1677ff', // 面填充色
      // 'fill-color-transition': { duration: 300, delay: 0 }, // color 过渡配置
      // 'fill-outline-color': '#ffffff', // 面描边色
      // 'fill-outline-color-transition': { duration: 300, delay: 0 }, // outline-color 过渡配置
      // 'fill-translate': [0, 0], // 面屏幕空间偏移量
      // 'fill-translate-transition': { duration: 300, delay: 0 }, // translate 过渡配置
      // 'fill-translate-anchor': 'map', // translate 参考系
      // 'fill-pattern': 'pattern-name', // 面纹理图案名称
      // 'fill-pattern-transition': { duration: 300, delay: 0 }, // pattern 过渡配置
    },
  },
},
```

### 12.4 `styles.symbol`

```ts
styles: {
  symbol: {
    layout: {
      // 'symbol-placement': 'point', // 标注放置模式
      // 'symbol-spacing': 250, // 线标注重复间距
      // 'symbol-avoid-edges': false, // 是否尽量避开瓦片边缘
      // 'icon-image': 'marker-icon', // 图标名称
      // 'icon-size': 1, // 图标缩放比例
      // 'icon-rotate': 0, // 图标旋转角度
      // 'icon-anchor': 'center', // 图标锚点
      // 'icon-allow-overlap': false, // 图标是否允许重叠
      // 'text-field': ['get', 'name'], // 文本内容
      // 'text-font': ['Noto Sans Regular'], // 文字字体栈
      // 'text-size': 12, // 文字字号
      // 'text-offset': [0, 1.2], // 文字偏移
      // 'text-anchor': 'top', // 文字锚点
      // 'text-allow-overlap': false, // 文字是否允许重叠
      // visibility: 'visible', // 图层显隐
    },
    paint: {
      // 'icon-opacity': 1, // 图标透明度
      // 'icon-opacity-transition': { duration: 300, delay: 0 }, // icon-opacity 过渡配置
      // 'icon-color': '#1677ff', // 图标着色
      // 'icon-color-transition': { duration: 300, delay: 0 }, // icon-color 过渡配置
      // 'icon-halo-color': '#ffffff', // 图标光晕颜色
      // 'icon-halo-width': 1, // 图标光晕宽度
      // 'text-opacity': 1, // 文字透明度
      // 'text-opacity-transition': { duration: 300, delay: 0 }, // text-opacity 过渡配置
      // 'text-color': '#1f1f1f', // 文字颜色
      // 'text-color-transition': { duration: 300, delay: 0 }, // text-color 过渡配置
      // 'text-halo-color': '#ffffff', // 文字描边色
      // 'text-halo-width': 1.5, // 文字描边宽度
      // 'text-halo-blur': 0, // 文字描边模糊程度
      // 'text-translate': [0, 0], // 文字屏幕空间偏移量
      // 'text-translate-anchor': 'map', // text-translate 参考系
    },
  },
},
```

---

### 12.5 `styles.raster`

```ts
styles: {
  raster: {
    layout: {
      // visibility: 'visible', // 图层显隐
    },
    paint: {
      // 'raster-opacity': 1, // 栅格透明度
      // 'raster-opacity-transition': { duration: 300, delay: 0 }, // opacity 过渡配置
      // 'raster-hue-rotate': 0, // 栅格色相旋转角度
      // 'raster-hue-rotate-transition': { duration: 300, delay: 0 }, // hue-rotate 过渡配置
      // 'raster-brightness-min': 0, // 栅格最小亮度
      // 'raster-brightness-min-transition': { duration: 300, delay: 0 }, // brightness-min 过渡配置
      // 'raster-brightness-max': 1, // 栅格最大亮度
      // 'raster-brightness-max-transition': { duration: 300, delay: 0 }, // brightness-max 过渡配置
      // 'raster-saturation': 0, // 栅格饱和度
      // 'raster-saturation-transition': { duration: 300, delay: 0 }, // saturation 过渡配置
      // 'raster-contrast': 0, // 栅格对比度
      // 'raster-contrast-transition': { duration: 300, delay: 0 }, // contrast 过渡配置
      // 'raster-resampling': 'linear', // 重采样方式：linear / nearest
      // 'raster-fade-duration': 300, // 栅格切片淡入淡出时长
    },
  },
},
```

---

