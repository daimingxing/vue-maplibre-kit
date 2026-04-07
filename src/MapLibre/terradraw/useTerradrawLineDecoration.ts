import { ref, type Ref } from 'vue';
import type { Feature, LineString, Position } from 'geojson';
import type {
  FilterSpecification,
  GeoJSONSource,
  LineLayerSpecification,
  Map as MaplibreMap,
  RasterLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import type { TerraDraw } from 'terra-draw';
import type { EventArgs } from '@watergis/maplibre-gl-terradraw';
import type {
  TerradrawControlType,
  TerradrawFeature,
  TerradrawFeatureId,
  TerradrawLineDecorationMode,
  TerradrawLineDecorationOptions,
  TerradrawLineDecorationResolveContext,
  TerradrawLineDecorationStyle,
  TerradrawManagedControl,
} from '../shared/mapLibre-contols-types';
import type { MapCommonFeatureCollection, MapCommonProperties } from '../shared/map-common-tools';
import {
  createLineLayerStyle,
  createRasterLayerStyle,
  createSymbolLayerStyle,
  type MapLayerStyle,
} from '../shared/map-layer-style-config';

type DecorationImageKind = 'symbol' | 'pattern';

type LineDecorationFeature = Feature<LineString, MapCommonProperties>;

type StretchCoordinate = [number, number];
type StretchLayerCoordinates = [
  StretchCoordinate,
  StretchCoordinate,
  StretchCoordinate,
  StretchCoordinate,
];

interface NormalizedLineDecorationStyle {
  mode: TerradrawLineDecorationMode;
  normalizedSvg: string;
  spacing: number;
  size: number;
  lineWidth: number;
  opacity: number;
  iconRotate: number;
  keepUpright: boolean;
}

interface DecorationImageRecord {
  key: string;
  id: string;
  payload: HTMLImageElement | ImageData;
}

interface LineDecorationFeatureChangeContext {
  origin?: 'api';
  target?: 'geometry' | 'properties';
}

interface TerradrawInteractiveFeatureProperties {
  currentlyDrawing?: boolean;
  edited?: boolean;
}

export interface TerradrawLineDecorationSymbolLayerItem {
  /** 当前 symbol 图层 ID */
  layerId: string;
  /** 当前 symbol 图层过滤条件 */
  filter: FilterSpecification;
  /** 当前 symbol 图层样式 */
  style: MapLayerStyle<SymbolLayerSpecification['layout'], SymbolLayerSpecification['paint']>;
}

interface StretchDecorationSegmentSpec {
  /** 当前拉伸段的稳定 key */
  key: string;
  /** 当前拉伸段 image source ID */
  sourceId: string;
  /** 当前拉伸段 raster layer ID */
  layerId: string;
  /** 当前拉伸段使用的原始图片地址 */
  normalizedSvg: string;
  /** 当前拉伸段起点 */
  start: Position;
  /** 当前拉伸段终点 */
  end: Position;
  /** 当前拉伸段宽度（像素） */
  lineWidth: number;
  /** 当前拉伸段透明度 */
  opacity: number;
}

interface StretchRasterSizeBucket {
  width: number;
  height: number;
  cacheKey: string;
}

interface StretchRasterImageRecord {
  key: string;
  source: string;
  width: number;
  height: number;
  url: string;
}

interface PatternDecorationSegmentSpec {
  /** 当前离散纹理段的稳定 key */
  key: string;
  /** 当前离散纹理段 canvas source ID */
  sourceId: string;
  /** 当前离散纹理段 raster layer ID */
  layerId: string;
  /** 当前离散纹理段起点 */
  start: Position;
  /** 当前离散纹理段终点 */
  end: Position;
  /** 当前离散纹理段宽度（像素） */
  lineWidth: number;
  /** 当前离散纹理段透明度 */
  opacity: number;
}

interface PatternDecorationFeatureSpec {
  /** 当前整条纹理线使用的原始图片地址 */
  normalizedSvg: string;
  /** 当前整条纹理线宽度（像素） */
  lineWidth: number;
  /** 当前整条纹理线的全部离散纹理段 */
  segmentSpecs: PatternDecorationSegmentSpec[];
}

interface PatternRepeatPlan {
  /** 当前整条纹理线最终采用的重复张数 */
  repeatCount: number;
  /** 当前整条纹理线每个纹理单元最终逻辑宽度（像素） */
  actualUnitWidth: number;
  /** 当前整条纹理线总屏幕长度（像素） */
  totalPixelLength: number;
}

interface LineDecorationProjectedSegmentView {
  /** 当前线段四角坐标 */
  coordinates: StretchLayerCoordinates;
  /** 当前线段屏幕长度（像素） */
  pixelLength: number;
}

type LinePatternRenderStrategy = 'discrete-repeat' | 'native';

export interface TerradrawLineDecorationStretchLayerItem {
  /** 当前拉伸段的稳定 key */
  key: string;
  /** 当前拉伸段 image source ID */
  sourceId: string;
  /** 当前拉伸段 raster layer ID */
  layerId: string;
  /** 当前拉伸段使用的最终图片地址；SVG 会在进入 image source 前被光栅化 */
  url: string;
  /** 当前拉伸段插入到哪个图层前面；用于避免遮挡节点与标签 */
  beforeLayerId?: string;
  /** 当前拉伸段四角坐标 */
  coordinates: StretchLayerCoordinates;
  /** 当前拉伸段栅格图层样式 */
  style: MapLayerStyle<RasterLayerSpecification['layout'], RasterLayerSpecification['paint']>;
}

export interface TerradrawLineDecorationPatternRasterItem {
  /** 当前离散纹理段的稳定 key */
  key: string;
  /** 当前离散纹理段 canvas source ID */
  sourceId: string;
  /** 当前离散纹理段 raster layer ID */
  layerId: string;
  /** 当前离散纹理段使用的纹理图片对象 */
  image: HTMLImageElement;
  /** 当前离散纹理段插入到哪个图层前面；用于避免遮挡节点与标签 */
  beforeLayerId?: string;
  /** 当前离散纹理段四角坐标 */
  coordinates: StretchLayerCoordinates;
  /** 当前离散纹理段离屏 canvas 宽度 */
  canvasWidth: number;
  /** 当前离散纹理段离屏 canvas 高度 */
  canvasHeight: number;
  /** 当前离散纹理段单个纹理单元在 canvas 中的宽度 */
  unitCanvasWidth: number;
  /** 当前离散纹理段起始相位在 canvas 中的偏移量 */
  phaseCanvasOffset: number;
  /** 当前离散纹理段栅格图层样式 */
  style: MapLayerStyle<RasterLayerSpecification['layout'], RasterLayerSpecification['paint']>;
}

interface CreateTerradrawLineDecorationOptions {
  /** 当前地图实例 */
  map: MaplibreMap;
  /** 当前 TerraDraw / Measure 控件实例 */
  control: TerradrawManagedControl;
  /** 当前控件来源类型 */
  controlType: TerradrawControlType;
  /** 业务层传入的线装饰配置 */
  options: TerradrawLineDecorationOptions;
}

interface TerradrawMeasureDecorationLike {
  measureOptions?: {
    pointLayerLabelSpec?: { id?: string };
    lineLayerLabelSpec?: { id?: string };
    routingLineLayerNodeSpec?: { id?: string };
    adapterOptions?: { prefixId?: string };
  };
}

interface TerradrawDrawDecorationLike {
  options?: {
    adapterOptions?: { prefixId?: string };
  };
}

export interface TerradrawLineDecorationBinding {
  /** 当前装饰图层是否启用 */
  enabled: Ref<boolean>;
  /** 当前装饰图层使用的数据源 ID */
  sourceId: string;
  /** 当前装饰 pattern 图层 ID；离散平铺关闭时作为原生 line-pattern fallback 图层使用 */
  patternLayerId: string;
  /** 当前装饰图层数据源 */
  data: Ref<MapCommonFeatureCollection>;
  /** symbol-repeat 图层分组列表 */
  symbolLayerItems: Ref<TerradrawLineDecorationSymbolLayerItem[]>;
  /** line-pattern 离散纹理图层列表 */
  patternRasterItems: Ref<TerradrawLineDecorationPatternRasterItem[]>;
  /** line-pattern 图层样式；离散平铺关闭时作为原生 line-pattern fallback 样式使用 */
  patternStyle: Ref<
    MapLayerStyle<LineLayerSpecification['layout'], LineLayerSpecification['paint']>
  >;
  /** segment-stretch 图层列表 */
  stretchLayerItems: Ref<TerradrawLineDecorationStretchLayerItem[]>;
  /** 销毁当前装饰管理器 */
  destroy: () => void;
}

const SYMBOL_REPEAT_MODE: TerradrawLineDecorationMode = 'symbol-repeat';
const LINE_PATTERN_MODE: TerradrawLineDecorationMode = 'line-pattern';
const SEGMENT_STRETCH_MODE: TerradrawLineDecorationMode = 'segment-stretch';

/** symbol-repeat 模式下，沿线重复放置图标时的默认间距（像素） */
const DEFAULT_SYMBOL_SPACING = 48;
/** symbol-repeat 模式下，图标的默认缩放倍数 */
const DEFAULT_SYMBOL_SIZE = 1;
/** line-pattern / segment-stretch 模式下，装饰线的默认宽度（像素） */
const DEFAULT_PATTERN_LINE_WIDTH = 12;
/** 装饰层默认透明度，取值范围 0 - 1 */
const DEFAULT_DECORATION_OPACITY = 1;
/** symbol-repeat 模式下，图标默认额外旋转角度（度） */
const DEFAULT_ICON_ROTATE = 0;
/** symbol-repeat 模式下，图标默认保持朝上显示 */
const DEFAULT_KEEP_UPRIGHT = true;
/** Measure 控件在线纹理收尾同步时的默认延迟（毫秒） */
const MEASURE_PATTERN_FINAL_SYNC_DELAY = 320;
/** line-pattern 当前封装采用的内部渲染策略；默认使用离散平铺，可显式切回原生实现 */
const LINE_PATTERN_RENDER_STRATEGY: LinePatternRenderStrategy = 'discrete-repeat';
/** line-pattern 单个纹理单元允许的最小宽度缩放比例 */
const LINE_PATTERN_REPEAT_MIN_RATIO = 0.85;
/** line-pattern 单个纹理单元允许的最大宽度缩放比例 */
const LINE_PATTERN_REPEAT_MAX_RATIO = 1.15;
/** line-pattern 搜索候选重复张数时的前后扩展范围 */
const LINE_PATTERN_REPEAT_SEARCH_RADIUS = 2;
/** line-pattern 离屏 canvas 默认像素倍率，上限固定为 2 以平衡清晰度与成本 */
const LINE_PATTERN_CANVAS_PIXEL_RATIO = Math.min(globalThis.devicePixelRatio || 1, 2);
/** line-pattern 单个离屏 canvas 允许生成的最大宽度 */
const LINE_PATTERN_CANVAS_MAX_WIDTH = 4096;
/** line-pattern 单个离屏 canvas 允许生成的最大高度 */
const LINE_PATTERN_CANVAS_MAX_HEIGHT = 1024;
/** line-pattern 原始图片缓存的最大条目数，超出后按最近最少使用策略淘汰 */
const LINE_PATTERN_SOURCE_IMAGE_CACHE_MAX_ENTRIES = 16;
/** segment-stretch 纹理尺寸分桶步长，越小越清晰，但桶数量和重建频率也越高 */
const STRETCH_RASTER_BUCKET_SIZE = 64;
/** segment-stretch 光栅化超采样倍数，越大越清晰，但生成成本越高 */
const STRETCH_RASTER_SUPERSAMPLE = 2;
/** segment-stretch 纹理最小边长，避免生成过小位图导致锯齿明显 */
const STRETCH_RASTER_MIN_SIZE = 32;
/** segment-stretch 纹理允许生成的最大宽度，主要影响超长线段的清晰度与内存占用 */
const STRETCH_RASTER_MAX_WIDTH = 4096;
/** segment-stretch 纹理允许生成的最大高度，主要用于限制粗线宽场景下的纹理体积 */
const STRETCH_RASTER_MAX_HEIGHT = 1024;
/** segment-stretch 原始图片缓存的最大条目数，超出后按最近最少使用策略淘汰 */
const STRETCH_SOURCE_IMAGE_CACHE_MAX_ENTRIES = 16;
/** segment-stretch 高清桶图缓存的最大条目数，超出后按最近最少使用策略淘汰 */
const STRETCH_RASTER_IMAGE_CACHE_MAX_ENTRIES = 64;

const imageRecordCache = new Map<string, DecorationImageRecord>();
const imageRecordPromiseCache = new Map<string, Promise<DecorationImageRecord>>();
const linePatternSourceImageCache = new Map<string, HTMLImageElement>();
const linePatternSourceImagePromiseCache = new Map<string, Promise<HTMLImageElement>>();
const linePatternSourceImageFailureCache = new Map<string, Error>();
const stretchSourceImageCache = new Map<string, HTMLImageElement>();
const stretchSourceImagePromiseCache = new Map<string, Promise<HTMLImageElement>>();
const stretchSourceImageFailureCache = new Map<string, Error>();
const stretchRasterImageRecordCache = new Map<string, StretchRasterImageRecord>();
const stretchRasterImageRecordPromiseCache = new Map<string, Promise<StretchRasterImageRecord>>();
const stretchRasterSourceKeyIndex = new Map<string, Set<string>>();

/**
 * 将命中的 Map 缓存条目标记为最近使用。
 * 通过删除再重新插入的方式，复用 Map 的插入顺序来实现 LRU。
 * @param cache 目标缓存映射
 * @param key 当前缓存键
 * @returns 命中的缓存值；未命中时返回 null
 */
function touchCacheEntry<T>(cache: Map<string, T>, key: string): T | null {
  if (!cache.has(key)) {
    return null;
  }
  const cachedValue = cache.get(key) as T;

  cache.delete(key);
  cache.set(key, cachedValue);

  return cachedValue;
}

/**
 * 将当前图片绘制到 1x1 校验画布并读取像素，判断是否存在跨域污染问题。
 * @param image 已加载完成的图片对象
 * @param normalizedSvg 当前原始图片地址
 * @param modeLabel 当前装饰模式标签
 */
function assertCanvasRenderableImage(
  image: HTMLImageElement,
  normalizedSvg: string,
  modeLabel: 'line-pattern' | 'segment-stretch'
): void {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error(
      `[TerradrawLineDecoration] ${modeLabel} 纹理校验失败：浏览器不支持 2D canvas 上下文`
    );
  }

  canvas.width = 1;
  canvas.height = 1;
  try {
    context.clearRect(0, 0, 1, 1);
    context.drawImage(image, 0, 0, 1, 1);
    context.getImageData(0, 0, 1, 1);
  } catch (error) {
    throw normalizeDecorationSourceError(modeLabel, normalizedSvg, error);
  }
}

