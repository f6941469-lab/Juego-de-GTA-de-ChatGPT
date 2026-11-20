import type { WorldEvent, WorldEventBus } from '../core/events';
import type { SpatialBoxGrid } from '../physics/spatial-index';
import type { EntityRegistry, WorldEntity } from '../simulation/entities';

export interface PerceptionConfig {
  viewRange: number;
  fovCos: number;
  hearingRange: number;
  recognitionSeconds: number;
  auditoryThreshold: number;
}

export interface VisualDetection {
  entityId: string;
  distance: number;
  recognition: number;
  confirmed: boolean;
  threatLevel: number;
  position: { x: number; y: number; z: number };
}

export interface AuditoryStimulus {
  event: WorldEvent;
  distance: number;
  perceivedIntensity: number;
  occluded: boolean;
}

export interface VisualEventStimulus {
  event: WorldEvent;
  distance: number;
  recognition: number;
  confirmed: boolean;
}

export interface ObserverState {
  id: string;
  x: number;
  z: number;
  heading: number;
  lastEventTime: number;
  recognition: Map<string, number>;
}

export interface PerceptionFrame {
  visualTargets: VisualDetection[];
  visualEvents: VisualEventStimulus[];
  auditoryEvents: AuditoryStimulus[];
  highestThreat: number;
  closestThreatPos?: { x: number; z: number };
}

export const defaultPerceptionConfig: PerceptionConfig = {
  viewRange: 38,
  fovCos: 0.42, // ~130 deg total horizontal FOV
  hearingRange: 48,
  recognitionSeconds: 0.35,
  auditoryThreshold: 0.14,
};

export function createObserverState(id: string, x = 0, z = 0, heading = 0): ObserverState {
  return {
    id,
    x,
    z,
    heading,
    lastEventTime: 0,
    recognition: new Map(),
  };
}

export function inFieldOfView(
  observerX: number,
  observerZ: number,
  heading: number,
  targetX: number,
  targetZ: number,
  range: number,
  fovCos: number,
): { inside: boolean; distance: number } {
  const dx = targetX - observerX;
  const dz = targetZ - observerZ;
  const distSq = dx * dx + dz * dz;
  if (distSq > range * range) return { inside: false, distance: Math.sqrt(distSq) };
  const distance = Math.sqrt(distSq);
  if (distance < 1.6) return { inside: true, distance };
  const forwardX = Math.sin(heading);
  const forwardZ = -Math.cos(heading);
  const dot = (forwardX * dx + forwardZ * dz) / distance;
  return { inside: dot >= fovCos, distance };
}

