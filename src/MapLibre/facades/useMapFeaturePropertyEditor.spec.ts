import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type {
  MaplibreMeasureControl,
  MaplibreTerradrawControl,
} from '@watergis/maplibre-gl-terradraw';
import type { TerraDraw } from 'terra-draw';
import type { FeatureProperties, MapFeatureId } from '../composables/useMapDataUpdate';
import {
  createMapLibreRawHandles,
  type MapLibreInitExpose,
} from '../core/mapLibre-init.types';
import type { LineDraftPreviewPluginApi } from '../plugins/line-draft-preview/useLineDraftPreviewController';
import {
  LINE_DRAFT_PREVIEW_HIDDEN_PROPERTY_KEYS,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
} from '../plugins/line-draft-preview/useLineDraftPreviewStore';
import type { MapPluginHostExpose } from '../plugins/types';
import {
  createMapSourceFeatureRef,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
} from '../shared/map-common-tools';
import {
  removeFeaturePropertiesInCollection,
  saveFeaturePropertiesInCollection,
} from '../shared/map-feature-data';
import type { TerradrawFeature } from '../shared/mapLibre-controls-types';
import type { MapInstance } from 'vue-maplibre-gl';
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  type MapBusinessSource,
} from './createMapBusinessSource';
import { createCircleBusinessLayer } from './mapBusinessLayer';
import { useMapFeaturePropertyEditor } from './useMapFeaturePropertyEditor';

/** 线草稿插件类型常量。 */
const LINE_DRAFT_PREVIEW_PLUGIN_TYPE = 'lineDraftPreview';

/** TerraDraw 测试替身统一使用的最小实例形状。 */
type TerradrawStub = Pick<TerraDraw, 'hasFeature' | 'getSnapshotFeature' | 'updateFeatureProperties'>;

/**
 * 创建测试用点要素。
 * @param id 要素 ID
 * @param properties 业务属性
 * @returns 标准点要素
 */
function createPointFeature(
  id: string,
  properties: Record<string, any> = {}
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
 * 清理属性对象中的 undefined 字段。
 * @param properties 原始属性对象
 * @returns 清理后的属性对象
 */
function cleanProperties(properties: FeatureProperties): FeatureProperties {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
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
          name: '原始名称',
          mark: '锁定值',
          tag: '临时字段',
        }),
      ])
    ),
    promoteId: 'id',
    layers: [
      createCircleBusinessLayer({
        layerId: 'circleLayer',
        propertyPolicy: {
          readonlyKeys: ['id'],
          fixedKeys: ['mark'],
        },
      }),
    ],
  });

  return {
    source,
    sourceRegistry: createMapBusinessSourceRegistry([source]),
  };
}

/**
 * 创建绘图控件测试替身。
 * 这里仅实现当前用例实际会访问的 `getTerraDrawInstance()`，
 * 其余控件能力不参与本组测试，避免再用 `as any` 直接跳过类型约束。
 *
 * @param terradraw TerraDraw 最小替身
 * @returns 可供公开实例复用的绘图控件替身
 */
function createDrawControlStub(
  terradraw: TerradrawStub | null | undefined
): MaplibreTerradrawControl | null {
  if (!terradraw) {
    return null;
  }

  const control = {
    getTerraDrawInstance: () => terradraw,
  } satisfies Pick<MaplibreTerradrawControl, 'getTerraDrawInstance'>;

  return control as unknown as MaplibreTerradrawControl;
}

/**
 * 创建测量控件测试替身。
 * 测量控件与绘图控件在本组测试里只共享 `getTerraDrawInstance()` 这一入口，
 * 因此这里同样返回最小可用替身。
 *
 * @param terradraw TerraDraw 最小替身
 * @returns 可供公开实例复用的测量控件替身
 */
function createMeasureControlStub(
  terradraw: TerradrawStub | null | undefined
): MaplibreMeasureControl | null {
  if (!terradraw) {
    return null;
  }

  const control = {
    getTerraDrawInstance: () => terradraw,
  } satisfies Pick<MaplibreMeasureControl, 'getTerraDrawInstance'>;

  return control as unknown as MaplibreMeasureControl;
}

