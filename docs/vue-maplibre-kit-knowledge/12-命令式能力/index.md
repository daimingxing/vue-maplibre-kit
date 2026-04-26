# 命令式能力

命令式能力用于处理运行时动作：临时增删 source/layer、保存属性、删除属性、生成线草稿、替换线廊、调用插件动作、闪烁高亮等。

业务层推荐从 `vue-maplibre-kit/business` 的 `useBusinessMap()` 进入。

```ts
import { useBusinessMap } from 'vue-maplibre-kit/business';
```

## 分组

| 分组 | 职责 |
| --- | --- |
| `sources` | 读取业务 source 注册表、创建来源引用 |
| `selection` | 读取和控制普通图层选中态 |
| `feature` | 查询要素、保存属性、删除属性、生成线草稿、替换线廊 |
| `layers` | 运行时增删 source/layer、改 paint/layout、写 feature-state |
| `editor` | 统一属性编辑器状态、单字段保存、单字段删除 |
| `effect` | feature-state 闪烁动效 |
| `plugins` | snap、lineDraft、intersection、multiSelect、dxfExport 快捷入口 |

## 目录

- [01-useBusinessMap总览.md](./01-useBusinessMap总览.md)
- [02-layers命令.md](./02-layers命令.md)
- [03-feature命令.md](./03-feature命令.md)
- [04-editor命令.md](./04-editor命令.md)
- [05-plugins命令.md](./05-plugins命令.md)

## 使用边界

- 持久业务数据优先放在业务 source 和声明式图层中。
- 命令式适合用户操作后的临时动作和明确的一次性写回。
- 若同一状态需要跨页面、跨刷新稳定存在，不应只依赖命令式图层变更。

