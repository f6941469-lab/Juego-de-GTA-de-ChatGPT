import { PerspectiveCamera, Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { createCharacterCollider, createPhysics, type StaticBox } from '../src/physics/physics'
import { createPlayer } from '../src/player/player'

const floor: StaticBox = { x: 0, y: -0.5, z: 0, halfX: 30, halfY: 0.5, halfZ: 30 }
const idle = { x: 0, z: 0, run: false, jump: false }
const forward = { ...idle, z: 1 }
const fixedStep = 1 / 60
type Player = ReturnType<typeof createPlayer>

async function withPlayer(boxes: StaticBox[], check: (player: Player, camera: PerspectiveCamera) => void) {
  const physics = await createPhysics([floor, ...boxes])
  try {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 650)
    const player = createPlayer(new Scene(), camera, physics, { x: 0, y: 0, z: 0 })
    try {
      check(player, camera)
    } finally {
      player.dispose()
    }
  } finally {
    physics.dispose()
  }
}

function advance(player: Player, frames: number, input = idle) {
  for (let frame = 0; frame < frames; frame++) {
    player.step(fixedStep, input)
    player.render(1, fixedStep)
  }
}

describe('third-person character', () => {
  it('keeps the camera stable when a pedestrian capsule crosses the boom', async () => {
    const physics = await createPhysics([floor]);
    const other = createCharacterCollider(physics, { x: 0, y: 0, z: 2 }); physics.step(fixedStep);
    const camera = new PerspectiveCamera(58, 1.6, 0.08, 650);
    const player = createPlayer(new Scene(), camera, physics, { x: 0, y: 0, z: 0 });
    try { expect(camera.position.z).toBeGreaterThan(4.5); }
    finally { player.dispose(); other.dispose(); physics.dispose(); }
  })
  it('restores normal camera zoom and unarmed pose on reset', async () => {
    await withPlayer([], (player, camera) => {
      player.setAimPose(true, 'pistol'); player.render(1, 1); expect(camera.fov).toBeLessThan(50);
      player.reset(); player.render(1, 1); expect(camera.fov).toBe(58);
    });
  })
  it('moves forward, covers more ground while running and returns to spawn on reset', async () => {
    await withPlayer([], (player) => {
      advance(player, 60, forward)
      const walkingDistance = -player.position.z
      expect(walkingDistance).toBeGreaterThan(2)
      expect(player.position.x).toBeCloseTo(0)

      player.reset()
      advance(player, 1)
      expect(player.position.z).toBeCloseTo(0)
      advance(player, 60, { ...forward, run: true })
      expect(-player.position.z).toBeGreaterThan(walkingDistance + 1)
    })
  })

  it('jumps from the ground and lands without sinking through the floor', async () => {
    await withPlayer([], (player) => {
      advance(player, 10)
      const ground = player.position.y
      advance(player, 1, { ...idle, jump: true })
      advance(player, 16)
      expect(player.position.y).toBeGreaterThan(ground + 0.5)
      advance(player, 80)
      expect(player.position.y).toBeCloseTo(ground, 1)
    })
  })

  it('stops against a building wall while running', async () => {
    const wall: StaticBox = { x: 0, y: 2, z: -4, halfX: 4, halfY: 2, halfZ: 0.25 }
    await withPlayer([wall], (player) => {
      advance(player, 90, { ...forward, run: true })
      expect(player.position.z).toBeLessThan(-2.5)
      expect(player.position.z).toBeGreaterThan(wall.z + wall.halfZ + 0.2)
    })
  })

  it('keeps the follow camera in front of a wall behind the character', async () => {
    const wall: StaticBox = { x: 0, y: 2, z: 2, halfX: 4, halfY: 2, halfZ: 0.25 }
    await withPlayer([wall], (player, camera) => {
      const blockedDistance = camera.position.z - player.position.z
      expect(camera.position.z).toBeLessThan(wall.z - wall.halfZ)

      advance(player, 65, forward)
      expect(camera.position.z - player.position.z).toBeGreaterThan(blockedDistance + 1)
      expect(camera.position.z).toBeLessThan(wall.z - wall.halfZ)
    })
  })
})
