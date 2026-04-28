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
  PolygonEdgePreviewPluginApi,
  PolygonEdgePreviewState,
} from '../plugins/polygon-edge-preview';
import type {
  MapFeatureMultiSelectPluginApi,
  MapFeatureMultiSelectState,
} from '../plugins/map-feature-multi-select';
import type { MapFeatureSnapPluginApi } from '../plugins/map-feature-snap';
import type { MapDxfExportPluginApi, MapDxfExportState } from '../plugins/map-dxf-export';
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
/** 面边线插件类型常量。 */
const POLYGON_EDGE_PREVIEW_PLUGIN_TYPE = 'polygonEdgePreview';
/** 多选插件类型常量。 */
const MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE = 'mapFeatureMultiSelect';
/** 吸附插件类型常量。 */
const MAP_FEATURE_SNAP_PLUGIN_TYPE = 'mapFeatureSnap';
/** DXF 导出插件类型常量。 */
const MAP_DXF_EXPORT_PLUGIN_TYPE = 'mapDxfExport';

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
 * 创建测试用面边线插件 API。
 * @returns 面边线插件 API 与状态引用
 */
function createPolygonEdgePluginHarness(): {
  api: PolygonEdgePreviewPluginApi;
  state: PolygonEdgePreviewState;
} {
  const state: PolygonEdgePreviewState = {
    hasFeatures: true,
    featureCount: 1,
    selectedEdgeId: null,
  };
  const data = ref(
    createFeatureCollection([
      {
        type: 'Feature',
        id: 'edge-1',
        properties: {
          id: 'edge-1',
          edgeId: 'edge-1',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [120, 30],
            [121, 31],
          ],
        },
      },
    ] as MapCommonFeature[])
  );
  const api = {
    data,
    lineStyle: ref({ layout: {}, paint: {} }),
    generateFromFeature: () => ({
      success: true,
      message: '已生成面边线预览',
      edgeCount: 1,
      polygonId: 'polygon-1',
    }),
    generateFromSelected: () => ({
      success: true,
      message: '已生成面边线预览',
      edgeCount: 1,
      polygonId: 'polygon-1',
    }),
    getFeatureById: (edgeId: string | null) => {
      return edgeId === 'edge-1' ? data.value.features[0] : null;
    },
    getData: () => data.value,
    highlightPolygon: () => true,
    highlightRing: () => true,
    highlightEdge: () => true,
    selectEdge: (edgeId: string | null) => {
      state.selectedEdgeId = edgeId;
      return true;
    },
    clearHighlight: () => undefined,
    clear: () => {
      state.hasFeatures = false;
      state.featureCount = 0;
    },
  } as unknown as PolygonEdgePreviewPluginApi;

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
 * 创建吸附插件测试替身。
 * @returns 吸附插件 API
 */
function createSnapPluginHarness(): {
  api: MapFeatureSnapPluginApi;
} {
  const api: MapFeatureSnapPluginApi = {
    clearPreview: vi.fn(),
    resolveMapEvent: vi.fn(() => ({
      snapped: false,
      point: null,
      lngLat: null,
      kind: null,
      distancePx: null,
      feature: null,
      layerId: null,
      sourceId: null,
      sourceLayer: null,
      segment: null,
      ruleId: null,
    })),
    resolveTerradrawSnapOptions: vi.fn(() => ({
      enabled: true,
      tolerance: 12,
      features: [],
    })),
  };

  return {
    api,
  };
}

/**
 * 创建 DXF 导出插件测试替身。
 * @returns DXF 导出插件 API 与状态
 */
