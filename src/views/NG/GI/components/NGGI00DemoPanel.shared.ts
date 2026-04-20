/** 选择模式。 */
export type SelectionMode = "single" | "multiple";

/** 选中集图层分组。 */
export interface SelectionLayerGroup {
  layerId: string | null;
  features: unknown[];
}

/**
 * DXF 默认坐标系。
 * 这里显式镜像当前导出模块默认值，避免示例说明文件为了展示文本去拉起 DXF 插件运行时。
 */
const DXF_DEFAULT_SOURCE_CRS = "EPSG:4326";

/** DXF 默认目标坐标系。 */
const DXF_DEFAULT_TARGET_CRS = "EPSG:3857";

/** 当前仓库默认不内置任何 TrueColor 规则。 */
const HAS_DXF_TRUE_COLOR_RULES = false;

/** 选中态面板摘要状态。 */
export interface SelectionPanelState {
  lastChangeSummary: string;
  contextMenuSummary: string;
}

/** 右键面板摘要行。 */
export interface SelectionSummaryRow {
  label: string;
  value: string;
}

/** 选中集变化摘要入参。 */
export interface SelectionChangeSummaryInput {
  reason?: string | null;
  selectionMode: SelectionMode;
  selectedCount: number;
  addedIds: Array<string | number>;
  removedIds: Array<string | number>;
  circleIds: Array<string | number>;
}

/** 选中集摘要行入参。 */
export interface SelectionSummaryRowsInput {
  selectionMode: SelectionMode;
  selectedCount: number;
  selectedFeatureIds: Array<string | number>;
  layerGroups: SelectionLayerGroup[];
}

/** 线操作说明入参。 */
export interface LineOperationTextInput {
  selectedFeatureIds: Array<string | number>;
  selectedLineFeatureId: string | number | null;
  selectedLineSourceId: string | null;
  lineDraftSourceId: string;
}

/** DXF 摘要配置。 */
export interface DxfSummaryOptions {
  sourceIds: string[] | null;
  fileName: string;
  sourceCrs?: string;
  targetCrs?: string;
  layerTrueColorResolver?: unknown;
  featureTrueColorResolver?: unknown;
}

/** 选中变化默认提示。 */
export const EMPTY_SELECTION_CHANGE_TEXT = "当前还没有发生选中集变化";

/** 右键摘要默认提示。 */
export const EMPTY_CONTEXT_MENU_TEXT = "当前未展示选中集摘要";

/** 普通图层右键摘要提示。 */
export const MAP_CONTEXT_MENU_SUMMARY_TEXT =
  "单选右键现在只展示业务可见字段；系统隐藏字段请看调试快照";

/** TerraDraw 右键摘要提示。 */
export const TERRADRAW_CONTEXT_MENU_SUMMARY_TEXT =
  "TerraDraw 右键现在只展示业务可见字段；系统字段请在下方调试快照中查看";

/** DXF 插件未挂载时的说明。 */
export const DXF_OPTIONS_PENDING_TEXT =
  "DXF 导出插件尚未挂载到地图实例。地图初始化完成后，这里会显示 defaults 和业务层覆写后的最终配置。";

/**
 * 普通业务源右键面板提示文案。
 * 这里集中收口业务说明，避免页面主文件继续堆积长文本。
 */
export const MAP_PROPERTY_PANEL_NOTE =
  "上方列表会先继承数据源默认规则：`name` 在本页默认只读，`id` 因为是 promoteId 也会被底层强保护；部分图层再局部把 `mark` 或 `name` 覆写成稳定字段。像 marker-color 这类样式辅助字段会被隐藏到下方调试快照。新增的临时字段默认允许删除。";

/** 线草稿右键面板提示文案。 */
export const LINE_DRAFT_PROPERTY_PANEL_NOTE =
  "线草稿会继承正式来源的属性治理规则。业务层看不到内部来源字段，也不能修改 ID；如果新增了临时字段，仍然可以通过删除按钮显式移除。";

/** TerraDraw 绘制控件右键面板提示文案。 */
export const DRAW_PROPERTY_PANEL_NOTE =
  "这里展示的是绘制业务字段。TerraDraw 内部状态字段已经被系统层隐藏；如果某个字段命中固定/只读规则，保存后会立即收紧为不可删或不可改。";

