import type {
  TerradrawControlOptions,
  MeasureControlOptions,
} from "../shared/mapLibre-controls-types";

/**
 * 绘图控件公共默认配置。
 * 说明：
 * 1. 这里适合放“项目级默认风格”和“项目级默认行为”；
 * 2. mapLibre-init 会先 cloneDeep 当前对象，再与业务页面传入的配置 merge；
 * 3. 因此业务页面仍然只需要覆写自己关心的少量字段；
 * 4. 新增可配项先保留为注释模板，目的是让开发者一眼知道这里还能配什么。
 */
export const terradrawStyleConfig: Partial<
  Pick<
    TerradrawControlOptions,
    | "modes"
    | "open"
    | "showDeleteConfirmation"
    | "adapterOptions"
    | "modeOptions"
  >
> = {
  // 当前工具栏显示哪些按钮；不传时走底层默认模式集合。
  // modes: [
  //   'point',
  //   'marker',
  //   'linestring',
  //   'polygon',
  //   'rectangle',
  //   'circle',
  //   'freehand',
  //   'freehand-linestring',
  //   'angled-rectangle',
  //   'sensor',
  //   'sector',
  //   'select',
  //   'delete-selection',
  //   'delete',
  //   'undo',
  //   'redo',
  //   'download',
  // ],

  // 控件初始化时是否默认展开工具栏。
  // open: false,

  // 删除要素前是否弹出确认框。
  // showDeleteConfirmation: true,

  // TerraDraw 底层适配器配置。
  // adapterOptions: {
  //   prefixId: 'td', // TerraDraw 内部 source / layer / feature 的统一前缀，用于避免与业务图层重名
  //   renderBelowLayerId: 'your-layer-id', // 把 TerraDraw 图层插入到某个业务图层下方
  // },

  modeOptions: {
    // 所有 modeOptions 都通用支持以下基础字段：
    // modeName: 当前模式名，通常不需要手动改
    // styles: 当前模式使用的样式对象
    // pointerDistance: 鼠标 / 触点判定半径，单位像素
    // validation: 几何合法性校验函数或校验器集合
    // projection: 底层投影实现，通常保持默认即可
    // pointerEvents: {
    //   leftClick: true, // 是否允许左键事件进入当前 mode；也可写成 (event) => boolean
    //   rightClick: true, // 是否允许右键事件进入当前 mode；也可写成 (event) => boolean
    //   contextMenu: false, // 是否允许原生右键菜单事件进入当前 mode；也可写成 (event) => boolean
    //   onDragStart: true, // 是否允许拖拽开始事件进入当前 mode；也可写成 (event) => boolean
    //   onDrag: true, // 是否允许拖拽中事件进入当前 mode；也可写成 (event) => boolean
    //   onDragEnd: true, // 是否允许拖拽结束事件进入当前 mode；也可写成 (event) => boolean
    // },
    // 1. 自定义画点样式
    point: {
      styles: {
        pointColor: "#3f97e0", // 点的颜色 (默认蓝色)
        pointWidth: 6, // 点的半径大小 (像素)
        pointOutlineColor: "#ffffff", // 点的边框颜色 (默认白色)
        pointOutlineWidth: 2, // 点的边框宽度 (像素)
        // pointOpacity: 1, // 点填充透明度，范围 0 - 1
        // pointOutlineOpacity: 1, // 点边框透明度，范围 0 - 1
        // editedPointColor: '#111111', // 点进入编辑态后的填充颜色
        // editedPointWidth: 8, // 点进入编辑态后的半径大小
        // editedPointOutlineColor: '#ffffff', // 点进入编辑态后的边框颜色
        // editedPointOutlineWidth: 3, // 点进入编辑态后的边框宽度
      },
      // cursors: {
      //   create: 'crosshair', // 新建点位时的鼠标样式
      //   dragStart: 'grabbing', // 开始拖拽点位时的鼠标样式
      //   dragEnd: 'pointer', // 结束拖拽点位后的鼠标样式
      // },
      // editable: true, // 是否允许点位继续编辑
    },
    // 自定义画标记点样式
    // marker: {
    //   styles: {
    //     markerUrl: '/assets/marker.png', // 标记点图片地址
    //     markerHeight: 32, // 标记点图片高度，单位像素
    //     markerWidth: 24, // 标记点图片宽度，单位像素
    //   },
    //   cursors: {
    //     create: 'crosshair', // 新建 marker 时的鼠标样式
    //     dragStart: 'grabbing', // 开始拖拽 marker 时的鼠标样式
    //     dragEnd: 'pointer', // 结束拖拽 marker 后的鼠标样式
    //   },
    //   editable: true, // 是否允许 marker 继续编辑
    // },
    // 2. 自定义画线样式
    linestring: {
      styles: {
        lineStringColor: "#3f97e0", // 线的颜色
        lineStringWidth: 4, // 线的宽度 (像素)
        closingPointColor: "#ffffff", // 绘制过程中，当前鼠标位置(末端提示点)的颜色
        closingPointWidth: 4, // 绘制过程中，末端提示点的半径大小 (像素)
        closingPointOutlineColor: "#000000", // 绘制过程中，末端提示点的边框颜色
        closingPointOutlineWidth: 1, // 绘制过程中，末端提示点的边框宽度 (像素)
        // lineStringOpacity: 1, // 线透明度，范围 0 - 1
        // closingPointOpacity: 1, // 末端提示点透明度
        // closingPointOutlineOpacity: 1, // 末端提示点边框透明度
        // snappingPointColor: '#00bcd4', // 吸附提示点颜色
        // snappingPointWidth: 5, // 吸附提示点半径大小
        // snappingPointOpacity: 1, // 吸附提示点透明度
        // snappingPointOutlineColor: '#ffffff', // 吸附提示点边框颜色
        // snappingPointOutlineWidth: 2, // 吸附提示点边框宽度
        // snappingPointOutlineOpacity: 1, // 吸附提示点边框透明度
        // coordinatePointColor: '#ffffff', // 已提交节点颜色
        // coordinatePointOpacity: 1, // 已提交节点透明度
        // coordinatePointWidth: 4, // 已提交节点半径大小
        // coordinatePointOutlineColor: '#000000', // 已提交节点边框颜色
        // coordinatePointOutlineWidth: 1, // 已提交节点边框宽度
        // coordinatePointOutlineOpacity: 1, // 已提交节点边框透明度
      },
      // snapping: {
      //   toLine: true, // 是否允许吸附到已有线段
      //   toCoordinate: true, // 是否允许吸附到已有节点
      //   // toCustom: (event, context) => undefined, // 自定义吸附目标；返回坐标后会吸附到该坐标
      // },
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始绘线时的鼠标样式
      //   close: 'pointer', // 收尾或闭合提示时的鼠标样式
      //   dragStart: 'grabbing', // 开始拖拽节点时的鼠标样式
      //   dragEnd: 'pointer', // 结束拖拽节点后的鼠标样式
      // },
      // insertCoordinates: {
      //   strategy: 'amount', // 在线段中间插入节点的策略；当前底层仅支持 amount
      //   value: 1, // 每段插入节点数量
      // },
      // editable: true, // 是否允许对已生成线继续拖拽编辑
      // showCoordinatePoints: true, // 是否显示已提交节点
      // finishOnNthCoordinate: 2, // 第 N 个点提交后自动结束
    },
    // 3. 自定义多边形样式
    polygon: {
      styles: {
        fillColor: "#3f97e0", // 多边形内部的填充颜色
        fillOpacity: 0.4, // 多边形内部的填充透明度 (0 - 1)
        outlineColor: "#3f97e0", // 多边形轮廓边框的颜色
        outlineWidth: 3, // 多边形轮廓边框的宽度 (像素)
        closingPointColor: "#ffffff", // 绘制过程中，当前鼠标位置(闭合提示点)的颜色
        closingPointWidth: 4, // 绘制过程中，闭合提示点的半径大小 (像素)
        closingPointOutlineColor: "#000000", // 绘制过程中，闭合提示点的边框颜色
        closingPointOutlineWidth: 1, // 绘制过程中，闭合提示点的边框宽度 (像素)
        // outlineOpacity: 1, // 多边形边框透明度
        // closingPointOpacity: 1, // 闭合提示点透明度
        // closingPointOutlineOpacity: 1, // 闭合提示点边框透明度
        // snappingPointColor: '#00bcd4', // 吸附提示点颜色
        // snappingPointWidth: 5, // 吸附提示点半径大小
        // snappingPointOpacity: 1, // 吸附提示点透明度
        // snappingPointOutlineColor: '#ffffff', // 吸附提示点边框颜色
        // snappingPointOutlineWidth: 2, // 吸附提示点边框宽度
        // snappingPointOutlineOpacity: 1, // 吸附提示点边框透明度
        // editedPointColor: '#ffffff', // 已编辑顶点颜色
        // editedPointWidth: 5, // 已编辑顶点半径大小
        // editedPointOpacity: 1, // 已编辑顶点透明度
        // editedPointOutlineColor: '#000000', // 已编辑顶点边框颜色
        // editedPointOutlineWidth: 2, // 已编辑顶点边框宽度
        // editedPointOutlineOpacity: 1, // 已编辑顶点边框透明度
        // coordinatePointColor: '#ffffff', // 已提交顶点颜色
        // coordinatePointOpacity: 1, // 已提交顶点透明度
        // coordinatePointWidth: 4, // 已提交顶点半径大小
        // coordinatePointOutlineColor: '#000000', // 已提交顶点边框颜色
        // coordinatePointOutlineWidth: 1, // 已提交顶点边框宽度
        // coordinatePointOutlineOpacity: 1, // 已提交顶点边框透明度
      },
      // snapping: {
      //   toLine: true, // 是否允许吸附到已有线段
      //   toCoordinate: true, // 是否允许吸附到已有节点
      //   // toCustom: (event, context) => undefined, // 自定义吸附目标；返回坐标后会吸附到该坐标
      // },
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始绘面时的鼠标样式
      //   close: 'pointer', // 临近闭合时的鼠标样式
      //   dragStart: 'grabbing', // 开始拖拽顶点时的鼠标样式
      //   dragEnd: 'pointer', // 结束拖拽顶点后的鼠标样式
      // },
      // editable: true, // 是否允许对已生成面继续拖拽编辑
      // showCoordinatePoints: true, // 是否显示已提交顶点
    },
    // 4. 自定义矩形样式
    rectangle: {
      styles: {
        fillColor: "#3f97e0", // 矩形内部的填充颜色
        fillOpacity: 0.4, // 矩形内部的填充透明度 (0 - 1)
        outlineColor: "#3f97e0", // 矩形轮廓边框的颜色
        outlineWidth: 3, // 矩形轮廓边框的宽度 (像素)
        // outlineOpacity: 1, // 矩形边框透明度
      },
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始绘制矩形时的鼠标样式
      // },
      // drawInteraction: 'click', // 绘制交互方式；不同底层版本可选 click / drag 等
    },
    // 5. 自定义圆形样式
    circle: {
      styles: {
        fillColor: "#3f97e0", // 圆形内部的填充颜色
        fillOpacity: 0.4, // 圆形内部的填充透明度 (0 - 1)
        outlineColor: "#3f97e0", // 圆形轮廓边框的颜色
        outlineWidth: 3, // 圆形轮廓边框的宽度 (像素)
        // outlineOpacity: 1, // 圆形边框透明度
      },
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始绘制圆形时的鼠标样式
      // },
      // startingRadiusKilometers: 0.1, // 圆初始半径，单位千米
      // drawInteraction: 'click', // 绘制交互方式；不同底层版本可选 click / drag 等
      // segments: 64, // 圆离散成多少段线，用于控制圆边平滑度
    },
    // 6. 自定义自由手绘模式样式
    freehand: {
      styles: {
        fillColor: "#3f97e0", // 闭合后的手绘多边形填充颜色 (若形成闭合面)
        fillOpacity: 0.4, // 闭合后的手绘多边形填充透明度 (0 - 1)
        outlineColor: "#3f97e0", // 手绘线条的颜色
        outlineWidth: 4, // 手绘线条的宽度 (像素)
        // outlineOpacity: 1, // 手绘线条透明度
        // closingPointColor: '#ffffff', // 闭合提示点颜色
        // closingPointOpacity: 1, // 闭合提示点透明度
        // closingPointWidth: 4, // 闭合提示点半径大小
        // closingPointOutlineColor: '#000000', // 闭合提示点边框颜色
        // closingPointOutlineOpacity: 1, // 闭合提示点边框透明度
        // closingPointOutlineWidth: 1, // 闭合提示点边框宽度
      },
      // minDistance: 0.00001, // 采样点之间的最小距离，越小越细腻
      // smoothing: 0.85, // 自由手绘平滑系数，越大曲线越平滑
      // preventPointsNearClose: true, // 是否阻止在闭合点附近生成过密节点
      // autoClose: true, // 是否在满足条件时自动闭合成面
      // autoCloseTimeout: 250, // 自动闭合判定延时，单位毫秒
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始自由绘制时的鼠标样式
      //   close: 'pointer', // 临近闭合时的鼠标样式
      // },
      // drawInteraction: 'drag', // 自由手绘常见交互方式，一般为拖拽绘制
    },
    // 'freehand-linestring': {
    //   styles: {
    //     lineStringColor: '#3f97e0', // 自由绘线颜色
    //     lineStringWidth: 4, // 自由绘线宽度
    //     lineStringOpacity: 1, // 自由绘线透明度
    //     closingPointColor: '#ffffff', // 末端提示点颜色
    //     closingPointOpacity: 1, // 末端提示点透明度
    //     closingPointWidth: 4, // 末端提示点半径大小
    //     closingPointOutlineColor: '#000000', // 末端提示点边框颜色
    //     closingPointOutlineWidth: 1, // 末端提示点边框宽度
    //     closingPointOutlineOpacity: 1, // 末端提示点边框透明度
    //   },
    //   minDistance: 0.00001, // 采样点之间的最小距离
    //   keyEvents: {
    //     cancel: 'Escape', // 取消当前绘制的快捷键
    //     finish: 'Enter', // 完成当前绘制的快捷键
    //   },
    //   cursors: {
    //     start: 'crosshair', // 开始自由绘线时的鼠标样式
    //     close: 'pointer', // 收尾时的鼠标样式
    //   },
    // },
    // 7. 自定义有角度矩形样式
    "angled-rectangle": {
      styles: {
        fillColor: "#3f97e0", // 倾斜矩形内部的填充颜色
        fillOpacity: 0.4, // 倾斜矩形内部的填充透明度 (0 - 1)
        outlineColor: "#3f97e0", // 倾斜矩形轮廓边框的颜色
        outlineWidth: 3, // 倾斜矩形轮廓边框的宽度 (像素)
        // outlineOpacity: 1, // 倾斜矩形边框透明度
      },
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始绘制倾斜矩形时的鼠标样式
      //   close: 'pointer', // 收尾时的鼠标样式
      // },
    },
    // 8. 自定义传感器/扇形模式样式 (常用于雷达范围展示)
    sensor: {
      styles: {
        fillColor: "#3f97e0", // 传感器扫描范围的填充颜色
        fillOpacity: 0.4, // 传感器扫描范围的填充透明度 (0 - 1)
        outlineColor: "#3f97e0", // 传感器扫描范围的边框颜色
        outlineWidth: 3, // 传感器扫描范围的边框宽度 (像素)
        // centerPointColor: '#ffffff', // 中心点颜色
        // centerPointWidth: 5, // 中心点半径大小
        // centerPointOpacity: 1, // 中心点透明度
        // centerPointOutlineColor: '#000000', // 中心点边框颜色
        // centerPointOutlineWidth: 1, // 中心点边框宽度
        // centerPointOutlineOpacity: 1, // 中心点边框透明度
        // outlineOpacity: 1, // 传感器边框透明度
      },
      // arcPoints: 64, // 圆弧离散成多少段，用于控制边缘平滑度
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始绘制传感器时的鼠标样式
      //   close: 'pointer', // 收尾时的鼠标样式
      // },
    },
    // 9. 自定义扇区模式样式
    sector: {
      styles: {
        fillColor: "#3f97e0", // 扇区内部的填充颜色
        fillOpacity: 0.4, // 扇区内部的填充透明度 (0 - 1)
        outlineColor: "#3f97e0", // 扇区轮廓边框的颜色
        outlineWidth: 3, // 扇区轮廓边框的宽度 (像素)
        // outlineOpacity: 1, // 扇区边框透明度
      },
      // arcPoints: 64, // 圆弧离散成多少段，用于控制边缘平滑度
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始绘制扇区时的鼠标样式
      //   close: 'pointer', // 收尾时的鼠标样式
      // },
    },
    // 10. 自定义选中状态下的样式（编辑模式）
    // select: {
    //   styles: {
    //     // === 当点处于选中状态时的样式 ===
    //     selectedPointColor: "#111111", // 选中点的颜色 (深色)
    //     selectedPointWidth: 8, // 选中点的半径大小 (略大于普通点)
    //     selectedPointOutlineColor: "#ffffff", // 选中点的边框颜色
    //     selectedPointOutlineWidth: 3, // 选中点的边框宽度
    //     // selectedPointOpacity: 1, // 选中点透明度
    //     // selectedPointOutlineOpacity: 1, // 选中点边框透明度

    //     // === 当线处于选中状态时的样式 ===
    //     selectedLineStringColor: "#111111", // 选中线的颜色 (深色)
    //     selectedLineStringWidth: 6, // 选中线的宽度 (略大于普通线)
    //     // selectedLineStringOpacity: 1, // 选中线透明度

    //     // === 当多边形/矩形/圆等面状图形处于选中状态时的样式 ===
    //     selectedPolygonColor: "#111111", // 选中面状图形时的填充颜色
    //     selectedPolygonFillOpacity: 0.6, // 选中面状图形时的填充透明度 (略深于普通状态)
    //     selectedPolygonOutlineColor: "#111111", // 选中面状图形时的边框颜色
    //     selectedPolygonOutlineWidth: 4, // 选中面状图形时的边框宽度
    //     // selectedPolygonOutlineOpacity: 1, // 选中面状图形边框透明度
    //     // selectedMarkerUrl: '/assets/marker-selected.png', // 选中 marker 的图片地址
    //     // selectedMarkerHeight: 36, // 选中 marker 的图片高度
    //     // selectedMarkerWidth: 28, // 选中 marker 的图片宽度

    //     // === 控制点/节点（用于拖拽调整形状的顶点）的样式 ===
    //     selectionPointColor: "#ffffff", // 拖拽控制点的颜色 (白色)
    //     selectionPointWidth: 5, // 拖拽控制点的半径大小
    //     selectionPointOutlineColor: "#111111", // 拖拽控制点的边框颜色
    //     selectionPointOutlineWidth: 2, // 拖拽控制点的边框宽度
    //     // selectionPointOpacity: 1, // 拖拽控制点透明度
    //     // selectionPointOutlineOpacity: 1, // 拖拽控制点边框透明度

    //     // === 中点（用于在两点之间添加新节点的中间点）的样式 ===
    //     midPointColor: "#ffffff", // 中点的颜色 (白色)
    //     midPointWidth: 4, // 中点的半径大小 (略小于控制点)
    //     midPointOutlineColor: "#111111", // 中点的边框颜色
    //     midPointOutlineWidth: 1, // 中点的边框宽度
    //     // midPointOpacity: 1, // 中点透明度
    //     // midPointOutlineOpacity: 1, // 中点边框透明度
    //   },
    //   // flags: {
    //   //   point: {
    //   //     feature: {
    //   //       validation: undefined, // 当前类型的选择态合法性校验器
    //   //       draggable: false, // 是否允许拖拽点位
    //   //       rotateable: false, // 是否允许旋转点位
    //   //       scaleable: false, // 是否允许缩放点位
    //   //       selfIntersectable: false, // 是否允许自相交
    //   //       coordinates: {
    //   //         snappable: true, // 顶点是否允许吸附
    //   //         midpoints: false, // 是否生成中点；也可传 { draggable: true } 单独控制中点可拖拽
    //   //         draggable: false, // 顶点是否允许拖拽
    //   //         resizable: false, // 顶点是否允许缩放
    //   //         deletable: false, // 顶点是否允许删除
    //   //       },
    //   //     },
    //   //   },
    //   //   linestring: {
    //   //     feature: {
    //   //       draggable: true, // 是否允许整体拖拽线
    //   //       rotateable: true, // 是否允许整体旋转线
    //   //       scaleable: true, // 是否允许整体缩放线
    //   //       coordinates: {
    //   //         snappable: true, // 顶点是否允许吸附
    //   //         midpoints: { draggable: true }, // 是否显示中点并允许拖拽插点
    //   //         draggable: true, // 顶点是否允许拖拽
    //   //         resizable: false, // 顶点是否允许缩放
    //   //         deletable: true, // 顶点是否允许删除
    //   //       },
    //   //     },
    //   //   },
    //   // },
    //   // keyEvents: {
    //   //   deselect: 'Escape', // 取消选择的快捷键
    //   //   delete: 'Delete', // 删除当前选中要素的快捷键
    //   //   rotate: ['Alt'], // 按住哪些键再拖拽时进入旋转
    //   //   scale: ['Shift'], // 按住哪些键再拖拽时进入缩放
    //   // },
    //   // dragEventThrottle: 0, // 拖拽事件节流间隔，单位毫秒
    //   // cursors: {
    //   //   pointerOver: 'pointer', // 鼠标悬浮到可编辑要素上的样式
    //   //   dragStart: 'grabbing', // 开始拖拽要素时的样式
    //   //   dragEnd: 'pointer', // 结束拖拽后的样式
    //   //   insertMidpoint: 'copy', // 鼠标悬浮到中点准备插入节点时的样式
    //   // },
    //   // allowManualDeselection: true, // 是否允许通过点击空白处手动取消选择
    //   // allowManualSelection: true, // 是否允许通过点击地图要素手动进入选择
    // },
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
export const measureStyleConfig: Partial<
  Pick<
    MeasureControlOptions,
    | "modes"
    | "open"
    | "showDeleteConfirmation"
    | "textFont"
    | "adapterOptions"
    | "modeOptions"
    | "pointLayerLabelSpec"
    | "lineLayerLabelSpec"
    | "routingLineLayerNodeSpec"
    | "polygonLayerSpec"
    | "measureUnitType"
    | "distancePrecision"
    | "distanceUnit"
    | "areaPrecision"
    | "areaUnit"
    | "measureUnitSymbols"
    | "computeElevation"
    | "terrainSource"
    | "elevationCacheConfig"
  >
> = {
  // 当前工具栏显示哪些按钮；不传时走底层默认模式集合。
  // modes: [
  //   'point',
  //   'marker',
  //   'linestring',
  //   'polygon',
  //   'rectangle',
  //   'circle',
  //   'freehand',
  //   'freehand-linestring',
  //   'angled-rectangle',
  //   'sensor',
  //   'sector',
  //   'select',
  //   'delete-selection',
  //   'delete',
  //   'undo',
  //   'redo',
  //   'download',
  // ],

  // 控件初始化时是否默认展开工具栏。
  // open: false,

  // 删除测量要素前是否弹出确认框。
  // showDeleteConfirmation: true,

  // 自定义测量标签字体栈。
  // textFont: ['Open Sans Regular', 'Arial Unicode MS Regular'],

  // TerraDraw 底层适配器配置。
  // adapterOptions: {
  //   prefixId: 'td-measure', // 测量扩展图层的统一前缀
  //   renderBelowLayerId: 'your-layer-id', // 把测量图层插入到某个业务图层下方
  // },

  // ==========================================
  // 0. 测量单位 / 精度 / 缓存公共默认配置
  // ==========================================
  // 全局默认使用公制；业务页面可局部改成 imperial
  // 测量单位体系：'metric' 公制，'imperial' 英制
  measureUnitType: "metric",
  // 强制指定距离单位，可选：
  // 公制: 'kilometer' | 'meter' | 'centimeter'
  // 英制: 'mile' | 'foot' | 'inch'
  distanceUnit: "meter",

  // 强制指定面积单位，可选：
  // 公制: 'square meters' | 'square kilometers' | 'ares' | 'hectares'
  // 英制: 'square feet' | 'square yards' | 'acres' | 'square miles'
  areaUnit: "square meters",

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
    // 测量控件的 modeOptions 与绘图控件同构。
    // 所有模式都通用支持：
    // 所有 modeOptions 都通用支持以下基础字段：
    // modeName: 当前模式名，通常不需要手动改
    // styles: 当前模式使用的样式对象
    // pointerDistance: 鼠标 / 触点判定半径，单位像素
    // validation: 几何合法性校验函数或校验器集合
    // projection: 底层投影实现，通常保持默认即可
    // pointerEvents: {
    //   leftClick: true, // 是否允许左键事件进入当前 mode；也可写成 (event) => boolean
    //   rightClick: true, // 是否允许右键事件进入当前 mode；也可写成 (event) => boolean
    //   contextMenu: false, // 是否允许原生右键菜单事件进入当前 mode；也可写成 (event) => boolean
    //   onDragStart: true, // 是否允许拖拽开始事件进入当前 mode；也可写成 (event) => boolean
    //   onDrag: true, // 是否允许拖拽中事件进入当前 mode；也可写成 (event) => boolean
    //   onDragEnd: true, // 是否允许拖拽结束事件进入当前 mode；也可写成 (event) => boolean
    // },

    // 自定义画点样式
    point: {
      // styles: {
      //   pointColor: '#3f97e0', // 点填充颜色
      //   pointWidth: 6, // 点半径大小
      //   pointOpacity: 1, // 点透明度
      //   pointOutlineColor: '#ffffff', // 点边框颜色
      //   pointOutlineOpacity: 1, // 点边框透明度
      //   pointOutlineWidth: 2, // 点边框宽度
      //   editedPointColor: '#111111', // 点进入编辑态后的填充颜色
      //   editedPointWidth: 8, // 点进入编辑态后的半径大小
      //   editedPointOutlineColor: '#ffffff', // 点进入编辑态后的边框颜色
      //   editedPointOutlineWidth: 3, // 点进入编辑态后的边框宽度
      // },
      // cursors: {
      //   create: 'crosshair', // 新建点位时的鼠标样式
      //   dragStart: 'grabbing', // 开始拖拽点位时的鼠标样式
      //   dragEnd: 'pointer', // 结束拖拽点位后的鼠标样式
      // },
      // editable: true, // 是否允许点位继续编辑
    },
    // 自定义画标记点样式
    // marker: {
    //   styles: {
    //     markerUrl: '/assets/marker.png', // 标记点图片地址
    //     markerHeight: 32, // 标记点图片高度
    //     markerWidth: 24, // 标记点图片宽度
    //   },
    //   cursors: {
    //     create: 'crosshair', // 新建 marker 时的鼠标样式
    //     dragStart: 'grabbing', // 开始拖拽 marker 时的鼠标样式
    //     dragEnd: 'pointer', // 结束拖拽 marker 后的鼠标样式
    //   },
    //   editable: true, // 是否允许 marker 继续编辑
    // },

    // 自定义画线样式
    linestring: {
      styles: {
        lineStringColor: "#3f97e0", // 测量线的颜色
        lineStringWidth: 4, // 测量线的宽度 (像素)
        closingPointColor: "#ffffff", // 测量绘制时，当前鼠标位置(末端提示点)的颜色
        closingPointWidth: 4, // 测量绘制时，末端提示点的半径大小
        closingPointOutlineColor: "#000000", // 测量绘制时，末端提示点的边框颜色
        closingPointOutlineWidth: 1, // 测量绘制时，末端提示点的边框宽度
        // lineStringOpacity: 1, // 测量线透明度
        // closingPointOpacity: 1, // 末端提示点透明度
        // closingPointOutlineOpacity: 1, // 末端提示点边框透明度
        // snappingPointColor: '#00bcd4', // 吸附提示点颜色
        // snappingPointWidth: 5, // 吸附提示点半径大小
        // snappingPointOpacity: 1, // 吸附提示点透明度
        // snappingPointOutlineColor: '#ffffff', // 吸附提示点边框颜色
        // snappingPointOutlineWidth: 2, // 吸附提示点边框宽度
        // snappingPointOutlineOpacity: 1, // 吸附提示点边框透明度
        // coordinatePointColor: '#ffffff', // 已提交节点颜色
        // coordinatePointOpacity: 1, // 已提交节点透明度
        // coordinatePointWidth: 4, // 已提交节点半径大小
        // coordinatePointOutlineColor: '#000000', // 已提交节点边框颜色
        // coordinatePointOutlineWidth: 1, // 已提交节点边框宽度
        // coordinatePointOutlineOpacity: 1, // 已提交节点边框透明度
      },
      // snapping: {
      //   toLine: true, // 是否允许吸附到已有线段
      //   toCoordinate: true, // 是否允许吸附到已有节点
      //   // toCustom: (event, context) => undefined, // 自定义吸附目标；返回坐标后会吸附到该坐标
      // },
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始测线时的鼠标样式
      //   close: 'pointer', // 收尾或闭合提示时的鼠标样式
      //   dragStart: 'grabbing', // 开始拖拽节点时的鼠标样式
      //   dragEnd: 'pointer', // 结束拖拽节点后的鼠标样式
      // },
      // insertCoordinates: {
      //   strategy: 'amount', // 在线段中间插入节点的策略；当前底层仅支持 amount
      //   value: 1, // 每段插入节点数量
      // },
      // editable: true, // 是否允许对已生成测量线继续拖拽编辑
      // showCoordinatePoints: true, // 是否显示已提交节点
      // finishOnNthCoordinate: 2, // 第 N 个点提交后自动结束
    },

    // 自定义画面样式
    polygon: {
      styles: {
        fillColor: "#3f97e0", // 测量面的内部填充颜色
        fillOpacity: 0.4, // 测量面的内部填充透明度
        outlineColor: "#3f97e0", // 测量面的边框颜色
        outlineWidth: 3, // 测量面的边框宽度
        closingPointColor: "#ffffff", // 测量面绘制时，当前鼠标位置(闭合提示点)的颜色
        closingPointWidth: 4, // 测量面绘制时，闭合提示点的半径大小
        closingPointOutlineColor: "#000000", // 测量面绘制时，闭合提示点的边框颜色
        closingPointOutlineWidth: 1, // 测量面绘制时，闭合提示点的边框宽度
        // outlineOpacity: 1, // 测量面边框透明度
        // closingPointOpacity: 1, // 闭合提示点透明度
        // closingPointOutlineOpacity: 1, // 闭合提示点边框透明度
        // snappingPointColor: '#00bcd4', // 吸附提示点颜色
        // snappingPointWidth: 5, // 吸附提示点半径大小
        // snappingPointOpacity: 1, // 吸附提示点透明度
        // snappingPointOutlineColor: '#ffffff', // 吸附提示点边框颜色
        // snappingPointOutlineWidth: 2, // 吸附提示点边框宽度
        // snappingPointOutlineOpacity: 1, // 吸附提示点边框透明度
        // editedPointColor: '#ffffff', // 已编辑顶点颜色
        // editedPointWidth: 5, // 已编辑顶点半径大小
        // editedPointOpacity: 1, // 已编辑顶点透明度
        // editedPointOutlineColor: '#000000', // 已编辑顶点边框颜色
        // editedPointOutlineWidth: 2, // 已编辑顶点边框宽度
        // editedPointOutlineOpacity: 1, // 已编辑顶点边框透明度
        // coordinatePointColor: '#ffffff', // 已提交顶点颜色
        // coordinatePointOpacity: 1, // 已提交顶点透明度
        // coordinatePointWidth: 4, // 已提交顶点半径大小
        // coordinatePointOutlineColor: '#000000', // 已提交顶点边框颜色
        // coordinatePointOutlineWidth: 1, // 已提交顶点边框宽度
        // coordinatePointOutlineOpacity: 1, // 已提交顶点边框透明度
      },
      // snapping: {
      //   toLine: true, // 是否允许吸附到已有线段
      //   toCoordinate: true, // 是否允许吸附到已有节点
      //   // toCustom: (event, context) => undefined, // 自定义吸附目标；返回坐标后会吸附到该坐标
      // },
      // keyEvents: {
      //   cancel: 'Escape', // 取消当前绘制的快捷键
      //   finish: 'Enter', // 完成当前绘制的快捷键
      // },
      // cursors: {
      //   start: 'crosshair', // 开始测面时的鼠标样式
      //   close: 'pointer', // 临近闭合时的鼠标样式
      //   dragStart: 'grabbing', // 开始拖拽顶点时的鼠标样式
      //   dragEnd: 'pointer', // 结束拖拽顶点后的鼠标样式
      // },
      // editable: true, // 是否允许对已生成测量面继续拖拽编辑
      // showCoordinatePoints: true, // 是否显示已提交顶点
    },

    // 自定义矩形样式
    // rectangle: {
    //   styles: {
    //     fillColor: '#3f97e0', // 矩形填充颜色
    //     fillOpacity: 0.4, // 矩形填充透明度
    //     outlineColor: '#3f97e0', // 矩形边框颜色
    //     outlineOpacity: 1, // 矩形边框透明度
    //     outlineWidth: 3, // 矩形边框宽度
    //   },
    //   keyEvents: {
    //     cancel: 'Escape', // 取消当前绘制的快捷键
    //     finish: 'Enter', // 完成当前绘制的快捷键
    //   },
    //   cursors: {
    //     start: 'crosshair', // 开始绘制矩形时的鼠标样式
    //   },
    //   drawInteraction: 'click', // 绘制交互方式；不同底层版本可选 click / drag 等
    // },

    // 自定义圆形样式
    // circle: {
    //   styles: {
    //     fillColor: '#3f97e0', // 圆填充颜色
    //     fillOpacity: 0.4, // 圆填充透明度
    //     outlineColor: '#3f97e0', // 圆边框颜色
    //     outlineOpacity: 1, // 圆边框透明度
    //     outlineWidth: 3, // 圆边框宽度
    //   },
    //   keyEvents: {
    //     cancel: 'Escape', // 取消当前绘制的快捷键
    //     finish: 'Enter', // 完成当前绘制的快捷键
    //   },
    //   cursors: {
    //     start: 'crosshair', // 开始绘制圆形时的鼠标样式
    //   },
    //   startingRadiusKilometers: 0.1, // 圆初始半径，单位千米
    //   drawInteraction: 'click', // 绘制交互方式
    //   segments: 64, // 圆离散成多少段线，用于控制圆边平滑度
    // },

    // 其余可配模式仍与 terradrawStyleConfig 中的同名 mode 完全同构，
    // 包括：
    // freehand、freehand-linestring、angled-rectangle、sensor、sector、select。
    // 如果业务页面确实要在测量控件里启用这些模式，可直接把上方绘图控件中的同名配置块拷贝到这里再按需裁剪。
  },

  // 2. 测量结果文字标签的样式自定义 (遵循 MapLibre 的 SymbolLayer / CircleLayer 规范)
  // 说明：
  // 1. 下列 label / nodeSpec 遵循 MapLibre 原生图层规范；
  // 2. 如果需要继续扩展更多 layout / paint 字段，可参考 shared/map-layer-style-config.ts；
  // 3. 若配合 adapterOptions.prefixId 使用，建议在自定义 spec 中保留 {prefix} 占位符，便于底层自动替换。

  // pointLayerLabelSpec: {
  //   id: '{prefix}-point-label', // 点测量标签图层 ID；建议保留 {prefix} 占位符
  //   type: 'symbol', // 图层类型，必须为 symbol
  //   source: '{prefix}-point', // 点测量标签数据源 ID；建议保留 {prefix} 占位符
  //   filter: [
  //     'all',
  //     ['==', '$type', 'Point'],
  //     ['any', ['==', 'mode', 'point'], ['==', 'mode', 'marker']],
  //   ], // 仅在 point / marker 生成的 Point 要素上显示标签
  //   layout: {
  //     'text-field': ['get', 'elevation'], // 文本内容表达式，可按 elevation / elevationUnit 等字段拼接
  //     'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'], // 字体栈
  //     'text-size': 14, // 字号，单位像素
  //     'symbol-placement': 'point', // 标签排版方式
  //     'text-overlap': 'always', // 是否允许标签始终显示
  //     'text-variable-anchor': ['left', 'right', 'top', 'bottom'], // 自动选择更合适的锚点
  //     'text-radial-offset': 0.5, // 文本距离点位的径向偏移量
  //     'text-justify': 'center', // 多行文本对齐方式
  //     'text-letter-spacing': 0.05, // 字符间距
  //     // 'text-anchor': 'top', // 固定锚点位置
  //     // 'text-offset': [0, 1], // 文本相对锚点的偏移量
  //   },
  //   paint: {
  //     'text-color': '#232E3D', // 文字颜色
  //     'text-halo-color': '#F7F7F7', // 文字描边颜色
  //     'text-halo-width': 2, // 文字描边宽度
  //     // 'text-opacity': 1, // 文字透明度
  //     // 'text-halo-blur': 0, // 文字描边模糊程度
  //   },
  // },

  // === 线段距离标签样式 ===
  lineLayerLabelSpec: {
    id: "measure-line-label", // 必须匹配底层源码内部的默认图层 ID，不可更改
    type: "symbol", // 图层类型，必须为文字/图标符号图层
    source: "measure-line-label", // 必须匹配底层源码内部生成的数据源 ID，不可更改
    filter: ["==", "$type", "Point"], // 源码中文字挂载点是以 Point 存储的，必须加此 filter 防止在非点要素上渲染
    layout: {
      // 动态拼接文字内容：将 distance 属性(距离数值) 与 unit 属性(单位) 拼接，中间加个空格
      "text-field": [
        "concat",
        ["to-string", ["get", "distance"]],
        " ",
        ["get", "unit"],
      ],
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"], // 文字所使用的字体栈 (需确保地图 glyphs 支持)
      "text-size": 14, // 文字字体大小 (像素)
      "symbol-placement": "point", // 文字排版方式，由于是 Point 数据必须设为 point
      "text-variable-anchor": ["left", "right", "top", "bottom"], // 自动调整文字锚点，防止被图形或其他标签遮挡
      "text-radial-offset": 0.5, // 文字距离中心点的径向偏移量 (配合 variable-anchor 使用)
      // 'text-overlap': 'always', // 是否允许标签始终显示
      // 'text-anchor': 'center', // 固定锚点位置；若启用 variable-anchor，通常不必再配
      // 'text-justify': 'center', // 多行文本对齐方式
      // 'text-letter-spacing': 0.05, // 字符间距
      // 'text-offset': [0, 0], // 文本相对锚点的偏移量
    },
    paint: {
      "text-color": "#000000", // 测量文字的颜色 (默认黑色)
      "text-halo-color": "#FFFFFF", // 测量文字的描边(光晕)颜色，提升在复杂底图上的可读性
      "text-halo-width": 2, // 文字描边(光晕)的宽度
      // 'text-opacity': 1, // 文字透明度
      // 'text-halo-blur': 0, // 文字描边模糊程度
    },
  },

  // === 测量线节点样式 (测距过程中的拐点圆圈) ===
  // 必须与 lineLayerLabelSpec 配对使用。如果在业务页面修改标签样式，底层会调用 moveLayer，
  // 若找不到此图层会导致程序报错崩溃，因此必须保留此配置。
  routingLineLayerNodeSpec: {
    id: "td-measure-line-node", // 必须匹配底层源码默认的 ID
    type: "circle", // 图层类型，渲染为圆圈
    source: "measure-line-label", // 必须与 lineLayerLabelSpec 使用同一个数据源
    filter: ["==", "$type", "Point"], // 同理，只在点数据上渲染圆圈
    // layout: {
    //   visibility: 'visible', // 图层显隐控制
    // },
    paint: {
      "circle-radius": 4, // 拐点圆圈的半径 (像素)
      "circle-color": "#FFFFFF", // 拐点圆圈的内部颜色 (白色)
      "circle-stroke-width": 2, // 拐点圆圈的边框宽度 (像素)
      "circle-stroke-color": "#3f97e0", // 拐点圆圈的边框颜色 (蓝色)
      // 'circle-opacity': 1, // 圆点整体透明度
      // 'circle-stroke-opacity': 1, // 圆点边框透明度
      // 'circle-blur': 0, // 圆点模糊程度
    },
  },

  // === 多边形面积标签样式 ===
  polygonLayerSpec: {
    id: "measure-polygon-label", // 必须匹配底层源码内部的默认图层 ID
    type: "symbol", // 符号图层
    source: "measure-polygon-label", // 必须匹配底层生成的多边形标签数据源 ID
    filter: ["==", "$type", "Point"], // 多边形的中心点也是以 Point 存储的
    layout: {
      // 动态拼接文字内容：将 area 属性(面积数值) 与 unit 属性(单位) 拼接
      "text-field": [
        "concat",
        ["to-string", ["get", "area"]],
        " ",
        ["get", "unit"],
      ],
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"], // 文字所使用的字体栈
      "text-size": 14, // 文字字体大小 (像素)
      "symbol-placement": "point", // 文字排版方式
      // 'text-overlap': 'always', // 是否允许标签始终显示
      // 'text-anchor': 'center', // 固定锚点位置
      // 'text-justify': 'center', // 多行文本对齐方式
      // 'text-letter-spacing': 0.05, // 字符间距
      // 'text-offset': [0, 0], // 文本相对锚点的偏移量
    },
    paint: {
      "text-color": "#000000", // 面积测量文字的颜色
      "text-halo-color": "#FFFFFF", // 面积测量文字的描边颜色
      "text-halo-width": 2, // 面积测量文字的描边宽度
      // 'text-opacity': 1, // 文字透明度
      // 'text-halo-blur': 0, // 文字描边模糊程度
    },
  },
};
