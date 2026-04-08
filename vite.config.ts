import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';

// 自定义插件：让 Vite 原生支持 .geojson 文件作为 JSON 导入
function geojsonPlugin() {
  return {
    name: 'vite-plugin-geojson',
    transform(_code: string, id: string) {
      if (id.endsWith('.geojson')) {
        // 读取文件内容并将其作为默认导出的 JavaScript 对象返回
        const fileContent = fs.readFileSync(id, 'utf-8');
        return {
          code: `export default ${fileContent};`,
          map: null,
        };
      }
    },
  } satisfies Plugin;
}

/**
 * 读取当前库构建的多入口配置。
 * @returns 供 Vite library mode 使用的入口对象
 */
function resolveLibraryEntries() {
  return {
    index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    geometry: fileURLToPath(new URL('./src/geometry.ts', import.meta.url)),
    'plugins/map-feature-snap': fileURLToPath(
      new URL('./src/plugins/map-feature-snap.ts', import.meta.url)
    ),
    'plugins/line-draft-preview': fileURLToPath(
      new URL('./src/plugins/line-draft-preview.ts', import.meta.url)
    ),
    'plugins/map-feature-multi-select': fileURLToPath(
      new URL('./src/plugins/map-feature-multi-select.ts', import.meta.url)
    ),
  };
}

/**
 * 解析开发态别名配置。
 * 让仓库内的示例页面可以直接按 npm 消费方的方式导入 `vue-maplibre-kit`，
 * 从而避免示例层继续依赖库内部源码路径。
 * @returns Vite 别名配置列表
 */
function resolveDevAliases() {
  return [
    {
      find: /^vue-maplibre-kit$/,
      replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
    {
      find: /^vue-maplibre-kit\/geometry$/,
      replacement: fileURLToPath(new URL('./src/geometry.ts', import.meta.url)),
    },
    {
      find: /^vue-maplibre-kit\/plugins\/map-feature-snap$/,
      replacement: fileURLToPath(new URL('./src/plugins/map-feature-snap.ts', import.meta.url)),
    },
    {
      find: /^vue-maplibre-kit\/plugins\/line-draft-preview$/,
      replacement: fileURLToPath(
        new URL('./src/plugins/line-draft-preview.ts', import.meta.url)
      ),
    },
    {
      find: /^vue-maplibre-kit\/plugins\/map-feature-multi-select$/,
      replacement: fileURLToPath(
        new URL('./src/plugins/map-feature-multi-select.ts', import.meta.url)
      ),
    },
    {
      find: '@',
      replacement: fileURLToPath(new URL('./src', import.meta.url)),
    },
  ];
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuildCommand = command === 'build';

  return {
    plugins: [vue(), geojsonPlugin()],
    resolve: {
      alias: resolveDevAliases(),
    },
    build: isBuildCommand
      ? {
          lib: {
            entry: resolveLibraryEntries(),
            formats: ['es'],
          },
          rollupOptions: {
            external: [
              'vue',
              'maplibre-gl',
              'vue-maplibre-gl',
              '@watergis/maplibre-gl-terradraw',
              'terra-draw',
              'geojson',
              'mitt',
              'lodash-es',
              '@turf/helpers',
              '@turf/distance',
              '@turf/destination',
            ],
            output: {
              entryFileNames: '[name].js',
              chunkFileNames: 'chunks/[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash][extname]',
            },
          },
        }
      : undefined,
  };
});
