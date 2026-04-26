# feature 命令

`businessMap.feature` 同时包含要素查询和要素动作。它是业务页处理选中要素、属性写回、线草稿和线廊替换的主入口。

## 查询要素

```ts
/**
 * 读取当前选中要素。
 * @param businessMap useBusinessMap 返回结果
 * @returns 当前选中要素；没有选中时返回 null
 */
export function getCurrentFeature(businessMap) {
  return businessMap.feature.resolveSelectedFeature();
}
```

常用查询：

- `getFeatureRef(contextOrRefLike)`：从上下文生成来源引用。
- `getSelectedFeatureRef()`：读取当前选中要素来源引用。
- `resolveFeature(featureRef)`：回业务 source 解析最新要素。
- `resolveSelectedFeature()`：解析当前选中要素。
- `resolveSelectedLine()`：解析当前选中线要素。
- `toBusinessContext(context)`：把图层交互上下文转换成业务友好对象。
- `toSelectionBusinessContext(context)`：把选中集变化上下文转换成业务友好对象。

## 属性写回

```ts
/**
 * 保存当前选中要素名称。
 * @param businessMap useBusinessMap 返回结果
 * @param name 最新名称
 * @returns 保存结果
 */
export function saveSelectedName(businessMap, name: string) {
  return businessMap.feature.saveSelectedMapFeatureProperties({
    newProperties: {
      name,
    },
  });
}
```

显式目标写回：

```ts
/**
 * 保存指定要素属性。
 * @param businessMap useBusinessMap 返回结果
 * @param sourceId 业务 source ID
 * @param featureId 业务要素 ID
 * @returns 保存结果
 */
export function saveByRef(businessMap, sourceId: string, featureId: string | number) {
  const featureRef = businessMap.sources.createFeatureRef(sourceId, featureId);

  return businessMap.feature.saveBusinessFeatureProperties({
    featureRef,
    newProperties: {
      status: 'checked',
    },
  });
}
```

## 删除属性

```ts
/**
 * 删除当前选中要素的备注字段。
 * @param businessMap useBusinessMap 返回结果
 * @returns 删除结果
 */
export function removeSelectedRemark(businessMap) {
  return businessMap.feature.removeSelectedMapFeatureProperties({
    propertyKeys: ['remark'],
  });
}
```

属性保存和删除会自动分流到正式业务源或线草稿源。

## TerraDraw 属性

```ts
/**
 * 保存 TerraDraw 要素属性。
 * @param businessMap useBusinessMap 返回结果
 * @param featureId TerraDraw 要素 ID
 * @returns 保存结果
 */
export function saveDrawName(businessMap, featureId: string | number) {
  return businessMap.feature.saveTerradrawFeatureProperties({
    controlType: 'draw',
    featureId,
    newProperties: {
      name: '绘制要素',
    },
  });
}
```

`controlType` 为 `draw` 或 `measure`。测量要素会额外保护测量系统字段。

## 生成线草稿

```ts
/**
 * 根据当前选中线生成延长线草稿。
 * @param businessMap useBusinessMap 返回结果
 * @returns 线草稿动作结果
 */
export function previewSelectedLine(businessMap) {
  return businessMap.feature.previewSelectedLine({
    segmentIndex: 0,
    extendLengthMeters: 20,
  });
}
```

`previewLine()` 支持显式传入 `lineFeature` 和 `featureRef`，适合业务层已经持有目标线的场景。

## 替换线廊

```ts
/**
 * 根据当前选中线替换线廊。
 * @param businessMap useBusinessMap 返回结果
 * @returns 线廊替换结果
 */
export function replaceSelectedCorridor(businessMap) {
  return businessMap.feature.replaceSelectedLineCorridor({
    widthMeters: 5,
  });
}
```

如果目标来自线草稿 source，会替换线廊草稿；如果目标来自正式 source，会整体替换该 source 的要素数组。

## 边界

- `previewLine()` 和 `replaceLineCorridor()` 的距离参数必须大于 `0`。
- 当前未注册线草稿插件时，线草稿相关动作会返回失败结果。
- 属性治理规则由业务 source、线草稿来源或 TerraDraw 控件配置决定。

