<template>
  <mgl-custom-control :position="position" :noClasses="false">
    <div
      ref="controlRef"
      class="snap-control-shell"
      :class="[`snap-control-shell--${position}`]"
    >
      <button
        class="snap-control"
        :class="{ 'is-active': isActive }"
        type="button"
        :aria-label="isActive ? `关闭${label}` : `开启${label}`"
        :aria-pressed="isActive"
        :title="isActive ? `关闭${label}` : `开启${label}`"
        @click="handleToggle"
        @contextmenu="handleContextMenu"
      >
        <svg
          v-if="isActive"
          class="snap-control__icon snap-control__icon--open"
          viewBox="0 0 1024 1024"
          aria-hidden="true"
        >
          <path
            d="M563.029333 90.197333l-143.018666 139.093334a32.085333 31.957333 0 0 0 0 45.824l262.272 255.402666c53.461333 52.053333 53.461333 134.4 0 186.453334a139.690667 139.690667 0 0 1-193.706667 0l-262.229333-255.402667a32.085333 31.957333 0 0 0-44.8 0l-143.36 139.392a32.085333 31.957333 0 0 0 0 45.568l262.570666 255.402667c93.269333 90.666667 201.472 126.72 303.061334 120.917333 101.546667-5.845333 195.882667-52.138667 266.581333-120.917333 70.698667-68.821333 118.186667-160.853333 124.16-260.352 5.973333-99.413333-30.933333-205.312-124.16-296.021334l-206.08-200.32-56.490667-55.04a32.085333 31.957333 0 0 0-44.8 0z m22.570667 67.370667l33.962667 33.237333 205.738666 200.32c81.749333 79.530667 110.250667 165.034667 105.344 246.485334-4.906667 81.408-44.544 159.872-105.045333 218.752-60.501333 58.88-141.184 97.664-225.493333 102.485333-84.309333 4.821333-172.8-22.912-254.549334-102.485333L106.453333 623.786667l97.322667-94.762667 240.042667 233.557333c78.208 76.117333 205.013333 76.117333 283.264 0a193.749333 193.749333 0 0 0 0-277.888l-238.805334-232.32z"
            fill="currentColor"
          />
          <path
            d="M142.933333 0.64a32.042667 31.957333 0 0 0-32.128 32v229.845333a32.085333 31.957333 0 0 0 46.037334 28.586667L245.76 248.064v178.773333a32.042667 31.957333 0 0 0 31.786667 31.701334 32.042667 31.957333 0 0 0 32.128-31.701334V196.949333a32.085333 31.957333 0 0 0-45.994667-28.928L174.762667 211.413333V32.64a32.042667 31.957333 0 0 0-31.829334-32zM563.029333 90.197333l-143.018666 139.093334a32.085333 31.957333 0 0 0 0 45.824l143.36 139.392a32.085333 31.957333 0 0 0 44.8-0.298667l142.976-139.093333a32.085333 31.957333 0 0 0 0-45.866667l-143.36-139.093333a32.085333 31.957333 0 0 0-44.757334 0z m22.570667 67.370667l97.28 94.762667-97.28 94.464-97.28-94.464z m-404.053333 304L38.528 600.96a32.085333 31.957333 0 0 0 0 45.568l143.018667 139.392a32.085333 31.957333 0 0 0 44.8 0l143.018666-139.392a32.085333 31.957333 0 0 0 0-45.568l-143.018666-139.392a32.085333 31.957333 0 0 0-44.8 0z m22.229333 67.413333l97.28 94.762667-97.28 94.762667-96.981333-94.762667z"
            fill="currentColor"
          />
        </svg>
        <svg
          v-else
          class="snap-control__icon snap-control__icon--close"
          viewBox="0 0 1024 1024"
          aria-hidden="true"
        >
          <path
            d="M563.029333 90.154667l-143.018666 139.093333a32.085333 31.957333 0 0 0 0 45.866667l114.005333 111.061333 44.8-45.824-90.538667-88.021333 97.28-94.762667 92.373334 90.154667 44.8-45.866667-114.901334-111.701333a32.085333 31.957333 0 0 0-44.8 0z m317.269334 265.557333l-46.08 44.330667c76.458667 78.677333 102.272 162.56 96.128 242.474666-6.186667 79.872-45.781333 156.416-105.386667 214.186667-59.52 57.770667-138.410667 96.426667-221.141333 102.144-82.773333 5.717333-169.728-20.138667-250.538667-95.104l-43.52 46.805333c92.458667 85.76 198.741333 118.869333 298.368 112 99.626667-6.869333 192.042667-52.48 261.632-120.021333 69.632-67.498667 116.992-157.610667 124.501333-255.104 7.552-97.450667-26.368-201.514667-113.962666-291.712zM181.546667 461.568l-143.36 139.392a32.085333 31.957333 0 0 0 0 45.568l111.232 108.288 44.8-45.824-87.765334-85.248 97.322667-94.762667 89.6 87.04 44.8-45.525333-111.829333-108.928a32.085333 31.957333 0 0 0-44.8 0z m555.733333 33.877333l-48.213333 42.154667a128.64 128.64 0 0 1-6.826667 179.370667c-51.2 49.834667-132.906667 51.669333-186.538667 6.186666l-41.728 48.597334c78.805333 66.858667 198.144 63.701333 273.066667-9.216a193.365333 193.365333 0 0 0 10.24-267.093334zM142.933333 0.64a32.042667 31.957333 0 0 0-32.128 32v229.845333a32.085333 31.957333 0 0 0 46.037334 28.586667L245.76 248.064v178.773333a32.042667 31.957333 0 0 0 31.786667 31.701334 32.042667 31.957333 0 0 0 32.128-31.701334V196.949333a32.085333 31.957333 0 0 0-45.994667-28.928L174.72 211.413333V32.64a32.042667 31.957333 0 0 0-31.786667-32z"
            fill="currentColor"
            opacity=".5"
          />
          <path
            d="M906.538667 131.413333L74.965333 931.413333l44.458667 45.866667L951.338667 177.237333z"
            fill="currentColor"
          />
        </svg>
        <span class="snap-control__label">{{ isActive ? `关闭${label}` : `开启${label}` }}</span>
      </button>
      <div v-if="isPanelOpen" class="snap-control-panel" @click.stop @contextmenu.prevent>
        <section v-for="group in groups" :key="group.id" class="snap-control-panel__group">
          <div class="snap-control-panel__title">{{ group.label }}</div>
          <label v-for="item in group.items" :key="item.id" class="snap-control-panel__item">
            <input
              class="snap-control-panel__checkbox"
              type="checkbox"
              :checked="item.enabled"
              @change="handleItemToggle(item)"
            />
            <span class="snap-control-panel__text" :title="item.label">{{ item.label }}</span>
          </label>
        </section>
      </div>
    </div>
  </mgl-custom-control>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ControlPosition } from 'maplibre-gl';
