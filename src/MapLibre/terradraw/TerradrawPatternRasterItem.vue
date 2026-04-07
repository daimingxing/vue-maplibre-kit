<template>
  <div style="display: none"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { useMap } from 'vue-maplibre-gl';
import type { Map as MaplibreMap, RasterLayerSpecification } from 'maplibre-gl';
import type { MapLayerStyle } from '../shared/map-layer-style-config';
import type { TerradrawLineDecorationPatternRasterItem } from './useTerradrawLineDecoration';

type PatternRasterCoordinates = TerradrawLineDecorationPatternRasterItem['coordinates'];

interface DestroyableCanvasSourceLike {
  texture?: {
    destroy?: () => void;
  } | null;
  setCoordinates?: (coordinates: PatternRasterCoordinates) => void;
  play?: () => void;
  pause?: () => void;
}

const props = defineProps<{
  /** 当前 canvas source ID */
  sourceId: string;
  /** 当前 raster layer ID */
  layerId: string;
  /** 当前 raster layer 需要插入到哪个图层前面 */
  beforeLayerId?: string;
  /** 当前离散纹理段使用的纹理图片对象 */
  image: HTMLImageElement;
  /** 当前 canvas source 四角坐标 */
  coordinates: PatternRasterCoordinates;
  /** 当前离屏 canvas 宽度 */
  canvasWidth: number;
  /** 当前离屏 canvas 高度 */
  canvasHeight: number;
  /** 当前单个纹理单元在 canvas 中的宽度 */
  unitCanvasWidth: number;
  /** 当前起始相位在 canvas 中的偏移量 */
  phaseCanvasOffset: number;
  /** 当前 raster layer 样式 */
  style: MapLayerStyle<RasterLayerSpecification['layout'], RasterLayerSpecification['paint']>;
}>();

const mapInstance = useMap();
let canvasElement: HTMLCanvasElement | null = null;
let hasBoundStyleLoad = false;
let pauseFrameId: number | null = null;

/**
 * 获取当前可用的 MapLibre 地图实例。
 * @returns 当前地图实例；尚未加载完成时返回 null
 */
function getMapInstance(): MaplibreMap | null {
  return mapInstance.map || null;
}

/**
 * 获取当前离散纹理段对应的离屏 canvas。
 * @returns 当前可复用的离屏 canvas 实例
 */
function getCanvasElement(): HTMLCanvasElement {
  if (!canvasElement) {
    canvasElement = document.createElement('canvas');
  }

  return canvasElement;
}

/**
 * 获取当前挂载在地图上的 canvas source。
 * @param map 当前地图实例
 * @returns 当前 source；不存在时返回 null
 */
function getCanvasSource(map: MaplibreMap): DestroyableCanvasSourceLike | null {
  return (map.getSource(props.sourceId) as DestroyableCanvasSourceLike | null) || null;
}

/**
 * 显式释放 canvas source 当前占用的 WebGL 纹理。
 * @param source 当前 canvas source 实例
 */
function destroyCanvasSourceTexture(source: DestroyableCanvasSourceLike | null): void {
  if (!source) {
    return;
  }

  try {
    source.texture?.destroy?.();
  } catch (error) {
    console.warn('[TerradrawPatternRasterItem] 释放旧纹理失败', error);
  } finally {
    source.texture = null;
  }
}

/**
 * 取消当前已排队的单次纹理刷新收尾帧。
 */
function cancelPauseFrame(): void {
  if (pauseFrameId === null) {
    return;
  }

  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(pauseFrameId);
  } else {
    globalThis.clearTimeout(pauseFrameId);
  }

  pauseFrameId = null;
}

/**
 * 重绘当前离散纹理段的离屏 canvas 内容。
 * 该实现会按统一单元宽度连续平铺纹理，并使用起始相位保证跨 segment 的视觉连续性。
 */
function redrawPatternCanvas(): void {
  const canvas = getCanvasElement();
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('创建 line-pattern 离屏 canvas 失败：浏览器不支持 2D canvas 上下文');
  }

  const nextCanvasWidth = Math.max(1, Math.ceil(props.canvasWidth));
  const nextCanvasHeight = Math.max(1, Math.ceil(props.canvasHeight));
  const unitCanvasWidth = Math.max(1, props.unitCanvasWidth);
  const phaseCanvasOffset = Math.max(0, props.phaseCanvasOffset);

  if (canvas.width !== nextCanvasWidth) {
    canvas.width = nextCanvasWidth;
  }
  if (canvas.height !== nextCanvasHeight) {
    canvas.height = nextCanvasHeight;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;

  for (let drawX = -phaseCanvasOffset; drawX < canvas.width; drawX += unitCanvasWidth) {
    context.drawImage(props.image, drawX, 0, unitCanvasWidth, canvas.height);
  }
}

/**
 * 确保当前 canvas source 已创建；若不存在则按当前 props 创建。
 * @param map 当前地图实例
 * @returns 当前可用的 canvas source
 */
function ensureCanvasSource(map: MaplibreMap): DestroyableCanvasSourceLike {
  const existedSource = getCanvasSource(map);
  if (existedSource) {
    return existedSource;
  }

  map.addSource(props.sourceId, {
    type: 'canvas',
    canvas: getCanvasElement(),
    animate: false,
    coordinates: props.coordinates,
  });

  return getCanvasSource(map) as DestroyableCanvasSourceLike;
}

