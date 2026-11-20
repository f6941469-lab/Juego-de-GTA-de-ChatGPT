import { Color, MathUtils, type Scene } from 'three'
import { buildRoadGraph, findRoadRoute, type RoadLane, type RoadPoint } from '../../navigation/road-graph'
import { makeRandom, type DistrictMap } from '../../world/generation/layout'
import { createNpcIdentity, type NpcIdentity } from '../npc/profiles'
import { controlsJunction, createSignals, signalAt } from './signals'
import { createTrafficVisuals, type TrafficVisual } from './traffic-visuals'

export interface TrafficObstacle extends RoadPoint { radius?: number }

export interface HijackedTrafficVehicle {
  id: string
  x: number
  z: number
  heading: number
  paint: Color
  speed: number
  driver: NpcIdentity
}

export const profiles = [
  { name: 'prudente', pace: 7.5, acceleration: 2.4, brake: 5.3, headway: 1.08 },
  { name: 'normal', pace: 10.5, acceleration: 3.2, brake: 6.3, headway: 0.83 },
  { name: 'rápido', pace: 13.7, acceleration: 4.1, brake: 7.1, headway: 0.64 },
] as const

interface Turn {
  next: RoadLane
  control: RoadPoint
  distance: number
  length: number
}
interface TrafficVehicle extends TrafficVisual {
  id: string
  profile: typeof profiles[number]
  lane: RoadLane
  distance: number
  route: RoadLane[]
  turn?: Turn
  reserved: boolean
  clear: number
  decision: number
  stalled: number
  driver: NpcIdentity
}

const maxCars = 23
const paints = ['#b66d6b', '#4d7d93', '#e0b471', '#697f73', '#78a7a6', '#cd7147', '#b1a2bd', '#d8d4c7'].map(value => new Color(value))
const gap = (a: RoadPoint, b: RoadPoint) => Math.hypot(a.x - b.x, a.z - b.z)
const heading = (x: number, z: number) => Math.atan2(x, -z)

