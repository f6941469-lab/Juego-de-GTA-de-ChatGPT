import type { WorldEventType } from '../../core/events';
import type { PerceptionFrame } from '../perception';
import type { NpcIdentity } from './profiles';

export type NpcEmotionalState =
  | 'normal'
  | 'calm'
  | 'curious'
  | 'confused'
  | 'suspicious'
  | 'nervous'
  | 'alarmed'
  | 'scared'
  | 'panicking'
  | 'aggressive'
  | 'injured'
  | 'disoriented'
  | 'seeking_cover'
  | 'fleeing'
  | 'calling_help'
  | 'recording'
  | 'cooperating';

export type NpcIntent =
  | 'routine'
  | 'observe'
  | 'record'
  | 'flee'
  | 'seek_cover'
  | 'call_help'
  | 'confront'
  | 'cooperate'
  | 'recover';

export interface NpcMemoryEntry {
  eventId: number;
  type: WorldEventType;
  x: number;
  z: number;
  timestamp: number;
  severity: number;
}

export interface NpcDecisionContext {
  simTime: number;
  perception: PerceptionFrame;
  escapeAvailable: boolean;
  shelterAvailable: boolean;
  policeNearby: boolean;
  witnessesNearby: number;
}

export interface NpcBrainState {
  identity: NpcIdentity;
  health: number;
  maxHealth: number;
  fear: number;
  alertness: number;
  anger: number;
  curiosityLevel: number;
  state: NpcEmotionalState;
  intent: NpcIntent;
  stateElapsed: number;
  minHoldSeconds: number;
  focusPoint?: { x: number; z: number };
  memory: NpcMemoryEntry[];
}

const MAX_MEMORY = 8;
const MEMORY_TTL_SECONDS = 26;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function approach(current: number, target: number, rate: number, dt: number): number {
  const factor = 1 - Math.exp(-rate * dt);
  return current + (target - current) * factor;
}

export function createNpcBrain(identity: NpcIdentity, maxHealth = 100): NpcBrainState {
  return {
    identity,
    health: maxHealth,
    maxHealth,
    fear: 0,
    alertness: 0,
    anger: 0,
    curiosityLevel: identity.traits.curiosity * 0.25,
    state: identity.role === 'calm_civilian' ? 'calm' : 'normal',
    intent: 'routine',
    stateElapsed: 0,
    minHoldSeconds: 0.9,
    memory: [],
  };
}

function recordMemory(brain: NpcBrainState, entry: NpcMemoryEntry): void {
  const existing = brain.memory.find((item) => item.eventId === entry.eventId);
  if (existing) return;
  brain.memory.push(entry);
  if (brain.memory.length > MAX_MEMORY) {
    brain.memory.shift();
  }
}

