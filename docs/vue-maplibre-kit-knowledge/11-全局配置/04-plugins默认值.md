# plugins 默认值

全局 `plugins` 用于给内置业务插件提供应用级默认参数。当前按 `src/entries/config.ts` 支持五个插件键。

## snap

吸附插件默认值：

```ts
defineMapGlobalConfig({
  plugins: {
    snap: {
      defaultTolerancePx: 12,
      preview: {
        enabled: true,
        pointColor: '#1677ff',
        lineColor: '#1677ff',
        lineWidth: 5,
      },
      terradraw: {
        defaults: {
          enabled: true,
          tolerancePx: 12,
          useNative: true,
          useMapTargets: true,
        },
        draw: true,
        measure: true,
      },
    },
  },
});
```

`terradraw.draw` 和 `terradraw.measure` 可以传布尔值，也可以传局部吸附配置。

## lineDraft

线草稿插件全局只负责样式覆写，不负责业务 source 绑定和事件回调。

```ts
defineMapGlobalConfig({
  plugins: {
    lineDraft: {
      styleOverrides: {
        line: {
          paint: {
            'line-opacity': 0.8,
            'line-color': '#1677ff',
          },
        },
        fill: {
          paint: {
            'fill-opacity': 0.25,
          },
        },
      },
    },
  },
});
```

## intersection

交点插件全局只负责预览交点和正式交点的视觉默认值。

```ts
defineMapGlobalConfig({
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
  },
});
```

也可以配置 `previewStateStyles` 和 `materializedStateStyles`，分别控制 default、hover、selected 等状态样式。

## multiSelect

```ts
defineMapGlobalConfig({
  plugins: {
    multiSelect: {
      enabled: true,
      position: 'top-right',
      deactivateBehavior: 'retain',
      closeOnEscape: true,
    },
  },
});
```

`deactivateBehavior` 只有 `clear` 和 `retain` 两种语义：退出多选后清空或保留选中集。

## dxfExport

```ts
defineMapGlobalConfig({
  plugins: {
    dxfExport: {
      defaults: {
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:3857',
        fileName: 'map-export.dxf',
        lineWidth: 0.5,
        pointMode: 'point',
        pointRadius: 1,
      },
      control: {
        enabled: true,
        position: 'top-right',
        label: '导出CAD',
      },
    },
  },
});
```

`defaults` 对应 DXF 任务默认值，单次 `businessMap.plugins.dxfExport.downloadDxf(overrides)` 仍可继续覆盖。

## 边界

- 全局插件配置是默认值，不等同于插件注册。页面仍需要通过 `plugins` prop 注册对应插件。
- 插件行为回调、业务 source 绑定和页面临时参数应放在页面级插件配置里。
- 单插件子路径保留给高级定制；普通业务页优先用 `vue-maplibre-kit/plugins` 的 `createBusinessPlugins()`。

