# 面边线预览插件与生成要素元数据统一设计

## 背景

本次迭代围绕两个目标展开：

1. 新增 `polygon-edge-preview` 插件，把面要素边界转换为纯临时预览线，用于边界高亮、单边状态变化和吸附。
2. 统一草稿线、线廊草稿、交点插件和面边线插件生成要素的元数据字段，减少业务层和内部门面识别临时要素时的分支。

项目当前未发布，可以优先保证架构一致性。外部业务仍应通过 `vue-maplibre-kit/plugins` 注册插件，通过 `useBusinessMap().plugins.*` 读取插件状态和动作。

## 范围

本次纳入范围：

- 新增独立插件 `polygon-edge-preview`。
- `createBusinessPlugins()` 支持顶层 `polygonEdge` 配置。
- `useBusinessMap().plugins.polygonEdge` 暴露面边线插件能力。
- 全局配置增加面边线插件默认样式。
- `snap` 插件增加 `polygonEdge` 和 `intersection` 两个具名内置吸附目标配置。
- `snap` 插件把现有 `ordinaryLayers` 命名收敛为 `businessLayers`，用于表达普通业务图层吸附。
- 草稿线、线廊草稿、交点插件、面边线插件统一生成要素元数据字段。
- 更新 `docs/vue-maplibre-kit-knowledge/11-全局配置` 和插件知识库。

本次不纳入范围：

- 面边线写回正式业务 source。
- TerraDraw 内部绘制中要素之间的完整互相吸附索引。
- 将面边线导出到 DXF 的正式业务语义。

## 核心结论

面边界高亮使用临时预览线实现。相比直接依赖 `fill-outline-color`，临时 `LineString` 图层可以更稳定地支持虚线、加粗、hover、selected、highlighted、单边状态和吸附。

`polygon-edge-preview` 应独立于 `line-draft-preview`。线草稿插件继续负责线延长和线廊草稿，面边线插件负责由 Polygon / MultiPolygon 派生出的临时边线。两者都属于插件生成要素，但生命周期和业务语义不同。

## GeoJSON ring 约定

GeoJSON 的 `Polygon.coordinates` 是 ring 数组。每个 ring 是一个闭合坐标数组。

```json
{
  "type": "Feature",
  "properties": {
    "id": "land-1"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0]
      ],
      [
        [3, 3],
        [7, 3],
        [7, 7],
        [3, 7],
        [3, 3]
      ]
    ]
  }
}
```

约定：

- `coordinates[0]` 是外环，即面的外轮廓。
- `coordinates[1]` 及后续项是内环洞，即面内部被挖掉的区域边界。
- `ringIndex = 0` 表示外环。
- `ringIndex > 0` 表示内环洞。

`MultiPolygon` 比 `Polygon` 多一层面数组，`polygonIndex` 表示第几个子面。普通 `Polygon` 的 `polygonIndex` 固定为 `0`。

插件需要支持三个粒度的状态变化：

- 整个面：同一个 `polygonId` 下全部边线。
- 单个 ring：同一个 `ringId` 下全部边线。
- 单条 edge：同一个 `edgeId` 对应的一条边。

## 插件生成要素统一字段

保留 `generatedKind`，不新增 `generatedBy`。`generatedKind` 足够表达生成来源类型，避免字段语义重复。

统一字段采用扁平结构：

```ts
{
  generatedKind: "polygon-edge-preview",
  generatedGroupId: "polygon-edge::source-a::land-1",
  generatedParentSourceId: "source-a",
  generatedParentFeatureId: "land-1",
  generatedParentLayerId: "land-fill-layer"
}
```

字段含义：

- `generatedKind`：生成要素类型，例如 `line-extension-draft`、`line-corridor-draft`、`intersection-preview`、`intersection-materialized`、`polygon-edge-preview`。
- `generatedGroupId`：同一组生成要素的稳定分组 ID。一个面生成的多条边线共享同一个分组 ID，便于整体高亮、清理和统计。
- `generatedParentSourceId`：来源正式业务 source ID。
- `generatedParentFeatureId`：来源正式业务要素 ID。
- `generatedParentLayerId`：来源命中图层 ID。

