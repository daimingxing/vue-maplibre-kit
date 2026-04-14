/**
 * vue-maplibre-kit 根入口。
 * 建议业务页面优先按下面顺序找能力：
 * 1. `MapLibreInit`：挂载地图根组件
 * 2. `useBusinessMap`：读取高频业务聚合门面
 * 3. `createMapBusinessSource` / `createMapBusinessSourceRegistry`：组织业务数据源
 * 4. `createCircleBusinessLayer` 等：声明业务图层
 * 5. 其他低层门面：按需细分接入
 */

/** 地图根组件。负责承载整个地图实例与插件宿主。 */
export { default as MapLibreInit } from './MapLibre/core/mapLibre-init.vue';

/** 地图弹窗组件。适合展示点击、悬停或选中要素的轻量信息。 */
export { default as MglPopup } from './MapLibre/core/mgl-popup.vue';

/** feature-state 补丁类型。用于描述一次状态更新要写入的字段集合。 */
export type { MapFeatureStatePatch } from './MapLibre/core/mapLibre-init.types';

/** feature-state 目标类型。用于描述状态更新要作用到哪个 source / feature。 */
export type { MapFeatureStateTarget } from './MapLibre/core/mapLibre-init.types';

/** 地图根组件公开实例类型。业务层拿 `mapRef` 时通常会用到它。 */
export type { MapLibreInitExpose } from './MapLibre/core/mapLibre-init.types';

/** 地图插件定义入口。自定义插件时先从这里声明插件描述。 */
export { defineMapPlugin } from './MapLibre/plugins/types';

/** 任意插件描述对象类型。适合声明插件列表或做插件级泛型约束。 */
export type { AnyMapPluginDescriptor } from './MapLibre/plugins/types';

/** 插件运行时上下文类型。插件内部读取地图能力时会依赖它。 */
export type { MapPluginContext } from './MapLibre/plugins/types';

/** 插件定义类型。适合约束 `defineMapPlugin` 的返回结构。 */
export type { MapPluginDefinition } from './MapLibre/plugins/types';

/** 插件描述类型。适合声明单个插件配置对象。 */
export type { MapPluginDescriptor } from './MapLibre/plugins/types';

/** 插件宿主公开实例类型。需要直接访问插件宿主时使用。 */
export type { MapPluginHostExpose } from './MapLibre/plugins/types';

/** 插件实例类型。适合在插件系统内部描述已初始化插件。 */
export type { MapPluginInstance } from './MapLibre/plugins/types';

/** 插件渲染项类型。插件需要向地图额外挂载渲染节点时使用。 */
export type { MapPluginRenderItem } from './MapLibre/plugins/types';

/** 插件服务集合类型。插件内部互相协作时可用它描述服务能力。 */
export type { MapPluginServices } from './MapLibre/plugins/types';

/** 插件状态变更事件载荷类型。监听插件状态变化时使用。 */
export type { MapPluginStateChangePayload } from './MapLibre/plugins/types';

/** 选中态绑定控制器类型。扩展选中态行为时会用到它。 */
export type { MapSelectionBindingController } from './MapLibre/plugins/types';

/** 选中态服务类型。插件要接入统一选中服务时使用。 */
export type { MapSelectionService } from './MapLibre/plugins/types';

/** 吸附绑定类型。插件要描述吸附关系时可使用它。 */
export type { MapSnapBinding } from './MapLibre/plugins/types';

/** 吸附服务类型。插件或业务层扩展吸附逻辑时使用。 */
export type { MapSnapService } from './MapLibre/plugins/types';

/** TerraDraw 吸附配置解析结果类型。用于描述最终生效的吸附参数。 */
export type { ResolvedTerradrawSnapOptions } from './MapLibre/plugins/types';

/** 地图控件总配置类型。初始化地图控件能力时使用。 */
export type { MapControlsConfig } from './MapLibre/shared/mapLibre-controls-types';

/** 图层交互上下文类型。点击或 hover 图层时常会拿到这类上下文。 */
export type { MapLayerInteractiveContext } from './MapLibre/shared/mapLibre-controls-types';

/** 单个交互图层配置类型。声明图层交互能力时使用。 */
export type { MapLayerInteractiveLayerOptions } from './MapLibre/shared/mapLibre-controls-types';

