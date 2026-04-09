import { computed, shallowRef, watch } from 'vue';
import type { ControlPosition } from 'maplibre-gl';
import type { MapInstance } from 'vue-maplibre-gl';
import type { TerraDraw } from 'terra-draw';
import type { MapSnapBinding } from '../plugins/types';
import type {
  TerradrawControlType,
  TerradrawInteractiveOptions,
  TerradrawLineDecorationOptions,
  TerradrawManagedControl,
} from '../shared/mapLibre-contols-types';
import {
  createTerradrawInteractive,
  type TerradrawInteractiveBinding,
} from '../terradraw/useTerradrawInteractive';
import {
  createTerradrawLineDecoration,
  type TerradrawLineDecorationBinding,
} from '../terradraw/useTerradrawLineDecoration';

/**
 * TerraDraw 控件生命周期配置的公共最小字段。
 * 这里只保留生命周期管理真正关心的开关与绑定配置，
 * 其余字段交给外部的 `prepareOptions` 自行加工。
 */
interface TerradrawLifecycleConfigBase {
  /** 是否启用当前控件。 */
  isUse?: boolean;
  /** 控件停靠位置。 */
  position?: ControlPosition;
  /** TerraDraw 业务交互配置。 */
  interactive?: TerradrawInteractiveOptions | null | undefined;
  /** TerraDraw 线装饰配置。 */
  lineDecoration?: TerradrawLineDecorationOptions | null | undefined;
}

/**
 * 预处理后的控件创建结果。
 * 外部负责把业务层配置合并成底层控件真正能消费的构造参数，
 * 生命周期 composable 只负责在合适的时机创建、销毁和同步。
 */
interface PreparedTerradrawControlOptions<TControlOptions> {
  /** 当前控件最终挂载位置。 */
  position?: ControlPosition;
  /** 传给底层控件构造器的参数。 */
  controlOptions: TControlOptions;
}

/**
 * TerraDraw 生命周期 composable 入参。
 * 通过泛型同时兼容绘图控件与测量控件，避免容器层再维护两套镜像逻辑。
 */
interface UseTerradrawControlLifecycleOptions<
  TControl extends TerradrawManagedControl,
  TConfig extends TerradrawLifecycleConfigBase,
  TControlOptions,
> {
  /** 读取当前地图包装对象。 */
  getMapInstance: () => Pick<MapInstance, 'map' | 'isLoaded'>;
  /** 读取当前普通图层吸附绑定。 */
  getSnapBinding?: () => MapSnapBinding | null | undefined;
  /** 当前控件来源类型。 */
  controlType: TerradrawControlType;
  /** 读取当前控件完整配置。 */
  getConfig: () => TConfig | null | undefined;
  /** 当前底层控件构造器。 */
  Control: new (options: TControlOptions) => TControl;
  /** 当前控件默认停靠位置。 */
  defaultPosition: ControlPosition;
  /** 将业务层配置预处理为底层控件构造参数。 */
  prepareOptions: (config: TConfig | null | undefined) => PreparedTerradrawControlOptions<TControlOptions>;
  /** 读取吸附同步依赖，避免无关配置变化触发整套绑定重建。 */
  getSnappingWatchSource?: () => unknown;
  /** 同步当前控件吸附配置。 */
  syncSnapping: (control: TControl, config: TConfig | null | undefined) => void;
  /** 清理 TerraDraw ready 前挂起的同步任务。 */
  clearReadySync: (drawInstance: TerraDraw | null | undefined) => void;
}

/**
 * 将线装饰绑定转换为模板渲染层可直接消费的 props。
 * @param bindingRef 线装饰绑定响应式引用
 * @returns 模板层可直接透传的 props 计算结果
 */
function createLineDecorationLayerProps(bindingRef: {
  value: TerradrawLineDecorationBinding | null;
}) {
  return computed(() => {
    const binding = bindingRef.value;
    if (!binding || !binding.enabled.value) {
      return null;
    }

    return {
      enabled: binding.enabled.value,
      sourceId: binding.sourceId,
      data: binding.data.value,
      patternLayerId: binding.patternLayerId,
      symbolLayerItems: binding.symbolLayerItems.value,
      patternRasterItems: binding.patternRasterItems.value,
      stretchLayerItems: binding.stretchLayerItems.value,
      patternStyle: binding.patternStyle.value,
    };
  });
}

/**
 * 创建 TerraDraw 控件生命周期管理器。
 * 统一处理控件实例、业务交互、线装饰和吸附同步，减少 draw / measure 的重复代码。
 * @param options 生命周期管理配置
 * @returns 控件实例引用、线装饰渲染 props 与统一销毁方法
 */
export function useTerradrawControlLifecycle<
  TControl extends TerradrawManagedControl,
  TConfig extends TerradrawLifecycleConfigBase,
  TControlOptions,
