import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
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
      },
    });

    expectTypeOf<MapKitGlobalConfig['mapOptions']>().toEqualTypeOf<
      Partial<MapOptions & { mapStyle: string | object }> | undefined
    >();
  });
});
