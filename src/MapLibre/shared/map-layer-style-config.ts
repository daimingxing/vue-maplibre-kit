import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  RasterLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import { getMapGlobalStyleDefaults } from './map-global-config';

export interface MapLayerStyle<Layout, Paint> {
  layout: Layout;
  paint: Paint;
}

export interface MapLayerStyleOverrides<Layout, Paint> {
  layout?: Partial<NonNullable<Layout>>;
  paint?: Partial<NonNullable<Paint>>;
}

function mergeLayerSection<T>(base: T, override?: Partial<NonNullable<T>>): T {
  return {
    ...((base || {}) as NonNullable<T>),
    ...(override || {}),
  } as T;
}

function createLayerStyle<Layout, Paint>(
  defaultStyle: MapLayerStyle<Layout, Paint>,
  globalOverrides: MapLayerStyleOverrides<Layout, Paint> = {},
  overrides: MapLayerStyleOverrides<Layout, Paint> = {}
): MapLayerStyle<Layout, Paint> {
  return {
    layout: mergeLayerSection(
      mergeLayerSection(defaultStyle.layout, globalOverrides.layout),
      overrides.layout
    ),
    paint: mergeLayerSection(
      mergeLayerSection(defaultStyle.paint, globalOverrides.paint),
      overrides.paint
    ),
  };
}

/**
 * 普通面图层默认样式。
 * 业务页只需要覆写当前页面关心的 layout / paint 字段即可。
 */
export const defaultFillLayerStyle: MapLayerStyle<
  FillLayerSpecification['layout'],
  FillLayerSpecification['paint']
> = {
  layout: {
    'fill-sort-key': 0, // 决定面要素的绘制顺序，值越大越靠上
    visibility: 'visible', // 图层显隐控制：'visible' 显示，'none' 隐藏
  },
  paint: {
    'fill-antialias': true, // 是否开启面边缘抗锯齿
    'fill-opacity': 0.4, // 面填充透明度，范围 0 - 1
    'fill-color': '#888888', // 面填充颜色
    'fill-outline-color': '#000000', // 面轮廓颜色；未设置时通常跟随 fill-color
    'fill-translate': [0, 0], // 面在屏幕空间的平移量 [x, y]，单位像素
    'fill-translate-anchor': 'map', // 平移参考系：'map' 随地图旋转，'viewport' 固定屏幕方向
    // 'fill-pattern': 'pattern-image-name', // 使用 sprite 中的图片纹理填充；启用后通常会覆盖 fill-color 的视觉表现，只有确实需要纹理底图时再开
  },
};

/**
 * 普通线图层默认样式。
 */
export const defaultLineLayerStyle: MapLayerStyle<
  LineLayerSpecification['layout'],
  LineLayerSpecification['paint']
> = {
  layout: {
    'line-cap': 'square', // 线段末端样式：'butt'、'round'、'square'
    'line-join': 'miter', // 线段拐角样式：'bevel'、'round'、'miter'
    // 'line-miter-limit': 2, // miter 拐角的尖角长度限制，超出后回退为 bevel
    // 'line-round-limit': 1.05, // round 拐角的圆滑限制阈值
    'line-sort-key': 0, // 决定线要素的绘制顺序，值越大越靠上
    visibility: 'visible', // 图层显隐控制：'visible' 显示，'none' 隐藏
  },
  paint: {
    'line-opacity': 0.8, // 线整体透明度，范围 0 - 1
    'line-color': '#0000ff', // 线颜色
    'line-translate': [0, 0], // 线在屏幕空间的平移量 [x, y]，单位像素
    'line-translate-anchor': 'map', // 平移参考系：'map' 或 'viewport'
    'line-width': 3, // 线宽，单位像素
    'line-gap-width': 0, // 线内部间隙宽度，常用于双线道路效果
    'line-offset': 0, // 线相对原始几何位置的偏移量，正负值可控制左右偏移
    'line-blur': 0, // 线的模糊程度，值越大边缘越柔和
    // 'line-dasharray': [2, 2], // 虚线模式：[实线长度, 空白长度]；会受到 line-width 影响，适合边界线、规划线等场景
    // 'line-pattern': 'pattern-image-name', // 使用 sprite 中的图片纹理绘制线；开启后通常不再依赖 line-color，只有确实需要纹理线时再开
    // 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#0000ff', 1, '#ff0000'], // 沿线渐变色；要求数据源启用 lineMetrics: true，否则不建议配置
  },
};

