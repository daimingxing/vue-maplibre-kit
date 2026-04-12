# 项目概览
- 项目名称：vue-maplibre-kit。
- 目标：基于 Vue 3 封装 MapLibre GL JS 的 npm 组件库，提供统一地图容器、普通图层交互、TerraDraw 绘制/测量、插件扩展，以及面向业务层的门面能力。
- 技术栈：Vue 3、TypeScript、Vite 库模式、MapLibre GL、vue-maplibre-gl、terra-draw、@watergis/maplibre-gl-terradraw、mitt、lodash-es、turf 部分工具。
- 代码结构：`src/index.ts` 为主门面，`src/geometry.ts` 为几何子入口，`src/plugins/*` 为插件子路径；`src/MapLibre/core` 为核心容器与插件宿主，`src/MapLibre/composables` 为交互/状态工具，`src/MapLibre/facades` 为业务友好门面，`src/MapLibre/plugins` 为插件实现，`src/views/NG/GI/NGGI00.vue` 为业务层示例页。
- 设计原则：npm 库优先、门面模式优先、示例页应通过公开出口消费能力，避免直接依赖内部实现。