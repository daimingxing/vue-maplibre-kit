import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import proj4 from 'proj4';
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  type MapBusinessSource,
} from '../../facades/createMapBusinessSource';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../../shared/map-common-tools';
import {
  exportBusinessSourcesToDxf,
  resolveMapDxfExportTaskOptions,
  type MapDxfExportTaskOptions,
} from './index';

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
 * 创建测试用点要素。
 * @param id 要素 ID
 * @param coordinates 点坐标
 * @returns 标准点要素
 */
function createPointFeature(id: string, coordinates: [number, number]): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
    },
    geometry: {
      type: 'Point',
      coordinates,
    },
  };
}

/**
 * 创建测试用线要素。
 * @param id 要素 ID
 * @param coordinates 线坐标
 * @returns 标准线要素
 */
function createLineFeature(id: string, coordinates: [number, number][]): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

/**
 * 创建测试用面要素。
 * @param id 要素 ID
 * @param coordinates 面坐标
 * @returns 标准面要素
 */
function createPolygonFeature(id: string, coordinates: [number, number][][]): MapCommonFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
    },
    geometry: {
      type: 'Polygon',
      coordinates,
    },
  };
}

/**
 * 创建测试用业务 source。
 * @param sourceId source ID
 * @param features 要素列表
 * @returns 业务 source
 */
function createBusinessSource(sourceId: string, features: MapCommonFeature[]): MapBusinessSource {
  return createMapBusinessSource({
    sourceId,
    data: ref(createFeatureCollection(features)),
    promoteId: 'id',
  });
}

/**
 * 统计 DXF 文本中的实体数量。
 * @param content DXF 文本
 * @param entityType 实体类型
 * @returns 实体数量
 */
function countEntity(content: string, entityType: 'POINT' | 'LWPOLYLINE'): number {
  return content.match(new RegExp(`0\\n${entityType}\\n`, 'g'))?.length || 0;
}

/**
 * 提取 DXF 文本中的首个点实体坐标。
 * @param content DXF 文本
 * @returns 点实体坐标
 */
function extractFirstPoint(content: string): [number, number, number] {
  const matchResult = content.match(/0\nPOINT[\s\S]*?\n10\n([^\n]+)\n20\n([^\n]+)\n30\n([^\n]+)/);
  if (!matchResult) {
    throw new Error('未找到点实体');
  }

  return [
    Number(matchResult[1]),
    Number(matchResult[2]),
    Number(matchResult[3]),
  ];
}

