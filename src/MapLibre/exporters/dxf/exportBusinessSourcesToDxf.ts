import {
  Colors,
  DxfWriter,
  LineTypes,
  LWPolylineFlags,
  TrueColor,
  point2d,
  point3d,
  type LWPolylineVertex,
} from '@tarikjabiri/dxf';
import proj4 from 'proj4';
import type { Position } from 'geojson';
import type { MapBusinessSource } from '../../facades/createMapBusinessSource';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../../shared/map-common-tools';
import {
  DEFAULT_DXF_CRS_OPTIONS,
  DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS,
  DEFAULT_DXF_TRUE_COLOR_RULES,
} from './defaults';
import {
  DEFAULT_DXF_FILE_NAME,
  type ExportBusinessSourcesToDxfOptions,
  type MapDxfExportResult,
  type MapDxfExportTaskOptions,
  type MapDxfPointMode,
  type MapDxfTrueColor,
  type ResolvedMapDxfExportTaskOptions,
} from './types';

/**
 * 坐标转换成功结果。
 */
interface CoordinateTransformSuccess {
  ok: true;
  position: Position;
}

/**
 * 坐标转换失败结果。
 */
interface CoordinateTransformFailure {
  ok: false;
  position: Position;
  errorMessage: string;
}

/**
 * 坐标转换结果。
 */
type CoordinateTransformResult = CoordinateTransformSuccess | CoordinateTransformFailure;

/**
 * 坐标转换函数。
 * 返回坐标转换结果，失败结果表示当前坐标无法投影。
 */
type CoordinateTransform = (position: Position) => CoordinateTransformResult;

/**
 * 被整要素跳过的诊断信息。
 */
interface SkippedFeatureDetail {
  sourceId: string;
  featureLabel: string;
  geometryType: string;
  message: string;
}

/**
 * 当前要素的导出上下文。
 */
interface FeatureExportContext {
  sourceId: string;
  featureLabel: string;
  geometryType: string;
}

/**
 * 折线部件定义。
 */
interface PolylinePart {
  positions: Position[];
  label: string;
}

/**
 * 折线顶点构建成功结果。
 */
interface PolylineVerticesSuccess {
  ok: true;
  vertices: LWPolylineVertex[];
  hasZCoordinate: boolean;
}

/**
 * 折线顶点构建失败结果。
 */
interface PolylineVerticesFailure {
  ok: false;
  message: string;
}

/**
 * 折线顶点构建结果。
 */
type PolylineVerticesResult = PolylineVerticesSuccess | PolylineVerticesFailure;

/**
 * 图层名解析结果。
 */
interface ResolvedLayerName {
  rawLayerName: string;
  layerName: string;
}

/**
 * DXF 图层使用记录。
 */
interface DxfLayerUsageRecord {
  sourceId: string;
  rawLayerName: string;
}

/**
 * 归一化后的 TrueColor 结果。
 */
interface ResolvedTrueColorValue {
  normalizedHex: MapDxfTrueColor;
  layerTrueColorValue: number;
  entityTrueColorValue: string;
}

/**
 * DXF 图层 TrueColor 使用记录。
 */
interface DxfLayerTrueColorRecord {
  sourceId: string;
  normalizedHex: MapDxfTrueColor;
}

/**
 * DXF 实体公共配置。
 */
interface DxfEntityOptions {
  layerName: string;
  trueColor?: string;
  lineWidth?: number;
}

const MAX_SKIP_DETAILS_IN_ERROR = 3;
const DXF_TRUE_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

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
 * 归一化统一线宽。
 * @param rawLineWidth 原始线宽
 * @param warnings 警告列表
 * @returns 可用于 DXF 折线的线宽；无效时返回 undefined
 */
function normalizeLineWidth(rawLineWidth: unknown, warnings: string[]): number | undefined {
  if (rawLineWidth === null || rawLineWidth === undefined) {
    return undefined;
  }

  const lineWidth = Number(rawLineWidth);

  // DXF 折线宽度必须是大于 0 的有限数值；非正数会导致实体宽度语义失效。
  if (!Number.isFinite(lineWidth) || lineWidth <= 0) {
    warnings.push(`DXF lineWidth 值 '${String(rawLineWidth)}' 非法：必须是大于 0 的数字，已跳过线宽设置`);
    return undefined;
  }

  return lineWidth;
}

