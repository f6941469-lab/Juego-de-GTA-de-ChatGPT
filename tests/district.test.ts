import { Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { buildRoadGraph, closestRoadNode, findRoadRoute } from '../src/navigation/road-graph'
import { buildDistrict } from '../src/world/district'
import { getDistrictAt, storeSpecs } from '../src/world/generation/layout'

describe('procedural district', () => {
  it('recreates the same district from the same seed and varies its generated buildings across seeds', () => {
    const first = buildDistrict(new Scene(), 183)
    const second = buildDistrict(new Scene(), 183)
    const alternate = buildDistrict(new Scene(), 42)

    expect(first.map).toEqual(second.map)
    expect(first.spawn).toEqual(second.spawn)
    expect(first.colliders).toEqual(second.colliders)
    expect(alternate.colliders).not.toEqual(first.colliders)
    expect(alternate.map.landmarks).toEqual(first.map.landmarks)
  })

  it('provides a walkable spawn in the district with map roads and solid ground', () => {
    const { map, spawn, colliders } = buildDistrict(new Scene(), 42)
    const { minX, maxX, minZ, maxZ } = map.bounds
    expect(spawn.x).toBeGreaterThan(minX)
    expect(spawn.x).toBeLessThan(maxX)
    expect(spawn.z).toBeGreaterThan(minZ)
    expect(spawn.z).toBeLessThan(maxZ)
    expect(map.roads.length).toBeGreaterThan(1)

    const radius = 0.35
    const spawnBoxes = colliders.filter((box) =>
      Math.abs(spawn.x - box.x) < box.halfX + radius &&
      Math.abs(spawn.z - box.z) < box.halfZ + radius,
    )
    expect(spawnBoxes.some((box) => Math.abs(box.y + box.halfY - spawn.y) < 0.01)).toBe(true)
    expect(spawnBoxes.some((box) =>
      box.y + box.halfY > spawn.y + 0.05 && box.y - box.halfY < spawn.y + 1.7,
    )).toBe(false)
  })

  it('connects East Island, Isla Estrella, and West Mainland districts across bridges with solid decks', () => {
    const district = buildDistrict(new Scene(), 240817)
    const graph = buildRoadGraph(district.map.roads)

    const eastStart = closestRoadNode(graph, { x: 0, z: 7 })!
    const centralNode = closestRoadNode(graph, { x: -225, z: 7 })!
    const westDowntown = closestRoadNode(graph, { x: -366, z: -104 })!
    const westPort = closestRoadNode(graph, { x: -282, z: 150 })!

    expect(findRoadRoute(graph, eastStart.id, centralNode.id).length).toBeGreaterThan(0)
    expect(findRoadRoute(graph, eastStart.id, westDowntown.id).length).toBeGreaterThan(0)
    expect(findRoadRoute(graph, westDowntown.id, westPort.id).length).toBeGreaterThan(0)
    expect(findRoadRoute(graph, westPort.id, eastStart.id).length).toBeGreaterThan(0)

    expect(getDistrictAt(0, 25)).toBe('Costa Palmera')
    expect(getDistrictAt(0, -101)).toBe('Punta Palmera')
    expect(getDistrictAt(-225, -11)).toBe('Isla Estrella')
    expect(getDistrictAt(-258, 7)).toBe('Calzada Central')
    expect(getDistrictAt(-220, -104)).toBe('Puente Norte')
    expect(getDistrictAt(-366, -124)).toBe('Centro Financiero')
    expect(getDistrictAt(-366, 26)).toBe('Pequeña Palmera')
    expect(getDistrictAt(-302, 169)).toBe('Puerto y Muelles')

    // Bridge decks over the bay must have walkable/drivable ground at y = 0
    for (const point of [{ x: -220, z: -104 }, { x: -258, z: 7 }, { x: -192, z: 7 }, { x: -220, z: 150 }]) {
      const beneath = district.colliders.filter((box) =>
        Math.abs(point.x - box.x) <= box.halfX && Math.abs(point.z - box.z) <= box.halfZ,
      )
      expect(beneath.some((box) => Math.abs(box.y + box.halfY) < 0.01)).toBe(true)
    }

    // All store interaction doors must rest on solid ground and outside building colliders
    for (const store of storeSpecs) {
      const overlapping = district.colliders.filter((box) =>
        Math.abs(store.doorX - box.x) < box.halfX + 0.3 && Math.abs(store.doorZ - box.z) < box.halfZ + 0.3,
      )
      expect(overlapping.some((box) => Math.abs(box.y + box.halfY) < 0.01)).toBe(true)
      expect(overlapping.some((box) => box.y + box.halfY > 0.1)).toBe(false)
    }
    district.dispose()
  })
})
