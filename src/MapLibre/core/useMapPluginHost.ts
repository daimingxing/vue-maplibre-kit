import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { type MapInstance } from 'vue-maplibre-gl';
import type {
  AnyMapPluginDescriptor,
  MapPluginContext,
  MapPluginHostExpose,
  MapPluginInstance,
  MapPluginLayerInteractiveOptions,
  MapPluginRenderItem,
  MapPluginServices,
  MapPluginStateChangePayload,
} from '../plugins/types';
import type {
  MapLayerInteractiveContext,
  MapLayerInteractiveLayerOptions,
  MapLayerInteractiveOptions,
} from '../shared/mapLibre-controls-types';
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
  /** 清理插件托管图层 hover 状态。 */
  clearPluginHoverState: () => void;
  /** 清理插件托管图层选中状态。 */
  clearPluginSelectedFeature: () => void;
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
  /** 当前插件 API 代理状态。 */
  apiProxyState?: MapPluginApiProxyState;
  /** 当前插件 API 代理对象。 */
  apiProxy?: unknown;
  /** 停止监听当前插件状态。 */
  stopStateWatch?: () => void;
}

interface MapPluginApiProxyState {
  /** 当前插件是否仍处于有效生命周期内。 */
  active: boolean;
  /** 当前插件 ID，用于生成错误信息。 */
  pluginId: string;
  /** 当前插件原始 API，插件销毁后会置空以释放真实实例引用。 */
  rawApi: Record<PropertyKey, unknown> | null;
  /** 已知方法名集合，插件销毁后仍用它返回可读错误。 */
  methodKeySet: Set<PropertyKey>;
}

interface MapPluginDescriptorDependency {
  /** 插件唯一标识。 */
  id: string;
  /** 插件类型标识。 */
  type: string;
  /** 插件定义对象引用。 */
  plugin: AnyMapPluginDescriptor['plugin'];
  /** 插件配置对象引用。 */
  options: AnyMapPluginDescriptor['options'];
}

type MapPluginServiceName = 'mapSnap' | 'mapSelection';

/**
 * 判断值是否可以被 API 代理包装。
 * @param value 待判断值
 * @returns 是否是可代理对象
 */
function isProxyableApi(value: unknown): value is Record<PropertyKey, unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

/**
 * 提取插件 API 当前暴露的方法名。
 * 这里只记录字符串与 symbol 自有属性，避免遍历原型链引入外部对象实现细节。
 *
 * @param rawApi 插件原始 API
 * @returns 方法名集合
 */
function collectApiMethodKeys(rawApi: Record<PropertyKey, unknown>): Set<PropertyKey> {
  const methodKeySet = new Set<PropertyKey>();

  Reflect.ownKeys(rawApi).forEach((propertyKey) => {
    if (typeof rawApi[propertyKey] === 'function') {
      methodKeySet.add(propertyKey);
    }
  });

  return methodKeySet;
}

/**
 * 创建插件 API 已失效错误。
 * @param pluginId 插件 ID
 * @param propertyKey API 方法名
 * @returns 可读错误对象
 */
function createInactiveApiError(pluginId: string, propertyKey: PropertyKey): Error {
  return new Error(
    `[MapPluginHost] 插件 '${pluginId}' 已卸载，无法继续调用 API '${String(propertyKey)}'`
  );
}

/**
 * 创建插件 API 代理。
 * 代理对象会在插件销毁后断开对原始 API 的引用，并让旧方法调用返回明确错误。
 *
 * @param state API 代理状态
 * @returns 插件 API 代理对象
 */
