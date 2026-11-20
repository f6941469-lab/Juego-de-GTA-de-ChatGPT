import RAPIER from '@dimforge/rapier3d-compat'
import { MathUtils, Vector3, type ColorRepresentation, type Scene } from 'three'
import { createCameraClearance, createExitClearance, type Physics, type Point3 } from '../physics/physics'
import type { createPlayer, MovementInput } from '../player/player'
import { createVehicleModel, vehicleDimensions } from './vehicle-model'

type Player = ReturnType<typeof createPlayer>
export type VehicleSpawn = Point3 & { heading?: number; paint?: ColorRepresentation; label?: string }

const STOP_SPEED = 1.1
const TOP_FORWARD_SPEED = 25
const TOP_REVERSE_SPEED = 7.5
const WHEELBASE = 2.44
const CENTER_HEIGHT = vehicleDimensions.hullHeight / 2
const ZERO = { x: 0, y: 0, z: 0 }

function rotation(heading: number) {
  return { x: 0, y: -Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }
}

function approach(value: number, target: number, change: number) {
  return value + MathUtils.clamp(target - value, -change, change)
}

export function createVehicle(scene: Scene, physics: Physics, spawn: VehicleSpawn) {
  const { world } = physics
  const model = createVehicleModel(spawn.paint)
  if (spawn.label) model.mesh.name = spawn.label
  scene.add(model.mesh)
  const initialHeading = spawn.heading ?? 0
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
    .setTranslation(spawn.x, spawn.y + CENTER_HEIGHT, spawn.z)
    .setRotation(rotation(initialHeading))
    .setCcdEnabled(true))
  const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(
    vehicleDimensions.halfWidth, CENTER_HEIGHT, vehicleDimensions.halfLength,
  ).setMass(1160).setFriction(0.08).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min), body)

  const position = new Vector3(spawn.x, spawn.y, spawn.z)
  const previous = position.clone()
  const visualPosition = new Vector3().copy(position)
  const exitClearance = createExitClearance(physics, collider)
  const cameraTarget = {
    position: visualPosition,
    get heading() { return visualHeading },
    clearFraction: createCameraClearance(physics, collider),
  }
  let heading = initialHeading
  let previousHeading = initialHeading
  let visualHeading = initialHeading
  let signedSpeed = 0
  let speed = 0
  let steering = 0
  let braking = false
  let impact = 0
  let engineLoad = 0
  let driver: Player | undefined

  function findExit() {
    const rightX = Math.cos(heading)
    const rightZ = Math.sin(heading)
    const forwardX = Math.sin(heading)
    const forwardZ = -Math.cos(heading)
    const door = { x: position.x + forwardX * 0.12, y: position.y, z: position.z + forwardZ * 0.12 }
    for (const side of [-1, 1]) {
      const exit = exitClearance(door, { x: door.x + rightX * 1.58 * side, y: door.y, z: door.z + rightZ * 1.58 * side })
      if (exit) return exit
    }
    return null
  }

  function canBoard(player: Player) {
    const dx = position.x - player.position.x
    const dz = position.z - player.position.z
    const across = dx * Math.cos(heading) + dz * Math.sin(heading)
    const along = dx * Math.sin(heading) - dz * Math.cos(heading)
    return Math.abs(across) < 2.6 && Math.abs(along) < 2.3 && Math.abs(position.y - player.position.y) < 0.95
      && player.canReach({ x: position.x, y: position.y + 0.72, z: position.z }, collider.handle)
  }

  function canInteract(player: Player) {
    return driver ? driver === player && speed <= STOP_SPEED && findExit() !== null : canBoard(player)
  }

  function park() {
    body.setLinvel(ZERO, true)
    body.setAngvel(ZERO, true)
    body.setBodyType(RAPIER.RigidBodyType.Fixed, true)
    speed = signedSpeed = steering = impact = engineLoad = 0
    braking = false
  }

  function boardImmediate(player: Player, initialSpeed = 0) {
    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    body.setEnabledRotations(false, true, false, true)
    if (initialSpeed > 0.1) {
      body.setLinvel({
        x: Math.sin(heading) * initialSpeed,
        y: 0,
        z: -Math.cos(heading) * initialSpeed,
      }, true)
    }
    driver = player
    player.enterVehicle(cameraTarget)
  }

  function interact(player: Player) {
    if (driver) {
      if (driver !== player || speed > STOP_SPEED) return false
      const exit = findExit()
      if (!exit) return false
      park()
      driver.exitVehicle(exit, heading)
      driver = undefined
    } else {
      if (!canBoard(player)) return false
      boardImmediate(player)
    }
    return true
  }

  let pendingAdvanceX = 0
  let pendingAdvanceZ = 0
  let pendingThrottle = 0

  function prepareStep(dt: number, input: MovementInput) {
    if (!driver) return
    previous.copy(position)
    previousHeading = heading
    const forwardX = Math.sin(heading)
    const forwardZ = -Math.cos(heading)
    const rightX = Math.cos(heading)
    const rightZ = Math.sin(heading)
    const velocity = body.linvel()
    const longitudinal = velocity.x * forwardX + velocity.z * forwardZ
    const lateral = velocity.x * rightX + velocity.z * rightZ
    const throttle = MathUtils.clamp(input.z, -1, 1)
    const handbrake = !!input.handbrake
    const reversing = throttle * longitudinal < -0.22
    braking = handbrake || reversing
    pendingThrottle = throttle

    let driveSpeed: number
    if (braking || Math.abs(throttle) < 0.02) {
      const deceleration = handbrake ? 17 : reversing ? 15 : 1.25 + Math.abs(longitudinal) * 0.14
      driveSpeed = approach(longitudinal, 0, deceleration * dt)
    } else {
      const strength = throttle > 0 ? 10 : 6
      const topSpeed = throttle > 0 ? TOP_FORWARD_SPEED : TOP_REVERSE_SPEED
      const power = Math.max(0.18, 1 - Math.abs(longitudinal) / topSpeed)
      driveSpeed = approach(longitudinal, throttle * topSpeed, strength * power * dt)
    }

    const steeringLimit = MathUtils.lerp(0.50, 0.20, Math.min(speed / 25, 1))
    steering = MathUtils.damp(steering, MathUtils.clamp(input.x, -1, 1) * steeringLimit, 13, dt)
    const yaw = MathUtils.clamp(driveSpeed * Math.tan(steering) / WHEELBASE, -1.9, 1.9)
    const slip = lateral * Math.exp(-(handbrake ? 2.6 : 9.5) * dt)
    pendingAdvanceX = forwardX * driveSpeed + rightX * slip
    pendingAdvanceZ = forwardZ * driveSpeed + rightZ * slip
    body.setLinvel({ x: pendingAdvanceX, y: velocity.y, z: pendingAdvanceZ }, true)
    body.setAngvel({ x: 0, y: -yaw, z: 0 }, true)
  }

  function finishStep(dt: number) {
    if (!driver) return
    const pose = body.translation()
    const orientation = body.rotation()
    const result = body.linvel()
    position.set(pose.x, pose.y - CENTER_HEIGHT, pose.z)
    heading = MathUtils.euclideanModulo(-2 * Math.atan2(orientation.y, orientation.w) + Math.PI, Math.PI * 2) - Math.PI
    signedSpeed = result.x * Math.sin(heading) - result.z * Math.cos(heading)
    speed = Math.hypot(result.x, result.z)
    // Rapier modifies the applied velocity on a contact. Tracking the change avoids false damage from deliberate braking.
    impact = Math.hypot(pendingAdvanceX - result.x, pendingAdvanceZ - result.z)
    engineLoad = MathUtils.damp(engineLoad, braking ? 0 : Math.abs(pendingThrottle), 7, dt)
    if (position.y < -15) reset(driver)
  }

  function step(dt: number, input: MovementInput) {
    if (!driver) return
    prepareStep(dt, input)
    physics.step(dt)
    finishStep(dt)
  }

  function render(alpha: number, dt: number) {
    const blend = MathUtils.clamp(alpha, 0, 1)
    visualPosition.lerpVectors(previous, position, blend)
    const turn = MathUtils.euclideanModulo(heading - previousHeading + Math.PI, Math.PI * 2) - Math.PI
    visualHeading = previousHeading + turn * blend
    model.mesh.position.copy(visualPosition)
    model.mesh.rotation.y = -visualHeading
    model.update(dt, signedSpeed, steering, braking)
  }

  function reset(player: Player) {
    if (driver && driver !== player) return
    if (driver) {
      driver.reset()
      driver = undefined
    }
    park()
    body.setTranslation({ x: spawn.x, y: spawn.y + CENTER_HEIGHT, z: spawn.z }, true)
    body.setRotation(rotation(initialHeading), true)
    world.propagateModifiedBodyPositionsToColliders()
    position.set(spawn.x, spawn.y, spawn.z)
    previous.copy(position)
    heading = previousHeading = initialHeading
    render(1, 0)
  }

  render(1, 0)
  return {
    position,
    label: spawn.label ?? 'Rayo GT',
    get active() { return driver !== undefined },
    get heading() { return heading },
    get speed() { return speed },
    get engineLoad() { return engineLoad },
    get braking() { return braking },
    get impact() { return impact },
    canInteract,
    interact,
    boardImmediate,
    prepareStep,
    finishStep,
    step,
    render,
    setLights: model.setLights,
    reset,
    dispose() {
      driver?.reset()
      driver = undefined
      world.removeRigidBody(body)
      model.dispose()
    },
  }
}
