import type { MapIntersectionCandidate, MapIntersectionPoint } from '../../shared/map-intersection-tools';
import type { MapCommonFeature, MapCommonFeatureCollection } from '../../shared/map-common-tools';
import type { MapLayerInteractiveContext } from '../../shared/mapLibre-controls-types';

/** 交点插件求交范围。 */
export type IntersectionPreviewScope = 'all' | 'selected';

/** 交点插件状态。 */
export interface IntersectionPreviewState {
  /** 当前图层是否可见。 */
  visible: boolean;
  /** 当前求交范围。 */
  scope: IntersectionPreviewScope;
  /** 当前交点数量。 */
  count: number;
  /** 当前选中的交点 ID。 */
  selectedId: string | null;
  /** 最近一次错误信息。 */
  lastError: string | null;
}

/** 交点上下文。 */
export interface IntersectionPreviewContext extends MapIntersectionPoint {
  /** 当前交点点要素快照。 */
  feature: MapCommonFeature | null;
}

/** 交点插件配置。 */
export interface IntersectionPreviewOptions {
  /** 当前插件是否启用。 */
  enabled?: boolean;
  /** 当前交点层默认是否可见。 */
  visible?: boolean;
  /** 当前求交范围。 */
  scope?: IntersectionPreviewScope;
  /** 参与求交的来源 source 列表。 */
  targetSourceIds: string[];
  /** 参与求交的来源 layer 列表。 */
  targetLayerIds?: string[];
  /** 是否保留端点交点。 */
  includeEndpoint?: boolean;
  /** 交点坐标归一化小数位。 */
  coordDigits?: number;
  /** 是否忽略同一条线自交。 */
  ignoreSelf?: boolean;
  /** 外部提供的交点候选线集合。 */
  getCandidates?: () => MapIntersectionCandidate[];
  /** 点击交点回调。 */
  onClick?: (context: IntersectionPreviewContext) => void;
  /** 右键交点回调。 */
  onContextMenu?: (context: IntersectionPreviewContext) => void;
}

/** 交点插件 API。 */
export interface IntersectionPreviewPluginApi {
  /** 重新计算交点。 */
  refresh: () => void;
  /** 清空交点集合。 */
  clear: () => void;
  /** 显示交点层。 */
  show: () => void;
  /** 隐藏交点层。 */
  hide: () => void;
  /** 切换求交范围。 */
  setScope: (scope: IntersectionPreviewScope) => void;
  /** 读取当前交点要素集合。 */
  getData: () => MapCommonFeatureCollection;
  /** 按交点 ID 读取上下文。 */
  getById: (intersectionId: string | null) => IntersectionPreviewContext | null;
  /** 读取当前选中的交点上下文。 */
  getSelected: () => IntersectionPreviewContext | null;
}

/** 交点控制器配置。 */
export interface UseIntersectionPreviewControllerOptions {
  /** 读取当前插件配置。 */
  getOptions: () => IntersectionPreviewOptions | null | undefined;
  /** 读取当前参与求交的线候选集合。 */
  getCandidates: () => MapIntersectionCandidate[];
  /** 读取当前选中上下文。 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null | undefined;
  /** 状态变化回调。 */
  onStateChange?: (state: IntersectionPreviewState) => void;
}
