<template>
  <div class="page">
    <!-- 需要一个地图容器，设置地图容器宽高 -->
    <div class="maplibre-area">
      <map-libre-init
        ref="mapInitRef"
        :mapOptions="mapOptions"
        :controls="mapControls"
        :mapInteractive="mapInteractive"
        :plugins="mapPlugins"
      >
        <!-- 自定义控件插槽 -->
        <template #MglCustomControl>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton style="background: white; width: 120px" @click="getDrawnData"
              >获取绘制数据</ElButton
            >
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton style="background: white; width: 120px" @click="getMeasureData"
              >获取测量数据</ElButton
            >
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton style="background: white; width: 130px" @click="runRawApiDemo">
              rawHandles示例
            </ElButton>
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton style="background: white; width: 120px" @click="changeStyle">
              切换样式
            </ElButton>
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton style="background: white; width: 120px" @click="toggleFlash">
              {{ flashButtonText }}
            </ElButton>
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton
              style="background: white; width: 140px"
              @click="downloadPrimaryBusinessSourceDxf"
            >
              导出主业务DXF
            </ElButton>
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton
              style="background: white; width: 150px"
              @click="refreshIntersectionPreviewDemo"
            >
              刷新交点示例
            </ElButton>
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton
              style="background: white; width: 190px"
              @click="toggleIntersectionPreviewScope"
            >
              {{ intersectionScopeButtonText }}
            </ElButton>
          </mgl-custom-control>
        </template>
        <template #dataSource>
          <!--
            业务层现在优先通过 MapBusinessSourceLayers 声明高频图层。
            如果 geometryTypes / where / filter 仍然不够表达业务规则，再回退到原始 Mgl 图层写法。
          -->
          <map-business-source-layers :source="primaryBusinessSource" />
          <map-business-source-layers :source="secondaryBusinessSource" />
        </template>
      </map-libre-init>
    </div>
    <NGGI00DemoPanel
      :isSelectionActive="isSelectionActive"
      :selectionMode="selectionMode"
      :selectedCount="selectedCount"
      :selectedFeatureIds="selectedFeatureIds"
      :selectedLayerGroups="selectedLayerGroups"
      :selectedCircleIds="selectedCircleIds"
      :hasSelection="hasSelection"
      :selectedLineFeatureId="selectedLineFeatureId"
      :selectedLineSourceId="selectedLineSourceId"
      :hasLineDraftFeatures="hasLineDraftFeatures"
      :lineDraftCount="lineDraftPreview.featureCount.value"
      :intersectionCount="intersectionPreview.count.value"
      :intersectionMaterializedCount="intersectionPreview.materializedCount.value"
      :dxfDefaultOptions="dxfDefaultOptions"
      :dxfPrimaryOptions="dxfPrimaryOptions"
      :selectionPanelState="selectionPanelState"
      @activate-selection="activateSelection"
      @clear-selection="clearSelection"
      @deactivate-selection="deactivateSelection"
      @clear-line-draft="handleClearLineDraftFeatures"
      @clear-materialized-intersections="handleClearMaterializedIntersections"
    />
    <!-- 引入自定义的 Vue Popup 组件 -->
    <mgl-popup
      v-model:visible="popupVisible"
      :lngLat="popupLngLat"
      :options="{ closeButton: true, closeOnClick: true, maxWidth: '420px' }"
    >
      <NGGI00PopupPanel
        :payload="popupPayload"
        :hasLineDraftFeatures="hasLineDraftFeatures"
        v-model:widthMeters="lineActionForm.widthMeters"
        v-model:extendLengthMeters="lineActionForm.extendLengthMeters"
        @popup-action="handlePopupAction"
        @generate-line-corridor="handleGenerateLineCorridor"
        @create-line-draft="handleCreateLineDraft"
        @clear-line-draft="handleClearLineDraftFeatures"
      />
    </mgl-popup>
    <!--
      属性面板示例已切到“单键保存 / 显式删除”模式。
      业务层不再整包覆盖属性对象，避免误删系统字段，也更贴近真实业务的增量修改场景。
    -->
    <feature-property-editor
      v-model:visible="contextMenuState.visible"
      :position="contextMenuState.position"
      :panelState="contextMenuState.panelState"
      :rawProperties="contextMenuState.rawProperties"
      :summaryRows="contextMenuState.summaryRows"
      :note="contextMenuState.note"
      @save-item="handleSavePropertyItem"
      @remove-item="handleRemovePropertyItem"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 引入地图初始化组件，作为地图页面的容器。
 */
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  MglCustomControl,
  MglPopup,
  businessLayers,
  businessSources,
  layerStyles,
  mapExpressions,
  resolveMapDxfExportApi,
  useBusinessMap,
  useMapPopupState,
} from "vue-maplibre-kit/business";
import type * as BusinessKit from "vue-maplibre-kit/business";
import FeaturePropertyEditor from "./components/FeaturePropertyEditor.vue";
import NGGI00DemoPanel from "./components/NGGI00DemoPanel.vue";
import NGGI00PopupPanel from "./components/NGGI00PopupPanel.vue";
import {
  NGGI00_POPUP_TYPE,
  createLinePopupPayload,
  createPointPopupPayload,
  createTerradrawPopupPayload,
  getLinePopupPayload,
  type NgPopupPayload,
} from "./components/NGGI00PopupPanel.shared";
import {
  DRAW_PROPERTY_PANEL_NOTE,
  DXF_DEFAULT_FILE_NAME,
  DXF_PRIMARY_ONLY_FILE_NAME,
  EMPTY_CONTEXT_MENU_TEXT,
  LINE_DRAFT_PROPERTY_PANEL_NOTE,
  MAP_CONTEXT_MENU_SUMMARY_TEXT,
  MAP_PROPERTY_PANEL_NOTE,
  MEASURE_PROPERTY_PANEL_NOTE,
  TERRADRAW_CONTEXT_MENU_SUMMARY_TEXT,
  buildSelectionChangeSummary,
  buildSelectionSummaryRows,
  buildSelectionSummaryText,
  createSelectionPanelState,
  type DxfSummaryOptions,
  type SelectionSummaryRow,
} from "./components/NGGI00DemoPanel.shared";
import { computed, ref, reactive } from "vue";
import mapGeojson from "./mock/map.geojson";
import mapGeojson2 from "./mock/map2.geojson";
import { ElButton, ElMessage } from "element-plus";
import {
  MapLineMeasureTool,
  MapLineExtensionTool,
  type MapCommonFeatureCollection,
  type MapCommonFeature,
  type MapCommonLineFeature,
} from "vue-maplibre-kit/geometry";
import {
  createLineDraftPreviewPlugin,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
} from "vue-maplibre-kit/plugins/line-draft-preview";
import {
  createIntersectionPreviewPlugin,
} from "vue-maplibre-kit/plugins/intersection-preview";
import {
  createMapDxfExportPlugin,
  type MapDxfExportOptions,
  type MapDxfExportTaskOptions,
  type MapDxfLayerNameResolver,
} from "vue-maplibre-kit/plugins/map-dxf-export";
import { createMapFeatureMultiSelectPlugin } from "vue-maplibre-kit/plugins/map-feature-multi-select";
import { createMapFeatureSnapPlugin } from "vue-maplibre-kit/plugins/map-feature-snap";
import type { GeoJSONSource } from "maplibre-gl";

// 业务 source 工厂统一从分组入口读取，避免业务页面在根入口平铺查找。
const { createMapBusinessSource, createMapBusinessSourceRegistry } = businessSources;

// 业务图层工厂同样按职责分组，方便业务开发者记忆“去哪里找什么”。
const {
  createCircleBusinessLayer,
  createFillBusinessLayer,
  createLineBusinessLayer,
  createSymbolBusinessLayer,
} = businessLayers;

// 样式工厂统一放在 layerStyles 分组下，减少 import 列表长度。
const {
  createCircleLayerStyle,
  createFillLayerStyle,
  createLineLayerStyle,
  createSymbolLayerStyle,
} = layerStyles;

// 表达式工具收敛到同一个分组，业务层只需要记住一个入口。
const {
  createFeatureStateExpression,
  matchFeatureProperty,
  whenFeaturePropertyEquals,
  whenFeaturePropertyIn,
} = mapExpressions;

/**
 * 当前页面统一使用的业务数据源 ID。
 * 所有 source 相关逻辑只认这一组常量，避免页面里散落字符串。
 */
const SOURCE_IDS = {
  primary: "test_geojson_source",
  secondary: "test_geojson_source_secondary",
} as const;

/**
 * 闪烁示例统一使用的目标要素集合。
 * 业务层只维护这一份目标声明，避免 sourceId 和 featureId 在动作逻辑里散落。
 */
const FLASH_TARGETS = [
  { source: SOURCE_IDS.primary, id: "point_1" },
  { source: SOURCE_IDS.primary, id: "point_2" },
  { source: SOURCE_IDS.primary, id: "line_1" },
] as const satisfies readonly BusinessKit.MapFeatureStateTarget[];

/**
 * 当前页面统一使用的业务图层 ID。
 * 模板、交互配置和摘要逻辑共用这一份常量，避免多处手写 layer-id。
 */
const LAYER_IDS = {
  circle: "circleLayer",
  circleDec: "circleLayerDec",
  primaryLine: "lineLayer",
  fill: "fillLayer",
  symbol: "symbolLayer",
  secondaryLine: "lineLayerSecondary",
  secondaryFill: "fillLayerSecondary",
} as const;

/**
 * 修改样式示例统一使用的 feature-state 键名。
 * 这里故意使用 feature-state，而不是直接改 GeoJSON 数据。
 * 样式配置里会直接把它写成 `demoStyled`，方便业务层照着示例抄；
 * 按钮逻辑则统一复用这个常量，避免多处散落字符串。
 */
const DEMO_STYLE_STATE_KEY = "demoStyled";

/**
 * raw API 示例统一使用的 source / layer / feature 标识。
 * 这里集中管理字符串，避免示例逻辑里散落硬编码 ID。
 */
const RAW_DEMO_IDS = {
  source: "nggi00_raw_demo_source",
  layer: "nggi00_raw_demo_layer",
  feature: "nggi00_raw_demo_feature",
} as const;

/**
 * raw API 示例统一使用的颜色状态。
 * 按钮重复点击时会在这两种颜色之间切换，方便直观看到“只用底层 API 改样式”的效果。
 */
const RAW_DEMO_COLORS = {
  idle: "#1677ff",
  active: "#fa541c",
} as const;

/** raw API 示例统一复用公开实例上的原始地图类型，避免与宿主类型来源分叉。 */
type RawDemoMap = NonNullable<BusinessKit.MapLibreInitExpose["rawHandles"]["map"]>;

import sendIcon from "./assets/send.svg";
// import segment_stretch_test from './assets/segment-stretch.svg';
import texturelabsWater from "./assets/Texturelabs_Water.jpg";

/**
 * ==========================
 * 业务数据源与图层常量定义
 * ==========================
 */

// 业务数据响应式引用 (通常来自接口请求或本地 mock)
const test_geojson = ref<MapCommonFeatureCollection>(mapGeojson as MapCommonFeatureCollection);
const test_geojson_secondary = ref<MapCommonFeatureCollection>(
  mapGeojson2 as MapCommonFeatureCollection,
);

/**
 * 当前页面持有的地图组件公开实例引用。
 * 业务层所有地图操作都通过它与底层进行通信。
 */
const mapInitRef = ref<BusinessKit.MapLibreInitExpose | null>(null);

/**
 * 核心：初始化地图基础配置。
 * @description
 * 业务层无需关注 `container`，只需配置底图视角、操作限制即可。
 * 例如：
 * - center: 初始中心点 [lng, lat]
 * - zoom: 初始缩放级别
 * - style: 底图样式地址
 */
const mapOptions: Omit<BusinessKit.MapOptions, "container"> = {
  // 无需 container 属性，因为 vue-maplibre-gl 组件内部会自动挂载和管理容器

  // === 以下为 MapOptions 核心 API 示例 (按需取消注释使用) ===

  // --- 基础视图配置 ---
  // center: [114.305556, 22.543056], // 初始中心点坐标 [lng, lat]
  // zoom: 2, // 初始缩放级别
  // bearing: 0, // 初始方位角(旋转角度)，以正北为基准逆时针测量的度数
  // pitch: 0, // 初始倾斜角度 (0-85度)
  // style: 'https://demotiles.maplibre.org/style.json', // 地图样式 URL 或 JSON 对象
  // bounds: [[-73.9876, 40.7661], [-73.9397, 40.8002]], // 初始边界框，会覆盖 center 和 zoom

  // --- 限制与约束 ---
  minZoom: 0, // 最小缩放级别 (0-24)
  maxZoom: 20, // 最大缩放级别
  minPitch: 0, // 最小倾斜角度
  maxPitch: 85, // 最大倾斜角度
  // maxBounds: [[-180, -85], [180, 85]], // 限制平移/缩放的最大边界框

  // --- 交互控制 ---
  // interactive: true, // 是否接受任何鼠标、触摸或键盘交互事件
  // dragPan: true, // 是否允许拖拽平移 (也可传对象配置缓动等)
  // scrollZoom: true, // 是否允许鼠标滚轮缩放
  // boxZoom: true, // 是否允许按住 Shift 键并拖拽鼠标绘制边界框缩放
  // dragRotate: true, // 是否允许按住右键（或 Ctrl + 左键）拖拽来旋转和倾斜地图
  doubleClickZoom: false, // 是否允许双击缩放 (在这个示例中，设置为 false 以避免与自定义的 onDoubleClick 冲突)
  // keyboard: true, // 是否允许键盘交互
  // cooperativeGestures: false, // 开启后，单指滑动网页时不会触发地图拖动 (适合嵌入长页面的地图)

  // --- 渲染与表现 ---
  // canvasContextAttributes: { antialias: false }, // WebGL 上下文配置，例如开启多重采样抗锯齿(MSAA)
  renderWorldCopies: false, // 缩小到足够小时，是否渲染多个世界的拷贝
  // crossSourceCollisions: true, // 是否在不同数据源之间执行碰撞检测(防重叠)
  // fadeDuration: 300, // 标签文本等元素的淡入淡出动画持续时间(毫秒)

  // --- UI 控件配置 ---
  // attributionControl: false, // 是否自动添加版权信息控件 (默认已在底层组件设为 false)
  // logoPosition: 'bottom-left', // MapLibre Logo 的显示位置
};