/** Measure 控件右键面板提示文案。 */
export const MEASURE_PROPERTY_PANEL_NOTE =
  "这里展示的是测量业务字段。像 distance、area、segments 这类测量结果由系统维护，不会出现在业务编辑列表里；如需排查，可查看下方原始属性调试快照。";

/** DXF 插件默认导出的文件名。 */
export const DXF_DEFAULT_FILE_NAME = "nggi00-business-all.dxf";

/** 业务层局部覆写时的文件名。 */
export const DXF_PRIMARY_ONLY_FILE_NAME = "nggi00-primary-only.dxf";

/** 示例页展示的默认 CRS 文本。 */
export const DXF_DEFAULT_CRS_TEXT = `${DXF_DEFAULT_SOURCE_CRS} -> ${DXF_DEFAULT_TARGET_CRS}`;

/** 全局 TrueColor 入口的展示文本。 */
export const DXF_GLOBAL_TRUE_COLOR_TEXT =
  !HAS_DXF_TRUE_COLOR_RULES
    ? "DEFAULT_DXF_TRUE_COLOR_RULES（当前为空）"
    : "DEFAULT_DXF_TRUE_COLOR_RULES（已配置）";

/** 默认 CRS 配置填写位置说明。 */
export const DXF_DEFAULT_CRS_CONFIG_PATH_TEXT =
  "DXF 全局默认 CRS 已在插件封装层统一维护；业务层只有需要覆盖时，才在 createMapDxfExportPlugin({ defaults }) 或 downloadDxf(overrides) 里传 sourceCrs / targetCrs。";

/** 全局 TrueColor 规则入口说明。 */
export const DXF_DEFAULT_TRUE_COLOR_CONFIG_PATH_TEXT =
  "DXF 全局默认 TrueColor 规则入口已经预留：DEFAULT_DXF_TRUE_COLOR_RULES。当前默认是空对象，只负责兜底入口，不内置任何业务颜色逻辑。";

/** DXF 局部覆写示例说明。 */
export const DXF_OVERRIDE_GUIDE_TEXT =
  "右上角插件自带的“导出DXF”按钮会按“全局默认 -> 页面 defaults -> 单次 overrides”合并配置。当前页面额外提供的“导出主业务DXF”按钮，只在本次任务里覆写 sourceIds、fileName 和 layerNameResolver；后续如果业务要按页面或单次任务改 CRS、图层色或特定要素色，也继续通过 defaults 或 downloadDxf(overrides) 覆盖即可。";

/** DXF 插件根配置速查说明。 */
export const DXF_PLUGIN_OPTIONS_GUIDE_TEXT = [
  "mapDxfExportPlugin 可配项：",
  "1. enabled?: 是否启用整个 DXF 导出插件。",
  "2. sourceRegistry: 必填，传当前页面的业务 sourceRegistry。",
  "3. defaults?: 页面级默认导出配置，会覆盖封装层统一维护的全局默认 CRS。",
  "   可配字段：sourceIds / fileName / sourceCrs / targetCrs / featureFilter / layerNameResolver / layerTrueColorResolver / featureTrueColorResolver。",
  "4. control?: 内置按钮配置。",
  "   可配字段：enabled / position / label。",
].join("\n");

/** DXF 回调用法速查说明。 */
export const DXF_CALLBACK_GUIDE_TEXT = [
  "featureFilter(feature, sourceId)：返回 true 表示保留当前要素，返回 false 表示本次导出跳过当前要素。",
  "layerNameResolver(feature, sourceId)：返回当前要素写入 DXF 的图层名。相同返回值的要素会被放进同一个 DXF 图层。",
  "layerTrueColorResolver(layerName, sourceId)：返回图层 TrueColor；即使没有 layerNameResolver，默认按 sourceId 分层时也一样可用。",
  "featureTrueColorResolver(feature, sourceId, layerName)：返回实体 TrueColor，优先级高于图层色，适合少量特殊要素。",
  "当前示例页不预置任何颜色规则，只展示“全局入口 + 页面 defaults + 单次 overrides”的接法，避免把业务配色硬编码进示例页。",
  "底层会自动清洗 DXF 非法图层名；如果不同来源最终落到同一 DXF 图层，也会在 warnings 里给出同名合层提示。",
].join("\n");

