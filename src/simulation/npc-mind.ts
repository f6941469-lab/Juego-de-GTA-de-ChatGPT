import type { Point3 } from '../physics/physics';
import type { EventKind, WorldEvent } from './model';
import { zoneIdAt } from './world-state';

export type MemoryKind =
  | EventKind
  | 'stalking'
  | 'chat'
  | 'purchase'
  | 'gossip';

export interface NpcMemoryEntry {
  id: number;
  kind: MemoryKind;
  zoneId: string | undefined;
  time: number;
  source: string;
  summary: string;
  intensity: number;
  aboutPlayer: boolean;
  witnessedDirectly: boolean;
  heardFrom?: string;
}

export interface NpcDrives {
  hunger: number;
  energy: number;
  social: number;
  errands: number;
  safety: number;
}

export interface NpcTraits {
  boldness: number;
  curiosity: number;
  sociability: number;
  punctuality: number;
}

export interface NpcMind {
  seed: number;
  traits: NpcTraits;
  drives: NpcDrives;
  memories: NpcMemoryEntry[];
  zoneCaution: Record<string, number>;
  relationships: Record<string, number>;
  playerTrust: number;
  playerWitnessedCrimes: number;
  playerChats: number;
  lastPlayerInteraction: number;
  nextMemoryId: number;
  currentGoalKind: 'shop' | 'bus' | 'metro' | 'leisure' | 'socialize' | 'patrol_walk' | 'home' | 'work';
}

function hashId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(seed: number, salt: number): number {
  let s = (seed ^ Math.imul(salt + 1, 2654435761)) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 2246822507) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
}

export function createNpcMind(id: string, personality: 'flee' | 'call' | 'record'): NpcMind {
  const seed = hashId(id);
  const baseBold = personality === 'record' ? 0.68 : personality === 'call' ? 0.45 : 0.22;
  return {
    seed,
    traits: {
      boldness: Math.min(1, Math.max(0.05, baseBold + (seededUnit(seed, 1) - 0.5) * 0.25)),
      curiosity: 0.25 + seededUnit(seed, 2) * 0.7,
      sociability: 0.25 + seededUnit(seed, 3) * 0.7,
      punctuality: 0.3 + seededUnit(seed, 4) * 0.65,
    },
    drives: {
      hunger: 18 + seededUnit(seed, 5) * 35,
      energy: 65 + seededUnit(seed, 6) * 30,
      social: 35 + seededUnit(seed, 7) * 45,
      errands: 20 + seededUnit(seed, 8) * 45,
      safety: 95,
    },
    memories: [],
    zoneCaution: {},
    relationships: {},
    playerTrust: 0,
    playerWitnessedCrimes: 0,
    playerChats: 0,
    lastPlayerInteraction: -100,
    nextMemoryId: 1,
    currentGoalKind: 'patrol_walk',
  };
}

export function stepNpcDrives(mind: NpcMind, dt: number, state: string): void {
  const d = mind.drives;
  d.hunger = Math.min(100, d.hunger + dt * 0.55);
  d.errands = Math.min(100, d.errands + dt * 0.48);

  if (state === 'fleeing' || state === 'nervous') {
    d.energy = Math.max(0, d.energy - dt * 1.4);
  } else if (state === 'riding' || state === 'chatting' || state === 'browsing') {
    d.energy = Math.min(100, d.energy + dt * 1.8);
  } else {
    d.energy = Math.max(10, d.energy - dt * 0.28);
  }

  if (state === 'chatting') {
    d.social = Math.min(100, d.social + dt * 7.5);
  } else {
    d.social = Math.max(0, d.social - dt * (0.45 + mind.traits.sociability * 0.45));
  }

  if (state === 'routine' || state === 'browsing' || state === 'chatting') {
    d.safety = Math.min(100, d.safety + dt * 2.2);
  }

  // Decay zone caution gently over time
  for (const key of Object.keys(mind.zoneCaution)) {
    const next = mind.zoneCaution[key] - dt * 0.35;
    if (next <= 0.5) delete mind.zoneCaution[key];
    else mind.zoneCaution[key] = next;
  }
}

const crimeSeverity: Record<EventKind, number> = {
  shot: 48,
  robbery: 52,
  theft: 38,
  glass: 24,
  altercation: 22,
  collision: 18,
  threat: 32,
  report: 10,
};

function describeEvent(kind: EventKind, aboutPlayer: boolean): string {
  switch (kind) {
    case 'shot': return aboutPlayer ? 'vi al protagonista disparar en la calle' : 'se oyeron disparos cerca';
    case 'robbery': return aboutPlayer ? 'presencié un atraco en el local' : 'asaltaron una tienda del barrio';
    case 'theft': return aboutPlayer ? 'vi cómo robaban un coche a plena vista' : 'hubo un robo de vehículo';
    case 'glass': return 'rompieron un escaparate';
    case 'collision': return 'hubo un choque fuerte en la calzada';
    case 'altercation': return 'presencié una pelea callejera';
    case 'threat': return 'alguien amenazó con un arma';
    case 'report': return 'avisaron a la policía por la zona';
  }
}

