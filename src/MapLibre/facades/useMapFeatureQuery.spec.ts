import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type { MapPluginHostExpose } from '../plugins/types';
import type {
  MapLayerInteractiveContext,
  MapLayerSelectedFeature,
  MapLayerSelectionChangeContext,
  TerradrawFeature,
} from '../shared/mapLibre-controls-types';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../shared/map-common-tools';
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  type MapBusinessSource,
} from './createMapBusinessSource';
import { useMapFeatureQuery } from './useMapFeatureQuery';

/**
 * 创建测试用点要素。
 * @param id 要素 ID
 * @param properties 业务属性
 * @returns 标准点要素
 */
function createPointFeature(
  id: string,
  properties: Record<string, unknown> = {}
): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      ...properties,
    },
    geometry: {
      type: 'Point',
      coordinates: [120, 30],
    },
  };
}

/**
 * 创建测试用线要素。
 * @param id 要素 ID
 * @param properties 业务属性
 * @returns 标准线要素
 */
function createLineFeature(
  id: string,
  properties: Record<string, unknown> = {}
): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      ...properties,
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [120, 30],
        [121, 31],
      ],
    },
  };
}

/**
 * 创建测试用面要素。
 * @param id 要素 ID
 * @param properties 业务属性
 * @returns 标准面要素
 */
function createPolygonFeature(
  id: string,
  properties: Record<string, unknown> = {}
): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      ...properties,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [120, 30],
          [121, 30],
          [121, 31],
          [120, 31],
          [120, 30],
        ],
      ],
    },
  };
}

/**
 * 创建测试用要素集合。
 * @param features 要素列表
 * @returns 标准要素集合
 */
function createFeatureCollection(features: MapCommonFeature[]): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 创建测试用业务源环境。
 * @returns 业务源及注册表
 */
function createBusinessSourceHarness(): {
  source: MapBusinessSource;
  sourceRegistry: ReturnType<typeof createMapBusinessSourceRegistry>;
} {
  const source = createMapBusinessSource({
    sourceId: 'business-source',
    data: ref(
      createFeatureCollection([
        createPointFeature('feature-1', {
          name: '最新业务名称',
        }),
        createPolygonFeature('polygon-1', {
          name: '最新面要素',
        }),
      ])
    ),
    promoteId: 'id',
  });

  return {
    source,
    sourceRegistry: createMapBusinessSourceRegistry([source]),
  };
}

/**
 * 创建测试用选中项快照。
 * @param options 选中项配置
 * @returns 标准选中项记录
 */
function createSelectedFeatureRecord(options: {
  featureId: string;
  layerId: string;
  sourceId: string | null;
  sourceLayer?: string | null;
  properties?: Record<string, unknown> | null;
  snapshot?: MapCommonFeature | null;
}): MapLayerSelectedFeature {
  const {
    featureId,
    layerId,
    sourceId,
    sourceLayer = null,
    properties = null,
    snapshot = null,
  } = options;

  return {
    key: `${sourceId || 'unknown'}::${layerId}::${featureId}`,
    featureId,
    layerId,
    sourceId,
    sourceLayer,
    properties: properties as Record<string, any> | null,
    snapshot,
  };
}

/**
 * 创建测试用地图公开实例。
 * @returns 可供 useMapFeatureQuery 直接消费的公开实例
 */
function createMapExpose(): MapLibreInitExpose {
  const pluginHost: MapPluginHostExpose = {
    has: () => false,
    getApi: () => null,
    getState: () => null,
    list: () => [],
  };

  return {
    getDrawControl: () => null,
    getMeasureControl: () => null,
    getDrawFeatures: () => [] as TerradrawFeature[],
    getMeasureFeatures: () => [] as TerradrawFeature[],
    getSelectedMapFeature: () => null,
    getSelectedMapFeatureContext: () => null,
    getSelectedMapFeatureSnapshot: () => null,
    getMapSelectionService: () => null,
    getTerradrawPropertyPolicy: () => null,
    clearSelectedMapFeature: () => undefined,
    setMapFeatureState: () => true,
    plugins: pluginHost,
  };
}

