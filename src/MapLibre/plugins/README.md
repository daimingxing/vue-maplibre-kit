# `plugins` 导读

`plugins` 负责 **插件内部实现**。公开入口在 `src/plugins/*.ts`，这里存放插件真实的运行时逻辑。

## 先看哪几个文件

1. `types.ts`
2. 各插件目录的 `index.ts`
3. 各插件目录的 `use*Plugin.ts`
4. 再按需看 controller、service、store

## 什么时候进入这里

- 想看插件契约长什么样
- 想看插件实例如何创建和暴露 API
- 想看具体插件如何管理状态、交互和渲染

## 目录速览

- `types.ts`：插件系统公共契约
- `line-draft-preview`：线草稿预览插件
- `map-feature-snap`：吸附插件
- `map-feature-multi-select`：多选插件
- `intersection-preview`：交点预览插件
- `map-dxf-export`：DXF 导出插件

## 联动阅读

- 看插件公开入口：`src/plugins/*.ts`
- 看插件宿主：`src/MapLibre/core/useMapPluginHost.ts`
- 看业务层如何读取插件 API：`src/MapLibre/facades/mapPluginResolver.ts`

## 不建议先从这里找的问题

- 业务层先该调用什么：去 `facades`
- 地图宿主和控件生命周期：去 `core`
