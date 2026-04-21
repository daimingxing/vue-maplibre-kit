# Intersection Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为地图增加交点临时操作层，支持业务线 `all` / `selected` 两种求交范围、交点图层交互，以及把交点上下文转换为正式点要素。

**Architecture:** 以“纯计算层 + 交点派生插件层 + facade / export 接入层”的三层结构实现。纯计算层产出稳定交点领域对象，插件层负责维护临时点图层与交互上下文，门面层负责将交点能力纳入现有 `useBusinessMap` 和公开出口，同时保留独立业务点 source 的正式落点链路。

**Tech Stack:** Vue 3, TypeScript, Vitest, MapLibre plugin host, GeoJSON shared tools

---

## File Map

### Create

- `src/MapLibre/shared/map-intersection-tools.ts`
  - 负责交点领域模型、稳定 ID、线段求交和 `Point Feature` 转换工具。
- `src/MapLibre/shared/map-intersection-tools.spec.ts`
  - 负责纯计算层与正式点要素转换工具测试。
- `src/MapLibre/plugins/intersection-preview/types.ts`
  - 负责交点插件配置类型、样式类型和状态类型。
- `src/MapLibre/plugins/intersection-preview/IntersectionPreviewLayers.vue`
  - 负责交点临时点图层渲染。
- `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewStore.ts`
  - 负责交点临时 `FeatureCollection`、刷新、显隐和选中态存储。
- `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.ts`
  - 负责插件控制器、交互上下文组装和 API 暴露。
- `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`
  - 负责插件控制器测试。
- `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.ts`
  - 负责插件实例适配到插件宿主。
- `src/MapLibre/plugins/intersection-preview/index.ts`
  - 负责交点插件公开入口。
- `src/MapLibre/facades/useIntersectionPreview.ts`
  - 负责 facade 访问交点插件状态与 API。
- `src/MapLibre/facades/useIntersectionPreview.spec.ts`
  - 负责 facade 测试。
- `src/plugins/intersection-preview.ts`
  - 负责子路径公开出口。

### Modify

- `src/geometry.ts`
  - 暴露交点正式点要素转换工具。
- `src/MapLibre/facades/mapPluginResolver.ts`
  - 增加交点插件 API / state 解析。
- `src/MapLibre/facades/useBusinessMap.ts`
  - 将交点能力挂入业务聚合门面。
- `src/MapLibre/facades/useBusinessMap.spec.ts`
  - 增加交点门面接入断言。
- `src/index.ts`
  - 暴露交点 facade、公共类型和转换工具。
- `src/business.ts`
  - 暴露业务主入口的交点能力与类型。
- `package.json`
  - 增加交点插件子路径导出。

## Task 1: 写纯计算层交点测试并确认失败

**Files:**
- Create: `src/MapLibre/shared/map-intersection-tools.spec.ts`
- Modify: 无
- Test: `src/MapLibre/shared/map-intersection-tools.spec.ts`

- [ ] **Step 1: 写交点计算失败测试**

