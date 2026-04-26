import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MapInstance } from 'vue-maplibre-gl';
import type {
  MaplibreMeasureControl,
  MaplibreTerradrawControl,
} from '@watergis/maplibre-gl-terradraw';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { MapControlsConfig } from '../shared/mapLibre-controls-types';
import {
  createMapLibreRawHandles,
  type MapLibreInitExpose,
  type MapLibreRawHandles,
} from './mapLibre-init.types';

/**
 * 创建测试用地图宿主实例。
 * @returns 可供 rawHandles 读取的宿主对象
 */
function createMapInstance(): MapInstance {
  return {
    component: undefined,
    map: undefined,
    isMounted: false,
    isLoaded: false,
    language: undefined,
  };
}

describe('createMapLibreRawHandles', () => {
  it('应暴露固定字段并复用同一个地图宿主实例', () => {
    const mapInstance = createMapInstance();
    const rawMap = { flyTo: vi.fn() } as unknown as MaplibreMap;
    const drawControl = { getTerraDrawInstance: vi.fn() } as unknown as MaplibreTerradrawControl;
    const measureControl = {
      getTerraDrawInstance: vi.fn(),
    } as unknown as MaplibreMeasureControl;
    mapInstance.map = rawMap;

    const rawHandles = createMapLibreRawHandles({
      mapInstance,
      getDrawControl: () => drawControl,
      getMeasureControl: () => measureControl,
    });

    expect(Object.keys(rawHandles)).toEqual([
      'map',
      'mapInstance',
      'drawControl',
      'measureControl',
    ]);
    expect(rawHandles.mapInstance).toBe(mapInstance);
    expect(rawHandles.map).toBe(rawMap);
    expect(rawHandles.drawControl).toBe(drawControl);
    expect(rawHandles.measureControl).toBe(measureControl);
  });

  it('应在控件未启用时保留 null 句柄，并持续读取最新 map', () => {
    const mapInstance = createMapInstance();
    const firstMap = { jumpTo: vi.fn() } as unknown as MaplibreMap;
    const nextMap = { easeTo: vi.fn() } as unknown as MaplibreMap;
    const rawHandles = createMapLibreRawHandles({
      mapInstance,
      getDrawControl: () => null,
      getMeasureControl: () => null,
    });

    expect(rawHandles.map).toBeUndefined();
    expect(rawHandles.drawControl).toBeNull();
    expect(rawHandles.measureControl).toBeNull();

    mapInstance.map = firstMap;
    expect(rawHandles.map).toBe(firstMap);

    mapInstance.map = nextMap;
    expect(rawHandles.map).toBe(nextMap);
  });

  it('公开实例类型应包含 rawHandles 字段', () => {
    expectTypeOf<MapLibreInitExpose['rawHandles']>().toEqualTypeOf<MapLibreRawHandles>();
    expectTypeOf<MapLibreRawHandles['map']>().toEqualTypeOf<MapInstance['map']>();
  });

  it('测量图层样式应支持业务层仅局部覆写 layout 和 paint', () => {
    const controls = {
      MaplibreMeasureControl: {
        lineLayerLabelSpec: {
          layout: {
            'text-size': 16,
          },
          paint: {
            'text-color': '#8A2BE2',
          },
        },
        routingLineLayerNodeSpec: {
          paint: {
            'circle-radius': 6,
          },
        },
        polygonLayerSpec: {
          layout: {
            'text-size': 18,
          },
          paint: {
            'text-halo-width': 3,
          },
        },
      },
    } satisfies MapControlsConfig;

    expect(controls.MaplibreMeasureControl.lineLayerLabelSpec.layout?.['text-size']).toBe(16);
  });
});



