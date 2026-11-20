import type { Point3, StaticBox } from '../physics/physics';

/** Local walk grid for the first active block, derived from collision geometry. */
export class Navigation {
  readonly cell = 0.6;
  private readonly minX = -7;
  private readonly minZ = 13;
  private readonly width = 73;
  private readonly depth = 80;
  private blocked = new Uint8Array(this.width * this.depth);
  constructor(boxes: readonly StaticBox[]) { this.rebuild(boxes); }
  rebuild(boxes: readonly StaticBox[]) {
    this.blocked.fill(0);
    for (const box of boxes) {
      if (box.y + box.halfY < 0.15 || box.y - box.halfY > 1.75) continue;
      const fromX = Math.max(0, Math.ceil((box.x - box.halfX - 0.4 - this.minX) / this.cell));
      const toX = Math.min(this.width - 1, Math.floor((box.x + box.halfX + 0.4 - this.minX) / this.cell));
      const fromZ = Math.max(0, Math.ceil((box.z - box.halfZ - 0.4 - this.minZ) / this.cell));
      const toZ = Math.min(this.depth - 1, Math.floor((box.z + box.halfZ + 0.4 - this.minZ) / this.cell));
      for (let z = fromZ; z <= toZ; z++) for (let x = fromX; x <= toX; x++) this.blocked[z * this.width + x] = 1;
    }
  }
  private index(point: Pick<Point3, 'x' | 'z'>) {
    const x = Math.round((point.x - this.minX) / this.cell);
    const z = Math.round((point.z - this.minZ) / this.cell);
    return x < 0 || z < 0 || x >= this.width || z >= this.depth ? -1 : z * this.width + x;
  }
  private point(index: number): Point3 { return { x: this.minX + index % this.width * this.cell, y: 0.08, z: this.minZ + Math.floor(index / this.width) * this.cell }; }
  walkable(point: Pick<Point3, 'x' | 'z'>) { const id = this.index(point); return id >= 0 && !this.blocked[id]; }
  path(from: Point3, to: Point3): Point3[] {
    const start = this.index(from); const end = this.index(to);
    if (start < 0 || end < 0 || this.blocked[end]) return [];
    const costs = new Float32Array(this.blocked.length).fill(Infinity);
    const parent = new Int32Array(this.blocked.length).fill(-1);
    const closed = new Uint8Array(this.blocked.length);
    const open = [start]; costs[start] = 0;
    const heuristic = (id: number) => Math.abs(id % this.width - end % this.width) + Math.abs(Math.floor(id / this.width) - Math.floor(end / this.width));
    while (open.length) {
      let best = 0;
      for (let i = 1; i < open.length; i++) if (costs[open[i]] + heuristic(open[i]) < costs[open[best]] + heuristic(open[best])) best = i;
      const current = open[best]; open[best] = open[open.length - 1]; open.pop();
      if (current === end) {
        const path: Point3[] = [];
        for (let id = end; id !== start; id = parent[id]) path.push(this.point(id));
        return path.reverse();
      }
      closed[current] = 1;
      for (const next of [current - 1, current + 1, current - this.width, current + this.width]) {
        if (next < 0 || next >= costs.length || Math.abs(next % this.width - current % this.width) > 1 || this.blocked[next] || closed[next]) continue;
        const score = costs[current] + 1;
        if (score >= costs[next]) continue;
        if (costs[next] === Infinity) open.push(next);
        costs[next] = score; parent[next] = current;
      }
    }
    return [];
  }
}
