# 全局配置

全局配置用于给整个应用注册地图初始化、控件、插件和图层样式的统一默认值。公开入口是 ue-maplibre-kit/config，源码由 src/config.ts 转发到 src/entries/config.ts。

本目录不是概念摘要，而是可复制的配置手册。每个子文档都会尽量保留真实代码风格：字段写在 defineMapGlobalConfig({ ... }) 能接受的位置，字段说明写成行内注释，方便开发人员复制后按需取消注释。

## 目录

- [01-配置入口.md](./01-配置入口.md)：真实项目推荐目录、启动阶段注册方式、完整起手模板。
- [02-mapOptions默认值.md](./02-mapOptions默认值.md)：地图初始化参数完整模板。
- [03-mapControls默认值.md](./03-mapControls默认值.md)：内置控件、绘图控件和测量控件完整模板。
- [04-plugins默认值.md](./04-plugins默认值.md)：snap、lineDraft、intersection、multiSelect、dxfExport 完整模板。
- [05-styles默认值.md](./05-styles默认值.md)：circle、line、fill、symbol、raster 的 layout / paint 模板。
- [06-优先级和覆盖规则.md](./06-优先级和覆盖规则.md)：全局、页面和单次命令的合并关系。

## 文档边界

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

- [src/config.ts](../../../src/config.ts)
- [src/demo-map-global-config.ts](../../../src/demo-map-global-config.ts)
- [src/main.ts](../../../src/main.ts)

---

## 当前支持的全局配置树

```ts
defineMapGlobalConfig({
  mapOptions: {
    // ...
  },
  mapControls: {
    // ...
  },
  plugins: {
    snap: {
      // ...
    },
    lineDraft: {
      // ...
    },
    intersection: {
      // ...
    },
    multiSelect: {
      // ...
    },
    dxfExport: {
      // ...
    },
  },
  styles: {
    circle: {
      // ...
    },
    line: {
      // ...
    },
    fill: {
      // ...
    },
    symbol: {
      // ...
    },
    raster: {
      // ...
    },
  },
});
```

一级入口只有这些：

- `config.mapOptions`：地图初始化默认参数
- `config.mapControls`：地图控件默认参数
- `config.plugins.snap`：吸附插件默认参数
- `config.plugins.lineDraft`：线草稿预览插件默认参数
- `config.plugins.intersection`：交点预览插件默认参数
- `config.plugins.multiSelect`：多选插件默认参数
- `config.plugins.dxfExport`：DXF 导出插件默认参数
- `config.styles.circle`：点图层样式工厂默认值
- `config.styles.line`：线图层样式工厂默认值
- `config.styles.fill`：面图层样式工厂默认值
- `config.styles.symbol`：符号图层样式工厂默认值
- `config.styles.raster`：栅格图层样式工厂默认值

---

## 迁移来源

本目录从旧文档 docs/vue-mapLibre-kit知识库/vue-maplibre-kit-全局配置说明.md 拆分迁移，并按 src/entries/config.ts 校对。旧文档只作为迁移来源，新业务文档应以本目录为准。