迁移策略：

- 新增统一 helper，例如 `buildGeneratedFeatureProperties()` 和 `extractGeneratedParentRef()`。
- 新代码统一写入新字段。
- 草稿线、线廊草稿和交点插件读取来源时优先读新字段。
- 为防止迁移过程中破坏现有能力，内部读取逻辑短期兼容旧字段。
- 属性面板、查询、动作门面、吸附规则和插件交互都应通过统一 helper 判断插件生成要素。

## 面边线插件数据模型

插件按“每条边一个 `LineString` feature”生成临时边线。这样可以同时支持整体高亮、ring 高亮和单边高亮。

面边线要素额外字段：

```ts
{
  generatedKind: "polygon-edge-preview",
  generatedGroupId: "polygon-edge::source-a::land-1",
  edgeId: "edge::source-a::land-1::0::1::3",
  ringId: "ring::source-a::land-1::0::1",
  polygonId: "polygon::source-a::land-1",
  polygonIndex: 0,
  ringIndex: 1,
  edgeIndex: 3,
  isOuterRing: false
}
```

业务 API 以 `edgeId`、`ringId`、`polygonId` 为主。`polygonIndex`、`ringIndex`、`edgeIndex` 主要用于调试和回调解释，不要求业务侧自己数坐标。

生成规则：

- 支持 `Polygon` 和 `MultiPolygon`。
- 忽略连续重复点造成的零长度边。
- 若 ring 未闭合，插件内部按首尾闭合处理，但保留原始面要素不变。
- 若面要素缺少可稳定识别的来源引用，生成 API 返回失败结果。

## 插件 API

注册方式：

```ts
import { createBusinessPlugins } from "vue-maplibre-kit/plugins";

const plugins = createBusinessPlugins({
  polygonEdge: true
});
```

页面局部样式配置：

```ts
const plugins = createBusinessPlugins({
  polygonEdge: {
    style: {
      normal: { color: "#409eff", width: 3, opacity: 0.9 },
      hover: { color: "#f56c6c", width: 5 },
      selected: { color: "#e6a23c", width: 6 },
      highlighted: { color: "#67c23a", width: 5 }
    },
    styleRules: [
      {
        where: { type: "boundary" },
        style: {
          normal: { color: "#ff7a00", width: 4 }
        }
      }
    ]
  }
});
```

`style` 配置统一默认样式、hover 样式、selected 样式和 highlighted 样式。`styleRules` 匹配来源面要素的属性或来源信息，不使用运行后才生成的 `edgeId` 或 `ringId`。

业务读取方式：

```ts
const businessMap = useBusinessMap({ mapRef, sourceRegistry });
const polygonEdge = businessMap.plugins.polygonEdge;
```

建议暴露能力：

- `generateFromFeature(options)`：从显式面要素生成边线。
- `generateFromSelected()`：从当前选中面生成边线。
- `highlightPolygon(polygonId)`：高亮整个面的边线。
- `highlightRing(ringId)`：高亮单个 ring。
- `highlightEdge(edgeId)`：高亮单条边。
- `selectEdge(edgeId)`：选中单条边。
- `clearHighlight()`：清理高亮状态。
- `clear()`：清空全部边线。
- `getData()`：读取当前临时边线数据。

交互回调上下文应直接提供 `edgeId`、`ringId`、`polygonId`、`isOuterRing`、来源引用和当前边线 feature，避免业务侧反查。

## 全局配置

全局配置需要在 `src/entries/config.ts` 的插件默认值中增加 `polygonEdge` 分组。

示例：

```ts
setMapGlobalConfig({
  plugins: {
    polygonEdge: {
      style: {
        normal: { color: "#409eff", width: 3, opacity: 0.9 },
        hover: { color: "#f56c6c", width: 5 },
        selected: { color: "#e6a23c", width: 6 },
        highlighted: { color: "#67c23a", width: 5 }
      }
    }
  }
});
```

合并顺序：

