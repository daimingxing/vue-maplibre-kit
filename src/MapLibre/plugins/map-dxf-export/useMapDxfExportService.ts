import { computed, nextTick, ref, type Ref } from 'vue';
import {
  exportBusinessSourcesToDxf,
  resolveMapDxfExportTaskOptions,
  type MapDxfExportResult,
  type MapDxfExportTaskOptions,
  type ResolvedMapDxfExportTaskOptions,
} from '../../exporters/dxf';
import { getMapGlobalDxfExportDefaults } from '../../shared/map-global-config';
import type {
  MapDxfExportOptions,
  MapDxfExportState,
  ResolvedMapDxfExportOptions,
} from './types';

/** 默认控件位置。 */
const DEFAULT_CONTROL_POSITION = 'top-right';

/** 默认控件文案。 */
const DEFAULT_CONTROL_LABEL = '导出DXF';

/** 默认 DXF 导出状态。 */
const defaultDxfExportState: MapDxfExportState = {
  isExporting: false,
  lastFileName: null,
  lastFeatureCount: 0,
  lastEntityCount: 0,
  lastWarnings: [],
  lastError: null,
  lastExportAt: null,
};

/**
 * 归一化 DXF 导出插件配置。
 * @param rawOptions 原始插件配置
 * @returns 归一化后的插件配置
 */
function normalizeMapDxfExportOptions(rawOptions: MapDxfExportOptions): ResolvedMapDxfExportOptions {
  const globalDefaults = getMapGlobalDxfExportDefaults();
  const globalControl = globalDefaults?.control;
  const localControl = rawOptions.control;

  return {
    enabled: rawOptions.enabled !== false,
    sourceRegistry: rawOptions.sourceRegistry,
    defaults: resolveMapDxfExportTaskOptions(globalDefaults?.defaults, rawOptions.defaults),
    control: {
      enabled: localControl?.enabled ?? globalControl?.enabled ?? true,
      position: localControl?.position ?? globalControl?.position ?? DEFAULT_CONTROL_POSITION,
      label:
        localControl?.label?.trim() ||
        globalControl?.label?.trim() ||
        DEFAULT_CONTROL_LABEL,
    },
  };
}

/**
 * 从未知错误中提取可读消息。
 * @param error 原始错误
 * @returns 可读错误消息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'DXF 导出失败';
}

/**
 * 下载 DXF 文件。
 * @param result DXF 导出结果
 */
function downloadDxfFile(result: MapDxfExportResult): void {
  if (
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function' ||
    typeof URL.revokeObjectURL !== 'function'
  ) {
    throw new Error('当前环境不支持 DXF 文件下载');
  }

  const dxfBlob = new Blob([result.content], {
    type: 'application/dxf;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(dxfBlob);

  try {
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = result.fileName;
    downloadLink.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface UseMapDxfExportServiceOptions {
  /** 读取插件配置。 */
  getOptions: () => MapDxfExportOptions;
}

/**
 * DXF 导出插件服务控制器。
 * @param options 初始化参数
 * @returns DXF 导出服务能力
 */
export function useMapDxfExportService(
  options: UseMapDxfExportServiceOptions
): {
  state: Ref<MapDxfExportState>;
  resolvedOptions: Readonly<Ref<ResolvedMapDxfExportOptions>>;
  exportDxf: (overrides?: MapDxfExportTaskOptions) => Promise<MapDxfExportResult>;
  downloadDxf: (overrides?: MapDxfExportTaskOptions) => Promise<MapDxfExportResult>;
  getResolvedOptions: (
    overrides?: MapDxfExportTaskOptions
  ) => ResolvedMapDxfExportTaskOptions;
} {
  const { getOptions } = options;
  const state = ref<MapDxfExportState>({
    ...defaultDxfExportState,
  });
  const resolvedOptions = computed(() => normalizeMapDxfExportOptions(getOptions()));

  /**
   * 读取本次最终生效的导出任务配置。
   * @param overrides 业务层局部覆写
   * @returns 最终生效的导出任务配置
   */
  const getResolvedOptions = (
    overrides?: MapDxfExportTaskOptions
  ): ResolvedMapDxfExportTaskOptions => {
    return resolveMapDxfExportTaskOptions(resolvedOptions.value.defaults, overrides);
  };

  /**
   * 更新导出成功后的状态快照。
   * @param result 本次导出结果
   */
  const syncSuccessState = (result: MapDxfExportResult): void => {
    state.value = {
      isExporting: false,
      lastFileName: result.fileName,
      lastFeatureCount: result.featureCount,
      lastEntityCount: result.entityCount,
      lastWarnings: [...result.warnings],
      lastError: null,
      lastExportAt: Date.now(),
    };
  };

  /**
   * 更新导出失败后的状态快照。
   * @param error 原始错误
   */
  const syncErrorState = (error: unknown): void => {
    state.value = {
      ...state.value,
      isExporting: false,
      lastError: getErrorMessage(error),
    };
  };

  /**
   * 生成 DXF 文本。
   * @param overrides 业务层局部覆写
   * @returns DXF 导出结果
   */
  const exportDxf = async (
    overrides?: MapDxfExportTaskOptions
  ): Promise<MapDxfExportResult> => {
    if (!resolvedOptions.value.enabled) {
      throw new Error('当前 DXF 导出插件已禁用');
    }

    state.value = {
      ...state.value,
      isExporting: true,
      lastError: null,
    };

    try {
      // 先让界面有机会渲染“导出中”状态，再执行同步 DXF 生成。
      await nextTick();
      const result = exportBusinessSourcesToDxf({
        sourceRegistry: resolvedOptions.value.sourceRegistry,
        taskOptions: getResolvedOptions(overrides),
      });
      syncSuccessState(result);
      return result;
    } catch (error) {
      syncErrorState(error);
      throw error;
    }
  };

  /**
   * 生成并下载 DXF 文件。
   * @param overrides 业务层局部覆写
   * @returns DXF 导出结果
   */
  const downloadDxf = async (
    overrides?: MapDxfExportTaskOptions
  ): Promise<MapDxfExportResult> => {
    try {
      const result = await exportDxf(overrides);
      downloadDxfFile(result);
      return result;
    } catch (error) {
      syncErrorState(error);
      throw error;
    }
  };

  return {
    state,
    resolvedOptions,
    exportDxf,
    downloadDxf,
    getResolvedOptions,
  };
}