/**
 * 创建示例面板默认状态。
 * @returns 可直接挂到响应式对象上的默认摘要
 */
export function createSelectionPanelState(): SelectionPanelState {
  return {
    lastChangeSummary: EMPTY_SELECTION_CHANGE_TEXT,
    contextMenuSummary: EMPTY_CONTEXT_MENU_TEXT,
  };
}

/**
 * 将选择模式转换为便于示例展示的中文文本。
 * @param mode 当前选择模式
 * @returns 中文模式文本
 */
export function getSelectionModeText(mode: SelectionMode): string {
  return mode === "multiple" ? "多选" : "单选";
}

/**
 * 将值列表格式化为易读文本。
 * @param values 需要展示的值列表
 * @returns 单行展示文本
 */
export function formatValueList(values: Array<string | number>): string {
  return values.length > 0 ? values.map((value) => String(value)).join("、") : "无";
}

/**
 * 将按图层分组后的结果压缩成单行摘要。
 * @param layerGroups 图层分组结果
 * @returns 图层分布摘要文本
 */
export function formatLayerDistribution(
  layerGroups: SelectionLayerGroup[],
): string {
  if (layerGroups.length === 0) {
    return "无";
  }

  return layerGroups
    .map((layerGroup) => {
      return `${layerGroup.layerId || "未知图层"} x${layerGroup.features.length}`;
    })
    .join("，");
}

/**
 * 将当前选中集转换为右键面板摘要行。
 * @param input 当前选中集摘要入参
 * @returns 适合直接传给属性面板的摘要行
 */
export function buildSelectionSummaryRows(
  input: SelectionSummaryRowsInput,
): SelectionSummaryRow[] {
  return [
    {
      label: "当前模式",
      value: getSelectionModeText(input.selectionMode),
    },
    {
      label: "选中数量",
      value: `${input.selectedCount} 个`,
    },
    {
      label: "要素 ID",
      value: formatValueList(input.selectedFeatureIds),
    },
    {
      label: "图层分布",
      value: formatLayerDistribution(input.layerGroups),
    },
  ];
}

/**
 * 将摘要行压缩为单行文本。
 * @param summaryRows 当前摘要行
 * @returns 适合日志和面板展示的单行说明
 */
export function buildSelectionSummaryText(summaryRows: SelectionSummaryRow[]): string {
  if (summaryRows.length === 0) {
    return "当前没有可展示的选中集摘要";
  }

  return summaryRows.map((summaryRow) => `${summaryRow.label}：${summaryRow.value}`).join(" | ");
}

/**
 * 生成当前选中态面板的说明文本。
 * @param hasSelection 当前是否已有选中结果
 * @param isSelectionActive 当前是否处于多选激活态
 * @returns 面板底部说明
 */
export function buildSelectionGuideText(
  hasSelection: boolean,
  isSelectionActive: boolean,
): string {
  if (!hasSelection) {
    return "当前没有选中要素。点右上角的多选按钮后，就可以直接用这个面板观察数量和操作入口。";
  }

  if (isSelectionActive) {
    return "现在 UI 直接绑定选择态门面，不再手动同步数量、选中集和清空/退出按钮。";
  }

  return "当前展示的是已有选中结果；如果要批量处理，可以先进入多选模式。";
}

/**
 * 生成选中集变化摘要。
 * @param input 变化摘要入参
 * @returns 适合日志与示例面板直接展示的文本
 */
export function buildSelectionChangeSummary(input: SelectionChangeSummaryInput): string {
  return (
    `原因：${input.reason || "unknown"}；模式：${getSelectionModeText(input.selectionMode)}；` +
    `当前 ${input.selectedCount} 个；新增 ${formatValueList(input.addedIds)}；` +
    `移除 ${formatValueList(input.removedIds)}；circleLayer 业务 ID：${formatValueList(input.circleIds)}`
  );
}

