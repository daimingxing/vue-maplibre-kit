# vue-maplibre-kit 全局配置说明

## 1. 这份文档的边界

这份文档只说明一件事：

- `vue-maplibre-kit/config` 里**真正允许写的全局配置项**

这份文档**不再展开**下面这类内容：

- 页面实例级配置
- 单次调用覆写
- 不适合进全局的业务绑定字段
- 外部库类型里与本项目封装边界无关的深层细节

判断标准只有一条：

- 如果这个字段能直接写进 `defineMapGlobalConfig({ ... })`，就写进文档
- 如果这个字段不应该由全局配置统一维护，就不写进文档

源码入口：

- [src/config.ts](../src/config.ts)
- [src/demo-map-global-config.ts](../src/demo-map-global-config.ts)
- [src/main.ts](../src/main.ts)

---

## 2. 真实项目中的用法

### 2.1 推荐目录

```txt
src/
  main.ts
  map-global-config.ts
```

### 2.2 推荐写法

`src/map-global-config.ts`

```ts
import { defineMapGlobalConfig, setMapGlobalConfig } from 'vue-maplibre-kit/config';

/**
 * 应用级地图全局默认配置。
 * 推荐把全局默认值集中写到这个文件里，再在 main.ts 启动阶段注册一次。
 */
export const mapGlobalConfig = defineMapGlobalConfig({
  mapOptions: {
    mapStyle: 'https://demotiles.maplibre.org/style.json',
    center: [113.943, 22.548],
    zoom: 8,
  },
  mapControls: {
    MglNavigationControl: {
      isUse: true,
      position: 'top-left',
      showCompass: true,
      showZoom: true,
    },
  },
  plugins: {
    multiSelect: {
      enabled: true,
      position: 'top-right',
    },
  },
  styles: {
    line: {
      paint: {
        'line-color': '#1677ff',
      },
    },
  },
});

/**
 * 注册地图全局默认配置。
 */
export function applyMapGlobalConfig(): void {
  setMapGlobalConfig(mapGlobalConfig);
}
```

`src/main.ts`

```ts
import { createApp } from 'vue';
import App from './App.vue';
import { applyMapGlobalConfig } from './map-global-config';

applyMapGlobalConfig();

createApp(App).mount('#app');
```

---

## 3. 全局配置优先级

全库统一优先级：

```txt
库内内置默认值
-> vue-maplibre-kit/config 全局默认值
-> 页面 / 实例配置
-> 单次调用覆写
```

当前设计目标就是：

- 全局配置负责“应用统一默认值”
- 页面配置负责“业务层局部覆写”

---

## 4. 当前支持的全局配置树

```ts
{
  mapOptions?: ...
  mapControls?: ...
  plugins?: {
    snap?: ...
    lineDraft?: ...
    multiSelect?: ...
    dxfExport?: ...
  }
  styles?: {
    circle?: ...
    line?: ...
    fill?: ...
    symbol?: ...
    raster?: ...
  }
}
```

一级入口只有这些：

| 一级入口 | 说明 |
| --- | --- |
| `config.mapOptions` | 地图初始化默认参数 |
| `config.mapControls` | 地图控件默认参数 |
| `config.plugins.snap` | 吸附插件默认参数 |
| `config.plugins.lineDraft` | 线草稿预览插件默认参数 |
| `config.plugins.multiSelect` | 多选插件默认参数 |
| `config.plugins.dxfExport` | DXF 导出插件默认参数 |
| `config.styles.circle` | 点图层样式工厂默认值 |
| `config.styles.line` | 线图层样式工厂默认值 |
| `config.styles.fill` | 面图层样式工厂默认值 |
| `config.styles.symbol` | 符号图层样式工厂默认值 |
| `config.styles.raster` | 栅格图层样式工厂默认值 |

---

## 5. `mapOptions` 全局配置项

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

### 5.1 `mapOptions` 里对象型字段的可配置子项

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

## 6. `mapControls` 全局配置项

> 下面写的都是当前全局配置允许写的控件项。

### 6.1 `MglNavigationControl`

