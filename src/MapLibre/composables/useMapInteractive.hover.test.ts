import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl'
import { createMapInteractiveBinding } from './useMapInteractive'

/**
 * 创建可驱动 mousemove 的最小地图替身。
 * @param renderedFeatures 当前指针位置的渲染命中
 * @returns 地图替身与事件监听表
 */
function createMapStub(renderedFeatures: MapGeoJSONFeature[] = []) {
  const listeners = new Map<string, (event: MapMouseEvent) => void>()
  const canvas = { style: { cursor: '' } }
  const queryRenderedFeatures = vi.fn(() => renderedFeatures)
  const map = {
    getLayer: vi.fn(() => ({})),
    getSource: vi.fn(() => ({})),
    queryRenderedFeatures,
    setFeatureState: vi.fn(),
    getCanvas: vi.fn(() => canvas),
    getContainer: vi.fn(() => ({
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      clientWidth: 100,
      clientHeight: 100,
      appendChild: vi.fn(),
    })),
    unproject: vi.fn((point: { x: number; y: number }) => ({ lng: point.x, lat: point.y })),
    on: vi.fn((type: string, handler: (event: MapMouseEvent) => void) => {
      listeners.set(type, handler)
    }),
    off: vi.fn(),
  } as unknown as MaplibreMap

  return { map, listeners, queryRenderedFeatures, canvas }
}

/**
 * 创建带 source/layer 元数据的渲染要素。
 * @param id 要素 ID
 * @param layerId 图层 ID
 * @returns MapLibre 渲染要素
 */
function renderedFeature(id: string, layerId: string): MapGeoJSONFeature {
  return {
    type: 'Feature',
    id,
    properties: { name: id },
    geometry: { type: 'Point', coordinates: [0, 0] },
    source: `source-${layerId}`,
    layer: { id: layerId },
  } as MapGeoJSONFeature
}

/**
 * 创建地图鼠标事件。
 * @param originalEvent 可选的原始 DOM 事件
 * @returns 最小 MapMouseEvent
 */
function mapEvent(originalEvent?: Event): MapMouseEvent {
  return {
    point: { x: 10, y: 10 },
    lngLat: { lng: 10, lat: 10 },
    originalEvent,
  } as MapMouseEvent
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('createMapInteractiveBinding hover 解析上下文', () => {
  it('单次查询结果同时驱动即时 hover 状态、光标和外部回调', () => {
    const rafQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafQueue.push(callback)
      return rafQueue.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const featureA = renderedFeature('a', 'road-layer')
    const featureB = renderedFeature('b', 'road-layer')
    const { map, listeners, queryRenderedFeatures, canvas } = createMapStub([featureA, featureB])
    const onHoverEnter = vi.fn()
    const onHoverResolve = vi.fn()

    createMapInteractiveBinding(map, () => ({
      enabled: true,
      layers: { 'road-layer': {} },
      onHoverEnter,
      onHoverResolve,
    }))

    listeners.get('mousemove')?.(mapEvent())
    listeners.get('mousemove')?.(mapEvent())
    expect(queryRenderedFeatures).not.toHaveBeenCalled()

    rafQueue.splice(0).forEach((callback) => callback(0))

    expect(queryRenderedFeatures).toHaveBeenCalledTimes(1)
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-road-layer', id: 'a' },
      { hover: true }
    )
    expect(canvas.style.cursor).toBe('pointer')
    expect(onHoverEnter).toHaveBeenCalledTimes(1)
    expect(onHoverResolve).toHaveBeenCalledTimes(1)
    expect(onHoverResolve.mock.calls[0][0].features).toEqual([featureA, featureB])
    expect(onHoverResolve.mock.calls[0][0].feature).toEqual(featureA)
    expect(onHoverEnter.mock.calls[0][0].features).toEqual([featureA, featureB])
  })

  it('同一目标内移动不会重复进入，但仍把最新命中集合交给 onHoverResolve', () => {
    const rafQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafQueue.push(callback)
      return rafQueue.length
    })

    const featureA = renderedFeature('a', 'road-layer')
    const { map, listeners } = createMapStub([featureA])
    const onHoverEnter = vi.fn()
    const onHoverResolve = vi.fn()

    createMapInteractiveBinding(map, () => ({
      enabled: true,
      layers: { 'road-layer': {} },
      onHoverEnter,
      onHoverResolve,
    }))

    listeners.get('mousemove')?.(mapEvent())
    rafQueue.splice(0).forEach((callback) => callback(0))
    listeners.get('mousemove')?.(mapEvent())
    rafQueue.splice(0).forEach((callback) => callback(0))

    expect(onHoverEnter).toHaveBeenCalledTimes(1)
    expect(onHoverResolve).toHaveBeenCalledTimes(2)
    expect(onHoverResolve.mock.calls[1][0].features).toEqual([featureA])
  })

  it('未配置延迟时进入回调仍然同步执行', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    const { map, listeners } = createMapStub([renderedFeature('a', 'road-layer')])
    const onHoverEnter = vi.fn()

    createMapInteractiveBinding(map, () => ({
      enabled: true,
      layers: { 'road-layer': {} },
      onHoverEnter,
    }))

    listeners.get('mousemove')?.(mapEvent())
    expect(onHoverEnter).toHaveBeenCalledTimes(1)
  })

  it('hoverDelayMs 只延迟进入离开回调，不延迟样式和 onHoverResolve', () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    const feature = renderedFeature('a', 'road-layer')
    const { map, listeners } = createMapStub([feature])
    const onHoverEnter = vi.fn()
    const onHoverResolve = vi.fn()

    createMapInteractiveBinding(map, () => ({
      enabled: true,
      hoverDelayMs: 80,
      layers: { 'road-layer': {} },
      onHoverEnter,
      onHoverResolve,
    }))

    listeners.get('mousemove')?.(mapEvent())

    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'source-road-layer', id: 'a' },
      { hover: true }
    )
    expect(onHoverResolve).toHaveBeenCalledTimes(1)
    expect(onHoverEnter).not.toHaveBeenCalled()

    vi.advanceTimersByTime(79)
    expect(onHoverEnter).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onHoverEnter).toHaveBeenCalledTimes(1)
  })

  it('触摸指针不会合成 Hover 进入', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    const { map, listeners, queryRenderedFeatures } = createMapStub([renderedFeature('a', 'road-layer')])
    const onHoverEnter = vi.fn()
    const onHoverResolve = vi.fn()

    createMapInteractiveBinding(map, () => ({
      enabled: true,
      layers: { 'road-layer': {} },
      onHoverEnter,
      onHoverResolve,
    }))

    listeners.get('mousemove')?.(mapEvent({ pointerType: 'touch' } as unknown as Event))

    expect(queryRenderedFeatures).not.toHaveBeenCalled()
    expect(onHoverEnter).not.toHaveBeenCalled()
    expect(onHoverResolve).not.toHaveBeenCalled()
  })
})
