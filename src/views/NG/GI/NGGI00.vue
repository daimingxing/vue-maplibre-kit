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
        </template>
        <template #dataSource>
          <!--
            业务层现在优先通过 MapBusinessSourceLayers 声明高频图层。
            如果 geometryTypes / where / filter 仍然不够表达业务规则，再回退到原始 Mgl 图层写法。
          -->
          <map-business-source-layers
            :source="primaryBusinessSource"
            :layers="primaryBusinessLayers"
          />
          <map-business-source-layers
            :source="secondaryBusinessSource"
            :layers="secondaryBusinessLayers"
          />
        </template>
      </map-libre-init>
    </div>
    <!-- 业务层示例面板：每一块只演示一种推荐写法，方便按功能阅读 -->
    <div class="demo-panel-board">
      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>当前选中态面板</h3>
          <p>直接使用 `useBusinessMap(...).selection` 驱动 UI。</p>
        </div>
        <div class="demo-panel-actions">
          <el-button type="primary" plain :disabled="isSelectionActive" @click="activateSelection">
            进入多选
          </el-button>
          <el-button plain :disabled="!hasSelection" @click="clearSelection">清空选中</el-button>
          <el-button plain :disabled="!isSelectionActive" @click="deactivateSelection">
            退出多选
          </el-button>
        </div>
        <div class="demo-panel-kv-list">
          <div class="demo-panel-kv">
            <span>当前模式</span>
            <strong>{{ selectionModeText }}</strong>
          </div>
          <div class="demo-panel-kv">
            <span>选中数量</span>
            <strong>{{ selectedCount }} 个</strong>
          </div>
          <div class="demo-panel-kv">
            <span>要素 ID</span>
            <strong>{{ selectedFeatureIdsText }}</strong>
          </div>
          <div class="demo-panel-kv">
            <span>circleLayer 业务 ID</span>
            <strong>{{ selectedCircleLayerIdsText }}</strong>
          </div>
          <div class="demo-panel-kv">
            <span>图层分布</span>
            <strong>{{ selectedLayerDistributionText }}</strong>
          </div>
        </div>
        <p class="demo-panel-note">{{ selectionGuideText }}</p>
      </section>

      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>选中集变化日志</h3>
          <p>这里只演示 `onSelectionChange` 的快捷提取方法。</p>
        </div>
        <p class="demo-panel-summary">
          {{ selectionPanelState.lastChangeSummary }}
        </p>
      </section>

      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>多选右键摘要</h3>
          <p>右键时直接复用 helper，快速生成业务摘要。</p>
        </div>
        <p class="demo-panel-summary">
          {{ selectionPanelState.contextMenuSummary }}
        </p>
      </section>

      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>线操作入口</h3>
          <p>线弹窗、线廊生成和线草稿都只走本地要素查询门面。</p>
        </div>
        <p class="demo-panel-summary">{{ selectedLineOperationText }}</p>
      </section>

      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>线草稿状态</h3>
          <p>线草稿状态现在直接通过 `useBusinessMap(...).draft` 读取。</p>
        </div>
        <div class="demo-panel-kv-list">
          <div class="demo-panel-kv">
            <span>当前状态</span>
            <strong>{{ hasLineDraftFeatures ? "已有草稿" : "暂无草稿" }}</strong>
          </div>
        </div>
        <p class="demo-panel-summary">{{ lineDraftStatusText }}</p>
        <div class="demo-panel-actions">
          <el-button
            type="warning"
            plain
            :disabled="!hasLineDraftFeatures"
            @click="handleClearLineDraftFeatures"
          >
            清空线草稿
          </el-button>
        </div>
      </section>

      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>DXF 导出插件</h3>
          <p>这个示例同时演示“插件默认导出全部业务源”和“业务层局部覆写导出”。</p>
        </div>
        <div class="demo-panel-kv-list">
          <div class="demo-panel-kv">
            <span>插件默认文件</span>
            <strong>{{ DXF_DEFAULT_FILE_NAME }}</strong>
          </div>
          <div class="demo-panel-kv">
            <span>默认坐标转换</span>
            <strong>{{ dxfDefaultCrsText }}</strong>
          </div>
          <div class="demo-panel-kv">
            <span>全局默认 CRS 位置</span>
            <strong>封装层 DEFAULT_DXF_CRS_OPTIONS</strong>
          </div>
          <div class="demo-panel-kv">
            <span>全局默认配色</span>
            <strong>{{ dxfGlobalTrueColorText }}</strong>
          </div>
          <div class="demo-panel-kv">
            <span>局部覆写文件</span>
            <strong>{{ DXF_PRIMARY_ONLY_FILE_NAME }}</strong>
          </div>
        </div>
        <p class="demo-panel-note">{{ dxfResolvedOptionsText }}</p>
        <p class="demo-panel-note">{{ DXF_DEFAULT_CRS_CONFIG_PATH_TEXT }}</p>
        <p class="demo-panel-note">{{ DXF_DEFAULT_TRUE_COLOR_CONFIG_PATH_TEXT }}</p>
        <p class="demo-panel-note">{{ DXF_OVERRIDE_GUIDE_TEXT }}</p>
      </section>

      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>DXF 配置速查</h3>
          <p>这里把插件壳、defaults 和常用筛选 / 分层 / 着色回调的含义一次性写全，方便业务层直接照着配。</p>
        </div>
        <p class="demo-panel-note">{{ DXF_PLUGIN_OPTIONS_GUIDE_TEXT }}</p>
        <p class="demo-panel-note">{{ DXF_CALLBACK_GUIDE_TEXT }}</p>
      </section>
    </div>
    <!-- 引入自定义的 Vue Popup 组件 -->
    <mgl-popup
      v-model:visible="popupVisible"
      :lngLat="popupLngLat"
      :options="{ closeButton: true, closeOnClick: true, maxWidth: '420px' }"
    >
      <!-- 动态判断内容：这个例子中使用了type属性来分辨要素 -->
      <div v-if="hasLinePopup" class="my-popup-container" style="min-width: 320px">
        <h3 style="margin: 0 0 10px 0; color: #409eff">
          <el-icon>
            <InfoFilled />
          </el-icon>
          线操作
        </h3>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="编号">
            <el-tag size="small">{{ popupLineFeatureProps.id }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总长度">
            {{ popupLineLengthMeters.toFixed(2) }} m
          </el-descriptions-item>
          <el-descriptions-item label="选中线段">
            {{
              popupSelectedSegmentIndex >= 0 ? `第 ${popupSelectedSegmentIndex + 1} 段` : "未识别"
            }}
          </el-descriptions-item>
          <el-descriptions-item label="当前段长">
            {{ popupSelectedSegmentLengthMeters.toFixed(2) }} m
          </el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 12px">
          <div style="margin-bottom: 6px; font-size: 13px; color: #606266">区域宽度（米）</div>
          <el-input-number
            v-model="lineActionForm.widthMeters"
            :min="0.1"
            :step="1"
            :precision="2"
            style="width: 100%"
          />
        </div>

        <div style="margin-top: 12px">
          <div style="margin-bottom: 6px; font-size: 13px; color: #606266">延长长度（米）</div>
          <el-input-number
            v-model="lineActionForm.extendLengthMeters"
            :min="0.1"
            :step="1"
            :precision="2"
            style="width: 100%"
          />
        </div>

        <div style="display: flex; gap: 8px; margin-top: 14px">
          <el-button
            type="primary"
            size="small"
            style="flex: 1"
            @click="handleGenerateLineCorridor"
          >
            生成线廊
          </el-button>
          <el-button type="success" size="small" style="flex: 1" @click="handleCreateLineDraft">
            创建线草稿
          </el-button>
        </div>
        <el-button
          v-if="hasLineDraftFeatures"
          type="warning"
          plain
          size="small"
          style="width: 100%; margin-top: 8px"
          @click="handleClearLineDraftFeatures"
        >
          清空临时草稿
        </el-button>
      </div>

      <!-- 动态判断内容：如果是点 -->
      <div v-else-if="hasPointPopup" class="my-popup-container" style="min-width: 200px">
        <h3 style="margin: 0 0 10px 0; color: #67c23a">
          <el-icon>
            <Location />
          </el-icon>
          站点信息
        </h3>
        <p>
          <strong>名称：</strong>
          {{ popupPointFeatureProps.name || "未命名站点" }}
        </p>
        <p>
          <strong>状态：</strong>
          <el-tag
            :type="popupPointFeatureProps.status === 'normal' ? 'success' : 'danger'"
            size="small"
          >
            {{ popupPointFeatureProps.status === "normal" ? "正常" : "异常" }}
          </el-tag>
        </p>
        <el-button type="success" size="small" style="width: 100%" @click="handlePopupAction">
          进入站点视图
        </el-button>
      </div>
      <div v-else-if="hasTerradrawPopup" class="my-popup-container" style="min-width: 260px">
        <h3 style="margin: 0 0 10px 0; color: #e6a23c">
          <el-icon>
            <InfoFilled />
          </el-icon>
          TerraDraw 要素
        </h3>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="要素 ID">
            <el-tag size="small">
              {{ popupTerradrawFeatureIdText }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="几何类型">
            {{ popupTerradrawGeometryType || "未知" }}
          </el-descriptions-item>
          <el-descriptions-item label="绘制模式">
            {{ popupTerradrawFeatureProps.mode || "未知" }}
          </el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 10px">
          <div style="margin-bottom: 4px; font-weight: bold; color: #606266">属性快照</div>
          <pre class="terradraw-popup-json">{{
            JSON.stringify(popupTerradrawFeatureProps, null, 2)
          }}</pre>
        </div>
      </div>
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
import { computed, ref, reactive } from "vue";
import mapGeojson from "./mock/map.geojson";
import mapGeojson2 from "./mock/map2.geojson";
import { ElButton, ElInputNumber, ElMessage } from "element-plus";
import { InfoFilled, Location } from "@element-plus/icons-vue";
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
  createMapDxfExportPlugin,
  DEFAULT_DXF_CRS_OPTIONS,
  DEFAULT_DXF_TRUE_COLOR_RULES,
  type MapDxfExportOptions,
  type MapDxfExportTaskOptions,
  type MapDxfLayerNameResolver,
} from "vue-maplibre-kit/plugins/map-dxf-export";
import { createMapFeatureMultiSelectPlugin } from "vue-maplibre-kit/plugins/map-feature-multi-select";
import { createMapFeatureSnapPlugin } from "vue-maplibre-kit/plugins/map-feature-snap";

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
 * 正式业务源的字段规则示例。
 * 业务层只需要声明：
 * 1. 哪些字段只读
 * 2. 哪些字段属于稳定业务字段
 * 3. 哪些字段不该进入业务属性面板
 *
 * 面板态与保存/删除权限都会统一复用这份规则。
 */
const BUSINESS_SOURCE_PROPERTY_POLICY: BusinessKit.MapFeaturePropertyPolicy = {
  readonlyKeys: ["id"],
  fixedKeys: ["mark"],
  hiddenKeys: ["marker-color", "marker-size", "marker-symbol"],
};

/**
 * Draw 控件的字段规则示例。
 * 绘制要素进入属性面板前，同样会先按这里的规则收口。
 */
const DRAW_PROPERTY_POLICY: BusinessKit.MapFeaturePropertyPolicy = {
  fixedKeys: ["bizName"],
  readonlyKeys: ["bizCode"],
};

/**
 * Measure 控件的字段规则示例。
 * 像距离、面积这类系统测量字段会被底层额外隐藏，
 * 这里主要声明业务自己关心的字段规则。
 */
const MEASURE_PROPERTY_POLICY: BusinessKit.MapFeaturePropertyPolicy = {
  fixedKeys: ["label"],
  readonlyKeys: ["taskCode"],
};

/**
 * 普通业务源右键面板提示文案。
 */
const MAP_PROPERTY_PANEL_NOTE =
  "上方列表只展示业务可见字段。`id` 是只读字段不能修改，`mark` 被声明为稳定字段可改但不可删；像 marker-color 这类样式辅助字段会被隐藏到下方调试快照。新增的临时字段默认允许删除。";

/**
 * 线草稿右键面板提示文案。
 */
const LINE_DRAFT_PROPERTY_PANEL_NOTE =
  "线草稿会继承正式来源的属性治理规则。业务层看不到内部来源字段，也不能修改 ID；如果新增了临时字段，仍然可以通过删除按钮显式移除。";

/**
 * TerraDraw 绘制控件右键面板提示文案。
 */
const DRAW_PROPERTY_PANEL_NOTE =
  "这里展示的是绘制业务字段。TerraDraw 内部状态字段已经被系统层隐藏；如果某个字段命中固定/只读规则，保存后会立即收紧为不可删或不可改。";

/**
 * Measure 控件右键面板提示文案。
 */
const MEASURE_PROPERTY_PANEL_NOTE =
  "这里展示的是测量业务字段。像 distance、area、segments 这类测量结果由系统维护，不会出现在业务编辑列表里；如需排查，可查看下方原始属性调试快照。";

/**
 * 修改样式示例统一使用的 feature-state 键名。
 * 这里故意使用 feature-state，而不是直接改 GeoJSON 数据。
 * 样式配置里会直接把它写成 `demoStyled`，方便业务层照着示例抄；
 * 按钮逻辑则统一复用这个常量，避免多处散落字符串。
 */
const DEMO_STYLE_STATE_KEY = "demoStyled";

/** DXF 插件默认导出的文件名。 */
const DXF_DEFAULT_FILE_NAME = "nggi00-business-all.dxf";

/** 业务层局部覆写时的文件名。 */
const DXF_PRIMARY_ONLY_FILE_NAME = "nggi00-primary-only.dxf";

/**
 * 默认坐标转换说明文本。
 * 模板直接展示这行文字，让业务开发者一眼就能看到封装层默认值。
 */
const dxfDefaultCrsText = `${DEFAULT_DXF_CRS_OPTIONS.sourceCrs} -> ${DEFAULT_DXF_CRS_OPTIONS.targetCrs}`;

/**
 * 默认 CRS 配置填写位置说明。
 * 这里直接把“封装层默认坐标配置维护在哪里”明确展示给业务开发者。
 */
const DXF_DEFAULT_CRS_CONFIG_PATH_TEXT =
  "DXF 全局默认 CRS 已在插件封装层统一维护；业务层只有需要覆盖时，才在 createMapDxfExportPlugin({ defaults }) 或 downloadDxf(overrides) 里传 sourceCrs / targetCrs。";

/**
 * 全局 TrueColor 规则入口说明。
 * 当前库只提供统一配置入口，不在示例页里写死任何业务配色。
 */
const DXF_DEFAULT_TRUE_COLOR_CONFIG_PATH_TEXT =
  "DXF 全局默认 TrueColor 规则入口已经预留：DEFAULT_DXF_TRUE_COLOR_RULES。当前默认是空对象，只负责兜底入口，不内置任何业务颜色逻辑。";

/**
 * 当前全局 TrueColor 入口的展示文本。
 * 用来提醒业务开发者：入口已经有了，但当前仓库默认仍保持空白规则。
 */
const dxfGlobalTrueColorText =
  Object.keys(DEFAULT_DXF_TRUE_COLOR_RULES).length === 0
    ? "DEFAULT_DXF_TRUE_COLOR_RULES（当前为空）"
    : "DEFAULT_DXF_TRUE_COLOR_RULES（已配置）";

/**
 * DXF 局部覆写示例说明。
 * 这里强调两层职责边界：
 * 1. DXF 模块全局默认值负责兜底 CRS 和 TrueColor 规则入口
 * 2. 页面 `defaults` 与 `downloadDxf(overrides)` 负责局部覆盖
 */
const DXF_OVERRIDE_GUIDE_TEXT =
  "右上角插件自带的“导出DXF”按钮会按“全局默认 -> 页面 defaults -> 单次 overrides”合并配置。当前页面额外提供的“导出主业务DXF”按钮，只在本次任务里覆写 sourceIds、fileName 和 layerNameResolver；后续如果业务要按页面或单次任务改 CRS、图层色或特定要素色，也继续通过 defaults 或 downloadDxf(overrides) 覆盖即可。";

/**
 * DXF 插件根配置速查说明。
 * 用来在示例面板里一次性展示插件壳的全部可配字段。
 */
const DXF_PLUGIN_OPTIONS_GUIDE_TEXT = [
  "mapDxfExportPlugin 可配项：",
  "1. enabled?: 是否启用整个 DXF 导出插件。",
  "2. sourceRegistry: 必填，传当前页面的业务 sourceRegistry。",
  "3. defaults?: 页面级默认导出配置，会覆盖封装层统一维护的全局默认 CRS。",
  "   可配字段：sourceIds / fileName / sourceCrs / targetCrs / featureFilter / layerNameResolver / layerTrueColorResolver / featureTrueColorResolver。",
  "4. control?: 内置按钮配置。",
  "   可配字段：enabled / position / label。",
].join("\n");

/**
 * DXF 回调用法速查说明。
 * 重点解释业务层最常用的筛选、分层和着色入口。
 */
const DXF_CALLBACK_GUIDE_TEXT = [
  "featureFilter(feature, sourceId)：返回 true 表示保留当前要素，返回 false 表示本次导出跳过当前要素。",
  "layerNameResolver(feature, sourceId)：返回当前要素写入 DXF 的图层名。相同返回值的要素会被放进同一个 DXF 图层。",
  "layerTrueColorResolver(layerName, sourceId)：返回图层 TrueColor；即使没有 layerNameResolver，默认按 sourceId 分层时也一样可用。",
  "featureTrueColorResolver(feature, sourceId, layerName)：返回实体 TrueColor，优先级高于图层色，适合少量特殊要素。",
  "当前示例页不预置任何颜色规则，只展示“全局入口 + 页面 defaults + 单次 overrides”的接法，避免把业务配色硬编码进示例页。",
  "底层会自动清洗 DXF 非法图层名；如果不同来源最终落到同一 DXF 图层，也会在 warnings 里给出同名合层提示。",
].join("\n");

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

// 1. 注册业务数据源 (Source)
// 通过 createMapBusinessSource 将普通 GeoJSON 包装为带 ID 的规范化数据源
const primaryBusinessSource = createMapBusinessSource({
  sourceId: SOURCE_IDS.primary,
  data: test_geojson,
  promoteId: "id", // 指定用作要素唯一标识的属性名
  // 业务层只声明“哪些字段可见、可改、可删”，具体过滤与保护交给底层统一完成。
  propertyPolicy: BUSINESS_SOURCE_PROPERTY_POLICY,
});

const secondaryBusinessSource = createMapBusinessSource({
  sourceId: SOURCE_IDS.secondary,
  data: test_geojson_secondary,
  promoteId: "id",
  propertyPolicy: BUSINESS_SOURCE_PROPERTY_POLICY,
});

// 将所有业务源注册到管理中心，供查询与写入时使用
const businessSourceRegistry = createMapBusinessSourceRegistry([
  primaryBusinessSource,
  secondaryBusinessSource,
]);

/**
 * 当前页面持有的地图组件公开实例引用。
 * 业务层所有地图操作都通过它与底层进行通信。
 */
const mapInitRef = ref<BusinessKit.MapLibreInitExpose | null>(null);

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

// 4. DXF 导出插件：第一版只面向业务 source，不包含 TerraDraw / Measure / 手绘要素。
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

    // 图层级颜色：给“这一层里的大多数实体”先设一个默认色。
    // 适合做“面统一灰色、主线统一蓝色、洞点统一红色”这类批量规则。
    /* layerTrueColorResolver: (layerName, sourceId) => {
      // 这里演示“按 source + 图层名关键词”做页面级默认着色。
      // 返回值必须是 #RRGGBB；返回 undefined 表示当前图层不在这里指定颜色。

      // 主业务 source 默认走蓝色系，便于在 CAD 里和其他来源快速区分。
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
    }, */

    // 要素级颜色：用于“局部覆写”。
    // 它的优先级高于图层级颜色；一旦这里返回颜色，当前要素就不再沿用图层默认色。
    // 一般不配特定要素颜色。因为会导致cad软件里图层变色不能控制这个要素的颜色。
    /* featureTrueColorResolver: (feature, sourceId, layerName) => {
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
      if (
        sourceId === SOURCE_IDS.primary &&
        layerName.includes("Line") &&
        name.includes("主")
      ) {
        return "#FF9900";
      }

      // 示例 3：如果后续你们有 status / level / risk 之类字段，也可以继续在这里细分。
      // 没命中则返回 undefined，表示当前要素继续沿用所属图层的默认色。
      return undefined;
    }, */

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
    /* layerNameResolver: (feature: MapCommonFeature, sourceId: string): string => {
      // DXF 里的“图层”可以理解成 CAD 中的分类目录。
      // 同一个图层里的实体会被放在一起，便于后续单独开关显示、选择、改样式。

      // 这里先取业务标记；没有 mark 时给一个兜底值，避免图层名出现空段。
      const mark = String(feature.properties?.mark ?? "normal");

      // 这个示例按“sourceId + 几何类型 + mark”分层。
      // 例如：primary_Line_main、primary_Polygon_area、secondary_Point_hole。
      // 这样导出到 CAD 后，业务人员一眼就能看出每层分别装的是什么数据。
      return `${sourceId}_${feature.geometry.type}_${mark}`;
    }, */
  },

  // 内置控件配置。
  control: {
    enabled: true,
    position: "top-right",
    label: "导出DXF",
  },
} as MapDxfExportOptions);

