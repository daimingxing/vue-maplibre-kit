import type { ControlPosition } from 'maplibre-gl';
import type { MapBusinessSourceRegistry } from '../../facades/createMapBusinessSource';
import type {
  MapDxfExportResult,
  MapDxfExportTaskOptions,
  ResolvedMapDxfExportTaskOptions,
} from '../../exporters/dxf';

/** DXF 导出控件配置。 */
export interface MapDxfExportControlOptions {
  /** 是否渲染内置导出控件。 */
  enabled?: boolean;
  /** 控件显示位置。 */
  position?: ControlPosition;
  /** 控件文案。 */
  label?: string;
}

/** 归一化后的 DXF 导出控件配置。 */
export interface ResolvedMapDxfExportControlOptions {
  /** 最终是否渲染内置导出控件。 */
  enabled: boolean;
  /** 最终控件位置。 */
  position: ControlPosition;
  /** 最终控件文案。 */
  label: string;
}

/** DXF 导出插件配置。 */
export interface MapDxfExportOptions {
  /** 是否启用整个 DXF 导出插件。 */
  enabled?: boolean;
  /** 业务数据源注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
  /** 封装层默认导出配置。 */
  defaults?: MapDxfExportTaskOptions;
  /** 内置控件配置。 */
  control?: MapDxfExportControlOptions;
}

/** 归一化后的 DXF 导出插件配置。 */
export interface ResolvedMapDxfExportOptions {
  /** 最终是否启用插件。 */
  enabled: boolean;
  /** 业务数据源注册表。 */
  sourceRegistry: MapBusinessSourceRegistry;
  /** 归一化后的默认导出配置。 */
  defaults: ResolvedMapDxfExportTaskOptions;
  /** 归一化后的控件配置。 */
  control: ResolvedMapDxfExportControlOptions;
}

/** DXF 导出插件 API。 */
export interface MapDxfExportPluginApi {
  /** 生成 DXF 文本。 */
  exportDxf: (overrides?: MapDxfExportTaskOptions) => Promise<MapDxfExportResult>;
  /** 直接下载 DXF 文件。 */
  downloadDxf: (overrides?: MapDxfExportTaskOptions) => Promise<MapDxfExportResult>;
  /** 读取本次最终生效的导出配置。 */
  getResolvedOptions: (
    overrides?: MapDxfExportTaskOptions
  ) => ResolvedMapDxfExportTaskOptions;
}

/** DXF 导出插件状态。 */
export interface MapDxfExportState {
  /** 当前是否处于导出中。 */
  isExporting: boolean;
  /** 最近一次导出的文件名。 */
  lastFileName: string | null;
  /** 最近一次处理的要素数量。 */
  lastFeatureCount: number;
  /** 最近一次写入的实体数量。 */
  lastEntityCount: number;
  /** 最近一次导出的警告列表。 */
  lastWarnings: string[];
  /** 最近一次导出的错误信息。 */
  lastError: string | null;
  /** 最近一次导出的时间戳。 */
  lastExportAt: number | null;
}

export type {
  MapDxfExportResult,
  MapDxfExportTaskOptions,
  ResolvedMapDxfExportTaskOptions,
} from '../../exporters/dxf';
