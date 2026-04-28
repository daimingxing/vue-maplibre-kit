# Snap TerraDraw 绘制要素吸附 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清理 `ordinaryLayers` 旧命名，补齐吸附规则自动 ID，并让 TerraDraw/Measure 已绘制点线面可以在绘制过程中跨模式互相吸附，同时避免绘制落点误触发普通业务图层点击。

**Architecture:** 保留现有 snap 插件作为唯一吸附入口，不新增新的业务插件。业务图层、插件内置目标继续走现有 `MapFeatureSnapBinding`；TerraDraw 已绘制要素通过 `drawnTargets` 配置转换成临时候选，复用同一套顶点/线段吸附计算。普通业务图层点击屏蔽放在地图交互入口，依据 TerraDraw 实例的 `getModeState()` 判断绘制语义是否正在接管鼠标点击。

**Tech Stack:** Vue 3、TypeScript、MapLibre GL JS、TerraDraw、Vitest、Vite、vue-tsc。

---

## 文件结构

- 修改 `src/MapLibre/plugins/map-feature-snap/types.ts`：删除 `ordinaryLayers` 类型和配置，允许 `MapFeatureSnapRule.id` 可选，新增 `MapFeatureSnapDrawnTargetOptions`。
- 修改 `src/MapLibre/shared/mapLibre-controls-types.ts`：在 `TerradrawSnapSharedOptions` 中加入 `drawnTargets?: boolean | MapFeatureSnapDrawnTargetOptions`。
- 修改 `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.ts`：归一化 rule id，删除 `ordinaryLayers`，抽出可复用的“给定要素集合吸附解析”能力。
- 修改 `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.ts`：合并 `drawnTargets` 默认值、draw 覆写、measure 覆写，输出到 `ResolvedTerradrawSnapOptions`。
- 修改 `src/MapLibre/plugins/types.ts`：扩展 `ResolvedTerradrawSnapOptions`，携带归一化后的 drawnTargets 配置。
- 修改 `src/MapLibre/terradraw/terradraw-snap-sync.ts`：把绘制模式吸附同步扩展到 point、linestring、polygon，并在 `toCustom` 中组合业务图层吸附与已绘制要素吸附。
- 修改 `src/MapLibre/core/mapLibre-init.vue`：传入 Draw/Measure 当前已绘制要素解析器，新增绘制态点击屏蔽判断。
- 修改 `src/MapLibre/composables/useMapInteractive.ts`：新增可选 `shouldIgnorePointerEvent` 钩子，在普通图层 click/dblclick/contextmenu 前阻止业务事件。
- 修改 `src/MapLibre/facades/businessPreset.ts`：删除 `ordinaryLayers` 兼容逻辑，`layerIds` 简写生成无 `id` rule，由 snap 内部自动补 id。
- 修改 `src/plugins/map-feature-snap.ts`：删除 `MapFeatureSnapOrdinaryLayerOptions` 导出，补充新 drawn target 类型导出。
- 修改 `src/entries/config.ts`、`src/MapLibre/shared/map-global-config.ts`、`src/config.spec.ts`：全局配置类型和默认值移除 `ordinaryLayers`，补充 `drawnTargets`。
- 修改 `docs/vue-maplibre-kit-knowledge/**`：删除 `ordinaryLayers` 说明，补充 drawnTargets 配置和绘制态点击屏蔽说明。
- 修改 `examples/views/NG/GI/NGGI01.vue`：加入轻量 `createLayerGroup()` 入门展示。
- 修改 `examples/views/NG/GI/NGGI07.vue`：加入 TerraDraw 已绘制点线面跨模式吸附示例。

---

## Task 1: 清理 ordinaryLayers 并让规则 ID 自动生成