/**
 * 核心：注册并配置地图控件。
 * @description
 * 以组件名为 key，控制各种原生控件与测绘控件的显隐及初始化参数。
 * 未在此处显式声明的控件默认不渲染。
 */
const mapControls: BusinessKit.MapControlsConfig = {
  // 导航控件：提供缩放按钮和罗盘(指南针)
  // MglNavigationControl: {
  //     isUse: true,
  //     position: 'top-right',
  //     showCompass: true, // 是否显示指南针
  //     showZoom: true, // 是否显示缩放按钮
  //     visualizePitch: true // 指南针是否会根据地图的倾斜角度（pitch）发生视觉变化
  // },

  // 全屏控件：允许用户将地图放大到全屏
  MglFullscreenControl: {
    isUse: true,
    position: "bottom-left",
    container: null, // 指定要全屏的容器，如果为 null 则全屏整个 document.body
  },

  // 定位控件：获取并跟踪用户当前位置
  // MglGeolocationControl: {
  //     isUse: true,
  //     position: 'top-right',
  //     trackUserLocation: true, // 是否持续跟踪用户位置
  //     showAccuracyCircle: true, // 是否显示定位精度的圆圈
  //     showUserLocation: true, // 是否显示用户当前位置的标记点
  //     positionOptions: { enableHighAccuracy: true }, // Geolocation API 的选项
  //     fitBoundsOptions: { maxZoom: 15 } // 视角平移到用户位置时的动画参数
  // },

  // 比例尺控件：显示当前地图的比例尺
  // MglScaleControl: {
  //     isUse: true,
  //     position: 'bottom-left',
  //     unit: 'metric', // 使用的单位：'imperial'(英制)、'metric'(公制)或'nautical'(海里)
  //     maxWidth: 100 // 比例尺的最大物理宽度（像素）
  // },

  // 样式切换控件：允许用户在不同的地图样式(底图)之间切换
  // MglStyleSwitchControl: {
  //     isUse: true,
  //     position: 'bottom-right',
  //     isOpen: false, // 控件面板初始是否展开
  //     // 定义可供切换的地图样式列表
  //     mapStyles: [
  //         {
  //             title: 'Demo Tiles', // 显示在切换面板上的名称
  //             uri: 'https://demotiles.maplibre.org/style.json' // 样式的 URL 或 JSON 对象
  //         },
  //         {
  //             title: 'OSM Standard',
  //             uri: 'https://raw.githubusercontent.com/go2garret/maps/main/src/assets/json/standard.json'
  //         }
  //     ],
  //     // 当前选中的样式的 title 或 uri (如果不设置，默认选中 mapStyles 的第一项或当前地图的样式)
  //     modelValue: { title: 'Demo Tiles', uri: 'https://demotiles.maplibre.org/style.json' }
  // },

  // 帧率控件：在开发或性能调优时显示地图渲染的 FPS
  // MglFrameRateControl: {
  //     isUse: false, // 默认不开启，通常只在开发调试时使用
  //     position: 'bottom-left',
  //     background: 'rgba(0,0,0,0.8)', // 背景色
  //     barWidth: 4, // 柱状图的宽度
  //     color: '#7FFF00', // 文本和图表的颜色
  //     font: '10px/1.2 monospace', // 字体
  //     graphHeight: 20, // 图表高度
  //     graphWidth: 60, // 图表宽度
  //     width: 70 // 整个控件的宽度
  // },

  // 归属信息控件：显示地图数据的版权和来源信息
  // MglAttributionControl: {
  //     isUse: true,
  //     position: 'bottom-right',
  //     compact: false, // 是否使用紧凑模式（大屏幕默认 false，小屏幕默认 true）
  //     customAttribution: '© MapLibre Contributors' // 附加的自定义版权信息
  // },

  // 注意两种绘图控件 二选一，否则容易出现图层覆盖问题。
  // 绘图控件：提供点、线、面等绘制工具
  MaplibreTerradrawControl: {
    isUse: false,
    position: "top-left",
    // 默认是否展开工具栏
    open: false,
    // 启用绘图控件吸附。
    // 业务层无需关心底层 toLine / toCoordinate / toCustom 的具体接法，
    // 这里只负责声明“当前控件要开吸附”即可。
    snapping: {
      enabled: true,
    },
    // 是否在删除绘制要素前弹出确认框
    // showDeleteConfirmation: true,
    // 需要显示的工具栏模式，不传则显示全部。
    // modes: ['point', 'linestring', 'polygon', 'rectangle', 'circle', 'freehand', 'angled-rectangle', 'sensor', 'sector', 'select', 'delete-selection', 'delete', 'download'],
    // 底层 TerraDraw 的适配器配置，例如修改坐标精度（默认 9 位小数）
    // adapterOptions: { coordinatePrecision: 6 },

    // ==========================================
    // 深度定制各种绘制模式的行为和样式
    // ==========================================
    // 示例：如果需要在当前业务页面覆盖全局的绘图样式，只需写入需要修改的配置即可，会自动与全局配置合并
    /* modeOptions: {
      // 覆盖画点模式，例如将当前页面的画点颜色改为亮粉色
      point: {
        styles: {
          pointColor: '#FF1493', // 亮粉色
          pointWidth: 8,
          pointOutlineColor: '#FFFFFF',
          pointOutlineWidth: 2,
        },
      },
    }, */

    // ==========================================
    // 绘图控件线装饰示例
    // ==========================================
    lineDecoration: {
      enabled: true,
      // defaultStyle: {
      //   mode: 'segment-stretch',
      //   svg: segment_stretch_test, // 推荐使用 import 导入的静态 SVG 资源
      //   lineWidth: 30, // 每个拉伸段的像素宽度
      //   opacity: 0.95, // 拉伸图层透明度
      // } as TerradrawLineDecorationStyle,
      // 如果你仍然想使用沿线重复图标的模式，可以切回下面这组配置：
      defaultStyle: {
        mode: "symbol-repeat",
        svg: sendIcon,
        spacing: 1,
        size: 0.2,
        opacity: 0.95,
        iconRotate: 0,
        keepUpright: true,
      } as BusinessKit.TerradrawLineDecorationStyle,
    },

    // TerraDraw 业务属性治理示例。
    // 这里直接把规则内联写在配置现场，方便业务层阅读示例时不用来回跳。
    // `fixedKeys` 表示稳定业务字段：可见、可改、默认不可删。
    // `readonlyKeys` 表示只读字段：可见、不可改、不可删。
    // 这份对象仍然保留 `BusinessKit.MapFeaturePropertyPolicy` 类型约束。
    propertyPolicy: {
      fixedKeys: ["bizName"],
      readonlyKeys: ["bizCode"],
    } satisfies BusinessKit.MapFeaturePropertyPolicy,

    // 统一封装的业务交互入口
    interactive: {
      // 是否启用交互事件监听，设为 false 则完全不响应下面配置的回调
      enabled: true,

      // 鼠标移动到绘制要素上时光标的样式
      cursor: "pointer",

      // 交互管理器准备完成时触发，适合做初始化日志或状态检查
      onReady: () => {
        console.log("[TerraDraw 示例] 业务交互管理器已初始化完成");
      },

      // 绘图模式发生切换时触发（如从画点切换到画线），适合同步更新外部 UI 状态
      onModeChange: (context) => {
        console.log(`[TerraDraw 示例] 当前模式切换为: ${context.mode}`);
      },

      // 某个要素完成绘制（或编辑结束）时触发，适合在这里执行保存到后端或计算逻辑
      onFeatureFinish: (context) => {
        console.log(
          "[TerraDraw 示例] 要素完成绘制/编辑:",
          context.featureId,
          context.finishContext,
        );
      },

      // 要素形状或属性发生任何变化时触发，可用于实时同步数据
      onFeatureChange: (context) => {
        console.log("[TerraDraw 示例] 要素发生变化:", context.featureIds, context.changeType);
      },

      // 在 select 模式下，要素被选中时触发，适合联动显示右侧属性面板
      onFeatureSelect: (context) => {
        console.log("[TerraDraw 示例] 要素被选中:", context.featureId);
      },

      // 要素取消选中时触发，适合清空关联的属性面板
      onFeatureDeselect: (context) => {
        console.log("[TerraDraw 示例] 要素取消选中:", context.featureId);
      },

      // 要素被删除时触发，context.deletedIds 包含所有被删要素的 ID，适合在这里向后端发送删除请求
      onFeatureDelete: (context) => {
        console.log("[TerraDraw 示例] 要素被删除:", context.deletedIds);
        closeBusinessPanels();
      },

      // 鼠标首次移入要素时触发，适合显示 tooltip 或简单的高亮摘要
      onHoverEnter: (context) => {
        console.log(`[TerraDraw 示例] 鼠标移入要素: ${context.featureId}`);
      },

      // 鼠标移出要素时触发，适合隐藏 tooltip
      onHoverLeave: (context) => {
        console.log(`[TerraDraw 示例] 鼠标移出要素: ${context.featureId}`);
      },

      // 单击要素时触发，适合打开详细信息的气泡弹窗 (Popup)
      onClick: (context) => {
        openTerradrawPopup(context);
      },

      // 双击要素时触发，适合将地图视角移动并放大到该要素 (flyTo)
      onDoubleClick: (context) => {
        console.log("[TerraDraw 示例] 双击要素:", context.featureId);
      },

      // 右键单击要素时触发，适合打开自定义的右键菜单或属性编辑表单
      onContextMenu: (context) => {
        openTerradrawContextMenu(context);
      },

      // 单击地图空白区域时触发，适合统一关闭各种弹窗、面板或取消选中状态
      onBlankClick: () => {
        closeBusinessPanels();
      },
    },
  },

  // 测量控件：提供测距、测面积等高级绘制能力
  MaplibreMeasureControl: {
    isUse: true,
    position: "top-left",
    // 如果不全选，就不要为false，会导致不显示
    open: false,
    // 启用测量控件吸附。
    // 当前示例继续复用扩展里 terradraw.defaults 的公共默认值。
    snapping: {
      enabled: true,
    },
    // 支持测点(高程)、测线(距离)、测多边形(面积)、测圆(半径和面积)、自由手绘线、自由手绘面、删除、下载，不传默认全选
    // modes: ['point', 'linestring', 'polygon', 'circle', 'freehand', 'freehand-polygon', 'delete', 'download'],
    // 是否在删除测量要素前弹出确认框
    // showDeleteConfirmation: true,

    // ==========================================
    // 单位 / 精度配置
    // 说明：
    // 1. 这些配置现在也支持走 terradraw-config.ts 统一做“公共默认配置”；
    // 2. 当前业务页如果有特殊需求，仍然可以在这里局部覆写；
    // 3. 最终生效顺序是：公共默认配置 -> 业务页局部覆写。
    // ==========================================
    // 测量单位体系：'metric' 公制，'imperial' 英制
    // measureUnitType: 'metric',

    // 强制指定距离单位，可选：
    // 公制: 'kilometer' | 'meter' | 'centimeter'
    // 英制: 'mile' | 'foot' | 'inch'
    // distanceUnit: 'kilometer',

    // 强制指定面积单位，可选：
    // 公制: 'square meters' | 'square kilometers' | 'ares' | 'hectares'
    // 英制: 'square feet' | 'square yards' | 'acres' | 'square miles'
    // areaUnit: 'square meters',

    // 距离结果保留的小数位数
    // distancePrecision: 2,

    // 面积结果保留的小数位数
    // areaPrecision: 2,

    // ==========================================
    // 测量控件同样支持样式自定义，且由于涉及文字标签，它比绘图控件多了一些专属配置
    // ==========================================
    // 示例：如果需要在当前业务页面覆盖全局的测量样式，可以局部重写
    /* modeOptions: {
      // 覆盖测量线模式，例如将当前页面的测量线颜色改为亮紫色
      linestring: {
        styles: {
          lineStringColor: '#8A2BE2', // 亮紫色
          lineStringWidth: 4,
        },
      },
    },
    // 覆盖文字标签样式，例如修改距离文字的颜色和大小
    lineLayerLabelSpec: {
      layout: {
        'text-size': 16, // 字体调大
      },
      paint: {
        'text-color': '#8A2BE2', // 文字颜色同步改为亮紫色
      },
    }, */

    // ==========================================
    // 测量控件线装饰示例 (Line Pattern 模式)
    // ==========================================
    // 适用场景：需要将 SVG 图案作为无缝纹理平铺在整条线段上，比如：铁轨、带花纹的警示线、管道纹理等。
    // 动态样式：支持通过 resolveStyle 根据单条线段的 properties 动态决定样式（例如：不同的测量线显示不同的纹理）。
    lineDecoration: {
      enabled: true,
      defaultStyle: {
        mode: "line-pattern",
        svg: texturelabsWater, // 推荐使用可以无缝首尾相接的 SVG 资源
        lineWidth: 20, // 纹理线段的宽度（这决定了图片平铺时的拉伸高度）
        opacity: 0.85, // 纹理线段的透明度
      } as BusinessKit.TerradrawLineDecorationStyle,
      // (可选) 动态样式解析：根据线要素的属性，决定使用哪种装饰。
      // 这里演示：如果要素属性里配置了特定的装饰模式，则优先使用该配置。
      // resolveStyle: (context) => {
      //   const requestedMode = context.feature.properties?.decorationMode as
      //     | TerradrawLineDecorationMode
      //     | null
      //     | undefined;

      //   if (requestedMode === 'symbol-repeat') {
      //     return {
      //       mode: 'line-pattern',
      //       svg: sendIcon,
      //       lineWidth: 16,
      //       opacity: 0.85,
      //     } as TerradrawLineDecorationStyle;
      //   }

      //   return {
      //     mode: 'symbol-repeat',
      //     svg: sendIcon,
      //     spacing: 56,
      //     size: 0.45,
      //   } as TerradrawLineDecorationStyle;
      // },
    },

    // Measure 业务属性治理示例。
    // 测量系统字段会由底层自动隐藏，这里只补充业务字段规则。
    propertyPolicy: {
      fixedKeys: ["label"],
      readonlyKeys: ["taskCode"],
    } satisfies BusinessKit.MapFeaturePropertyPolicy,

    // ==========================================
    // Measure 业务层调用示例
    // 说明：
    // 1. 测量控件与绘图控件使用同一套 interactive 配置协议。
    // 2. 业务层只需要在 controls.MaplibreMeasureControl.interactive 中声明回调，
    //    mapLibre-init 会负责事件监听、render 模式判定、hover Feature State 和销毁清理。
    // 3. 回调参数 context 中可直接拿到 feature / featureId / drawInstance / map / mode / lngLat 等信息。
    // ==========================================
    interactive: {
      // 是否启用测量控件业务交互封装。
      // 设为 false 时，mapLibre-init 不会为测量控件绑定任何业务交互事件。
      enabled: true,

      // render 模式下鼠标命中测量要素时显示的光标。
      // 传 false 可关闭光标切换。
      cursor: "pointer",

      // 交互管理器准备完成时触发。
      // 适合在业务层做初始化日志、默认状态同步或首屏数据检查。
      onReady: (context) => {
        console.log("[Measure 示例] 业务交互管理器已初始化:", context.controlType);
      },

      // 测量模式变化时触发。
      // 可用于业务层同步提示文案、状态栏或帮助信息。
      onModeChange: (context) => {
        console.log(`[Measure 示例] 当前模式切换为: ${context.mode}`);
      },

      // 新建测量要素完成，或测量要素编辑完成时触发。
      // 最适合在这里获取最终测量结果并同步到业务表单。
      onFeatureFinish: (context) => {
        console.log(
          "[Measure 示例] 测量完成:",
          context.featureId,
          getMeasureFeatureSummaryText(context),
        );
      },

      // 测量要素几何或属性变化时触发。
      // 拖拽编辑节点、移动测量要素、业务层调用 updateFeatureProperties 后都会走这里。
      onFeatureChange: (_context) => {
        // console.log(
        //   "[Measure 示例] 测量要素发生变化:",
        //   _context.featureIds,
        //   _context.changeType,
        //   getMeasureFeatureSummaryText(_context),
        // );
      },

      // select 模式下选中某个测量要素时触发。
      // 可用于同步右侧属性面板、结果表格选中行等业务状态。
      onFeatureSelect: (context) => {
        console.log("[Measure 示例] 选中了测量要素:", context.featureId);
      },

      // select 模式下取消选中测量要素时触发。
      // 可用于清空详情面板或恢复默认提示。
      onFeatureDeselect: (context) => {
        console.log("[Measure 示例] 取消选中测量要素:", context.featureId);
      },

      // 删除一个或多个测量要素后触发。
      // context.deletedIds 中可拿到本次删除的全部 ID。
      onFeatureDelete: (context) => {
        console.log("[Measure 示例] 删除了测量要素:", context.deletedIds);
        closeBusinessPanels();
      },

      // render 模式下鼠标首次移入测量要素时触发。
      // 适合联动 tooltip、高亮关联表格行、状态栏摘要等。
      onHoverEnter: (context) => {
        console.log(
          `[Measure 示例] 鼠标移入测量要素: ${context.featureId}`,
          getMeasureFeatureSummaryText(context),
        );
      },

      // render 模式下鼠标离开测量要素时触发。
      // 适合清空 tooltip、恢复摘要文案。
      onHoverLeave: (context) => {
        console.log(`[Measure 示例] 鼠标移出测量要素: ${context.featureId}`);
      },

      // render 模式下单击测量要素时触发。
      // 这里演示业务层直接复用统一 popup，显示当前测量结果和属性。
      onClick: (context) => {
        openTerradrawPopup(context);
      },

      // render 模式下双击测量要素时触发。
      // 常见用途是 flyTo、进入详情页或切换到 select 模式。
      onDoubleClick: (context) => {
        console.log("[Measure 示例] 双击测量要素:", context.featureId);
      },

      // render 模式下右键测量要素时触发。
      // 常见用途是弹出自定义菜单、属性编辑窗口或快捷操作面板。
      onContextMenu: (context) => {
        openTerradrawContextMenu(context);
      },

      // render 模式下点击地图空白处时触发。
      // 适合统一关闭 popup、右键菜单、摘要浮层等业务 UI。
      onBlankClick: () => {
        closeBusinessPanels();
      },
    },
  },
};

