# 安装与基础接入

## npm 安装
```bash
npm install maplibre-gl
```

## ESM 引入与 CSS
```ts
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
```

## CDN 引入
```html
<script src="https://unpkg.com/maplibre-gl@5.19.0/dist/maplibre-gl.js"></script>
<link href="https://unpkg.com/maplibre-gl@5.19.0/dist/maplibre-gl.css" rel="stylesheet" />
```

## 最小 HTML 容器
```html
<div id="map" style="width: 100%; height: 100vh;"></div>
```