import { MglCustomControl } from 'vue-maplibre-gl';

interface SnapPanelItem {
  id: string;
  kind: 'rule' | 'target';
  label: string;
  enabled: boolean;
}

interface SnapPanelGroup {
  id: string;
  label: string;
  items: SnapPanelItem[];
}

interface Props {
  /** 控件显示位置。 */
  position: ControlPosition;
  /** 当前吸附能力是否运行期开启。 */
  isActive: boolean;
  /** 控件可访问文本。 */
  label: string;
  /** 是否启用右键配置面板。 */
  panelEnabled: boolean;
  /** 配置面板展示的吸附目标分组。 */
  groups: SnapPanelGroup[];
  /** 控件点击后的切换回调。 */
  onToggle: () => void;
  /** 切换单条吸附规则。 */
  onToggleRule: (ruleId: string) => void;
  /** 切换插件吸附目标。 */
  onToggleTarget: (targetId: string) => void;
}

const props = defineProps<Props>();
const controlRef = ref<HTMLElement | null>(null);
const panelOpenRef = ref(false);

const isPanelOpen = computed(() => props.panelEnabled && panelOpenRef.value && props.groups.length > 0);

/**
 * 响应控件点击，切换吸附运行期状态。
 */
const handleToggle = (): void => {
  if (props.isActive) {
    closePanel();
  }

  props.onToggle();
};

const closePanel = (): void => {
  panelOpenRef.value = false;
};

const handleContextMenu = (event: MouseEvent): void => {
  if (!props.panelEnabled || !props.groups.length) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  panelOpenRef.value = !panelOpenRef.value;
};

/**
 * 根据面板项类型分发切换动作。
 * @param item 当前被切换的面板项
 */
const handleItemToggle = (item: SnapPanelItem): void => {
  if (item.kind === 'target') {
    props.onToggleTarget(item.id);
    return;
  }

  props.onToggleRule(item.id);
};

const handleDocumentPointerDown = (event: PointerEvent): void => {
  if (!panelOpenRef.value) {
    return;
  }

  const target = event.target;
  if (target instanceof Node && controlRef.value?.contains(target)) {
    return;
  }

  closePanel();
};

const handleDocumentKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    closePanel();
  }
};

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', handleDocumentKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  document.removeEventListener('keydown', handleDocumentKeyDown);
});

watch(
  () => props.isActive,
  (nextActive) => {
    if (!nextActive) {
      closePanel();
    }
  }
);
</script>

<style scoped lang="scss">
.snap-control-shell {
  position: relative;
  width: 29px;
  height: 29px;
}

.snap-control {
  position: relative;
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
    color 0.2s ease;
}

.snap-control:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.snap-control.is-active {
  color: #1f2937;
}

.snap-control__icon {
  width: 24px;
  height: 24px;
  display: block;
}

.snap-control__label {
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

.snap-control-panel {
  position: absolute;
  min-width: 168px;
  max-width: 240px;
  padding: 6px;
  color: #1f2937;
  background: #ffffff;
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.snap-control-shell--top-left .snap-control-panel,
.snap-control-shell--top-right .snap-control-panel {
  top: calc(100% + 4px);
}

.snap-control-shell--bottom-left .snap-control-panel,
.snap-control-shell--bottom-right .snap-control-panel {
  bottom: calc(100% + 4px);
}

.snap-control-shell--top-left .snap-control-panel,
.snap-control-shell--bottom-left .snap-control-panel {
  left: 0;
}

.snap-control-shell--top-right .snap-control-panel,
.snap-control-shell--bottom-right .snap-control-panel {
  right: 0;
}

.snap-control-panel__title {
  padding: 2px 6px 4px;
  font-size: 12px;
  line-height: 18px;
  color: #4b5563;
}

.snap-control-panel__group + .snap-control-panel__group {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.snap-control-panel__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}

.snap-control-panel__item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.snap-control-panel__checkbox {
  flex: 0 0 auto;
}

.snap-control-panel__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.maplibregl-ctrl:has(.snap-control-shell)) {
  position: relative;
  z-index: 3;
}
</style>
