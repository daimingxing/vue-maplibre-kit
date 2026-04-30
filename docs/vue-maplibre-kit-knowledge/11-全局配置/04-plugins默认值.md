# plugins 默认值

全局 plugins 用于给内置业务插件提供应用级默认参数。当前按 src/entries/config.ts 支持六个插件键。

全局 plugins 只配置“插件启用后的默认行为”，不配置插件是否注册或启用。插件是否启用由页面局部的 `createBusinessPlugins()` 决定。

对全局支持的字段，合并顺序统一为：插件内置默认值 -> 全局默认值 -> 页面局部配置。全局不包含页面运行期对象、业务 source/layer 绑定和页面交互回调。

## plugins.snap 全局配置项

```ts
plugins: {
  // 吸附插件：统一控制吸附预览、插件内置目标和 TerraDraw 吸附默认值
  snap: {
    // defaultTolerancePx: 12, // 全局默认吸附容差像素

    // preview: {
    //   enabled: true, // 是否启用吸附预览
    //   pointColor: '#1677ff', // 吸附点颜色
    //   pointRadius: 6, // 吸附点半径
    //   lineColor: '#1677ff', // 命中线段高亮颜色
    //   lineWidth: 5, // 命中线段高亮宽度
    // },

    // intersection: {
    //   enabled: true, // 是否默认启用交点插件内置吸附目标
    //   priority: 110, // 交点吸附默认优先级
    //   tolerancePx: 12, // 交点吸附局部容差；不传时使用 defaultTolerancePx
    //   snapTo: ['vertex'], // 交点只推荐顶点吸附
    // },

    // polygonEdge: {
    //   enabled: true, // 是否默认启用面边线插件内置吸附目标
    //   priority: 90, // 面边线吸附默认优先级
    //   tolerancePx: 12, // 面边线吸附局部容差；不传时使用 defaultTolerancePx
    //   snapTo: ['vertex', 'segment'], // 面边线默认允许吸附顶点和线段
    // },

    // terradraw: {
    //   defaults: {
    //     enabled: true, // Draw / Measure 共用默认吸附开关
    //     tolerancePx: 12, // Draw / Measure 共用默认吸附容差
    //     useNative: true, // 是否默认启用 TerraDraw 原生吸附
    //     useMapTargets: true, // 是否默认启用业务图层吸附候选
    //     drawnTargets: {
    //       enabled: true, // 是否默认启用已绘制点线面吸附
    //       geometryTypes: ['Point', 'LineString', 'Polygon'], // 已绘制要素类型
    //       snapTo: ['vertex', 'segment'], // 已绘制要素吸附方式
    //       priority: 40, // 已绘制要素吸附优先级
    //       tolerancePx: 12, // 已绘制要素吸附局部容差
    //     },
    //   },
    //   draw: {
    //     enabled: true,
    //     tolerancePx: 12,
    //     useNative: true,
    //     useMapTargets: true,
    //     drawnTargets: true,
    //   }, // 绘图控件专属吸附默认值；也可以直接传 true / false
    //   measure: {
    //     enabled: true,
    //     tolerancePx: 12,
    //     useNative: true,
    //     useMapTargets: true,
    //     drawnTargets: false,
    //   }, // 测量控件专属吸附默认值；也可以直接传 true / false
    // },
  },
},
```

补充说明：

- 全局 `plugins.snap` 不配置业务图层规则。`businessLayers.rules` 依赖页面里的具体 layerId，应在页面局部通过 `createBusinessPlugins({ snap: { businessLayers } })` 配置。
- 全局 `drawnTargets` 只定义 TerraDraw / Measure 已绘制目标的默认行为，不替代页面局部的 `businessLayers.rules`。
- `drawnTargets: false` 表示关闭，`true` 表示使用默认点线面规则，对象表示开启并覆写局部规则。

---

## plugins.lineDraft 全局配置项

> 当前全局只负责线草稿和线廊草稿的默认视觉，不负责业务来源绑定、事件回调和草稿生成行为。

```ts
plugins: {
  lineDraft: {
    styleOverrides: {
      line: {
        layout: {
          // visibility: 'visible', // 线草稿图层显隐
        },
        paint: {
          // 'line-opacity': 0.8, // 线草稿透明度
          // 'line-color': '#1677ff', // 线草稿颜色
          // 'line-width': 3, // 线草稿线宽
        },
      },
      fill: {
        layout: {
          // visibility: 'visible', // 线廊草稿图层显隐
        },
        paint: {
          // 'fill-opacity': 0.25, // 线廊草稿透明度
          // 'fill-color': '#1677ff', // 线廊草稿填充色
          // 'fill-outline-color': '#1677ff', // 线廊草稿描边色
        },
      },
    },
  },
},
```

补充说明：

- 合并顺序是“全局 `styleOverrides` -> 当前实例 `styleOverrides`”，实例级同名字段覆盖全局默认值。
- 当前全局没有 `enabled`、`onHoverEnter`、`onHoverLeave`、`onClick`、`onDoubleClick`、`onContextMenu` 这些字段。
- 旧版 `inheritInteractiveFromLayerId` 已不属于当前 API，也不应该继续写进这份全局配置文档。

---

## plugins.intersection 全局配置项

> 当前全局负责交点插件启用后的默认行为、算法参数和默认视觉；不负责页面数据范围、运行期对象、正式点业务属性和页面交互回调。

