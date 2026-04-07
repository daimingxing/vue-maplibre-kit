# 延长巷道与生成区域接入说明

本文教你如何在业务页面里接入下面两个功能：
- **延长巷道**：选中一条线，输入长度，地图上生成一条【临时的虚线】给你看效果。
- **生成区域**：选中一条线，输入宽度，生成一个【面】。

> **核心原则**：如果在"正式实线"上生成区域，面会直接存入数据库(正式数据源)；如果在"临时虚线"上生成区域，面只用来预览，点取消就全没了。

## 先搞懂两个核心概念

### 1. 正式数据 (Business Data)
你在 Vue 的 `template` 里亲手写出来的那些图层（比如 `mgl-geo-json-source` 和 `mgl-line-layer`）。
这些数据是你自己维护的，通常来自于后端接口，代表着**真实的业务结果**。

### 2. 临时预览数据 (Preview Data)
为了让你能"预览"延长效果，地图组件(`map-libre-init`)在内部**偷偷建了一个隐藏的数据源和图层**。
你不需要在模板里写它们。当你点击"延长巷道"时，插件会把虚线画在这个隐藏图层上。

### 3. 为什么要分得这么清楚？
因为同样是"生成区域"按钮，点在不同的线上，结果不一样：
- 鼠标点击【正式线】 ➔ 点生成区域 ➔ 面直接存到【正式数据】里。
- 鼠标点击【临时虚线】 ➔ 点生成区域 ➔ 面存到【临时预览池】里。
- 点击【取消临时延长】 ➔ 只有【临时预览池】会被清空，你的正式数据绝对安全。

## 一、业务层最小必需代码块

### 1. 引入地图容器、类型和扩展工厂

```ts
import MapLibreInit from '@/components/MapLibre/mapLibre-init.vue';
import type { MapLibreInitExpose } from '@/components/MapLibre/mapLibre-init.types';
import {
  createManagedTunnelPreviewExtension,
  MANAGED_TUNNEL_PREVIEW_EXTENSION_TYPE,
} from '@/components/MapLibre/extensions/managedTunnelPreview';
import {
  MapTunnelLineExtensionTool,
  MapTunnelRegionTool,
  createMapSourceFeatureRef,
  type MapCommonFeatureCollection,
  type MapCommonFeature,
  type MapCommonLineFeature,
  type MapSourceFeatureRef,
} from '@/components/MapLibre/map-common-tools';
import type {
  MapLayerInteractiveContext,
  MapLayerInteractiveOptions,
} from '@/components/MapLibre/mapLibre-contols-types';
import { MANAGED_TUNNEL_PREVIEW_SOURCE_ID } from '@/components/MapLibre/useManagedTunnelPreview';
```

### 2. 准备正式数据源

这里准备的都是“正式数据源”。
也就是说，这些数据代表业务当前真实状态，不是托管预览池里的临时数据。

单数据源时：

```ts
import mapGeojson from '../../../../docs/map.geojson';

const PRIMARY_SOURCE_ID = 'test_geojson_source';
const PRIMARY_LINE_LAYER_ID = 'lineLayer';

const test_geojson = ref<MapCommonFeatureCollection>(mapGeojson as MapCommonFeatureCollection);
```

多数据源时：

```ts
import mapGeojson from '../../../../docs/map.geojson';
import mapGeojson2 from '../../../../docs/map2.geojson';

const PRIMARY_SOURCE_ID = 'test_geojson_source';
const SECONDARY_SOURCE_ID = 'test_geojson_source_secondary';
const PRIMARY_LINE_LAYER_ID = 'lineLayer';
const SECONDARY_LINE_LAYER_ID = 'lineLayerSecondary';

const test_geojson = ref<MapCommonFeatureCollection>(mapGeojson as MapCommonFeatureCollection);
const test_geojson_secondary = ref<MapCommonFeatureCollection>(
  mapGeojson2 as MapCommonFeatureCollection
);
```

