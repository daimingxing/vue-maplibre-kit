<template>
  <section class="nggi-page">
    <MapLibreInit ref="mapRef" :map-options="kit.mapOptions" :controls="kit.controls">
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI02 source + 图层 + 响应式增删改</h3>
      <button type="button" @click="addPoint">新增点</button>
      <button type="button" @click="renameFirst">改名</button>
      <button type="button" @click="removeLast">删除末尾</button>
      <button type="button" @click="addRuntimeLayer">命令式添加图层</button>
      <button type="button" @click="removeRuntimeLayer">命令式移除图层</button>
      <p>当前要素数：{{ kit.sourceData.value.features.length }}</p>
      <p>运行时图层：{{ runtimeMessage }}</p>
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
  MapBusinessSourceLayers,
  MapLibreInit,
  useBusinessMap,
  type MapCommonFeatureCollection,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import { createExampleKit, createPointFeature } from "./nggi-example.shared";

// createExampleKit 会一次性创建 mapOptions、controls、source、layers、registry。
// 业务页通常可以把这些内容拆到自己的 composable 中，这里放一起便于阅读。
const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
// useBusinessMap 是业务层推荐入口，运行时图层动作、要素查询、属性编辑都从这里取。
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
const runtimeMessage = ref("尚未添加");

// 运行时 source/layer 用固定 ID，方便重复点击时门面能判断“已存在”并返回提示。
const RUNTIME_SOURCE_ID = "nggi02-runtime-source";
const RUNTIME_LAYER_ID = "nggi02-runtime-point-layer";

// 这是命令式添加 source 的数据；它不进入正式业务 source 的响应式数据流。
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
  }))
);

/**
 * 新增一个响应式点要素。
 */
function addPoint(): void {
  const count = kit.sourceData.value.features.length;
  const nextFeature = createPointFeature(`point-new-${count}`, `新增点 ${count}`, 0.6, -1.4);
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
 * 使用业务图层门面命令式添加 GeoJSON source 与点图层。
 */
function addRuntimeLayer(): void {
  const sourceResult = businessMap.layers.addGeoJsonSource(RUNTIME_SOURCE_ID, runtimeData);
  if (!sourceResult.success) {
    runtimeMessage.value = sourceResult.message;
    return;
  }

  const layerResult = businessMap.layers.addLayer({
    id: RUNTIME_LAYER_ID,
    type: "circle",
    source: RUNTIME_SOURCE_ID,
    paint: {
      // 运行时图层直接使用 MapLibre paint 写法，适合临时高亮、定位点等轻量需求。
      "circle-color": "#0ea5e9",
      "circle-radius": 10,
      "circle-stroke-color": "#0f172a",
      "circle-stroke-width": 2,
    },
  });
  runtimeMessage.value = `${sourceResult.message}；${layerResult.message}`;
}

/**
 * 使用业务图层门面命令式移除运行时图层与 GeoJSON source。
 */
function removeRuntimeLayer(): void {
  const layerResult = businessMap.layers.removeLayer(RUNTIME_LAYER_ID);
  const sourceResult = businessMap.layers.removeSource(RUNTIME_SOURCE_ID);
  runtimeMessage.value = `${layerResult.message}；${sourceResult.message}`;
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
