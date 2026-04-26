/**
 * 文件导读：业务要素动作门面。
 *
 * 适合解决的问题：
 * - 属性保存、属性删除为何会分流到不同目标
 * - 线草稿如何从正式业务要素生成或回写
 * - TerraDraw、line draft、business source 三类目标如何统一返回结果
 * - 业务动作为何能复用统一查询上下文
 *
 * 建议阅读顺序：
 * 1. 动作结果类型：先确认 `business / lineDraft / terradraw` 三类目标
 * 2. `useMapFeatureActions()`：看对外暴露了哪些动作
 * 3. 各类 `save / remove / create / replace` 动作函数：看分流规则和回写逻辑
 * 4. 目标解析与上下文辅助函数：看动作为什么能落到正确数据源
 *
 * 检索关键词：
 * - action target
 * - line draft
 * - terradraw
 * - save properties
 * - remove properties
 *
 * 不必先来这里的问题：
 * - 只想知道当前选中了什么，请先看 `useMapFeatureQuery.ts`
 * - 只想看属性面板状态拼装，请先看 `useMapFeaturePropertyEditor.ts`
 */
import { toValue, type MaybeRefOrGetter } from 'vue';
import {
  saveTerradrawFeatureProperties,
  removeTerradrawFeatureProperties,
  TERRADRAW_MEASURE_SYSTEM_PROPERTY_KEYS,
  type FeatureProperties,
  type MapFeatureId,
} from '../composables/useMapDataUpdate';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import { LINE_DRAFT_PREVIEW_SOURCE_ID } from '../plugins/line-draft-preview/useLineDraftPreviewStore';
import type { LineDraftPreviewPluginApi } from '../plugins/line-draft-preview/useLineDraftPreviewController';
import {
  MapLineCorridorTool,
  extractManagedPreviewOriginFromProperties,
  createMapSourceFeatureRef,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '../shared/map-common-tools';
import type { MapFeaturePropertyPolicy } from '../shared/map-feature-data';
import type { TerradrawControlType } from '../shared/mapLibre-controls-types';
import type { MapBusinessSourceRegistry } from './createMapBusinessSource';
import { resolveLineDraftPreviewApi } from './mapPluginResolver';
import { useMapFeatureQuery } from './useMapFeatureQuery';

/**
 * 业务动作结果目标类型。
 */
export type MapFeatureActionTarget = 'business' | 'lineDraft' | 'terradraw';

/**
 * 通用业务动作结果。
 */
export interface MapFeatureActionResult {
  /** 当前动作是否成功。 */
  success: boolean;
  /** 动作实际作用到的目标类型。 */
  target: MapFeatureActionTarget;
  /** 结果说明。 */
  message: string;
}

/**
 * 属性写回动作结果。
 */
export interface MapFeaturePropertyActionResult extends MapFeatureActionResult {
  /** 最新属性对象。 */
  properties?: FeatureProperties;
  /** 被阻止的字段列表。 */
  blockedKeys?: string[];
  /** 实际删除的字段列表。 */
  removedKeys?: string[];
}

/**
 * 线草稿动作结果。
 */
export interface MapFeatureLineActionResult extends MapFeatureActionResult {
  /** 最新线要素。 */
  lineFeature?: MapCommonLineFeature | null;
}

/**
 * 地图要素属性保存入参。
 * 这里的目标既可能是正式业务源，也可能会被自动分流到线草稿源。
 */
export interface SaveBusinessFeaturePropertiesOptions {
  /** 目标来源引用。 */
  featureRef: MapSourceFeatureRef | null;
  /** 本次需要保存的属性键值。 */
  newProperties: FeatureProperties;
}

/**
 * 地图要素属性删除入参。
 * 这里的目标既可能是正式业务源，也可能会被自动分流到线草稿源。
 */
export interface RemoveBusinessFeaturePropertiesOptions {
  /** 目标来源引用。 */
  featureRef: MapSourceFeatureRef | null;
  /** 需要删除的属性键列表。 */
  propertyKeys: readonly string[];
}

/**
 * TerraDraw 属性写回入参。
 */
export interface SaveTerradrawFeaturePropertiesActionOptions {
  /** 当前控件类型。 */
  controlType: TerradrawControlType;
  /** 目标要素 ID。 */
  featureId: MapFeatureId;
  /** 当前页面已持有的属性快照。 */
  currentProperties?: FeatureProperties;
  /** 最新属性对象。 */
  newProperties: FeatureProperties;
  /** TerraDraw 保留字段列表。 */
  reservedPropertyKeys?: readonly string[];
}

/**
 * TerraDraw 属性删除入参。
 */
export interface RemoveTerradrawFeaturePropertiesActionOptions {
  /** 当前控件类型。 */
  controlType: TerradrawControlType;
  /** 目标要素 ID。 */
  featureId: MapFeatureId;
  /** 当前页面已持有的属性快照。 */
  currentProperties?: FeatureProperties;
  /** 需要删除的属性键列表。 */
  propertyKeys: readonly string[];
  /** TerraDraw 保留字段列表。 */
  reservedPropertyKeys?: readonly string[];
}

/**
 * 线草稿预览动作入参。
 */
export interface PreviewSelectedLineOptions {
  /** 当前命中的线段索引。 */
  segmentIndex: number;
  /** 本次延长长度。 */
  extendLengthMeters: number;
}

/**
 * 显式线草稿预览动作入参。
 * 业务层如果已经拿到了当前操作的线要素快照，推荐优先使用这一组入参，
 * 避免再额外依赖“当前选中线”语义。
 */
export interface PreviewLineOptions extends PreviewSelectedLineOptions {
  /** 当前需要参与延长的线要素；不传时回退到当前选中线。 */
  lineFeature?: MapCommonLineFeature | null;
  /** 当前线要素的来源引用；业务层已知时建议一并传入。 */
  featureRef?: MapSourceFeatureRef | null;
}

/**
 * 线廊替换动作入参。
 */
export interface ReplaceSelectedLineCorridorOptions {
  /** 线廊半宽。 */
  widthMeters: number;
}

/**
 * 显式线廊替换动作入参。
 * 业务层如果已经拿到了当前操作的线要素快照，推荐优先使用这一组入参，
 * 避免再额外依赖“当前选中线”语义。
 */
export interface ReplaceLineCorridorOptions extends ReplaceSelectedLineCorridorOptions {
  /** 当前需要生成线廊的线要素；不传时回退到当前选中线。 */
  lineFeature?: MapCommonLineFeature | null;
  /** 当前线要素的来源引用；若来源是线草稿 source，会继续写回草稿池。 */
  featureRef?: MapSourceFeatureRef | null;
}

/**
 * useMapFeatureActions 初始化配置。
 */
export interface UseMapFeatureActionsOptions {
  /** 地图组件公开实例引用。 */
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>;
  /** 业务 source 注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
}

/**
 * useMapFeatureActions 返回结果。
 */
export interface UseMapFeatureActionsResult {
  /** 保存正式业务源或线草稿源中的地图要素属性。 */
  saveBusinessFeatureProperties: (
    options: SaveBusinessFeaturePropertiesOptions
  ) => MapFeaturePropertyActionResult;
  /** 显式删除正式业务源或线草稿源中的地图要素属性。 */
  removeBusinessFeatureProperties: (
    options: RemoveBusinessFeaturePropertiesOptions
  ) => MapFeaturePropertyActionResult;
  /** 保存当前选中的地图要素属性。 */
  saveSelectedMapFeatureProperties: (options: {
    newProperties: FeatureProperties;
  }) => MapFeaturePropertyActionResult;
  /** 删除当前选中的地图要素属性。 */
  removeSelectedMapFeatureProperties: (options: {
    propertyKeys: readonly string[];
  }) => MapFeaturePropertyActionResult;
  /** 保存 TerraDraw 要素属性。 */
  saveTerradrawFeatureProperties: (
    options: SaveTerradrawFeaturePropertiesActionOptions
  ) => MapFeaturePropertyActionResult;
  /** 删除 TerraDraw 要素属性。 */
  removeTerradrawFeatureProperties: (
    options: RemoveTerradrawFeaturePropertiesActionOptions
  ) => MapFeaturePropertyActionResult;
  /** 根据显式线要素生成线草稿；未传 lineFeature 时回退到当前选中线。 */
  previewLine: (options: PreviewLineOptions) => MapFeatureLineActionResult;
  /** 根据当前选中的线生成线草稿。 */
  previewSelectedLine: (options: PreviewSelectedLineOptions) => MapFeatureLineActionResult;
  /** 根据显式线要素替换线廊；未传 lineFeature 时回退到当前选中线。 */
  replaceLineCorridor: (options: ReplaceLineCorridorOptions) => MapFeatureActionResult;
  /** 根据当前选中的线替换线廊。 */
  replaceSelectedLineCorridor: (
    options: ReplaceSelectedLineCorridorOptions
  ) => MapFeatureActionResult;
  /** 清空全部线草稿。 */
  clearLineDraft: () => MapFeatureActionResult;
}

/**
 * 线草稿继承到的属性治理配置。
 * 说明：
 * 1. 正式源的 hiddenKeys / readonlyKeys / fixedKeys 都已经包含在 propertyPolicy 中
 * 2. 线草稿自身的内部隐藏字段会在插件 store 中额外追加
 * 3. 因此这里不再单独拆一个 hiddenKeys，避免与 propertyPolicy 形成重复来源
 */
interface LineDraftGovernance {
  /** 正式来源原图层的业务属性治理配置，其中已包含 hiddenKeys。 */
  propertyPolicy: MapFeaturePropertyPolicy | null;
  /** 正式来源强保护但仍可见的字段列表。 */
  protectedKeys: readonly string[];
}

/**
 * 读取当前 source 下的完整要素数组。
 * @param sourceRegistry 业务 source 注册表
 * @param sourceId 目标 source ID
 * @returns 当前要素数组
 */
function getBusinessSourceFeatures(
  sourceRegistry: MapBusinessSourceRegistry,
  sourceId: string
): MapCommonFeature[] {
  const targetSource = sourceRegistry.getSource(sourceId);
  const featureCollection = targetSource?.sourceProps.data as MapCommonFeatureCollection | undefined;

  return ((featureCollection?.features || []) as MapCommonFeature[]).map((feature) => {
    return JSON.parse(JSON.stringify(feature));
  });
}

/**
 * 判断当前要素是否为线要素。
 * @param feature 待判断要素
 * @returns 是否为 LineString
 */
function isLineFeature(
  feature: MapCommonFeature | MapCommonLineFeature | null | undefined
): feature is MapCommonLineFeature {
  return feature?.geometry?.type === 'LineString';
}

/**
 * 读取线要素的业务 ID。
 * @param lineFeature 当前线要素
 * @returns 业务 ID；不存在时返回 null
 */
function getLineFeatureId(lineFeature: MapCommonLineFeature | null | undefined): MapFeatureId | null {
  const propertyId = lineFeature?.properties?.id;
  if (propertyId !== undefined && propertyId !== null) {
    return propertyId as MapFeatureId;
  }

  if (lineFeature?.id === undefined || lineFeature.id === null) {
    return null;
  }

  return lineFeature.id as MapFeatureId;
}

/**
 * 创建地图业务动作门面。
 * @param options 动作门面配置
 * @returns 业务层可直接调用的动作集合
 */
export function useMapFeatureActions(
  options: UseMapFeatureActionsOptions
): UseMapFeatureActionsResult {
  const { mapRef, sourceRegistry } = options;
  const featureQuery = useMapFeatureQuery({
    mapRef,
    sourceRegistry,
  });

  /**
   * 读取当前 mapRef 对应的地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 读取当前页面注册的线草稿插件 API。
   * @returns 当前线草稿插件 API
   */
  const getLineDraftPreviewApi = (): LineDraftPreviewPluginApi | null => {
    return resolveLineDraftPreviewApi(getMapExpose());
  };

  /**
   * 归一化来源引用，避免业务层传入半结构对象后在动作层重复做空值判断。
   * @param featureRef 待归一化来源引用
   * @returns 标准来源引用
   */
  const normalizeFeatureRef = (
    featureRef: MapSourceFeatureRef | null | undefined
  ): MapSourceFeatureRef | null => {
    return createMapSourceFeatureRef(
      featureRef?.sourceId || null,
      featureRef?.featureId ?? null,
      featureRef?.layerId || null
    );
  };

  /**
   * 当业务层直接传入线要素快照时，尝试补全它的来源引用。
   * 目前只补两类最可靠来源：
   * 1. 显式传入的 featureRef
   * 2. 线草稿插件内部已知的草稿要素 ID
   *
   * @param lineFeature 当前线要素
   * @param explicitFeatureRef 业务层显式传入的来源引用
   * @returns 当前线要素最可信的来源引用
   */
  const resolveLineFeatureRef = (
    lineFeature: MapCommonLineFeature | null,
    explicitFeatureRef?: MapSourceFeatureRef | null
  ): MapSourceFeatureRef | null => {
    const normalizedExplicitRef = normalizeFeatureRef(explicitFeatureRef);
    if (normalizedExplicitRef) {
      return normalizedExplicitRef;
    }

    const lineFeatureId = getLineFeatureId(lineFeature);
    if (lineFeatureId === null) {
      return null;
    }

    // 当业务层传入的是线草稿快照时，这里优先直接识别为插件草稿源，
    // 避免继续错误回退到普通业务图层当前选中态。
    if (getLineDraftPreviewApi()?.isFeatureById(lineFeatureId)) {
      return createMapSourceFeatureRef(LINE_DRAFT_PREVIEW_SOURCE_ID, lineFeatureId, null);
    }

    const selectedLineFeature = featureQuery.resolveSelectedLine();
    const selectedFeatureRef = featureQuery.getSelectedFeatureRef();
    if (getLineFeatureId(selectedLineFeature) === lineFeatureId) {
      return selectedFeatureRef;
    }

    return null;
  };

  /**
   * 统一解析当前线动作的目标线与来源引用。
   * 若业务层已经显式传入 lineFeature，则优先使用显式值；
   * 否则回退到“当前选中线”语义。
   *
   * @param actionOptions 当前线动作入参
   * @returns 标准化后的目标线与来源引用
   */
  const resolveLineActionTarget = (actionOptions: {
    lineFeature?: MapCommonLineFeature | null;
    featureRef?: MapSourceFeatureRef | null;
  }): {
    lineFeature: MapCommonLineFeature | null;
    featureRef: MapSourceFeatureRef | null;
  } => {
    const explicitLineFeature = isLineFeature(actionOptions.lineFeature)
      ? actionOptions.lineFeature
      : null;

    if (explicitLineFeature) {
      return {
        lineFeature: explicitLineFeature,
        featureRef: resolveLineFeatureRef(explicitLineFeature, actionOptions.featureRef),
      };
    }

    return {
      lineFeature: featureQuery.resolveSelectedLine(),
      featureRef: featureQuery.getSelectedFeatureRef(),
    };
  };

  /**
   * 解析当前线草稿要素需要继承的正式源属性治理规则。
   * @param featureId 当前线草稿业务 ID
   * @returns 当前线草稿继承到的治理配置
   */
  const resolveLineDraftGovernance = (featureId: MapFeatureId): LineDraftGovernance => {
    const lineDraftFeature = getLineDraftPreviewApi()?.getFeatureById(featureId) || null;
    const originRef = extractManagedPreviewOriginFromProperties(lineDraftFeature?.properties || {});
    const targetSource = originRef?.sourceId ? sourceRegistry.getSource(originRef.sourceId) : null;

    return {
      // 注意：正式源的 hiddenKeys 已经包含在图层级 propertyPolicy 内，
      // 线草稿自己的内部隐藏字段由 store 层统一追加，这里无需重复拆出 hiddenKeys。
      propertyPolicy: targetSource?.resolvePropertyPolicy(originRef?.layerId) || null,
      protectedKeys: targetSource?.protectedPropertyKeys || [],
    };
  };

  /**
   * 保存地图要素属性。
   * 这里会先判断目标是正式业务源还是线草稿源，再调用对应底层写回能力。
   *
   * @param saveOptions 写回配置
   * @returns 结构化动作结果
   */
  const saveBusinessFeatureProperties = (
    saveOptions: SaveBusinessFeaturePropertiesOptions
  ): MapFeaturePropertyActionResult => {
    const { featureRef, newProperties } = saveOptions;

    if (!featureRef?.sourceId || featureRef.featureId === null) {
      return {
        success: false,
        target: 'business',
        message: '当前没有可写回的地图要素',
      };
    }

    if (featureRef.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID) {
      const lineDraftPreviewApi = getLineDraftPreviewApi();
      if (!lineDraftPreviewApi) {
        return {
          success: false,
          target: 'lineDraft',
          message: '当前未注册线草稿插件，无法写回草稿属性',
        };
      }

      const governance = resolveLineDraftGovernance(featureRef.featureId);
      const result = lineDraftPreviewApi.saveProperties({
        featureId: featureRef.featureId,
        newProperties,
        propertyPolicy: governance.propertyPolicy,
        protectedKeys: governance.protectedKeys,
      });

      return {
        success: result.success,
        target: 'lineDraft',
        message: result.message,
        properties: result.properties,
        blockedKeys: result.blockedKeys,
        removedKeys: result.removedKeys,
      };
    }

    const result = sourceRegistry.saveProperties(
      featureRef.sourceId,
      featureRef.featureId,
      newProperties,
      featureRef.layerId
    );

    return {
      success: result.success,
      target: 'business',
      message: result.message,
      properties: result.properties,
      blockedKeys: result.blockedKeys,
      removedKeys: result.removedKeys,
    };
  };

  /**
   * 删除地图要素属性。
   * 这里与保存逻辑一样，会先把正式业务源与线草稿源统一分流后再执行。
   *
   * @param saveOptions 删除配置
   * @returns 结构化动作结果
   */
  const removeBusinessFeatureProperties = (
    saveOptions: RemoveBusinessFeaturePropertiesOptions
  ): MapFeaturePropertyActionResult => {
    const { featureRef, propertyKeys } = saveOptions;

    if (!featureRef?.sourceId || featureRef.featureId === null) {
      return {
        success: false,
        target: 'business',
        message: '当前没有可删除属性的地图要素',
      };
    }

    if (featureRef.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID) {
      const lineDraftPreviewApi = getLineDraftPreviewApi();
      if (!lineDraftPreviewApi) {
        return {
          success: false,
          target: 'lineDraft',
          message: '当前未注册线草稿插件，无法删除草稿属性',
        };
      }

      const governance = resolveLineDraftGovernance(featureRef.featureId);
      const result = lineDraftPreviewApi.removeProperties({
        featureId: featureRef.featureId,
        propertyKeys,
        propertyPolicy: governance.propertyPolicy,
        protectedKeys: governance.protectedKeys,
      });

      return {
        success: result.success,
        target: 'lineDraft',
        message: result.message,
        properties: result.properties,
        blockedKeys: result.blockedKeys,
        removedKeys: result.removedKeys,
      };
    }

    const result = sourceRegistry.removeProperties(
      featureRef.sourceId,
      featureRef.featureId,
      propertyKeys,
      featureRef.layerId
    );

    return {
      success: result.success,
      target: 'business',
      message: result.message,
      properties: result.properties,
      blockedKeys: result.blockedKeys,
      removedKeys: result.removedKeys,
    };
  };

  /**
   * 保存当前选中的地图要素属性。
   * @param saveOptions 写回配置
   * @returns 结构化动作结果
   */
  const saveSelectedMapFeatureProperties = (saveOptions: {
    newProperties: FeatureProperties;
  }): MapFeaturePropertyActionResult => {
    return saveBusinessFeatureProperties({
      featureRef: featureQuery.getSelectedFeatureRef(),
      newProperties: saveOptions.newProperties,
    });
  };

  /**
   * 删除当前选中的地图要素属性。
   * @param removeOptions 删除配置
   * @returns 结构化动作结果
   */
  const removeSelectedMapFeatureProperties = (removeOptions: {
    propertyKeys: readonly string[];
  }): MapFeaturePropertyActionResult => {
    return removeBusinessFeatureProperties({
      featureRef: featureQuery.getSelectedFeatureRef(),
      propertyKeys: removeOptions.propertyKeys,
    });
  };

  /**
   * 保存 TerraDraw 要素属性。
   * 这里会统一处理：
   * 1. 读取控件实例
   * 2. 取控件级 propertyPolicy
   * 3. 叠加 TerraDraw / Measure 的保留字段规则
   *
   * @param saveOptions TerraDraw 写回配置
   * @returns 结构化动作结果
   */
  const saveTerradrawFeaturePropertiesAction = (
    saveOptions: SaveTerradrawFeaturePropertiesActionOptions
  ): MapFeaturePropertyActionResult => {
    const { controlType, featureId, currentProperties, newProperties } = saveOptions;
    const mapExpose = getMapExpose();

    if (!mapExpose) {
      return {
        success: false,
        target: 'terradraw',
        message: '地图组件尚未初始化完成',
      };
    }

    const terradrawControl =
      controlType === 'measure'
        ? mapExpose.getMeasureControl?.() || null
        : mapExpose.getDrawControl?.() || null;

    if (!terradrawControl) {
      return {
        success: false,
        target: 'terradraw',
        message: 'TerraDraw 控件尚未初始化完成',
      };
    }

    const terradrawInstance = terradrawControl.getTerraDrawInstance?.();
    if (!terradrawInstance) {
      return {
        success: false,
        target: 'terradraw',
        message: 'TerraDraw 实例不存在，无法写回属性',
      };
    }

    const result = saveTerradrawFeatureProperties({
      terradraw: terradrawInstance,
      featureId,
      newProperties,
      currentProperties,
      propertyPolicy: mapExpose.getTerradrawPropertyPolicy?.(controlType) || null,
      hiddenKeys:
        controlType === 'measure' ? TERRADRAW_MEASURE_SYSTEM_PROPERTY_KEYS : undefined,
      reservedPropertyKeys: saveOptions.reservedPropertyKeys,
    });

    return {
      success: result.success,
      target: 'terradraw',
      message: result.message,
      properties: result.properties,
      blockedKeys: result.blockedKeys,
      removedKeys: result.removedKeys,
    };
  };

  /**
   * 删除 TerraDraw 要素属性。
   * 删除与保存使用同一套控件级规则来源，保证面板态与真实删除结果一致。
   *
   * @param saveOptions TerraDraw 删除配置
   * @returns 结构化动作结果
   */
  const removeTerradrawFeaturePropertiesAction = (
    saveOptions: RemoveTerradrawFeaturePropertiesActionOptions
  ): MapFeaturePropertyActionResult => {
    const { controlType, featureId, currentProperties, propertyKeys } = saveOptions;
    const mapExpose = getMapExpose();

    if (!mapExpose) {
      return {
        success: false,
        target: 'terradraw',
        message: '地图组件尚未初始化完成',
      };
    }

    const terradrawControl =
      controlType === 'measure'
        ? mapExpose.getMeasureControl?.() || null
        : mapExpose.getDrawControl?.() || null;

    if (!terradrawControl) {
      return {
        success: false,
        target: 'terradraw',
        message: 'TerraDraw 控件尚未初始化完成',
      };
    }

    const terradrawInstance = terradrawControl.getTerraDrawInstance?.();
    if (!terradrawInstance) {
      return {
        success: false,
        target: 'terradraw',
        message: 'TerraDraw 实例不存在，无法删除属性',
      };
    }

    const result = removeTerradrawFeatureProperties({
      terradraw: terradrawInstance,
      featureId,
      propertyKeys,
      currentProperties,
      propertyPolicy: mapExpose.getTerradrawPropertyPolicy?.(controlType) || null,
      hiddenKeys:
        controlType === 'measure' ? TERRADRAW_MEASURE_SYSTEM_PROPERTY_KEYS : undefined,
      reservedPropertyKeys: saveOptions.reservedPropertyKeys,
    });

    return {
      success: result.success,
      target: 'terradraw',
      message: result.message,
      properties: result.properties,
      blockedKeys: result.blockedKeys,
      removedKeys: result.removedKeys,
    };
  };

  /**
   * 根据当前选中的线生成线草稿。
   * @param previewOptions 草稿生成配置
   * @returns 结构化动作结果
   */
  const previewLine = (
    previewOptions: PreviewLineOptions
  ): MapFeatureLineActionResult => {
    const { segmentIndex, extendLengthMeters } = previewOptions;
    const { lineFeature, featureRef } = resolveLineActionTarget(previewOptions);
    const lineDraftPreviewApi = getLineDraftPreviewApi();

    if (!lineFeature) {
      return {
        success: false,
        target: 'lineDraft',
        message: '当前未选中可操作的线要素',
      };
    }

    if (!lineDraftPreviewApi) {
      return {
        success: false,
        target: 'lineDraft',
        message: '当前未注册线草稿插件，无法生成线草稿',
      };
    }

    if (extendLengthMeters <= 0) {
      return {
        success: false,
        target: 'lineDraft',
        message: '请输入大于 0 的延长长度',
      };
    }

    const nextLineFeature = lineDraftPreviewApi.previewLine({
      lineFeature,
      segmentIndex,
      extendLengthMeters,
      origin: featureRef?.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID ? null : featureRef,
    });

    if (!nextLineFeature) {
      return {
        success: false,
        target: 'lineDraft',
        message: '当前线段无法继续延长',
      };
    }

    return {
      success: true,
      target: 'lineDraft',
      message: '已生成线草稿，可继续编辑或清理',
      lineFeature: nextLineFeature,
    };
  };

  /**
   * 根据当前选中的线生成线草稿。
   * @param previewOptions 草稿生成配置
   * @returns 结构化动作结果
   */
  const previewSelectedLine = (
    previewOptions: PreviewSelectedLineOptions
  ): MapFeatureLineActionResult => {
    return previewLine(previewOptions);
  };

  /**
   * 根据当前选中的线替换线廊。
   * @param replaceOptions 线廊替换配置
   * @returns 结构化动作结果
   */
  const replaceLineCorridor = (
    replaceOptions: ReplaceLineCorridorOptions
  ): MapFeatureActionResult => {
    const { widthMeters } = replaceOptions;
    const { lineFeature, featureRef } = resolveLineActionTarget(replaceOptions);

    if (!lineFeature) {
      return {
        success: false,
        target: 'business',
        message: '当前未选中可操作的线要素',
      };
    }

    if (widthMeters <= 0) {
      return {
        success: false,
        target: 'business',
        message: '请输入大于 0 的区域宽度',
      };
    }

    if (featureRef?.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID) {
      const lineDraftPreviewApi = getLineDraftPreviewApi();
      if (!lineDraftPreviewApi) {
        return {
          success: false,
          target: 'lineDraft',
          message: '当前未注册线草稿插件，无法生成线廊草稿',
        };
      }

      const success = lineDraftPreviewApi.replacePreviewRegion({
        lineFeature,
        widthMeters,
      });

      return {
        success,
        target: 'lineDraft',
        message: success ? '已按当前宽度替换线廊草稿' : '区域生成失败，请检查线要素几何是否有效',
      };
    }

    if (!featureRef?.sourceId) {
      return {
        success: false,
        target: 'business',
        message: '当前正式线要素缺少来源数据源，无法生成区域',
      };
    }

    const currentFeatures = getBusinessSourceFeatures(sourceRegistry, featureRef.sourceId);
    const nextFeatures = MapLineCorridorTool.replaceRegionFeatures(
      currentFeatures,
      lineFeature,
      widthMeters
    );

    if (!nextFeatures) {
      return {
        success: false,
        target: 'business',
        message: '区域生成失败，请检查线要素几何是否有效',
      };
    }

    const success = sourceRegistry.replaceFeatures(featureRef.sourceId, nextFeatures);
    return {
      success,
      target: 'business',
      message: success ? '已按当前宽度替换生成区域' : '正式业务数据写回失败',
    };
  };

  /**
   * 根据当前选中的线替换线廊。
   * @param replaceOptions 线廊替换配置
   * @returns 结构化动作结果
   */
  const replaceSelectedLineCorridor = (
    replaceOptions: ReplaceSelectedLineCorridorOptions
  ): MapFeatureActionResult => {
    return replaceLineCorridor(replaceOptions);
  };

  /**
   * 清空全部线草稿。
   * @returns 结构化动作结果
   */
  const clearLineDraft = (): MapFeatureActionResult => {
    const lineDraftPreviewApi = getLineDraftPreviewApi();
    if (!lineDraftPreviewApi) {
      return {
        success: false,
        target: 'lineDraft',
        message: '当前未注册线草稿插件，无法清空草稿',
      };
    }

    lineDraftPreviewApi.clear();
    return {
      success: true,
      target: 'lineDraft',
      message: '已清空全部线草稿',
    };
  };

  return {
    saveBusinessFeatureProperties,
    removeBusinessFeatureProperties,
    saveSelectedMapFeatureProperties,
    removeSelectedMapFeatureProperties,
    saveTerradrawFeatureProperties: saveTerradrawFeaturePropertiesAction,
    removeTerradrawFeatureProperties: removeTerradrawFeaturePropertiesAction,
    previewLine,
    previewSelectedLine,
    replaceLineCorridor,
    replaceSelectedLineCorridor,
    clearLineDraft,
  };
}
