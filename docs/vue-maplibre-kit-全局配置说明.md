# vue-maplibre-kit 全局配置全量说明

## 1. 这份文档覆盖什么

这份文档只回答 `vue-maplibre-kit/config` 这一件事：

1. 现在到底有哪些**官方允许的全局可配置项**
2. 每个配置项的**入口路径**、**参数名**、**作用**分别是什么

如果某个字段**不在这份文档列出的配置树里**，那它就**不是当前版本官方支持的全局默认配置项**。

源码入口见：

- [src/config.ts](../src/config.ts)
- [src/demo-map-global-config.ts](../src/demo-map-global-config.ts)
- [src/main.ts](../src/main.ts)

---

## 2. 官方入口与真实项目接法

全局配置唯一官方入口是：

```ts
import { defineMapGlobalConfig, setMapGlobalConfig } from 'vue-maplibre-kit/config';
```

推荐真实项目这样接：

`src/map-global-config.ts`

```ts
import { defineMapGlobalConfig, setMapGlobalConfig } from 'vue-maplibre-kit/config';

export function applyMapGlobalConfig(): void {
  setMapGlobalConfig(
    defineMapGlobalConfig({
      // 在这里集中写应用级默认值
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

## 3. 生效优先级

全库统一优先级：

```txt
库内内置默认值
-> vue-maplibre-kit/config 全局默认值
-> 页面 / 实例级配置
-> 单次调用覆写
```

常见场景：

- 地图初始化：`库内 defaultOptions -> config.mapOptions -> props.mapOptions`
- 控件：`config.mapControls -> props.controls`
- 插件：`库内 fallback -> config.plugins.* -> 插件实例 options -> 单次调用 overrides`
- 样式工厂：`库内默认 style -> config.styles.* -> create*LayerStyle(overrides)`

---

## 4. 当前支持的全局配置树

源码定义见：[src/config.ts](../src/config.ts)

```ts
{
  mapOptions?: ...
  mapControls?: ...
  plugins?: {
    snap?: ...
    lineDraft?: ...
    intersection?: ...
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
| `config.plugins.intersection` | 交点预览插件默认参数 |
| `config.plugins.multiSelect` | 多选插件默认参数 |
| `config.plugins.dxfExport` | DXF 导出插件默认参数 |
| `config.styles.circle` | 点图层样式工厂默认值 |
| `config.styles.line` | 线图层样式工厂默认值 |
| `config.styles.fill` | 面图层样式工厂默认值 |
| `config.styles.symbol` | 符号图层样式工厂默认值 |
| `config.styles.raster` | 栅格图层样式工厂默认值 |

---

## 5. `mapOptions` 全量参数表

### 5.1 入口说明

入口路径：

```ts
config.mapOptions
```

类型来源：

```ts
type MapKitGlobalMapOptions = Partial<MapOptions & { mapStyle: string | object }>
```

说明：

- 绝大部分字段来自 `maplibre-gl` 的 `MapOptions`
- 额外补了一个 `mapStyle`，用于兼容 `vue-maplibre-gl` 风格入口
- 本库内部会兼容 `style` 与 `mapStyle`
- 推荐优先使用 `mapStyle`
- `container` 虽然在类型里存在，但本库场景下**不建议配置**，容器由 `MapLibreInit` 自己管理

### 5.2 顶层字段总表

#### 5.2.1 URL / 容器 / UI

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.hash` | `boolean \| string` | 是否把地图视角同步到 URL hash；传字符串时表示自定义 hash 参数名。 |
| `config.mapOptions.container` | `HTMLElement \| string` | 地图容器 DOM 或容器 ID。本库不建议配。 |
| `config.mapOptions.attributionControl` | `false \| object` | 是否启用内置版权控件；传对象时继续配置子项。 |
| `config.mapOptions.maplibreLogo` | `boolean` | 是否显示 MapLibre Logo。 |
| `config.mapOptions.logoPosition` | `top-left \| top-right \| bottom-left \| bottom-right` | Logo 位置。 |
| `config.mapOptions.locale` | `Record<string, string>` | UI 文案覆盖表。支持的 key 见下文 `5.6 locale 文案 key`。 |

#### 5.2.2 视角 / 相机 / 范围

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.center` | `LngLatLike` | 初始中心点。推荐用 `[lng, lat]` 或 `{ lng, lat }`。 |
| `config.mapOptions.elevation` | `number` | 初始中心点高程。 |
| `config.mapOptions.zoom` | `number` | 初始缩放级别。 |
| `config.mapOptions.bearing` | `number` | 初始旋转角。 |
| `config.mapOptions.pitch` | `number` | 初始倾斜角。 |
| `config.mapOptions.roll` | `number` | 初始翻滚角。 |
| `config.mapOptions.bounds` | `LngLatBoundsLike` | 初始边界框；设置后会覆盖 `center` 和 `zoom`。 |
| `config.mapOptions.fitBoundsOptions` | `FitBoundsOptions` | 初始化 `bounds` 拟合参数。子项见 `5.7`。 |
| `config.mapOptions.maxBounds` | `LngLatBoundsLike` | 限制地图可平移范围。 |
| `config.mapOptions.minZoom` | `number \| null` | 最小缩放级别。 |
| `config.mapOptions.maxZoom` | `number \| null` | 最大缩放级别。 |
| `config.mapOptions.minPitch` | `number \| null` | 最小倾斜角。 |
| `config.mapOptions.maxPitch` | `number \| null` | 最大倾斜角。 |
| `config.mapOptions.bearingSnap` | `number` | 接近正北时自动回正的角度阈值。 |
| `config.mapOptions.zoomSnap` | `number` | 缩放吸附步进；`0` 表示连续缩放。 |
| `config.mapOptions.centerClampedToGround` | `boolean` | 是否自动把中心点高程钳制到地表。 |
| `config.mapOptions.aroundCenter` | `boolean` | 旋转交互是否采用围绕中心轨道旋转模型。 |

#### 5.2.3 交互

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.interactive` | `boolean` | 是否启用鼠标、触摸、键盘交互。 |
| `config.mapOptions.scrollZoom` | `boolean \| AroundCenterOptions` | 是否启用滚轮缩放；对象子项见 `5.5.3`。 |
| `config.mapOptions.boxZoom` | `boolean \| BoxZoomHandlerOptions` | 是否启用框选缩放；对象子项见 `5.5.4`。 |
| `config.mapOptions.dragRotate` | `boolean` | 是否启用拖拽旋转。 |
| `config.mapOptions.dragPan` | `boolean \| DragPanOptions` | 是否启用拖拽平移；对象子项见 `5.5.5`。 |
| `config.mapOptions.keyboard` | `boolean` | 是否启用键盘交互。 |
| `config.mapOptions.doubleClickZoom` | `boolean` | 是否启用双击缩放。 |
| `config.mapOptions.touchZoomRotate` | `boolean \| AroundCenterOptions` | 是否启用双指缩放与旋转；对象子项见 `5.5.3`。 |
| `config.mapOptions.touchPitch` | `boolean \| AroundCenterOptions` | 是否启用双指倾斜；对象子项见 `5.5.3`。 |
| `config.mapOptions.cooperativeGestures` | `boolean` | 是否启用协作式手势。 |
| `config.mapOptions.trackResize` | `boolean` | 窗口尺寸变化时是否自动 resize。 |
| `config.mapOptions.clickTolerance` | `number` | 点击判定像素容差。 |
| `config.mapOptions.pitchWithRotate` | `boolean` | 旋转时是否允许联动 pitch。 |
| `config.mapOptions.rollEnabled` | `boolean` | 旋转时是否允许联动 roll。 |
| `config.mapOptions.reduceMotion` | `boolean` | 是否减少惯性和动画。 |

#### 5.2.4 渲染 / 性能 / 资源

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.canvasContextAttributes` | `WebGLContextAttributesWithType` | WebGL 上下文参数。子项见 `5.5.2`。 |
| `config.mapOptions.refreshExpiredTiles` | `boolean` | 过期瓦片是否自动重新请求。 |
| `config.mapOptions.anisotropicFilterPitch` | `number \| null` | 栅格图层启用各向异性过滤的 pitch 阈值。 |
| `config.mapOptions.renderWorldCopies` | `boolean` | 缩小时是否渲染多个世界副本。 |
| `config.mapOptions.maxTileCacheSize` | `number \| null` | 单个 source 最大瓦片缓存数。 |
| `config.mapOptions.maxTileCacheZoomLevels` | `number` | 动态瓦片缓存允许覆盖的 zoom 层级范围。 |
| `config.mapOptions.fadeDuration` | `number` | symbol 碰撞后的淡入淡出时长。 |
| `config.mapOptions.crossSourceCollisions` | `boolean` | 不同 source 的 symbol 是否跨源参与碰撞检测。 |
| `config.mapOptions.collectResourceTiming` | `boolean` | 是否采集 Resource Timing。 |
| `config.mapOptions.localIdeographFontFamily` | `string \| false` | 中日韩本地字形字体覆盖。 |
| `config.mapOptions.pixelRatio` | `number` | 画布像素比。 |
| `config.mapOptions.validateStyle` | `boolean` | 是否开启样式校验。 |
| `config.mapOptions.maxCanvasSize` | `[number, number]` | 画布最大尺寸，顺序为 `[maxWidth, maxHeight]`。 |
| `config.mapOptions.cancelPendingTileRequestsWhileZooming` | `boolean` | 缩放时是否取消旧层级未完成瓦片请求。 |
| `config.mapOptions.experimentalZoomLevelsToOverscale` | `number` | 允许 overscale 的层级数。 |

#### 5.2.5 样式 / 回调

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.style` | `string \| object` | MapLibre 原生 style 入口。 |
| `config.mapOptions.mapStyle` | `string \| object` | `vue-maplibre-gl` 风格底图入口，推荐优先使用。 |
| `config.mapOptions.transformRequest` | `RequestTransformFunction` | 统一请求改写钩子。签名和返回结构见 `5.7.3`。 |
| `config.mapOptions.transformCameraUpdate` | `CameraUpdateTransformFunction` | 相机更新前统一改写钩子。签名见 `5.7.4`。 |
| `config.mapOptions.transformConstrain` | `TransformConstrainFunction` | 地图约束逻辑覆盖钩子。签名见 `5.7.5`。 |

### 5.3 值格式补充

#### 5.3.1 `LngLatLike`

以下字段都可传 `LngLatLike`：

- `config.mapOptions.center`
- `config.mapOptions.transformCameraUpdate(next).center`
- `config.mapOptions.transformConstrain(...).center`

推荐写法：

| 可用格式 | 示例 |
| --- | --- |
| `[lng, lat]` | `[114.3, 22.5]` |
| `{ lng, lat }` | `{ lng: 114.3, lat: 22.5 }` |
| `{ lon, lat }` | `{ lon: 114.3, lat: 22.5 }` |

#### 5.3.2 `LngLatBoundsLike`

以下字段都可传 `LngLatBoundsLike`：

- `config.mapOptions.bounds`
- `config.mapOptions.maxBounds`

推荐写法：

| 可用格式 | 示例 |
| --- | --- |
| `[[west, south], [east, north]]` | `[[113.8, 22.1], [114.8, 22.9]]` |
| `[west, south, east, north]` | `[113.8, 22.1, 114.8, 22.9]` |

### 5.4 与 `NGGI00.vue` 的关系

你提到的页面参考见：

- [src/views/NG/GI/NGGI00.vue](../src/views/NG/GI/NGGI00.vue)

这个页面里的 `mapOptions` 注释更偏“业务常用项讲解”；这份文档则是把**所有当前可配字段**集中成查表。

### 5.5 `mapOptions` 对象型字段子项

#### 5.5.1 `config.mapOptions.attributionControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.attributionControl.compact` | `boolean` | 是否强制使用紧凑模式显示版权信息。 |
| `config.mapOptions.attributionControl.customAttribution` | `string \| string[]` | 追加自定义版权文案。 |

#### 5.5.2 `config.mapOptions.canvasContextAttributes`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.canvasContextAttributes.alpha` | `boolean` | 是否创建带透明通道的 WebGL 画布。 |
| `config.mapOptions.canvasContextAttributes.antialias` | `boolean` | 是否启用抗锯齿。 |
| `config.mapOptions.canvasContextAttributes.depth` | `boolean` | 是否启用深度缓冲。 |
| `config.mapOptions.canvasContextAttributes.desynchronized` | `boolean` | 是否偏向更低延迟渲染。 |
| `config.mapOptions.canvasContextAttributes.failIfMajorPerformanceCaveat` | `boolean` | 遇到重大性能风险时是否拒绝创建上下文。 |
| `config.mapOptions.canvasContextAttributes.powerPreference` | `default \| high-performance \| low-power` | WebGL 功耗偏好。 |
| `config.mapOptions.canvasContextAttributes.premultipliedAlpha` | `boolean` | 是否使用预乘透明度。 |
| `config.mapOptions.canvasContextAttributes.preserveDrawingBuffer` | `boolean` | 是否保留绘制缓冲区内容。 |
| `config.mapOptions.canvasContextAttributes.stencil` | `boolean` | 是否启用模板缓冲。 |
| `config.mapOptions.canvasContextAttributes.xrCompatible` | `boolean` | 是否以 XR 兼容方式创建上下文。 |
| `config.mapOptions.canvasContextAttributes.contextType` | `webgl2 \| webgl` | 强制指定 WebGL 版本。 |

#### 5.5.3 `config.mapOptions.scrollZoom` / `touchZoomRotate` / `touchPitch`

这 3 个字段传对象时，都支持同一组子项：

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.scrollZoom.around` | `center` | 让缩放围绕地图中心发生。 |
| `config.mapOptions.touchZoomRotate.around` | `center` | 让双指缩放围绕地图中心发生。 |
| `config.mapOptions.touchPitch.around` | `center` | 让倾斜交互围绕地图中心处理。 |

#### 5.5.4 `config.mapOptions.boxZoom`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.boxZoom.boxZoomEnd` | `(map, startPos, endPos, originalEvent) => void` | 自定义框选结束后的处理逻辑；传了它就不走默认 fit-to-box 缩放。 |

#### 5.5.5 `config.mapOptions.dragPan`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapOptions.dragPan.linearity` | `number` | 拖拽惯性线性系数。 |
| `config.mapOptions.dragPan.easing` | `(t: number) => number` | 平移惯性 easing 函数。 |
| `config.mapOptions.dragPan.deceleration` | `number` | 惯性减速度。 |
| `config.mapOptions.dragPan.maxSpeed` | `number` | 最大惯性速度。 |

### 5.6 `config.mapOptions.locale` 支持的内置文案 key

当前 MapLibre 默认文案 key 包括：

| 参数路径 | 作用 |
| --- | --- |
| `config.mapOptions.locale.AttributionControl.ToggleAttribution` | 版权控件“展开/收起”提示文案。 |
| `config.mapOptions.locale.AttributionControl.MapFeedback` | 版权控件里的反馈文案。 |
| `config.mapOptions.locale.FullscreenControl.Enter` | 进入全屏提示文案。 |
| `config.mapOptions.locale.FullscreenControl.Exit` | 退出全屏提示文案。 |
| `config.mapOptions.locale.GeolocateControl.FindMyLocation` | 定位控件“定位我”文案。 |
| `config.mapOptions.locale.GeolocateControl.LocationNotAvailable` | 定位失败文案。 |
| `config.mapOptions.locale.LogoControl.Title` | Logo 提示文案。 |
| `config.mapOptions.locale.Map.Title` | 地图标题文案。 |
| `config.mapOptions.locale.Marker.Title` | Marker 标题文案。 |
| `config.mapOptions.locale.NavigationControl.ResetBearing` | 导航控件“回正北”文案。 |
| `config.mapOptions.locale.NavigationControl.ZoomIn` | 导航控件“放大”文案。 |
| `config.mapOptions.locale.NavigationControl.ZoomOut` | 导航控件“缩小”文案。 |
| `config.mapOptions.locale.Popup.Close` | 弹窗关闭文案。 |
| `config.mapOptions.locale.ScaleControl.Feet` | 比例尺英尺单位文案。 |
| `config.mapOptions.locale.ScaleControl.Meters` | 比例尺米单位文案。 |
| `config.mapOptions.locale.ScaleControl.Kilometers` | 比例尺千米单位文案。 |
| `config.mapOptions.locale.ScaleControl.Miles` | 比例尺英里单位文案。 |
| `config.mapOptions.locale.ScaleControl.NauticalMiles` | 比例尺海里单位文案。 |
| `config.mapOptions.locale.GlobeControl.Enable` | Globe 控件开启文案。 |
| `config.mapOptions.locale.GlobeControl.Disable` | Globe 控件关闭文案。 |
| `config.mapOptions.locale.TerrainControl.Enable` | Terrain 控件开启文案。 |
| `config.mapOptions.locale.TerrainControl.Disable` | Terrain 控件关闭文案。 |
| `config.mapOptions.locale.CooperativeGesturesHandler.WindowsHelpText` | Windows 协作式手势帮助文案。 |
| `config.mapOptions.locale.CooperativeGesturesHandler.MacHelpText` | Mac 协作式手势帮助文案。 |
| `config.mapOptions.locale.CooperativeGesturesHandler.MobileHelpText` | 移动端协作式手势帮助文案。 |

### 5.7 通用对象型参数补充

#### 5.7.1 `FitBoundsOptions`

以下字段都使用 `FitBoundsOptions`：

- `config.mapOptions.fitBoundsOptions`
- `config.mapControls.MglGeolocationControl.fitBoundsOptions`

字段如下：

| 参数路径模式 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `*.linear` | `boolean` | `true` 用 `easeTo`，`false` 用 `flyTo`。 |
| `*.offset` | `PointLike` | 相对中心点的像素偏移。 |
| `*.maxZoom` | `number` | 拟合边界时允许的最大缩放级别。 |
| `*.curve` | `number` | `flyTo` 路径曲线强度。 |
| `*.minZoom` | `number` | 飞行路径最高点 zoom。 |
| `*.speed` | `number` | 飞行动画平均速度。 |
| `*.screenSpeed` | `number` | 线性速度下的屏幕速度。 |
| `*.maxDuration` | `number` | 动画最大时长。 |
| `*.padding` | `number \| PaddingOptions` | 拟合边界内边距；子项见 `5.7.2`。 |
| `*.duration` | `number` | 动画时长。 |
| `*.easing` | `(t: number) => number` | 动画 easing。 |
| `*.animate` | `boolean` | 是否执行动画。 |
| `*.essential` | `boolean` | 是否视为重要动画。 |
| `*.freezeElevation` | `boolean` | 3D 场景下是否冻结相机海拔。 |
| `*.center` | `LngLatLike` | 动画目标中心点。 |
| `*.zoom` | `number` | 动画目标缩放级别。 |
| `*.bearing` | `number` | 动画目标旋转角。 |
| `*.pitch` | `number` | 动画目标倾斜角。 |
| `*.roll` | `number` | 动画目标翻滚角。 |
| `*.elevation` | `number` | 动画目标中心点高程。 |

#### 5.7.2 `PaddingOptions`

| 参数路径模式 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `*.padding.top` | `number` | 上内边距。 |
| `*.padding.right` | `number` | 右内边距。 |
| `*.padding.bottom` | `number` | 下内边距。 |
| `*.padding.left` | `number` | 左内边距。 |

#### 5.7.3 `transformRequest`

函数签名：

```ts
(url: string, resourceType?: ResourceType) => RequestParameters | Promise<RequestParameters> | undefined
```

返回对象可配置项：

| 参数路径模式 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `transformRequest(...).url` | `string` | 请求 URL。 |
| `transformRequest(...).headers` | `object` | 请求头。 |
| `transformRequest(...).method` | `GET \| POST \| PUT` | 请求方法。 |
| `transformRequest(...).body` | `string` | 请求体。 |
| `transformRequest(...).type` | `string \| json \| arrayBuffer \| image` | 响应体类型。 |
| `transformRequest(...).credentials` | `same-origin \| include` | 跨域请求凭证策略。 |
| `transformRequest(...).collectResourceTiming` | `boolean` | 是否为该请求采集 Resource Timing。 |
| `transformRequest(...).cache` | `RequestCache` | 浏览器缓存模式。 |
| `transformRequest(...).referrerPolicy` | `ReferrerPolicy` | 引用来源策略。 |

#### 5.7.4 `transformCameraUpdate`

函数签名：

```ts
(next: {
  center: LngLat
  zoom: number
  roll: number
  pitch: number
  bearing: number
  elevation: number
}) => {
  center?: LngLat
  zoom?: number
  roll?: number
  pitch?: number
  bearing?: number
  elevation?: number
}
```

含义：

| 参数路径模式 | 作用 |
| --- | --- |
| `transformCameraUpdate(next).next.center` | 当前将要写入的中心点。 |
| `transformCameraUpdate(next).next.zoom` | 当前将要写入的 zoom。 |
| `transformCameraUpdate(next).next.roll` | 当前将要写入的 roll。 |
| `transformCameraUpdate(next).next.pitch` | 当前将要写入的 pitch。 |
| `transformCameraUpdate(next).next.bearing` | 当前将要写入的 bearing。 |
| `transformCameraUpdate(next).next.elevation` | 当前将要写入的 elevation。 |
| `transformCameraUpdate(next).return.center` | 覆盖后的中心点。 |
| `transformCameraUpdate(next).return.zoom` | 覆盖后的 zoom。 |
| `transformCameraUpdate(next).return.roll` | 覆盖后的 roll。 |
| `transformCameraUpdate(next).return.pitch` | 覆盖后的 pitch。 |
| `transformCameraUpdate(next).return.bearing` | 覆盖后的 bearing。 |
| `transformCameraUpdate(next).return.elevation` | 覆盖后的 elevation。 |

#### 5.7.5 `transformConstrain`

函数签名：

```ts
(lngLat: LngLat, zoom: number) => {
  center: LngLat
  zoom: number
}
```

含义：

| 参数路径模式 | 作用 |
| --- | --- |
| `transformConstrain(lngLat, zoom).lngLat` | 当前候选中心点。 |
| `transformConstrain(lngLat, zoom).zoom` | 当前候选缩放级别。 |
| `transformConstrain(...).return.center` | 约束后的中心点。 |
| `transformConstrain(...).return.zoom` | 约束后的缩放级别。 |

---

## 6. `mapControls` 全量参数表

### 6.1 入口说明

入口路径：

```ts
config.mapControls
```

类型来源：

- [src/MapLibre/shared/mapLibre-controls-types.ts](../src/MapLibre/shared/mapLibre-controls-types.ts)

### 6.2 控件总入口

| 入口路径 | 说明 |
| --- | --- |
| `config.mapControls.MglNavigationControl` | 导航控件 |
| `config.mapControls.MglFullscreenControl` | 全屏控件 |
| `config.mapControls.MglGeolocationControl` | 定位控件 |
| `config.mapControls.MglScaleControl` | 比例尺控件 |
| `config.mapControls.MglAttributionControl` | 版权控件 |
| `config.mapControls.MglFrameRateControl` | 帧率控件 |
| `config.mapControls.MglStyleSwitchControl` | 样式切换控件 |
| `config.mapControls.MglCustomControl` | 自定义控件容器 |
| `config.mapControls.MaplibreTerradrawControl` | 绘图控件 |
| `config.mapControls.MaplibreMeasureControl` | 测量控件 |

### 6.3 所有控件公共字段

| 参数路径模式 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.<Control>.isUse` | `boolean` | 是否启用并渲染该控件。 |
| `config.mapControls.<Control>.position` | `top-left \| top-right \| bottom-left \| bottom-right` | 控件位置。 |

### 6.4 `MglNavigationControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglNavigationControl.isUse` | `boolean` | 是否显示导航控件。 |
| `config.mapControls.MglNavigationControl.position` | `ControlPosition` | 导航控件位置。 |
| `config.mapControls.MglNavigationControl.showCompass` | `boolean` | 是否显示指南针按钮。 |
| `config.mapControls.MglNavigationControl.showZoom` | `boolean` | 是否显示缩放按钮。 |
| `config.mapControls.MglNavigationControl.visualizePitch` | `boolean` | 指南针是否反映当前 pitch。 |

### 6.5 `MglFullscreenControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglFullscreenControl.isUse` | `boolean` | 是否显示全屏控件。 |
| `config.mapControls.MglFullscreenControl.position` | `ControlPosition` | 全屏控件位置。 |
| `config.mapControls.MglFullscreenControl.container` | `HTMLElement \| string \| null` | 全屏时要放大的容器；不传或 `null` 时通常全屏整页。 |

### 6.6 `MglGeolocationControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglGeolocationControl.isUse` | `boolean` | 是否显示定位控件。 |
| `config.mapControls.MglGeolocationControl.position` | `ControlPosition` | 定位控件位置。 |
| `config.mapControls.MglGeolocationControl.positionOptions` | `PositionOptions` | 浏览器定位参数。子项见 `6.6.1`。 |
| `config.mapControls.MglGeolocationControl.fitBoundsOptions` | `FitBoundsOptions` | 定位成功后的视角拟合参数。子项见 `5.7.1`。 |
| `config.mapControls.MglGeolocationControl.trackUserLocation` | `boolean` | 是否持续跟踪用户位置。 |
| `config.mapControls.MglGeolocationControl.showAccuracyCircle` | `boolean` | 是否显示定位精度圆。 |
| `config.mapControls.MglGeolocationControl.showUserLocation` | `boolean` | 是否显示用户位置点。 |

#### 6.6.1 `PositionOptions`

| 参数路径模式 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `*.positionOptions.enableHighAccuracy` | `boolean` | 是否尽量使用高精度定位。 |
| `*.positionOptions.maximumAge` | `number` | 可接受的缓存定位结果最大年龄。 |
| `*.positionOptions.timeout` | `number` | 定位超时时间。 |

### 6.7 `MglScaleControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglScaleControl.isUse` | `boolean` | 是否显示比例尺控件。 |
| `config.mapControls.MglScaleControl.position` | `ControlPosition` | 比例尺位置。 |
| `config.mapControls.MglScaleControl.maxWidth` | `number` | 比例尺最大像素宽度。 |
| `config.mapControls.MglScaleControl.unit` | `imperial \| metric \| nautical` | 比例尺单位体系。 |

### 6.8 `MglAttributionControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglAttributionControl.isUse` | `boolean` | 是否显示版权控件。 |
| `config.mapControls.MglAttributionControl.position` | `ControlPosition` | 版权控件位置。 |
| `config.mapControls.MglAttributionControl.compact` | `boolean` | 是否使用紧凑模式。 |
| `config.mapControls.MglAttributionControl.customAttribution` | `string \| string[]` | 自定义追加版权信息。 |

### 6.9 `MglFrameRateControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglFrameRateControl.isUse` | `boolean` | 是否显示 FPS 控件。 |
| `config.mapControls.MglFrameRateControl.position` | `ControlPosition` | FPS 控件位置。 |
| `config.mapControls.MglFrameRateControl.background` | `string` | 背景色。 |
| `config.mapControls.MglFrameRateControl.barWidth` | `number` | 柱状条宽度。 |
| `config.mapControls.MglFrameRateControl.color` | `string` | 文本与图形颜色。 |
| `config.mapControls.MglFrameRateControl.font` | `string` | 字体设置。 |
| `config.mapControls.MglFrameRateControl.graphHeight` | `number` | 图表高度。 |
| `config.mapControls.MglFrameRateControl.graphWidth` | `number` | 图表宽度。 |
| `config.mapControls.MglFrameRateControl.graphTop` | `number` | 图表距顶部偏移。 |
| `config.mapControls.MglFrameRateControl.graphRight` | `number` | 图表距右侧偏移。 |
| `config.mapControls.MglFrameRateControl.width` | `number` | 控件整体宽度。 |

### 6.10 `MglStyleSwitchControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglStyleSwitchControl.isUse` | `boolean` | 是否显示样式切换控件。 |
| `config.mapControls.MglStyleSwitchControl.position` | `ControlPosition` | 样式切换控件位置。 |
| `config.mapControls.MglStyleSwitchControl.mapStyles` | `any[]` | 可切换底图列表。当前类型较宽松，建议按 `6.10.1` 的推荐项结构传。 |
| `config.mapControls.MglStyleSwitchControl.modelValue` | `any` | 当前选中的样式项。建议与 `mapStyles[]` item 结构保持一致。 |
| `config.mapControls.MglStyleSwitchControl.isOpen` | `boolean` | 面板是否默认展开。 |

#### 6.10.1 `mapStyles[]` 推荐项结构

当前项目里的 demo 写法见 [src/views/NG/GI/NGGI00.vue](../src/views/NG/GI/NGGI00.vue)。

推荐 item 结构：

| 参数路径模式 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglStyleSwitchControl.mapStyles[].title` | `string` | 面板里显示的样式名称。 |
| `config.mapControls.MglStyleSwitchControl.mapStyles[].uri` | `string \| object` | 样式 URL 或样式 JSON。 |

### 6.11 `MglCustomControl`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MglCustomControl.isUse` | `boolean` | 是否启用自定义控件容器。 |
| `config.mapControls.MglCustomControl.position` | `ControlPosition` | 自定义控件位置。 |
| `config.mapControls.MglCustomControl.noClasses` | `boolean` | 是否移除默认控件容器 class。 |

### 6.12 `MaplibreTerradrawControl`

#### 6.12.1 顶层字段

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreTerradrawControl.isUse` | `boolean` | 是否启用绘图控件。 |
| `config.mapControls.MaplibreTerradrawControl.position` | `ControlPosition` | 绘图控件位置。 |
| `config.mapControls.MaplibreTerradrawControl.modes` | `TerradrawMode[]` | 要显示的绘图模式按钮集合。 |
| `config.mapControls.MaplibreTerradrawControl.open` | `boolean` | 工具栏是否默认展开。 |
| `config.mapControls.MaplibreTerradrawControl.showDeleteConfirmation` | `boolean` | 删除前是否弹确认框。 |
| `config.mapControls.MaplibreTerradrawControl.adapterOptions` | `TerraDrawMapLibreGLAdapterConfig` | TerraDraw MapLibre 适配器参数。常用子项见 `6.12.2`。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions` | `TerradrawModeOptionsInput` | 按模式覆写底层 TerraDraw 行为。子项见 `6.12.3`。 |
| `config.mapControls.MaplibreTerradrawControl.snapping` | `boolean \| TerradrawSnapSharedOptions` | 绘图控件吸附默认值。子项见 `6.12.4`。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration` | `TerradrawLineDecorationOptions` | 线装饰配置。子项见 `6.12.5`。 |
| `config.mapControls.MaplibreTerradrawControl.interactive` | `TerradrawInteractiveOptions` | 业务交互配置。子项见 `6.12.6`。 |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy` | `MapFeaturePropertyPolicy` | 属性治理规则。子项见 `6.12.7`。 |

#### 6.12.2 `adapterOptions` 常用子项

`adapterOptions` 来自底层 `@watergis/maplibre-gl-terradraw` / TerraDraw 适配器透传参数。当前项目实际可用且有明确意义的常用项如下：

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreTerradrawControl.adapterOptions.prefixId` | `string` | TerraDraw 运行时图层 / source 前缀。 |
| `config.mapControls.MaplibreTerradrawControl.adapterOptions.renderBelowLayerId` | `string` | 把 TerraDraw 图层插到指定图层之下。 |
| `config.mapControls.MaplibreTerradrawControl.adapterOptions.coordinatePrecision` | `number` | 坐标保留精度。 |
| `config.mapControls.MaplibreTerradrawControl.adapterOptions.minPixelDragDistance` | `number` | 普通拖拽最小像素阈值。 |
| `config.mapControls.MaplibreTerradrawControl.adapterOptions.minPixelDragDistanceSelecting` | `number` | 选择场景拖拽阈值。 |
| `config.mapControls.MaplibreTerradrawControl.adapterOptions.minPixelDragDistanceDrawing` | `number` | 绘制场景拖拽阈值。 |
| `config.mapControls.MaplibreTerradrawControl.adapterOptions.ignoreMismatchedPointerEvents` | `boolean` | 是否忽略不匹配的 pointer 事件。 |

#### 6.12.3 `modeOptions`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.point` | `TerraDrawPointMode 配置或实例` | 点模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.marker` | `TerraDrawMarkerMode 配置或实例` | 标记点模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.linestring` | `TerraDrawLineStringMode 配置或实例` | 线模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.polygon` | `TerraDrawPolygonMode 配置或实例` | 面模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.rectangle` | `TerraDrawRectangleMode 配置或实例` | 矩形模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.circle` | `TerraDrawCircleMode 配置或实例` | 圆模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.freehand` | `TerraDrawFreehandMode 配置或实例` | 自由绘面模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.freehand-linestring` | `TerraDrawFreehandLineStringMode 配置或实例` | 自由绘线模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.angled-rectangle` | `TerraDrawAngledRectangleMode 配置或实例` | 斜矩形模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.sensor` | `TerraDrawSensorMode 配置或实例` | 传感器模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.sector` | `TerraDrawSectorMode 配置或实例` | 扇形模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.select` | `TerraDrawSelectMode 配置或实例` | 选择模式覆写。 |
| `config.mapControls.MaplibreTerradrawControl.modeOptions.<customModeName>` | `object \| mode instance` | 自定义模式扩展入口。 |

#### 6.12.4 `snapping`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreTerradrawControl.snapping.enabled` | `boolean` | 是否启用吸附。 |
| `config.mapControls.MaplibreTerradrawControl.snapping.tolerancePx` | `number` | 吸附容差像素值。 |
| `config.mapControls.MaplibreTerradrawControl.snapping.useNative` | `boolean` | 是否启用 TerraDraw 原生吸附。 |
| `config.mapControls.MaplibreTerradrawControl.snapping.useMapTargets` | `boolean` | 是否启用普通图层吸附候选。 |

#### 6.12.5 `lineDecoration`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.enabled` | `boolean` | 是否启用线装饰。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle` | `TerradrawLineDecorationStyle \| null` | 所有线共享默认装饰样式。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.resolveStyle` | `(context) => style \| null \| false` | 按单条线动态返回装饰样式。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle.mode` | `symbol-repeat \| line-pattern \| segment-stretch` | 装饰模式。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle.svg` | `string` | SVG 来源。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle.spacing` | `number` | 重复图标间距。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle.size` | `number` | 图标缩放比例。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle.lineWidth` | `number` | 装饰线宽。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle.opacity` | `number` | 透明度。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle.iconRotate` | `number` | 图标旋转角度。 |
| `config.mapControls.MaplibreTerradrawControl.lineDecoration.defaultStyle.keepUpright` | `boolean` | 图标是否保持朝上。 |

#### 6.12.6 `interactive`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreTerradrawControl.interactive.enabled` | `boolean` | 是否启用业务交互封装。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.cursor` | `string \| false` | hover 要素时鼠标样式。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onReady` | `(context) => void` | 交互管理器初始化完成回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onModeChange` | `(context) => void` | 模式切换回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onFeatureFinish` | `(context) => void` | 绘制 / 编辑完成回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onFeatureChange` | `(context) => void` | 几何 / 属性变化回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onFeatureSelect` | `(context) => void` | 要素选中回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onFeatureDeselect` | `(context) => void` | 要素取消选中回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onFeatureDelete` | `(context) => void` | 要素删除回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onHoverEnter` | `(context) => void` | 鼠标移入要素回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onHoverLeave` | `(context) => void` | 鼠标移出要素回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onClick` | `(context) => void` | 单击要素回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onDoubleClick` | `(context) => void` | 双击要素回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onContextMenu` | `(context) => void` | 右键要素回调。 |
| `config.mapControls.MaplibreTerradrawControl.interactive.onBlankClick` | `(context) => void` | 点击空白处回调。 |

#### 6.12.7 `propertyPolicy`

类型来源：

- [src/MapLibre/shared/map-feature-data.ts](../src/MapLibre/shared/map-feature-data.ts)

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy.fixedKeys` | `readonly string[]` | 稳定字段，默认可见、可改、不可删。 |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy.hiddenKeys` | `readonly string[]` | 默认隐藏字段。 |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy.readonlyKeys` | `readonly string[]` | 默认可见、不可改、不可删字段。 |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy.removableKeys` | `readonly string[]` | 从稳定字段里额外放开的“允许删除”字段。 |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy.rules` | `Record<string, MapFeaturePropertyRule>` | 按字段名覆写更细规则。 |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy.rules.<field>.visible` | `boolean` | 当前字段是否可见。 |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy.rules.<field>.editable` | `boolean` | 当前字段是否可编辑。 |
| `config.mapControls.MaplibreTerradrawControl.propertyPolicy.rules.<field>.removable` | `boolean` | 当前字段是否可删除。 |

### 6.13 `MaplibreMeasureControl`

#### 6.13.1 顶层字段

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreMeasureControl.isUse` | `boolean` | 是否启用测量控件。 |
| `config.mapControls.MaplibreMeasureControl.position` | `ControlPosition` | 测量控件位置。 |
| `config.mapControls.MaplibreMeasureControl.modes` | `TerradrawMode[]` | 要显示的测量模式按钮集合。 |
| `config.mapControls.MaplibreMeasureControl.open` | `boolean` | 工具栏是否默认展开。 |
| `config.mapControls.MaplibreMeasureControl.showDeleteConfirmation` | `boolean` | 删除前是否弹确认框。 |
| `config.mapControls.MaplibreMeasureControl.pointLayerLabelSpec` | `SymbolLayerSpecification` | 测点标签图层规范。结构说明见 `6.13.2`。 |
| `config.mapControls.MaplibreMeasureControl.lineLayerLabelSpec` | `SymbolLayerSpecification` | 测线标签图层规范。结构说明见 `6.13.2`。 |
| `config.mapControls.MaplibreMeasureControl.routingLineLayerNodeSpec` | `CircleLayerSpecification` | 路由线节点图层规范。结构说明见 `6.13.2`。 |
| `config.mapControls.MaplibreMeasureControl.polygonLayerSpec` | `SymbolLayerSpecification` | 测面标签图层规范。结构说明见 `6.13.2`。 |
| `config.mapControls.MaplibreMeasureControl.measureUnitType` | `metric \| imperial` | 默认单位体系。 |
| `config.mapControls.MaplibreMeasureControl.distancePrecision` | `number` | 距离结果保留小数位。 |
| `config.mapControls.MaplibreMeasureControl.distanceUnit` | `kilometer \| meter \| centimeter \| mile \| foot \| inch \| callback` | 距离单位或自定义换算回调。 |
| `config.mapControls.MaplibreMeasureControl.areaPrecision` | `number` | 面积结果保留小数位。 |
| `config.mapControls.MaplibreMeasureControl.areaUnit` | `square meters \| square kilometers \| ares \| hectares \| square feet \| square yards \| acres \| square miles \| callback` | 面积单位或自定义换算回调。 |
| `config.mapControls.MaplibreMeasureControl.measureUnitSymbols` | `Record<Unit, string>` | 单位符号映射。常用 key 见 `6.13.3`。 |
| `config.mapControls.MaplibreMeasureControl.computeElevation` | `boolean` | 是否结合地形计算真实 3D 距离。 |
| `config.mapControls.MaplibreMeasureControl.terrainSource` | `string` | DEM source ID。 |
| `config.mapControls.MaplibreMeasureControl.elevationCacheConfig` | `ElevationCacheConfig` | 高程缓存参数。子项见 `6.13.4`。 |
| `config.mapControls.MaplibreMeasureControl.textFont` | `string[]` | 测量文字字体栈。 |
| `config.mapControls.MaplibreMeasureControl.adapterOptions` | `TerraDrawMapLibreGLAdapterConfig` | 适配器参数。字段与 `6.12.2` 相同。 |
| `config.mapControls.MaplibreMeasureControl.modeOptions` | `TerradrawModeOptionsInput` | 模式覆写。字段与 `6.12.3` 相同。 |
| `config.mapControls.MaplibreMeasureControl.snapping` | `boolean \| TerradrawSnapSharedOptions` | 吸附配置。字段与 `6.12.4` 相同。 |
| `config.mapControls.MaplibreMeasureControl.lineDecoration` | `TerradrawLineDecorationOptions` | 线装饰配置。字段与 `6.12.5` 相同。 |
| `config.mapControls.MaplibreMeasureControl.interactive` | `TerradrawInteractiveOptions` | 业务交互配置。字段与 `6.12.6` 相同。 |
| `config.mapControls.MaplibreMeasureControl.propertyPolicy` | `MapFeaturePropertyPolicy` | 属性治理规则。字段与 `6.12.7` 相同。 |

#### 6.13.2 `pointLayerLabelSpec` / `lineLayerLabelSpec` / `routingLineLayerNodeSpec` / `polygonLayerSpec`

这 4 个字段不是样式工厂默认值，而是**完整 MapLibre 图层规范对象**。可配置结构如下：

| 参数路径模式 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `*.id` | `string` | 图层唯一 ID。 |
| `*.source` | `string` | 数据源 ID。 |
| `*.source-layer` | `string` | 矢量瓦片 source-layer。 |
| `*.minzoom` | `number` | 最小显示级别。 |
| `*.maxzoom` | `number` | 最大显示级别。 |
| `*.filter` | `FilterSpecification` | 图层过滤表达式。 |
| `*.layout.*` | `layout 对象` | 布局字段。 |
| `*.paint.*` | `paint 对象` | 绘制字段。 |

对应关系：

| 字段 | 对应的 layout / paint 字段清单 |
| --- | --- |
| `pointLayerLabelSpec` | 见本文 `11.4 styles.symbol` |
| `lineLayerLabelSpec` | 见本文 `11.4 styles.symbol` |
| `polygonLayerSpec` | 见本文 `11.4 styles.symbol` |
| `routingLineLayerNodeSpec` | 见本文 `11.1 styles.circle` |

#### 6.13.3 `measureUnitSymbols` 常用 key

| 参数路径模式 | 作用 |
| --- | --- |
| `*.measureUnitSymbols.kilometer` | 千米单位显示文案。 |
| `*.measureUnitSymbols.meter` | 米单位显示文案。 |
| `*.measureUnitSymbols.centimeter` | 厘米单位显示文案。 |
| `*.measureUnitSymbols.mile` | 英里单位显示文案。 |
| `*.measureUnitSymbols.foot` | 英尺单位显示文案。 |
| `*.measureUnitSymbols.inch` | 英寸单位显示文案。 |
| `*.measureUnitSymbols.square meters` | 平方米单位显示文案。 |
| `*.measureUnitSymbols.square kilometers` | 平方千米单位显示文案。 |
| `*.measureUnitSymbols.ares` | 公亩单位显示文案。 |
| `*.measureUnitSymbols.hectares` | 公顷单位显示文案。 |
| `*.measureUnitSymbols.square feet` | 平方英尺单位显示文案。 |
| `*.measureUnitSymbols.square yards` | 平方码单位显示文案。 |
| `*.measureUnitSymbols.acres` | 英亩单位显示文案。 |
| `*.measureUnitSymbols.square miles` | 平方英里单位显示文案。 |

#### 6.13.4 `elevationCacheConfig`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.mapControls.MaplibreMeasureControl.elevationCacheConfig.enabled` | `boolean` | 是否启用高程缓存。 |
| `config.mapControls.MaplibreMeasureControl.elevationCacheConfig.maxSize` | `number` | 最大缓存条目数。 |
| `config.mapControls.MaplibreMeasureControl.elevationCacheConfig.ttl` | `number` | 缓存过期时间。 |
| `config.mapControls.MaplibreMeasureControl.elevationCacheConfig.precision` | `number` | 缓存坐标精度。 |

---

## 7. `plugins.snap` 全量参数表

### 7.1 入口说明

入口路径：

```ts
config.plugins.snap
```

类型来源：

- [src/config.ts](../src/config.ts)
- [src/MapLibre/plugins/map-feature-snap/types.ts](../src/MapLibre/plugins/map-feature-snap/types.ts)

### 7.2 参数表

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.plugins.snap.defaultTolerancePx` | `number` | 普通吸附和 TerraDraw 吸附默认容差。 |
| `config.plugins.snap.preview.enabled` | `boolean` | 是否默认启用吸附预览。 |
| `config.plugins.snap.preview.pointColor` | `string` | 吸附点颜色。 |
| `config.plugins.snap.preview.pointRadius` | `number` | 吸附点半径。 |
| `config.plugins.snap.preview.lineColor` | `string` | 命中线段高亮颜色。 |
| `config.plugins.snap.preview.lineWidth` | `number` | 命中线段高亮宽度。 |
| `config.plugins.snap.terradraw.defaults.enabled` | `boolean` | Draw / Measure 共用默认吸附开关。 |
| `config.plugins.snap.terradraw.defaults.tolerancePx` | `number` | Draw / Measure 共用默认吸附容差。 |
| `config.plugins.snap.terradraw.defaults.useNative` | `boolean` | 是否默认启用 TerraDraw 原生吸附。 |
| `config.plugins.snap.terradraw.defaults.useMapTargets` | `boolean` | 是否默认启用普通图层吸附候选。 |
| `config.plugins.snap.terradraw.draw` | `boolean \| TerradrawSnapSharedOptions` | 绘图控件专属吸附默认值。对象子项与 `7.2 terradraw.defaults.*` 相同。 |
| `config.plugins.snap.terradraw.measure` | `boolean \| TerradrawSnapSharedOptions` | 测量控件专属吸附默认值。对象子项与 `7.2 terradraw.defaults.*` 相同。 |

### 7.3 明确不进全局的字段

| 字段 | 不进全局的原因 |
| --- | --- |
| `ordinaryLayers` | 它绑定页面图层规则，天然是实例级配置。 |

---

## 8. `plugins.lineDraft` 全量参数表

### 8.1 入口说明

入口路径：

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

### 8.4 `plugins.intersection` 参数补充

入口路径：

```ts
config.plugins.intersection
```

类型来源：

- [src/config.ts](../src/config.ts)
- [src/MapLibre/plugins/intersection-preview/types.ts](../src/MapLibre/plugins/intersection-preview/types.ts)

参数表：

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.plugins.intersection.previewStyleOverrides.layout.*` | `CircleLayer layout` | 预览交点图层 layout 覆写；字段清单见本文 `11.2 styles.circle.layout`。 |
| `config.plugins.intersection.previewStyleOverrides.paint.*` | `CircleLayer paint` | 预览交点图层 paint 覆写；字段清单见本文 `11.2 styles.circle.paint`。 |
| `config.plugins.intersection.materializedStyleOverrides.layout.*` | `CircleLayer layout` | 正式交点图层 layout 覆写；字段清单见本文 `11.2 styles.circle.layout`。 |
| `config.plugins.intersection.materializedStyleOverrides.paint.*` | `CircleLayer paint` | 正式交点图层 paint 覆写；字段清单见本文 `11.2 styles.circle.paint`。 |

合并顺序：

- `交点插件内置样式 -> config.plugins.intersection.* -> createIntersectionPreviewPlugin(options).*StyleOverrides`

---

## 9. `plugins.multiSelect` 全量参数表

### 9.1 入口说明

入口路径：

```ts
config.plugins.multiSelect
```

### 9.2 参数表

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.plugins.multiSelect.enabled` | `boolean` | 是否启用多选插件。 |
| `config.plugins.multiSelect.position` | `ControlPosition` | 多选控件位置。 |
| `config.plugins.multiSelect.deactivateBehavior` | `clear \| retain` | 退出多选后是清空还是保留选中集。 |
| `config.plugins.multiSelect.closeOnEscape` | `boolean` | 是否允许按 `Esc` 退出多选。 |

### 9.3 明确不进全局的字段

| 字段 | 不进全局的原因 |
| --- | --- |
| `targetLayerIds` | 依赖具体业务图层。 |
| `excludeLayerIds` | 依赖具体业务图层。 |
| `canSelect` | 依赖具体业务规则函数。 |

---

## 10. `plugins.dxfExport` 全量参数表

### 10.1 入口说明

入口路径：

```ts
config.plugins.dxfExport
```

类型来源：

- [src/config.ts](../src/config.ts)
- [src/MapLibre/exporters/dxf/types.ts](../src/MapLibre/exporters/dxf/types.ts)

### 10.2 `defaults`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.plugins.dxfExport.defaults.sourceIds` | `string[] \| null` | 默认导出的 sourceId 列表；`null` 或不传表示全部。 |
| `config.plugins.dxfExport.defaults.fileName` | `string` | 默认导出文件名。 |
| `config.plugins.dxfExport.defaults.sourceCrs` | `string` | 默认源坐标系。 |
| `config.plugins.dxfExport.defaults.targetCrs` | `string` | 默认目标坐标系。 |
| `config.plugins.dxfExport.defaults.featureFilter` | `(feature, sourceId) => boolean` | 默认要素过滤器。 |
| `config.plugins.dxfExport.defaults.layerNameResolver` | `(feature, sourceId) => string` | 默认 DXF 图层名解析器。 |
| `config.plugins.dxfExport.defaults.layerTrueColorResolver` | `(layerName, sourceId) => #RRGGBB \| undefined` | 默认图层级 TrueColor 解析器。 |
| `config.plugins.dxfExport.defaults.featureTrueColorResolver` | `(feature, sourceId, layerName) => #RRGGBB \| undefined` | 默认要素级 TrueColor 解析器。 |
| `config.plugins.dxfExport.defaults.lineWidth` | `number` | 默认统一线宽。 |
| `config.plugins.dxfExport.defaults.pointMode` | `point \| circle` | 默认点导出模式。 |
| `config.plugins.dxfExport.defaults.pointRadius` | `number` | `pointMode='circle'` 时的默认圆半径。 |

### 10.3 `control`

| 参数路径 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `config.plugins.dxfExport.control.enabled` | `boolean` | 是否渲染 DXF 内置导出按钮。 |
| `config.plugins.dxfExport.control.position` | `ControlPosition` | DXF 按钮默认位置。 |
| `config.plugins.dxfExport.control.label` | `string` | DXF 按钮默认文案。 |

### 10.4 关于 `DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS`

源码位置：

- [src/MapLibre/exporters/dxf/defaults.ts](../src/MapLibre/exporters/dxf/defaults.ts)

这里的：

```ts
export const DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS = {
  lineWidth: undefined,
  pointMode: 'point',
  pointRadius: 1,
};
```

结论是：

- **能全局配置**
- 但**不是改库源码**
- 正确入口是：

| 库内默认值 | 对应的公开全局入口 |
| --- | --- |
| `DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS.lineWidth` | `config.plugins.dxfExport.defaults.lineWidth` |
| `DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS.pointMode` | `config.plugins.dxfExport.defaults.pointMode` |
| `DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS.pointRadius` | `config.plugins.dxfExport.defaults.pointRadius` |

同理：

| 库内默认值组 | 对应的公开全局入口 |
| --- | --- |
| `DEFAULT_DXF_CRS_OPTIONS` | `config.plugins.dxfExport.defaults.sourceCrs`、`config.plugins.dxfExport.defaults.targetCrs` |
| `DEFAULT_DXF_TRUE_COLOR_RULES` | `config.plugins.dxfExport.defaults.layerTrueColorResolver`、`config.plugins.dxfExport.defaults.featureTrueColorResolver` |

---

## 11. `styles` 全量参数表

### 11.1 入口说明

入口路径：

```ts
config.styles.circle
config.styles.line
config.styles.fill
config.styles.symbol
config.styles.raster
```

说明：

- `styles.*` 只作用于样式工厂路径
- 合并顺序：库内默认样式 -> 全局 style 默认值 -> 当前工厂 overrides
- 如果业务层直接传完整 `layer.style`，则视为页面完全接管，**不会自动叠加全局 style**
- 所有 `*-transition` 字段的公共子项见 `11.6`

### 11.2 `styles.circle`

#### 11.2.1 `styles.circle.layout`

| 参数路径 | 作用 |
| --- | --- |
| `styles.circle.layout.circle-sort-key` | 点要素绘制排序值。 |
| `styles.circle.layout.visibility` | 图层显隐。 |

#### 11.2.2 `styles.circle.paint`

| 参数路径 | 作用 |
| --- | --- |
| `styles.circle.paint.circle-radius` | 圆点半径。 |
| `styles.circle.paint.circle-radius-transition` | `circle-radius` 过渡配置。 |
| `styles.circle.paint.circle-color` | 圆点颜色。 |
| `styles.circle.paint.circle-color-transition` | `circle-color` 过渡配置。 |
| `styles.circle.paint.circle-blur` | 圆点模糊程度。 |
| `styles.circle.paint.circle-blur-transition` | `circle-blur` 过渡配置。 |
| `styles.circle.paint.circle-opacity` | 圆点透明度。 |
| `styles.circle.paint.circle-opacity-transition` | `circle-opacity` 过渡配置。 |
| `styles.circle.paint.circle-translate` | 圆点屏幕空间偏移量。 |
| `styles.circle.paint.circle-translate-transition` | `circle-translate` 过渡配置。 |
| `styles.circle.paint.circle-translate-anchor` | `circle-translate` 参考系。 |
| `styles.circle.paint.circle-pitch-scale` | 地图倾斜时圆点缩放参考。 |
| `styles.circle.paint.circle-pitch-alignment` | 地图倾斜时圆点对齐平面。 |
| `styles.circle.paint.circle-stroke-width` | 圆点描边宽度。 |
| `styles.circle.paint.circle-stroke-width-transition` | `circle-stroke-width` 过渡配置。 |
| `styles.circle.paint.circle-stroke-color` | 圆点描边颜色。 |
| `styles.circle.paint.circle-stroke-color-transition` | `circle-stroke-color` 过渡配置。 |
| `styles.circle.paint.circle-stroke-opacity` | 圆点描边透明度。 |
| `styles.circle.paint.circle-stroke-opacity-transition` | `circle-stroke-opacity` 过渡配置。 |

### 11.3 `styles.line`

#### 11.3.1 `styles.line.layout`

| 参数路径 | 作用 |
| --- | --- |
| `styles.line.layout.line-cap` | 线端点样式。 |
| `styles.line.layout.line-join` | 线拐角样式。 |
| `styles.line.layout.line-miter-limit` | miter 拐角回退阈值。 |
| `styles.line.layout.line-round-limit` | round 拐角回退阈值。 |
| `styles.line.layout.line-sort-key` | 线要素绘制排序值。 |
| `styles.line.layout.visibility` | 图层显隐。 |

#### 11.3.2 `styles.line.paint`

| 参数路径 | 作用 |
| --- | --- |
| `styles.line.paint.line-opacity` | 线透明度。 |
| `styles.line.paint.line-opacity-transition` | `line-opacity` 过渡配置。 |
| `styles.line.paint.line-color` | 线颜色。 |
| `styles.line.paint.line-color-transition` | `line-color` 过渡配置。 |
| `styles.line.paint.line-translate` | 线屏幕空间偏移量。 |
| `styles.line.paint.line-translate-transition` | `line-translate` 过渡配置。 |
| `styles.line.paint.line-translate-anchor` | `line-translate` 参考系。 |
| `styles.line.paint.line-width` | 线宽。 |
| `styles.line.paint.line-width-transition` | `line-width` 过渡配置。 |
| `styles.line.paint.line-gap-width` | 线内部间隙宽度。 |
| `styles.line.paint.line-gap-width-transition` | `line-gap-width` 过渡配置。 |
| `styles.line.paint.line-offset` | 线相对原始几何偏移量。 |
| `styles.line.paint.line-offset-transition` | `line-offset` 过渡配置。 |
| `styles.line.paint.line-blur` | 线模糊程度。 |
| `styles.line.paint.line-blur-transition` | `line-blur` 过渡配置。 |
| `styles.line.paint.line-dasharray` | 虚线样式数组。 |
| `styles.line.paint.line-dasharray-transition` | `line-dasharray` 过渡配置。 |
| `styles.line.paint.line-pattern` | 线纹理图案名称。 |
| `styles.line.paint.line-pattern-transition` | `line-pattern` 过渡配置。 |
| `styles.line.paint.line-gradient` | 沿线渐变色。 |

### 11.4 `styles.fill`

#### 11.4.1 `styles.fill.layout`

| 参数路径 | 作用 |
| --- | --- |
| `styles.fill.layout.fill-sort-key` | 面要素绘制排序值。 |
| `styles.fill.layout.visibility` | 图层显隐。 |

#### 11.4.2 `styles.fill.paint`

| 参数路径 | 作用 |
| --- | --- |
| `styles.fill.paint.fill-antialias` | 是否开启面抗锯齿。 |
| `styles.fill.paint.fill-opacity` | 面透明度。 |
| `styles.fill.paint.fill-opacity-transition` | `fill-opacity` 过渡配置。 |
| `styles.fill.paint.fill-color` | 面填充颜色。 |
| `styles.fill.paint.fill-color-transition` | `fill-color` 过渡配置。 |
| `styles.fill.paint.fill-outline-color` | 面边框颜色。 |
| `styles.fill.paint.fill-outline-color-transition` | `fill-outline-color` 过渡配置。 |
| `styles.fill.paint.fill-translate` | 面屏幕空间偏移量。 |
| `styles.fill.paint.fill-translate-transition` | `fill-translate` 过渡配置。 |
| `styles.fill.paint.fill-translate-anchor` | `fill-translate` 参考系。 |
| `styles.fill.paint.fill-pattern` | 面纹理图案名称。 |
| `styles.fill.paint.fill-pattern-transition` | `fill-pattern` 过渡配置。 |

### 11.5 `styles.symbol`

#### 11.5.1 `styles.symbol.layout`

| 参数路径 | 作用 |
| --- | --- |
| `styles.symbol.layout.symbol-placement` | 符号放置方式。 |
| `styles.symbol.layout.symbol-spacing` | 符号间距。 |
| `styles.symbol.layout.symbol-avoid-edges` | 是否避免跨瓦片边缘放置。 |
| `styles.symbol.layout.symbol-sort-key` | 符号排序值。 |
| `styles.symbol.layout.symbol-z-order` | 符号绘制顺序策略。 |
| `styles.symbol.layout.icon-allow-overlap` | 图标是否允许重叠。 |
| `styles.symbol.layout.icon-overlap` | 图标重叠控制策略。 |
| `styles.symbol.layout.icon-ignore-placement` | 是否允许其他符号忽略当前图标碰撞盒。 |
| `styles.symbol.layout.icon-optional` | 图标碰撞时是否允许只显示文字。 |
| `styles.symbol.layout.icon-rotation-alignment` | 图标旋转对齐方式。 |
| `styles.symbol.layout.icon-size` | 图标缩放比例。 |
| `styles.symbol.layout.icon-text-fit` | 图标是否包裹文字。 |
| `styles.symbol.layout.icon-text-fit-padding` | 图标包裹文字时的额外内边距。 |
| `styles.symbol.layout.icon-image` | 图标 sprite 名称。 |
| `styles.symbol.layout.icon-rotate` | 图标旋转角度。 |
| `styles.symbol.layout.icon-padding` | 图标碰撞盒内边距。 |
| `styles.symbol.layout.icon-keep-upright` | 图标是否保持正向。 |
| `styles.symbol.layout.icon-offset` | 图标偏移量。 |
| `styles.symbol.layout.icon-anchor` | 图标锚点。 |
| `styles.symbol.layout.icon-pitch-alignment` | 图标倾斜对齐方式。 |
| `styles.symbol.layout.text-pitch-alignment` | 文字倾斜对齐方式。 |
| `styles.symbol.layout.text-rotation-alignment` | 文字旋转对齐方式。 |
| `styles.symbol.layout.text-field` | 文字内容表达式或字段。 |
| `styles.symbol.layout.text-font` | 字体栈。 |
| `styles.symbol.layout.text-size` | 字号。 |
| `styles.symbol.layout.text-max-width` | 换行最大宽度。 |
| `styles.symbol.layout.text-line-height` | 多行行高。 |
| `styles.symbol.layout.text-letter-spacing` | 字间距。 |
| `styles.symbol.layout.text-justify` | 多行对齐方式。 |
| `styles.symbol.layout.text-radial-offset` | 文字径向偏移。 |
| `styles.symbol.layout.text-variable-anchor` | 可变文字锚点集合。 |
| `styles.symbol.layout.text-variable-anchor-offset` | 可变锚点偏移集合。 |
| `styles.symbol.layout.text-anchor` | 文字锚点。 |
| `styles.symbol.layout.text-max-angle` | 沿线排布时允许的最大折角。 |
| `styles.symbol.layout.text-writing-mode` | 书写方向。 |
| `styles.symbol.layout.text-rotate` | 文字旋转角度。 |
| `styles.symbol.layout.text-padding` | 文字碰撞盒内边距。 |
| `styles.symbol.layout.text-keep-upright` | 文字是否保持正向。 |
| `styles.symbol.layout.text-transform` | 大小写转换方式。 |
| `styles.symbol.layout.text-offset` | 文字偏移量。 |
| `styles.symbol.layout.text-allow-overlap` | 文字是否允许重叠。 |
| `styles.symbol.layout.text-overlap` | 文字重叠控制策略。 |
| `styles.symbol.layout.text-ignore-placement` | 是否允许其他符号忽略当前文字碰撞盒。 |
| `styles.symbol.layout.text-optional` | 文字碰撞时是否允许只显示图标。 |
| `styles.symbol.layout.visibility` | 图层显隐。 |

#### 11.5.2 `styles.symbol.paint`

| 参数路径 | 作用 |
| --- | --- |
| `styles.symbol.paint.icon-opacity` | 图标透明度。 |
| `styles.symbol.paint.icon-opacity-transition` | `icon-opacity` 过渡配置。 |
| `styles.symbol.paint.icon-color` | 图标颜色。 |
| `styles.symbol.paint.icon-color-transition` | `icon-color` 过渡配置。 |
| `styles.symbol.paint.icon-halo-color` | 图标描边颜色。 |
| `styles.symbol.paint.icon-halo-color-transition` | `icon-halo-color` 过渡配置。 |
| `styles.symbol.paint.icon-halo-width` | 图标描边宽度。 |
| `styles.symbol.paint.icon-halo-width-transition` | `icon-halo-width` 过渡配置。 |
| `styles.symbol.paint.icon-halo-blur` | 图标描边模糊度。 |
| `styles.symbol.paint.icon-halo-blur-transition` | `icon-halo-blur` 过渡配置。 |
| `styles.symbol.paint.icon-translate` | 图标偏移量。 |
| `styles.symbol.paint.icon-translate-transition` | `icon-translate` 过渡配置。 |
| `styles.symbol.paint.icon-translate-anchor` | `icon-translate` 参考系。 |
| `styles.symbol.paint.text-opacity` | 文字透明度。 |
| `styles.symbol.paint.text-opacity-transition` | `text-opacity` 过渡配置。 |
| `styles.symbol.paint.text-color` | 文字颜色。 |
| `styles.symbol.paint.text-color-transition` | `text-color` 过渡配置。 |
| `styles.symbol.paint.text-halo-color` | 文字描边颜色。 |
| `styles.symbol.paint.text-halo-color-transition` | `text-halo-color` 过渡配置。 |
| `styles.symbol.paint.text-halo-width` | 文字描边宽度。 |
| `styles.symbol.paint.text-halo-width-transition` | `text-halo-width` 过渡配置。 |
| `styles.symbol.paint.text-halo-blur` | 文字描边模糊度。 |
| `styles.symbol.paint.text-halo-blur-transition` | `text-halo-blur` 过渡配置。 |
| `styles.symbol.paint.text-translate` | 文字偏移量。 |
| `styles.symbol.paint.text-translate-transition` | `text-translate` 过渡配置。 |
| `styles.symbol.paint.text-translate-anchor` | `text-translate` 参考系。 |

### 11.6 `styles.raster`

#### 11.6.1 `styles.raster.layout`

| 参数路径 | 作用 |
| --- | --- |
| `styles.raster.layout.visibility` | 图层显隐。 |

#### 11.6.2 `styles.raster.paint`

| 参数路径 | 作用 |
| --- | --- |
| `styles.raster.paint.raster-opacity` | 栅格透明度。 |
| `styles.raster.paint.raster-opacity-transition` | `raster-opacity` 过渡配置。 |
| `styles.raster.paint.raster-hue-rotate` | 色相旋转。 |
| `styles.raster.paint.raster-hue-rotate-transition` | `raster-hue-rotate` 过渡配置。 |
| `styles.raster.paint.raster-brightness-min` | 最小亮度。 |
| `styles.raster.paint.raster-brightness-min-transition` | `raster-brightness-min` 过渡配置。 |
| `styles.raster.paint.raster-brightness-max` | 最大亮度。 |
| `styles.raster.paint.raster-brightness-max-transition` | `raster-brightness-max` 过渡配置。 |
| `styles.raster.paint.raster-saturation` | 饱和度调整。 |
| `styles.raster.paint.raster-saturation-transition` | `raster-saturation` 过渡配置。 |
| `styles.raster.paint.raster-contrast` | 对比度调整。 |
| `styles.raster.paint.raster-contrast-transition` | `raster-contrast` 过渡配置。 |
| `styles.raster.paint.resampling` | 通用重采样方式。 |
| `styles.raster.paint.raster-resampling` | 栅格重采样方式。 |
| `styles.raster.paint.raster-fade-duration` | 瓦片切换淡入时长。 |

### 11.7 所有 `*-transition` 对象的公共子项

所有样式里的 `*-transition` 对象，都支持这两个子项：

| 参数路径模式 | 类型 / 取值 | 作用 |
| --- | --- | --- |
| `*.transition.duration` | `number` | 过渡动画时长。 |
| `*.transition.delay` | `number` | 过渡动画延迟。 |

---

## 12. 当前明确不支持进入全局配置的项目

| 字段 | 不支持原因 |
| --- | --- |
| `sourceRegistry` | 页面实例绑定信息。 |
| `ordinaryLayers` | 页面图层规则。 |
| `inheritInteractiveFromLayerId` | 页面图层 ID 绑定。 |
| `targetLayerIds` | 页面图层 ID 绑定。 |
| `excludeLayerIds` | 页面图层 ID 绑定。 |
| `canSelect` | 页面业务过滤函数。 |

---

## 13. 真实项目推荐写法

### 13.1 推荐目录

```txt
src/
  main.ts
  map-global-config.ts
```

### 13.2 推荐示例

`src/map-global-config.ts`

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
        intersection: {
          previewStyleOverrides: {
            paint: {
              'circle-radius': 6,
            },
          },
          materializedStyleOverrides: {
            paint: {
              'circle-radius': 7,
              'circle-color': '#1677ff',
            },
          },
        },
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

## 14. 不想靠记忆时，去哪里找

如果你以后不想背这些字段，只记这 4 个地方：

| 去哪里看 | 用途 |
| --- | --- |
| [src/config.ts](../src/config.ts) | 看官方白名单，确认某项能不能全局配。 |
| [src/demo-map-global-config.ts](../src/demo-map-global-config.ts) | 抄真实可运行示例。 |
| `defineMapGlobalConfig({ ... })` 的 TS 自动提示 | 查当前类型允许哪些字段。 |
| 这份文档 | 查字段路径、作用、入口和常见子项。 |

这样以后就不用靠记忆找全局可配置项了。
