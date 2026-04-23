<template>
  <div v-if="isLinePopup" class="popup-panel popup-panel--line">
    <h3 class="popup-panel-title popup-panel-title--line">
      <el-icon>
        <InfoFilled />
      </el-icon>
      线操作
    </h3>
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item label="编号">
        <el-tag size="small">{{ linePayload?.featureProps.id }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="总长度">
        {{ lineLengthText }}
      </el-descriptions-item>
      <el-descriptions-item label="选中线段">
        {{ lineSegmentText }}
      </el-descriptions-item>
      <el-descriptions-item label="当前段长">
        {{ lineSegmentLengthText }}
      </el-descriptions-item>
    </el-descriptions>

    <div class="popup-panel-field">
      <div class="popup-panel-field-label">区域宽度（米）</div>
      <el-input-number
        :model-value="widthMeters"
        :min="0.1"
        :step="1"
        :precision="2"
        style="width: 100%"
        @update:model-value="handleWidthChange"
      />
    </div>

    <div class="popup-panel-field">
      <div class="popup-panel-field-label">延长长度（米）</div>
      <el-input-number
        :model-value="extendLengthMeters"
        :min="0.1"
        :step="1"
        :precision="2"
        style="width: 100%"
        @update:model-value="handleExtendLengthChange"
      />
    </div>

    <div class="popup-panel-actions">
      <el-button type="primary" size="small" style="flex: 1" @click="handleGenerateLineCorridor">
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
      class="popup-panel-clear"
      @click="handleClearLineDraft"
    >
      清空临时草稿
    </el-button>
  </div>

  <div v-else-if="isPointPopup" class="popup-panel popup-panel--point">
    <h3 class="popup-panel-title popup-panel-title--point">
      <el-icon>
        <Location />
      </el-icon>
      站点信息
    </h3>
    <p>
      <strong>名称：</strong>
      {{ pointNameText }}
    </p>
    <p>
      <strong>状态：</strong>
      <el-tag :type="pointStatusTagType" size="small">
        {{ pointStatusText }}
      </el-tag>
    </p>
    <el-button type="success" size="small" style="width: 100%" @click="handlePopupAction">
      进入站点视图
    </el-button>
  </div>

  <div v-else-if="isTerradrawPopup" class="popup-panel popup-panel--terradraw">
    <h3 class="popup-panel-title popup-panel-title--terradraw">
      <el-icon>
        <InfoFilled />
      </el-icon>
      TerraDraw 要素
    </h3>
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item label="要素 ID">
        <el-tag size="small">
          {{ terradrawFeatureIdText }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="几何类型">
        {{ terradrawGeometryTypeText }}
      </el-descriptions-item>
      <el-descriptions-item label="绘制模式">
        {{ terradrawModeText }}
      </el-descriptions-item>
    </el-descriptions>
    <div class="popup-panel-json-board">
      <div class="popup-panel-json-title">属性快照</div>
      <pre class="terradraw-popup-json">{{ terradrawFeatureJsonText }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { InfoFilled, Location } from "@element-plus/icons-vue";
import {
  getLineActionPayload,
  getLinePopupPayload,
  getPointPopupPayload,
  getTerradrawPopupPayload,
  type NgLineActionPayload,
  type NgLinePopupPayload,
  type NgPointPopupPayload,
  type NgPopupPayload,
  type NgTerradrawPopupPayload,
} from "./NGGI00PopupPanel.shared";

interface Props {
  payload: NgPopupPayload | null;
  hasLineDraftFeatures: boolean;
  widthMeters: number;
  extendLengthMeters: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:widthMeters": [value: number];
  "update:extendLengthMeters": [value: number];
  "popup-action": [];
  "generate-line-corridor": [payload: NgLineActionPayload];
  "create-line-draft": [payload: NgLineActionPayload];
  "clear-line-draft": [];
}>();

/** 当前是否为线弹窗。 */
const linePayload = computed<NgLinePopupPayload | null>(() => {
  return getLinePopupPayload(props.payload);
});

/** 当前是否为点弹窗。 */
const pointPayload = computed<NgPointPopupPayload | null>(() => {
  return getPointPopupPayload(props.payload);
});

/** 当前是否为 TerraDraw 弹窗。 */
const terradrawPayload = computed<NgTerradrawPopupPayload | null>(() => {
  return getTerradrawPopupPayload(props.payload);
});

/** 模板层只关心当前应该展示哪块内容。 */
const isLinePopup = computed(() => {
  return linePayload.value !== null;
});

/** 模板层只关心当前应该展示哪块内容。 */
const isPointPopup = computed(() => {
  return pointPayload.value !== null;
});

/** 模板层只关心当前应该展示哪块内容。 */
const isTerradrawPopup = computed(() => {
  return terradrawPayload.value !== null;
});

/** 线总长度展示文本。 */
const lineLengthText = computed(() => {
  return `${(linePayload.value?.lineLengthMeters ?? 0).toFixed(2)} m`;
});

/** 当前线段展示文本。 */
const lineSegmentText = computed(() => {
  const currentIndex = linePayload.value?.selectedSegmentIndex ?? -1;
  return currentIndex >= 0 ? `第 ${currentIndex + 1} 段` : "未识别";
});

/** 当前线段长度展示文本。 */
const lineSegmentLengthText = computed(() => {
  return `${(linePayload.value?.selectedSegmentLengthMeters ?? 0).toFixed(2)} m`;
});

/** 点名称展示文本。 */
const pointNameText = computed(() => {
  return pointPayload.value?.featureProps.name || "未命名站点";
});

/** 点状态标签类型。 */
const pointStatusTagType = computed(() => {
  return pointPayload.value?.featureProps.status === "normal" ? "success" : "danger";
});

/** 点状态展示文本。 */
const pointStatusText = computed(() => {
  return pointPayload.value?.featureProps.status === "normal" ? "正常" : "异常";
});

/** TerraDraw 要素 ID 展示文本。 */
const terradrawFeatureIdText = computed(() => {
  const currentPayload = terradrawPayload.value;
  return currentPayload?.featureId ?? currentPayload?.featureProps.id ?? "无";
});

/** TerraDraw 几何类型展示文本。 */
const terradrawGeometryTypeText = computed(() => {
  return terradrawPayload.value?.geometryType || "未知";
});

/** TerraDraw 绘制模式展示文本。 */
const terradrawModeText = computed(() => {
  return terradrawPayload.value?.featureProps.mode || "未知";
});

/** TerraDraw 属性快照文本。 */
const terradrawFeatureJsonText = computed(() => {
  return JSON.stringify(terradrawPayload.value?.featureProps || {}, null, 2);
});

/** 当前线弹窗可直接使用的动作目标。 */
const lineActionPayload = computed<NgLineActionPayload | null>(() => {
  return getLineActionPayload(props.payload);
});

/**
 * 同步区域宽度输入值。
 * @param value 输入框返回的新值
 */
function handleWidthChange(value: number | string | undefined): void {
  // Element Plus 在清空输入框时可能给出 undefined，这里统一回落到 0，
  // 让父层继续沿用原有的“大于 0 才允许提交”校验逻辑。
  emit("update:widthMeters", typeof value === "number" ? value : 0);
}

/**
 * 同步延长长度输入值。
 * @param value 输入框返回的新值
 */
function handleExtendLengthChange(value: number | string | undefined): void {
  // 这里同样把空输入态收敛成 0，避免父层收到 undefined 后再额外做类型分支。
  emit("update:extendLengthMeters", typeof value === "number" ? value : 0);
}

/**
 * 触发通用 popup 业务动作。
 */
function handlePopupAction(): void {
  emit("popup-action");
}

/**
 * 触发线廊生成动作。
 */
function handleGenerateLineCorridor(): void {
  if (!lineActionPayload.value) {
    return;
  }

  emit("generate-line-corridor", lineActionPayload.value);
}

/**
 * 触发线草稿创建动作。
 */
function handleCreateLineDraft(): void {
  if (!lineActionPayload.value) {
    return;
  }

  emit("create-line-draft", lineActionPayload.value);
}

/**
 * 触发线草稿清理动作。
 */
function handleClearLineDraft(): void {
  emit("clear-line-draft");
}
</script>

<style scoped lang="scss">
.popup-panel {
  p {
    margin: 0 0 10px;
  }
}

.popup-panel--line {
  // 线弹窗包含两组输入和双按钮，320px 才能避免在 popup 里过早挤压换行。
  min-width: 320px;
}

.popup-panel--point {
  // 点弹窗信息量较少，200px 就能维持紧凑阅读体验。
  min-width: 200px;
}

.popup-panel--terradraw {
  // TerraDraw 还要展示属性快照，260px 可以兼顾 JSON 可读性和 popup 宽度。
  min-width: 260px;
}

.popup-panel-title {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 0 0 10px;
}

.popup-panel-title--line {
  color: #409eff;
}

.popup-panel-title--point {
  color: #67c23a;
}

.popup-panel-title--terradraw {
  color: #e6a23c;
}

.popup-panel-field {
  margin-top: 12px;
}

.popup-panel-field-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}

.popup-panel-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.popup-panel-clear {
  width: 100%;
  margin-top: 8px;
}

.popup-panel-json-board {
  margin-top: 10px;
}

.popup-panel-json-title {
  margin-bottom: 4px;
  font-weight: bold;
  color: #606266;
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