describe('useMapFeatureQuery', () => {
  it('toBusinessContext 会优先解析最新业务要素并保留选择态信息', () => {
    const { sourceRegistry } = createBusinessSourceHarness();
    const featureQuery = useMapFeatureQuery({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });
    const staleFeature = createPointFeature('feature-1', {
      name: '旧快照名称',
    });
    const context = {
      feature: staleFeature as any,
      hitFeature: staleFeature as any,
      featureId: 'feature-1',
      properties: staleFeature.properties || null,
      eventType: 'click',
      layerId: 'circleLayer',
      sourceId: 'business-source',
      sourceLayer: null,
      map: {} as any,
      lngLat: {
        lng: 120,
        lat: 30,
      },
      selectionMode: 'multiple',
      isMultiSelectActive: true,
      selectedCount: 1,
      selectedFeatures: [
        createSelectedFeatureRecord({
          featureId: 'feature-1',
          layerId: 'circleLayer',
          sourceId: 'business-source',
          properties: staleFeature.properties || null,
          snapshot: staleFeature,
        }),
      ],
    } as unknown as MapLayerInteractiveContext;

    const businessContext = featureQuery.toBusinessContext(context);

    expect(businessContext.featureRef).toEqual({
      sourceId: 'business-source',
      featureId: 'feature-1',
    });
    expect(businessContext.feature?.properties?.name).toBe('最新业务名称');
    expect(businessContext.properties?.name).toBe('最新业务名称');
    expect(businessContext.featureId).toBe('feature-1');
    expect(businessContext.isPoint).toBe(true);
    expect(businessContext.isLine).toBe(false);
    expect(businessContext.selectedCount).toBe(1);
    expect(businessContext.lngLat).toEqual({
      lng: 120,
      lat: 30,
    });
  });

  it('toBusinessContext 在无法解析最新要素时会回退到原始上下文快照', () => {
    const { sourceRegistry } = createBusinessSourceHarness();
    const featureQuery = useMapFeatureQuery({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });
    const rawFeature = createLineFeature('temp-line', {
      name: '临时线要素',
    });
    const context = {
      feature: rawFeature as any,
      hitFeature: rawFeature as any,
      featureId: 'temp-line',
      properties: rawFeature.properties || null,
      eventType: 'click',
      layerId: 'lineLayer',
      sourceId: null,
      sourceLayer: null,
      map: {} as any,
      lngLat: {
        lng: 121,
        lat: 31,
      },
    } as unknown as MapLayerInteractiveContext;

    const businessContext = featureQuery.toBusinessContext(context);

    expect(businessContext.featureRef).toBeNull();
    expect(businessContext.feature?.properties?.name).toBe('临时线要素');
    expect(businessContext.properties?.name).toBe('临时线要素');
    expect(businessContext.geometryType).toBe('LineString');
    expect(businessContext.isLine).toBe(true);
    expect(businessContext.isPoint).toBe(false);
    expect(businessContext.selectedCount).toBe(0);
  });

  it('toBusinessContext 在命中面要素时会正确标记 geometryType 与 isPolygon', () => {
    const { sourceRegistry } = createBusinessSourceHarness();
    const featureQuery = useMapFeatureQuery({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });
    const staleFeature = createPolygonFeature('polygon-1', {
      name: '旧面快照',
    });
    const context = {
      feature: staleFeature as any,
      hitFeature: staleFeature as any,
      featureId: 'polygon-1',
      properties: staleFeature.properties || null,
      eventType: 'click',
      layerId: 'fillLayer',
      sourceId: 'business-source',
      sourceLayer: null,
      map: {} as any,
      lngLat: {
        lng: 120.5,
        lat: 30.5,
      },
    } as unknown as MapLayerInteractiveContext;

    const businessContext = featureQuery.toBusinessContext(context);

    expect(businessContext.feature?.properties?.name).toBe('最新面要素');
    expect(businessContext.geometryType).toBe('Polygon');
    expect(businessContext.isPolygon).toBe(true);
    expect(businessContext.isPoint).toBe(false);
    expect(businessContext.isLine).toBe(false);
  });

  it('toBusinessContext 在空白点击时会返回结构化空结果', () => {
    const { sourceRegistry } = createBusinessSourceHarness();
    const featureQuery = useMapFeatureQuery({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });

    const businessContext = featureQuery.toBusinessContext(null);

    expect(businessContext.featureRef).toBeNull();
    expect(businessContext.feature).toBeNull();
    expect(businessContext.properties).toBeNull();
    expect(businessContext.featureId).toBeNull();
    expect(businessContext.layerId).toBeNull();
    expect(businessContext.sourceId).toBeNull();
    expect(businessContext.sourceLayer).toBeNull();
    expect(businessContext.geometryType).toBeNull();
    expect(businessContext.isPoint).toBe(false);
    expect(businessContext.isLine).toBe(false);
    expect(businessContext.isPolygon).toBe(false);
    expect(businessContext.lngLat).toBeNull();
    expect(businessContext.selectedCount).toBe(0);
    expect(businessContext.selectedFeatures).toEqual([]);
  });

  it('toSelectionBusinessContext 会优先解析最新业务要素并在失败时回退到选中快照', () => {
    const { sourceRegistry } = createBusinessSourceHarness();
    const featureQuery = useMapFeatureQuery({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });
    const resolvedSnapshot = createPointFeature('feature-1', {
      name: '旧点快照',
    });
    const fallbackSnapshot = createLineFeature('fallback-line', {
      name: '线快照回退',
    });
    const selectedFeatures = [
      createSelectedFeatureRecord({
        featureId: 'feature-1',
        layerId: 'circleLayer',
        sourceId: 'business-source',
        properties: resolvedSnapshot.properties || null,
        snapshot: resolvedSnapshot,
      }),
      createSelectedFeatureRecord({
        featureId: 'fallback-line',
        layerId: 'lineLayer',
        sourceId: null,
        properties: fallbackSnapshot.properties || null,
        snapshot: fallbackSnapshot,
      }),
    ];
    const context = {
      feature: resolvedSnapshot as any,
      hitFeature: resolvedSnapshot as any,
      featureId: 'feature-1',
      properties: resolvedSnapshot.properties || null,
      eventType: 'selectionchange',
      layerId: 'circleLayer',
      sourceId: 'business-source',
      sourceLayer: null,
      map: {} as any,
      selectionMode: 'multiple',
      isMultiSelectActive: true,
      selectedFeatures,
      selectedCount: selectedFeatures.length,
      addedFeatures: [selectedFeatures[1]],
      removedFeatures: [selectedFeatures[0]],
      reason: 'click',
      getSelectedFeatureIds: () => ['feature-1', 'fallback-line'],
      getAddedFeatureIds: () => ['fallback-line'],
      getRemovedFeatureIds: () => ['feature-1'],
      getSelectedPropertyValues: () => [],
      getAddedPropertyValues: () => [],
      getRemovedPropertyValues: () => [],
    } as unknown as MapLayerSelectionChangeContext;

    const businessContext = featureQuery.toSelectionBusinessContext(context);

    expect(businessContext.reason).toBe('click');
    expect(businessContext.selectedCount).toBe(2);
    expect(businessContext.selected).toHaveLength(2);
    expect(businessContext.added).toHaveLength(1);
    expect(businessContext.removed).toHaveLength(1);
    expect(businessContext.selected[0].feature?.properties?.name).toBe('最新业务名称');
    expect(businessContext.selected[0].isPoint).toBe(true);
    expect(businessContext.added[0].feature?.properties?.name).toBe('线快照回退');
    expect(businessContext.added[0].isLine).toBe(true);
    expect(businessContext.added[0].featureRef).toBeNull();
    expect(businessContext.removed[0].featureId).toBe('feature-1');
  });
});
