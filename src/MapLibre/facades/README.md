# facades 导读

`facades` 目录负责高层门面。  
这里的目标不是替代底层实现，而是把业务层最常一起使用的能力收口成更稳定、更容易找的入口。

## 这个目录负责什么

- 组织业务 source 和业务图层
- 提供“查要素、改要素、编辑属性、管理弹窗”这类高频门面
- 提供更适合业务层消费的上下文与返回结构

## 首读顺序

1. `useBusinessMap.ts`
2. `createMapBusinessSource.ts`
3. `mapBusinessLayer.ts`
4. `useMapFeatureQuery.ts`
5. `useMapFeatureActions.ts`
6. `useMapFeaturePropertyEditor.ts`
7. `useMapPopupState.ts`
8. `mapPluginResolver.ts`

## 文件说明

### useBusinessMap.ts

高层聚合门面。  
如果你想知道“业务页应该先从哪里拿能力”，先看这里。

### createMapBusinessSource.ts

业务 source 工厂与注册表。  
适合定位正式业务数据如何组织、读取和写回。

### mapBusinessLayer.ts

业务图层描述工厂。  
适合定位点、线、面、符号图层在业务层如何声明。

### useMapFeatureQuery.ts

要素查询门面。  
适合定位“当前选中了什么”“如何把上下文转成业务可用对象”。

### useMapFeatureActions.ts

要素动作门面。  
适合定位“保存属性、删除属性、生成线草稿、替换线廊”等动作。

### useMapFeaturePropertyEditor.ts

统一属性编辑门面。  
适合定位属性面板如何拼装状态和执行单字段保存、删除。

### useMapPopupState.ts

通用弹窗状态门面。  
职责比较轻，适合管理弹窗显隐和载荷。

### mapPluginResolver.ts

插件 API 解析工具。  
适合高层门面读取某个插件已经暴露出来的对外能力。

## 阅读时的判断标准

- 业务页需要什么能力，先看 `facades`
- 如果这里只是转调底层实现，再继续下钻到 `composables`、`plugins` 或 `core`
- 如果一个问题已经带明显业务语义，优先在 `facades` 找，而不是直接进 `core`

## 不建议在这里做什么

- 不要把地图底层生命周期塞进 `facades`
- 不要把插件私有状态管理直接暴露到这里
- 不要把只给单个页面临时使用的逻辑长期沉淀在这里
