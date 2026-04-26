# 全局配置

全局配置用于给整个应用注册地图初始化、控件、插件和图层样式的统一默认值。公开入口是 `vue-maplibre-kit/config`，源码由 `src/config.ts` 转发到 `src/entries/config.ts`。

## 配置树

```ts
defineMapGlobalConfig({
  mapOptions: {},
  mapControls: {},
  plugins: {
    snap: {},
    lineDraft: {},
    intersection: {},
    multiSelect: {},
    dxfExport: {},
  },
  styles: {
    circle: {},
    line: {},
    fill: {},
    symbol: {},
    raster: {},
  },
});
```

## 目录

- [01-配置入口.md](./01-配置入口.md)：`defineMapGlobalConfig`、`setMapGlobalConfig`、`getMapGlobalConfig`、`resetMapGlobalConfig`。
- [02-mapOptions默认值.md](./02-mapOptions默认值.md)：地图初始化默认参数。
- [03-mapControls默认值.md](./03-mapControls默认值.md)：内置控件默认参数。
- [04-plugins默认值.md](./04-plugins默认值.md)：snap、lineDraft、intersection、multiSelect、dxfExport 默认参数。
- [05-styles默认值.md](./05-styles默认值.md)：图层样式工厂默认值。
- [06-优先级和覆盖规则.md](./06-优先级和覆盖规则.md)：全局、页面和单次命令的合并关系。

## 迁移来源

本目录从旧文档 `docs/vue-mapLibre-kit知识库/vue-maplibre-kit-全局配置说明.md` 拆分迁移，并按 `src/entries/config.ts` 校对。旧文档只作为迁移来源，新业务文档应以本目录为准。

## 使用原则

- 全局配置只放应用级默认值，不放页面局部状态。
- 页面差异应通过组件 props、业务 source、插件实例配置或命令式 overrides 处理。
- 配置注册建议在 `main.ts` 创建应用前执行一次。
- 不建议把 Vue 响应式对象直接传入全局配置。

