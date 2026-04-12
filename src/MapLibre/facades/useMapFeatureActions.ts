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
 * 业务属性写回入参。
 */
export interface SaveBusinessFeaturePropertiesOptions {
  /** 目标来源引用。 */
  featureRef: MapSourceFeatureRef | null;
  /** 最新属性对象。 */
  newProperties: FeatureProperties;
}

/**
 * 业务属性删除入参。
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
 * 线廊替换动作入参。
 */
export interface ReplaceSelectedLineCorridorOptions {
  /** 线廊半宽。 */
  widthMeters: number;
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
  /** 根据当前选中的线生成线草稿。 */
  previewSelectedLine: (options: PreviewSelectedLineOptions) => MapFeatureLineActionResult;
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
  /** 正式来源完整的业务属性治理配置，其中已包含 hiddenKeys。 */
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
   * 解析当前线草稿要素需要继承的正式源属性治理规则。
   * @param featureId 当前线草稿业务 ID
   * @returns 当前线草稿继承到的治理配置
   */
  const resolveLineDraftGovernance = (featureId: MapFeatureId): LineDraftGovernance => {
    const lineDraftFeature = getLineDraftPreviewApi()?.getFeatureById(featureId) || null;
    const originRef = extractManagedPreviewOriginFromProperties(lineDraftFeature?.properties || {});
    const targetSource = originRef?.sourceId ? sourceRegistry.getSource(originRef.sourceId) : null;

    return {
      // 注意：正式源的 hiddenKeys 已经包含在 propertyPolicy 内，
      // 线草稿自己的内部隐藏字段由 store 层统一追加，这里无需重复拆出 hiddenKeys。
      propertyPolicy: targetSource?.propertyPolicy || null,
      protectedKeys: targetSource?.protectedPropertyKeys || [],
    };
  };

  /**
   * 保存正式业务源或线草稿源中的地图要素属性。
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
      newProperties
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
   * 显式删除正式业务源或线草稿源中的地图要素属性。
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
      propertyKeys
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
  const previewSelectedLine = (
    previewOptions: PreviewSelectedLineOptions
  ): MapFeatureLineActionResult => {
    const { segmentIndex, extendLengthMeters } = previewOptions;
    const selectedLineFeature = featureQuery.resolveSelectedLine();
    const selectedFeatureRef = featureQuery.getSelectedFeatureRef();
    const lineDraftPreviewApi = getLineDraftPreviewApi();

    if (!selectedLineFeature) {
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
      lineFeature: selectedLineFeature,
      segmentIndex,
      extendLengthMeters,
      origin:
        selectedFeatureRef?.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID ? null : selectedFeatureRef,
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
   * 根据当前选中的线替换线廊。
   * @param replaceOptions 线廊替换配置
   * @returns 结构化动作结果
   */
  const replaceSelectedLineCorridor = (
    replaceOptions: ReplaceSelectedLineCorridorOptions
  ): MapFeatureActionResult => {
    const { widthMeters } = replaceOptions;
    const selectedLineFeature = featureQuery.resolveSelectedLine();
    const selectedFeatureRef = featureQuery.getSelectedFeatureRef();

    if (!selectedLineFeature) {
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

    if (selectedFeatureRef?.sourceId === LINE_DRAFT_PREVIEW_SOURCE_ID) {
      const lineDraftPreviewApi = getLineDraftPreviewApi();
      if (!lineDraftPreviewApi) {
        return {
          success: false,
          target: 'lineDraft',
          message: '当前未注册线草稿插件，无法生成线廊草稿',
        };
      }

      const success = lineDraftPreviewApi.replacePreviewRegion({
        lineFeature: selectedLineFeature,
        widthMeters,
      });

      return {
        success,
        target: 'lineDraft',
        message: success ? '已按当前宽度替换线廊草稿' : '区域生成失败，请检查线要素几何是否有效',
      };
    }

    if (!selectedFeatureRef?.sourceId) {
      return {
        success: false,
        target: 'business',
        message: '当前正式线要素缺少来源数据源，无法生成区域',
      };
    }

    const currentFeatures = getBusinessSourceFeatures(sourceRegistry, selectedFeatureRef.sourceId);
    const nextFeatures = MapLineCorridorTool.replaceRegionFeatures(
      currentFeatures,
      selectedLineFeature,
      widthMeters
    );

    if (!nextFeatures) {
      return {
        success: false,
        target: 'business',
        message: '区域生成失败，请检查线要素几何是否有效',
      };
    }

    const success = sourceRegistry.replaceFeatures(selectedFeatureRef.sourceId, nextFeatures);
    return {
      success,
      target: 'business',
      message: success ? '已按当前宽度替换生成区域' : '正式业务数据写回失败',
    };
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
    previewSelectedLine,
    replaceSelectedLineCorridor,
    clearLineDraft,
  };
}
