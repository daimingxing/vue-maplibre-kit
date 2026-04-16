import {
  Colors,
  DxfWriter,
  LineTypes,
  LWPolylineFlags,
  point2d,
  type LWPolylineVertex,
} from '@tarikjabiri/dxf';
import proj4 from 'proj4';
import type { Position } from 'geojson';
import type { MapBusinessSource } from '../../facades/createMapBusinessSource';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../../shared/map-common-tools';
import {
  DEFAULT_DXF_FILE_NAME,
  type ExportBusinessSourcesToDxfOptions,
  type MapDxfExportResult,
  type MapDxfExportTaskOptions,
  type ResolvedMapDxfExportTaskOptions,
} from './types';

/** 坐标转换函数。 */
type CoordinateTransform = (position: Position) => Position;

/**
 * 判断对象是否显式包含指定字段。
 * @param target 目标对象
 * @param key 字段名
 * @returns 是否显式包含该字段
 */
function hasOwnKey<T extends object>(
  target: T | null | undefined,
  key: keyof T
): target is T & Record<typeof key, unknown> {
  return Boolean(target) && Object.prototype.hasOwnProperty.call(target, key);
}

/**
 * 归一化文件名，确保以 .dxf 结尾。
 * @param fileName 原始文件名
 * @returns 最终文件名
 */
function normalizeFileName(fileName: string | null | undefined): string {
  const trimmedName = fileName?.trim();
  if (!trimmedName) {
    return DEFAULT_DXF_FILE_NAME;
  }

  // 如果已经有 .dxf 扩展名（不区分大小写），直接返回
  if (/\.dxf$/i.test(trimmedName)) {
    return trimmedName;
  }

  // 移除其他扩展名并添加 .dxf
  const nameWithoutExt = trimmedName.replace(/\.[^.]*$/, '');
  return nameWithoutExt ? `${nameWithoutExt}.dxf` : DEFAULT_DXF_FILE_NAME;
}

/**
 * 清理图层名，移除或替换 DXF 非法字符。
 * DXF 图层名不能包含：/ \ : * ? " < > |
 * @param layerName 原始图层名
 * @returns 清理后的图层名
 */
function sanitizeLayerName(layerName: string): string {
  // 移除非法字符，替换为下划线
  const sanitized = layerName.replace(/[/\\:*?"<>|]/g, '_');

  // 限制长度（AutoCAD 标准为 255 字符）
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength);
  }

  // 确保不为空
  return sanitized || 'default_layer';
}

/**
 * 归一化 sourceId 列表。
 * @param sourceIds 原始 sourceId 列表
 * @returns 归一化后的 sourceId 列表
 */
function normalizeSourceIds(sourceIds: string[] | null | undefined): string[] | null {
  if (sourceIds === null || sourceIds === undefined) {
    return null;
  }

  return [...sourceIds];
}

/**
 * 合并 DXF 导出任务配置。
 * 合并顺序固定为：封装层默认值 -> 本次局部覆写。
 *
 * @param defaults 封装层默认值
 * @param overrides 本次局部覆写
 * @returns 最终生效的任务配置
 */
export function resolveMapDxfExportTaskOptions(
  defaults?: MapDxfExportTaskOptions | ResolvedMapDxfExportTaskOptions | null,
  overrides?: MapDxfExportTaskOptions | null
): ResolvedMapDxfExportTaskOptions {
  const rawSourceIds = hasOwnKey(overrides, 'sourceIds')
    ? overrides.sourceIds
    : defaults?.sourceIds;
  const rawFileName = hasOwnKey(overrides, 'fileName') ? overrides.fileName : defaults?.fileName;
  const rawSourceCrs = hasOwnKey(overrides, 'sourceCrs')
    ? overrides.sourceCrs
    : defaults?.sourceCrs;
  const rawTargetCrs = hasOwnKey(overrides, 'targetCrs')
    ? overrides.targetCrs
    : defaults?.targetCrs;
  const rawFeatureFilter = hasOwnKey(overrides, 'featureFilter')
    ? overrides.featureFilter
    : defaults?.featureFilter;
  const rawLayerNameResolver = hasOwnKey(overrides, 'layerNameResolver')
    ? overrides.layerNameResolver
    : defaults?.layerNameResolver;

  return {
    sourceIds: normalizeSourceIds(rawSourceIds),
    fileName: normalizeFileName(rawFileName),
    sourceCrs: rawSourceCrs,
    targetCrs: rawTargetCrs,
    featureFilter: rawFeatureFilter,
    layerNameResolver: rawLayerNameResolver,
  };
}

