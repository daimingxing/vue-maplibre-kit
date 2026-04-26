import { ref, shallowRef } from 'vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { FeatureProperties, MapFeatureId } from '../composables/useMapDataUpdate';
import {
  createMapLibreRawHandles,
  type MapLibreInitExpose,
} from '../core/mapLibre-init.types';
import type {
  MapLayerSelectedFeature,
  MapSelectionState,
  TerradrawFeature,
} from '../shared/mapLibre-controls-types';
import type { LineDraftPreviewPluginApi } from '../plugins/line-draft-preview/useLineDraftPreviewController';
import type { IntersectionPreviewPluginApi, IntersectionPreviewState } from '../plugins/intersection-preview';
import type {
  MapFeatureMultiSelectPluginApi,
  MapFeatureMultiSelectState,
} from '../plugins/map-feature-multi-select';
import type { MapPluginHostExpose, MapSelectionService } from '../plugins/types';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../shared/map-common-tools';
import type { MapInstance } from 'vue-maplibre-gl';
import { useBusinessMap } from './useBusinessMap';
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  type MapBusinessSource,
} from './createMapBusinessSource';
import type {
  MapBusinessLayerDescriptor as BusinessMapLayerDescriptor,
  MapBusinessSource as BusinessMapSource,
  MapBusinessSourceRegistry as BusinessMapSourceRegistry,
  MapFeatureId as BusinessMapFeatureId,
  MapFeaturePropertyPanelItem as BusinessMapFeaturePropertyPanelItem,
  MapSourceFeatureRef as BusinessMapSourceFeatureRef,
} from '../../business';

type BusinessTypeExportCheck = {
  layer: BusinessMapLayerDescriptor;
  source: BusinessMapSource;
  registry: BusinessMapSourceRegistry;
  featureId: BusinessMapFeatureId;
  featureRef: BusinessMapSourceFeatureRef;
  panelItem: BusinessMapFeaturePropertyPanelItem;
};

/** 线草稿插件类型常量。 */
const LINE_DRAFT_PREVIEW_PLUGIN_TYPE = 'lineDraftPreview';
/** 交点插件类型常量。 */
const INTERSECTION_PREVIEW_PLUGIN_TYPE = 'intersectionPreview';
/** 多选插件类型常量。 */
const MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE = 'mapFeatureMultiSelect';

/** 缺省选择态。 */
const defaultSelectionState: MapSelectionState = {
  isActive: false,
  selectionMode: 'single',
  selectedFeatures: [],
  selectedCount: 0,
  deactivateBehavior: 'clear',
};

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
 * @returns 业务源与注册表
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
          name: '原始名称',
          status: 'normal',
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
 * 创建测试用线草稿插件 API。
 * @returns 线草稿插件 API 与状态引用
 */
function createLineDraftPluginHarness(): {
  api: LineDraftPreviewPluginApi;
  state: { hasFeatures: boolean; featureCount: number };
} {
  const lineDraftState = {
    hasFeatures: true,
    featureCount: 1,
  };

  const api = {
    data: ref(createFeatureCollection([createPointFeature('draft-1', { name: '草稿' })])),
    lineStyle: ref(null),
    fillStyle: ref(null),
    getFeatureById: (featureId: MapFeatureId | null) => {
      return featureId === 'draft-1' ? createPointFeature('draft-1', { name: '草稿' }) : null;
    },
    isFeatureById: (featureId: MapFeatureId | null) => featureId === 'draft-1',
    isSelectedFeature: () => false,
    getSelectedFeatureSnapshot: () => null,
    previewLine: () => null,
    replacePreviewRegion: () => false,
    clear: () => {
      lineDraftState.hasFeatures = false;
      lineDraftState.featureCount = 0;
    },
    saveProperties: () => {
      return {
        success: true,
        target: 'map' as const,
        featureId: 'draft-1',
        properties: { id: 'draft-1', name: '草稿' },
        message: '保存成功',
        blockedKeys: [],
        removedKeys: [],
      };
    },
    removeProperties: () => {
      return {
        success: true,
        target: 'map' as const,
        featureId: 'draft-1',
        properties: { id: 'draft-1' },
        message: '删除成功',
        blockedKeys: [],
        removedKeys: ['name'],
      };
    },
  } as unknown as LineDraftPreviewPluginApi;

  return {
    api,
    state: lineDraftState,
  };
}

/**
 * 创建测试用交点插件 API。
 * @returns 交点插件 API 与状态引用
 */