/**
 * 生成当前线操作入口说明。
 * @param input 线操作说明入参
 * @returns 适合面板直接展示的文本
 */
export function buildLineOperationText(input: LineOperationTextInput): string {
  if (input.selectedLineFeatureId === null) {
    return input.selectedFeatureIds.length > 0
      ? "当前选中的不是线要素。请改为点选线，再去试“生成线廊”或“创建线草稿”。"
      : "当前未选中线要素。先点一条线，再去试“生成线廊”或“创建线草稿”。";
  }

  const sourceText =
    input.selectedLineSourceId === input.lineDraftSourceId ? "线草稿源" : "正式业务源";
  return `当前线操作会读取 ${sourceText} 的最新线要素：${String(input.selectedLineFeatureId)}`;
}

/**
 * 生成线草稿状态说明文本。
 * @param hasLineDraftFeatures 当前是否已有线草稿
 * @param lineDraftCount 当前线草稿数量
 * @returns 草稿状态说明
 */
export function buildLineDraftStatusText(
  hasLineDraftFeatures: boolean,
  lineDraftCount: number,
): string {
  return hasLineDraftFeatures
    ? `线草稿能力门面当前已有临时结果（共 ${lineDraftCount} 个）；如果不需要，直接点击这里的“清空线草稿”即可。`
    : "当前没有线草稿。选中线并点击“创建线草稿”后，这里会通过 businessMap.draft 自动刷新状态。";
}

/**
 * 统一格式化 DXF 导出的 source 范围文本。
 * @param sourceIds 最终生效的 sourceId 列表
 * @returns 适合示例面板直接展示的中文文本
 */
export function formatDxfSourceIdsText(sourceIds: string[] | null): string {
  if (!sourceIds || sourceIds.length === 0) {
    return "全部业务 source";
  }

  return sourceIds.join("、");
}

/**
 * 统一格式化 DXF 导出的坐标转换文本。
 * @param sourceCrs 源坐标系
 * @param targetCrs 目标坐标系
 * @returns 适合示例面板直接展示的中文文本
 */
export function formatDxfCrsText(sourceCrs?: string, targetCrs?: string): string {
  if (!sourceCrs || !targetCrs) {
    return "未完整配置 CRS，将按原坐标导出";
  }

  if (sourceCrs === targetCrs) {
    return `${sourceCrs}（无需转换）`;
  }

  return `${sourceCrs} -> ${targetCrs}`;
}

/**
 * 统一格式化 TrueColor 解析器状态文本。
 * @param resolver 任意解析器
 * @returns 适合示例面板直接展示的中文文本
 */
export function formatDxfTrueColorResolverText(resolver: unknown): string {
  return typeof resolver === "function" ? "已配置" : "未配置";
}

/**
 * 生成示例面板展示的 DXF 最终配置说明。
 * @param defaultOptions 插件默认导出配置
 * @param primaryOnlyOptions 业务层局部覆写后的导出配置
 * @returns 多行 DXF 说明文本
 */
export function buildDxfResolvedOptionsText(
  defaultOptions: DxfSummaryOptions,
  primaryOnlyOptions: DxfSummaryOptions,
): string {
  return [
    `插件默认导出：范围 = ${formatDxfSourceIdsText(defaultOptions.sourceIds)}；文件 = ${defaultOptions.fileName}；坐标转换 = ${formatDxfCrsText(defaultOptions.sourceCrs, defaultOptions.targetCrs)}。`,
    `默认颜色解析器：图层色 = ${formatDxfTrueColorResolverText(defaultOptions.layerTrueColorResolver)}；要素色 = ${formatDxfTrueColorResolverText(defaultOptions.featureTrueColorResolver)}。`,
    `业务层局部覆写后：范围 = ${formatDxfSourceIdsText(primaryOnlyOptions.sourceIds)}；文件 = ${primaryOnlyOptions.fileName}；图层名 = 按 sourceId + mark 生成；图层色 = ${formatDxfTrueColorResolverText(primaryOnlyOptions.layerTrueColorResolver)}；要素色 = ${formatDxfTrueColorResolverText(primaryOnlyOptions.featureTrueColorResolver)}。`,
  ].join("\n");
}