/**
 * 归一化点导出模式。
 * @param rawPointMode 原始点导出模式
 * @returns 最终生效的点导出模式
 */
function normalizePointMode(rawPointMode: unknown): MapDxfPointMode {
  return rawPointMode === 'circle' ? 'circle' : 'point';
}

/**
 * 归一化点半径。
 * @param rawPointRadius 原始点半径
 * @param warnings 警告列表
 * @returns 可用于圆实体的半径；无效时回退到全局默认值
 */
function normalizePointRadius(rawPointRadius: unknown, warnings: string[]): number {
  const fallbackRadius = DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS.pointRadius ?? 1;

  if (rawPointRadius === null || rawPointRadius === undefined) {
    return fallbackRadius;
  }

  const pointRadius = Number(rawPointRadius);

  // 点导出为圆时，半径必须大于 0；否则 CAD 中会退化成不可见或非法几何。
  if (!Number.isFinite(pointRadius) || pointRadius <= 0) {
    warnings.push(
      `DXF pointRadius 值 '${String(rawPointRadius)}' 非法：必须是大于 0 的数字，已回退到默认半径 ${fallbackRadius}`
    );
    return fallbackRadius;
  }

  return pointRadius;
}

/**
 * 合并 DXF 导出任务配置。
 * 合并顺序固定为：DXF 全局默认配置 -> 页面 defaults -> 本次局部覆写。
 *
 * @param defaults 封装层默认值
 * @param overrides 本次局部覆写
 * @returns 最终生效的任务配置
 */
