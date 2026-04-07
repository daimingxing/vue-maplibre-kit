import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';

// 自定义插件：让 Vite 原生支持 .geojson 文件作为 JSON 导入
function geojsonPlugin() {
  return {
    name: 'vite-plugin-geojson',
    transform(code, id) {
      if (id.endsWith('.geojson')) {
        // 读取文件内容并将其作为默认导出的 JavaScript 对象返回
        const fileContent = fs.readFileSync(id, 'utf-8');
        return {
          code: `export default ${fileContent};`,
          map: null,
        };
      }
    },
  };
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
  };
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuildCommand = command === 'build';

  return {
    plugins: [vue(), geojsonPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
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
              'element-plus',
              '@element-plus/icons-vue',
              'geojson',
              'mitt',
              'lodash-es',
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