/**
 * 普通点图层默认样式。
 */
export const defaultCircleLayerStyle: MapLayerStyle<
  CircleLayerSpecification['layout'],
  CircleLayerSpecification['paint']
> = {
  layout: {
    'circle-sort-key': 0, // 决定点要素的绘制顺序，值越大越靠上
    visibility: 'visible', // 图层显隐控制：'visible' 显示，'none' 隐藏
  },
  paint: {
    'circle-radius': 6, // 圆点半径，单位像素
    'circle-color': '#0000ff', // 圆点填充颜色
    'circle-blur': 0, // 圆点模糊程度，0 为清晰边缘
    'circle-opacity': 1, // 圆点整体透明度，范围 0 - 1
    'circle-translate': [0, 0], // 圆点在屏幕空间的平移量 [x, y]
    'circle-translate-anchor': 'map', // 平移参考系：'map' 或 'viewport'
    'circle-pitch-scale': 'map', // 地图倾斜时点大小缩放参考：'map' 或 'viewport'
    'circle-pitch-alignment': 'viewport', // 地图倾斜时点对齐平面：'map' 或 'viewport'
    'circle-stroke-width': 2, // 圆点边框宽度，单位像素
    'circle-stroke-color': '#ffffff', // 圆点边框颜色
    'circle-stroke-opacity': 1, // 圆点边框透明度，范围 0 - 1
    // 'circle-pitch-alignment': 'map', // 如果希望点位贴地而不是始终面朝屏幕时可改；大多数业务点位展示不建议轻易修改，避免视觉不稳定
  },
};

/**
 * 普通标签图层默认样式。
 */
export const defaultSymbolLayerStyle: MapLayerStyle<
  SymbolLayerSpecification['layout'],
  SymbolLayerSpecification['paint']
