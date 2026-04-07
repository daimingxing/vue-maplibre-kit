import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { type MapInstance } from 'vue-maplibre-gl';
import type {
  AnyMapPluginDescriptor,
  MapPluginContext,
  MapPluginHostExpose,
  MapPluginInstance,
  MapPluginRenderItem,
  MapPluginServices,
  MapPluginStateChangePayload,
} from '../plugins/types';
import type { MapLayerInteractiveContext, MapLayerInteractiveOptions } from '../shared/mapLibre-contols-types';
import type { MapCommonFeature } from '../shared/map-common-tools';

interface UseMapPluginHostOptions {
  /** 读取当前业务层注册的插件列表。 */
  getDescriptors: () => AnyMapPluginDescriptor[];
  /** 读取当前地图实例。 */
  getMap: () => MaplibreMap | null | undefined;
  /** 读取当前地图实例包装对象。 */
  getMapInstance: () => MapInstance;
  /** 读取业务层原始普通图层交互配置。 */
  getBaseMapInteractive: () => MapLayerInteractiveOptions | null | undefined;
  /** 读取当前普通图层选中上下文。 */
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null;
  /** 清理普通图层 hover 状态。 */
  clearHoverState: () => void;
  /** 清理普通图层选中状态。 */
  clearSelectedFeature: () => void;
  /** 将渲染态要素转换为标准 GeoJSON 快照。 */
  toFeatureSnapshot: (feature: any) => MapCommonFeature | null;
  /** 插件状态变化时的统一回调。 */
  onPluginStateChange?: (payload: MapPluginStateChangePayload<unknown>) => void;
}

interface MapPluginRecord {
  /** 当前插件的最新描述对象引用。 */
  descriptorRef: { value: AnyMapPluginDescriptor };
  /** 当前插件实例。 */
  instance: MapPluginInstance;
  /** 停止监听当前插件状态。 */
  stopStateWatch?: () => void;
}

/**
 * 合并普通图层交互配置。
 * @param baseConfig 基础配置
 * @param patchConfig 插件补丁配置
 * @returns 合并后的交互配置
 */
function mergeMapInteractiveOptions(
  baseConfig: MapLayerInteractiveOptions | null | undefined,
  patchConfig: MapLayerInteractiveOptions | null | undefined
): MapLayerInteractiveOptions | null {
  if (!baseConfig && !patchConfig) {
    return null;
  }

  if (!baseConfig) {
    return patchConfig ? { ...patchConfig, layers: { ...(patchConfig.layers || {}) } } : null;
  }

  if (!patchConfig) {
    return { ...baseConfig, layers: { ...(baseConfig.layers || {}) } };
  }

  return {
    ...baseConfig,
    ...patchConfig,
    layers: {
      ...(baseConfig.layers || {}),
      ...(patchConfig.layers || {}),
    },
  };
}

/**
 * 创建地图插件宿主。
 * @param options 宿主初始化参数
 * @returns 插件聚合结果与对外查询接口
 */
