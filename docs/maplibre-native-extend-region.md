# 使用 MapLibre 原生 API 实现延长线和生成区域

本文说明一种“完全不依赖当前 `managedTunnelPreview` 扩展”的实现方式：

- 直接使用 MapLibre 原生 API 动态创建临时 `source`
- 直接使用 MapLibre 原生 API 动态创建临时 `layer`
- 需要延长时更新临时数据
- 取消时直接删除整套临时图层和临时数据源

这份方案适合以下场景：

- 页面只在本页里临时预览，不需要跨页面复用
- 功能比较轻，不想先接入扩展体系
- 业务方更习惯直接控制 `addSource` / `addLayer` / `removeLayer`

## 一、先说结论

这种方式是可以实现的，而且对“单页、单功能、快速落地”的场景来说，通常更直接。

但要先想清楚一件事：

- 你可以不用“插件”
- 也可以不用“托管”这个词
- 但你依然需要区分两类数据

建议在文档和代码里统一叫：

- 业务数据：业务真正维护的数据
- 预览数据：临时生成、随时可以删掉的数据

如果不分这两类数据，后面会很容易混乱：

- 到底哪些东西是正式结果
- 哪些东西只是预览
- “取消”时到底删什么
- 点中临时线继续生成区域时要写回哪里

## 二、整体思路

原生 API 实现时，通常把页面里的数据分成两套：

### 1. 业务数据

业务页面自己维护：

- 正式 `GeoJSONSource`
- 正式 `LineLayer`
- 正式 `FillLayer`
- 对应的本地响应式数据

例如：

```ts
const businessGeoJson = ref(mapGeojson as MapCommonFeatureCollection);
```

### 2. 预览数据

由页面自己额外维护一套临时 `FeatureCollection`：

- 一条临时延长线
- 一个临时区域

并且配一套固定的临时 source / layer：

- `preview_source`
- `preview_line_layer`
- `preview_fill_layer`

### 3. 工作流程

用户点击正式线后：

1. 识别当前点中了哪一条线、哪一段线段
2. 计算临时延长线几何
3. 把临时延长线写入 `preview_source`
4. 如果还要生成区域，就继续基于当前线生成预览区域
5. 如果用户点击“取消”，就把 `preview_layer + preview_source` 整套删掉

## 三、最小数据结构

原生 API 方案里，建议在页面里准备下面这些状态：

```ts
import type { Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type {
  MapCommonFeature,
  MapCommonFeatureCollection,
  MapCommonLineFeature,
} from '@/components/MapLibre/map-common-tools';

/** 业务正式数据 */
const businessGeoJson = ref(mapGeojson as MapCommonFeatureCollection);

/** 当前临时预览数据 */
const previewGeoJson = ref<MapCommonFeatureCollection>({
  type: 'FeatureCollection',
  features: [],
});

/** 当前选中的正式线 */
const selectedLine = ref<MapCommonLineFeature | null>(null);

/** 当前选中的线段索引 */
const selectedSegmentIndex = ref<number>(-1);

/** 临时预览 source ID */
const PREVIEW_SOURCE_ID = 'native_tunnel_preview_source';

/** 临时预览线图层 ID */
const PREVIEW_LINE_LAYER_ID = 'native_tunnel_preview_line_layer';

/** 临时预览区域图层 ID */
const PREVIEW_FILL_LAYER_ID = 'native_tunnel_preview_fill_layer';
```

## 四、建议直接复用现有几何工具

即便你决定不用当前插件体系，也强烈建议继续复用现有的几何计算工具：

- `MapTunnelLineExtensionTool`
- `MapTunnelRegionTool`

原因很简单：

- 原生 API 只负责“地图上怎么加图层、删图层、改数据”
- 真正难的是“延长线怎么计算、区域怎么生成”

如果几何也重新自己写，重复工作会很多，而且更容易出现结果不一致。

所以推荐的分工是：

- 几何计算：继续复用现有工具类
- 地图渲染和清理：改用 MapLibre 原生 API

## 五、完整示例

下面给出一份可以直接参考的原生实现示例。

这份示例的目标是：

- 点中业务线后生成临时延长线
- 再基于当前线生成临时区域
- 取消时直接删除整套临时预览图层

