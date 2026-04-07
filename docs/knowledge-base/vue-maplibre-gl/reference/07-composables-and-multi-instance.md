# 组合式 API 与多实例

## useMap
用于在组件外访问指定 Map 实例。

### 行为
- 通过 mapKey 或默认 key 关联实例
- 返回响应式对象，包含 map、component、isLoaded、isMounted、language 等

### 示例
```ts
import { useMap } from 'vue-maplibre-gl'

const mapInstance = useMap('main-map')
```

## MglDefaults
用于设置 Map 默认值。

### 示例
```ts
import { MglDefaults } from 'vue-maplibre-gl'

MglDefaults.zoom = 4
MglDefaults.center = [0, 0]
```

## 多实例使用
通过 MglMap 的 mapKey 区分实例，结合 useMap 访问不同地图。