```ts
mapControls: {
  // 导航控件：提供缩放按钮和罗盘(指南针)
  MglNavigationControl: {
    // isUse: true, // 是否显示导航控件
    // position: 'top-right', // 控件位置
    // showCompass: true, // 是否显示指南针按钮
    // showZoom: true, // 是否显示缩放按钮
    // visualizePitch: true, // 指南针是否会根据地图倾斜角产生视觉变化
  },
},
```

### 6.2 `MglFullscreenControl`

```ts
mapControls: {
  // 全屏控件：允许用户将地图放大到全屏
  MglFullscreenControl: {
    // isUse: true, // 是否显示全屏控件
    // position: 'bottom-left', // 控件位置
    // container: null, // 指定全屏容器；null 时一般全屏整个页面
  },
},
```

### 6.3 `MglGeolocationControl`

```ts
mapControls: {
  // 定位控件：获取并跟踪用户当前位置
  MglGeolocationControl: {
    // isUse: true, // 是否显示定位控件
    // position: 'top-right', // 控件位置
    // positionOptions: {
    //   enableHighAccuracy: true, // 是否尽量使用高精度定位
    //   maximumAge: 0, // 可接受的缓存定位结果最大年龄
    //   timeout: 6000, // 定位超时时间
    // },
    // fitBoundsOptions: {
    //   // 这里透传 MapLibre 的 FitBoundsOptions
    // },
    // trackUserLocation: true, // 是否持续跟踪用户位置
    // showAccuracyCircle: true, // 是否显示定位精度圆
    // showUserLocation: true, // 是否显示用户位置点
  },
},
```

### 6.4 `MglScaleControl`

```ts
mapControls: {
  // 比例尺控件：显示当前地图比例尺
  MglScaleControl: {
    // isUse: true, // 是否显示比例尺控件
    // position: 'bottom-left', // 控件位置
    // maxWidth: 120, // 比例尺最大像素宽度
    // unit: 'metric', // 单位体系：imperial / metric / nautical
  },
},
```

### 6.5 `MglAttributionControl`

```ts
mapControls: {
  // 版权控件：显示地图数据来源和版权信息
  MglAttributionControl: {
    // isUse: true, // 是否显示版权控件
    // position: 'bottom-right', // 控件位置
    // compact: false, // 是否使用紧凑模式
    // customAttribution: '© MapLibre Contributors', // 追加自定义版权文案
  },
},
```

### 6.6 `MglFrameRateControl`

```ts
mapControls: {
  // 帧率控件：开发调试时显示地图 FPS
  MglFrameRateControl: {
    // isUse: false, // 是否显示 FPS 控件
    // position: 'bottom-left', // 控件位置
    // background: 'rgba(0, 0, 0, 0.8)', // 背景色
    // barWidth: 4, // 柱状图宽度
    // color: '#7FFF00', // 文本和图表颜色
    // font: '10px/1.2 monospace', // 字体
    // graphHeight: 20, // 图表高度
    // graphWidth: 60, // 图表宽度
    // graphTop: 0, // 图表距顶部偏移
    // graphRight: 0, // 图表距右侧偏移
    // width: 70, // 控件整体宽度
  },
},
```

### 6.7 `MglStyleSwitchControl`

```ts
mapControls: {
  // 样式切换控件：允许用户在不同底图样式之间切换
  MglStyleSwitchControl: {
    // isUse: true, // 是否显示样式切换控件
    // position: 'bottom-right', // 控件位置
    // mapStyles: [
    //   {
    //     title: 'Demo Tiles', // 面板显示名称
    //     uri: 'https://demotiles.maplibre.org/style.json', // 样式 URL 或样式 JSON
    //   },
    // ], // 可切换的底图样式列表
    // modelValue: {
    //   title: 'Demo Tiles',
    //   uri: 'https://demotiles.maplibre.org/style.json',
    // }, // 当前选中的样式项
    // isOpen: false, // 面板是否默认展开
  },
},
```

### 6.8 `MglCustomControl`

```ts
mapControls: {
  // 自定义控件容器：给业务自定义控件预留挂载位
  MglCustomControl: {
    // isUse: true, // 是否启用自定义控件容器
    // position: 'top-right', // 控件位置
    // noClasses: false, // 是否移除默认控件容器 class
  },
},
```

### 6.9 `MaplibreTerradrawControl`