function createIntersectionPluginHarness(): {
  api: IntersectionPreviewPluginApi;
  state: IntersectionPreviewState;
} {
  const state: IntersectionPreviewState = {
    visible: true,
    scope: 'all',
    count: 2,
    materializedCount: 1,
    selectedId: null,
    lastError: null,
  };

  const api = {
    refresh: () => undefined,
    clear: () => {
      state.count = 0;
      state.selectedId = null;
    },
    materialize: () => {
      state.materializedCount += 1;
      return true;
    },
    removeMaterialized: () => true,
    updateMaterializedProperties: () => true,
    clearMaterialized: () => {
      state.materializedCount = 0;
    },
    show: () => {
      state.visible = true;
    },
    hide: () => {
      state.visible = false;
    },
    setScope: (scope: 'all' | 'selected') => {
      state.scope = scope;
    },
    getData: () => createFeatureCollection([]),
    getMaterializedData: () => createFeatureCollection([]),
    getById: () => null,
    getPreviewById: () => null,
    getMaterializedById: () => null,
    getSelected: () => null,
  } as IntersectionPreviewPluginApi;

  return {
    api,
    state,
  };
}

/**
 * 创建测试用选择服务。
 * @returns 选择服务与状态引用
 */
function createSelectionServiceHarness(): {
  service: MapSelectionService;
} {
  const selectedSnapshot = createPointFeature('feature-1', {
    name: '原始名称',
  });
  const state = ref<MapSelectionState>({
    ...defaultSelectionState,
    selectedFeatures: [
      {
        key: 'business-source::circleLayer::feature-1',
        featureId: 'feature-1',
        layerId: 'circleLayer',
        sourceId: 'business-source',
        sourceLayer: null,
        properties: selectedSnapshot.properties || null,
        snapshot: selectedSnapshot,
      } as MapLayerSelectedFeature,
    ],
    selectedCount: 1,
  });

  const service: MapSelectionService = {
    state,
    getOptions: () => ({ mode: 'multiple', allowEmpty: true } as any),
    attachBinding: () => () => undefined,
    syncState: (statePatch) => {
      state.value = {
        ...state.value,
        ...statePatch,
      };
    },
    activate: () => {
      state.value = {
        ...state.value,
        isActive: true,
        selectionMode: 'multiple',
      };
    },
    deactivate: () => {
      state.value = {
        ...state.value,
        isActive: false,
        selectionMode: 'single',
      };
    },
    toggle: () => {
      if (state.value.isActive) {
        service.deactivate();
        return;
      }

      service.activate();
    },
    clear: () => {
      state.value = {
        ...state.value,
        selectedFeatures: [],
        selectedCount: 0,
      };
    },
    isActive: () => state.value.isActive,
  };

  return {
    service,
  };
}

/**
 * 创建测试用多选插件 API。
 * @returns 多选插件 API 与状态引用
 */
function createMultiSelectPluginHarness(): {
  api: MapFeatureMultiSelectPluginApi;
  state: MapFeatureMultiSelectState;
} {
  const state: MapFeatureMultiSelectState = {
    ...defaultSelectionState,
    isActive: false,
    selectionMode: 'multiple',
  };
  const api: MapFeatureMultiSelectPluginApi = {
    activate: () => {
      state.isActive = true;
    },
    deactivate: () => {
      state.isActive = false;
    },
    toggle: () => {
      state.isActive = !state.isActive;
    },
    clear: () => {
      state.selectedFeatures = [];
      state.selectedCount = 0;
    },
    isActive: () => state.isActive,
    getSelectedFeatures: () => [...state.selectedFeatures],
  };

  return {
    api,
    state,
  };
}

/**
 * 创建测试用地图公开实例。
 * @param options 需要挂到公开实例上的测试能力
 * @returns 可供聚合门面直接消费的地图公开实例
 */
