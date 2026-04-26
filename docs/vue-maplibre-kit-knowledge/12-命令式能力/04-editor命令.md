# editor 命令

`businessMap.editor` 提供统一属性编辑能力。业务层只需要维护当前编辑目标，不必关心目标来自正式业务 source、线草稿还是 TerraDraw。

## 目标类型

地图要素目标：

```ts
const mapTarget = {
  type: 'map',
  featureRef: businessMap.feature.getSelectedFeatureRef(),
};
```

TerraDraw 目标：

```ts
const drawTarget = {
  type: 'terradraw',
  controlType: 'draw',
  featureId: 'draw-feature-id',
};
```

## 读取编辑器状态

```ts
/**
 * 读取当前编辑目标状态。
 * @param businessMap useBusinessMap 返回结果
 * @param target 当前编辑目标
 * @returns 编辑器状态
 */
export function resolveState(businessMap, target) {
  return businessMap.editor.resolveEditorState(target);
}
```

返回结构：

- `panelState`：适合属性面板渲染的治理结果。
- `rawProperties`：原始属性快照。

## 保存单个字段

```ts
/**
 * 保存单个属性字段。
 * @param businessMap useBusinessMap 返回结果
 * @param target 当前编辑目标
 * @param key 属性名
 * @param value 属性值
 * @returns 保存结果
 */
export function saveItem(businessMap, target, key: string, value: unknown) {
  return businessMap.editor.saveItem(target, {
    key,
    value,
  });
}
```

## 删除单个字段

```ts
/**
 * 删除单个属性字段。
 * @param businessMap useBusinessMap 返回结果
 * @param target 当前编辑目标
 * @param key 属性名
 * @returns 删除结果
 */
export function removeItem(businessMap, target, key: string) {
  return businessMap.editor.removeItem(target, key);
}
```

## 分流规则

- `target.type === 'map'`：调用 `feature.saveBusinessFeatureProperties()` 或 `feature.removeBusinessFeatureProperties()`。
- `target.type === 'terradraw'`：调用 TerraDraw 属性写回能力。
- 线草稿属于 map 目标，但 `featureRef.sourceId` 命中线草稿 source 时会自动分流。

## 边界

- `target` 为空时返回空编辑器状态和失败结果。
- TerraDraw 目标缺少 `featureId` 时不能写回。
- 保存后返回的 `editorState` 已按最新属性重新解析，适合直接刷新面板。