```ts
import type {
  Map as MaplibreMap,
  AnyLayer,
  GeoJSONSource,
  LineLayerSpecification,
  FillLayerSpecification,
} from 'maplibre-gl';
import type {
  MapCommonFeature,
  MapCommonFeatureCollection,
  MapCommonLineFeature,
} from '@/components/MapLibre/map-common-tools';
import {
  MapTunnelLineExtensionTool,
  MapTunnelRegionTool,
} from '@/components/MapLibre/map-common-tools';

/** 临时预览 source ID */
const PREVIEW_SOURCE_ID = 'native_tunnel_preview_source';

/** 临时预览线图层 ID */
const PREVIEW_LINE_LAYER_ID = 'native_tunnel_preview_line_layer';

/** 临时预览区域图层 ID */
const PREVIEW_FILL_LAYER_ID = 'native_tunnel_preview_fill_layer';

/**
 * 原生预览管理器。
 * 只负责：
 * 1. 创建临时 source / layer
 * 2. 更新临时数据
 * 3. 清理临时图层
 *
 * 几何计算仍然交给现有工具类。
 */
export class NativeTunnelPreviewManager {
  /** 地图实例 */
  private map: MaplibreMap;

  /** 当前临时预览数据 */
  private previewData: MapCommonFeatureCollection = {
    type: 'FeatureCollection',
    features: [],
  };

  /**
   * 构造函数。
   * @param map 当前页面的 MapLibre 地图实例
   */
  constructor(map: MaplibreMap) {
    this.map = map;
  }

  /**
   * 确保临时预览 source 已存在。
   * 如果不存在，则先创建一个空的 GeoJSON source。
   */
  ensurePreviewSource(): void {
    if (this.map.getSource(PREVIEW_SOURCE_ID)) {
      return;
    }

    this.map.addSource(PREVIEW_SOURCE_ID, {
      type: 'geojson',
      data: this.previewData,
      promoteId: 'id',
    });
  }

  /**
   * 确保临时预览图层已存在。
   * 这里分别创建线图层和区域图层。
   */
  ensurePreviewLayers(): void {
    this.ensurePreviewSource();

    if (!this.map.getLayer(PREVIEW_FILL_LAYER_ID)) {
      const fillLayer: FillLayerSpecification = {
        id: PREVIEW_FILL_LAYER_ID,
        type: 'fill',
        source: PREVIEW_SOURCE_ID,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': '#fa8c16',
          'fill-opacity': 0.18,
          'fill-outline-color': '#ff7a00',
        },
      };

      this.map.addLayer(fillLayer as AnyLayer);
    }

    if (!this.map.getLayer(PREVIEW_LINE_LAYER_ID)) {
      const lineLayer: LineLayerSpecification = {
        id: PREVIEW_LINE_LAYER_ID,
        type: 'line',
        source: PREVIEW_SOURCE_ID,
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#fa8c16',
          'line-width': 5,
          'line-dasharray': [2, 1.2],
        },
      };

      this.map.addLayer(lineLayer as AnyLayer);
    }
  }

  /**
   * 获取临时预览 source。
   * @returns 命中的 GeoJSONSource；不存在时返回 null
   */
  getPreviewSource(): GeoJSONSource | null {
    return (this.map.getSource(PREVIEW_SOURCE_ID) as GeoJSONSource) || null;
  }

  /**
   * 将当前内存中的预览数据同步到地图。
   * 这里统一使用 setData 更新，不重复创建 source。
   */
  syncPreviewData(): void {
    this.ensurePreviewLayers();

    const previewSource = this.getPreviewSource();
    if (!previewSource) {
      return;
    }

    previewSource.setData(this.previewData);
  }

  /**
   * 替换整个预览数据集合。
   * @param nextData 最新预览数据
   */
  replacePreviewData(nextData: MapCommonFeatureCollection): void {
    this.previewData = JSON.parse(JSON.stringify(nextData));
    this.syncPreviewData();
  }

  /**
   * 获取当前内存中的预览数据。
   * @returns 当前预览 FeatureCollection
   */
  getPreviewData(): MapCommonFeatureCollection {
    return JSON.parse(JSON.stringify(this.previewData));
  }

  /**
   * 生成或替换临时延长线。
   * 注意：
   * 1. 这里只改预览数据，不改业务数据
   * 2. 旧预览线会被新预览线替换
   *
   * @param lineFeature 当前选中的业务线
   * @param segmentIndex 当前选中的线段索引
   * @param extendLengthMeters 本次延长长度（米）
   * @returns 最新生成的临时延长线；失败时返回 null
   */
  previewLine(
    lineFeature: MapCommonLineFeature,
    segmentIndex: number,
    extendLengthMeters: number
  ): MapCommonLineFeature | null {
    const nextLineFeature = MapTunnelLineExtensionTool.extendSelectedLineSegment(
      lineFeature,
      segmentIndex,
      extendLengthMeters
    );

    if (!nextLineFeature) {
      return null;
    }

    const nextFeatures = this.previewData.features.filter((feature) => {
      return feature.geometry?.type !== 'LineString';
    });

    nextFeatures.push(nextLineFeature);

    this.replacePreviewData({
      type: 'FeatureCollection',
      features: nextFeatures as MapCommonFeature[],
    });

    return nextLineFeature;
  }

  /**
   * 基于当前线生成或替换临时区域。
   * 注意：
   * 1. 这里只改预览数据，不改业务数据
   * 2. 默认按当前线替换旧区域，避免一直叠加
   *
   * @param lineFeature 当前用于生成区域的线
   * @param widthMeters 区域宽度（米）
   * @returns 是否生成成功
   */
  previewRegion(lineFeature: MapCommonLineFeature, widthMeters: number): boolean {
    const nextFeatures = MapTunnelRegionTool.replaceRegionFeatures(
      this.previewData.features as MapCommonFeature[],
      lineFeature,
      widthMeters,
      {
        generatedKind: 'native-preview-region',
      }
    );

    if (!nextFeatures) {
      return false;
    }

    this.replacePreviewData({
      type: 'FeatureCollection',
      features: nextFeatures,
    });

    return true;
  }

  /**
   * 清空预览数据，但保留预览 source / layer。
   * 适合频繁使用“生成 -> 取消 -> 再生成”的场景。
   */
  clearPreviewData(): void {
    this.previewData = {
      type: 'FeatureCollection',
      features: [],
    };
    this.syncPreviewData();
  }

  /**
   * 彻底销毁预览图层和预览数据源。
   * 适合点击“取消全部预览”或页面卸载时调用。
   *
   * 顺序必须注意：
   * 1. 先删 layer
   * 2. 再删 source
   */
  destroyPreviewLayers(): void {
    if (this.map.getLayer(PREVIEW_LINE_LAYER_ID)) {
      this.map.removeLayer(PREVIEW_LINE_LAYER_ID);
    }

    if (this.map.getLayer(PREVIEW_FILL_LAYER_ID)) {
      this.map.removeLayer(PREVIEW_FILL_LAYER_ID);
    }

    if (this.map.getSource(PREVIEW_SOURCE_ID)) {
      this.map.removeSource(PREVIEW_SOURCE_ID);
    }

    this.previewData = {
      type: 'FeatureCollection',
      features: [],
    };
  }
}
```

