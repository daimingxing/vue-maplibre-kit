# NGGI00 到 NGGI11

适合：逐页理解示例覆盖范围的开发者。

先读：[示例索引](index.md)。

## `NGGI00` 完整业务验证页

演示地图初始化、业务 source/layer、属性面板、Popup、feature-state、绘图测量、snap、lineDraft、intersection、multiSelect、dxfExport 和底层逃生通道。

它适合当“完整真实项目接入参考”，但文件较大，不建议初学者从这里开始。

## `NGGI01` 最小地图

演示 `MapLibreInit`、`mapRef`、加载状态和基础交互配置。适合作为第一份可运行地图骨架。

## `NGGI02` 业务 source 和图层

演示声明式业务数据源、图层渲染、响应式新增、更新、删除要素，以及运行时命令式 source/layer。

## `NGGI03` 图层样式

演示图层显隐、paint 更新、hover 样式、selected 样式，以及通过 `feature-state + 表达式` 实现状态变化。

## `NGGI04` 交互弹窗

演示点击要素、点击空白、读取点击要素属性，并通过 `MglPopup` 展示业务详情。

## `NGGI05` 属性编辑

演示点击特定要素后展示该要素属性和 `propertyPolicy`，再保存或删除该要素的属性。

## `NGGI06` 插件总览

演示通过 `createBusinessPlugins()` 注册五个插件，并通过 `businessMap.plugins.*` 读取插件状态和动作。

## `NGGI07` snap 吸附

演示吸附规则、普通业务图层吸附、容差、优先级和吸附预览样式。

## `NGGI08` lineDraft 线草稿

演示获取选中线段、生成延长线草稿、生成线廊面、修改草稿属性、删除草稿属性和读取完整 GeoJSON。

## `NGGI09` intersection 交点

演示刷新交点预览、生成正式交点、设置交点属性、删除正式点和读取完整 GeoJSON。

## `NGGI10` multiSelect 多选

演示激活多选、清空选中、读取选中要素和 selected 样式变化。

## `NGGI11` dxfExport 导出 DXF

演示生成 DXF 文本、下载 DXF、按 source 过滤导出、配置图层名 resolver、图层颜色 resolver、要素颜色 resolver 和 CRS。
