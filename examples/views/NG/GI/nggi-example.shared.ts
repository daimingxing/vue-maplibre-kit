import { ref } from "vue";
import type { Ref } from "vue";
import type { LngLatLike } from "maplibre-gl";
import {
  createLayerGroup,
  createMapBusinessSource,
  createMapBusinessSourceRegistry,
  createMapControlsPreset,
  createSimpleCircleStyle,
  createSimpleFillStyle,
  createSimpleLineStyle,
  type MapBusinessLayerDescriptor,
  type MapBusinessSource,
  type MapBusinessSourceRegistry,
  type MapCommonFeature,
  type MapCommonFeatureCollection,
  type MapCommonLineFeature,
  type MapControlsConfig,
  type MapFeaturePropertyPolicy,
  type MapLayerInteractiveOptions,
  type MapOptions,
} from "vue-maplibre-kit/business";

export const EXAMPLE_SOURCE_ID = "nggi-example-source";
export const EXAMPLE_POINT_LAYER_ID = "nggi-example-point-layer";
export const EXAMPLE_LINE_LAYER_ID = "nggi-example-line-layer";
export const EXAMPLE_FILL_LAYER_ID = "nggi-example-fill-layer";

// 深圳附近经纬度仅用于本地示例定位，避免依赖外部底图服务。
const BASE_LNG = 113.9;
const BASE_LAT = 22.5;
// 单步偏移用于快速生成示例几何，约等于几公里范围内的小幅位移。
const COORD_STEP = 0.035;
// 示例首屏缩放级别，保证点线面同时落在视口中。
const START_ZOOM = 10;

export interface ExampleKit {
  mapOptions: Partial<MapOptions & { mapStyle: object }>;
  controls: MapControlsConfig;
  layers: MapBusinessLayerDescriptor[];
  sourceData: Ref<MapCommonFeatureCollection>;
  source: MapBusinessSource;
  registry: MapBusinessSourceRegistry;
}

/**
 * 根据相对步长生成示例坐标。
 * @param x 经度方向步长
 * @param y 纬度方向步长
 * @returns 可直接给 GeoJSON 使用的坐标
 */
export function createCoord(x: number, y: number): [number, number] {
  return [BASE_LNG + x * COORD_STEP, BASE_LAT + y * COORD_STEP];
}

/**
 * 创建无外部瓦片依赖的空白地图样式。
 * @returns MapLibre 样式对象
 */
export function createBlankStyle() {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "nggi-example-bg",
        type: "background",
        paint: {
          "background-color": "#eef2f3",
        },
      },
    ],
  };
}

/**
 * 创建示例地图初始化参数。
 * @returns 地图初始化参数
 */
export function createExampleMapOptions(): Partial<MapOptions & { mapStyle: object }> {
  return {
    mapStyle: createBlankStyle(),
    center: createCoord(0, 0) as LngLatLike,
    zoom: START_ZOOM,
  };
}

/**
 * 创建示例控件预设。
 * @param preset 控件预设名称
 * @returns 已显式开启的控件配置
 */
export function createExampleControls(
  preset: "minimal" | "basic" | "draw" | "full" = "minimal"
): MapControlsConfig {
  return createMapControlsPreset(preset, {
    MglNavigationControl: { isUse: true, position: "top-left" },
    MglScaleControl: { isUse: true, position: "bottom-left" },
    MglFullscreenControl: { isUse: preset === "basic" || preset === "full" },
    MaplibreTerradrawControl: {
      isUse: preset === "draw" || preset === "full",
      position: "top-left",
      snapping: true,
    },
    MaplibreMeasureControl: {
      isUse: preset === "draw" || preset === "full",
      position: "top-right",
      snapping: true,
    },
  });
}

/**
 * 创建示例点要素。
 * @param id 业务 ID
 * @param name 显示名称
 * @param x 经度方向步长
 * @param y 纬度方向步长
 * @returns 点要素
 */
export function createPointFeature(
  id: string,
  name: string,
  x: number,
  y: number
): MapCommonFeature {
  return {
    type: "Feature",
    id,
    properties: {
      id,
      name,
      status: "normal",
      kind: "point",
      editable: "可以编辑",
    },
    geometry: {
      type: "Point",
      coordinates: createCoord(x, y),
    },
  };
}

/**
 * 创建示例线要素。
 * @param id 业务 ID
 * @param name 显示名称
 * @param coords 相对步长坐标
 * @returns 线要素
 */
export function createLineFeature(
  id: string,
  name: string,
  coords: Array<[number, number]>
): MapCommonLineFeature {
  return {
    type: "Feature",
    id,
    properties: {
      id,
      name,
      status: "normal",
      kind: "line",
      editable: "可以编辑",
    },
    geometry: {
      type: "LineString",
      coordinates: coords.map(([x, y]) => createCoord(x, y)),
    },
  };
}

