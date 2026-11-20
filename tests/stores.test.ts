import { Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { storeSpecs } from '../src/world/generation/layout'
import { createStores } from '../src/world/stores'

describe('interactable stores', () => {
  it('detects nearby stores, triggers robbery cooldown, recovers after cooldown, and cleans up resources', () => {
    const scene = new Scene()
    const stores = createStores(scene, storeSpecs)

    const target = storeSpecs[0]
    expect(stores.findNearby({ x: target.doorX + 1.2, y: 0, z: target.doorZ })).toMatchObject({
      store: { id: target.id },
      available: true,
    })
    expect(stores.findNearby({ x: target.doorX + 10, y: 0, z: target.doorZ })).toBeNull()

    const robbery = stores.rob({ x: target.doorX, y: 0, z: target.doorZ })
    expect(robbery?.store.id).toBe(target.id)
    expect(robbery?.loot).toBe(target.loot)
    expect(stores.findNearby({ x: target.doorX, y: 0, z: target.doorZ })?.available).toBe(false)
    expect(stores.rob({ x: target.doorX, y: 0, z: target.doorZ })).toBeNull()

    stores.step(95)
    expect(stores.findNearby({ x: target.doorX, y: 0, z: target.doorZ })?.available).toBe(true)

    stores.rob({ x: target.doorX, y: 0, z: target.doorZ })
    stores.reset()
    expect(stores.findNearby({ x: target.doorX, y: 0, z: target.doorZ })?.available).toBe(true)

    stores.dispose()
    expect(scene.children).toHaveLength(0)
  })
})
