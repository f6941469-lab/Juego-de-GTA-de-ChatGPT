import { Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { buildDistrict } from '../src/world/district'

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
})
