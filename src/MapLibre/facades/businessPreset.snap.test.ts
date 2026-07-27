import { describe, expect, it } from 'vitest';
import type { FeatureCollection, LineString, MultiLineString } from 'geojson';
import type { FilterSpecification } from 'maplibre-gl';
import type { MapBusinessSource, MapBusinessSourceRegistry } from './createMapBusinessSource';
import type { MapFeatureSnapRule } from '../plugins/map-feature-snap';
import {
  createBusinessSnapFeatureResolver,
  createSimpleCircleStyle,
  createSimpleFillStyle,
  createSimpleLineStyle,
} from './businessPreset';

/**
 * 创建测试用业务 source 注册表。
 * @param data 完整 GeoJSON 数据
 * @returns 只实现 resolver 所需接口的注册表
 */
function createRegistry(data: FeatureCollection): MapBusinessSourceRegistry {
  const source = {
    sourceId: 'source-path',
    sourceProps: {
      sourceId: 'source-path',
      data,
      filter: ['==', 'scope', 'visible'],
    },
    getLayers: () => [
      {
        type: 'line',
        layerId: 'path-main-layer',
        geometryTypes: ['LineString'],
        where: { active: true },
      },
      {
        type: 'line',
        layerId: 'path-other-layer',
        filter: ['==', 'category', 'other'],
      },
    ],
  } as MapBusinessSource;

  return {
    listSources: () => [source],
  } as MapBusinessSourceRegistry;
}

describe('createBusinessSnapFeatureResolver', () => {
  it('简单业务样式优先使用吸附 feature-state 颜色', () => {
    const expressions = [
      createSimpleLineStyle({ color: '#111827' }).paint?.['line-color'],
      createSimpleCircleStyle({ color: '#111827' }).paint?.['circle-color'],
      createSimpleFillStyle({ color: '#111827' }).paint?.['fill-color'],
    ];

    expressions.forEach((expression) => {
      expect(expression).toEqual([
        'case',
        ['boolean', ['feature-state', 'snapPreview'], false],
        ['coalesce', ['feature-state', 'snapPreviewColor'], '#111827'],
        '#111827',
      ]);
    });
  });

  it('按 source、layer 和 filter 返回完整 LineString 与 MultiLineString', () => {
    const fullCoordinates = [[0, 0], [1, 1], [2, 0]];
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'line-ok',
          properties: { scope: 'visible', active: true },
          geometry: { type: 'LineString', coordinates: fullCoordinates },
        },
        {
          type: 'Feature',
          id: 'multi-ok',
          properties: { scope: 'visible', active: true },
          geometry: {
            type: 'MultiLineString',
            coordinates: [fullCoordinates, [[3, 0], [4, 0]]],
          },
        },
        {
          type: 'Feature',
          id: 'source-filtered',
          properties: { scope: 'hidden', active: true },
          geometry: { type: 'LineString', coordinates: [[5, 0], [6, 0]] },
        },
        {
          type: 'Feature',
          id: 'layer-filtered',
          properties: { scope: 'visible', active: false },
          geometry: { type: 'LineString', coordinates: [[7, 0], [8, 0]] },
        },
        {
          type: 'Feature',
          id: 'polygon',
          properties: { scope: 'visible', active: true },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
          },
        },
      ],
    };
    const resolver = createBusinessSnapFeatureResolver(createRegistry(data));

    const result = resolver?.({
      id: 'path',
      layerIds: ['path-main-layer'],
      snapTo: ['sameLayerIntersect'],
    });

    expect(result?.map((item) => item.feature.id)).toEqual(['line-ok', 'multi-ok']);
    expect(result?.map((item) => item.layerId)).toEqual([
      'path-main-layer',
      'path-main-layer',
    ]);
    expect(result?.[0].feature.geometry.coordinates).toEqual(fullCoordinates);
    expect(result?.every((item) => (
      item.feature.geometry.type === 'LineString'
      || item.feature.geometry.type === 'MultiLineString'
    ))).toBe(true);
  });

  it('同一要素命中不同 layer 时保留独立 layer 身份', () => {
    const lineFeature = {
      type: 'Feature',
      id: 'shared-line',
      properties: { scope: 'visible', active: true, category: 'other' },
      geometry: {
        type: 'LineString',
        coordinates: [[0, 0], [1, 1]],
      },
    } as GeoJSON.Feature<LineString | MultiLineString>;
    const resolver = createBusinessSnapFeatureResolver(createRegistry({
      type: 'FeatureCollection',
      features: [lineFeature],
    }));

    const result = resolver?.({
      id: 'path',
      layerIds: ['path-main-layer', 'path-other-layer'],
    });

    expect(result?.map((item) => item.layerId)).toEqual([
      'path-main-layer',
      'path-other-layer',
    ]);
  });

  it('按当前地图 zoom 计算 source 与 layer filter', () => {
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'zoom-line',
        properties: { active: true },
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      }],
    };
    const source = {
      sourceId: 'source-path',
      sourceProps: {
        sourceId: 'source-path',
        data,
        filter: ['case', ['>=', ['zoom'], 10], true, false] as unknown as FilterSpecification,
      },
      getLayers: () => [{ type: 'line', layerId: 'path-main-layer' }],
    } as MapBusinessSource;
    const registry = { listSources: () => [source] } as MapBusinessSourceRegistry;
    const resolver = createBusinessSnapFeatureResolver(registry);
    const rule: MapFeatureSnapRule = {
      id: 'path',
      layerIds: ['path-main-layer'],
      snapTo: ['sameLayerIntersect'],
    };

    expect(resolver?.(rule, { zoom: 8 })).toEqual([]);
    expect(resolver?.(rule, { zoom: 12 }).map((item) => item.feature.id)).toEqual(['zoom-line']);
  });

  it('保留 false filter 并排除 source 中全部线', () => {
    const source = {
      sourceId: 'source-path',
      sourceProps: {
        sourceId: 'source-path',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            id: 'hidden-line',
            properties: {},
            geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          }],
        },
        filter: false,
      },
      getLayers: () => [{ type: 'line', layerId: 'path-main-layer' }],
    } as MapBusinessSource;
    const resolver = createBusinessSnapFeatureResolver({
      listSources: () => [source],
    } as MapBusinessSourceRegistry);

    expect(resolver?.({ id: 'path', layerIds: ['path-main-layer'] })).toEqual([]);
  });

  it('source filter 使用原始 id 且 layer filter 使用 promoteId', () => {
    const source = {
      sourceId: 'source-path',
      sourceProps: {
        sourceId: 'source-path',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            id: 'raw-id',
            properties: { businessId: 'promoted-id' },
            geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          }],
        },
        promoteId: 'businessId',
        filter: ['==', '$id', 'raw-id'],
      },
      getLayers: () => [{
        type: 'line',
        layerId: 'path-main-layer',
        filter: ['==', '$id', 'promoted-id'],
      }],
    } as MapBusinessSource;
    const resolver = createBusinessSnapFeatureResolver({
      listSources: () => [source],
    } as MapBusinessSourceRegistry);

    expect(resolver?.({ id: 'path', layerIds: ['path-main-layer'] })
      .map((item) => item.feature.id)).toEqual(['raw-id']);
  });
});
