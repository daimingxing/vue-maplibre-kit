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

  try {
    map.off('style.load', handleMapStyleLoad);
  } catch (error) {
    console.warn('[TerradrawStretchRasterItem] 解绑样式监听失败', error);
  }
  hasBoundStyleLoad = false;
}

/**
 * 判断地图样式对象是否仍可被安全访问。
 * MapLibre 销毁阶段会先释放内部 style，再触发子组件卸载；此时剩余图层会由地图销毁流程统一释放。
 * @param map 当前地图实例
 * @returns 当前地图样式是否仍适合执行 source/layer 清理
 */
function canAccessMapStyle(map: MaplibreMap): boolean {
  const mapState = map as MaplibreMap & {
    /** MapLibre 内部销毁标记；公开 API 没有等价字段，只在卸载兼容处理中探测。 */
    _removed?: boolean;
    /** MapLibre 内部样式对象；销毁期可能先于 Vue 子组件卸载被置空。 */
    style?: unknown;
  };

  return mapState._removed !== true && Boolean(mapState.style);
}

/**
 * 安全执行地图资源清理动作。
 * MapLibre 销毁过程中可能已经释放 style，此时 getLayer/getSource 会从内部抛错。
 * @param map 当前地图实例
 * @param action 当前清理动作
 */
function runMapCleanup(map: MaplibreMap, action: () => void): void {
  if (!canAccessMapStyle(map)) {
    return;
  }

  try {
    action();
  } catch (error) {
    if (!canAccessMapStyle(map)) {
      return;
    }

    console.warn('[TerradrawStretchRasterItem] 清理地图资源失败', error);
  }
}

/**
 * 移除当前拉伸段的 raster layer。
 * @param map 当前地图实例
 */
function removeRasterLayer(map: MaplibreMap): void {
  // 切换地图或销毁过程中，宿主可能已回收掉部分地图方法，先做能力探测再清理。
  if (typeof map.getLayer !== 'function' || typeof map.removeLayer !== 'function') {
    return;
  }

  runMapCleanup(map, () => {
    if (map.getLayer(props.layerId)) {
      map.removeLayer(props.layerId);
    }
  });
}

/**
 * 移除当前拉伸段的 image source，并在移除前显式释放旧纹理。
 * @param map 当前地图实例
 */
function removeImageSource(map: MaplibreMap): void {
  // 与 raster layer 同步，卸载阶段地图对象可能已不完整，需先确认 source 能力仍可用。
  if (typeof map.getSource !== 'function' || typeof map.removeSource !== 'function') {
    return;
  }

  runMapCleanup(map, () => {
    const imageSource = getImageSource(map);
    destroyImageSourceTexture(imageSource);

    if (map.getSource(props.sourceId)) {
      map.removeSource(props.sourceId);
    }
  });

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
