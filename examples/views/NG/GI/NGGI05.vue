<template>
  <section class="nggi-page">
    <MapLibreInit
      ref="mapRef"
      :map-options="kit.mapOptions"
      :controls="kit.controls"
      :map-interactive="interactive"
    >
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI05 属性编辑/propertyPolicy</h3>
      <p>{{ message }}</p>
      <p>当前要素：{{ targetTitle }}</p>
      <label>
        name
        <input v-model="editName" type="text" />
      </label>
      <button type="button" :disabled="!currentTarget" @click="saveName">保存当前要素 name</button>
      <button type="button" :disabled="!currentTarget" @click="removeEditable">
        删除当前要素 editable
      </button>
      <section>
        <h4>点击要素的属性</h4>
        <dl v-for="item in panelItems" :key="item.key">
          <dt>{{ item.key }}</dt>
          <dd>值：{{ String(item.value) }}</dd>
          <dd>可编辑：{{ item.editable ? "是" : "否" }}</dd>
          <dd>可删除：{{ item.removable ? "是" : "否" }}</dd>
        </dl>
        <pre>{{ rawText }}</pre>
      </section>
      <section>
        <h4>本例 propertyPolicy</h4>
        <pre>{{ policyText }}</pre>
      </section>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  useBusinessMap,
  type MapFeaturePropertyEditorTarget,
  type MapFeaturePropertyPolicy,
  type MapLayerInteractiveContext,
  type MapLayerInteractiveOptions,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import {
  EXAMPLE_FILL_LAYER_ID,
  EXAMPLE_LINE_LAYER_ID,
  EXAMPLE_POINT_LAYER_ID,
  createExampleLayers,
  createExampleMapOptions,
  createExampleControls,
  createExampleSourceKit,
  createMixedData,
} from "./nggi-example.shared";

// propertyPolicy 是“字段规则声明”，它只描述哪些字段可见、可改、可删。
// 要素 properties 是“真实业务数据”，两者在示例面板中分开展示，降低初学者混淆概率。
const policy: MapFeaturePropertyPolicy = {
  readonlyKeys: ["id"],
  fixedKeys: ["name", "status"],
  removableKeys: ["editable"],
};

// sourceData 模拟外部业务项目自己维护的响应式 GeoJSON 数据。
// 封装层只消费这个 ref，不接管业务数据所有权。
const sourceData = ref(createMixedData());
const layers = createExampleLayers();
const sourceKit = createExampleSourceKit(sourceData, layers, policy);
const kit = {
  mapOptions: createExampleMapOptions(),
  controls: createExampleControls("basic"),
  layers,
  source: sourceKit.source,
  registry: sourceKit.registry,
};
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const currentTarget = ref<MapFeaturePropertyEditorTarget | null>(null);
const message = ref("点击任意点、线、面要素后，再编辑该要素属性");
const editName = ref("属性已保存");

const editorState = computed(() => {
  return businessMap.editor.resolveEditorState(currentTarget.value);
});

const panelItems = computed(() => editorState.value.panelState.items);
const rawText = computed(() => JSON.stringify(editorState.value.rawProperties, null, 2));
const policyText = computed(() => JSON.stringify(policy, null, 2));
const targetTitle = computed(() => {
  const featureRef = currentTarget.value?.type === "map" ? currentTarget.value.featureRef : null;
  if (!featureRef) {
    return "尚未点击要素";
  }

  return `${String(featureRef.featureId)} / ${featureRef.layerId || "未知图层"}`;
});

const interactive: MapLayerInteractiveOptions = {
  enabled: true,
  layers: {
    [EXAMPLE_POINT_LAYER_ID]: {
      // 点通常是最小目标，点线面重叠时优先命中点，属性编辑更符合直觉。
      hitPriority: 30,
    },
    [EXAMPLE_LINE_LAYER_ID]: {
      // 线优先级排在点之后、面之前，避免点击管线时被底下面图层抢走。
      hitPriority: 20,
    },
    [EXAMPLE_FILL_LAYER_ID]: {
      // 面作为范围底图优先级最低，只有没命中点线时才编辑面属性。
      hitPriority: 10,
    },
  },
  onClick: (context) => {
    selectFeature(context);
  },
  onBlankClick: () => {
    currentTarget.value = null;
    message.value = "已点击空白区域，当前没有编辑目标";
  },
};

/**
 * 把地图点击上下文转换成属性编辑目标。
 * 这一步同时演示“如何查找要素”：
 * 1. `toBusinessContext` 把原始事件上下文转成业务友好的 featureRef
 * 2. `resolveFeature(featureRef)` 再按 featureRef 回到 source 中查最新要素
 *
 * @param context 地图点击上下文
 */
function selectFeature(context: MapLayerInteractiveContext): void {
  const businessContext = businessMap.feature.toBusinessContext(context);
  if (!businessContext.featureRef || businessContext.featureId === null) {
    currentTarget.value = null;
    message.value = "没有命中可编辑要素";
    return;
  }

  const latestFeature = businessMap.feature.resolveFeature(businessContext.featureRef);
  currentTarget.value = {
    type: "map",
    featureRef: businessContext.featureRef,
  };
  editName.value = String(latestFeature?.properties?.name || businessContext.properties?.name || "");
  message.value = `已查找到要素：${String(businessContext.featureId)}`;
}

/**
 * 保存当前点击要素的 name 属性。
 * 业务层不需要自己判断点、线、面；只要传当前 featureRef，门面会回到正确 source 写入。
 */
function saveName(): void {
  if (!currentTarget.value) {
    message.value = "请先点击一个要素";
    return;
  }

  const result = businessMap.editor.saveItem(currentTarget.value, {
    key: "name",
    value: editName.value,
  });
  message.value = result.message;
}

/**
 * 删除当前点击要素的 editable 属性。
 * editable 被放进 policy.removableKeys 后才允许删除；id/name/status 会被规则保护。
 */
function removeEditable(): void {
  if (!currentTarget.value) {
    message.value = "请先点击一个要素";
    return;
  }

  const result = businessMap.editor.removeItem(currentTarget.value, "editable");
  message.value = result.message;
}
</script>

<style scoped>
.nggi-page {
  position: relative;
  height: 100vh;
}

.nggi-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
  display: grid;
  gap: 8px;
  width: 360px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}

label {
  display: grid;
  gap: 4px;
  font-size: 12px;
}

input {
  min-width: 0;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

h4 {
  margin: 6px 0 2px;
}

dl {
  margin: 0;
  padding: 6px 0;
  border-top: 1px solid #e5e7eb;
}

dt {
  font-weight: 700;
}

dd {
  margin: 2px 0 0;
  font-size: 12px;
}

pre {
  overflow: auto;
  max-height: 160px;
  font-size: 12px;
}
</style>
