import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { TrueColor } from '@tarikjabiri/dxf';
import proj4 from 'proj4';
import {
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  type MapBusinessSource,
} from '../../facades/createMapBusinessSource';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../../shared/map-common-tools';
import {
  DEFAULT_DXF_CRS_OPTIONS,
  DEFAULT_DXF_TRUE_COLOR_RULES,
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
function countEntity(content: string, entityType: 'POINT' | 'LWPOLYLINE' | 'CIRCLE'): number {
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

/**
 * 提取 DXF 文本中的首个圆实体坐标。
 * @param content DXF 文本
 * @returns 圆实体圆心坐标
 */
function extractFirstCircleCenter(content: string): [number, number, number] {
  const matchResult = content.match(/0\nCIRCLE[\s\S]*?\n10\n([^\n]+)\n20\n([^\n]+)\n30\n([^\n]+)/);
  if (!matchResult) {
    throw new Error('未找到圆实体');
  }

  return [
    Number(matchResult[1]),
    Number(matchResult[2]),
    Number(matchResult[3]),
  ];
}

/**
 * 判断 DXF 文本中是否存在指定图层名的实体引用。
 * @param content DXF 文本
 * @param layerName 图层名
 * @returns 是否命中
 */
function hasEntityLayer(content: string, layerName: string): boolean {
  return content.includes(`\n8\n${layerName}\n`);
}

/**
 * 转义正则中的特殊字符。
 * @param value 原始文本
 * @returns 可直接用于正则的文本
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 提取指定图层记录中的 TrueColor 值。
 * @param content DXF 文本
 * @param layerName 图层名
 * @returns TrueColor 数值；不存在时返回 null
 */
function extractLayerTrueColor(content: string, layerName: string): number | null {
  const layerRecordPattern = new RegExp(
    `0\\nLAYER\\n[\\s\\S]*?\\n2\\n${escapeRegExp(layerName)}\\n[\\s\\S]*?(?=\\n0\\n(?:LAYER|ENDTAB))`
  );
  const layerRecord = content.match(layerRecordPattern)?.[0];
  if (!layerRecord) {
    return null;
  }

  const matchResult = layerRecord.match(/\n420\n([^\n]+)/);
  return matchResult ? Number(matchResult[1]) : null;
}

/**
 * 提取首个实体上的 TrueColor 值。
 * @param content DXF 文本
 * @param entityType 实体类型
 * @returns TrueColor 数值；不存在时返回 null
 */
function extractFirstEntityTrueColor(
  content: string,
  entityType: 'POINT' | 'CIRCLE' | 'LWPOLYLINE'
): number | null {
  const matchResult = content.match(new RegExp(`0\\n${entityType}\\n[\\s\\S]*?\\n420\\n([^\\n]+)`));
  return matchResult ? Number(matchResult[1]) : null;
}

/**
 * 统计包含指定关键字的 warning 数量。
 * @param warnings 警告列表
 * @param keyword 关键字
 * @returns 命中数量
 */
function countWarningsByKeyword(warnings: string[], keyword: string): number {
  return warnings.filter((warning) => warning.includes(keyword)).length;
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

  it('默认应将点要素导出为 POINT', () => {
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

    expect(countEntity(result.content, 'POINT')).toBe(1);
    expect(countEntity(result.content, 'CIRCLE')).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it('应在配置 pointMode=circle 时将点要素导出为圆', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        pointMode: 'circle',
        pointRadius: 3,
      }),
    });

    expect(countEntity(result.content, 'CIRCLE')).toBe(1);
    expect(countEntity(result.content, 'POINT')).toBe(0);
    expect(result.content).toContain('\n40\n3\n');
    expect(result.warnings).toEqual([]);
  });

  it('应在线和面导出时按 lineWidth 写入 constantWidth', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [
        createLineFeature('line-a', [
          [0, 0],
          [10, 10],
        ]),
        createPolygonFeature('polygon-a', [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 0],
          ],
        ]),
      ]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        lineWidth: 2,
      }),
    });

    expect(countEntity(result.content, 'LWPOLYLINE')).toBe(2);
    expect(result.content).toContain('\n40\n2\n');
    expect(result.content).toContain('\n41\n2\n');
    expect(result.warnings).toEqual([]);
  });

  it('应按 defaults -> overrides 合并任务配置', () => {
    const defaults: MapDxfExportTaskOptions = {
      sourceIds: ['source-a'],
      fileName: 'default.dxf',
      sourceCrs: 'EPSG:4326',
      targetCrs: 'EPSG:3857',
      featureFilter: () => true,
      layerNameResolver: () => 'default-layer',
      layerTrueColorResolver: () => '#112233',
      featureTrueColorResolver: () => '#223344',
      lineWidth: 2,
      pointMode: 'circle',
      pointRadius: 3,
    };
    const overrideFilter = () => false;
    const overrideLayerNameResolver = () => 'override-layer';
    const overrideLayerTrueColorResolver: NonNullable<
      MapDxfExportTaskOptions['layerTrueColorResolver']
    > = () => '#445566';
    const overrideFeatureTrueColorResolver: NonNullable<
      MapDxfExportTaskOptions['featureTrueColorResolver']
    > = () => '#556677';

    const resolvedOptions = resolveMapDxfExportTaskOptions(defaults, {
      sourceIds: ['source-b'],
      fileName: 'override.dxf',
      targetCrs: 'EPSG:4490',
      featureFilter: overrideFilter,
      layerNameResolver: overrideLayerNameResolver,
      layerTrueColorResolver: overrideLayerTrueColorResolver,
      featureTrueColorResolver: overrideFeatureTrueColorResolver,
      lineWidth: 5,
      pointMode: 'point',
      pointRadius: 6,
    });

    expect(resolvedOptions.sourceIds).toEqual(['source-b']);
    expect(resolvedOptions.fileName).toBe('override.dxf');
    expect(resolvedOptions.sourceCrs).toBe('EPSG:4326');
    expect(resolvedOptions.targetCrs).toBe('EPSG:4490');
    expect(resolvedOptions.featureFilter).toBe(overrideFilter);
    expect(resolvedOptions.layerNameResolver).toBe(overrideLayerNameResolver);
    expect(resolvedOptions.layerTrueColorResolver).toBe(overrideLayerTrueColorResolver);
    expect(resolvedOptions.featureTrueColorResolver).toBe(overrideFeatureTrueColorResolver);
    expect(resolvedOptions.lineWidth).toBe(5);
    expect(resolvedOptions.pointMode).toBe('point');
    expect(resolvedOptions.pointRadius).toBeUndefined();
  });

  it('应在页面未传 CRS 时回退到全局默认 CRS', () => {
    const resolvedOptions = resolveMapDxfExportTaskOptions({
      fileName: 'default.dxf',
    });

    expect(resolvedOptions.sourceCrs).toBe(DEFAULT_DXF_CRS_OPTIONS.sourceCrs);
    expect(resolvedOptions.targetCrs).toBe(DEFAULT_DXF_CRS_OPTIONS.targetCrs);
    expect(resolvedOptions.lineWidth).toBeUndefined();
    expect(resolvedOptions.pointMode).toBe('point');
    expect(resolvedOptions.pointRadius).toBeUndefined();
  });

  it('应在 lineWidth 非法时回退为 undefined', () => {
    const resolvedOptions = resolveMapDxfExportTaskOptions({
      lineWidth: 0,
    });

    expect(resolvedOptions.lineWidth).toBeUndefined();
  });

  it('应在 pointMode=circle 且 pointRadius 非法时回退到默认半径 1', () => {
    const resolvedOptions = resolveMapDxfExportTaskOptions({
      pointMode: 'circle',
      pointRadius: -3,
    });

    expect(resolvedOptions.pointMode).toBe('circle');
    expect(resolvedOptions.pointRadius).toBe(1);
  });

  it('应在 pointMode=point 时忽略 pointRadius', () => {
    const resolvedOptions = resolveMapDxfExportTaskOptions({
      pointMode: 'point',
      pointRadius: 9,
    });

    expect(resolvedOptions.pointMode).toBe('point');
    expect(resolvedOptions.pointRadius).toBeUndefined();
  });

  it('全局 TrueColor 规则为空时，不应影响现有 DXF 导出', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const resolvedOptions = resolveMapDxfExportTaskOptions({
      sourceCrs: 'EPSG:4326',
      targetCrs: 'EPSG:4326',
    });
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolvedOptions,
    });

    expect(resolvedOptions.layerTrueColorResolver).toBe(DEFAULT_DXF_TRUE_COLOR_RULES.layerTrueColorResolver);
    expect(resolvedOptions.featureTrueColorResolver).toBe(
      DEFAULT_DXF_TRUE_COLOR_RULES.featureTrueColorResolver
    );
    expect(resolvedOptions.pointMode).toBe('point');
    expect(resolvedOptions.pointRadius).toBeUndefined();
    expect(result.entityCount).toBe(1);
    expect(result.warnings).toEqual([]);
    expect(result.content.includes('\n420\n')).toBe(false);
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

  it('应在只传 sourceCrs 时继续回退到全局 targetCrs', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
      }),
    });

    const [x, y] = proj4('EPSG:4326', 'EPSG:3857', [1, 1]) as [number, number];
    const [resultX, resultY] = extractFirstPoint(result.content);
    expect(resultX).toBeCloseTo(x, 6);
    expect(resultY).toBeCloseTo(y, 6);
    expect(result.warnings).toEqual([]);
  });

  it('应在显式清空双端 CRS 时跳过转换并返回警告', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions(undefined, {
        sourceCrs: undefined,
        targetCrs: undefined,
      }),
    });

    const [resultX, resultY] = extractFirstPoint(result.content);
    expect(resultX).toBe(1);
    expect(resultY).toBe(1);
    expect(result.warnings).toEqual([
      '已跳过坐标转换：未完整配置 sourceCrs 和 targetCrs，将按原坐标导出',
    ]);
  });

  it('应在显式提供非法 CRS 时直接报错', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);

    expect(() =>
      exportBusinessSourcesToDxf({
        sourceRegistry,
        taskOptions: resolveMapDxfExportTaskOptions({
          sourceCrs: 'BAD:VALUE',
          targetCrs: 'EPSG:3857',
        }),
      })
    ).toThrowError(
      "DXF 导出坐标系配置无效：sourceCrs='BAD:VALUE'，targetCrs='EPSG:3857'。Could not parse to valid json: BAD:VALUE"
    );
  });

  it('应清洗 layerNameResolver 返回的非法图层名', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        layerNameResolver: () => 'layer/a:b?c*test',
      }),
    });

    expect(hasEntityLayer(result.content, 'layer_a_b_c_test')).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('页面 defaults.layerTrueColorResolver 应在默认按 sourceId 分层时生效', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        layerTrueColorResolver: (layerName, sourceId) =>
          layerName === sourceId ? '#112233' : undefined,
      }),
    });

    expect(extractLayerTrueColor(result.content, 'source-a')).toBe(TrueColor.fromHex('#112233'));
    expect(extractFirstEntityTrueColor(result.content, 'POINT')).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it('单次 overrides.layerTrueColorResolver 应覆盖页面规则', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions(
        {
          sourceCrs: 'EPSG:4326',
          targetCrs: 'EPSG:4326',
          layerTrueColorResolver: () => '#112233',
        },
        {
          layerTrueColorResolver: () => '#445566',
        }
      ),
    });

    expect(extractLayerTrueColor(result.content, 'source-a')).toBe(TrueColor.fromHex('#445566'));
    expect(result.warnings).toEqual([]);
  });

  it('自定义 layerNameResolver 后仍可写入图层 TrueColor', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        layerNameResolver: () => 'custom-layer',
        layerTrueColorResolver: (layerName) => (layerName === 'custom-layer' ? '#ABCDEF' : undefined),
      }),
    });

    expect(extractLayerTrueColor(result.content, 'custom-layer')).toBe(
      TrueColor.fromHex('#ABCDEF')
    );
    expect(result.warnings).toEqual([]);
  });

  it('featureTrueColorResolver 应写入实体色，并覆盖图层继承色', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        layerTrueColorResolver: () => '#112233',
        featureTrueColorResolver: () => '#445566',
      }),
    });

    expect(extractLayerTrueColor(result.content, 'source-a')).toBe(TrueColor.fromHex('#112233'));
    expect(extractFirstEntityTrueColor(result.content, 'POINT')).toBe(TrueColor.fromHex('#445566'));
    expect(result.warnings).toEqual([]);
  });

  it('同一最终 DXF 图层出现多个不同图层色时，应保留首次颜色且只告警一次', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
      createBusinessSource('source-b', [
        createPointFeature('point-b', [2, 2]),
        createPointFeature('point-c', [3, 3]),
      ]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        layerNameResolver: () => 'same-layer',
        layerTrueColorResolver: (_layerName, sourceId) =>
          sourceId === 'source-a' ? '#112233' : '#445566',
      }),
    });

    expect(extractLayerTrueColor(result.content, 'same-layer')).toBe(TrueColor.fromHex('#112233'));
    expect(countWarningsByKeyword(result.warnings, '多个图层 TrueColor')).toBe(1);
  });

  it('非法 TrueColor 值应产生 warning，但不影响几何导出', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        layerTrueColorResolver: () => '#12ZZ33' as `#${string}`,
      }),
    });

    expect(result.entityCount).toBe(1);
    expect(countEntity(result.content, 'POINT')).toBe(1);
    expect(extractLayerTrueColor(result.content, 'source-a')).toBeNull();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("TrueColor 值 '#12ZZ33' 非法");
  });

  it('应在不同来源映射到同一最终 DXF 图层时只返回一条告警', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
      createBusinessSource('source-b', [createPointFeature('point-b', [2, 2])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        layerNameResolver: (_, sourceId) => (sourceId === 'source-a' ? 'same/layer' : 'same:layer'),
      }),
    });

    expect(result.entityCount).toBe(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("DXF 图层 'same_layer' 出现同名合层");
    expect(result.warnings[0]).toContain("source 'source-a' / 原始图层名 'same/layer'");
    expect(result.warnings[0]).toContain("source 'source-b' / 原始图层名 'same:layer'");
    expect(result.warnings[0]).toContain('导出后将合并到同一 DXF layer');
  });

  it('应在同一来源重复命中同一最终 DXF 图层时不重复刷告警', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [
        createPointFeature('point-a', [1, 1]),
        createPointFeature('point-b', [2, 2]),
        createPointFeature('point-c', [3, 3]),
      ]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
        layerNameResolver: (feature) => {
          if (feature.id === 'point-a') {
            return 'same/layer';
          }

          if (feature.id === 'point-b') {
            return 'same:layer';
          }

          return 'same?layer';
        },
      }),
    });

    expect(result.entityCount).toBe(3);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("DXF 图层 'same_layer' 出现同名合层");
    expect(result.warnings[0]).toContain("source 'source-a' / 原始图层名 'same/layer'");
    expect(result.warnings[0]).toContain("source 'source-a' / 原始图层名 'same:layer'");
  });

  it('默认按 sourceId 分层时不应产生同名合层告警', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [createPointFeature('point-a', [1, 1])]),
      createBusinessSource('source-b', [createPointFeature('point-b', [2, 2])]),
    ]);
    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:4326',
      }),
    });

    expect(result.warnings).toEqual([]);
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

  it('应在折线顶点转换失败时跳过整个要素并保留其他实体', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [
        createPointFeature('point-a', [0, 0]),
        createLineFeature('line-bad', [
          [0, 0],
          [Number.NaN, 1],
          [2, 2],
        ]),
      ]),
    ]);

    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:3857',
      }),
    });

    expect(result.featureCount).toBe(2);
    expect(result.entityCount).toBe(1);
    expect(countEntity(result.content, 'POINT')).toBe(1);
    expect(countEntity(result.content, 'LWPOLYLINE')).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("要素 'line-bad'");
    expect(result.warnings[0]).toContain('第 2 个顶点坐标转换失败');
    expect(result.warnings[0]).toContain('已跳过整个要素');
  });

  it('应在多面任一环顶点转换失败时跳过整个要素', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [
        createPointFeature('point-a', [0, 0]),
        {
          type: 'Feature',
          id: 'multi-polygon-bad',
          properties: { id: 'multi-polygon-bad' },
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
                  [Number.NaN, 10],
                  [12, 12],
                  [10, 10],
                ],
              ],
            ],
          },
        } as MapCommonFeature,
      ]),
    ]);

    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:3857',
      }),
    });

    expect(result.featureCount).toBe(2);
    expect(result.entityCount).toBe(1);
    expect(countEntity(result.content, 'POINT')).toBe(1);
    expect(countEntity(result.content, 'LWPOLYLINE')).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("要素 'multi-polygon-bad'");
    expect(result.warnings[0]).toContain('第 2 个面片的第 1 个环的第 2 个顶点坐标转换失败');
    expect(result.warnings[0]).toContain('已跳过整个要素');
  });

  it('应在多点部分坐标转换失败时仅跳过失败点', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [
        {
          type: 'Feature',
          id: 'multi-point-bad',
          properties: { id: 'multi-point-bad' },
          geometry: {
            type: 'MultiPoint',
            coordinates: [
              [0, 0],
              [Number.NaN, 1],
              [2, 2],
            ],
          },
        } as MapCommonFeature,
      ]),
    ]);

    const result = exportBusinessSourcesToDxf({
      sourceRegistry,
      taskOptions: resolveMapDxfExportTaskOptions({
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:3857',
      }),
    });

    expect(result.featureCount).toBe(1);
    expect(result.entityCount).toBe(2);
    expect(countEntity(result.content, 'POINT')).toBe(2);
    expect(countEntity(result.content, 'LWPOLYLINE')).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("要素 'multi-point-bad'");
    expect(result.warnings[0]).toContain('第 2 个点坐标转换失败');
    expect(result.warnings[0]).toContain('已跳过该点');
  });

  it('应在全部实体都因坐标转换失败被跳过时抛出详细错误', () => {
    const sourceRegistry = createMapBusinessSourceRegistry([
      createBusinessSource('source-a', [
        createPointFeature('point-bad', [Number.NaN, 0]),
        createLineFeature('line-bad', [
          [0, 0],
          [Number.NaN, 1],
          [2, 2],
        ]),
      ]),
    ]);

    let thrownError: Error | null = null;

    try {
      exportBusinessSourcesToDxf({
        sourceRegistry,
        taskOptions: resolveMapDxfExportTaskOptions({
          sourceCrs: 'EPSG:4326',
          targetCrs: 'EPSG:3857',
        }),
      });
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toContain('当前没有可导出的业务要素：');
    expect(thrownError?.message).toContain("要素 'point-bad'");
    expect(thrownError?.message).toContain("要素 'line-bad'");
    expect(thrownError?.message).toContain('coordinates must be finite numbers');
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