/**
 * 确保当前 raster layer 已创建；若已存在则按最新样式覆写。
 * @param map 当前地图实例
 */
function ensureRasterLayer(map: MaplibreMap): void {
  if (map.getLayer(props.layerId)) {
    map.removeLayer(props.layerId);
  }

  map.addLayer(
    {
      id: props.layerId,
      type: 'raster',
      source: props.sourceId,
      layout: props.style.layout,
      paint: props.style.paint,
    },
    props.beforeLayerId
  );
}

/**
 * 触发 canvas source 对当前画布内容做一次性纹理上传。
 * 这里通过 play -> 下一帧 pause 的方式，只刷新一帧，不开启持续动画。
 * @param map 当前地图实例
 * @param source 当前 canvas source 实例
 */
function refreshCanvasSourceTexture(
  map: MaplibreMap,
  source: DestroyableCanvasSourceLike | null
): void {
  if (!source?.play || !source.pause) {
    map.triggerRepaint();
    return;
  }

  cancelPauseFrame();
  source.play();
  map.triggerRepaint();

  const finalizePause = () => {
    source.pause?.();
    pauseFrameId = null;
  };

  if (typeof globalThis.requestAnimationFrame === 'function') {
    pauseFrameId = globalThis.requestAnimationFrame(finalizePause);
    return;
  }

  pauseFrameId = globalThis.setTimeout(finalizePause, 16) as unknown as number;
}

/**
 * 同步当前 canvas source 的坐标与离屏 canvas 内容。
 * @param map 当前地图实例
 */
function syncCanvasSource(map: MaplibreMap): void {
  redrawPatternCanvas();

  const canvasSource = ensureCanvasSource(map);
  canvasSource.setCoordinates?.(props.coordinates);
  refreshCanvasSourceTexture(map, canvasSource);
}

/**
 * 按当前 props 重建整条离散纹理段的 source 与 layer。
 * @param map 当前地图实例
 */
function syncPatternRasterItem(map: MaplibreMap): void {
  syncCanvasSource(map);
  ensureRasterLayer(map);
}

/**
 * 在样式切换后重新创建当前离散纹理段的 source 与 layer。
 */
function handleMapStyleLoad(): void {
  const map = getMapInstance();
  if (!map) {
    return;
  }

  syncPatternRasterItem(map);
}

/**
 * 绑定地图样式重建监听。
 * @param map 当前地图实例
 */
function bindMapStyleLoad(map: MaplibreMap): void {
  if (hasBoundStyleLoad) {
    return;
  }

  map.on('style.load', handleMapStyleLoad);
  hasBoundStyleLoad = true;
}

/**
 * 解绑地图样式重建监听。
 * @param map 当前地图实例
 */
function unbindMapStyleLoad(map: MaplibreMap): void {
  if (!hasBoundStyleLoad) {
    return;
  }

  map.off('style.load', handleMapStyleLoad);
  hasBoundStyleLoad = false;
}

/**
 * 移除当前离散纹理段的 raster layer。
 * @param map 当前地图实例
 */
function removeRasterLayer(map: MaplibreMap): void {
  if (map.getLayer(props.layerId)) {
    map.removeLayer(props.layerId);
  }
}

/**
 * 移除当前离散纹理段的 canvas source，并在移除前显式释放旧纹理。
 * @param map 当前地图实例
 */
function removeCanvasSource(map: MaplibreMap): void {
  const canvasSource = getCanvasSource(map);
  destroyCanvasSourceTexture(canvasSource);

  if (map.getSource(props.sourceId)) {
    map.removeSource(props.sourceId);
  }
}

/**
 * 清理当前离散纹理段在地图上的全部资源。
 */
function cleanupPatternRasterItem(): void {
  const map = getMapInstance();
  if (!map) {
    return;
  }

  cancelPauseFrame();
  removeRasterLayer(map);
  removeCanvasSource(map);
}

watch(
  () => mapInstance.isLoaded,
  (isLoaded) => {
    const map = getMapInstance();
    if (!isLoaded || !map) {
      return;
    }

    bindMapStyleLoad(map);
    syncPatternRasterItem(map);
  },
  { immediate: true }
);

watch(
  () => [
    props.image,
    props.canvasWidth,
    props.canvasHeight,
    props.unitCanvasWidth,
    props.phaseCanvasOffset,
  ],
  () => {
    const map = getMapInstance();
    if (!map) {
      return;
    }

    syncCanvasSource(map);
  }
);

watch(
  () => props.coordinates,
  () => {
    const map = getMapInstance();
    if (!map) {
      return;
    }

    syncCanvasSource(map);
  },
  { deep: true }
);

watch(
  () => [
    props.style.layout?.visibility,
    props.style.paint?.['raster-opacity'],
    props.style.paint?.['raster-fade-duration'],
  ],
  () => {
    const map = getMapInstance();
    if (!map) {
      return;
    }

    ensureRasterLayer(map);
  },
  { deep: false }
);

onBeforeUnmount(() => {
  const map = getMapInstance();
  if (map) {
    unbindMapStyleLoad(map);
  }

  cleanupPatternRasterItem();
});
</script>
