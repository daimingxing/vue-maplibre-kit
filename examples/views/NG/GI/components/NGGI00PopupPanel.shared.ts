import {
  MapLineExtensionTool,
  MapLineMeasureTool,
  type MapCommonFeature,
  type MapCommonLineFeature,
} from "vue-maplibre-kit/geometry";
import type { MapSourceFeatureRef } from "vue-maplibre-kit";
import {
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
} from "vue-maplibre-kit/plugins/line-draft-preview";

/**
 * 当前页面 Popup 类型常量。
 * 用常量对象而不是散落字符串，方便模板、业务逻辑和 shared helper 复用。
 */
export const NGGI00_POPUP_TYPE = {
  point: "point",
  line: "line",
  terradraw: "terradraw",
} as const;

/** 当前页面支持的 Popup 类型。 */
export type NgPopupType = (typeof NGGI00_POPUP_TYPE)[keyof typeof NGGI00_POPUP_TYPE];

/** Popup 统一基础载荷。 */
export interface NgPopupBasePayload {
  type: NgPopupType;
  featureId: string | number | null;
  geometryType: string;
  featureProps: Record<string, any>;
}

/** 点弹窗载荷。 */
export interface NgPointPopupPayload extends NgPopupBasePayload {
  type: typeof NGGI00_POPUP_TYPE.point;
}

/** 线弹窗载荷。 */
export interface NgLinePopupPayload extends NgPopupBasePayload {
  type: typeof NGGI00_POPUP_TYPE.line;
  featureRef: MapSourceFeatureRef | null;
  lineFeature: MapCommonLineFeature;
  selectedSegmentIndex: number;
  selectedSegmentLengthMeters: number;
  lineLengthMeters: number;
}

/** 线弹窗动作载荷。 */
export interface NgLineActionPayload {
  lineFeature: MapCommonLineFeature;
  featureRef: MapSourceFeatureRef | null;
  /** 当前命中的线段索引；为 -1 表示尚未识别到具体线段。 */
  segmentIndex: number;
}

/** 线草稿受阻时的提示文案。 */
export const DRAFT_HINT_TEXT = "当前未识别到具体线段，可生成线廊，但不能创建线草稿";

/** 线草稿受阻时的警告文案。 */
export const DRAFT_WARN_TEXT = "当前未识别到具体线段，无法创建线草稿";

/** TerraDraw 弹窗载荷。 */
export interface NgTerradrawPopupPayload extends NgPopupBasePayload {
  type: typeof NGGI00_POPUP_TYPE.terradraw;
}

/** 当前页面 Popup 联合载荷。 */
export type NgPopupPayload = NgPointPopupPayload | NgLinePopupPayload | NgTerradrawPopupPayload;

/**
 * 深拷贝一份属性快照，避免 Popup UI 直接持有底层引用。
 * @param properties 原始属性对象
 * @returns 独立的属性快照
 */
function clonePopupProperties(
  properties: Record<string, any> | null | undefined,
): Record<string, any> {
  return JSON.parse(JSON.stringify(properties || {}));
}

/**
 * 深拷贝一份来源引用，避免 Popup UI 直接持有外部对象引用。
 * @param featureRef 原始来源引用
 * @returns 独立的来源引用快照
 */
function cloneFeatureRef(featureRef: MapSourceFeatureRef | null | undefined): MapSourceFeatureRef | null {
  if (!featureRef) {
    return null;
  }

  return {
    sourceId: featureRef.sourceId,
    featureId: featureRef.featureId,
    layerId: featureRef.layerId ?? null,
  };
}

/**
 * 深拷贝一份线要素快照，避免 Popup UI 直接持有底层引用。
 * @param lineFeature 原始线要素
 * @returns 独立的线要素快照
 */
function cloneLineFeature(lineFeature: MapCommonLineFeature): MapCommonLineFeature {
  return JSON.parse(JSON.stringify(lineFeature)) as MapCommonLineFeature;
}

/**
 * 为线草稿要素推导标准来源引用。
 * @param lineFeature 当前线要素
 * @returns 线草稿来源引用；不是线草稿时返回 null
 */
