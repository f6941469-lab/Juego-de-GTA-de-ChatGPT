import { MathUtils, type Scene } from 'three'
import { closestRoadNode, findRoadRoute, type RoadGraph, type RoadLane, type RoadNode } from '../../navigation/road-graph'
import type { StaticBox } from '../../physics/physics'
import { SpatialBoxGrid } from '../../physics/spatial-index'
import { createPoliceVisuals } from './police-visuals'
import { createWantedSystem, responseLevels, type Location } from './wanted'

export interface PoliceTarget extends Location {
  heading: number
  speed: number
  inVehicle?: boolean
  vehicleId?: string
  vehicleLabel?: string
  armed?: boolean
}

export interface PoliceObstacle extends Location {
  heading?: number
  speed?: number
  radius?: number
}

export type PatrolRole = 'intercept' | 'perimeter' | 'foot_search'

interface FootOfficer {
  x: number
  z: number
  previousX: number
  previousZ: number
  heading: number
  speed: number
  active: boolean
}

interface Patrol {
  id: string
  x: number
  z: number
  heading: number
  previousHeading: number
  speed: number
  previousX: number
  previousZ: number
  braking: boolean
  node: RoadNode
  route: RoadLane[]
  next: Location
  holding: boolean
  role: PatrolRole
  dismounted: boolean
  officer: FootOfficer
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
  const visuals = createPoliceVisuals(scene, 8)
  let serial = 0
  let clock = 0
  let untilPlan = 0
  let detention = 0
  let caught = false
  let lastTargetSnapshot: PoliceTarget = { x: 0, z: 0, heading: 0, speed: 0 }

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
    const heading = Math.atan2(origin.x - node.x, node.z - origin.z)
    units.push({
      id: `patrol-${++serial}`,
      x: node.x,
      z: node.z,
      heading,
      previousHeading: heading,
      speed: 0,
      previousX: node.x,
      previousZ: node.z,
      braking: false,
      node,
      route: [],
      next: node,
      holding: false,
      role: 'patrol' as PatrolRole,
      dismounted: false,
      officer: {
        x: node.x,
        z: node.z,
        previousX: node.x,
        previousZ: node.z,
        heading,
        speed: 0,
        active: false,
      },
    })
  }

  function plan(unit: Patrol, index: number) {
    const lastKnown = wanted.lastKnown
    if (!wanted.level) {
      unit.role = 'intercept'
      unit.dismounted = false
      unit.officer.active = false
    } else if (wanted.state === 'Persecución' && index < 2) {
      unit.role = 'intercept'
    } else if (wanted.storeSiege || index >= 1) {
      unit.role = unit.dismounted ? 'foot_search' : 'perimeter'
    } else {
      unit.role = unit.dismounted ? 'foot_search' : 'intercept'
    }

    const holdJunction = (wanted.level >= 4 && index >= 3 && wanted.state !== 'Búsqueda')
      || (wanted.storeSiege && wanted.state !== 'Persecución')
    unit.holding = holdJunction

    // Check dismount / reboard transitions for foot search & store siege
    if (lastKnown && wanted.level > 0) {
      const distLastKnown = distance(unit, lastKnown)
      const shouldSearchOnFoot =
        wanted.state !== 'Persecución'
        && (wanted.storeSiege ? distLastKnown < 26 : distLastKnown < 16)
        && index <= 2
      if (shouldSearchOnFoot && !unit.dismounted) {
        unit.holding = true
        unit.route = []
        unit.next = { x: unit.x, z: unit.z }
        if (unit.speed < 4.5) {
          const doorX = unit.x - Math.cos(unit.heading) * 1.45
          const doorZ = unit.z - Math.sin(unit.heading) * 1.45
          const clearSpawn = clearLine(unit, { x: doorX, z: doorZ }, boxes, 0.35)
          unit.dismounted = true
          unit.officer.active = true
          unit.officer.x = clearSpawn ? doorX : unit.x
          unit.officer.z = clearSpawn ? doorZ : unit.z
          unit.officer.previousX = unit.officer.x
          unit.officer.previousZ = unit.officer.z
          unit.officer.heading = unit.heading
          unit.officer.speed = 0
        }
        return
      }
      if (unit.dismounted && wanted.state === 'Persecución' && distance(unit, lastKnown) > 26) {
        unit.dismounted = false
        unit.officer.active = false
      }
    }

    if (unit.dismounted) return

    if (lastKnown && index < 2 && distance(lastKnown, unit) < 26 && clearLine(unit, lastKnown, boxes, 0.98)) {
      unit.route = []
      unit.next = lastKnown
      return
    }

    const anchor = wanted.level >= 3 && index >= 1 && wanted.state === 'Persecución'
      ? wanted.predicted : lastKnown
    let destination: RoadNode | undefined
    if (anchor) {
      const search = wanted.state === 'Búsqueda' || wanted.state === 'Investigación'
      const perimeterMode = unit.role === 'perimeter' || wanted.storeSiege
      const spread = perimeterMode
        ? (wanted.storeSiege ? 19 : 22 + index * 5)
        : (search ? 16 : 7) * index + (search ? 12 : 0)
      const angle = perimeterMode
        ? index * (Math.PI * 0.5) + (search ? Math.floor(clock / 6) * 0.45 : 0)
        : index * 2.4 + (search ? Math.floor(clock / 4) : 0)
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
    } else if (distance(unit, destination) > 1 && clearLine(unit, destination, boxes, 0.98)) {
      unit.route = []
      unit.next = destination
    }
  }

  function stepOfficer(unit: Patrol, dt: number, index: number) {
    const officer = unit.officer
    officer.previousX = officer.x
    officer.previousZ = officer.z
    const anchor = wanted.lastKnown
    if (!anchor) {
      officer.speed = 0
      return
    }
    const patrolOffset = wanted.state === 'Persecución' ? 0 : 3.2
    const phase = clock * 0.65 + index * 2.1
    const goal = {
      x: anchor.x + Math.sin(phase) * patrolOffset,
      z: anchor.z + Math.cos(phase) * patrolOffset,
    }
    const gap = distance(officer, goal)
    if (gap < 1.2) {
      officer.speed = MathUtils.damp(officer.speed, 0, 8, dt)
      return
    }
    const baseHeading = Math.atan2(goal.x - officer.x, officer.z - goal.z)
    let chosenHeading = baseHeading
    const stepLen = 1.65
    let blocked = true
    for (const offset of [0, 0.65, -0.65, 1.25, -1.25]) {
      const candidate = baseHeading + offset
      const probe = {
        x: officer.x + Math.sin(candidate) * stepLen,
        z: officer.z - Math.cos(candidate) * stepLen,
      }
      if (clearLine(officer, probe, boxes, 0.42)) {
        chosenHeading = candidate
        blocked = false
        break
      }
    }
    if (blocked) {
      officer.speed = 0
      return
    }
    const turn = MathUtils.euclideanModulo(chosenHeading - officer.heading + Math.PI, Math.PI * 2) - Math.PI
    officer.heading += MathUtils.clamp(turn, -dt * 6.5, dt * 6.5)
    officer.speed = MathUtils.damp(officer.speed, 5.2, 6, dt)
    const nextPos = {
      x: officer.x + Math.sin(officer.heading) * officer.speed * dt,
      z: officer.z - Math.cos(officer.heading) * officer.speed * dt,
    }
    if (clearLine(officer, nextPos, boxes, 0.38)) {
      officer.x = nextPos.x
      officer.z = nextPos.z
    } else {
      officer.speed = 0
    }
  }

  function steer(unit: Patrol, dt: number, obstacles: readonly PoliceObstacle[]) {
    unit.previousX = unit.x
    unit.previousZ = unit.z
    unit.previousHeading = unit.heading

    if (unit.dismounted) {
      unit.speed = MathUtils.damp(unit.speed, 0, 10, dt)
      unit.braking = unit.speed > 0.25
      return
    }

    if (distance(unit, unit.next) < 1.5 && unit.route.length) {
      const lane = unit.route[0]
      if (unit.next === lane.start) unit.next = lane.end
      else {
        unit.node = lane.to
        unit.route.shift()
        unit.next = unit.route[0]?.end ?? lane.end
      }
    }

    // Dynamic obstacle avoidance: check patrol peers and civilian traffic (VB-004)
    let dynamicPause = false
    let steerAvoidance = 0
    for (const peer of units) {
      if (peer !== unit && viewing(unit, peer, 6.4, 0.65)) {
        dynamicPause = true
        break
      }
    }
    if (!dynamicPause && obstacles.length > 0) {
      for (const obs of obstacles) {
        const dx = obs.x - unit.x
        const dz = obs.z - unit.z
        const dist = Math.hypot(dx, dz)
        const clearance = (obs.radius ?? 1.7) + 4.2
        if (dist > clearance + 3.4 || dist < 0.01) continue
        const fx = Math.sin(unit.heading)
        const fz = -Math.cos(unit.heading)
        const forwardDot = (fx * dx + fz * dz) / dist
        if (forwardDot < 0.68) continue
        if (dist <= clearance) {
          dynamicPause = true
          break
        }
        const sideDot = fx * dz - fz * dx
        steerAvoidance = sideDot >= 0 ? 0.55 : -0.55
      }
    }

    const gap = distance(unit, unit.next)
    const desired = Math.atan2(unit.next.x - unit.x, unit.z - unit.next.z) + steerAvoidance
    const turn = MathUtils.euclideanModulo(desired - unit.heading + Math.PI, Math.PI * 2) - Math.PI
    if (gap > 1.1) unit.heading += MathUtils.clamp(turn, -dt * 3.1, dt * 3.1)
    const pace = wanted.level ? 12.2 + Math.min(2, wanted.level) : 6.7
    const atJunction = unit.holding && !unit.route.length && gap < 2.7
    const targetSpeed = dynamicPause || atJunction || gap < 1.1
      ? 0
      : Math.min(pace, gap / dt) * (1 - Math.min(Math.abs(turn) / 1.9, 0.85))
    unit.braking = targetSpeed < unit.speed - 0.5 || targetSpeed === 0
    unit.speed = MathUtils.damp(unit.speed, targetSpeed, targetSpeed === 0 ? 8 : 4, dt)

    const next = {
      x: unit.x + Math.sin(unit.heading) * unit.speed * dt,
      z: unit.z - Math.cos(unit.heading) * unit.speed * dt,
    }
    // Realistic hull probe (halfWidth = 0.94, halfLength = 1.96 -> 0.98 margin & front check)
    const frontProbe = {
      x: next.x + Math.sin(unit.heading) * 1.15,
      z: next.z - Math.cos(unit.heading) * 1.15,
    }
    if (unit.speed > 0.1 && (!clearLine(unit, next, boxes, 0.94) || !clearLine(unit, frontProbe, boxes, 0.72))) {
      unit.speed = 0
      unit.braking = true
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
    obstacles: readonly PoliceObstacle[] = [],
  ) {
    lastTargetSnapshot = target
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
        }
      }
      if (units.length < desired) sendPatrol(target)
      if (wanted.level) {
        const baseDetection = responseLevels[wanted.level].detection
        const suspectMatches = wanted.matchesSuspect(target)
        const effectiveRange = suspectMatches
          ? baseDetection
          : target.armed
            ? Math.min(baseDetection, 26)
            : Math.min(baseDetection, 16)
        const seen = units.some((unit) => {
          const vehicleSight = viewing(unit, target, effectiveRange, 0.52) && clearLine(unit, target, boxes)
          const officerSight = unit.dismounted && unit.officer.active
            && viewing(unit.officer, target, Math.min(effectiveRange, 32), 0.35)
            && clearLine(unit.officer, target, boxes)
          return vehicleSight || officerSight
        })
        if (seen) observed = target
      }
      units.forEach(plan)
    }

    wanted.step(
      dt,
      observed,
      observed
        ? {
          suspect: {
            inVehicle: target.inVehicle,
            vehicleId: target.vehicleId,
            vehicleLabel: target.vehicleLabel,
            armed: target.armed,
          },
        }
        : undefined,
    )

    units.forEach((unit, idx) => {
      steer(unit, dt, obstacles)
      if (unit.dismounted && unit.officer.active) {
        stepOfficer(unit, dt, idx)
      }
    })

    fireCooldown = Math.max(0, fireCooldown - dt)
    if (combat?.onFire && wanted.level >= 2 && wanted.state === 'Persecución' && fireCooldown <= 0) {
      let shooterLoc: Location | undefined
      for (const unit of units) {
        if (unit.dismounted && unit.officer.active && distance(unit.officer, target) < 25 && clearLine(unit.officer, target, boxes)) {
          shooterLoc = unit.officer
          break
        }
        if (distance(unit, target) < 25 && clearLine(unit, target, boxes)) {
          shooterLoc = unit
          break
        }
      }
      if (shooterLoc) {
        fireCooldown = Math.max(0.85, 1.55 - wanted.level * 0.14)
        const hitChance = Math.max(0.16, 0.48 + wanted.level * 0.05 - target.speed * 0.018)
        const pseudo = (Math.sin(clock * 12.9898 + shooterLoc.x * 0.37) * 43758.5453) % 1
        const roll = pseudo < 0 ? pseudo + 1 : pseudo
        combat.onFire(shooterLoc, roll < hitChance, 8 + wanted.level * 1.5)
      }
    }

    const close = wanted.state === 'Persecución' && target.speed < 3.5
      && units.some((unit) => {
        const cruiserClose = distance(unit, target) < 4.1 && clearLine(unit, target, boxes)
        const officerClose = unit.dismounted && unit.officer.active
          && distance(unit.officer, target) < 2.8 && clearLine(unit.officer, target, boxes)
        return cruiserClose || officerClose
      })
    detention = close ? detention + dt : Math.max(0, detention - 2 * dt)
    if (detention >= 1.6) caught = true
  }

  function statusLabel(): string {
    const state = wanted.state
    if (wanted.level === 0) return 'Patrullaje'
    if (wanted.storeSiege && state !== 'Persecución') return 'Cerco en tienda'
    if (state === 'Persecución') {
      return wanted.suspectDescription?.vehicleLabel
        ? `Persecución · ${wanted.suspectDescription.vehicleLabel}`
        : 'Persecución'
    }
    if (state === 'Búsqueda' && !wanted.matchesSuspect(lastTargetSnapshot)) return 'Búsqueda · Vehículo distinto'
    if (units.some((unit) => unit.dismounted && unit.officer.active)) return 'Búsqueda a pie'
    return state
  }

  return {
    wanted,
    reportImpact(position: Location) {
      if (units.some((unit) => distance(unit, position) < 32
        || (viewing(unit, position, 48, 0.55) && clearLine(unit, position, boxes)))) {
        wanted.report(position, 1, undefined, { kind: 'accident' })
      }
    },
    step,
    render(alpha: number, _dt: number, elapsed: number, hour: number) {
      visuals.render(units, alpha, elapsed, hour < 7 || hour > 18.5, wanted.level > 0)
    },
    get units(): readonly (Location & { heading: number; id: string; speed: number; role: PatrolRole; dismounted: boolean; officer: FootOfficer })[] {
      return units
    },
    get routes(): readonly (readonly RoadLane[])[] { return units.map((unit) => unit.route) },
    get statusLabel() { return statusLabel() },
    takeDetention() { const result = caught; caught = false; return result },
    reset() {
      units.length = 0
      clock = untilPlan = detention = 0
      fireCooldown = 0.8
      caught = false
      wanted.reset()
      visuals.render(units, 1, 0, false, false)
    },
    dispose() {
      units.length = 0
      wanted.reset()
      visuals.dispose()
    },
  }
}