/**
 * 创建带线草稿插件的测试地图公开实例。
 * @param api 线草稿插件 API
 * @param drawTerradraw 绘制控件实例
 * @param measureTerradraw 测量控件实例
 * @returns 可供门面直接消费的 mapExpose
 */
function createMapExpose(
  api?: LineDraftPreviewPluginApi | null,
  drawTerradraw?: TerradrawStub | null,
  measureTerradraw?: TerradrawStub | null
): MapLibreInitExpose {
  const mapInstance = {
    component: undefined,
    map: undefined,
    isMounted: false,
    isLoaded: false,
    language: undefined,
  } as MapInstance;
  const pluginHost: MapPluginHostExpose = {
    has: (pluginId) => pluginId === 'lineDraftPreview' && Boolean(api),
    getApi: <TApi = unknown>() => (api as TApi | null) || null,
    getState: <TState = unknown>() => null as TState | null,
    list: () =>
      api
        ? [
            {
              id: 'lineDraftPreview',
              type: LINE_DRAFT_PREVIEW_PLUGIN_TYPE,
            },
          ]
        : [],
  };

  return {
    rawHandles: createMapLibreRawHandles({
      mapInstance,
      getDrawControl: () => createDrawControlStub(drawTerradraw),
      getMeasureControl: () => createMeasureControlStub(measureTerradraw),
    }),
    getDrawControl: () => createDrawControlStub(drawTerradraw),
    getMeasureControl: () => createMeasureControlStub(measureTerradraw),
    getDrawFeatures: () => null,
    getMeasureFeatures: () => null,
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

/**
 * 创建线草稿插件 API 模拟。
 * @param source 正式来源，供线草稿继承属性治理规则
 * @returns 可写的线草稿插件 API
 */
function createLineDraftApi(source: MapBusinessSource): {
  api: LineDraftPreviewPluginApi;
  getFeature: () => MapCommonFeature;
} {
  let lineDraftFeature = createPointFeature('draft-1', {
    name: '草稿名称',
    managedPreviewOriginSourceId: source.sourceId,
    managedPreviewOriginFeatureId: 'feature-1',
    managedPreviewOriginLayerId: 'circleLayer',
    managedPreviewOriginKey: `${source.sourceId}::feature-1`,
  });

  /**
   * 将单条线草稿要素包装成临时集合。
   * @returns 仅包含当前草稿的集合
   */
  const createDraftCollection = (): MapCommonFeatureCollection => {
    return createFeatureCollection([lineDraftFeature]);
  };

  /**
   * 将集合结果同步回当前草稿引用。
   * @param nextCollection 最新集合
   * @returns 结构化写回结果
   */
  const commitDraftCollection = (
    nextCollection: MapCommonFeatureCollection | undefined
  ): MapCommonFeature => {
    lineDraftFeature = (nextCollection?.features?.[0] || lineDraftFeature) as MapCommonFeature;
    return lineDraftFeature;
  };

  const api = {
    data: ref(createDraftCollection()),
    lineStyle: ref(null),
    fillStyle: ref(null),
    getFeatureById: (featureId: MapFeatureId | null) => {
      return featureId === lineDraftFeature.id ? lineDraftFeature : null;
    },
    isFeatureById: (featureId: MapFeatureId | null) => featureId === lineDraftFeature.id,
    isSelectedFeature: () => false,
    getSelectedFeatureSnapshot: () => null,
    previewLine: () => null,
    replacePreviewRegion: () => false,
    clear: () => undefined,
    saveProperties: (options: {
      featureId: MapFeatureId;
      newProperties: FeatureProperties;
      propertyPolicy?: any;
      protectedKeys?: readonly string[];
    }) => {
      const result = saveFeaturePropertiesInCollection({
        featureCollection: createDraftCollection(),
        featureId: options.featureId,
        featureIndex: 0,
        newProperties: options.newProperties,
        propertyPolicy: options.propertyPolicy,
        protectedKeys: options.protectedKeys,
        hiddenKeys: LINE_DRAFT_PREVIEW_HIDDEN_PROPERTY_KEYS,
      });

      if (!result.success || !result.data || !result.properties) {
        return {
          success: false,
          target: 'map' as const,
          featureId: options.featureId,
          message: result.message,
          blockedKeys: result.blockedKeys,
          removedKeys: result.removedKeys,
        };
      }

      commitDraftCollection(result.data as MapCommonFeatureCollection);
      return {
        success: true,
        target: 'map' as const,
        featureId: options.featureId,
        properties: result.properties,
        message: result.message,
        blockedKeys: result.blockedKeys,
        removedKeys: result.removedKeys,
      };
    },
    removeProperties: (options: {
      featureId: MapFeatureId;
      propertyKeys: readonly string[];
      propertyPolicy?: any;
      protectedKeys?: readonly string[];
    }) => {
      const result = removeFeaturePropertiesInCollection({
        featureCollection: createDraftCollection(),
        featureId: options.featureId,
        featureIndex: 0,
        propertyKeys: options.propertyKeys,
        propertyPolicy: options.propertyPolicy,
        protectedKeys: options.protectedKeys,
        hiddenKeys: LINE_DRAFT_PREVIEW_HIDDEN_PROPERTY_KEYS,
      });

      if (!result.success || !result.data || !result.properties) {
        return {
          success: false,
          target: 'map' as const,
          featureId: options.featureId,
          message: result.message,
          blockedKeys: result.blockedKeys,
          removedKeys: result.removedKeys,
        };
      }

      commitDraftCollection(result.data as MapCommonFeatureCollection);
      return {
        success: true,
        target: 'map' as const,
        featureId: options.featureId,
        properties: result.properties,
        message: result.message,
        blockedKeys: result.blockedKeys,
        removedKeys: result.removedKeys,
      };
    },
  } as unknown as LineDraftPreviewPluginApi;

  return {
    api,
    getFeature: () => lineDraftFeature,
  };
}

/**
 * 创建 TerraDraw 内存实例。
 * @param feature 初始要素
 * @returns TerraDraw 测试实例与读取器
 */
function createTerradrawHarness(feature: TerradrawFeature): {
  terradraw: {
    hasFeature: (featureId: MapFeatureId) => boolean;
    getSnapshotFeature: (featureId: MapFeatureId) => TerradrawFeature | null;
    updateFeatureProperties: (featureId: MapFeatureId, patch: FeatureProperties) => void;
  };
  getFeature: () => TerradrawFeature;
} {
  let currentFeature = feature;

  return {
    terradraw: {
      hasFeature: (featureId) => featureId === currentFeature.id,
      getSnapshotFeature: (featureId) => {
        return featureId === currentFeature.id ? currentFeature : null;
      },
      updateFeatureProperties: (featureId, patch) => {
        if (featureId !== currentFeature.id) {
          return;
        }

        currentFeature = {
          ...currentFeature,
          properties: cleanProperties({
            ...(currentFeature.properties || {}),
            ...(patch || {}),
          }),
        };
      },
    },
    getFeature: () => currentFeature,
  };
}

describe('useMapFeaturePropertyEditor', () => {
  it('map 目标可以统一保存单个属性键', () => {
    const { source, sourceRegistry } = createBusinessSourceHarness();
    const propertyEditor = useMapFeaturePropertyEditor({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });

    const result = propertyEditor.saveItem(
      {
        type: 'map',
        featureRef: source.toFeatureRef('feature-1', 'circleLayer'),
      },
      {
        key: 'name',
        value: '已改名',
      }
    );

    expect(result.success).toBe(true);
    expect(result.target).toBe('business');
    expect(result.editorState.rawProperties.name).toBe('已改名');
    expect(source.resolveFeature('feature-1')?.properties?.name).toBe('已改名');
  });

  it('map 目标可以统一删除单个属性键', () => {
    const { source, sourceRegistry } = createBusinessSourceHarness();
    const propertyEditor = useMapFeaturePropertyEditor({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });

    const result = propertyEditor.removeItem(
      {
        type: 'map',
        featureRef: source.toFeatureRef('feature-1', 'circleLayer'),
      },
      'tag'
    );

    expect(result.success).toBe(true);
    expect(result.target).toBe('business');
    expect(result.editorState.rawProperties.tag).toBeUndefined();
    expect(source.resolveFeature('feature-1')?.properties?.tag).toBeUndefined();
  });

  it('map 目标会按图层 propertyPolicy 阻止固定字段删除', () => {
    const { source, sourceRegistry } = createBusinessSourceHarness();
    const propertyEditor = useMapFeaturePropertyEditor({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });

    const result = propertyEditor.removeItem(
      {
        type: 'map',
        featureRef: source.toFeatureRef('feature-1', 'circleLayer'),
      },
      'mark'
    );

    expect(result.success).toBe(false);
    expect(result.blockedKeys).toEqual(['mark']);
    expect(result.editorState.panelState.items.find((item) => item.key === 'mark')?.removable).toBe(
      false
    );
    expect(source.resolveFeature('feature-1')?.properties?.mark).toBe('锁定值');
  });

  it('lineDraft 来源会自动分流到线草稿属性写回', () => {
    const { source, sourceRegistry } = createBusinessSourceHarness();
    const lineDraftHarness = createLineDraftApi(source);
    const propertyEditor = useMapFeaturePropertyEditor({
      mapRef: ref(createMapExpose(lineDraftHarness.api)),
      sourceRegistry,
    });

    const result = propertyEditor.saveItem(
      {
        type: 'map',
        featureRef: createMapSourceFeatureRef(LINE_DRAFT_PREVIEW_SOURCE_ID, 'draft-1'),
      },
      {
        key: 'name',
        value: '草稿已更新',
      }
    );

    expect(result.success).toBe(true);
    expect(result.target).toBe('lineDraft');
    expect(lineDraftHarness.getFeature().properties?.name).toBe('草稿已更新');
    expect(result.editorState.rawProperties.name).toBe('草稿已更新');
    expect(result.editorState.panelState.properties.managedPreviewOriginSourceId).toBeUndefined();
    expect(result.editorState.panelState.properties.managedPreviewOriginLayerId).toBeUndefined();
  });

  it('terradraw 目标可以统一保存和删除属性，并返回最新属性快照', () => {
    const { sourceRegistry } = createBusinessSourceHarness();
    const drawHarness = createTerradrawHarness({
      id: 'draw-1',
      type: 'Feature',
      properties: {
        id: 'draw-1',
        name: '绘制前',
      },
      geometry: null,
    } as unknown as TerradrawFeature);
    const measureHarness = createTerradrawHarness({
      id: 'measure-1',
      type: 'Feature',
      properties: {
        id: 'measure-1',
        label: '测量前',
        distance: 120,
        unit: 'm',
      },
      geometry: null,
    } as unknown as TerradrawFeature);
    const propertyEditor = useMapFeaturePropertyEditor({
      mapRef: ref(createMapExpose(null, drawHarness.terradraw, measureHarness.terradraw)),
      sourceRegistry,
    });

    const saveResult = propertyEditor.saveItem(
      {
        type: 'terradraw',
        controlType: 'draw',
        featureId: 'draw-1',
      },
      {
        key: 'name',
        value: '绘制后',
      }
    );
    const removeResult = propertyEditor.removeItem(
      {
        type: 'terradraw',
        controlType: 'measure',
        featureId: 'measure-1',
      },
      'label'
    );

    expect(saveResult.success).toBe(true);
    expect(saveResult.target).toBe('terradraw');
    expect(saveResult.editorState.rawProperties.name).toBe('绘制后');
    expect(drawHarness.getFeature().properties?.name).toBe('绘制后');

    expect(removeResult.success).toBe(true);
    expect(removeResult.target).toBe('terradraw');
    expect(removeResult.editorState.rawProperties.label).toBeUndefined();
    expect(removeResult.editorState.rawProperties.distance).toBe(120);
    expect(removeResult.editorState.panelState.properties.distance).toBeUndefined();
    expect(measureHarness.getFeature().properties?.label).toBeUndefined();
  });

  it('底层动作失败时会保留现有错误消息语义', () => {
    const { sourceRegistry } = createBusinessSourceHarness();
    const propertyEditor = useMapFeaturePropertyEditor({
      mapRef: ref(createMapExpose()),
      sourceRegistry,
    });

    const result = propertyEditor.saveItem(
      {
        type: 'terradraw',
        controlType: 'draw',
        featureId: 'missing-feature',
      },
      {
        key: 'name',
        value: '不会成功',
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('TerraDraw 控件尚未初始化完成');
  });
});