function createDxfPluginHarness(): {
  api: MapDxfExportPluginApi;
  state: MapDxfExportState;
} {
  const state: MapDxfExportState = {
    isExporting: false,
    lastFileName: null,
    lastFeatureCount: 0,
    lastEntityCount: 0,
    lastWarnings: [],
    lastError: null,
    lastExportAt: null,
  };
  const api: MapDxfExportPluginApi = {
    exportDxf: vi.fn(async () => ({
      content: '0\nEOF',
      fileName: 'business.dxf',
      sourceCount: 1,
      featureCount: 2,
      entityCount: 2,
      warnings: [],
    })),
    downloadDxf: vi.fn(async () => ({
      content: '0\nEOF',
      fileName: 'business.dxf',
      sourceCount: 1,
      featureCount: 2,
      entityCount: 2,
      warnings: [],
    })),
    getResolvedOptions: vi.fn(() => ({
      sourceIds: null,
      fileName: 'business.dxf',
      pointMode: 'circle',
      pointRadius: 3,
      lineWidth: 2,
    })),
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
  polygonEdgeApi?: PolygonEdgePreviewPluginApi | null;
  polygonEdgeState?: PolygonEdgePreviewState | null;
  multiSelectApi?: MapFeatureMultiSelectPluginApi | null;
  multiSelectState?: MapFeatureMultiSelectState | null;
  snapApi?: MapFeatureSnapPluginApi | null;
  dxfApi?: MapDxfExportPluginApi | null;
  dxfState?: MapDxfExportState | null;
  selectionService?: MapSelectionService | null;
  rawMap?: unknown;
} = {}): MapLibreInitExpose {
  const {
    lineDraftApi = null,
    lineDraftState = null,
    intersectionApi = null,
    intersectionState = null,
    polygonEdgeApi = null,
    polygonEdgeState = null,
    multiSelectApi = null,
    multiSelectState = null,
    snapApi = null,
    dxfApi = null,
    dxfState = null,
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

      if (pluginId === 'polygonEdgePreview') {
        return Boolean(polygonEdgeApi);
      }

      if (pluginId === 'mapFeatureMultiSelect') {
        return Boolean(multiSelectApi);
      }

      if (pluginId === 'mapFeatureSnap') {
        return Boolean(snapApi);
      }

      if (pluginId === 'mapDxfExport') {
        return Boolean(dxfApi);
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

      if (pluginId === 'polygonEdgePreview') {
        return (polygonEdgeApi as TApi | null) || null;
      }

      if (pluginId === 'mapFeatureMultiSelect') {
        return (multiSelectApi as TApi | null) || null;
      }

      if (pluginId === 'mapFeatureSnap') {
        return (snapApi as TApi | null) || null;
      }

      if (pluginId === 'mapDxfExport') {
        return (dxfApi as TApi | null) || null;
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

      if (pluginId === 'polygonEdgePreview') {
        return (polygonEdgeState as TState | null) || null;
      }

      if (pluginId === 'mapFeatureMultiSelect') {
        return (multiSelectState as TState | null) || null;
      }

      if (pluginId === 'mapDxfExport') {
        return (dxfState as TState | null) || null;
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

      if (polygonEdgeApi) {
        result.push({
          id: 'polygonEdgePreview',
          type: POLYGON_EDGE_PREVIEW_PLUGIN_TYPE,
        });
      }

      if (multiSelectApi) {
        result.push({
          id: 'mapFeatureMultiSelect',
          type: MAP_FEATURE_MULTI_SELECT_PLUGIN_TYPE,
        });
      }

      if (snapApi) {
        result.push({
          id: 'mapFeatureSnap',
          type: MAP_FEATURE_SNAP_PLUGIN_TYPE,
        });
      }

      if (dxfApi) {
        result.push({
          id: 'mapDxfExport',
          type: MAP_DXF_EXPORT_PLUGIN_TYPE,
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
  it('business 和 root 入口不公开插件第二套读取门面', () => {
    const businessEntrySource = readFileSync(resolve(__dirname, '../../entries/business.ts'), 'utf-8');
    const rootEntrySource = readFileSync(resolve(__dirname, '../../entries/root.ts'), 'utf-8');
    const entrySources = `${businessEntrySource}\n${rootEntrySource}`;

    expect(entrySources).not.toContain("export { useLineDraftPreview }");
    expect(entrySources).not.toContain("export { useIntersectionPreview }");
    expect(entrySources).not.toContain("export { useMapFeatureMultiSelect }");
    expect(entrySources).not.toContain("export { useMapFeatureSnap }");
    expect(entrySources).not.toContain("export { useMapDxfExport }");
    expect(entrySources).not.toContain("resolveLineDraftPreviewApi");
    expect(entrySources).not.toContain("resolveLineDraftPreviewState");
    expect(entrySources).not.toContain("resolveIntersectionPreviewApi");
    expect(entrySources).not.toContain("resolveIntersectionPreviewState");
    expect(entrySources).not.toContain("resolveMapFeatureMultiSelectApi");
    expect(entrySources).not.toContain("resolveMapFeatureMultiSelectState");
    expect(entrySources).not.toContain("resolveMapFeatureSnapApi");
    expect(entrySources).not.toContain("resolveMapDxfExportApi");
    expect(entrySources).not.toContain("resolveMapDxfExportState");
  });

  it('business 入口应直接导出业务层高频类型', () => {
    const businessEntrySource = readFileSync(resolve(__dirname, '../../entries/business.ts'), 'utf-8');
    const typeCheck = null as unknown as BusinessTypeExportCheck | null;

    expect(typeCheck).toBeNull();
    expect(businessEntrySource).toContain("export type { MapBusinessSource }");
    expect(businessEntrySource).toContain("export type { MapBusinessSourceRegistry }");
    expect(businessEntrySource).toContain("export type { MapBusinessLayerDescriptor }");
    expect(businessEntrySource).toContain("export type { MapFeaturePropertyPanelItem }");
    expect(businessEntrySource).toContain("export type { MapSourceFeatureRef }");
    expect(businessEntrySource).toContain("export type { MapFeatureId }");
    expect(businessEntrySource).toContain("export type { UseBusinessMapPlugins }");
  });

  it('plugins 聚合入口应导出业务插件预设工厂和全部插件子入口', () => {
    const pluginsEntrySource = readFileSync(resolve(__dirname, '../../entries/plugins.ts'), 'utf-8');

    expect(pluginsEntrySource).toContain("export { createBusinessPlugins }");
    expect(pluginsEntrySource).toContain("export * from '../plugins/map-feature-snap'");
    expect(pluginsEntrySource).toContain("export * from '../plugins/line-draft-preview'");
    expect(pluginsEntrySource).toContain("export * from '../plugins/intersection-preview'");
    expect(pluginsEntrySource).toContain("export * from '../plugins/map-feature-multi-select'");
    expect(pluginsEntrySource).toContain("export * from '../plugins/map-dxf-export'");
  });

  it('plugins 聚合入口应同步 package、Vite、Vitest 和 TypeScript 路径', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, '../../../package.json'), 'utf-8')
    ) as {
      exports: Record<string, { types?: string; import?: string } | string>;
    };
    const viteConfigSource = readFileSync(resolve(__dirname, '../../../vite.config.ts'), 'utf-8');
    const vitestConfigSource = readFileSync(resolve(__dirname, '../../../vitest.config.ts'), 'utf-8');
    const tsConfigSource = readFileSync(resolve(__dirname, '../../../tsconfig.app.json'), 'utf-8');

    expect(packageJson.exports['./plugins']).toEqual({
      types: './dist/plugins.d.ts',
      import: './dist/plugins.js',
    });
    expect(viteConfigSource).toContain('plugins: fileURLToPath(new URL("./src/plugins.ts"');
    expect(viteConfigSource).toContain('find: /^vue-maplibre-kit\\/plugins$/');
    expect(vitestConfigSource).toContain("find: /^vue-maplibre-kit\\/config$/");
    expect(vitestConfigSource).toContain("find: /^vue-maplibre-kit\\/plugins$/");
    expect(vitestConfigSource).toContain("find: /^vue-maplibre-kit\\/plugins\\/intersection-preview$/");
    expect(tsConfigSource).toContain('"vue-maplibre-kit/plugins": ["./src/plugins.ts"]');
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
    expect(businessMap.plugins.lineDraft.clear()).toBe(false);
    expect(businessMap.plugins.intersection.visible.value).toBe(false);
    expect(businessMap.plugins.polygonEdge.clear()).toBe(false);
    expect(businessMap.plugins.multiSelect.selectedCount.value).toBe(0);
    expect(businessMap.plugins.snap.clearPreview()).toBe(false);
    expect(businessMap.plugins.dxfExport.isExporting.value).toBe(false);
    expect(businessMap.plugins.intersection.materialize()).toBe(false);
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
    const polygonEdgeHarness = createPolygonEdgePluginHarness();
    const multiSelectHarness = createMultiSelectPluginHarness();
    const snapHarness = createSnapPluginHarness();
    const dxfHarness = createDxfPluginHarness();
    const businessMap = useBusinessMap({
      mapRef: shallowRef(
        createMapExpose({
          selectionService: selectionHarness.service,
          lineDraftApi: lineDraftHarness.api,
          lineDraftState: lineDraftHarness.state,
          intersectionApi: intersectionHarness.api,
          intersectionState: intersectionHarness.state,
          polygonEdgeApi: polygonEdgeHarness.api,
          polygonEdgeState: polygonEdgeHarness.state,
          multiSelectApi: multiSelectHarness.api,
          multiSelectState: multiSelectHarness.state,
          snapApi: snapHarness.api,
          dxfApi: dxfHarness.api,
          dxfState: dxfHarness.state,
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
    expect(businessMap.plugins.lineDraft.hasFeatures.value).toBe(true);
    expect(businessMap.plugins.lineDraft.featureCount.value).toBe(1);
    expect(businessMap.plugins.lineDraft.getData()?.features).toHaveLength(1);
    const lineDraftClearResult = businessMap.plugins.lineDraft.clear();
    expect(lineDraftClearResult).toBe(true);
    expect(lineDraftHarness.state.hasFeatures).toBe(false);
    expect(lineDraftHarness.state.featureCount).toBe(0);
    expect(businessMap.plugins.intersection.count.value).toBe(2);
    expect(businessMap.plugins.intersection.visible.value).toBe(true);
    expect(typeof businessMap.plugins.intersection.refresh).toBe('function');
    expect(businessMap.plugins.polygonEdge.featureCount.value).toBe(1);
    expect(businessMap.plugins.polygonEdge.getData()?.features).toHaveLength(1);
    expect(businessMap.plugins.polygonEdge.selectEdge('edge-1')).toBe(true);
    expect(businessMap.plugins.polygonEdge.selectedEdgeId.value).toBe('edge-1');
    businessMap.plugins.multiSelect.activate();
    expect(businessMap.plugins.multiSelect.isActive.value).toBe(true);
    expect(businessMap.plugins.snap.clearPreview()).toBe(true);
    expect(snapHarness.api.clearPreview).toHaveBeenCalledTimes(1);
    expect(businessMap.plugins.dxfExport.isExporting.value).toBe(false);
    expect(businessMap.plugins.dxfExport.getResolvedOptions()?.fileName).toBe('business.dxf');
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