// ==========================================
// 图层样式配置实例 (Layer Configurations)
// ==========================================

/**
 * 属性表达式 helper 示例区。
 * 这 3 个 helper 都只负责读取 feature.properties，不处理 selected / hover / isFlashing。
 * 推荐写法是：
 * 1. 先用属性 helper 写“默认态按字段如何显示”
 * 2. 再把它放进 createFeatureStateExpression({ default: ... })，继续叠加 feature-state 高亮
 */

/**
 * matchFeatureProperty 适合“字段值 -> 样式值”可以直接写成映射表的场景。
 * 这里表示：line.properties.id 为 line_1 时显示红色，其余线显示蓝色。
 */
const demoLineColorByIdExpression = matchFeatureProperty(
  "id",
  {
    line_1: "#ff0000",
  },
  "#0000ff",
);

/**
 * whenFeaturePropertyEquals 适合只判断单个值的场景。
 * 这里表示：point.properties.mark === "hole" 时，默认描边显示蓝色；否则回退为白色。
 */
const demoPointStrokeColorByMarkExpression = whenFeaturePropertyEquals(
  "mark",
  "hole",
  "#1d4ed8",
  "#ffffff",
);

/**
 * whenFeaturePropertyIn 适合“多个值共用同一套样式”的场景。
 * 这里表示：point.properties.id 属于 point_1 / point_2 时，默认半径显示为 7；否则回退为 6。
 */
const demoPointRadiusByIdGroupExpression = whenFeaturePropertyIn(
  "id",
  ["point_1", "point_2"],
  7,
  6,
);

/**
 * 1. 面图层 (Fill Layer) 样式配置
 * 用于渲染 Polygon / MultiPolygon 数据
 */
const { layout: fillLayout, paint: fillPaint } = createFillLayerStyle();

/**
 * 2. 线图层 (Line Layer) 样式配置
 * 用于渲染 LineString / MultiLineString 数据
 *
 * 这里演示“业务层局部覆写公共样式”的推荐写法：
 * 1. 先用 createFeatureStateExpression 收敛 selected / hover / isFlashing 这类常见状态分支。
 * 2. default 仍然允许继续传入原生 MapLibre 表达式；常见按属性分色场景优先用 helper 收敛。
 * 3. 下面的 default 演示了 `matchFeatureProperty(...)` 的用法。
 *
 * line-color 当前规则说明：
 * 1. 如果 feature-state.isFlashing === true，则当前线要素显示为黄色 `#ffff00`
 * 2. 否则如果 feature-state.demoStyled === true，则显示为洋红色 `#ec4899`
 * 3. 否则如果 feature-state.selected === true，则显示为橙色 `#f97316`
 * 4. 否则如果 feature-state.hover === true，则显示为绿色 `#00ff00`
 * 5. 否则继续走 default 中的属性匹配 helper：line_1 为红色，其余线为蓝色
 */
const { layout: lineLayout, paint: linePaint } = createLineLayerStyle({
  paint: {
    "line-color": createFeatureStateExpression({
      isFlashing: "#ffff00",
      states: {
        // states 是“自定义 feature-state 键名 -> 命中后的样式值”映射表。
        // 这里直接写 demoStyled，是为了让业务层一眼看出：
        // 只要执行 setMapFeatureState(target, { demoStyled: true })，
        // 当前线要素就会切换为更醒目的洋红色。
        demoStyled: "#ec4899",
      },
      selected: "#f97316",
      hover: "#00ff00",
      // order 用来声明多个状态同时命中时谁优先。
      // 这里表示：闪烁 > demoStyled > selected > hover。
      order: ["isFlashing", "demoStyled", "selected", "hover"],
      default: demoLineColorByIdExpression,
    }),
    "line-width": createFeatureStateExpression({
      states: {
        // 同一个 demoStyled 也可以同时控制其他样式属性。
        // 这里让按钮切换后线宽变成 8，方便肉眼观察变化。
        demoStyled: 8,
      },
      selected: 7,
      hover: 6,
      // order 只需要写当前这个表达式实际声明过的状态。
      order: ["demoStyled", "selected", "hover"],
      default: 3,
    }),
  },
});

/**
 * 3. 点图层 (Circle Layer) 样式配置
 * 用于渲染 Point / MultiPoint 数据
 */
const { layout: circleLayout, paint: circlePaint } = createCircleLayerStyle({
  paint: {
    "circle-color": createFeatureStateExpression({
      isFlashing: "#ff0000",
      states: {
        // 点击按钮后，将当前选中点要素切换为更醒目的洋红色。
        demoStyled: "#ec4899",
      },
      selected: "#f97316",
      hover: "#22c55e",
      order: ["isFlashing", "demoStyled", "selected", "hover"],
      default: "#0000ff",
    }),
    "circle-stroke-color": createFeatureStateExpression({
      isFlashing: "#ffff00",
      // 自定义feature-state 键名 demoStyled，用于控制描边颜色。
      states: {
        // 即使 default 已经按 properties.mark 做判断，
        // feature-state.demoStyled 仍然会在命中时覆盖默认描边结果。
        demoStyled: "#831843",
      },
      selected: "#7c2d12",
      order: ["isFlashing", "demoStyled", "selected"],
      default: demoPointStrokeColorByMarkExpression,
    }),
    "circle-radius": createFeatureStateExpression({
      states: {
        demoStyled: 9,
      },
      selected: 8,
      order: ["demoStyled", "selected"],
      default: demoPointRadiusByIdGroupExpression,
    }),
    "circle-stroke-width": createFeatureStateExpression({
      // 自定义feature-state 键名 demoStyled，用于控制描边宽度。
      states: {
        demoStyled: 4,
      },
      selected: 3,
      order: ["demoStyled", "selected"],
      default: 2,
    }),
  },
});

/**
 * 4. 标签图层 (Symbol Layer) 样式配置
 * 用于渲染图标(Icon)和文字(Text)
 *
 * 这里演示如何在业务层配置显示的文本字段：
 * 1. 默认 text-field 会显示要素的 id
 * 2. 这里覆写为：优先显示 name 字段，如果没有 name 则显示“未知站点”
 * 3. 也可以用 ['concat', ['get', 'name'], ' (', ['get', 'status'], ')'] 拼接多个字段
 */
const { layout: symbolLayout, paint: symbolPaint } = createSymbolLayerStyle({
  layout: {
    // 优先读取 properties.id，如果没有则显示备用文本
    "text-field": ["coalesce", ["get", "id"], "未知站点"],
    // 调整文字大小
    "text-size": 14,
    // 调整文字在图标上方的偏移量 [x, y]
    "text-offset": [0, -1],
  },
  paint: {
    // 设置文字颜色为深蓝色
    "text-color": "#1e3a8a",
    // 增加白色的文字描边，使其在复杂底图上更清晰
    "text-halo-color": "#ffffff",
    "text-halo-width": 2,
  },
});

/**
 * 主业务源的轻量图层描述对象。
 * 这里把常规图层声明收口到 MapBusinessSourceLayers，减少模板里直接书写原始 Mgl 图层样板。
 */
const primaryBusinessLayers = [
  // 1. 创建业务点图层（通常用于展示设备节点、站点等点状数据）
  createCircleBusinessLayer({
    layerId: LAYER_IDS.circle,

    // 图层级规则只写“相对 source 默认规则的差异项”即可。
    // 这里演示：当前图层在继承 source 默认规则的基础上，额外把 mark 声明为稳定字段。
    propertyPolicy: {
      fixedKeys: ["mark"],
    } satisfies BusinessKit.MapFeaturePropertyPolicy,
    // 样式配置：指定该图层的绘制表现（颜色、大小、显隐等）
    // 如果不传 style，底层会自动回退使用 createCircleLayerStyle() 生成的默认样式
    style: {
      layout: circleLayout, // 复用前面解构出来的 circleLayout
      paint: circlePaint, // 复用前面解构出来的 circlePaint
    },
    // 【语法糖】等价于 MapLibre 原生 filter: ['==', '$type', 'Point']
    // 表示该图层只渲染 geometry.type 为 Point 或 MultiPoint 的要素
    geometryTypes: ["Point"],
    // 【语法糖】等价于 MapLibre 原生 filter: ['==', 'mark', 'hole']
    // 表示该图层只渲染 properties 中 mark 字段值为 'hole' 的要素
    where: {
      mark: "hole",
    },
    // 💡 提示：如果配置了多个条件，底层会自动用 ['all', ...] 把 geometryTypes 和 where 组合起来
  }),
  // 2. 创建另一个业务点图层（展示另一类点状数据，通过 where 条件区分）
  createCircleBusinessLayer({
    layerId: LAYER_IDS.circleDec,
    // 这里演示“layer 局部覆写 source 默认规则”：
    // source 默认把 name 设为只读，这个图层则显式把它改成稳定字段。
    propertyPolicy: {
      fixedKeys: ["name", "mark"],
    } satisfies BusinessKit.MapFeaturePropertyPolicy,
    // 样式配置：指定该图层的绘制表现（颜色、大小、显隐等）
    // 如果不传 style，底层会自动回退使用 createCircleLayerStyle() 生成的默认样式
    style: {
      layout: circleLayout, // 图层布局属性（如 visibility, sort-key）
      paint: circlePaint, // 图层绘制属性（如 circle-color, circle-radius）
    },
    geometryTypes: ["Point"],
    where: {
      mark: "dec",
    },
    // 仍然支持原生过滤表达式
    // filter: [">", ["get", "level"], 5],
  }),
  // 3. 创建业务线图层（通常用于展示管道、道路等线状数据）
  createLineBusinessLayer({
    layerId: LAYER_IDS.primaryLine,
    propertyPolicy: {
      fixedKeys: ["mark"],
    } satisfies BusinessKit.MapFeaturePropertyPolicy,
    style: {
      layout: lineLayout,
      paint: linePaint,
    },
    geometryTypes: ["LineString"],
    // 如果你有更复杂的原生过滤需求（如大于、包含），可以使用 filter 字段：
    // filter: ['>', 'length', 100]
  }),
  // 4. 创建业务面图层（通常用于展示片区、建筑轮廓等面状数据）
  createFillBusinessLayer({
    layerId: LAYER_IDS.fill,
    style: {
      layout: fillLayout,
      paint: fillPaint,
    },
    geometryTypes: ["Polygon"],
    // 是否允许该图层响应鼠标事件（如 hover、click），默认为 true。
    // 这里设为 false，意味着面图层仅做展示，鼠标穿透，点击时不会触发任何事件。
    interactive: false,
  }),
  // 5. 创建业务符号图层（通常用于展示图标 icon 或文字标签 text）
  createSymbolBusinessLayer({
    layerId: LAYER_IDS.symbol,
    propertyPolicy: {
      fixedKeys: ["mark"],
    } satisfies BusinessKit.MapFeaturePropertyPolicy,
    style: {
      layout: symbolLayout,
      paint: symbolPaint,
    },
    geometryTypes: ["Point"],
  }),
];