```ts
mapControls: {
  // 绘图控件：提供点、线、面等绘制工具
  MaplibreTerradrawControl: {
    // isUse: true, // 是否启用绘图控件
    // position: 'top-left', // 控件位置
    // modes: ['point', 'linestring', 'polygon', 'rectangle', 'circle', 'freehand'], // 工具栏模式列表
    // open: false, // 工具栏是否默认展开
    // showDeleteConfirmation: true, // 删除前是否弹确认框

    // adapterOptions: {
    //   prefixId: 'td', // TerraDraw 运行时图层 / source 前缀
    //   renderBelowLayerId: 'business-layer-id', // 把 TerraDraw 图层插到指定图层下方
    //   coordinatePrecision: 9, // 坐标保留精度
    //   minPixelDragDistance: 1, // 普通拖拽最小像素阈值
    //   minPixelDragDistanceSelecting: 1, // 选择场景拖拽阈值
    //   minPixelDragDistanceDrawing: 8, // 绘制场景拖拽阈值
    //   ignoreMismatchedPointerEvents: false, // 是否忽略不匹配的 pointer 事件
    // },

    // modeOptions: {
    //   point: {}, // 点模式配置或模式实例
    //   marker: {}, // 标记点模式配置或模式实例
    //   linestring: {}, // 线模式配置或模式实例
    //   polygon: {}, // 面模式配置或模式实例
    //   rectangle: {}, // 矩形模式配置或模式实例
    //   circle: {}, // 圆模式配置或模式实例
    //   freehand: {}, // 自由绘面模式配置或模式实例
    //   'freehand-linestring': {}, // 自由绘线模式配置或模式实例
    //   'angled-rectangle': {}, // 斜矩形模式配置或模式实例
    //   sensor: {}, // 传感器模式配置或模式实例
    //   sector: {}, // 扇形模式配置或模式实例
    //   select: {}, // 选择模式配置或模式实例
    // },

    // snapping: {
    //   enabled: true, // 是否启用吸附
    //   tolerancePx: 12, // 吸附容差像素值
    //   useNative: true, // 是否启用 TerraDraw 原生吸附
    //   useMapTargets: true, // 是否启用普通图层吸附候选
    // },

    // lineDecoration: {
    //   enabled: true, // 是否启用线装饰
    //   defaultStyle: {
    //     mode: 'symbol-repeat', // 装饰模式
    //     svg: '<svg></svg>', // SVG 来源
    //     spacing: 32, // 重复图标间距
    //     size: 1, // 图标缩放比例
    //     lineWidth: 4, // 装饰线宽
    //     opacity: 1, // 透明度
    //     iconRotate: 0, // 图标旋转角度
    //     keepUpright: true, // 图标是否保持朝上
    //   },
    //   resolveStyle: (context) => {
    //     return null;
    //   }, // 按单条线动态决定装饰样式
    // },

    // interactive: {
    //   enabled: true, // 是否启用业务交互封装
    //   cursor: 'pointer', // hover 要素时的鼠标样式
    //   onReady: (context) => {}, // 交互管理器初始化完成回调
    //   onModeChange: (context) => {}, // 模式切换回调
    //   onFeatureFinish: (context) => {}, // 绘制 / 编辑完成回调
    //   onFeatureChange: (context) => {}, // 几何 / 属性变化回调
    //   onFeatureSelect: (context) => {}, // 要素选中回调
    //   onFeatureDeselect: (context) => {}, // 要素取消选中回调
    //   onFeatureDelete: (context) => {}, // 要素删除回调
    //   onHoverEnter: (context) => {}, // 鼠标移入要素回调
    //   onHoverLeave: (context) => {}, // 鼠标移出要素回调
    //   onClick: (context) => {}, // 单击要素回调
    //   onDoubleClick: (context) => {}, // 双击要素回调
    //   onContextMenu: (context) => {}, // 右键要素回调
    //   onBlankClick: (context) => {}, // 点击空白处回调
    // },

    // propertyPolicy: {
    //   fixedKeys: ['id'], // 稳定字段：默认可见、可改、不可删
    //   hiddenKeys: ['_hidden'], // 默认隐藏字段
    //   readonlyKeys: ['createdAt'], // 只读字段
    //   removableKeys: ['remark'], // 从稳定字段里额外放开的允许删除字段
    //   rules: {
    //     status: {
    //       visible: true, // 当前字段是否可见
    //       editable: false, // 当前字段是否可编辑
    //       removable: false, // 当前字段是否可删除
    //     },
    //   },
    // },
  },
},
```

