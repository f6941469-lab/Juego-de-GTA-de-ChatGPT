export type WorldEventType =
  | 'threat_appeared'
  | 'weapon_visible'
  | 'weapon_aimed'
  | 'gunshot_fired'
  | 'npc_injured'
  | 'vehicle_collision'
  | 'traffic_accident'
  | 'object_destroyed'
  | 'glass_broken'
  | 'robbery_started'
  | 'robbery_finished'
  | 'witness_detected'
  | 'crime_reported'
  | 'recording_started'
  | 'video_published'
  | 'police_alerted'
  | 'suspect_located'
  | 'suspect_lost'
  | 'reinforcements_requested'
  | 'pursuit_started'
  | 'pursuit_ended'
  | 'horn_honked'
  | 'vehicle_hijacked';

export interface EventPoint3 {
  x: number;
  y: number;
  z: number;
}

export interface WorldEventInput {
  type: WorldEventType;
  sourceId?: string;
  targetIds?: readonly string[];
  position: EventPoint3;
  intensity: number;
  radius: number;
  severity: number;
  visual?: boolean;
  auditory?: boolean;
  context?: Readonly<Record<string, string | number | boolean>>;
}

export interface WorldEvent extends WorldEventInput {
  id: number;
  timestamp: number;
  visual: boolean;
  auditory: boolean;
}

export type WorldEventListener = (event: WorldEvent) => void;

export class WorldEventBus {
  private readonly events: WorldEvent[] = [];
  private readonly listeners = new Set<WorldEventListener>();
  private nextId = 1;
  private clock = 0;

  constructor(
    private readonly maxHistory = 256,
    private readonly ttlSeconds = 30,
  ) {}

  get time(): number {
    return this.clock;
  }

  get count(): number {
    return this.events.length;
  }

  advance(dt: number): void {
    if (!(dt > 0)) return;
    this.clock += dt;
    this.prune();
  }

  emit(input: WorldEventInput): WorldEvent {
    const event: WorldEvent = {
      ...input,
      id: this.nextId++,
      timestamp: this.clock,
      position: { ...input.position },
      targetIds: input.targetIds ? [...input.targetIds] : undefined,
      visual: input.visual ?? false,
      auditory: input.auditory ?? false,
      context: input.context ? { ...input.context } : undefined,
    };
    this.events.push(event);
    if (this.events.length > this.maxHistory) {
      this.events.shift();
    }
    for (const listener of this.listeners) {
      listener(event);
    }
    return event;
  }

  /**
   * Returns only recent events whose propagation radius overlaps the observer's reach.
   * Callers (e.g. NPC perception) must still apply line-of-sight, FOV, and attenuation.
   */
  queryNear(
    x: number,
    z: number,
    observerRange = 0,
    sinceTime = -Infinity,
    out: WorldEvent[] = [],
  ): WorldEvent[] {
    out.length = 0;
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      if (event.timestamp < sinceTime) break;
      const limit = event.radius + observerRange;
      const dx = event.position.x - x;
      const dz = event.position.z - z;
      if (dx * dx + dz * dz <= limit * limit) {
        out.push(event);
      }
    }
    return out;
  }

  recent(limit = 12): readonly WorldEvent[] {
    return this.events.slice(-limit);
  }

  subscribe(listener: WorldEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.events.length = 0;
    this.clock = 0;
    this.nextId = 1;
  }

  private prune(): void {
    const cutoff = this.clock - this.ttlSeconds;
    while (this.events.length > 0 && this.events[0].timestamp < cutoff) {
      this.events.shift();
    }
  }
}
