# useBusinessMap 总览

`useBusinessMap()` 把业务页面最常用的多个门面收口到一个对象里。它不会隐藏 GIS 概念，而是按业务动作分组。

## 初始化

```ts
import { ref } from 'vue';
import {
  MapLibreInit,
  createMapBusinessSourceRegistry,
  useBusinessMap,
} from 'vue-maplibre-kit/business';

const mapRef = ref<InstanceType<typeof MapLibreInit> | null>(null);
const sourceRegistry = createMapBusinessSourceRegistry([]);

const businessMap = useBusinessMap({
  mapRef,
  sourceRegistry,
});
```

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
- `plugins.multiSelect`
- `plugins.dxfExport`

## 推荐查找顺序

1. 先看 `selection`，确认当前选中了什么。
2. 需要读写要素，找 `feature`。
3. 需要画属性面板，找 `editor`。
4. 需要临时改图层样式或 feature-state，找 `layers` 或 `effect`。
5. 需要插件动作，找 `plugins`。
6. 以上都不够时，再看底层逃生通道。