function resolveLineDraftFeatureRef(
  lineFeature: MapCommonLineFeature,
): MapSourceFeatureRef | null {
  const generatedKind = lineFeature.properties?.generatedKind;
  if (typeof generatedKind !== "string" || !generatedKind.includes("draft")) {
    return null;
  }

  const featureId = resolvePopupFeatureId(lineFeature);
  if (featureId === null) {
    return null;
  }

  return {
    sourceId: LINE_DRAFT_PREVIEW_SOURCE_ID,
    featureId,
    layerId: LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  };
}

/**
 * 解析线弹窗最终要使用的来源引用。
 * 优先级：
 * 1. 业务层显式传入的 featureRef
 * 2. 自动推导出的线草稿来源引用
 *
 * @param lineFeature 当前线要素
 * @param featureRef 业务层显式来源引用
 * @returns 最终来源引用
 */
function resolveLinePopupFeatureRef(
  lineFeature: MapCommonLineFeature,
  featureRef: MapSourceFeatureRef | null | undefined,
): MapSourceFeatureRef | null {
  return cloneFeatureRef(featureRef) || resolveLineDraftFeatureRef(lineFeature);
}

/**
 * 解析 Popup 要使用的业务要素 ID。
 * @param feature 当前要素
 * @returns 优先取 properties.id，其次回退到 feature.id
 */
function resolvePopupFeatureId(feature: MapCommonFeature | null | undefined): string | number | null {
  if (!feature) {
    return null;
  }

  const propertyId = feature.properties?.id;
  if (propertyId !== undefined && propertyId !== null) {
    return propertyId;
  }

  return feature.id ?? null;
}

/**
 * 创建点要素弹窗载荷。
 * @param feature 当前点要素
 * @param featureId 当前要素 ID；为空时自动回退到业务 ID
 * @returns 点弹窗载荷
 */
export function createPointPopupPayload(
  feature: MapCommonFeature,
  featureId: string | number | null,
): NgPointPopupPayload {
  return {
    type: NGGI00_POPUP_TYPE.point,
    featureId: featureId ?? resolvePopupFeatureId(feature),
    geometryType: feature.geometry?.type || "",
    featureProps: clonePopupProperties(feature.properties || {}),
  };
}

/**
 * 创建线要素弹窗载荷。
 * 该 helper 会顺手补齐总长度和命中线段长度，业务层后续只消费结果即可。
 *
 * @param lineFeature 当前线要素
 * @param segmentIndex 当前线段索引；传负数表示当前未识别到具体线段
 * @param featureRef 当前线要素来源引用；用于后续动作直接回写到正确目标
 * @returns 线弹窗载荷
 */
export function createLinePopupPayload(
  lineFeature: MapCommonLineFeature,
  segmentIndex: number,
  featureRef: MapSourceFeatureRef | null = null,
): NgLinePopupPayload {
  const normalizedCoordinates = MapLineExtensionTool.normalizeLineCoordinates(
    lineFeature.geometry.coordinates,
  );

  const lineLengthMeters =
    normalizedCoordinates.length >= 2
      ? MapLineMeasureTool.getCoordinatesLengthInMeters(normalizedCoordinates)
      : 0;

  if (normalizedCoordinates.length < 2) {
    return {
      type: NGGI00_POPUP_TYPE.line,
      featureId: resolvePopupFeatureId(lineFeature),
      geometryType: lineFeature.geometry.type,
      featureProps: clonePopupProperties(lineFeature.properties || {}),
      featureRef: resolveLinePopupFeatureRef(lineFeature, featureRef),
      lineFeature: cloneLineFeature(lineFeature),
      selectedSegmentIndex: -1,
      selectedSegmentLengthMeters: 0,
      lineLengthMeters,
    };
  }

  // 这里显式把线段索引夹在有效范围内，避免命中结果过旧或越界时污染 popup 展示。
  const currentSegmentIndex =
    segmentIndex >= 0 ? Math.max(0, Math.min(segmentIndex, normalizedCoordinates.length - 2)) : -1;
  const selectedSegmentLengthMeters =
    currentSegmentIndex >= 0
      ? MapLineMeasureTool.getDistanceInMeters(
          normalizedCoordinates[currentSegmentIndex],
          normalizedCoordinates[currentSegmentIndex + 1],
        )
      : 0;

  return {
    type: NGGI00_POPUP_TYPE.line,
    featureId: resolvePopupFeatureId(lineFeature),
    geometryType: lineFeature.geometry.type,
    featureProps: clonePopupProperties(lineFeature.properties || {}),
    featureRef: resolveLinePopupFeatureRef(lineFeature, featureRef),
    lineFeature: cloneLineFeature(lineFeature),
    selectedSegmentIndex: currentSegmentIndex,
    selectedSegmentLengthMeters,
    lineLengthMeters,
  };
}

