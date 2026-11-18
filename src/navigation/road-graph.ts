import type { MapRectangle } from '../world/generation/layout'

export type Axis = 'x' | 'z'
export interface RoadPoint { x: number; z: number }
export interface RoadNode extends RoadPoint {
  id: string
  width: number
  depth: number
  signalOffset: number
}
export interface RoadLane {
  id: string
  from: RoadNode
  to: RoadNode
  axis: Axis
  start: RoadPoint
  end: RoadPoint
  direction: RoadPoint
  length: number
  cost: number
}
export interface RoadGraph {
  nodes: ReadonlyMap<string, RoadNode>
  lanes: readonly RoadLane[]
  outgoing: ReadonlyMap<string, readonly RoadLane[]>
}

function key(x: number, z: number) { return `${x.toFixed(4)}:${z.toFixed(4)}` }
const gap = (a: RoadPoint, b: RoadPoint) => Math.hypot(a.x - b.x, a.z - b.z)

export function buildRoadGraph(roads: readonly MapRectangle[]): RoadGraph {
  const corridors = roads.map((rect) => ({
    rect,
    axis: (rect.depth > rect.width ? 'z' : 'x') as Axis,
    nodes: new Map<string, RoadNode>(),
  }))
  const nodes = new Map<string, RoadNode>()
  const lanes = new Map<string, RoadLane>()
  const outgoing = new Map<string, RoadLane[]>()

  for (const a of corridors.filter((road) => road.axis === 'z')) {
    for (const b of corridors.filter((road) => road.axis === 'x')) {
      const x = a.rect.x
      const z = b.rect.z
      if (Math.abs(x - b.rect.x) > b.rect.width / 2 + 0.035
        || Math.abs(z - a.rect.z) > a.rect.depth / 2 + 0.035) continue
      const id = key(x, z)
      let node = nodes.get(id)
      if (!node) {
        const phase = Math.round(x * 7 + z * 11) * 0.19
        node = { id, x, z, width: a.rect.width, depth: b.rect.depth, signalOffset: ((phase % 20) + 20) % 20 }
        nodes.set(id, node)
      }
      a.nodes.set(id, node)
      b.nodes.set(id, node)
    }
  }

  for (const { rect, axis, nodes: intersections } of corridors) {
    const sorted = Array.from(intersections.values()).sort((a, b) => a[axis] - b[axis])
    for (const [index, from] of sorted.entries()) {
      const next = sorted[index + 1]
      if (!next) break
      for (const [a, b] of [[from, next], [next, from]]) {
        const id = `${a.id}>${b.id}`
        if (lanes.has(id)) continue
        const cost = gap(a, b)
        const right = Math.min(3.15, (axis === 'x' ? rect.depth : rect.width) * 0.26)
        const sign = Math.sign(b[axis] - a[axis])
        const insetA = Math.min(cost * 0.29, 0.3 + (axis === 'x' ? a.width : a.depth) / 2)
        const insetB = Math.min(cost * 0.29, 0.3 + (axis === 'x' ? b.width : b.depth) / 2)
        const direction = axis === 'x' ? { x: sign, z: 0 } : { x: 0, z: sign }
        const start = { x: a.x - direction.z * right + direction.x * insetA, z: a.z + direction.x * right + direction.z * insetA }
        const end = { x: b.x - direction.z * right - direction.x * insetB, z: b.z + direction.x * right - direction.z * insetB }
        const lane: RoadLane = { id, from: a, to: b, axis, start, end, direction, length: gap(start, end), cost }
        lanes.set(id, lane)
        const edges = outgoing.get(a.id) ?? []
        edges.push(lane)
        outgoing.set(a.id, edges)
      }
    }
  }

  return { nodes, lanes: Array.from(lanes.values()), outgoing }
}

export function closestRoadNode(graph: RoadGraph, position: RoadPoint): RoadNode | undefined {
  let closest: RoadNode | undefined
  let minimum = Infinity
  for (const node of graph.nodes.values()) {
    const distance = (node.x - position.x) ** 2 + (node.z - position.z) ** 2
    if (distance < minimum) { closest = node; minimum = distance }
  }
  return closest
}

/** Dijkstra over road junctions. Blocked links can be excluded without mutating the shared graph. */
export function findRoadRoute(
  graph: RoadGraph,
  startId: string,
  endId: string,
  options: { blocked?: ReadonlySet<string>; previousId?: string } = {},
): RoadLane[] {
  if (startId === endId || !graph.nodes.has(startId) || !graph.nodes.has(endId)) return []
  const frontier = new Set([startId])
  const costs = new Map([[startId, 0]])
  const incoming = new Map<string, RoadLane>()
  while (frontier.size) {
    let current: string | undefined
    let bestCost = Infinity
    for (const id of frontier) {
      const cost = costs.get(id)!
      if (cost < bestCost) { current = id; bestCost = cost }
    }
    if (!current) break
    if (current === endId) {
      const route: RoadLane[] = []
      for (let node = endId; node !== startId;) {
        const lane = incoming.get(node)!
        route.push(lane)
        node = lane.from.id
      }
      return route.reverse()
    }
    frontier.delete(current)
    for (const lane of graph.outgoing.get(current) ?? []) {
      if (options.blocked?.has(lane.id) || (current === startId && options.previousId === lane.to.id)) continue
      const cost = bestCost + lane.cost
      if (cost >= (costs.get(lane.to.id) ?? Infinity)) continue
      incoming.set(lane.to.id, lane)
      costs.set(lane.to.id, cost)
      frontier.add(lane.to.id)
    }
  }
  return []
}