/** 图层交互总配置类型。统一声明交互图层集合时使用。 */
export type { MapLayerInteractiveOptions } from './MapLibre/shared/mapLibre-controls-types';

/** 当前被选中的图层要素类型。适合描述选中结果。 */
export type { MapLayerSelectedFeature } from './MapLibre/shared/mapLibre-controls-types';

/** 选中态变化上下文类型。监听选中变化时使用。 */
export type { MapLayerSelectionChangeContext } from './MapLibre/shared/mapLibre-controls-types';

/** 选中态变化原因类型。用于区分点击、清空、多选等来源。 */
export type { MapSelectionChangeReason } from './MapLibre/shared/mapLibre-controls-types';

/** 退出选中态行为类型。控制取消选中时要执行的策略。 */
export type { MapSelectionDeactivateBehavior } from './MapLibre/shared/mapLibre-controls-types';

/** 选中图层分组类型。声明哪些图层归属同一组选中逻辑时使用。 */
export type { MapSelectionLayerGroup } from './MapLibre/shared/mapLibre-controls-types';

/** 选中过滤上下文类型。实现选中过滤规则时使用。 */
export type { MapSelectionFilterContext } from './MapLibre/shared/mapLibre-controls-types';

/** 选中模式类型。用于描述单选、多选等交互模式。 */
export type { MapSelectionMode } from './MapLibre/shared/mapLibre-controls-types';

/** 选中态查询参数类型。读取选中结果时需要附加条件可使用它。 */
export type { MapSelectionQueryOptions } from './MapLibre/shared/mapLibre-controls-types';

/** 选中态快照类型。适合描述当前页面选中结果。 */
export type { MapSelectionState } from './MapLibre/shared/mapLibre-controls-types';

/** 选中工具配置类型。声明选中工具行为时使用。 */
export type { MapSelectionToolOptions } from './MapLibre/shared/mapLibre-controls-types';

/** 测量控件配置类型。接入量测能力时使用。 */
export type { MeasureControlOptions } from './MapLibre/shared/mapLibre-controls-types';

/** 解析后的选中工具配置类型。描述最终生效的选中工具参数。 */
export type { ResolvedMapSelectionToolOptions } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 控件配置类型。接入绘制能力时使用。 */
export type { TerradrawControlOptions } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 控件类型。用于区分 draw 和 measure 两类控件。 */
export type { TerradrawControlType } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 要素类型。需要直接处理 TerraDraw 快照要素时使用。 */
export type { TerradrawFeature } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 要素 ID 类型。操作 TerraDraw 单要素时使用。 */
export type { TerradrawFeatureId } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 交互上下文类型。扩展 TerraDraw 交互时可使用它。 */
export type { TerradrawInteractiveContext } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 交互配置类型。初始化 TerraDraw 交互能力时使用。 */
export type { TerradrawInteractiveOptions } from './MapLibre/shared/mapLibre-controls-types';

/** 线装饰配置类型。声明线装饰能力时使用。 */
export type { TerradrawLineDecorationOptions } from './MapLibre/shared/mapLibre-controls-types';

/** 线装饰解析上下文类型。按上下文动态生成线装饰时使用。 */
export type { TerradrawLineDecorationResolveContext } from './MapLibre/shared/mapLibre-controls-types';

/** 线装饰样式类型。描述线装饰最终样式时使用。 */
export type { TerradrawLineDecorationStyle } from './MapLibre/shared/mapLibre-controls-types';

/** TerraDraw 托管控件类型。业务层直接持有控件实例时可使用它。 */
export type { TerradrawManagedControl } from './MapLibre/shared/mapLibre-controls-types';

/** feature-state 表达式工厂。需要拼装状态表达式时使用。 */
export { createFeatureStateExpression } from './MapLibre/composables/useMapEffect';

/** feature-state 特效门面。闪烁、高亮等页面效果优先从这里取。 */
export { useMapEffect } from './MapLibre/composables/useMapEffect';

/** feature-state 包装工具。需要在样式表达式里注入状态值时使用。 */
export { withFeatureState } from './MapLibre/composables/useMapEffect';