function createPluginApiProxy(state: MapPluginApiProxyState): Record<PropertyKey, unknown> {
  return new Proxy(
    {},
    {
      get(_target, propertyKey) {
        const rawApi = state.rawApi;

        if (!state.active || !rawApi) {
          if (state.methodKeySet.has(propertyKey)) {
            return () => {
              throw createInactiveApiError(state.pluginId, propertyKey);
            };
          }

          return undefined;
        }

        const propertyValue = rawApi[propertyKey];
        if (typeof propertyValue !== 'function') {
          return propertyValue;
        }

        return (...args: unknown[]) => {
          const activeRawApi = state.rawApi;
          if (!state.active || !activeRawApi) {
            throw createInactiveApiError(state.pluginId, propertyKey);
          }

          const activePropertyValue = activeRawApi[propertyKey];
          if (typeof activePropertyValue !== 'function') {
            return activePropertyValue;
          }

          return activePropertyValue.apply(activeRawApi, args);
        };
      },
      has(_target, propertyKey) {
        return Boolean(state.rawApi && propertyKey in state.rawApi);
      },
      ownKeys() {
        return state.rawApi ? Reflect.ownKeys(state.rawApi) : [];
      },
      getOwnPropertyDescriptor(_target, propertyKey) {
        if (!state.rawApi || !(propertyKey in state.rawApi)) {
          return undefined;
        }

        return {
          enumerable: true,
          configurable: true,
        };
      },
    }
  );
}

/**
 * 校验插件描述对象是否满足宿主约束。
 * 当前约束包括：
 * 1. 同一个 map 实例内，插件 ID 必须唯一
 * 2. 同一个 map 实例内，插件 type 必须唯一
 * @param descriptorList 待校验的插件描述对象列表
 */
function validatePluginDescriptors(descriptorList: AnyMapPluginDescriptor[]): void {
  const usedPluginIdSet = new Set<string>();
  const pluginTypeMap = new Map<string, string[]>();

  descriptorList.forEach((descriptor) => {
    if (usedPluginIdSet.has(descriptor.id)) {
      throw new Error(`[MapPluginHost] 检测到重复的插件 ID：${descriptor.id}`);
    }

    usedPluginIdSet.add(descriptor.id);

    const currentPluginIds = pluginTypeMap.get(descriptor.type) || [];
    currentPluginIds.push(descriptor.id);
    pluginTypeMap.set(descriptor.type, currentPluginIds);
  });

  pluginTypeMap.forEach((pluginIds, pluginType) => {
    if (pluginIds.length <= 1) {
      return;
    }

    throw new Error(
      `[MapPluginHost] 同一个 map 实例内，同类型插件只允许注册一个。检测到重复 type：${pluginType}；冲突插件 ID：${pluginIds.join(', ')}`
    );
  });
}

/**
 * 合并两个同签名回调。
 * 合并顺序固定为：基础回调先执行，补丁回调后执行。
 * 若两个回调引用完全相同，则直接复用，避免重复触发。
 * @param baseCallback 基础回调
 * @param patchCallback 补丁回调
 * @returns 合并后的回调
 */
function mergeInteractiveCallbacks<TArgs extends unknown[]>(
  baseCallback: ((...args: TArgs) => void) | undefined,
  patchCallback: ((...args: TArgs) => void) | undefined
): ((...args: TArgs) => void) | undefined {
  if (!baseCallback) {
    return patchCallback;
  }

  if (!patchCallback) {
    return baseCallback;
  }

  if (baseCallback === patchCallback) {
    return baseCallback;
  }

  return (...args: TArgs) => {
    baseCallback(...args);
    patchCallback(...args);
  };
}

/**
 * 合并单个图层级交互配置。
 * 合并规则：
 * 1. 标量字段以后者覆盖前者为准
 * 2. 回调字段按顺序串联
 * @param baseLayerConfig 基础图层配置
 * @param patchLayerConfig 补丁图层配置
 * @returns 合并后的图层配置
 */
