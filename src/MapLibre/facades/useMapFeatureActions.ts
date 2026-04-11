import { toValue, type MaybeRefOrGetter } from 'vue';
import {
  saveTerradrawFeatureProperties,
  type FeatureProperties,
  type FeaturePropertySaveMode,
  type MapFeatureId,
} from '../composables/useMapDataUpdate';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import {
  LINE_DRAFT_PREVIEW_SOURCE_ID,
  type LineDraftPreviewPluginApi,
} from '../plugins/line-draft-preview';
import {
  MapLineCorridorTool,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '../shared/map-common-tools';
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
  /** 属性写回模式。 */
  mode?: FeaturePropertySaveMode;
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
  /** 属性写回模式。 */
  mode?: FeaturePropertySaveMode;
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
  /** 保存当前选中的地图要素属性。 */
  saveSelectedMapFeatureProperties: (options: {
    newProperties: FeatureProperties;
    mode?: FeaturePropertySaveMode;
  }) => MapFeaturePropertyActionResult;
  /** 保存 TerraDraw 要素属性。 */
  saveTerradrawFeatureProperties: (
    options: SaveTerradrawFeaturePropertiesActionOptions
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
   * 保存正式业务源或线草稿源中的地图要素属性。
   * @param saveOptions 写回配置
   * @returns 结构化动作结果
   */
  const saveBusinessFeatureProperties = (
    saveOptions: SaveBusinessFeaturePropertiesOptions
  ): MapFeaturePropertyActionResult => {
    const { featureRef, newProperties, mode = 'replace' } = saveOptions;

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

      const result = lineDraftPreviewApi.saveProperties({
        featureId: featureRef.featureId,
        newProperties,
        mode,
      });

      return {
        success: result.success,
        target: 'lineDraft',
        message: result.message,
        properties: result.properties,
      };
    }

    const result = sourceRegistry.saveProperties(
      featureRef.sourceId,
      featureRef.featureId,
      newProperties,
      mode
    );

    return {
      success: result.success,
      target: 'business',
      message: result.message,
      properties: result.properties,
    };
  };

  /**
   * 保存当前选中的地图要素属性。
   * @param saveOptions 写回配置
   * @returns 结构化动作结果
   */
  const saveSelectedMapFeatureProperties = (saveOptions: {
    newProperties: FeatureProperties;
    mode?: FeaturePropertySaveMode;
  }): MapFeaturePropertyActionResult => {
    return saveBusinessFeatureProperties({
      featureRef: featureQuery.getSelectedFeatureRef(),
      newProperties: saveOptions.newProperties,
      mode: saveOptions.mode,
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
    const {
      controlType,
      featureId,
      currentProperties,
      newProperties,
      mode = 'replace',
      reservedPropertyKeys,
    } = saveOptions;
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
      reservedPropertyKeys,
      mode,
    });

    return {
      success: result.success,
      target: 'terradraw',
      message: result.message,
      properties: result.properties,
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
    saveSelectedMapFeatureProperties,
    saveTerradrawFeatureProperties: saveTerradrawFeaturePropertiesAction,
    previewSelectedLine,
    replaceSelectedLineCorridor,
    clearLineDraft,
  };
}