### 6.10 `MaplibreMeasureControl`

```ts
mapControls: {
  // 测量控件：提供测点、测线、测面等能力
  MaplibreMeasureControl: {
    // isUse: true, // 是否启用测量控件
    // position: 'top-right', // 控件位置
    // modes: ['point', 'linestring', 'polygon', 'circle', 'freehand', 'freehand-polygon'], // 工具栏模式列表
    // open: false, // 工具栏是否默认展开
    // showDeleteConfirmation: true, // 删除前是否弹确认框

    // pointLayerLabelSpec: {
    //   // 这里写完整的 SymbolLayerSpecification
    //   // 可参考下文 styles.symbol 的 layout / paint 字段
    // },
    // lineLayerLabelSpec: {
    //   // 这里写完整的 SymbolLayerSpecification
    //   // 可参考下文 styles.symbol 的 layout / paint 字段
    // },
    // routingLineLayerNodeSpec: {
    //   // 这里写完整的 CircleLayerSpecification
    //   // 可参考下文 styles.circle 的 layout / paint 字段
    // },
    // polygonLayerSpec: {
    //   // 这里写完整的 SymbolLayerSpecification
    //   // 可参考下文 styles.symbol 的 layout / paint 字段
    // },

    // measureUnitType: 'metric', // 单位体系：metric / imperial
    // distancePrecision: 2, // 距离结果保留小数位
    // distanceUnit: 'meter', // 距离单位；也可以传自定义换算回调
    // areaPrecision: 2, // 面积结果保留小数位
    // areaUnit: 'square meters', // 面积单位；也可以传自定义换算回调
    // measureUnitSymbols: {
    //   kilometer: 'km',
    //   meter: 'm',
    //   centimeter: 'cm',
    //   mile: 'mi',
    //   foot: 'ft',
    //   inch: 'in',
    //   'square meters': 'm²',
    //   'square kilometers': 'km²',
    //   ares: 'a',
    //   hectares: 'ha',
    //   'square feet': 'ft²',
    //   'square yards': 'yd²',
    //   acres: 'ac',
    //   'square miles': 'mi²',
    // }, // 单位符号映射
    // computeElevation: false, // 是否结合地形计算真实 3D 距离
    // terrainSource: 'terrain-source-id', // DEM source ID
    // elevationCacheConfig: {
    //   enabled: true, // 是否启用高程缓存
    //   maxSize: 500, // 最大缓存条目数
    //   ttl: 60000, // 缓存过期时间
    //   precision: 6, // 缓存坐标精度
    // },
    // textFont: ['Noto Sans Regular'], // 测量文字字体栈

    // adapterOptions: {
    //   prefixId: 'td-measure',
    //   renderBelowLayerId: 'business-layer-id',
    //   coordinatePrecision: 9,
    //   minPixelDragDistance: 1,
    //   minPixelDragDistanceSelecting: 1,
    //   minPixelDragDistanceDrawing: 8,
    //   ignoreMismatchedPointerEvents: false,
    // }, // 字段和 MaplibreTerradrawControl.adapterOptions 一致

    // modeOptions: {
    //   point: {},
    //   marker: {},
    //   linestring: {},
    //   polygon: {},
    //   rectangle: {},
    //   circle: {},
    //   freehand: {},
    //   'freehand-linestring': {},
    //   'angled-rectangle': {},
    //   sensor: {},
    //   sector: {},
    //   select: {},
    // }, // 字段和 MaplibreTerradrawControl.modeOptions 一致

    // snapping: {
    //   enabled: true,
    //   tolerancePx: 12,
    //   useNative: true,
    //   useMapTargets: true,
    // }, // 字段和 MaplibreTerradrawControl.snapping 一致

    // lineDecoration: {
    //   enabled: true,
    //   defaultStyle: {
    //     mode: 'symbol-repeat',
    //     svg: '<svg></svg>',
    //     spacing: 32,
    //     size: 1,
    //     lineWidth: 4,
    //     opacity: 1,
    //     iconRotate: 0,
    //     keepUpright: true,
    //   },
    //   resolveStyle: (context) => {
    //     return null;
    //   },
    // }, // 字段和 MaplibreTerradrawControl.lineDecoration 一致

    // interactive: {
    //   enabled: true,
    //   cursor: 'pointer',
    //   onReady: (context) => {},
    //   onModeChange: (context) => {},
    //   onFeatureFinish: (context) => {},
    //   onFeatureChange: (context) => {},
    //   onFeatureSelect: (context) => {},
    //   onFeatureDeselect: (context) => {},
    //   onFeatureDelete: (context) => {},
    //   onHoverEnter: (context) => {},
    //   onHoverLeave: (context) => {},
    //   onClick: (context) => {},
    //   onDoubleClick: (context) => {},
    //   onContextMenu: (context) => {},
    //   onBlankClick: (context) => {},
    // }, // 字段和 MaplibreTerradrawControl.interactive 一致

    // propertyPolicy: {
    //   fixedKeys: ['id'],
    //   hiddenKeys: ['_hidden'],
    //   readonlyKeys: ['createdAt'],
    //   removableKeys: ['remark'],
    //   rules: {
    //     status: {
    //       visible: true,
    //       editable: false,
    //       removable: false,
    //     },
    //   },
    // }, // 字段和 MaplibreTerradrawControl.propertyPolicy 一致
  },
},
```

