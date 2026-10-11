import { describe, expect, it, vi } from 'vitest';
import type { TerraDrawMouseEvent } from 'terra-draw';
import type { MapFeatureSnapResult, MapFeatureSnapTarget } from '../plugins/map-feature-snap';
import {
  buildTerradrawCustomSnapResolver,
  createTerradrawSnapInputCoordinator,
  guardTerradrawModeInputs,
} from './terradraw-snap-sync';

/**
 * 创建 snapCoordinate 与真实附着坐标不同的延长交点结果。
 * @returns 可用于 TerraDraw 自定义吸附的 matched 结果
 */
function extendedIntersectionResult(): MapFeatureSnapResult {
  const target: MapFeatureSnapTarget = {
    key: 'path:0',
    ruleId: 'path',
    sourceId: 'path-source',
    layerId: 'path-layer',
    feature: {
      type: 'Feature',
      id: 'path-1',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    },
    geometryCoordinate: [1, 1],
    attachment: 'extended',
    segment: null,
    snapKind: 'sameLayerIntersect',
    distancePx: 1,
  };
  return {
    resolution: {
      status: 'matched',
      decision: {
        relation: 'intersection',
        snapKind: 'sameLayerIntersect',
        snapCoordinate: [1.5, 1.5],
        primaryTargetKey: target.key,
        targets: [target],
        participants: [target, { ...target, key: 'context:0', sourceId: 'context-source' }],
      },
    },
    matched: true,
    lngLat: { lng: 1.5, lat: 1.5 },
    distancePx: 1,
    snapKind: 'sameLayerIntersect',
    ruleId: 'path',
    targetFeature: null,
    targetLayerId: 'path-layer',
    targetSourceId: 'path-source',
    targetCoordinate: [1, 1],
    anchorCoordinate: [1.5, 1.5],
    segment: null,
    parents: [],
    candidates: [],
  };
}

/**
 * 创建已形成候选但证据无效的结果。
 * @returns invalid snap 结果
 */
function invalidSnapResult(): MapFeatureSnapResult {
  return {
    ...extendedIntersectionResult(),
    matched: false,
    resolution: {
      status: 'invalid',
      reason: 'incomplete-intersection-evidence'
    }
  };
}

/** 创建没有形成吸附候选的正常结果。 */
function unmatchedSnapResult(): MapFeatureSnapResult {
  return {
    ...extendedIntersectionResult(),
    matched: false,
    resolution: { status: 'unmatched' },
  };
}

/**
 * 创建 TerraDraw 测试指针事件。
 * @param button TerraDraw 语义按钮类型
 * @returns 可交给 mode 输入守卫的测试事件
 */
function createTerradrawEvent(button: TerraDrawMouseEvent['button'] = 'left'): TerraDrawMouseEvent {
  return {
    lng: 10,
    lat: 20,
    containerX: 1,
    containerY: 2,
    button,
    heldKeys: [],
    isContextMenu: false,
  };
}