function createMapExpose(options: {
  lineDraftApi?: LineDraftPreviewPluginApi | null;
  lineDraftState?: unknown;
  intersectionApi?: IntersectionPreviewPluginApi | null;
  intersectionState?: IntersectionPreviewState | null;
  multiSelectApi?: MapFeatureMultiSelectPluginApi | null;
  multiSelectState?: MapFeatureMultiSelectState | null;
  selectionService?: MapSelectionService | null;
  rawMap?: unknown;
} = {}): MapLibreInitExpose {
  const {
    lineDraftApi = null,
    lineDraftState = null,
    intersectionApi = null,
    intersectionState = null,
    multiSelectApi = null,
    multiSelectState = null,
    selectionService = null,
    rawMap = undefined,
  } = options;
  const mapInstance = {
    component: undefined,
    map: rawMap,
    isMounted: false,
    isLoaded: false,
    language: undefined,
  } as MapInstance;
  const pluginHost: MapPluginHostExpose = {
    has: (pluginId) => {
      if (pluginId === 'lineDraftPreview') {
        return Boolean(lineDraftApi);
      }

      if (pluginId === 'intersectionPreview') {
        return Boolean(intersectionApi);
      }

      if (pluginId === 'mapFeatureMultiSelect') {
        return Boolean(multiSelectApi);
      }

      return false;
    },
    getApi: <TApi = unknown>(pluginId?: string) => {
      if (pluginId === 'lineDraftPreview') {
        return (lineDraftApi as TApi | null) || null;
      }

      if (pluginId === 'intersectionPreview') {
        return (intersectionApi as TApi | null) || null;
      }

      if (pluginId === 'mapFeatureMultiSelect') {
        return (multiSelectApi as TApi | null) || null;
      }

      return null;
    },
    getState: <TState = unknown>(pluginId?: string) => {
      if (pluginId === 'lineDraftPreview') {
        return (lineDraftState as TState | null) || null;
      }

      if (pluginId === 'intersectionPreview') {
        return (intersectionState as TState | null) || null;
      }

      if (pluginId === 'mapFeatureMultiSelect') {
        return (multiSelectState as TState | null) || null;
      }

      return null;
    },
    list: () => {
      const result = [];
      if (lineDraftApi) {
        result.push({
          id: 'lineDraftPreview',
          type: LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
        });
      }

      if (intersectionApi) {
        result.push({
          id: 'intersectionPreview',
          type: INTERSECTION_PREVIEW_PLUGIN_TYPE,
        });
      }

      if (multiSelectApi) {
        result.push({
          id: 'mapFeatureMultiSelect',
          type: MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
        });
      }

      return result;
    },
  };

  return {
    rawHandles: createMapLibreRawHandles({
      mapInstance,
      getDrawControl: () => null,
      getMeasureControl: () => null,
    }),
    getDrawControl: () => null,
    getMeasureControl: () => null,
    getDrawFeatures: () => [] as TerradrawFeature[],
    getMeasureFeatures: () => [] as TerradrawFeature[],
    getSelectedMapFeature: () => null,
    getSelectedMapFeatureContext: () => null,
    getSelectedMapFeatureSnapshot: () => null,
    getMapSelectionService: () => selectionService,
    getTerradrawPropertyPolicy: () => null,
    clearSelectedMapFeature: () => undefined,
    setMapFeatureState: () => true,
    plugins: pluginHost,
  };
}

