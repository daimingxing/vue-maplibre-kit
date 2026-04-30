# dxfExport 导出 DXF

dxfExport 插件负责从业务 source 注册表读取 GeoJSON 要素，生成 DXF 文本或触发下载。推荐通过 `createBusinessPlugins({ dxfExport: ... })` 注册，通过 `useBusinessMap().plugins.dxfExport` 读取状态和导出动作。

## 推荐注册

```ts
import {
  createBusinessPlugins,
  type MapDxfExportTaskOptions,
  type MapDxfFeatureTrueColorResolver,
  type MapDxfLayerNameResolver,
  type MapDxfLayerTrueColorResolver,
} from "vue-maplibre-kit/plugins";

/**
 * 按业务要素生成 DXF 图层名。
 * @param feature 当前导出的 GeoJSON 要素
 * @param sourceId 当前要素来源 sourceId
 * @returns DXF 图层名
 */
const getLayerName: MapDxfLayerNameResolver = (feature, sourceId) => {
  const kind = String(feature.properties?.kind || "unknown");
  return `${sourceId}-${kind}`;
};

/**
 * 按 DXF 图层名返回图层默认颜色。
 * @param layerName 当前 DXF 图层名
 * @returns 图层默认 TrueColor
 */
const getLayerColor: MapDxfLayerTrueColorResolver = (layerName) => {
  if (layerName.endsWith("-line")) {
    return "#0F766E";
  }

  return undefined;
};

/**
 * 按单个要素返回实体级覆盖颜色。
 * @param feature 当前导出的 GeoJSON 要素
 * @returns 要素级 TrueColor；返回 undefined 时沿用图层色
 */
const getFeatureColor: MapDxfFeatureTrueColorResolver = (feature) => {
  return feature.properties?.id === "line-b" ? "#22C55E" : undefined;
};

const defaults: MapDxfExportTaskOptions = {
  sourceIds: null,
  fileName: "business-map.dxf",
  layerNameResolver: getLayerName,
  layerTrueColorResolver: getLayerColor,
  featureTrueColorResolver: getFeatureColor,
  lineWidth: 2,
  pointMode: "circle",
  pointRadius: 0.003,
};

const plugins = createBusinessPlugins({
  sourceRegistry: registry,
  dxfExport: {
    enabled: true,
    defaults,
    control: {
      enabled: true,
      position: "top-right",
      label: "导出 DXF",
    },
  },
});
```

上面三个 resolver 的职责分别是生成图层名、返回图层默认颜色、返回单要素覆盖颜色。

简写注册：

```ts
const plugins = createBusinessPlugins({
  sourceRegistry: registry,
  dxfExport: true,
});
```

扁平任务参数写法：

```ts
const plugins = createBusinessPlugins({
  sourceRegistry: registry,
  dxfExport: {
    control: { enabled: false },
    sourceCrs: "EPSG:4326",
    targetCrs: "EPSG:3857",
    fileName: "business.dxf",
  },
});
```

## 配置重点

- `sourceRegistry` 是必需配置，推荐放在 `createBusinessPlugins()` 顶层，插件通过它读取业务 source。
- `dxfExport: true` 使用顶层 `sourceRegistry`、库内默认值和全局 DXF 默认值。
- `defaults` 是页面级默认导出参数，可覆盖 DXF 模块的全局默认值。
- `sourceCrs`、`targetCrs`、`fileName` 等任务默认值可以扁平写在业务预设层，最终会合并进 `defaults`。
- `control.enabled` 控制是否渲染内置导出控件。
- `sourceIds` 为 `null` 时导出全部业务 source；传数组时只导出指定 source。
- `featureFilter` 可按业务字段过滤要素。
- `layerNameResolver` 可按要素和来源生成 DXF 图层名。
- `layerTrueColorResolver` 设置 DXF 图层颜色。
- `featureTrueColorResolver` 对单个实体覆盖颜色。
- `lineWidth`、`pointMode`、`pointRadius` 控制几何样式。

## 状态读取

```ts
const dxfExport = businessMap.plugins.dxfExport;

dxfExport.isExporting.value;
dxfExport.lastFileName.value;
dxfExport.lastFeatureCount.value;
dxfExport.lastEntityCount.value;
dxfExport.lastWarnings.value;
dxfExport.lastError.value;
```

## 命令式动作

```ts
/**
 * 导出当前业务 source 的 DXF 文本。
 * @returns 无返回值
 */
async function exportDxf(): Promise<void> {
  const result = await dxfExport.exportDxf({
    sourceIds: [sourceId],
    fileName: "line-only.dxf",
    lineWidth: 6,
  });

  message.value = result
    ? `DXF 已生成：${result.fileName}`
    : "DXF 导出插件未注册";
}
```

常用动作：

- `exportDxf(overrides)`：生成 DXF 文本，返回文件名、内容、来源数量、要素数量、实体数量和警告。
- `downloadDxf(overrides)`：生成并下载 DXF 文件。
- `getResolvedOptions(overrides)`：读取本次最终生效的导出配置，适合调试和参数面板展示。

## 生成要素与 generatedKind

dxfExport 只读取业务 source 并输出 DXF 文本或文件，不创建地图预览要素，也不会写入 `context.generatedKind`。导出结果应通过 `lastFeatureCount`、`lastEntityCount`、`lastWarnings` 和 `exportDxf()` 返回值判断。

## 示例引用

- `examples/views/NG/GI/NGGI11.vue`：全部导出、下载、管线过滤导出、图层名和颜色解析器。
- `examples/views/NG/GI/NGGI06.vue`：业务插件总览中的 `businessMap.plugins.dxfExport.exportDxf()`。

## 风险提示

- DXF 导出依赖 `sourceRegistry` 中的业务数据；只注册图层但没有业务 source，无法得到完整导出结果。
- `pointRadius` 使用地图坐标单位，不是像素；真实项目应结合坐标系和 CAD 查看习惯调整。
- `featureFilter`、颜色 resolver 和图层名 resolver 都运行在前端，复杂业务规则应保持可解释，避免和后端导出规则产生差异。
