# 高级 API 与 TerraDraw 实例

`@watergis/maplibre-gl-terradraw` 是 `Terra Draw` 核心引擎的一层 UI 封装。虽然插件提供了开箱即用的工具栏，但在业务系统中，我们通常需要获取绘制出来的 **GeoJSON 数据**，或者通过代码**程序化地操作图形**。

本章讲解如何突破 UI 限制，直接获取底层实例并调用其丰富的 API。

## 1. 获取 Terra Draw 核心实例

无论是 `MaplibreTerradrawControl`（绘图控件）还是 `MaplibreMeasureControl`（测量控件），都暴露了 `getTerraDrawInstance()` 方法。这是我们在 Vue/JS 中进行高级操作的“钥匙”。

```javascript
// 从组件或地图实例中获取到控件对象
const drawControl = mapInitRef.value.getDrawControl();
// const measureControl = mapInitRef.value.getMeasureControl();

// 获取底层的 Terra Draw 实例
const drawInstance = drawControl.getTerraDrawInstance();
```

> ⚠️ **注意**：必须在地图 `load` 事件之后，且控件被挂载到地图上后，再去调用此方法，否则实例可能尚未初始化完毕。

## 2. 实例常用方法速查 (Instance API)

拿到 `drawInstance` 后，您可以调用以下常用的 Terra Draw API 来实现复杂的业务逻辑。这些方法可分为**数据操作**、**模式控制**两类。

### 2.1 数据提取与查询

#### `getSnapshot()`
- **说明**：获取当前画布上所有已绘制图形的 GeoJSON 数据集合。这是提交表单或保存数据最常用的方法。
- **返回值**：`FeatureCollection` 对象。
```javascript
const features = drawInstance.getSnapshot();
console.log('当前画布共有', features.length, '个图形');
// 转换为 JSON 字符串发送给后端
const jsonData = JSON.stringify(features);
```

#### `hasFeature(id)`
- **说明**：检查画布中是否存在指定 ID 的图形。
- **返回值**：`boolean`。
```javascript
const isExist = drawInstance.hasFeature('my-custom-id-001');
```

### 2.2 数据导入与清除

#### `addFeatures(features)`
- **说明**：将外部的 GeoJSON 数组加载到地图上（常用于数据回显）。
- **注意**：传入的 Feature 的 `properties` 中**必须包含 `mode` 字段**（如 `'polygon'`, `'linestring'`），以便引擎知道该图形由哪个模式接管和编辑。
```javascript
const mockData = [{
  id: 'unique-id-1',
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[113.1, 23.1], [113.2, 23.1], [113.2, 23.2], [113.1, 23.2], [113.1, 23.1]]]
  },
  properties: { mode: 'polygon' } // 必填：告知引擎作为多边形接管
}];

drawInstance.addFeatures(mockData);
```

#### `removeFeatures(ids)`
- **说明**：根据图形的 ID 数组，删除特定的图形。
```javascript
// 删除 ID 为 'unique-id-1' 和 'unique-id-2' 的图形
drawInstance.removeFeatures(['unique-id-1', 'unique-id-2']);
```

#### `clear()`
- **说明**：一键清空当前画布上的所有绘制和测量图形。常用于重置画布。
```javascript
drawInstance.clear();
```

### 2.3 模式与交互控制

#### `setMode(mode)`
- **说明**：编程式地切换当前的绘制或交互模式。调用此方法后，原生 UI 工具栏上对应的按钮会自动同步高亮状态。
- **常用参数**：`'select'` (选择模式，默认), `'point'`, `'linestring'`, `'polygon'`, `'circle'`, `'freehand'` 等。
```javascript
// 用户点击外部业务界面的“开始画线”按钮时触发
function startDrawLine() {
  drawInstance.setMode('linestring');
}

// 退出绘制状态
function stopDraw() {
  drawInstance.setMode('select');
}
```

#### `getMode()`
- **说明**：获取当前画布正处于哪种绘制或交互模式。
- **返回值**：`string`（如 `'select'`, `'polygon'` 等）。
```javascript
const currentMode = drawInstance.getMode();
if (currentMode !== 'select') {
    console.log(`当前正在绘制: ${currentMode}`);
}
```

## 3. 事件监听与解绑 (Event Listeners)

在复杂的交互中，我们需要实时捕获用户的动作（如画完了一个多边形，或者拖拽改变了多边形的一个顶点）来触发业务逻辑（如实时计算面积、弹窗提示等）。

### 3.1 绑定事件 (`on`)

通过 `drawInstance.on(event, callback)` 可以绑定各种底层事件：

```javascript
const drawInstance = drawControl.getTerraDrawInstance();

// 1. 监听图形绘制完成
// 触发时机：例如用户双击结束画多边形，或放置完一个点
const onFinish = (id, ctx) => {
    console.log(`[事件] 图形绘制完成, ID: ${id}, 模式: ${ctx.mode}`);
    // 此时通常会调用 getSnapshot() 获取最新数据同步到业务表单
};
drawInstance.on('finish', onFinish);

// 2. 监听图形发生变化
// 触发时机：用户在编辑模式下拖拽了图形的顶点、移动了整个图形等
drawInstance.on('change', (ids, type) => {
    console.log(`[事件] 图形发生了变化, 类型: ${type}, 影响的 IDs:`, ids);
});

// 3. 监听图形被选中
// 触发时机：在 'select' 模式下，用户点击了某个图形
drawInstance.on('select', (id) => {
    console.log(`[事件] 选中了图形 ID: ${id}`);
    const snapshot = drawInstance.getSnapshot();
    const selectedFeature = snapshot.find(feature => feature.id === id);
    console.log('选中的要素详情:', selectedFeature);
});

// 4. 监听取消选中
// 触发时机：用户点击了地图空白处，或选中了另一个图形导致前一个失焦
drawInstance.on('deselect', (id) => {
    console.log(`[事件] 取消选中了图形 ID: ${id}`);
});
```

### 3.2 解绑事件 (`off`)

在 Vue 3 等单页应用中，当地图组件被销毁时，**必须移除事件监听器**以防止内存泄漏和多次重复绑定。

```javascript
// 在组件卸载时移除特定的事件监听
onUnmounted(() => {
    if (drawInstance) {
        drawInstance.off('finish', onFinish);
    }
});
```

## 4. Vue 3 业务集成最佳实践

在 Vue 3 中集成 Terra Draw 的高级 API 时，建议遵循以下生命周期管理结构：

```vue
<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

const mapInitRef = ref();
let drawInstance = null;

// 统一的事件回调函数，方便解绑
const handleDrawFinish = (id, ctx) => {
    console.log('绘制完成:', id);
    const features = drawInstance.getSnapshot();
    // 同步到 Vue 响应式变量或发送给后端
};

// 假设这是通过某个按钮触发的初始化操作
const initAdvancedDraw = () => {
    const drawControl = mapInitRef.value?.getDrawControl();
    if (!drawControl) return;
    
    drawInstance = drawControl.getTerraDrawInstance();
    if (drawInstance) {
        // 绑定事件
        drawInstance.on('finish', handleDrawFinish);
    }
};

onUnmounted(() => {
    // 组件销毁时，务必清理底层事件监听
    if (drawInstance) {
        drawInstance.off('finish', handleDrawFinish);
    }
});
</script>
```