/** feature properties 等值比较表达式工具。需要按业务字段快速写条件时使用。 */
export { whenFeaturePropertyEquals } from './MapLibre/shared/map-feature-property-expression';

/** feature properties 多值命中表达式工具。多个业务字段值共用同一结果时使用。 */
export { whenFeaturePropertyIn } from './MapLibre/shared/map-feature-property-expression';

/** feature properties 映射匹配表达式工具。按属性映射批量分色分宽时使用。 */
export { matchFeatureProperty } from './MapLibre/shared/map-feature-property-expression';

/** feature-state 表达式配置类型。声明表达式入参时使用。 */
export type { FeatureStateExpressionOptions } from './MapLibre/composables/useMapEffect';

/** feature-state 目标输入类型。描述要作用到哪个目标时使用。 */
export type { MapEffectTargetInput } from './MapLibre/composables/useMapEffect';

/** feature-state 特效门面返回类型。适合约束 `useMapEffect` 结果。 */
export type { UseMapEffectResult } from './MapLibre/composables/useMapEffect';

/** 普通图层选中态门面。进入多选、退出多选、读取选中集合时使用。 */
export { useMapSelection } from './MapLibre/composables/useMapSelection';

/** 普通图层选中态门面返回类型。适合约束 `useMapSelection` 结果。 */
export type { UseMapSelectionResult } from './MapLibre/composables/useMapSelection';

/** 选中要素 ID 提取工具。只关心当前选中了哪些要素时使用。 */
export { getSelectedFeatureIds } from './MapLibre/composables/mapSelection';

/** 选中属性值提取工具。需要批量读取选中要素属性值时使用。 */
export { getSelectedPropertyValues } from './MapLibre/composables/mapSelection';

/** 选中结果分组工具。需要按图层整理选中结果时使用。 */
export { groupSelectedFeaturesByLayer } from './MapLibre/composables/mapSelection';

/** TerraDraw 量测系统字段常量。需要识别量测内部字段时使用。 */
export { TERRADRAW_MEASURE_SYSTEM_PROPERTY_KEYS } from './MapLibre/composables/useMapDataUpdate';

/** TerraDraw 保留字段常量。需要识别绘制内部保留字段时使用。 */
export { TERRADRAW_RESERVED_PROPERTY_KEYS } from './MapLibre/composables/useMapDataUpdate';

/** TerraDraw 保留字段剔除工具。处理原始属性前先做清洗时使用。 */
export { omitTerradrawReservedProperties } from './MapLibre/composables/useMapDataUpdate';

/** 地图要素属性删除工具。需要直接操作原始 GeoJSON 时使用。 */
export { removeMapFeatureProperties } from './MapLibre/composables/useMapDataUpdate';

/** TerraDraw 要素属性删除工具。需要直接删除 TerraDraw 属性时使用。 */
export { removeTerradrawFeatureProperties } from './MapLibre/composables/useMapDataUpdate';

/** 通用属性保存工具。需要对原始要素集合做属性写回时使用。 */
export { saveFeatureProperties } from './MapLibre/composables/useMapDataUpdate';

/** 地图要素属性保存工具。直接对业务 GeoJSON 要素写回属性时使用。 */
export { saveMapFeatureProperties } from './MapLibre/composables/useMapDataUpdate';

/** TerraDraw 要素属性保存工具。直接对 TerraDraw 要素写回属性时使用。 */
export { saveTerradrawFeatureProperties } from './MapLibre/composables/useMapDataUpdate';

/** 通用属性更新工具。需要做底层属性合并更新时使用。 */
export { updateFeatureProperties } from './MapLibre/composables/useMapDataUpdate';

/** 通用属性对象类型。描述一组 GeoJSON properties 时使用。 */
export type { FeatureProperties } from './MapLibre/composables/useMapDataUpdate';

/** 地图要素 ID 类型。业务要素、草稿要素和 TerraDraw 要素都会复用它。 */
export type { MapFeatureId } from './MapLibre/composables/useMapDataUpdate';

/** 属性治理规则类型。声明字段可见性、只读性和固定值规则时使用。 */
export type { MapFeaturePropertyPolicy } from './MapLibre/composables/useMapDataUpdate';

