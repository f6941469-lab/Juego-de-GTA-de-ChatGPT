import type { StaticBox } from './physics';

export interface Point2D {
  x: number;
  z: number;
}

export interface RaycastBoxHit {
  box: StaticBox;
  fraction: number;
}

export interface SpatialQueryOptions {
  margin?: number;
  minY?: number;
  maxY?: number;
}

const DEFAULT_CELL_SIZE = 32;

function cellKey(cx: number, cz: number): number {
  // Pack signed 16-bit grid coords cleanly into a safe integer key (supports ±32,767 cells = ±1,000 km).
  return ((cx + 32768) << 16) | ((cz + 32768) & 0xffff);
}

function segmentIntersectsBox2D(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  box: StaticBox,
  margin: number,
): number | null {
  const left = box.x - box.halfX - margin;
  const right = box.x + box.halfX + margin;
  const near = box.z - box.halfZ - margin;
  const far = box.z + box.halfZ + margin;

  if (
    Math.max(ox, ox + dx) < left
    || Math.min(ox, ox + dx) > right
    || Math.max(oz, oz + dz) < near
    || Math.min(oz, oz + dz) > far
  ) {
    return null;
  }

  const tx1 = dx === 0 ? -Infinity : (left - ox) / dx;
  const tx2 = dx === 0 ? Infinity : (right - ox) / dx;
  const tz1 = dz === 0 ? -Infinity : (near - oz) / dz;
  const tz2 = dz === 0 ? Infinity : (far - oz) / dz;

  const enter = Math.max(0, Math.min(tx1, tx2), Math.min(tz1, tz2));
  const exit = Math.min(1, Math.max(tx1, tx2), Math.max(tz1, tz2));
  return enter <= exit ? enter : null;
}

export class SpatialBoxGrid {
  private readonly cells = new Map<number, StaticBox[]>();
  private readonly boxIds = new Map<StaticBox, number>();
  private readonly visitedStamp: Uint32Array;
  private stamp = 1;

