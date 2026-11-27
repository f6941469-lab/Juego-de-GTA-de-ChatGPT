import type { Point3, StaticBox } from '../physics/physics';
import { worldLimits } from './world-state';
import { districtBounds, shoreline } from '../world/generation/layout';

export const navigationLimits = { searchesPerStep: 2, visitedPerSearch: 8192 } as const;

/** One reusable A* workspace covers the district. Actor requests share a tick budget. */
export interface WalkOccupant { owner: number; position: Point3; readonly active?: boolean }

export class Navigation {
  readonly cell = 0.6;
  private readonly minX = districtBounds.minX;
  private readonly minZ = districtBounds.minZ;
  private readonly width = Math.floor((shoreline - 0.6 - this.minX) / this.cell) + 1;
  private readonly depth = Math.floor((districtBounds.maxZ - this.minZ) / this.cell) + 1;
  private readonly size = this.width * this.depth;
  private readonly blocked = new Uint8Array(this.size);
  private readonly costs = new Float32Array(this.size);
  private readonly parents = new Int32Array(this.size);
  private readonly visited = new Uint32Array(this.size);
  private readonly closed = new Uint32Array(this.size);
  private readonly heap = new Int32Array(this.size);
  private readonly slots = new Int32Array(this.size);
  private readonly zoneCells = Math.round(worldLimits.zoneSize / this.cell);
  private readonly columns = Math.ceil(this.width / this.zoneCells);
  private readonly rows = Math.ceil(this.depth / this.zoneCells);
  private readonly links: number[][] = Array.from({ length: this.columns * this.rows }, () => []);
  private readonly claims = new Map<number, number>();
  private occupants: readonly WalkOccupant[] = [];
  private search = 0;
  private heapSize = 0;
  private goal = 0;
  private requested = 0;
  private budgetActive = false;
  private revision = 0;
  readonly stats = { searches: 0, deferred: 0, exhausted: 0, lastVisited: 0, peakVisited: 0, coarseVisited: 0, cellsUpdated: 0, waits: 0 };

  constructor(boxes: readonly StaticBox[]) { this.rebuild(boxes); }

  get version() { return this.revision; }
  beginStep(occupants: readonly WalkOccupant[] = []) {
    this.requested = 0; this.budgetActive = true;
    this.occupants = occupants; this.claims.clear();
  }

  rebuild(boxes: readonly StaticBox[], changed?: StaticBox) {
    const region = changed ? this.range(changed) : { left: 0, right: this.width - 1, top: 0, bottom: this.depth - 1 };
    this.stats.cellsUpdated = Math.max(0, region.right - region.left + 1) * Math.max(0, region.bottom - region.top + 1);
    for (let z = region.top; z <= region.bottom; z++) {
      this.blocked.fill(0, z * this.width + region.left, z * this.width + region.right + 1);
    }
    for (const box of boxes) {
      if (box.rotX || box.rotZ) continue;
      if (box.y + box.halfY < 0.15 || box.y - box.halfY > 1.75) continue;
      const range = this.range(box);
      const left = Math.max(region.left, range.left), right = Math.min(region.right, range.right);
      const top = Math.max(region.top, range.top), bottom = Math.min(region.bottom, range.bottom);
      if (left > right || top > bottom) continue;
      for (let z = top; z <= bottom; z++) this.blocked.fill(1, z * this.width + left, z * this.width + right + 1);
    }
    const dirty = new Set<number>();
    for (let z = Math.max(0, Math.floor(region.top / this.zoneCells) - 1); z <= Math.min(this.rows - 1, Math.floor(region.bottom / this.zoneCells) + 1); z++) {
      for (let x = Math.max(0, Math.floor(region.left / this.zoneCells) - 1); x <= Math.min(this.columns - 1, Math.floor(region.right / this.zoneCells) + 1); x++) dirty.add(z * this.columns + x);
    }
    for (const zone of dirty) {
      this.links[zone] = this.neighborZones(zone).filter(next => this.connected(zone, next));
    }
    this.revision++;
  }

  private range(box: StaticBox) {
    return {
      left: Math.max(0, Math.ceil((box.x - box.halfX - 0.4 - this.minX) / this.cell)),
      right: Math.min(this.width - 1, Math.floor((box.x + box.halfX + 0.4 - this.minX) / this.cell)),
      top: Math.max(0, Math.ceil((box.z - box.halfZ - 0.4 - this.minZ) / this.cell)),
      bottom: Math.min(this.depth - 1, Math.floor((box.z + box.halfZ + 0.4 - this.minZ) / this.cell)),
    };
  }

