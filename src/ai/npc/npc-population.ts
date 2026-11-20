import type { Scene } from 'three';
import type { WorldEventBus } from '../../core/events';
import type { DebugObserverCone } from '../../debug/overlay';
import {
  closestPedestrianNode,
  findEscapeNode,
  findPedestrianRoute,
  steerPedestrian,
  type PedestrianAgentLike,
  type PedestrianGraph,
  type PedestrianNode,
} from '../../navigation/pedestrian-graph';
import type { SpatialBoxGrid } from '../../physics/spatial-index';
import { computeSimulationTier, type EntityRegistry, type WorldEntity } from '../../simulation/entities';
import { getDistrictAt, makeRandom } from '../../world/generation/layout';
import type { StoreInteriorLayout } from '../../world/stores';
import {
  createObserverState,
  evaluatePerception,
  type ObserverState,
} from '../perception';
import { createNpcBrain, stepNpcBrain, type NpcBrainState } from './npc-brain';
import { createNpcVisuals, type NpcVisualAgent } from './npc-visuals';
import { createNpcIdentity, type NpcIdentity, type NpcRole } from './profiles';

export interface NpcAgent extends NpcVisualAgent {
  id: string;
  role: NpcRole;
  kind: 'pedestrian' | 'clerk' | 'driver_displaced';
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  previousX: number;
  previousZ: number;
  heading: number;
  previousHeading: number;
  speed: number;
  stridePhase: number;
  brain: NpcBrainState;
  observer: ObserverState;
  route: PedestrianNode[];
  routeIndex: number;
  pauseTimer: number;
  callTimer: number;
  witnessNotified: boolean;
  reportCooldown: number;
  hitCooldown: number;
  recoverTimer: number;
  home?: { x: number; z: number; heading: number; storeId?: string };
  currentNodeId?: string;
}

export interface MovingObstacle {
  x: number;
  z: number;
  speed: number;
  heading: number;
  radius: number;
}

export interface NpcPopulationStepContext {
  dt: number;
  focus: { x: number; z: number };
  hour: number;
  eventBus: WorldEventBus;
  entities: EntityRegistry;
  spatial: SpatialBoxGrid;
  policeNearby: boolean;
  vehicles: readonly MovingObstacle[];
  onReportCrime?: (location: { x: number; z: number }, severity: number) => void;
  onHitPlayer?: (damage: number) => void;
}

interface PopulationConfig {
  graph: PedestrianGraph;
  spatial: SpatialBoxGrid;
  stores: readonly StoreInteriorLayout[];
  seed: number;
  capacity?: number;
}

