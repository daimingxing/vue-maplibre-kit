import { describe, expect, it } from 'vitest'
import { MapLineCorridorTool, MapLineMeasureTool } from 'vue-maplibre-kit/geometry'
import { groundMetersToMercatorMeters } from './map-mercator-tools'

const REFERENCE_LATITUDE = 43.262
const TOTAL_WIDTH_METERS = 6

describe('MapLineCorridorTool 米制换算', () => {
  it('在中纬度把地面半宽转换成更大的 Web Mercator 偏移', () => {
    const equator = groundMetersToMercatorMeters(3, 0)
    const midLatitude = groundMetersToMercatorMeters(3, REFERENCE_LATITUDE)
    expect(equator).toBeCloseTo(3, 8)
    expect(midLatitude).toBeGreaterThan(3.5)
    expect(midLatitude / 3).toBeCloseTo(1 / Math.cos(REFERENCE_LATITUDE * Math.PI / 180), 6)
  })

  it('生成区域的地面总宽度接近传入的米制宽度，而不是被纬度比例缩小', () => {
    const start: [number, number] = [118.343, REFERENCE_LATITUDE]
    const end: [number, number] = [118.344, REFERENCE_LATITUDE]
    const area = MapLineCorridorTool.createRegionFeature({
      type: 'Feature',
      id: 'line-1',
      properties: { id: 'line-1' },
      geometry: { type: 'LineString', coordinates: [start, end] }
    }, TOTAL_WIDTH_METERS / 2)

    expect(area?.geometry.type).toBe('Polygon')
    const ring = area?.geometry.type === 'Polygon' ? area.geometry.coordinates[0] : []
    // 两点折线的闭合环顺序：左起点、左终点、右终点、右起点、闭合点。
    expect(ring.length).toBe(5)
    const leftStart = ring[0]
    const rightStart = ring[3]
    const totalWidth = MapLineMeasureTool.getDistanceInMeters(
      [leftStart[0], leftStart[1]],
      [rightStart[0], rightStart[1]]
    )
    expect(totalWidth).toBeGreaterThan(5.7)
    expect(totalWidth).toBeLessThan(6.3)
  })
})