/**
 * 创建示例面要素。
 * @param id 业务 ID
 * @param name 显示名称
 * @returns 面要素
 */
export function createFillFeature(id: string, name: string): MapCommonFeature {
  const ring = [
    createCoord(-1.6, -0.5),
    createCoord(-0.8, -0.7),
    createCoord(-0.6, 0.2),
    createCoord(-1.5, 0.4),
    createCoord(-1.6, -0.5),
  ];

  return {
    type: "Feature",
    id,
    properties: {
      id,
      name,
      status: "normal",
      kind: "area",
      editable: "可以编辑",
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

/**
 * 创建混合业务数据。
 * @returns 示例 FeatureCollection
 */
export function createMixedData(): MapCommonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      createPointFeature("point-a", "巡检点 A", -1, 1),
      createPointFeature("point-b", "巡检点 B", 1, 0.8),
      createLineFeature("line-a", "管线 A", [
        [-1.5, -1],
        [0, 0.2],
        [1.4, -0.8],
      ]),
      createLineFeature("line-b", "管线 B", [
        [-1.2, 0.9],
        [0.2, -0.3],
        [1.3, 0.9],
      ]),
      createFillFeature("area-a", "作业面 A"),
    ],
  };
}

/**
 * 创建示例业务图层。
 * @returns 业务图层描述数组
 */
export function createExampleLayers(): MapBusinessLayerDescriptor[] {
  return createLayerGroup({
    defaultPolicy: {
      readonlyKeys: ["id"],
      fixedKeys: ["name", "status"],
      removableKeys: ["editable"],
    },
    layers: [
      {
        type: "fill",
        id: EXAMPLE_FILL_LAYER_ID,
        geometryTypes: ["Polygon", "MultiPolygon"],
        style: createSimpleFillStyle({
          color: "#79b8ff",
          opacity: 0.35,
          outlineColor: "#1f6feb",
        }),
      },
      {
        type: "line",
        id: EXAMPLE_LINE_LAYER_ID,
        geometryTypes: ["LineString", "MultiLineString"],
        style: createSimpleLineStyle({
          color: "#0f766e",
          width: 4,
          opacity: 0.9,
        }),
      },
      {
        type: "circle",
        id: EXAMPLE_POINT_LAYER_ID,
        geometryTypes: ["Point", "MultiPoint"],
        style: createSimpleCircleStyle({
          color: "#f97316",
          radius: 7,
          opacity: 0.9,
          strokeColor: "#ffffff",
          strokeWidth: 2,
        }),
      },
    ],
  });
}

/**
 * 创建业务 source 与注册表。
 * @param data 业务数据引用
 * @param layers 图层描述数组
 * @param policy source 级属性治理规则
 * @returns source 与注册表
 */
export function createExampleSourceKit(
  data: Ref<MapCommonFeatureCollection>,
  layers: MapBusinessLayerDescriptor[],
  policy?: MapFeaturePropertyPolicy
) {
  const source = createMapBusinessSource({
    sourceId: EXAMPLE_SOURCE_ID,
    data,
    promoteId: "id",
    propertyPolicy: policy,
    layers,
  });
  const registry = createMapBusinessSourceRegistry([source]);

  return { source, registry };
}

/**
 * 创建最常用的示例组合。
 * @param preset 控件预设名称
 * @returns 示例页面可直接使用的组合对象
 */
export function createExampleKit(
  preset: "minimal" | "basic" | "draw" | "full" = "minimal"
): ExampleKit {
  const sourceData = ref(createMixedData());
  const layers = createExampleLayers();
  const { source, registry } = createExampleSourceKit(sourceData, layers);

  return {
    mapOptions: createExampleMapOptions(),
    controls: createExampleControls(preset),
    layers,
    sourceData,
    source,
    registry,
  };
}

/**
 * 创建普通业务图层交互配置。
 * @param onText 接收交互说明文本的回调
 * @returns 普通图层交互配置
 */
export function createExampleInteractive(
  onText: (text: string) => void
): MapLayerInteractiveOptions {
  return {
    enabled: true,
    layers: {
      [EXAMPLE_POINT_LAYER_ID]: { hitPriority: 30 },
      [EXAMPLE_LINE_LAYER_ID]: { hitPriority: 20 },
      [EXAMPLE_FILL_LAYER_ID]: { hitPriority: 10 },
    },
    onClick: (context) => {
      const name = String(context.properties?.name || "空白区域");
      onText(`点击：${name}`);
    },
    onHoverEnter: (context) => {
      const name = String(context.properties?.name || "未知要素");
      onText(`移入：${name}`);
    },
    onBlankClick: () => {
      onText("点击：空白区域");
    },
  };
}
