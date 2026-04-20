import {
  MapLineExtensionTool,
  MapLineMeasureTool,
  type MapCommonFeature,
  type MapCommonLineFeature,
} from "vue-maplibre-kit/geometry";

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
  selectedSegmentIndex: number;
  selectedSegmentLengthMeters: number;
  lineLengthMeters: number;
}

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
 * @returns 线弹窗载荷
 */
export function createLinePopupPayload(
  lineFeature: MapCommonLineFeature,
  segmentIndex: number,
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
