<template>
  <mgl-custom-control :position="position" :noClasses="false">
    <button
      class="multi-select-control"
      :class="{ 'is-active': isActive }"
      type="button"
      :aria-pressed="isActive"
      @click="handleToggle"
    >
      <span class="multi-select-control__label">多选</span>
      <span v-if="selectedCount > 0" class="multi-select-control__count">{{ selectedCount }}</span>
    </button>
  </mgl-custom-control>
</template>

<script setup lang="ts">
import type { ControlPosition } from 'maplibre-gl';
import { MglCustomControl } from 'vue-maplibre-gl';

interface Props {
  /** 控件显示位置。 */
  position: ControlPosition;
  /** 当前多选模式是否已激活。 */
  isActive: boolean;
  /** 当前选中项数量。 */
  selectedCount: number;
  /** 控件点击后的切换回调。 */
  onToggle: () => void;
}

const props = defineProps<Props>();

/**
 * 响应控件点击，切换多选模式。
 */
const handleToggle = (): void => {
  props.onToggle();
};
</script>

<style scoped lang="scss">
.multi-select-control {
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
    color 0.2s ease;
}

.multi-select-control:hover {
  background: #eff6ff;
}

.multi-select-control.is-active {
  color: #ffffff;
  background: #2563eb;
}

.multi-select-control__label {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.multi-select-control__count {
  min-width: 18px;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 1;
  color: inherit;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
}
</style>
