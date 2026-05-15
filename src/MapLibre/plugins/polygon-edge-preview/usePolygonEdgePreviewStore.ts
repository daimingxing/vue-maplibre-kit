import type { Position } from 'geojson';
import { computed, ref } from 'vue';
import {
  buildGeneratedFeatureProperties,
  buildGeneratedGroupId,
  buildMapSourceFeatureRefKey,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapSourceFeatureRef,
} from '../../shared/map-common-tools';
import type {
  PolygonEdgePreviewEdgeState,
  PolygonEdgePreviewGenerateOptions,
  PolygonEdgePreviewGenerateResult,
  PolygonEdgePreviewSimpleLineStyle,
  PolygonEdgePreviewStateStyles,
  PolygonEdgePreviewStyleRule,
} from './types';

/** 面边线预览数据源 ID。 */
export const POLYGON_EDGE_PREVIEW_SOURCE_ID = 'polygonEdgePreviewSource';

/** 面边线预览线图层 ID。 */
export const POLYGON_EDGE_PREVIEW_LINE_LAYER_ID = 'polygonEdgePreviewLineLayer';

/** 面边线预览 generatedKind 固定值。 */
export const POLYGON_EDGE_PREVIEW_KIND = 'polygon-edge-preview';

interface UsePolygonEdgePreviewStoreOptions {
  /** 读取当前插件是否启用。 */
  isEnabled: () => boolean;
  /** 读取当前来源面样式规则。 */
  getStyleRules?: () => PolygonEdgePreviewStyleRule[];
}

interface PolygonRingItem {
  /** MultiPolygon 子面索引。 */
  polygonIndex: number;
  /** ring 索引。 */
  ringIndex: number;
  /** ring 坐标。 */
  coordinates: Position[];
}

/**
 * 创建空的 FeatureCollection。
 * @returns 空要素集合
 */
function createEmptyFeatureCollection(): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

/**
 * 深拷贝普通数据。
 * @param value 待拷贝值
 * @returns 拷贝后的值
 */
function clonePlainData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 判断坐标是否为有效二维坐标。
 * @param coordinate 待判断坐标
 * @returns 是否为有效坐标
 */
function isPositionCoordinate(coordinate: unknown): coordinate is Position {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    typeof coordinate[0] === 'number' &&
    typeof coordinate[1] === 'number'
  );
}

/**
 * 判断两个坐标的经纬度是否相同。
 * @param left 左侧坐标
 * @param right 右侧坐标
 * @returns 是否相同
 */
function isSameCoordinate(left: Position, right: Position): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

/**
 * 标准化 ring 坐标。
 * 会过滤连续重复坐标，并确保首尾闭合。
 *
 * @param coordinates 原始 ring 坐标
 * @returns 标准化后的 ring 坐标
 */
function normalizeRingCoordinates(coordinates: Position[]): Position[] {
  const normalizedCoordinates = coordinates.filter((coordinate, index) => {
    if (!isPositionCoordinate(coordinate)) {
      return false;
    }

    if (index === 0) {
      return true;
    }

    return !isSameCoordinate(coordinate, coordinates[index - 1]);
  });

  if (normalizedCoordinates.length < 2) {
    return normalizedCoordinates;
  }

  const firstCoordinate = normalizedCoordinates[0];
  const lastCoordinate = normalizedCoordinates[normalizedCoordinates.length - 1];
  if (isSameCoordinate(firstCoordinate, lastCoordinate)) {
    return normalizedCoordinates;
  }

  return normalizedCoordinates.concat([[...firstCoordinate] as Position]);
}

/**
 * 提取面要素中的全部 ring。
 * @param feature 来源面要素
 * @returns ring 列表
 */
function getPolygonRingItems(feature: MapCommonFeature): PolygonRingItem[] {
  if (feature.geometry?.type === 'Polygon') {
    return feature.geometry.coordinates.map((coordinates, ringIndex) => ({
      polygonIndex: 0,
      ringIndex,
      coordinates,
    }));
  }

  if (feature.geometry?.type === 'MultiPolygon') {
    return feature.geometry.coordinates.flatMap((polygon, polygonIndex) => {
      return polygon.map((coordinates, ringIndex) => ({
        polygonIndex,
        ringIndex,
        coordinates,
      }));
    });
  }

  return [];
}

