<template>
  <div class="app-shell">
    <aside class="app-nav">
      <h1>NGGI 示例</h1>
      <button
        v-for="item in demoList"
        :key="item.key"
        type="button"
        :class="{ active: item.key === activeKey }"
        @click="selectDemo(item.key)"
      >
        {{ item.label }}
      </button>
    </aside>
    <main class="app-main">
      <component :is="activeDemo.component" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, type Component } from "vue";
import NGGI00 from "../examples/views/NG/GI/NGGI00.vue";
import NGGI01 from "../examples/views/NG/GI/NGGI01.vue";
import NGGI02 from "../examples/views/NG/GI/NGGI02.vue";
import NGGI03 from "../examples/views/NG/GI/NGGI03.vue";
import NGGI04 from "../examples/views/NG/GI/NGGI04.vue";
import NGGI05 from "../examples/views/NG/GI/NGGI05.vue";
import NGGI06 from "../examples/views/NG/GI/NGGI06.vue";
import NGGI07 from "../examples/views/NG/GI/NGGI07.vue";
import NGGI08 from "../examples/views/NG/GI/NGGI08.vue";
import NGGI09 from "../examples/views/NG/GI/NGGI09.vue";
import NGGI10 from "../examples/views/NG/GI/NGGI10.vue";
import NGGI11 from "../examples/views/NG/GI/NGGI11.vue";

interface DemoItem {
  /** 示例唯一键。 */
  key: string;
  /** 示例按钮文本。 */
  label: string;
  /** 示例组件。 */
  component: Component;
}

const demoList: DemoItem[] = [
  { key: "NGGI00", label: "NGGI00 综合验证", component: NGGI00 },
  { key: "NGGI01", label: "NGGI01 最小地图", component: NGGI01 },
  { key: "NGGI02", label: "NGGI02 source 图层", component: NGGI02 },
  { key: "NGGI03", label: "NGGI03 图层样式", component: NGGI03 },
  { key: "NGGI04", label: "NGGI04 交互弹窗", component: NGGI04 },
  { key: "NGGI05", label: "NGGI05 属性编辑", component: NGGI05 },
  { key: "NGGI06", label: "NGGI06 插件总览", component: NGGI06 },
  { key: "NGGI07", label: "NGGI07 snap", component: NGGI07 },
  { key: "NGGI08", label: "NGGI08 line-draft", component: NGGI08 },
  { key: "NGGI09", label: "NGGI09 intersection", component: NGGI09 },
  { key: "NGGI10", label: "NGGI10 multi-select", component: NGGI10 },
  { key: "NGGI11", label: "NGGI11 dxf-export", component: NGGI11 },
];

const activeKey = shallowRef("NGGI00");
const activeDemo = computed(() => {
  return demoList.find((item) => item.key === activeKey.value) || demoList[0];
});

/**
 * 切换当前展示的示例。
 * @param key 示例唯一键
 */
function selectDemo(key: string): void {
  activeKey.value = key;
}
</script>

<style lang="scss">
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

.app-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  width: 100%;
  height: 100%;
}

.app-nav {
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  overflow: auto;
  border-right: 1px solid #d7dde5;
  background: #ffffff;

  h1 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 700;
  }

  button {
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid #d7dde5;
    border-radius: 6px;
    background: #f8fafc;
    color: #243447;
    text-align: left;
    cursor: pointer;
  }

  button.active {
    border-color: #2563eb;
    background: #e8f0ff;
    color: #1746a2;
    font-weight: 700;
  }
}

.app-main {
  min-width: 0;
  min-height: 0;
}
</style>