/** 地图要素属性删除入参类型。直接删业务要素属性时使用。 */
export type { RemoveMapFeaturePropertiesOptions } from './MapLibre/composables/useMapDataUpdate';

/** TerraDraw 属性删除入参类型。直接删 TerraDraw 属性时使用。 */
export type { RemoveTerradrawFeaturePropertiesOptions } from './MapLibre/composables/useMapDataUpdate';

/** 通用属性保存入参类型。使用底层保存工具时需要它。 */
export type { SaveFeaturePropertiesOptions } from './MapLibre/composables/useMapDataUpdate';

/** 通用属性保存结果类型。描述底层保存动作成功与否及附加信息。 */
export type { SaveFeaturePropertiesResult } from './MapLibre/composables/useMapDataUpdate';

/** 地图要素属性保存入参类型。直接保存业务要素属性时使用。 */
export type { SaveMapFeaturePropertiesOptions } from './MapLibre/composables/useMapDataUpdate';

/** TerraDraw 属性保存入参类型。直接保存 TerraDraw 属性时使用。 */
export type { SaveTerradrawFeaturePropertiesOptions } from './MapLibre/composables/useMapDataUpdate';

/** 单字段更新入参类型。按字段粒度更新属性时使用。 */
export type { UpdateFeaturePropertyOptions } from './MapLibre/composables/useMapDataUpdate';

/** 属性面板单项类型。渲染字段行、字段标签和交互态时使用。 */
export type { MapFeaturePropertyPanelItem } from './MapLibre/shared/map-feature-data';

/** 属性面板状态类型。驱动属性弹窗或属性侧栏时使用。 */
export type { MapFeaturePropertyPanelState } from './MapLibre/shared/map-feature-data';

/** 业务数据源工厂。把业务 GeoJSON 包装成稳定 source 门面时使用。 */
export { createMapBusinessSource } from './MapLibre/facades/createMapBusinessSource';

/** 业务数据源注册表工厂。需要统一管理多个业务 source 时使用。 */
export { createMapBusinessSourceRegistry } from './MapLibre/facades/createMapBusinessSource';

/** 业务数据源创建配置类型。声明单个业务 source 时使用。 */
export type { CreateMapBusinessSourceOptions } from './MapLibre/facades/createMapBusinessSource';

/** 业务数据源门面类型。描述单个 source 对外暴露的读写能力。 */
export type { MapBusinessSource } from './MapLibre/facades/createMapBusinessSource';

/** 业务数据源扩展配置类型。透传原生 source 配置时使用。 */
export type { MapBusinessSourceOptions } from './MapLibre/facades/createMapBusinessSource';

/** 业务数据源组件属性类型。把 source 直接 `v-bind` 给组件时使用。 */
export type { MapBusinessSourceProps } from './MapLibre/facades/createMapBusinessSource';

/** 业务数据源注册表类型。约束多 source 统一读写入口时使用。 */
export type { MapBusinessSourceRegistry } from './MapLibre/facades/createMapBusinessSource';

/** 业务 source 图层组件。把业务 source 和图层描述直接渲染到页面时使用。 */
export { default as MapBusinessSourceLayers } from './MapLibre/facades/MapBusinessSourceLayers.vue';

/** 点业务图层工厂。声明点图层时优先使用它。 */
export { createCircleBusinessLayer } from './MapLibre/facades/mapBusinessLayer';

/** 面业务图层工厂。声明面图层时优先使用它。 */
export { createFillBusinessLayer } from './MapLibre/facades/mapBusinessLayer';

/** 线业务图层工厂。声明线图层时优先使用它。 */
export { createLineBusinessLayer } from './MapLibre/facades/mapBusinessLayer';

/** 符号业务图层工厂。声明 symbol 图层时优先使用它。 */
export { createSymbolBusinessLayer } from './MapLibre/facades/mapBusinessLayer';

/** 业务图层描述类型。描述标准化后的业务图层配置时使用。 */
export type { MapBusinessLayerDescriptor } from './MapLibre/facades/mapBusinessLayer';

/** 业务图层几何类型。限制图层可渲染的几何形态时使用。 */
export type { MapBusinessLayerGeometryType } from './MapLibre/facades/mapBusinessLayer';