/**
 * 读取边线要素 ID。
 * @param feature 当前边线要素
 * @returns 边线 ID
 */
function getEdgeFeatureId(feature: MapCommonFeature): string | null {
  const edgeId = feature.properties?.edgeId;
  return typeof edgeId === 'string' ? edgeId : null;
}

/**
 * 构建面边线分组 ID。
 * @param parentRef 来源正式业务要素引用
 * @returns 面分组 ID
 */
function buildPolygonId(parentRef: MapSourceFeatureRef): string {
  return `polygon::${parentRef.sourceId}::${String(parentRef.featureId)}`;
}

/**
 * 构建 ring 分组 ID。
 * @param parentRef 来源正式业务要素引用
 * @param polygonIndex MultiPolygon 子面索引
 * @param ringIndex ring 索引
 * @returns ring 分组 ID
 */
function buildRingId(
  parentRef: MapSourceFeatureRef,
  polygonIndex: number,
  ringIndex: number
): string {
  return `ring::${parentRef.sourceId}::${String(parentRef.featureId)}::${polygonIndex}::${ringIndex}`;
}

/**
 * 构建边线 ID。
 * @param parentRef 来源正式业务要素引用
 * @param polygonIndex MultiPolygon 子面索引
 * @param ringIndex ring 索引
 * @param edgeIndex 边索引
 * @returns 边线 ID
 */
function buildEdgeId(
  parentRef: MapSourceFeatureRef,
  polygonIndex: number,
  ringIndex: number,
  edgeIndex: number
): string {
  return `polygon-edge::${parentRef.sourceId}::${String(parentRef.featureId)}::${polygonIndex}::${ringIndex}::${edgeIndex}`;
}

/**
 * 判断来源面属性是否命中样式规则。
 * @param sourceProperties 来源面属性
 * @param rule 样式规则
 * @returns 是否命中
 */
function matchesStyleRule(
  sourceProperties: Record<string, unknown>,
  rule: PolygonEdgePreviewStyleRule
): boolean {
  if (!rule.where) {
    return true;
  }

  return Object.entries(rule.where).every(([propertyKey, propertyValue]) => {
    return sourceProperties[propertyKey] === propertyValue;
  });
}

/**
 * 写入单个状态的按要素样式属性。
 * @param targetProperties 当前边线属性
 * @param state 当前状态名称
 * @param style 状态样式
 */
function assignStateStyleProperties(
  targetProperties: Record<string, unknown>,
  state: keyof PolygonEdgePreviewStateStyles,
  style: PolygonEdgePreviewSimpleLineStyle | null | undefined
): void {
  if (!style) {
    return;
  }

  const stateName = state.charAt(0).toUpperCase() + state.slice(1);
  if (style.color) {
    targetProperties[`edge${stateName}Color`] = style.color;
  }

  if (typeof style.width === 'number') {
    targetProperties[`edge${stateName}Width`] = style.width;
  }

  if (typeof style.opacity === 'number') {
    targetProperties[`edge${stateName}Opacity`] = style.opacity;
  }
}

/**
 * 构建来源面命中的边线样式属性。
 * @param sourceProperties 来源面属性
 * @param styleRules 当前样式规则
 * @returns 可写入边线要素的样式属性
 */
function buildRuleStyleProperties(
  sourceProperties: Record<string, unknown>,
  styleRules: PolygonEdgePreviewStyleRule[]
): Record<string, unknown> {
  const matchedRule = styleRules.find((rule) => matchesStyleRule(sourceProperties, rule));
  const ruleProperties: Record<string, unknown> = {};
  if (!matchedRule?.style) {
    return ruleProperties;
  }

  assignStateStyleProperties(ruleProperties, 'normal', matchedRule.style.normal);
  assignStateStyleProperties(ruleProperties, 'hover', matchedRule.style.hover);
  assignStateStyleProperties(ruleProperties, 'selected', matchedRule.style.selected);
  assignStateStyleProperties(ruleProperties, 'highlighted', matchedRule.style.highlighted);

  return ruleProperties;
}

