import { toValue, type MaybeRefOrGetter } from 'vue';
import type {
  FeatureProperties,
  MapFeatureId,
} from '../composables/useMapDataUpdate';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import {
  clonePlainData,
  resolveMapFeaturePropertyPanelState,
  type MapFeaturePropertyPanelState,
} from '../shared/map-feature-data';
import type { MapSourceFeatureRef } from '../shared/map-common-tools';
import type {
  TerradrawControlType,
  TerradrawFeature,
} from '../shared/mapLibre-controls-types';
import type { MapBusinessSourceRegistry } from './createMapBusinessSource';
import {
  useMapFeatureActions,
  type MapFeaturePropertyActionResult,
} from './useMapFeatureActions';
import { useMapFeatureQuery } from './useMapFeatureQuery';

/** 地图要素属性编辑目标。 */
export interface MapFeaturePropertyEditorMapTarget {
  /** 当前目标类型。 */
  type: 'map';
  /** 目标来源引用。 */
  featureRef: MapSourceFeatureRef | null;
}

/** TerraDraw 要素属性编辑目标。 */
export interface MapFeaturePropertyEditorTerradrawTarget {
  /** 当前目标类型。 */
  type: 'terradraw';
  /** 当前控件类型。 */
  controlType: TerradrawControlType;
  /** 目标要素 ID。 */
  featureId: MapFeatureId | null;
  /** 当前页面已持有的属性快照。 */
  currentProperties?: FeatureProperties;
}

/** 属性编辑统一目标。 */
export type MapFeaturePropertyEditorTarget =
  | MapFeaturePropertyEditorMapTarget
  | MapFeaturePropertyEditorTerradrawTarget;

/** 属性编辑器单键保存载荷。 */
export interface MapFeaturePropertyEditorSaveItemPayload {
  /** 本次保存的属性键。 */
  key: string;
  /** 本次保存的属性值。 */
  value: unknown;
}

/** 属性编辑器统一状态。 */
export interface MapFeaturePropertyEditorState {
  /** 当前属性面板态。 */
  panelState: MapFeaturePropertyPanelState;
  /** 当前原始属性快照。 */
  rawProperties: FeatureProperties;
}

/** 属性编辑统一动作结果。 */
export interface MapFeaturePropertyEditorActionResult extends MapFeaturePropertyActionResult {
  /** 当前动作执行后最新的编辑器状态。 */
  editorState: MapFeaturePropertyEditorState;
}

