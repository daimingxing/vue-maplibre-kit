# AGENTS.md
Vue 3 组件库，封装 MapLibre GL JS，插件化架构，ES 模块多入口发布。

## 项目状态
**未发布**，可随意重构，优先架构合理性而非向后兼容。

## 核心原则

### npm 库优先
- 本项目是组件库，所有设计服务于"外部项目消费"
- 判断标准：真实项目安装后，能否仅依赖公开出口完成接入

### 门面模式
对外能力通过门面暴露，内部实现 `src/MapLibre/**` 禁止直接引用：
- `src/index.ts` — 主入口
- `src/business.ts` — 业务专用（推荐）
- `src/config.ts` — 全局配置入口
- `src/geometry.ts` — 几何工具
- `src/plugins.ts` — 插件聚合入口（推荐）
- `src/plugins/*.ts` — 插件
- `src/entries/*.ts` — 主题化公开入口源码，根入口文件只做薄转发

业务模拟层 `examples/views/NG/GI/**` 必须使用包名路径：`vue-maplibre-kit`、`vue-maplibre-kit/business`、`vue-maplibre-kit/plugins` 等。
`examples/views/NG/GI/NGGI00.vue`文件是模拟真实项目引入该npm包的功能验证页面。

## 开发检查清单
新增能力时同步检查：
1. 门面导出是否完整（`src/*.ts`）
2. `package.json` 的 `exports` 是否补充
3. Vite、Vitest、TypeScript paths 是否补充对应公开出口别名
4. 示例页是否改用公开出口
5. mock 数据是否留在业务模拟层
6. 生成代码后执行一次typeScript检查
7. 遇到意外情况、理解障碍、思维卡点或踩坑时，记录到 `docs/problem-record.md`。

## 架构要点
- **核心容器**：`src/MapLibre/core/mapLibre-init.vue` 管理地图、控件、绘图、插件
- **插件系统**：`defineMapPlugin()` 定义，`plugins` prop 注册，内置 snap、line-draft、intersection、multi-select、dxf-export 等插件
- **业务插件入口**：业务层优先用 `vue-maplibre-kit/plugins` 的 `createBusinessPlugins()` 注册常用插件，单插件子路径只保留给深度定制、常量和高级类型
- **业务插件读取**：业务层统一通过 `useBusinessMap().plugins.*` 读取 snap、line-draft、intersection、multi-select、dxf-export 等插件状态与动作；不要再从业务入口公开单插件 `use*` 读取门面
- **关键模式**：Composable 模式、`shallowRef` 避免深响应、描述符数组注册插件

## 项目导读
- [文件索引导读](docs/file-index.md)
- [问题记录](docs/problem-record.md)