/**
 * 创建面边线预览存储器。
 * @param options 存储器配置
 * @returns 面边线数据与操作方法
 */
export function usePolygonEdgePreviewStore(options: UsePolygonEdgePreviewStoreOptions) {
  const { isEnabled, getStyleRules = () => [] } = options;
  const featureCollection = ref<MapCommonFeatureCollection>(createEmptyFeatureCollection());

  /**
   * 读取当前边线要素列表。
   * @returns 当前边线要素列表
   */
  const getCurrentFeatures = (): MapCommonFeature[] => {
    return (featureCollection.value.features || []) as MapCommonFeature[];
  };

  /**
   * 提交边线要素列表。
   * @param features 最新边线要素列表
   */
  const commitFeatures = (features: MapCommonFeature[]): void => {
    featureCollection.value = {
      type: 'FeatureCollection',
      features: clonePlainData(features),
    };
  };

  /**
   * 按来源面要素生成临时边线。
   * @param generateOptions 生成配置
   * @returns 结构化生成结果
   */
  const generateFromFeature = (
    generateOptions: PolygonEdgePreviewGenerateOptions
  ): PolygonEdgePreviewGenerateResult => {
    const { feature, origin } = generateOptions;
    const parentKey = buildMapSourceFeatureRefKey(origin);

    if (!isEnabled()) {
      return {
        success: false,
        message: '面边线预览插件未启用',
        edgeCount: 0,
        polygonId: null,
      };
    }

    if (!feature || (feature.geometry?.type !== 'Polygon' && feature.geometry?.type !== 'MultiPolygon')) {
      return {
        success: false,
        message: '当前要素不是可生成边线的面要素',
        edgeCount: 0,
        polygonId: null,
      };
    }

    if (!origin || !parentKey) {
      return {
        success: false,
        message: '当前面要素缺少来源引用，无法生成边线',
        edgeCount: 0,
        polygonId: null,
      };
    }

    const polygonId = buildPolygonId(origin);
    const generatedGroupId = buildGeneratedGroupId(POLYGON_EDGE_PREVIEW_KIND, origin);
    const nextEdgeFeatures = getPolygonRingItems(feature).flatMap((ringItem) => {
      const ringCoordinates = normalizeRingCoordinates(ringItem.coordinates);
      if (ringCoordinates.length < 3) {
        return [];
      }

      const ringId = buildRingId(origin, ringItem.polygonIndex, ringItem.ringIndex);
      const sourceProperties = feature.properties || {};
      const ruleStyleProperties = buildRuleStyleProperties(sourceProperties, getStyleRules());
      const edgeFeatures: MapCommonFeature[] = [];

      for (let edgeIndex = 0; edgeIndex < ringCoordinates.length - 1; edgeIndex += 1) {
        const startCoordinate = ringCoordinates[edgeIndex];
        const endCoordinate = ringCoordinates[edgeIndex + 1];
        if (isSameCoordinate(startCoordinate, endCoordinate)) {
          continue;
        }

        const edgeId = buildEdgeId(origin, ringItem.polygonIndex, ringItem.ringIndex, edgeIndex);
        edgeFeatures.push({
          type: 'Feature',
          id: edgeId,
          properties: {
            ...sourceProperties,
            ...ruleStyleProperties,
            ...buildGeneratedFeatureProperties({
              generatedKind: POLYGON_EDGE_PREVIEW_KIND,
              groupId: generatedGroupId,
              parentRef: origin,
            }),
            id: edgeId,
            polygonId,
            ringId,
            edgeId,
            polygonIndex: ringItem.polygonIndex,
            ringIndex: ringItem.ringIndex,
            edgeIndex,
            isOuterRing: ringItem.ringIndex === 0,
            edgeState: 'normal',
          },
          geometry: {
            type: 'LineString',
            coordinates: [startCoordinate, endCoordinate],
          },
        });
      }

      return edgeFeatures;
    });

    if (!nextEdgeFeatures.length) {
      return {
        success: false,
        message: '当前面要素坐标不足以生成有效边线',
        edgeCount: 0,
        polygonId,
      };
    }

    const nextFeatures = getCurrentFeatures()
      .filter((currentFeature) => currentFeature.properties?.polygonId !== polygonId)
      .concat(nextEdgeFeatures);
    commitFeatures(nextFeatures);

    return {
      success: true,
      message: '已生成面边线预览',
      edgeCount: nextEdgeFeatures.length,
      polygonId,
    };
  };

  /**
   * 按 ID 获取边线要素。
   * @param edgeId 边线 ID
   * @returns 命中的边线要素
   */
  const getFeatureById = (edgeId: string | null): MapCommonFeature | null => {
    if (!edgeId) {
      return null;
    }

    const feature = getCurrentFeatures().find((item) => getEdgeFeatureId(item) === edgeId) || null;
    return feature ? clonePlainData(feature) : null;
  };

  /**
   * 更新边线状态。
   * @param predicate 目标边线判断函数
   * @param state 下一个状态
   * @returns 是否命中至少一条边线
   */
  const updateEdgeState = (
    predicate: (feature: MapCommonFeature) => boolean,
    state: PolygonEdgePreviewEdgeState
  ): boolean => {
    let hasMatched = false;
    const nextFeatures = getCurrentFeatures().map((feature) => {
      if (!predicate(feature)) {
        return {
          ...feature,
          properties: {
            ...(feature.properties || {}),
            edgeState: state === 'selected' ? 'normal' : feature.properties?.edgeState || 'normal',
          },
        };
      }

      hasMatched = true;
      return {
        ...feature,
        properties: {
          ...(feature.properties || {}),
          edgeState: state,
        },
      };
    });

    if (hasMatched) {
      commitFeatures(nextFeatures);
    }

    return hasMatched;
  };

  /**
   * 高亮整个面。
   * @param polygonId 面分组 ID
   * @returns 是否命中
   */
  const highlightPolygon = (polygonId: string | null): boolean => {
    return updateEdgeState((feature) => feature.properties?.polygonId === polygonId, 'highlighted');
  };

  /**
   * 高亮单个 ring。
   * @param ringId ring 分组 ID
   * @returns 是否命中
   */
  const highlightRing = (ringId: string | null): boolean => {
    return updateEdgeState((feature) => feature.properties?.ringId === ringId, 'highlighted');
  };

  /**
   * 高亮单条边。
   * @param edgeId 边线 ID
   * @returns 是否命中
   */
  const highlightEdge = (edgeId: string | null): boolean => {
    return updateEdgeState((feature) => feature.properties?.edgeId === edgeId, 'highlighted');
  };

  /**
   * 选中单条边。
   * @param edgeId 边线 ID
   * @returns 是否命中
   */
  const selectEdge = (edgeId: string | null): boolean => {
    return updateEdgeState((feature) => feature.properties?.edgeId === edgeId, 'selected');
  };

  /**
   * 清理高亮和选中状态。
   */
  const clearHighlight = (): void => {
    commitFeatures(
      getCurrentFeatures().map((feature) => ({
        ...feature,
        properties: {
          ...(feature.properties || {}),
          edgeState: 'normal',
        },
      }))
    );
  };

  /**
   * 清空全部边线。
   */
  const clear = (): void => {
    commitFeatures([]);
  };

  const hasFeatures = computed(() => getCurrentFeatures().length > 0);
  const featureCount = computed(() => getCurrentFeatures().length);

  return {
    featureCollection,
    hasFeatures,
    featureCount,
    generateFromFeature,
    getFeatureById,
    highlightPolygon,
    highlightRing,
    highlightEdge,
    selectEdge,
    clearHighlight,
    clear,
  };
}