/**
 * 第二业务源的轻量图层描述对象。
 * 当前示例继续保留“多 source 共用同一套样式”的场景，只是把模板样板收口到描述对象里。
 */
const secondaryBusinessLayers = [
  createLineBusinessLayer({
    layerId: LAYER_IDS.secondaryLine,
    propertyPolicy: {
      fixedKeys: ["mark"],
    } satisfies BusinessKit.MapFeaturePropertyPolicy,
    style: {
      layout: lineLayout, // 复用前面解构出来的 lineLayout
      paint: linePaint, // 复用前面解构出来的 linePaint
    },
    geometryTypes: ["LineString"],
  }),
  createFillBusinessLayer({
    layerId: LAYER_IDS.secondaryFill,
    style: {
      layout: fillLayout, // 复用前面解构出来的 fillLayout
      paint: fillPaint, // 复用前面解构出来的 fillPaint
    },
    geometryTypes: ["Polygon"],
    interactive: false,
  }),
];

/**
 * 业务数据源注册区。
 * 这里直接复用已经声明好的图层数组，避免再用回调仅仅处理声明顺序。
 */
const primaryBusinessSource = createMapBusinessSource({
  sourceId: SOURCE_IDS.primary,
  data: test_geojson,
  promoteId: "id", // 指定用作要素唯一标识的属性名

  // source 级规则会成为当前数据源下所有图层的默认治理策略。
  // 当前页面使用 `promoteId: "id"`，所以 `id` 本来就会被底层强保护。
  propertyPolicy: {
    readonlyKeys: ["name"],
    hiddenKeys: ["marker-color", "marker-size", "marker-symbol"],
  } satisfies BusinessKit.MapFeaturePropertyPolicy,
  layers: primaryBusinessLayers,
});

const secondaryBusinessSource = createMapBusinessSource({
  sourceId: SOURCE_IDS.secondary,
  data: test_geojson_secondary,
  promoteId: "id",

  // source 级规则会成为当前数据源下所有图层的默认治理策略。
  propertyPolicy: {
    readonlyKeys: ["name"],
    hiddenKeys: ["marker-color", "marker-size", "marker-symbol"],
  } satisfies BusinessKit.MapFeaturePropertyPolicy,
  layers: secondaryBusinessLayers,
});

// 将所有业务源注册到管理中心，供查询与写入时使用。
const businessSourceRegistry = createMapBusinessSourceRegistry([
  primaryBusinessSource,
  secondaryBusinessSource,
]);

/**
 * ==========================
 * 插件注册区
 * ==========================
 */

// 1. 线草稿预览插件：提供线段临时延长和预览能力
const lineDraftPreviewPlugin = createLineDraftPreviewPlugin({
  enabled: true,
  // 草稿线要继承哪个正式图层的交互行为（保持交互一致性）
  inheritInteractiveFromLayerId: LAYER_IDS.primaryLine,
  // 覆盖默认草稿样式
  styleOverrides: {
    // 线草稿图层样式覆写。
    line: {
      // 线图层 layout 局部覆写。
      // 当前示例未覆写 layout，因此保留容器层默认值。
      layout: {
        // 示例留空：业务层如需覆写可在这里补充 line-cap、visibility 等字段。
      },

      // 线图层 paint 局部覆写。
      paint: {
        // 线草稿颜色。
        // hover 时显示为更醒目的红色，默认态显示为橙红色。
        "line-color": createFeatureStateExpression({
          hover: "white",
          default: "#fa8c16",
        }),

        // 线草稿宽度。
        // 这里略微调大，用于演示业务层如何只覆写单条样式。
        "line-width": createFeatureStateExpression({
          hover: 6,
          default: 5,
        }),

        // 线草稿虚线样式。
        "line-dasharray": [2, 1.2],
      },
    },

    // 线廊草稿图层样式覆写。
    fill: {
      // 面图层 layout 局部覆写。
      // 当前示例同样不改 layout，仅演示 paint 覆写。
      layout: {
        // 示例留空：业务层如需覆写 visibility 等字段，可在这里补充。
      },

      // 面图层 paint 局部覆写。
      paint: {
        // 线廊草稿填充颜色。
        "fill-color": "#fa8c16",

        // 线廊草稿透明度。
        // 透明度略低，避免遮挡底图与正式业务图层。
        "fill-opacity": 0.18,

        // 线廊草稿轮廓颜色。
        "fill-outline-color": "#ff7a00",
      },
    },
  },
});

// 2. 要素多选插件：提供框选和点击多选能力
const mapFeatureMultiSelectPlugin = createMapFeatureMultiSelectPlugin({
  // 是否启用多选插件，默认为 true
  enabled: true,
  // 插件控件在地图上的显示位置，可选值如 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  position: "top-right",
  // 退出多选模式时的行为策略：'clear'（清空选中集） 或 'retain'（保留选中集）
  deactivateBehavior: "retain",
  // 是否允许通过按下 Esc 快捷键退出多选模式，默认为 true
  closeOnEscape: true,
  // 不允许参与多选的图层 ID 集合，这里的点二图层中的要素将无法被多选
  excludeLayerIds: [LAYER_IDS.circleDec],
  // 也可以通过 targetLayerIds: ['layer1', 'layer2'] 显式指定允许参与多选的图层 ID 集合

  // 自定义候选过滤函数，返回 true 表示允许选中，返回 false 表示禁止选中
  canSelect: ({ layerId, properties }) => {
    // 如果不是主点图层，则允许选中
    if (layerId !== LAYER_IDS.circle) {
      return true;
    }

    // 对于主点图层，拦截 id 为 'point_4' 的要素，使其无法被选中
    return properties?.id !== "point_4";
  },
});

// 3. 要素吸附插件：配置哪些图层允许作为测绘的吸附目标
const mapFeatureSnapPlugin = createMapFeatureSnapPlugin({
  // 启用统一吸附扩展。
  enabled: true,

  // 全局默认吸附范围（像素）。
  // 业务层大多数规则不需要重复传，只有个别规则需要更大或更小的吸附范围时再局部覆写。
  defaultTolerancePx: 16,

  // 吸附预览配置。
  // 这里演示如何只关心效果层面的少数视觉参数。
  preview: {
    enabled: true,
    pointColor: "#f56c6c",
    pointRadius: 6,
    lineColor: "#f56c6c",
    lineWidth: 4,
  },

  // 普通业务图层吸附规则。
  ordinaryLayers: {
    enabled: true,
    rules: [
      {
        // 主正式线图层：既允许吸附到顶点，也允许吸附到线段。
        id: "primary-line-snap",
        layerIds: [LAYER_IDS.primaryLine],
        priority: 30,
        snapTo: ["vertex", "segment"],
        // filter示例，高级定制规则，返回fasle表示当前吸附规则失效
        // filter: (context) => {
        //   console.log('context', context);
        //   if (context.feature.id === 'line_2') {
        //     return false;
        //   }
        //   return true;
        // },
      },
      {
        // 第二正式线图层：继续参与吸附，但优先级略低于主线图层。
        id: "secondary-line-snap",
        layerIds: [LAYER_IDS.secondaryLine],
        priority: 20,
        snapTo: ["vertex", "segment"],
      },
      {
        // 点图层示例：点要素只参与顶点吸附。
        id: "point-hole-snap",
        layerIds: [LAYER_IDS.circle, LAYER_IDS.circleDec],
        priority: 10,
        snapTo: ["vertex"], // 点图层只能吸附到顶点
      },
      {
        // 特定条件要素示例：只允许吸附 mark === 'hole' 的点。
        // 用于演示“不是按点/线/面粗分，而是按具体业务条件筛选”的能力。
        id: "point-hole-filtered-snap",
        layerIds: [LAYER_IDS.circle, LAYER_IDS.circleDec],
        priority: 40,
        tolerancePx: 20,
        geometryTypes: ["Point"],
        snapTo: ["vertex"],
        where: {
          mark: "hole",
        },
      },
    ],
  },

  // TerraDraw / Measure 公共默认值。
  // 业务层只需要在控件里传 { enabled: true }，默认就会同时开启原生吸附与普通层候选吸附。
  terradraw: {
    defaults: {
      enabled: true,
      tolerancePx: 16,
      useNative: true,
      useMapTargets: true,
    },
  },
});

/**
 * DXF 导出插件：第一版只面向业务 source，不包含 TerraDraw / Measure / 手绘要素。
 */
const mapDxfExportPlugin = createMapDxfExportPlugin({
  // 这里故意把全部可配字段都显式写出来，方便业务开发者直接照着这份示例抄。
  // 是否启用整个 DXF 导出插件。
  enabled: true,

  // 必填：告诉插件“当前页面有哪些业务 source 可参与导出”。
  sourceRegistry: businessSourceRegistry,

  // defaults 代表当前页面的默认导出行为。
  // 插件内置按钮会直接复用这组配置，适合沉淀成“整页统一的默认导出行为”。
  // 这里不再重复填写 sourceCrs / targetCrs，而是直接吃封装层统一维护的全局默认 CRS。
  // TrueColor 也同样先走封装层统一入口；当前示例页不预置任何页面级颜色规则。
  defaults: {
    // null / 不传都表示“默认导出全部业务 source”。
    sourceIds: null,

    // 默认下载文件名。
    fileName: DXF_DEFAULT_FILE_NAME,

    // 统一线宽：所有线和面边界都会使用同一组宽度。
    // 如果本页不传，封装层会回退到 DXF 全局默认值。
    lineWidth: 5,

    // 点导出模式：
    // - point：按 DXF 原生 POINT 导出，显示样式由 CAD 环境控制
    // - circle：按 DXF CIRCLE 导出，便于跨软件稳定显示
    // pointMode: "circle",

    // 点半径：仅在 pointMode='circle' 时生效。
    // 当前示例选择 circle 模式，所以这里的数值会直接变成 CAD 里可见的圆半径。
    // pointRadius: 3,

    // 图层级颜色：给“这一层里的大多数实体”先设一个默认色。
    // 如果没有开启 layerNameResolver，layerName 默认就等于 sourceId。
    layerTrueColorResolver: (layerName, sourceId) => {
      // 这里演示“按 source + 图层名关键词”做页面级默认着色。
      // 返回值必须是 #RRGGBB；返回 undefined 表示当前图层不在这里指定颜色。

      // 主业务 source 默认走蓝色系
      if (sourceId === SOURCE_IDS.primary) {
        // 面图层默认灰色
        if (layerName.includes("Polygon")) {
          return "#FF3300";
        }

        // 线图层默认蓝色
        if (layerName.includes("LineString") || layerName.includes("Line")) {
          return "#0066FF";
        }
      }

      // 洞点 / 孔位这类特殊点要素，图层默认给红色，方便导出后快速定位。
      if (layerName.includes("Point") && layerName.includes("hole")) {
        return "#FF3300";
      }

      // 没命中规则就交给封装层后续逻辑处理。
      return undefined;
    },

    // 要素级颜色：用于“局部覆写”。
    // 它的优先级高于图层级颜色；一旦这里返回颜色，当前要素就不再沿用图层默认色。
    // 一般不配特定要素颜色。因为会导致cad软件里图层变色不能控制这个要素的颜色。
    featureTrueColorResolver: (feature, sourceId, layerName) => {
      // 先把业务属性统一转成字符串，避免属性缺失时出现 null / undefined 干扰判断。
      const mark = String(feature.properties?.mark ?? "");
      const name = String(feature.properties?.name ?? "");

      // 示例 1：hole 要素不管所在图层原本是什么颜色，都强制覆写成亮红色。
      // 这就是“局部覆写”的核心：只改当前命中的要素，不影响同图层其他实体。
      if (mark === "hole") {
        return "#FF0000";
      }

      // 示例 2：主业务 source 里的重点线要素，额外提亮成橙色。
      // 这里故意同时结合 sourceId、图层名、业务属性做判断，演示规则可以非常细。
      if (sourceId === SOURCE_IDS.primary && layerName.includes("Line") && name.includes("主")) {
        return "#FF9900";
      }

      // 示例 3：如果后续你们有 status / level / risk 之类字段，也可以继续在这里细分。
      // 没命中则返回 undefined，表示当前要素继续沿用所属图层的默认色。
      return undefined;
    },

    // 要素过滤器：true 保留，false 排除。
    /* featureFilter: (feature: MapCommonFeature, sourceId: string): boolean => {
      // 只导出主业务 source，其他来源全部跳过。
      if (sourceId !== SOURCE_IDS.primary) {
        return false;
      }

      // 点要素先不导出，示例里只保留线和面。
      if (feature.geometry.type === "Point") {
        return false;
      }

      // 这里演示按业务属性继续细分筛选。
      // mark === 'hole' 的要素本次不导出。
      const mark = String(feature.properties?.mark ?? "");
      if (mark === "hole") {
        return false;
      }

      // 走到这里说明当前要素满足导出条件。
      return true;
    }, */

    // 图层名解析器：决定当前要素写入 DXF 时落到哪个图层。
    layerNameResolver: (feature: MapCommonFeature, sourceId: string): string => {
      // DXF 里的“图层”可以理解成 CAD 中的分类目录。
      // 同一个图层里的实体会被放在一起，便于后续单独开关显示、选择、改样式。

      // 这里先取业务标记；没有 mark 时给一个兜底值，避免图层名出现空段。
      const mark = String(feature.properties?.mark ?? "normal");

      // 这个示例按“sourceId + 几何类型 + mark”分层。
      // 例如：primary_Line_main、primary_Polygon_area、secondary_Point_hole。
      // 这样导出到 CAD 后，业务人员一眼就能看出每层分别装的是什么数据。
      return `${sourceId}_${feature.geometry.type}_${mark}`;
    },
  },

  // 内置控件配置。
  control: {
    enabled: true,
    position: "top-right",
    label: "导出DXF",
  },
} as MapDxfExportOptions);

/**
 * 交点预览插件示例。
 * 这一版示例改成最推荐的简化接法：
 * 1. 交给插件直接读取 sourceRegistry 里的业务线数据
 * 2. 业务层只声明“哪些 source / layer 允许参与求交”
 * 3. 正式交点点位、source、layer、交互和样式都由插件内部托管
 */
