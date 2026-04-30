<template>
  <section class="nggi-page">
    <MapLibreInit ref="mapRef" :map-options="kit.mapOptions" :controls="kit.controls" :plugins="plugins">
      <template #dataSource>
        <MapBusinessSourceLayers :source="kit.source" :layers="kit.layers" />
      </template>
    </MapLibreInit>
    <aside class="nggi-panel">
      <h3>NGGI11 dxf-export</h3>
      <button type="button" @click="exportAll">生成全部 DXF 文本</button>
      <button type="button" @click="downloadAll">下载全部 DXF</button>
      <button type="button" @click="exportLineOnly">生成管线 DXF 文本</button>
      <button type="button" @click="downloadLineOnly">下载管线 DXF</button>
      <p>导出中：{{ dxf.isExporting.value ? "是" : "否" }}</p>
      <p>最近文件：{{ dxf.lastFileName.value || "未导出" }}</p>
      <p>要素 / 实体：{{ dxf.lastFeatureCount.value }} / {{ dxf.lastEntityCount.value }}</p>
      <pre>{{ message }}</pre>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, ref } from "vue";
import {
  MapBusinessSourceLayers,
  MapLibreInit,
  useBusinessMap,
  type MapLibreInitExpose,
} from "vue-maplibre-kit/business";
import {
  createBusinessPlugins,
  type MapDxfExportTaskOptions,
  type MapDxfFeatureTrueColorResolver,
  type MapDxfLayerNameResolver,
  type MapDxfLayerTrueColorResolver,
} from "vue-maplibre-kit/plugins";
import { EXAMPLE_SOURCE_ID, createExampleKit } from "./nggi-example.shared";

const kit = createExampleKit("basic");
const mapRef = shallowRef<MapLibreInitExpose | null>(null);
const businessMap = useBusinessMap({ mapRef: () => mapRef.value, sourceRegistry: kit.registry });
// dxfExport 已经接入 businessMap.plugins，业务页不需要再手写 resolver。
const dxf = businessMap.plugins.dxfExport;
const message = ref("DXF 示例：先生成文本看配置，再点击下载按钮保存文件");

/**
 * 按业务要素生成 DXF 图层名。
 * @param feature 当前导出的 GeoJSON 要素
 * @param sourceId 当前要素来源 sourceId
 * @returns DXF 图层名
 */
const resolveLayerName: MapDxfLayerNameResolver = (feature, sourceId) => {
  const kind = String(feature.properties?.kind || "unknown");
  return `${sourceId}-${kind}`;
};

/**
 * 按 DXF 图层设置默认颜色。
 * @param layerName 当前 DXF 图层名
 * @returns 图层默认 TrueColor
 */
const resolveLayerColor: MapDxfLayerTrueColorResolver = (layerName) => {
  if (layerName.endsWith("-line")) {
    return "#0F766E";
  }

  if (layerName.endsWith("-point")) {
    return "#F97316";
  }

  if (layerName.endsWith("-area")) {
    return "#2563EB";
  }

  return undefined;
};

/**
 * 按单个要素覆盖颜色。
 * @param feature 当前导出的 GeoJSON 要素
 * @returns 要素级 TrueColor；返回 undefined 时沿用图层色
 */
const resolveFeatureColor: MapDxfFeatureTrueColorResolver = (feature) => {
  // line-b 用亮绿色单独覆盖，演示“同图层少数要素特殊着色”。
  return feature.properties?.id === "line-b" ? "#22C55E" : undefined;
};

const allOptions: MapDxfExportTaskOptions = {
  sourceIds: null,
  fileName: "nggi11-all.dxf",
  layerNameResolver: resolveLayerName,
  layerTrueColorResolver: resolveLayerColor,
  featureTrueColorResolver: resolveFeatureColor,
  // DXF 线宽会写入线和面边界实体，数值越大 CAD 中越粗。
  lineWidth: 2,
  // 点按圆导出比 POINT 更容易在不同 CAD 软件里直接看见。
  pointMode: "circle",
  // 点圆半径使用地图坐标单位，当前示例坐标范围下 0.003 比较醒目。
  pointRadius: 0.003,
};

const lineOnlyOptions: MapDxfExportTaskOptions = {
  sourceIds: [EXAMPLE_SOURCE_ID],
  fileName: "nggi11-line-only.dxf",
  featureFilter: (feature) => feature.properties?.kind === "line",
  layerNameResolver: () => "only-pipe-line",
  layerTrueColorResolver: () => "#DC2626",
  featureTrueColorResolver: resolveFeatureColor,
  // 特定导出把管线加粗，方便对比“全部导出”的默认线宽。
  lineWidth: 6,
};

const plugins = createBusinessPlugins({
  // sourceRegistry 放在顶层，dxfExport 会复用它读取业务 source。
  sourceRegistry: kit.registry,
  dxfExport: {
    enabled: true,
    defaults: allOptions,
    control: {
      enabled: true,
      position: "top-right",
      label: "导出全部 DXF",
    },
  },
});

/**
 * 格式化导出结果。
 * @param title 本次动作标题
 * @param result DXF 导出结果
 * @returns 面板展示文本
 */
function formatResult(
  title: string,
  result: Awaited<ReturnType<typeof dxf.exportDxf>> | null
): string {
  if (!result) {
    return "DXF 导出插件未注册";
  }

  return JSON.stringify(
    {
      title,
      fileName: result.fileName,
      sourceCount: result.sourceCount,
      featureCount: result.featureCount,
      entityCount: result.entityCount,
      warnings: result.warnings,
      resolvedOptions: dxf.getResolvedOptions(
        title.includes("管线") ? lineOnlyOptions : allOptions
      ),
      // 只截取前 12 行，避免把完整 DXF 文本刷满面板。
      preview: result.content.split("\n").slice(0, 12),
    },
    null,
    2
  );
}

/**
 * 生成全部业务 source 的 DXF 文本。
 */
async function exportAll(): Promise<void> {
  const result = await dxf.exportDxf(allOptions);
  message.value = formatResult("全部导出", result);
}

/**
 * 下载全部业务 source 的 DXF 文件。
 */
async function downloadAll(): Promise<void> {
  const result = await dxf.downloadDxf(allOptions);
  message.value = formatResult("全部下载", result);
}

/**
 * 只导出管线要素的 DXF 文本。
 */
async function exportLineOnly(): Promise<void> {
  const result = await dxf.exportDxf(lineOnlyOptions);
  message.value = formatResult("管线特定导出", result);
}

/**
 * 只下载管线要素的 DXF 文件。
 */
async function downloadLineOnly(): Promise<void> {
  const result = await dxf.downloadDxf(lineOnlyOptions);
  message.value = formatResult("管线特定下载", result);
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
  width: 320px;
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}

pre {
  overflow: auto;
  max-height: 260px;
  font-size: 12px;
}
</style>
