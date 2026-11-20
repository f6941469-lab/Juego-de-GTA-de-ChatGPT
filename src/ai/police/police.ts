import { MathUtils, type Scene } from 'three'
import { closestRoadNode, findRoadRoute, type RoadGraph, type RoadLane, type RoadNode } from '../../navigation/road-graph'
import type { StaticBox } from '../../physics/physics'
import { SpatialBoxGrid } from '../../physics/spatial-index'
import { createVehicleModel } from '../../vehicles/vehicle-model'
import { createWantedSystem, responseLevels, type Location } from './wanted'

interface PoliceTarget extends Location {
  heading: number
  speed: number
}

interface Patrol {
  id: string
  x: number
  z: number
  heading: number
  speed: number
  previousX: number
  previousZ: number
  node: RoadNode
  route: RoadLane[]
  next: Location
  holding: boolean
  model: ReturnType<typeof createVehicleModel>
}

const distance = (a: Location, b: Location) => Math.hypot(a.x - b.x, a.z - b.z)

export function clearLine(
  origin: Location,
  target: Location,
  boxes: readonly StaticBox[] | SpatialBoxGrid,
  margin = 0,
) {
  if (boxes instanceof SpatialBoxGrid) {
    return boxes.clearLine(origin, target, { margin, minY: 1, maxY: 2 })
  }
  const dx = target.x - origin.x
  const dz = target.z - origin.z
  for (const box of boxes) {
    if (box.y + box.halfY <= 1 || box.y - box.halfY >= 2) continue
    const left = box.x - box.halfX - margin
    const right = box.x + box.halfX + margin
    const near = box.z - box.halfZ - margin
    const far = box.z + box.halfZ + margin
    if (Math.max(origin.x, target.x) < left || Math.min(origin.x, target.x) > right
      || Math.max(origin.z, target.z) < near || Math.min(origin.z, target.z) > far) continue
    const tx1 = dx === 0 ? -Infinity : (left - origin.x) / dx
    const tx2 = dx === 0 ? Infinity : (right - origin.x) / dx
    const tz1 = dz === 0 ? -Infinity : (near - origin.z) / dz
    const tz2 = dz === 0 ? Infinity : (far - origin.z) / dz
    if (Math.max(0, Math.min(tx1, tx2), Math.min(tz1, tz2)) <= Math.min(1, Math.max(tx1, tx2), Math.max(tz1, tz2))) {
      return false
    }
  }
  return true
}

function viewing(observer: Location & { heading: number }, target: Location, range: number, fov: number) {
  const dx = target.x - observer.x
  const dz = target.z - observer.z
  const gap = Math.hypot(dx, dz)
  if (gap > range) return false
  return gap < 5 || (Math.sin(observer.heading) * dx - Math.cos(observer.heading) * dz) / gap >= fov
}

