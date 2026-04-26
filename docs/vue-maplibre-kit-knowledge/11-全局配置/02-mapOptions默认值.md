# mapOptions 默认值

mapOptions 对应 MapLibre 初始化参数，类型是：

`	s
type MapKitGlobalMapOptions = Partial<MapOptions & { mapStyle: string | object }>;
`

mapStyle 是本库封装层常用的底图样式入口；style 仍可作为 MapLibre 原生字段使用。

> 下面代码块里的字段，就是当前全局配置允许写的 `mapOptions` 字段。

```ts
mapOptions: {
  // --- 样式与容器 ---
  // mapStyle: 'https://demotiles.maplibre.org/style.json', // 推荐优先使用的底图样式入口
  // style: 'https://demotiles.maplibre.org/style.json', // MapLibre 原生 style 入口
  // hash: false, // 是否把地图视角同步到 URL hash；也可以传字符串作为 hash 参数名
  // container: 'map', // 地图容器；本项目不建议业务层配置，容器由封装层统一管理

  // --- 地图初始视图 ---
  // center: [113.943, 22.548], // 初始中心点
  // elevation: 0, // 初始中心点高程
  // zoom: 8, // 初始缩放级别
  // bearing: 0, // 初始旋转角
  // pitch: 0, // 初始倾斜角
  // roll: 0, // 初始翻滚角
  // bounds: [[113.8, 22.1], [114.8, 22.9]], // 初始边界框；设置后会覆盖 center 和 zoom
  // fitBoundsOptions: {
  //   // 这里透传 MapLibre 的 FitBoundsOptions
  // },
  // maxBounds: [[113.5, 21.9], [115.0, 23.2]], // 限制地图可平移范围

  // --- 缩放与视角限制 ---
  // minZoom: 0, // 最小缩放级别
  // maxZoom: 22, // 最大缩放级别
  // minPitch: 0, // 最小倾斜角
  // maxPitch: 60, // 最大倾斜角
  // bearingSnap: 7, // 接近正北时自动回正的角度阈值
  // zoomSnap: 0, // 缩放吸附步进；0 表示连续缩放
  // centerClampedToGround: true, // 是否自动把中心点钳制到地表
  // aroundCenter: false, // 旋转交互是否采用围绕中心轨道旋转模型

  // --- 交互控制 ---
  // interactive: true, // 是否启用鼠标、触摸、键盘交互
  // scrollZoom: true, // 是否启用滚轮缩放；也可以传 { around: 'center' }
  // boxZoom: true, // 是否启用框选缩放；也可以传 { boxZoomEnd: (...) => void }
  // dragRotate: true, // 是否启用拖拽旋转
  // dragPan: true, // 是否启用拖拽平移；也可以传对象覆写惯性参数
  // keyboard: true, // 是否启用键盘交互
  // doubleClickZoom: true, // 是否启用双击缩放
  // touchZoomRotate: true, // 是否启用双指缩放与旋转；也可以传 { around: 'center' }
  // touchPitch: true, // 是否启用双指倾斜；也可以传 { around: 'center' }
  // cooperativeGestures: false, // 是否启用协作式手势
  // trackResize: true, // 窗口尺寸变化时是否自动 resize
  // clickTolerance: 3, // 点击判定像素容差
  // pitchWithRotate: true, // 旋转时是否允许联动 pitch
  // rollEnabled: false, // 旋转时是否允许联动 roll
  // reduceMotion: false, // 是否减少交互惯性与动画

  // --- 渲染与表现 ---
  // canvasContextAttributes: {
  //   alpha: true, // 是否创建带透明通道的画布
  //   antialias: false, // 是否启用抗锯齿
  //   depth: true, // 是否启用深度缓冲
  //   desynchronized: false, // 是否偏向更低延迟渲染
  //   failIfMajorPerformanceCaveat: false, // 遇到重大性能风险时是否拒绝创建上下文
  //   powerPreference: 'high-performance', // WebGL 功耗偏好
  //   premultipliedAlpha: true, // 是否使用预乘透明度
  //   preserveDrawingBuffer: false, // 是否保留绘制缓冲区内容
  //   stencil: false, // 是否启用模板缓冲
  //   xrCompatible: false, // 是否以 XR 兼容方式创建上下文
  //   contextType: 'webgl2', // 强制指定 WebGL 版本
  // },
  // refreshExpiredTiles: true, // 过期瓦片是否自动重新请求
  // anisotropicFilterPitch: 20, // 栅格图层启用各向异性过滤的 pitch 阈值
  // renderWorldCopies: false, // 缩小时是否渲染多个世界副本
  // maxTileCacheSize: null, // 单个 source 最大瓦片缓存数
  // maxTileCacheZoomLevels: 5, // 动态瓦片缓存允许覆盖的 zoom 层级范围
  // fadeDuration: 300, // symbol 碰撞后的淡入淡出时长
  // crossSourceCollisions: true, // 不同 source 的 symbol 是否跨源参与碰撞检测
  // collectResourceTiming: false, // 是否采集 Resource Timing
  // localIdeographFontFamily: 'sans-serif', // 中日韩本地字形字体覆盖
  // pixelRatio: window.devicePixelRatio, // 画布像素比
  // validateStyle: true, // 是否开启样式校验
  // maxCanvasSize: [4096, 4096], // 画布最大尺寸
  // cancelPendingTileRequestsWhileZooming: true, // 缩放时是否取消旧层级未完成瓦片请求
  // experimentalZoomLevelsToOverscale: undefined, // 允许 overscale 的层级数

  // --- UI 与回调 ---
  // attributionControl: false, // 是否自动添加版权控件；也可以传对象覆写 compact / customAttribution
  // maplibreLogo: true, // 是否显示 MapLibre Logo
  // logoPosition: 'bottom-left', // Logo 位置
  // locale: {
  //   // 这里透传 MapLibre 的 locale 文案补丁对象
  // },
  // transformRequest: (url, resourceType) => {
  //   return { url };
  // }, // 统一请求改写钩子
  // transformCameraUpdate: (next) => {
  //   return { zoom: next.zoom };
  // }, // 相机更新前统一改写钩子
  // transformConstrain: (lngLat, zoom) => {
  //   return { center: lngLat, zoom };
  // }, // 地图约束逻辑覆盖钩子
},
```