/**
 * 判断当前错误是否属于 Canvas 安全限制或跨域污染导致的失败。
 * @param error 待判断的异常对象
 * @returns 是否为 SecurityError 或同类安全异常
 */
function isCanvasSecurityError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'SecurityError';
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /securityerror|taint|cross-origin|cross origin|cors/i.test(error.message);
}

/**
 * 将装饰图片处理过程中的异常统一规范为易读的中文错误。
 * @param modeLabel 当前装饰模式标签
 * @param normalizedSvg 当前原始图片地址
 * @param error 原始异常对象
 * @returns 规范化后的异常对象
 */
function normalizeDecorationSourceError(
  modeLabel: 'line-pattern' | 'segment-stretch',
  normalizedSvg: string,
  error: unknown
): Error {
  if (isCanvasSecurityError(error)) {
    return new Error(
      `[TerradrawLineDecoration] ${modeLabel} 图片跨域未开启 CORS，无法安全光栅化：${normalizedSvg}`
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`[TerradrawLineDecoration] ${modeLabel} 图片处理失败：${normalizedSvg}`);
}

/**
 * 将 line-pattern 原始图片缓存裁剪到允许的最大条目数以内。
 * 超出上限时，按最近最少使用策略淘汰最旧的已解析图片对象。
 */
function trimLinePatternSourceImageCache(): void {
  while (linePatternSourceImageCache.size > LINE_PATTERN_SOURCE_IMAGE_CACHE_MAX_ENTRIES) {
    const oldestCacheKey = linePatternSourceImageCache.keys().next().value;
    if (!oldestCacheKey) {
      return;
    }

    linePatternSourceImageCache.delete(oldestCacheKey);
  }
}

/**
 * 记录当前原始图片地址对应的致命失败，避免后续重复发起相同的无效请求。
 * @param normalizedSvg 当前原始图片地址
 * @param error 需要缓存的异常对象
 * @returns 最终缓存的异常对象
 */
function rememberStretchSourceFailure(normalizedSvg: string, error: Error): Error {
  const cachedFailure = stretchSourceImageFailureCache.get(normalizedSvg);
  if (cachedFailure) {
    return cachedFailure;
  }

  stretchSourceImageFailureCache.set(normalizedSvg, error);

  return error;
}

/**
 * 记录当前 line-pattern 原始图片地址对应的致命失败，避免后续重复发起相同的无效请求。
 * @param normalizedSvg 当前原始图片地址
 * @param error 需要缓存的异常对象
 * @returns 最终缓存的异常对象
 */
function rememberLinePatternSourceFailure(normalizedSvg: string, error: Error): Error {
  const cachedFailure = linePatternSourceImageFailureCache.get(normalizedSvg);
  if (cachedFailure) {
    return cachedFailure;
  }

  linePatternSourceImageFailureCache.set(normalizedSvg, error);

  return error;
}

/**
 * 计算 line-pattern 单个离屏 canvas 实际使用的像素倍率。
 * 当线段过长或线宽过粗时，会自动降低倍率，避免超出浏览器允许的 canvas 尺寸。
 * @param segmentPixelLength 当前线段屏幕长度（像素）
 * @param lineWidth 当前纹理线宽（像素）
 * @returns 当前线段可安全使用的 canvas 像素倍率
 */
function getLinePatternCanvasPixelRatio(segmentPixelLength: number, lineWidth: number): number {
  if (segmentPixelLength <= 0 || lineWidth <= 0) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(
      LINE_PATTERN_CANVAS_PIXEL_RATIO,
      LINE_PATTERN_CANVAS_MAX_WIDTH / segmentPixelLength,
      LINE_PATTERN_CANVAS_MAX_HEIGHT / lineWidth
    )
  );
}

/**
 * 将 Blob 异步转换为 Data URL，避免在主线程同步执行大图编码。
 * @param blob 待转换的 PNG Blob
 * @returns 对应的 Data URL
 */
function convertBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = () => {
      if (typeof fileReader.result !== 'string') {
        reject(new Error('PNG Blob 转换 Data URL 失败：FileReader 返回结果无效'));
        return;
      }

      resolve(fileReader.result);
    };
    fileReader.onerror = () => {
      reject(new Error('PNG Blob 转换 Data URL 失败：FileReader 读取异常'));
    };

    fileReader.readAsDataURL(blob);
  });
}

/**
 * 将 Canvas 异步编码为 PNG Data URL。
 * 优先走 toBlob，减少同步编码带来的主线程阻塞；仅在浏览器不支持时回退到 toDataURL。
 * @param canvas 已绘制完成的 Canvas
 * @param normalizedSvg 当前原始图片地址
 * @returns 可直接给 image source 使用的 PNG Data URL
 */
async function convertCanvasToPngDataUrl(
  canvas: HTMLCanvasElement,
  normalizedSvg: string
): Promise<string> {
  if (typeof canvas.toBlob === 'function') {
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      try {
        canvas.toBlob((nextBlob) => {
          if (!nextBlob) {
            reject(
              new Error(
                `segment-stretch PNG Blob 生成失败，图片可能已被跨域污染或浏览器不支持当前编码：${normalizedSvg}`
              )
            );
            return;
          }

          resolve(nextBlob);
        }, 'image/png');
      } catch (error) {
        reject(normalizeDecorationSourceError('segment-stretch', normalizedSvg, error));
      }
    });

    return convertBlobToDataUrl(pngBlob);
  }

  try {
    return canvas.toDataURL('image/png');
  } catch (error) {
    throw normalizeDecorationSourceError('segment-stretch', normalizedSvg, error);
  }
}

/**
 * 将原始图片缓存裁剪到允许的最大条目数以内。
 * 超出上限时，按最近最少使用策略淘汰最旧的已解析图片对象。
 */
function trimStretchSourceImageCache(): void {
  while (stretchSourceImageCache.size > STRETCH_SOURCE_IMAGE_CACHE_MAX_ENTRIES) {
    const oldestCacheKey = stretchSourceImageCache.keys().next().value;
    if (!oldestCacheKey) {
      return;
    }

    stretchSourceImageCache.delete(oldestCacheKey);
  }
}

/**
 * 从高清桶图缓存及其反向索引中彻底删除指定条目。
 * @param cacheKey 需要删除的高清桶图缓存键
 */
function deleteStretchRasterImageRecord(cacheKey: string): void {
  const stretchRasterRecord = stretchRasterImageRecordCache.get(cacheKey);
  if (!stretchRasterRecord) {
    return;
  }

  stretchRasterImageRecordCache.delete(cacheKey);

  const sourceKeySet = stretchRasterSourceKeyIndex.get(stretchRasterRecord.source);
  if (!sourceKeySet) {
    return;
  }

  sourceKeySet.delete(cacheKey);

  if (sourceKeySet.size === 0) {
    stretchRasterSourceKeyIndex.delete(stretchRasterRecord.source);
  }
}

/**
 * 将命中的高清桶图缓存条目标记为最近使用。
 * @param cacheKey 当前高清桶图缓存键
 * @returns 命中的桶图记录；未命中时返回 null
 */
function touchStretchRasterImageRecord(cacheKey: string): StretchRasterImageRecord | null {
  return touchCacheEntry(stretchRasterImageRecordCache, cacheKey);
}

/**
 * 将高清桶图缓存裁剪到允许的最大条目数以内。
 * 超出上限时，按最近最少使用策略淘汰最旧的桶图记录。
 */
function trimStretchRasterImageRecordCache(): void {
  while (stretchRasterImageRecordCache.size > STRETCH_RASTER_IMAGE_CACHE_MAX_ENTRIES) {
    const oldestCacheKey = stretchRasterImageRecordCache.keys().next().value;
    if (!oldestCacheKey) {
      return;
    }

    deleteStretchRasterImageRecord(oldestCacheKey);
  }
}

/**
 * 创建空的 GeoJSON FeatureCollection，避免多个管理器共享同一引用。
 * @returns 新的空 FeatureCollection
 */
function createEmptyFeatureCollection(): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

/**
 * 判断当前 TerraDraw 要素 ID 是否可直接作为 GeoJSON 顶层 id 使用。
 * @param featureId TerraDraw 要素 ID
 * @returns 是否为 string / number 类型
 */
function isTerradrawFeatureId(featureId: unknown): featureId is TerradrawFeatureId {
  return typeof featureId === 'string' || typeof featureId === 'number';
}

/**
 * 判断当前 TerraDraw 要素是否为可装饰的 LineString。
 * @param feature TerraDraw 要素快照
 * @returns 是否为 LineString
 */
function isDecoratableLineFeature(feature: TerradrawFeature): feature is TerradrawFeature & {
  geometry: LineString;
} {
  return feature.geometry?.type === 'LineString';
}

/**
 * 判断当前线要素是否仍处于 TerraDraw 交互态。
 * 只有还在绘制或编辑中的线，才需要暂时隐藏 line-pattern。
 * @param feature TerraDraw 线要素快照
 * @returns 当前要素是否仍在交互流程中
 */
function isLineFeatureInteractionActive(feature: TerradrawFeature): boolean {
  const featureProperties = (feature.properties || {}) as TerradrawInteractiveFeatureProperties;

  return featureProperties.currentlyDrawing === true || featureProperties.edited === true;
}

