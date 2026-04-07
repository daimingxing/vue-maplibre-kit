import type { Component } from 'vue';

/** 通用地图扩展描述对象 */
export interface MapExtensionDescriptor<TType extends string = string, TOptions = unknown> {
  /** 扩展唯一标识 */
  id: string;
  /** 扩展类型标识 */
  type: TType;
  /** 扩展配置项 */
  options: TOptions;
}

/** 通用地图扩展状态变更事件载荷 */
export interface MapExtensionStateChangePayload<TState = unknown> {
  /** 触发变更的扩展唯一标识 */
  extensionId: string;
  /** 触发变更的扩展类型标识 */
  extensionType: string;
  /** 扩展最新状态快照 */
  state: TState;
}

/** 地图扩展渲染项 */
export interface MapExtensionRenderItem {
  /** 扩展唯一标识 */
  id: string;
  /** 扩展渲染组件 */
  component: Component;
  /** 透传给扩展渲染组件的 props */
  props: Record<string, unknown>;
}