### 5.1 `mapOptions` 合并语义

`mapOptions` 是 MapLibre 初始化参数，采用“顶层字段合并，同名字段后者覆盖前者”的策略：

```txt
库内内置 mapOptions
-> 全局 mapOptions
-> 页面 mapOptions
```

如果顶层字段本身是对象，页面一旦配置该字段，就表示当前页面接管这个对象字段，不会继续和全局对象做深度合并。

例如全局配置了：

```ts
mapOptions: {
  attributionControl: {
    compact: true,
    customAttribution: '© Your Company',
  },
}
```

页面配置了：

```ts
mapOptions: {
  attributionControl: {
    compact: false,
  },
}
```

最终 `attributionControl` 只会保留页面传入的对象：

```ts
{
  attributionControl: {
    compact: false,
  },
}
```

这种行为是刻意保持的初始化参数语义：基础字段可以逐项覆盖，对象型初始化参数由页面显式接管；未配置的顶层字段继续回落到全局默认、库内默认或 MapLibre 原生默认。

### 5.2 `mapOptions` 里对象型字段的可配置子项

```ts
mapOptions: {
  attributionControl: {
    // compact: true, // 是否强制使用紧凑版权控件
    // customAttribution: '© Your Company', // 追加自定义版权文案
  },

  scrollZoom: {
    // around: 'center', // 缩放围绕地图中心发生
  },

  boxZoom: {
    // boxZoomEnd: (map, startPos, endPos, originalEvent) => {}, // 自定义框选结束处理逻辑
  },

  dragPan: {
    // linearity: 0, // 拖拽惯性线性系数
    // easing: (t) => t, // 平移惯性 easing
    // deceleration: 1400, // 惯性减速度
    // maxSpeed: 2500, // 最大惯性速度
  },

  touchZoomRotate: {
    // around: 'center', // 双指缩放围绕中心发生
  },

  touchPitch: {
    // around: 'center', // 倾斜交互围绕中心处理
  },
},
```

---

