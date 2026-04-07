import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'

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
          map: null
        };
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), geojsonPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
