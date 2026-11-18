import { PerspectiveCamera, Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { createPhysics, type Point3, type StaticBox } from '../src/physics/physics'
import { createVehicleObstacles } from '../src/physics/vehicle-obstacles'
import { createPlayer, type MovementInput } from '../src/player/player'
import { createVehicle } from '../src/vehicles/vehicle'

const floor: StaticBox = { x: 0, y: -0.5, z: 0, halfX: 150, halfY: 0.5, halfZ: 150 }
const fixedStep = 1 / 60
const idle: MovementInput = { x: 0, z: 0, jump: false, run: false }
const forward = { ...idle, z: 1 }
type Vehicle = ReturnType<typeof createVehicle>
type Player = ReturnType<typeof createPlayer>

async function withVehicle(
  boxes: StaticBox[],
  check: (car: Vehicle, player: Player, camera: PerspectiveCamera, physics: Awaited<ReturnType<typeof createPhysics>>) => void,
  spawn: Point3 = { x: -1.76, y: 0, z: 0 },
) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(59, 1, 0.1, 150)
  const physics = await createPhysics([floor, ...boxes])
  const player = createPlayer(scene, camera, physics, spawn)
  const car = createVehicle(scene, physics, { x: 0, y: 0, z: 0 })
  try {
    for (let step = 0; step < 4; step++) player.step(fixedStep, idle)
    check(car, player, camera, physics)
  } finally {
    car.dispose()
    player.dispose()
    physics.dispose()
  }
}

function drive(car: Vehicle, frames: number, input: MovementInput) {
  let strongestImpact = 0
  for (let frame = 0; frame < frames; frame++) {
    car.step(fixedStep, input)
    strongestImpact = Math.max(strongestImpact, car.impact)
  }
  return strongestImpact
}

describe('Rayo GT', () => {
  it('boards, accelerates, steers, follows with the camera and returns control on exit', async () => {
    await withVehicle([], (car, player, camera) => {
      expect(car.canInteract(player)).toBe(true)
      expect(car.interact(player)).toBe(true)
      expect(car.active).toBe(true)
      drive(car, 75, forward)
      expect(car.speed).toBeGreaterThan(6)
      expect(car.position.z).toBeLessThan(-4)
      expect(car.interact(player)).toBe(false)

      drive(car, 35, { ...forward, x: 1 })
      expect(car.heading).toBeGreaterThan(0.3)
      expect(car.position.x).toBeGreaterThan(0.6)
      car.render(1, fixedStep)
      player.render(1, fixedStep)
      expect(camera.position.distanceTo(car.position)).toBeGreaterThan(6)

      drive(car, 90, { ...idle, handbrake: true })
      expect(car.speed).toBeLessThan(0.4)
      expect(car.interact(player)).toBe(true)
      expect(car.active).toBe(false)
      expect(player.position.distanceTo(car.position)).toBeGreaterThan(1.3)
      expect(player.position.y).toBeCloseTo(0, 1)
    })
  })

  it('uses reverse from rest and restores the car and avatar on reset', async () => {
    await withVehicle([], (car, player) => {
      expect(car.interact(player)).toBe(true)
      drive(car, 105, { ...idle, z: -1 })
      expect(car.position.z).toBeGreaterThan(3)
      expect(car.speed).toBeLessThan(8)

      car.reset(player)
      expect(car.active).toBe(false)
      expect(car.position.length()).toBeCloseTo(0)
      expect(player.position.x).toBeCloseTo(-1.76)
      player.step(fixedStep, forward)
      expect(player.position.z).toBeLessThan(0)
    })
  })

  it('detects a wall impact and stops without crossing it', async () => {
    const wall: StaticBox = { x: 0, y: 2, z: -8, halfX: 8, halfY: 2, halfZ: 0.2 }
    await withVehicle([wall], (car, player) => {
      expect(car.interact(player)).toBe(true)
      const impact = drive(car, 170, forward)
      expect(impact).toBeGreaterThan(4)
      expect(car.position.z).toBeGreaterThan(-6.1)
      expect(car.position.z).toBeLessThan(-5.5)
      expect(car.speed).toBeLessThan(0.8)
    })
  })

  it('uses the available door and refuses to exit when neither side is clear', async () => {
    const leftDoor: StaticBox = { x: -1.6, y: 1.3, z: 0, halfX: 0.15, halfY: 1.3, halfZ: 1 }
    const rightDoor: StaticBox = { ...leftDoor, x: 1.6 }
    await withVehicle([leftDoor], (car, player) => {
      expect(car.interact(player)).toBe(true)
      car.step(fixedStep, idle)
      expect(car.interact(player)).toBe(true)
      expect(player.position.x).toBeGreaterThan(1.4)
    }, { x: 1.85, y: 0, z: 0 })

    await withVehicle([leftDoor, rightDoor], (car, player) => {
      expect(car.interact(player)).toBe(true)
      car.step(fixedStep, idle)
      expect(car.canInteract(player)).toBe(false)
      expect(car.interact(player)).toBe(false)
      expect(car.active).toBe(true)
    }, { x: 0, y: 0, z: 2.24 })
  })

  it('collides with nearby kinematic traffic and can use the route once it clears', async () => {
    await withVehicle([], (car, player, _camera, physics) => {
      const traffic = createVehicleObstacles(physics)
      const vehicle = { id: 'traffic-1', x: 0, z: -9.5, heading: 0 }
      traffic.update([vehicle], car.position)
      expect(car.interact(player)).toBe(true)
      expect(drive(car, 150, forward)).toBeGreaterThan(3)
      expect(car.position.z).toBeGreaterThan(-6.2)
      traffic.update([], car.position)
      drive(car, 120, forward)
      expect(car.position.z).toBeLessThan(-12)
      traffic.reset()
    })
  })
})
