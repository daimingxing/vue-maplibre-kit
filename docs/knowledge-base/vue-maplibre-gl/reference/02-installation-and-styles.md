# 安装与样式引入

## 依赖安装
```bash
yarn add vue-maplibre-gl maplibre-gl mitt
```

## 全局安装
```ts
import VueMaplibreGl from 'vue-maplibre-gl'

app.use(VueMaplibreGl)
```

## 样式引入
```scss
@import "~maplibre-gl/dist/maplibre-gl.css";
@import "~vue-maplibre-gl/dist/vue-maplibre-gl.css";
```

## 绘制样式引入
如使用绘制相关组件，需要额外引入绘制样式文件。
```scss
@use "~vue-maplibre-gl/dist/vue-maplibre-gl-draw.css";
```

## 局部注册
```ts
import { MglMap } from 'vue-maplibre-gl'

app.component('MglMap', MglMap)
```

```html
<script>
	import { MglMap } from 'vue-maplibre-gl'

	export default {
		components: {
			MglMap
		}
	}
</script>
```