export function stepNpcBrain(
  brain: NpcBrainState,
  dt: number,
  context: NpcDecisionContext,
): { state: NpcEmotionalState; intent: NpcIntent } {
  const { traits, role } = brain.identity;
  const { perception, simTime } = context;

  brain.stateElapsed += dt;

  // Purge old memories
  while (brain.memory.length > 0 && simTime - brain.memory[0].timestamp > MEMORY_TTL_SECONDS) {
    brain.memory.shift();
  }

  // Ingest newly perceived events into limited memory
  let newEventSeverity = 0;
  let interestingEvent = false;
  let filmedRecently = false;
  for (const item of perception.auditoryEvents) {
    recordMemory(brain, {
      eventId: item.event.id,
      type: item.event.type,
      x: item.event.position.x,
      z: item.event.position.z,
      timestamp: simTime,
      severity: item.event.severity,
    });
    newEventSeverity = Math.max(newEventSeverity, item.event.severity * item.perceivedIntensity);
    if (item.event.severity >= 1) interestingEvent = true;
  }
  for (const item of perception.visualEvents) {
    if (!item.confirmed) continue;
    recordMemory(brain, {
      eventId: item.event.id,
      type: item.event.type,
      x: item.event.position.x,
      z: item.event.position.z,
      timestamp: simTime,
      severity: item.event.severity,
    });
    if (item.event.type === 'recording_started') {
      filmedRecently = true;
    } else {
      newEventSeverity = Math.max(newEventSeverity, item.event.severity);
    }
    interestingEvent = true;
  }

  if (perception.closestThreatPos) {
    brain.focusPoint = { ...perception.closestThreatPos };
  } else if (perception.auditoryEvents.length > 0) {
    const loudest = perception.auditoryEvents[0];
    brain.focusPoint = { x: loudest.event.position.x, z: loudest.event.position.z };
  } else if (filmedRecently && perception.visualEvents.length > 0) {
    const rec = perception.visualEvents.find((v) => v.event.type === 'recording_started');
    if (rec) brain.focusPoint = { x: rec.event.position.x, z: rec.event.position.z };
  }

  const threat = Math.max(perception.highestThreat, newEventSeverity * 0.3);
  const healthRatio = brain.health / Math.max(1, brain.maxHealth);
  const supportBonus = (context.policeNearby ? 0.25 : 0) + Math.min(0.18, context.witnessesNearby * 0.04);

  const filmDiscomfort = filmedRecently && (role === 'nervous_civilian' || role === 'aggressive_civilian' || role === 'merchant') ? 0.28 : 0;
  const targetFear = clamp01(threat * (0.55 + traits.fearfulness * 0.85) - traits.courage * 0.38 - supportBonus * 0.45 + (1 - healthRatio) * 0.6 + filmDiscomfort * 0.45);
  const targetAlert = clamp01(Math.max(threat * 0.9, interestingEvent ? 0.45 : 0) + brain.memory.length * 0.05 + (filmedRecently ? 0.28 : 0));
  const targetAnger = clamp01(
    threat * (0.35 + traits.aggression * 0.85) * (0.65 + traits.courage * 0.35) - targetFear * 0.35 + (filmedRecently && role === 'aggressive_civilian' ? 0.35 : 0),
  );
  const targetCuriosity = clamp01(
    (interestingEvent || brain.memory.length > 0
      ? Math.min(1, (traits.curiosity + (filmedRecently ? 0.35 : 0)) * (1 - targetFear * 0.85))
      : traits.curiosity * 0.2),
  );

  brain.fear = approach(brain.fear, targetFear, targetFear > brain.fear ? 4.5 : 0.45, dt);
  brain.alertness = approach(brain.alertness, targetAlert, targetAlert > brain.alertness ? 5.2 : 0.55, dt);
  brain.anger = approach(brain.anger, targetAnger, targetAnger > brain.anger ? 3.5 : 0.4, dt);
  brain.curiosityLevel = approach(brain.curiosityLevel, targetCuriosity, 2.5, dt);

  // Acute physical injury overrides hold hysteresis.
  if (healthRatio < 0.35) {
    brain.state = healthRatio < 0.15 ? 'disoriented' : 'injured';
    brain.intent = 'recover';
    return { state: brain.state, intent: brain.intent };
  }

  // Respect hysteresis to prevent frantic oscillation unless acute danger spikes.
  const acuteSpike = brain.fear > 0.78 && brain.intent === 'routine';
  if (brain.stateElapsed < brain.minHoldSeconds && !acuteSpike) {
    return { state: brain.state, intent: brain.intent };
  }

  // Utility AI scoring for next emotional/behavioral state
  let nextState: NpcEmotionalState = role === 'calm_civilian' ? 'calm' : 'normal';
  let nextIntent: NpcIntent = 'routine';

  if (brain.fear >= 0.76) {
    if (context.escapeAvailable && (traits.courage < 0.5 || !context.shelterAvailable)) {
      nextState = brain.fear > 0.88 ? 'panicking' : 'fleeing';
      nextIntent = 'flee';
    } else if (context.shelterAvailable) {
      nextState = 'seeking_cover';
      nextIntent = 'seek_cover';
    } else {
      nextState = role === 'merchant' ? 'cooperating' : 'scared';
      nextIntent = role === 'merchant' ? 'cooperate' : 'flee';
    }
  } else if (brain.anger >= 0.62 && traits.courage >= 0.55 && brain.fear < 0.55) {
    nextState = 'aggressive';
    nextIntent = 'confront';
  } else if (brain.fear >= 0.46) {
    if (role === 'merchant' && threat >= 0.5) {
      nextState = 'cooperating';
      nextIntent = 'cooperate';
    } else if (context.witnessesNearby > 0 && traits.courage > 0.38 && !context.policeNearby) {
      nextState = 'calling_help';
      nextIntent = 'call_help';
    } else {
      nextState = brain.alertness > 0.6 ? 'alarmed' : 'nervous';
      nextIntent = context.escapeAvailable ? 'flee' : 'seek_cover';
    }
  } else if (brain.alertness >= 0.32) {
    if (
      role !== 'police'
      && brain.curiosityLevel >= 0.52
      && brain.fear < 0.35
      && brain.memory.length > 0
      && brain.memory[brain.memory.length - 1].severity >= 1
    ) {
      nextState = 'recording';
      nextIntent = 'record';
    } else if (brain.curiosityLevel >= 0.42) {
      nextState = 'curious';
      nextIntent = 'observe';
    } else {
      nextState = threat > 0.25 ? 'suspicious' : 'confused';
      nextIntent = 'observe';
    }
  } else if (brain.memory.length === 0) {
    brain.focusPoint = undefined;
  }

  if (nextState !== brain.state || nextIntent !== brain.intent) {
    brain.state = nextState;
    brain.intent = nextIntent;
    brain.stateElapsed = 0;
  }

  return { state: brain.state, intent: brain.intent };
}
