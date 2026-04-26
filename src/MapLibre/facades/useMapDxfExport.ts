import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import type {
  MapDxfExportPluginApi,
  MapDxfExportResult,
  MapDxfExportState,
  MapDxfExportTaskOptions,
  ResolvedMapDxfExportTaskOptions,
} from '../plugins/map-dxf-export';
import {
  resolveMapDxfExportApi,
  resolveMapDxfExportState,
} from './mapPluginResolver';

/** DXF 导出插件缺省状态。 */
const defaultDxfExportState: MapDxfExportState = {
  isExporting: false,
  lastFileName: null,
  lastFeatureCount: 0,
  lastEntityCount: 0,
  lastWarnings: [],
  lastError: null,
  lastExportAt: null,
};

/** useMapDxfExport 返回结果。 */
export interface UseMapDxfExportResult {
  /** 当前 DXF 导出插件状态。 */
  state: ComputedRef<MapDxfExportState>;
  /** 当前是否正在导出。 */
  isExporting: ComputedRef<boolean>;
  /** 最近一次导出的文件名。 */
  lastFileName: ComputedRef<string | null>;
  /** 最近一次导出的要素数量。 */
  lastFeatureCount: ComputedRef<number>;
  /** 最近一次写入的 DXF 实体数量。 */
  lastEntityCount: ComputedRef<number>;
  /** 最近一次导出的警告列表。 */
  lastWarnings: ComputedRef<string[]>;
  /** 最近一次导出的错误信息。 */
  lastError: ComputedRef<string | null>;
  /** 生成 DXF 文本。 */
  exportDxf: (overrides?: MapDxfExportTaskOptions) => Promise<MapDxfExportResult | null>;
  /** 直接下载 DXF 文件。 */
  downloadDxf: (overrides?: MapDxfExportTaskOptions) => Promise<MapDxfExportResult | null>;
  /** 读取本次最终生效的导出配置。 */
  getResolvedOptions: (
    overrides?: MapDxfExportTaskOptions
  ) => ResolvedMapDxfExportTaskOptions | null;
}

/**
 * 读取当前地图中的 DXF 导出插件能力门面。
 * @param mapRef 地图组件公开实例引用
 * @returns DXF 导出插件能力门面
 */
export function useMapDxfExport(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
): UseMapDxfExportResult {
  /**
   * 读取当前 mapRef 对应的地图公开实例。
   * @returns 当前地图公开实例
   */
  const getMapExpose = (): MapLibreInitExpose | null | undefined => {
    return toValue(mapRef);
  };

  /**
   * 读取当前页面注册的 DXF 导出插件 API。
   * @returns 当前 DXF 导出插件 API
   */
  const getDxfApi = (): MapDxfExportPluginApi | null => {
    return resolveMapDxfExportApi(getMapExpose());
  };

  const state = computed<MapDxfExportState>(() => {
    return resolveMapDxfExportState(getMapExpose()) || defaultDxfExportState;
  });

  return {
    state,
    isExporting: computed(() => state.value.isExporting),
    lastFileName: computed(() => state.value.lastFileName),
    lastFeatureCount: computed(() => state.value.lastFeatureCount),
    lastEntityCount: computed(() => state.value.lastEntityCount),
    lastWarnings: computed(() => [...state.value.lastWarnings]),
    lastError: computed(() => state.value.lastError),
    exportDxf: async (overrides) => {
      return (await getDxfApi()?.exportDxf(overrides)) || null;
    },
    downloadDxf: async (overrides) => {
      return (await getDxfApi()?.downloadDxf(overrides)) || null;
    },
    getResolvedOptions: (overrides) => {
      return getDxfApi()?.getResolvedOptions(overrides) || null;
    },
  };
}
