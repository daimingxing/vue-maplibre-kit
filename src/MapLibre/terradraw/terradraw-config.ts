import type {
  TerradrawControlOptions,
  MeasureControlOptions,
} from '../shared/mapLibre-controls-types';

/**
 * 绘图控件基础样式配置对象 (非实例化，供合并使用)
 * 保留配置骨架，但默认值与底层 @watergis/maplibre-gl-terradraw 保持一致
 * 业务层面需要特定样式，可以在当前业务页面重写 modeOptions
 */
export const terradrawStyleConfig: Pick<TerradrawControlOptions, 'modeOptions'> = {
  modeOptions: {
    // 1. 自定义画点样式
    point: {
      styles: {
        pointColor: '#3f97e0', // 点的颜色 (默认蓝色)
        pointWidth: 6, // 点的半径大小 (像素)
        pointOutlineColor: '#ffffff', // 点的边框颜色 (默认白色)
        pointOutlineWidth: 2, // 点的边框宽度 (像素)
      },
    },
    // 2. 自定义画线样式
    linestring: {
      styles: {
        lineStringColor: '#3f97e0', // 线的颜色
        lineStringWidth: 4, // 线的宽度 (像素)
        closingPointColor: '#ffffff', // 绘制过程中，当前鼠标位置(末端提示点)的颜色
        closingPointWidth: 4, // 绘制过程中，末端提示点的半径大小 (像素)
        closingPointOutlineColor: '#000000', // 绘制过程中，末端提示点的边框颜色
        closingPointOutlineWidth: 1, // 绘制过程中，末端提示点的边框宽度 (像素)
      },
    },
    // 3. 自定义多边形样式
    polygon: {
      styles: {
        fillColor: '#3f97e0', // 多边形内部的填充颜色
        fillOpacity: 0.4, // 多边形内部的填充透明度 (0 - 1)
        outlineColor: '#3f97e0', // 多边形轮廓边框的颜色
        outlineWidth: 3, // 多边形轮廓边框的宽度 (像素)
        closingPointColor: '#ffffff', // 绘制过程中，当前鼠标位置(闭合提示点)的颜色
        closingPointWidth: 4, // 绘制过程中，闭合提示点的半径大小 (像素)
        closingPointOutlineColor: '#000000', // 绘制过程中，闭合提示点的边框颜色
        closingPointOutlineWidth: 1, // 绘制过程中，闭合提示点的边框宽度 (像素)
      },
    },
    // 4. 自定义矩形样式
    rectangle: {
      styles: {
        fillColor: '#3f97e0', // 矩形内部的填充颜色
        fillOpacity: 0.4, // 矩形内部的填充透明度 (0 - 1)
        outlineColor: '#3f97e0', // 矩形轮廓边框的颜色
        outlineWidth: 3, // 矩形轮廓边框的宽度 (像素)
      },
    },
    // 5. 自定义圆形样式
    circle: {
      styles: {
        fillColor: '#3f97e0', // 圆形内部的填充颜色
        fillOpacity: 0.4, // 圆形内部的填充透明度 (0 - 1)
        outlineColor: '#3f97e0', // 圆形轮廓边框的颜色
        outlineWidth: 3, // 圆形轮廓边框的宽度 (像素)
      },
    },
    // 6. 自定义自由手绘模式样式
    freehand: {
      styles: {
        fillColor: '#3f97e0', // 闭合后的手绘多边形填充颜色 (若形成闭合面)
        fillOpacity: 0.4, // 闭合后的手绘多边形填充透明度 (0 - 1)
        outlineColor: '#3f97e0', // 手绘线条的颜色
        outlineWidth: 4, // 手绘线条的宽度 (像素)
      },
    },
    // 7. 自定义有角度矩形样式
    'angled-rectangle': {
      styles: {
        fillColor: '#3f97e0', // 倾斜矩形内部的填充颜色
        fillOpacity: 0.4, // 倾斜矩形内部的填充透明度 (0 - 1)
        outlineColor: '#3f97e0', // 倾斜矩形轮廓边框的颜色
        outlineWidth: 3, // 倾斜矩形轮廓边框的宽度 (像素)
      },
    },
    // 8. 自定义传感器/扇形模式样式 (常用于雷达范围展示)
    sensor: {
      styles: {
        fillColor: '#3f97e0', // 传感器扫描范围的填充颜色
        fillOpacity: 0.4, // 传感器扫描范围的填充透明度 (0 - 1)
        outlineColor: '#3f97e0', // 传感器扫描范围的边框颜色
        outlineWidth: 3, // 传感器扫描范围的边框宽度 (像素)
      },
    },
    // 9. 自定义扇区模式样式
    sector: {
      styles: {
        fillColor: '#3f97e0', // 扇区内部的填充颜色
        fillOpacity: 0.4, // 扇区内部的填充透明度 (0 - 1)
        outlineColor: '#3f97e0', // 扇区轮廓边框的颜色
        outlineWidth: 3, // 扇区轮廓边框的宽度 (像素)
      },
    },
    // 10. 自定义选中状态下的样式（编辑模式）
    select: {
      styles: {
        // === 当点处于选中状态时的样式 ===
        selectedPointColor: '#111111', // 选中点的颜色 (深色)
        selectedPointWidth: 8, // 选中点的半径大小 (略大于普通点)
        selectedPointOutlineColor: '#ffffff', // 选中点的边框颜色
        selectedPointOutlineWidth: 3, // 选中点的边框宽度

        // === 当线处于选中状态时的样式 ===
        selectedLineStringColor: '#111111', // 选中线的颜色 (深色)
        selectedLineStringWidth: 6, // 选中线的宽度 (略大于普通线)

        // === 当多边形/矩形/圆等面状图形处于选中状态时的样式 ===
        selectedPolygonColor: '#111111', // 选中面状图形时的填充颜色
        selectedPolygonFillOpacity: 0.6, // 选中面状图形时的填充透明度 (略深于普通状态)
        selectedPolygonOutlineColor: '#111111', // 选中面状图形时的边框颜色
        selectedPolygonOutlineWidth: 4, // 选中面状图形时的边框宽度

        // === 控制点/节点（用于拖拽调整形状的顶点）的样式 ===
        selectionPointColor: '#ffffff', // 拖拽控制点的颜色 (白色)
        selectionPointWidth: 5, // 拖拽控制点的半径大小
        selectionPointOutlineColor: '#111111', // 拖拽控制点的边框颜色
        selectionPointOutlineWidth: 2, // 拖拽控制点的边框宽度

        // === 中点（用于在两点之间添加新节点的中间点）的样式 ===
        midPointColor: '#ffffff', // 中点的颜色 (白色)
        midPointWidth: 4, // 中点的半径大小 (略小于控制点)
        midPointOutlineColor: '#111111', // 中点的边框颜色
        midPointOutlineWidth: 1, // 中点的边框宽度
      },
    },
  },
};