/** 业务图层等值 where 条件类型。声明简单属性过滤时使用。 */
export type { MapBusinessLayerWhere } from './MapLibre/facades/mapBusinessLayer';

/** 业务图层 where 值类型。约束等值过滤里允许出现的值类型。 */
export type { MapBusinessLayerWhereValue } from './MapLibre/facades/mapBusinessLayer';

/** 地图要素查询门面。读取选中要素、来源引用和属性面板态时使用。 */
export { useMapFeatureQuery } from './MapLibre/facades/useMapFeatureQuery';

/** TerraDraw 属性面板查询入参类型。读取 TerraDraw 面板态时使用。 */
export type { ResolveTerradrawPropertyPanelStateOptions } from './MapLibre/facades/useMapFeatureQuery';

/** 地图要素查询门面入参类型。初始化查询门面时使用。 */
export type { UseMapFeatureQueryOptions } from './MapLibre/facades/useMapFeatureQuery';

/** 地图要素查询门面返回类型。约束 `useMapFeatureQuery` 结果时使用。 */
export type { UseMapFeatureQueryResult } from './MapLibre/facades/useMapFeatureQuery';

/** 地图要素动作门面。保存属性、删属性、生成草稿和替换线廊时使用。 */
export { useMapFeatureActions } from './MapLibre/facades/useMapFeatureActions';

/** 地图动作通用结果类型。描述一次动作的成功状态和提示信息。 */
export type { MapFeatureActionResult } from './MapLibre/facades/useMapFeatureActions';

/** 地图动作目标类型。区分业务源、线草稿和 TerraDraw 三类目标。 */
export type { MapFeatureActionTarget } from './MapLibre/facades/useMapFeatureActions';

/** 线要素动作结果类型。生成草稿或处理线结果时使用。 */
export type { MapFeatureLineActionResult } from './MapLibre/facades/useMapFeatureActions';

/** 属性动作结果类型。保存或删除属性后读取反馈时使用。 */
export type { MapFeaturePropertyActionResult } from './MapLibre/facades/useMapFeatureActions';

/** 选中线草稿预览入参类型。按当前线生成预览草稿时使用。 */
export type { PreviewSelectedLineOptions } from './MapLibre/facades/useMapFeatureActions';

/** 业务源属性删除入参类型。删正式源或线草稿属性时使用。 */
export type { RemoveBusinessFeaturePropertiesOptions } from './MapLibre/facades/useMapFeatureActions';

/** TerraDraw 属性删除动作入参类型。删 TerraDraw 属性时使用。 */
export type { RemoveTerradrawFeaturePropertiesActionOptions } from './MapLibre/facades/useMapFeatureActions';

/** 线廊替换入参类型。按线生成或替换区域时使用。 */
export type { ReplaceSelectedLineCorridorOptions } from './MapLibre/facades/useMapFeatureActions';

/** 业务源属性保存入参类型。保存正式源或线草稿属性时使用。 */
export type { SaveBusinessFeaturePropertiesOptions } from './MapLibre/facades/useMapFeatureActions';

/** TerraDraw 属性保存动作入参类型。保存 TerraDraw 属性时使用。 */
export type { SaveTerradrawFeaturePropertiesActionOptions } from './MapLibre/facades/useMapFeatureActions';

/** 地图要素动作门面入参类型。初始化动作门面时使用。 */
export type { UseMapFeatureActionsOptions } from './MapLibre/facades/useMapFeatureActions';

/** 地图要素动作门面返回类型。约束 `useMapFeatureActions` 结果时使用。 */
export type { UseMapFeatureActionsResult } from './MapLibre/facades/useMapFeatureActions';