describe('terradraw snap sync', () => {
  it('自定义吸附放置使用 decision.snapCoordinate', () => {
    const resolve = buildTerradrawCustomSnapResolver({
      resolveMapResult: () => extendedIntersectionResult(),
    });

    expect(resolve({} as TerraDrawMouseEvent)).toEqual([1.5, 1.5]);
  });

  it('任一吸附来源 invalid 时不改选另一来源的坐标', () => {
    const cases = [
      {
        name: 'map invalid + drawn matched',
        resolveMapResult: () => invalidSnapResult(),
        resolveDrawnResult: () => extendedIntersectionResult(),
      },
      {
        name: 'drawn invalid + map matched',
        resolveMapResult: () => extendedIntersectionResult(),
        resolveDrawnResult: () => invalidSnapResult(),
      },
      {
        name: 'invalid + unmatched',
        resolveMapResult: () => invalidSnapResult(),
        resolveDrawnResult: () => unmatchedSnapResult(),
      },
      {
        name: 'two invalid sources',
        resolveMapResult: () => invalidSnapResult(),
        resolveDrawnResult: () => invalidSnapResult(),
      },
    ];

    cases.forEach(({ name, resolveMapResult, resolveDrawnResult }) => {
      const resolve = buildTerradrawCustomSnapResolver({ resolveMapResult, resolveDrawnResult });
      expect(resolve({} as TerraDrawMouseEvent), name).toBeUndefined();
    });
  });

  it('invalid 优先于 unmatched，两个 matched 仍按屏幕距离选择且同一事件只解析一次', () => {
    const coordinator = createTerradrawSnapInputCoordinator();
    const event = createTerradrawEvent();
    const drawnBase = extendedIntersectionResult();
    if (drawnBase.resolution.status !== 'matched') {
      throw new Error('测试 fixture 必须提供 matched SnapDecision');
    }
    const drawnDecision = drawnBase.resolution.decision;
    const resolveMapResult = vi.fn(() => ({
      ...extendedIntersectionResult(),
      distancePx: 4
    }));
    const resolveDrawnResult = vi.fn(() => ({
      ...extendedIntersectionResult(),
      distancePx: 2,
      resolution: {
        status: 'matched' as const,
        decision: {
          ...drawnDecision,
          snapCoordinate: [2.5, 2.5] as [number, number]
        }
      }
    }));
    coordinator.setSources({ resolveMapResult, resolveDrawnResult });

    expect(coordinator.toCustom(event)).toEqual([2.5, 2.5]);
    expect(coordinator.isInvalid(event)).toBe(false);
    expect(resolveMapResult).toHaveBeenCalledTimes(1);
    expect(resolveDrawnResult).toHaveBeenCalledTimes(1);

    coordinator.setSources({
      resolveMapResult: () => invalidSnapResult(),
      resolveDrawnResult: () => ({ ...extendedIntersectionResult(), matched: false, resolution: { status: 'unmatched' } })
    });
    expect(coordinator.isInvalid(createTerradrawEvent())).toBe(true);
    expect(coordinator.toCustom(createTerradrawEvent())).toBeUndefined();
  });

  it('invalid 点击不产生 raw 落点，下一次正常输入仍可继续', () => {
    const coordinator = createTerradrawSnapInputCoordinator();
    const placements: TerraDrawMouseEvent[] = [];
    const pointerEvents = { leftClick: true };
    const validation = vi.fn(() => false);
    const mode = {
      pointerEvents,
      validation,
      onClick(event: TerraDrawMouseEvent) {
        if (validation()) {
          placements.push(event);
        }
      }
    };
    guardTerradrawModeInputs(mode, coordinator);
    coordinator.setSources({ resolveMapResult: () => invalidSnapResult() });

    mode.onClick(createTerradrawEvent());
    expect(placements).toHaveLength(0);

    coordinator.setSources({});
    mode.onClick(createTerradrawEvent());
    expect(placements).toHaveLength(0);
    expect(validation).toHaveBeenCalledTimes(1);

    validation.mockReturnValue(true);
    mode.onClick(createTerradrawEvent());
    expect(placements).toHaveLength(1);
    expect((mode as typeof mode).pointerEvents).toBe(pointerEvents);
    expect((mode as typeof mode).validation).toBe(validation);
  });

  it('拖拽过程中出现 invalid 时清理 provisional 输入并恢复地图拖动', () => {
    const coordinator = createTerradrawSnapInputCoordinator();
    const dragSteps: string[] = [];
    const setMapDraggability = vi.fn();
    const cleanUp = vi.fn();
    const mode: {
      cleanUp: () => void;
      onDragStart: (event: TerraDrawMouseEvent, setDraggability: (enabled: boolean) => void) => void;
      onDrag: (event: TerraDrawMouseEvent, setDraggability: (enabled: boolean) => void) => void;
      onDragEnd: (event: TerraDrawMouseEvent, setDraggability: (enabled: boolean) => void) => void;
    } = {
      cleanUp,
      onDragStart(_event, _setDraggability) {
        dragSteps.push('start');
      },
      onDrag(_event, _setDraggability) {
        dragSteps.push('move');
      },
      onDragEnd(_event, _setDraggability) {
        dragSteps.push('end');
      }
    };
    guardTerradrawModeInputs(mode, coordinator);
    coordinator.setSources({});
    mode.onDragStart(createTerradrawEvent(), setMapDraggability);
    expect(dragSteps).toEqual(['start']);

    coordinator.setSources({ resolveMapResult: () => invalidSnapResult() });
    mode.onDrag(createTerradrawEvent(), setMapDraggability);
    mode.onDragEnd(createTerradrawEvent(), setMapDraggability);

    expect(dragSteps).toEqual(['start']);
    expect(cleanUp).toHaveBeenCalledTimes(1);
    expect(setMapDraggability).toHaveBeenCalledWith(true);

    // invalid 只阻断当前拖拽；下一次正常输入不得继承 blocked 状态。
    coordinator.setSources({});
    mode.onDragStart(createTerradrawEvent(), setMapDraggability);
    mode.onDragEnd(createTerradrawEvent(), setMapDraggability);
    expect(dragSteps).toEqual(['start', 'start', 'end']);
  });
});
