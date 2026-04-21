import { afterEach, describe, expect, it } from 'vitest';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../config';
import { resolveMapBusinessLayerStyle } from './mapBusinessLayer';

describe('mapBusinessLayer', () => {
  afterEach(() => {
    resetMapGlobalConfig();
  });

  it('未显式传入完整 style 时应继承全局 style defaults', () => {
    setMapGlobalConfig({
      styles: {
        line: {
          paint: {
            'line-color': '#1677ff',
          },
        },
      },
    });

    const style = resolveMapBusinessLayerStyle({
      type: 'line',
      layerId: 'line-layer',
    });

    expect(style.paint['line-color']).toBe('#1677ff');
  });

  it('显式传入完整 layer.style 时应视为页面完全接管，不叠加全局 style', () => {
    setMapGlobalConfig({
      styles: {
        line: {
          paint: {
            'line-color': '#1677ff',
          },
        },
      },
    });

    const style = resolveMapBusinessLayerStyle({
      type: 'line',
      layerId: 'line-layer',
      style: {
        layout: {
          visibility: 'visible',
        },
        paint: {
          'line-color': '#ff4d4f',
        },
      },
    });

    expect(style).toEqual({
      layout: {
        visibility: 'visible',
      },
      paint: {
        'line-color': '#ff4d4f',
      },
    });
  });
});

