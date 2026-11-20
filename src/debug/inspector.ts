import type { NpcBrainState } from '../ai/npc/npc-brain';
import type { WorldEventBus } from '../core/events';
import type { EntityRegistry } from '../simulation/entities';

export interface SystemTimings {
  physicsMs: number;
  trafficMs: number;
  policeMs: number;
  eventsMs: number;
}

export interface InspectorSnapshot {
  entities: EntityRegistry;
  events: WorldEventBus;
  timings: SystemTimings;
  wantedLevel: number;
  wantedState: string;
  lastKnown?: { x: number; z: number };
  npcs?: readonly NpcBrainState[];
}

export function formatSimulationInspector(snapshot: InspectorSnapshot): string {
  const { entities, events, timings, wantedLevel, wantedState, lastKnown, npcs = [] } = snapshot;
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const entity of entities.all()) {
    if (entity.tier === 'high') high += 1;
    else if (entity.tier === 'medium') medium += 1;
    else low += 1;
  }

  const lines = [
    `[F5] INSPECTOR DE SIMULACIÓN`,
    `Entidades (${entities.size}): alta=${high} media=${medium} baja=${low}`,
    `  jugador=${entities.countByKind('player')} veh=${entities.countByKind('vehicle')} tráfico=${entities.countByKind('traffic_vehicle')} patrullas=${entities.countByKind('police_unit')} npc=${entities.countByKind('npc')}`,
    `CPU paso fijo: phys=${timings.physicsMs.toFixed(2)}ms · tráf=${timings.trafficMs.toFixed(2)}ms · pol=${timings.policeMs.toFixed(2)}ms · evt=${timings.eventsMs.toFixed(2)}ms`,
    `Policía: ★${wantedLevel} (${wantedState}) · Últ. pos: ${lastKnown ? `${lastKnown.x.toFixed(1)}, ${lastKnown.z.toFixed(1)}` : 'ninguna'}`,
  ];

  const recentEvents = events.recent(4);
  lines.push(`Eventos activos (${events.count} en ventana):`);
  if (recentEvents.length === 0) {
    lines.push(`  (sin eventos recientes)`);
  } else {
    for (let i = recentEvents.length - 1; i >= 0; i--) {
      const evt = recentEvents[i];
      lines.push(`  #${evt.id} ${evt.type} [g${evt.severity}] @ ${evt.position.x.toFixed(0)},${evt.position.z.toFixed(0)} (${evt.timestamp.toFixed(1)}s)`);
    }
  }

  if (npcs.length > 0) {
    lines.push(`NPCs muestreados (${npcs.length}):`);
    for (const npc of npcs.slice(0, 4)) {
      lines.push(`  ${npc.identity.name} (${npc.identity.role}): ${npc.state}/${npc.intent} miedo=${npc.fear.toFixed(2)} mem=${npc.memory.length}`);
    }
  }

  return lines.join('\n');
}