### 3. 把页面里的 GeoJSON 变量登记到表里

这个表非常重要！
它的作用是：当系统需要**修改**地图上的数据时（比如把新生成的区域面保存下来），系统可以通过 `sourceId` 在这个表里找到对应的 `ref` 变量，从而更新 Vue 的响应式数据。

> **注意**：这里只登记你自己的"正式数据"，不需要管插件内部的"临时预览数据"。

```ts
const mapSourceGeoJsonRefMap: Record<string, Ref<MapCommonFeatureCollection>> = {
  [PRIMARY_SOURCE_ID]: test_geojson,
  [SECONDARY_SOURCE_ID]: test_geojson_secondary,
};

/**
 * 根据 sourceId 读取正式业务数据源引用。
 * 这里只处理正式数据源，不处理托管预览池。
 * @param sourceId 正式业务 source ID
 * @returns 命中的响应式 GeoJSON 数据引用
 */
const getGeoJsonRefBySourceId = (
  sourceId: string | null | undefined
): Ref<MapCommonFeatureCollection> | null => {
  if (!sourceId) {
    return null;
  }

  return mapSourceGeoJsonRefMap[sourceId] || null;
};
```

### 4. 开启并配置"临时延长巷道"功能

```ts
const managedTunnelPreviewExtension = createManagedTunnelPreviewExtension({
  enabled: true, // 开启功能
  // 让"临时延长线"表现得和"正式线"一模一样（鼠标放上去变小手、能点击弹出同一个面板）
  inheritInteractiveFromLayerId: PRIMARY_LINE_LAYER_ID, 
  styleOverrides: {
    line: {
      paint: {
        // 把临时延长线改成红/橙色，以区分正式的蓝色巷道
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#ff4d4f',
          '#fa8c16',
        ],
      },
    },
  },
});

const mapExtensions = [managedTunnelPreviewExtension];
```

说明：
- `inheritInteractiveFromLayerId` 填一个正式线图层的 ID。填了它，临时延长线就能自动获得点击和 Hover 的能力，你不用再给临时线单独写点击事件了。

### 5. 模板里挂载 `extensions`

```vue
<map-libre-init
  ref="mapInitRef"
  :mapOptions="mapOptions"
  :controls="mapControls"
  :mapInteractive="mapInteractive"
  :extensions="mapExtensions"
  @extensionStateChange="handleExtensionStateChange"
>
  <template #dataSource>
    <mgl-geo-json-source :sourceId="PRIMARY_SOURCE_ID" :data="test_geojson" promoteId="id">
      <mgl-line-layer :layer-id="PRIMARY_LINE_LAYER_ID" :layout="lineLayout" :paint="linePaint" />
    </mgl-geo-json-source>

    <mgl-geo-json-source
      :sourceId="SECONDARY_SOURCE_ID"
      :data="test_geojson_secondary"
      promoteId="id"
    >
      <mgl-line-layer
        :layer-id="SECONDARY_LINE_LAYER_ID"
        :layout="lineLayout"
        :paint="linePaint"
      />
    </mgl-geo-json-source>
  </template>
</map-libre-init>
```

说明：

- `promoteId="id"` 必须保留，否则 `feature-state` 和统一交互无法稳定工作
- 多 source 场景下，每个正式 source 都要有自己的 `sourceId`
- 托管预览 source 不需要业务层自己写模板，容器会内部自动挂载

### 6. 配置线图层交互

```ts
const mapInteractive: MapLayerInteractiveOptions = {
  enabled: true,
  onClick: (context) => {
    if (!context.feature) {
      return;
    }

    openMapFeaturePopup(context);
  },
  layers: {
    [PRIMARY_LINE_LAYER_ID]: {
      cursor: 'pointer',
      enableFeatureStateHover: true,
    },
    [SECONDARY_LINE_LAYER_ID]: {
      cursor: 'pointer',
      enableFeatureStateHover: true,
    },
  },
};
```

## 二、必须保留的三个"找数据"工具方法

