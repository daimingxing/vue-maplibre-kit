import { defineMapGlobalConfig, setMapGlobalConfig } from 'vue-maplibre-kit/config';

/**
 * demo 应用级地图全局默认配置。
 * 这里专门模拟真实 npm 消费方在启动阶段维护的一份统一默认值，
 * 方便集中查看“地图参数、控件、插件、样式”四类全局入口。
 */
export const demoMapGlobalConfig = defineMapGlobalConfig({
  mapOptions: {
    mapStyle: 'https://demotiles.maplibre.org/style.json',
    center: [113.943, 22.548],
    zoom: 3,
  },
  mapControls: {
    MglScaleControl: {
      isUse: true,
      position: 'bottom-left',
      maxWidth: 120,
    },
    MglNavigationControl: {
      isUse: true,
      position: 'top-left',
      showCompass: true,
    },
  },
  plugins: {
    snap: {
      defaultTolerancePx: 12,
      preview: {
        pointColor: '#1677ff',
        lineColor: '#1677ff',
        lineWidth: 5,
      },
      terradraw: {
        defaults: {
          enabled: true,
          useNative: true,
          useMapTargets: true,
        },
      },
    },
    lineDraft: {
      styleOverrides: {
        line: {
          paint: {
            'line-opacity': 0.8,
          },
        },
        fill: {
          paint: {
            'fill-opacity': 0.25,
          },
        },
      },
    },
    intersection: {
      previewStyleOverrides: {
        paint: {
          'circle-radius': 6,
        },
      },
      materializedStyleOverrides: {
        paint: {
          'circle-radius': 7,
          'circle-color': '#1677ff',
        },
      },
    },
    multiSelect: {
      enabled: true,
      position: 'top-right',
      deactivateBehavior: 'retain',
    },
    dxfExport: {
      defaults: {
        sourceCrs: 'EPSG:4326',
        targetCrs: 'EPSG:3857',
      },
      control: {
        label: '导出CAD',
        position: 'top-right',
      },
    },
  },
  styles: {
    line: {
      paint: {
        'line-color': '#1677ff',
      },
    },
    circle: {
      paint: {
        'circle-radius': 7,
      },
    },
    fill: {
      paint: {
        'fill-outline-color': '#1677ff',
      },
    },
    symbol: {
      paint: {
        'text-halo-width': 1.5,
      },
    },
    raster: {
      paint: {
        'raster-opacity': 0.92,
      },
    },
  },
});

/**
 * 在 demo 应用启动阶段注册地图全局默认配置。
 * 真实项目里也推荐采用同样模式：把全局默认值放到独立文件，再在 main.ts 启动前调用一次。
 */
export function applyDemoMapGlobalConfig(): void {
  setMapGlobalConfig(demoMapGlobalConfig);
}