const intersectionPreviewPlugin = createIntersectionPreviewPlugin({
  // 是否启用整个交点插件。
  // 设为 false 时，插件不会参与渲染，也不会计算交点。
  enabled: true,

  // 求交范围。
  // selected：只计算“当前选中线”与候选线集合的交点。
  // all：直接计算候选线集合内部的全部两两交点。
  // 示例页默认先走 selected，便于观察“当前选中线对全图业务线求交”的交互体验。
  scope: "selected",

  // 交点预览图层默认是否显示。
  // 设为 false 时，数据仍可计算，但图层默认不展示。
  visible: true,

  // 点击预览交点时，是否自动生成正式交点点要素。
  // true：用户点击预览交点后，插件会把它自动写入内部托管的正式点 source / layer。
  // false：只触发交点点击回调，业务层如果要落正式点，需要自己手动调用 materialize()。
  materializeOnClick: true,

  // 正式业务 source 注册表。
  // 插件会直接从这里读取最新业务线数据
  sourceRegistry: businessSourceRegistry,

  // 允许参与求交的业务 sourceId 列表。
  // 简化模式下，它表示“只从这些 source 里自动收集线候选”。
  targetSourceIds: [SOURCE_IDS.primary, SOURCE_IDS.secondary],

  // 允许参与求交的业务 layerId 列表。
  // 简化模式建议始终显式写上，避免一个 source 下存在多条 line layer 时把范围放大。
  targetLayerIds: [LAYER_IDS.primaryLine, LAYER_IDS.secondaryLine],

  // 是否保留端点交点。
  // true：线段在端点相接时，也算一个可操作交点。
  // false：只保留严格落在线段内部的交点。
  includeEndpoint: true,

  // 交点坐标归一化保留的小数位。
  // 它会影响交点临时 ID 的稳定性，以及“非常接近的两个点”是否会被视为同一个交点。
  coordDigits: 6,

  // 是否忽略同一条线自身的求交。
  // true：不会把“同一条线自己的不同线段”拿来互相求交。
  // 当前示例先保持 true，避免把自交/折点规则混进基础示例。
  ignoreSelf: true,

  // 生成正式交点时注入的默认业务属性。
  // 这里适合补充“业务想长期保留”的属性，例如类型、状态、来源标签等。
  materializedProperties: (context) => {
    return {
      name: "交点",
      mark: "intersection",
      status: "draft",
      sourcePair: `${String(context.leftRef.featureId)} x ${String(context.rightRef.featureId)}`,
    };
  },

  // 预览交点样式局部覆写。
  // 只需要传你关心的 paint / layout 字段，插件默认样式会自动保留。
  previewStyleOverrides: {
    paint: {
      "circle-radius": 6,
    },
  },

  // 正式交点样式局部覆写。
  // 当前示例把正式点放大一点，方便与预览点区分。
  materializedStyleOverrides: {
    paint: {
      "circle-radius": 7,
      "circle-color": "#1677ff",
    },
  },

  // 高级兜底：如果一个 source 下有非常复杂的原始 filter / 自定义抽线逻辑，
  // 再回退到 getCandidates 手动喂数据即可；普通业务页优先用上面的 sourceRegistry 简化模式。
  // getCandidates: () => {
  //   return [];
  // },

  // 单击交点后的业务回调。
  // 这里拿到的是完整交点上下文：交点坐标、左右参与线、命中线段索引、是否端点命中等信息。
  onClick: (context) => {
    // 当前示例已开启 materializeOnClick: true，
    // 所以点击预览交点后，插件会先自动把它落成正式交点点要素。
    //
    // 如果业务改成 materializeOnClick: false，也可以手动调用：
    // 1. intersectionPreview.materialize(context.intersectionId)
    //    显式把当前点击命中的交点落成正式点要素。
    // 2. intersectionPreview.materialize()
    //    不传参时，会默认物化“当前已选中的交点”。
    //
    // 正式交点 GeoJSON 获取方式：
    // const materializedGeoJson = intersectionPreview.getMaterializedData();
    //
    // 如果要把当前正式点再补充业务属性：
    // intersectionPreview.updateMaterializedProperties(context.intersectionId, {
    //   status: "confirmed",
    //   remark: "人工确认交点",
    // });
    //
    // 如果用户点错了，不想保留刚生成的正式点：
    // intersectionPreview.removeMaterialized(context.intersectionId);
    //
    // 当前示例保留自动物化，只把完整交点上下文和最新正式点 GeoJSON 打到控制台，方便直接观察。
    console.log("[NGGI00 交点示例] 当前点击交点上下文", context);
    console.log(
      "[NGGI00 交点示例] 当前正式交点 GeoJSON",
      intersectionPreview.getMaterializedData(),
    );
    ElMessage.success(
      `已命中交点：${String(context.leftRef.featureId)} x ${String(context.rightRef.featureId)}`,
    );
  },

  // 右键交点后的业务回调。
  // 适合后续接右键菜单、交点详情面板、或“落点成正式点要素”等二级动作。
  onContextMenu: (context) => {
    console.log("[NGGI00 交点示例] 当前右键交点上下文", context);
    ElMessage.info(
      `交点范围：${context.scope}；坐标：${context.point.lng.toFixed(3)}, ${context.point.lat.toFixed(3)}`,
    );
  },
});

/**
 * 集中注册当前页面需要启用的地图能力扩展。
 */
const mapPlugins = [
  mapFeatureSnapPlugin,
  lineDraftPreviewPlugin,
  intersectionPreviewPlugin,
  mapFeatureMultiSelectPlugin,
  mapDxfExportPlugin,
];

/**
 * 当前页面统一使用的业务聚合门面。
 *
 * 作用：
 * 1. 把选择态、要素查询、要素动作、属性编辑、线草稿、特效统一收口
 * 2. 业务层不再自己分别拼装多个 `use*` 门面
 * 3. 后续新增业务能力时，优先继续往这个高层入口下分组扩展
 */
const businessMap = useBusinessMap({
  mapRef: mapInitRef,
  sourceRegistry: businessSourceRegistry,
});

/**
 * 统一的地图要素能力分组。
 * 这里同时包含查询和动作能力，业务层统一走 `businessMap.feature` 即可。
 */
const featureQuery = businessMap.feature;

/**
 * 统一属性编辑分组。
 * 业务层只需要维护当前编辑目标，再调用 editor 分组即可。
 */
const propertyEditor = businessMap.editor;

/**
 * 统一线草稿分组。
 * 业务层通过 businessMap.draft 读取草稿状态与动作。
 */
const lineDraftPreview = businessMap.draft;

/**
 * 统一交点分组。
 * 业务层通过 businessMap.intersection 读取交点数量、切换范围和手动刷新。
 */
const intersectionPreview = businessMap.intersection;

/**
 * 正式交点常用门面示例。
 * 1. 读取当前正式交点 GeoJSON：
 *    const data = intersectionPreview.getMaterializedData();
 * 2. 手动物化当前选中交点：
 *    intersectionPreview.materialize();
 * 3. 更新某个正式交点的业务属性：
 *    intersectionPreview.updateMaterializedProperties("intersection-id", { status: "done" });
 * 4. 撤销某个正式交点：
 *    intersectionPreview.removeMaterialized("intersection-id");
 * 5. 一次性清空全部正式交点：
 *    intersectionPreview.clearMaterialized();
 */

/**
 * 当前页面是否存在线草稿要素。
 * 该状态直接来自线草稿能力门面，用于驱动示例面板与按钮显隐。
 */
const hasLineDraftFeatures = computed(() => {
  return lineDraftPreview.hasFeatures.value;
});

/**
 * 交点范围切换按钮文本。
 * 这里把当前范围和交点数量一起展示，方便示例页直接观察 facade 的变化。
 */
const intersectionScopeButtonText = computed(() => {
  const scopeText =
    intersectionPreview.scope.value === "all" ? "全量业务线求交" : "当前选中线求交";
  return `交点范围：${scopeText}（${intersectionPreview.count.value}）`;
});

/**
 * ==========================
 * 业务操作：获取测绘数据
 * ==========================
 */

/** 获取当前所有已绘制要素的数据快照 */
const getDrawnData = () => {
  if (!mapInitRef.value) return;

  // getDrawFeatures():
  // 1. null 代表绘图控件尚未初始化或未启用
  // 2. [] 代表绘图控件可用，但当前没有已绘制要素
  // 3. 非空数组即 TerraDraw 当前快照
  const features = mapInitRef.value.getDrawFeatures?.();
  if (features === null) {
    ElMessage.warning("绘图控件尚未初始化或未启用");
    return;
  }
  if (features.length === 0) {
    ElMessage.info("当前没有绘制任何图形");
    return;
  }

  console.log("--- 绘制的 GeoJSON 数据 ---", JSON.stringify(features, null, 2));
  ElMessage.success(`成功获取 ${features.length} 个图形数据，请查看控制台`);
};

/** 获取当前所有测量要素的数据快照 */
const getMeasureData = () => {
  if (!mapInitRef.value) return;

  const features = mapInitRef.value.getMeasureFeatures?.();
  if (features === null) {
    ElMessage.warning("测量控件尚未初始化或未启用");
    return;
  }
  if (features.length === 0) {
    ElMessage.info("当前没有测量任何图形");
    return;
  }

  console.log("--- 测量的 GeoJSON 数据 ---", JSON.stringify(features, null, 2));
  ElMessage.success(`成功获取 ${features.length} 个测量图形数据，请查看控制台`);
};

// ==========================================
// 闪烁特效逻辑示例
// ==========================================
// feature-state 特效也统一从业务聚合门面读取。
// 业务层无需再额外持有 useMap() 的底层实例。
const { isFeatureFlashing, startFlash, stopFlash } = businessMap.effect;

/**
 * 当前示例目标集合是否全部处于闪烁状态。
 * 用它来驱动按钮文案和切换逻辑，避免维护额外的本地布尔变量。
 */
const isDemoFlashing = computed(() => {
  return FLASH_TARGETS.every((target) => isFeatureFlashing(target));
});

/** 当前闪烁按钮文案。 */
const flashButtonText = computed(() => {
  return isDemoFlashing.value ? "停止要素闪烁" : "开始要素闪烁";
});

/**
 * 切换当前示例要素的闪烁状态。
 */
const toggleFlash = (): void => {
  const nextFlashing = !isDemoFlashing.value;

  FLASH_TARGETS.forEach((target) => {
    if (nextFlashing) {
      if (target.id === "line_1") {
        // line_1 用更快的闪烁频率，作为“单个目标独立频率”的最小示例。
        // 其他目标不传频率时，继续走 useMapEffect 默认的 500ms。
        startFlash(target, 300);
        return;
      }

      startFlash(target);
      return;
    }

    stopFlash(target);
  });

  if (nextFlashing) {
    ElMessage.success("已开启 point_1、point_2 和 line_1 闪烁，line_1 使用 300ms 频率");
    return;
  }

  ElMessage.warning("已停止闪烁");
};

// ==========================================
// 选择态展示逻辑示例
// ==========================================

/** 属性编辑器单键保存载荷。 */
interface FeaturePropertyEditorSavePayload {
  key: string;
  value: any;
}

/** 属性编辑器单键删除载荷。 */
interface FeaturePropertyEditorRemovePayload {
  key: string;
}

/**
 * 创建空的属性面板态。
 * @returns 空的业务属性面板态
 */
const createEmptyPropertyPanelState = (): BusinessKit.MapFeaturePropertyPanelState => {
  return {
    properties: {},
    items: [],
  };
};

/**
 * 克隆一份原始属性快照，避免 UI 直接持有底层引用。
 * @param properties 原始属性对象
 * @returns 深拷贝后的属性快照
 */
const clonePropertySnapshot = (
  properties: Record<string, any> | null | undefined,
): Record<string, any> => {
  return JSON.parse(JSON.stringify(properties || {}));
};

/**
 * 当前页面的选择态展示文案。
 * 这里不再保存底层模式与数量，只保留示例面板里真正需要展示的摘要文本。
 */
const selectionPanelState = reactive({
  ...createSelectionPanelState(),
});

const {
  isActive: isSelectionActive,
  selectionMode,
  selectedCount,
  selectedFeatures,
  selectedFeatureIds,
  hasSelection,
  activate: activateSelection,
  deactivate: deactivateSelection,
  clear: clearSelection,
  getSelectedPropertyValues: getSelectionPropertyValues,
  groupSelectedFeaturesByLayer: getSelectionGroups,
} = businessMap.selection;

/**
 * 当前已切换到示例样式的要素键集合。
 * 这里只做页面级演示，因此直接用内存集合记录当前状态即可。
 */
const demoStyledFeatureKeys = new Set<string>();

/**
 * 生成示例样式状态的唯一键。
 * @param target 要素状态目标
 * @returns 稳定唯一键；参数不足时返回空字符串
 */
const getDemoStyleTargetKey = (target: {
  sourceId: string | null;
  sourceLayer?: string | null;
  featureId: string | number | null;
}): string => {
  if (!target.sourceId || target.featureId === null) {
    return "";
  }

  return `${target.sourceId}::${target.sourceLayer || ""}::${String(target.featureId)}`;
};

/**
 * 将选中要素快照转换为可写入 feature-state 的目标描述。
 * @param selectedFeature 当前选中要素快照
 * @returns 标准化后的 feature-state 目标；不可写时返回 null
 */
const getDemoStyleStateTarget = (
  selectedFeature: BusinessKit.MapLayerSelectedFeature,
): BusinessKit.MapFeatureStateTarget | null => {
  if (!selectedFeature.sourceId || selectedFeature.featureId === null) {
    return null;
  }

  return {
    source: selectedFeature.sourceId,
    id: selectedFeature.featureId,
    // 这里顺手兼容 source-layer，保证后续切换矢量源时也能直接复用。
    sourceLayer: selectedFeature.sourceLayer || undefined,
  };
};

/**
 * 判断当前选中要素是否已经启用了示例样式。
 * @param selectedFeature 当前选中要素快照
 * @returns 是否已处于示例样式态
 */
const isDemoStyleEnabled = (selectedFeature: BusinessKit.MapLayerSelectedFeature): boolean => {
  const targetKey = getDemoStyleTargetKey({
    sourceId: selectedFeature.sourceId,
    sourceLayer: selectedFeature.sourceLayer,
    featureId: selectedFeature.featureId,
  });

  return targetKey ? demoStyledFeatureKeys.has(targetKey) : false;
};