> = {
  layout: {
    visibility: 'visible', // 图层显隐控制：'visible' 显示，'none' 隐藏
    'symbol-sort-key': 0, // 决定标签/图标重叠时的绘制优先级，值越大越靠上
    // 'symbol-z-order': 'auto', // 符号排序策略：'auto' 自动、'viewport-y' 按屏幕 y 值、'source' 按数据源顺序；只有确实要精细控制叠放顺序时再开
    'text-field': ['get', 'id'], // 文本内容表达式；这里默认显示要素 properties.id
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'], // 文本字体栈，需底图字体资源支持
    'text-size': 14, // 文字大小，单位像素
    'text-max-width': 10, // 文本最大宽度，超过后按 em 单位换行
    'text-line-height': 1.2, // 多行文本行高，单位 em
    'text-letter-spacing': 0, // 字符间距，单位 em
    'text-justify': 'center', // 多行文本对齐方式：'auto'、'left'、'center'、'right'
    'text-anchor': 'bottom', // 文本相对点位的锚点位置
    'text-offset': [0, -1], // 文本相对锚点的偏移量 [x, y]，单位 em
    'text-radial-offset': 0, // 文本沿径向偏移量，常和 text-variable-anchor 配合使用
    'text-transform': 'none', // 文本大小写转换：'none'、'uppercase'、'lowercase'
    'icon-size': 1, // 图标缩放比例
    'icon-anchor': 'center', // 图标相对点位的锚点位置
    'icon-offset': [0, 0], // 图标偏移量 [x, y]
    'icon-rotate': 0, // 图标顺时针旋转角度
    'symbol-placement': 'point', // 符号放置方式：'point'、'line'、'line-center'
    'symbol-spacing': 250, // 沿线放置时，相邻符号的间距
    'symbol-avoid-edges': false, // 是否避免符号贴近瓦片边缘
    'text-allow-overlap': false, // 是否允许文本与其他符号重叠
    'text-ignore-placement': false, // 是否让其他符号忽略当前文本的碰撞盒
    'icon-allow-overlap': false, // 是否允许图标与其他符号重叠
    'icon-ignore-placement': false, // 是否让其他符号忽略当前图标的碰撞盒
    'text-rotation-alignment': 'viewport', // 地图旋转时文本对齐参考：'map'、'viewport'、'viewport-glyph'、'auto'
    'text-pitch-alignment': 'viewport', // 地图倾斜时文本对齐参考：'map'、'viewport'、'auto'
    'icon-rotation-alignment': 'auto', // 地图旋转时图标对齐参考：'map'、'viewport'、'auto'
    'icon-pitch-alignment': 'auto', // 地图倾斜时图标对齐参考：'map'、'viewport'、'auto'
    // 'icon-overlap': 'never', // 图标碰撞策略：'never' 不重叠、'always' 始终显示、'cooperative' 协同避让；复杂图标密集场景才建议显式配置
    // 'icon-keep-upright': false, // 图标沿线放置时是否尽量保持正向朝上；线标注或方向图标场景可考虑开启
    // 'text-variable-anchor': ['bottom', 'top', 'left', 'right'], // 允许引擎自动挑选更合适的文本锚点，适合点位密集场景；会让标签位置更动态，不需要自动避让时可不启用
    // 'text-variable-anchor-offset': [['bottom', [0, -1]], ['top', [0, 1]]], // 为不同可变锚点分别配置偏移量；只有需要精细控制自动避让后的文字位置时才建议使用
    // 'text-max-angle': 45, // 文本沿线排布时允许的最大转折角，仅对 line placement 更有意义；点位标签通常不建议配置
    // 'text-writing-mode': ['horizontal'], // 文本书写方向：可选水平或垂直；只有多语种或竖排标签场景才建议改
    // 'text-rotate': 0, // 文本顺时针旋转角度；通常优先用锚点和偏移控制位置，需要主动旋转时再开
    // 'text-keep-upright': true, // 文本沿线布局时是否尽量保持正向朝上；道路名、管线名等沿线标签可考虑开启
    // 'icon-image': 'marker-icon', // 图标名称，必须存在于底图 sprite 中；未接入 sprite 资源前不要随意开启
    // 'icon-text-fit': 'none', // 是否让图标自动包裹文本：'none'、'width'、'height'、'both'；只有做徽标/气泡类效果时才建议启用
    // 'icon-text-fit-padding': [0, 0, 0, 0], // 配合 icon-text-fit 使用的图标内边距 [上, 右, 下, 左]
    // 'text-optional': false, // 图标与文本同时存在时，是否允许文本在碰撞时被隐藏；需要“图标优先显示”时可改为 true
    // 'icon-optional': false, // 图标与文本同时存在时，是否允许图标在碰撞时被隐藏；需要“文本优先显示”时可改为 true
    // 'text-padding': 2, // 文本碰撞盒内边距；不推荐随意放大，否则容易导致标签大面积消失
    // 'icon-padding': 2, // 图标碰撞盒内边距；不推荐随意放大，否则会显著降低可见图标数量
    // 'text-overlap': 'never', // 文本碰撞策略：'never' 不重叠、'always' 始终显示、'cooperative' 协同避让；只有确实要覆盖默认避让策略时再开
  },
  paint: {
    'text-color': '#333333', // 文本颜色
    'text-opacity': 1, // 文本透明度，范围 0 - 1
    'text-halo-color': '#ffffff', // 文本描边/光晕颜色，提高复杂底图上的可读性
    'text-halo-width': 2, // 文本描边宽度，单位像素
    'text-halo-blur': 1, // 文本描边模糊程度
    'text-translate': [0, 0], // 文本在屏幕空间的平移量 [x, y]
    'text-translate-anchor': 'map', // 文本平移参考系：'map' 或 'viewport'
    'icon-color': '#000000', // 图标着色，仅对 SDF 图标有效
    'icon-opacity': 1, // 图标透明度，范围 0 - 1
    'icon-halo-color': 'rgba(0,0,0,0)', // 图标描边颜色，仅对 SDF 图标有效
    'icon-halo-width': 0, // 图标描边宽度
    'icon-halo-blur': 0, // 图标描边模糊程度
    'icon-translate': [0, 0], // 图标在屏幕空间的平移量 [x, y]
    'icon-translate-anchor': 'map', // 图标平移参考系：'map' 或 'viewport'
    // 'text-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#00ff00', '#333333'], // 文本颜色也支持表达式；如需 hover 高亮标签，可按这个模式覆写
    // 'icon-color': ['case', ['==', ['get', 'status'], 'warning'], '#ff8800', '#000000'], // 图标着色也支持按业务字段动态分色，但只对 SDF 图标有效
  },
};

