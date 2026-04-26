# TerraDraw 原生能力

绘图和测量控件底层来自 `@watergis/maplibre-gl-terradraw` 与 Terra Draw。公开门面不足时，可以通过控件继续获取 TerraDraw 实例。

## 参考资料

- `docs/knowledge-base/maplibre-gl-terradraw/references/api_and_customization.md`
- `docs/knowledge-base/maplibre-gl-terradraw/references/data_and_style.md`
- `docs/knowledge-base/maplibre-gl-terradraw/references/drawing_modes.md`

## 获取实例

```ts
/**
 * 读取 Draw 控件的 TerraDraw 实例。
 * @param mapRef MapLibreInit 公开实例引用
 * @returns TerraDraw 实例；控件未启用时返回 null
 */
export function getDrawInstance(mapRef) {
  const drawControl = mapRef.value?.rawHandles.drawControl || null;
  return drawControl?.getTerraDrawInstance?.() || null;
}
```

测量控件对应：

```ts
/**
 * 读取 Measure 控件的 TerraDraw 实例。
 * @param mapRef MapLibreInit 公开实例引用
 * @returns TerraDraw 实例；控件未启用时返回 null
 */
export function getMeasureInstance(mapRef) {
  const measureControl = mapRef.value?.rawHandles.measureControl || null;
  return measureControl?.getTerraDrawInstance?.() || null;
}
```

## 常见原生动作

```ts
/**
 * 导出当前绘制快照。
 * @param mapRef MapLibreInit 公开实例引用
 * @returns 当前绘制要素列表
 */
export function getDrawSnapshot(mapRef) {
  return getDrawInstance(mapRef)?.getSnapshot?.() || [];
}
```

```ts
/**
 * 切换 TerraDraw 绘制模式。
 * @param mapRef MapLibreInit 公开实例引用
 * @param mode 目标模式
 */
export function setDrawMode(mapRef, mode: string): void {
  getDrawInstance(mapRef)?.setMode?.(mode);
}
```

```ts
/**
 * 导入已有绘制要素。
 * @param mapRef MapLibreInit 公开实例引用
 * @param features TerraDraw 要素列表
 */
export function addDrawFeatures(mapRef, features): void {
  getDrawInstance(mapRef)?.addFeatures?.(features);
}
```

## 数据要求

根据底层知识库，使用 `addFeatures()` 回显数据时，Feature 的 `properties.mode` 很关键。它告诉 TerraDraw 该图形由哪个模式接管，例如 `polygon`、`linestring`、`rectangle`。

## 生命周期注意

- 必须在地图 load 后、控件挂载后访问 TerraDraw 实例。
- 控件没有启用时，对应 control 为 `null`。
- 测量控件和绘图控件是不同实例，不要混用。
- 若通过原生 API 改动图形，业务属性面板和页面状态需要自行同步。

## 优先公开能力

- 读取绘制数据：优先 `mapRef.value.getDrawFeatures()` 或 `getMeasureFeatures()`。
- 属性编辑：优先 `businessMap.editor`。
- 吸附和线装饰：优先全局配置、控件配置和插件配置。