/**
 * 判断 source 数据是否为可直接导出的 FeatureCollection。
 * @param data 原始 source 数据
 * @returns 是否为标准 FeatureCollection
 */
function isFeatureCollectionData(data: unknown): data is MapCommonFeatureCollection {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<MapCommonFeatureCollection>;
  return candidate.type === 'FeatureCollection' && Array.isArray(candidate.features);
}

/**
 * 解析本次实际参与导出的业务 source 列表。
 * @param sourceList 当前注册表中的全部业务 source
 * @param sourceIds 指定的 sourceId 列表
 * @returns 本次参与导出的业务 source 列表
 */
function resolveTargetSources(
  sourceList: MapBusinessSource[],
  sourceIds: string[] | null
): MapBusinessSource[] {
  if (!sourceIds) {
    return [...sourceList];
  }

  const sourceMap = new Map(sourceList.map((source) => [source.sourceId, source] as const));
  const missingSourceIds = sourceIds.filter((sourceId) => !sourceMap.has(sourceId));

  if (missingSourceIds.length) {
    throw new Error(`未找到以下 sourceId：${missingSourceIds.join(', ')}`);
  }

  return sourceIds.map((sourceId) => sourceMap.get(sourceId) as MapBusinessSource);
}

/**
 * 生成坐标转换函数。
 * 预编译 proj4 投影对象以避免重复解析投影定义字符串。
 * @param taskOptions 导出任务配置
 * @param warnings 警告列表
 * @returns 最终生效的坐标转换函数
 */
function createCoordinateTransform(
  taskOptions: ResolvedMapDxfExportTaskOptions,
  warnings: string[]
): CoordinateTransform {
  const { sourceCrs, targetCrs } = taskOptions;

  if (!sourceCrs || !targetCrs) {
    warnings.push('已跳过坐标转换：未完整配置 sourceCrs 和 targetCrs，将按原坐标导出');
    // 返回副本避免修改原始数据
    return (position) => [...position] as Position;
  }

  if (sourceCrs === targetCrs) {
    // 同一坐标系下也需要返回副本
    return (position) => [...position] as Position;
  }

  // 预编译投影转换器，避免每次调用都重新解析投影定义
  let projConverter: proj4.Converter;
  try {
    projConverter = proj4(sourceCrs, targetCrs);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    warnings.push(
      `坐标系配置无效，已跳过坐标转换：${errorMessage}。将按原坐标导出`
    );
    return (position) => [...position] as Position;
  }

  return (position) => {
    try {
      const [x, y] = projConverter.forward([position[0], position[1]]) as [number, number];
      if (position.length > 2) {
        return [x, y, position[2]] as Position;
      }
      return [x, y] as Position;
    } catch (error) {
      // 单个坐标转换失败时，记录警告并返回原坐标副本
      const errorMessage = error instanceof Error ? error.message : String(error);
      warnings.push(`坐标转换失败 [${position.join(', ')}]：${errorMessage}`);
      return [...position] as Position;
    }
  };
}

/**
 * 构造线实体顶点列表。
 * 注意：DXF 的 LWPOLYLINE 实体不支持 Z 坐标，Z 值会被丢弃。
 * @param positions 坐标列表
 * @param transform 坐标转换函数
 * @param warnings 警告列表（用于记录 Z 坐标丢弃警告）
 * @param featureLabel 要素标识（用于警告信息）
 * @returns DXF 顶点列表
 */
