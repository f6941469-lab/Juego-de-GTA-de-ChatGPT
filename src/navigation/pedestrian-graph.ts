import type { SpatialBoxGrid } from '../physics/spatial-index';
import {
  avenues,
  blockSpans,
  bridges,
  centralAvenue,
  centralCrossStreets,
  centralIslandBounds,
  crossStreets,
  eastLandBounds,
  inlandEdge,
  storeSpecs,
  type StoreSpec,
  type Street,
  westAvenues,
  westLandBounds,
} from '../world/generation/layout';

export type PedestrianNodeKind = 'sidewalk' | 'bridge' | 'store' | 'shelter';
export type PedestrianEdgeKind = 'sidewalk' | 'crosswalk' | 'bridge' | 'entrance';

export interface PedestrianNode {
  id: string;
  x: number;
  z: number;
  kind: PedestrianNodeKind;
  storeId?: string;
}

export interface PedestrianEdge {
  id: string;
  from: PedestrianNode;
  to: PedestrianNode;
  length: number;
  kind: PedestrianEdgeKind;
}

export interface PedestrianGraph {
  nodes: ReadonlyMap<string, PedestrianNode>;
  edges: readonly PedestrianEdge[];
  outgoing: ReadonlyMap<string, readonly PedestrianEdge[]>;
}

function key(x: number, z: number): string {
  return `${x.toFixed(2)}:${z.toFixed(2)}`;
}

class MinHeap<T> {
  private readonly items: Array<{ key: number; value: T }> = [];

  get size(): number {
    return this.items.length;
  }

  push(priority: number, value: T): void {
    this.items.push({ key: priority, value });
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return top?.value;
  }

  private bubbleUp(index: number): void {
    const item = this.items[index];
    while (index > 0) {
      const parentIdx = (index - 1) >> 1;
      const parent = this.items[parentIdx];
      if (item.key >= parent.key) break;
      this.items[index] = parent;
      index = parentIdx;
    }
    this.items[index] = item;
  }

  private sinkDown(index: number): void {
    const length = this.items.length;
    const item = this.items[index];
    while (true) {
      const leftIdx = (index << 1) + 1;
      const rightIdx = leftIdx + 1;
      let swapIdx = -1;
      if (leftIdx < length && this.items[leftIdx].key < item.key) swapIdx = leftIdx;
      if (rightIdx < length && this.items[rightIdx].key < (swapIdx === -1 ? item.key : this.items[leftIdx].key)) {
        swapIdx = rightIdx;
      }
      if (swapIdx === -1) break;
      this.items[index] = this.items[swapIdx];
      index = swapIdx;
    }
    this.items[index] = item;
  }
}