export function useMapPluginHost(options: UseMapPluginHostOptions) {
  const {
    getDescriptors,
    getMap,
    getMapInstance,
    getBaseMapInteractive,
    getSelectedFeatureContext,
    clearHoverState,
    clearSelectedFeature,
    toFeatureSnapshot,
    onPluginStateChange,
  } = options;
  const pluginRecordMapRef = shallowRef<Map<string, MapPluginRecord>>(new Map());

  /**
   * 销毁单个插件记录。
   * @param pluginRecord 当前插件记录
   */
  function destroyPluginRecord(pluginRecord: MapPluginRecord): void {
    pluginRecord.stopStateWatch?.();
    pluginRecord.instance.destroy?.();
  }

  /**
   * 读取当前插件是否仍然可以复用已有实例。
   * @param currentDescriptor 当前最新描述对象
   * @param pluginRecord 现有插件记录
   * @returns 是否允许复用
   */
  function canReusePluginRecord(
    currentDescriptor: AnyMapPluginDescriptor,
    pluginRecord: MapPluginRecord | undefined
  ): boolean {
    if (!pluginRecord) {
      return false;
    }

    return (
      pluginRecord.descriptorRef.value.type === currentDescriptor.type &&
      pluginRecord.descriptorRef.value.plugin === currentDescriptor.plugin
    );
  }

  /**
   * 为单个插件创建运行时上下文。
   * @param descriptor 当前插件描述对象
   * @param descriptorRef 当前插件描述对象引用
   * @returns 供插件使用的上下文
   */
  function createPluginContext(
    descriptor: AnyMapPluginDescriptor,
    descriptorRef: { value: AnyMapPluginDescriptor }
  ): MapPluginContext<string, any> {
    return {
      descriptor,
      getOptions: () => descriptorRef.value.options,
      getMap,
      getMapInstance,
      getBaseMapInteractive,
      getSelectedFeatureContext,
      clearHoverState,
      clearSelectedFeature,
      toFeatureSnapshot,
    };
  }

  /**
   * 创建单个插件记录。
   * @param descriptor 当前插件描述对象
   * @returns 新建的插件记录
   */
  function createPluginRecord(descriptor: AnyMapPluginDescriptor): MapPluginRecord {
    const descriptorRef = shallowRef<AnyMapPluginDescriptor>(descriptor);
    const instance = descriptor.plugin.createInstance(createPluginContext(descriptor, descriptorRef));
    const pluginRecord: MapPluginRecord = {
      descriptorRef,
      instance,
    };

    if (instance.state) {
      pluginRecord.stopStateWatch = watch(
        () => instance.state?.value,
        (stateSnapshot) => {
          onPluginStateChange?.({
            pluginId: descriptorRef.value.id,
            pluginType: descriptorRef.value.type,
            state: stateSnapshot,
          });
        },
        { immediate: true, deep: true }
      );
    }

    return pluginRecord;
  }

  /**
   * 同步当前插件列表，复用未变更的实例并销毁失效实例。
   */
  function syncPluginRecords(): void {
    const descriptorList = getDescriptors() || [];
    const currentPluginRecordMap = pluginRecordMapRef.value;
    const nextPluginRecordMap = new Map<string, MapPluginRecord>();
    const usedPluginIdSet = new Set<string>();

    descriptorList.forEach((descriptor) => {
      if (usedPluginIdSet.has(descriptor.id)) {
        throw new Error(`[MapPluginHost] 检测到重复的插件 ID：${descriptor.id}`);
      }

      usedPluginIdSet.add(descriptor.id);
      const currentPluginRecord = currentPluginRecordMap.get(descriptor.id);

      if (canReusePluginRecord(descriptor, currentPluginRecord)) {
        currentPluginRecord!.descriptorRef.value = descriptor;
        nextPluginRecordMap.set(descriptor.id, currentPluginRecord!);
        return;
      }

      if (currentPluginRecord) {
        destroyPluginRecord(currentPluginRecord);
      }

      nextPluginRecordMap.set(descriptor.id, createPluginRecord(descriptor));
    });

    currentPluginRecordMap.forEach((pluginRecord, pluginId) => {
      if (!nextPluginRecordMap.has(pluginId)) {
        destroyPluginRecord(pluginRecord);
      }
    });

    pluginRecordMapRef.value = nextPluginRecordMap;
  }

  watch(
    () => getDescriptors(),
    () => {
      syncPluginRecords();
    },
    { immediate: true, deep: true }
  );

  onBeforeUnmount(() => {
    pluginRecordMapRef.value.forEach((pluginRecord) => {
      destroyPluginRecord(pluginRecord);
    });
    pluginRecordMapRef.value.clear();
  });

  /**
   * 读取当前所有插件渲染项。
   */
  const renderItems = computed<MapPluginRenderItem[]>(() => {
    const nextRenderItems: MapPluginRenderItem[] = [];

    pluginRecordMapRef.value.forEach((pluginRecord) => {
      nextRenderItems.push(...(pluginRecord.instance.getRenderItems?.() || []));
    });

    return nextRenderItems;
  });

  /**
   * 合并当前所有插件对普通图层交互的补丁。
   */
  const mergedMapInteractive = computed<MapLayerInteractiveOptions | null>(() => {
    let nextInteractive = mergeMapInteractiveOptions(getBaseMapInteractive(), null);

    pluginRecordMapRef.value.forEach((pluginRecord) => {
      nextInteractive = mergeMapInteractiveOptions(
        nextInteractive,
        pluginRecord.instance.getMapInteractivePatch?.() || null
      );
    });

    return nextInteractive;
  });

  /**
   * 解析当前唯一允许存在的地图吸附服务。
   * @returns 当前吸附服务；未注册时返回 null
   */
  function getMapSnapService(): MapPluginServices['mapSnap'] | null {
    let resolvedService: MapPluginServices['mapSnap'] | null = null;

    for (const pluginRecord of pluginRecordMapRef.value.values()) {
      const currentService = pluginRecord.instance.services?.mapSnap || null;
      if (!currentService) {
        continue;
      }

      if (resolvedService) {
        throw new Error('[MapPluginHost] 当前仅允许注册一个 mapSnap 服务插件');
      }

      resolvedService = currentService;
    }

    return resolvedService;
  }

  /**
   * 按插件声明顺序解析当前选中要素快照。
   * @returns 第一个命中的插件快照；未命中时返回 null
   */
  function resolveSelectedFeatureSnapshot(): MapCommonFeature | null {
    for (const pluginRecord of pluginRecordMapRef.value.values()) {
      const featureSnapshot = pluginRecord.instance.resolveSelectedFeatureSnapshot?.() || null;
      if (featureSnapshot) {
        return featureSnapshot;
      }
    }

    return null;
  }

  /**
   * 判断指定插件是否已注册。
   * @param pluginId 插件 ID
   * @returns 是否存在
   */
  function has(pluginId: string): boolean {
    return pluginRecordMapRef.value.has(pluginId);
  }

  /**
   * 读取指定插件对外暴露的 API。
   * @param pluginId 插件 ID
   * @returns 插件 API；不存在时返回 null
   */
  function getApi<TApi = unknown>(pluginId: string): TApi | null {
    const pluginRecord = pluginRecordMapRef.value.get(pluginId);
    return (pluginRecord?.instance.getApi?.() as TApi | null | undefined) || null;
  }

  /**
   * 读取指定插件当前状态快照。
   * @param pluginId 插件 ID
   * @returns 插件状态；不存在时返回 null
   */
  function getState<TState = unknown>(pluginId: string): TState | null {
    const pluginRecord = pluginRecordMapRef.value.get(pluginId);
    return (pluginRecord?.instance.state?.value as TState | null | undefined) || null;
  }

  /**
   * 列出当前已注册插件。
   * @returns 当前插件列表
   */
  function list(): Array<{ id: string; type: string }> {
    return Array.from(pluginRecordMapRef.value.values()).map((pluginRecord) => ({
      id: pluginRecord.descriptorRef.value.id,
      type: pluginRecord.descriptorRef.value.type,
    }));
  }

  const hostExpose: MapPluginHostExpose = {
    has,
    getApi,
    getState,
    list,
  };

  return {
    renderItems,
    mergedMapInteractive,
    getMapSnapService,
    resolveSelectedFeatureSnapshot,
    hostExpose,
  };
}