/**
 * 普通栅格图层默认样式。
 * 这里主要用于栅格瓦片、图片底图、视频底图等 raster 图层。
 * 当前 MapLibre 版本下，raster 图层可配置项本身就比较少：
 * - layout 侧当前只有 visibility
 * - paint 侧当前已把全部可配置项都列出来了
 * 其中不建议默认启用的项，先保留为注释模板，方便开发者按需打开。
 */
export const defaultRasterLayerStyle: MapLayerStyle<
  RasterLayerSpecification['layout'],
  RasterLayerSpecification['paint']
> = {
  layout: {
    visibility: 'visible', // 图层显隐控制：'visible' 显示，'none' 隐藏；当前版本 raster layout 侧主要就是这一项
  },
  paint: {
    'raster-opacity': 1, // 栅格整体透明度，范围 0 - 1
    'raster-resampling': 'linear', // 栅格重采样方式：'linear' 更平滑，'nearest' 更锐利
    'raster-fade-duration': 0, // 新旧瓦片切换时的淡入时长，单位毫秒；0 表示不做淡入
    // 'raster-hue-rotate': 0, // 栅格色相旋转角度，单位度；只在需要做统一色调偏移时才建议启用
    // 'raster-brightness-min': 0, // 栅格亮度下限，范围 0 - 1；可用于整体压暗底图暗部
    // 'raster-brightness-max': 1, // 栅格亮度上限，范围 0 - 1；可用于整体压亮底图高光
    // 'raster-saturation': 0, // 栅格饱和度调整，范围 -1 到 1；负值更灰，正值更艳
    // 'raster-contrast': 0, // 栅格对比度调整，范围 -1 到 1；负值更平，正值更强
    // 'resampling': 'linear', // 旧写法别名，语义与 raster-resampling 一致；新代码建议统一只使用 raster-resampling
  },
};

export function createFillLayerStyle(
  overrides: MapLayerStyleOverrides<
    FillLayerSpecification['layout'],
    FillLayerSpecification['paint']
  > = {}
): MapLayerStyle<FillLayerSpecification['layout'], FillLayerSpecification['paint']> {
  return createLayerStyle(defaultFillLayerStyle, getMapGlobalStyleDefaults('fill') || {}, overrides);
}

export function createLineLayerStyle(
  overrides: MapLayerStyleOverrides<
    LineLayerSpecification['layout'],
    LineLayerSpecification['paint']
  > = {}
): MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']> {
  return createLayerStyle(defaultLineLayerStyle, getMapGlobalStyleDefaults('line') || {}, overrides);
}

export function createCircleLayerStyle(
  overrides: MapLayerStyleOverrides<
    CircleLayerSpecification['layout'],
    CircleLayerSpecification['paint']
  > = {}
): MapLayerStyle<CircleLayerSpecification['layout'], CircleLayerSpecification['paint']> {
  return createLayerStyle(
    defaultCircleLayerStyle,
    getMapGlobalStyleDefaults('circle') || {},
    overrides
  );
}

export function createSymbolLayerStyle(
  overrides: MapLayerStyleOverrides<
    SymbolLayerSpecification['layout'],
    SymbolLayerSpecification['paint']
  > = {}
): MapLayerStyle<SymbolLayerSpecification['layout'], SymbolLayerSpecification['paint']> {
  return createLayerStyle(
    defaultSymbolLayerStyle,
    getMapGlobalStyleDefaults('symbol') || {},
    overrides
  );
}

/**
 * 创建栅格图层样式。
 * @param overrides 业务层局部覆写
 * @returns 合并后的栅格图层样式
 */
export function createRasterLayerStyle(
  overrides: MapLayerStyleOverrides<
    RasterLayerSpecification['layout'],
    RasterLayerSpecification['paint']
  > = {}
): MapLayerStyle<RasterLayerSpecification['layout'], RasterLayerSpecification['paint']> {
  return createLayerStyle(
    defaultRasterLayerStyle,
    getMapGlobalStyleDefaults('raster') || {},
    overrides
  );
}
