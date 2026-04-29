<template>
  <!-- 
    这里我们利用一个隐藏的 div 来接收 Vue 的插槽内容。
    当组件挂载时，我们会将这个 div 作为 DOM 节点直接传递给原生的 MapLibre Popup。
    这样就能完美保留 Vue 的上下文、响应式以及组件生命周期。
  -->
  <div style="display: none">
    <div ref="popupContentRef" class="custom-mgl-popup-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { LngLatLike, PopupOptions } from 'maplibre-gl';
import { useMap } from 'vue-maplibre-gl';
import { useMglPopupLifecycle } from './useMglPopupLifecycle';
import type { MglPopupLifecycleEmit, MglPopupLifecycleProps } from './useMglPopupLifecycle';

// 从 maplibre-gl 重新导出常用类型，方便父组件使用
export type { PopupOptions, LngLatLike };

interface MglPopupProps extends MglPopupLifecycleProps {
  /** 多实例场景下使用的 mapKey */
  mapKey?: symbol | string;
}

const props = defineProps<MglPopupProps>();
const emit = defineEmits<MglPopupLifecycleEmit>();

// 获取当前上下文中的地图实例
const mapInstance = useMap(props.mapKey);
const popupContentRef = ref<HTMLElement | null>(null);

useMglPopupLifecycle({
  props,
  emit,
  mapInstance,
  popupContentRef,
});
</script>

<style lang="scss">
/* 
  如果需要覆盖原生 Popup 的默认样式，可以在这里写全局样式。
  注意：不要加 scoped，因为 popup 最终会被挂载到 maplibre 的全局 DOM 结构中。
*/
.custom-mgl-popup-content {
  min-width: 150px;
}
</style>
