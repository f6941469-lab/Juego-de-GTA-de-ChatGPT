import RAPIER from '@dimforge/rapier3d-compat'
import type { Physics } from './physics'

export interface RoadVehiclePosition {
  id: string | number
  x: number
  z: number
  heading: number
}

export function createVehicleObstacles(physics: Physics) {
  const { world } = physics
  const bodies = new Map<string | number, RAPIER.RigidBody>()

  function update(vehicles: readonly RoadVehiclePosition[], focus: { x: number; z: number }) {
    const present = new Set<string | number>()
    for (const vehicle of vehicles) {
      const id = vehicle.id
      let body = bodies.get(id)
      const limit = body ? 46 : 36
      if ((vehicle.x - focus.x) ** 2 + (vehicle.z - focus.z) ** 2 > limit ** 2) continue
      const position = { x: vehicle.x, y: 0.58, z: vehicle.z }
      const rotation = { x: 0, y: -Math.sin(vehicle.heading / 2), z: 0, w: Math.cos(vehicle.heading / 2) }
      present.add(id)
      if (!body) {
        body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
          .setTranslation(position.x, position.y, position.z).setRotation(rotation))
        world.createCollider(RAPIER.ColliderDesc.cuboid(0.87, 0.48, 1.72).setFriction(0.52), body)
        bodies.set(id, body)
      } else {
        body.setNextKinematicTranslation(position)
        body.setNextKinematicRotation(rotation)
      }
    }
    for (const [id, body] of bodies) {
      if (!present.has(id)) { world.removeRigidBody(body); bodies.delete(id) }
    }
  }

  return {
    update,
    reset() {
      for (const body of bodies.values()) world.removeRigidBody(body)
      bodies.clear()
    },
  }
}
