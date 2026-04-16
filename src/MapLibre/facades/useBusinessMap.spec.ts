import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { FeatureProperties, MapFeatureId } from '../composables/useMapDataUpdate';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  MapLayerSelectedFeature,
  MapSelectionState,
  TerradrawFeature,
} from '../shared/mapLibre-controls-types';
import type { LineDraftPreviewPluginApi } from '../plugins/line-draft-preview/useLineDraftPreviewController';
import type { MapPluginHostExpose, MapSelectionService } from '../plugins/types';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../shared/map-common-tools';
import { useBusinessMap } from './useBusinessMap';
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  type MapBusinessSource,
} from './createMapBusinessSource';

/** 线草稿插件类型常量。 */
const LINE_DRAFT_PREVIEW_PLUGIN_TYPE = 'lineDraftPreview';

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
 * 创建测试用地图公开实例。
 * @param options 需要挂到公开实例上的测试能力
 * @returns 可供聚合门面直接消费的地图公开实例
 */
function createMapExpose(options: {
  lineDraftApi?: LineDraftPreviewPluginApi | null;
  lineDraftState?: unknown;
  selectionService?: MapSelectionService | null;
} = {}): MapLibreInitExpose {
  const { lineDraftApi = null, lineDraftState = null, selectionService = null } = options;
  const pluginHost: MapPluginHostExpose = {
    has: (pluginId) => pluginId === 'lineDraftPreview' && Boolean(lineDraftApi),
    getApi: <TApi = unknown>() => (lineDraftApi as TApi | null) || null,
    getState: <TState = unknown>() => (lineDraftState as TState | null) || null,
    list: () =>
      lineDraftApi
        ? [
            {
              id: 'lineDraftPreview',
              type: LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
            },
          ]
        : [],
  };

  return {
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
  it('会按分组暴露业务 source、查询与动作能力', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { source, sourceRegistry } = createBusinessSourceHarness();
    const businessMap = useBusinessMap({
      mapRef: ref(createMapExpose()),
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

  it('会复用选择态、线草稿和特效分组', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const globalWithWindow = globalThis as any;
    const previousWindow = globalWithWindow.window;
    globalWithWindow.window = globalThis as any;

    const { sourceRegistry } = createBusinessSourceHarness();
    const selectionHarness = createSelectionServiceHarness();
    const lineDraftHarness = createLineDraftPluginHarness();
    const businessMap = useBusinessMap({
      mapRef: ref(
        createMapExpose({
          selectionService: selectionHarness.service,
          lineDraftApi: lineDraftHarness.api,
          lineDraftState: lineDraftHarness.state,
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
    const lineDraftClearResult = businessMap.draft.clear();
    expect(lineDraftClearResult).toBe(true);
    expect(lineDraftHarness.state.hasFeatures).toBe(false);
    expect(lineDraftHarness.state.featureCount).toBe(0);
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
});