export function resolveMapDxfExportTaskOptions(
  defaults?: MapDxfExportTaskOptions | ResolvedMapDxfExportTaskOptions | null,
  overrides?: MapDxfExportTaskOptions | null
): ResolvedMapDxfExportTaskOptions {
  // 先注入库内统一维护的全局默认 CRS；如果页面 defaults 显式传了值（哪怕是 undefined），
  // 这里也允许它覆盖掉全局值，保留“页面可局部重写默认行为”的能力。
  const baseDefaults: MapDxfExportTaskOptions | ResolvedMapDxfExportTaskOptions = {
    ...DEFAULT_DXF_CRS_OPTIONS,
    ...DEFAULT_DXF_TRUE_COLOR_RULES,
    ...DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS,
    ...(defaults || {}),
  };

  const rawSourceIds = hasOwnKey(overrides, 'sourceIds')
    ? overrides.sourceIds
    : baseDefaults.sourceIds;
  const rawFileName = hasOwnKey(overrides, 'fileName')
    ? overrides.fileName
    : baseDefaults.fileName;
  const rawSourceCrs = hasOwnKey(overrides, 'sourceCrs')
    ? overrides.sourceCrs
    : baseDefaults.sourceCrs;
  const rawTargetCrs = hasOwnKey(overrides, 'targetCrs')
    ? overrides.targetCrs
    : baseDefaults.targetCrs;
  const rawFeatureFilter = hasOwnKey(overrides, 'featureFilter')
    ? overrides.featureFilter
    : baseDefaults.featureFilter;
  const rawLayerNameResolver = hasOwnKey(overrides, 'layerNameResolver')
    ? overrides.layerNameResolver
    : baseDefaults.layerNameResolver;
  const rawLayerTrueColorResolver = hasOwnKey(overrides, 'layerTrueColorResolver')
    ? overrides.layerTrueColorResolver
    : baseDefaults.layerTrueColorResolver;
  const rawFeatureTrueColorResolver = hasOwnKey(overrides, 'featureTrueColorResolver')
    ? overrides.featureTrueColorResolver
    : baseDefaults.featureTrueColorResolver;
  const rawLineWidth = hasOwnKey(overrides, 'lineWidth') ? overrides.lineWidth : baseDefaults.lineWidth;
  const rawPointMode = hasOwnKey(overrides, 'pointMode') ? overrides.pointMode : baseDefaults.pointMode;
  const rawPointRadius = hasOwnKey(overrides, 'pointRadius')
    ? overrides.pointRadius
    : baseDefaults.pointRadius;
  const warnings: string[] = [];
  const lineWidth = normalizeLineWidth(rawLineWidth, warnings);
  const pointMode = normalizePointMode(rawPointMode);
  const pointRadius = pointMode === 'circle' ? normalizePointRadius(rawPointRadius, warnings) : undefined;

  return {
    sourceIds: normalizeSourceIds(rawSourceIds),
    fileName: normalizeFileName(rawFileName),
    sourceCrs: rawSourceCrs,
    targetCrs: rawTargetCrs,
    featureFilter: rawFeatureFilter,
    layerNameResolver: rawLayerNameResolver,
    layerTrueColorResolver: rawLayerTrueColorResolver,
    featureTrueColorResolver: rawFeatureTrueColorResolver,
    lineWidth,
    pointMode,
    pointRadius,
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
 * 统一提取错误文本。
 * @param error 原始错误
 * @returns 可读错误文本
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 将坐标格式化为可读文本。
 * @param position 原始坐标
 * @returns 可读坐标文本
 */
function formatPosition(position: Position): string {
  return position.join(', ');
}

/**
 * 生成当前要素的导出上下文。
 * @param sourceId 所属 sourceId
 * @param feature 当前要素
 * @returns 要素上下文
 */
function createFeatureExportContext(sourceId: string, feature: MapCommonFeature): FeatureExportContext {
  return {
    sourceId,
    featureLabel: getFeatureLabel(feature),
    geometryType: feature.geometry.type,
  };
}

/**
 * 构造整要素跳过提示。
 * @param context 要素上下文
 * @param reason 跳过原因
 * @returns 可读提示文本
 */
function buildSkippedFeatureMessage(context: FeatureExportContext, reason: string): string {
  return `已跳过 source '${context.sourceId}' 中要素 '${context.featureLabel}' 的几何类型 '${context.geometryType}'：${reason}`;
}

/**
 * 记录整要素跳过信息。
 * @param skippedFeatures 被跳过要素列表
 * @param warnings 警告列表
 * @param context 要素上下文
 * @param reason 跳过原因
 */
function recordSkippedFeature(
  skippedFeatures: SkippedFeatureDetail[],
  warnings: string[],
  context: FeatureExportContext,
  reason: string
): void {
  const message = buildSkippedFeatureMessage(context, reason);
  warnings.push(message);
  skippedFeatures.push({
    sourceId: context.sourceId,
    featureLabel: context.featureLabel,
    geometryType: context.geometryType,
    message,
  });
}

/**
 * 构造“没有可导出实体”的详细错误。
 * @param skippedFeatures 被跳过要素列表
 * @returns 最终错误文本
 */
function buildNoExportableFeatureError(skippedFeatures: SkippedFeatureDetail[]): string {
  if (!skippedFeatures.length) {
    return '当前没有可导出的业务要素';
  }

  const detailList = skippedFeatures
    .slice(0, MAX_SKIP_DETAILS_IN_ERROR)
    .map((item) => item.message)
    .join('；');
  const remainingCount = skippedFeatures.length - MAX_SKIP_DETAILS_IN_ERROR;
  const suffix = remainingCount > 0 ? `；另有 ${remainingCount} 个要素被跳过` : '';
  return `当前没有可导出的业务要素：${detailList}${suffix}`;
}

/**
 * 生成坐标转换函数。
 * 预编译 proj4 投影对象以避免重复解析投影定义字符串。
 * @param taskOptions 导出任务配置
 * @param warnings 警告列表
 * @returns 最终生效的坐标转换函数；单个坐标转换失败时返回失败结果
 */
function createCoordinateTransform(
  taskOptions: ResolvedMapDxfExportTaskOptions,
  warnings: string[]
): CoordinateTransform {
  const { sourceCrs, targetCrs } = taskOptions;

  if (!sourceCrs || !targetCrs) {
    warnings.push('已跳过坐标转换：未完整配置 sourceCrs 和 targetCrs，将按原坐标导出');
    // 返回副本避免修改原始数据
    return (position) => ({
      ok: true,
      position: [...position] as Position,
    });
  }

  if (sourceCrs === targetCrs) {
    // 同一坐标系下也需要返回副本
    return (position) => ({
      ok: true,
      position: [...position] as Position,
    });
  }

  // 预编译投影转换器，避免每次调用都重新解析投影定义
  let projConverter: proj4.Converter;
  try {
    projConverter = proj4(sourceCrs, targetCrs);
  } catch (error) {
    throw new Error(
      `DXF 导出坐标系配置无效：sourceCrs='${sourceCrs}'，targetCrs='${targetCrs}'。Could not parse to valid json: ${sourceCrs}`
    );
  }

  return (position) => {
    try {
      const [x, y] = projConverter.forward([position[0], position[1]]) as [number, number];
      if (position.length > 2) {
        return {
          ok: true,
          position: [x, y, position[2]] as Position,
        };
      }
      return {
        ok: true,
        position: [x, y] as Position,
      };
    } catch (error) {
      // 单个坐标转换失败时，交由上层决定跳过单点还是整要素。
      return {
        ok: false,
        position: [...position] as Position,
        errorMessage: getErrorMessage(error),
      };
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
  partLabel: string,
  lineWidth?: number
): PolylineVerticesResult {
  let hasZCoordinate = false;

  const vertices: LWPolylineVertex[] = [];

  for (const [vertexIndex, position] of positions.entries()) {
    const transformedResult = transform(position);

    // 线和面一旦出现失败顶点，就直接放弃整个要素，避免静默改写几何。
    if (!transformedResult.ok) {
      return {
        ok: false,
        message: `${partLabel}的第 ${vertexIndex + 1} 个顶点坐标转换失败 [${formatPosition(
          transformedResult.position
        )}]：${transformedResult.errorMessage}`,
      };
    }

    const transformedPosition = transformedResult.position;
    if (transformedPosition.length > 2 && transformedPosition[2] !== undefined) {
      hasZCoordinate = true;
    }

    const vertex: LWPolylineVertex = {
      point: point2d(transformedPosition[0], transformedPosition[1]),
    };

    // 统一线宽系统只允许一个数值全局控制，因此首尾宽度写成同值，避免出现锥形线段。
    if (lineWidth !== undefined) {
      vertex.startingWidth = lineWidth;
      vertex.endWidth = lineWidth;
    }

    vertices.push(vertex);
  }

  return {
    ok: true,
    vertices,
    hasZCoordinate,
  };
}

/**
 * 解析单条要素最终使用的图层名。
 * @param feature 当前要素
 * @param sourceId 所属 sourceId
 * @param taskOptions 导出任务配置
 * @returns 原始图层名与最终 DXF 图层名
 */
function resolveLayerName(
  feature: MapCommonFeature,
  sourceId: string,
  taskOptions: ResolvedMapDxfExportTaskOptions
): ResolvedLayerName {
  const resolvedLayerName = taskOptions.layerNameResolver?.(feature, sourceId)?.trim();
  const rawLayerName = resolvedLayerName || sourceId;
  return {
    rawLayerName,
    layerName: sanitizeLayerName(rawLayerName),
  };
}

/**
 * 将 TrueColor 输入值标准化为 DXF 可写入的格式。
 * 这里只接受 #RRGGBB，非法值会写入 warning，但不会中断导出。
 *
 * @param rawTrueColor 原始颜色值
 * @param warningLabel 告警标签
 * @param warnings 警告列表
 * @returns 标准化后的颜色结果；未命中或非法时返回 null
 */
function normalizeTrueColorValue(
  rawTrueColor: unknown,
  warningLabel: string,
  warnings: string[]
): ResolvedTrueColorValue | null {
  if (rawTrueColor === null || rawTrueColor === undefined) {
    return null;
  }

  const colorText = typeof rawTrueColor === 'string' ? rawTrueColor.trim() : String(rawTrueColor);
  if (!DXF_TRUE_COLOR_PATTERN.test(colorText)) {
    warnings.push(`${warningLabel} 的 TrueColor 值 '${colorText}' 非法：只支持 #RRGGBB，已跳过本次颜色设置`);
    return null;
  }

  const normalizedHex = colorText.toUpperCase() as MapDxfTrueColor;
  const trueColorValue = TrueColor.fromHex(normalizedHex);
  return {
    normalizedHex,
    layerTrueColorValue: trueColorValue,
    entityTrueColorValue: String(trueColorValue),
  };
}

/**
 * 解析当前 DXF 图层的 TrueColor。
 * 解析器接收的是最终 DXF 图层名，因此默认按 sourceId 分层时也能直接着色。
 *
 * @param taskOptions 导出任务配置
 * @param layerName 最终 DXF 图层名
 * @param sourceId 当前业务 sourceId
 * @param warnings 警告列表
 * @returns 标准化后的图层颜色
 */
function resolveLayerTrueColor(
  taskOptions: ResolvedMapDxfExportTaskOptions,
  layerName: string,
  sourceId: string,
  warnings: string[]
): ResolvedTrueColorValue | null {
  const rawTrueColor = taskOptions.layerTrueColorResolver?.(layerName, sourceId);
  return normalizeTrueColorValue(rawTrueColor, `DXF 图层 '${layerName}'`, warnings);
}

/**
 * 解析当前要素实体的 TrueColor。
 * 实体色优先级高于图层色，因此只要命中，就直接写到实体公共颜色字段上。
 *
 * @param taskOptions 导出任务配置
 * @param feature 当前要素
 * @param sourceId 当前业务 sourceId
 * @param layerName 最终 DXF 图层名
 * @param warnings 警告列表
 * @returns 标准化后的实体颜色
 */
function resolveFeatureTrueColor(
  taskOptions: ResolvedMapDxfExportTaskOptions,
  feature: MapCommonFeature,
  sourceId: string,
  layerName: string,
  warnings: string[]
): ResolvedTrueColorValue | null {
  const rawTrueColor = taskOptions.featureTrueColorResolver?.(feature, sourceId, layerName);
  return normalizeTrueColorValue(
    rawTrueColor,
    `source '${sourceId}' 中要素 '${getFeatureLabel(feature)}'`,
    warnings
  );
}

/**
 * 记录 DXF 图层使用情况，并在检测到同名合层时追加一次 warning。
 * @param layerUsageMap 图层使用记录表
 * @param warnedLayerNameSet 已告警过的最终图层名集合
 * @param warnings 警告列表
 * @param sourceId 当前来源 sourceId
 * @param resolvedLayerName 当前图层名解析结果
 */
function trackLayerUsage(
  layerUsageMap: Map<string, DxfLayerUsageRecord>,
  warnedLayerNameSet: Set<string>,
  warnings: string[],
  sourceId: string,
  resolvedLayerName: ResolvedLayerName
): void {
  const existedLayerUsage = layerUsageMap.get(resolvedLayerName.layerName);
  if (!existedLayerUsage) {
    layerUsageMap.set(resolvedLayerName.layerName, {
      sourceId,
      rawLayerName: resolvedLayerName.rawLayerName,
    });
    return;
  }

  const isSameUsage =
    existedLayerUsage.sourceId === sourceId &&
    existedLayerUsage.rawLayerName === resolvedLayerName.rawLayerName;
  if (isSameUsage) {
    return;
  }

  if (warnedLayerNameSet.has(resolvedLayerName.layerName)) {
    return;
  }

  warnings.push(
    `DXF 图层 '${resolvedLayerName.layerName}' 出现同名合层：首次来源为 source '${existedLayerUsage.sourceId}' / 原始图层名 '${existedLayerUsage.rawLayerName}'，当前来源为 source '${sourceId}' / 原始图层名 '${resolvedLayerName.rawLayerName}'。导出后将合并到同一 DXF layer`
  );
  warnedLayerNameSet.add(resolvedLayerName.layerName);
}

/**
 * 同步 DXF 图层 TrueColor。
 * 同一最终 DXF 图层如果命中多个不同颜色，只保留首次命中的颜色并追加一次 warning。
 *
 * @param writer DXF 写入器
 * @param layerTrueColorMap 图层颜色记录表
 * @param warnedLayerTrueColorSet 已告警过的图层集合
 * @param warnings 警告列表
 * @param layerName 最终 DXF 图层名
 * @param sourceId 当前业务 sourceId
 * @param resolvedTrueColor 当前命中的图层颜色
 */
function syncLayerTrueColor(
  writer: DxfWriter,
  layerTrueColorMap: Map<string, DxfLayerTrueColorRecord>,
  warnedLayerTrueColorSet: Set<string>,
  warnings: string[],
  layerName: string,
  sourceId: string,
  resolvedTrueColor: ResolvedTrueColorValue | null
): void {
  if (!resolvedTrueColor) {
    return;
  }

  const existedRecord = layerTrueColorMap.get(layerName);
  if (!existedRecord) {
    const dxfLayer = writer.layer(layerName);
    if (dxfLayer) {
      dxfLayer.trueColor = resolvedTrueColor.layerTrueColorValue;
    }

    layerTrueColorMap.set(layerName, {
      sourceId,
      normalizedHex: resolvedTrueColor.normalizedHex,
    });
    return;
  }

  if (existedRecord.normalizedHex === resolvedTrueColor.normalizedHex) {
    return;
  }

  if (warnedLayerTrueColorSet.has(layerName)) {
    return;
  }

  warnings.push(
    `DXF 图层 '${layerName}' 命中了多个图层 TrueColor：首次颜色为 ${existedRecord.normalizedHex}（source '${existedRecord.sourceId}'），当前颜色为 ${resolvedTrueColor.normalizedHex}（source '${sourceId}'）。将保留首次命中的颜色`
  );
  warnedLayerTrueColorSet.add(layerName);
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
 * 创建实体公共配置。
 * 未显式设置实体色时，CAD 会继续沿用图层颜色。
 *
 * @param layerName 最终 DXF 图层名
 * @param entityTrueColor 实体 TrueColor
 * @param lineWidth 统一线宽
 * @returns 实体公共配置
 */
function createEntityOptions(
  layerName: string,
  entityTrueColor?: string,
  lineWidth?: number
): DxfEntityOptions {
  const entityOptions: DxfEntityOptions = {
    layerName,
  };

  if (entityTrueColor) {
    entityOptions.trueColor = entityTrueColor;
  }

  if (lineWidth !== undefined) {
    entityOptions.lineWidth = lineWidth;
  }

  return entityOptions;
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
 * 根据 pointMode 决定输出为 DXF POINT 还是 CIRCLE。
 *
 * @param writer DXF 写入器
 * @param positions 点坐标列表
 * @param entityOptions 实体公共配置
 * @param pointMode 点导出模式
 * @param pointRadius 点半径
 * @param transform 坐标转换函数
 * @returns 新增的实体数量
 */
function addPointEntities(
  writer: DxfWriter,
  positions: Position[],
  entityOptions: DxfEntityOptions,
  pointMode: MapDxfPointMode,
  pointRadius: number | undefined,
  transform: CoordinateTransform,
  warnings: string[],
  skippedFeatures: SkippedFeatureDetail[],
  context: FeatureExportContext
): number {
  let addedCount = 0;
  const failedPointList: Array<CoordinateTransformFailure & { pointIndex: number }> = [];

  positions.forEach((position, pointIndex) => {
    const transformedResult = transform(position);

    // 点要素继续保留逐点容错能力，只跳过失败点。
    if (!transformedResult.ok) {
      failedPointList.push({
        ...transformedResult,
        pointIndex,
      });
      return;
    }

    const transformedPosition = transformedResult.position;
    if (pointMode === 'circle') {
      writer.addCircle(
        point3d(
          transformedPosition[0],
          transformedPosition[1],
          transformedPosition[2] ?? 0
        ),
        pointRadius ?? DEFAULT_DXF_GEOMETRY_STYLE_OPTIONS.pointRadius ?? 1,
        entityOptions
      );
    } else {
      writer.addPoint(
        transformedPosition[0],
        transformedPosition[1],
        transformedPosition[2] ?? 0,
        entityOptions
      );
    }
    addedCount += 1;
  });

  if (!failedPointList.length) {
    return addedCount;
  }

  if (addedCount === 0) {
    const firstFailedPoint = failedPointList[0];
    const reason =
      positions.length === 1
        ? `点坐标转换失败 [${formatPosition(firstFailedPoint.position)}]：${firstFailedPoint.errorMessage}`
        : `所有点坐标转换均失败，其中第 ${firstFailedPoint.pointIndex + 1} 个点 [${formatPosition(
            firstFailedPoint.position
          )}]：${firstFailedPoint.errorMessage}`;
    recordSkippedFeature(skippedFeatures, warnings, context, reason);
    return 0;
  }

  failedPointList.forEach((failedPoint) => {
    warnings.push(
      `source '${context.sourceId}' 中要素 '${context.featureLabel}' 的第 ${failedPoint.pointIndex + 1} 个点坐标转换失败 [${formatPosition(
        failedPoint.position
      )}]：${failedPoint.errorMessage}，已跳过该点`
    );
  });

  return addedCount;
}

/**
 * 写入折线要素。
 * @param writer DXF 写入器
 * @param partList 折线部件集合
 * @param entityOptions 实体公共配置
 * @param transform 坐标转换函数
 * @param warnings 警告列表
 * @param skippedFeatures 被跳过要素列表
 * @param context 当前要素上下文
 * @param closed 是否写成闭合折线
 * @returns 新增的实体数量
 */
function addPolylineEntities(
  writer: DxfWriter,
  partList: PolylinePart[],
  entityOptions: DxfEntityOptions,
  transform: CoordinateTransform,
  warnings: string[],
  skippedFeatures: SkippedFeatureDetail[],
  context: FeatureExportContext,
  closed = false
): number {
  const minPoints = closed ? 3 : 2; // 闭合线至少 3 点，开放线至少 2 点
  let hasZCoordinate = false;
  const polylineList: LWPolylineVertex[][] = [];

  for (const part of partList) {
    if (part.positions.length < minPoints) {
      recordSkippedFeature(
        skippedFeatures,
        warnings,
        context,
        `${part.label}点数不足（需要至少 ${minPoints} 个点，实际 ${part.positions.length} 个），已跳过整个要素`
      );
      return 0;
    }

    const verticesResult = createPolylineVertices(
      part.positions,
      transform,
      part.label,
      entityOptions.lineWidth
    );

    if (!verticesResult.ok) {
      recordSkippedFeature(
        skippedFeatures,
        warnings,
        context,
        `${verticesResult.message}，已跳过整个要素`
      );
      return 0;
    }

    hasZCoordinate = hasZCoordinate || verticesResult.hasZCoordinate;
    polylineList.push(verticesResult.vertices);
  }

  polylineList.forEach((vertices) => {
    writer.addLWPolyline(vertices, {
      layerName: entityOptions.layerName,
      trueColor: entityOptions.trueColor,
      flags: closed ? LWPolylineFlags.Closed : LWPolylineFlags.None,
      // 使用 constantWidth 让整条折线宽度一致，符合“只给一个统一线宽参数”的设计目标。
      constantWidth: entityOptions.lineWidth,
    });
  });

  if (hasZCoordinate) {
    warnings.push(
      `要素 '${context.featureLabel}' 包含 Z 坐标，但 DXF LWPOLYLINE 实体不支持 Z 坐标，Z 值已被丢弃`
    );
  }

  return polylineList.length;
}

/**
 * 生成线要素的折线部件。
 * @param lineList 线坐标集合
 * @returns 折线部件列表
 */
function createLineParts(lineList: Position[][]): PolylinePart[] {
  return lineList.map((positions, index) => ({
    positions,
    label: lineList.length === 1 ? '线串' : `第 ${index + 1} 个几何部分`,
  }));
}

/**
 * 生成面要素的折线部件。
 * @param polygonCoordinates 面坐标
 * @param polygonIndex 面片序号
 * @returns 折线部件列表
 */
function createPolygonParts(
  polygonCoordinates: Position[][],
  polygonIndex?: number
): PolylinePart[] {
  return polygonCoordinates.map((positions, ringIndex) => ({
    positions,
    label:
      polygonIndex === undefined
        ? `第 ${ringIndex + 1} 个环`
        : `第 ${polygonIndex + 1} 个面片的第 ${ringIndex + 1} 个环`,
  }));
}

/**
 * 将 GeoJSON 几何写入 DXF。
 * @param writer DXF 写入器
 * @param feature 当前要素
 * @param sourceId 所属 sourceId
 * @param entityOptions 实体公共配置
 * @param pointMode 点导出模式
 * @param pointRadius 点半径
 * @param transform 坐标转换函数
 * @param warnings 警告列表
 * @returns 新增的实体数量
 */
function addFeatureGeometryToDxf(
  writer: DxfWriter,
  feature: MapCommonFeature,
  sourceId: string,
  entityOptions: DxfEntityOptions,
  pointMode: MapDxfPointMode,
  pointRadius: number | undefined,
  transform: CoordinateTransform,
  warnings: string[],
  skippedFeatures: SkippedFeatureDetail[]
): number {
  const context = createFeatureExportContext(sourceId, feature);

  switch (feature.geometry.type) {
    case 'Point':
      return addPointEntities(
        writer,
        [feature.geometry.coordinates],
        entityOptions,
        pointMode,
        pointRadius,
        transform,
        warnings,
        skippedFeatures,
        context
      );
    case 'MultiPoint':
      return addPointEntities(
        writer,
        feature.geometry.coordinates,
        entityOptions,
        pointMode,
        pointRadius,
        transform,
        warnings,
        skippedFeatures,
        context
      );
    case 'LineString':
      return addPolylineEntities(
        writer,
        createLineParts([feature.geometry.coordinates]),
        entityOptions,
        transform,
        warnings,
        skippedFeatures,
        context
      );
    case 'MultiLineString':
      return addPolylineEntities(
        writer,
        createLineParts(feature.geometry.coordinates),
        entityOptions,
        transform,
        warnings,
        skippedFeatures,
        context
      );
    case 'Polygon':
      return addPolylineEntities(
        writer,
        createPolygonParts(feature.geometry.coordinates),
        entityOptions,
        transform,
        warnings,
        skippedFeatures,
        context,
        true
      );
    case 'MultiPolygon':
      return addPolylineEntities(
        writer,
        feature.geometry.coordinates.flatMap((polygonCoordinates, polygonIndex) =>
          createPolygonParts(polygonCoordinates, polygonIndex)
        ),
        entityOptions,
        transform,
        warnings,
        skippedFeatures,
        context,
        true
      );
    default:
      recordSkippedFeature(skippedFeatures, warnings, context, '当前 DXF 导出暂不支持');
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
  const skippedFeatures: SkippedFeatureDetail[] = [];
  const addedLayerSet = new Set<string>(['0']);
  const layerUsageMap = new Map<string, DxfLayerUsageRecord>();
  const warnedLayerNameSet = new Set<string>();
  const layerTrueColorMap = new Map<string, DxfLayerTrueColorRecord>();
  const warnedLayerTrueColorSet = new Set<string>();
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
      const resolvedLayerName = resolveLayerName(normalizedFeature, source.sourceId, taskOptions);
      trackLayerUsage(
        layerUsageMap,
        warnedLayerNameSet,
        warnings,
        source.sourceId,
        resolvedLayerName
      );
      ensureLayer(writer, addedLayerSet, resolvedLayerName.layerName);
      const resolvedLayerTrueColor = resolveLayerTrueColor(
        taskOptions,
        resolvedLayerName.layerName,
        source.sourceId,
        warnings
      );
      syncLayerTrueColor(
        writer,
        layerTrueColorMap,
        warnedLayerTrueColorSet,
        warnings,
        resolvedLayerName.layerName,
        source.sourceId,
        resolvedLayerTrueColor
      );
      const resolvedFeatureTrueColor = resolveFeatureTrueColor(
        taskOptions,
        normalizedFeature,
        source.sourceId,
        resolvedLayerName.layerName,
        warnings
      );
      entityCount += addFeatureGeometryToDxf(
        writer,
        normalizedFeature,
        source.sourceId,
        createEntityOptions(
          resolvedLayerName.layerName,
          resolvedFeatureTrueColor?.entityTrueColorValue,
          taskOptions.lineWidth
        ),
        taskOptions.pointMode,
        taskOptions.pointRadius,
        transform,
        warnings,
        skippedFeatures
      );
    });
  });

  if (!entityCount) {
    throw new Error(buildNoExportableFeatureError(skippedFeatures));
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
