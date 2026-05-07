<template>
  <mgl-custom-control :position="position" :noClasses="false">
    <button
      class="multi-select-control"
      :class="{ 'is-active': isActive }"
      type="button"
      :aria-label="isActive ? '关闭多选' : '开启多选'"
      :aria-pressed="isActive"
      :title="isActive ? '关闭多选' : '开启多选'"
      @click="handleToggle"
    >
      <svg
        class="multi-select-control__icon"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1024 1024"
      >
        <path
          d="M128 128h85.312v85.312H128V128z m170.688 0H384v85.312H298.688V128z m170.624 0h85.376v85.312H469.312V128zM640 128h85.312v85.312H640V128z m170.688 0H896v85.312h-85.312V128z m0 170.688H896V384h-85.312V298.688zM128 810.688h85.312V896H128v-85.312zM128 640h85.312v85.312H128V640z m0-170.688h85.312v85.376H128V469.312z m0-170.624h85.312V384H128V298.688zM705.152 643.52l165.888 236.992-78.656 55.04-165.888-236.928-102.848 132.096-77.44-473.152 418.24 234.56z"
        />
      </svg>
      <span class="multi-select-control__label">{{ isActive ? '关闭多选' : '开启多选' }}</span>
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
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 34px;
  min-height: 34px;
  padding: 4px 6px 4px 2px;
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

.multi-select-control__icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
  stroke: currentColor;
  stroke-linejoin: round;
  stroke-width: 18;
}

.multi-select-control__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  white-space: nowrap;
  clip: rect(0 0 0 0);
  border: 0;
}

.multi-select-control__count {
  position: absolute;
  top: 14px;
  right: -9px;
  min-width: 18px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  color: inherit;
}
</style>