**Files:**
- Modify: `src/MapLibre/plugins/map-feature-snap/types.ts`
- Modify: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.ts`
- Modify: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.ts`
- Modify: `src/MapLibre/facades/businessPreset.ts`
- Modify: `src/plugins/map-feature-snap.ts`
- Test: `src/MapLibre/facades/businessPreset.spec.ts`
- Test: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.spec.ts`

- [ ] **Step 1: 写失败测试：businessPreset 不再接受 ordinaryLayers**

在 `src/MapLibre/facades/businessPreset.spec.ts` 中删除旧的“应临时兼容 snap 直接传完整 ordinaryLayers 配置”用例，并新增类型/运行时断言：

```ts
it('snap layerIds 简写应生成无手写 id 的业务图层规则', async () => {
  const businessPreset = await import('./businessPreset');
  const { createBusinessPlugins } = businessPreset;

  const plugins = createBusinessPlugins({
    snap: {
      layerIds: ['pipe-line'],
    },
  });

  const rule = (plugins[0].options as any).businessLayers.rules[0];
  expect(rule.id).toBeUndefined();
  expect(rule.layerIds).toEqual(['pipe-line']);
  expect((plugins[0].options as any).ordinaryLayers).toBeUndefined();
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npx vitest run src/MapLibre/facades/businessPreset.spec.ts -t "snap layerIds 简写应生成无手写 id 的业务图层规则"`

Expected: FAIL，原因是当前 `resolveSnapOptions()` 仍写入 `id: 'business-layer-snap'` 或仍保留 `ordinaryLayers`。

- [ ] **Step 3: 修改 snap 类型，删除 ordinaryLayers，rule id 改可选**

在 `src/MapLibre/plugins/map-feature-snap/types.ts` 中调整：

```ts
export interface MapFeatureSnapRule {
  /** 规则唯一标识；不传时由系统根据来源和 layerIds 自动生成。 */
  id?: string;
  enabled?: boolean;
  layerIds: string[];
  priority?: number;
  tolerancePx?: number;
  geometryTypes?: MapFeatureSnapGeometryType[];
  snapTo?: MapFeatureSnapMode[];
  where?: Record<string, unknown>;
  filter?: (context: MapFeatureSnapRuleFilterContext) => boolean;
}

export interface MapFeatureSnapOptions {
  enabled?: boolean;
  defaultTolerancePx?: number;
  preview?: MapFeatureSnapPreviewOptions;
  businessLayers?: MapFeatureSnapBusinessLayerOptions;
  intersection?: boolean | MapFeatureSnapTargetOptions;
  polygonEdge?: boolean | MapFeatureSnapTargetOptions;
  terradraw?: {
    defaults?: TerradrawSnapSharedOptions;
    draw?: TerradrawSnapSharedOptions | boolean;
    measure?: TerradrawSnapSharedOptions | boolean;
  };
}
```

删除 `MapFeatureSnapOrdinaryLayerOptions` 类型。

- [ ] **Step 4: 修改 businessPreset 的 layerIds 简写**

在 `src/MapLibre/facades/businessPreset.ts` 的 `resolveSnapOptions()` 中删除 `ordinaryLayers` 相关逻辑：

```ts
const { layerIds, ...restOptions } = options;
const businessLayers =
  options.businessLayers ||
  (layerIds
    ? {
        enabled: true,
        rules: [
          {
            layerIds,
          },
        ],
      }
    : undefined);

return {
  enabled: true,
  ...restOptions,
  businessLayers,
};
```

- [ ] **Step 5: 在 binding 层补自动 rule id**

在 `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.ts` 中新增内部类型和工具函数：

```ts
type ResolvedMapFeatureSnapRule = MapFeatureSnapRule & {
  id: string;
};

function createGeneratedRuleId(rule: MapFeatureSnapRule, index: number): string {
  const layerKey = rule.layerIds.length ? rule.layerIds.join(',') : `rule-${index}`;
  return `business-layer:${layerKey}`;
}

function normalizeSnapRules(rules: MapFeatureSnapRule[]): ResolvedMapFeatureSnapRule[] {
  return rules.map((rule, index) => ({
    ...rule,
    id: rule.id || createGeneratedRuleId(rule, index),
  }));
}
```

把 `resolvePointer()` 中的规则归一化改成：

```ts
const normalizedRules = normalizeSnapRules(enabledRules).map((rule) => ({
  ...rule,
  tolerancePx: getResolvedTolerancePx(rule, defaultTolerancePx),
}));
```

并把 `SnapCandidate.rule` 类型改为 `ResolvedMapFeatureSnapRule`。

- [ ] **Step 6: 删除 controller 和 binding 中 ordinaryLayers 读取**

在 `useMapFeatureSnapController.ts`：

```ts
businessLayers: localOptions?.businessLayers,
```

在 `useMapFeatureSnapBinding.ts`：

```ts
const businessLayerOptions = options?.businessLayers;
```

- [ ] **Step 7: 更新公开出口**

在 `src/plugins/map-feature-snap.ts` 删除：

```ts
export type { MapFeatureSnapOrdinaryLayerOptions } from '../MapLibre/plugins/map-feature-snap';
```

- [ ] **Step 8: 运行本任务测试**

Run:

```bash
npx vitest run src/MapLibre/facades/businessPreset.spec.ts src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.spec.ts
```

Expected: PASS。

---

## Task 2: 新增 drawnTargets 配置和归一化结果

**Files:**
- Modify: `src/MapLibre/plugins/map-feature-snap/types.ts`
- Modify: `src/MapLibre/shared/mapLibre-controls-types.ts`
- Modify: `src/MapLibre/plugins/types.ts`
- Modify: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.ts`
- Test: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts`

- [ ] **Step 1: 写失败测试：drawnTargets 支持 defaults/draw/measure 覆写**

在 `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts` 新增：

```ts
it('应按 defaults、控件级配置归一化 TerraDraw 已绘制要素吸附目标', () => {
  const harness = createSnapControllerHarness({
    terradraw: {
      defaults: {
        enabled: true,
        drawnTargets: {
          geometryTypes: ['Point', 'LineString'],
          snapTo: ['vertex'],
        },
      },
      draw: {
        drawnTargets: true,
      },
      measure: {
        drawnTargets: false,
      },
    },
  });

  expect(harness.controller.resolveTerradrawSnapOptions('draw', undefined).drawnTargets).toEqual({
    enabled: true,
    geometryTypes: ['Point', 'LineString'],
    snapTo: ['vertex'],
  });
  expect(harness.controller.resolveTerradrawSnapOptions('measure', undefined).drawnTargets).toEqual({
    enabled: false,
    geometryTypes: ['Point', 'LineString', 'Polygon'],
    snapTo: ['vertex', 'segment'],
  });

  harness.controller.destroy();
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npx vitest run src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts -t "已绘制要素吸附目标"`

Expected: FAIL，原因是 `TerradrawSnapSharedOptions` 和 `ResolvedTerradrawSnapOptions` 还没有 `drawnTargets`。

- [ ] **Step 3: 新增 drawn target 类型**

在 `src/MapLibre/plugins/map-feature-snap/types.ts` 中加入：

```ts
export interface MapFeatureSnapDrawnTargetOptions {
  /** 是否启用 TerraDraw 已绘制要素吸附。 */
  enabled?: boolean;
  /** 已绘制要素允许参与吸附的几何类型。 */
  geometryTypes?: MapFeatureSnapGeometryType[];
  /** 已绘制要素允许采用的吸附方式。 */
  snapTo?: MapFeatureSnapMode[];
  /** 已绘制要素吸附优先级。 */
  priority?: number;
  /** 已绘制要素吸附范围。 */
  tolerancePx?: number;
}
```

在 `src/MapLibre/shared/mapLibre-controls-types.ts` 中引入类型并扩展：

```ts
import type { MapFeatureSnapDrawnTargetOptions } from './map-feature-snap-types';

export interface TerradrawSnapSharedOptions {
  enabled?: boolean;
  tolerancePx?: number;
  useNative?: boolean;
  useMapTargets?: boolean;
  drawnTargets?: boolean | MapFeatureSnapDrawnTargetOptions;
}
```

若出现循环引用风险，则把 `MapFeatureSnapDrawnTargetOptions` 放到 `shared/map-feature-snap-types.ts`，再由插件 types re-export。

- [ ] **Step 4: 扩展 ResolvedTerradrawSnapOptions**

在 `src/MapLibre/plugins/types.ts` 中：

```ts
export interface ResolvedTerradrawSnapOptions {
  enabled: boolean;
  tolerancePx: number;
  useNative: boolean;
  useMapTargets: boolean;
  drawnTargets: Required<Pick<MapFeatureSnapDrawnTargetOptions, 'enabled' | 'geometryTypes' | 'snapTo'>> &
    Pick<MapFeatureSnapDrawnTargetOptions, 'priority' | 'tolerancePx'>;
}
```

需要从 snap 类型文件引入 `MapFeatureSnapDrawnTargetOptions`。

- [ ] **Step 5: 实现 drawnTargets 合并**

在 `useMapFeatureSnapController.ts` 中增加：

```ts
const DEFAULT_DRAWN_TARGET_GEOMETRY_TYPES: MapFeatureSnapGeometryType[] = [
  'Point',
  'LineString',
  'Polygon',
];
const DEFAULT_DRAWN_TARGET_SNAP_MODES: MapFeatureSnapMode[] = ['vertex', 'segment'];

function normalizeDrawnTargets(
  config: TerradrawSnapSharedOptions['drawnTargets']
): ResolvedTerradrawSnapOptions['drawnTargets'] {
  if (config === false) {
    return {
      enabled: false,
      geometryTypes: DEFAULT_DRAWN_TARGET_GEOMETRY_TYPES,
      snapTo: DEFAULT_DRAWN_TARGET_SNAP_MODES,
    };
  }

  if (config === true) {
    return {
      enabled: true,
      geometryTypes: DEFAULT_DRAWN_TARGET_GEOMETRY_TYPES,
      snapTo: DEFAULT_DRAWN_TARGET_SNAP_MODES,
    };
  }

  return {
    enabled: config?.enabled !== false && Boolean(config),
    geometryTypes: config?.geometryTypes?.length
      ? config.geometryTypes
      : DEFAULT_DRAWN_TARGET_GEOMETRY_TYPES,
    snapTo: config?.snapTo?.length ? config.snapTo : DEFAULT_DRAWN_TARGET_SNAP_MODES,
    ...(config?.priority !== undefined ? { priority: config.priority } : {}),
    ...(config?.tolerancePx !== undefined ? { tolerancePx: config.tolerancePx } : {}),
  };
}
```

在 `resolveTerradrawSnapOptions()` 中返回：

```ts
drawnTargets: normalizeDrawnTargets(mergedConfig.drawnTargets),
```

- [ ] **Step 6: 运行本任务测试**

Run: `npx vitest run src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapController.spec.ts`

Expected: PASS。

---

## Task 3: 复用吸附算法解析 TerraDraw 已绘制要素

**Files:**
- Modify: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.ts`
- Test: `src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.spec.ts`

- [ ] **Step 1: 写失败测试：给定已绘制点线面要素应返回最近吸附点**

在 `useMapFeatureSnapBinding.spec.ts` 新增：

```ts
it('应支持从 TerraDraw 已绘制要素集合解析吸附结果', () => {
  const map = createMockMap();
  const result = resolveFeatureSnapResult({
    map,
    pointer: {
      point: { x: 10, y: 10 },
      lngLat: { lng: 120, lat: 30 },
    },
    rule: {
      id: 'terradraw-drawn-targets',
      layerIds: ['__terradraw_drawn__'],
      priority: 20,
      tolerancePx: 16,
      geometryTypes: ['Point', 'LineString', 'Polygon'],
      snapTo: ['vertex', 'segment'],
    },
    features: [
      {
        type: 'Feature',
        id: 'drawn-point-1',
        properties: { mode: 'point' },
        geometry: {
          type: 'Point',
          coordinates: [120, 30],
        },
      } as any,
    ],
  });

  expect(result.matched).toBe(true);
  expect(result.ruleId).toBe('terradraw-drawn-targets');
  expect(result.targetCoordinate).toEqual([120, 30]);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npx vitest run src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.spec.ts -t "TerraDraw 已绘制要素集合"`

Expected: FAIL，原因是 `resolveFeatureSnapResult` 尚未导出。

- [ ] **Step 3: 抽出通用 feature-like 解析**

在 `useMapFeatureSnapBinding.ts` 中新增：

```ts
interface SnapFeatureLike {
  type: 'Feature';
  id?: string | number;
  properties?: Record<string, any> | null;
  geometry: Geometry;
  source?: string;
  sourceLayer?: string;
  layer?: { id?: string };
}
```

把 `buildPointCandidates()`、`buildPathCandidates()`、`resolveFeatureGeometryType()` 的 `feature` 参数从 `MapGeoJSONFeature` 调整为 `SnapFeatureLike`。返回结果中需要 `targetFeature` 时：

```ts
const targetFeature = 'layer' in candidate.feature ? (candidate.feature as MapGeoJSONFeature) : null;
```

TerraDraw 已绘制要素不是 MapLibre 渲染要素，因此 `MapFeatureSnapResult.targetFeature` 保持 `null`，但 `targetCoordinate`、`segment`、`ruleId` 必须完整。

- [ ] **Step 4: 导出 resolveFeatureSnapResult**

在 `useMapFeatureSnapBinding.ts` 中加入：

```ts
export function resolveFeatureSnapResult(options: {
  map: MaplibreMap;
  pointer: ResolvePointerOptions;
  rule: MapFeatureSnapRule;
  features: SnapFeatureLike[];
}): MapFeatureSnapResult {
  const normalizedRule = normalizeSnapRules([options.rule])[0];
  const candidates = options.features.flatMap((feature) => {
    const layerId = feature.layer?.id || options.rule.layerIds[0] || '__feature_snap__';
    const featureGeometryType = resolveFeatureGeometryType(feature);
    if (!featureGeometryType) {
      return [];
    }

    if (
      normalizedRule.geometryTypes?.length &&
      !normalizedRule.geometryTypes.includes(featureGeometryType)
    ) {
      return [];
    }

    return featureGeometryType === 'Point'
      ? buildPointCandidates(options.map, options.pointer.point, feature, normalizedRule, layerId)
      : buildPathCandidates(options.map, options.pointer.point, feature, normalizedRule, layerId);
  });

  const bestCandidate = candidates.reduce<SnapCandidate | null>((current, next) => {
    return shouldReplaceCandidate(current, next) ? next : current;
  }, null);

  return toSnapResult(bestCandidate);
}
```

- [ ] **Step 5: 运行本任务测试**

Run: `npx vitest run src/MapLibre/plugins/map-feature-snap/useMapFeatureSnapBinding.spec.ts`

Expected: PASS。

---

## Task 4: TerraDraw 同步 drawnTargets 到 toCustom

**Files:**
- Modify: `src/MapLibre/terradraw/terradraw-snap-sync.ts`
- Modify: `src/MapLibre/core/mapLibre-init.vue`
- Test: `src/MapLibre/terradraw/terradraw-snap-sync.spec.ts`
- Test: `src/MapLibre/core/mapLibre-init.types.spec.ts`

- [ ] **Step 1: 写失败测试：toCustom 优先返回更近的已绘制要素吸附坐标**

新增 `src/MapLibre/terradraw/terradraw-snap-sync.spec.ts`：

```ts
import { describe, expect, it, vi } from 'vitest';
import { buildTerradrawCustomSnapResolver } from './terradraw-snap-sync';

describe('buildTerradrawCustomSnapResolver', () => {
  it('应在业务图层和已绘制要素之间选择最近吸附坐标', () => {
    const resolver = buildTerradrawCustomSnapResolver({
      resolveMapCoordinate: vi.fn(() => [120, 30]),
      resolveDrawnCoordinate: vi.fn(() => [120.001, 30.001]),
    });

    expect(
      resolver({
        lng: 120,
        lat: 30,
        containerX: 10,
        containerY: 10,
      } as any)
    ).toEqual([120.001, 30.001]);
  });
});
```

如果需要比较距离，则 resolver 入参改为返回完整 `MapFeatureSnapResult`，选择 `distancePx` 更小者。

- [ ] **Step 2: 运行失败测试**

Run: `npx vitest run src/MapLibre/terradraw/terradraw-snap-sync.spec.ts`

Expected: FAIL，原因是 `buildTerradrawCustomSnapResolver` 尚不存在。

- [ ] **Step 3: 实现自定义吸附组合器**

在 `terradraw-snap-sync.ts` 中导出：

```ts
export function buildTerradrawCustomSnapResolver(options: {
  resolveMapResult?: (event: TerraDrawMouseEvent) => MapFeatureSnapResult | null | undefined;
  resolveDrawnResult?: (event: TerraDrawMouseEvent) => MapFeatureSnapResult | null | undefined;
}): (event: TerraDrawMouseEvent) => [number, number] | undefined {
  return (event) => {
    const mapResult = options.resolveMapResult?.(event) || null;
    const drawnResult = options.resolveDrawnResult?.(event) || null;
    const matchedResults = [mapResult, drawnResult].filter(
      (result): result is MapFeatureSnapResult => Boolean(result?.matched && result.targetCoordinate)
    );

    if (!matchedResults.length) {
      return undefined;
    }

    const bestResult = matchedResults.sort((left, right) => {
      return (left.distancePx ?? Number.POSITIVE_INFINITY) - (right.distancePx ?? Number.POSITIVE_INFINITY);
    })[0];

    return bestResult.targetCoordinate || undefined;
  };
}
```

- [ ] **Step 4: 扩展同步函数参数和模式列表**

把 `syncTerradrawLineAndPolygonSnapping()` 改为支持 point/linestring/polygon。函数名可保留以降低改动面，但内部常量改为：

```ts
const TERRADRAW_SNAP_MODE_NAMES = ['point', 'linestring', 'polygon'] as const;
```

并循环：

```ts
TERRADRAW_SNAP_MODE_NAMES.forEach((modeName) => {
  safeUpdateTerradrawModeOptions(drawInstance, modeName, modePatch);
});
```

若某个控件未注册 point 模式，`safeUpdateTerradrawModeOptions()` 应静默跳过 “No mode with this name present” 类错误，避免测量控件没有某些模式时刷警告。

- [ ] **Step 5: 在 mapLibre-init 中解析当前控件已绘制要素**

在 `mapLibre-init.vue` 新增：

```ts
function resolveTerradrawDrawnSnapResult(
  controlType: 'draw' | 'measure',
  event: TerraDrawMouseEvent,
  snapOptions: ResolvedTerradrawSnapOptions
): MapFeatureSnapResult | null {
  if (!snapOptions.enabled || !snapOptions.drawnTargets.enabled) {
    return null;
  }

  const control = controlType === 'draw' ? drawControlRef.value : measureControlRef.value;
  const drawInstance = control?.getTerraDrawInstance?.();
  const features = drawInstance?.getSnapshot?.() || control?.getFeatures?.()?.features || [];

  return resolveFeatureSnapResult({
    map: map.map,
    pointer: {
      point: {
        x: event.containerX,
        y: event.containerY,
      },
      lngLat: {
        lng: event.lng,
        lat: event.lat,
      },
    },
    rule: {
      id: `terradraw-${controlType}-drawn-targets`,
      layerIds: [`__terradraw_${controlType}_drawn__`],
      priority: snapOptions.drawnTargets.priority,
      tolerancePx: snapOptions.drawnTargets.tolerancePx ?? snapOptions.tolerancePx,
      geometryTypes: snapOptions.drawnTargets.geometryTypes,
      snapTo: snapOptions.drawnTargets.snapTo,
    },
    features,
  });
}
```

需要先从 snap binding 文件引入 `resolveFeatureSnapResult` 和空结果创建函数。

- [ ] **Step 6: 在 draw/measure sync 中接入 resolver**

在 `syncDrawSnapping()` 调用中传：

```ts
resolveMapResult: (event) => pluginHost.getMapSnapService()?.getBinding()?.resolveTerradrawEvent(event),
resolveDrawnResult: (event) => {
  const options = resolveTerradrawSnapOptions('draw', controls.value.MaplibreTerradrawControl?.snapping);
  return resolveTerradrawDrawnSnapResult('draw', event, options);
},
```

measure 同理传 `'measure'`。

- [ ] **Step 7: 运行本任务测试**

Run:

```bash
npx vitest run src/MapLibre/terradraw/terradraw-snap-sync.spec.ts src/MapLibre/core/mapLibre-init.types.spec.ts
```

Expected: PASS。

---

## Task 5: 绘制状态下阻止普通业务图层点击

**Files:**
- Modify: `src/MapLibre/composables/useMapInteractive.ts`
- Modify: `src/MapLibre/core/mapLibre-init.vue`
- Test: `src/MapLibre/composables/useMapInteractive.spec.ts`

- [ ] **Step 1: 写失败测试：shouldIgnorePointerEvent 返回 true 时不触发业务 click**

在 `useMapInteractive.spec.ts` 新增：

```ts
it('指针事件被外部绘制语义接管时不应触发普通图层点击', () => {
  const onClick = vi.fn();
  const mapHarness = createMockMapHarness();
  const binding = useMapInteractive({
    mapInstance: {
      isLoaded: true,
      map: mapHarness.map,
    } as any,
    getInteractive: () => ({
      layers: {
        pointLayer: {},
      },
      onClick,
    }),
    shouldIgnorePointerEvent: () => true,
  });

  mapHarness.setFeatures([createRenderedFeature('pointLayer', 'point-1')]);
  mapHarness.handlers.click(createMapEvent());

  expect(onClick).not.toHaveBeenCalled();
  binding.destroy();
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npx vitest run src/MapLibre/composables/useMapInteractive.spec.ts -t "绘制语义接管"`

Expected: FAIL，原因是 `UseMapInteractiveOptions` 尚无 `shouldIgnorePointerEvent`。

- [ ] **Step 3: 扩展 useMapInteractive 入参**

在 `UseMapInteractiveOptions` 加：

```ts
/** 判断当前指针事件是否应被外部绘制/测量语义接管。 */
shouldIgnorePointerEvent?: (event: MapMouseEvent, eventType: MapLayerInteractiveEventType) => boolean;
```

在 `handlePointerAction()` 开头、handled 判断之后加入：

```ts
if (shouldIgnorePointerEvent?.(event, eventType)) {
  markMapInteractiveEventHandled(event);
  return;
}
```

这里必须写 handled 标记，避免同一次事件继续落到其他交互链路。

- [ ] **Step 4: mapLibre-init 提供绘制态判断**

在 `mapLibre-init.vue` 新增：

```ts
function isTerradrawDrawing(control: MaplibreTerradrawControl | MaplibreMeasureControl | null): boolean {
  const drawInstance = control?.getTerraDrawInstance?.();
  return drawInstance?.getModeState?.() === 'drawing';
}

function shouldIgnoreMapInteractivePointerEvent(): boolean {
  return isTerradrawDrawing(drawControlRef.value) || isTerradrawDrawing(measureControlRef.value);
}
```

传给 `useMapInteractive()`：

```ts
shouldIgnorePointerEvent: () => shouldIgnoreMapInteractivePointerEvent(),
```

- [ ] **Step 5: 运行本任务测试**

Run: `npx vitest run src/MapLibre/composables/useMapInteractive.spec.ts`

Expected: PASS。

---

## Task 6: 示例和文档更新

**Files:**
- Modify: `examples/views/NG/GI/NGGI01.vue`
- Modify: `examples/views/NG/GI/NGGI07.vue`
- Modify: `docs/vue-maplibre-kit-knowledge/09-插件/02-snap吸附.md`
- Modify: `docs/vue-maplibre-kit-knowledge/11-全局配置/04-plugins默认值.md`
- Modify: `docs/vue-maplibre-kit-knowledge/05-业务图层/02-createLayerGroup.md`
- Modify: `docs/problem-record.md`

- [ ] **Step 1: NGGI01 展示 createLayerGroup 基础用法**

把 NGGI01 从纯地图状态页扩展为最小业务图层页：

```vue
<template #dataSource>
  <MapBusinessSourceLayers :source="source" :layers="layers" />
</template>
```

脚本中使用：

```ts
const sourceData = ref(createMixedData());
const layers = createExampleLayers();
const { source } = createExampleSourceKit(sourceData, layers);
```

面板增加一段简短状态文本：当前图层来自 `createLayerGroup()`。

- [ ] **Step 2: NGGI07 展示 drawnTargets**

在 snap 示例中加入：

```ts
const plugins = createBusinessPlugins({
  snap: {
    layerIds: [EXAMPLE_POINT_LAYER_ID, EXAMPLE_LINE_LAYER_ID, EXAMPLE_FILL_LAYER_ID],
    terradraw: {
      defaults: {
        enabled: true,
        useNative: true,
        useMapTargets: true,
        drawnTargets: {
          geometryTypes: ['Point', 'LineString', 'Polygon'],
          snapTo: ['vertex', 'segment'],
        },
      },
    },
  },
});
```

示例面板说明：先画点/线/面，再切换其他绘制模式，可吸附到已绘制要素。

- [ ] **Step 3: 文档删除 ordinaryLayers**

在 snap 文档中删除：

```md
`ordinaryLayers` 是旧命名，目前仍可用作迁移期兼容字段。
```

统一改为：

```md
业务图层吸附统一使用 `businessLayers`。`layerIds` 是 `createBusinessPlugins()` 提供的简写，会生成默认业务图层吸附规则。
```

- [ ] **Step 4: 文档补 drawnTargets**

增加配置说明：

```ts
createBusinessPlugins({
  snap: {
    terradraw: {
      defaults: {
        drawnTargets: {
          geometryTypes: ['Point', 'LineString', 'Polygon'],
          snapTo: ['vertex', 'segment'],
        },
      },
      measure: {
        drawnTargets: false,
      },
    },
  },
});
```

说明 `drawnTargets: false` 关闭，`true` 使用默认值，对象表示开启并覆盖规则。

- [ ] **Step 5: 记录实现踩坑**

若实现过程中发现 TerraDraw point 模式不支持 `snapping.toCustom` 或 `updateModeOptions()` 行为特殊，在 `docs/problem-record.md` 记录具体问题、处理方式和经验。

---

## Task 7: 全量验证

**Files:**
- No source changes.

- [ ] **Step 1: 运行 snap 相关测试**

Run:

```bash
npx vitest run src/MapLibre/plugins/map-feature-snap src/MapLibre/terradraw src/MapLibre/composables/useMapInteractive.spec.ts
```

Expected: PASS。

- [ ] **Step 2: 运行全量单测**

Run:

```bash
npm test
```

Expected: PASS，所有测试通过。

- [ ] **Step 3: 运行库构建类型检查**

Run:

```bash
npx vue-tsc -p tsconfig.build.json --noEmit
```

Expected: PASS，无类型错误。

- [ ] **Step 4: 运行构建**

Run:

```bash
npm run build
```

Expected: PASS，Vite build 和 `vue-tsc -p tsconfig.build.json` 均成功。

- [ ] **Step 5: 检查空白字符和冲突标记**

Run:

```bash
git diff --check
rg -n "<<<<<<<|=======|>>>>>>>" src docs examples
```

Expected: `git diff --check` 无输出；`rg` 无冲突标记。

---

## 自检结果

- 覆盖需求：已覆盖 `ordinaryLayers` 清理、rule id 自动生成、TerraDraw 已绘制点线面跨模式吸附、绘制时阻止业务图层点击、NGGI01/NGGI07 示例与文档更新。
- 范围控制：未包含批量自动生成业务 layerId，也未加入 `createBusinessSnapRules()` 包装工具。
- 类型一致性：`drawnTargets` 统一设计为 `false | true | object`，由 `defaults/draw/measure` 控制作用范围。
- 风险点：TerraDraw point 模式是否完整支持 `snapping.toCustom` 需要在 Task 4 单测和手动示例验证中确认；若不支持，文档必须明确 point 模式限制，并记录到 `docs/problem-record.md`。