function createPolylineVertices(
  positions: Position[],
  transform: CoordinateTransform,
  warnings: string[],
  featureLabel: string
): LWPolylineVertex[] {
  let hasZCoordinate = false;

  const vertices = positions.map((position) => {
    const transformedPosition = transform(position);
    if (transformedPosition.length > 2 && transformedPosition[2] !== undefined) {
      hasZCoordinate = true;
    }
    return {
      point: point2d(transformedPosition[0], transformedPosition[1]),
    };
  });

  if (hasZCoordinate) {
    warnings.push(
      `要素 '${featureLabel}' 包含 Z 坐标，但 DXF LWPOLYLINE 实体不支持 Z 坐标，Z 值已被丢弃`
    );
  }

  return vertices;
}

/**
 * 解析单条要素最终使用的图层名。
 * @param feature 当前要素
 * @param sourceId 所属 sourceId
 * @param taskOptions 导出任务配置
 * @returns 最终图层名
 */
function resolveLayerName(
  feature: MapCommonFeature,
  sourceId: string,
  taskOptions: ResolvedMapDxfExportTaskOptions
): string {
  const resolvedLayerName = taskOptions.layerNameResolver?.(feature, sourceId)?.trim();
  const rawLayerName = resolvedLayerName || sourceId;
  return sanitizeLayerName(rawLayerName);
}

/**
 * 确保目标图层已经在 DXF 中注册。
 * @param writer DXF 写入器
 * @param addedLayerSet 已注册图层集合
 * @param layerName 目标图层名
 */
function ensureLayer(
  writer: DxfWriter,
  addedLayerSet: Set<string>,
  layerName: string
): void {
  if (addedLayerSet.has(layerName)) {
    return;
  }

  writer.addLayer(layerName, Colors.White, LineTypes.Continuous);
  addedLayerSet.add(layerName);
}

/**
 * 解析可读的要素标识。
 * @param feature 当前要素
 * @returns 可读的要素标识
 */
function getFeatureLabel(feature: MapCommonFeature): string {
  if (feature.id !== undefined && feature.id !== null) {
    return String(feature.id);
  }

  return 'unknown';
}

/**
 * 写入点要素。
 * @param writer DXF 写入器
 * @param positions 点坐标列表
 * @param layerName 图层名
 * @param transform 坐标转换函数
 * @returns 新增的实体数量
 */
function addPointEntities(
  writer: DxfWriter,
  positions: Position[],
  layerName: string,
  transform: CoordinateTransform
): number {
  positions.forEach((position) => {
    const transformedPosition = transform(position);
    writer.addPoint(
      transformedPosition[0],
      transformedPosition[1],
      transformedPosition[2] ?? 0,
      {
        layerName,
      }
    );
  });

  return positions.length;
}

/**
 * 写入折线要素。
 * @param writer DXF 写入器
 * @param lineList 折线坐标集合
 * @param layerName 图层名
 * @param transform 坐标转换函数
 * @param warnings 警告列表
 * @param featureLabel 要素标识
 * @param closed 是否写成闭合折线
 * @returns 新增的实体数量
 */
function addPolylineEntities(
  writer: DxfWriter,
  lineList: Position[][],
  layerName: string,
  transform: CoordinateTransform,
  warnings: string[],
  featureLabel: string,
  closed = false
): number {
  let entityCount = 0;
  const minPoints = closed ? 3 : 2; // 闭合线至少 3 点，开放线至少 2 点

  lineList.forEach((lineCoordinates, index) => {
    if (lineCoordinates.length < minPoints) {
      if (lineCoordinates.length > 0) {
        warnings.push(
          `要素 '${featureLabel}' 的第 ${index + 1} 个几何部分点数不足（需要至少 ${minPoints} 个点，实际 ${lineCoordinates.length} 个），已跳过`
        );
      }
      return;
    }

    writer.addLWPolyline(
      createPolylineVertices(lineCoordinates, transform, warnings, featureLabel),
      {
        layerName,
        flags: closed ? LWPolylineFlags.Closed : LWPolylineFlags.None,
      }
    );
    entityCount += 1;
  });

  return entityCount;
}

