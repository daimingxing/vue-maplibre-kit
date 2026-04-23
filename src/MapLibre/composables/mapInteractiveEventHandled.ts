import type { MapMouseEvent } from 'maplibre-gl';

/** 共享的地图鼠标事件消费标记字段。 */
export interface InteractiveMouseEvent extends MouseEvent {
  /** 当前事件是否已被其他交互管理器消费。 */
  __mapInteractiveHandled__?: boolean;
}

/**
 * 判断当前地图鼠标事件是否已被其他交互模块消费。
 * @param event 当前地图鼠标事件
 * @returns 已消费时返回 true
 */
export function isMapInteractiveEventHandled(
  event: Pick<MapMouseEvent, 'originalEvent'> | null | undefined
): boolean {
  return Boolean(
    (event?.originalEvent as InteractiveMouseEvent | undefined)?.__mapInteractiveHandled__
  );
}

/**
 * 在当前地图鼠标事件上写入“已消费”标记。
 * @param event 当前地图鼠标事件
 */
export function markMapInteractiveEventHandled(
  event: Pick<MapMouseEvent, 'originalEvent'> | null | undefined
): void {
  const originalEvent = event?.originalEvent as InteractiveMouseEvent | undefined;
  if (!originalEvent) {
    return;
  }

  originalEvent.__mapInteractiveHandled__ = true;
}