### 1. 把点击事件转换成一个"地址标签"

```ts
/**
 * 当用户点击地图上的某条线时，这个方法会把点击信息提炼成一个"地址标签"。
 * 这个标签只记录两件事：
 * 1. 它属于哪个数据源 (sourceId)
 * 2. 它的编号是多少 (featureId)
 *
 * 不管点的是"正式实线"还是"临时虚线"，都能转换成这个标签。
 */
const getFeatureRef = (
  context:
    | Pick<MapLayerInteractiveContext, 'sourceId' | 'featureId'>
    | {
        sourceId?: string | null;
        featureId?: string | number | null;
      }
    | null
    | undefined
): MapSourceFeatureRef | null => {
  return createMapSourceFeatureRef(context?.sourceId || null, context?.featureId ?? null);
};
```

### 2. 拿着"地址标签"去拿最新的完整数据

```ts
/**
 * 拿着上面的"地址标签"，去数据源里把最新的完整数据找出来。
 * 这个方法很聪明，它会根据 sourceId 自动判断：
 * - 如果这是个"正式数据"，它就去我们登记的 mapSourceGeoJsonRefMap 里找。
 * - 如果这是个"临时预览数据"，它就去托管预览池里找。
 */
const getFeatureByRef = (
  featureRef: MapSourceFeatureRef | null
): MapCommonFeature | null => {
  if (!featureRef?.sourceId || featureRef.featureId === null) {
    return null;
  }

  // 1. 如果它是临时预览数据，去插件内部找
  if (featureRef.sourceId === MANAGED_TUNNEL_PREVIEW_SOURCE_ID) {
    return mapInitRef.value?.extensions?.managedTunnelPreview?.getFeatureById?.(featureRef.featureId) || null;
  }

  // 2. 如果它是正式数据，去咱们自己的变量里找
  const geoJsonRef = getGeoJsonRefBySourceId(featureRef.sourceId);
  if (!geoJsonRef) {
    return null;
  }

  return (
    (geoJsonRef.value.features as MapCommonFeature[]).find((feature) => {
      return (feature.properties?.id ?? feature.id ?? null) === featureRef.featureId;
    }) || null
  );
};
```

### 3. 获取当前准备操作的那条线

```ts
/**
 * 当用户点击"延长巷道"或者"生成区域"时，我们需要知道他要操作的是哪条线。
 * 调用这个方法，就能拿到那条线的最新数据。
 *
 * 这个方法不在乎拿出来的是"正式线"还是"临时虚线"，反正只要是线就行。
 */
const getSelectedLine = (): MapCommonLineFeature | null => {
  const selectedFeatureContext = mapInitRef.value?.getSelectedMapFeatureContext?.() || null;
  const selectedFeatureRef = getFeatureRef(selectedFeatureContext);

  const latestFeature =
    getFeatureByRef(selectedFeatureRef) ||
    mapInitRef.value?.getSelectedMapFeatureSnapshot?.() ||
    null;

  return latestFeature?.geometry?.type === 'LineString'
    ? (latestFeature as MapCommonLineFeature)
    : null;
};
```

## 三、两个业务按钮的写法

### 1. 点击【延长巷道】按钮

```ts
/**
 * 这个方法不会直接修改你的"正式数据"。
 * 它只是告诉插件："我要在这条线的这个位置，按这个方向延长这么多米"。
 * 然后插件会自动在地图上画出一条【临时延长线】（虚线）。
 */
const handleExtendTunnelLine = (): void => {
  const selectedLineFeature = getSelectedLine();
  if (!selectedLineFeature) {
    ElMessage.warning('当前未选中可操作的线要素');
    return;
  }

  // 告诉插件生成虚线
  const nextLineFeature = mapInitRef.value?.extensions?.managedTunnelPreview?.previewLine?.({
    lineFeature: selectedLineFeature,
    segmentIndex: popupState.selectedSegmentIndex,
    extendLengthMeters: lineActionForm.extendLengthMeters,
  });

  if (!nextLineFeature) {
    ElMessage.warning('当前线段无法继续延长');
    return;
  }

  syncLinePopupMetrics(nextLineFeature, 0);
  ElMessage.success('已生成临时延长线');
};
```

