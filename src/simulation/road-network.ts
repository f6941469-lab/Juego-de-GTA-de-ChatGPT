import type { Point3 } from '../physics/physics';
import { avenues, crossStreets } from '../world/generation/layout';

export interface RoadNode { id: string; x: number; z: number; width: number; depth: number }
export interface RoadLane {
  id: string; from: RoadNode; to: RoadNode; axis: 'x' | 'z';
  start: Point3; end: Point3; dx: number; dz: number; length: number;
}
export interface RoadTurn { from: Point3; to: Point3; control: Point3; length: number }
const key = (x: number, z: number) => `road:${x}:${z}`;
const gap = (a: Point3, b: Point3) => Math.hypot(a.x - b.x, a.z - b.z);

export class RoadNetwork {
  readonly nodes = new Map<string, RoadNode>();
  readonly lanes: RoadLane[] = [];
  private readonly outgoing = new Map<string, RoadLane[]>();
  private readonly reservations = new Map<string, string>();
  readonly stats = { routes: 0, waits: 0 };

  constructor() {
    for (const avenue of avenues) for (const street of crossStreets) {
      const node = { id: key(avenue.center, street.center), x: avenue.center, z: street.center, width: avenue.width, depth: street.width };
      this.nodes.set(node.id, node); this.outgoing.set(node.id, []);
    }
    for (const node of this.nodes.values()) {
      const column = avenues.findIndex(avenue => avenue.center === node.x);
      const row = crossStreets.findIndex(street => street.center === node.z);
      for (const [x, z] of [[column - 1, row], [column + 1, row], [column, row - 1], [column, row + 1]]) {
        const avenue = avenues[x], street = crossStreets[z];
        if (!avenue || !street) continue;
        const next = this.nodes.get(key(avenue.center, street.center))!;
        const dx = Math.sign(next.x - node.x), dz = Math.sign(next.z - node.z);
        const axis = dx ? 'x' : 'z';
        const fromInset = (dx ? node.width : node.depth) / 2 + 0.35;
        const toInset = (dx ? next.width : next.depth) / 2 + 0.35;
        const start = { x: node.x + dx * fromInset - dz * 2, y: 0.47, z: node.z + dz * fromInset + dx * 2 };
        const end = { x: next.x - dx * toInset - dz * 2, y: 0.47, z: next.z - dz * toInset + dx * 2 };
        const lane: RoadLane = { id: `${node.id}>${next.id}`, from: node, to: next, axis, start, end, dx, dz, length: gap(start, end) };
        this.lanes.push(lane); this.outgoing.get(node.id)!.push(lane);
      }
    }
  }

  route(from: RoadNode, to: RoadNode, previous?: RoadNode): RoadLane[] {
    this.stats.routes++;
    const open = new Set([from.id]);
    const costs = new Map([[from.id, 0]]);
    const incoming = new Map<string, RoadLane>();
    while (open.size) {
      let current = from.id, minimum = Infinity;
      for (const id of open) if (costs.get(id)! < minimum) { current = id; minimum = costs.get(id)!; }
      if (current === to.id) {
        const result: RoadLane[] = [];
        while (current !== from.id) { const lane = incoming.get(current)!; result.push(lane); current = lane.from.id; }
        return result.reverse();
      }
      open.delete(current);
      for (const lane of this.outgoing.get(current)!) {
        if (current === from.id && lane.to === previous) continue;
        const cost = minimum + lane.length + 10;
        if (cost >= (costs.get(lane.to.id) ?? Infinity)) continue;
        costs.set(lane.to.id, cost); incoming.set(lane.to.id, lane); open.add(lane.to.id);
      }
    }
    return [];
  }

  reserve(node: RoadNode, owner: string) {
    const previous = this.reservations.get(node.id);
    if (previous && previous !== owner) { this.stats.waits++; return false; }
    this.reservations.set(node.id, owner); return true;
  }
  release(node: RoadNode, owner: string) { if (this.reservations.get(node.id) === owner) this.reservations.delete(node.id); }
  reset() { this.reservations.clear(); this.stats.routes = this.stats.waits = 0; }
}

export function lanePose(lane: RoadLane, distance: number) {
  return { x: lane.start.x + lane.dx * distance, y: 0.47, z: lane.start.z + lane.dz * distance, heading: Math.atan2(lane.dx, -lane.dz) };
}

export function turnPose(turn: RoadTurn, distance: number) {
  const t = Math.min(1, distance / turn.length), u = 1 - t;
  return {
    x: u * u * turn.from.x + 2 * u * t * turn.control.x + t * t * turn.to.x, y: 0.47,
    z: u * u * turn.from.z + 2 * u * t * turn.control.z + t * t * turn.to.z,
    heading: Math.atan2(u * (turn.control.x - turn.from.x) + t * (turn.to.x - turn.control.x),
      -u * (turn.control.z - turn.from.z) - t * (turn.to.z - turn.control.z)),
  };
}

export function joinRoads(lane: RoadLane, next: RoadLane): RoadTurn {
  const from = lane.end, to = next.start;
  const control = lane.axis !== next.axis
    ? { x: lane.axis === 'x' ? to.x : from.x, y: 0.47, z: lane.axis === 'x' ? from.z : to.z }
    : { x: (from.x + to.x) / 2, y: 0.47, z: (from.z + to.z) / 2 };
  const turn = { from, to, control, length: 1 };
  let length = 0, previous = from;
  for (let step = 1; step <= 8; step++) { const point = turnPose(turn, step / 8); length += gap(previous, point); previous = point; }
  turn.length = Math.max(0.1, length);
  return turn;
}
