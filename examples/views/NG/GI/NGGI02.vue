<template>
  <section class="nggi-page">
    <MapLibreInit :map-options="kit.mapOptions" :controls="kit.controls">
      <template #dataSource>
        <MapBusinessSourceLayers
          v-for="source in kit.registry.listSources()"
          :key="source.sourceId"
          :source="source"
          :layers="source.getLayers()"
        />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI02 source + 图层 + 响应式增删改</h3>
      <button type="button" @click="addPoint">新增点</button>
      <button type="button" @click="renameFirst">改名</button>
      <button type="button" @click="removeLast">删除末尾</button>
      <button type="button" @click="addRuntimeSource">动态新增 source</button>
      <button type="button" @click="addRuntimeLayer">动态新增 layer</button>
      <p>当前要素数：{{ kit.sourceData.value.features.length }}</p>
      <p>动态 source：{{ sourceMessage }}</p>
      <p>动态 layer：{{ layerMessage }}</p>
      <div class="property-list">
        <h4>要素属性</h4>
        <dl v-for="feature in featureItems" :key="feature.id">
          <dt>{{ feature.name }}</dt>
          <dd>ID：{{ feature.id }}</dd>
          <dd>类型：{{ feature.kind }}</dd>
          <dd>状态：{{ feature.status }}</dd>
        </dl>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import {
  createLayerGroup,
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  createSimpleCircleStyle,
  MapBusinessSourceLayers,
  MapLibreInit,
  type MapBusinessLayerDescriptor,
  type MapBusinessSource,
  type MapCommonFeatureCollection,
} from "vue-maplibre-kit/business";
import {
  EXAMPLE_SOURCE_ID,
  createExampleControls,
  createExampleLayers,
  createExampleMapOptions,
  createMixedData,
  createPointFeature,
} from "./nggi-example.shared";

const RUNTIME_SOURCE_ID = "nggi02-runtime-source";
const RUNTIME_LAYER_ID = `${EXAMPLE_SOURCE_ID}-runtime-point`;

/**
 * 创建支持动态 source 和动态 layer 的示例组合。
 * @returns 示例页面可直接使用的 source、注册表与响应式图层状态
 */
function createDynamicKit() {
  const sourceData = ref(createMixedData());
  const layers = shallowRef<MapBusinessLayerDescriptor[]>(
    createExampleLayers(),
  );
  const source = createMapBusinessSource({
    sourceId: EXAMPLE_SOURCE_ID,
    data: sourceData,
    promoteId: "id",
    // 这里必须传入 shallowRef 本身，source.getLayers() 才能读到后续替换后的图层数组。
    layers,
  });
  const registry = createMapBusinessSourceRegistry();
  registry.addSource(source);

  return {
    mapOptions: createExampleMapOptions(),
    controls: createExampleControls("basic"),
    layers,
    sourceData,
    source,
    registry,
  };
}

const kit = createDynamicKit();
const sourceMessage = ref("尚未添加");
const layerMessage = ref("尚未添加");

// 这是动态 source 使用的数据；它独立于主业务 source，便于观察 registry.addSource 后的渲染结果。
const runtimeData: MapCommonFeatureCollection = {
  type: "FeatureCollection",
  features: [createPointFeature("runtime-point-a", "命令式点 A", 1.6, -1.35)],
};

// 右侧属性列表直接读取响应式 sourceData，改名后能马上看见真实数据变化。
const featureItems = computed(() =>
  kit.sourceData.value.features.map((feature) => ({
    id: String(feature.properties?.id || feature.id || "未知"),
    name: String(feature.properties?.name || "未命名"),
    kind: String(feature.properties?.kind || "未知"),
    status: String(feature.properties?.status || "未知"),
  })),
);

/**
 * 新增一个响应式点要素。
 */
function addPoint(): void {
  const count = kit.sourceData.value.features.length;
  const nextFeature = createPointFeature(
    `point-new-${count}`,
    `新增点 ${count}`,
    0.6,
    -1.4,
  );
  // 正式业务数据推荐由业务层维护响应式数组，而不是让地图组件偷偷接管数据。
  kit.sourceData.value = {
    ...kit.sourceData.value,
    features: [...kit.sourceData.value.features, nextFeature],
  };
}

/**
 * 修改第一个要素名称。
 */
function renameFirst(): void {
  const firstFeature = kit.sourceData.value.features[0];
  if (!firstFeature?.properties?.id) {
    return;
  }

  // registry.saveProperties 会按业务 source 的 propertyPolicy 写回目标要素属性。
  kit.registry.saveProperties(kit.source.sourceId, firstFeature.properties.id, {
    name: `已响应式改名 ${new Date().toLocaleTimeString()}`,
  });
}

/**
 * 删除最后一个要素。
 */
function removeLast(): void {
  // replaceFeatures 会替换整个 features 数组，适合删除、排序、批量刷新这类操作。
  kit.source.replaceFeatures(kit.sourceData.value.features.slice(0, -1));
}

/**
 * 创建动态新增 source 使用的业务 source。
 * @returns 可注册到当前 registry 的业务 source
 */
function createRuntimeSource(): MapBusinessSource {
  const data = ref(runtimeData);
  const layers = createLayerGroup({
    sourceId: RUNTIME_SOURCE_ID,
    layers: [
      {
        type: "circle",
        id: "point",
        geometryTypes: ["Point", "MultiPoint"],
        style: createSimpleCircleStyle({
          color: "#0ea5e9",
          radius: 10,
          strokeColor: "#0f172a",
          strokeWidth: 2,
        }),
      },
    ],
  });

  return createMapBusinessSource({
    sourceId: RUNTIME_SOURCE_ID,
    data,
    promoteId: "id",
    layers,
  });
}

/**
 * 通过 registry 动态新增一个业务 source。
 */
function addRuntimeSource(): void {
  if (kit.registry.getSource(RUNTIME_SOURCE_ID)) {
    sourceMessage.value = "动态 source 已存在";
    return;
  }

  kit.registry.addSource(createRuntimeSource());
  sourceMessage.value = "动态 source 已添加";
}

/**
 * 通过替换主 source 的 layers 数组动态新增图层。
 */
function addRuntimeLayer(): void {
  if (kit.layers.value.some((layer) => layer.layerId === RUNTIME_LAYER_ID)) {
    layerMessage.value = "动态 layer 已存在";
    return;
  }

  const nextLayers = createLayerGroup({
    sourceId: EXAMPLE_SOURCE_ID,
    layers: [
      {
        type: "circle",
        id: "runtime-point",
        geometryTypes: ["Point", "MultiPoint"],
        where: {
          kind: "point",
        },
        style: createSimpleCircleStyle({
          color: "#22c55e",
          radius: 12,
          opacity: 0.55,
          strokeColor: "#14532d",
          strokeWidth: 2,
        }),
      },
    ],
  });

  kit.layers.value = [...kit.layers.value, ...nextLayers];
  layerMessage.value = "动态 layer 已添加";
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
  width: 280px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}

.property-list {
  overflow: auto;
  max-height: 320px;
}

.property-list h4 {
  margin: 4px 0;
}

.property-list dl {
  margin: 0;
  padding: 8px 0;
  border-top: 1px solid #e5e7eb;
}

.property-list dt {
  font-weight: 700;
}

.property-list dd {
  margin: 2px 0 0;
  font-size: 12px;
}
</style>
