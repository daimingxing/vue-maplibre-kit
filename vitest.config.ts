import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';

/**
 * 生成测试环境需要的开发态别名。
 * 保持与 Vite 开发态一致，避免测试里再额外拼内部相对路径。
 * @returns Vitest 可复用的别名配置
 */
function resolveTestAliases() {
  return [
    {
      find: /^vue-maplibre-kit$/,
      replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
    {
      find: /^vue-maplibre-kit\/business$/,
      replacement: fileURLToPath(new URL('./src/business.ts', import.meta.url)),
    },
    {
      find: /^vue-maplibre-kit\/geometry$/,
      replacement: fileURLToPath(new URL('./src/geometry.ts', import.meta.url)),
    },
    {
      find: /^vue-maplibre-kit\/plugins\/map-dxf-export$/,
      replacement: fileURLToPath(new URL('./src/plugins/map-dxf-export.ts', import.meta.url)),
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

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: resolveTestAliases(),
  },
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