/**
 * 对任意字符串做稳定哈希，用于生成 MapLibre image ID。
 * @param value 参与哈希的原始字符串
 * @returns 短哈希字符串
 */
function hashText(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

/**
 * 将业务层传入的 SVG 输入统一归一化为可直接给 Image 使用的地址。
 * @param svg SVG 原始输入
 * @returns 归一化后的可加载地址；无效时返回空字符串
 */
function normalizeSvgSource(svg: string): string {
  const trimmedSvg = svg.trim();

  if (!trimmedSvg) {
    return '';
  }

  if (
    trimmedSvg.startsWith('<svg') ||
    trimmedSvg.startsWith('<?xml') ||
    trimmedSvg.startsWith('<!DOCTYPE') ||
    trimmedSvg.includes('<svg')
  ) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmedSvg)}`;
  }

  return trimmedSvg;
}

/**
 * 判断当前图片地址是否为 SVG 资源。
 * 之所以要单独识别，是因为 MapLibre 的 image source 不直接支持 SVG，
 * segment-stretch 模式下必须先转成位图再交给 source。
 * @param source 已归一化后的图片地址
 * @returns 是否为 SVG 资源
 */
function isSvgImageSource(source: string): boolean {
  const normalizedSource = source.trim().toLowerCase();

  if (!normalizedSource) {
    return false;
  }

  return (
    normalizedSource.startsWith('data:image/svg+xml') ||
    /^https?:.*\.svg(?:$|[?#])/i.test(normalizedSource) ||
    /(?:^|\/)[^/?#]+\.svg(?:$|[?#])/i.test(normalizedSource)
  );
}

/**
 * 将业务层传入的装饰样式补齐默认值，得到内部统一结构。
 * @param style 业务层声明的装饰样式
 * @returns 补齐默认值后的内部样式；无效时返回 null
 */
function normalizeLineDecorationStyle(
  style: TerradrawLineDecorationStyle | null | undefined
): NormalizedLineDecorationStyle | null {
  if (!style) {
    return null;
  }

  const normalizedSvg = normalizeSvgSource(style.svg || '');
  if (!normalizedSvg) {
    return null;
  }

  return {
    mode: style.mode,
    normalizedSvg,
    spacing: style.spacing ?? DEFAULT_SYMBOL_SPACING,
    size: style.size ?? DEFAULT_SYMBOL_SIZE,
    lineWidth: style.lineWidth ?? DEFAULT_PATTERN_LINE_WIDTH,
    opacity: style.opacity ?? DEFAULT_DECORATION_OPACITY,
    iconRotate: style.iconRotate ?? DEFAULT_ICON_ROTATE,
    keepUpright: style.keepUpright ?? DEFAULT_KEEP_UPRIGHT,
  };
}

/**
 * 获取当前控件实际使用的 TerraDraw 图层前缀。
 * 优先读取控件实例上的真实配置，拿不到时再回退到默认前缀。
 * @param controlType 当前控件来源类型
 * @param control 当前控件实例
 * @returns 当前控件图层前缀
 */
function resolveTerradrawControlPrefixId(
  controlType: TerradrawControlType,
  control: TerradrawManagedControl
): string {
  if (controlType === 'measure') {
    const measureControl = control as unknown as TerradrawMeasureDecorationLike &
      TerradrawDrawDecorationLike;

    return (
      measureControl.measureOptions?.adapterOptions?.prefixId ||
      measureControl.options?.adapterOptions?.prefixId ||
      'td-measure'
    );
  }

  const drawControl = control as unknown as TerradrawDrawDecorationLike;

  return drawControl.options?.adapterOptions?.prefixId || 'td';
}

/**
 * 获取当前装饰 raster 图层应插入到哪个辅助图层前面。
 * 目标是让纹理层位于节点、控制点和测量 label 下方，避免遮挡交互要素。
 * @param map 当前地图实例
 * @param controlType 当前控件来源类型
 * @param control 当前控件实例
 * @returns 当前应使用的 beforeId；找不到合适锚点时返回 undefined
 */
function resolveDecorationRasterBeforeLayerId(
  map: MaplibreMap,
  controlType: TerradrawControlType,
  control: TerradrawManagedControl
): string | undefined {
  const styleLayers = map.getStyle()?.layers || [];
  if (styleLayers.length === 0) {
    return undefined;
  }

  const prefixId = resolveTerradrawControlPrefixId(controlType, control);
  const measureControl = control as unknown as TerradrawMeasureDecorationLike;
  const candidateLayerIds =
    controlType === 'measure'
      ? [
          measureControl.measureOptions?.routingLineLayerNodeSpec?.id,
          measureControl.measureOptions?.lineLayerLabelSpec?.id,
          measureControl.measureOptions?.pointLayerLabelSpec?.id,
          `${prefixId}-point-marker`,
          `${prefixId}-point`,
        ]
      : [`${prefixId}-point-marker`, `${prefixId}-point`];

  const normalizedCandidateLayerIds = candidateLayerIds.filter(
    (layerId): layerId is string => typeof layerId === 'string' && layerId.length > 0
  );
  if (normalizedCandidateLayerIds.length === 0) {
    return undefined;
  }

  for (const styleLayer of styleLayers) {
    if (normalizedCandidateLayerIds.includes(styleLayer.id)) {
      return styleLayer.id;
    }
  }

  return undefined;
}

/**
 * 深拷贝任意 GeoJSON 相关对象，避免内部派生属性回写到 TerraDraw 快照。
 * @param value 待拷贝的数据
 * @returns 深拷贝后的新对象
 */
function cloneGeoJsonValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 将任意装饰图片输入加载为浏览器 Image 对象。
 * @param source 已归一化后的图片地址
 * @returns 加载完成后的 Image 对象
 */
function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.decoding = 'async';
    if (!source.startsWith('data:')) {
      image.crossOrigin = 'anonymous';
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`装饰图片加载失败: ${source}`));
    image.src = source;
  });
}

/**
 * 将加载后的图片光栅化为 ImageData，供 line-pattern 使用。
 * @param image 已加载完成的图片对象
 * @returns 可直接传给 map.addImage 的 ImageData
 */
function rasterizeImageToImageData(image: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  const width = image.naturalWidth || image.width || 32;
  const height = image.naturalHeight || image.height || 32;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('创建 line-pattern 纹理失败：浏览器不支持 2D canvas 上下文');
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return context.getImageData(0, 0, width, height);
}

/**
 * 将加载后的图片光栅化为 PNG Data URL，供 image source 使用。
 * segment-stretch 依赖的是 MapLibre image source，而该 source 不支持直接传入 SVG。
 * @param image 已加载完成的图片对象
 * @param width 当前输出位图宽度
 * @param height 当前输出位图高度
 * @param normalizedSvg 当前原始图片地址
 * @returns 可直接传给 image source 的 PNG Data URL
 */
async function rasterizeImageToDataUrl(
  image: HTMLImageElement,
  width: number,
  height: number,
  normalizedSvg: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('创建 segment-stretch 纹理失败：浏览器不支持 2D canvas 上下文');
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  try {
    context.drawImage(image, 0, 0, width, height);
  } catch (error) {
    throw normalizeDecorationSourceError('segment-stretch', normalizedSvg, error);
  }

  return convertCanvasToPngDataUrl(canvas, normalizedSvg);
}

/**
 * 对 segment-stretch 的目标位图尺寸进行裁剪，避免生成过小或过大的纹理。
 * @param value 原始目标尺寸
 * @param maxSize 当前维度允许的最大值
 * @returns 裁剪后的安全尺寸
 */
function clampStretchRasterDimension(value: number, maxSize: number): number {
  const nextValue = Math.ceil(value);

  return Math.min(maxSize, Math.max(STRETCH_RASTER_MIN_SIZE, nextValue));
}

/**
 * 将目标位图尺寸归并到固定桶中，减少缩放过程中的重复光栅化次数。
 * @param value 原始目标尺寸
 * @param maxSize 当前维度允许的最大值
 * @returns 归并后的桶尺寸
 */
function bucketStretchRasterDimension(value: number, maxSize: number): number {
  const clampedSize = clampStretchRasterDimension(value, maxSize);

  return Math.min(
    maxSize,
    Math.max(
      STRETCH_RASTER_MIN_SIZE,
      Math.ceil(clampedSize / STRETCH_RASTER_BUCKET_SIZE) * STRETCH_RASTER_BUCKET_SIZE
    )
  );
}

/**
 * 根据当前线段的屏幕长度、线宽与屏幕像素比，计算 segment-stretch 应使用的高清位图桶。
 * @param segmentPixelLength 当前线段在屏幕上的像素长度
 * @param lineWidth 当前拉伸线宽（像素）
 * @returns 当前线段对应的位图桶信息
 */
function createStretchRasterSizeBucket(
  segmentPixelLength: number,
  lineWidth: number
): StretchRasterSizeBucket {
  const devicePixelRatio = Math.max(1, globalThis.devicePixelRatio || 1);
  const targetWidth = segmentPixelLength * devicePixelRatio * STRETCH_RASTER_SUPERSAMPLE;
  const targetHeight = lineWidth * devicePixelRatio * STRETCH_RASTER_SUPERSAMPLE;
  const bucketWidth = bucketStretchRasterDimension(targetWidth, STRETCH_RASTER_MAX_WIDTH);
  const bucketHeight = bucketStretchRasterDimension(targetHeight, STRETCH_RASTER_MAX_HEIGHT);

  return {
    width: bucketWidth,
    height: bucketHeight,
    cacheKey: `${bucketWidth}x${bucketHeight}`,
  };
}

/**
 * 为指定的原始图片地址与位图桶生成稳定缓存键。
 * @param normalizedSvg 当前原始图片地址
 * @param sizeBucket 当前位图桶信息
 * @returns 当前拉伸纹理的缓存键
 */
function createStretchRasterCacheKey(
  normalizedSvg: string,
  sizeBucket: StretchRasterSizeBucket
): string {
  return `stretch:${hashText(normalizedSvg)}:${sizeBucket.cacheKey}`;
}

/**
 * 生成内部 image registry 的缓存键。
 * @param kind 当前图片用途
 * @param normalizedSvg 已归一化后的 SVG 地址
 * @returns registry 缓存键
 */
function createImageCacheKey(kind: DecorationImageKind, normalizedSvg: string): string {
  return `${kind}:${normalizedSvg}`;
}

/**
 * 为同一张 SVG 在不同控件下生成独立的缓存键。
 * 这样 draw / measure 即使使用相同的 SVG，也不会共享同一个 MapLibre image。
 * @param controlType 当前控件来源类型
 * @param cacheKey 图片基础缓存键
 * @returns 带控件作用域的最终缓存键
 */
function createScopedImageCacheKey(controlType: TerradrawControlType, cacheKey: string): string {
  return `${controlType}:${cacheKey}`;
}

/**
 * 根据缓存键生成稳定的 MapLibre image ID。
 * @param cacheKey 图片缓存键
 * @returns 可复用的 image ID
 */
function createImageId(cacheKey: string): string {
  return `td-line-decoration-${hashText(cacheKey)}`;
}

/**
 * 同步计算指定装饰图片的缓存键与稳定 image ID。
 * 这样即使图片仍在异步加载中，也可以先把 feature 数据同步到图层，
 * 等图片稍后注册完成后，MapLibre 再补上真正的图标/纹理绘制。
 * @param controlType 当前控件来源类型
 * @param kind 当前图片用途
 * @param normalizedSvg 已归一化后的 SVG 地址
 * @returns 当前图片对应的缓存键与 image ID
 */
function createDecorationImageDescriptor(
  controlType: TerradrawControlType,
  kind: DecorationImageKind,
  normalizedSvg: string
): { key: string; id: string } {
  const cacheKey = createScopedImageCacheKey(controlType, createImageCacheKey(kind, normalizedSvg));

  return {
    key: cacheKey,
    id: createImageId(cacheKey),
  };
}

/**
 * 为指定用途准备并缓存图片资源，保证相同 SVG 只生成一次 payload。
 * @param kind 当前图片用途
 * @param normalizedSvg 已归一化后的 SVG 地址
 * @returns 可直接复用的缓存记录
 */
async function ensureImageRecord(
  controlType: TerradrawControlType,
  kind: DecorationImageKind,
  normalizedSvg: string
): Promise<DecorationImageRecord> {
  const cacheKey = createScopedImageCacheKey(controlType, createImageCacheKey(kind, normalizedSvg));
  const cachedRecord = imageRecordCache.get(cacheKey);
  if (cachedRecord) {
    return cachedRecord;
  }

  const pendingRecord = imageRecordPromiseCache.get(cacheKey);
  if (pendingRecord) {
    return pendingRecord;
  }

  const recordPromise = (async () => {
    const loadedImage = await loadImageElement(normalizedSvg);
    const nextRecord: DecorationImageRecord = {
      key: cacheKey,
      id: createImageId(cacheKey),
      payload: loadedImage,
    };

    if (kind === 'pattern') {
      nextRecord.payload = rasterizeImageToImageData(loadedImage);
    }

    imageRecordCache.set(cacheKey, nextRecord);

    return nextRecord;
  })().finally(() => {
    imageRecordPromiseCache.delete(cacheKey);
  }) as Promise<DecorationImageRecord>;

  imageRecordPromiseCache.set(cacheKey, recordPromise);

  return recordPromise;
}

/**
 * 预加载 line-pattern 使用的原始图片对象，并在首次加载时完成 Canvas 安全性校验。
 * 只有通过校验的图片才允许进入离散平铺渲染链路。
 * @param normalizedSvg 已归一化后的图片地址
 * @returns 可复用的图片对象
 */
async function ensureLinePatternSourceImage(normalizedSvg: string): Promise<HTMLImageElement> {
  const cachedFailure = linePatternSourceImageFailureCache.get(normalizedSvg);
  if (cachedFailure) {
    throw cachedFailure;
  }

  const cachedImage = touchCacheEntry(linePatternSourceImageCache, normalizedSvg);
  if (cachedImage) {
    return cachedImage;
  }

  const pendingImage = linePatternSourceImagePromiseCache.get(normalizedSvg);
  if (pendingImage) {
    return pendingImage;
  }

  const linePatternSourcePromise = loadImageElement(normalizedSvg)
    .then((loadedImage) => {
      assertCanvasRenderableImage(loadedImage, normalizedSvg, 'line-pattern');
      linePatternSourceImageCache.set(normalizedSvg, loadedImage);
      trimLinePatternSourceImageCache();
      return loadedImage;
    })
    .catch((error) => {
      throw rememberLinePatternSourceFailure(
        normalizedSvg,
        normalizeDecorationSourceError('line-pattern', normalizedSvg, error)
      );
    })
    .finally(() => {
      linePatternSourceImagePromiseCache.delete(normalizedSvg);
    });

  linePatternSourceImagePromiseCache.set(normalizedSvg, linePatternSourcePromise);

  return linePatternSourcePromise;
}

/**
 * 预加载 segment-stretch 使用的原始图片对象，供后续按尺寸动态光栅化复用。
 * @param normalizedSvg 已归一化后的图片地址
 * @returns 可复用的图片对象
 */
async function ensureStretchSourceImage(normalizedSvg: string): Promise<HTMLImageElement> {
  const cachedFailure = stretchSourceImageFailureCache.get(normalizedSvg);
  if (cachedFailure) {
    throw cachedFailure;
  }

  const cachedImage = touchCacheEntry(stretchSourceImageCache, normalizedSvg);
  if (cachedImage) {
    return cachedImage;
  }

  const pendingImage = stretchSourceImagePromiseCache.get(normalizedSvg);
  if (pendingImage) {
    return pendingImage;
  }

  const stretchSourcePromise = loadImageElement(normalizedSvg)
    .then((loadedImage) => {
      assertCanvasRenderableImage(loadedImage, normalizedSvg, 'segment-stretch');
      stretchSourceImageCache.set(normalizedSvg, loadedImage);
      trimStretchSourceImageCache();
      return loadedImage;
    })
    .catch((error) => {
      throw rememberStretchSourceFailure(
        normalizedSvg,
        normalizeDecorationSourceError('segment-stretch', normalizedSvg, error)
      );
    })
    .finally(() => {
      stretchSourceImagePromiseCache.delete(normalizedSvg);
    });

  stretchSourceImagePromiseCache.set(normalizedSvg, stretchSourcePromise);

  return stretchSourcePromise;
}

/**
 * 按尺寸桶将 SVG 动态光栅化为高清位图，并缓存最终可复用的图片地址。
 * @param normalizedSvg 已归一化后的原始图片地址
 * @param sizeBucket 当前位图桶信息
 * @returns 当前尺寸桶对应的拉伸纹理记录
 */
async function ensureStretchRasterImageRecord(
  normalizedSvg: string,
  sizeBucket: StretchRasterSizeBucket
): Promise<StretchRasterImageRecord> {
  const cachedFailure = stretchSourceImageFailureCache.get(normalizedSvg);
  if (cachedFailure) {
    throw cachedFailure;
  }

  const stretchRasterCacheKey = createStretchRasterCacheKey(normalizedSvg, sizeBucket);
  const cachedRecord = touchStretchRasterImageRecord(stretchRasterCacheKey);
  if (cachedRecord) {
    return cachedRecord;
  }

  const pendingRecord = stretchRasterImageRecordPromiseCache.get(stretchRasterCacheKey);
  if (pendingRecord) {
    return pendingRecord;
  }

  const stretchRasterPromise = (async () => {
    try {
      const loadedImage = await ensureStretchSourceImage(normalizedSvg);
      const rasterUrl = await rasterizeImageToDataUrl(
        loadedImage,
        sizeBucket.width,
        sizeBucket.height,
        normalizedSvg
      );

      const rasterRecord: StretchRasterImageRecord = {
        key: stretchRasterCacheKey,
        source: normalizedSvg,
        width: sizeBucket.width,
        height: sizeBucket.height,
        url: rasterUrl,
      };

      stretchRasterImageRecordCache.set(stretchRasterCacheKey, rasterRecord);

      const sourceKeySet = stretchRasterSourceKeyIndex.get(normalizedSvg) || new Set<string>();
      sourceKeySet.add(stretchRasterCacheKey);
      stretchRasterSourceKeyIndex.set(normalizedSvg, sourceKeySet);
      trimStretchRasterImageRecordCache();

      return rasterRecord;
    } catch (error) {
      const normalizedError = normalizeDecorationSourceError(
        'segment-stretch',
        normalizedSvg,
        error
      );

      if (isCanvasSecurityError(normalizedError)) {
        throw rememberStretchSourceFailure(normalizedSvg, normalizedError);
      }

      throw normalizedError;
    }
  })().finally(() => {
    stretchRasterImageRecordPromiseCache.delete(stretchRasterCacheKey);
  });

  stretchRasterImageRecordPromiseCache.set(stretchRasterCacheKey, stretchRasterPromise);

  return stretchRasterPromise;
}

/**
 * 从缓存中获取指定尺寸桶的拉伸纹理记录。
 * @param normalizedSvg 已归一化后的原始图片地址
 * @param sizeBucket 当前位图桶信息
 * @returns 命中的纹理记录；未命中返回 null
 */
function getStretchRasterImageRecord(
  normalizedSvg: string,
  sizeBucket: StretchRasterSizeBucket
): StretchRasterImageRecord | null {
  return touchStretchRasterImageRecord(createStretchRasterCacheKey(normalizedSvg, sizeBucket));
}

/**
 * 在当前原始图片地址已有的桶图中，挑选最接近目标尺寸的一张作为临时兜底。
 * 这样在新桶图尚未生成完成时，地图仍能先显示一张最接近的旧图，避免整段消失。
 * @param normalizedSvg 已归一化后的原始图片地址
 * @param sizeBucket 当前目标位图桶信息
 * @returns 最接近的桶图记录；不存在时返回 null
 */
function findClosestStretchRasterImageRecord(
  normalizedSvg: string,
  sizeBucket: StretchRasterSizeBucket
): StretchRasterImageRecord | null {
  const sourceKeySet = stretchRasterSourceKeyIndex.get(normalizedSvg);
  if (!sourceKeySet || sourceKeySet.size === 0) {
    return null;
  }

  let closestRecord: StretchRasterImageRecord | null = null;
  let closestRecordKey: string | null = null;
  let closestScore = Number.POSITIVE_INFINITY;

  sourceKeySet.forEach((cacheKey) => {
    const rasterRecord = stretchRasterImageRecordCache.get(cacheKey);
    if (!rasterRecord) {
      return;
    }

    const score =
      Math.abs(rasterRecord.width - sizeBucket.width) +
      Math.abs(rasterRecord.height - sizeBucket.height) * 2;

    if (score < closestScore) {
      closestScore = score;
      closestRecord = rasterRecord;
      closestRecordKey = cacheKey;
    }
  });

  if (closestRecordKey) {
    touchStretchRasterImageRecord(closestRecordKey);
  }

  return closestRecord;
}

/**
 * 将缓存中的图片安全注册到当前地图样式中。
 * @param map 当前地图实例
 * @param record 需要注册的图片记录
 */
function registerImageRecordOnMap(map: MaplibreMap, record: DecorationImageRecord): void {
  if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) {
    return;
  }

  try {
    if (map.hasImage(record.id)) {
      return;
    }

    map.addImage(record.id, record.payload);
  } catch (error) {
    console.warn('[TerradrawLineDecoration] 注册图片到地图样式失败', error);
  }
}

/**
 * 根据业务层配置，解析某一条 TerraDraw 线要素最终应该使用的装饰样式。
 * @param feature TerraDraw 线要素
 * @param options 业务层线装饰配置
 * @param controlType 当前控件来源类型
 * @param control 当前控件实例
 * @param drawInstance 当前 TerraDraw 实例
 * @param map 当前地图实例
 * @returns 解析后的内部装饰样式；跳过装饰时返回 null
 */
function resolveFeatureDecorationStyle(
  feature: TerradrawFeature,
  options: TerradrawLineDecorationOptions,
  controlType: TerradrawControlType,
  control: TerradrawManagedControl,
  drawInstance: TerraDraw,
  map: MaplibreMap
): NormalizedLineDecorationStyle | null {
  if (typeof options.resolveStyle === 'function') {
    try {
      const resolveContext: TerradrawLineDecorationResolveContext = {
        feature,
        controlType,
        control,
        drawInstance,
        map,
      };
      const resolvedStyle = options.resolveStyle(resolveContext);
      if (resolvedStyle === false) {
        return null;
      }

      const normalizedResolvedStyle = normalizeLineDecorationStyle(
        resolvedStyle ?? options.defaultStyle ?? null
      );
      if (normalizedResolvedStyle) {
        return normalizedResolvedStyle;
      }
    } catch (error) {
      console.error(
        '[TerradrawLineDecoration] resolveStyle 执行失败，将回退到 defaultStyle',
        error
      );
    }
  }

  return normalizeLineDecorationStyle(options.defaultStyle || null);
}

/**
 * 将 TerraDraw 线要素转换为内部装饰图层使用的 GeoJSON Feature。
 * @param feature TerraDraw 线要素快照
 * @param controlType 当前控件来源类型
 * @param style 已解析好的装饰样式
 * @param imageId 对应的 MapLibre image ID
 * @returns 装饰图层专用的 GeoJSON Feature
 */
function createDecorationFeature(
  feature: TerradrawFeature,
  controlType: TerradrawControlType,
  style: NormalizedLineDecorationStyle,
  imageId: string,
  symbolGroupKey: string
): LineDecorationFeature {
  return {
    type: 'Feature',
    id: isTerradrawFeatureId(feature.id)
      ? feature.id
      : `${controlType}-${hashText(JSON.stringify(feature))}`,
    geometry: cloneGeoJsonValue(feature.geometry) as LineString,
    properties: {
      ...(cloneGeoJsonValue(feature.properties || {}) as MapCommonProperties),
      originalFeatureId: feature.id ?? null,
      controlType,
      decorationMode: style.mode,
      decorationImageId: imageId,
      decorationSpacing: style.spacing,
      decorationSize: style.size,
      decorationLineWidth: style.lineWidth,
      decorationOpacity: style.opacity,
      decorationIconRotate: style.iconRotate,
      decorationKeepUpright: style.keepUpright,
      decorationSymbolGroupKey: symbolGroupKey,
    },
  };
}

/**
 * 为 symbol-repeat 样式生成分组键。
 * 由于 symbol-spacing / icon-keep-upright 不能安全地按 feature 动态驱动，
 * 这里按“相同布局参数”拆成多个独立 symbol 图层。
 * @param style 当前已归一化的装饰样式
 * @returns symbol 图层分组键
 */
function createSymbolGroupKey(style: NormalizedLineDecorationStyle): string {
  return `${style.spacing}__${style.keepUpright ? 'upright' : 'free'}`;
}

/**
 * 为 symbol-repeat 图层生成符合 MapLibre 规范的过滤表达式。
 * @param groupKey 当前 symbol 图层分组键
 * @returns 当前分组对应的过滤条件
 */
function createSymbolLayerFilter(groupKey: string): FilterSpecification {
  return [
    'all',
    ['==', '$type', 'LineString'],
    ['==', 'decorationMode', SYMBOL_REPEAT_MODE],
    ['==', 'decorationSymbolGroupKey', groupKey],
  ];
}

/**
 * 根据 symbol-repeat 分组信息构建可渲染的 symbol 图层列表。
 * @param controlType 当前控件来源类型
 * @param groups 当前控件下全部 symbol 图层分组配置
 * @returns 可直接渲染的 symbol 图层列表
 */
function createSymbolLayerItems(
  controlType: TerradrawControlType,
  groups: Array<{ groupKey: string; spacing: number; keepUpright: boolean }>
): TerradrawLineDecorationSymbolLayerItem[] {
  return groups.map((group) => ({
    layerId: `td-line-decoration-${controlType}-symbol-layer-${hashText(group.groupKey)}`,
    filter: createSymbolLayerFilter(group.groupKey),
    style: createSymbolLayerStyle({
      layout: {
        visibility: 'visible',
        'text-field': '',
        'icon-image': ['image', ['get', 'decorationImageId']] as any,
        'icon-size': ['to-number', ['get', 'decorationSize']] as any,
        'icon-rotate': ['to-number', ['get', 'decorationIconRotate']] as any,
        'icon-anchor': 'center',
        'symbol-placement': 'line',
        'symbol-spacing': group.spacing,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-rotation-alignment': 'map',
        'icon-keep-upright': group.keepUpright,
      },
      paint: {
        'icon-opacity': ['to-number', ['get', 'decorationOpacity']] as any,
      },
    }),
  }));
}

/**
 * 为当前 TerraDraw 线要素生成稳定的基础 key。
 * @param feature TerraDraw 线要素快照
 * @param controlType 当前控件来源类型
 * @returns 当前线要素的基础 key
 */
function createLineDecorationFeatureBaseKey(
  feature: TerradrawFeature,
  controlType: TerradrawControlType
): string {
  if (isTerradrawFeatureId(feature.id)) {
    return `${controlType}-${String(feature.id)}`;
  }

  return `${controlType}-${hashText(JSON.stringify(feature))}`;
}

/**
 * 判断两个坐标点是否为同一点。
 * @param start 起点
 * @param end 终点
 * @returns 是否完全重合
 */
function isSameLineCoordinate(start: Position, end: Position): boolean {
  return start[0] === end[0] && start[1] === end[1];
}

/**
 * 为整条离散 line-pattern 要素生成稳定 key。
 * @param featureBaseKey 当前线要素基础 key
 * @param normalizedSvg 已归一化后的纹理图片地址
 * @returns 当前整条离散纹理线的稳定 key
 */
function createPatternFeatureKey(featureBaseKey: string, normalizedSvg: string): string {
  return `${featureBaseKey}-pattern-${hashText(normalizedSvg)}`;
}

/**
 * 为单个离散纹理段生成稳定 key。
 * @param featureKey 当前整条离散纹理线 key
 * @param segmentIndex 当前线段索引
 * @returns 当前离散纹理段 key
 */
function createPatternSegmentKey(featureKey: string, segmentIndex: number): string {
  return `${featureKey}-segment-${segmentIndex}`;
}

/**
 * 根据离散纹理段 key 生成 canvas source 与 raster layer 的稳定 ID。
 * @param segmentKey 当前离散纹理段 key
 * @returns 当前线段对应的 sourceId 与 layerId
 */
function createPatternSegmentIds(segmentKey: string): {
  sourceId: string;
  layerId: string;
} {
  const shortKey = hashText(segmentKey);

  return {
    sourceId: `td-line-decoration-pattern-source-${shortKey}`,
    layerId: `td-line-decoration-pattern-layer-${shortKey}`,
  };
}

/**
 * 为单个拉伸线段生成稳定 key。
 * @param featureBaseKey 当前线要素基础 key
 * @param segmentIndex 当前线段索引
 * @param normalizedSvg 已归一化后的 SVG 地址
 * @returns 当前拉伸线段 key
 */
function createStretchSegmentKey(
  featureBaseKey: string,
  segmentIndex: number,
  normalizedSvg: string
): string {
  return `${featureBaseKey}-segment-${segmentIndex}-${hashText(normalizedSvg)}`;
}

/**
 * 根据拉伸线段 key 生成 image source 与 raster layer 的稳定 ID。
 * @param segmentKey 当前拉伸线段 key
 * @returns 当前线段对应的 sourceId 与 layerId
 */
function createStretchSegmentIds(segmentKey: string): {
  sourceId: string;
  layerId: string;
} {
  const shortKey = hashText(segmentKey);

  return {
    sourceId: `td-line-decoration-stretch-source-${shortKey}`,
    layerId: `td-line-decoration-stretch-layer-${shortKey}`,
  };
}

/**
 * 将单条 LineString 拆分为一条“整线级离散纹理描述”。
 * 真正的重复张数与相位会在视图同步阶段按当前屏幕长度统一计算。
 * @param feature TerraDraw 线要素快照
 * @param controlType 当前控件来源类型
 * @param style 当前已归一化的装饰样式
 * @returns 当前整条离散纹理线规格；不可渲染时返回 null
 */
function createPatternDecorationFeatureSpec(
  feature: TerradrawFeature,
  controlType: TerradrawControlType,
  style: NormalizedLineDecorationStyle
): PatternDecorationFeatureSpec | null {
  const featureBaseKey = createLineDecorationFeatureBaseKey(feature, controlType);
  const featureKey = createPatternFeatureKey(featureBaseKey, style.normalizedSvg);
  const lineCoordinates = feature.geometry.coordinates || [];
  const segmentSpecs: PatternDecorationSegmentSpec[] = [];

  for (let segmentIndex = 0; segmentIndex < lineCoordinates.length - 1; segmentIndex += 1) {
    const start = cloneGeoJsonValue(lineCoordinates[segmentIndex]) as Position;
    const end = cloneGeoJsonValue(lineCoordinates[segmentIndex + 1]) as Position;

    if (isSameLineCoordinate(start, end)) {
      continue;
    }

    const segmentKey = createPatternSegmentKey(featureKey, segmentIndex);
    const segmentIds = createPatternSegmentIds(segmentKey);

    segmentSpecs.push({
      key: segmentKey,
      sourceId: segmentIds.sourceId,
      layerId: segmentIds.layerId,
      start,
      end,
      lineWidth: style.lineWidth,
      opacity: style.opacity,
    });
  }

  if (segmentSpecs.length === 0) {
    return null;
  }

  return {
    normalizedSvg: style.normalizedSvg,
    lineWidth: style.lineWidth,
    segmentSpecs,
  };
}

/**
 * 根据当前地图视图，将任意线装饰段换算为四角坐标与屏幕像素长度。
 * @param map 当前地图实例
 * @param segmentSpec 当前线装饰段规格
 * @returns 当前线段的视图投影结果；当前线段不可投影时返回 null
 */
function projectLineDecorationSegmentView(
  map: MaplibreMap,
  segmentSpec: { start: Position; end: Position; lineWidth: number }
): LineDecorationProjectedSegmentView | null {
  const startPoint = map.project(segmentSpec.start as [number, number]);
  const endPoint = map.project(segmentSpec.end as [number, number]);
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const segmentLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (!Number.isFinite(segmentLength) || segmentLength <= 0) {
    return null;
  }

  const halfWidth = segmentSpec.lineWidth / 2;
  const normalX = -deltaY / segmentLength;
  const normalY = deltaX / segmentLength;

  const topLeft = map.unproject([
    startPoint.x - normalX * halfWidth,
    startPoint.y - normalY * halfWidth,
  ]);
  const topRight = map.unproject([
    endPoint.x - normalX * halfWidth,
    endPoint.y - normalY * halfWidth,
  ]);
  const bottomRight = map.unproject([
    endPoint.x + normalX * halfWidth,
    endPoint.y + normalY * halfWidth,
  ]);
  const bottomLeft = map.unproject([
    startPoint.x + normalX * halfWidth,
    startPoint.y + normalY * halfWidth,
  ]);

  return {
    pixelLength: segmentLength,
    coordinates: [
      [topLeft.lng, topLeft.lat],
      [topRight.lng, topRight.lat],
      [bottomRight.lng, bottomRight.lat],
      [bottomLeft.lng, bottomLeft.lat],
    ],
  };
}

/**
 * 将单条 LineString 拆分为若干个“点到点”的拉伸段规格。
 * @param feature TerraDraw 线要素快照
 * @param controlType 当前控件来源类型
 * @param style 当前已归一化的装饰样式
 * @returns 当前线要素下全部可渲染的拉伸段规格
 */
function createStretchDecorationSegmentSpecs(
  feature: TerradrawFeature,
  controlType: TerradrawControlType,
  style: NormalizedLineDecorationStyle
): StretchDecorationSegmentSpec[] {
  const featureBaseKey = createLineDecorationFeatureBaseKey(feature, controlType);
  const lineCoordinates = feature.geometry.coordinates || [];
  const segmentSpecs: StretchDecorationSegmentSpec[] = [];

  for (let segmentIndex = 0; segmentIndex < lineCoordinates.length - 1; segmentIndex += 1) {
    const start = cloneGeoJsonValue(lineCoordinates[segmentIndex]) as Position;
    const end = cloneGeoJsonValue(lineCoordinates[segmentIndex + 1]) as Position;

    if (isSameLineCoordinate(start, end)) {
      continue;
    }

    const segmentKey = createStretchSegmentKey(featureBaseKey, segmentIndex, style.normalizedSvg);
    const segmentIds = createStretchSegmentIds(segmentKey);

    segmentSpecs.push({
      key: segmentKey,
      sourceId: segmentIds.sourceId,
      layerId: segmentIds.layerId,
      normalizedSvg: style.normalizedSvg,
      start,
      end,
      lineWidth: style.lineWidth,
      opacity: style.opacity,
    });
  }

  return segmentSpecs;
}

/**
 * 根据当前地图视图，将单个拉伸线段换算为 image source 四角坐标与屏幕像素长度。
 * @param map 当前地图实例
 * @param segmentSpec 当前拉伸线段规格
 * @returns 当前线段的视图投影结果；当前线段不可投影时返回 null
 */
function projectStretchSegmentView(
  map: MaplibreMap,
  segmentSpec: StretchDecorationSegmentSpec
): LineDecorationProjectedSegmentView | null {
  return projectLineDecorationSegmentView(map, segmentSpec);
}

/**
 * 根据整条纹理线的总屏幕长度与原始纹理尺寸，决定最终重复张数与单元宽度。
 * @param totalPixelLength 当前整条纹理线总屏幕长度（像素）
 * @param sourceImage 当前原始纹理图片对象
 * @param lineWidth 当前纹理线宽（像素）
 * @returns 当前整条线的离散重复方案；无法计算时返回 null
 */
function resolveLinePatternRepeatPlan(
  totalPixelLength: number,
  sourceImage: HTMLImageElement,
  lineWidth: number
): PatternRepeatPlan | null {
  const sourceWidth = sourceImage.naturalWidth || sourceImage.width || 0;
  const sourceHeight = sourceImage.naturalHeight || sourceImage.height || 0;

  if (
    totalPixelLength <= 0 ||
    lineWidth <= 0 ||
    !Number.isFinite(totalPixelLength) ||
    !Number.isFinite(lineWidth) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return null;
  }

  const idealScale = lineWidth / sourceHeight;
  const idealUnitWidth = sourceWidth * idealScale;
  if (!Number.isFinite(idealUnitWidth) || idealUnitWidth <= 0) {
    return null;
  }

  const baseRepeatCount = Math.max(1, Math.round(totalPixelLength / idealUnitWidth));
  let bestValidPlan: PatternRepeatPlan | null = null;
  let bestValidScore = Number.POSITIVE_INFINITY;
  let bestFallbackPlan: PatternRepeatPlan | null = null;
  let bestFallbackScore = Number.POSITIVE_INFINITY;

  for (
    let repeatCount = Math.max(1, baseRepeatCount - LINE_PATTERN_REPEAT_SEARCH_RADIUS);
    repeatCount <= baseRepeatCount + LINE_PATTERN_REPEAT_SEARCH_RADIUS;
    repeatCount += 1
  ) {
    const actualUnitWidth = totalPixelLength / repeatCount;
    const widthRatio = actualUnitWidth / idealUnitWidth;
    const ratioScore = Math.abs(1 - widthRatio);
    const nextPlan: PatternRepeatPlan = {
      repeatCount,
      actualUnitWidth,
      totalPixelLength,
    };

    if (
      widthRatio >= LINE_PATTERN_REPEAT_MIN_RATIO &&
      widthRatio <= LINE_PATTERN_REPEAT_MAX_RATIO &&
      ratioScore < bestValidScore
    ) {
      bestValidPlan = nextPlan;
      bestValidScore = ratioScore;
    }

    if (ratioScore < bestFallbackScore) {
      bestFallbackPlan = nextPlan;
      bestFallbackScore = ratioScore;
    }
  }

  if (bestValidPlan) {
    return bestValidPlan;
  }

  if (totalPixelLength <= idealUnitWidth * LINE_PATTERN_REPEAT_MIN_RATIO) {
    return {
      repeatCount: 1,
      actualUnitWidth: totalPixelLength,
      totalPixelLength,
    };
  }

  return bestFallbackPlan;
}

/**
 * 将整线级离散纹理规格转换为最终渲染条目。
 * 每条线会统一确定单元宽度，并在各个 segment 间保持连续相位。
 * @param map 当前地图实例
 * @param featureSpecs 当前全部离散纹理线规格
 * @returns 可直接渲染的离散纹理图层列表
 */
function createPatternRasterItems(
  map: MaplibreMap,
  featureSpecs: PatternDecorationFeatureSpec[],
  beforeLayerId?: string
): TerradrawLineDecorationPatternRasterItem[] {
  const patternRasterItems: TerradrawLineDecorationPatternRasterItem[] = [];

  featureSpecs.forEach((featureSpec) => {
    const sourceImage = touchCacheEntry(linePatternSourceImageCache, featureSpec.normalizedSvg);
    if (!sourceImage) {
      return;
    }

    const projectedSegmentViews = featureSpec.segmentSpecs
      .map((segmentSpec) => ({
        segmentSpec,
        projectedView: projectLineDecorationSegmentView(map, segmentSpec),
      }))
      .filter(
        (
          item
        ): item is {
          segmentSpec: PatternDecorationSegmentSpec;
          projectedView: LineDecorationProjectedSegmentView;
        } => Boolean(item.projectedView)
      );

    if (projectedSegmentViews.length === 0) {
      return;
    }

    const totalPixelLength = projectedSegmentViews.reduce(
      (sum, item) => sum + item.projectedView.pixelLength,
      0
    );
    const repeatPlan = resolveLinePatternRepeatPlan(
      totalPixelLength,
      sourceImage,
      featureSpec.lineWidth
    );
    if (!repeatPlan) {
      return;
    }

    let accumulatedPixelLength = 0;

    projectedSegmentViews.forEach(({ segmentSpec, projectedView }) => {
      const canvasPixelRatio = getLinePatternCanvasPixelRatio(
        projectedView.pixelLength,
        segmentSpec.lineWidth
      );
      const canvasWidth = Math.max(1, Math.ceil(projectedView.pixelLength * canvasPixelRatio));
      const canvasHeight = Math.max(1, Math.ceil(segmentSpec.lineWidth * canvasPixelRatio));
      const phaseCanvasOffset =
        (accumulatedPixelLength % repeatPlan.actualUnitWidth) * canvasPixelRatio;

      patternRasterItems.push({
        key: segmentSpec.key,
        sourceId: segmentSpec.sourceId,
        layerId: segmentSpec.layerId,
        image: sourceImage,
        ...(beforeLayerId ? { beforeLayerId } : {}),
        coordinates: projectedView.coordinates,
        canvasWidth,
        canvasHeight,
        unitCanvasWidth: repeatPlan.actualUnitWidth * canvasPixelRatio,
        phaseCanvasOffset,
        style: createRasterLayerStyle({
          layout: {
            visibility: 'visible',
          },
          paint: {
            'raster-opacity': segmentSpec.opacity,
            'raster-fade-duration': 0,
          },
        }),
      });

      accumulatedPixelLength += projectedView.pixelLength;
    });
  });

  return patternRasterItems;
}

/**
 * 将拉伸段规格转换为最终渲染层条目。
 * @param map 当前地图实例
 * @param segmentSpecs 当前所有拉伸段规格
 * @param resolveStretchUrl 根据当前线段屏幕长度解析最终图片地址的方法
 * @returns 可直接渲染的拉伸图层列表
 */
function createStretchLayerItems(
  map: MaplibreMap,
  segmentSpecs: StretchDecorationSegmentSpec[],
  resolveStretchUrl: (
    segmentSpec: StretchDecorationSegmentSpec,
    segmentPixelLength: number
  ) => string | null,
  beforeLayerId?: string
): TerradrawLineDecorationStretchLayerItem[] {
  return segmentSpecs
    .map((segmentSpec) => {
      const projectedStretchSegmentView = projectStretchSegmentView(map, segmentSpec);

      if (!projectedStretchSegmentView) {
        return null;
      }

      const stretchUrl = resolveStretchUrl(segmentSpec, projectedStretchSegmentView.pixelLength);
      if (!stretchUrl) {
        return null;
      }

      return {
        key: segmentSpec.key,
        sourceId: segmentSpec.sourceId,
        layerId: segmentSpec.layerId,
        url: stretchUrl,
        ...(beforeLayerId ? { beforeLayerId } : {}),
        coordinates: projectedStretchSegmentView.coordinates,
        style: createRasterLayerStyle({
          layout: {
            visibility: 'visible',
          },
          paint: {
            'raster-opacity': segmentSpec.opacity,
            'raster-fade-duration': 0,
          },
        }),
      };
    })
    .filter((item): item is TerradrawLineDecorationStretchLayerItem => Boolean(item));
}

/**
 * 创建 TerraDraw / Measure 线装饰管理器。
 * @param createOptions 创建参数
 * @returns 供 map-libre-init 内部消费的装饰管理句柄
 */
export function createTerradrawLineDecoration(
  createOptions: CreateTerradrawLineDecorationOptions
): TerradrawLineDecorationBinding {
  const { map, control, controlType, options } = createOptions;
  const drawInstance = control.getTerraDrawInstance?.();

  if (!drawInstance || options.enabled !== true) {
    const emptyBinding = {
      enabled: ref(false),
      sourceId: `td-line-decoration-${controlType}-source`,
      patternLayerId: `td-line-decoration-${controlType}-pattern-layer`,
      data: ref(createEmptyFeatureCollection()),
      symbolLayerItems: ref<TerradrawLineDecorationSymbolLayerItem[]>([]),
      patternRasterItems: ref<TerradrawLineDecorationPatternRasterItem[]>([]),
      stretchLayerItems: ref<TerradrawLineDecorationStretchLayerItem[]>([]),
      patternStyle: ref(
        createLineLayerStyle({
          layout: {},
          paint: {},
        })
      ),
      destroy: () => undefined,
    } as unknown as TerradrawLineDecorationBinding;

    return emptyBinding;
  }

  const enabled = ref(true);
  const data = ref<MapCommonFeatureCollection>(createEmptyFeatureCollection());
  const sourceId = `td-line-decoration-${controlType}-source`;
  const patternLayerId = `td-line-decoration-${controlType}-pattern-layer`;
  const symbolLayerItems = ref<TerradrawLineDecorationSymbolLayerItem[]>([]);
  const patternRasterItems = ref<TerradrawLineDecorationPatternRasterItem[]>([]);
  const stretchLayerItems = ref<TerradrawLineDecorationStretchLayerItem[]>([]);
  const activeImageCacheKeys = new Set<string>();
  const linePatternPreviewFeatureIds = new Set<TerradrawFeatureId>();
  const pendingPatternFinalizeFeatureIds = new Set<TerradrawFeatureId>();
  const pendingStretchRasterRequestKeys = new Set<string>();
  const pendingLinePatternSourceRequestKeys = new Set<string>();
  let patternFeatureSpecs: PatternDecorationFeatureSpec[] = [];
  let stretchSegmentSpecs: StretchDecorationSegmentSpec[] = [];
  let hasDisposed = false;
  let requestedSyncRevision = 0;
  let isSyncing = false;
  let patternFinalizeTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let patternViewSyncFrameId: number | null = null;
  let stretchViewSyncFrameId: number | null = null;

  const patternStyle = ref(
    createLineLayerStyle({
      layout: {
        visibility: 'visible',
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-pattern': ['image', ['get', 'decorationImageId']] as any,
        'line-width': ['to-number', ['get', 'decorationLineWidth']] as any,
        'line-opacity': ['to-number', ['get', 'decorationOpacity']] as any,
      },
    })
  );

  /**
   * 判断当前 line-pattern 是否应启用离散平铺渲染策略。
   * 保留这个判断是为了后续需要时能平滑切回原生 line-pattern。
   * @returns 当前是否启用离散平铺渲染
   */
  function shouldUseDiscreteLinePattern(): boolean {
    return LINE_PATTERN_RENDER_STRATEGY === 'discrete-repeat';
  }

  /**
   * 为指定 line-pattern 图片排队加载原始图片对象，并在完成后重排一次离散纹理视图。
   * @param normalizedSvg 已归一化后的原始图片地址
   */
  function requestLinePatternSourceImage(normalizedSvg: string): void {
    if (
      pendingLinePatternSourceRequestKeys.has(normalizedSvg) ||
      linePatternSourceImageCache.has(normalizedSvg) ||
      linePatternSourceImageFailureCache.has(normalizedSvg)
    ) {
      return;
    }

    pendingLinePatternSourceRequestKeys.add(normalizedSvg);

    void ensureLinePatternSourceImage(normalizedSvg)
      .then(() => {
        if (hasDisposed) {
          return;
        }

        schedulePatternViewSync();
      })
      .catch((error) => {
        console.warn('[TerradrawLineDecoration] 加载 line-pattern 原始图片失败', error);
      })
      .finally(() => {
        pendingLinePatternSourceRequestKeys.delete(normalizedSvg);
      });
  }

  /**
   * 取消当前已排队的离散纹理视图同步。
   */
  function cancelPatternViewSync(): void {
    if (patternViewSyncFrameId === null) {
      return;
    }

    if (typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(patternViewSyncFrameId);
    } else {
      globalThis.clearTimeout(patternViewSyncFrameId);
    }

    patternViewSyncFrameId = null;
  }

  /**
   * 基于最新地图视图重算全部离散纹理段。
   */
  function flushPatternViewSync(): void {
    patternViewSyncFrameId = null;

    if (hasDisposed) {
      return;
    }

    const decorationRasterBeforeLayerId = resolveDecorationRasterBeforeLayerId(
      map,
      controlType,
      control
    );
    patternRasterItems.value = shouldUseDiscreteLinePattern()
      ? createPatternRasterItems(map, patternFeatureSpecs, decorationRasterBeforeLayerId)
      : [];
  }

  /**
   * 将离散纹理视图同步压缩到同一帧执行，避免拖拽或缩放时重复重算。
   */
  function schedulePatternViewSync(): void {
    if (hasDisposed || patternViewSyncFrameId !== null) {
      return;
    }

    if (typeof globalThis.requestAnimationFrame === 'function') {
      patternViewSyncFrameId = globalThis.requestAnimationFrame(() => {
        flushPatternViewSync();
      });
      return;
    }

    patternViewSyncFrameId = globalThis.setTimeout(() => {
      flushPatternViewSync();
    }, 16) as unknown as number;
  }

  /**
   * 为指定尺寸桶排队生成高清拉伸纹理，并在完成后重新同步一次拉伸图层。
   * @param normalizedSvg 已归一化后的原始图片地址
   * @param sizeBucket 当前目标位图桶信息
   */
  function requestStretchRasterImage(
    normalizedSvg: string,
    sizeBucket: StretchRasterSizeBucket
  ): void {
    const stretchRasterCacheKey = createStretchRasterCacheKey(normalizedSvg, sizeBucket);

    if (
      pendingStretchRasterRequestKeys.has(stretchRasterCacheKey) ||
      stretchRasterImageRecordCache.has(stretchRasterCacheKey)
    ) {
      return;
    }

    pendingStretchRasterRequestKeys.add(stretchRasterCacheKey);

    void ensureStretchRasterImageRecord(normalizedSvg, sizeBucket)
      .then(() => {
        if (hasDisposed) {
          return;
        }

        scheduleStretchLayerViewSync();
      })
      .catch((error) => {
        console.warn('[TerradrawLineDecoration] 生成 segment-stretch 高清纹理失败', error);
      })
      .finally(() => {
        pendingStretchRasterRequestKeys.delete(stretchRasterCacheKey);
      });
  }

  /**
   * 按当前线段屏幕长度解析 segment-stretch 最终要使用的图片地址。
   * 命中目标桶时直接返回高清图；未命中时先回退到最接近的旧桶图，并后台补生成新桶图。
   * @param segmentSpec 当前拉伸线段规格
   * @param segmentPixelLength 当前线段在屏幕上的像素长度
   * @returns 当前线段最终应使用的图片地址；暂无可用图片时返回 null
   */
  function resolveStretchSegmentRenderUrl(
    segmentSpec: StretchDecorationSegmentSpec,
    segmentPixelLength: number
  ): string | null {
    if (!isSvgImageSource(segmentSpec.normalizedSvg)) {
      return segmentSpec.normalizedSvg;
    }

    const stretchSizeBucket = createStretchRasterSizeBucket(
      segmentPixelLength,
      segmentSpec.lineWidth
    );
    const exactStretchRasterRecord = getStretchRasterImageRecord(
      segmentSpec.normalizedSvg,
      stretchSizeBucket
    );

    if (exactStretchRasterRecord) {
      return exactStretchRasterRecord.url;
    }

    requestStretchRasterImage(segmentSpec.normalizedSvg, stretchSizeBucket);

    return (
      findClosestStretchRasterImageRecord(segmentSpec.normalizedSvg, stretchSizeBucket)?.url || null
    );
  }

  /**
   * 取消当前已排队的拉伸图层视图同步。
   */
  function cancelStretchViewSync(): void {
    if (stretchViewSyncFrameId === null) {
      return;
    }

    if (typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(stretchViewSyncFrameId);
    } else {
      globalThis.clearTimeout(stretchViewSyncFrameId);
    }

    stretchViewSyncFrameId = null;
  }

  /**
   * 基于最新地图视图重算所有拉伸段的四角坐标。
   */
  function flushStretchLayerViewSync(): void {
    stretchViewSyncFrameId = null;

    if (hasDisposed) {
      return;
    }

    const decorationRasterBeforeLayerId = resolveDecorationRasterBeforeLayerId(
      map,
      controlType,
      control
    );
    stretchLayerItems.value = createStretchLayerItems(
      map,
      stretchSegmentSpecs,
      resolveStretchSegmentRenderUrl,
      decorationRasterBeforeLayerId
    );
  }

  /**
   * 将拉伸图层的视图同步压缩到同一帧中执行，避免拖拽时重复重算。
   */
  function scheduleStretchLayerViewSync(): void {
    if (hasDisposed || stretchViewSyncFrameId !== null) {
      return;
    }

    if (typeof globalThis.requestAnimationFrame === 'function') {
      stretchViewSyncFrameId = globalThis.requestAnimationFrame(() => {
        flushStretchLayerViewSync();
      });
      return;
    }

    stretchViewSyncFrameId = globalThis.setTimeout(() => {
      flushStretchLayerViewSync();
    }, 16) as unknown as number;
  }

  /**
   * 将当前活跃图片重新注册到最新样式，解决样式切换后 image 丢失的问题。
   */
  function registerActiveImagesOnCurrentStyle(): void {
    if (hasDisposed) {
      return;
    }

    activeImageCacheKeys.forEach((cacheKey) => {
      const record = imageRecordCache.get(cacheKey);
      if (!record) {
        return;
      }

      registerImageRecordOnMap(map, record);
    });
  }

  /**
   * 在图片异步注册完成后，主动刷新一次当前装饰数据源。
   * 这样可以避免首条动态 line-pattern 在线已经入源但图片稍后才注册时，
   * MapLibre 仍停留在“缺图”状态，直到下一次用户交互才重算渲染。
   */
  function refreshDecorationSource(): void {
    if (hasDisposed) {
      return;
    }

    const decorationSource = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (decorationSource) {
      decorationSource.setData(cloneGeoJsonValue(data.value));
    }

    if (typeof map.triggerRepaint === 'function') {
      map.triggerRepaint();
    }
  }

  /**
   * 统一处理异步装饰图片就绪后的注册与补刷新逻辑。
   * @param imageRecord 当前已完成加载的图片记录
   * @param expectedImageKeys 当前同步批次期望使用的图片键集合
   */
  function handleAsyncImageReady(
    imageRecord: DecorationImageRecord,
    expectedImageKeys: Set<string>
  ): void {
    if (hasDisposed || !expectedImageKeys.has(imageRecord.key)) {
      return;
    }

    registerImageRecordOnMap(map, imageRecord);
    refreshDecorationSource();
    requestSyncFromSnapshot();
  }

  /**
   * 预热默认装饰样式对应的图片资源，降低首根线首次出现时的等待感。
   * symbol-repeat / line-pattern 会预先注册 MapLibre image，
   * segment-stretch 则会预先加载原始图片，并在视图同步阶段按尺寸桶动态生成高清纹理。
   * 如果业务层使用 resolveStyle 动态切换 SVG，则仍然按需懒加载。
   */
  function warmupDefaultDecorationImage(): void {
    const defaultStyle = normalizeLineDecorationStyle(options.defaultStyle || null);

    if (!defaultStyle) {
      return;
    }

    if (defaultStyle.mode === SEGMENT_STRETCH_MODE) {
      if (!isSvgImageSource(defaultStyle.normalizedSvg)) {
        return;
      }

      void ensureStretchSourceImage(defaultStyle.normalizedSvg).catch((error) => {
        console.warn('[TerradrawLineDecoration] 预热 segment-stretch 原始图片失败', error);
      });

      return;
    }

    if (defaultStyle.mode === LINE_PATTERN_MODE && shouldUseDiscreteLinePattern()) {
      void ensureLinePatternSourceImage(defaultStyle.normalizedSvg).catch((error) => {
        console.warn('[TerradrawLineDecoration] 预热线离散纹理图片失败', error);
      });

      return;
    }

    const imageKind: DecorationImageKind =
      defaultStyle.mode === SYMBOL_REPEAT_MODE ? 'symbol' : 'pattern';

    void ensureImageRecord(controlType, imageKind, defaultStyle.normalizedSvg)
      .then((record) => {
        if (hasDisposed) {
          return;
        }

        registerImageRecordOnMap(map, record);
      })
      .catch((error) => {
        console.warn('[TerradrawLineDecoration] 预热默认装饰图片失败', error);
      });
  }

  /**
   * 判断当前变更事件是否应该把 line-pattern 切回预览态。
   * 只有“用户正在交互修改几何”时才隐藏纹理；
   * 纯属性写回、API 几何更新、样式更新都直接保留正式态。
   * @param changeType TerraDraw 变更类型
   * @param changeContext TerraDraw 变更上下文
   * @returns 当前变更是否需要进入预览态
   */
  function shouldEnterLinePatternPreview(
    changeType: string,
    changeContext?: LineDecorationFeatureChangeContext
  ): boolean {
    if (changeType === 'delete' || changeType === 'styling') {
      return false;
    }

    if (changeContext?.origin === 'api') {
      return false;
    }

    return changeContext?.target !== 'properties';
  }

  /**
   * 获取当前控件下 line-pattern 最终态同步所需的收尾等待时间。
   * Measure 控件内部会在 finish 后异步补充测量属性和附属图层，
   * 因此这里只保留一个仅对最终态生效的短延迟；Draw 控件则立即同步。
   * @returns 最终态同步等待时间（毫秒）
   */
  function getLinePatternFinalizeDelay(): number {
    return controlType === 'measure' ? MEASURE_PATTERN_FINAL_SYNC_DELAY : 0;
  }

  /**
   * 将指定要素标记为 line-pattern 预览态。
   * 被标记的线在下一次同步时不会渲染 pattern，只保留 TerraDraw 底线预览。
   * @param featureIds 需要切回预览态的要素 ID 列表
   */
  function markLinePatternPreviewFeatures(featureIds: TerradrawFeatureId[]): void {
    featureIds.forEach((featureId) => {
      linePatternPreviewFeatureIds.add(featureId);
      pendingPatternFinalizeFeatureIds.delete(featureId);
    });
  }

  /**
   * 清理当前已排队的最终态同步定时器。
   */
  function clearPatternFinalizeTimer(): void {
    if (patternFinalizeTimer === null) {
      return;
    }

    globalThis.clearTimeout(patternFinalizeTimer);
    patternFinalizeTimer = null;
  }

  /**
   * 将指定要素从 line-pattern 预览态切回正式态，并在适当时机触发一次最终同步。
   * @param featureIds 需要恢复正式纹理的要素 ID 列表
   */
  function scheduleLinePatternFinalizeSync(featureIds: TerradrawFeatureId[]): void {
    if (hasDisposed || featureIds.length === 0) {
      requestSyncFromSnapshot();
      return;
    }

    featureIds.forEach((featureId) => {
      pendingPatternFinalizeFeatureIds.add(featureId);
    });

    const finalizeDelay = getLinePatternFinalizeDelay();
    const flushFinalizeSync = () => {
      patternFinalizeTimer = null;
      pendingPatternFinalizeFeatureIds.forEach((featureId) => {
        linePatternPreviewFeatureIds.delete(featureId);
      });
      pendingPatternFinalizeFeatureIds.clear();
      requestSyncFromSnapshot();
    };

    clearPatternFinalizeTimer();

    if (finalizeDelay <= 0) {
      flushFinalizeSync();
      return;
    }

    patternFinalizeTimer = globalThis.setTimeout(flushFinalizeSync, finalizeDelay);
  }

  /**
   * 判断当前 line-pattern 要素是否应当隐藏正式纹理，退回到底线预览态。
   * @param feature 当前 TerraDraw 线要素
   * @param style 当前要素解析后的装饰样式
   * @returns 是否跳过当前要素的 pattern 渲染
   */
  function shouldHideLinePatternFeature(
    feature: TerradrawFeature,
    style: NormalizedLineDecorationStyle
  ): boolean {
    if (style.mode !== LINE_PATTERN_MODE) {
      return false;
    }

    if (!isTerradrawFeatureId(feature.id)) {
      return false;
    }

    if (!isLineFeatureInteractionActive(feature)) {
      linePatternPreviewFeatureIds.delete(feature.id);
      pendingPatternFinalizeFeatureIds.delete(feature.id);
      return false;
    }

    return linePatternPreviewFeatureIds.has(feature.id);
  }

  /**
   * 根据要素 ID 解析当前线要素的装饰样式。
   * 该方法只用于事件分流判断，避免在 change 高频阶段对所有要素做全量重建。
   * @param featureId TerraDraw 要素 ID
   * @returns 当前要素解析后的装饰样式；无法装饰时返回 null
   */
  function resolveDecorationStyleByFeatureId(
    featureId: TerradrawFeatureId
  ): NormalizedLineDecorationStyle | null {
    const feature = drawInstance.getSnapshotFeature(featureId);

    if (!feature || !isDecoratableLineFeature(feature)) {
      return null;
    }

    return resolveFeatureDecorationStyle(feature, options, controlType, control, drawInstance, map);
  }

  /**
   * 请求一次基于当前 TerraDraw 快照的装饰同步。
   * 当上一次同步仍在等待图片加载或构建过程中时，只记录“需要再来一轮”，
   * 等当前同步结束后再自动跑最新一轮，避免首根线的首轮同步被后续 change 抢跑后丢失。
   */
  function requestSyncFromSnapshot(): void {
    if (hasDisposed) {
      return;
    }

    requestedSyncRevision += 1;

    if (isSyncing) {
      return;
    }

    void syncFromSnapshot();
  }

  /**
   * 基于当前 TerraDraw 全量快照重建装饰图层数据。
   * 该函数会：
   * 1. 逐条解析业务层声明的装饰样式
   * 2. 确保所需 SVG 已注册到地图样式
   * 3. 生成内部专用的 GeoJSON source 数据
   */
  async function syncFromSnapshot(): Promise<void> {
    if (hasDisposed) {
      return;
    }

    const currentSyncRevision = requestedSyncRevision;
    isSyncing = true;
    try {
      const snapshot = drawInstance.getSnapshot();
      const pendingImageKeys = new Set<string>();
      const symbolGroupMap = new Map<
        string,
        { groupKey: string; spacing: number; keepUpright: boolean }
      >();
      const nextPatternFeatureSpecs: PatternDecorationFeatureSpec[] = [];
      const nextStretchSegmentSpecs: StretchDecorationSegmentSpec[] = [];
      const preparedItems = snapshot.filter(isDecoratableLineFeature).map((feature) => {
        const style = resolveFeatureDecorationStyle(
          feature,
          options,
          controlType,
          control,
          drawInstance,
          map
        );

        if (!style) {
          return null;
        }

        if (style.mode === SEGMENT_STRETCH_MODE) {
          nextStretchSegmentSpecs.push(
            ...createStretchDecorationSegmentSpecs(feature, controlType, style)
          );
          return null;
        }

        if (style.mode === LINE_PATTERN_MODE && shouldUseDiscreteLinePattern()) {
          if (shouldHideLinePatternFeature(feature, style)) {
            return null;
          }

          const patternFeatureSpec = createPatternDecorationFeatureSpec(
            feature,
            controlType,
            style
          );
          if (patternFeatureSpec) {
            nextPatternFeatureSpecs.push(patternFeatureSpec);
            if (
              !linePatternSourceImageCache.has(style.normalizedSvg) &&
              !linePatternSourceImageFailureCache.has(style.normalizedSvg)
            ) {
              requestLinePatternSourceImage(style.normalizedSvg);
            }
          }

          return null;
        }

        const imageKind: DecorationImageKind =
          style.mode === SYMBOL_REPEAT_MODE ? 'symbol' : 'pattern';
        const imageDescriptor = createDecorationImageDescriptor(
          controlType,
          imageKind,
          style.normalizedSvg
        );
        pendingImageKeys.add(imageDescriptor.key);

        const cachedImageRecord = imageRecordCache.get(imageDescriptor.key);
        if (cachedImageRecord) {
          registerImageRecordOnMap(map, cachedImageRecord);
        } else {
          void ensureImageRecord(controlType, imageKind, style.normalizedSvg)
            .then((imageRecord) => {
              handleAsyncImageReady(imageRecord, pendingImageKeys);
            })
            .catch((error) => {
              console.warn('[TerradrawLineDecoration] 异步加载装饰图片失败', error);
            });
        }

        if (shouldHideLinePatternFeature(feature, style)) {
          return null;
        }

        const symbolGroupKey = style.mode === SYMBOL_REPEAT_MODE ? createSymbolGroupKey(style) : '';

        if (style.mode === SYMBOL_REPEAT_MODE && !symbolGroupMap.has(symbolGroupKey)) {
          symbolGroupMap.set(symbolGroupKey, {
            groupKey: symbolGroupKey,
            spacing: style.spacing,
            keepUpright: style.keepUpright,
          });
        }

        return createDecorationFeature(
          feature,
          controlType,
          style,
          imageDescriptor.id,
          symbolGroupKey
        );
      });

      if (hasDisposed) {
        return;
      }

      if (currentSyncRevision !== requestedSyncRevision) {
        return;
      }

      activeImageCacheKeys.clear();
      pendingImageKeys.forEach((cacheKey) => {
        activeImageCacheKeys.add(cacheKey);
        const record = imageRecordCache.get(cacheKey);
        if (record) {
          registerImageRecordOnMap(map, record);
        }
      });

      data.value = {
        type: 'FeatureCollection',
        features: preparedItems.filter((item): item is LineDecorationFeature => Boolean(item)),
      };
      symbolLayerItems.value = createSymbolLayerItems(controlType, [...symbolGroupMap.values()]);
      patternFeatureSpecs = nextPatternFeatureSpecs;
      schedulePatternViewSync();
      stretchSegmentSpecs = nextStretchSegmentSpecs;
      scheduleStretchLayerViewSync();
    } catch (error) {
      console.warn('[TerradrawLineDecoration] 同步装饰图层失败', error);
    } finally {
      isSyncing = false;

      if (!hasDisposed && currentSyncRevision !== requestedSyncRevision) {
        void syncFromSnapshot();
      }
    }
  }

  /**
   * 处理 TerraDraw change 事件。
   * 对于 line-pattern，只让当前正在变化的那条线进入预览态；
   * 其余已经完成的纹理线继续保持正式态，避免整批闪烁或消失。
   * @param featureIds 本次发生变化的要素 ID 列表
   * @param changeType TerraDraw 变更类型
   * @param changeContext TerraDraw 变更上下文
   */
  function handleDecorationFeatureChanged(
    featureIds: TerradrawFeatureId[],
    changeType: string,
    changeContext?: LineDecorationFeatureChangeContext
  ): void {
    if (changeType === 'delete') {
      featureIds.forEach((featureId) => {
        linePatternPreviewFeatureIds.delete(featureId);
        pendingPatternFinalizeFeatureIds.delete(featureId);
      });
      requestSyncFromSnapshot();
      return;
    }

    if (shouldEnterLinePatternPreview(changeType, changeContext)) {
      const previewFeatureIdsToAdd: TerradrawFeatureId[] = [];
      let shouldSyncVisibleDecoration = false;

      featureIds.forEach((featureId) => {
        const style = resolveDecorationStyleByFeatureId(featureId);

        if (!style) {
          shouldSyncVisibleDecoration = true;
          return;
        }

        if (style.mode === LINE_PATTERN_MODE) {
          const currentFeature = drawInstance.getSnapshotFeature(featureId);

          if (!currentFeature || !isDecoratableLineFeature(currentFeature)) {
            shouldSyncVisibleDecoration = true;
            return;
          }

          if (!isLineFeatureInteractionActive(currentFeature)) {
            linePatternPreviewFeatureIds.delete(featureId);
            pendingPatternFinalizeFeatureIds.delete(featureId);
            shouldSyncVisibleDecoration = true;
            return;
          }

          if (!linePatternPreviewFeatureIds.has(featureId)) {
            previewFeatureIdsToAdd.push(featureId);
          }
          return;
        }

        shouldSyncVisibleDecoration = true;
      });

      if (previewFeatureIdsToAdd.length > 0) {
        markLinePatternPreviewFeatures(previewFeatureIdsToAdd);
        clearPatternFinalizeTimer();
        requestSyncFromSnapshot();
        return;
      }

      if (!shouldSyncVisibleDecoration) {
        return;
      }
    }

    requestSyncFromSnapshot();
  }

  /**
   * 处理 TerraDraw finish 事件。
   * line-pattern 在绘制完成前只显示底线，finish 后再切回正式纹理；
   * 这样既减少拖拽时卡顿，也避免 Measure 还没补齐最终属性时抢跑。
   * @param featureId 当前完成绘制或编辑的要素 ID
   */
  function handleDecorationFeatureFinished(featureId: TerradrawFeatureId): void {
    linePatternPreviewFeatureIds.delete(featureId);
    pendingPatternFinalizeFeatureIds.delete(featureId);
    requestSyncFromSnapshot();
    scheduleLinePatternFinalizeSync([featureId]);
  }

  /**
   * 处理控件模式切换。
   * 当用户退出交互态并回到 render 时，把仍处于预览态的 pattern 线统一恢复。
   */
  function handleDecorationModeChanged(): void {
    if (drawInstance.getMode() === 'render' && linePatternPreviewFeatureIds.size > 0) {
      scheduleLinePatternFinalizeSync([...linePatternPreviewFeatureIds]);
      return;
    }

    requestSyncFromSnapshot();
  }

  /**
   * 在 TerraDraw 控件删除线要素后触发一次全量同步。
   * @param event 控件发出的删除事件参数
   */
  function handleFeatureDeleted(event: EventArgs): void {
    const deletedFeatureIds = [...(event.deletedIds || [])].filter(isTerradrawFeatureId);

    deletedFeatureIds.forEach((featureId) => {
      linePatternPreviewFeatureIds.delete(featureId);
      pendingPatternFinalizeFeatureIds.delete(featureId);
    });

    clearPatternFinalizeTimer();
    requestSyncFromSnapshot();
  }

  /**
   * 在样式重建后补注册当前活跃图片，避免 icon-image / line-pattern 丢失。
   */
  function handleMapStyleData(): void {
    registerActiveImagesOnCurrentStyle();
    schedulePatternViewSync();
    scheduleStretchLayerViewSync();
  }

  /**
   * 在地图视图变化后重算拉伸段四角坐标。
   */
  function handleStretchViewChanged(): void {
    schedulePatternViewSync();
    scheduleStretchLayerViewSync();
  }

  drawInstance.on('ready', requestSyncFromSnapshot);
  drawInstance.on('finish', handleDecorationFeatureFinished);
  drawInstance.on('change', handleDecorationFeatureChanged);
  control.on('feature-deleted', handleFeatureDeleted);
  control.on('mode-changed', handleDecorationModeChanged);
  map.on('styledata', handleMapStyleData);
  map.on('move', handleStretchViewChanged);
  map.on('resize', handleStretchViewChanged);

  warmupDefaultDecorationImage();
  requestSyncFromSnapshot();

  const binding = {
    enabled,
    sourceId,
    patternLayerId,
    data,
    symbolLayerItems,
    patternRasterItems,
    patternStyle,
    stretchLayerItems,
    destroy: () => {
      if (hasDisposed) {
        return;
      }

      hasDisposed = true;
      activeImageCacheKeys.clear();
      patternFeatureSpecs = [];
      stretchSegmentSpecs = [];
      data.value = createEmptyFeatureCollection();
      symbolLayerItems.value = [];
      patternRasterItems.value = [];
      stretchLayerItems.value = [];
      linePatternPreviewFeatureIds.clear();
      pendingPatternFinalizeFeatureIds.clear();
      pendingLinePatternSourceRequestKeys.clear();
      pendingStretchRasterRequestKeys.clear();

      drawInstance.off('ready', requestSyncFromSnapshot);
      drawInstance.off('finish', handleDecorationFeatureFinished);
      drawInstance.off('change', handleDecorationFeatureChanged);
      control.off('feature-deleted', handleFeatureDeleted);
      control.off('mode-changed', handleDecorationModeChanged);
      map.off('styledata', handleMapStyleData);
      map.off('move', handleStretchViewChanged);
      map.off('resize', handleStretchViewChanged);

      clearPatternFinalizeTimer();
      cancelPatternViewSync();
      cancelStretchViewSync();
    },
  } as unknown as TerradrawLineDecorationBinding;

  return binding;
}
