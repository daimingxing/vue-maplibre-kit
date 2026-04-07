<template>
  <div style="display: none"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { useMap } from 'vue-maplibre-gl';
import type { Map as MaplibreMap, RasterLayerSpecification } from 'maplibre-gl';
import type { MapLayerStyle } from '../shared/map-layer-style-config';
import type { TerradrawLineDecorationStretchLayerItem } from './useTerradrawLineDecoration';

type StretchLayerCoordinates = TerradrawLineDecorationStretchLayerItem['coordinates'];

interface DestroyableImageSourceLike {
  texture?: {
    destroy?: () => void;
  } | null;
  setCoordinates?: (coordinates: StretchLayerCoordinates) => void;
  updateImage?: (options: { url: string; coordinates?: StretchLayerCoordinates }) => void;
}

const props = defineProps<{
  /** 当前 image source ID */
  sourceId: string;
  /** 当前 raster layer ID */
  layerId: string;
  /** 当前 raster layer 需要插入到哪个图层前面 */
  beforeLayerId?: string;
  /** 当前拉伸纹理地址 */
  url: string;
  /** 当前 image source 四角坐标 */
  coordinates: StretchLayerCoordinates;
  /** 当前 raster layer 样式 */
  style: MapLayerStyle<RasterLayerSpecification['layout'], RasterLayerSpecification['paint']>;
}>();

const mapInstance = useMap();
let hasBoundStyleLoad = false;
let lastAppliedUrl = '';

/**
 * 获取当前可用的 MapLibre 地图实例。
 * @returns 当前地图实例；尚未加载完成时返回 null
 */
function getMapInstance(): MaplibreMap | null {
  return mapInstance.map || null;
}

/**
 * 获取当前挂载在地图上的 image source。
 * @param map 当前地图实例
 * @returns 当前 source；不存在时返回 null
 */
function getImageSource(map: MaplibreMap): DestroyableImageSourceLike | null {
  return (map.getSource(props.sourceId) as DestroyableImageSourceLike | null) || null;
}

/**
 * 显式释放 image source 当前占用的 WebGL 纹理。
 * 之所以手动调用，是因为 MapLibre 在 updateImage 路径下只会把 texture 置空，
 * 不一定会立刻调用底层的 gl.deleteTexture。
 * @param source 当前 image source 实例
 */
function destroyImageSourceTexture(source: DestroyableImageSourceLike | null): void {
  if (!source) {
    return;
  }

  try {
    source.texture?.destroy?.();
  } catch (error) {
    console.warn('[TerradrawStretchRasterItem] 释放旧纹理失败', error);
  } finally {
    source.texture = null;
  }
}

/**
 * 确保当前 image source 已创建；若不存在则按当前 props 创建。
 * @param map 当前地图实例
 * @returns 当前可用的 image source
 */
function ensureImageSource(map: MaplibreMap): DestroyableImageSourceLike {
  const existedSource = getImageSource(map);
  if (existedSource) {
    return existedSource;
  }

  map.addSource(props.sourceId, {
    type: 'image',
    url: props.url,
    coordinates: props.coordinates,
  });
  lastAppliedUrl = props.url;

  return getImageSource(map) as DestroyableImageSourceLike;
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
 * 同步当前 image source 的 url 与 coordinates。
 * 当 url 发生变化时，先显式释放旧纹理，再走 updateImage 更新底图。
 * @param map 当前地图实例
 */
function syncImageSource(map: MaplibreMap): void {
  const imageSource = ensureImageSource(map);

  if (lastAppliedUrl !== props.url) {
    destroyImageSourceTexture(imageSource);
    imageSource.updateImage?.({
      url: props.url,
      coordinates: props.coordinates,
    });
    lastAppliedUrl = props.url;
    return;
  }

  imageSource.setCoordinates?.(props.coordinates);
}

/**
 * 按当前 props 重建整条拉伸段的 source 与 layer。
 * @param map 当前地图实例
 */
function syncStretchRasterItem(map: MaplibreMap): void {
  syncImageSource(map);
  ensureRasterLayer(map);
}

/**
 * 在样式切换后重新创建当前拉伸段的 source 与 layer。
 */
function handleMapStyleLoad(): void {
  const map = getMapInstance();
  if (!map) {
    return;
  }

  lastAppliedUrl = '';
  syncStretchRasterItem(map);
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
 * 移除当前拉伸段的 raster layer。
 * @param map 当前地图实例
 */
function removeRasterLayer(map: MaplibreMap): void {
  if (map.getLayer(props.layerId)) {
    map.removeLayer(props.layerId);
  }
}

/**
 * 移除当前拉伸段的 image source，并在移除前显式释放旧纹理。
 * @param map 当前地图实例
 */
function removeImageSource(map: MaplibreMap): void {
  const imageSource = getImageSource(map);
  destroyImageSourceTexture(imageSource);

  if (map.getSource(props.sourceId)) {
    map.removeSource(props.sourceId);
  }

  lastAppliedUrl = '';
}

/**
 * 清理当前拉伸段在地图上的全部资源。
 */
function cleanupStretchRasterItem(): void {
  const map = getMapInstance();
  if (!map) {
    return;
  }

  removeRasterLayer(map);
  removeImageSource(map);
}

watch(
  () => mapInstance.isLoaded,
  (isLoaded) => {
    const map = getMapInstance();
    if (!isLoaded || !map) {
      return;
    }

    bindMapStyleLoad(map);
    syncStretchRasterItem(map);
  },
  { immediate: true }
);

watch(
  () => props.url,
  () => {
    const map = getMapInstance();
    if (!map) {
      return;
    }

    syncImageSource(map);
  }
);

watch(
  () => props.coordinates,
  () => {
    const map = getMapInstance();
    if (!map) {
      return;
    }

    syncImageSource(map);
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

  cleanupStretchRasterItem();
});
</script>
