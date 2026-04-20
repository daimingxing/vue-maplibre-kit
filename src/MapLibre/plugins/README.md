# plugins 导读

`plugins` 目录负责插件内部实现。  
这里不是插件公开子路径入口本身，而是插件的真实实现区。

## 这个目录负责什么

- 定义插件内部实现结构
- 组织插件的状态、控制器、服务和渲染组件
- 通过统一插件契约接入地图宿主

## 先看哪

1. `types.ts`
2. 各插件目录下的 `index.ts`
3. 各插件目录下的 `use*Plugin.ts`
4. 再看 controller、service、store、组件

## 文件和目录说明

### types.ts

插件系统公共契约。  
这里定义了插件描述对象、运行时上下文、实例结构、服务接口和宿主查询接口。

### line-draft-preview

线草稿预览插件。  
如果要看线草稿如何建模、渲染和暴露 API，从这里进入。

优先读：

1. `line-draft-preview/index.ts`
2. `line-draft-preview/useLineDraftPreviewPlugin.ts`
3. `line-draft-preview/useLineDraftPreviewController.ts`
4. `line-draft-preview/useLineDraftPreviewStore.ts`

### map-feature-snap

吸附插件。  
如果要看普通图层吸附、预览和 TerraDraw 吸附桥接，从这里进入。

优先读：

1. `map-feature-snap/index.ts`
2. `map-feature-snap/useMapFeatureSnapPlugin.ts`
3. `map-feature-snap/useMapFeatureSnapController.ts`
4. `map-feature-snap/useMapFeatureSnapBinding.ts`

### map-feature-multi-select

多选插件。  
如果要看选择服务如何通过插件方式接入地图宿主，从这里进入。

优先读：

1. `map-feature-multi-select/index.ts`
2. `map-feature-multi-select/useMapFeatureMultiSelectPlugin.ts`
3. `map-feature-multi-select/useMapFeatureMultiSelectService.ts`

### map-dxf-export

DXF 导出插件。  
如果要看导出服务、导出控件和插件 API 如何组织，从这里进入。

优先读：

1. `map-dxf-export/index.ts`
2. `map-dxf-export/useMapDxfExportPlugin.ts`
3. `map-dxf-export/useMapDxfExportService.ts`

## 阅读时的判断标准

- 想看插件对外暴露什么，先看 `src/plugins/*.ts`
- 想看插件内部怎么实现，再进本目录
- 想看插件如何被宿主托管，再联动看 `core/useMapPluginHost.ts`

## 不建议在这里做什么

- 不要让业务页面直接依赖这里的私有实现
- 不要把插件公开门面和插件内部实现混在同一层
- 不要绕过 `types.ts` 另起一套插件契约