  private zone(index: number) {
    return Math.floor(Math.floor(index / this.width) / this.zoneCells) * this.columns
      + Math.floor(index % this.width / this.zoneCells);
  }

  private neighborZones(zone: number) {
    return [zone - 1, zone + 1, zone - this.columns, zone + this.columns].filter(next =>
      next >= 0 && next < this.links.length && Math.abs(next % this.columns - zone % this.columns) <= 1);
  }

  private connected(a: number, b: number) {
    if (Math.abs(a - b) === 1) {
      const x = Math.max(a % this.columns, b % this.columns) * this.zoneCells;
      const top = Math.floor(a / this.columns) * this.zoneCells;
      for (let z = top; z < Math.min(this.depth, top + this.zoneCells); z++) {
        if (!this.blocked[z * this.width + x - 1] && !this.blocked[z * this.width + x]) return true;
      }
    } else {
      const z = Math.max(Math.floor(a / this.columns), Math.floor(b / this.columns)) * this.zoneCells;
      const left = a % this.columns * this.zoneCells;
      for (let x = left; x < Math.min(this.width, left + this.zoneCells); x++) {
        if (!this.blocked[(z - 1) * this.width + x] && !this.blocked[z * this.width + x]) return true;
      }
    }
    return false;
  }

  private corridor(start: number, end: number) {
    const from = this.zone(start), to = this.zone(end);
    const queue = [from];
    const parent = new Map<number, number>([[from, from]]);
    this.stats.coarseVisited = 0;
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i]; this.stats.coarseVisited++;
      if (current === to) {
        const allowed = new Set<number>();
        for (let zone = to;; zone = parent.get(zone)!) {
          allowed.add(zone);
          for (const neighbor of this.neighborZones(zone)) allowed.add(neighbor);
          if (zone === from) return allowed;
        }
      }
      for (const next of this.links[current]) {
        if (parent.has(next)) continue;
        parent.set(next, current); queue.push(next);
      }
    }
    return undefined;
  }

  private index(point: Pick<Point3, 'x' | 'z'>) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return -1;
    const x = Math.round((point.x - this.minX) / this.cell);
    const z = Math.round((point.z - this.minZ) / this.cell);
    return x < 0 || z < 0 || x >= this.width || z >= this.depth ? -1 : z * this.width + x;
  }

  private point(index: number): Point3 {
    return { x: this.minX + index % this.width * this.cell, y: 0.08, z: this.minZ + Math.floor(index / this.width) * this.cell };
  }

  walkable(point: Pick<Point3, 'x' | 'z'>) {
    const id = this.index(point);
    return id >= 0 && !this.blocked[id];
  }

  closest(point: Point3, radius = 2.4): Point3 | undefined {
    const center = this.index(point);
    if (center < 0) return undefined;
    const cells = Math.ceil(radius / this.cell);
    let best: Point3 | undefined, minimum = Infinity;
    for (let dz = -cells; dz <= cells; dz++) {
      for (let dx = -cells; dx <= cells; dx++) {
        const x = center % this.width + dx, z = Math.floor(center / this.width) + dz;
        if (x < 0 || z < 0 || x >= this.width || z >= this.depth || this.blocked[z * this.width + x]) continue;
        const candidate = this.point(z * this.width + x);
        const distance = Math.hypot(candidate.x - point.x, candidate.z - point.z);
        if (distance < minimum && distance <= radius) { best = candidate; minimum = distance; }
      }
    }
    return best;
  }

  pathClear(path: readonly Point3[]) { return path.every(point => this.walkable(point)); }

  private blocker(owner: number, target: Point3) {
    for (const occupant of this.occupants) {
      if (occupant.owner !== owner && occupant.active !== false
        && Math.hypot(occupant.position.x - target.x, occupant.position.z - target.z) < 0.58) return occupant.owner;
    }
    const claimant = this.claims.get(this.index(target));
    return claimant !== owner ? claimant : undefined;
  }

  reserveMove(owner: number, target: Point3) {
    if (!this.walkable(target)) return false;
    if (!this.budgetActive) return true;
    if (this.blocker(owner, target) !== undefined) { this.stats.waits++; return false; }
    this.claims.set(this.index(target), owner);
    return true;
  }

  yieldPoint(owner: number, from: Point3, to: Point3) {
    const blocking = this.blocker(owner, to);
    if (blocking !== undefined && owner < blocking) return undefined;
    const dx = to.x - from.x, dz = to.z - from.z;
    const length = Math.max(0.01, Math.hypot(dx, dz));
    for (const [x, z] of [[-dz, dx], [dz, -dx], [-dx, -dz]]) {
      const candidate = this.closest({ x: from.x + x / length * 0.8, y: from.y, z: from.z + z / length * 0.8 }, 0.4);
      if (candidate && Math.hypot(candidate.x - from.x, candidate.z - from.z) > 0.3 && this.reserveMove(owner, candidate)) return candidate;
    }
    return undefined;
  }

  /** A deferred request retains the actor's route and retries next tick. */
  requestPath(from: Point3, to: Point3): Point3[] | undefined {
    if (!this.budgetActive) return this.path(from, to);
    if (this.requested >= navigationLimits.searchesPerStep) { this.stats.deferred++; return undefined; }
    this.requested++;
    return this.path(from, to);
  }

  private score(id: number) {
    const distance = Math.abs(id % this.width - this.goal % this.width)
      + Math.abs(Math.floor(id / this.width) - Math.floor(this.goal / this.width));
    // Prefer progress toward the goal among otherwise equal integer-cost paths.
    return this.costs[id] + distance + distance * 0.00001;
  }

  private swap(a: number, b: number) {
    const value = this.heap[a];
    this.heap[a] = this.heap[b]; this.heap[b] = value;
    this.slots[this.heap[a]] = a; this.slots[this.heap[b]] = b;
  }

  private raise(slot: number) {
    while (slot > 0) {
      const parent = Math.floor((slot - 1) / 2);
      if (this.score(this.heap[parent]) <= this.score(this.heap[slot])) break;
      this.swap(slot, parent); slot = parent;
    }
  }

  private pop() {
    const id = this.heap[0];
    this.heapSize--;
    this.heap[0] = this.heap[this.heapSize]; this.slots[this.heap[0]] = 0;
    let slot = 0;
    while (slot * 2 + 1 < this.heapSize) {
      const left = slot * 2 + 1, right = left + 1;
      const child = right < this.heapSize && this.score(this.heap[right]) < this.score(this.heap[left]) ? right : left;
      if (this.score(this.heap[slot]) <= this.score(this.heap[child])) break;
      this.swap(slot, child); slot = child;
    }
    return id;
  }

  path(from: Point3, to: Point3): Point3[] {
    const start = this.index(from), end = this.index(to);
    if (start < 0 || end < 0 || this.blocked[end]) return [];
    const corridor = this.corridor(start, end);
    this.stats.searches++; this.stats.lastVisited = 0;
    if (!corridor) return [];
    const route = this.searchPath(start, end, corridor, Math.floor(navigationLimits.visitedPerSearch / 2));
    if (route.length || start === end) return route;
    return this.searchPath(start, end, undefined, navigationLimits.visitedPerSearch);
  }

  private searchPath(start: number, end: number, corridor: Set<number> | undefined, limit: number): Point3[] {
    this.search = (this.search + 1) >>> 0;
    if (this.search === 0) { this.visited.fill(0); this.closed.fill(0); this.search = 1; }
    this.goal = end; this.heapSize = 1; this.heap[0] = start; this.slots[start] = 0;
    this.costs[start] = 0; this.visited[start] = this.search;
    while (this.heapSize && this.stats.lastVisited < limit) {
      const current = this.pop();
      this.closed[current] = this.search;
      this.stats.lastVisited++;
      this.stats.peakVisited = Math.max(this.stats.peakVisited, this.stats.lastVisited);
      if (current === end) {
        const path: Point3[] = [];
        for (let id = end; id !== start; id = this.parents[id]) path.push(this.point(id));
        return path.reverse();
      }
      for (const next of [current - 1, current + 1, current - this.width, current + this.width]) {
        if (next < 0 || next >= this.size || Math.abs(next % this.width - current % this.width) > 1
          || this.blocked[next] || this.closed[next] === this.search || (corridor && !corridor.has(this.zone(next)))) continue;
        const cost = this.costs[current] + 1;
        const known = this.visited[next] === this.search;
        if (known && cost >= this.costs[next]) continue;
        this.costs[next] = cost; this.parents[next] = current;
        if (!known) {
          this.visited[next] = this.search;
          this.slots[next] = this.heapSize; this.heap[this.heapSize++] = next;
        }
        this.raise(this.slots[next]);
      }
    }
    if (this.heapSize) this.stats.exhausted++;
    return [];
  }
}
