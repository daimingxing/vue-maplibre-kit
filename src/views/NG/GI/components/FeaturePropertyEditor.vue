<template>
  <div
    v-if="visible"
    class="feature-property-editor"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <div class="editor-header">
      <span>要素属性配置</span>
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
      <el-table :data="tableData" size="small" border max-height="250">
        <el-table-column prop="key" label="属性名" width="100" />
        <el-table-column prop="value" label="属性值" width="120" />
      </el-table>
      <div class="add-row">
        <el-input v-model="newKey" size="small" placeholder="属性名" class="input-item" />
        <el-input v-model="newValue" size="small" placeholder="属性值" class="input-item" />
        <el-button type="primary" size="small" @click="handleSave">保存</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Close } from '@element-plus/icons-vue';

interface SummaryRow {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  position: { x: number; y: number };
  properties: Record<string, any>;
  forbiddenKeys?: string[];
  summaryRows?: SummaryRow[];
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  position: () => ({ x: 0, y: 0 }),
  properties: () => ({}),
  forbiddenKeys: () => [],
  summaryRows: () => [],
});

const emit = defineEmits(['update:visible', 'save']);

const tableData = ref<{ key: string; value: any }[]>([]);
const newKey = ref('');
const newValue = ref('');

/**
 * 监听属性变化，更新表格数据
 */
watch(
  () => props.properties,
  (newProps) => {
    tableData.value = Object.keys(newProps).map((key) => ({
      key,
      value: newProps[key],
    }));
  },
  { immediate: true, deep: true }
);

/**
 * 保存新的属性
 */
const handleSave = () => {
  const trimmedKey = newKey.value.trim();

  if (!trimmedKey) {
    ElMessage.warning('属性名不能为空');
    return;
  }

  if (props.forbiddenKeys.includes(trimmedKey)) {
    ElMessage.warning(`属性名 ${trimmedKey} 为系统保留字段，请更换其他名称`);
    return;
  }

  // 构建更新后的属性对象
  const updatedProperties = {
    ...props.properties,
    [trimmedKey]: newValue.value,
  };

  // 更新本地表格显示
  const existingIndex = tableData.value.findIndex((item) => item.key === trimmedKey);
  if (existingIndex >= 0) {
    tableData.value[existingIndex].value = newValue.value;
  } else {
    tableData.value.push({
      key: trimmedKey,
      value: newValue.value,
    });
  }

  // 触发保存事件供父组件更新数据源
  emit('save', updatedProperties);

  // 清空输入框，小窗口不关闭
  newKey.value = '';
  newValue.value = '';
  ElMessage.success('属性已暂存');
};

/**
 * 关闭窗口
 */
const handleClose = () => {
  emit('update:visible', false);
};
</script>

<style scoped lang="scss">
.feature-property-editor {
  position: absolute;
  z-index: 1000;
  width: 300px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #ebeef5;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  border-radius: 4px 4px 0 0;
  font-size: 14px;
  font-weight: bold;
  color: #303133;

  .close-icon {
    cursor: pointer;
    font-size: 16px;
    color: #909399;
    &:hover {
      color: #f56c6c;
    }
  }
}

.editor-body {
  padding: 10px;

  .summary-panel {
    margin-bottom: 10px;
    padding: 10px;
    background: #f8fbff;
    border: 1px solid #dbeafe;
    border-radius: 4px;
  }

  .summary-panel__title {
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
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

  .add-row {
    display: flex;
    margin-top: 10px;
    align-items: center;

    .input-item {
      flex: 1;
      margin-right: 8px;
    }
  }
}
</style>
