import { describe, expect, it } from 'vitest';
import type { MapLayerInteractiveLayerOptions } from '../shared/mapLibre-controls-types';
import {
  shouldSnapOverrideRawTarget,
  sortLayerEntriesByHitPriority,
} from './useMapInteractive';

/**
 * 创建测试用图层交互配置。
 * @param hitPriority 当前命中优先级
 * @returns 最小可用的图层交互配置
 */
function createLayerConfig(hitPriority?: number): MapLayerInteractiveLayerOptions {
  return {
    cursor: 'pointer',
    hitPriority,
  };
}

describe('useMapInteractive helpers', () => {
  it('会按 hitPriority 从高到低排序命中图层，同优先级保留原声明顺序', () => {
    const layerEntries: Array<[string, MapLayerInteractiveLayerOptions]> = [
      ['line-layer', createLayerConfig(0)],
      ['preview-layer', createLayerConfig(100)],
      ['materialized-layer', createLayerConfig(100)],
      ['point-layer', createLayerConfig(0)],
    ];

    expect(sortLayerEntriesByHitPriority(layerEntries).map(([layerId]) => layerId)).toEqual([
      'preview-layer',
      'materialized-layer',
      'line-layer',
      'point-layer',
    ]);
  });

  it('只有吸附目标优先级更高时，才允许吸附结果覆盖真实命中目标', () => {
    expect(shouldSnapOverrideRawTarget(createLayerConfig(100), createLayerConfig(0))).toBe(false);
    expect(shouldSnapOverrideRawTarget(createLayerConfig(100), createLayerConfig(100))).toBe(false);
    expect(shouldSnapOverrideRawTarget(createLayerConfig(0), createLayerConfig(100))).toBe(true);
    expect(shouldSnapOverrideRawTarget(null, createLayerConfig(100))).toBe(true);
  });
});
