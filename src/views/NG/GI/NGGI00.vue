<template>
    <!-- 需要一个地图容器，设置地图容器宽高 -->
    <div class="maplibre-area">
      <map-libre-init
        ref="mapInitRef"
        :mapOptions="mapOptions"
        :controls="mapControls"
        :mapInteractive="mapInteractive"
        :plugins="mapPlugins"
        @pluginStateChange="handlePluginStateChange"
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
            <ElButton style="background: white; width: 120px" @click="changeStyle"
              >改变图层样式</ElButton
            >
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton style="background: white; width: 120px" @click="changeFeatureStyle"
              >改变特定要素样式</ElButton
            >
          </mgl-custom-control>
          <mgl-custom-control position="top-right" :noClasses="false">
            <ElButton style="background: white; width: 120px" @click="toggleFlash"
              >切换要素闪烁</ElButton
            >
          </mgl-custom-control>
        </template>
        <template #dataSource>
          <!-- 这里给 source 加上 promoteId="id"，这非常重要！
               它的作用是把 properties 里的 'id' 字段提升为 Feature 顶层的原生 id，
               因为 Feature State 必须依赖顶层原生 id 才能工作。 -->
          <mgl-geo-json-source :sourceId="PRIMARY_SOURCE_ID" :data="test_geojson" promoteId="id">
            <!-- 1. 渲染点数据 (Point / MultiPoint) -->
            <!-- 过滤条件：几何类型必须是 Point，且属性(properties)中的 mark 字段必须等于 'hole' -->
            <mgl-circle-layer
              layer-id="circleLayer"
              :layout="circleLayout"
              :paint="circlePaint"
              :filter="['all', ['==', '$type', 'Point'], ['==', 'mark', 'hole']]"
            />
            <!-- 2. 渲染点数据 根据属性匹配 (多条件过滤示例) -->
            <!-- 过滤条件：几何类型必须是 Point，且属性(properties)中的 mark 字段必须等于 'dec' -->
            <mgl-circle-layer
              layer-id="circleLayerDec"
              :layout="circleLayout"
              :paint="circlePaint"
              :filter="['all', ['==', '$type', 'Point'], ['==', 'mark', 'dec']]"
            />
            <!-- 3. 渲染线数据 (LineString / MultiLineString) -->
            <mgl-line-layer
              :layer-id="PRIMARY_LINE_LAYER_ID"
              :layout="lineLayout"
              :paint="linePaint"
              :filter="['==', '$type', 'LineString']"
            />
            <!-- 4. 渲染面数据 (Polygon / MultiPolygon) -->
            <mgl-fill-layer
              layer-id="fillLayer"
              :layout="fillLayout"
              :paint="fillPaint"
              :filter="['==', '$type', 'Polygon']"
              :interactive="false"
            />
            <!-- 5. 渲染标签图层 (Symbol) -->
            <!-- 
              这里用点数据做演示，展示每个点的 id
            -->
            <mgl-symbol-layer
              layer-id="symbolLayer"
              :layout="symbolLayout"
              :paint="symbolPaint"
              :filter="['==', '$type', 'Point']"
            />
          </mgl-geo-json-source>
          <mgl-geo-json-source
            :sourceId="SECONDARY_SOURCE_ID"
            :data="test_geojson_secondary"
            promoteId="id"
          >
            <mgl-line-layer
              :layer-id="SECONDARY_LINE_LAYER_ID"
              :layout="lineLayout"
              :paint="linePaint"
              :filter="['==', '$type', 'LineString']"
            />
            <mgl-fill-layer
              :layer-id="SECONDARY_FILL_LAYER_ID"
              :layout="fillLayout"
              :paint="fillPaint"
              :filter="['==', '$type', 'Polygon']"
              :interactive="false"
            />
          </mgl-geo-json-source>
        </template>
      </map-libre-init>
    </div>
    <!-- 业务层示例面板：每一块只演示一种推荐写法，方便按功能阅读 -->
    <div class="demo-panel-board">
      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>当前选中态面板</h3>
          <p>直接使用 `useMapSelection(mapInitRef)` 驱动 UI。</p>
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
        <p class="demo-panel-summary">{{ selectionPanelState.lastChangeSummary }}</p>
      </section>

      <section class="demo-panel-card">
        <div class="demo-panel-head">
          <h3>多选右键摘要</h3>
          <p>右键时直接复用 helper，快速生成业务摘要。</p>
        </div>
        <p class="demo-panel-summary">{{ selectionPanelState.contextMenuSummary }}</p>
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
          <p>`pluginStateChange` 现在只保留给线草稿插件自身状态使用。</p>
        </div>
        <div class="demo-panel-kv-list">
          <div class="demo-panel-kv">
            <span>当前状态</span>
            <strong>{{ hasLineDraftFeatures ? '已有草稿' : '暂无草稿' }}</strong>
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
    </div>
    <!-- 引入自定义的 Vue Popup 组件 -->
    <mgl-popup
      v-model:visible="popupState.visible"
      :lngLat="popupState.lngLat"
      :options="{ closeButton: true, closeOnClick: true, maxWidth: '420px' }"
    >
      <!-- 动态判断内容：这个例子中使用了type属性来分辨要素 -->
      <div
        v-if="popupState.type === popupType.line"
        class="my-popup-container"
        style="min-width: 320px"
      >
        <h3 style="margin: 0 0 10px 0; color: #409eff">
          <el-icon><InfoFilled /></el-icon> 线操作
        </h3>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="编号">
            <el-tag size="small">{{ popupState.featureProps.id }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总长度">
            {{ popupState.lineLengthMeters.toFixed(2) }} m
          </el-descriptions-item>
          <el-descriptions-item label="选中线段">
            {{
              popupState.selectedSegmentIndex >= 0
                ? `第 ${popupState.selectedSegmentIndex + 1} 段`
                : '未识别'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="当前段长">
            {{ popupState.selectedSegmentLengthMeters.toFixed(2) }} m
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
      <div
        v-else-if="popupState.type === popupType.point"
        class="my-popup-container"
        style="min-width: 200px"
      >
        <h3 style="margin: 0 0 10px 0; color: #67c23a">
          <el-icon><Location /></el-icon> 站点信息
        </h3>
        <p><strong>名称：</strong> {{ popupState.featureProps.name || '未命名站点' }}</p>
        <p>
          <strong>状态：</strong>
          <el-tag
            :type="popupState.featureProps.status === 'normal' ? 'success' : 'danger'"
            size="small"
          >
            {{ popupState.featureProps.status === 'normal' ? '正常' : '异常' }}
          </el-tag>
        </p>
        <el-button type="success" size="small" style="width: 100%" @click="handlePopupAction">
          进入站点视图
        </el-button>
      </div>
      <div
        v-else-if="popupState.type === popupType.terradraw"
        class="my-popup-container"
        style="min-width: 260px"
      >
        <h3 style="margin: 0 0 10px 0; color: #e6a23c">
          <el-icon><InfoFilled /></el-icon> TerraDraw 要素
        </h3>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="要素 ID">
            <el-tag size="small">
              {{ popupState.featureId || popupState.featureProps.id || '无' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="几何类型">
            {{ popupState.geometryType || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="绘制模式">
            {{ popupState.featureProps.mode || '未知' }}
          </el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 10px">
          <div style="margin-bottom: 4px; font-weight: bold; color: #606266">属性快照</div>
          <pre class="terradraw-popup-json">{{
            JSON.stringify(popupState.featureProps, null, 2)
          }}</pre>
        </div>
      </div>
    </mgl-popup>
    <!-- 引入自定义的属性配置小窗口 -->
    <feature-property-editor
      v-model:visible="contextMenuState.visible"
      :position="contextMenuState.position"
      :properties="contextMenuState.properties"
      :summaryRows="contextMenuState.summaryRows"
      :forbiddenKeys="contextMenuState.targetType === 'map' ? [] : terraDrawReservedPropertyKeys"
      @save="handleSaveProperty"
    />
</template>

<script setup lang="ts">
/**
 * 引入地图初始化组件，作为地图页面的容器。
 */
import {
  MapLibreInit,
  MglPopup,
  TERRADRAW_RESERVED_PROPERTY_KEYS,
  createCircleLayerStyle,
  createFillLayerStyle,
  createLineLayerStyle,
  createSymbolLayerStyle,
  getSelectedFeatureIds,
  groupSelectedFeaturesByLayer,
  saveFeatureProperties,
  useMapEffect,
  useMapSelection,
  withFlashColor,
  type MapControlsConfig,
  type MapLayerInteractiveContext,
  type MapLayerInteractiveOptions,
  type MapLayerSelectedFeature,
  type MapLayerSelectionChangeContext,
  type MapLibreInitExpose,
  type MapSelectionLayerGroup,
  type MapSelectionMode,
  type MapPluginStateChangePayload,
  type TerradrawControlType,
  type TerradrawInteractiveContext,
  type TerradrawLineDecorationStyle,
} from 'vue-maplibre-kit';
import FeaturePropertyEditor from './components/FeaturePropertyEditor.vue';
import type { LngLatLike, MapOptions } from 'maplibre-gl';
import {
  useMap,
  MglGeoJsonSource,
  MglFillLayer,
  MglLineLayer,
  MglCircleLayer,
  MglSymbolLayer,
  MglCustomControl,
} from 'vue-maplibre-gl';
import { computed, ref, reactive, type Ref } from 'vue';
import mapGeojson from './mock/map.geojson';
import mapGeojson2 from './mock/map2.geojson';
import { ElButton, ElInputNumber, ElMessage } from 'element-plus';
import { InfoFilled, Location } from '@element-plus/icons-vue';
import {
  MapLineMeasureTool,
  MapLineCorridorTool,
  MapLineExtensionTool,
  createMapSourceFeatureRef,
  type MapCommonFeatureCollection,
  type MapCommonFeature,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from 'vue-maplibre-kit/geometry';
import {
  createLineDraftPreviewPlugin,
  LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
  type LineDraftPreviewPluginApi,
  type LineDraftPreviewStateChangePayload,
} from 'vue-maplibre-kit/plugins/line-draft-preview';
import {
  createMapFeatureMultiSelectPlugin,
} from 'vue-maplibre-kit/plugins/map-feature-multi-select';
import { createMapFeatureSnapPlugin } from 'vue-maplibre-kit/plugins/map-feature-snap';

/** 主业务 GeoJSON source ID */
const PRIMARY_SOURCE_ID = 'test_geojson_source';

/** 第二业务 GeoJSON source ID */
const SECONDARY_SOURCE_ID = 'test_geojson_source_secondary';

/** 主业务线图层 ID */
const PRIMARY_LINE_LAYER_ID = 'lineLayer';

/** 第二业务线图层 ID */
const SECONDARY_LINE_LAYER_ID = 'lineLayerSecondary';

/** 第二业务面图层 ID */
const SECONDARY_FILL_LAYER_ID = 'fillLayerSecondary';

import sendIcon from './assets/send.svg';
// import segment_stretch_test from './assets/segment-stretch.svg';
import texturelabsWater from './assets/Texturelabs_Water.jpg';

/**
 * 这里需要搞清楚两个概念：
 *
 * 1. 正式数据 (Business Data)
 *    就是你自己在这个 Vue 页面里定义的 GeoJSON 数据。
 *    例如我们在 template 里写的：
 *    - PRIMARY_SOURCE_ID
 *    - SECONDARY_SOURCE_ID
 *    这些数据是要保存到数据库里的，代表真实的业务结果。
 *
 * 2. 临时预览数据 (Preview Data)
 *    就是 mapLibre-init 组件内部帮你代管的临时图形数据。
 *    比如你点击了"创建线草稿"，地图上出现的那条虚线就是临时预览数据。
 *    你不需要在 template 里去写这些临时图层，插件会自动帮你渲染。
 *
 * 为什么要在代码里区分它们？
 * 因为有些操作会产生不同的结果：
 * - 如果你点击的是一条"正式线"，点"生成区域"，生成的面应该存到你的正式数据里。
 * - 如果你点击的是一条"临时虚线"，点"生成区域"，生成的面只是个预览，应该存到临时预览池里。
 * 只有区分清楚了，点击"取消临时操作"时，才能准确地把那些虚线和预览面一起清空，而不影响你的正式数据。
 */

// 正式业务数据源。
// 业务页面通常直接 import 各自的 GeoJSON / 接口返回数据，这里不再在页面内临时构造第二数据源。
const test_geojson = ref<MapCommonFeatureCollection>(mapGeojson as MapCommonFeatureCollection);
const test_geojson_secondary = ref<MapCommonFeatureCollection>(
  mapGeojson2 as MapCommonFeatureCollection
);

/**
 * 把页面里用到的 GeoJSON 数据源统一登记在这里。
 * 作用：当需要修改地图上的要素时（比如生成了新的区域面），通过这个表就能知道该更新哪个变量。
 */
const mapSourceGeoJsonRefMap: Record<string, Ref<MapCommonFeatureCollection>> = {
  [PRIMARY_SOURCE_ID]: test_geojson,
  [SECONDARY_SOURCE_ID]: test_geojson_secondary,
};

/**
 * 当前页面持有的地图组件公开实例。
 * 业务层所有地图能力都优先通过这个公开实例读取，不直接依赖容器内部实现。
 */
const mapInitRef = ref<MapLibreInitExpose | null>(null);

/**
 * ==========================
 * 插件注册区
 * ==========================
 */
const lineDraftPreviewPlugin = createLineDraftPreviewPlugin({
  // 是否启用线草稿预览。
  // 设为 true 后，地图容器会通过插件自动挂载内部草稿 source / layer。
  enabled: true,

  // 草稿线要“照着谁的交互行为来”。
  // 当前配置表示：草稿线和 PRIMARY_LINE_LAYER_ID 一样，都会按同一套 hover / click / 右键规则处理。
  inheritInteractiveFromLayerId: PRIMARY_LINE_LAYER_ID,

  // 业务层可选的临时图层样式局部覆写示例。
  // 这里只覆写当前页面关心的几项，其余样式继续使用 map-libre-init 的默认定义。
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
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#ff4d4f',
          '#fa8c16',
        ],

        // 线草稿宽度。
        // 这里略微调大，用于演示业务层如何只覆写单条样式。
        'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 5],

        // 线草稿虚线样式。
        // [实线段长度, 空白段长度]，用于强调“草稿态”而非正式业务线。
        'line-dasharray': [2, 1.2],
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
        'fill-color': '#fa8c16',

        // 线廊草稿透明度。
        // 透明度略低，避免遮挡底图与正式业务图层。
        'fill-opacity': 0.18,

        // 线廊草稿轮廓颜色。
        'fill-outline-color': '#ff7a00',
      },
    },
  },
});

/**
 * 要素多选插件配置示例。
 * 当前示例同时演示：
 * 1. `retain` 退出策略
 * 2. 通过 `excludeLayerIds` 排除整个图层
 * 3. 通过 `canSelect` 排除同图层中的特定业务要素
 */
// 初始化要素多选插件
const mapFeatureMultiSelectPlugin = createMapFeatureMultiSelectPlugin({
  // 是否启用多选插件，默认为 true
  enabled: true,
  // 插件控件在地图上的显示位置，可选值如 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  position: 'top-right',
  // 退出多选模式时的行为策略：'clear'（清空选中集） 或 'retain'（保留选中集）
  deactivateBehavior: 'retain',
  // 是否允许通过按下 Esc 快捷键退出多选模式，默认为 true
  closeOnEscape: true,
  // 不允许参与多选的图层 ID 集合，这里的 'circleLayerDec' 图层中的要素将无法被多选
  excludeLayerIds: ['circleLayerDec'],
  // 也可以通过 targetLayerIds: ['layer1', 'layer2'] 显式指定允许参与多选的图层 ID 集合
  
  // 自定义候选过滤函数，返回 true 表示允许选中，返回 false 表示禁止选中
  canSelect: ({ layerId, properties }) => {
    // 如果不是 'circleLayer' 图层，则允许选中
    if (layerId !== 'circleLayer') {
      return true;
    }

    // 对于 'circleLayer' 图层，拦截 id 为 'point_4' 的要素，使其无法被选中
    return properties?.id !== 'point_4';
  },
});

/**
 * 统一吸附扩展配置示例。
 * 业务层在这里仅声明：
 * 1. 哪些普通图层允许参与吸附
 * 2. 希望采用的吸附方式（顶点 / 线段）
 * 3. 局部吸附范围与优先级
 *
 * 吸附算法、预览图层、TerraDraw / Measure 对接全部由容器层统一封装处理。
 */
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
    pointColor: '#f56c6c',
    pointRadius: 6,
    lineColor: '#f56c6c',
    lineWidth: 4,
  },

  // 普通业务图层吸附规则。
  ordinaryLayers: {
    enabled: true,
    rules: [
      {
        // 主正式线图层：既允许吸附到顶点，也允许吸附到线段。
        id: 'primary-line-snap',
        layerIds: [PRIMARY_LINE_LAYER_ID],
        priority: 30,
        snapTo: ['vertex', 'segment'],
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
        id: 'secondary-line-snap',
        layerIds: [SECONDARY_LINE_LAYER_ID],
        priority: 20,
        snapTo: ['vertex', 'segment'],
      },
      {
        // 点图层示例：点要素只参与顶点吸附。
        id: 'point-hole-snap',
        layerIds: ['circleLayer', 'circleLayerDec'],
        priority: 10,
        snapTo: ['vertex'],
      },
      {
        // 特定条件要素示例：只允许吸附 mark === 'hole' 的点。
        // 用于演示“不是按点/线/面粗分，而是按具体业务条件筛选”的能力。
        id: 'point-hole-filtered-snap',
        layerIds: ['circleLayer', 'circleLayerDec'],
        priority: 40,
        tolerancePx: 20,
        geometryTypes: ['Point'],
        snapTo: ['vertex'],
        where: {
          mark: 'hole',
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
 * 当前页面注册到地图容器中的插件集合。
 * 业务层通过显式 import + 注册插件的方式启用能力，而不是继续给 map-libre-init 传专属 prop。
 */
const mapPlugins = [mapFeatureSnapPlugin, lineDraftPreviewPlugin, mapFeatureMultiSelectPlugin];

/**
 * 当前页面是否存在线草稿要素。
 * 该状态只用于驱动“清空临时草稿”按钮显隐，不再从业务主数据源反推。
 */
const hasLineDraftFeatures = ref(false);

/**
 * 根据 sourceId 找到对应的正式业务数据源。
 * @param sourceId 目标 source ID
 * @returns 对应的 GeoJSON 响应式引用；找不到时返回 null
 */
const getGeoJsonRefBySourceId = (
  sourceId: string | null | undefined
): Ref<MapCommonFeatureCollection> | null => {
  if (!sourceId) {
    return null;
  }

  return mapSourceGeoJsonRefMap[sourceId] || null;
};

/**
 * 读取当前页面注册的线草稿插件 API。
 * @returns 当前线草稿插件 API；插件未注册或地图未初始化时返回 null
 */
const getLineDraftPreviewApi = (): LineDraftPreviewPluginApi | null => {
  return (
    mapInitRef.value?.plugins?.getApi<LineDraftPreviewPluginApi>(lineDraftPreviewPlugin.id) || null
  );
};

/**
 * 获取 GeoJSON 要素的业务 ID。
 * @param feature 待提取业务 ID 的要素
 * @returns 业务 ID；不存在时返回 null
 */
const getFeatureBusinessId = (
  feature: MapCommonFeature | null | undefined
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
 * 判断当前要素是否为业务线要素。
 * @param feature 待判断的 GeoJSON 要素
 * @returns 是否为 LineString 要素
 */
const isDemoLineFeature = (
  feature: MapCommonFeature | null | undefined
): feature is MapCommonLineFeature => {
  return feature?.geometry?.type === 'LineString';
};

/**
 * 当前页面统一使用的要素查询门面。
 * 业务层只需要记住这里暴露的 5 个入口，不再到处拼 sourceId、featureId 和草稿来源判断。
 */
const featureQuery = {
  /**
   * 将上下文中的 sourceId 和 featureId 归一化为统一来源引用。
   * @param contextOrRefLike 任意包含 sourceId 与 featureId 的上下文对象
   * @returns 标准化后的来源引用
   */
  getFeatureRef: (
    contextOrRefLike:
      | Pick<MapLayerInteractiveContext, 'sourceId' | 'featureId'>
      | {
          sourceId?: string | null;
          featureId?: string | number | null;
        }
      | null
      | undefined
  ): MapSourceFeatureRef | null => {
    return createMapSourceFeatureRef(
      contextOrRefLike?.sourceId || null,
      contextOrRefLike?.featureId ?? null
    );
  },

  /**
   * 根据来源引用解析最新要素。
   * @param featureRef 目标来源引用
   * @returns 最新要素快照；找不到时返回 null
   */
  resolveFeature: (featureRef: MapSourceFeatureRef | null): MapCommonFeature | null => {
    if (!featureRef?.sourceId || featureRef.featureId === null) {
      return null;
    }

    if (featureRef.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID) {
      return getLineDraftPreviewApi()?.getFeatureById?.(featureRef.featureId) || null;
    }

    const featureCollection = getGeoJsonRefBySourceId(featureRef.sourceId)?.value || null;
    const currentFeatures = (featureCollection?.features || []) as MapCommonFeature[];
    return (
      currentFeatures.find((feature) => {
        return getFeatureBusinessId(feature) === featureRef.featureId;
      }) || null
    );
  },

  /**
   * 解析当前页面正在选中的最新要素。
   * @returns 当前选中要素；未选中时返回 null
   */
  resolveSelectedFeature: (): MapCommonFeature | null => {
    const selectedFeatureContext = mapInitRef.value?.getSelectedMapFeatureContext?.() || null;
    const selectedFeatureRef = featureQuery.getFeatureRef(selectedFeatureContext);
    return (
      featureQuery.resolveFeature(selectedFeatureRef) ||
      mapInitRef.value?.getSelectedMapFeatureSnapshot?.() ||
      null
    );
  },

  /**
   * 解析当前页面正在选中的线要素。
   * @returns 当前选中的线要素；不是线或未选中时返回 null
   */
  resolveSelectedLine: (): MapCommonLineFeature | null => {
    const selectedFeature = featureQuery.resolveSelectedFeature();
    return isDemoLineFeature(selectedFeature) ? selectedFeature : null;
  },

  /**
   * 将更新后的完整要素列表写回正式业务数据源。
   * @param sourceId 目标 source ID
   * @param nextFeatures 更新后的完整要素列表
   */
  commitMapFeatures: (sourceId: string, nextFeatures: MapCommonFeature[]): void => {
    const geoJsonRef = getGeoJsonRefBySourceId(sourceId);
    if (!geoJsonRef) {
      return;
    }

    const currentFeatureCollection = geoJsonRef.value as MapCommonFeatureCollection;
    geoJsonRef.value = {
      ...currentFeatureCollection,
      features: nextFeatures,
    } as MapCommonFeatureCollection;
  },
};

/** 右键摘要行。 */
interface SelectionSummaryRow {
  label: string;
  value: string;
}

/**
 * 当前页面的选择态展示文案。
 * 这里不再保存底层模式与数量，只保留示例面板里真正需要展示的摘要文本。
 */
const selectionPanelState = reactive({
  lastChangeSummary: '当前还没有发生选中集变化',
  contextMenuSummary: '当前未展示选中集摘要',
});

const {
  isActive: isSelectionActive,
  selectionMode,
  selectedCount,
  selectedFeatureIds,
  hasSelection,
  activate: activateSelection,
  deactivate: deactivateSelection,
  clear: clearSelection,
  getSelectedPropertyValues: getSelectionPropertyValues,
  groupSelectedFeaturesByLayer: getSelectionGroups,
} = useMapSelection(mapInitRef);

/**
 * 将选择模式转换为便于示例展示的中文文本。
 * @param mode 当前选择模式
 * @returns 中文模式文本
 */
const getSelectionModeText = (mode: MapSelectionMode): string => {
  return mode === 'multiple' ? '多选' : '单选';
};

/**
 * 将值列表格式化为易读文本。
 * @param values 需要展示的值列表
 * @returns 单行展示文本
 */
const formatValueList = (values: Array<string | number>): string => {
  return values.length > 0 ? values.map((value) => String(value)).join('、') : '无';
};

/**
 * 将按图层分组后的结果压缩成单行摘要。
 * @param layerGroups 图层分组结果
 * @returns 图层分布摘要文本
 */
const formatLayerDistribution = (layerGroups: MapSelectionLayerGroup[]): string => {
  if (layerGroups.length === 0) {
    return '无';
  }

  return layerGroups
    .map((layerGroup) => {
      return `${layerGroup.layerId || '未知图层'} x${layerGroup.features.length}`;
    })
    .join('，');
};

/**
 * 将当前选中集转换为右键面板摘要行。
 * @param selectedFeatures 当前选中集
 * @param currentSelectionMode 当前选择模式
 * @returns 适合直接传给属性面板的摘要行
 */
const buildSelectionSummaryRows = (
  selectedFeatures: MapLayerSelectedFeature[],
  currentSelectionMode: MapSelectionMode
): SelectionSummaryRow[] => {
  return [
    {
      label: '当前模式',
      value: getSelectionModeText(currentSelectionMode),
    },
    {
      label: '选中数量',
      value: `${selectedFeatures.length} 个`,
    },
    {
      label: '要素 ID',
      value: formatValueList(getSelectedFeatureIds(selectedFeatures)),
    },
    {
      label: '图层分布',
      value: formatLayerDistribution(groupSelectedFeaturesByLayer(selectedFeatures)),
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
    return '当前没有可展示的选中集摘要';
  }

  return summaryRows.map((summaryRow) => `${summaryRow.label}：${summaryRow.value}`).join(' | ');
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
 * 这里演示 useMapSelection 暴露的快捷属性提取方法。
 */
const selectedCircleLayerIdsText = computed(() => {
  return formatValueList(getSelectionPropertyValues<string | number>('id', { layerId: 'circleLayer' }));
});

/**
 * 当前完整选中集的要素 ID 摘要。
 * 这里直接复用 useMapSelection 已经暴露好的计算结果。
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
    return '当前没有选中要素。点右上角的多选按钮后，就可以直接用这个面板观察数量和操作入口。';
  }

  if (isSelectionActive.value) {
    return '现在 UI 直接绑定选择态门面，不再手动同步数量、选中集和清空/退出按钮。';
  }

  return '当前展示的是已有选中结果；如果要批量处理，可以先进入多选模式。';
});

/**
 * 当前线操作入口的说明文本。
 * 这里专门演示：业务层只调用 featureQuery.resolveSelectedLine() 取最新线要素。
 */
const selectedLineOperationText = computed(() => {
  const selectionSignature = selectedFeatureIds.value.join('|');
  const selectedLineFeature = featureQuery.resolveSelectedLine();

  if (!selectedLineFeature) {
    return selectionSignature
      ? '当前选中的不是线要素。请改为点选线，再去试“生成线廊”或“创建线草稿”。'
      : '当前未选中线要素。先点一条线，再去试“生成线廊”或“创建线草稿”。';
  }

  const featureId = getFeatureBusinessId(selectedLineFeature);
  const selectedFeatureRef = featureQuery.getFeatureRef(
    mapInitRef.value?.getSelectedMapFeatureContext?.() || null
  );
  const sourceText =
    selectedFeatureRef?.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID ? '线草稿源' : '正式业务源';

  return `当前线操作会读取 ${sourceText} 的最新线要素：${String(featureId ?? '未命名线')}`;
});

/**
 * 当前线草稿状态的说明文本。
 * 用来强调 pluginStateChange 只负责插件自身状态，而不是再同步多选态。
 */
const lineDraftStatusText = computed(() => {
  return hasLineDraftFeatures.value
    ? '线草稿插件当前已有临时结果；如果不需要，直接点击这里的“清空线草稿”即可。'
    : '当前没有线草稿。选中线并点击“创建线草稿”后，这里会自动刷新插件状态。';
});

/**
 * 根据最新的选中集变化上下文更新示例面板文案。
 * @param context 选中集变化上下文
 */
const syncSelectionPanelFromChange = (context: MapLayerSelectionChangeContext): void => {
  const currentSelectionMode = context.selectionMode || 'single';
  const addedIdsText = formatValueList(context.getAddedFeatureIds());
  const removedIdsText = formatValueList(context.getRemovedFeatureIds());
  const circleLayerIdsText = formatValueList(
    context.getSelectedPropertyValues<string | number>('id', { layerId: 'circleLayer' })
  );

  selectionPanelState.lastChangeSummary =
    `原因：${context.reason}；模式：${getSelectionModeText(currentSelectionMode)}；` +
    `当前 ${context.selectedCount} 个；新增 ${addedIdsText}；移除 ${removedIdsText}；` +
    `circleLayer 业务 ID：${circleLayerIdsText}`;
};

/**
 * 统一处理地图插件状态变更事件。
 * 当前页面只消费线草稿插件自身的状态变化。
 * @param payload 地图插件状态变更事件载荷
 */
const handlePluginStateChange = (payload: MapPluginStateChangePayload): void => {
  if (
    payload.pluginType !== LINE_DRAFT_PREVIEW_PLUGIN_TYPE ||
    payload.pluginId !== lineDraftPreviewPlugin.id
  ) {
    return;
  }

  const previewState = payload.state as LineDraftPreviewStateChangePayload;

  // 同时参考 hasFeatures 与 featureCount，
  // 是为了让页面态与容器层返回的数据保持一致，避免只依赖单个字段造成误判。
  hasLineDraftFeatures.value = previewState.hasFeatures && previewState.featureCount > 0;
  console.log('[NGGI00 示例] 线草稿插件状态变化', previewState);
};

/**
 * 将线弹窗中展示的线要素摘要同步为最新状态。
 * @param lineFeature 当前线要素
 * @param segmentIndex 当前选中的线段索引
 */
const syncLinePopupMetrics = (lineFeature: MapCommonLineFeature, segmentIndex: number): void => {
  const normalizedCoordinates = MapLineExtensionTool.normalizeLineCoordinates(
    lineFeature.geometry.coordinates
  );
  if (normalizedCoordinates.length < 2) {
    popupState.featureId = getFeatureBusinessId(lineFeature);
    popupState.geometryType = lineFeature.geometry.type;
    popupState.featureProps = JSON.parse(JSON.stringify(lineFeature.properties || {}));
    popupState.selectedSegmentIndex = -1;
    popupState.selectedSegmentLengthMeters = 0;
    popupState.lineLengthMeters = 0;
    return;
  }

  const currentSegmentIndex = Math.max(0, Math.min(segmentIndex, normalizedCoordinates.length - 2));

  popupState.featureId = getFeatureBusinessId(lineFeature);
  popupState.geometryType = lineFeature.geometry.type;
  popupState.featureProps = JSON.parse(JSON.stringify(lineFeature.properties || {}));
  popupState.selectedSegmentIndex = currentSegmentIndex;
  popupState.selectedSegmentLengthMeters = MapLineMeasureTool.getDistanceInMeters(
    normalizedCoordinates[currentSegmentIndex],
    normalizedCoordinates[currentSegmentIndex + 1]
  );
  popupState.lineLengthMeters =
    MapLineMeasureTool.getCoordinatesLengthInMeters(normalizedCoordinates);
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

  const featureId = getFeatureBusinessId(lineFeature) ?? '未命名线';
  console.log('[NGGI00 示例] 点击线后测得线总长度', {
    featureId,
    lineLengthMeters,
  });
  ElMessage.success(`示例：线 ${String(featureId)} 总长度为 ${lineLengthMeters.toFixed(2)} m`);
};

/**
 * 地图初始化配置
 * 注意：container 属性无需手动设置，vue-maplibre-gl 会自动挂载到组件实例上
 */
const mapOptions: Omit<MapOptions, 'container'> = {
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
 * 控件配置对象，以控件组件名为 key
 * isUse 属性控制是否渲染该控件 (默认为 false)，其他属性作为组件的 props 传入
 *
 * 这是一个完整的控件配置示例，展示了所有可用控件及其常用参数的配置方法。
 * 开发者可根据实际需求将不需要的控件的 isUse 设为 false，或删除该控件的配置块。
 */
const mapControls: MapControlsConfig = {
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
    position: 'bottom-left',
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
    position: 'top-left',
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
    // 绘图控件线装饰示例 (Segment Stretch 模式)
    // ==========================================
    // 适用场景：需要让一张 SVG 沿每个线段“从起点拉到终点”铺开显示。
    // 如果一条折线有多个拐点，则会按“相邻点 -> 相邻点”拆成多个独立的拉伸段。
    // 使用说明：
    // 1. 业务层只需要在这里声明 `lineDecoration` 配置即可，极简接入。
    // 2. 底层会自动把每条线拆成多个 segment-stretch 图层，并在缩放/平移时同步更新四角坐标。
    // 3. 如果传入的是 SVG，底层会先自动光栅化为 PNG，再交给 MapLibre 的 image source 渲染。
    // 4. 底层已自动处理 TerraDraw 的各种绘制和编辑事件同步。
    // 5. svg 属性支持：inline SVG 字符串、import 导入的静态资源 URL、data URI。
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
        mode: 'symbol-repeat',
        svg: sendIcon,
        spacing: 1,
        size: 0.2,
        opacity: 0.95,
        iconRotate: 0,
        keepUpright: true,
      } as TerradrawLineDecorationStyle,
    },

    // ==========================================
    // TerraDraw 业务交互封装示例
    // 说明：
    // 1. 下面这些回调全部由 mapLibre-init 内部统一接管并触发，屏蔽了原生事件的复杂性。
    // 2. 业务层只需要在这里声明需要响应的动作，即可获取规范化的 context 数据。
    // ==========================================
    interactive: {
      // 是否启用交互事件监听，设为 false 则完全不响应下面配置的回调
      enabled: true,

      // 鼠标移动到绘制要素上时光标的样式
      cursor: 'pointer',

      // 交互管理器准备完成时触发，适合做初始化日志或状态检查
      onReady: () => {
        console.log('[TerraDraw 示例] 业务交互管理器已初始化完成');
      },

      // 绘图模式发生切换时触发（如从画点切换到画线），适合同步更新外部 UI 状态
      onModeChange: (context) => {
        console.log(`[TerraDraw 示例] 当前模式切换为: ${context.mode}`);
      },

      // 某个要素完成绘制（或编辑结束）时触发，适合在这里执行保存到后端或计算逻辑
      onFeatureFinish: (context) => {
        console.log(
          '[TerraDraw 示例] 要素完成绘制/编辑:',
          context.featureId,
          context.finishContext
        );
      },

      // 要素形状或属性发生任何变化时触发，可用于实时同步数据
      onFeatureChange: (context) => {
        console.log('[TerraDraw 示例] 要素发生变化:', context.featureIds, context.changeType);
      },

      // 在 select 模式下，要素被选中时触发，适合联动显示右侧属性面板
      onFeatureSelect: (context) => {
        console.log('[TerraDraw 示例] 要素被选中:', context.featureId);
      },

      // 要素取消选中时触发，适合清空关联的属性面板
      onFeatureDeselect: (context) => {
        console.log('[TerraDraw 示例] 要素取消选中:', context.featureId);
      },

      // 要素被删除时触发，context.deletedIds 包含所有被删要素的 ID，适合在这里向后端发送删除请求
      onFeatureDelete: (context) => {
        console.log('[TerraDraw 示例] 要素被删除:', context.deletedIds);
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
        console.log('[TerraDraw 示例] 双击要素:', context.featureId);
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

  // 测量控件：提供测距、测面积等功能
  MaplibreMeasureControl: {
    isUse: true,
    position: 'top-left',
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
        mode: 'line-pattern',
        svg: texturelabsWater, // 推荐使用可以无缝首尾相接的 SVG 资源
        lineWidth: 20, // 纹理线段的宽度（这决定了图片平铺时的拉伸高度）
        opacity: 0.85, // 纹理线段的透明度
      } as TerradrawLineDecorationStyle,
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
      cursor: 'pointer',

      // 交互管理器准备完成时触发。
      // 适合在业务层做初始化日志、默认状态同步或首屏数据检查。
      onReady: (context) => {
        console.log('[Measure 示例] 业务交互管理器已初始化:', context.controlType);
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
          '[Measure 示例] 测量完成:',
          context.featureId,
          getMeasureFeatureSummaryText(context)
        );
      },

      // 测量要素几何或属性变化时触发。
      // 拖拽编辑节点、移动测量要素、业务层调用 updateFeatureProperties 后都会走这里。
      onFeatureChange: (context) => {
        console.log(
          '[Measure 示例] 测量要素发生变化:',
          context.featureIds,
          context.changeType,
          getMeasureFeatureSummaryText(context)
        );
      },

      // select 模式下选中某个测量要素时触发。
      // 可用于同步右侧属性面板、结果表格选中行等业务状态。
      onFeatureSelect: (context) => {
        console.log('[Measure 示例] 选中了测量要素:', context.featureId);
      },

      // select 模式下取消选中测量要素时触发。
      // 可用于清空详情面板或恢复默认提示。
      onFeatureDeselect: (context) => {
        console.log('[Measure 示例] 取消选中测量要素:', context.featureId);
      },

      // 删除一个或多个测量要素后触发。
      // context.deletedIds 中可拿到本次删除的全部 ID。
      onFeatureDelete: (context) => {
        console.log('[Measure 示例] 删除了测量要素:', context.deletedIds);
        closeBusinessPanels();
      },

      // render 模式下鼠标首次移入测量要素时触发。
      // 适合联动 tooltip、高亮关联表格行、状态栏摘要等。
      onHoverEnter: (context) => {
        console.log(
          `[Measure 示例] 鼠标移入测量要素: ${context.featureId}`,
          getMeasureFeatureSummaryText(context)
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
        console.log('[Measure 示例] 双击测量要素:', context.featureId);
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

// 获得地图实例。如果只有一个地图实例，无需指定 mapKey，
// 如果有多个地图实例，需要指定 mapKey，使用useMap(mapKey)获取对应的地图实例
const map = useMap();

/**
 * 获取绘图控件当前快照。
 * 现已改为优先走 mapLibre-init 暴露的业务化方法，业务页无需再感知 TerraDraw 实例。
 */
const getDrawnData = () => {
  if (!mapInitRef.value) return;

  // getDrawFeatures():
  // 1. null 代表绘图控件尚未初始化或未启用
  // 2. [] 代表绘图控件可用，但当前没有已绘制要素
  // 3. 非空数组即 TerraDraw 当前快照
  const features = mapInitRef.value.getDrawFeatures?.();

  if (features === null) {
    ElMessage.warning('绘图控件尚未初始化或未启用');
    return;
  }

  if (features.length === 0) {
    ElMessage.info('当前没有绘制任何图形');
    return;
  }

  // 将数据打印到控制台，这里的数据可以直接转成 JSON 字符串发送给后端
  console.log('--- 绘制的 GeoJSON 数据 ---');
  console.log(JSON.stringify(features, null, 2));
  ElMessage.success(`成功获取 ${features.length} 个图形数据，请查看控制台`);
};

/**
 * 获取测量控件当前快照。
 * 与绘图控件保持同一套使用方式，业务页不再需要自己访问 TerraDraw 实例。
 */
const getMeasureData = () => {
  if (!mapInitRef.value) return;

  const features = mapInitRef.value.getMeasureFeatures?.();

  if (features === null) {
    ElMessage.warning('测量控件尚未初始化或未启用');
    return;
  }

  if (features.length === 0) {
    ElMessage.info('当前没有测量任何图形');
    return;
  }

  console.log('--- 测量的 GeoJSON 数据 ---');
  console.log(JSON.stringify(features, null, 2));

  // 4. 演示如何提取其中的测量值
  features.forEach((f: any) => {
    if (f.geometry.type === 'LineString' && f.properties?.distance !== undefined) {
      console.log(`[线段测距] 距离: ${f.properties.distance} ${f.properties.distanceUnit}`);
    } else if (f.geometry.type === 'Polygon' && f.properties?.area !== undefined) {
      console.log(`[多边形测面积] 面积: ${f.properties.area} ${f.properties.unit}`);
    } else if (f.geometry.type === 'Polygon' && f.properties?.radiusKilometers !== undefined) {
      console.log(`[圆测半径] 半径: ${f.properties.radiusKilometers} km`);
    }
  });

  ElMessage.success(`成功获取 ${features.length} 个测量图形数据，请查看控制台`);
};

// ==========================================
// 图层样式配置实例 (Layer Configurations)
// ==========================================

/**
 * 1. 面图层 (Fill Layer) 样式配置
 * 用于渲染 Polygon / MultiPolygon 数据
 */
const { layout: fillLayout, paint: fillPaint } = createFillLayerStyle();

/**
 * 2. 线图层 (Line Layer) 样式配置
 * 用于渲染 LineString / MultiLineString 数据
 *
 * 这里演示“业务层局部覆写公共样式”的典型写法：
 * 1. line-color 使用 MapLibre 表达式，根据 hover 状态、业务属性等动态返回颜色。
 * 2. 外层再包一层 withFlashColor，用于接入 useMapEffect 的闪烁能力。
 *
 * line-color 当前规则说明：
 * 1. 如果 feature-state.hover === true，则当前线要素显示为绿色 `#00ff00`
 * 2. 否则如果当前要素 properties.id === 'line_1'，则显示为红色 `#ff0000`
 * 3. 否则显示为默认蓝色 `#0000ff`
 * 4. 如果当前要素被 startFlash('sourceId', featureId) 标记为闪烁，则最终颜色会被切换为黄色 `#ffff00`
 */
const { layout: lineLayout, paint: linePaint } = createLineLayerStyle({
  paint: {
    'line-color': withFlashColor(
      [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f97316',
        ['boolean', ['feature-state', 'hover'], false],
        '#00ff00',
        ['==', ['get', 'id'], 'line_1'],
        '#ff0000',
        '#0000ff',
      ],
      '#ffff00'
    ),
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      7,
      ['boolean', ['feature-state', 'hover'], false],
      6,
      3,
    ],
  },
});

/**
 * 3. 点图层 (Circle Layer) 样式配置
 * 用于渲染 Point / MultiPoint 数据
 *
 * 这里演示点图层最常见的两类业务效果：
 * 1. circle-color: 点本体颜色支持闪烁
 * 2. circle-stroke-color: 点边框颜色支持闪烁
 *
 * withFlashColor(正常颜色, 闪烁颜色) 的含义：
 * 1. 平时显示第一个参数指定的颜色
 * 2. 当业务层调用 startFlash('sourceId', featureId) 后，颜色会在运行时切换为第二个参数
 *
 * 如果后续需要 hover 效果，也可以参考线图层写法，把第一个参数改成 MapLibre 表达式，例如：
 * ['case', ['boolean', ['feature-state', 'hover'], false], '#00ff00', '#0000ff']
 */
const { layout: circleLayout, paint: circlePaint } = createCircleLayerStyle({
  paint: {
    'circle-color': withFlashColor(
      [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f97316',
        ['boolean', ['feature-state', 'hover'], false],
        '#22c55e',
        '#0000ff',
      ],
      '#ff0000'
    ),
    'circle-stroke-color': withFlashColor(
      [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#7c2d12',
        '#ffffff',
      ],
      '#ffff00'
    ),
    'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 8, 6],
    'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 2],
  },
});

/**
 * 4. 标签图层 (Symbol Layer) 样式配置
 * 用于渲染图标(Icon)和文字(Text)
 */
const { layout: symbolLayout, paint: symbolPaint } = createSymbolLayerStyle();

/**
 * 自定义控件点击事件：改变图层样式示例
 */
const changeStyle = () => {
  if (!map.isLoaded || !map.map) return;
  // vue-maplibre-gl 的 paint 和 layout 属性不支持响应式，需通过地图原生 API 修改

  // 1. 修改 Circle Layer 的 Paint 属性 (改变圆点颜色为绿色)
  map.map.setPaintProperty('circleLayer', 'circle-color', '#00ff00');

  // 2. 修改 Circle Layer 的 Paint 属性 (改变圆点半径变大)
  map.map.setPaintProperty('circleLayer', 'circle-radius', 12);

  // 3. 修改 Line Layer 的 Paint 属性 (改变线宽和线透明度)
  map.map.setPaintProperty('lineLayer', 'line-width', 6);
  map.map.setPaintProperty('lineLayer', 'line-opacity', 1);

  // 4. 修改 Fill Layer 的 Layout 属性 (隐藏面图层)
  // 注意：显隐控制 (visibility) 属于 layout 属性
  // 取值范围为 'visible' (可见) 或 'none' (隐藏)
  const currentVisibility = map.map.getLayoutProperty('fillLayer', 'visibility');
  const newVisibility = currentVisibility === 'none' ? 'visible' : 'none';
  map.map.setLayoutProperty('fillLayer', 'visibility', newVisibility);
};

/**
 * 自定义控件点击事件：改变特定要素样式示例
 */
const changeFeatureStyle = () => {
  if (!map.isLoaded || !map.map) return;

  // 使用 setPaintProperty 动态更新整个 fill-color 的表达式
  // 将 id 为 fill_1 的要素颜色修改为显眼的紫色 (#ff00ff)
  map.map.setPaintProperty('fillLayer', 'fill-color', [
    'case',
    ['==', ['get', 'id'], 'fill_1'],
    '#ff00ff', // 改变特定 id 要素的颜色
    '#888888', // 其他要素保持默认颜色
  ]);
};

// ==========================================
// 闪烁特效逻辑示例
// ==========================================
// startFlash 和 stopFlash 方法，用于控制地图要素的闪烁特效
// 闪烁频率默认500ms，可以通过第二个参数 intervalMs 来调整闪烁速度 例：useMapEffect(map, 1000)
const { startFlash, stopFlash } = useMapEffect(map);
let isFlashing = false;

const toggleFlash = () => {
  isFlashing = !isFlashing;
  // 假设需要闪烁的数据源为 test_geojson_source，要素原生 ID 为 'point_1'、'point_2' 和 'line_1'
  if (isFlashing) {
    startFlash('test_geojson_source', 'point_1');
    startFlash('test_geojson_source', 'point_2');
    startFlash('test_geojson_source', 'line_1');
    ElMessage.success('已开启 point_1, point_2 和 line_1 闪烁');
  } else {
    stopFlash('test_geojson_source', 'point_1');
    stopFlash('test_geojson_source', 'point_2');
    stopFlash('test_geojson_source', 'line_1');
    ElMessage.warning('已停止闪烁');
  }
};

// ==========================================
// 响应式 Popup 状态管理
// ==========================================

// 定义 Popup 类型枚举
enum popupType {
  point = 'point',
  line = 'line',
  terradraw = 'terradraw',
}
const popupState = reactive({
  visible: false,
  lngLat: [0, 0] as LngLatLike,
  featureProps: {} as any,
  type: '' as popupType | '', // 新增字段：用于标识当前点击的是什么类型的要素
  featureId: null as string | number | null,
  geometryType: '',
  selectedSegmentIndex: -1,
  selectedSegmentLengthMeters: 0,
  lineLengthMeters: 0,
});

const lineActionForm = reactive({
  widthMeters: 10,
  extendLengthMeters: 20,
});

/**
 * 处理弹窗中的业务按钮点击动作。
 */
const handlePopupAction = () => {
  const msgMap = {
    [popupType.line]: `查看线路详情：${popupState.featureProps.id}`,
    [popupType.point]: `进入站点：${popupState.featureProps.name}`,
    [popupType.terradraw]: `查看 TerraDraw 要素：${popupState.featureId || popupState.featureProps.id}`,
  };
  const msg = msgMap[popupState.type as popupType] || '未定义的弹窗动作';
  ElMessage.success(msg);
};

/**
 * 统一清空当前页面中的全部线草稿及其派生要素。
 */
const handleClearLineDraftFeatures = (): void => {
  if (!hasLineDraftFeatures.value) {
    ElMessage.info('当前没有可清理的线草稿');
    return;
  }

  getLineDraftPreviewApi()?.clear?.();
  closeBusinessPanels();
  ElMessage.success('已清空全部线草稿');
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
  const selectedFeatureContext = mapInitRef.value?.getSelectedMapFeatureContext?.() || null;
  const lineDraftPreviewApi = getLineDraftPreviewApi();
  if (!selectedLineFeature) {
    ElMessage.warning('当前未选中可操作的线要素');
    return;
  }

  if (lineActionForm.widthMeters <= 0) {
    ElMessage.warning('请输入大于 0 的区域宽度');
    return;
  }

  if (lineDraftPreviewApi?.isSelectedFeature?.()) {
    // 当前选中的是线草稿时，线廊也应该进入插件内部草稿源，
    // 这样“清空临时草稿”才能一次性清掉整套临时结果。
    const success = lineDraftPreviewApi.replacePreviewRegion?.({
      lineFeature: selectedLineFeature,
      widthMeters: lineActionForm.widthMeters,
    });

    if (!success) {
      ElMessage.warning('区域生成失败，请检查线要素几何是否有效');
      return;
    }

    syncLinePopupMetrics(selectedLineFeature, popupState.selectedSegmentIndex);
    ElMessage.success('已按当前宽度替换线廊草稿');
    return;
  }

  if (!selectedFeatureContext?.sourceId) {
    ElMessage.warning('当前正式线要素缺少来源数据源，无法生成区域');
    return;
  }

  const currentFeatures = (
    getGeoJsonRefBySourceId(selectedFeatureContext.sourceId)?.value?.features || []
  ) as MapCommonFeature[];
  const nextFeatures = MapLineCorridorTool.replaceRegionFeatures(
    currentFeatures,
    selectedLineFeature,
    lineActionForm.widthMeters
  );
  if (!nextFeatures) {
    ElMessage.warning('区域生成失败，请检查线要素几何是否有效');
    return;
  }

  featureQuery.commitMapFeatures(selectedFeatureContext.sourceId, nextFeatures);
  syncLinePopupMetrics(selectedLineFeature, popupState.selectedSegmentIndex);
  ElMessage.success('已按当前宽度替换生成区域');
};

/**
 * 点击【创建线草稿】按钮时的处理逻辑。
 * 这个方法不会直接修改你的"正式数据"。
 * 它只是告诉插件："我要在这条线的这个位置，按这个方向延长这么多米"。
 * 然后插件会自动在地图上画出一条【线草稿】（虚线）。
 */
const handleCreateLineDraft = (): void => {
  const selectedLineFeature = featureQuery.resolveSelectedLine();
  const lineDraftPreviewApi = getLineDraftPreviewApi();
  if (!selectedLineFeature) {
    ElMessage.warning('当前未选中可操作的线要素');
    return;
  }

  if (lineActionForm.extendLengthMeters <= 0) {
    ElMessage.warning('请输入大于 0 的延长长度');
    return;
  }

  // 告诉插件：生成一条临时线草稿。
  // 旧草稿怎么清理、多数据源怎么隔离，这些工作都由插件内部负责。
  const nextLineFeature = lineDraftPreviewApi?.previewLine?.({
    lineFeature: selectedLineFeature,
    segmentIndex: popupState.selectedSegmentIndex,
    extendLengthMeters: lineActionForm.extendLengthMeters,
  });

  if (!nextLineFeature) {
    ElMessage.warning('当前线段无法继续延长');
    return;
  }

  syncLinePopupMetrics(nextLineFeature, 0);
  ElMessage.success('已生成线草稿，可继续编辑或清理');
};

/**
 * 这个方法在点击普通要素时触发。
 * 它会在地图上弹出一个气泡框(Popup)，显示这条线的详情。
 * 并且，它会顺便计算出【你刚才点击的是这条线的第几段】，
 * 这个"第几段"的数据会被后面的【创建线草稿】和【生成线廊】直接使用。
 * @param context 点击事件传过来的数据
 */
const openMapFeaturePopup = (context: MapLayerInteractiveContext) => {
  if (!context.feature || !context.lngLat) return;

  contextMenuState.visible = false;
  contextMenuState.summaryRows = [];
  selectionPanelState.contextMenuSummary = '当前未展示选中集摘要';
  popupState.type =
    context.feature.geometry?.type === 'LineString' ? popupType.line : popupType.point;
  popupState.geometryType = context.feature.geometry?.type || '';
  popupState.lngLat = [context.lngLat.lng, context.lngLat.lat];
  popupState.visible = true;

  if (context.feature.geometry?.type === 'LineString') {
    // 注意：
    // 这里优先使用 context.lngLat，而不是直接使用原始鼠标坐标。
    // 一旦当前点击命中了吸附结果，lngLat 已经是“吸附后的有效坐标”，
    // 这样后续线段识别、弹窗摘要、线草稿生成等业务计算就都会自动跟随吸附点工作。
    const lineInteractionSnapshot = MapLineExtensionTool.resolveLineInteractionSnapshot({
      feature: context.feature as unknown as MapCommonFeature,
      featureRef: featureQuery.getFeatureRef(context),
      lngLat: context.lngLat,
      resolveLatestFeature: featureQuery.resolveFeature,
    });

    if (!lineInteractionSnapshot) {
      popupState.featureId = context.featureId;
      popupState.featureProps = JSON.parse(JSON.stringify(context.feature.properties || {}));
      popupState.selectedSegmentIndex = -1;
      popupState.selectedSegmentLengthMeters = 0;
      popupState.lineLengthMeters = 0;
      return;
    }

    syncLinePopupMetrics(
      lineInteractionSnapshot.lineFeature,
      lineInteractionSnapshot.segmentSelection?.index ?? 0
    );
    showClickedLineMeasureExample(lineInteractionSnapshot.lineFeature);
    return;
  }

  popupState.featureId = context.featureId;
  popupState.featureProps = JSON.parse(JSON.stringify(context.feature.properties || {}));
  popupState.selectedSegmentIndex = -1;
  popupState.selectedSegmentLengthMeters = 0;
  popupState.lineLengthMeters = 0;
};

/**
 * 打开普通 GeoJSON 图层要素右键属性配置窗口。
 * 该示例用于演示普通图层如何复用统一的 FeaturePropertyEditor。
 * @param context 普通图层统一交互上下文
 */
const openMapFeatureContextMenu = (context: MapLayerInteractiveContext) => {
  if (!context.feature || !context.point || !context.originalEvent) return;

  context.originalEvent.preventDefault();
  popupState.visible = false;
  const summaryRows =
    context.selectionMode === 'multiple'
      ? buildSelectionSummaryRows(context.selectedFeatures || [], context.selectionMode)
      : [];

  contextMenuState.position = { x: context.point.x, y: context.point.y };
  contextMenuState.properties = JSON.parse(JSON.stringify(context.feature.properties || {}));
  contextMenuState.summaryRows = summaryRows;
  contextMenuState.featureId = context.featureId;
  contextMenuState.targetType = 'map';
  contextMenuState.sourceId = context.sourceId || '';
  contextMenuState.layerId = context.layerId || '';
  contextMenuState.isLineDraftFeature =
    getLineDraftPreviewApi()?.isFeatureById?.(context.featureId) || false;
  contextMenuState.controlType = '';
  contextMenuState.visible = true;
  selectionPanelState.contextMenuSummary =
    summaryRows.length > 0 ? buildSelectionSummaryText(summaryRows) : '单选右键仅展示当前要素属性';
};

/**
 * 统一输出普通图层交互调试日志。
 * @param label 日志标题
 * @param context 普通图层统一交互上下文
 */
const logMapInteractiveEvent = (label: string, context: MapLayerInteractiveContext) => {
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
 * 普通图层业务交互配置。
 * 由 map-libre-init 内部托管 useMapInteractive 的实例化和销毁。
 *
 * 可用顶层属性：
 * 1. enabled: 是否启用普通图层交互封装，默认 true。
 * 2. onReady: 交互管理器初始化完成时触发，适合做首屏日志、默认状态检查。
 * 3. onHoverEnter / onHoverLeave: 鼠标进入或离开任意已声明图层要素时触发。
 * 4. onClick / onDoubleClick / onContextMenu: 地图统一事件入口；命中要素时会附带命中上下文。
 * 5. onBlankClick: 单击地图空白区域时触发，适合统一关闭 popup / 面板 / 摘要浮层。
 * 6. layers: 参与交互的图层配置集合，可选；key 必须是业务图层的 layer-id。
 *
 * 单图层可用属性：
 * 1. cursor: 鼠标命中该图层要素时的光标样式，默认 'pointer'，传 false 则不处理光标。
 * 2. enableFeatureStateHover: 是否自动维护 feature-state.hover，默认 true。
 * 3. onHoverEnter: 鼠标首次移入要素时触发。
 * 4. onHoverLeave: 鼠标移出当前要素时触发。
 * 5. onClick: 单击命中要素时触发。
 * 6. onDoubleClick: 双击命中要素时触发。
 * 7. onContextMenu: 右键命中要素时触发。
 *
 * 所有回调拿到的 context 都包含以下常用字段：
 * 1. feature: 当前命中的完整 MapLibre 要素。
 * 2. featureId: 当前要素顶层原生 ID；如果 source 配了 promoteId，一般就是业务 id。
 * 3. eventType: 当前交互事件类型，如 click / blankclick / hoverenter 等。
 * 4. layerId: 当前命中的业务图层 ID。
 * 5. sourceId: 当前命中的数据源 ID。
 * 6. sourceLayer: 当前命中的矢量 source-layer；GeoJSON 数据源通常为 null。
 * 7. map: 当前 MapLibre 地图实例。
 * 8. point: 鼠标事件对应的屏幕像素坐标。
 * 9. lngLat: 鼠标事件对应的经纬度坐标。
 * 10. originalEvent: 原始 DOM 鼠标事件，可用于 preventDefault() 等操作。
 */
const mapInteractive: MapLayerInteractiveOptions = {
  // 是否启用普通图层交互封装。
  // 设为 false 时，map-libre-init 不会为普通业务图层挂载任何交互事件。
  enabled: true,

  // 普通图层交互管理器初始化完成时触发。
  // 适合做首屏联调日志、默认状态同步或图层可用性检查。
  onReady: (context: MapLayerInteractiveContext) => {
    console.log('[Map 图层示例] 初始化完成，可直接使用普通图层交互能力', context.map);
  },

  // 普通图层统一 hover 入口。
  // 所有已声明图层的悬浮逻辑都可以先在这里做公共处理。
  onHoverEnter: (context: MapLayerInteractiveContext) => {
    logMapInteractiveEvent('顶层鼠标移入要素', context);
  },

  // 普通图层统一 hover leave 入口。
  // 适合统一清理 tooltip、状态栏摘要等公共 UI。
  onHoverLeave: (context: MapLayerInteractiveContext) => {
    logMapInteractiveEvent('顶层鼠标移出要素', context);
  },

  // 普通图层统一 click 入口。
  // 点击地图一定会触发；若命中已声明图层要素，则会附带 feature / layerId 等信息。
  onClick: (context: MapLayerInteractiveContext) => {
    logMapInteractiveEvent('顶层单击地图', context);

    if (!context.feature) {
      return;
    }

    openMapFeaturePopup(context);
  },

  // 普通图层选中集变化入口。
  // 业务层可在这里统一处理多图层批量选择，而不需要分别给每个 layer 写回调。
  onSelectionChange: (context: MapLayerSelectionChangeContext) => {
    syncSelectionPanelFromChange(context);
    console.log('[NGGI00 示例] 选中集变化示例', {
      reason: context.reason,
      selectionMode: context.selectionMode,
      selectedCount: context.selectedCount,
      addedFeatureIds: context.getAddedFeatureIds(),
      removedFeatureIds: context.getRemovedFeatureIds(),
      circleLayerIds: context.getSelectedPropertyValues<string | number>('id', {
        layerId: 'circleLayer',
      }),
      summary: selectionPanelState.lastChangeSummary,
    });
  },

  // 普通图层统一 double click 入口。
  // 适合做 flyTo、进入详情页、切换侧边栏等通用行为。
  onDoubleClick: (context: MapLayerInteractiveContext) => {
    logMapInteractiveEvent('顶层双击地图', context);

    if (context.selectionMode === 'multiple') {
      console.log('[NGGI00 示例] 多选模式下双击事件由业务层自行分发', {
        selectedCount: context.selectedCount,
        featureId: context.featureId,
      });
      return;
    }

    console.log('[NGGI00 示例] 单选模式下双击事件示例逻辑', {
      featureId: context.featureId,
    });
  },

  // 普通图层统一右键入口。
  // 命中要素时可以直接在这里打开公共右键菜单。
  onContextMenu: (context: MapLayerInteractiveContext) => {
    logMapInteractiveEvent('顶层右键地图', context);

    if (!context.feature) {
      return;
    }

    if (context.selectionMode === 'multiple') {
      console.log('[NGGI00 示例] 多选模式右键摘要', {
        selectedCount: context.selectedCount,
        selectedFeatures: context.selectedFeatures,
      });
    }

    openMapFeatureContextMenu(context);
  },

  // 单击地图空白区域时触发。
  // 常见用途：关闭 popup、右键菜单、悬浮信息卡片等业务 UI。
  onBlankClick: (context: MapLayerInteractiveContext) => {
    console.log('[Map 图层示例] 点击了空白区域', context.point, context.lngLat);
    closeBusinessPanels();
  },

  // 参与交互的图层集合。
  // key 必须与模板里实际声明的 layer-id 完全一致。
  // 多个图层同时命中时，会按这里的声明顺序决定优先级。
  layers: {
    // 点图层示例：圆点图层一。
    // 这里演示“纯统一事件模式”：仅声明图层参与交互与 hover 样式，
    // 实际 hover / click / contextmenu 逻辑全部交给顶层统一事件处理。
    circleLayer: {
      // 鼠标命中当前图层要素时的光标。
      cursor: 'pointer',

      // 是否自动维护 feature-state.hover。
      // 设为 true 后，业务层只管写样式表达式，不需要手动 setFeatureState。
      enableFeatureStateHover: true,
    },

    // 点图层示例：圆点图层二。
    // 继续复用顶层统一事件，不再为单个 layer 重复绑定相同回调。
    circleLayerDec: {
      cursor: 'pointer',

      // 当前图层如果不希望自动维护 hover 状态，也可以显式传 false。
      // 这里继续保持 true，演示最常见用法。
      enableFeatureStateHover: true,
    },

    // 线图层示例。
    // 这里演示“统一事件 + 局部覆盖模式”：
    // 公共 popup 与右键菜单由顶层处理，线图层仍可补充专属 click 逻辑。
    lineLayer: {
      cursor: 'pointer',

      // 线图层同样可以自动维护 hover feature-state，
      // 配合 line-width / line-color 表达式即可直接实现悬浮高亮。
      enableFeatureStateHover: true,

      onClick: (context: MapLayerInteractiveContext) => {
        console.log('[Map 图层示例] 正式线图层额外 onClick，可在这里补充专属业务逻辑', context);
      },
    },

    // 第二正式线图层示例。
    // 这里故意复用与主线图层完全相同的交互协议，用于验证“多 source 共用一套交互协议”。
    lineLayerSecondary: {
      cursor: 'pointer',
      enableFeatureStateHover: true,
      onClick: (context: MapLayerInteractiveContext) => {
        console.log('[Map 图层示例] 第二正式线图层额外 onClick，可在这里补充专属业务逻辑', context);
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
  properties: {} as Record<string, any>,
  summaryRows: [] as SelectionSummaryRow[],
  featureId: null as string | number | null,
  targetType: '' as 'map' | 'terradraw' | '',
  sourceId: '',
  layerId: '',
  isLineDraftFeature: false,
  controlType: '' as TerradrawControlType | '',
});

/**
 * TerraDraw 内部保留属性名集合。
 * 这些字段由引擎内部维护，业务层不能通过 updateFeatureProperties 主动覆写。
 */
const terraDrawReservedPropertyKeys = [...TERRADRAW_RESERVED_PROPERTY_KEYS];

/**
 * 根据上下文中记录的控件类型，解析当前应该操作的 TerraDraw 控件实例。
 * @returns 绘图或测量控件实例；若未初始化则返回 null
 */
const resolveTerradrawControlByContext = () => {
  if (!mapInitRef.value) {
    return null;
  }

  if (contextMenuState.controlType === 'measure') {
    return mapInitRef.value.getMeasureControl?.() || null;
  }

  if (contextMenuState.controlType === 'draw') {
    return mapInitRef.value.getDrawControl?.() || null;
  }

  return null;
};

/**
 * 统一关闭业务弹窗与右键属性窗口。
 */
const closeBusinessPanels = () => {
  popupState.visible = false;
  popupState.type = '';
  popupState.featureId = null;
  popupState.geometryType = '';
  popupState.featureProps = {};
  popupState.selectedSegmentIndex = -1;
  popupState.selectedSegmentLengthMeters = 0;
  popupState.lineLengthMeters = 0;
  contextMenuState.visible = false;
  contextMenuState.properties = {};
  contextMenuState.summaryRows = [];
  contextMenuState.featureId = null;
  contextMenuState.targetType = '';
  contextMenuState.sourceId = '';
  contextMenuState.layerId = '';
  contextMenuState.isLineDraftFeature = false;
  contextMenuState.controlType = '';
  selectionPanelState.contextMenuSummary = '当前未展示选中集摘要';
};

/**
 * 生成测量要素的业务摘要文本，便于业务层在日志、提示条或弹窗中直接使用。
 * @param context TerraDraw / Measure 统一交互上下文
 * @returns 适合业务层直接展示的测量摘要文本
 */
const getMeasureFeatureSummaryText = (context: TerradrawInteractiveContext) => {
  const properties = context.feature?.properties || {};

  if (properties.distance !== undefined) {
    return `距离：${properties.distance} ${properties.unit || properties.distanceUnit || ''}`.trim();
  }

  if (properties.area !== undefined) {
    return `面积：${properties.area} ${properties.unit || ''}`.trim();
  }

  if (properties.radiusKilometers !== undefined) {
    return `半径：${properties.radiusKilometers} km`;
  }

  if (properties.elevation !== undefined) {
    return `高程：${properties.elevation} ${properties.elevationUnit || ''}`.trim();
  }

  return '当前要素暂无可提取的测量摘要';
};

/**
 * 打开 TerraDraw 要素详情弹窗。
 * @param context TerraDraw 统一交互上下文
 */
const openTerradrawPopup = (context: TerradrawInteractiveContext) => {
  if (!context.feature || !context.lngLat) return;

  contextMenuState.visible = false;
  contextMenuState.summaryRows = [];
  selectionPanelState.contextMenuSummary = '当前未展示选中集摘要';
  popupState.type = popupType.terradraw;
  popupState.featureId = (context.feature.id as string | number | null) ?? null;
  popupState.geometryType = context.feature.geometry?.type || '';
  popupState.featureProps = JSON.parse(JSON.stringify(context.feature.properties || {}));
  popupState.lngLat = [context.lngLat.lng, context.lngLat.lat];
  popupState.visible = true;
};

/**
 * 打开 TerraDraw 要素右键属性配置窗口。
 * @param context TerraDraw 统一交互上下文
 */
const openTerradrawContextMenu = (context: TerradrawInteractiveContext) => {
  if (!context.feature || !context.point || !context.originalEvent) return;

  context.originalEvent.preventDefault();
  popupState.visible = false;

  contextMenuState.position = { x: context.point.x, y: context.point.y };
  contextMenuState.properties = JSON.parse(JSON.stringify(context.feature.properties || {}));
  contextMenuState.summaryRows = [];
  contextMenuState.featureId = (context.feature.id as string | number | null) ?? null;
  contextMenuState.targetType = 'terradraw';
  contextMenuState.sourceId = '';
  contextMenuState.layerId = '';
  contextMenuState.isLineDraftFeature = false;
  contextMenuState.controlType = context.controlType;
  contextMenuState.visible = true;
  selectionPanelState.contextMenuSummary = 'TerraDraw 右键仅展示当前要素属性';
};

/**
 * 将最新属性同步回右键面板和详情弹窗，保证页面态与底层数据一致。
 * @param nextProperties 最新保存完成后的属性快照
 */
const syncSavedPropertiesToPanels = (nextProperties: Record<string, any>) => {
  contextMenuState.properties = JSON.parse(JSON.stringify(nextProperties));

  if (popupState.visible && popupState.featureId === contextMenuState.featureId) {
    popupState.featureProps = JSON.parse(JSON.stringify(nextProperties));
  }
};

/**
 * 统一处理 FeaturePropertyEditor 的保存事件。
 * 根据当前右键目标类型，分发到普通图层或 TerraDraw 的属性写回逻辑。
 * @param updatedProperties 业务层最新编辑完成的属性对象
 */
const handleSaveProperty = (updatedProperties: Record<string, any>) => {
  if (contextMenuState.featureId === null) {
    ElMessage.warning('当前没有可写回的目标要素');
    return;
  }

  if (contextMenuState.targetType === 'map') {
    if (contextMenuState.isLineDraftFeature) {
      // 对业务层来说，这里仍然是“地图要素属性写回”；
      // 只是具体落到正式业务源还是插件内部草稿源，由当前选中要素来源自动分流。
      const result = getLineDraftPreviewApi()?.saveProperties?.({
        featureId: contextMenuState.featureId,
        newProperties: updatedProperties,
        mode: 'replace',
      });

      if (!result?.success || !result.properties) {
        ElMessage.warning(result?.message || '线草稿要素属性写回失败');
        return;
      }

      syncSavedPropertiesToPanels(result.properties);
      ElMessage.success('线草稿要素属性已写回（仅前端本地）');
      return;
    }

    if (!contextMenuState.sourceId) {
      ElMessage.warning('当前没有可写回的地图要素');
      return;
    }

    const targetGeoJsonRef = getGeoJsonRefBySourceId(contextMenuState.sourceId);
    if (!targetGeoJsonRef) {
      ElMessage.warning(`未找到数据源 '${contextMenuState.sourceId}' 对应的本地数据引用`);
      return;
    }

    const result = saveFeatureProperties({
      target: 'map',
      mapInstance: map,
      sourceId: contextMenuState.sourceId,
      featureId: contextMenuState.featureId,
      newProperties: updatedProperties,
      geoJsonRef: targetGeoJsonRef,
      mode: 'replace',
    });

    if (!result.success || !result.properties) {
      ElMessage.warning(result.message);
      return;
    }

    syncSavedPropertiesToPanels(result.properties);
    ElMessage.success('地图要素属性已写回（仅前端本地）');
    return;
  }

  if (contextMenuState.targetType === 'terradraw') {
    if (!contextMenuState.controlType) {
      ElMessage.warning('当前没有可写回的 TerraDraw 要素');
      return;
    }

    const terradrawControl = resolveTerradrawControlByContext();
    if (!terradrawControl) {
      ElMessage.warning('TerraDraw 控件尚未初始化完成');
      return;
    }

    const terradrawInstance = terradrawControl.getTerraDrawInstance?.();
    if (!terradrawInstance) {
      ElMessage.warning('TerraDraw 实例不存在，无法写回属性');
      return;
    }

    const result = saveFeatureProperties({
      target: 'terradraw',
      terradraw: terradrawInstance,
      featureId: contextMenuState.featureId,
      newProperties: updatedProperties,
      currentProperties: contextMenuState.properties,
      reservedPropertyKeys: terraDrawReservedPropertyKeys,
      mode: 'replace',
    });

    if (!result.success || !result.properties) {
      ElMessage.warning(result.message);
      return;
    }

    syncSavedPropertiesToPanels(result.properties);
    ElMessage.success('TerraDraw 要素属性已写回（仅前端本地）');
    return;
  }

  ElMessage.warning('当前没有可写回的目标要素');
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