function mergeLayerInteractiveLayerOptions(
  baseLayerConfig: MapLayerInteractiveLayerOptions | null | undefined,
  patchLayerConfig: MapLayerInteractiveLayerOptions | null | undefined
): MapLayerInteractiveLayerOptions | undefined {
  if (!baseLayerConfig && !patchLayerConfig) {
    return undefined;
  }

  if (!baseLayerConfig) {
    return patchLayerConfig ? { ...patchLayerConfig } : undefined;
  }

  if (!patchLayerConfig) {
    return { ...baseLayerConfig };
  }

  const mergedLayerConfig: MapLayerInteractiveLayerOptions = {
    ...baseLayerConfig,
    ...patchLayerConfig,
  };

  if (patchLayerConfig.cursor === undefined) {
    mergedLayerConfig.cursor = baseLayerConfig.cursor;
  }

  if (patchLayerConfig.enableFeatureStateHover === undefined) {
    mergedLayerConfig.enableFeatureStateHover = baseLayerConfig.enableFeatureStateHover;
  }

  if (patchLayerConfig.enableFeatureStateSelected === undefined) {
    mergedLayerConfig.enableFeatureStateSelected = baseLayerConfig.enableFeatureStateSelected;
  }

  mergedLayerConfig.onHoverEnter = mergeInteractiveCallbacks(
    baseLayerConfig.onHoverEnter,
    patchLayerConfig.onHoverEnter
  );
  mergedLayerConfig.onHoverLeave = mergeInteractiveCallbacks(
    baseLayerConfig.onHoverLeave,
    patchLayerConfig.onHoverLeave
  );
  mergedLayerConfig.onFeatureSelect = mergeInteractiveCallbacks(
    baseLayerConfig.onFeatureSelect,
    patchLayerConfig.onFeatureSelect
  );
  mergedLayerConfig.onFeatureDeselect = mergeInteractiveCallbacks(
    baseLayerConfig.onFeatureDeselect,
    patchLayerConfig.onFeatureDeselect
  );
  mergedLayerConfig.onClick = mergeInteractiveCallbacks(
    baseLayerConfig.onClick,
    patchLayerConfig.onClick
  );
  mergedLayerConfig.onDoubleClick = mergeInteractiveCallbacks(
    baseLayerConfig.onDoubleClick,
    patchLayerConfig.onDoubleClick
  );
  mergedLayerConfig.onContextMenu = mergeInteractiveCallbacks(
    baseLayerConfig.onContextMenu,
    patchLayerConfig.onContextMenu
  );

  return mergedLayerConfig;
}

/**
 * 合并图层级交互配置集合。
 * 已有图层保留原始顺序，新图层按补丁出现顺序追加。
 * @param baseLayers 基础图层配置集合
 * @param patchLayers 补丁图层配置集合
 * @returns 合并后的图层配置集合
 */
function mergeLayerInteractiveLayers(
  baseLayers: Record<string, MapLayerInteractiveLayerOptions> | null | undefined,
  patchLayers: Record<string, MapLayerInteractiveLayerOptions> | null | undefined
): Record<string, MapLayerInteractiveLayerOptions> | undefined {
  if (!baseLayers && !patchLayers) {
    return undefined;
  }

  const orderedLayerIds: string[] = [];
  const addedLayerIdSet = new Set<string>();
  const appendLayerIds = (
    layerConfigMap: Record<string, MapLayerInteractiveLayerOptions> | null | undefined
  ): void => {
    Object.keys(layerConfigMap || {}).forEach((layerId) => {
      if (addedLayerIdSet.has(layerId)) {
        return;
      }

      addedLayerIdSet.add(layerId);
      orderedLayerIds.push(layerId);
    });
  };

  appendLayerIds(baseLayers);
  appendLayerIds(patchLayers);

  const mergedLayers: Record<string, MapLayerInteractiveLayerOptions> = {};
  orderedLayerIds.forEach((layerId) => {
    const mergedLayerConfig = mergeLayerInteractiveLayerOptions(
      baseLayers?.[layerId],
      patchLayers?.[layerId]
    );

    if (mergedLayerConfig) {
      mergedLayers[layerId] = mergedLayerConfig;
    }
  });

  return mergedLayers;
}

