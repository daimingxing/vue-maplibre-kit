# terradraw 导读

`terradraw` 目录负责 TerraDraw 集成实现。  
这里承载的是绘制模式、吸附同步、线装饰以及若干 TerraDraw 相关渲染组件。

## 这个目录负责什么

- TerraDraw 模式和配置组织
- TerraDraw 与宿主交互的桥接
- TerraDraw 与吸附系统的同步
- 线装饰、拉伸贴图、图案贴图等渲染实现

## 首读顺序

1. `terradraw-config.ts`
2. `terradraw-mode-factory.ts`
3. `useTerradrawInteractive.ts`
4. `terradraw-snap-sync.ts`
5. `useTerradrawLineDecoration.ts`
6. 相关渲染组件

## 文件说明

### terradraw-config.ts

TerraDraw 配置收口点。  
如果你要判断默认模式、能力开关和配置整理方式，先看这里。

### terradraw-mode-factory.ts

模式工厂。  
适合定位某种 TerraDraw 模式是如何被创建和拼装的。

### useTerradrawInteractive.ts

TerraDraw 交互主入口。  
适合定位绘制态交互是如何与地图宿主对接的。

### terradraw-snap-sync.ts

吸附同步逻辑。  
适合定位 TerraDraw 与普通图层吸附服务之间如何桥接。

### useTerradrawLineDecoration.ts

线装饰主逻辑。  
适合定位线装饰、贴图和样式计算。

### TerradrawLineDecorationLayers.vue

线装饰图层渲染组件。

### TerradrawPatternRasterItem.vue

图案贴图渲染组件。

### TerradrawStretchRasterItem.vue

拉伸贴图渲染组件。

## 阅读时的判断标准

- 问题与 TerraDraw 模式、吸附、线装饰有关，优先看这里
- 问题与 TerraDraw 控件生命周期有关，同时联动看 `core/useTerradrawControlLifecycle.ts`
- 问题与业务属性编辑有关，不要先看这里，先看 `facades`

## 不建议在这里做什么

- 不要把业务层临时规则直接硬编码进 TerraDraw 集成层
- 不要把宿主生命周期逻辑和 TerraDraw 细节完全揉在一起
- 不要让外部页面直接依赖这里的私有文件路径