### 2. 点击【生成区域】按钮

```ts
/**
 * 核心逻辑：
 * 1. 如果选中的是"临时虚线"，生成的区域就放到"临时预览池"里（这样点取消时能一起清掉）
 * 2. 如果选中的是"正式线"，生成的区域就保存到"正式数据源"里（真切地修改了业务数据）
 */
const handleGenerateTunnelRegion = (): void => {
  const selectedLineFeature = getSelectedLine();
  const selectedFeatureContext = mapInitRef.value?.getSelectedMapFeatureContext?.() || null;

  if (!selectedLineFeature) {
    ElMessage.warning('当前未选中可操作的线要素');
    return;
  }

  // 分支1：点的是临时虚线 ➔ 交给插件自己玩
  if (mapInitRef.value?.extensions?.managedTunnelPreview?.isSelectedFeature?.()) {
    const success = mapInitRef.value?.extensions?.managedTunnelPreview?.replacePreviewRegion?.({
      lineFeature: selectedLineFeature,
      widthMeters: lineActionForm.widthMeters,
    });

    if (!success) {
      ElMessage.warning('区域生成失败，请检查线要素几何是否有效');
      return;
    }

    ElMessage.success('已生成临时预览区域');
    return;
  }

  // 分支2：点的是正式线 ➔ 修改我们自己的业务数据
  if (!selectedFeatureContext?.sourceId) {
    ElMessage.warning('当前正式线要素缺少来源数据源');
    return;
  }

  const geoJsonRef = getGeoJsonRefBySourceId(selectedFeatureContext.sourceId);
  if (!geoJsonRef) {
    ElMessage.warning(`未找到数据源 '${selectedFeatureContext.sourceId}' 的本地引用`);
    return;
  }

  const nextFeatures = MapTunnelRegionTool.replaceRegionFeatures(
    geoJsonRef.value.features as MapCommonFeature[],
    selectedLineFeature,
    lineActionForm.widthMeters
  );

  if (!nextFeatures) {
    ElMessage.warning('区域生成失败，请检查线要素几何是否有效');
    return;
  }

  geoJsonRef.value = {
    ...geoJsonRef.value,
    features: nextFeatures,
  } as MapCommonFeatureCollection;
};
```

## 四、高级：怎么知道某条临时线是哪来的？

如果你的页面里有【主巷道】和【副巷道】两条正式线。
当你点击它们各自延伸出来的临时虚线时，你肯定想知道："这条虚线到底属于主巷道还是副巷道？"

此时，你**不能**再用 `context.sourceId` 去判断了，因为点击虚线时，`context.sourceId` 永远等于临时预览池的 ID。

你应该去看这条虚线身上的"胎记"：

```ts
// 比如在 onClick 回调里
const previewProperties = context.feature?.properties || {};

// 提取它的胎记：它原本是哪个图层的哪条线生出来的
const originSourceId = previewProperties.managedPreviewOriginSourceId;

if (originSourceId === 'test_geojson_source') {
    console.log("这是【主巷道】的延长线");
} else if (originSourceId === 'test_geojson_source_secondary') {
    console.log("这是【副巷道】的延长线");
}
```

## 五、接入时最容易漏掉的点

### 必须保留

- `:extensions="mapExtensions"`
- `promoteId="id"`
- 正式线图层在 `mapInteractive.layers` 中注册
- 多正式 source 时，保留 `sourceId -> GeoJSON ref` 的映射
- 弹窗或操作面板中保留“当前选中线段索引”

### 不要再这么做

- 不要只按裸 `featureId` 全局查正式要素
- 不要用托管预览 `context.sourceId` 判断它原来来自哪个正式 source
- 不要把多个正式 source 的正式要素都写回同一个 `geoJsonRef`