```ts
import { describe, expect, it } from 'vitest';
import type { MapCommonFeature, MapCommonLineFeature } from './map-common-tools';
import {
  buildIntersectionPointFeature,
  collectLineIntersections,
} from './map-intersection-tools';

function createLineFeature(
  id: string,
  coordinates: [number, number][],
  sourceId = 'line-source',
  layerId = 'line-layer'
): MapCommonLineFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      sourceId,
      layerId,
      name: id,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

describe('collectLineIntersections', () => {
  it('会为两条业务线生成稳定交点对象', () => {
    const left = createLineFeature('line-a', [
      [0, 0],
      [10, 10],
    ]);
    const right = createLineFeature('line-b', [
      [0, 10],
      [10, 0],
    ]);

    const intersections = collectLineIntersections({
      scope: 'all',
      candidates: [
        {
          feature: left,
          ref: { sourceId: 'line-source', featureId: 'line-a', layerId: 'line-layer' },
        },
        {
          feature: right,
          ref: { sourceId: 'line-source', featureId: 'line-b', layerId: 'line-layer' },
        },
      ],
      includeEndpoint: true,
      coordDigits: 6,
      ignoreSelf: true,
    });

    expect(intersections).toHaveLength(1);
    expect(intersections[0].intersectionId).toContain('intersection:line-source:line-a');
    expect(intersections[0].point).toEqual({ lng: 5, lat: 5 });
    expect(intersections[0].leftRef.featureId).toBe('line-a');
    expect(intersections[0].rightRef.featureId).toBe('line-b');
  });

  it('在 selected 模式下只返回当前选中线与候选线的交点', () => {
    const selected = createLineFeature('line-selected', [
      [0, 0],
      [10, 0],
    ]);
    const hit = createLineFeature('line-hit', [
      [5, -5],
      [5, 5],
    ]);
    const miss = createLineFeature('line-miss', [
      [20, -5],
      [20, 5],
    ]);

    const intersections = collectLineIntersections({
      scope: 'selected',
      selectedRef: { sourceId: 'line-source', featureId: 'line-selected', layerId: 'line-layer' },
      candidates: [
        {
          feature: selected,
          ref: { sourceId: 'line-source', featureId: 'line-selected', layerId: 'line-layer' },
        },
        {
          feature: hit,
          ref: { sourceId: 'line-source', featureId: 'line-hit', layerId: 'line-layer' },
        },
        {
          feature: miss,
          ref: { sourceId: 'line-source', featureId: 'line-miss', layerId: 'line-layer' },
        },
      ],
      includeEndpoint: true,
      coordDigits: 6,
      ignoreSelf: true,
    });

    expect(intersections.map((item) => item.rightRef.featureId)).toEqual(['line-hit']);
  });

  it('会保留端点相交标记并支持转正式点要素', () => {
    const left = createLineFeature('line-a', [
      [0, 0],
      [10, 0],
    ]);
    const right = createLineFeature('line-b', [
      [10, 0],
      [10, 10],
    ]);

    const [intersection] = collectLineIntersections({
      scope: 'all',
      candidates: [
        {
          feature: left,
          ref: { sourceId: 'line-source', featureId: 'line-a', layerId: 'line-layer' },
        },
        {
          feature: right,
          ref: { sourceId: 'line-source', featureId: 'line-b', layerId: 'line-layer' },
        },
      ],
      includeEndpoint: true,
      coordDigits: 6,
      ignoreSelf: true,
    });

    const pointFeature = buildIntersectionPointFeature(intersection, {
      kind: 'materialized-node',
    });

    expect(intersection.isEndpointHit).toBe(true);
    expect(pointFeature.geometry.coordinates).toEqual([10, 0]);
    expect(pointFeature.properties?.intersectionId).toBe(intersection.intersectionId);
    expect(pointFeature.properties?.kind).toBe('materialized-node');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- src/MapLibre/shared/map-intersection-tools.spec.ts`
Expected: FAIL，提示找不到 `./map-intersection-tools` 或缺少 `collectLineIntersections`

- [ ] **Step 3: 提交测试骨架**

```bash
git add src/MapLibre/shared/map-intersection-tools.spec.ts
git commit -m "test: add intersection tool specs"
```

## Task 2: 以最小实现让纯计算层测试转绿

**Files:**
- Create: `src/MapLibre/shared/map-intersection-tools.ts`
- Modify: `src/geometry.ts`
- Test: `src/MapLibre/shared/map-intersection-tools.spec.ts`

- [ ] **Step 1: 实现交点领域模型与交点计算**

