<template>
  <mgl-custom-control :position="position" :noClasses="false">
    <button
      class="dxf-export-control"
      type="button"
      :disabled="isExporting"
      :aria-label="isExporting ? 'DXF 导出中' : label"
      :title="isExporting ? 'DXF 导出中' : label"
      @click="handleExport"
    >
      <svg
        class="dxf-export-control__icon"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1024 1024"
      >
        <path
          d="M64.694857 53.321143h581.595429l229.12 228.205714v115.968h-72.521143V308.662857H618.788571V125.878857H137.216v772.242286h576v72.557714H64.658286V53.321143z"
        />
        <path
          d="M190.500571 836.315429V480.914286h109.348572q46.848 0 83.858286 21.101714 36.937143 21.138286 57.709714 60.050286 20.736 38.948571 20.736 88.502857v16.347428q0 49.554286-20.370286 88.137143-20.370286 38.546286-57.490286 59.757715-37.083429 21.211429-83.712 21.504H190.537143z m73.216-296.082286v237.238857h35.401143q42.971429 0 65.645715-28.050286 22.710857-28.086857 23.186285-80.310857v-18.797714q0-54.198857-22.454857-82.139429T299.885714 540.233143h-36.132571z m334.994286 63.195428l66.669714-122.514285h84.187429l-103.497143 176.237714 106.203429 179.163429h-85.211429l-68.315428-124.489143-68.352 124.489143h-85.211429l106.203429-179.2-103.497143-176.201143h84.224l66.633143 122.514285z m382.902857 87.625143h-140.617143v145.261715h-73.216V480.914286h231.387429v59.318857h-158.171429v91.794286h140.580572v59.026285z"
        />
      </svg>
      <span class="dxf-export-control__label">
        {{ isExporting ? '导出中...' : label }}
      </span>
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
  padding: 0;
  color: #1f2937;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
}

.dxf-export-control:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

.dxf-export-control:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.dxf-export-control__icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.dxf-export-control__label {
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

</style>