/**
 * 创建 TerraDraw 要素弹窗载荷。
 * @param feature 当前 TerraDraw 要素
 * @param featureId 当前要素 ID
 * @returns TerraDraw 弹窗载荷
 */
export function createTerradrawPopupPayload(
  feature: MapCommonFeature,
  featureId: string | number | null,
): NgTerradrawPopupPayload {
  return {
    type: NGGI00_POPUP_TYPE.terradraw,
    featureId: featureId ?? resolvePopupFeatureId(feature),
    geometryType: feature.geometry?.type || "",
    featureProps: clonePopupProperties(feature.properties || {}),
  };
}

/**
 * 提取线弹窗载荷。
 * @param payload 当前 popup 载荷
 * @returns 线弹窗载荷；不是线时返回 null
 */
export function getLinePopupPayload(payload: NgPopupPayload | null | undefined): NgLinePopupPayload | null {
  return payload?.type === NGGI00_POPUP_TYPE.line ? payload : null;
}

/**
 * 从线弹窗载荷中提取当前动作目标。
 * @param payload 当前 popup 载荷
 * @returns 可直接交给业务动作的线目标；不是线弹窗时返回 null
 */
export function getLineActionPayload(
  payload: NgPopupPayload | null | undefined,
): NgLineActionPayload | null {
  const linePayload = getLinePopupPayload(payload);
  if (!linePayload) {
    return null;
  }

  return {
    lineFeature: cloneLineFeature(linePayload.lineFeature),
    featureRef: cloneFeatureRef(linePayload.featureRef),
    // 这里保留“未识别到线段”的原始状态，交由上层 UI 和动作层显式拦截，
    // 避免静默回退到第 1 段后误操作错误线段。
    segmentIndex: linePayload.selectedSegmentIndex,
  };
}

/**
 * 判断当前动作是否已经命中具体线段。
 * @param payload 线动作载荷
 * @returns 命中具体线段时返回 true
 */
export function hasLineSegment(payload: NgLineActionPayload | null | undefined): boolean {
  return (payload?.segmentIndex ?? -1) >= 0;
}

/**
 * 解析创建线草稿前需要提示的警告文案。
 * @param payload 线动作载荷
 * @returns 需要拦截时返回警告文案，否则返回 null
 */
export function getDraftWarn(payload: NgLineActionPayload | null | undefined): string | null {
  return hasLineSegment(payload) ? null : DRAFT_WARN_TEXT;
}

/**
 * 提取点弹窗载荷。
 * @param payload 当前 popup 载荷
 * @returns 点弹窗载荷；不是点时返回 null
 */
export function getPointPopupPayload(
  payload: NgPopupPayload | null | undefined,
): NgPointPopupPayload | null {
  return payload?.type === NGGI00_POPUP_TYPE.point ? payload : null;
}

/**
 * 提取 TerraDraw 弹窗载荷。
 * @param payload 当前 popup 载荷
 * @returns TerraDraw 弹窗载荷；不是 TerraDraw 时返回 null
 */
export function getTerradrawPopupPayload(
  payload: NgPopupPayload | null | undefined,
): NgTerradrawPopupPayload | null {
  return payload?.type === NGGI00_POPUP_TYPE.terradraw ? payload : null;
}