  constructor(
    readonly boxes: readonly StaticBox[],
    private readonly cellSize = DEFAULT_CELL_SIZE,
  ) {
    let nextId = 0;
    for (const box of boxes) {
      // Skip pure flat floor slabs from spatial wall buckets when they are entirely below ground level.
      if (box.y + box.halfY <= 0.05) continue;
      this.boxIds.set(box, nextId++);
      const minCx = Math.floor((box.x - box.halfX) / this.cellSize);
      const maxCx = Math.floor((box.x + box.halfX) / this.cellSize);
      const minCz = Math.floor((box.z - box.halfZ) / this.cellSize);
      const maxCz = Math.floor((box.z + box.halfZ) / this.cellSize);
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const key = cellKey(cx, cz);
          let bucket = this.cells.get(key);
          if (!bucket) {
            bucket = [];
            this.cells.set(key, bucket);
          }
          bucket.push(box);
        }
      }
    }
    this.visitedStamp = new Uint32Array(Math.max(1, nextId));
  }

  private nextStamp(): number {
    this.stamp += 1;
    if (this.stamp === 0xffffffff) {
      this.visitedStamp.fill(0);
      this.stamp = 1;
    }
    return this.stamp;
  }

  raycast(origin: Point2D, target: Point2D, options: SpatialQueryOptions = {}): RaycastBoxHit | null {
    const margin = options.margin ?? 0;
    const minY = options.minY ?? 1;
    const maxY = options.maxY ?? 2;
    const dx = target.x - origin.x;
    const dz = target.z - origin.z;
    const padCells = Math.ceil(margin / this.cellSize);
    const stamp = this.nextStamp();

    let bestFraction = Infinity;
    let bestBox: StaticBox | null = null;

    const minX = Math.min(origin.x, target.x) - margin;
    const maxX = Math.max(origin.x, target.x) + margin;
    const minZ = Math.min(origin.z, target.z) - margin;
    const maxZ = Math.max(origin.z, target.z) + margin;

    // For short rays (common in steering/LOS), bounding-cell walk is concise and exact;
    // for longer rays, Amanatides-Woo DDA visits only intersected cells.
    const spanX = Math.floor(maxX / this.cellSize) - Math.floor(minX / this.cellSize);
    const spanZ = Math.floor(maxZ / this.cellSize) - Math.floor(minZ / this.cellSize);

    const testBucket = (cx: number, cz: number) => {
      const bucket = this.cells.get(cellKey(cx, cz));
      if (!bucket) return;
      for (const box of bucket) {
        const id = this.boxIds.get(box);
        if (id === undefined || this.visitedStamp[id] === stamp) continue;
        this.visitedStamp[id] = stamp;
        if (box.y + box.halfY <= minY || box.y - box.halfY >= maxY) continue;
        const hit = segmentIntersectsBox2D(origin.x, origin.z, dx, dz, box, margin);
        if (hit !== null && hit < bestFraction) {
          bestFraction = hit;
          bestBox = box;
        }
      }
    };

    if (spanX <= 2 && spanZ <= 2) {
      const cMinX = Math.floor(minX / this.cellSize);
      const cMaxX = Math.floor(maxX / this.cellSize);
      const cMinZ = Math.floor(minZ / this.cellSize);
      const cMaxZ = Math.floor(maxZ / this.cellSize);
      for (let cx = cMinX; cx <= cMaxX; cx++) {
        for (let cz = cMinZ; cz <= cMaxZ; cz++) {
          testBucket(cx, cz);
        }
      }
    } else {
      let cx = Math.floor(origin.x / this.cellSize);
      let cz = Math.floor(origin.z / this.cellSize);
      const endCx = Math.floor(target.x / this.cellSize);
      const endCz = Math.floor(target.z / this.cellSize);
      const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
      const tDeltaX = dx === 0 ? Infinity : Math.abs(this.cellSize / dx);
      const tDeltaZ = dz === 0 ? Infinity : Math.abs(this.cellSize / dz);
      const nextBoundaryX = (cx + (stepX > 0 ? 1 : 0)) * this.cellSize;
      const nextBoundaryZ = (cz + (stepZ > 0 ? 1 : 0)) * this.cellSize;
      let tMaxX = dx === 0 ? Infinity : (nextBoundaryX - origin.x) / dx;
      let tMaxZ = dz === 0 ? Infinity : (nextBoundaryZ - origin.z) / dz;
      const maxSteps = Math.abs(endCx - cx) + Math.abs(endCz - cz) + 4;

      for (let step = 0; step <= maxSteps; step++) {
        for (let ox = -padCells; ox <= padCells; ox++) {
          for (let oz = -padCells; oz <= padCells; oz++) {
            testBucket(cx + ox, cz + oz);
          }
        }
        if (cx === endCx && cz === endCz) break;
        if (tMaxX < tMaxZ) {
          tMaxX += tDeltaX;
          cx += stepX;
        } else {
          tMaxZ += tDeltaZ;
          cz += stepZ;
        }
      }
    }

    return bestBox ? { box: bestBox, fraction: bestFraction } : null;
  }

  clearLine(origin: Point2D, target: Point2D, options: SpatialQueryOptions = {}): boolean {
    return this.raycast(origin, target, options) === null;
  }

  queryRadius(x: number, z: number, radius: number, options: Pick<SpatialQueryOptions, 'minY' | 'maxY'> = {}): StaticBox[] {
    const minY = options.minY ?? -Infinity;
    const maxY = options.maxY ?? Infinity;
    const cMinX = Math.floor((x - radius) / this.cellSize);
    const cMaxX = Math.floor((x + radius) / this.cellSize);
    const cMinZ = Math.floor((z - radius) / this.cellSize);
    const cMaxZ = Math.floor((z + radius) / this.cellSize);
    const stamp = this.nextStamp();
    const results: StaticBox[] = [];

    for (let cx = cMinX; cx <= cMaxX; cx++) {
      for (let cz = cMinZ; cz <= cMaxZ; cz++) {
        const bucket = this.cells.get(cellKey(cx, cz));
        if (!bucket) continue;
        for (const box of bucket) {
          const id = this.boxIds.get(box);
          if (id === undefined || this.visitedStamp[id] === stamp) continue;
          this.visitedStamp[id] = stamp;
          if (box.y + box.halfY <= minY || box.y - box.halfY >= maxY) continue;
          const closestX = Math.max(box.x - box.halfX, Math.min(x, box.x + box.halfX));
          const closestZ = Math.max(box.z - box.halfZ, Math.min(z, box.z + box.halfZ));
          if ((closestX - x) ** 2 + (closestZ - z) ** 2 <= radius * radius) {
            results.push(box);
          }
        }
      }
    }
    return results;
  }
}