export function buildPedestrianGraph(
  spatial?: SpatialBoxGrid,
  stores: readonly StoreSpec[] = storeSpecs,
): PedestrianGraph {
  const nodes = new Map<string, PedestrianNode>();
  const edgeMap = new Map<string, PedestrianEdge>();
  const outgoing = new Map<string, PedestrianEdge[]>();

  function addNode(x: number, z: number, kind: PedestrianNodeKind = 'sidewalk', customId?: string, storeId?: string): PedestrianNode {
    const id = customId ?? key(x, z);
    let node = nodes.get(id);
    if (!node) {
      node = { id, x, z, kind, storeId };
      nodes.set(id, node);
    }
    return node;
  }

  function link(a: PedestrianNode, b: PedestrianNode, kind: PedestrianEdgeKind): void {
    if (a.id === b.id) return;
    if (spatial) {
      const hit = spatial.raycast(a, b, { margin: 0.18, minY: 0.2, maxY: 2.0 });
      if (hit && (hit.box.halfX > 0.25 || hit.box.halfZ > 0.25)) return;
    }
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    for (const [from, to] of [[a, b], [b, a]] as const) {
      const id = `${from.id}>${to.id}`;
      if (edgeMap.has(id)) continue;
      const edge: PedestrianEdge = { id, from, to, length, kind };
      edgeMap.set(id, edge);
      let list = outgoing.get(from.id);
      if (!list) {
        list = [];
        outgoing.set(from.id, list);
      }
      list.push(edge);
    }
  }

  function addLandmassSidewalks(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    landAvenues: readonly Street[],
    landCrossStreets: readonly Street[],
  ): void {
    const xRuns = blockSpans(landAvenues, minX, maxX);
    const zRuns = blockSpans(landCrossStreets, minZ, maxZ);
    const inset = 0.9;

    const blocks: Array<{ col: number; row: number; nw: PedestrianNode; ne: PedestrianNode; sw: PedestrianNode; se: PedestrianNode }> = [];
    const byGrid = new Map<string, typeof blocks[number]>();

    for (const [col, [left, right]] of xRuns.entries()) {
      if (right - left < 3) continue;
      for (const [row, [near, far]] of zRuns.entries()) {
        if (far - near < 3) continue;
        const xL = left + inset;
        const xR = right - inset;
        const zN = near + inset;
        const zF = far - inset;
        const nw = addNode(xL, zN);
        const ne = addNode(xR, zN);
        const sw = addNode(xL, zF);
        const se = addNode(xR, zF);
        link(nw, ne, 'sidewalk');
        link(ne, se, 'sidewalk');
        link(se, sw, 'sidewalk');
        link(sw, nw, 'sidewalk');
        const entry = { col, row, nw, ne, sw, se };
        blocks.push(entry);
        byGrid.set(`${col}:${row}`, entry);
      }
    }

    // Connect crosswalks between neighboring blocks
    for (const block of blocks) {
      const eastNeighbor = byGrid.get(`${block.col + 1}:${block.row}`);
      if (eastNeighbor) {
        link(block.ne, eastNeighbor.nw, 'crosswalk');
        link(block.se, eastNeighbor.sw, 'crosswalk');
      }
      const southNeighbor = byGrid.get(`${block.col}:${block.row + 1}`);
      if (southNeighbor) {
        link(block.sw, southNeighbor.nw, 'crosswalk');
        link(block.se, southNeighbor.ne, 'crosswalk');
      }
    }
  }

  addLandmassSidewalks(eastLandBounds.minX, inlandEdge + 4, eastLandBounds.minZ, eastLandBounds.maxZ, avenues, crossStreets);
  addLandmassSidewalks(westLandBounds.minX, westLandBounds.maxX, westLandBounds.minZ, westLandBounds.maxZ, westAvenues, crossStreets);
  addLandmassSidewalks(
    centralIslandBounds.minX + 2,
    centralIslandBounds.maxX - 2,
    centralIslandBounds.minZ + 2,
    centralIslandBounds.maxZ - 2,
    [centralAvenue],
    centralCrossStreets,
  );

  // Connect pedestrian walkways along all bridge spans (both north & south edges of each bridge)
  for (const bridge of bridges) {
    for (const [start, end] of bridge.spans) {
      for (const side of [-1, 1]) {
        const z = bridge.z + side * (bridge.width / 2 - 0.85);
        const leftAnchor = closestPedestrianNode({ nodes }, { x: start - 1.5, z });
        const rightAnchor = closestPedestrianNode({ nodes }, { x: end + 1.5, z });
        const leftHead = addNode(start - 1.0, z, 'bridge');
        const leftBridge = addNode(start + 0.6, z, 'bridge');
        const rightBridge = addNode(end - 0.6, z, 'bridge');
        const rightHead = addNode(end + 1.0, z, 'bridge');
        link(leftHead, leftBridge, 'bridge');
        link(leftBridge, rightBridge, 'bridge');
        link(rightBridge, rightHead, 'bridge');
        if (leftAnchor) link(leftAnchor, leftHead, 'bridge');
        if (rightAnchor) link(rightHead, rightAnchor, 'bridge');
      }
    }
  }

  // Connect each interactable store door to the closest sidewalk node
  for (const store of stores) {
    const anchor = closestPedestrianNode({ nodes }, { x: store.doorX, z: store.doorZ });
    const doorNode = addNode(store.doorX, store.doorZ, 'store', `store:${store.id}`, store.id);
    if (anchor) link(doorNode, anchor, 'entrance');
  }

  return { nodes, edges: Array.from(edgeMap.values()), outgoing };
}

export function closestPedestrianNode(
  graph: Pick<PedestrianGraph, 'nodes'>,
  point: { x: number; z: number },
): PedestrianNode | undefined {
  let best: PedestrianNode | undefined;
  let bestDistSq = Infinity;
  for (const node of graph.nodes.values()) {
    const dx = node.x - point.x;
    const dz = node.z - point.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = node;
    }
  }
  return best;
}

