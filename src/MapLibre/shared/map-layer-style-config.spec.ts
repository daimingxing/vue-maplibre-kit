import { afterEach, describe, expect, it } from 'vitest';
import { resetMapGlobalConfig, setMapGlobalConfig } from '../../config';
import {
  createCircleLayerStyle,
  createLineLayerStyle,
  createRasterLayerStyle,
} from './map-layer-style-config';

describe('map-layer-style-config', () => {
  afterEach(() => {
    resetMapGlobalConfig();
  });

  it('无全局配置时应保持现有默认样式行为', () => {
    const lineStyle = createLineLayerStyle();
    const linePaint = lineStyle.paint;
    if (!linePaint) {
      throw new Error('线图层默认样式缺少 paint，无法继续断言');
    }

    expect(linePaint['line-color']).toBe('#0000ff');
    expect(linePaint['line-width']).toBe(3);
  });

  it('应先继承全局样式，再应用当前工厂局部覆写', () => {
    setMapGlobalConfig({
      styles: {
        line: {
          paint: {
            'line-color': '#1677ff',
            'line-width': 5,
          },
        },
      },
    });

    const lineStyle = createLineLayerStyle({
      paint: {
        'line-width': 7,
      },
    });
    const linePaint = lineStyle.paint;
    if (!linePaint) {
      throw new Error('线图层合并样式缺少 paint，无法继续断言');
    }

    expect(linePaint['line-color']).toBe('#1677ff');
    expect(linePaint['line-width']).toBe(7);
  });

  it('不同图层类型应只读取自己对应的全局 style defaults', () => {
    setMapGlobalConfig({
      styles: {
        circle: {
          paint: {
            'circle-radius': 9,
          },
        },
        raster: {
          paint: {
            'raster-opacity': 0.4,
          },
        },
      },
    });

    const circlePaint = createCircleLayerStyle().paint;
    const rasterPaint = createRasterLayerStyle().paint;
    if (!circlePaint || !rasterPaint) {
      throw new Error('图层类型默认样式缺少 paint，无法继续断言');
    }

    expect(circlePaint['circle-radius']).toBe(9);
    expect(rasterPaint['raster-opacity']).toBe(0.4);
  });
});
