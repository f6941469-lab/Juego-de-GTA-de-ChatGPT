import type { Point3 } from '../physics/physics';
import { districtBounds } from '../world/generation/layout';

export const worldLimits = { zoneSize: 24, entities: 128, historyFrames: 60, sampleInterval: 0.25 } as const;
export type SimulationTier = 'near' | 'middle' | 'far';
export type EntityKind = 'person' | 'vehicle' | 'seat' | 'shop' | 'damage';
export interface WorldEntity {
  readonly id: string;
  readonly kind: EntityKind;
  readonly position: Point3;
  readonly heading?: number;
  readonly health?: number;
  readonly occupantId?: string;
  readonly vehicleId?: string;
}
interface EntityRecord { source: WorldEntity; zoneId?: string; tier: SimulationTier }
export interface ZoneState { id: string; entities: Set<string>; damaged: Set<string> }
export interface WorldFrame {
  time: number;
  entities: { id: string; kind: EntityKind; occupantId?: string; vehicleId?: string; x: number; y: number; z: number; heading: number; health: number }[];
}

export function zoneIdAt(position: Pick<Point3, 'x' | 'z'>): string | undefined {
  const { minX, maxX, minZ, maxZ } = districtBounds;
  if (!Number.isFinite(position.x) || !Number.isFinite(position.z)
    || position.x < minX || position.x > maxX || position.z < minZ || position.z > maxZ) return undefined;
  return `zone:${Math.floor((position.x - minX) / worldLimits.zoneSize)}:${Math.floor((position.z - minZ) / worldLimits.zoneSize)}`;
}

/** Zone membership changes without recreating the authoritative entities or their damage. */
export class WorldState {
  readonly zones = new Map<string, ZoneState>();
  private readonly records = new Map<string, EntityRecord>();
  private readonly frames: WorldFrame[] = [];
  private nextSample = 0;

  constructor() {
    for (let x = districtBounds.minX; x <= districtBounds.maxX; x += worldLimits.zoneSize) {
      for (let z = districtBounds.minZ; z <= districtBounds.maxZ; z += worldLimits.zoneSize) {
        const id = zoneIdAt({ x, z })!;
        this.zones.set(id, { id, entities: new Set(), damaged: new Set() });
      }
    }
  }

  get count() { return this.records.size; }
  get historyCount() { return this.frames.length; }
  entity(id: string) { return this.records.get(id)?.source; }
  tier(id: string) { return this.records.get(id)?.tier; }
  history(): readonly WorldFrame[] { return this.frames; }

  register(source: WorldEntity) {
    if (this.records.has(source.id)) throw new Error(`Entidad duplicada: ${source.id}`);
    if (this.records.size >= worldLimits.entities) throw new Error('Se ha alcanzado el presupuesto de entidades');
    this.records.set(source.id, { source, tier: 'near' });
  }

  update(time: number, focus: Point3) {
    if (time < this.nextSample) return;
    this.nextSample = time + worldLimits.sampleInterval;
    const frame: WorldFrame = { time, entities: [] };
    for (const record of this.records.values()) {
      const { source } = record;
      const zoneId = zoneIdAt(source.position);
      if (record.zoneId !== zoneId) {
        const previous = record.zoneId && this.zones.get(record.zoneId);
        if (previous) { previous.entities.delete(source.id); previous.damaged.delete(source.id); }
        record.zoneId = zoneId;
        if (zoneId) this.zones.get(zoneId)!.entities.add(source.id);
      }
      const zone = zoneId && this.zones.get(zoneId);
      if (zone && source.kind === 'damage') {
        if ((source.health ?? 100) < 100) zone.damaged.add(source.id);
        else zone.damaged.delete(source.id);
      }
      const distance = Math.hypot(source.position.x - focus.x, source.position.z - focus.z);
      // Hysteresis prevents changing tiers repeatedly on a boundary.
      const near = record.tier === 'near' ? 40 : 34;
      const middle = record.tier === 'far' ? 76 : 84;
      record.tier = distance <= near ? 'near' : distance <= middle ? 'middle' : 'far';
      frame.entities.push({ id: source.id, kind: source.kind, occupantId: source.occupantId, vehicleId: source.vehicleId, x: source.position.x, y: source.position.y, z: source.position.z,
        heading: source.heading ?? 0, health: source.health ?? 100 });
    }
    this.frames.push(frame);
    if (this.frames.length > worldLimits.historyFrames) this.frames.shift();
  }

  reset(focus: Point3) {
    this.frames.length = 0; this.nextSample = 0;
    for (const record of this.records.values()) { record.zoneId = undefined; record.tier = 'near'; }
    for (const zone of this.zones.values()) { zone.entities.clear(); zone.damaged.clear(); }
    this.update(0, focus);
  }
}
