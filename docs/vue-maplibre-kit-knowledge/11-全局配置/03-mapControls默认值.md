# mapControls 默认值

mapControls 对应 MapControlsConfig，用于给内置控件注册默认显示状态和参数。

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
    //   layout: {
    //     // 'text-size': 14, // 点测量标签字号
    //   },
    //   paint: {
    //     // 'text-color': '#1f1f1f', // 点测量标签文字颜色
    //   },
    // }, // 点测量标签样式片段，只允许覆写 layout / paint
    // lineLayerLabelSpec: {
    //   layout: {
    //     // 'text-size': 16, // 线测量标签字号
    //     // 'text-field': ['get', 'label'], // 线测量标签文本内容
    //   },
    //   paint: {
    //     // 'text-color': '#FF0000', // 线测量标签文字颜色
    //     // 'text-halo-color': '#FFFFFF', // 线测量标签描边颜色
    //     // 'text-halo-width': 2, // 线测量标签描边宽度
    //   },
    // }, // 线测量标签样式片段，只允许覆写 layout / paint
    // routingLineLayerNodeSpec: {
    //   layout: {
    //     // visibility: 'visible', // 测量线节点显隐
    //   },
    //   paint: {
    //     // 'circle-radius': 6, // 测量线节点半径
    //     // 'circle-color': '#1677ff', // 测量线节点颜色
    //   },
    // }, // 测量线节点样式片段，只允许覆写 layout / paint
    // polygonLayerSpec: {
    //   layout: {
    //     // 'text-size': 16, // 面测量标签字号
    //   },
    //   paint: {
    //     // 'text-color': '#1f1f1f', // 面测量标签文字颜色
    //   },
    // }, // 面测量标签样式片段，只允许覆写 layout / paint

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

补充说明：

- `pointLayerLabelSpec`、`lineLayerLabelSpec`、`routingLineLayerNodeSpec`、`polygonLayerSpec` 只允许配置 `layout` / `paint`。
- `id`、`type`、`source`、`filter` 等内部图层字段由库内默认配置固定维护，业务侧不能配置。
- 全局默认和页面实例配置会按 `layout` / `paint` 内部字段合并，页面字段优先，未配置字段回落到全局默认。
- `text-field` 这类 MapLibre 表达式数组按整体覆盖处理，不会按数组下标合并。

---

