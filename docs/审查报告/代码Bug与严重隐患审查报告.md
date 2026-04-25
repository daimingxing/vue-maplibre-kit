# 代码 Bug 与严重隐患审查报告

审查日期：2026-04-26

## 1. 审查结论

本次没有发现会让核心地图、插件宿主、业务 source、属性编辑、DXF 导出在现有测试覆盖下直接不可用的 P0 级缺陷。

已执行的自动检查：

- `npm test`：35 个测试文件、159 条测试全部通过
- `npm run build`：Vite library build 与 `vue-tsc -p tsconfig.build.json` 全部通过
- `npm pack --dry-run`：确认 npm 包内容与发布产物结构

但项目打包后存在一个需要优先处理的发布隐患：库样式被抽到 hash CSS 文件中，却没有稳定 CSS 出口。这个问题不会被 TypeScript 或单元测试发现，但会直接影响真实业务项目安装后的地图控件、MapLibre、TerraDraw 样式加载。

## 2. P1 隐患：样式产物没有稳定 npm 消费入口

### 现象

源码中地图根组件依赖三类样式：

- `@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css`
- `maplibre-gl/dist/maplibre-gl.css`
- `vue-maplibre-gl/dist/vue-maplibre-gl.css`

证据：

- `src/MapLibre/core/mapLibre-init.vue:95`
- `src/MapLibre/core/mapLibre-init.vue:681`
- `src/MapLibre/core/mapLibre-init.vue:682`

构建后 CSS 被抽为：

- `dist/assets/vue-maplibre-kit-BbatQbqq.css`

`npm pack --dry-run` 已确认该文件会进入包内，但当前 `package.json` 只导出 JS / 类型子路径，没有 CSS 子路径，也没有 `style` 字段。

证据：

- `package.json:18`
- `package.json:21`
- `vite.config.ts:145`

### 影响

业务项目按 npm 包安装后，可以正常 `import { MapLibreInit } from 'vue-maplibre-kit/business'`，但样式没有稳定路径可引入。

由于包已经配置 `exports`，业务方不能可靠地通过 `vue-maplibre-kit/dist/assets/vue-maplibre-kit-*.css` 这种 hash 路径消费样式。hash 每次构建都可能变化，且该路径不属于公开出口。

实际后果通常表现为：

- 地图容器和控件样式缺失
- TerraDraw / Measure 控件样式异常
- 业务方必须猜 dist 内部文件名，破坏 npm 库的门面边界

### 建议

优先新增稳定 CSS 产物与公开出口，例如：

- 构建固定输出 `dist/style.css`
- `package.json` 增加 `style: "./dist/style.css"`
- `package.json.exports` 增加 `./style.css`
- README 增加真实项目接入示例：`import 'vue-maplibre-kit/style.css'`

## 3. P2 隐患：全局配置 API 容易被误解为运行时热更新

### 现象

全局配置由模块内 `let currentMapGlobalConfig` 保存，`setMapGlobalConfig()` 是整份替换。

证据：

- `src/config.ts:267`
- `src/config.ts:276`
- `src/config.ts:283`

地图初始化、控件、插件、样式工厂通过普通 getter 读取全局配置。

证据：

- `src/MapLibre/shared/map-global-config.ts:19`
- `src/MapLibre/shared/map-global-config.ts:27`
- `src/MapLibre/shared/map-global-config.ts:48`
- `src/MapLibre/core/mapLibre-init.config.ts:23`
- `src/MapLibre/core/mapLibre-init.config.ts:68`

### 影响

启动前注册全局配置是可用的；但如果业务项目在地图已经挂载后再次调用 `setMapGlobalConfig()`，已挂载地图不一定响应更新。

这不是当前测试失败级问题，但 API 名称和“全局配置入口”容易让业务层理解成可以动态修改全局默认值。若真实项目做“切换租户主题、运行时切换控件默认值、运行时统一换底图默认配置”，可能出现“调用成功但旧地图不更新”的认知落差。

### 建议

二选一收口边界：

- 如果只支持启动阶段注册，在文档和函数注释中明确“必须在 `createApp().mount()` 前调用，已挂载实例不会自动热更新”。
- 如果要支持运行时热更新，把全局配置改为响应式源，并为地图实例、控件生命周期、插件默认值定义明确的热更新策略。

## 4. P2 隐患：TerraDraw 控件创建后只热更新部分配置

### 现象

`useTerradrawControlLifecycle()` 的控件创建 watcher 只跟踪：

- 地图是否加载
- 是否存在 map
- `isUse`

证据：

- `src/MapLibre/core/useTerradrawControlLifecycle.ts:236`
- `src/MapLibre/core/useTerradrawControlLifecycle.ts:258`

交互、线装饰、吸附配置有独立 watcher，但控件构造参数本身创建后不会随其他配置变化重建。

证据：

- `src/MapLibre/core/useTerradrawControlLifecycle.ts:263`
- `src/MapLibre/core/useTerradrawControlLifecycle.ts:289`
- `src/MapLibre/core/useTerradrawControlLifecycle.ts:319`

### 影响

业务层如果运行时改变 TerraDraw / Measure 的 `modeOptions`、构造级配置或停靠位置，可能需要先关闭再开启控件才会完全生效。

当前实现已有注释说明“控件只在首次启用时创建一次”，因此这更像边界隐患而不是直接 bug。但如果未来文档宣称控件配置支持动态更新，就会变成真实缺陷。

### 建议

- 文档写清哪些字段支持热更新，哪些字段需要重新创建控件。
- 如果业务需要动态切换构造级配置，增加一个稳定的重建 key 或对关键字段变化执行销毁重建。

## 5. 已确认的稳定点

以下位置本次核对后未发现严重问题：

- 插件宿主已经包含重复插件校验、单例服务校验、插件方法错误隔离、插件 API 失效保护与卸载清理。
  证据：`src/MapLibre/core/useMapPluginHost.ts:193`、`src/MapLibre/core/useMapPluginHost.ts:511`、`src/MapLibre/core/useMapPluginHost.ts:710`、`src/MapLibre/core/useMapPluginHost.ts:736`、`src/MapLibre/core/useMapPluginHost.ts:840`
- 普通图层交互和吸附绑定在销毁时会解绑 map 事件、全局事件和动画帧。
  证据：`src/MapLibre/composables/useMapInteractive.ts:1895`、`src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.ts:918`
- 示例层 `src/views/NG/GI/**` 已经使用 `vue-maplibre-kit`、`vue-maplibre-kit/business`、`vue-maplibre-kit/geometry`、插件子路径等公开出口，没有继续直接依赖 `src/MapLibre/**` 私有实现。
  证据：`src/views/NG/GI/NGGI00.vue:147`、`src/views/NG/GI/NGGI00.vue:188`、`src/views/NG/GI/NGGI00.vue:192`
- `MapLibreInitExpose` 与 `rawHandles` 已作为明确低层逃生口公开，业务层无需直接穿透内部文件。
  证据：`src/MapLibre/core/mapLibre-init.types.ts:48`、`src/MapLibre/core/mapLibre-init.types.ts:90`、`src/MapLibre/core/mapLibre-init.vue:641`

## 6. 后续建议优先级

1. 先修复 CSS 稳定出口，这是发布后最容易立刻踩到的问题。
2. 明确全局配置是否支持运行时热更新，避免 API 语义和实际行为不一致。
3. 明确 TerraDraw / Measure 控件配置的热更新边界。
4. 继续保持当前测试基线，新增发布出口或运行时边界调整后至少执行 `npm test`、`npm run build`、`npm pack --dry-run`。