1. 插件内置默认值。
2. 全局 `plugins.polygonEdge` 默认值。
3. 页面局部 `createBusinessPlugins({ polygonEdge })` 配置。

全局配置文档需要更新 `docs/vue-maplibre-kit-knowledge/11-全局配置`，尤其是插件默认值章节和索引。

`plugins.snap` 全局配置只放应用级通用默认值，例如吸附容差、预览样式、TerraDraw / Measure 默认值，以及 `intersection`、`polygonEdge` 这类插件内置吸附目标默认值。普通业务图层吸附规则不放到全局配置中，因为业务图层 `layerId` 通常属于页面级 source / layer 绑定，提升到全局容易让不同业务页面互相污染。

现有知识库中 `plugins.snap` 没有普通业务图层吸附示例，不是漏写示例，而是当前源码不支持把 `ordinaryLayers` 配到全局。本次实现需要把文档说清楚：普通业务图层吸附规则通过页面局部 `createBusinessPlugins({ snap: { businessLayers } })` 配置。

## 吸附配置

`snap` 插件新增具名内置吸附目标配置，不使用 `builtInTargets`。

```ts
createBusinessPlugins({
  snap: {
    polygonEdge: {
      enabled: true,
      priority: 80,
      snapTo: ["vertex", "segment"]
    },
    intersection: {
      enabled: true
    },
    businessLayers: {
      enabled: true,
      rules: []
    }
  },
  polygonEdge: true
});
```

`snap.polygonEdge` 表示面边线临时图层是否参与吸附，以及它的内置吸附规则配置。`createBusinessPlugins` 顶层 `polygonEdge` 表示是否注册面边线插件，两者含义不同。

`businessLayers` 表示普通业务图层吸附。它替代当前实现里的 `ordinaryLayers` 命名，原因是项目里业务 source、业务 layer 已经统一使用 business 语义，`ordinary` 既不够直观，也和现有命名体系不一致。项目尚未发布，本次可以直接把公开配置命名收敛到 `businessLayers`。如实现阶段需要降低内部迁移风险，可以只在内部短期兼容旧字段，公开文档和新测试统一使用 `businessLayers`。

类型建议：

```ts
businessLayers?: {
  enabled?: boolean;
  rules: MapFeatureSnapRule[];
};

polygonEdge?: boolean | {
  enabled?: boolean;
  priority?: number;
  tolerancePx?: number;
  snapTo?: ("vertex" | "segment")[];
}
```

交点吸附也收敛为同类配置：

```ts
intersection?: boolean | {
  enabled?: boolean;
  priority?: number;
  tolerancePx?: number;
}
```

默认行为：

- 启用 `snap` 后，`intersection` 默认参与吸附。
- 启用 `snap` 且注册 `polygonEdge` 后，面边线默认参与吸附。
- 普通业务图层吸附需要页面局部提供 `businessLayers.rules` 或业务预设简写 `layerIds`。
- 业务可通过 `snap.polygonEdge.enabled = false` 关闭边线吸附。

## 公开入口

新增或调整公开入口：

- `src/plugins.ts` 继续聚合导出。
- `src/plugins/polygon-edge-preview.ts` 暴露高级入口。
- `src/entries/plugins.ts` 导出面边线插件工厂、常量和类型。
- `src/business.ts` 和 `src/entries/business.ts` 通过 `useBusinessMap()` 暴露 `plugins.polygonEdge`。
- `package.json` 增加 `./plugins/polygon-edge-preview` 子路径。
- Vite、Vitest、TypeScript paths 同步公开出口别名。

业务模拟层继续只使用包名路径，例如 `vue-maplibre-kit/plugins` 和 `vue-maplibre-kit/business`。

## 样式与状态

面边线图层使用 line layer。样式分四类状态：

- `normal`：默认边线。
- `hover`：鼠标悬停边线。
- `selected`：当前选中边线。
- `highlighted`：业务主动高亮的 polygon、ring 或 edge。

状态优先级建议：

1. selected
2. hover
3. highlighted
4. normal

