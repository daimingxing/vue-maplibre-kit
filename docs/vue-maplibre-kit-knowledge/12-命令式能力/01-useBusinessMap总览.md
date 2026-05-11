# useBusinessMap 总览

`useBusinessMap()` 把业务页面最常用的多个门面收口到一个对象里。它不会隐藏 GIS 概念，而是按业务动作分组。

## 初始化

```ts
import { shallowRef } from "vue";
import {
  MapLibreInit,
  createMapBusinessSourceRegistry,
  useBusinessMap,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";

const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const sourceRegistry = createMapBusinessSourceRegistry();

const businessMap = useBusinessMap({
  mapRef: () => mapRef.value,
  sourceRegistry,
});
```

`sourceRegistry` 是业务 source 的统一目录，不是 MapLibre 原生 source。它负责把 `sourceId`、GeoJSON 要素、属性规则和 `sourceId + featureId` 来源引用收口起来。`useBusinessMap()` 当前要求显式传入它，因为 `sources`、`feature`、`editor` 以及依赖业务数据的插件会通过它读取或写回正式业务要素。

如果页面只是临时控制图层、动效，或只读取不依赖业务数据的插件状态，也可以创建一个暂时没有 source 的注册表：

```ts
const sourceRegistry = createMapBusinessSourceRegistry();
```

这种写法表示当前页面暂时没有正式业务 source；后续可以通过 `sourceRegistry.addSource(source)` 或 `sourceRegistry.setSources(sources)` 注册数据。`layers`、`effect` 和部分插件状态仍可使用，但业务要素查询、属性编辑、自动交点候选和 DXF 导出不会凭空得到数据。

## 分组说明

### `sources`

- `registry`：当前业务 source 注册表。
- `getSource(sourceId)`：读取单个业务 source。
- `listSources()`：列出全部业务 source。
- `createFeatureRef(sourceId, featureId, layerId)`：创建标准来源引用。

### `selection`

用于普通业务图层的选中态：

- `isActive`、`selectionMode`、`selectedCount`、`selectedFeatures`
- `activate()`、`deactivate()`、`toggle()`、`clear()`
- `getSelectedFeatureIds()`、`getSelectedPropertyValues()`、`groupSelectedFeaturesByLayer()`

### `feature`

合并查询和动作能力：

- 查询：`getFeatureRef()`、`getSelectedFeatureRef()`、`resolveFeature()`、`resolveSelectedLine()`
- 属性：`saveBusinessFeatureProperties()`、`removeBusinessFeatureProperties()`、`saveSelectedMapFeatureProperties()`
- 线工具动作：`previewLine()`、`previewSelectedLine()`、`replaceLineCorridor()`、`replaceSelectedLineCorridor()`
- 草稿清理：`clearLineDraft()`

### `layers`

运行时图层动作：

- `hasSource()`、`addGeoJsonSource()`、`removeSource()`
- `hasLayer()`、`addLayer()`、`removeLayer()`
- `show()`、`hide()`、`setVisible()`
- `setPaint()`、`setLayout()`、`setFeatureState()`

### `editor`

统一属性编辑：

- `resolveEditorState(target)`
- `saveItem(target, payload)`
- `removeItem(target, key)`

### `effect`

基于 feature-state 的闪烁能力：

- `startFlash()`
- `stopFlash()`
- `clearFlash()`
- `flashingTargets`、`hasFlashing`

### `plugins`

插件短路径：

- `plugins.snap`
- `plugins.lineDraft`
- `plugins.intersection`
- `plugins.polygonEdge`
- `plugins.multiSelect`
- `plugins.dxfExport`

## 推荐查找顺序

1. 先看 `selection`，确认当前选中了什么。
2. 需要读写要素，找 `feature`。
3. 需要画属性面板，找 `editor`。
4. 需要临时改图层样式或 feature-state，找 `layers` 或 `effect`。
5. 需要插件动作，找 `plugins`。
6. 以上都不够时，再看底层逃生通道。