```ts
import type { Point } from 'geojson';
import type { Feature } from 'geojson';
import type { MapFeatureId } from '../composables/useMapDataUpdate';
import type { MapCommonLineFeature, MapCommonProperties, MapSourceFeatureRef } from './map-common-tools';

export type IntersectionScope = 'all' | 'selected';

export interface MapIntersectionParticipant {
  ref: MapSourceFeatureRef;
  feature: MapCommonLineFeature;
}

export interface MapIntersectionPoint {
  intersectionId: string;
  point: { lng: number; lat: number };
  scope: IntersectionScope;
  leftRef: MapSourceFeatureRef;
  rightRef: MapSourceFeatureRef;
  leftSegmentIndex: number;
  rightSegmentIndex: number;
  isEndpointHit: boolean;
  participants: {
    leftLabel: string | null;
    rightLabel: string | null;
  };
}

export interface CollectLineIntersectionsOptions {
  scope: IntersectionScope;
  selectedRef?: MapSourceFeatureRef | null;
  candidates: MapIntersectionParticipant[];
  includeEndpoint?: boolean;
  coordDigits?: number;
  ignoreSelf?: boolean;
}

function getSegmentIntersection(
  startA: [number, number],
  endA: [number, number],
  startB: [number, number],
  endB: [number, number]
): { lng: number; lat: number; t: number; u: number } | null {
  const denominator =
    (endA[0] - startA[0]) * (endB[1] - startB[1]) - (endA[1] - startA[1]) * (endB[0] - startB[0]);
  if (denominator === 0) {
    return null;
  }

  const deltaX = startB[0] - startA[0];
  const deltaY = startB[1] - startA[1];
  const t = (deltaX * (endB[1] - startB[1]) - deltaY * (endB[0] - startB[0])) / denominator;
  const u = (deltaX * (endA[1] - startA[1]) - deltaY * (endA[0] - startA[0])) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null;
  }

  return {
    lng: startA[0] + t * (endA[0] - startA[0]),
    lat: startA[1] + t * (endA[1] - startA[1]),
    t,
    u,
  };
}

function normalizeCoordinate(value: number, coordDigits: number): string {
  return value.toFixed(coordDigits);
}

function buildIntersectionId(
  leftRef: MapSourceFeatureRef,
  leftSegmentIndex: number,
  rightRef: MapSourceFeatureRef,
  rightSegmentIndex: number,
  lng: number,
  lat: number,
  coordDigits: number
): string {
  return [
    'intersection',
    leftRef.sourceId,
    leftRef.featureId,
    leftSegmentIndex,
    rightRef.sourceId,
    rightRef.featureId,
    rightSegmentIndex,
    normalizeCoordinate(lng, coordDigits),
    normalizeCoordinate(lat, coordDigits),
  ].join(':');
}

export function collectLineIntersections(options: CollectLineIntersectionsOptions): MapIntersectionPoint[] {
  const { candidates, scope, selectedRef = null, includeEndpoint = true, coordDigits = 6, ignoreSelf = true } =
    options;
  const resultMap = new Map<string, MapIntersectionPoint>();
  const sourceList =
    scope === 'selected'
      ? candidates.filter((item) => item.ref.featureId === selectedRef?.featureId)
      : candidates;

  sourceList.forEach((leftItem, leftIndex) => {
    candidates.forEach((rightItem, rightIndex) => {
      if (scope === 'all' && rightIndex <= leftIndex) {
        return;
      }
      if (scope === 'selected' && leftItem.ref.featureId === rightItem.ref.featureId) {
        return;
      }
      if (
        ignoreSelf &&
        leftItem.ref.sourceId === rightItem.ref.sourceId &&
        leftItem.ref.featureId === rightItem.ref.featureId
      ) {
        return;
      }

      const leftCoordinates = leftItem.feature.geometry.coordinates;
      const rightCoordinates = rightItem.feature.geometry.coordinates;
      for (let leftSegmentIndex = 0; leftSegmentIndex < leftCoordinates.length - 1; leftSegmentIndex += 1) {
        for (let rightSegmentIndex = 0; rightSegmentIndex < rightCoordinates.length - 1; rightSegmentIndex += 1) {
          const intersection = getSegmentIntersection(
            leftCoordinates[leftSegmentIndex] as [number, number],
            leftCoordinates[leftSegmentIndex + 1] as [number, number],
            rightCoordinates[rightSegmentIndex] as [number, number],
            rightCoordinates[rightSegmentIndex + 1] as [number, number]
          );
          if (!intersection) {
            continue;
          }

          const isEndpointHit =
            intersection.t === 0 || intersection.t === 1 || intersection.u === 0 || intersection.u === 1;
          if (!includeEndpoint && isEndpointHit) {
            continue;
          }

          const intersectionId = buildIntersectionId(
            leftItem.ref,
            leftSegmentIndex,
            rightItem.ref,
            rightSegmentIndex,
            intersection.lng,
            intersection.lat,
            coordDigits
          );

          resultMap.set(intersectionId, {
            intersectionId,
            point: { lng: intersection.lng, lat: intersection.lat },
            scope,
            leftRef: leftItem.ref,
            rightRef: rightItem.ref,
            leftSegmentIndex,
            rightSegmentIndex,
            isEndpointHit,
            participants: {
              leftLabel: String(leftItem.feature.properties?.name || leftItem.ref.featureId || ''),
              rightLabel: String(rightItem.feature.properties?.name || rightItem.ref.featureId || ''),
            },
          });
        }
      }
    });
  });

  return Array.from(resultMap.values());
}

export function buildIntersectionPointFeature(
  intersection: MapIntersectionPoint,
  extraProperties: MapCommonProperties = {}
): Feature<Point, MapCommonProperties> {
  return {
    type: 'Feature',
    id: intersection.intersectionId as MapFeatureId,
    geometry: {
      type: 'Point',
      coordinates: [intersection.point.lng, intersection.point.lat],
    },
    properties: {
      intersectionId: intersection.intersectionId,
      scope: intersection.scope,
      isEndpointHit: intersection.isEndpointHit,
      leftSourceId: intersection.leftRef.sourceId,
      leftFeatureId: intersection.leftRef.featureId,
      rightSourceId: intersection.rightRef.sourceId,
      rightFeatureId: intersection.rightRef.featureId,
      ...extraProperties,
    },
  };
}
```

- [ ] **Step 2: 从公共几何入口暴露交点工具**

