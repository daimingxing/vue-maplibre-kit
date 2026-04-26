# mapControls

适合谁读：需要开启导航、比例尺、绘图、测量等地图控件的开发者。

先读哪篇：[02-mapOptions](./02-mapOptions.md)。

对应示例：[NGGI01](../../../examples/views/NG/GI/NGGI01.vue)、[NGGI05](../../../examples/views/NG/GI/NGGI05.vue)。

## 使用控件预设

```ts
import { createMapControlsPreset } from "vue-maplibre-kit/business";

const controls = createMapControlsPreset("basic", {
  MglNavigationControl: { isUse: true, position: "top-left" },
  MglScaleControl: { isUse: true, position: "bottom-left" },
  MaplibreTerradrawControl: {
    isUse: true,
    position: "top-left",
    snapping: true,
  },
});
```

预设名称包括 `minimal`、`basic`、`draw`、`full`。预设只是默认开关集合，业务页面仍可以通过第二个参数覆盖具体控件。

## 常用控件

| 配置项 | 用途 |
| --- | --- |
| `MglNavigationControl` | 缩放和罗盘 |
| `MglFullscreenControl` | 全屏 |
| `MglGeolocationControl` | 浏览器定位 |
| `MglScaleControl` | 比例尺 |
| `MaplibreTerradrawControl` | TerraDraw 绘图 |
| `MaplibreMeasureControl` | TerraDraw 测量 |

## TerraDraw 属性规则

绘图和测量控件也可以声明 `propertyPolicy`，用于后续属性面板解析。正式业务 source 的字段规则和 TerraDraw 控件字段规则应分开维护。