function turnDelta(from: number, to: number): number {
  let delta = ((to - from + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function roleForDistrict(district: string, random: () => number, hour: number): NpcRole {
  const r = random();
  if (district === 'Centro Financiero') {
    if (hour >= 7 && hour <= 19) {
      return r < 0.45 ? 'calm_civilian' : r < 0.72 ? 'curious_civilian' : r < 0.9 ? 'worker' : 'nervous_civilian';
    }
    return r < 0.5 ? 'calm_civilian' : r < 0.8 ? 'nervous_civilian' : 'curious_civilian';
  }
  if (district === 'Puerto y Muelles') {
    return r < 0.36 ? 'worker' : r < 0.62 ? 'brave_civilian' : r < 0.82 ? 'aggressive_civilian' : 'calm_civilian';
  }
  if (district === 'Costa Palmera' || district === 'Isla Estrella') {
    return r < 0.3 ? 'curious_civilian' : r < 0.58 ? 'calm_civilian' : r < 0.8 ? 'customer' : r < 0.92 ? 'nervous_civilian' : 'brave_civilian';
  }
  return r < 0.35 ? 'calm_civilian' : r < 0.6 ? 'customer' : r < 0.8 ? 'curious_civilian' : r < 0.92 ? 'nervous_civilian' : 'worker';
}

export function createNpcPopulation(scene: Scene, config: PopulationConfig) {
  const capacity = config.capacity ?? 72;
  const maxPedestrians = Math.max(12, capacity - config.stores.length - 8);
  const visuals = createNpcVisuals(scene, capacity);
  const random = makeRandom(config.seed ^ 0x91e5a3);
  const graphNodes = [...config.graph.nodes.values()];
  const agents: NpcAgent[] = [];
  const nearEntitiesScratch: WorldEntity[] = [];
  const neighborScratch: PedestrianAgentLike[] = [];
  let serial = 0;
  let tickCount = 0;
  let populateTimer = 0;

  function makeAgent(
    kind: NpcAgent['kind'],
    identity: NpcIdentity,
    x: number,
    z: number,
    heading: number,
    home?: NpcAgent['home'],
  ): NpcAgent {
    const brain = createNpcBrain(identity, 100);
    return {
      id: identity.id,
      role: identity.role,
      kind,
      x,
      y: 0,
      z,
      vx: 0,
      vz: 0,
      previousX: x,
      previousZ: z,
      heading,
      previousHeading: heading,
      speed: 0,
      stridePhase: random() * Math.PI * 2,
      brain,
      observer: createObserverState(identity.id, x, z, heading),
      route: [],
      routeIndex: 0,
      pauseTimer: 0,
      callTimer: 0,
      witnessNotified: false,
      reportCooldown: 0,
      hitCooldown: 0,
      recoverTimer: 0,
      home,
      appearance: identity.appearance,
      state: brain.state,
      intent: brain.intent,
    };
  }

  function spawnClerks(): void {
    config.stores.forEach((interior, index) => {
      const identity = createNpcIdentity(config.seed ^ 0x51c201, 'merchant', index + 1);
      const clerk = makeAgent('clerk', identity, interior.clerkX, interior.clerkZ, interior.clerkHeading, {
        x: interior.clerkX,
        z: interior.clerkZ,
        heading: interior.clerkHeading,
        storeId: interior.store.id,
      });
      agents.push(clerk);
    });
  }

  function pickRoute(fromNode: PedestrianNode): PedestrianNode[] {
    if (graphNodes.length < 2) return [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = graphNodes[Math.floor(random() * graphNodes.length)];
      if (!candidate || candidate.id === fromNode.id) continue;
      const dist = Math.hypot(candidate.x - fromNode.x, candidate.z - fromNode.z);
      if (dist < 18 || dist > 165) continue;
      const route = findPedestrianRoute(config.graph, fromNode.id, candidate.id);
      if (route.length >= 2) return route;
    }
    const edges = config.graph.outgoing.get(fromNode.id) ?? [];
    if (edges.length > 0) {
      const edge = edges[Math.floor(random() * edges.length)];
      return [fromNode, edge.to];
    }
    return [];
  }

  function spawnAmbientPedestrian(focus: { x: number; z: number }, hour: number): void {
    if (graphNodes.length < 2) return;
    const minDist = agents.length < config.stores.length + 6 ? 14 : 26;
    const maxDist = 132;
    for (let attempt = 0; attempt < 18; attempt++) {
      const node = graphNodes[Math.floor(random() * graphNodes.length)];
      const dist = Math.hypot(node.x - focus.x, node.z - focus.z);
      if (dist < minDist || dist > maxDist) continue;
      if (agents.some((existing) => Math.hypot(existing.x - node.x, existing.z - node.z) < 3.5)) continue;

      const route = pickRoute(node);
      if (route.length < 2) continue;
      const next = route[1];
      const heading = Math.atan2(next.x - node.x, -(next.z - node.z));
      const district = getDistrictAt(node.x, node.z);
      const role = roleForDistrict(district, random, hour);
      const identity = createNpcIdentity(config.seed ^ 0x7a41d1, role, ++serial);
      const agent = makeAgent('pedestrian', identity, node.x, node.z, heading);
      agent.route = route;
      agent.routeIndex = 1;
      agent.currentNodeId = node.id;
      agents.push(agent);
      return;
    }
  }

  function spawnDisplacedDriver(params: {
    x: number;
    z: number;
    heading: number;
    identity: NpcIdentity;
    threatPos: { x: number; z: number };
  }): NpcAgent {
    const rightX = Math.cos(params.heading);
    const rightZ = Math.sin(params.heading);
    const spawnX = params.x + rightX * 1.45;
    const spawnZ = params.z + rightZ * 1.45;
    const awayHeading = Math.atan2(spawnX - params.threatPos.x, -(spawnZ - params.threatPos.z));
    const driver = makeAgent('driver_displaced', {
      ...params.identity,
      id: `driver-displaced-${++serial}`,
    }, spawnX, spawnZ, awayHeading);
    driver.brain.focusPoint = { ...params.threatPos };
    driver.brain.alertness = 0.9;
    driver.brain.fear = Math.min(1, params.identity.traits.fearfulness * 0.8 + 0.2);
    driver.brain.anger = params.identity.traits.aggression * 0.85;
    driver.brain.state = params.identity.traits.aggression > 0.6 && params.identity.traits.courage > 0.55
      ? 'aggressive'
      : 'alarmed';
    driver.brain.intent = params.identity.traits.aggression > 0.6 && params.identity.traits.courage > 0.55
      ? 'confront'
      : 'flee';
    if (agents.length >= capacity) {
      const oldest = agents.findIndex((item) => item.kind === 'pedestrian');
      if (oldest >= 0) agents.splice(oldest, 1);
    }
    agents.push(driver);
    return driver;
  }

  function fillNeighbors(agent: NpcAgent, entities: EntityRegistry, vehicles: readonly MovingObstacle[]) {
    neighborScratch.length = 0;
    const nearbyNpcs = entities.queryNear(agent.x, agent.z, 3.2, 'npc', nearEntitiesScratch);
    for (const other of nearbyNpcs) {
      neighborScratch.push({ id: other.id, x: other.position.x, z: other.position.z, radius: other.radius });
    }
    for (let v = 0; v < vehicles.length; v++) {
      const car = vehicles[v];
      if ((car.x - agent.x) ** 2 + (car.z - agent.z) ** 2 < 25) {
        neighborScratch.push({ id: `veh-${v}`, x: car.x, z: car.z, radius: car.radius });
      }
    }
    return neighborScratch;
  }

  function step(ctx: NpcPopulationStepContext): void {
    const { dt, focus, hour, eventBus, entities, spatial, policeNearby, vehicles, onReportCrime, onHitPlayer } = ctx;
    if (!(dt > 0)) return;
    tickCount += 1;

    const daytime = hour >= 7 && hour <= 20;
    const lateNight = hour >= 23 || hour < 5;
    const targetPeds = lateNight ? Math.round(maxPedestrians * 0.42) : daytime ? maxPedestrians : Math.round(maxPedestrians * 0.72);

    populateTimer -= dt;
    if (populateTimer <= 0) {
      populateTimer = 0.25;
      let pedCount = 0;
      for (let i = agents.length - 1; i >= 0; i--) {
        const agent = agents[i];
        if (agent.kind === 'clerk') continue;
        const dist = Math.hypot(agent.x - focus.x, agent.z - focus.z);
        const expiredRecovered = agent.kind === 'driver_displaced' && agent.brain.alertness < 0.08 && dist > 38;
        if (dist > 170 || expiredRecovered) {
          entities.remove(agent.id);
          agents.splice(i, 1);
          continue;
        }
        if (agent.kind === 'pedestrian') {
          if (pedCount >= targetPeds && dist > 95) {
            entities.remove(agent.id);
            agents.splice(i, 1);
            continue;
          }
          pedCount += 1;
        }
      }
      if (pedCount < targetPeds && agents.length < capacity - 2) {
        spawnAmbientPedestrian(focus, hour);
      }
    }

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      agent.previousX = agent.x;
      agent.previousZ = agent.z;
      agent.previousHeading = agent.heading;
      agent.hitCooldown = Math.max(0, agent.hitCooldown - dt);
      agent.reportCooldown = Math.max(0, agent.reportCooldown - dt);

      const distSq = (agent.x - focus.x) ** 2 + (agent.z - focus.z) ** 2;
      const tier = computeSimulationTier(distSq);

      if (tier === 'high' && agent.kind !== 'clerk') {
        for (const car of vehicles) {
          const dx = agent.x - car.x;
          const dz = agent.z - car.z;
          const dist = Math.hypot(dx, dz);
          if (dist < car.radius + 0.42 && car.speed > 4.2 && agent.hitCooldown <= 0) {
            agent.hitCooldown = 1.6;
            const damage = Math.min(82, car.speed * 6.5);
            agent.brain.health = Math.max(8, agent.brain.health - damage);
            agent.recoverTimer = 9;
            const inv = 1 / Math.max(0.01, dist);
            agent.x += dx * inv * 0.95;
            agent.z += dz * inv * 0.95;
            eventBus.emit({
              type: 'npc_injured',
              sourceId: 'player',
              targetIds: [agent.id],
              position: { x: agent.x, y: 0.9, z: agent.z },
              intensity: Math.min(1, car.speed / 14),
              radius: 46,
              severity: 2,
              visual: true,
              auditory: true,
              context: { role: agent.role },
            });
          } else if (dist < car.radius + 1.9 && car.speed > 9.5) {
            const rightX = Math.cos(car.heading);
            const rightZ = Math.sin(car.heading);
            const side = (dx * rightX + dz * rightZ) >= 0 ? 1 : -1;
            agent.x += rightX * side * 1.9 * dt;
            agent.z += rightZ * side * 1.9 * dt;
            agent.brain.alertness = Math.max(agent.brain.alertness, 0.72);
            agent.brain.fear = Math.max(agent.brain.fear, 0.55 * agent.brain.identity.traits.fearfulness + 0.15);
          }
        }
      }

      if (agent.recoverTimer > 0) {
        agent.recoverTimer = Math.max(0, agent.recoverTimer - dt);
        if (agent.recoverTimer === 0) {
          agent.brain.health = agent.brain.maxHealth;
        }
      }

      const runCognitive = tier === 'high' ? (i + tickCount) % 5 === 0 : tier === 'medium' && (i + tickCount) % 15 === 0;
      if (runCognitive) {
        const cogDt = tier === 'high' ? dt * 5 : dt * 15;
        agent.observer.x = agent.x;
        agent.observer.z = agent.z;
        agent.observer.heading = agent.heading;
        const perception = evaluatePerception(
          agent.observer,
          cogDt,
          entities,
          eventBus,
          spatial,
        );

        const nearbyAgents = entities.queryNear(agent.x, agent.z, 26, 'npc', nearEntitiesScratch);
        const result = stepNpcBrain(agent.brain, cogDt, {
          simTime: eventBus.time,
          perception,
          escapeAvailable: true,
          shelterAvailable: config.stores.length > 0,
          policeNearby,
          witnessesNearby: nearbyAgents.length,
        });
        agent.state = result.state;
        agent.intent = result.intent;
      }

      if (agent.brain.intent === 'call_help' && agent.reportCooldown <= 0) {
        if (!agent.witnessNotified) {
          agent.witnessNotified = true;
          eventBus.emit({
            type: 'witness_detected',
            sourceId: agent.id,
            position: { x: agent.x, y: 1.1, z: agent.z },
            intensity: 0.7,
            radius: 24,
            severity: 1,
            visual: true,
          });
        }
        agent.callTimer += dt;
        if (agent.callTimer >= 2.1) {
          agent.callTimer = 0;
          agent.witnessNotified = false;
          agent.reportCooldown = 14;
          const reportPos = agent.brain.focusPoint ?? { x: agent.x, z: agent.z };
          eventBus.emit({
            type: 'crime_reported',
            sourceId: agent.id,
            position: { x: reportPos.x, y: 1, z: reportPos.z },
            intensity: 0.9,
            radius: 30,
            severity: 2,
            auditory: true,
          });
          onReportCrime?.(reportPos, 1);
        }
      } else {
        agent.callTimer = Math.max(0, agent.callTimer - dt * 0.5);
        if (agent.callTimer === 0) agent.witnessNotified = false;
      }

      // Locomotion
      let movedX = agent.x;
      let movedZ = agent.z;
      if (agent.brain.intent === 'recover' || agent.recoverTimer > 0) {
        // Stay downed while recovering
      } else if (agent.kind === 'clerk' && agent.home) {
        const dx = agent.home.x - agent.x;
        const dz = agent.home.z - agent.z;
        const homeDist = Math.hypot(dx, dz);
        if (homeDist > 0.25) {
          movedX += (dx / homeDist) * 1.6 * dt;
          movedZ += (dz / homeDist) * 1.6 * dt;
        } else if (agent.brain.focusPoint && agent.brain.alertness > 0.25) {
          const targetYaw = Math.atan2(agent.brain.focusPoint.x - agent.x, -(agent.brain.focusPoint.z - agent.z));
          agent.heading += turnDelta(agent.heading, targetYaw) * Math.min(1, 8 * dt);
        } else {
          agent.heading += turnDelta(agent.heading, agent.home.heading) * Math.min(1, 6 * dt);
        }
      } else if (agent.brain.intent === 'observe' || agent.brain.intent === 'record' || agent.brain.intent === 'call_help') {
        if (agent.brain.focusPoint) {
          const targetYaw = Math.atan2(agent.brain.focusPoint.x - agent.x, -(agent.brain.focusPoint.z - agent.z));
          agent.heading += turnDelta(agent.heading, targetYaw) * Math.min(1, 8 * dt);
        }
      } else if (agent.brain.intent === 'confront' && agent.brain.focusPoint) {
        const dx = agent.brain.focusPoint.x - agent.x;
        const dz = agent.brain.focusPoint.z - agent.z;
        const dist = Math.hypot(dx, dz);
        const targetYaw = Math.atan2(dx, -dz);
        agent.heading += turnDelta(agent.heading, targetYaw) * Math.min(1, 9 * dt);
        if (dist > 1.75 && dist < 24) {
          movedX += (dx / dist) * 3.0 * dt;
          movedZ += (dz / dist) * 3.0 * dt;
        } else if (dist <= 1.85 && agent.hitCooldown <= 0) {
          const focusDist = Math.hypot(focus.x - agent.x, focus.z - agent.z);
          if (focusDist <= 1.95) {
            agent.hitCooldown = 1.45;
            onHitPlayer?.(8);
          }
        }
      } else if (agent.brain.intent === 'flee') {
        const threat = agent.brain.focusPoint ?? focus;
        const current = agent.currentNodeId ? config.graph.nodes.get(agent.currentNodeId) : undefined;
        const targetNode = agent.route[agent.routeIndex];
        const runningTowardThreat = targetNode
          ? ((targetNode.x - agent.x) * (threat.x - agent.x) + (targetNode.z - agent.z) * (threat.z - agent.z)) > 0
          : false;
        if (!targetNode || runningTowardThreat) {
          const anchor = current ?? closestPedestrianNode(config.graph, agent);
          if (anchor) {
            const safeNode = findEscapeNode(config.graph, anchor, threat);
            if (safeNode) {
              const escapeRoute = findPedestrianRoute(config.graph, anchor.id, safeNode.id);
              if (escapeRoute.length >= 2) {
                agent.route = escapeRoute;
                agent.routeIndex = 1;
              }
            }
          }
        }
        const target = agent.route[agent.routeIndex];
        const moveTarget = target
          ? target
          : { x: agent.x + (agent.x - threat.x), z: agent.z + (agent.z - threat.z) };
        if (tier === 'high') {
          const steer = steerPedestrian(
            agent,
            moveTarget,
            4.55,
            dt,
            spatial,
            fillNeighbors(agent, entities, vehicles),
          );
          movedX = steer.x;
          movedZ = steer.z;
        } else {
          const dx = moveTarget.x - agent.x;
          const dz = moveTarget.z - agent.z;
          const len = Math.max(0.01, Math.hypot(dx, dz));
          movedX += (dx / len) * 4.2 * dt;
          movedZ += (dz / len) * 4.2 * dt;
        }
        if (target && Math.hypot(target.x - movedX, target.z - movedZ) < 1.25) {
          agent.currentNodeId = target.id;
          agent.routeIndex += 1;
        }
      } else {
        if (agent.pauseTimer > 0) {
          agent.pauseTimer -= dt;
        } else {
          if (agent.routeIndex >= agent.route.length) {
            const anchor = (agent.currentNodeId && config.graph.nodes.get(agent.currentNodeId))
              || closestPedestrianNode(config.graph, agent);
            if (anchor) {
              agent.route = pickRoute(anchor);
              agent.routeIndex = agent.route.length > 1 ? 1 : 0;
            }
          }
          const target = agent.route[agent.routeIndex];
          if (target) {
            const walkSpeed = agent.role === 'curious_civilian' ? 1.55 : 1.38;
            if (tier === 'high') {
              const steer = steerPedestrian(
                agent,
                target,
                walkSpeed,
                dt,
                spatial,
                fillNeighbors(agent, entities, vehicles),
              );
              movedX = steer.x;
              movedZ = steer.z;
            } else {
              const dx = target.x - agent.x;
              const dz = target.z - agent.z;
              const len = Math.max(0.01, Math.hypot(dx, dz));
              movedX += (dx / len) * walkSpeed * dt;
              movedZ += (dz / len) * walkSpeed * dt;
            }

            if (Math.hypot(target.x - movedX, target.z - movedZ) < 1.15) {
              agent.currentNodeId = target.id;
              agent.routeIndex += 1;
              if (agent.routeIndex >= agent.route.length && (target.kind === 'store' || target.kind === 'shelter')) {
                agent.pauseTimer = 1.6 + random() * 2.5;
              }
            }
          }
        }
      }

      const stepDx = movedX - agent.x;
      const stepDz = movedZ - agent.z;
      agent.x = movedX;
      agent.z = movedZ;
      agent.vx = stepDx / dt;
      agent.vz = stepDz / dt;
      agent.speed = Math.hypot(agent.vx, agent.vz);
      if (agent.speed > 0.12) {
        const moveHeading = Math.atan2(agent.vx, -agent.vz);
        agent.heading += turnDelta(agent.heading, moveHeading) * Math.min(1, 10 * dt);
        agent.stridePhase += dt * (6.2 + (agent.speed / 4.5) * 6.0);
      }

      entities.upsert({
        id: agent.id,
        kind: 'npc',
        position: { x: agent.x, y: agent.y, z: agent.z },
        heading: agent.heading,
        velocity: { x: agent.vx, z: agent.vz },
        radius: 0.36,
        active: true,
        tier,
        threatLevel: agent.state === 'aggressive' ? 0.5 : 0,
        label: agent.brain.identity.name,
      });
    }
  }

  function render(alpha: number): void {
    visuals.render(agents, alpha);
  }

  function getDebugCones(focus: { x: number; z: number }, maxCones = 10): DebugObserverCone[] {
    const sorted = agents
      .filter((agent) => (agent.x - focus.x) ** 2 + (agent.z - focus.z) ** 2 <= 42 * 42)
      .sort((a, b) =>
        ((a.x - focus.x) ** 2 + (a.z - focus.z) ** 2)
        - ((b.x - focus.x) ** 2 + (b.z - focus.z) ** 2))
      .slice(0, maxCones);
    return sorted.map((agent) => ({
      x: agent.x,
      z: agent.z,
      heading: agent.heading,
      range: 18,
      halfAngleRad: (110 * Math.PI) / 360,
    }));
  }

  function getCrossingObstacles(): { x: number; z: number; radius: number }[] {
    const out: { x: number; z: number; radius: number }[] = [];
    for (const agent of agents) {
      if (agent.recoverTimer > 0 || agent.kind === 'clerk') continue;
      const prev = agent.route[Math.max(0, agent.routeIndex - 1)];
      const next = agent.route[agent.routeIndex];
      if (!prev || !next) continue;
      const edge = config.graph.outgoing.get(prev.id)?.find((item) => item.to.id === next.id);
      if (edge?.kind === 'crosswalk') {
        out.push({ x: agent.x, z: agent.z, radius: 0.65 });
      }
    }
    return out;
  }

  function applyDamage(
    id: string,
    amount: number,
    sourcePos: { x: number; z: number },
    eventBus: WorldEventBus,
  ): { hit: boolean; knockedDown: boolean; role?: NpcRole } {
    const agent = agents.find((item) => item.id === id);
    if (!agent) return { hit: false, knockedDown: false };
    agent.brain.health = Math.max(0, agent.brain.health - amount);
    agent.callTimer = 0;
    agent.witnessNotified = false;
    agent.brain.focusPoint = { ...sourcePos };
    agent.brain.alertness = 1;
    agent.brain.fear = Math.min(1, agent.brain.fear + 0.55);
    const knockedDown = agent.brain.health <= 34;
    if (knockedDown) {
      agent.recoverTimer = agent.brain.health <= 0 ? 18 : 10;
      agent.brain.state = agent.brain.health <= 0 ? 'disoriented' : 'injured';
      agent.brain.intent = 'recover';
      agent.state = agent.brain.state;
      agent.intent = agent.brain.intent;
    }
    eventBus.emit({
      type: 'npc_injured',
      sourceId: 'player',
      targetIds: [agent.id],
      position: { x: agent.x, y: 0.9, z: agent.z },
      intensity: 1,
      radius: 46,
      severity: 2,
      visual: true,
      auditory: true,
      context: { role: agent.role },
    });
    return { hit: true, knockedDown, role: agent.role };
  }

  function intimidateArea(
    origin: { x: number; z: number },
    radius: number,
    eventBus: WorldEventBus,
  ): number {
    let intimidated = 0;
    const radiusSq = radius * radius;
    for (const agent of agents) {
      if (agent.recoverTimer > 0) continue;
      if ((agent.x - origin.x) ** 2 + (agent.z - origin.z) ** 2 > radiusSq) continue;
      agent.callTimer = 0;
      agent.witnessNotified = false;
      agent.brain.focusPoint = { ...origin };
      agent.brain.alertness = 1;
      agent.brain.fear = Math.min(1, Math.max(agent.brain.fear, 0.78));
      agent.brain.state = agent.kind === 'clerk' ? 'cooperating' : 'panicking';
      agent.brain.intent = agent.kind === 'clerk' ? 'cooperate' : 'flee';
      agent.brain.stateElapsed = 0;
      agent.state = agent.brain.state;
      agent.intent = agent.brain.intent;
      intimidated += 1;
    }
    if (intimidated > 0 && eventBus.time >= 0) {
      // Intimidation also interrupts immediate witness reporting in the blast/aim cone.
    }
    return intimidated;
  }

  function intimidateStoreClerk(
    storeId: string,
    threatPos: { x: number; z: number },
    _eventBus: WorldEventBus,
  ): boolean {
    const clerk = agents.find((agent) => agent.kind === 'clerk' && agent.home?.storeId === storeId);
    if (!clerk || clerk.recoverTimer > 0) return false;
    clerk.callTimer = 0;
    clerk.witnessNotified = false;
    clerk.brain.focusPoint = { ...threatPos };
    clerk.brain.alertness = 1;
    clerk.brain.fear = Math.max(clerk.brain.fear, 0.65);
    clerk.brain.state = 'cooperating';
    clerk.brain.intent = 'cooperate';
    clerk.brain.stateElapsed = 0;
    clerk.state = 'cooperating';
    clerk.intent = 'cooperate';
    return true;
  }

  function releaseStoreClerk(storeId: string, threatPos: { x: number; z: number }): void {
    const clerk = agents.find((agent) => agent.kind === 'clerk' && agent.home?.storeId === storeId);
    if (!clerk || clerk.recoverTimer > 0) return;
    clerk.brain.focusPoint = { ...threatPos };
    clerk.brain.fear = 0.52;
    clerk.brain.alertness = 0.85;
    clerk.brain.state = 'calling_help';
    clerk.brain.intent = 'call_help';
    clerk.brain.stateElapsed = 0;
    clerk.state = 'calling_help';
    clerk.intent = 'call_help';
  }

  function reset(): void {
    agents.length = 0;
    serial = 0;
    tickCount = 0;
    populateTimer = 0;
    spawnClerks();
  }

  function dispose(): void {
    agents.length = 0;
    visuals.dispose();
  }

  spawnClerks();

  return {
    get count() { return agents.length; },
    get agents(): readonly NpcAgent[] { return agents; },
    step,
    render,
    spawnDisplacedDriver,
    applyDamage,
    intimidateArea,
    intimidateStoreClerk,
    releaseStoreClerk,
    getDebugCones,
    getCrossingObstacles,
    reset,
    dispose,
  };
}