## 六、业务页面如何调用

下面给出一份业务页面里的最小调用流程。

### 1. 页面初始化时创建管理器

```ts
import { useMap } from 'vue-maplibre-gl';

const map = useMap();
let nativePreviewManager: NativeTunnelPreviewManager | null = null;

/**
 * 地图加载完成后初始化原生预览管理器。
 */
const initNativePreviewManager = (): void => {
  if (!map.map) {
    return;
  }

  nativePreviewManager = new NativeTunnelPreviewManager(map.map);
};
```

### 2. 点击“延长巷道”时

```ts
/**
 * 原生方式生成临时延长线。
 * @param selectedLine 当前选中的业务线
 * @param segmentIndex 当前选中的线段索引
 * @param extendLengthMeters 需要延长的长度
 */
const handlePreviewLineByNativeApi = (
  selectedLine: MapCommonLineFeature,
  segmentIndex: number,
  extendLengthMeters: number
) => {
  if (!nativePreviewManager) {
    ElMessage.warning('预览管理器尚未初始化');
    return;
  }

  const nextLineFeature = nativePreviewManager.previewLine(
    selectedLine,
    segmentIndex,
    extendLengthMeters
  );

  if (!nextLineFeature) {
    ElMessage.warning('当前线段无法继续延长');
    return;
  }

  ElMessage.success('已生成临时延长线');
};
```

### 3. 点击“生成区域”时

