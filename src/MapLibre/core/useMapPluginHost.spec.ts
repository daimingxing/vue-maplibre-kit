import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapPluginHost } from './useMapPluginHost';
import type {
  AnyMapPluginDescriptor,
  MapPluginRenderItem,
} from '../plugins/types';

vi.mock('vue-maplibre-gl', () => ({}));

const DemoComponent = {} as any;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

/**
 * 创建插件宿主测试环境。
 * @param descriptors 当前测试需要注册的插件描述对象
 * @returns 插件宿主和作用域清理函数
 */
function createHostHarness(descriptors: AnyMapPluginDescriptor[] | (() => AnyMapPluginDescriptor[])): {
  host: ReturnType<typeof useMapPluginHost>;
  scope: EffectScope;
} {
  const scope = effectScope();
  let host: ReturnType<typeof useMapPluginHost> | null = null;

  scope.run(() => {
    host = useMapPluginHost({
      getDescriptors: () => (typeof descriptors === 'function' ? descriptors() : descriptors),
      getMap: () => null,
      getMapInstance: () => ({}) as any,
      getBaseMapInteractive: () => null,
      getSelectedFeatureContext: () => null,
      clearHoverState: () => undefined,
      clearSelectedFeature: () => undefined,
      clearPluginHoverState: () => undefined,
      clearPluginSelectedFeature: () => undefined,
      toFeatureSnapshot: () => null,
    });
  });

  return {
    host: host as ReturnType<typeof useMapPluginHost>,
    scope,
  };
}

/**
 * 创建测试用插件描述对象。
 * @param descriptor 插件描述对象补丁
 * @returns 完整插件描述对象
 */
function createDescriptor(
  descriptor: Partial<AnyMapPluginDescriptor> & Pick<AnyMapPluginDescriptor, 'id' | 'plugin'>
): AnyMapPluginDescriptor {
  return {
    type: descriptor.plugin.type,
    options: {},
    ...descriptor,
  };
}

describe('useMapPluginHost', () => {
  it('插件初始化失败时应跳过失败插件并保留其他插件', () => {
    const error = new Error('init failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const aliveItems: MapPluginRenderItem[] = [
      {
        id: 'alive-render',
        component: DemoComponent,
        props: {},
      },
    ];

    const { host, scope } = createHostHarness([
      createDescriptor({
        id: 'broken',
        plugin: {
          type: 'broken',
          createInstance: () => {
            throw error;
          },
        },
      }),
      createDescriptor({
        id: 'alive',
        plugin: {
          type: 'alive',
          createInstance: () => ({
            getRenderItems: () => aliveItems,
          }),
        },
      }),
    ]);

    expect(host.hostExpose.has('broken')).toBe(false);
    expect(host.hostExpose.has('alive')).toBe(true);
    expect(host.renderItems.value).toEqual(aliveItems);
    expect(errorSpy).toHaveBeenCalledWith(
      "[MapPluginHost] 插件 'broken' 初始化失败，已跳过",
      error
    );

    scope.stop();
    errorSpy.mockRestore();
  });

  it('插件运行时方法抛错时应返回安全空值', () => {
    const error = new Error('runtime failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { host, scope } = createHostHarness([
      createDescriptor({
        id: 'runtime-broken',
        plugin: {
          type: 'runtime-broken',
          createInstance: () => ({
            getRenderItems: () => {
              throw error;
            },
            getMapInteractivePatch: () => {
              throw error;
            },
            getPluginLayerInteractivePatch: () => {
              throw error;
            },
            resolveSelectedFeatureSnapshot: () => {
              throw error;
            },
            getApi: () => {
              throw error;
            },
            state: ref({ status: 'ready' }),
          }),
        },
      }),
    ]);

    expect(host.renderItems.value).toEqual([]);
    expect(host.mergedMapInteractive.value).toBeNull();
    expect(host.mergedPluginLayerInteractive.value).toBeNull();
    expect(host.resolveSelectedFeatureSnapshot()).toBeNull();
    expect(host.hostExpose.getApi('runtime-broken')).toBeNull();
    expect(host.hostExpose.getState('runtime-broken')).toEqual({ status: 'ready' });
    expect(errorSpy).toHaveBeenCalledWith(
      "[MapPluginHost] 插件 'runtime-broken' getRenderItems 运行失败",
      error
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[MapPluginHost] 插件 'runtime-broken' getApi 运行失败",
      error
    );

    scope.stop();
    errorSpy.mockRestore();
  });

  it('插件从描述符列表移除时应销毁旧实例', async () => {
    const destroy = vi.fn();
    const descriptorsRef = ref<AnyMapPluginDescriptor[]>([
      createDescriptor({
        id: 'removable',
        plugin: {
          type: 'removable',
          createInstance: () => ({
            destroy,
          }),
        },
      }),
    ]);
    const { host, scope } = createHostHarness(() => descriptorsRef.value);

    expect(host.hostExpose.has('removable')).toBe(true);

    descriptorsRef.value = [];
    await nextTick();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(host.hostExpose.has('removable')).toBe(false);

    scope.stop();
  });
});
