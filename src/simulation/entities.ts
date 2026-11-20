export type EntityKind = 'player' | 'vehicle' | 'npc' | 'police_unit' | 'traffic_vehicle' | 'prop';

export type SimulationTier = 'high' | 'medium' | 'low';

export interface EntityVec3 {
  x: number;
  y: number;
  z: number;
}

export interface EntityVec2 {
  x: number;
  z: number;
}

export interface WorldEntity {
  id: string;
  kind: EntityKind;
  position: EntityVec3;
  heading: number;
  velocity: EntityVec2;
  radius: number;
  active: boolean;
  tier: SimulationTier;
  threatLevel: number;
  vehicleId?: string;
  occupants?: string[];
  label?: string;
}

export interface TierDistances {
  highRadius: number;
  mediumRadius: number;
}

const DEFAULT_TIERS: TierDistances = {
  highRadius: 65,
  mediumRadius: 135,
};

function cellKey(cx: number, cz: number): number {
  return ((cx + 32768) << 16) | ((cz + 32768) & 0xffff);
}

export function computeSimulationTier(
  distanceSq: number,
  tiers: TierDistances = DEFAULT_TIERS,
): SimulationTier {
  if (distanceSq <= tiers.highRadius * tiers.highRadius) return 'high';
  if (distanceSq <= tiers.mediumRadius * tiers.mediumRadius) return 'medium';
  return 'low';
}

export class EntityRegistry {
  private readonly entities = new Map<string, WorldEntity>();
  private readonly spatial = new Map<number, WorldEntity[]>();
  private readonly bucketPool: WorldEntity[][] = [];

  constructor(private readonly cellSize = 32) {}

  get size(): number {
    return this.entities.size;
  }

  upsert(entity: WorldEntity): WorldEntity {
    this.entities.set(entity.id, entity);
    return entity;
  }

  remove(id: string): boolean {
    return this.entities.delete(id);
  }

  get(id: string): WorldEntity | undefined {
    return this.entities.get(id);
  }

  all(): IterableIterator<WorldEntity> {
    return this.entities.values();
  }

  countByKind(kind: EntityKind): number {
    let total = 0;
    for (const entity of this.entities.values()) {
      if (entity.kind === kind) total += 1;
    }
    return total;
  }

  updateSpatialAndTiers(
    focusX: number,
    focusZ: number,
    tiers: TierDistances = DEFAULT_TIERS,
  ): void {
    for (const bucket of this.spatial.values()) {
      bucket.length = 0;
      this.bucketPool.push(bucket);
    }
    this.spatial.clear();

    for (const entity of this.entities.values()) {
      const dx = entity.position.x - focusX;
      const dz = entity.position.z - focusZ;
      entity.tier = computeSimulationTier(dx * dx + dz * dz, tiers);
      if (!entity.active) continue;

      const cx = Math.floor(entity.position.x / this.cellSize);
      const cz = Math.floor(entity.position.z / this.cellSize);
      const key = cellKey(cx, cz);
      let bucket = this.spatial.get(key);
      if (!bucket) {
        bucket = this.bucketPool.pop() ?? [];
        this.spatial.set(key, bucket);
      }
      bucket.push(entity);
    }
  }

  queryNear(
    x: number,
    z: number,
    radius: number,
    kind?: EntityKind,
    out: WorldEntity[] = [],
  ): WorldEntity[] {
    out.length = 0;
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCz = Math.floor((z - radius) / this.cellSize);
    const maxCz = Math.floor((z + radius) / this.cellSize);
    const radiusSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.spatial.get(cellKey(cx, cz));
        if (!bucket) continue;
        for (const entity of bucket) {
          if (kind !== undefined && entity.kind !== kind) continue;
          const dx = entity.position.x - x;
          const dz = entity.position.z - z;
          if (dx * dx + dz * dz <= radiusSq) {
            out.push(entity);
          }
        }
      }
    }
    return out;
  }

  clear(): void {
    this.entities.clear();
    for (const bucket of this.spatial.values()) {
      bucket.length = 0;
      this.bucketPool.push(bucket);
    }
    this.spatial.clear();
  }
}
