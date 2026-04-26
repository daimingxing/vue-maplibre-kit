<template>
  <div
    v-if="visible"
    class="feature-property-editor"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <div class="editor-header">
      <span>业务属性面板</span>
      <el-icon class="close-icon" @click="handleClose"><Close /></el-icon>
    </div>
    <div class="editor-body">
      <div v-if="summaryRows.length > 0" class="summary-panel">
        <div class="summary-panel__title">选中集摘要</div>
        <div
          v-for="summaryRow in summaryRows"
          :key="summaryRow.label"
          class="summary-panel__row"
        >
          <span class="summary-panel__label">{{ summaryRow.label }}</span>
          <span class="summary-panel__value">{{ summaryRow.value }}</span>
        </div>
      </div>

      <div v-if="note" class="note-panel">
        {{ note }}
      </div>

      <div class="property-list">
        <div v-if="items.length === 0" class="property-empty">
          当前没有可见业务字段。你仍然可以在下方新增临时字段，或通过调试快照查看被系统隐藏的原始属性。
        </div>

        <div v-for="item in items" :key="item.key" class="property-row">
          <div class="property-row__head">
            <div class="property-row__key">{{ item.key }}</div>
            <div class="property-row__tags">
              <span class="property-tag" :class="item.temporary ? 'is-warning' : 'is-info'">
                {{ item.temporary ? "临时字段" : "稳定字段" }}
              </span>
              <span class="property-tag" :class="item.editable ? 'is-success' : 'is-muted'">
                {{ item.editable ? "可修改" : "只读" }}
              </span>
              <span class="property-tag" :class="item.removable ? 'is-danger' : 'is-muted'">
                {{ item.removable ? "可删除" : "不可删" }}
              </span>
            </div>
          </div>

          <el-input
            v-if="item.editable"
            v-model="editValues[item.key]"
            size="small"
            class="property-row__input"
            placeholder="请输入属性值"
          />
          <pre v-else class="property-row__value">{{ formatDisplayValue(item.value) }}</pre>

          <div class="property-row__actions">
            <el-button
              v-if="item.editable"
              type="primary"
              plain
              size="small"
              @click="handleSaveItem(item.key)"
            >
              保存
            </el-button>
            <el-button
              v-if="item.removable"
              type="danger"
              plain
              size="small"
              @click="handleRemoveItem(item.key)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>

      <div class="add-panel">
        <div class="add-panel__title">新增或修改单个属性</div>
        <div class="add-row">
          <el-input v-model="newKey" size="small" placeholder="属性名" class="input-item" />
          <el-input v-model="newValue" size="small" placeholder="属性值" class="input-item" />
          <el-button type="primary" size="small" @click="handleAddItem">保存</el-button>
        </div>
        <div class="add-panel__tip">
          保存表示新增或修改单个字段；删除请使用每行的删除按钮。
        </div>
      </div>

      <div class="debug-panel">
        <div class="debug-panel__title">调试快照（原始属性）</div>
        <div class="debug-panel__tip">
          下方快照保留底层原始属性。系统字段、样式辅助字段或被治理规则隐藏的字段会出现在这里，但不会进入上方业务编辑列表。
        </div>
        <pre class="debug-panel__pre">{{ rawPropertiesText }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Close } from '@element-plus/icons-vue';
import type { MapFeaturePropertyPanelItem, MapFeaturePropertyPanelState } from 'vue-maplibre-kit';

interface SummaryRow {
  label: string;
  value: string;
}

interface FeaturePropertySavePayload {
  key: string;
  value: any;
}

interface FeaturePropertyRemovePayload {
  key: string;
}

interface Props {
  visible: boolean;
  position: { x: number; y: number };
  panelState?: MapFeaturePropertyPanelState | null;
  rawProperties?: Record<string, any>;
  summaryRows?: SummaryRow[];
  note?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  position: () => ({ x: 0, y: 0 }),
  panelState: null,
  rawProperties: () => ({}),
  summaryRows: () => [],
  note: '',
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'save-item': [payload: FeaturePropertySavePayload];
  'remove-item': [payload: FeaturePropertyRemovePayload];
}>();

const editValues = reactive<Record<string, string>>({});
const newKey = ref('');
const newValue = ref('');

/**
 * 将任意属性值格式化为编辑框可读文本。
 * @param value 原始属性值
 * @returns 适合输入框展示的文本
 */