```ts
export {
  buildIntersectionPointFeature,
  collectLineIntersections,
} from './MapLibre/shared/map-intersection-tools';

export type {
  CollectLineIntersectionsOptions,
  IntersectionScope,
  MapIntersectionParticipant,
  MapIntersectionPoint,
} from './MapLibre/shared/map-intersection-tools';
```

- [ ] **Step 3: 运行纯计算层测试确认通过**

Run: `npm test -- src/MapLibre/shared/map-intersection-tools.spec.ts`
Expected: PASS，3 个测试全部通过

- [ ] **Step 4: 提交纯计算层实现**

```bash
git add src/MapLibre/shared/map-intersection-tools.ts src/MapLibre/shared/map-intersection-tools.spec.ts src/geometry.ts
git commit -m "feat: add intersection geometry tools"
```

## Task 3: 先写交点插件控制器测试并确认失败

**Files:**
- Create: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`
- Modify: 无
- Test: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`

- [ ] **Step 1: 写交点插件控制器失败测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import type { MapCommonLineFeature } from '../../shared/map-common-tools';
import { useIntersectionPreviewController } from './useIntersectionPreviewController';

function createLineFeature(id: string, coordinates: [number, number][]): MapCommonLineFeature {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      name: id,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

describe('useIntersectionPreviewController', () => {
  it('会刷新交点集合并按 ID 返回交点上下文', () => {
    const onChange = vi.fn();
    const controller = useIntersectionPreviewController({
      getOptions: () => ({
        enabled: true,
        visible: true,
        scope: 'all',
        targetSourceIds: ['line-source'],
        includeEndpoint: true,
        coordDigits: 6,
      }),
      getCandidates: () => [
        {
          feature: createLineFeature('line-a', [
            [0, 0],
            [10, 10],
          ]),
          ref: { sourceId: 'line-source', featureId: 'line-a', layerId: 'line-layer' },
        },
        {
          feature: createLineFeature('line-b', [
            [0, 10],
            [10, 0],
          ]),
          ref: { sourceId: 'line-source', featureId: 'line-b', layerId: 'line-layer' },
        },
      ],
      getSelectedFeatureContext: () => null,
      onStateChange: onChange,
    });

    controller.refresh();
    const data = controller.data.value;
    const [feature] = data.features;
    const context = controller.getById(String(feature.id));

    expect(data.features).toHaveLength(1);
    expect(context?.intersectionId).toBe(String(feature.id));
    expect(context?.feature?.geometry.type).toBe('Point');
    expect(onChange).toHaveBeenCalled();
  });

  it('在 selected 模式下没有选中线时返回空集合', () => {
    const controller = useIntersectionPreviewController({
      getOptions: () => ({
        enabled: true,
        visible: true,
        scope: 'selected',
        targetSourceIds: ['line-source'],
        includeEndpoint: true,
        coordDigits: 6,
      }),
      getCandidates: () => [],
      getSelectedFeatureContext: () => null,
    });

    controller.refresh();

    expect(controller.data.value.features).toHaveLength(0);
    expect(controller.getSelected()).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`
Expected: FAIL，提示缺少 `useIntersectionPreviewController`

- [ ] **Step 3: 提交测试骨架**

```bash
git add src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts
git commit -m "test: add intersection preview controller specs"
```

## Task 4: 以最小实现让交点插件控制器测试转绿

**Files:**
- Create:
  - `src/MapLibre/plugins/intersection-preview/types.ts`
  - `src/MapLibre/plugins/intersection-preview/IntersectionPreviewLayers.vue`
  - `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewStore.ts`
  - `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.ts`
  - `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewPlugin.ts`
  - `src/MapLibre/plugins/intersection-preview/index.ts`
- Modify: 无
- Test: `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`

- [ ] **Step 1: 定义插件类型和状态**

```ts
import type { ComputedRef } from 'vue';
import type { MapCommonFeatureCollection, MapSourceFeatureRef } from '../../shared/map-common-tools';
import type { MapLayerInteractiveContext } from '../../shared/mapLibre-controls-types';
import type {
  CollectLineIntersectionsOptions,
  IntersectionScope,
  MapIntersectionParticipant,
  MapIntersectionPoint,
} from '../../shared/map-intersection-tools';

export interface IntersectionPreviewState {
  visible: boolean;
  scope: IntersectionScope;
  count: number;
  selectedId: string | null;
  lastError: string | null;
}

export interface IntersectionPreviewContext extends MapIntersectionPoint {
  feature: MapCommonFeatureCollection['features'][number] | null;
}

export interface IntersectionPreviewOptions {
  enabled?: boolean;
  visible?: boolean;
  scope?: IntersectionScope;
  targetSourceIds: string[];
  targetLayerIds?: string[];
  includeEndpoint?: boolean;
  coordDigits?: number;
  ignoreSelf?: boolean;
  pointStyle?: Record<string, unknown>;
  onClick?: (context: IntersectionPreviewContext) => void;
  onContextMenu?: (context: IntersectionPreviewContext) => void;
}

export interface IntersectionPreviewPluginApi {
  refresh: () => void;
  clear: () => void;
  show: () => void;
  hide: () => void;
  setScope: (scope: IntersectionScope) => void;
  getData: () => MapCommonFeatureCollection;
  getById: (intersectionId: string | null) => IntersectionPreviewContext | null;
  getSelected: () => IntersectionPreviewContext | null;
}

export interface UseIntersectionPreviewControllerOptions {
  getOptions: () => IntersectionPreviewOptions | null | undefined;
  getCandidates: () => MapIntersectionParticipant[];
  getSelectedFeatureContext: () => MapLayerInteractiveContext | null | undefined;
  onStateChange?: (state: IntersectionPreviewState) => void;
}
```

- [ ] **Step 2: 实现 store 与 controller**

```ts
// useIntersectionPreviewStore.ts
import { computed, ref } from 'vue';
import type { MapCommonFeatureCollection } from '../../shared/map-common-tools';
import type { IntersectionPreviewContext, IntersectionPreviewState } from './types';

function createEmptyCollection(): MapCommonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

export function useIntersectionPreviewStore() {
  const data = ref<MapCommonFeatureCollection>(createEmptyCollection());
  const visible = ref(true);
  const selectedId = ref<string | null>(null);
  const contextMap = ref<Record<string, IntersectionPreviewContext>>({});
  const lastError = ref<string | null>(null);

  const count = computed(() => data.value.features.length);

  function replace(nextData: MapCommonFeatureCollection, nextContextMap: Record<string, IntersectionPreviewContext>) {
    data.value = nextData;
    contextMap.value = nextContextMap;
    if (selectedId.value && !nextContextMap[selectedId.value]) {
      selectedId.value = null;
    }
  }

  function clear() {
    replace(createEmptyCollection(), {});
  }

  return {
    data,
    visible,
    selectedId,
    contextMap,
    lastError,
    count,
    replace,
    clear,
  };
}
```

```ts
// useIntersectionPreviewController.ts
import { computed } from 'vue';
import { buildIntersectionPointFeature, collectLineIntersections } from '../../shared/map-intersection-tools';
import type { MapLayerInteractiveContext } from '../../shared/mapLibre-controls-types';
import { useIntersectionPreviewStore } from './useIntersectionPreviewStore';
import type {
  IntersectionPreviewContext,
  IntersectionPreviewOptions,
  IntersectionPreviewState,
  UseIntersectionPreviewControllerOptions,
} from './types';

export function useIntersectionPreviewController(options: UseIntersectionPreviewControllerOptions) {
  const store = useIntersectionPreviewStore();
  const scope = computed(() => options.getOptions()?.scope || 'all');

  function buildState(): IntersectionPreviewState {
    return {
      visible: store.visible.value,
      scope: scope.value,
      count: store.count.value,
      selectedId: store.selectedId.value,
      lastError: store.lastError.value,
    };
  }

  function resolveSelectedRef(): MapLayerInteractiveContext | null | undefined {
    return options.getSelectedFeatureContext();
  }

  function refresh() {
    const pluginOptions = options.getOptions();
    if (!pluginOptions || pluginOptions.enabled === false) {
      store.clear();
      options.onStateChange?.(buildState());
      return;
    }

    const selectedContext = resolveSelectedRef();
    const intersections = collectLineIntersections({
      scope: pluginOptions.scope || 'all',
      selectedRef:
        selectedContext?.sourceId && selectedContext.featureId !== null
          ? {
              sourceId: selectedContext.sourceId,
              featureId: selectedContext.featureId,
              layerId: selectedContext.layerId,
            }
          : null,
      candidates: options.getCandidates(),
      includeEndpoint: pluginOptions.includeEndpoint,
      coordDigits: pluginOptions.coordDigits,
      ignoreSelf: pluginOptions.ignoreSelf,
    });

    const contextMap: Record<string, IntersectionPreviewContext> = {};
    const features = intersections.map((intersection) => {
      const feature = buildIntersectionPointFeature(intersection, {
        generatedKind: 'intersection-preview',
      });
      contextMap[intersection.intersectionId] = {
        ...intersection,
        feature,
      };
      return feature;
    });

    store.replace(
      {
        type: 'FeatureCollection',
        features,
      },
      contextMap
    );
    options.onStateChange?.(buildState());
  }

  function setScope(nextScope: 'all' | 'selected') {
    const pluginOptions = options.getOptions();
    if (pluginOptions) {
      pluginOptions.scope = nextScope;
    }
    refresh();
  }

  function getById(intersectionId: string | null) {
    if (!intersectionId) {
      return null;
    }
    return store.contextMap.value[intersectionId] || null;
  }

  return {
    data: store.data,
    visible: store.visible,
    refresh,
    clear: store.clear,
    show: () => {
      store.visible.value = true;
      options.onStateChange?.(buildState());
    },
    hide: () => {
      store.visible.value = false;
      options.onStateChange?.(buildState());
    },
    setScope,
    getById,
    getSelected: () => getById(store.selectedId.value),
  };
}
```

- [ ] **Step 3: 挂上插件适配层与图层组件**

```ts
// useIntersectionPreviewPlugin.ts
import { computed } from 'vue';
import { defineMapPlugin } from '../types';
import { createCircleLayerStyle } from '../../shared/map-layer-style-config';
import type { IntersectionPreviewPluginApi, IntersectionPreviewState, IntersectionPreviewOptions } from './types';
import { useIntersectionPreviewController } from './useIntersectionPreviewController';
import IntersectionPreviewLayers from './IntersectionPreviewLayers.vue';

export const INTERSECTION_PREVIEW_PLUGIN_TYPE = 'intersectionPreview';
export const INTERSECTION_PREVIEW_SOURCE_ID = 'intersection-preview-source';
export const INTERSECTION_PREVIEW_LAYER_ID = 'intersection-preview-layer';

export const intersectionPreviewPlugin = defineMapPlugin<IntersectionPreviewOptions>({
  type: INTERSECTION_PREVIEW_PLUGIN_TYPE,
  createInstance(context) {
    const controller = useIntersectionPreviewController({
      getOptions: () => context.getOptions(),
      getCandidates: () => [],
      getSelectedFeatureContext: () => context.getSelectedFeatureContext(),
    });

    return {
      getRenderItems: () => [
        {
          id: INTERSECTION_PREVIEW_LAYER_ID,
          component: IntersectionPreviewLayers,
          props: {
            sourceId: INTERSECTION_PREVIEW_SOURCE_ID,
            layerId: INTERSECTION_PREVIEW_LAYER_ID,
            data: controller.data,
            visible: controller.visible,
            style: createCircleLayerStyle({
              paint: {
                'circle-radius': 5,
                'circle-color': '#ff7a45',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
              },
            }),
          },
        },
      ],
      getApi: () => controller as IntersectionPreviewPluginApi,
      state: computed<IntersectionPreviewState>(() => ({
        visible: controller.visible.value,
        scope: 'all',
        count: controller.data.value.features.length,
        selectedId: controller.getSelected()?.intersectionId || null,
        lastError: null,
      })),
    };
  },
});
```

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { MglGeoJsonSource, MglCircleLayer } from 'vue-maplibre-gl';
import type { MapCommonFeatureCollection } from '../../shared/map-common-tools';

const props = defineProps<{
  sourceId: string;
  layerId: string;
  data: MapCommonFeatureCollection;
  visible: boolean;
  style: Record<string, unknown>;
}>();

const layerStyle = computed(() => props.style);
</script>

<template>
  <MglGeoJsonSource :source-id="sourceId" :data="data">
    <MglCircleLayer
      v-if="visible"
      :layer-id="layerId"
      :paint="(layerStyle.paint || {}) as any"
      :layout="(layerStyle.layout || {}) as any"
    />
  </MglGeoJsonSource>
</template>
```

- [ ] **Step 4: 运行交点插件控制器测试确认通过**

Run: `npm test -- src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`
Expected: PASS，2 个测试全部通过

- [ ] **Step 5: 提交交点插件最小实现**

```bash
git add src/MapLibre/plugins/intersection-preview
git commit -m "feat: add intersection preview plugin core"
```

## Task 5: 先写 facade 与业务聚合接入测试并确认失败

**Files:**
- Create: `src/MapLibre/facades/useIntersectionPreview.spec.ts`
- Modify: `src/MapLibre/facades/useBusinessMap.spec.ts`
- Test:
  - `src/MapLibre/facades/useIntersectionPreview.spec.ts`
  - `src/MapLibre/facades/useBusinessMap.spec.ts`

- [ ] **Step 1: 写 facade 失败测试**

```ts
import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useIntersectionPreview } from './useIntersectionPreview';

describe('useIntersectionPreview', () => {
  it('会读取交点插件状态并透出基础动作', () => {
    const api = {
      refresh: () => undefined,
      clear: () => true,
      show: () => undefined,
      hide: () => undefined,
      setScope: () => undefined,
      getData: () => ({ type: 'FeatureCollection', features: [] }),
      getById: () => null,
      getSelected: () => null,
    };
    const state = computed(() => ({
      visible: true,
      scope: 'all',
      count: 2,
      selectedId: null,
      lastError: null,
    }));

    const mapRef = ref({
      plugins: {
        list: () => [{ id: 'intersectionPreview', type: 'intersectionPreview' }],
        getApi: () => api,
        getState: () => state.value,
      },
    });

    const preview = useIntersectionPreview(mapRef as any);

    expect(preview.count.value).toBe(2);
    expect(preview.visible.value).toBe(true);
    expect(typeof preview.refresh).toBe('function');
  });
});
```

- [ ] **Step 2: 扩展业务聚合测试**

```ts
expect(businessMap.intersection.count.value).toBe(2);
expect(typeof businessMap.intersection.refresh).toBe('function');
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `npm test -- src/MapLibre/facades/useIntersectionPreview.spec.ts src/MapLibre/facades/useBusinessMap.spec.ts`
Expected: FAIL，提示缺少 `useIntersectionPreview` 或 `businessMap.intersection`

- [ ] **Step 4: 提交测试骨架**

```bash
git add src/MapLibre/facades/useIntersectionPreview.spec.ts src/MapLibre/facades/useBusinessMap.spec.ts
git commit -m "test: add intersection facade specs"
```

## Task 6: 以最小实现让 facade 与导出测试转绿

**Files:**
- Create:
  - `src/MapLibre/facades/useIntersectionPreview.ts`
  - `src/plugins/intersection-preview.ts`
- Modify:
  - `src/MapLibre/facades/mapPluginResolver.ts`
  - `src/MapLibre/facades/useBusinessMap.ts`
  - `src/MapLibre/facades/useBusinessMap.spec.ts`
  - `src/index.ts`
  - `src/business.ts`
  - `package.json`
- Test:
  - `src/MapLibre/facades/useIntersectionPreview.spec.ts`
  - `src/MapLibre/facades/useBusinessMap.spec.ts`

- [ ] **Step 1: 增加插件解析与 facade**

```ts
// mapPluginResolver.ts
import type {
  IntersectionPreviewPluginApi,
  IntersectionPreviewState,
} from '../plugins/intersection-preview';

const INTERSECTION_PREVIEW_PLUGIN_TYPE = 'intersectionPreview';

export function resolveIntersectionPreviewApi(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): IntersectionPreviewPluginApi | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    INTERSECTION_PREVIEW_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getApi<IntersectionPreviewPluginApi>(pluginTarget.id) || null;
}

export function resolveIntersectionPreviewState(
  mapExpose: MapLibreInitExpose | null | undefined,
  pluginId?: string
): IntersectionPreviewState | null {
  const pluginTarget = resolveMapPluginTargetByType(
    mapExpose,
    INTERSECTION_PREVIEW_PLUGIN_TYPE,
    pluginId
  );

  if (!pluginTarget) {
    return null;
  }

  return mapExpose?.plugins.getState<IntersectionPreviewState>(pluginTarget.id) || null;
}
```

```ts
// useIntersectionPreview.ts
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { MapLibreInitExpose } from '../core/mapLibre-init.types';
import { resolveIntersectionPreviewApi, resolveIntersectionPreviewState } from './mapPluginResolver';

export function useIntersectionPreview(
  mapRef: MaybeRefOrGetter<MapLibreInitExpose | null | undefined>
) {
  const getMapExpose = () => toValue(mapRef);
  const state = computed(() => resolveIntersectionPreviewState(getMapExpose()));

  return {
    state,
    count: computed(() => state.value?.count || 0),
    visible: computed(() => Boolean(state.value?.visible)),
    scope: computed(() => state.value?.scope || 'all'),
    selectedId: computed(() => state.value?.selectedId || null),
    lastError: computed(() => state.value?.lastError || null),
    refresh: () => resolveIntersectionPreviewApi(getMapExpose())?.refresh(),
    clear: () => resolveIntersectionPreviewApi(getMapExpose())?.clear() || false,
    show: () => resolveIntersectionPreviewApi(getMapExpose())?.show(),
    hide: () => resolveIntersectionPreviewApi(getMapExpose())?.hide(),
    setScope: (scope: 'all' | 'selected') =>
      resolveIntersectionPreviewApi(getMapExpose())?.setScope(scope),
    getData: () => resolveIntersectionPreviewApi(getMapExpose())?.getData() || null,
    getById: (intersectionId: string | null) =>
      resolveIntersectionPreviewApi(getMapExpose())?.getById(intersectionId) || null,
    getSelected: () => resolveIntersectionPreviewApi(getMapExpose())?.getSelected() || null,
  };
}
```

- [ ] **Step 2: 挂入业务聚合门面**

```ts
// useBusinessMap.ts
import { useIntersectionPreview } from './useIntersectionPreview';

const intersection = useIntersectionPreview(mapRef);

return {
  mapRef,
  sources,
  selection,
  feature,
  editor,
  draft,
  intersection,
  effect,
};
```

- [ ] **Step 3: 补齐公开导出**

```ts
// src/plugins/intersection-preview.ts
export { createIntersectionPreviewPlugin } from '../MapLibre/plugins/intersection-preview';
export { intersectionPreviewPlugin } from '../MapLibre/plugins/intersection-preview';
export {
  INTERSECTION_PREVIEW_LAYER_ID,
  INTERSECTION_PREVIEW_PLUGIN_TYPE,
  INTERSECTION_PREVIEW_SOURCE_ID,
} from '../MapLibre/plugins/intersection-preview';
export type {
  IntersectionPreviewContext,
  IntersectionPreviewOptions,
  IntersectionPreviewPluginApi,
  IntersectionPreviewState,
} from '../MapLibre/plugins/intersection-preview';
```

```ts
// src/index.ts / src/business.ts
export { useIntersectionPreview } from './MapLibre/facades/useIntersectionPreview';
export { buildIntersectionPointFeature, collectLineIntersections } from './MapLibre/shared/map-intersection-tools';
export type {
  IntersectionPreviewContext,
  IntersectionPreviewOptions,
  IntersectionPreviewPluginApi,
  IntersectionPreviewState,
} from './MapLibre/plugins/intersection-preview';
```

```json
// package.json
"./plugins/intersection-preview": {
  "types": "./dist/plugins/intersection-preview.d.ts",
  "import": "./dist/plugins/intersection-preview.js"
}
```

- [ ] **Step 4: 运行 facade 与业务聚合测试确认通过**

Run: `npm test -- src/MapLibre/facades/useIntersectionPreview.spec.ts src/MapLibre/facades/useBusinessMap.spec.ts`
Expected: PASS，交点 facade 与业务聚合断言全部通过

- [ ] **Step 5: 提交 facade 与导出接入**

```bash
git add src/MapLibre/facades/useIntersectionPreview.ts src/MapLibre/facades/mapPluginResolver.ts src/MapLibre/facades/useBusinessMap.ts src/MapLibre/facades/useBusinessMap.spec.ts src/plugins/intersection-preview.ts src/index.ts src/business.ts package.json
git commit -m "feat: expose intersection preview facade"
```

## Task 7: 跑完整验证并收尾

**Files:**
- Modify: 如前面任务产生的全部文件
- Test:
  - `src/MapLibre/shared/map-intersection-tools.spec.ts`
  - `src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts`
  - `src/MapLibre/facades/useIntersectionPreview.spec.ts`
  - `src/MapLibre/facades/useBusinessMap.spec.ts`

- [ ] **Step 1: 运行目标测试集**

Run: `npm test -- src/MapLibre/shared/map-intersection-tools.spec.ts src/MapLibre/plugins/intersection-preview/useIntersectionPreviewController.spec.ts src/MapLibre/facades/useIntersectionPreview.spec.ts src/MapLibre/facades/useBusinessMap.spec.ts`
Expected: PASS，目标测试全部通过

- [ ] **Step 2: 运行完整自动检查**

Run: `npm test`
Expected: PASS，无失败用例

Run: `npm run build`
Expected: PASS，`vite build && vue-tsc -p tsconfig.build.json` 退出码为 0

- [ ] **Step 3: 提交最终实现**

```bash
git add src docs package.json
git commit -m "feat: add intersection preview workflow"
```

## Self-Review

### Spec coverage

- 交点临时对象、稳定 ID、`all` / `selected` 范围：Task 1-2
- 交点临时图层、点击和右键入口：Task 3-4
- facade、`useBusinessMap` 聚合与公开导出：Task 5-6
- 正式点要素转换工具与独立业务点 source 链路：Task 2、Task 6
- 错误处理、验证与自动检查：Task 4、Task 7

### Placeholder scan

- 未保留常见占位标记
- 每个任务都给出明确文件路径、测试命令和提交命令
- 每个新增能力都绑定到具体测试文件

### Type consistency

- 统一使用 `IntersectionPreviewContext`、`IntersectionPreviewState`、`IntersectionPreviewPluginApi`
- 求交范围统一使用 `IntersectionScope = 'all' | 'selected'`
- 正式点要素转换统一使用 `buildIntersectionPointFeature`