```ts
/**
 * 原生方式生成临时区域。
 * @param lineFeature 当前要参与生成区域的线
 * @param widthMeters 区域宽度
 */
const handlePreviewRegionByNativeApi = (
  lineFeature: MapCommonLineFeature,
  widthMeters: number
) => {
  if (!nativePreviewManager) {
    ElMessage.warning('预览管理器尚未初始化');
    return;
  }

  const success = nativePreviewManager.previewRegion(lineFeature, widthMeters);
  if (!success) {
    ElMessage.warning('区域生成失败，请检查线要素几何是否有效');
    return;
  }

  ElMessage.success('已生成临时区域');
};
```

### 4. 点击“取消”时

有两种常见做法：

#### 做法 A：只清空数据，不删图层

适合用户会频繁反复操作的页面。

```ts
/**
 * 只清空临时预览数据，不删除预览图层。
 */
const handleClearPreviewByNativeApi = () => {
  if (!nativePreviewManager) {
    return;
  }

  nativePreviewManager.clearPreviewData();
  ElMessage.success('已清空临时预览数据');
};
```

#### 做法 B：直接删整套图层

适合你提到的这种思路：“取消时直接把整个图层删了完事”。

```ts
/**
 * 直接删除整套临时预览图层和预览数据源。
 */
const handleDestroyPreviewByNativeApi = () => {
  if (!nativePreviewManager) {
    return;
  }

  nativePreviewManager.destroyPreviewLayers();
  ElMessage.success('已删除整套临时预览图层');
};
```

## 七、这种原生方案的优点

### 1. 业务侧更直观

业务同学更容易理解这套模型：

- 我自己维护一份业务数据
- 我再用原生 API 额外挂一套预览层
- 预览时更新临时 source
- 取消时删 layer/source

### 2. 本页能力改动更快

如果功能只在一个页面里使用：

- 不用先设计扩展协议
- 不用先抽公共 API
- 不用先想容器层要不要承接

### 3. 调试更直接

在浏览器控制台里直接就能看到：

- `map.getSource(PREVIEW_SOURCE_ID)`
- `map.getLayer(PREVIEW_LINE_LAYER_ID)`
- 当前 `setData()` 的内容

## 八、这种原生方案的缺点

### 1. 复杂度会回到业务页

一开始看起来省事，但随着功能变多，业务页会慢慢承担这些工作：

- 临时 source/layer 的创建和销毁
- 旧预览替换规则
- 区域跟随预览线更新
- 事件绑定和解绑
- 页面卸载清理

### 2. 多页面复用会比较难

如果多个页面都要这个能力：

- 每个页面都可能自己维护一套临时图层逻辑
- 命名规范和清理方式容易不一致
- 修一个 bug 需要改很多处

### 3. 多数据源时容易把逻辑写乱

如果页面里同时有：

- 多个业务数据源
- 临时预览线
- 临时预览区域

那么业务页还是需要自己维护“业务数据 / 预览数据”的分层。

所以不是说用了原生 API，就不需要这些概念了。
只是这些概念不再由扩展体系帮你承接，而是业务页自己承接。

## 九、什么时候建议用原生 API

建议用原生 API 的情况：

- 当前页面只是临时做一个轻量预览功能
- 只有一个页面会用
- 不想先抽公共层
- 页面团队对 MapLibre 原生 API 很熟

不太建议用原生 API 的情况：

- 这个能力后面会扩到多个页面
- 后面还会加更多临时图形能力
- 希望业务页尽量轻
- 希望“旧预览替换、统一清理、属性写回”都走统一机制

## 十、最实用的折中建议

如果你们决定走原生 API，我建议不要“完全从零重写”，而是采用下面这个折中方案：

- 地图图层生命周期：用原生 API
- 几何计算：继续复用 `MapTunnelLineExtensionTool` 和 `MapTunnelRegionTool`
- 数据分层：继续保留“业务数据 / 预览数据”这两个概念

这样既能保持业务页实现直观，也不会把几何算法重复造一遍。

## 十一、你最关心的那个问题

> 当有需要延长时，直接使用 maplibre-gl 原生 api 创建临时图层，取消时直接把整个图层删了完事。这样会不会更方便？

答案是：

- 对单页、轻量场景，可能会更方便
- 对中长期维护，不一定更方便

更准确地说：

- 短期开发体验可能更直接
- 长期复杂度会回到业务页

所以这不是“能不能”，而是“值不值得”。
