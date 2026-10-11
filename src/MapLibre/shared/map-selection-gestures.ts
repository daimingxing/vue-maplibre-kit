import type {
  MapSelectionBoxGesture,
  MapSelectionGestures,
  MapSelectionModifierTrigger,
  MapSelectionRangeGesture,
  MapSelectionRangeTrigger,
  ResolvedMapSelectionBoxGesture,
  ResolvedMapSelectionGestures,
  ResolvedMapSelectionRangeGesture,
} from './mapLibre-controls-types';

const DEFAULT_MODIFIER_TRIGGER: MapSelectionModifierTrigger = 'shift';
const DEFAULT_RANGE_TRIGGER: MapSelectionRangeTrigger = 'shift';

/** 读取修饰键状态时允许缺字段的最小事件形状。 */
export type SelectionModifierEvent = Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'altKey'>;

/**
 * 归一化框选手势。
 * `true` 表示启用且使用 shift；`false` 表示关闭；对象缺省 enabled 视为启用。
 * @param box 业务层框选配置
 * @returns 归一化后的框选手势
 */
function resolveBoxGesture(box: boolean | MapSelectionBoxGesture | undefined): ResolvedMapSelectionBoxGesture {
  if (box === false) {
    return { enabled: false, trigger: DEFAULT_MODIFIER_TRIGGER };
  }

  if (box === undefined || box === true) {
    return { enabled: true, trigger: DEFAULT_MODIFIER_TRIGGER };
  }

  return {
    enabled: box.enabled !== false,
    trigger: box.trigger ?? DEFAULT_MODIFIER_TRIGGER,
  };
}

/**
 * 归一化范围手势。
 * 未声明或 `false` 时关闭；`true` 表示启用且使用 shift。
 * @param range 业务层范围配置
 * @returns 归一化后的范围手势
 */
function resolveRangeGesture(
  range: boolean | MapSelectionRangeGesture | undefined
): ResolvedMapSelectionRangeGesture {
  if (range === undefined || range === false) {
    return { enabled: false, trigger: DEFAULT_RANGE_TRIGGER };
  }

  if (range === true) {
    return { enabled: true, trigger: DEFAULT_RANGE_TRIGGER };
  }

  return {
    enabled: range.enabled !== false,
    trigger: range.trigger ?? DEFAULT_RANGE_TRIGGER,
  };
}

/**
 * 归一化多选手势开关。
 * 未声明时 clickAdd、clickDeselect 与框选启用，范围关闭。
 * @param gestures 业务层手势配置
 * @returns 归一化后的手势开关
 */
export function resolveMapSelectionGestures(
  gestures: MapSelectionGestures | undefined
): ResolvedMapSelectionGestures {
  return {
    clickAdd: gestures?.clickAdd !== false,
    clickDeselect: gestures?.clickDeselect !== false,
    box: resolveBoxGesture(gestures?.box),
    range: resolveRangeGesture(gestures?.range),
  };
}

/**
 * 判断指针事件是否精确匹配指定修饰键。
 * 额外同时按下其他修饰键时不匹配；不读取 meta。
 * @param event 指针或键盘修饰键状态
 * @param trigger 目标修饰键
 * @returns 仅该修饰键按下时返回 true
 */
export function matchesSelectionModifier(
  event: SelectionModifierEvent | null | undefined,
  trigger: MapSelectionModifierTrigger
): boolean {
  if (!event) {
    return false;
  }

  const shift = event.shiftKey === true;
  const ctrl = event.ctrlKey === true;
  const alt = event.altKey === true;
  if (trigger === 'shift') {
    return shift && !ctrl && !alt;
  }
  if (trigger === 'ctrl') {
    return ctrl && !shift && !alt;
  }
  return alt && !shift && !ctrl;
}

/**
 * 判断指针事件是否不含 Shift、Ctrl、Alt。
 * 缺少事件对象时视为普通点击，以兼容无 originalEvent 的调用。
 * @param event 指针修饰键状态
 * @returns 无修饰键时返回 true
 */
export function isPlainSelectionClick(event: SelectionModifierEvent | null | undefined): boolean {
  if (!event) {
    return true;
  }

  return event.shiftKey !== true && event.ctrlKey !== true && event.altKey !== true;
}

/**
 * 判断键盘事件目标是否为输入或可编辑控件。
 * Delete / Enter 等快捷键在这些目标上不接管。
 * @param target 键盘事件目标
 * @returns 来自 input、textarea、select 或 contenteditable 时返回 true
 */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || target.isContentEditable;
}
