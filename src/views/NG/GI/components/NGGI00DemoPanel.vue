<template>
  <div class="demo-panel-board">
    <section class="demo-panel-card">
      <div class="demo-panel-head">
        <h3>当前选中态面板</h3>
        <p>直接使用 `useBusinessMap(...).selection` 驱动 UI。</p>
      </div>
      <div class="demo-panel-actions">
        <el-button
          type="primary"
          plain
          :disabled="isSelectionActive"
          @click="handleActivateSelection"
        >
          进入多选
        </el-button>
        <el-button plain :disabled="!hasSelection" @click="handleClearSelection">
          清空选中
        </el-button>
        <el-button plain :disabled="!isSelectionActive" @click="handleDeactivateSelection">
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
          <strong>{{ selectedCircleIdsText }}</strong>
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
          @click="handleClearLineDraft"
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
          <strong>{{ DXF_DEFAULT_CRS_TEXT }}</strong>
        </div>
        <div class="demo-panel-kv">
          <span>全局默认 CRS 位置</span>
          <strong>封装层 DEFAULT_DXF_CRS_OPTIONS</strong>
        </div>
        <div class="demo-panel-kv">
          <span>全局默认配色</span>
          <strong>{{ DXF_GLOBAL_TRUE_COLOR_TEXT }}</strong>
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
        <p>
          这里把插件壳、defaults 和常用筛选 / 分层 /
          着色回调的含义一次性写全，方便业务层直接照着配。
        </p>
      </div>
      <p class="demo-panel-note">{{ DXF_PLUGIN_OPTIONS_GUIDE_TEXT }}</p>
      <p class="demo-panel-note">{{ DXF_CALLBACK_GUIDE_TEXT }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import type * as BusinessKit from "vue-maplibre-kit/business";
import { LINE_DRAFT_PREVIEW_SOURCE_ID } from "vue-maplibre-kit/plugins/line-draft-preview";
import {
  DXF_CALLBACK_GUIDE_TEXT,
  DXF_DEFAULT_CRS_CONFIG_PATH_TEXT,
  DXF_DEFAULT_CRS_TEXT,
  DXF_DEFAULT_FILE_NAME,
  DXF_DEFAULT_TRUE_COLOR_CONFIG_PATH_TEXT,
  DXF_GLOBAL_TRUE_COLOR_TEXT,
  DXF_OPTIONS_PENDING_TEXT,
  DXF_OVERRIDE_GUIDE_TEXT,
  DXF_PLUGIN_OPTIONS_GUIDE_TEXT,
  DXF_PRIMARY_ONLY_FILE_NAME,
  buildDxfResolvedOptionsText,
  buildLineDraftStatusText,
  buildLineOperationText,
  buildSelectionChangeSummary,
  buildSelectionGuideText,
  buildSelectionSummaryRows,
  createSelectionPanelState,
  formatLayerDistribution,
  formatValueList,
  getSelectionModeText,
  type DxfSummaryOptions,
  type SelectionChangeSummaryInput,
  type SelectionSummaryRow,
} from "./NGGI00DemoPanel.shared";

interface Props {
  isSelectionActive: boolean;
  selectionMode: BusinessKit.MapSelectionMode;
  selectedCount: number;
  selectedFeatureIds: Array<string | number>;
  selectedLayerGroups: BusinessKit.MapSelectionLayerGroup[];
  selectedCircleIds: Array<string | number>;
  hasSelection: boolean;
  selectedLineFeatureId: string | number | null;
  selectedLineSourceId: string | null;
  hasLineDraftFeatures: boolean;
  lineDraftCount: number;
  dxfDefaultOptions: DxfSummaryOptions | null;
  dxfPrimaryOptions: DxfSummaryOptions | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "activate-selection": [];
  "clear-selection": [];
  "deactivate-selection": [];
  "clear-line-draft": [];
}>();

const selectionPanelState = reactive(createSelectionPanelState());

/** 当前选择模式的中文文本。 */
const selectionModeText = computed(() => {
  return getSelectionModeText(props.selectionMode);
});

/** 当前完整选中集的要素 ID 摘要。 */
const selectedFeatureIdsText = computed(() => {
  return formatValueList(props.selectedFeatureIds);
});

/** 当前 circleLayer 图层中的业务 ID 摘要。 */
const selectedCircleIdsText = computed(() => {
  return formatValueList(props.selectedCircleIds);
});

/** 当前选中集的图层分布文本。 */
const selectedLayerDistributionText = computed(() => {
  return formatLayerDistribution(props.selectedLayerGroups);
});

/** 当前选中态面板的说明文本。 */
const selectionGuideText = computed(() => {
  return buildSelectionGuideText(props.hasSelection, props.isSelectionActive);
});

/** 当前线操作入口的说明文本。 */
const selectedLineOperationText = computed(() => {
  return buildLineOperationText({
    selectedFeatureIds: props.selectedFeatureIds,
    selectedLineFeatureId: props.selectedLineFeatureId,
    selectedLineSourceId: props.selectedLineSourceId,
    lineDraftSourceId: LINE_DRAFT_PREVIEW_SOURCE_ID,
  });
});

/** 当前线草稿状态的说明文本。 */
const lineDraftStatusText = computed(() => {
  return buildLineDraftStatusText(props.hasLineDraftFeatures, props.lineDraftCount);
});

/** 当前示例面板展示的 DXF 最终配置说明。 */
const dxfResolvedOptionsText = computed(() => {
  if (!props.dxfDefaultOptions || !props.dxfPrimaryOptions) {
    return DXF_OPTIONS_PENDING_TEXT;
  }

  return buildDxfResolvedOptionsText(props.dxfDefaultOptions, props.dxfPrimaryOptions);
});

/**
 * 触发“进入多选”动作。
 */
function handleActivateSelection(): void {
  emit("activate-selection");
}

/**
 * 触发“清空选中”动作。
 */
function handleClearSelection(): void {
  emit("clear-selection");
}

/**
 * 触发“退出多选”动作。
 */
function handleDeactivateSelection(): void {
  emit("deactivate-selection");
}

/**
 * 触发“清空线草稿”动作。
 */
function handleClearLineDraft(): void {
  emit("clear-line-draft");
}

/**
 * 读取当前选中集的摘要行。
 * @param selectionMode 当前需要展示的选择模式
 * @returns 适合右键属性面板直接展示的摘要行
 */
function getSelectionSummaryRows(
  selectionMode: BusinessKit.MapSelectionMode = props.selectionMode,
): SelectionSummaryRow[] {
  return buildSelectionSummaryRows({
    selectionMode,
    selectedCount: props.selectedCount,
    selectedFeatureIds: props.selectedFeatureIds,
    layerGroups: props.selectedLayerGroups,
  });
}

/**
 * 根据最新选中集变化刷新面板摘要。
 * @param input 选中集变化摘要入参
 * @returns 本次写入后的摘要文本
 */
function syncSelectionChangeSummary(input: SelectionChangeSummaryInput): string {
  const summary = buildSelectionChangeSummary(input);
  selectionPanelState.lastChangeSummary = summary;
  return summary;
}

/**
 * 更新当前右键摘要文本。
 * @param summary 需要展示的右键摘要
 */
function setContextMenuSummary(summary: string): void {
  selectionPanelState.contextMenuSummary = summary;
}

/**
 * 重置当前右键摘要文本。
 */
function resetContextMenuSummary(): void {
  selectionPanelState.contextMenuSummary = createSelectionPanelState().contextMenuSummary;
}

defineExpose({
  getSelectionSummaryRows,
  syncSelectionChangeSummary,
  setContextMenuSummary,
  resetContextMenuSummary,
});
</script>

<style scoped lang="scss">
.demo-panel-board {
  display: grid;
  // 280px 是卡片在示例页里还能保持可读性的最小宽度。
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
</style>
