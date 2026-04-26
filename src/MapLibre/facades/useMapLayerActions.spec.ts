import { shallowRef } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useMapLayerActions } from './useMapLayerActions';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';

/**
 * 创建只包含图层动作测试所需字段的地图公开实例。
 * @param rawMap 原生地图替身
 * @param setMapFeatureState feature-state 写入替身
 * @returns 地图公开实例
 */
function createMapExpose(
  rawMap: Record<string, unknown> | null,
  setMapFeatureState = vi.fn(() => true)
): MapLibreInitExpose {
  return {
    rawHandles: {
      map: rawMap,
      mapInstance: {} as any,
      drawControl: null,
      measureControl: null,
    },
    getDrawControl: () => null,
    getMeasureControl: () => null,
    getDrawFeatures: () => null,
    getMeasureFeatures: () => null,
    getSelectedMapFeature: () => null,
    getSelectedMapFeatureContext: () => null,
    getSelectedMapFeatureSnapshot: () => null,
    getMapSelectionService: () => null,
    getTerradrawPropertyPolicy: () => null,
    clearSelectedMapFeature: () => undefined,
    setMapFeatureState,
    plugins: {
      list: () => [],
      has: () => false,
      getApi: () => null,
      getState: () => null,
      resolveSelectedFeatureContext: () => null,
      resolveSelectedFeatureSnapshot: () => null,
    },
  } as unknown as MapLibreInitExpose;
}

describe('useMapLayerActions', () => {
  it('应支持运行时添加和移除 GeoJSON source 与图层', () => {
    const layerStore = new Set<string>();
    const sourceStore = new Set<string>();
    const rawMap = {
      getLayer: vi.fn((layerId: string) => (layerStore.has(layerId) ? { id: layerId } : null)),
      getSource: vi.fn((sourceId: string) => (sourceStore.has(sourceId) ? { id: sourceId } : null)),
      addSource: vi.fn((sourceId: string) => {
        sourceStore.add(sourceId);
      }),
      addLayer: vi.fn((layer: { id: string }) => {
        layerStore.add(layer.id);
      }),
      removeLayer: vi.fn((layerId: string) => {
        layerStore.delete(layerId);
      }),
      removeSource: vi.fn((sourceId: string) => {
        sourceStore.delete(sourceId);
      }),
      setLayoutProperty: vi.fn(),
      setPaintProperty: vi.fn(),
    };
    const actions = useMapLayerActions(shallowRef(createMapExpose(rawMap)));
    const data = {
      type: 'FeatureCollection',
      features: [],
    };

    const addSourceResult = actions.addGeoJsonSource('runtime-source', data);
    const missingTypeResult = actions.addLayer({
      id: 'missing-type-layer',
      source: 'runtime-source',
    });
    const missingSourceResult = actions.addLayer({
      id: 'missing-source-layer',
      type: 'circle',
    });
    const unknownSourceResult = actions.addLayer({
      id: 'unknown-source-layer',
      type: 'circle',
      source: 'unknown-source',
    });
    const addLayerResult = actions.addLayer({
      id: 'runtime-layer',
      type: 'circle',
      source: 'runtime-source',
    });
    const duplicateSourceResult = actions.addGeoJsonSource('runtime-source', data);
    const removeLayerResult = actions.removeLayer('runtime-layer');
    const removeSourceResult = actions.removeSource('runtime-source');

    expect(addSourceResult.success).toBe(true);
    expect(missingTypeResult.success).toBe(false);
    expect(missingSourceResult.success).toBe(false);
    expect(unknownSourceResult.success).toBe(false);
    expect(addLayerResult.success).toBe(true);
    expect(duplicateSourceResult.success).toBe(false);
    expect(removeLayerResult.success).toBe(true);
    expect(removeSourceResult.success).toBe(true);
    expect(rawMap.addSource).toHaveBeenCalledWith('runtime-source', {
      type: 'geojson',
      data,
    });
    expect(rawMap.addLayer).toHaveBeenCalledWith({
      id: 'runtime-layer',
      type: 'circle',
      source: 'runtime-source',
    });
  });

  it('应在地图或目标不存在时返回安全失败结果', () => {
    const actions = useMapLayerActions(shallowRef(createMapExpose(null)));

    expect(actions.hide('missing-layer').success).toBe(false);
    expect(actions.addLayer({ type: 'circle' }).success).toBe(false);
    expect(actions.removeSource('missing-source').success).toBe(false);
  });

  it('应支持图层显隐、样式和 feature-state 动作', () => {
    const setMapFeatureState = vi.fn(() => false);
    const rawMap = {
      getLayer: vi.fn((layerId: string) => (layerId === 'line-layer' ? { id: layerId } : null)),
      getSource: vi.fn(),
      setLayoutProperty: vi.fn(),
      setPaintProperty: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
    };
    const actions = useMapLayerActions(shallowRef(createMapExpose(rawMap, setMapFeatureState)));

    expect(actions.hide('line-layer').success).toBe(true);
    expect(actions.setLayout('line-layer', { 'line-cap': 'round' }).success).toBe(true);
    expect(actions.setPaint('line-layer', { 'line-color': '#f97316' }).success).toBe(true);
    expect(actions.setFeatureState('source-a', 'feature-a', { active: true }).success).toBe(false);
    expect(rawMap.setLayoutProperty).toHaveBeenCalledWith('line-layer', 'visibility', 'none');
    expect(rawMap.setLayoutProperty).toHaveBeenCalledWith('line-layer', 'line-cap', 'round');
    expect(rawMap.setPaintProperty).toHaveBeenCalledWith('line-layer', 'line-color', '#f97316');
    expect(setMapFeatureState).toHaveBeenCalledWith(
      {
        source: 'source-a',
        id: 'feature-a',
        sourceLayer: undefined,
      },
      { active: true }
    );
  });
});