/**
 * 测量控件公共默认配置 (非实例化，供合并使用)
 * 说明：
 * 1. 这里不仅负责“公共样式骨架”，也负责“适合全局统一控制的测量默认行为”
 *    例如单位体系、精度、高程缓存等；
 * 2. mapLibre-init 内部会先 cloneDeep 当前公共配置，再与业务页面传入的配置 merge；
 * 3. 因此业务页面仍然可以局部覆写这里的任意默认项，例如只在某个页面切换成英制或修改单位符号。
 */
export const measureStyleConfig: Partial<Pick<
  MeasureControlOptions,
  | 'modeOptions'
  | 'lineLayerLabelSpec'
  | 'routingLineLayerNodeSpec'
  | 'polygonLayerSpec'
  | 'measureUnitType'
  | 'distancePrecision'
  | 'distanceUnit'
  | 'areaPrecision'
  | 'areaUnit'
  | 'measureUnitSymbols'
  | 'computeElevation'
  | 'terrainSource'
  | 'elevationCacheConfig'
>> = {
  // ==========================================
  // 0. 测量单位 / 精度 / 缓存公共默认配置
  // ==========================================
  // 全局默认使用公制；业务页面可局部改成 imperial
  // 测量单位体系：'metric' 公制，'imperial' 英制
  measureUnitType: 'metric',
  // 强制指定距离单位，可选：
  // 公制: 'kilometer' | 'meter' | 'centimeter'
  // 英制: 'mile' | 'foot' | 'inch'
  distanceUnit: 'meter',

  // 强制指定面积单位，可选：
  // 公制: 'square meters' | 'square kilometers' | 'ares' | 'hectares'
  // 英制: 'square feet' | 'square yards' | 'acres' | 'square miles'
  areaUnit: 'square meters',

  // 距离结果保留的小数位数
  distancePrecision: 4,

  // 面积结果保留的小数位数
  areaPrecision: 3,

  // 自定义单位符号映射，例如把 kilometer 显示成 km
  // measureUnitSymbols: {
  //   kilometer: 'km',
  //   meter: 'm',
  //   centimeter: 'cm',
  //   mile: 'mi',
  //   foot: 'ft',
  //   inch: 'in',
  //   'square meters': 'm²',
  //   'square kilometers': 'km²',
  //   ares: 'a',
  //   hectares: 'ha',
  //   'square feet': 'ft²',
  //   'square yards': 'yd²',
  //   acres: 'ac',
  //   'square miles': 'mi²',
  // },

  // 开启后，如果地图有地形数据(terrain)，将计算考虑地形起伏的 3D 真实距离
  // computeElevation: false,
  // terrainSource: 'your-terrain-source-id',
  // 高程缓存配置，适合频繁测量且地形查询较重的场景
  // elevationCacheConfig: {
  //   enabled: true,
  //   maxSize: 500,
  //   ttl: 5 * 60 * 1000,
  //   precision: 6,
  // },

  // 1. 图形本身的样式自定义 (与 MaplibreTerradrawControl 行为一致)
  modeOptions: {
    linestring: {
      styles: {
        lineStringColor: '#3f97e0', // 测量线的颜色
        lineStringWidth: 4, // 测量线的宽度 (像素)
        closingPointColor: '#ffffff', // 测量绘制时，当前鼠标位置(末端提示点)的颜色
        closingPointWidth: 4, // 测量绘制时，末端提示点的半径大小
        closingPointOutlineColor: '#000000', // 测量绘制时，末端提示点的边框颜色
        closingPointOutlineWidth: 1, // 测量绘制时，末端提示点的边框宽度
      },
    },
    polygon: {
      styles: {
        fillColor: '#3f97e0', // 测量面的内部填充颜色
        fillOpacity: 0.4, // 测量面的内部填充透明度
        outlineColor: '#3f97e0', // 测量面的边框颜色
        outlineWidth: 3, // 测量面的边框宽度
        closingPointColor: '#ffffff', // 测量面绘制时，当前鼠标位置(闭合提示点)的颜色
        closingPointWidth: 4, // 测量面绘制时，闭合提示点的半径大小
        closingPointOutlineColor: '#000000', // 测量面绘制时，闭合提示点的边框颜色
        closingPointOutlineWidth: 1, // 测量面绘制时，闭合提示点的边框宽度
      },
    },
  },

  // 2. 测量结果文字标签的样式自定义 (遵循 MapLibre 的 SymbolLayer 规范)

  // === 线段距离标签样式 ===
  lineLayerLabelSpec: {
    id: 'measure-line-label', // 必须匹配底层源码内部的默认图层 ID，不可更改
    type: 'symbol', // 图层类型，必须为文字/图标符号图层
    source: 'measure-line-label', // 必须匹配底层源码内部生成的数据源 ID，不可更改
    filter: ['==', '$type', 'Point'], // 源码中文字挂载点是以 Point 存储的，必须加此 filter 防止在非点要素上渲染
    layout: {
      // 动态拼接文字内容：将 distance 属性(距离数值) 与 unit 属性(单位) 拼接，中间加个空格
      'text-field': ['concat', ['to-string', ['get', 'distance']], ' ', ['get', 'unit']],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'], // 文字所使用的字体栈 (需确保地图 glyphs 支持)
      'text-size': 14, // 文字字体大小 (像素)
      'symbol-placement': 'point', // 文字排版方式，由于是 Point 数据必须设为 point
      'text-variable-anchor': ['left', 'right', 'top', 'bottom'], // 自动调整文字锚点，防止被图形或其他标签遮挡
      'text-radial-offset': 0.5, // 文字距离中心点的径向偏移量 (配合 variable-anchor 使用)
    },
    paint: {
      'text-color': '#000000', // 测量文字的颜色 (默认黑色)
      'text-halo-color': '#FFFFFF', // 测量文字的描边(光晕)颜色，提升在复杂底图上的可读性
      'text-halo-width': 2, // 文字描边(光晕)的宽度
    },
  },

  // === 测量线节点样式 (测距过程中的拐点圆圈) ===
  // 必须与 lineLayerLabelSpec 配对使用。如果在业务页面修改标签样式，底层会调用 moveLayer，
  // 若找不到此图层会导致程序报错崩溃，因此必须保留此配置。
  routingLineLayerNodeSpec: {
    id: 'td-measure-line-node', // 必须匹配底层源码默认的 ID
    type: 'circle', // 图层类型，渲染为圆圈
    source: 'measure-line-label', // 必须与 lineLayerLabelSpec 使用同一个数据源
    filter: ['==', '$type', 'Point'], // 同理，只在点数据上渲染圆圈
    paint: {
      'circle-radius': 4, // 拐点圆圈的半径 (像素)
      'circle-color': '#FFFFFF', // 拐点圆圈的内部颜色 (白色)
      'circle-stroke-width': 2, // 拐点圆圈的边框宽度 (像素)
      'circle-stroke-color': '#3f97e0', // 拐点圆圈的边框颜色 (蓝色)
    },
  },

  // === 多边形面积标签样式 ===
  polygonLayerSpec: {
    id: 'measure-polygon-label', // 必须匹配底层源码内部的默认图层 ID
    type: 'symbol', // 符号图层
    source: 'measure-polygon-label', // 必须匹配底层生成的多边形标签数据源 ID
    filter: ['==', '$type', 'Point'], // 多边形的中心点也是以 Point 存储的
    layout: {
      // 动态拼接文字内容：将 area 属性(面积数值) 与 unit 属性(单位) 拼接
      'text-field': ['concat', ['to-string', ['get', 'area']], ' ', ['get', 'unit']],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'], // 文字所使用的字体栈
      'text-size': 14, // 文字字体大小 (像素)
      'symbol-placement': 'point', // 文字排版方式
    },
    paint: {
      'text-color': '#000000', // 面积测量文字的颜色
      'text-halo-color': '#FFFFFF', // 面积测量文字的描边颜色
      'text-halo-width': 2, // 面积测量文字的描边宽度
    },
  },
};
