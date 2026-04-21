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

  it('应按控件 key 做浅合并，保留全局控件默认值并允许页面局部覆写', () => {
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
});