describe('exportBusinessSourcesToDxf', () => {
  it('应支持导出全部 source 和按 sourceIds 局部导出', () => {
    const sourceA = createBusinessSource('source-a', [createPointFeature('point-a', [1, 2])]);
    const sourceB = createBusinessSource('source-b', [
      createLineFeature('line-b', [
        [0, 0],
        [10, 10],
      ]),
    ]);
    const sourceRegistry = createMapBusinessSourceRegistry([sourceA, sourceB]);

    const exportAllResult = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
      }),
    });

    expect(exportAllResult.sourceCount).toBe(2);
    expect(exportAllResult.featureCount).toBe(2);
    expect(exportAllResult.entityCount).toBe(2);

    const partialResult = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceIds: ['source-a'],
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
      }),
    });

    expect(partialResult.sourceCount).toBe(1);
    expect(partialResult.featureCount).toBe(1);
    expect(partialResult.entityCount).toBe(1);
    expect(countEntity(partialResult.content, 'POINT')).toBe(1);
    expect(countEntity(partialResult.content, 'LWPOLYLINE')).toBe(0);
  });

  it('应按 defaults -> overrides 合并任务配置', () => {
    const defaults: MapDxfExportTaskOptions = {
      sourceIds: ['source-a'],
      fileName: 'default.dxf',
      sourceCrs: 'EPSG:4326',
      targetCrs: 'EPSG:3857',
      featureFilter: () => true,
      layerNameResolver: () => 'default-layer',
    };
    const overrideFilter = () => false;
    const overrideLayerNameResolver = () => 'override-layer';

    const resolvedOptions = resolveMapDxfExportTaskOptions(defaults, {
      sourceIds: ['source-b'],
      fileName: 'override.dxf',
      targetCrs: 'EPSG:4490',
      featureFilter: overrideFilter,
      layerNameResolver: overrideLayerNameResolver,
    });

    expect(resolvedOptions.sourceIds).toEqual(['source-b']);
    expect(resolvedOptions.fileName).toBe('override.dxf');
    expect(resolvedOptions.sourceCrs).toBe('EPSG:4326');
    expect(resolvedOptions.targetCrs).toBe('EPSG:4490');
    expect(resolvedOptions.featureFilter).toBe(overrideFilter);
    expect(resolvedOptions.layerNameResolver).toBe(overrideLayerNameResolver);
  });

  it('应在双端 CRS 都存在且不同时执行坐标转换', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:3857',
      }),
    });

    const [x, y] = proj4('EPSG:4326', 'EPSG:3857', [1, 1]) as [number, number];
    const [resultX, resultY] = extractFirstPoint(result.content);

    expect(resultX).toBeCloseTo(x, 6);
    expect(resultY).toBeCloseTo(y, 6);
    expect(result.warnings).toEqual([]);
  });

  it('应在 sourceCrs 和 targetCrs 相同时保留原坐标', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
      }),
    });

    const [resultX, resultY, resultZ] = extractFirstPoint(result.content);
    expect(resultX).toBe(1);
    expect(resultY).toBe(1);
    expect(resultZ).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it('应在缺少任一 CRS 时跳过转换并返回警告', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
      }),
    });

    const [resultX, resultY] = extractFirstPoint(result.content);
    expect(resultX).toBe(1);
    expect(resultY).toBe(1);
    expect(result.warnings).toEqual([
      '已跳过坐标转换：未完整配置 sourceCrs 和 targetCrs，将按原坐标导出',
    ]);
  });

  it('应覆盖点线面、多几何和不支持几何的导出行为', () => {
    const mixedFeature = {
      type: 'Feature',
      id: 'geometry-collection',
      properties: {
        id: 'geometry-collection',
      },
      geometry: {
        type: 'GeometryCollection',
        geometries: [],
      },
    } as unknown as MapCommonFeature;
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [
        createPointFeature('point-a', [0, 0]),
        {
          type: 'Feature',
          id: 'multi-point',
          properties: { id: 'multi-point' },
          geometry: {
            type: 'MultiPoint',
            coordinates: [
              [1, 1],
              [2, 2],
            ],
          },
        } as MapCommonFeature,
        createLineFeature('line-a', [
          [0, 0],
          [1, 1],
        ]),
        {
          type: 'Feature',
          id: 'multi-line',
          properties: { id: 'multi-line' },
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [
                [0, 0],
                [1, 1],
              ],
              [
                [2, 2],
                [3, 3],
              ],
            ],
          },
        } as MapCommonFeature,
        createPolygonFeature('polygon-a', [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 0],
          ],
          [
            [1, 1],
            [2, 1],
            [2, 2],
            [1, 1],
          ],
        ]),
        {
          type: 'Feature',
          id: 'multi-polygon',
          properties: { id: 'multi-polygon' },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [0, 0],
                  [5, 0],
                  [5, 5],
                  [0, 0],
                ],
              ],
              [
                [
                  [10, 10],
                  [12, 10],
                  [12, 12],
                  [10, 10],
                ],
              ],
            ],
          },
        } as MapCommonFeature,
        mixedFeature,
      ]),
    ]);

    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
      }),
    });

    expect(result.featureCount).toBe(7);
    expect(result.entityCount).toBe(10);
    expect(countEntity(result.content, 'POINT')).toBe(3);
    expect(countEntity(result.content, 'LWPOLYLINE')).toBe(7);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("几何类型 'GeometryCollection'");
  });

  it('应在存在未知 sourceId 时直接报错', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);

    expect(() =>
      exportBusinessSourcesToDxf({
        sourceRegistry,
        taskOptions: resolveMapDxfExportTaskOptions({
          sourceIds: ['missing-source'],
          sourceCrs: 'EPSG:4326',
          targetCrs: 'EPSG:4326',
        }),
      })
    ).toThrowError('未找到以下 sourceId：missing-source');
  });

  it('应在没有可导出实体时抛出固定错误', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);

    expect(() =>
      exportBusinessSourcesToDxf({
        sourceRegistry,
        taskOptions: resolveMapDxfExportTaskOptions({
          sourceCrs: 'EPSG:4326',
          targetCrs: 'EPSG:4326',
          featureFilter: () => false,
        }),
      })
    ).toThrowError('当前没有可导出的业务要素');
  });
});
