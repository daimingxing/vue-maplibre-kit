<template>
  <mgl-custom-control :position="position" :noClasses="false">
    <button
      class="dxf-export-control"
      type="button"
      :disabled="isExporting"
      @click="handleExport"
    >
      <span class="dxf-export-control__label">{{ isExporting ? '导出中...' : label }}</span>
    </button>
  </mgl-custom-control>
</template>

<script setup lang="ts">
import type { ControlPosition } from 'maplibre-gl';
import { MglCustomControl } from 'vue-maplibre-gl';

interface Props {
  /** 控件显示位置。 */
  position: ControlPosition;
  /** 控件文案。 */
  label: string;
  /** 当前是否处于导出中。 */
  isExporting: boolean;
  /** 导出触发回调。 */
  onExport: () => Promise<void> | void;
}

const props = defineProps<Props>();

/**
 * 响应控件点击，触发 DXF 导出。
 */
const handleExport = (): void => {
  void props.onExport();
};
</script>

<style scoped lang="scss">
.dxf-export-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #1f2937;
  background: #ffffff;
  border: none;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
}

.dxf-export-control:hover:not(:disabled) {
  background: #eff6ff;
}

.dxf-export-control:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.dxf-export-control__label {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}
</style>