export function rememberEvent(
  mind: NpcMind,
  event: WorldEvent,
  identified: boolean,
): void {
  const aboutPlayer = identified && event.source === 'player';
  const severity = crimeSeverity[event.kind] ?? 20;
  mind.drives.safety = Math.max(0, mind.drives.safety - severity * (1.15 - mind.traits.boldness * 0.45));

  if (event.zoneId) {
    mind.zoneCaution[event.zoneId] = Math.min(100, (mind.zoneCaution[event.zoneId] ?? 0) + severity);
  }

  if (aboutPlayer) {
    mind.playerWitnessedCrimes++;
    mind.playerTrust = Math.max(-100, mind.playerTrust - severity * 0.85);
  }

  // Merge if identical kind/zone happened very recently
  const duplicate = mind.memories.find(
    (m) => m.kind === event.kind && m.zoneId === event.zoneId && Math.abs(event.time - m.time) < 4,
  );
  if (duplicate) {
    duplicate.intensity = Math.min(100, duplicate.intensity + severity * 0.3);
    duplicate.aboutPlayer ||= aboutPlayer;
    return;
  }

  mind.memories.unshift({
    id: mind.nextMemoryId++,
    kind: event.kind,
    zoneId: event.zoneId,
    time: event.time,
    source: event.source,
    summary: describeEvent(event.kind, aboutPlayer),
    intensity: severity,
    aboutPlayer,
    witnessedDirectly: true,
  });
  if (mind.memories.length > 10) mind.memories.length = 10;
}

export function rememberCustom(
  mind: NpcMind,
  kind: MemoryKind,
  point: Point3,
  now: number,
  summary: string,
  aboutPlayer: boolean,
  trustDelta: number,
  intensity = 22,
): void {
  mind.playerTrust = Math.max(-100, Math.min(100, mind.playerTrust + trustDelta));
  if (aboutPlayer) mind.lastPlayerInteraction = now;

  const zoneId = zoneIdAt(point);
  const recent = mind.memories.find((m) => m.kind === kind && Math.abs(now - m.time) < 8);
  if (recent) {
    recent.time = now;
    recent.summary = summary;
    recent.intensity = Math.max(recent.intensity, intensity);
    return;
  }

  mind.memories.unshift({
    id: mind.nextMemoryId++,
    kind,
    zoneId,
    time: now,
    source: aboutPlayer ? 'player' : 'self',
    summary,
    intensity,
    aboutPlayer,
    witnessedDirectly: true,
  });
  if (mind.memories.length > 10) mind.memories.length = 10;
}

/**
 * Transfers a salient episodic memory (and player reputation impression) between two conversing NPCs.
 * Returns the transferred memory if gossip occurred.
 */
export function exchangeGossip(
  speakerId: string,
  speakerName: string,
  speakerMind: NpcMind,
  listenerId: string,
  listenerName: string,
  listenerMind: NpcMind,
  now: number,
): NpcMemoryEntry | undefined {
  speakerMind.relationships[listenerId] = Math.min(100, (speakerMind.relationships[listenerId] ?? 0) + 18);
  listenerMind.relationships[speakerId] = Math.min(100, (listenerMind.relationships[speakerId] ?? 0) + 18);
  speakerMind.drives.social = Math.min(100, speakerMind.drives.social + 26);
  listenerMind.drives.social = Math.min(100, listenerMind.drives.social + 26);

  // Find most intense direct memory from speaker within last 3 minutes
  const salient = speakerMind.memories.find(
    (m) => m.witnessedDirectly && m.intensity >= 22 && now - m.time < 180 && m.kind !== 'chat' && m.kind !== 'purchase',
  );
  if (!salient) return undefined;

  const alreadyKnown = listenerMind.memories.some(
    (m) => m.kind === salient.kind && m.zoneId === salient.zoneId && Math.abs(m.time - salient.time) < 12,
  );
  if (alreadyKnown) return undefined;

  if (salient.zoneId) {
    listenerMind.zoneCaution[salient.zoneId] = Math.min(
      100,
      (listenerMind.zoneCaution[salient.zoneId] ?? 0) + salient.intensity * 0.55,
    );
  }
  if (salient.aboutPlayer) {
    listenerMind.playerTrust = Math.max(-100, listenerMind.playerTrust - salient.intensity * 0.35);
  }

  const entry: NpcMemoryEntry = {
    id: listenerMind.nextMemoryId++,
    kind: 'gossip',
    zoneId: salient.zoneId,
    time: now,
    source: salient.source,
    summary: `${speakerName} me contó que ${salient.summary}`,
    intensity: salient.intensity * 0.7,
    aboutPlayer: salient.aboutPlayer,
    witnessedDirectly: false,
    heardFrom: speakerName,
  };
  listenerMind.memories.unshift(entry);
  if (listenerMind.memories.length > 10) listenerMind.memories.length = 10;

  // Also keep speaker aware they chatted with listener
  if (!speakerMind.memories.some((m) => m.kind === 'chat' && m.heardFrom === listenerName && now - m.time < 25)) {
    speakerMind.memories.unshift({
      id: speakerMind.nextMemoryId++,
      kind: 'chat',
      zoneId: salient.zoneId,
      time: now,
      source: listenerId,
      summary: `estuve charlando con ${listenerName}`,
      intensity: 10,
      aboutPlayer: false,
      witnessedDirectly: true,
      heardFrom: listenerName,
    });
    if (speakerMind.memories.length > 10) speakerMind.memories.length = 10;
  }

  return entry;
}

export function recentSalientMemory(mind: NpcMind, now: number, maxAge = 240): NpcMemoryEntry | undefined {
  return mind.memories.find((m) => now - m.time <= maxAge && m.intensity >= 18);
}

export function zoneCautionAt(mind: NpcMind, point: Point3): number {
  const z = zoneIdAt(point);
  return z ? (mind.zoneCaution[z] ?? 0) : 0;
}

export function utilityNoise(mind: NpcMind, stepCounter: number, optionIdx: number): number {
  return seededUnit(mind.seed ^ (stepCounter * 7919), optionIdx) * 14;
}
