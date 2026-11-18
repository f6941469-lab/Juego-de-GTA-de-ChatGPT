import { Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { controlsJunction, signalAt } from '../src/ai/traffic/signals'
import { createTraffic } from '../src/ai/traffic/traffic'
import { buildRoadGraph, closestRoadNode, findRoadRoute } from '../src/navigation/road-graph'
import type { DistrictMap } from '../src/world/generation/layout'

const center = { x: 0, z: 0 }
const map: Pick<DistrictMap, 'bounds' | 'roads'> = {
  bounds: { minX: -90, maxX: 90, minZ: -90, maxZ: 90 },
  roads: [-60, -30, 0, 30, 60].flatMap(value => [
    { x: value, z: 0, width: 10, depth: 160 },
    { x: 0, z: value, width: 160, depth: 10 },
  ]),
}

describe('road network', () => {
  it('connects real junctions with offset right-hand lanes', () => {
    const graph = buildRoadGraph(map.roads)
    const start = closestRoadNode(graph, center)!
    const east = closestRoadNode(graph, { x: 30, z: 0 })!
    expect(graph.nodes.size).toBe(25)
    expect(controlsJunction(graph, start)).toBe(true)
    const route = findRoadRoute(graph, start.id, east.id)
    expect(route).toHaveLength(1)
    const [lane] = route
    expect(lane.start.x).toBeGreaterThan(0)
    expect(lane.start.z).toBeGreaterThan(0)
    const [reverse] = findRoadRoute(graph, east.id, start.id)
    expect(reverse.start.z).toBeLessThan(0)
    const alternative = findRoadRoute(graph, start.id, east.id, { blocked: new Set([lane.id]) })
    expect(alternative).toHaveLength(3)
    expect(alternative.map(link => link.id)).not.toContain(lane.id)
  })

  it('uses interlocked green phases and gives both directions a red clearance', () => {
    const graph = buildRoadGraph(map.roads)
    const node = closestRoadNode(graph, center)!
    expect(signalAt(node, 'z', 0)).toBe('green')
    expect(signalAt(node, 'x', 0)).toBe('red')
    expect(signalAt(node, 'z', 8)).toBe('amber')
    expect(signalAt(node, 'z', 9.5)).toBe('red')
    expect(signalAt(node, 'x', 9.5)).toBe('red')
    expect(signalAt(node, 'x', 10)).toBe('green')
  })
})

describe('traffic simulation', () => {
  it('keeps seeded autonomous routes deterministic and releases visual resources', () => {
    const firstScene = new Scene()
    const a = createTraffic(firstScene, map, 3107)
    const b = createTraffic(new Scene(), map, 3107)
    const start = a.vehicles.map(({ x, z }) => ({ x, z }))
    for (let i = 0; i < 960; i++) {
      a.step(1 / 60, center)
      b.step(1 / 60, center)
    }
    expect(a.count).toBeGreaterThan(12)
    const snapshot = (traffic: typeof a) => traffic.vehicles.map(({ id, x, z, speed }) => ({ id, x, z, speed }))
    expect(snapshot(a)).toEqual(snapshot(b))
    expect(a.vehicles.some((car, i) => start[i] && Math.hypot(car.x - start[i].x, car.z - start[i].z) > 7)).toBe(true)
    a.render(0.5, 16)
    a.dispose()
    b.dispose()
    expect(firstScene.children).toHaveLength(0)
  })

  it('brakes before a stopped obstacle and resumes when it clears', () => {
    const traffic = createTraffic(new Scene(), map, 3107)
    const candidate = traffic.vehicles.find(car => car.lane.length - car.distance > 9)!
    expect(candidate).toBeDefined()
    const obstacle = {
      x: candidate.x + candidate.lane.direction.x * 6,
      z: candidate.z + candidate.lane.direction.z * 6,
      radius: 1.5,
    }
    for (let i = 0; i < 100; i++) traffic.step(1 / 60, center, [obstacle])
    expect(candidate.speed).toBeLessThan(0.15)
    expect(Math.hypot(candidate.x - obstacle.x, candidate.z - obstacle.z)).toBeGreaterThan(3.2)
    for (let i = 0; i < 90; i++) traffic.step(1 / 60, center)
    expect(candidate.speed).toBeGreaterThan(0.5)
    traffic.dispose()
  })
})