---

## 7. `plugins.snap` 全局配置项

```ts
plugins: {
  // 吸附插件：统一控制普通吸附和 TerraDraw 吸附默认值
  snap: {
    // defaultTolerancePx: 12, // 全局默认吸附容差像素

    // preview: {
    //   enabled: true, // 是否启用吸附预览
    //   pointColor: '#1677ff', // 吸附点颜色
    //   pointRadius: 6, // 吸附点半径
    //   lineColor: '#1677ff', // 命中线段高亮颜色
    //   lineWidth: 5, // 命中线段高亮宽度
    // },

    // terradraw: {
    //   defaults: {
    //     enabled: true, // Draw / Measure 共用默认吸附开关
    //     tolerancePx: 12, // Draw / Measure 共用默认吸附容差
    //     useNative: true, // 是否默认启用 TerraDraw 原生吸附
    //     useMapTargets: true, // 是否默认启用普通图层吸附候选
    //   },
    //   draw: {
    //     enabled: true,
    //     tolerancePx: 12,
    //     useNative: true,
    //     useMapTargets: true,
    //   }, // 绘图控件专属吸附默认值；也可以直接传 true / false
    //   measure: {
    //     enabled: true,
    //     tolerancePx: 12,
    //     useNative: true,
    //     useMapTargets: true,
    //   }, // 测量控件专属吸附默认值；也可以直接传 true / false
    // },
  },
},
```

---

## 8. `plugins.lineDraft` 全局配置项

```ts
config.plugins.lineDraft
```

类型来源：

- [src/config.ts](../src/config.ts)
- [src/MapLibre/plugins/line-draft-preview/types.ts](../src/MapLibre/plugins/line-draft-preview/types.ts)