export function findPedestrianRoute(
  graph: PedestrianGraph,
  startId: string,
  endId: string,
  options: { blockedNodes?: ReadonlySet<string>; blockedEdges?: ReadonlySet<string> } = {},
): PedestrianNode[] {
  const start = graph.nodes.get(startId);
  const goal = graph.nodes.get(endId);
  if (!start || !goal) return [];
  if (startId === endId) return [start];

  const heap = new MinHeap<string>();
  const gScore = new Map<string, number>([[startId, 0]]);
  const cameFrom = new Map<string, string>();
  const closed = new Set<string>();

  heap.push(Math.hypot(goal.x - start.x, goal.z - start.z), startId);

  while (heap.size > 0) {
    const currentId = heap.pop()!;
    if (closed.has(currentId)) continue;
    if (currentId === endId) {
      const path: PedestrianNode[] = [];
      let cursor: string | undefined = endId;
      while (cursor) {
        const node = graph.nodes.get(cursor);
        if (node) path.push(node);
        cursor = cursor === startId ? undefined : cameFrom.get(cursor);
      }
      return path.reverse();
    }
    closed.add(currentId);

    const currentCost = gScore.get(currentId)!;
    for (const edge of graph.outgoing.get(currentId) ?? []) {
      const nextId = edge.to.id;
      if (closed.has(nextId)) continue;
      if (options.blockedEdges?.has(edge.id) || (nextId !== endId && options.blockedNodes?.has(nextId))) continue;
      const tentative = currentCost + edge.length;
      if (tentative >= (gScore.get(nextId) ?? Infinity)) continue;
      cameFrom.set(nextId, currentId);
      gScore.set(nextId, tentative);
      const heuristic = Math.hypot(goal.x - edge.to.x, goal.z - edge.to.z);
      heap.push(tentative + heuristic, nextId);
    }
  }

  return [];
}

export function findEscapeNode(
  graph: PedestrianGraph,
  from: { x: number; z: number },
  threat: { x: number; z: number },
  desiredDistance = 42,
): PedestrianNode | undefined {
  const start = closestPedestrianNode(graph, from);
  if (!start) return undefined;
  const awayX = from.x - threat.x;
  const awayZ = from.z - threat.z;
  const len = Math.max(0.01, Math.hypot(awayX, awayZ));
  const target = {
    x: from.x + (awayX / len) * desiredDistance,
    z: from.z + (awayZ / len) * desiredDistance,
  };
  return closestPedestrianNode(graph, target);
}

export interface PedestrianAgentLike {
  id: string;
  x: number;
  z: number;
  radius?: number;
}

export function steerPedestrian(
  self: PedestrianAgentLike,
  target: { x: number; z: number },
  speed: number,
  dt: number,
  spatial?: SpatialBoxGrid,
  neighbors: readonly PedestrianAgentLike[] = [],
): { x: number; z: number; heading: number; blocked: boolean } {
  const dx = target.x - self.x;
  const dz = target.z - self.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05 || speed <= 0) {
    return { x: self.x, z: self.z, heading: 0, blocked: false };
  }

  let dirX = dx / dist;
  let dirZ = dz / dist;

  // Social separation from nearby pedestrians/vehicles
  const selfRadius = self.radius ?? 0.38;
  for (const other of neighbors) {
    if (other.id === self.id) continue;
    const ox = self.x - other.x;
    const oz = self.z - other.z;
    const gap = Math.hypot(ox, oz);
    const minSep = selfRadius + (other.radius ?? 0.42) + 0.35;
    if (gap > 0.001 && gap < minSep) {
      const push = (minSep - gap) / minSep;
      dirX += (ox / gap) * push * 1.4;
      dirZ += (oz / gap) * push * 1.4;
    }
  }

  const norm = Math.hypot(dirX, dirZ) || 1;
  dirX /= norm;
  dirZ /= norm;

  const stepDist = Math.min(dist, speed * dt);
  const candidate = { x: self.x + dirX * stepDist, z: self.z + dirZ * stepDist };
  const heading = Math.atan2(dirX, -dirZ);

  if (!spatial || spatial.clearLine(self, candidate, { margin: selfRadius, minY: 0.2, maxY: 2.0 })) {
    return { x: candidate.x, z: candidate.z, heading, blocked: false };
  }

  // Try sliding tangentially left or right around obstacle
  for (const sign of [-1, 1]) {
    const slideX = -dirZ * sign;
    const slideZ = dirX * sign;
    const slideCandidate = { x: self.x + slideX * stepDist * 0.75, z: self.z + slideZ * stepDist * 0.75 };
    if (spatial.clearLine(self, slideCandidate, { margin: selfRadius, minY: 0.2, maxY: 2.0 })) {
      return { x: slideCandidate.x, z: slideCandidate.z, heading: Math.atan2(slideX, -slideZ), blocked: false };
    }
  }

  return { x: self.x, z: self.z, heading, blocked: true };
}
