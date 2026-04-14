import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMapEffect } from './useMapEffect';

/** 创建测试用闪烁目标。 */
function createFlashTarget(id: string | number) {
  return {
    source: 'business-source',
    id,
  };
}

/** 提取指定目标收到的闪烁状态写入序列。 */
function getFeatureFlashHistory(
  setFeatureState: ReturnType<typeof vi.fn>,
  featureId: string | number
): boolean[] {
  return setFeatureState.mock.calls
    .filter(([target]) => target?.id === featureId)
    .map(([, state]) => Boolean(state?.isFlashing));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useMapEffect', () => {
  it('允许不同目标按各自频率独立闪烁', () => {
    vi.useFakeTimers();
    const setFeatureState = vi.fn();
    const effect = useMapEffect({ setFeatureState }, 500);

    effect.startFlash(createFlashTarget('point_1'), 200);
    effect.startFlash(createFlashTarget('line_1'), 400);

    vi.advanceTimersByTime(200);
    expect(getFeatureFlashHistory(setFeatureState, 'point_1')).toEqual([true]);
    expect(getFeatureFlashHistory(setFeatureState, 'line_1')).toEqual([]);

    vi.advanceTimersByTime(200);
    expect(getFeatureFlashHistory(setFeatureState, 'point_1')).toEqual([true, false]);
    expect(getFeatureFlashHistory(setFeatureState, 'line_1')).toEqual([true]);

    effect.clearFlash();
  });

  it('同一目标重复 startFlash 时会更新为新的频率', () => {
    vi.useFakeTimers();
    const setFeatureState = vi.fn();
    const effect = useMapEffect({ setFeatureState }, 500);

    effect.startFlash(createFlashTarget('point_1'));
    effect.startFlash(createFlashTarget('point_1'), 200);

    vi.advanceTimersByTime(199);
    expect(getFeatureFlashHistory(setFeatureState, 'point_1')).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(getFeatureFlashHistory(setFeatureState, 'point_1')).toEqual([true]);

    effect.clearFlash();
  });

  it('兼容 sourceId + featureId + intervalMs 的重载调用', () => {
    vi.useFakeTimers();
    const setFeatureState = vi.fn();
    const effect = useMapEffect({ setFeatureState }, 500);

    effect.startFlash('business-source', 3, 150);

    vi.advanceTimersByTime(150);
    expect(getFeatureFlashHistory(setFeatureState, 3)).toEqual([true]);
    expect(effect.isFeatureFlashing('business-source', 3)).toBe(true);

    expect(effect.stopFlash('business-source', 3)).toBe(true);
    expect(getFeatureFlashHistory(setFeatureState, 3)).toEqual([true, false]);
  });
});