/**
 * 将当前选中要素切换为示例样式或恢复默认样式。
 * 这是一个最小可运行示例：只演示“按钮 + 当前选中集 + feature-state 样式覆写”。
 */
const changeStyle = (): void => {
  if (!mapInitRef.value) {
    ElMessage.warning("地图组件尚未初始化完成");
    return;
  }

  const styleTargetMap = new Map<
    string,
    {
      target: BusinessKit.MapFeatureStateTarget;
      selectedFeature: BusinessKit.MapLayerSelectedFeature;
    }
  >();

  selectedFeatures.value.forEach((selectedFeature) => {
    const target = getDemoStyleStateTarget(selectedFeature);
    if (!target) {
      return;
    }

    const targetKey = getDemoStyleTargetKey({
      sourceId: target.source,
      sourceLayer: target.sourceLayer || null,
      featureId: target.id,
    });
    if (!targetKey) {
      return;
    }

    // 这里做一次去重，避免同一个要素因多图层命中被重复写入。
    styleTargetMap.set(targetKey, {
      target,
      selectedFeature,
    });
  });

  if (styleTargetMap.size === 0) {
    ElMessage.info("请先选中至少一个点或线要素，再点击切换样式");
    return;
  }

  const shouldEnableDemoStyle = [...styleTargetMap.values()].some(({ selectedFeature }) => {
    return !isDemoStyleEnabled(selectedFeature);
  });

  let changedCount = 0;
  styleTargetMap.forEach(({ target }, targetKey) => {
    const success = mapInitRef.value?.setMapFeatureState(target, {
      [DEMO_STYLE_STATE_KEY]: shouldEnableDemoStyle,
    });
    if (!success) {
      return;
    }

    // 写入成功后，再同步页面本地状态集合。
    if (shouldEnableDemoStyle) {
      demoStyledFeatureKeys.add(targetKey);
    } else {
      demoStyledFeatureKeys.delete(targetKey);
    }
    changedCount += 1;
  });

  if (changedCount === 0) {
    ElMessage.warning("当前选中要素样式切换失败");
    return;
  }

  ElMessage.success(
    shouldEnableDemoStyle
      ? `已为 ${changedCount} 个选中要素切换示例样式`
      : `已为 ${changedCount} 个选中要素恢复默认样式`,
  );
};

/**
 * 获取 GeoJSON 要素的业务 ID。
 * @param feature 待提取业务 ID 的要素
 * @returns 业务 ID；不存在时返回 null
 */
const getFeatureBusinessId = (
  feature: MapCommonFeature | null | undefined,
): string | number | null => {
  if (!feature) {
    return null;
  }

  const propertyId = feature.properties?.id;
  if (propertyId !== undefined && propertyId !== null) {
    return propertyId;
  }

  return feature.id ?? null;
};

/** 当前选中集的图层分组快照。 */
const selectedLayerGroups = computed(() => {
  return getSelectionGroups();
});

/** 当前 circleLayer 图层中的业务 ID 列表。 */
const selectedCircleIds = computed(() => {
  return getSelectionPropertyValues<string | number>("id", {
    layerId: LAYER_IDS.circle,
  });
});

/** 当前选中线要素的业务 ID。 */
const selectedLineFeatureId = computed(() => {
  return getFeatureBusinessId(featureQuery.resolveSelectedLine());
});

/** 当前选中线要素所在的来源 sourceId。 */
const selectedLineSourceId = computed(() => {
  return featureQuery.getSelectedFeatureRef()?.sourceId ?? null;
});

/**
 * 提取用户可读的错误消息。
 * @param error 任意异常对象
 * @returns 适合直接提示给用户的错误文本
 */
const getReadableErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "DXF 导出失败，请查看控制台日志";
};

/**
 * 读取当前地图实例上的 DXF 导出插件 API。
 * 业务层只通过 mapInitRef + 公开解析门面取能力，不感知插件宿主内部实现。
 * @returns 当前地图上的 DXF 导出插件 API；尚未挂载时返回 null
 */
const getMapDxfExportApi = () => {
  return resolveMapDxfExportApi(mapInitRef.value);
};

/**
 * 将 DXF 插件解析结果收敛成示例面板只关心的摘要字段。
 * @param options 当前解析后的导出配置
 * @returns 适合示例面板直接消费的轻量结构
 */
const toDxfSummaryOptions = (options: {
  sourceIds?: string[] | null;
  fileName: string;
  sourceCrs?: string;
  targetCrs?: string;
  layerTrueColorResolver?: unknown;
  featureTrueColorResolver?: unknown;
}): DxfSummaryOptions => {
  return {
    sourceIds: options.sourceIds ?? null,
    fileName: options.fileName,
    sourceCrs: options.sourceCrs,
    targetCrs: options.targetCrs,
    layerTrueColorResolver: options.layerTrueColorResolver,
    featureTrueColorResolver: options.featureTrueColorResolver,
  };
};

/**
 * 业务层局部覆写的图层名解析器。
 * 当前示例只导出主业务源，因此额外把 `mark` 拼进图层名里，
 * 用来演示“业务层可以在单次任务里覆写 DXF 图层命名规则”。
 * @param feature 当前业务要素
 * @param sourceId 当前业务 sourceId
 * @returns 当前要素在 DXF 中使用的图层名
 */
const resolvePrimaryBusinessDxfLayerName: MapDxfLayerNameResolver = (
  feature: MapCommonFeature,
  sourceId: string,
): string => {
  const featureMark =
    typeof feature.properties?.mark === "string" && feature.properties.mark.length > 0
      ? feature.properties.mark
      : "default";

  return `${sourceId}_${featureMark}`;
};

/**
 * 当前页面“只导出主业务 DXF”按钮使用的局部覆写配置。
 * 这里单独抽成函数，方便示例面板和点击事件共用同一套参数。
 * @returns 单次任务局部覆写配置
 */
const createPrimaryBusinessDxfOverrides = (): MapDxfExportTaskOptions => {
  return {
    sourceIds: [SOURCE_IDS.primary],
    fileName: DXF_PRIMARY_ONLY_FILE_NAME,
    layerNameResolver: resolvePrimaryBusinessDxfLayerName,
  };
};

/**
 * 当前示例面板展示的 DXF 默认配置。
 * 这里直接读取插件 API 的 getResolvedOptions()，确保面板看到的是最终生效值。
 */
const dxfDefaultOptions = computed<DxfSummaryOptions | null>(() => {
  const api = getMapDxfExportApi();
  if (!api) {
    return null;
  }

  return toDxfSummaryOptions(api.getResolvedOptions());
});

/**
 * 当前示例面板展示的 DXF 局部覆写配置。
 * 这里与“导出主业务 DXF”按钮保持同一套 overrides，避免说明与实际行为脱节。
 */
const dxfPrimaryOptions = computed<DxfSummaryOptions | null>(() => {
  const api = getMapDxfExportApi();
  if (!api) {
    return null;
  }

  return toDxfSummaryOptions(api.getResolvedOptions(createPrimaryBusinessDxfOverrides()));
});

/**
 * 只导出主业务 source 的 DXF 文件。
 * 这个按钮专门演示业务层如何在“不改插件 defaults”的前提下，
 * 通过 `downloadDxf(overrides)` 为某一次导出任务临时覆写参数。
 */
const downloadPrimaryBusinessSourceDxf = async (): Promise<void> => {
  const dxfExportApi = getMapDxfExportApi();
  if (!dxfExportApi) {
    ElMessage.warning("DXF 导出插件尚未初始化完成");
    return;
  }

  try {
    const result = await dxfExportApi.downloadDxf(createPrimaryBusinessDxfOverrides());

    if (result.warnings.length > 0) {
      console.warn("[NGGI00 DXF 示例] 本次导出包含警告", result.warnings);
    }

    ElMessage.success(
      `已导出主业务 DXF：共处理 ${result.featureCount} 个要素，写入 ${result.entityCount} 个实体`,
    );
  } catch (error) {
    console.error("[NGGI00 DXF 示例] 导出失败", error);
    ElMessage.error(getReadableErrorMessage(error));
  }
};

/**
 * 手动刷新交点示例。
 * 当业务层主动改了 source 数据，且希望立即重算交点时，可以直接调用这个门面动作。
 */
const refreshIntersectionPreviewDemo = (): void => {
  const success = intersectionPreview.refresh();
  if (!success) {
    ElMessage.warning("交点插件尚未初始化完成");
    return;
  }

  ElMessage.success(`交点已刷新，当前共 ${intersectionPreview.count.value} 个`);
};

/**
 * 清空当前示例页中的正式交点点要素。
 * 这里故意只清正式点，不清预览交点，方便示例页观察“预览层”和“正式点层”是两条独立链路。
 */
const handleClearMaterializedIntersections = (): void => {
  if (intersectionPreview.materializedCount.value <= 0) {
    ElMessage.info("当前没有可清理的正式交点");
    return;
  }

  const success = intersectionPreview.clearMaterialized();
  if (!success) {
    ElMessage.warning("交点插件尚未初始化完成");
    return;
  }

  ElMessage.success("已清空全部正式交点点要素");
};

/**
 * 切换交点求交范围。
 * selected 更适合跟随当前选中线逐条分析，
 * all 更适合一次性观察当前页面所有业务线的交点分布。
 */
const toggleIntersectionPreviewScope = (): void => {
  const nextScope = intersectionPreview.scope.value === "all" ? "selected" : "all";
  const success = intersectionPreview.setScope(nextScope);
  if (!success) {
    ElMessage.warning("交点插件尚未初始化完成");
    return;
  }

  const scopeText = nextScope === "all" ? "全量业务线求交" : "当前选中线求交";
  ElMessage.success(`已切换为${scopeText}，当前共 ${intersectionPreview.count.value} 个`);
};

/**
 * 根据最新的选中集变化上下文更新示例面板文案。
 * @param context 选中集变化上下文
 */
const syncSelectionPanelFromChange = (
  context: BusinessKit.MapLayerSelectionChangeContext,
): string => {
  // 将底层选中变化上下文转换为业务层更易消费的结构；集合字段与触发目标字段已分组。
  const selectionContext = featureQuery.toSelectionBusinessContext(context);
  const currentSelectionMode = context.selectionMode || selectionMode.value;
  const summaryInput = {
    reason: selectionContext.reason,
    selectionMode: currentSelectionMode,
    selectedCount: selectionContext.selectedCount,
    addedIds: getSelectionItemIds(selectionContext.added),
    removedIds: getSelectionItemIds(selectionContext.removed),
    circleIds: getSelectionItemIds(
      selectionContext.selected.filter((selectedItem) => selectedItem.layerId === LAYER_IDS.circle),
    ),
  };

  /*
   * 旧写法 / 逃生出口：
   * const addedIds = getSelectionItemIds(selectionContext.added);
   * const removedIds = getSelectionItemIds(selectionContext.removed);
   * const circleIds = getSelectionItemIds(
   *   context.getSelectedPropertyValues<string | number>("id", { layerId: LAYER_IDS.circle }),
   * );
   * 适合需要直接处理底层 context / 自定义状态结构时使用，再手动交给面板 helper 拼装文本。
   */
  const summary = buildSelectionChangeSummary(summaryInput);
  selectionPanelState.lastChangeSummary = summary;
  return summary;
};

/**
 * 从业务层选中项中提取适合展示的业务 ID 列表。
 * @param items 当前选中项列表
 * @returns 归一化后的业务 ID 列表
 */
const getSelectionItemIds = (
  items: BusinessKit.MapBusinessSelectionItem[],
): Array<string | number> => {
  return items.flatMap((item) => {
    const propertyId = item.properties?.id;
    if (propertyId !== undefined && propertyId !== null) {
      return [propertyId as string | number];
    }

    return item.featureId === null ? [] : [item.featureId];
  });
};

/**
 * 将地图经纬度对象转换为 Popup helper 需要的锚点格式。
 * @param lngLat 当前地图经纬度
 * @returns 可直接传给 Popup 的坐标数组
 */
const createPopupLngLat = (lngLat: { lng: number; lat: number }): [number, number] => {
  return [lngLat.lng, lngLat.lat];
};

/**
 * 在 NGGI00 示例页中演示“点击线后立即测长”的业务效果。
 * @param lineFeature 当前点击命中的线要素
 */
const showClickedLineMeasureExample = (lineFeature: MapCommonLineFeature): void => {
  const lineLengthMeters = MapLineMeasureTool.getFeatureLengthInMeters(lineFeature);
  if (lineLengthMeters === null) {
    return;
  }

  const featureId = getFeatureBusinessId(lineFeature) ?? "未命名线";
  console.log("[NGGI00 示例] 点击线后测得线总长度", {
    featureId,
    lineLengthMeters,
  });
  ElMessage.success(`示例：线 ${String(featureId)} 总长度为 ${lineLengthMeters.toFixed(2)} m`);
};

// ==========================================
// Popup 状态管理
// ==========================================

/**
 * 当前页面的统一 Popup 状态管理实例。
 * 泛型传入当前页面支持的全部弹窗载荷联合类型（NgPopupPayload），
 * 确保后续在调用 popup.open / popup.setPayload 时具备严格的类型提示与校验。
 */
const popup = useMapPopupState<NgPopupPayload>();
const { visible: popupVisible, lngLat: popupLngLat, payload: popupPayload } = popup;

/** 当前选中的线段索引。 */
const popupSelectedSegmentIndex = computed(() => {
  return getLinePopupPayload(popupPayload.value)?.selectedSegmentIndex ?? -1;
});

const lineActionForm = reactive({
  widthMeters: 10,
  extendLengthMeters: 20,
});

/**
 * 处理弹窗中的业务按钮点击动作。
 */
const handlePopupAction = (): void => {
  const currentPayload = popupPayload.value;
  if (!currentPayload) {
    ElMessage.info("当前没有打开中的弹窗");
    return;
  }

  if (currentPayload.type === NGGI00_POPUP_TYPE.line) {
    ElMessage.success(
      `查看线路详情：${String(currentPayload.featureProps.id || currentPayload.featureId)}`,
    );
    return;
  }

  if (currentPayload.type === NGGI00_POPUP_TYPE.point) {
    ElMessage.success(`进入站点：${String(currentPayload.featureProps.name || "未命名站点")}`);
    return;
  }

  ElMessage.success(
    `查看 TerraDraw 要素：${String(currentPayload.featureId || currentPayload.featureProps.id || "无")}`,
  );
};

/**
 * 统一清空当前页面中的全部线草稿及其派生要素。
 */
