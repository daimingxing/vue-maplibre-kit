import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { ref } from 'vue';
import type { MapOptions } from 'maplibre-gl';
import {
  defineMapGlobalConfig,
  getMapGlobalConfig,
  resetMapGlobalConfig,
  setMapGlobalConfig,
  type MapKitGlobalConfig,
} from './config';

describe('config', () => {
  afterEach(() => {
    resetMapGlobalConfig();
  });

  it('setMapGlobalConfig 应整份替换当前全局配置', () => {
    setMapGlobalConfig({
      mapOptions: {
        zoom: 12,
      },
      plugins: {
        multiSelect: {
          position: 'bottom-left',
        },
      },
    });

    setMapGlobalConfig({
      mapOptions: {
        center: [114.3, 22.5],
      },
    });

    expect(getMapGlobalConfig()).toEqual({
      mapOptions: {
        center: [114.3, 22.5],
      },
    });
  });

  it('getMapGlobalConfig 会返回最近一次注册的全局配置', () => {
    const config = setMapGlobalConfig({
      mapOptions: {
        mapStyle: 'test-style',
      },
      styles: {
        line: {
          paint: {
            'line-color': '#1677ff',
          },
        },
      },
    });

    expect(getMapGlobalConfig()).toBe(config);
    expect(getMapGlobalConfig()).toEqual({
      mapOptions: {
        mapStyle: 'test-style',
      },
      styles: {
        line: {
          paint: {
            'line-color': '#1677ff',
          },
        },
      },
    });
  });

  it('setMapGlobalConfig 应冻结嵌套配置快照', () => {
    const config = setMapGlobalConfig({
      plugins: {
        dxfExport: {
          control: {
            label: '导出CAD',
          },
        },
      },
    });

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.plugins)).toBe(true);
    expect(Object.isFrozen(config.plugins?.dxfExport)).toBe(true);
    expect(Object.isFrozen(config.plugins?.dxfExport?.control)).toBe(true);
  });

  it('setMapGlobalConfig 遇到 Vue ref 配置值时应提示并跳过冻结该值', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const labelRef = ref('导出CAD');
    const config = setMapGlobalConfig({
      plugins: {
        dxfExport: {
          control: {
            label: labelRef,
          },
        },
      },
    } as unknown as MapKitGlobalConfig);
    const storedLabel = config.plugins?.dxfExport?.control?.label as unknown as object;

    expect(Object.isFrozen(storedLabel)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      '[setMapGlobalConfig] 检测到 Vue 响应式配置值，建议传入普通对象快照'
    );

    warnSpy.mockRestore();
  });

  it('resetMapGlobalConfig 会清空到空对象', () => {
    setMapGlobalConfig({
      mapControls: {
        MglScaleControl: {
          isUse: true,
        },
      },
    });

    resetMapGlobalConfig();

    expect(getMapGlobalConfig()).toEqual({});
  });

  it('defineMapGlobalConfig 只做类型辅助并原样返回配置对象', () => {
    const config = defineMapGlobalConfig({
      mapOptions: {
        mapStyle: 'demo-style',
      },
      plugins: {
        dxfExport: {
          control: {
            label: '导出CAD',
          },
        },
        polygonEdge: {
          style: {
            normal: {
              color: '#409eff',
              width: 3,
            },
          },
        },
        snap: {
          polygonEdge: {
            enabled: true,
            snapTo: ['vertex', 'segment'],
          },
        },
      },
    });

    expect(config).toEqual({
      mapOptions: {
        mapStyle: 'demo-style',
      },
      plugins: {
        dxfExport: {
          control: {
            label: '导出CAD',
          },
        },
        polygonEdge: {
          style: {
            normal: {
              color: '#409eff',
              width: 3,
            },
          },
        },
        snap: {
          polygonEdge: {
            enabled: true,
            snapTo: ['vertex', 'segment'],
          },
        },
      },
    });

    expectTypeOf<MapKitGlobalConfig['mapOptions']>().toEqualTypeOf<
      Partial<MapOptions & { mapStyle: string | object }> | undefined
    >();
  });
});