### 8.2 参数表

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.plugins.lineDraft.styleOverrides.line.layout.*` | `LineLayer layout` | 线草稿线图层 layout 覆写；字段清单见本文 `11.2 styles.line.layout`。 |
| `config.plugins.lineDraft.styleOverrides.line.paint.*` | `LineLayer paint` | 线草稿线图层 paint 覆写；字段清单见本文 `11.2 styles.line.paint`。 |
| `config.plugins.lineDraft.styleOverrides.fill.layout.*` | `FillLayer layout` | 线廊草稿面图层 layout 覆写；字段清单见本文 `11.3 styles.fill.layout`。 |
| `config.plugins.lineDraft.styleOverrides.fill.paint.*` | `FillLayer paint` | 线廊草稿面图层 paint 覆写；字段清单见本文 `11.3 styles.fill.paint`。 |

### 8.3 明确不进全局的字段

| 字段 | 不进全局的原因 |
| --- | --- |
| `inheritInteractiveFromLayerId` | 它依赖页面正式业务图层 ID，属于实例绑定信息。 |

---

## 9. `plugins.multiSelect` 全局配置项

```ts
plugins: {
  // 多选插件：统一控制多选模式默认行为
  multiSelect: {
    // enabled: true, // 是否启用多选插件
    // position: 'top-right', // 多选控件位置
    // deactivateBehavior: 'retain', // 退出多选后是清空还是保留选中集：clear / retain
    // closeOnEscape: true, // 是否允许按 Esc 退出多选
  },
},
```

---

## 10. `plugins.dxfExport` 全局配置项

```ts
plugins: {
  // DXF 导出插件：统一控制 DXF 导出默认参数和按钮默认值
  dxfExport: {
    // defaults: {
    //   sourceIds: ['source-a', 'source-b'], // 默认导出的 sourceId 列表；不传表示导出全部
    //   fileName: 'map-export.dxf', // 默认导出文件名
    //   sourceCrs: 'EPSG:4326', // 默认源坐标系
    //   targetCrs: 'EPSG:3857', // 默认目标坐标系
    //   featureFilter: (feature, sourceId) => true, // 默认要素过滤器
    //   layerNameResolver: (feature, sourceId) => sourceId, // 默认 DXF 图层名解析器
    //   layerTrueColorResolver: (layerName, sourceId) => '#333333', // 默认图层级 TrueColor 解析器
    //   featureTrueColorResolver: (feature, sourceId, layerName) => '#FF0000', // 默认要素级 TrueColor 解析器
    //   lineWidth: 0.5, // 默认统一线宽
    //   pointMode: 'point', // 默认点导出模式：point / circle
    //   pointRadius: 1, // pointMode='circle' 时的默认圆半径
    // },

    // control: {
    //   enabled: true, // 是否渲染 DXF 内置导出按钮
    //   position: 'top-right', // 按钮默认位置
    //   label: '导出CAD', // 按钮默认文案
    // },
  },
},
```

### 10.1 关于 `DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS`

库内的：

- `lineWidth`
- `pointMode`
- `pointRadius`

都能通过全局配置覆盖，入口就是：

```ts
plugins: {
  dxfExport: {
    defaults: {
      lineWidth: 0.5,
      pointMode: 'circle',
      pointRadius: 2,
    },
  },
},
```

也就是说：

- **能全局配**
- **但应该通过 `vue-maplibre-kit/config` 配**
- **不是去改库里的 `defaults.ts`**

---

## 11. `styles` 全局配置项

> `styles.*` 只作用于样式工厂默认值路径。  
> 如果业务层直接传完整 `layer.style`，则视为页面完全接管，不会自动叠加全局 style。

### 11.1 `styles.circle`

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

### 11.2 `styles.line`

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

### 11.3 `styles.fill`

```ts
import { defineMapGlobalConfig, setMapGlobalConfig } from 'vue-maplibre-kit/config';

export function applyMapGlobalConfig(): void {
  setMapGlobalConfig(
    defineMapGlobalConfig({
      mapOptions: {
        mapStyle: 'https://your-style.json',
        center: [114.3, 22.5],
        zoom: 10,
        renderWorldCopies: false,
      },
      mapControls: {
        MglScaleControl: {
          isUse: true,
          position: 'bottom-left',
          unit: 'metric',
        },
        MaplibreMeasureControl: {
          isUse: true,
          position: 'top-right',
          measureUnitType: 'metric',
        },
      },
      plugins: {
        dxfExport: {
          defaults: {
            sourceCrs: 'EPSG:4326',
            targetCrs: 'EPSG:3857',
            pointMode: 'circle',
            pointRadius: 2,
          },
        },
      },
      styles: {
        line: {
          paint: {
            'line-color': '#1677ff',
          },
        },
      },
    })
  );
}
```

`src/main.ts`

```ts
import { createApp } from 'vue';
import App from './App.vue';
import { applyMapGlobalConfig } from './map-global-config';

applyMapGlobalConfig();

createApp(App).mount('#app');
```

---

## 13. 查找全局配置项时，看哪里

如果以后不想靠记忆找字段，只看这 3 个地方：

1. [src/config.ts](../src/config.ts)
   这是官方白名单，先确认某项能不能全局配。

2. [src/demo-map-global-config.ts](../src/demo-map-global-config.ts)
   这是 demo 里的真实示例，最适合直接照着抄。

3. 这份文档
   这份文档的目标就是把当前全局配置允许写的字段，按真实代码模板列出来。
