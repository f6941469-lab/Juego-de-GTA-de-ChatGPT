import { Scene } from 'three'
import { describe, expect, it } from 'vitest'
import {
  buildPedestrianGraph,
  closestPedestrianNode,
  findEscapeNode,
  findPedestrianRoute,
  steerPedestrian,
} from '../src/navigation/pedestrian-graph'
import type { StaticBox } from '../src/physics/physics'
import { SpatialBoxGrid } from '../src/physics/spatial-index'
import { buildDistrict } from '../src/world/district'

describe('pedestrian and spatial navigation', () => {
  it('routes pedestrians across connected districts and reroutes around blocked nodes', () => {
    const district = buildDistrict(new Scene(), 240817)
    const spatial = new SpatialBoxGrid(district.colliders)
    const graph = buildPedestrianGraph(spatial)

    const eastStart = closestPedestrianNode(graph, { x: 0, z: 25 })!
    const starIslandStore = graph.nodes.get('store:cafe-estrella')!
    const westStore = graph.nodes.get('store:bodega-palmera')!

    const routeToCentral = findPedestrianRoute(graph, eastStart.id, starIslandStore.id)
    expect(routeToCentral.length).toBeGreaterThan(3)
    expect(routeToCentral.at(-1)?.id).toBe(starIslandStore.id)

    const routeToWest = findPedestrianRoute(graph, eastStart.id, westStore.id)
    expect(routeToWest.length).toBeGreaterThan(4)

    // Block an intermediate node on the first route and verify alternative path calculation
    const intermediate = routeToCentral[Math.floor(routeToCentral.length / 2)]
    const alternate = findPedestrianRoute(graph, eastStart.id, starIslandStore.id, {
      blockedNodes: new Set([intermediate.id]),
    })
    expect(alternate.length).toBeGreaterThan(0)
    expect(alternate.some((node) => node.id === intermediate.id)).toBe(false)

    const escape = findEscapeNode(graph, { x: 0, z: 0 }, { x: 0, z: -15 }, 40)
    expect(escape).toBeDefined()
    expect(escape!.z).toBeGreaterThan(10)

    district.dispose()
  })

  it('steers around walls and maintains separation from neighboring pedestrians', () => {
    const wall: StaticBox = { x: 0, y: 2, z: -3, halfX: 5, halfY: 2, halfZ: 0.4 }
    const spatial = new SpatialBoxGrid([wall])

    const slide = steerPedestrian(
      { id: 'npc-1', x: 0, z: -2.2 },
      { x: 0, z: -8 },
      2.5,
      0.1,
      spatial,
      [],
    )
    expect(slide.blocked).toBe(false)
    expect(Math.abs(slide.x)).toBeGreaterThan(0.1)

    const separated = steerPedestrian(
      { id: 'npc-1', x: 0, z: 0 },
      { x: 0, z: -5 },
      2.0,
      0.1,
      undefined,
      [{ id: 'npc-2', x: 0.25, z: -0.35, radius: 0.4 }],
    )
    expect(separated.x).toBeLessThan(0)
  })
})