/**
 * 将 GeoJSON 几何写入 DXF。
 * @param writer DXF 写入器
 * @param feature 当前要素
 * @param sourceId 所属 sourceId
 * @param layerName 目标图层名
 * @param transform 坐标转换函数
 * @param warnings 警告列表
 * @returns 新增的实体数量
 */
function addFeatureGeometryToDxf(
  writer: DxfWriter,
  feature: MapCommonFeature,
  sourceId: string,
  layerName: string,
  transform: CoordinateTransform,
  warnings: string[]
): number {
  const featureLabel = getFeatureLabel(feature);

  switch (feature.geometry.type) {
    case 'Point':
      return addPointEntities(writer, [feature.geometry.coordinates], layerName, transform);
    case 'MultiPoint':
      return addPointEntities(writer, feature.geometry.coordinates, layerName, transform);
    case 'LineString':
      return addPolylineEntities(
        writer,
        [feature.geometry.coordinates],
        layerName,
        transform,
        warnings,
        featureLabel
      );
    case 'MultiLineString':
      return addPolylineEntities(
        writer,
        feature.geometry.coordinates,
        layerName,
        transform,
        warnings,
        featureLabel
      );
    case 'Polygon':
      return addPolylineEntities(
        writer,
        feature.geometry.coordinates,
        layerName,
        transform,
        warnings,
        featureLabel,
        true
      );
    case 'MultiPolygon':
      return feature.geometry.coordinates.reduce((count, polygonCoordinates) => {
        return (
          count +
          addPolylineEntities(
            writer,
            polygonCoordinates,
            layerName,
            transform,
            warnings,
            featureLabel,
            true
          )
        );
      }, 0);
    default:
      warnings.push(
        `已跳过 source '${sourceId}' 中要素 '${getFeatureLabel(feature)}' 的几何类型 '${feature.geometry.type}'，当前 DXF 导出暂不支持`
      );
      return 0;
  }
}

/**
 * 将业务 source 导出为 DXF 文本。
 * @param options 执行参数
 * @returns DXF 导出结果
 */
export function exportBusinessSourcesToDxf(
  options: ExportBusinessSourcesToDxfOptions
): MapDxfExportResult {
  const { sourceRegistry, taskOptions } = options;
  const writer = new DxfWriter();
  const warnings: string[] = [];
  const addedLayerSet = new Set<string>(['0']);
  const transform = createCoordinateTransform(taskOptions, warnings);
  const sourceList = sourceRegistry.listSources();
  const targetSources = resolveTargetSources(sourceList, taskOptions.sourceIds);
  let featureCount = 0;
  let entityCount = 0;

  targetSources.forEach((source) => {
    const sourceData = source.sourceProps.data;
    if (!isFeatureCollectionData(sourceData)) {
      warnings.push(
        `已跳过 source '${source.sourceId}'：当前 sourceProps.data 不是可直接导出的 FeatureCollection`
      );
      return;
    }

    sourceData.features.forEach((feature) => {
      const normalizedFeature = feature as MapCommonFeature;

      if (taskOptions.featureFilter && !taskOptions.featureFilter(normalizedFeature, source.sourceId)) {
        return;
      }

      featureCount += 1;
      const layerName = resolveLayerName(normalizedFeature, source.sourceId, taskOptions);
      ensureLayer(writer, addedLayerSet, layerName);
      entityCount += addFeatureGeometryToDxf(
        writer,
        normalizedFeature,
        source.sourceId,
        layerName,
        transform,
        warnings
      );
    });
  });

  if (!entityCount) {
    throw new Error('当前没有可导出的业务要素');
  }

  return {
    content: writer.stringify(),
    fileName: taskOptions.fileName,
    sourceCount: targetSources.length,
    featureCount,
    entityCount,
    warnings: [...warnings],
  };
}
