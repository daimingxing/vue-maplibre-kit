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
import { ref, onBeforeUnmount, watch, nextTick } from 'vue';
import { Popup, type LngLatLike, type PopupOptions } from 'maplibre-gl';
import { useMap } from 'vue-maplibre-gl';

// 从 maplibre-gl 重新导出常用类型，方便父组件使用
export type { PopupOptions, LngLatLike };

const props = defineProps<{
  /** 控制 Popup 是否显示 (支持 v-model:visible) */
  visible: boolean;
  /** 经纬度坐标 [lng, lat]，允许为空（为空时组件内部不显示弹窗） */
  lngLat: LngLatLike | null;
  /**
   * 原生 Popup 的配置项
   * @property closeButton {boolean} - 是否显示右上角的关闭按钮，默认 true
   * @property closeOnClick {boolean} - 点击地图其他区域时是否自动关闭弹窗，默认 true
   * @property closeOnMove {boolean} - 地图移动/缩放时是否自动关闭弹窗，默认 false
   * @property focusAfterOpen {boolean} - 弹窗打开时是否自动将焦点移入，便于键盘辅助访问，默认 true
   * @property anchor {string} - 弹窗相对于坐标点的位置，如 'top', 'bottom', 'left', 'right', 'top-left' 等。默认自动计算
   * @property offset {number | PointLike | Object} - 弹窗相对于原点的偏移量（像素）。可以根据 anchor 传入不同方向的偏移对象
   * @property className {string} - 自定义 CSS 类名，将添加到 popup 容器上
   * @property maxWidth {string} - 弹窗的最大宽度，如 '300px'。设为 'none' 则不限制宽度，默认 '240px'
   */
  options?: PopupOptions;
  /** 多实例场景下使用的 mapKey */
  mapKey?: symbol | string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
  (e: 'open'): void;
}>();

// 获取当前上下文中的地图实例
const mapInstance = useMap(props.mapKey);
const popupContentRef = ref<HTMLElement | null>(null);
let popup: Popup | null = null;

// 初始化 Popup
const initPopup = () => {
  if (!mapInstance.map || !popupContentRef.value) return;

  // 1. 实例化原生 Popup
  popup = new Popup(props.options || { closeOnClick: true, closeButton: true });

  // 2. 将 Vue 渲染好的 DOM 节点传递给 Popup
  popup.setDOMContent(popupContentRef.value);

  // 3. 监听原生的关闭事件，同步更新 Vue 的 v-model 状态
  popup.on('close', () => {
    emit('update:visible', false);
    emit('close');
  });

  popup.on('open', () => {
    emit('open');
  });

  // 如果初始状态为 true，则立即显示
  if (props.visible) {
    showPopup();
  }
};

// 显示 Popup
const showPopup = () => {
  // 坐标为空时不显示弹窗，避免把空值传给 MapLibre 原生 API。
  if (!popup || !mapInstance.map || !props.lngLat) {
    return;
  }

  popup.setLngLat(props.lngLat).addTo(mapInstance.map);
};

// 隐藏 Popup
const hidePopup = () => {
  if (popup && popup.isOpen()) {
    popup.remove();
  }
};

// 监听地图加载完成
watch(
  () => mapInstance.isLoaded,
  (isLoaded) => {
    if (isLoaded && !popup) {
      initPopup();
    }
  },
  { immediate: true }
);

// 监听 visible 属性的变化，控制显隐
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 业务层即使传了 visible=true，只要坐标为空，组件层也会自动兜底不显示。
      if (!props.lngLat) {
        hidePopup();
        return;
      }

      // 确保 DOM 已经更新后再显示
      nextTick(() => {
        showPopup();
      });
    } else {
      hidePopup();
    }
  }
);

// 监听坐标变化，动态移动 Popup
watch(
  () => props.lngLat,
  (newLngLat) => {
    if (!popup || !props.visible) {
      return;
    }

    // 坐标变为空时，主动隐藏弹窗，避免停留在旧坐标位置。
    if (!newLngLat) {
      hidePopup();
      return;
    }

    popup.setLngLat(newLngLat);
  },
  { deep: true }
);

onBeforeUnmount(() => {
  hidePopup();
  popup = null;
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