/** useMapFeaturePropertyEditor 初始化配置。 */
export interface UseMapFeaturePropertyEditorOptions {
  /** 地图组件公开实例引用。 */
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>;
  /** 业务 source 注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
}

/** useMapFeaturePropertyEditor 返回结果。 */
export interface UseMapFeaturePropertyEditorResult {
  /** 解析当前目标的属性面板态与原始快照。 */
  resolveEditorState: (
    target: MapFeaturePropertyEditorTarget | null | undefined
  ) => MapFeaturePropertyEditorState;
  /** 保存单个属性键。 */
  saveItem: (
    target: MapFeaturePropertyEditorTarget | null | undefined,
    payload: MapFeaturePropertyEditorSaveItemPayload
  ) => MapFeaturePropertyEditorActionResult;
  /** 删除单个属性键。 */
  removeItem: (
    target: MapFeaturePropertyEditorTarget | null | undefined,
    key: string
  ) => MapFeaturePropertyEditorActionResult;
}

/**
 * 读取当前地图的统一属性编辑门面。
 * 业务层只需要维护“当前编辑目标”，无需再自行分支 map / 线草稿 / TerraDraw。
 * @param options 初始化配置
 * @returns 统一属性编辑能力
 */
export function useMapFeaturePropertyEditor(
  options: UseMapFeaturePropertyEditorOptions
): UseMapFeaturePropertyEditorResult {
  const { mapRef, sourceRegistry } = options;
  const featureQuery = useMapFeatureQuery({
    mapRef,
    sourceRegistry,
  });
  const featureActions = useMapFeatureActions({
    mapRef,
    sourceRegistry,
  });

  /**
   * 创建空的编辑器状态。
   * @returns 空状态
   */
  const createEmptyEditorState = (): MapFeaturePropertyEditorState => {
    return {
      panelState: resolveMapFeaturePropertyPanelState({}),
      rawProperties: {},
    };
  };

  /**
   * 读取当前 mapRef 对应的地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 按控件类型读取 TerraDraw 控件实例。
   * @param controlType 当前控件类型
   * @returns 对应的控件实例
   */
  const getTerradrawControl = (controlType: TerradrawControlType) => {
    const mapExpose = getMapExpose();
    return controlType === 'measure'
      ? mapExpose?.getMeasureControl?.() || null
      : mapExpose?.getDrawControl?.() || null;
  };

  /**
   * 读取当前 TerraDraw 控件快照中的原始属性。
   * @param target TerraDraw 编辑目标
   * @returns 原始属性快照
   */
  const resolveTerradrawRawProperties = (
    target: MapFeaturePropertyEditorTerradrawTarget
  ): FeatureProperties => {
    if (target.currentProperties) {
      return clonePlainData(target.currentProperties);
    }

    if (target.featureId === null) {
      return {};
    }

    const terradrawControl = getTerradrawControl(target.controlType);
    const terradrawFeature =
      (terradrawControl?.getTerraDrawInstance?.()?.getSnapshotFeature?.(
        target.featureId
      ) as TerradrawFeature | null | undefined) || null;

    return clonePlainData(terradrawFeature?.properties || {});
  };

  /**
   * 解析当前属性编辑目标的最新状态。
   * @param target 当前编辑目标
   * @returns 面板态与原始属性快照
   */
  const resolveEditorState = (
    target: MapFeaturePropertyEditorTarget | null | undefined
  ): MapFeaturePropertyEditorState => {
    if (!target) {
      return createEmptyEditorState();
    }

    if (target.type === 'map') {
      const panelState =
        featureQuery.resolveFeaturePropertyPanelState(target.featureRef) ||
        createEmptyEditorState().panelState;
      const rawProperties = clonePlainData(
        featureQuery.resolveFeature(target.featureRef)?.properties || {}
      );

      return {
        panelState,
        rawProperties,
      };
    }

    if (target.featureId === null) {
      return createEmptyEditorState();
    }

    const rawProperties = resolveTerradrawRawProperties(target);
    const panelState =
      featureQuery.resolveTerradrawPropertyPanelState({
        controlType: target.controlType,
        featureId: target.featureId,
        currentProperties: rawProperties,
      }) || createEmptyEditorState().panelState;

    return {
      panelState,
      rawProperties,
    };
  };

  /**
   * 创建无效目标的统一失败结果。
   * @param message 失败提示
   * @returns 带空编辑器状态的失败结果
   */
  const createInvalidTargetResult = (message: string): MapFeaturePropertyEditorActionResult => {
    return {
      success: false,
      target: 'business',
      message,
      editorState: createEmptyEditorState(),
    };
  };

  /**
   * 将基础动作结果补齐为统一属性编辑结果。
   * @param result 基础动作结果
   * @param target 当前编辑目标
   * @returns 带编辑器状态的动作结果
   */
  const withEditorState = (
    result: MapFeaturePropertyActionResult,
    target: MapFeaturePropertyEditorTarget | null | undefined
  ): MapFeaturePropertyEditorActionResult => {
    if (target?.type === 'terradraw' && result.success && result.properties) {
      return {
        ...result,
        editorState: resolveEditorState({
          ...target,
          currentProperties: result.properties,
        }),
      };
    }

    return {
      ...result,
      editorState: resolveEditorState(target),
    };
  };

  /**
   * 保存单个属性键。
   * @param target 当前编辑目标
   * @param payload 本次保存载荷
   * @returns 结构化保存结果
   */
  const saveItem = (
    target: MapFeaturePropertyEditorTarget | null | undefined,
    payload: MapFeaturePropertyEditorSaveItemPayload
  ): MapFeaturePropertyEditorActionResult => {
    if (!target) {
      return createInvalidTargetResult('当前没有可写回的目标要素');
    }

    if (target.type === 'map') {
      return withEditorState(
        featureActions.saveBusinessFeatureProperties({
          featureRef: target.featureRef,
          newProperties: {
            [payload.key]: payload.value,
          },
        }),
        target
      );
    }

    if (target.featureId === null) {
      return createInvalidTargetResult('当前没有可写回的 TerraDraw 要素');
    }

    return withEditorState(
      featureActions.saveTerradrawFeatureProperties({
        controlType: target.controlType,
        featureId: target.featureId,
        currentProperties: target.currentProperties,
        newProperties: {
          [payload.key]: payload.value,
        },
      }),
      target
    );
  };

  /**
   * 删除单个属性键。
   * @param target 当前编辑目标
   * @param key 本次需要删除的属性键
   * @returns 结构化删除结果
   */
  const removeItem = (
    target: MapFeaturePropertyEditorTarget | null | undefined,
    key: string
  ): MapFeaturePropertyEditorActionResult => {
    if (!target) {
      return createInvalidTargetResult('当前没有可删除属性的目标要素');
    }

    if (target.type === 'map') {
      return withEditorState(
        featureActions.removeBusinessFeatureProperties({
          featureRef: target.featureRef,
          propertyKeys: [key],
        }),
        target
      );
    }

    if (target.featureId === null) {
      return createInvalidTargetResult('当前没有可删除属性的 TerraDraw 要素');
    }

    return withEditorState(
      featureActions.removeTerradrawFeatureProperties({
        controlType: target.controlType,
        featureId: target.featureId,
        currentProperties: target.currentProperties,
        propertyKeys: [key],
      }),
      target
    );
  };

  return {
    resolveEditorState,
    saveItem,
    removeItem,
  };
}