/**
 * 合并普通图层交互配置。
 * 合并规则：
 * 1. 标量字段以后者覆盖前者为准
 * 2. 回调字段按顺序串联
 * 3. layers 按 layerId 深合并，且新图层只追加不重排
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
    return patchConfig
      ? {
          ...patchConfig,
          layers: mergeLayerInteractiveLayers(undefined, patchConfig.layers),
        }
      : null;
  }

  if (!patchConfig) {
    return {
      ...baseConfig,
      layers: mergeLayerInteractiveLayers(baseConfig.layers, undefined),
    };
  }

  const mergedConfig: MapLayerInteractiveOptions = {
    ...baseConfig,
    ...patchConfig,
  };

  if (patchConfig.enabled === undefined) {
    mergedConfig.enabled = baseConfig.enabled;
  }

  mergedConfig.onReady = mergeInteractiveCallbacks(baseConfig.onReady, patchConfig.onReady);
  mergedConfig.onHoverEnter = mergeInteractiveCallbacks(
    baseConfig.onHoverEnter,
    patchConfig.onHoverEnter
  );
  mergedConfig.onHoverLeave = mergeInteractiveCallbacks(
    baseConfig.onHoverLeave,
    patchConfig.onHoverLeave
  );
  mergedConfig.onClick = mergeInteractiveCallbacks(baseConfig.onClick, patchConfig.onClick);
  mergedConfig.onDoubleClick = mergeInteractiveCallbacks(
    baseConfig.onDoubleClick,
    patchConfig.onDoubleClick
  );
  mergedConfig.onContextMenu = mergeInteractiveCallbacks(
    baseConfig.onContextMenu,
    patchConfig.onContextMenu
  );
  mergedConfig.onBlankClick = mergeInteractiveCallbacks(
    baseConfig.onBlankClick,
    patchConfig.onBlankClick
  );
  mergedConfig.onSelectionChange = mergeInteractiveCallbacks(
    baseConfig.onSelectionChange,
    patchConfig.onSelectionChange
  );
  mergedConfig.layers = mergeLayerInteractiveLayers(baseConfig.layers, patchConfig.layers);

  return mergedConfig;
}

/**
 * 合并插件专用图层交互配置。
 * 合并规则与普通图层 layers 一致，但不承接地图级回调。
 * @param baseConfig 基础配置
 * @param patchConfig 插件补丁配置
 * @returns 合并后的插件交互配置
 */
