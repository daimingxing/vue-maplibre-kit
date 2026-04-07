import { onBeforeUnmount } from 'vue';

/**
 * 样式表达式生成器：隐藏底层 Feature State 语法
 * 可以在图层的 paint 配置中直接使用
 * @param normalValue 正常状态下的值（如颜色、大小）
 * @param flashValue 闪烁状态下的值（如颜色、大小）
 * @returns MapLibre 表达式数组
 */
export const withFlashColor = (normalValue: any, flashValue: any): any => {
  return ['case', ['boolean', ['feature-state', 'isFlashing'], false], flashValue, normalValue];
};

/**
 * 地图动效调度器 Hook
 * 提供高性能的要素闪烁控制，全局共用单一的心跳定时器
 * @param mapInstance 通过 useMap() 获取的地图实例对象
 * @param intervalMs 闪烁频率（毫秒），默认 500ms
 */
export function useMapEffect(mapInstance: any, intervalMs = 500) {
  // 记录当前正在闪烁的所有要素集合
  // key: "sourceId-featureId"
  const flashingRegistry = new Map<string, { source: string; id: string | number }>();
  let timer: number | null = null;
  let flashToggle = false;

  // 内部统一的心跳引擎
  const startEngine = () => {
    if (timer) return;
    timer = window.setInterval(() => {
      flashToggle = !flashToggle;
      // 兼容直接传入的原生 map 或 vue-maplibre-gl 的 map 引用
      const map = mapInstance?.value?.map || mapInstance?.map || mapInstance;
      if (!map || !map.setFeatureState) return;

      // 遍历所有注册的闪烁要素，统一切换状态
      flashingRegistry.forEach((feature) => {
        map.setFeatureState(
          { source: feature.source, id: feature.id },
          { isFlashing: flashToggle }
        );
      });
    }, intervalMs);
  };

  const stopEngine = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  /**
   * 开启指定要素的闪烁
   * @param source 数据源 ID
   * @param id 要素的顶层原生 ID
   */
  const startFlash = (source: string, id: string | number) => {
    const key = `${source}-${id}`;
    if (!flashingRegistry.has(key)) {
      flashingRegistry.set(key, { source, id });
      startEngine();
    }
  };

  /**
   * 停止指定要素的闪烁
   * @param source 数据源 ID
   * @param id 要素的顶层原生 ID
   */
  const stopFlash = (source: string, id: string | number) => {
    const key = `${source}-${id}`;
    if (flashingRegistry.has(key)) {
      flashingRegistry.delete(key);

      // 恢复该要素的默认状态 (isFlashing: false)
      const map = mapInstance?.value?.map || mapInstance?.map || mapInstance;
      if (map && map.setFeatureState) {
        map.setFeatureState({ source, id }, { isFlashing: false });
      }
    }
    // 如果没有要素需要闪烁了，关闭引擎以节省性能
    if (flashingRegistry.size === 0) {
      stopEngine();
    }
  };

  // 组件卸载时自动清理定时器
  onBeforeUnmount(() => {
    stopEngine();
  });

  return {
    startFlash,
    stopFlash,
  };
}