export function createTraffic(scene: Scene, map: Pick<DistrictMap, 'roads' | 'bounds'>, seed = 0x83cc) {
  const graph = buildRoadGraph(map.roads)
  const nodes = [...graph.nodes.values()]
  const vehicles: TrafficVehicle[] = []
  const reserved = new Map<string, TrafficVehicle>()
  const random = makeRandom(seed ^ 0x544c21)
  const visuals = createTrafficVisuals(scene, maxCars)
  const signals = createSignals(scene, graph)
  let clock = 0
  let populationTimer = 0
  let serial = 0
  let night = false

  function plan(lane: RoadLane, blocked?: string) {
    const from = lane.to.id
    const options = { previousId: lane.from.id, blocked: blocked ? new Set([blocked]) : undefined }
    for (let attempt = 0; attempt < 4; attempt++) {
      const node = nodes[Math.floor(random() * nodes.length)]
      if (node?.id === from || !node) continue
      const route = findRoadRoute(graph, from, node.id, options)
      if (route.length) return route
    }
    const choices = (graph.outgoing.get(from) ?? []).filter(next => next.to.id !== lane.from.id && next.id !== blocked)
    const reverse = (graph.outgoing.get(from) ?? []).find(next => next.to.id === lane.from.id)
    const choice = choices[Math.floor(random() * choices.length)] ?? reverse
    return choice ? [choice] : []
  }

  function locate(car: TrafficVehicle) {
    const { lane, turn } = car
    if (!turn) {
      car.x = lane.start.x + lane.direction.x * car.distance
      car.z = lane.start.z + lane.direction.z * car.distance
      car.heading = heading(lane.direction.x, lane.direction.z)
      return
    }
    const t = MathUtils.clamp(turn.distance / turn.length, 0, 1)
    const u = 1 - t
    const { control, next } = turn
    car.x = u * u * lane.end.x + 2 * t * u * control.x + t * t * next.start.x
    car.z = u * u * lane.end.z + 2 * t * u * control.z + t * t * next.start.z
    car.heading = heading(
      u * (control.x - lane.end.x) + t * (next.start.x - control.x),
      u * (control.z - lane.end.z) + t * (next.start.z - control.z),
    )
  }

  function clearReservation(car: TrafficVehicle) {
    if (reserved.get(car.lane.to.id) === car) reserved.delete(car.lane.to.id)
    car.reserved = false
  }

  function populate(focus: RoadPoint, hour: number) {
    const demand = hour >= 23 || hour < 5 ? 12 : 19
    for (let index = vehicles.length - 1; index >= 0; index--) {
      const car = vehicles[index]
      if (gap(car, focus) > 180 || (vehicles.length > demand && gap(car, focus) > 88)) {
        clearReservation(car)
        vehicles.splice(index, 1)
      }
    }
    if (vehicles.length >= demand) return
    const inner = vehicles.length < 3 ? 16 : 26
    for (let attempt = 0; attempt < 26; attempt++) {
      const lane = graph.lanes[Math.floor(random() * graph.lanes.length)]
      if (!lane || lane.length < 5) continue
      const distance = lane.length * (0.12 + 0.65 * random())
      const x = lane.start.x + lane.direction.x * distance
      const z = lane.start.z + lane.direction.z * distance
      const fromFocus = Math.hypot(x - focus.x, z - focus.z)
      if (fromFocus < inner || fromFocus > 130 || vehicles.some(car => Math.hypot(car.x - x, car.z - z) < 8)) continue
      const profile = profiles[Math.floor(random() * profiles.length)]
      const angle = heading(lane.direction.x, lane.direction.z)
      const carSerial = ++serial
      const driver = createNpcIdentity(seed ^ 0x3b719d, 'driver', carSerial)
      vehicles.push({
        id: `street-${carSerial}`, lane, distance, profile, heading: angle, previousHeading: angle,
        decision: 0.05 * random(), stalled: 0, route: plan(lane), reserved: false, clear: 100,
        paint: paints[Math.floor(random() * paints.length)], braking: false,
        occupied: true, driverShirt: driver.appearance.shirt, driver,
        x, z, previousX: x, previousZ: z, speed: profile.pace * 0.47,
      })
      return
    }
  }

  function exitOccupied(car: TrafficVehicle, lane: RoadLane, obstacles: readonly TrafficObstacle[]) {
    const { x, z } = lane.start
    return vehicles.some(other => other !== car && !other.turn && other.lane === lane && other.distance < 6.1)
      || obstacles.some(obstacle => Math.hypot(obstacle.x - x, obstacle.z - z) < (obstacle.radius ?? 0.8) + 2.3)
  }

  function reserveJunction(car: TrafficVehicle, obstacles: readonly TrafficObstacle[]) {
    if (car.reserved) return true
    const node = car.lane.to
    const next = car.route[0]
    if (!next || reserved.has(node.id) || exitOccupied(car, next, obstacles)) return false
    const phase = controlsJunction(graph, node) ? signalAt(node, car.lane.axis, clock) : 'green'
    if (phase === 'red' || (phase === 'amber' && car.speed < 5)) return false
    reserved.set(node.id, car)
    car.reserved = true
    return true
  }

  function scan(car: TrafficVehicle, obstacles: readonly TrafficObstacle[]) {
    const dx = Math.sin(car.heading)
    const dz = -Math.cos(car.heading)
    let limit = car.profile.pace * (car.profile.headway + 2.2)
    const assess = (point: RoadPoint, width: number, length: number) => {
      const x = point.x - car.x
      const z = point.z - car.z
      const ahead = x * dx + z * dz
      const across = Math.abs(x * dz - z * dx)
      if (ahead > 0 && ahead < limit + 5 && across < width) {
        limit = Math.min(limit, Math.max(0, ahead - length))
      }
    }
    for (const other of vehicles) {
      if (other === car) continue
      const parallel = Math.cos(other.heading - car.heading) > 0.8
      assess(other, parallel ? 1.95 : 2.7, parallel ? 3.95 + car.profile.headway * car.speed * 0.34 : 3.45)
    }
    for (const obstacle of obstacles) {
      const radius = obstacle.radius ?? 0.75
      assess(obstacle, radius + 0.96, radius + 1.92)
    }
    car.clear = limit
  }

  function startTurn(car: TrafficVehicle) {
    const next = car.route.shift()
    if (!next) return
    const a = car.lane.end
    const b = next.start
    const junction = car.lane.to
    let control: RoadPoint
    if (car.lane.axis !== next.axis) {
      control = car.lane.axis === 'x' ? { x: b.x, z: a.z } : { x: a.x, z: b.z }
    } else if (next.to.id === car.lane.from.id) {
      control = { x: junction.x + car.lane.direction.x * 2.1, z: junction.z + car.lane.direction.z * 2.1 }
    } else {
      control = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }
    }
    const midpoint = { x: (a.x + 2 * control.x + b.x) / 4, z: (a.z + 2 * control.z + b.z) / 4 }
    car.turn = { next, control, distance: 0, length: Math.max(0.1, gap(a, midpoint) + gap(midpoint, b)) }
  }

  function drive(car: TrafficVehicle, dt: number, focus: RoadPoint, obstacles: readonly TrafficObstacle[]) {
    car.previousX = car.x
    car.previousZ = car.z
    car.previousHeading = car.heading
    car.decision -= dt
    const atJunction = car.lane.length - car.distance < 15 || !!car.turn
    if (car.decision <= 0 || atJunction) {
      scan(car, obstacles)
      car.decision = gap(car, focus) < 78 ? 0.09 : 0.24
    }
    if (!car.route.length && !car.turn) car.route = plan(car.lane)
    const next = car.route[0]
    let clearance = car.clear
    let cruise: number = car.profile.pace
    if (car.turn) {
      cruise = Math.min(cruise, car.turn.next.axis === car.lane.axis ? 8.1 : 4.8)
    } else {
      const left = car.lane.length - car.distance
      if (next && left < 11) {
        if (exitOccupied(car, next, obstacles) && car.speed < 0.8 && !car.reserved) {
          car.stalled += dt
          if (car.stalled > 3.9) { car.route = plan(car.lane, next.id); car.stalled = 0 }
        } else {
          car.stalled = 0
        }
      }
      if (left < 8) reserveJunction(car, obstacles)
      if (!car.reserved) clearance = Math.min(clearance, Math.max(0, left - 1.82))
      if (next && left < 9 && (next.axis !== car.lane.axis || next.to.id === car.lane.from.id)) cruise = Math.min(cruise, 6.4)
    }
    const safe = Math.sqrt(2 * car.profile.brake * Math.max(0, clearance))
    const target = Math.min(cruise, safe)
    const rate = target < car.speed ? car.profile.brake : car.profile.acceleration
    const speed = car.speed + MathUtils.clamp(target - car.speed, -rate * dt, rate * dt)
    car.braking = speed < car.speed - 0.008 || target < 0.25
    const travel = Math.min(speed * dt, clearance)
    car.clear = Math.max(0, car.clear - travel)
    car.speed = travel / dt

    if (car.turn) {
      car.turn.distance += travel
      if (car.turn.distance >= car.turn.length) {
        clearReservation(car)
        car.lane = car.turn.next
        car.distance = car.turn.distance - car.turn.length
        car.turn = undefined
      }
    } else {
      car.distance = Math.min(car.lane.length, car.distance + travel)
      if (car.distance >= car.lane.length && car.reserved) startTurn(car)
    }
    locate(car)
  }

  if (graph.lanes.length) {
    const focus = { x: (map.bounds.minX + map.bounds.maxX) / 2, z: (map.bounds.minZ + map.bounds.maxZ) / 2 }
    for (let index = 0; index < 7; index++) populate(focus, 17)
    signals.update(0, focus)
  }

  function findHijackCandidate(position: RoadPoint, maxDistance = 3.8): TrafficVehicle | undefined {
    let best: TrafficVehicle | undefined
    let bestDist = maxDistance
    for (const car of vehicles) {
      if (car.speed > 12) continue
      const dist = Math.hypot(car.x - position.x, car.z - position.z)
      if (dist <= bestDist) {
        bestDist = dist
        best = car
      }
    }
    return best
  }

  function hijackNearest(position: RoadPoint, maxDistance = 3.8): HijackedTrafficVehicle | null {
    const car = findHijackCandidate(position, maxDistance)
    if (!car) return null
    const index = vehicles.indexOf(car)
    if (index < 0) return null
    clearReservation(car)
    vehicles.splice(index, 1)
    return {
      id: car.id,
      x: car.x,
      z: car.z,
      heading: car.heading,
      paint: car.paint.clone(),
      speed: car.speed,
      driver: car.driver,
    }
  }

  return {
    graph,
    get count() { return vehicles.length },
    get vehicles(): readonly TrafficVehicle[] { return vehicles },
    get routes(): readonly (readonly RoadLane[])[] { return vehicles.map(vehicle => vehicle.route) },
    findHijackCandidate(position: RoadPoint, maxDistance = 3.8) {
      const car = findHijackCandidate(position, maxDistance)
      return car ? { id: car.id, x: car.x, z: car.z, heading: car.heading } : null
    },
    hijackNearest,
    step(dt: number, focus: RoadPoint, obstacles: readonly TrafficObstacle[] = [], hour = 17) {
      if (!(dt > 0)) return
      clock += dt
      night = hour < 7 || hour > 18.5
      populationTimer -= dt
      if (populationTimer <= 0) {
        populationTimer = 0.45
        populate(focus, hour)
      }
      signals.update(clock, focus)
      for (const car of vehicles) drive(car, dt, focus, obstacles)
    },
    render(alpha: number, _elapsed: number) { visuals.render(vehicles, alpha, night) },
    dispose() {
      reserved.clear()
      vehicles.length = 0
      visuals.dispose()
      signals.dispose()
    },
  }
}
