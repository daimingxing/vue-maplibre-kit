<template>
  <mgl-geo-json-source v-bind="source.sourceProps">
    <component
      :is="layer.component"
      v-for="layer in resolvedLayers"
      :key="layer.layerId"
      v-bind="layer.layerProps"
    />
  </mgl-geo-json-source>
</template>

<script setup lang="ts">
/**
 * 轻量业务图层渲染组件。
 * 业务层只需要传入业务 source 和图层描述对象数组，
 * 组件内部会统一展开为 `MglGeoJsonSource + Mgl*Layer`。
 */
import { computed, type Component } from 'vue';
import {
  MglCircleLayer,
  MglFillLayer,
  MglGeoJsonSource,
  MglLineLayer,
  MglSymbolLayer,
} from 'vue-maplibre-gl';
import type { MapBusinessSource } from './createMapBusinessSource';
import {
  buildMapBusinessLayerFilter,
  resolveMapBusinessLayerStyle,
  type MapBusinessLayerDescriptor,
} from './mapBusinessLayer';

interface ResolvedMapBusinessLayer {
  /** 当前图层唯一标识。 */
  layerId: string;
  /** 当前图层对应的 Vue 组件。 */
  component: Component;
  /** 透传给底层图层组件的属性。 */
  layerProps: Record<string, unknown>;
}

const props = defineProps<{
  /** 当前要渲染的业务 source。 */
  source: MapBusinessSource;
  /** 当前业务 source 下需要渲染的轻量图层描述数组。 */
  layers: MapBusinessLayerDescriptor[];
}>();

/**
 * 根据图层类型解析对应的底层图层组件。
 * @param layerType 当前图层类型
 * @returns 对应的图层组件
 */
function resolveLayerComponent(layerType: MapBusinessLayerDescriptor['type']): Component {
  switch (layerType) {
    case 'circle':
      return MglCircleLayer;
    case 'line':
      return MglLineLayer;
    case 'fill':
      return MglFillLayer;
    case 'symbol':
      return MglSymbolLayer;
    default:
      return MglCircleLayer;
  }
}

/**
 * 将业务图层描述对象统一展开为底层可直接渲染的图层配置。
 * 这里会顺手补齐默认样式和组合过滤表达式。
 */
const resolvedLayers = computed<ResolvedMapBusinessLayer[]>(() => {
  return props.layers.map((layer) => {
    const style = resolveMapBusinessLayerStyle(layer);
    const filter = buildMapBusinessLayerFilter(layer);

    return {
      layerId: layer.layerId,
      component: resolveLayerComponent(layer.type),
      layerProps: {
        layerId: layer.layerId,
        layout: style.layout,
        paint: style.paint,
        ...(filter ? { filter } : {}),
        ...(layer.interactive !== undefined ? { interactive: layer.interactive } : {}),
      },
    };
  });
});
</script>