function mergePluginLayerInteractiveOptions(
  baseConfig: MapPluginLayerInteractiveOptions | null | undefined,
  patchConfig: MapPluginLayerInteractiveOptions | null | undefined
): MapPluginLayerInteractiveOptions | null {
  if (!baseConfig && !patchConfig) {
    return null;
  }

  if (!baseConfig) {
    return patchConfig
      ? {
          ...patchConfig,
          layers: mergeLayerInteractiveLayers(undefined, patchConfig.layers),
        }
      : null;
  }

  if (!patchConfig) {
    return {
      ...baseConfig,
      layers: mergeLayerInteractiveLayers(baseConfig.layers, undefined),
    };
  }

  return {
    ...baseConfig,
    ...patchConfig,
    enabled: patchConfig.enabled ?? baseConfig.enabled,
    layers: mergeLayerInteractiveLayers(baseConfig.layers, patchConfig.layers),
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
    clearPluginHoverState,
    clearPluginSelectedFeature,
    toFeatureSnapshot,
    onPluginStateChange,
  } = options;
  const pluginRecordMapRef = shallowRef<Map<string, MapPluginRecord>>(new Map());

  /**
   * 校验候选插件集合中的单例服务是否重复注册。
   * 当前 mapSnap / mapSelection 都要求在同一时刻最多只存在一个提供者。
   * @param pluginRecordMap 待校验的候选插件记录集合
   */
  function validateSingletonServices(pluginRecordMap: Map<string, MapPluginRecord>): void {
    const serviceProviderMap = {
      mapSnap: [] as string[],
      mapSelection: [] as string[],
    };

    pluginRecordMap.forEach((pluginRecord, pluginId) => {
      if (getPluginService(pluginRecord, 'mapSnap')) {
        serviceProviderMap.mapSnap.push(pluginId);
      }

      if (getPluginService(pluginRecord, 'mapSelection')) {
        serviceProviderMap.mapSelection.push(pluginId);
      }
    });

    (Object.entries(serviceProviderMap) as Array<[keyof typeof serviceProviderMap, string[]]>).forEach(
      ([serviceName, providerIds]) => {
        if (providerIds.length <= 1) {
          return;
        }

        throw new Error(
          `[MapPluginHost] 当前仅允许注册一个 ${serviceName} 服务插件，检测到重复插件：${providerIds.join(', ')}`
        );
      }
    );
  }

  /**
   * 销毁单个插件记录。
   * @param pluginRecord 当前插件记录
   */
  function destroyPluginRecord(pluginRecord: MapPluginRecord): void {
    pluginRecord.stopStateWatch?.();
    pluginRecord.instance.destroy?.();
    if (pluginRecord.apiProxyState) {
      pluginRecord.apiProxyState.active = false;
      pluginRecord.apiProxyState.rawApi = null;
    }
  }

  /**
   * 读取插件服务。
   * 插件可以用 getter 暴露 services，因此读取动作也需要隔离异常。
   *
   * @param pluginRecord 当前插件记录
   * @param serviceName 服务名
   * @returns 当前服务；读取失败或不存在时返回 null
   */
  function getPluginService<TName extends MapPluginServiceName>(
    pluginRecord: MapPluginRecord,
    serviceName: TName
  ): MapPluginServices[TName] | null {
    try {
      return pluginRecord.instance.services?.[serviceName] || null;
    } catch (error) {
      console.error(
        `[MapPluginHost] 插件 '${pluginRecord.descriptorRef.value.id}' 读取 ${serviceName} 服务失败`,
        error
      );
      return null;
    }
  }

  /**
   * 读取插件状态引用。
   * 插件可以用 getter 暴露 state，因此读取动作也需要隔离异常。
   *
   * @param pluginRecord 当前插件记录
   * @returns 当前状态引用；读取失败或不存在时返回 null
   */
  function getPluginStateRef(pluginRecord: MapPluginRecord): MapPluginInstance['state'] | null {
    try {
      return pluginRecord.instance.state || null;
    } catch (error) {
      console.error(
        `[MapPluginHost] 插件 '${pluginRecord.descriptorRef.value.id}' 读取 state 失败`,
        error
      );
      return null;
    }
  }

  /**
   * 读取插件状态快照。
   * state.value 可能来自自定义 ref-like 对象，读取失败时降级为空状态。
   *
   * @param pluginRecord 当前插件记录
   * @returns 当前状态快照；读取失败或不存在时返回 null
   */
  function getPluginStateValue(pluginRecord: MapPluginRecord): unknown | null {
    const stateRef = getPluginStateRef(pluginRecord);
    if (!stateRef) {
      return null;
    }

    try {
      return stateRef.value ?? null;
    } catch (error) {
      console.error(
        `[MapPluginHost] 插件 '${pluginRecord.descriptorRef.value.id}' 读取 state.value 失败`,
        error
      );
      return null;
    }
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
      clearPluginHoverState,
      clearPluginSelectedFeature,
      toFeatureSnapshot,
    };
  }

  /**
   * 创建单个插件记录。
   * @param descriptor 当前插件描述对象
   * @returns 新建的插件记录
   */
  function createPluginRecord(descriptor: AnyMapPluginDescriptor): MapPluginRecord | null {
    const descriptorRef = shallowRef<AnyMapPluginDescriptor>(descriptor);
    try {
      const instance = descriptor.plugin.createInstance(createPluginContext(descriptor, descriptorRef));
      const pluginRecord: MapPluginRecord = {
        descriptorRef,
        instance,
      };
      const stateRef = getPluginStateRef(pluginRecord);

      if (stateRef) {
        pluginRecord.stopStateWatch = watch(
          () => getPluginStateValue(pluginRecord),
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
    } catch (error) {
      console.error(`[MapPluginHost] 插件 '${descriptor.id}' 初始化失败，已跳过`, error);
      return null;
    }
  }

  /**
   * 在插件方法外层建立错误边界。
   * 单个插件运行期异常只降级当前插件能力，避免中断宿主聚合链路。
   *
   * @param pluginRecord 当前插件记录
   * @param methodName 当前执行的插件方法名
   * @param fallback 插件方法失败后的安全返回值
   * @param runner 实际插件方法调用
   * @returns 插件方法返回值或安全返回值
   */
  function runPluginMethod<T>(
    pluginRecord: MapPluginRecord,
    methodName: string,
    fallback: T,
    runner: () => T
  ): T {
    try {
      return runner();
    } catch (error) {
      console.error(
        `[MapPluginHost] 插件 '${pluginRecord.descriptorRef.value.id}' ${methodName} 运行失败`,
        error
      );
      return fallback;
    }
  }

  /**
   * 读取插件 API 的稳定代理。
   * 业务层可能会保存 API 引用，因此宿主返回代理对象，
   * 在插件卸载时统一切断旧引用对真实插件实例的持有。
   *
   * @param pluginRecord 当前插件记录
   * @param rawApi 插件原始 API
   * @returns 可安全跨生命周期传递的 API 代理
   */
  function resolvePluginApiProxy<TApi>(pluginRecord: MapPluginRecord, rawApi: TApi): TApi {
    if (!isProxyableApi(rawApi)) {
      return rawApi;
    }

    if (!pluginRecord.apiProxyState) {
      pluginRecord.apiProxyState = {
        active: true,
        pluginId: pluginRecord.descriptorRef.value.id,
        rawApi,
        methodKeySet: collectApiMethodKeys(rawApi),
      };
      pluginRecord.apiProxy = createPluginApiProxy(pluginRecord.apiProxyState);
      return pluginRecord.apiProxy as TApi;
    }

    pluginRecord.apiProxyState.active = true;
    pluginRecord.apiProxyState.pluginId = pluginRecord.descriptorRef.value.id;
    pluginRecord.apiProxyState.rawApi = rawApi;
    pluginRecord.apiProxyState.methodKeySet = collectApiMethodKeys(rawApi);
    return pluginRecord.apiProxy as TApi;
  }

  /**
   * 提取插件描述符的顶层依赖。
   * 这里只跟踪 id / type / plugin / options 引用变化，避免 deep watch 对函数配置做递归遍历。
   * @returns 当前插件描述符的同步依赖快照
   */
  function getDescriptorDependencies(): MapPluginDescriptorDependency[] {
    return (getDescriptors() || []).map((descriptor) => ({
      id: descriptor.id,
      type: descriptor.type,
      plugin: descriptor.plugin,
      options: descriptor.options,
    }));
  }

  /**
   * 同步当前插件列表，复用未变更的实例并销毁失效实例。
   */
  function syncPluginRecords(): void {
    const descriptorList = getDescriptors() || [];
    const currentPluginRecordMap = pluginRecordMapRef.value;
    const nextPluginRecordMap = new Map<string, MapPluginRecord>();
    const createdPluginRecordList: MapPluginRecord[] = [];
    const descriptorUpdateList: Array<{
      pluginRecord: MapPluginRecord;
      descriptor: AnyMapPluginDescriptor;
    }> = [];

    try {
      // 先校验业务层传入的插件描述对象是否合法，避免创建一半实例后再回滚。
      validatePluginDescriptors(descriptorList);

      descriptorList.forEach((descriptor) => {
        const currentPluginRecord = currentPluginRecordMap.get(descriptor.id);

        if (canReusePluginRecord(descriptor, currentPluginRecord)) {
          descriptorUpdateList.push({
            pluginRecord: currentPluginRecord as MapPluginRecord,
            descriptor,
          });
          nextPluginRecordMap.set(descriptor.id, currentPluginRecord as MapPluginRecord);
          return;
        }

        const nextPluginRecord = createPluginRecord(descriptor);
        if (!nextPluginRecord) {
          return;
        }

        createdPluginRecordList.push(nextPluginRecord);
        nextPluginRecordMap.set(descriptor.id, nextPluginRecord);
      });

      validateSingletonServices(nextPluginRecordMap);

      descriptorUpdateList.forEach(({ pluginRecord, descriptor }) => {
        pluginRecord.descriptorRef.value = descriptor;
      });

      currentPluginRecordMap.forEach((pluginRecord, pluginId) => {
        if (nextPluginRecordMap.get(pluginId) !== pluginRecord) {
          destroyPluginRecord(pluginRecord);
        }
      });

      pluginRecordMapRef.value = nextPluginRecordMap;
    } catch (error) {
      createdPluginRecordList.forEach((pluginRecord) => {
        destroyPluginRecord(pluginRecord);
      });
      throw error;
    }
  }

  watch(
    () => getDescriptorDependencies(),
    () => {
      syncPluginRecords();
    },
    { immediate: true }
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
      nextRenderItems.push(
        ...runPluginMethod(pluginRecord, 'getRenderItems', [], () => {
          return pluginRecord.instance.getRenderItems?.() || [];
        })
      );
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
        runPluginMethod(pluginRecord, 'getMapInteractivePatch', null, () => {
          return pluginRecord.instance.getMapInteractivePatch?.() || null;
        })
      );
    });

    return nextInteractive;
  });

  /**
   * 合并当前所有插件对插件托管图层交互的补丁。
   */
  const mergedPluginLayerInteractive = computed<MapPluginLayerInteractiveOptions | null>(() => {
    let nextInteractive = mergePluginLayerInteractiveOptions(null, null);

    pluginRecordMapRef.value.forEach((pluginRecord) => {
      nextInteractive = mergePluginLayerInteractiveOptions(
        nextInteractive,
        runPluginMethod(pluginRecord, 'getPluginLayerInteractivePatch', null, () => {
          return pluginRecord.instance.getPluginLayerInteractivePatch?.() || null;
        })
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
      const currentService = getPluginService(pluginRecord, 'mapSnap');
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
   * 解析当前唯一允许存在的地图选择服务。
   * @returns 当前选择服务；未注册时返回 null
   */
  function getMapSelectionService(): MapPluginServices['mapSelection'] | null {
    let resolvedService: MapPluginServices['mapSelection'] | null = null;

    for (const pluginRecord of pluginRecordMapRef.value.values()) {
      const currentService = getPluginService(pluginRecord, 'mapSelection');
      if (!currentService) {
        continue;
      }

      resolvedService = currentService;
      break;
    }

    return resolvedService;
  }

  /**
   * 按插件声明顺序解析当前选中要素快照。
   * @returns 第一个命中的插件快照；未命中时返回 null
   */
  function resolveSelectedFeatureSnapshot(): MapCommonFeature | null {
    for (const pluginRecord of pluginRecordMapRef.value.values()) {
      const featureSnapshot = runPluginMethod(
        pluginRecord,
        'resolveSelectedFeatureSnapshot',
        null as MapCommonFeature | null,
        () => pluginRecord.instance.resolveSelectedFeatureSnapshot?.() || null
      );
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
    if (!pluginRecord) {
      return null;
    }

    return runPluginMethod(pluginRecord, 'getApi', null as TApi | null, () => {
      const rawApi = (pluginRecord.instance.getApi?.() as TApi | null | undefined) || null;
      return rawApi ? resolvePluginApiProxy(pluginRecord, rawApi) : null;
    });
  }

  /**
   * 读取指定插件当前状态快照。
   * @param pluginId 插件 ID
   * @returns 插件状态；不存在时返回 null
   */
  function getState<TState = unknown>(pluginId: string): TState | null {
    const pluginRecord = pluginRecordMapRef.value.get(pluginId);
    return (pluginRecord ? getPluginStateValue(pluginRecord) : null) as TState | null;
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
    mergedPluginLayerInteractive,
    getMapSnapService,
    getMapSelectionService,
    resolveSelectedFeatureSnapshot,
    hostExpose,
  };
}
