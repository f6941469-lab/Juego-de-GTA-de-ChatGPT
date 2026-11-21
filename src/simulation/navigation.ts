import type { Point3, StaticBox } from '../physics/physics';
import { districtBounds, shoreline } from '../world/generation/layout';

export const navigationLimits = { searchesPerStep: 2, visitedPerSearch: 8192 } as const;

/** One reusable A* workspace covers the district. Actor requests share a tick budget. */
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
  private search = 0;
  private heapSize = 0;
  private goal = 0;
  private requested = 0;
  private budgetActive = false;
  private revision = 0;
  readonly stats = { searches: 0, deferred: 0, exhausted: 0, lastVisited: 0, peakVisited: 0 };

  constructor(boxes: readonly StaticBox[]) { this.rebuild(boxes); }

  get version() { return this.revision; }
  beginStep() { this.requested = 0; this.budgetActive = true; }

  rebuild(boxes: readonly StaticBox[]) {
    this.blocked.fill(0);
    for (const box of boxes) {
      if (box.y + box.halfY < 0.15 || box.y - box.halfY > 1.75) continue;
      const fromX = Math.max(0, Math.ceil((box.x - box.halfX - 0.4 - this.minX) / this.cell));
      const toX = Math.min(this.width - 1, Math.floor((box.x + box.halfX + 0.4 - this.minX) / this.cell));
      const fromZ = Math.max(0, Math.ceil((box.z - box.halfZ - 0.4 - this.minZ) / this.cell));
      const toZ = Math.min(this.depth - 1, Math.floor((box.z + box.halfZ + 0.4 - this.minZ) / this.cell));
      if (fromX > toX || fromZ > toZ) continue;
      for (let z = fromZ; z <= toZ; z++) {
        this.blocked.fill(1, z * this.width + fromX, z * this.width + toX + 1);
      }
    }
    this.revision++;
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
    this.search = (this.search + 1) >>> 0;
    if (this.search === 0) { this.visited.fill(0); this.closed.fill(0); this.search = 1; }
    this.goal = end; this.heapSize = 1; this.heap[0] = start; this.slots[start] = 0;
    this.costs[start] = 0; this.visited[start] = this.search;
    this.stats.searches++; this.stats.lastVisited = 0;
    while (this.heapSize && this.stats.lastVisited < navigationLimits.visitedPerSearch) {
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
          || this.blocked[next] || this.closed[next] === this.search) continue;
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
