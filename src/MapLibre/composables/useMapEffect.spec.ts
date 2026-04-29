import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type UseMapEffectResult, useMapEffect } from './useMapEffect';

type FeatureStateCall = [{ id?: string | number }, { isFlashing?: unknown }];

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
  const calls = setFeatureState.mock.calls as FeatureStateCall[];

  return calls
    .filter((call) => call[0]?.id === featureId)
    .map((call) => Boolean(call[1]?.isFlashing));
}

/**
 * 在真实组件 setup 语境里创建 useMapEffect，避免生命周期 Hook 触发测试噪音。
 * @param setFeatureState feature-state 写入桩函数
 * @param intervalMs 默认闪烁频率
 * @returns 已初始化完成的 useMapEffect 实例
 */
async function createEffectHarness(
  setFeatureState: ReturnType<typeof vi.fn>,
  intervalMs = 500
): Promise<UseMapEffectResult> {
  let effect: UseMapEffectResult | null = null;

  const Harness = defineComponent({
    name: 'UseMapEffectHarness',
    setup() {
      effect = useMapEffect({ setFeatureState }, intervalMs);
      return () => h('div');
    },
  });

  const app = createSSRApp(Harness);
  await renderToString(app);

  if (!effect) {
    throw new Error('未能创建 useMapEffect 测试实例');
  }

  return effect;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useMapEffect', () => {
  it('允许不同目标按各自频率独立闪烁', async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const setFeatureState = vi.fn();
    const effect = await createEffectHarness(setFeatureState, 500);

    effect.startFlash(createFlashTarget('point_1'), 200);
    effect.startFlash(createFlashTarget('line_1'), 400);

    vi.advanceTimersByTime(200);
    expect(getFeatureFlashHistory(setFeatureState, 'point_1')).toEqual([true]);
    expect(getFeatureFlashHistory(setFeatureState, 'line_1')).toEqual([]);

    vi.advanceTimersByTime(200);
    expect(getFeatureFlashHistory(setFeatureState, 'point_1')).toEqual([true, false]);
    expect(getFeatureFlashHistory(setFeatureState, 'line_1')).toEqual([true]);

    effect.clearFlash();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('同一目标重复 startFlash 时会更新为新的频率', async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const setFeatureState = vi.fn();
    const effect = await createEffectHarness(setFeatureState, 500);

    effect.startFlash(createFlashTarget('point_1'));
    effect.startFlash(createFlashTarget('point_1'), 200);

    vi.advanceTimersByTime(199);
    expect(getFeatureFlashHistory(setFeatureState, 'point_1')).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(getFeatureFlashHistory(setFeatureState, 'point_1')).toEqual([true]);

    effect.clearFlash();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('兼容 sourceId + featureId + intervalMs 的重载调用', async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const setFeatureState = vi.fn();
    const effect = await createEffectHarness(setFeatureState, 500);

    effect.startFlash('business-source', 3, 150);

    vi.advanceTimersByTime(150);
    expect(getFeatureFlashHistory(setFeatureState, 3)).toEqual([true]);
    expect(effect.isFeatureFlashing('business-source', 3)).toBe(true);

    expect(effect.stopFlash('business-source', 3)).toBe(true);
    expect(getFeatureFlashHistory(setFeatureState, 3)).toEqual([true, false]);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