特定来源面样式通过 `styleRules` 匹配来源面属性。运行时状态变化通过插件 API 和 feature-state 管理。

## 错误处理

生成失败应返回结构化结果，不抛出业务可恢复错误。

常见失败原因：

- 当前未选中面要素。
- 当前要素不是 `Polygon` 或 `MultiPolygon`。
- 来源引用缺少 sourceId 或 featureId。
- 坐标不足以生成有效边线。
- 插件未启用。

交互回调和样式规则中的业务自定义函数应被保护。若业务函数抛错，插件跳过当前规则并输出中文警告，避免中断地图交互链路。

## 测试计划

单元测试：

- `Polygon` 外环转边线。
- `Polygon` 内环洞转边线。
- `MultiPolygon` 转边线并正确生成 `polygonIndex`。
- 零长度边过滤。
- `edgeId`、`ringId`、`polygonId`、`generatedGroupId` 稳定生成。
- `style` 与 `styleRules` 合并和匹配。
- hover、selected、highlighted 状态优先级。
- `snap.polygonEdge` 默认启用和显式关闭。
- `snap.intersection` 从强制内置规则迁移为具名配置后仍默认启用。
- `snap.businessLayers` 替代 `snap.ordinaryLayers`，页面局部普通业务图层吸附仍可正常命中。
- `plugins.snap` 全局配置不接收业务图层规则，避免页面专属 layerId 进入应用级默认值。
- 草稿线、线廊草稿、交点插件写入统一生成字段。
- 旧字段兼容读取不破坏 `useMapFeatureActions`、属性编辑和选中查询。

集成或示例验证：

- `examples/views/NG/GI/NGGI00.vue` 使用公开入口注册插件。
- 选中面后生成临时边线。
- 整体边线、ring、单边 hover 和 selected 样式变化正常。
- 绘线或画面时可吸附到临时边线。
- 关闭 `snap.polygonEdge.enabled` 后不再吸附临时边线。

自动检查：

- 执行 TypeScript 检查。
- 执行现有 Vitest 测试。
- 若测试中发现架构踩坑或理解障碍，记录到 `docs/problem-record.md`。

## 文档更新

需要更新：

- `docs/file-index.md`：增加面边线插件定位。
- `docs/vue-maplibre-kit-knowledge/02-公开入口/03-plugins插件入口.md`：增加 `polygonEdge`。
- `docs/vue-maplibre-kit-knowledge/02-公开入口/06-插件子路径.md`：增加高级入口。
- `docs/vue-maplibre-kit-knowledge/09-插件`：新增面边线插件文档，并调整 snap 文档。
- `docs/vue-maplibre-kit-knowledge/11-全局配置`：增加 `plugins.polygonEdge` 全局样式配置，并明确 `plugins.snap` 全局配置不包含普通业务图层规则。
- 示例页说明继续强调 `createBusinessPlugins()` 注册和 `useBusinessMap().plugins.*` 读取。

## 验收标准

- 业务可以通过 `createBusinessPlugins({ polygonEdge: true })` 启用默认面边线插件。
- 业务可以通过 `createBusinessPlugins({ polygonEdge: { style, styleRules } })` 覆盖页面局部样式。
- 业务可以通过全局配置设置面边线默认样式。
- 业务可以通过 `useBusinessMap().plugins.polygonEdge` 生成、清理、高亮和选择临时边线。
- 面边线不会写回正式业务 source。
- 面边线默认可被 snap 插件吸附，且可通过 `snap.polygonEdge.enabled = false` 关闭。
- 交点吸附配置收敛为 `snap.intersection` 后保持默认可吸附。
- 普通业务图层吸附公开配置命名为 `snap.businessLayers`，不再使用 `ordinaryLayers` 作为推荐文档名称。
- 全局 `plugins.snap` 文档明确说明普通业务图层规则应放在页面局部配置，而不是全局配置。
- 草稿线、线廊草稿、交点插件和面边线插件生成要素均写入统一元数据字段。
- 现有草稿线、交点、属性编辑、选中查询和吸附测试不回退。