>(options: UseTerradrawControlLifecycleOptions<TControl, TConfig, TControlOptions>) {
  const {
    getMapInstance,
    getSnapBinding,
    controlType,
    getConfig,
    Control,
    defaultPosition,
    prepareOptions,
    getSnappingWatchSource,
    syncSnapping,
    clearReadySync,
  } = options;
  const controlRef = shallowRef<TControl | null>(null);
  const interactiveRef = shallowRef<TerradrawInteractiveBinding | null>(null);
  const lineDecorationRef = shallowRef<TerradrawLineDecorationBinding | null>(null);
  const lineDecorationLayerProps = createLineDecorationLayerProps(lineDecorationRef);

  /**
   * 提取控件实例启停所需的最小依赖。
   * 控件创建后不会根据其余配置做热更新，因此这里只跟踪地图就绪态与 isUse 开关。
   * @returns 控件实例启停依赖快照
   */
  const getControlMountWatchSource = () => ({
    isLoaded: getMapInstance().isLoaded,
    hasMap: Boolean(getMapInstance().map),
    isUse: getConfig()?.isUse === true,
  });

  /**
   * 提取 TerraDraw 业务交互绑定的启停依赖。
   * 具体回调函数在运行时由交互管理器自行读取，不在这里做深度监听。
   * @returns 业务交互绑定依赖快照
   */
  const getInteractiveWatchSource = () => {
    const interactive = getConfig()?.interactive;
    return {
      ...getControlMountWatchSource(),
      hasControl: Boolean(controlRef.value),
      hasInteractive: Boolean(interactive),
      interactiveEnabled: interactive?.enabled !== false,
    };
  };

  /**
   * 提取线装饰绑定的重建依赖。
   * 仅跟踪启停开关与顶层样式/回调引用，避免递归监听整份装饰配置对象。
   * @returns 线装饰绑定依赖快照
   */
  const getLineDecorationWatchSource = () => {
    const lineDecoration = getConfig()?.lineDecoration;
    return {
      ...getControlMountWatchSource(),
      hasControl: Boolean(controlRef.value),
      lineDecorationEnabled: lineDecoration?.enabled === true,
      defaultStyle: lineDecoration?.defaultStyle || null,
      resolveStyle: lineDecoration?.resolveStyle || null,
    };
  };

  /**
   * 销毁当前控件挂接的业务交互管理器。
   */
  const destroyInteractive = () => {
    interactiveRef.value?.destroy();
    interactiveRef.value = null;
  };

  /**
   * 销毁当前控件挂接的线装饰管理器。
   */
  const destroyLineDecoration = () => {
    lineDecorationRef.value?.destroy();
    lineDecorationRef.value = null;
  };

  /**
   * 从地图上移除当前控件实例，并清理 ready 前挂起的同步任务。
   * 组件销毁阶段若地图已先一步释放，移除控件时的异常会被静默忽略。
   */
  const destroyControl = () => {
    const control = controlRef.value;
    if (!control) {
      return;
    }

    clearReadySync(control.getTerraDrawInstance?.());

    const map = getMapInstance().map;
    if (map) {
      try {
        map.removeControl(control);
      } catch {
        // 地图销毁阶段允许静默跳过，避免无意义的控制台噪音。
      }
    }

    controlRef.value = null;
  };

  /**
   * 统一销毁当前控件托管的全部运行时资源。
   */
  const destroy = () => {
    destroyInteractive();
    destroyLineDecoration();
    destroyControl();
  };

  watch(
    () => getControlMountWatchSource(),
    ({ isLoaded, hasMap, isUse }) => {
      if (!isLoaded || !hasMap) {
        return;
      }

      if (isUse) {
        if (controlRef.value) {
          return;
        }

        const preparedOptions = prepareOptions(getConfig());
        const position = preparedOptions.position || defaultPosition;

        // 控件只在首次启用时创建一次，后续行为更新由独立 watcher 接管。
        const control = new Control(preparedOptions.controlOptions);
        controlRef.value = control;
        getMapInstance().map?.addControl(control, position);
        return;
      }

      destroy();
    },
    { immediate: true }
  );

  watch(
    () => getInteractiveWatchSource(),
    ({ isLoaded, hasMap, isUse, hasControl, hasInteractive, interactiveEnabled }) => {
      destroyInteractive();

      if (!isLoaded || !hasMap || !isUse || !hasControl || !hasInteractive || !interactiveEnabled) {
        return;
      }

      const map = getMapInstance().map;
      const control = controlRef.value;
      if (!map || !control) {
        return;
      }

      interactiveRef.value = createTerradrawInteractive({
        map,
        control,
        controlType,
        getInteractive: () => getConfig()?.interactive || null,
        getSnapBinding,
      });
    },
    { immediate: true }
  );

  watch(
    () => getLineDecorationWatchSource(),
    ({ isLoaded, hasMap, isUse, hasControl, lineDecorationEnabled }) => {
      destroyLineDecoration();

      if (!isLoaded || !hasMap || !isUse || !hasControl || !lineDecorationEnabled) {
        return;
      }

      const map = getMapInstance().map;
      const control = controlRef.value;
      if (!map || !control) {
        return;
      }

      const lineDecoration = getConfig()?.lineDecoration;
      if (!lineDecoration || lineDecoration.enabled !== true) {
        return;
      }

      lineDecorationRef.value = createTerradrawLineDecoration({
        map,
        control,
        controlType,
        options: lineDecoration,
      });
    },
    { immediate: true }
  );

  watch(
    () => ({
      isLoaded: getMapInstance().isLoaded,
      isUse: getConfig()?.isUse === true,
      hasControl: Boolean(controlRef.value),
      snapping: getSnappingWatchSource ? getSnappingWatchSource() : getConfig(),
    }),
    ({ isLoaded, isUse, hasControl }) => {
      if (!isLoaded || !isUse || !hasControl || !controlRef.value) {
        return;
      }

      syncSnapping(controlRef.value, getConfig());
    },
    { immediate: true }
  );

  return {
    controlRef,
    lineDecorationLayerProps,
    destroy,
  };
}