const handleClearLineDraftFeatures = (): void => {
  if (!hasLineDraftFeatures.value) {
    ElMessage.info("当前没有可清理的线草稿");
    return;
  }

  const success = lineDraftPreview.clear();
  if (!success) {
    ElMessage.warning("当前未注册线草稿插件，无法清空草稿");
    return;
  }

  closeBusinessPanels();
  ElMessage.success("已通过 businessMap.draft 清空全部线草稿");
};

/**
 * 点击【生成线廊】按钮时的处理逻辑。
 * 核心逻辑：
 * 1. 拿到当前选中的线
 * 2. 如果选中的是"线草稿"，生成的结果就继续进入插件内部草稿池（这样清理时能一起清掉）
 * 3. 如果选中的是"正式线"，生成的结果就保存到"正式数据源"里
 */
const handleGenerateLineCorridor = (): void => {
  const selectedLineFeature = featureQuery.resolveSelectedLine();
  if (!selectedLineFeature) {
    ElMessage.warning("当前未选中可操作的线要素");
    return;
  }

  if (lineActionForm.widthMeters <= 0) {
    ElMessage.warning("请输入大于 0 的区域宽度");
    return;
  }

  const result = featureQuery.replaceSelectedLineCorridor({
    widthMeters: lineActionForm.widthMeters,
  });
  if (!result.success) {
    ElMessage.warning(result.message);
    return;
  }

  popup.setPayload(createLinePopupPayload(selectedLineFeature, popupSelectedSegmentIndex.value));
  ElMessage.success(result.message);
};

/**
 * 点击【创建线草稿】按钮时的处理逻辑。
 * 这个方法不会直接修改你的"正式数据"。
 * 它只是告诉插件："我要在这条线的这个位置，按这个方向延长这么多米"。
 * 然后插件会自动在地图上画出一条【线草稿】（虚线）。
 */
const handleCreateLineDraft = (): void => {
  if (lineActionForm.extendLengthMeters <= 0) {
    ElMessage.warning("请输入大于 0 的延长长度");
    return;
  }

  const result = featureQuery.previewSelectedLine({
    segmentIndex: popupSelectedSegmentIndex.value,
    extendLengthMeters: lineActionForm.extendLengthMeters,
  });

  if (!result.success || !result.lineFeature) {
    ElMessage.warning(result.message);
    return;
  }

  popup.setPayload(createLinePopupPayload(result.lineFeature, 0));
  ElMessage.success(result.message);
};

/**
 * 这个方法在点击普通要素时触发。
 * 它会在地图上弹出一个气泡框(Popup)，显示这条线的详情。
 * 并且，它会顺便计算出【你刚才点击的是这条线的第几段】，
 * 这个"第几段"的数据会被后面的【创建线草稿】和【生成线廊】直接使用。
 * @param context 点击事件传过来的数据
 */
const openMapFeaturePopup = (context: BusinessKit.MapLayerInteractiveContext) => {
  const businessContext = featureQuery.toBusinessContext(context);
  if (!businessContext.feature || !businessContext.lngLat) return;

  contextMenuState.visible = false;
  contextMenuState.summaryRows = [];
  selectionPanelState.contextMenuSummary = EMPTY_CONTEXT_MENU_TEXT;

  /*
   * 旧写法 / 逃生出口：
   * const featureRef = featureQuery.getFeatureRef(context);
   * const latestFeature =
   *   featureQuery.resolveFeature(featureRef) || (context.feature as unknown as MapCommonFeature);
   * 适合需要直接处理底层 context / 自定义状态结构时使用。
   */
  if (businessContext.isLine) {
    // 注意：
    // 这里优先使用 businessContext.lngLat，而不是直接使用原始鼠标坐标。
    // 一旦当前点击命中了吸附结果，lngLat 已经是“吸附后的有效坐标”，
    // 这样后续线段识别、弹窗摘要、线草稿生成等业务计算就都会自动跟随吸附点工作。
    // resolveLineInteractionSnapshot获取未被引擎裁剪的完整线数据，并计算当前点击命中了第几段线段。
    // （MapLibre 渲染时长线会被裁剪，导致坐标缺失，必须回源取完整数据才能算准）
    const lineInteractionSnapshot = MapLineExtensionTool.resolveLineInteractionSnapshot({
      feature: businessContext.feature,
      featureRef: businessContext.featureRef,
      lngLat: businessContext.lngLat,
      resolveLatestFeature: featureQuery.resolveFeature,
    });

    if (!lineInteractionSnapshot) {
      popup.open({
        lngLat: createPopupLngLat(businessContext.lngLat),
        payload: createLinePopupPayload(businessContext.feature as MapCommonLineFeature, -1),
      });
      return;
    }

    popup.open({
      lngLat: createPopupLngLat(businessContext.lngLat),
      payload: createLinePopupPayload(
        lineInteractionSnapshot.lineFeature,
        lineInteractionSnapshot.segmentSelection?.index ?? 0,
      ),
    });
    showClickedLineMeasureExample(lineInteractionSnapshot.lineFeature);
    return;
  }

  popup.open({
    lngLat: createPopupLngLat(businessContext.lngLat),
    payload: createPointPopupPayload(businessContext.feature, businessContext.featureId),
  });
};

/**
 * 打开普通 GeoJSON 图层要素右键属性配置窗口。
 * 该示例用于演示普通图层如何通过属性面板态门面复用统一的 FeaturePropertyEditor。
 * @param context 普通图层统一交互上下文
 */
const openMapFeatureContextMenu = (context: BusinessKit.MapLayerInteractiveContext) => {
  const businessContext = featureQuery.toBusinessContext(context);
  if (!businessContext.feature || !context.point || !context.originalEvent) return;

  context.originalEvent.preventDefault();
  popup.close();

  /*
   * 旧写法 / 逃生出口：
   * const featureRef = featureQuery.getFeatureRef(context);
   * const latestFeature = featureQuery.resolveFeature(featureRef);
   * 适合需要直接处理底层 context / 自定义状态结构时使用。
   */
  const currentSelectionMode = context.selectionMode || selectionMode.value;
  const summaryRows =
    currentSelectionMode === "multiple"
      ? buildSelectionSummaryRows({
          selectionMode: currentSelectionMode,
          selectedCount: selectedCount.value,
          selectedFeatureIds: selectedFeatureIds.value,
          layerGroups: selectedLayerGroups.value,
        })
      : [];
  const editorTarget: BusinessKit.MapFeaturePropertyEditorTarget = {
    type: "map",
    featureRef: businessContext.featureRef,
  };
  const editorState = propertyEditor.resolveEditorState(editorTarget);
  contextMenuState.position = { x: context.point.x, y: context.point.y };
  contextMenuState.panelState = editorState.panelState;
  contextMenuState.rawProperties = clonePropertySnapshot(editorState.rawProperties);
  contextMenuState.summaryRows = summaryRows;
  contextMenuState.editorTarget = editorTarget;
  contextMenuState.note = resolvePropertyPanelNote(editorTarget);
  contextMenuState.visible = true;
  selectionPanelState.contextMenuSummary =
    summaryRows.length > 0 ? buildSelectionSummaryText(summaryRows) : MAP_CONTEXT_MENU_SUMMARY_TEXT;
};

/**
 * 统一输出普通图层交互调试日志。
 * @param label 日志标题
 * @param context 普通图层统一交互上下文
 */
const logMapInteractiveEvent = (label: string, context: BusinessKit.MapLayerInteractiveContext) => {
  console.log(`[Map 图层示例] ${label}`, {
    eventType: context.eventType, // 当前回调对应的交互事件类型
    selectionMode: context.selectionMode, // 当前交互层生效的选择模式
    isMultiSelectActive: context.isMultiSelectActive, // 当前是否处于多选模式
    selectedCount: context.selectedCount, // 当前选中项数量
    layerId: context.layerId, // 当前命中的图层 ID
    featureId: context.featureId, // 当前主目标要素 ID
    properties: context.properties, // 当前主目标要素的业务属性对象
    point: context.point, // 地图事件对应的屏幕像素坐标
    lngLat: context.lngLat, // 地图事件对应的有效经纬度坐标（命中吸附时为吸附后的坐标）
    rawLngLat: context.rawLngLat, // 地图事件对应的原始经纬度坐标（未经过吸附修正）
    snapResult: context.snapResult, // 当前事件的吸附结果快照
    feature: context.feature, // 当前命中的主目标要素（MapGeoJSONFeature 对象）
    hitFeature: context.hitFeature, // 当前原始像素位置命中的要素（未经过吸附重定向）
  });
};

/**
 * 核心：统一注册并分发地图图层交互事件。
 * @description
 * 将所有业务图层的 hover、click、选中等事件收口，避免在模板中散落事件绑定。
 * `layers` 配置块中的键必须与图层 `layer-id` 完全一致。
 */
const mapInteractive: BusinessKit.MapLayerInteractiveOptions = {
  // 是否启用普通图层交互封装。
  // 设为 false 时，map-libre-init 不会为普通业务图层挂载任何交互事件。
  enabled: true,

  // 普通图层交互管理器初始化完成时触发。
  // 适合做首屏联调日志、默认状态同步或图层可用性检查。
  onReady: (context: BusinessKit.MapLayerInteractiveContext) => {
    console.log("[Map 图层示例] 初始化完成，可直接使用普通图层交互能力", context.map);
  },

  // 普通图层统一 hover 入口。
  // 所有已声明图层的悬浮逻辑都可以先在这里做公共处理。
  onHoverEnter: (context: BusinessKit.MapLayerInteractiveContext) => {
    logMapInteractiveEvent("顶层鼠标移入要素", context);
  },

  // 普通图层统一 hover leave 入口。
  // 适合统一清理 tooltip、状态栏摘要等公共 UI。
  onHoverLeave: (context: BusinessKit.MapLayerInteractiveContext) => {
    logMapInteractiveEvent("顶层鼠标移出要素", context);
  },

  // 普通图层统一 click 入口。
  // 点击地图一定会触发；若命中已声明图层要素，则会附带 feature / layerId 等信息。
  onClick: (context: BusinessKit.MapLayerInteractiveContext) => {
    logMapInteractiveEvent("顶层单击地图", context);

    if (!context.feature) {
      return;
    }

    openMapFeaturePopup(context);
  },

  // 普通图层选中集变化入口。
  // 业务层可在这里统一处理多图层批量选择，而不需要分别给每个 layer 写回调。
  onSelectionChange: (context: BusinessKit.MapLayerSelectionChangeContext) => {
    // 将底层选中变化上下文转换为业务层更易消费的结构；集合字段与触发目标字段已分组。
    const selectionContext = featureQuery.toSelectionBusinessContext(context);
    const selectionChangeSummary = syncSelectionPanelFromChange(context);
    console.log("[NGGI00 示例] 选中集变化示例", {
      reason: selectionContext.reason,
      selectionMode: context.selectionMode,
      selectedCount: selectionContext.selectedCount,
      addedFeatureIds: getSelectionItemIds(selectionContext.added),
      removedFeatureIds: getSelectionItemIds(selectionContext.removed),
      circleLayerIds: getSelectionItemIds(
        selectionContext.selected.filter(
          (selectedItem) => selectedItem.layerId === LAYER_IDS.circle,
        ),
      ),
      summary: selectionChangeSummary,
    });
  },

  // 普通图层统一 double click 入口。
  // 适合做 flyTo、进入详情页、切换侧边栏等通用行为。
  onDoubleClick: (context: BusinessKit.MapLayerInteractiveContext) => {
    logMapInteractiveEvent("顶层双击地图", context);

    if (context.selectionMode === "multiple") {
      console.log("[NGGI00 示例] 多选模式下双击事件由业务层自行分发", {
        selectedCount: context.selectedCount,
        featureId: context.featureId,
      });
      return;
    }

    console.log("[NGGI00 示例] 单选模式下双击事件示例逻辑", {
      featureId: context.featureId,
    });
  },

  // 普通图层统一右键入口。
  // 命中要素时可以直接在这里打开公共右键菜单。
  onContextMenu: (context: BusinessKit.MapLayerInteractiveContext) => {
    logMapInteractiveEvent("顶层右键地图", context);

    if (!context.feature) {
      return;
    }

    if (context.selectionMode === "multiple") {
      console.log("[NGGI00 示例] 多选模式右键摘要", {
        selectedCount: context.selectedCount,
        selectedFeatures: context.selectedFeatures,
      });
    }

    openMapFeatureContextMenu(context);
  },

  // 单击地图空白区域时触发。
  // 常见用途：关闭 popup、右键菜单、悬浮信息卡片等业务 UI。
  onBlankClick: (context: BusinessKit.MapLayerInteractiveContext) => {
    console.log("[Map 图层示例] 点击了空白区域", context.point, context.lngLat);
    closeBusinessPanels();
  },

  // 声明需要响应交互的业务图层及其专属配置
  // 多个图层同时命中时，会按这里的声明顺序决定优先级。
  layers: {
    // 主点图层：只需声明 cursor 和 hover 即可，点击事件会走上面的统一 onClick
    [LAYER_IDS.circle]: {
      // 鼠标命中当前图层要素时的光标。
      cursor: "pointer",

      // 是否自动维护 feature-state.hover。
      // 设为 true 后，业务层只管写样式表达式，不需要手动 setFeatureState。
      enableFeatureStateHover: true,
    },
    // 次点图层
    [LAYER_IDS.circleDec]: {
      cursor: "pointer",

      // 当前图层如果不希望自动维护 hover 状态，也可以显式传 false。
      enableFeatureStateHover: true,
    },

    // 线图层示例。
    // 这里演示“统一事件 + 局部覆盖模式”：
    // 公共 popup 与右键菜单由顶层处理，线图层仍可补充专属 click 逻辑。
    [LAYER_IDS.primaryLine]: {
      cursor: "pointer",

      // 线图层同样可以自动维护 hover feature-state，
      // 配合 line-width / line-color 表达式即可直接实现悬浮高亮。
      enableFeatureStateHover: true,

      onClick: (context: BusinessKit.MapLayerInteractiveContext) => {
        console.log("[Map 图层示例] 正式线图层额外 onClick，可在这里补充专属业务逻辑", context);
      },
    },

    // 第二正式线图层示例。
    // 这里故意复用与主线图层完全相同的交互协议，用于验证“多 source 共用一套交互协议”。
    [LAYER_IDS.secondaryLine]: {
      cursor: "pointer",
      enableFeatureStateHover: true,
      onClick: (context: BusinessKit.MapLayerInteractiveContext) => {
        console.log("[Map 图层示例] 第二正式线图层额外 onClick，可在这里补充专属业务逻辑", context);
      },
    },
  },
};

