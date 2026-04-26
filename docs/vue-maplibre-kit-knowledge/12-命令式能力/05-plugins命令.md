# plugins 命令

`businessMap.plugins` 是五个内置插件能力的短路径。业务层应优先从这里调用插件动作，而不是从业务入口单独引多个 `use*`。

## snap

```ts
businessMap.plugins.snap.clearPreview();
businessMap.plugins.snap.resolveMapEvent(event);
businessMap.plugins.snap.resolveTerradrawSnapOptions('draw', {
  enabled: true,
  tolerancePx: 12,
});
```

适合高级页面主动解析吸附结果。普通绘制流程通常只需要注册插件和配置吸附。

## lineDraft

```ts
businessMap.plugins.lineDraft.hasFeatures.value;
businessMap.plugins.lineDraft.featureCount.value;
businessMap.plugins.lineDraft.getData();
businessMap.plugins.lineDraft.clear();
```

生成延长线草稿和替换线廊草稿通常优先用 `businessMap.feature.previewLine()`、`businessMap.feature.replaceLineCorridor()`。

## intersection

```ts
businessMap.plugins.intersection.refresh();
businessMap.plugins.intersection.setScope('selected');
businessMap.plugins.intersection.materialize();
businessMap.plugins.intersection.clearMaterialized();
```

常用状态：

- `count`
- `materializedCount`
- `visible`
- `scope`
- `selectedId`
- `lastError`

## multiSelect

```ts
businessMap.plugins.multiSelect.activate();
businessMap.plugins.multiSelect.deactivate();
businessMap.plugins.multiSelect.toggle();
businessMap.plugins.multiSelect.clear();
```

如果只需要普通选中态，优先看 `businessMap.selection`。多选插件分组适合读取插件自身状态或调用插件按钮行为。

## dxfExport

```ts
/**
 * 下载当前地图 DXF。
 * @param businessMap useBusinessMap 返回结果
 */
export async function downloadDxf(businessMap) {
  await businessMap.plugins.dxfExport.downloadDxf({
    fileName: 'current-map.dxf',
  });
}
```

常用能力：

- `exportDxf(overrides)`：生成 DXF 文本。
- `downloadDxf(overrides)`：直接下载文件。
- `getResolvedOptions(overrides)`：读取最终导出参数。
- `lastWarnings`、`lastError`：读取最近一次导出诊断信息。

## 与插件专题的关系

本页只列命令式入口。插件的注册方式、配置项、交互回调和业务示例，应查看插件专题文档。业务层统一遵循：

```txt
注册插件 -> 从 businessMap.plugins.* 读取状态和动作 -> 必要时用单次 overrides 覆盖
```