function formatDisplayValue(value: any): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined) {
    return '';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

/**
 * 将输入框文本还原为更接近真实业务值的类型。
 * @param input 用户输入的文本
 * @returns 解析后的属性值
 */
function parseInputValue(input: string): any {
  const trimmedValue = input.trim();

  if (trimmedValue === '') {
    return '';
  }

  if (trimmedValue === 'true') {
    return true;
  }

  if (trimmedValue === 'false') {
    return false;
  }

  if (trimmedValue === 'null') {
    return null;
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    return Number(trimmedValue);
  }

  const mayBeJson =
    (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
    (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'));

  if (mayBeJson) {
    try {
      return JSON.parse(trimmedValue);
    } catch {
      return input;
    }
  }

  return input;
}

/**
 * 当前业务面板中的可见属性行。
 */
const items = computed<MapFeaturePropertyPanelItem[]>(() => {
  return props.panelState?.items || [];
});

/**
 * 原始属性快照的调试文本。
 */
const rawPropertiesText = computed(() => {
  return JSON.stringify(props.rawProperties || {}, null, 2);
});

/**
 * 面板行变化时，同步每个字段对应的编辑输入值。
 * 这样业务层每次刷新面板态后，编辑框都能回到最新快照。
 */
watch(
  items,
  (nextItems) => {
    const nextKeySet = new Set(nextItems.map((item) => item.key));

    nextItems.forEach((item) => {
      editValues[item.key] = formatDisplayValue(item.value);
    });

    Object.keys(editValues).forEach((key) => {
      if (!nextKeySet.has(key)) {
        delete editValues[key];
      }
    });
  },
  { immediate: true, deep: true }
);

/**
 * 保存指定单行属性。
 * @param key 当前要保存的属性键
 */
function handleSaveItem(key: string): void {
  const targetItem = items.value.find((item) => item.key === key);
  if (!targetItem?.editable) {
    ElMessage.warning(`属性 ${key} 当前不允许修改`);
    return;
  }

  emit('save-item', {
    key,
    value: parseInputValue(editValues[key] || ''),
  });
}

/**
 * 删除指定单行属性。
 * @param key 当前要删除的属性键
 */
function handleRemoveItem(key: string): void {
  const targetItem = items.value.find((item) => item.key === key);
  if (!targetItem?.removable) {
    ElMessage.warning(`属性 ${key} 当前不允许删除`);
    return;
  }

  emit('remove-item', { key });
}

/**
 * 新增一个属性，或按键名覆盖一个已存在且可编辑的属性。
 */
function handleAddItem(): void {
  const trimmedKey = newKey.value.trim();

  if (!trimmedKey) {
    ElMessage.warning('属性名不能为空');
    return;
  }

  const targetItem = items.value.find((item) => item.key === trimmedKey);
  if (targetItem && !targetItem.editable) {
    ElMessage.warning(`属性 ${trimmedKey} 当前不允许修改`);
    return;
  }

  emit('save-item', {
    key: trimmedKey,
    value: parseInputValue(newValue.value),
  });

  // 业务层写回后会重新推送最新面板态，这里只负责清空输入框。
  newKey.value = '';
  newValue.value = '';
}

/**
 * 关闭当前业务属性面板。
 */
function handleClose(): void {
  emit('update:visible', false);
}
</script>

<style scoped lang="scss">
.feature-property-editor {
  position: absolute;
  z-index: 1000;
  width: 420px;
  max-width: calc(100vw - 24px);
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  border: 1px solid #e5e7eb;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 8px 8px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;

  .close-icon {
    cursor: pointer;
    font-size: 16px;
    color: #64748b;

    &:hover {
      color: #ef4444;
    }
  }
}

.editor-body {
  max-height: 70vh;
  padding: 12px;
  overflow: auto;
}

.summary-panel,
.note-panel,
.add-panel,
.debug-panel {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
}

.summary-panel {
  background: #f8fbff;
  border: 1px solid #dbeafe;
}

.summary-panel__title,
.add-panel__title,
.debug-panel__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
}

.summary-panel__title {
  color: #1d4ed8;
}

.summary-panel__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #374151;
}

.summary-panel__label {
  flex: 0 0 auto;
  color: #6b7280;
}

.summary-panel__value {
  flex: 1 1 auto;
  text-align: right;
  word-break: break-all;
}

.note-panel {
  font-size: 12px;
  line-height: 1.7;
  color: #7c2d12;
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.property-empty {
  padding: 14px 12px;
  font-size: 12px;
  line-height: 1.7;
  color: #64748b;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}

.property-row {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.property-row__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.property-row__key {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
  word-break: break-all;
}

.property-row__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.property-tag {
  padding: 2px 8px;
  font-size: 11px;
  line-height: 1.6;
  border-radius: 999px;
  border: 1px solid transparent;
}

.property-tag.is-info {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.property-tag.is-warning {
  color: #b45309;
  background: #fffbeb;
  border-color: #fcd34d;
}

.property-tag.is-success {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.property-tag.is-danger {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.property-tag.is-muted {
  color: #6b7280;
  background: #f3f4f6;
  border-color: #d1d5db;
}

.property-row__input {
  margin-bottom: 8px;
}

.property-row__value {
  margin: 0 0 8px;
  padding: 8px 10px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}

.property-row__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.add-panel {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.add-panel__title {
  color: #0f172a;
}

.add-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-item {
  flex: 1;
}

.add-panel__tip,
.debug-panel__tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: #64748b;
}

.debug-panel {
  background: #0f172a;
  border: 1px solid #1e293b;
}

.debug-panel__title {
  color: #f8fafc;
}

.debug-panel__tip {
  color: #cbd5e1;
}

.debug-panel__pre {
  margin: 8px 0 0;
  max-height: 220px;
  padding: 10px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: #e2e8f0;
  background: #020617;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