// ==========================================
// 响应式右键菜单状态管理
// ==========================================
const contextMenuState = reactive({
  visible: false,
  position: { x: 0, y: 0 },
  panelState: createEmptyPropertyPanelState(),
  rawProperties: {} as Record<string, any>,
  summaryRows: [] as SelectionSummaryRow[],
  editorTarget: null as BusinessKit.MapFeaturePropertyEditorTarget | null,
  note: "",
});

/**
 * 根据当前右键目标解析面板提示文案。
 * @param editorTarget 当前编辑目标
 * @returns 适合直接展示的说明文本
 */
const resolvePropertyPanelNote = (
  editorTarget: BusinessKit.MapFeaturePropertyEditorTarget | null,
): string => {
  if (!editorTarget) {
    return "";
  }
  if (editorTarget.type === "map") {
    return editorTarget.featureRef?.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID
      ? LINE_DRAFT_PROPERTY_PANEL_NOTE
      : MAP_PROPERTY_PANEL_NOTE;
  }

  return editorTarget.controlType === "measure"
    ? MEASURE_PROPERTY_PANEL_NOTE
    : DRAW_PROPERTY_PANEL_NOTE;
};

/**
 * 获取当前右键面板指向的目标要素 ID。
 * @returns 当前目标要素 ID；不存在时返回 null
 */
const getContextMenuFeatureId = (): string | number | null => {
  if (!contextMenuState.editorTarget) {
    return null;
  }

  return contextMenuState.editorTarget.type === "map"
    ? (contextMenuState.editorTarget.featureRef?.featureId ?? null)
    : contextMenuState.editorTarget.featureId;
};

/**
 * 按当前右键目标重新解析属性面板态与原始快照。
 * @param nextEditorState 最新属性编辑器状态
 */
const syncContextMenuPanelState = (
  nextEditorState?: BusinessKit.MapFeaturePropertyEditorState,
): void => {
  if (!contextMenuState.editorTarget) {
    contextMenuState.panelState = createEmptyPropertyPanelState();
    contextMenuState.rawProperties = {};
    return;
  }

  const editorState =
    nextEditorState || propertyEditor.resolveEditorState(contextMenuState.editorTarget);
  contextMenuState.panelState = editorState.panelState;
  contextMenuState.rawProperties = clonePropertySnapshot(editorState.rawProperties);
};

/**
 * 统一关闭业务弹窗与右键属性窗口。
 */
const closeBusinessPanels = () => {
  popup.close();
  contextMenuState.visible = false;
  contextMenuState.panelState = createEmptyPropertyPanelState();
  contextMenuState.rawProperties = {};
  contextMenuState.summaryRows = [];
  contextMenuState.editorTarget = null;
  contextMenuState.note = "";
  selectionPanelState.contextMenuSummary = EMPTY_CONTEXT_MENU_TEXT;
};

/**
 * 生成测量要素的业务摘要文本，便于业务层在日志、提示条或弹窗中直接使用。
 * @param context TerraDraw / Measure 统一交互上下文
 * @returns 适合业务层直接展示的测量摘要文本
 */
const getMeasureFeatureSummaryText = (context: BusinessKit.TerradrawInteractiveContext) => {
  const properties = context.feature?.properties || {};

  if (properties.distance !== undefined) {
    return `距离：${properties.distance} ${properties.unit || properties.distanceUnit || ""}`.trim();
  }

  if (properties.area !== undefined) {
    return `面积：${properties.area} ${properties.unit || ""}`.trim();
  }

  if (properties.radiusKilometers !== undefined) {
    return `半径：${properties.radiusKilometers} km`;
  }

  if (properties.elevation !== undefined) {
    return `高程：${properties.elevation} ${properties.elevationUnit || ""}`.trim();
  }

  return "当前要素暂无可提取的测量摘要";
};

/**
 * 打开 TerraDraw 要素详情弹窗。
 * @param context TerraDraw 统一交互上下文
 */
const openTerradrawPopup = (context: BusinessKit.TerradrawInteractiveContext) => {
  if (!context.feature || !context.lngLat) return;

  contextMenuState.visible = false;
  contextMenuState.summaryRows = [];
  selectionPanelState.contextMenuSummary = EMPTY_CONTEXT_MENU_TEXT;
  popup.open({
    lngLat: createPopupLngLat(context.lngLat),
    payload: createTerradrawPopupPayload(
      context.feature as MapCommonFeature,
      (context.feature.id as string | number | null) ?? null,
    ),
  });
};

/**
 * 打开 TerraDraw 要素右键属性配置窗口。
 * 这里同样先走属性面板态查询，让系统字段在进入业务编辑器前就被收口。
 * @param context TerraDraw 统一交互上下文
 */
const openTerradrawContextMenu = (context: BusinessKit.TerradrawInteractiveContext) => {
  if (!context.feature || !context.point || !context.originalEvent) return;

  context.originalEvent.preventDefault();
  popup.close();

  const featureId =
    context.featureId ?? (context.feature.id as string | number | null | undefined) ?? null;
  const rawProperties = clonePropertySnapshot(context.feature.properties || {});
  const editorTarget =
    featureId === null
      ? null
      : ({
          type: "terradraw",
          controlType: context.controlType,
          featureId,
          currentProperties: rawProperties,
        } satisfies BusinessKit.MapFeaturePropertyEditorTarget);
  const editorState = propertyEditor.resolveEditorState(editorTarget);

  contextMenuState.position = { x: context.point.x, y: context.point.y };
  contextMenuState.panelState = editorState.panelState;
  contextMenuState.rawProperties = clonePropertySnapshot(editorState.rawProperties);
  contextMenuState.summaryRows = [];
  contextMenuState.editorTarget = editorTarget;
  contextMenuState.note = resolvePropertyPanelNote(editorTarget);
  contextMenuState.visible = true;
  selectionPanelState.contextMenuSummary = TERRADRAW_CONTEXT_MENU_SUMMARY_TEXT;
};

/**
 * 将最新属性同步回右键面板和详情弹窗，保证页面态与底层数据一致。
 * @param nextEditorState 最新属性编辑器状态
 */
const syncSavedPropertiesToPanels = (
  nextEditorState: BusinessKit.MapFeaturePropertyEditorState,
) => {
  syncContextMenuPanelState(nextEditorState);

  if (contextMenuState.editorTarget?.type === "terradraw") {
    contextMenuState.editorTarget = {
      ...contextMenuState.editorTarget,
      currentProperties: clonePropertySnapshot(nextEditorState.rawProperties),
    };
  }

  const currentPopupPayload = popupPayload.value;
  if (popupVisible.value && currentPopupPayload?.featureId === getContextMenuFeatureId()) {
    popup.setPayload({
      ...currentPopupPayload,
      featureProps: clonePropertySnapshot(nextEditorState.rawProperties),
    });
  }
};

/**
 * 统一处理属性面板的“单键保存”。
 * 业务层不再自己判断来源类型，只把当前 editorTarget 和本次字段改动交给 propertyEditor。
 *
 * @param payload 本次需要写回的单个属性载荷
 */
const handleSavePropertyItem = (payload: FeaturePropertyEditorSavePayload) => {
  if (!contextMenuState.editorTarget) {
    ElMessage.warning("当前没有可写回的目标要素");
    return;
  }

  const result = propertyEditor.saveItem(contextMenuState.editorTarget, payload);
  if (!result.success) {
    ElMessage.warning(result.message);
    return;
  }

  syncSavedPropertiesToPanels(result.editorState);
  ElMessage.success(result.message);
};

/**
 * 统一处理属性面板的“单键删除”。
 * 删除和保存走同一套门面，保证面板里显示可删的字段，底层也真的删得掉。
 *
 * @param payload 本次需要删除的单个属性键
 */
const handleRemovePropertyItem = (payload: FeaturePropertyEditorRemovePayload) => {
  if (!contextMenuState.editorTarget) {
    ElMessage.warning("当前没有可删除属性的目标要素");
    return;
  }

  const result = propertyEditor.removeItem(contextMenuState.editorTarget, payload.key);
  if (!result.success) {
    ElMessage.warning(result.message);
    return;
  }

  syncSavedPropertiesToPanels(result.editorState);
  ElMessage.success(result.message);
};

// ==========================================
// 调用mapLibre、terradraw等底层能力的示例
// ==========================================

/**
 * 创建 raw API 示例使用的空 GeoJSON 数据。
 * @returns 可直接交给 GeoJSONSource 的空要素集合
 */
const createRawDemoData = (): MapCommonFeatureCollection => {
  return {
    type: "FeatureCollection",
    features: [],
  };
};

/**
 * 创建 raw API 示例使用的点要素。
 * @param lng 点位经度
 * @param lat 点位纬度
 * @param color 当前要素颜色
 * @returns 最小可运行的演示要素
 */
const createRawDemoFeature = (lng: number, lat: number, color: string): MapCommonFeature => {
  return {
    type: "Feature",
    id: RAW_DEMO_IDS.feature,
    properties: {
      name: "raw-demo-point",
      color,
    },
    geometry: {
      type: "Point",
      coordinates: [lng, lat],
    },
  };
};

/**
 * 读取当前可用的原始地图实例。
 * 这里会先输出 rawHandles，再返回其中可直接操作的原始地图对象。
 * @returns 已就绪的原始地图；未就绪时返回 null
 */
const getRawDemoMap = (): RawDemoMap | null => {
  const rawHandles = mapInitRef.value?.rawHandles;
  if (!rawHandles) {
    ElMessage.warning("地图组件尚未初始化完成");
    return null;
  }

  const drawEngine = rawHandles.drawControl?.getTerraDrawInstance();
  const measureEngine = rawHandles.measureControl?.getTerraDrawInstance();

  console.log("[NGGI00 示例] rawHandles", {
    map: rawHandles.map,
    mapInstance: rawHandles.mapInstance,
    drawControl: rawHandles.drawControl,
    measureControl: rawHandles.measureControl,
    drawEngine,
    measureEngine,
  });

  const rawMap = rawHandles.map;
  const mapLoaded = rawHandles.mapInstance.isLoaded;

  if (!rawMap || !mapLoaded || !rawMap.isStyleLoaded()) {
    // source / layer 增删依赖样式树可用，因此这里把“已挂载但样式未就绪”也视为不可执行状态。
    ElMessage.warning("地图样式尚未加载完成，请稍后再试");
    return null;
  }

  return rawMap;
};

/**
 * 确保 raw API 示例数据源已注册。
 * @param map 原始地图实例
 * @returns 可直接读写的 GeoJSONSource；异常时返回 null
 */
const ensureRawDemoSource = (map: RawDemoMap): GeoJSONSource | null => {
  const currentSource = map.getSource(RAW_DEMO_IDS.source) as GeoJSONSource | undefined;
  if (currentSource) {
    return currentSource;
  }

  map.addSource(RAW_DEMO_IDS.source, {
    type: "geojson",
    data: createRawDemoData(),
  });

  return (map.getSource(RAW_DEMO_IDS.source) as GeoJSONSource | undefined) || null;
};

/**
 * 确保 raw API 示例图层已注册。
 * @param map 原始地图实例
 */
const ensureRawDemoLayer = (map: RawDemoMap): void => {
  if (map.getLayer(RAW_DEMO_IDS.layer)) {
    return;
  }

  map.addLayer({
    id: RAW_DEMO_IDS.layer,
    type: "circle",
    source: RAW_DEMO_IDS.source,
    paint: {
      "circle-radius": 10,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      // 图层颜色直接读 feature.properties.color，方便演示“只改要素数据就能改样式”。
      "circle-color": ["coalesce", ["get", "color"], RAW_DEMO_COLORS.idle],
    },
  });
};

/**
 * 使用原始 MapLibre API 演示：
 * 1. 增加数据源
 * 2. 增加图层
 * 3. 增加一个点要素
 * 4. 再次点击时切换该要素颜色
 */
const runRawApiDemo = async (): Promise<void> => {
  const map = getRawDemoMap();
  if (!map) {
    return;
  }

  const source = ensureRawDemoSource(map);
  if (!source) {
    ElMessage.warning("raw 示例数据源创建失败");
    return;
  }

  ensureRawDemoLayer(map);

  const sourceData = await source.getData();
  const nextData: MapCommonFeatureCollection =
    sourceData.type === "FeatureCollection"
      ? {
          type: "FeatureCollection",
          // getData() 读到的是运行时快照；这里复制一份数组，避免直接改原对象引用。
          features: [...(sourceData.features as MapCommonFeature[])],
        }
      : createRawDemoData();

  const featureIndex = nextData.features.findIndex(
    (feature) => feature.id === RAW_DEMO_IDS.feature,
  );

  if (featureIndex < 0) {
    const center = map.getCenter();
    nextData.features.push(createRawDemoFeature(center.lng, center.lat, RAW_DEMO_COLORS.idle));
    source.setData(nextData);
    console.log("[NGGI00 示例] raw API 已添加 source、layer、feature", nextData);
    ElMessage.success("raw API 示例已创建数据源、图层和一个点要素");
    return;
  }

  const currentFeature = nextData.features[featureIndex];
  const currentColor =
    typeof currentFeature.properties?.color === "string"
      ? currentFeature.properties.color
      : RAW_DEMO_COLORS.idle;
  const nextColor =
    currentColor === RAW_DEMO_COLORS.active ? RAW_DEMO_COLORS.idle : RAW_DEMO_COLORS.active;

  nextData.features[featureIndex] = {
    ...currentFeature,
    properties: {
      ...(currentFeature.properties || {}),
      color: nextColor,
    },
  };

  source.setData(nextData);
  console.log("[NGGI00 示例] raw API 已切换要素颜色", {
    featureId: RAW_DEMO_IDS.feature,
    color: nextColor,
    data: nextData,
  });
  ElMessage.success(`raw API 已把示例要素颜色切换为 ${nextColor}`);
};
</script>

<style scoped lang="scss">
.maplibre-area {
  // 地图容器宽度跟随页面收缩，但最大宽度仍保持示例阅读体验。
  width: 100%;
  max-width: 1500px;
  height: 800px;
  margin: 0 auto;
}

.terradraw-popup-json {
  max-height: 180px;
  padding: 8px;
  overflow: auto;
  color: #303133;
  background: #f8f9fb;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
