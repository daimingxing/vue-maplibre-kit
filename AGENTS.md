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
- `src/geometry.ts` — 几何工具
- `src/plugins/*.ts` — 插件

业务模拟层 `src/views/NG/GI/**` 必须使用包名路径：`vue-maplibre-kit`、`vue-maplibre-kit/business` 等。

## 开发检查清单
新增能力时同步检查：
1. 门面导出是否完整（`src/*.ts`）
2. `package.json` 的 `exports` 是否补充
3. 示例页是否改用公开出口
4. mock 数据是否留在业务模拟层
5. 生成代码后执行一次typeScript检查
6. 遇到意外情况、理解障碍、思维卡点或踩坑时，记录到 `problemRecord.md`。

## 架构要点
- **核心容器**：`src/MapLibre/core/mapLibre-init.vue` 管理地图、控件、绘图、插件
- **插件系统**：`defineMapPlugin()` 定义，`plugins` prop 注册，内置 snap/preview/multi-select/dxf-export
- **关键模式**：Composable 模式、`shallowRef` 避免深响应、描述符数组注册插件