/**
 * 集中注册当前页面需要启用的地图能力扩展。
 */
const mapPlugins = [
  mapFeatureSnapPlugin,
  lineDraftPreviewPlugin,
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
 * 当前页面是否存在线草稿要素。
 * 该状态直接来自线草稿能力门面，用于驱动示例面板与按钮显隐。
 */
const hasLineDraftFeatures = computed(() => {
  return lineDraftPreview.hasFeatures.value;
});

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
    // 业务层只需要在控件配置里声明稳定字段或只读字段，不需要自己过滤引擎系统字段。
    propertyPolicy: DRAW_PROPERTY_POLICY,

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
    propertyPolicy: MEASURE_PROPERTY_POLICY,

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

/** 右键摘要行。 */
interface SelectionSummaryRow {
  label: string;
  value: string;
}

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
  lastChangeSummary: "当前还没有发生选中集变化",
  contextMenuSummary: "当前未展示选中集摘要",
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

/**
 * 将选择模式转换为便于示例展示的中文文本。
 * @param mode 当前选择模式
 * @returns 中文模式文本
 */
const getSelectionModeText = (mode: BusinessKit.MapSelectionMode): string => {
  return mode === "multiple" ? "多选" : "单选";
};

/**
 * 将值列表格式化为易读文本。
 * @param values 需要展示的值列表
 * @returns 单行展示文本
 */
const formatValueList = (values: Array<string | number>): string => {
  return values.length > 0 ? values.map((value) => String(value)).join("、") : "无";
};

/**
 * 将按图层分组后的结果压缩成单行摘要。
 * @param layerGroups 图层分组结果
 * @returns 图层分布摘要文本
 */
const formatLayerDistribution = (layerGroups: BusinessKit.MapSelectionLayerGroup[]): string => {
  if (layerGroups.length === 0) {
    return "无";
  }

  return layerGroups
    .map((layerGroup) => {
      return `${layerGroup.layerId || "未知图层"} x${layerGroup.features.length}`;
    })
    .join("，");
};

/**
 * 将当前选中集转换为右键面板摘要行。
 * @param currentSelectionMode 当前选择模式
 * @returns 适合直接传给属性面板的摘要行
 */
const buildSelectionSummaryRows = (
  currentSelectionMode: BusinessKit.MapSelectionMode,
): SelectionSummaryRow[] => {
  const currentSelectedFeatures = selectedFeatures.value;

  return [
    {
      label: "当前模式",
      value: getSelectionModeText(currentSelectionMode),
    },
    {
      label: "选中数量",
      value: `${currentSelectedFeatures.length} 个`,
    },
    {
      label: "要素 ID",
      value: formatValueList(selectedFeatureIds.value),
    },
    {
      label: "图层分布",
      value: formatLayerDistribution(getSelectionGroups()),
    },
  ];
};

/**
 * 将摘要行压缩为单行文本，便于日志和示例面板展示。
 * @param summaryRows 当前摘要行
 * @returns 压缩后的单行文本
 */
const buildSelectionSummaryText = (summaryRows: SelectionSummaryRow[]): string => {
  if (summaryRows.length === 0) {
    return "当前没有可展示的选中集摘要";
  }

  return summaryRows.map((summaryRow) => `${summaryRow.label}：${summaryRow.value}`).join(" | ");
};

/**
 * 当前选中集的图层分布文本。
 * 这里直接演示 composable + helper 的组合用法。
 */
const selectedLayerDistributionText = computed(() => {
  return formatLayerDistribution(getSelectionGroups());
});

/**
 * 当前 circleLayer 图层中的业务 ID 摘要。
 * 这里演示 businessMap.selection 暴露的快捷属性提取方法。
 */
const selectedCircleLayerIdsText = computed(() => {
  return formatValueList(
    getSelectionPropertyValues<string | number>("id", {
      layerId: LAYER_IDS.circle,
    }),
  );
});

/**
 * 当前完整选中集的要素 ID 摘要。
 * 这里直接复用 businessMap.selection 已经暴露好的计算结果。
 */
const selectedFeatureIdsText = computed(() => {
  return formatValueList(selectedFeatureIds.value);
});

/**
 * 当前选择模式的中文文本。
 * 这里让模板只负责展示，不再自己写判断。
 */
const selectionModeText = computed(() => {
  return getSelectionModeText(selectionMode.value);
});

/**
 * 当前选中态面板的说明文本。
 * 通过一句话告诉业务开发者：现在不需要再手动同步底层状态。
 */
const selectionGuideText = computed(() => {
  if (!hasSelection.value) {
    return "当前没有选中要素。点右上角的多选按钮后，就可以直接用这个面板观察数量和操作入口。";
  }

  if (isSelectionActive.value) {
    return "现在 UI 直接绑定选择态门面，不再手动同步数量、选中集和清空/退出按钮。";
  }

  return "当前展示的是已有选中结果；如果要批量处理，可以先进入多选模式。";
});

/**
 * 当前线操作入口的说明文本。
 * 这里专门演示：业务层只调用 featureQuery.resolveSelectedLine() 取最新线要素。
 */
const selectedLineOperationText = computed(() => {
  const selectionSignature = selectedFeatureIds.value.join("|");
  const selectedLineFeature = featureQuery.resolveSelectedLine();

  if (!selectedLineFeature) {
    return selectionSignature
      ? "当前选中的不是线要素。请改为点选线，再去试“生成线廊”或“创建线草稿”。"
      : "当前未选中线要素。先点一条线，再去试“生成线廊”或“创建线草稿”。";
  }

  const featureId = getFeatureBusinessId(selectedLineFeature);
  const selectedFeatureRef = featureQuery.getSelectedFeatureRef();
  const sourceText =
    selectedFeatureRef?.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID ? "线草稿源" : "正式业务源";

  return `当前线操作会读取 ${sourceText} 的最新线要素：${String(featureId ?? "未命名线")}`;
});

/**
 * 当前线草稿状态的说明文本。
 * 用来强调业务层现在直接通过 businessMap.draft 读取线草稿状态。
 */
const lineDraftStatusText = computed(() => {
  return hasLineDraftFeatures.value
    ? `线草稿能力门面当前已有临时结果（共 ${lineDraftPreview.featureCount.value} 个）；如果不需要，直接点击这里的“清空线草稿”即可。`
    : "当前没有线草稿。选中线并点击“创建线草稿”后，这里会通过 businessMap.draft 自动刷新状态。";
});

/**
 * 统一格式化 DXF 导出的 source 范围文本。
 * @param sourceIds 最终生效的 sourceId 列表
 * @returns 适合示例面板直接展示的中文文本
 */
const formatDxfSourceIdsText = (sourceIds: string[] | null): string => {
  if (!sourceIds || sourceIds.length === 0) {
    return "全部业务 source";
  }

  return sourceIds.join("、");
};

/**
 * 统一格式化 DXF 导出的坐标转换文本。
 * @param sourceCrs 源坐标系
 * @param targetCrs 目标坐标系
 * @returns 适合示例面板直接展示的中文文本
 */
const formatDxfCrsText = (sourceCrs?: string, targetCrs?: string): string => {
  if (!sourceCrs || !targetCrs) {
    return "未完整配置 CRS，将按原坐标导出";
  }

  if (sourceCrs === targetCrs) {
    return `${sourceCrs}（无需转换）`;
  }

  return `${sourceCrs} -> ${targetCrs}`;
};

/**
 * 统一格式化 TrueColor 解析器状态文本。
 * @param resolver 任意解析器
 * @returns 适合示例面板直接展示的中文文本
 */
const formatDxfTrueColorResolverText = (resolver: unknown): string => {
  return typeof resolver === "function" ? "已配置" : "未配置";
};

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
 * 当前示例面板展示的 DXF 默认配置说明。
 * 这里直接读取插件 API 的 getResolvedOptions()，确保页面展示的是最终生效值，而不是手写猜测。
 */
const dxfResolvedOptionsText = computed(() => {
  const api = getMapDxfExportApi();
  if (!api) {
    return "DXF 导出插件尚未挂载到地图实例。地图初始化完成后，这里会显示 defaults 和业务层覆写后的最终配置。";
  }

  // 不传 overrides，读取的是“插件 defaults 最终落地后的默认导出配置”。
  const defaultOptions = api.getResolvedOptions();

  // 传入与按钮一致的 overrides，展示“业务层本次任务局部覆写后”的最终配置。
  const primaryOnlyOptions = api.getResolvedOptions(createPrimaryBusinessDxfOverrides());

  return [
    `插件默认导出：范围 = ${formatDxfSourceIdsText(defaultOptions.sourceIds)}；文件 = ${defaultOptions.fileName}；坐标转换 = ${formatDxfCrsText(defaultOptions.sourceCrs, defaultOptions.targetCrs)}。`,
    `默认颜色解析器：图层色 = ${formatDxfTrueColorResolverText(defaultOptions.layerTrueColorResolver)}；要素色 = ${formatDxfTrueColorResolverText(defaultOptions.featureTrueColorResolver)}。`,
    `业务层局部覆写后：范围 = ${formatDxfSourceIdsText(primaryOnlyOptions.sourceIds)}；文件 = ${primaryOnlyOptions.fileName}；图层名 = 按 sourceId + mark 生成；图层色 = ${formatDxfTrueColorResolverText(primaryOnlyOptions.layerTrueColorResolver)}；要素色 = ${formatDxfTrueColorResolverText(primaryOnlyOptions.featureTrueColorResolver)}。`,
  ].join("\n");
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
 * 根据最新的选中集变化上下文更新示例面板文案。
 * @param context 选中集变化上下文
 */
const syncSelectionPanelFromChange = (
  context: BusinessKit.MapLayerSelectionChangeContext,
): void => {
  // 将底层选中变化上下文转换为业务层更易消费的结构；集合字段与触发目标字段已分组。
  const selectionContext = featureQuery.toSelectionBusinessContext(context);
  const currentSelectionMode = context.selectionMode || selectionMode.value;
  const addedIdsText = formatValueList(getSelectionItemIds(selectionContext.added));
  const removedIdsText = formatValueList(getSelectionItemIds(selectionContext.removed));
  const circleLayerIdsText = formatValueList(
    getSelectionItemIds(
      selectionContext.selected.filter((selectedItem) => selectedItem.layerId === LAYER_IDS.circle),
    ),
  );

  /*
   * 旧写法 / 逃生出口：
   * const addedIdsText = formatValueList(context.getAddedFeatureIds());
   * const removedIdsText = formatValueList(context.getRemovedFeatureIds());
   * const circleLayerIdsText = formatValueList(
   *   context.getSelectedPropertyValues<string | number>("id", { layerId: LAYER_IDS.circle }),
   * );
   * 适合需要直接处理底层 context / 自定义状态结构时使用。
   */
  selectionPanelState.lastChangeSummary =
    `原因：${selectionContext.reason || "unknown"}；模式：${getSelectionModeText(currentSelectionMode)}；` +
    `当前 ${selectionContext.selectedCount} 个；新增 ${addedIdsText}；移除 ${removedIdsText}；` +
    `circleLayer 业务 ID：${circleLayerIdsText}`;
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
 * 当前页面 Popup 类型常量。
 * 用常量对象而不是散落字符串，方便模板与业务逻辑共用。
 */
const POPUP_TYPE = {
  point: "point",
  line: "line",
  terradraw: "terradraw",
} as const;

/** 当前页面支持的 Popup 类型。 */
type NgPopupType = (typeof POPUP_TYPE)[keyof typeof POPUP_TYPE];

/** Popup 统一基础载荷。 */
interface NgPopupBasePayload {
  type: NgPopupType;
  featureId: string | number | null;
  geometryType: string;
  featureProps: Record<string, any>;
}

/** 点弹窗载荷。 */
interface NgPointPopupPayload extends NgPopupBasePayload {
  type: typeof POPUP_TYPE.point;
}

/** 线弹窗载荷。 */
interface NgLinePopupPayload extends NgPopupBasePayload {
  type: typeof POPUP_TYPE.line;
  selectedSegmentIndex: number;
  selectedSegmentLengthMeters: number;
  lineLengthMeters: number;
}

/** TerraDraw 弹窗载荷。 */
interface NgTerradrawPopupPayload extends NgPopupBasePayload {
  type: typeof POPUP_TYPE.terradraw;
}

/** 当前页面 Popup 联合载荷。 */
type NgPopupPayload = NgPointPopupPayload | NgLinePopupPayload | NgTerradrawPopupPayload;

/**
 * 创建点要素弹窗载荷。
 * @param feature 当前点要素
 * @param featureId 当前要素 ID
 * @returns 点弹窗载荷
 */
const createPointPopupPayload = (
  feature: MapCommonFeature,
  featureId: string | number | null,
): NgPointPopupPayload => {
  return {
    type: POPUP_TYPE.point,
    featureId: featureId ?? getFeatureBusinessId(feature),
    geometryType: feature.geometry?.type || "",
    featureProps: clonePropertySnapshot(feature.properties || {}),
  };
};

/**
 * 创建线要素弹窗载荷。
 * 该 helper 会顺手补齐总长度和命中线段长度，业务层后续只消费结果即可。
 *
 * @param lineFeature 当前线要素
 * @param segmentIndex 当前线段索引；传负数表示当前未识别到具体线段
 * @returns 线弹窗载荷
 */
const createLinePopupPayload = (
  lineFeature: MapCommonLineFeature,
  segmentIndex: number,
): NgLinePopupPayload => {
  const normalizedCoordinates = MapLineExtensionTool.normalizeLineCoordinates(
    lineFeature.geometry.coordinates,
  );

  const lineLengthMeters =
    normalizedCoordinates.length >= 2
      ? MapLineMeasureTool.getCoordinatesLengthInMeters(normalizedCoordinates)
      : 0;

  if (normalizedCoordinates.length < 2) {
    return {
      type: POPUP_TYPE.line,
      featureId: getFeatureBusinessId(lineFeature),
      geometryType: lineFeature.geometry.type,
      featureProps: clonePropertySnapshot(lineFeature.properties || {}),
      selectedSegmentIndex: -1,
      selectedSegmentLengthMeters: 0,
      lineLengthMeters,
    };
  }

  const currentSegmentIndex =
    segmentIndex >= 0 ? Math.max(0, Math.min(segmentIndex, normalizedCoordinates.length - 2)) : -1;
  const selectedSegmentLengthMeters =
    currentSegmentIndex >= 0
      ? MapLineMeasureTool.getDistanceInMeters(
          normalizedCoordinates[currentSegmentIndex],
          normalizedCoordinates[currentSegmentIndex + 1],
        )
      : 0;

  return {
    type: POPUP_TYPE.line,
    featureId: getFeatureBusinessId(lineFeature),
    geometryType: lineFeature.geometry.type,
    featureProps: clonePropertySnapshot(lineFeature.properties || {}),
    selectedSegmentIndex: currentSegmentIndex,
    selectedSegmentLengthMeters,
    lineLengthMeters,
  };
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

/**
 * 当前是否为线弹窗。
 * 模板只关心“当前该显示哪一块内容”，不直接处理联合类型分支。
 */
const popupLinePayload = computed<NgLinePopupPayload | null>(() => {
  const currentPayload = popupPayload.value;
  return currentPayload?.type === POPUP_TYPE.line ? currentPayload : null;
});

/** 当前是否为点弹窗。 */
const popupPointPayload = computed<NgPointPopupPayload | null>(() => {
  const currentPayload = popupPayload.value;
  return currentPayload?.type === POPUP_TYPE.point ? currentPayload : null;
});

/** 当前是否为 TerraDraw 弹窗。 */
const popupTerradrawPayload = computed<NgTerradrawPopupPayload | null>(() => {
  const currentPayload = popupPayload.value;
  return currentPayload?.type === POPUP_TYPE.terradraw ? currentPayload : null;
});

/** 线弹窗是否开启。 */
const hasLinePopup = computed(() => popupLinePayload.value !== null);

/** 点弹窗是否开启。 */
const hasPointPopup = computed(() => popupPointPayload.value !== null);

/** TerraDraw 弹窗是否开启。 */
const hasTerradrawPopup = computed(() => popupTerradrawPayload.value !== null);

/** 线弹窗属性快照。 */
const popupLineFeatureProps = computed<Record<string, any>>(() => {
  return popupLinePayload.value?.featureProps || {};
});

/** 线弹窗总长度。 */
const popupLineLengthMeters = computed(() => {
  return popupLinePayload.value?.lineLengthMeters ?? 0;
});

/** 当前选中的线段索引。 */
const popupSelectedSegmentIndex = computed(() => {
  return popupLinePayload.value?.selectedSegmentIndex ?? -1;
});

/** 当前选中线段长度。 */
const popupSelectedSegmentLengthMeters = computed(() => {
  return popupLinePayload.value?.selectedSegmentLengthMeters ?? 0;
});

/** 点弹窗属性快照。 */
const popupPointFeatureProps = computed<Record<string, any>>(() => {
  return popupPointPayload.value?.featureProps || {};
});

/** TerraDraw 弹窗属性快照。 */
const popupTerradrawFeatureProps = computed<Record<string, any>>(() => {
  return popupTerradrawPayload.value?.featureProps || {};
});

/** TerraDraw 弹窗几何类型。 */
const popupTerradrawGeometryType = computed(() => {
  return popupTerradrawPayload.value?.geometryType || "";
});

/** TerraDraw 弹窗要素 ID 展示文本。 */
const popupTerradrawFeatureIdText = computed(() => {
  const currentPayload = popupTerradrawPayload.value;
  return currentPayload?.featureId ?? currentPayload?.featureProps.id ?? "无";
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

  if (currentPayload.type === POPUP_TYPE.line) {
    ElMessage.success(
      `查看线路详情：${String(currentPayload.featureProps.id || currentPayload.featureId)}`,
    );
    return;
  }

  if (currentPayload.type === POPUP_TYPE.point) {
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
  selectionPanelState.contextMenuSummary = "当前未展示选中集摘要";

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
    currentSelectionMode === "multiple" ? buildSelectionSummaryRows(currentSelectionMode) : [];
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
    summaryRows.length > 0
      ? buildSelectionSummaryText(summaryRows)
      : "单选右键现在只展示业务可见字段；系统隐藏字段请看调试快照";
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
    syncSelectionPanelFromChange(context);
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
      summary: selectionPanelState.lastChangeSummary,
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
  selectionPanelState.contextMenuSummary = "当前未展示选中集摘要";
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
  selectionPanelState.contextMenuSummary = "当前未展示选中集摘要";
  popup.open({
    lngLat: createPopupLngLat(context.lngLat),
    payload: {
      type: POPUP_TYPE.terradraw,
      featureId: (context.feature.id as string | number | null) ?? null,
      geometryType: context.feature.geometry?.type || "",
      featureProps: clonePropertySnapshot(context.feature.properties || {}),
    },
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
  selectionPanelState.contextMenuSummary =
    "TerraDraw 右键现在只展示业务可见字段；系统字段请在下方调试快照中查看";
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
</script>

<style scoped lang="scss">
.maplibre-area {
  // 地图容器宽度跟随页面收缩，但最大宽度仍保持示例阅读体验。
  width: 100%;
  max-width: 1500px;
  height: 800px;
  margin: 0 auto;
}

.demo-panel-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  width: 100%;
  max-width: 1500px;
  margin: 16px auto 0;
}

.demo-panel-card {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(31, 35, 41, 0.06);
}

.demo-panel-head {
  margin-bottom: 12px;
}

.demo-panel-head h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.demo-panel-head p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
}

.demo-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.demo-panel-kv-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-panel-kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  font-size: 13px;
  color: #606266;
  background: #f7f9fc;
  border-radius: 8px;
}

.demo-panel-kv strong {
  color: #303133;
  text-align: right;
}

.demo-panel-note,
.demo-panel-summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
}

.demo-panel-note {
  margin-top: 12px;
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