describe('useBusinessMap', () => {
  it('business 入口源码会直接导出线草稿门面', () => {
    const businessEntrySource = readFileSync(resolve(__dirname, '../../business.ts'), 'utf-8');

    expect(businessEntrySource).toContain("export { useLineDraftPreview }");
    expect(businessEntrySource).toContain("export type { UseLineDraftPreviewResult }");
  });

  it('business 入口应直接导出业务层高频类型', () => {
    const businessEntrySource = readFileSync(resolve(__dirname, '../../business.ts'), 'utf-8');
    const typeCheck = null as unknown as BusinessTypeExportCheck | null;

    expect(typeCheck).toBeNull();
    expect(businessEntrySource).toContain("export type { MapBusinessSource }");
    expect(businessEntrySource).toContain("export type { MapBusinessSourceRegistry }");
    expect(businessEntrySource).toContain("export type { MapBusinessLayerDescriptor }");
    expect(businessEntrySource).toContain("export type { MapFeaturePropertyPanelItem }");
    expect(businessEntrySource).toContain("export type { MapSourceFeatureRef }");
    expect(businessEntrySource).toContain("export type { MapFeatureId }");
  });

  it('会按分组暴露业务 source、查询与动作能力', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { source, sourceRegistry } = createBusinessSourceHarness();
    const businessMap = useBusinessMap({
      mapRef: shallowRef(createMapExpose()),
      sourceRegistry,
    });

    const sourceList = businessMap.sources.listSources();
    const feature = businessMap.feature.resolveFeature(source.toFeatureRef('feature-1'));
    const saveResult = businessMap.feature.saveBusinessFeatureProperties({
      featureRef: source.toFeatureRef('feature-1'),
      newProperties: {
        name: '已更新',
      } as FeatureProperties,
    });

    expect(businessMap.sources.registry).toBe(sourceRegistry);
    expect(sourceList).toHaveLength(1);
    expect(feature?.properties?.name).toBe('原始名称');
    expect(saveResult.success).toBe(true);
    expect(source.resolveFeature('feature-1')?.properties?.name).toBe('已更新');
    warnSpy.mockRestore();
  });

  it('地图实例未就绪时业务聚合门面应返回安全降级结果', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { sourceRegistry } = createBusinessSourceHarness();
    const businessMap = useBusinessMap({
      mapRef: ref(null),
      sourceRegistry,
    });

    businessMap.selection.activate();

    expect(businessMap.selection.isActive.value).toBe(false);
    expect(businessMap.draft.clear()).toBe(false);
    expect(businessMap.intersection.visible.value).toBe(false);
    expect(businessMap.plugins.multiSelect.selectedCount.value).toBe(0);
    expect(businessMap.intersection.materialize()).toBe(false);
    const flashStartResult = businessMap.effect.startFlash({
      source: 'business-source',
      id: 'feature-1',
    });
    expect(flashStartResult).toBe(true);
    expect(
      businessMap.effect.isFeatureFlashing({
        source: 'business-source',
        id: 'feature-1',
      })
    ).toBe(true);
    businessMap.effect.clearFlash();
    warnSpy.mockRestore();
  });

  it('会复用选择态、线草稿和特效分组', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const globalWithWindow = globalThis as any;
    const previousWindow = globalWithWindow.window;
    globalWithWindow.window = globalThis as any;

    const { sourceRegistry } = createBusinessSourceHarness();
    const selectionHarness = createSelectionServiceHarness();
    const lineDraftHarness = createLineDraftPluginHarness();
    const intersectionHarness = createIntersectionPluginHarness();
    const multiSelectHarness = createMultiSelectPluginHarness();
    const businessMap = useBusinessMap({
      mapRef: shallowRef(
        createMapExpose({
          selectionService: selectionHarness.service,
          lineDraftApi: lineDraftHarness.api,
          lineDraftState: lineDraftHarness.state,
          intersectionApi: intersectionHarness.api,
          intersectionState: intersectionHarness.state,
          multiSelectApi: multiSelectHarness.api,
          multiSelectState: multiSelectHarness.state,
        })
      ),
      sourceRegistry,
    });

    businessMap.selection.activate();
    const flashStartResult = businessMap.effect.startFlash({
      source: 'business-source',
      id: 'feature-1',
    });

    expect(businessMap.selection.isActive.value).toBe(true);
    expect(businessMap.selection.selectedCount.value).toBe(1);
    expect(businessMap.selection.selectedFeatureIds.value).toEqual(['feature-1']);
    expect(businessMap.draft.hasFeatures.value).toBe(true);
    expect(businessMap.draft.featureCount.value).toBe(1);
    expect(businessMap.plugins.lineDraft.getData()?.features).toHaveLength(1);
    const lineDraftClearResult = businessMap.draft.clear();
    expect(lineDraftClearResult).toBe(true);
    expect(lineDraftHarness.state.hasFeatures).toBe(false);
    expect(lineDraftHarness.state.featureCount).toBe(0);
    expect(businessMap.intersection.count.value).toBe(2);
    expect(businessMap.plugins.intersection.count.value).toBe(2);
    expect(businessMap.intersection.visible.value).toBe(true);
    expect(typeof businessMap.intersection.refresh).toBe('function');
    businessMap.plugins.multiSelect.activate();
    expect(businessMap.plugins.multiSelect.isActive.value).toBe(true);
    expect(flashStartResult).toBe(true);
    expect(
      businessMap.effect.isFeatureFlashing({
        source: 'business-source',
        id: 'feature-1',
      })
    ).toBe(true);
    businessMap.effect.clearFlash();

    if (typeof previousWindow === 'undefined') {
      Reflect.deleteProperty(globalWithWindow, 'window');
    } else {
      globalWithWindow.window = previousWindow;
    }
    warnSpy.mockRestore();
  });

  it('会暴露运行时图层快捷动作', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { sourceRegistry } = createBusinessSourceHarness();
    const rawMap = {
      getLayer: vi.fn((layerId: string) => (layerId === 'line-layer' ? { id: layerId } : null)),
      setLayoutProperty: vi.fn(),
      setPaintProperty: vi.fn(),
    };
    const businessMap = useBusinessMap({
      mapRef: shallowRef(createMapExpose({ rawMap })),
      sourceRegistry,
    });

    const showResult = businessMap.layers.show('line-layer');
    const paintResult = businessMap.layers.setPaint('line-layer', {
      'line-color': '#f97316',
      'line-width': 4,
    });
    const featureStateResult = businessMap.layers.setFeatureState('business-source', 'feature-1', {
      demoStyled: true,
    });

    expect(showResult.success).toBe(true);
    expect(paintResult.success).toBe(true);
    expect(featureStateResult.success).toBe(true);
    expect(typeof businessMap.layers.addGeoJsonSource).toBe('function');
    expect(typeof businessMap.layers.addLayer).toBe('function');
    expect(typeof businessMap.layers.removeLayer).toBe('function');
    expect(typeof businessMap.layers.removeSource).toBe('function');
    expect(rawMap.setLayoutProperty).toHaveBeenCalledWith('line-layer', 'visibility', 'visible');
    expect(rawMap.setPaintProperty).toHaveBeenCalledWith('line-layer', 'line-color', '#f97316');
    expect(rawMap.setPaintProperty).toHaveBeenCalledWith('line-layer', 'line-width', 4);
    warnSpy.mockRestore();
  });
});
