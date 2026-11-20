import { PerspectiveCamera, Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { WorldEventBus } from '../src/core/events'
import { createPhysics, type StaticBox } from '../src/physics/physics'
import { SpatialBoxGrid } from '../src/physics/spatial-index'
import { createPlayer } from '../src/player/player'
import { EntityRegistry } from '../src/simulation/entities'
import { createVehicle } from '../src/vehicles/vehicle'

describe('world event bus and entity registry', () => {
  it('propagates events only within spatial reach and expires old entries by TTL', () => {
    const bus = new WorldEventBus(16, 10)
    bus.emit({
      type: 'gunshot_fired',
      sourceId: 'player',
      position: { x: 0, y: 1, z: 0 },
      intensity: 1,
      radius: 50,
      severity: 4,
      visual: true,
      auditory: true,
    })

    expect(bus.queryNear(20, 0, 10)).toHaveLength(1)
    expect(bus.queryNear(120, 0, 10)).toHaveLength(0)

    bus.advance(11)
    expect(bus.count).toBe(0)
    expect(bus.queryNear(0, 0, 20)).toHaveLength(0)
  })

  it('indexes dynamic entities spatially and assigns high/medium/low simulation tiers', () => {
    const registry = new EntityRegistry()
    registry.upsert({
      id: 'near', kind: 'npc', position: { x: 10, y: 0, z: 0 },
      heading: 0, velocity: { x: 0, z: 0 }, radius: 0.4, active: true, tier: 'low', threatLevel: 0,
    })
    registry.upsert({
      id: 'mid', kind: 'npc', position: { x: 90, y: 0, z: 0 },
      heading: 0, velocity: { x: 0, z: 0 }, radius: 0.4, active: true, tier: 'low', threatLevel: 0,
    })
    registry.upsert({
      id: 'far', kind: 'vehicle', position: { x: 220, y: 0, z: 0 },
      heading: 0, velocity: { x: 0, z: 0 }, radius: 2, active: true, tier: 'high', threatLevel: 0,
    })

    registry.updateSpatialAndTiers(0, 0)
    expect(registry.get('near')?.tier).toBe('high')
    expect(registry.get('mid')?.tier).toBe('medium')
    expect(registry.get('far')?.tier).toBe('low')

    expect(registry.queryNear(12, 0, 15, 'npc').map((e) => e.id)).toEqual(['near'])
    expect(registry.queryNear(12, 0, 15, 'vehicle')).toHaveLength(0)
  })
})

describe('spatial box index and centralized physics step', () => {
  it('queries and raycasts only relevant StaticBox obstacles in O(cells)', () => {
    const wall: StaticBox = { x: 20, y: 3, z: 0, halfX: 2, halfY: 3, halfZ: 6 }
    const floor: StaticBox = { x: 0, y: -0.5, z: 0, halfX: 200, halfY: 0.5, halfZ: 200 }
    const spatial = new SpatialBoxGrid([floor, wall])

    expect(spatial.clearLine({ x: 0, z: 0 }, { x: 40, z: 0 })).toBe(false)
    expect(spatial.clearLine({ x: 0, z: 12 }, { x: 40, z: 12 })).toBe(true)
    expect(spatial.queryRadius(20, 0, 8)).toEqual([wall])
  })

  it('advances player and vehicle simultaneously with a single centralized physics.step(dt)', async () => {
    const floor: StaticBox = { x: 0, y: -0.5, z: 0, halfX: 50, halfY: 0.5, halfZ: 50 }
    const physics = await createPhysics([floor])
    const scene = new Scene()
    const camera = new PerspectiveCamera(58, 1, 0.1, 200)
    const driver = createPlayer(scene, camera, physics, { x: -2, y: 0, z: 0 })
    const pedestrian = createPlayer(scene, camera, physics, { x: 6, y: 0, z: 0 })
    const car = createVehicle(scene, physics, { x: 0, y: 0, z: 0 })

    try {
      expect(car.interact(driver)).toBe(true)
      for (let i = 0; i < 30; i++) {
        car.prepareStep(1 / 60, { x: 0, z: 1, run: false, jump: false })
        pedestrian.prepareStep(1 / 60, { x: 0, z: 1, run: false, jump: false })
        physics.step(1 / 60)
        car.finishStep(1 / 60)
        pedestrian.finishStep(1 / 60)
      }
      expect(car.position.z).toBeLessThan(-1)
      expect(pedestrian.position.z).toBeLessThan(-1)
    } finally {
      car.dispose()
      driver.dispose()
      pedestrian.dispose()
      physics.dispose()
    }
  })
})