export function evaluatePerception(
  observer: ObserverState,
  dt: number,
  entities: EntityRegistry,
  events: WorldEventBus,
  spatial: SpatialBoxGrid,
  config: PerceptionConfig = defaultPerceptionConfig,
): PerceptionFrame {
  const visualTargets: VisualDetection[] = [];
  const visualEvents: VisualEventStimulus[] = [];
  const auditoryEvents: AuditoryStimulus[] = [];

  const nearbyEntities = entities.queryNear(observer.x, observer.z, config.viewRange);
  const seenKeys = new Set<string>();
  let highestThreat = 0;
  let closestThreatDist = Infinity;
  let closestThreatPos: { x: number; z: number } | undefined;

  for (const target of nearbyEntities) {
    if (target.id === observer.id || !target.active) continue;
    if (target.threatLevel <= 0 && target.kind !== 'player') continue;

    const fov = inFieldOfView(
      observer.x,
      observer.z,
      observer.heading,
      target.position.x,
      target.position.z,
      config.viewRange,
      config.fovCos,
    );
    if (!fov.inside) continue;

    const clear = spatial.clearLine(
      { x: observer.x, z: observer.z },
      { x: target.position.x, z: target.position.z },
      { minY: 1.15, maxY: 2.0 },
    );
    if (!clear) continue;

    const key = `ent:${target.id}`;
    seenKeys.add(key);
    const closeness = Math.max(0.35, 1 - fov.distance / config.viewRange);
    const rate = dt / Math.max(0.05, config.recognitionSeconds * (1.25 - 0.75 * closeness));
    const prev = observer.recognition.get(key) ?? 0;
    const recognition = Math.min(1, prev + rate);
    observer.recognition.set(key, recognition);

    const confirmed = recognition >= 1;
    visualTargets.push({
      entityId: target.id,
      distance: fov.distance,
      recognition,
      confirmed,
      threatLevel: target.threatLevel,
      position: { ...target.position },
    });

    if (confirmed && target.threatLevel > 0) {
      const weighted = target.threatLevel * (0.4 + 0.6 * closeness);
      if (weighted > highestThreat) highestThreat = weighted;
      if (fov.distance < closestThreatDist) {
        closestThreatDist = fov.distance;
        closestThreatPos = { x: target.position.x, z: target.position.z };
      }
    }
  }

  const nearbyEvents = events.queryNear(
    observer.x,
    observer.z,
    config.hearingRange,
    observer.lastEventTime,
  );

  for (const event of nearbyEvents) {
    if (event.sourceId === observer.id) continue;
    const dx = event.position.x - observer.x;
    const dz = event.position.z - observer.z;
    const distance = Math.hypot(dx, dz);

    if (event.auditory && distance <= event.radius + config.hearingRange * 0.25) {
      const effectiveRadius = Math.max(1, event.radius);
      const falloff = Math.max(0, 1 - distance / effectiveRadius);
      const occluded = !spatial.clearLine(
        { x: observer.x, z: observer.z },
        { x: event.position.x, z: event.position.z },
        { minY: 0.5, maxY: 2.0 },
      );
      const perceivedIntensity = event.intensity * falloff * (occluded ? 0.42 : 1);
      if (perceivedIntensity >= config.auditoryThreshold) {
        auditoryEvents.push({ event, distance, perceivedIntensity, occluded });
        const danger = event.severity * 0.25 * perceivedIntensity;
        if (danger > highestThreat) highestThreat = danger;
        if (event.severity >= 2 && distance < closestThreatDist) {
          closestThreatDist = distance;
          closestThreatPos = { x: event.position.x, z: event.position.z };
        }
      }
    }

    if (event.visual && distance <= config.viewRange) {
      const fov = inFieldOfView(
        observer.x,
        observer.z,
        observer.heading,
        event.position.x,
        event.position.z,
        config.viewRange,
        config.fovCos,
      );
      if (fov.inside) {
        const clear = spatial.clearLine(
          { x: observer.x, z: observer.z },
          { x: event.position.x, z: event.position.z },
          { minY: 1.15, maxY: 2.0 },
        );
        if (clear) {
          const key = `evt:${event.id}`;
          seenKeys.add(key);
          const prev = observer.recognition.get(key) ?? 0;
          const stepRec = distance <= 14 ? 1 : dt / Math.max(0.05, config.recognitionSeconds * 0.8);
          const recognition = Math.min(1, prev + stepRec);
          observer.recognition.set(key, recognition);
          const confirmed = recognition >= 1;
          visualEvents.push({ event, distance, recognition, confirmed });
          if (confirmed && event.severity >= 2) {
            const danger = event.severity * 0.32;
            if (danger > highestThreat) highestThreat = danger;
            if (distance < closestThreatDist) {
              closestThreatDist = distance;
              closestThreatPos = { x: event.position.x, z: event.position.z };
            }
          }
        }
      }
    }
  }

  // Decay recognition progress for unseen keys and purge zeroes.
  for (const [key, value] of observer.recognition) {
    if (seenKeys.has(key)) continue;
    const decayed = value - dt * 0.6;
    if (decayed <= 0) observer.recognition.delete(key);
    else observer.recognition.set(key, decayed);
  }

  observer.lastEventTime = events.time;

  return {
    visualTargets,
    visualEvents,
    auditoryEvents,
    highestThreat,
    closestThreatPos,
  };
}