```ts
plugins: {
  intersection: {
    visible: true, // 当前交点层默认是否可见
    materializeOnClick: true, // 点击预览交点时是否自动生成正式交点点要素
    scope: 'all', // 当前求交范围：all / selected
    includeEndpoint: false, // 是否保留端点交点
    coordDigits: 6, // 交点坐标归一化小数位
    ignoreSelf: true, // 是否忽略同一条线自交
    previewStateStyles: {
      default: {
        // radius: 5, // 默认态半径
        // color: '#ff4d4f', // 默认态填充色
        // strokeColor: '#ffffff', // 默认态描边色
        // strokeWidth: 1.5, // 默认态描边宽度
      },
      hover: {
        // radius: 6, // hover 态半径
        // color: '#fa8c16', // hover 态填充色
        // strokeColor: '#ffffff', // hover 态描边色
        // strokeWidth: 2, // hover 态描边宽度
      },
      selected: {
        // radius: 7, // selected 态半径
        // color: '#fa541c', // selected 态填充色
        // strokeColor: '#ffffff', // selected 态描边色
        // strokeWidth: 2, // selected 态描边宽度
      },
    },
    materializedStateStyles: {
      default: {
        // radius: 6, // 正式交点默认态半径
        // color: '#1677ff', // 正式交点默认态填充色
        // strokeColor: '#ffffff', // 正式交点默认态描边色
        // strokeWidth: 1.5, // 正式交点默认态描边宽度
      },
      hover: {
        // radius: 7, // 正式交点 hover 态半径
        // color: '#4096ff', // 正式交点 hover 态填充色
        // strokeColor: '#ffffff', // 正式交点 hover 态描边色
        // strokeWidth: 2, // 正式交点 hover 态描边宽度
      },
      selected: {
        // radius: 8, // 正式交点 selected 态半径
        // color: '#0958d9', // 正式交点 selected 态填充色
        // strokeColor: '#ffffff', // 正式交点 selected 态描边色
        // strokeWidth: 2, // 正式交点 selected 态描边宽度
      },
    },
    previewStyleOverrides: {
      layout: {
        // visibility: 'visible', // 预览交点图层显隐
      },
      paint: {
        // 'circle-radius-transition': { duration: 120, delay: 0 }, // 预览交点半径过渡
        // 'circle-opacity': 1, // 预览交点透明度
      },
    },
    materializedStyleOverrides: {
      layout: {
        // visibility: 'visible', // 正式交点图层显隐
      },
      paint: {
        // 'circle-radius-transition': { duration: 120, delay: 0 }, // 正式交点半径过渡
        // 'circle-opacity': 1, // 正式交点透明度
      },
    },
  },
},
```

补充说明：

- `previewStateStyles`、`materializedStateStyles` 的合并顺序是“插件内置默认值 -> 全局默认值 -> 当前实例”。
- `previewStyleOverrides`、`materializedStyleOverrides` 的合并顺序是“全局默认值 -> 当前实例”。
- 当前全局允许 `visible`、`materializeOnClick`、`scope`、`includeEndpoint`、`coordDigits`、`ignoreSelf`、`previewStateStyles`、`materializedStateStyles`、`previewStyleOverrides`、`materializedStyleOverrides` 这些字段。
- 当前全局没有 `enabled`、`targetSourceIds`、`targetLayerIds`、`sourceRegistry`、`getCandidates`、`materializedProperties`、`inheritMaterializedPropertiesFromLayerId`、`onHoverEnter`、`onHoverLeave`、`onClick`、`onContextMenu` 这些字段。

---

## plugins.polygonEdge 全局配置项

> 当前全局只负责面边线预览的默认视觉，不负责生成哪一个业务面，也不负责边线交互回调。

```ts
plugins: {
  polygonEdge: {
    style: {
      normal: {
        // color: '#409eff', // 默认边线颜色
        // width: 3, // 默认边线宽度
        // opacity: 0.9, // 默认边线透明度
      },
      hover: {
        // color: '#f56c6c', // hover 态边线颜色
        // width: 5, // hover 态边线宽度
      },
      selected: {
        // color: '#e6a23c', // selected 态边线颜色
        // width: 6, // selected 态边线宽度
      },
      highlighted: {
        // color: '#67c23a', // highlighted 态边线颜色
        // width: 5, // highlighted 态边线宽度
      },
    },
    styleRules: [
      // {
      //   where: { type: 'boundary' }, // 按来源面属性浅层等值匹配
      //   style: {
      //     normal: { color: '#ff7a00', width: 4 },
      //     hover: { color: '#f56c6c', width: 5 },
      //   },
      // },
    ],
  },
},
```

补充说明：

- 合并顺序是“插件内置默认值 -> 全局 `plugins.polygonEdge.style` -> 当前实例 `polygonEdge.style`”。
- `styleRules` 会先合并全局规则，再合并实例规则；命中规则会把样式写入生成的临时边线属性。
- 当前全局没有 `enabled`、`onHoverEnter`、`onHoverLeave`、`onClick`、`onDoubleClick`、`onContextMenu` 这些字段。

---

## plugins.multiSelect 全局配置项

```ts
plugins: {
  // 多选插件：统一控制多选模式默认行为
  multiSelect: {
    // position: 'top-right', // 多选控件位置
    // deactivateBehavior: 'retain', // 退出多选后是清空还是保留选中集：clear / retain
    // closeOnEscape: true, // 是否允许按 Esc 退出多选
  },
},
```

补充说明：

- 全局 `plugins.multiSelect` 不包含 `enabled`，插件是否注册或启用由页面局部 `createBusinessPlugins({ multiSelect })` 决定。
- `targetLayerIds`、`excludeLayerIds`、`canSelect` 依赖具体页面图层和业务规则，应在页面局部配置。

---

## plugins.dxfExport 全局配置项

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

### 11.1 关于 `DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS`

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