export function createPolice(scene: Scene, graph: RoadGraph, obstacleBoxes: readonly StaticBox[] | SpatialBoxGrid) {
  const boxes = obstacleBoxes instanceof SpatialBoxGrid ? obstacleBoxes : new SpatialBoxGrid(obstacleBoxes)
  const units: Patrol[] = []
  const nodes = [...graph.nodes.values()]
  const wanted = createWantedSystem()
  let serial = 0
  let clock = 0
  let untilPlan = 0
  let detention = 0
  let caught = false

  function remove(unit: Patrol) {
    scene.remove(unit.model.mesh)
    unit.model.dispose()
  }

  function sendPatrol(origin: PoliceTarget) {
    const valid = nodes.filter((node) => {
      const gap = distance(node, origin)
      return gap > 44 && gap < 145
        && units.every((unit) => distance(node, unit) > 11)
        && (!viewing(origin, node, 145, 0.55) || !clearLine(origin, node, boxes))
    })
    valid.sort((a, b) => Math.abs(distance(a, origin) - 65) - Math.abs(distance(b, origin) - 65))
    const node = valid[serial % Math.max(1, Math.min(valid.length, 3))]
    if (!node) return
    const model = createVehicleModel(0x293354, { detail: false, police: true })
    scene.add(model.mesh)
    model.mesh.position.set(node.x, 0, node.z)
    const heading = Math.atan2(origin.x - node.x, node.z - origin.z)
    units.push({
      id: `patrol-${++serial}`, x: node.x, z: node.z, heading, speed: 0,
      previousX: node.x, previousZ: node.z, node, route: [], next: node, holding: false, model,
    })
  }

  function plan(unit: Patrol, index: number) {
    const lastKnown = wanted.lastKnown
    const holdJunction = wanted.level >= 4 && index >= 3 && wanted.state !== 'Búsqueda'
    unit.holding = holdJunction
    if (lastKnown && index < 2 && distance(lastKnown, unit) < 26 && clearLine(unit, lastKnown, boxes, 0.85)) {
      unit.route = []
      unit.next = lastKnown
      return
    }

    const anchor = wanted.level >= 3 && index >= 1 && wanted.state === 'Persecución'
      ? wanted.predicted : lastKnown
    let destination: RoadNode | undefined
    if (anchor) {
      const search = wanted.state === 'Búsqueda'
      const spread = (search ? 18 : 8) * index + (search ? 14 : 0)
      const angle = index * 2.4 + (search ? Math.floor(clock / 4) : 0)
      const projected = wanted.predicted
      const directionX = lastKnown && projected ? projected.x - lastKnown.x : 0
      const directionZ = lastKnown && projected ? projected.z - lastKnown.z : 0
      const directionLength = Math.hypot(directionX, directionZ)
      const lookahead = holdJunction && directionLength > 0.5 ? 23 / directionLength : 0
      destination = closestRoadNode(graph, {
        x: anchor.x + Math.sin(angle) * spread + directionX * lookahead,
        z: anchor.z + Math.cos(angle) * spread + directionZ * lookahead,
      })
    } else if (!unit.route.length && distance(unit, unit.next) < 2) {
      const options = graph.outgoing.get(unit.node.id) ?? []
      destination = options[(index + Math.floor(clock * 0.8)) % options.length]?.to
    }

    if (!destination || (unit.route.length && unit.route.at(-1)?.to.id === destination.id)) return
    const origin = closestRoadNode(graph, unit) ?? unit.node
    const route = findRoadRoute(graph, origin.id, destination.id)
    if (route.length) {
      unit.route = [...route]
      unit.next = distance(unit, route[0].start) > 3.8 ? route[0].start : route[0].end
    } else if (distance(unit, destination) > 1 && clearLine(unit, destination, boxes, 0.8)) {
      unit.route = []
      unit.next = destination
    }
  }

  function steer(unit: Patrol, dt: number, pause: boolean) {
    unit.previousX = unit.x
    unit.previousZ = unit.z
    if (distance(unit, unit.next) < 1.5 && unit.route.length) {
      const lane = unit.route[0]
      if (unit.next === lane.start) unit.next = lane.end
      else {
        unit.node = lane.to
        unit.route.shift()
        unit.next = unit.route[0]?.end ?? lane.end
      }
    }
    const gap = distance(unit, unit.next)
    const desired = Math.atan2(unit.next.x - unit.x, unit.z - unit.next.z)
    const turn = MathUtils.euclideanModulo(desired - unit.heading + Math.PI, Math.PI * 2) - Math.PI
    if (gap > 1.1) unit.heading += MathUtils.clamp(turn, -dt * 3.1, dt * 3.1)
    const pace = wanted.level ? 12.2 + Math.min(2, wanted.level) : 6.7
    const atJunction = unit.holding && !unit.route.length && gap < 2.7
    const speed = pause || atJunction || gap < 1.1 ? 0 : Math.min(pace, gap / dt) * (1 - Math.min(Math.abs(turn) / 1.9, 0.85))
    unit.speed = MathUtils.damp(unit.speed, speed, speed === 0 ? 8 : 4, dt)
    const next = { x: unit.x + Math.sin(unit.heading) * unit.speed * dt, z: unit.z - Math.cos(unit.heading) * unit.speed * dt }
    if (unit.speed > 0.1 && !clearLine(unit, next, boxes, 0.65)) {
      unit.speed = 0
      unit.route = []
      unit.next = { x: unit.x, z: unit.z }
      unit.node = closestRoadNode(graph, unit) ?? unit.node
      return
    }
    unit.x = next.x
    unit.z = next.z
  }

  let fireCooldown = 0.8

  function step(
    dt: number,
    target: PoliceTarget,
    combat?: { onFire?: (shooter: Location, hitPlayer: boolean, damage: number) => void },
  ) {
    clock += dt
    untilPlan -= dt
    let observed: Location | undefined
    if (untilPlan <= 0) {
      untilPlan = 0.24
      const desired = responseLevels[wanted.level].units
      if (units.length) {
        const farthest = units.reduce((a, b) => distance(a, target) > distance(b, target) ? a : b)
        const distanceFromTarget = distance(farthest, target)
        if (distanceFromTarget > 175 || (units.length > desired && distanceFromTarget > 26)) {
          units.splice(units.indexOf(farthest), 1)
          remove(farthest)
        }
      }
      if (units.length < desired) sendPatrol(target)
      if (wanted.level && units.some((unit) =>
        viewing(unit, target, responseLevels[wanted.level].detection, 0.52) && clearLine(unit, target, boxes))) {
        observed = target
      }
      units.forEach(plan)
    }
    wanted.step(dt, observed)
    for (const unit of units) {
      const queue = units.some((other) => other !== unit && viewing(unit, other, 5.8, 0.63))
      steer(unit, dt, queue)
    }
    fireCooldown = Math.max(0, fireCooldown - dt)
    if (combat?.onFire && wanted.level >= 2 && wanted.state === 'Persecución' && fireCooldown <= 0) {
      const shooter = units.find((unit) => distance(unit, target) < 25 && clearLine(unit, target, boxes))
      if (shooter) {
        fireCooldown = Math.max(0.85, 1.55 - wanted.level * 0.14)
        const hitChance = Math.max(0.16, 0.48 + wanted.level * 0.05 - target.speed * 0.018)
        const pseudo = (Math.sin(clock * 12.9898 + shooter.x * 0.37) * 43758.5453) % 1
        const roll = pseudo < 0 ? pseudo + 1 : pseudo
        combat.onFire(shooter, roll < hitChance, 8 + wanted.level * 1.5)
      }
    }
    const close = wanted.state === 'Persecución' && target.speed < 3.5
      && units.some((unit) => distance(unit, target) < 4.1 && clearLine(unit, target, boxes))
    detention = close ? detention + dt : Math.max(0, detention - 2 * dt)
    if (detention >= 1.6) caught = true
  }

  return {
    wanted,
    reportImpact(position: Location) {
      if (units.some((unit) => distance(unit, position) < 32
        || (viewing(unit, position, 48, 0.55) && clearLine(unit, position, boxes)))) {
        wanted.report(position)
      }
    },
    step,
    render(alpha: number, dt: number, elapsed: number, hour: number) {
      for (const unit of units) {
        unit.model.mesh.position.set(MathUtils.lerp(unit.previousX, unit.x, alpha), 0, MathUtils.lerp(unit.previousZ, unit.z, alpha))
        unit.model.mesh.rotation.y = -unit.heading
        unit.model.update(dt, unit.speed, 0, unit.speed < 0.6)
        unit.model.setLights(hour < 7 || hour > 18.5)
        unit.model.setSiren(elapsed + unit.heading, wanted.level > 0)
      }
    },
    get units(): readonly (Location & { heading: number; id: string; speed: number })[] { return units },
    get routes(): readonly (readonly RoadLane[])[] { return units.map((unit) => unit.route) },
    takeDetention() { const result = caught; caught = false; return result },
    reset() {
      for (const unit of units.splice(0)) remove(unit)
      clock = untilPlan = detention = 0
      fireCooldown = 0.8
      caught = false
      wanted.reset()
    },
  }
}