/** 统一属性编辑门面。按“当前目标 + 单键保存/删除”驱动属性面板时使用。 */
export { useMapFeaturePropertyEditor } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 统一属性编辑动作结果类型。属性编辑后需要拿最新编辑态时使用。 */
export type { MapFeaturePropertyEditorActionResult } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 地图要素属性编辑目标类型。编辑正式源或线草稿属性时使用。 */
export type { MapFeaturePropertyEditorMapTarget } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 属性编辑单项保存载荷类型。保存一个字段时使用。 */
export type { MapFeaturePropertyEditorSaveItemPayload } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 属性编辑器状态类型。驱动属性面板展示和原始值回填时使用。 */
export type { MapFeaturePropertyEditorState } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 统一属性编辑目标类型。描述当前编辑目标来自地图还是 TerraDraw。 */
export type { MapFeaturePropertyEditorTarget } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** TerraDraw 属性编辑目标类型。编辑 TerraDraw 要素属性时使用。 */
export type { MapFeaturePropertyEditorTerradrawTarget } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 统一属性编辑门面入参类型。初始化属性编辑门面时使用。 */
export type { UseMapFeaturePropertyEditorOptions } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 统一属性编辑门面返回类型。约束 `useMapFeaturePropertyEditor` 结果时使用。 */
export type { UseMapFeaturePropertyEditorResult } from './MapLibre/facades/useMapFeaturePropertyEditor';

/** 线草稿门面。读取线草稿状态、数量和清空动作时使用。 */
export { useLineDraftPreview } from './MapLibre/facades/useLineDraftPreview';

/** 线草稿门面返回类型。约束 `useLineDraftPreview` 结果时使用。 */
export type { UseLineDraftPreviewResult } from './MapLibre/facades/useLineDraftPreview';

/** 高层业务聚合门面。业务页想少记低层入口时优先从这里开始。 */
export { useBusinessMap } from './MapLibre/facades/useBusinessMap';

/** 高层业务聚合里的 feature 分组类型。约束 `businessMap.feature` 时使用。 */
export type { UseBusinessMapFeatureGroup } from './MapLibre/facades/useBusinessMap';

/** 高层业务聚合门面入参类型。初始化 `useBusinessMap` 时使用。 */
export type { UseBusinessMapOptions } from './MapLibre/facades/useBusinessMap';

/** 高层业务聚合门面返回类型。约束 `useBusinessMap` 结果时使用。 */
export type { UseBusinessMapResult } from './MapLibre/facades/useBusinessMap';

/** 高层业务聚合里的数据源分组类型。约束 `businessMap.sources` 时使用。 */
export type { UseBusinessMapSources } from './MapLibre/facades/useBusinessMap';

/** 点图层样式工厂。快速生成 circle 图层样式时使用。 */
export { createCircleLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 面图层样式工厂。快速生成 fill 图层样式时使用。 */
export { createFillLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 线图层样式工厂。快速生成 line 图层样式时使用。 */
export { createLineLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 栅格图层样式工厂。快速生成 raster 图层样式时使用。 */
export { createRasterLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 符号图层样式工厂。快速生成 symbol 图层样式时使用。 */
export { createSymbolLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 默认点图层样式。需要少量覆盖 circle 样式时使用。 */
export { defaultCircleLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 默认面图层样式。需要少量覆盖 fill 样式时使用。 */
export { defaultFillLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 默认线图层样式。需要少量覆盖 line 样式时使用。 */
export { defaultLineLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 默认栅格图层样式。需要少量覆盖 raster 样式时使用。 */
export { defaultRasterLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 默认符号图层样式。需要少量覆盖 symbol 样式时使用。 */
export { defaultSymbolLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 通用图层样式类型。约束业务图层样式结构时使用。 */
export type { MapLayerStyle } from './MapLibre/shared/map-layer-style-config';

/** 图层样式覆盖类型。只想覆盖部分样式字段时使用。 */
export type { MapLayerStyleOverrides } from './MapLibre/shared/map-layer-style-config';

/** 通用 GeoJSON 要素类型。处理普通业务要素时使用。 */
export type { MapCommonFeature } from './MapLibre/shared/map-common-tools';

/** 通用 GeoJSON 要素集合类型。处理 FeatureCollection 时使用。 */
export type { MapCommonFeatureCollection } from './MapLibre/shared/map-common-tools';

/** 通用线要素类型。只处理线数据时使用。 */
export type { MapCommonLineFeature } from './MapLibre/shared/map-common-tools';

/** 通用面要素类型。只处理面数据时使用。 */
export type { MapCommonPolygonFeature } from './MapLibre/shared/map-common-tools';

/** 标准来源引用类型。跨 source 传递 sourceId + featureId 时使用。 */
export type { MapSourceFeatureRef } from './MapLibre/shared/map-common-tools';
