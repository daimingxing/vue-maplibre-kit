import { afterEach, describe, expect, it } from 'vitest';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../config';
import { resolveMapControls, resolveMapInitOptions } from './mapLibre-init.config';

describe('mapLibre-init.config', () => {
  afterEach(() => {
    resetMapGlobalConfig();
  });

  it('应按 默认值 -> 全局配置 -> 页面 mapOptions 合并', () => {
    setMapGlobalConfig({
      mapOptions: {
        mapStyle: 'global-style',
        center: [120, 30],
        zoom: 10,
      },
    });

    const options = resolveMapInitOptions(
      {
        mapStyle: 'default-style',
        center: [114, 22],
        zoom: 0,
        attributionControl: false,
      },
      {
        zoom: 15,
      },
    );

    expect(options).toEqual({
      mapStyle: 'global-style',
      center: [120, 30],
      zoom: 15,
      attributionControl: false,
    });
  });

  it('应让页面 mapOptions 对象字段整体接管全局同名字段', () => {
    setMapGlobalConfig({
      mapOptions: {
        attributionControl: {
          compact: true,
          customAttribution: '© Global',
        },
        zoom: 10,
      },
    });

    const options = resolveMapInitOptions(
      {
        mapStyle: 'default-style',
        attributionControl: false,
        zoom: 0,
      },
      {
        attributionControl: {
          compact: false,
        },
      },
    );

    expect(options).toEqual({
      mapStyle: 'default-style',
      // mapOptions 只做顶层合并，同名对象字段由页面整体接管，不保留全局对象内部字段。
      attributionControl: {
        compact: false,
      },
      zoom: 10,
    });
  });

  it('应按控件 key 合并，保留全局控件默认值并允许页面局部覆写', () => {
    setMapGlobalConfig({
      mapControls: {
        MglScaleControl: {
          isUse: true,
          position: 'bottom-left',
          maxWidth: 120,
        },
      },
    });

    const controls = resolveMapControls({
      MglScaleControl: {
        maxWidth: 200,
      },
    });

    expect(controls).toEqual({
      MglScaleControl: {
        isUse: true,
        position: 'bottom-left',
        maxWidth: 200,
      },
    });
  });

  it('应让页面测量样式内部字段覆写全局默认，并保留未覆写的全局字段', () => {
    setMapGlobalConfig({
      mapControls: {
        MaplibreMeasureControl: {
          lineLayerLabelSpec: {
            layout: {
              'text-size': 16,
              'text-field': ['concat', ['get', 'distance'], ' 米'],
            },
            paint: {
              'text-color': '#8A2BE2',
              'text-halo-color': '#FFFFFF',
              'text-halo-width': 2,
            },
          },
        },
      },
    });

    const controls = resolveMapControls({
      MaplibreMeasureControl: {
        lineLayerLabelSpec: {
          layout: {
            'text-field': ['get', 'label'],
          },
          paint: {
            'text-color': '#FF0000',
          },
        },
      },
    });

    expect(controls.MaplibreMeasureControl?.lineLayerLabelSpec).toEqual({
      layout: {
        'text-size': 16,
        // MapLibre 表达式数组必须整体替换，不能按数组下标合并。
        'text-field': ['get', 'label'],
      },
      paint: {
        'text-color': '#FF0000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2,
      },
    });
  });
});


