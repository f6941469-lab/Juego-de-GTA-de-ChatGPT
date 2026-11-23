import type { Scene } from 'three';
import type { CarryItem } from '../characters/avatar';
import type { Physics, Point3 } from '../physics/physics';
import { makeRandom } from '../world/generation/layout';
import { allShops, shop } from '../world/generation/shop';
import { busStops, metroStations } from '../world/generation/transit';
import { createActor, type Actor } from './actor';
import { cityResidents } from './city-residents';
import { npcPairLine, stalkWarningLine, type NpcJob } from './dialogue';
import { Economy, eyes, Journal, planarDistance, type WorldEvent } from './model';
import type { Navigation } from './navigation';
import type { ManagedVehicle } from './traffic';
import type { WorldState } from './world-state';

export const populationLimits = { decisionsPerStep: 4 } as const;

export type CivilianState =
  | 'routine'
  | 'browsing'
  | 'chatting'
  | 'waiting_bus'
  | 'waiting_metro'
  | 'riding'
  | 'nervous'
  | 'reacting'
  | 'reporting'
  | 'recording'
  | 'fleeing'
  | 'recovering'
  | 'down';

export interface Civilian {
  id: string;
  name: string;
  color: number;
  actor: Actor;
  role: 'cashier' | 'customer' | 'walker';
  job: NpcJob;
  shopId?: string;
  personality: 'flee' | 'call' | 'record';
  carryItem: CarryItem;
  nextDecision: number;
  lastDecision: number;
  state: CivilianState;
  timer: number;
  route: Point3[];
  stop: number;
  cursor: number;
  memory?: { event: WorldEvent; identified: boolean };
  fearUntil: number;
  budget: number;
  stalkScore: number;
  stalkStage: 0 | 1 | 2;
  missedBus: boolean;
  transitTargetId?: string;
  ridingVehicleId?: string;
  rideTimer: number;
  chatCooldown: number;
  lastSpeech: string;
  lastSpeechUntil: number;
  activityLabel: string;
  recordingEvent?: WorldEvent;
}

export function createPopulation(scene: Scene, physics: Physics, navigation: Navigation, journal: Journal, playerHandle: number) {
  const walk = [{ x: 8, y: 0.08, z: 41 }, { x: 22, y: 0.08, z: 41 }, { x: 22, y: 0.08, z: 36 }];
  const specs = [
    { id: 'person:mara', name: 'Mara', spawn: shop.cashier, role: 'cashier' as const, job: 'cashier' as NpcJob, shopId: allShops[0].id, color: 0xd69751, personality: 'call' as const, carryItem: 'none' as CarryItem, route: [] },
    { id: 'person:luz', name: 'Luz', spawn: shop.products, role: 'customer' as const, job: 'estudiante' as NpcJob, shopId: allShops[0].id, color: 0xb76378, personality: 'record' as const, carryItem: 'bag' as CarryItem, route: [shop.products, shop.counter, shop.entrance, walk[1], shop.entrance] },
    { id: 'person:tomas', name: 'Tomás', spawn: walk[1], role: 'walker' as const, job: 'oficinista' as NpcJob, color: 0x7096b1, personality: 'call' as const, carryItem: 'briefcase' as CarryItem, route: [walk[0], walk[1], walk[2]] },
    { id: 'person:sol', name: 'Sol', spawn: walk[0], role: 'walker' as const, job: 'barista' as NpcJob, color: 0xe1ad6a, personality: 'flee' as const, carryItem: 'coffee' as CarryItem, route: [walk[1], walk[2], walk[0]] },
  ];

  const residentSpecs = cityResidents(navigation).map((res, idx) => ({
    ...res,
    job: (['vecino', 'repartidor', 'estudiante', 'oficinista', 'tecnico', 'turista'] as NpcJob[])[idx % 6],
    carryItem: (['none', 'bag', 'phone', 'briefcase', 'coffee', 'none'] as CarryItem[])[idx % 6],
    shopId: undefined as string | undefined,
  }));

  const makeCiv = (spec: {
    id: string; name: string; spawn: Point3; role: 'cashier' | 'customer' | 'walker';
    job: NpcJob; shopId?: string; color: number; personality: 'flee' | 'call' | 'record';
    carryItem: CarryItem; route: Point3[]; heading?: number;
  }): Civilian => {
    const actor = createActor(scene, physics, navigation, spec.spawn, spec.color, spec.heading ?? (spec.role === 'cashier' ? Math.PI : 0));
    actor.carry(spec.carryItem);
    return {
      id: spec.id,
      name: spec.name,
      color: spec.color,
      actor,
      role: spec.role,
      job: spec.job,
      shopId: spec.shopId,
      personality: spec.personality,
      carryItem: spec.carryItem,
      nextDecision: 0,
      lastDecision: 0,
      state: 'routine',
      timer: 0,
      stop: 0,
      cursor: 0,
      fearUntil: 0,
      route: [...spec.route],
      budget: 55,
      stalkScore: 0,
      stalkStage: 0,
      missedBus: false,
      rideTimer: 0,
      chatCooldown: 0,
      lastSpeech: '',
      lastSpeechUntil: 0,
      activityLabel: spec.role === 'cashier' ? 'atendiendo el mostrador' : 'caminando por Costa Palmera',
    };
  };

  // Preserve exact length-10 core population for existing tests
  const people: Civilian[] = [...specs, ...residentSpecs].map(makeCiv);

  // 8 additional store merchants for the other 8 open stores
  const extraMerchants: Civilian[] = allShops.slice(1).map((store) => makeCiv({
    id: store.merchantId,
    name: store.merchantName,
    spawn: store.cashier,
    role: 'cashier',
    job: 'cashier',
    shopId: store.id,
    color: store.merchantColor,
    personality: 'call',
    carryItem: 'none',
    route: [],
    heading: Math.PI,
  }));

  // Extra rich commuters including Pedro (starts near Parada Mercado Palma & follows multimodal bus/metro/shop routine)
  const pedroRoute: Point3[] = [
    busStops[0].waitPoint,
    allShops[1].products,
    allShops[1].counter,
    allShops[1].entrance,
    busStops[1].waitPoint,
    metroStations[0].platform,
  ];
  const extraCitizens: Civilian[] = [
    makeCiv({
      id: 'person:pedro',
      name: 'Pedro',
      spawn: { x: 21.5, y: 0.08, z: 39.7 },
      role: 'customer',
      job: 'oficinista',
      shopId: allShops[1].id,
      color: 0x5c8ab8,
      personality: 'flee',
      carryItem: 'briefcase',
      route: pedroRoute,
    }),
    makeCiv({
      id: 'person:valeria',
      name: 'Valeria',
      spawn: { x: 22.3, y: 0.08, z: 40.3 },
      role: 'walker',
      job: 'turista',
      color: 0xd9738c,
      personality: 'record',
      carryItem: 'phone',
      route: [busStops[0].waitPoint, allShops[3].entrance, busStops[1].waitPoint, allShops[0].entrance],
    }),
    makeCiv({
      id: 'person:marcos',
      name: 'Marcos',
      spawn: { x: 15.2, y: 0.08, z: 54.0 },
      role: 'walker',
      job: 'repartidor',
      color: 0x7da868,
      personality: 'call',
      carryItem: 'coffee',
      route: [metroStations[0].platform, allShops[2].entrance, busStops[3].waitPoint, allShops[8].entrance],
    }),
  ];

  const merchants: Civilian[] = [people[0], ...extraMerchants];
  const allPeople: Civilian[] = [...people, ...extraMerchants, ...extraCitizens];
  const safePlaces = [{ x: 8, y: 0.08, z: 51 }, { x: 22, y: 0.08, z: 51 }, { x: 34.3, y: 0.08, z: 41 }];
  const rand = makeRandom(91377);
  let decisionCursor = 0;
  let ambientTimer = 38;
  let speechText = '';
  let speechUntil = 0;
  let dynamicCount = 0;
  const stats = { decisions: 0, deferred: 0 };

  function speak(person: Civilian, text: string, now: number, playerPos: Point3) {
    person.lastSpeech = text;
    person.lastSpeechUntil = now + 4.5;
    if (planarDistance(person.actor.position, playerPos) < 16) {
      speechText = text;
      speechUntil = now + 4.5;
    }
  }

  function sees(person: Civilian, point: Point3, fov = true) {
    const { actor } = person;
    const distance = planarDistance(actor.position, point);
    if (distance > 22) return false;
    if (fov && distance > 2 && ((point.x - actor.position.x) * Math.sin(actor.heading) - (point.z - actor.position.z) * Math.cos(actor.heading)) / distance < 0.25) return false;
    return physics.canSee(eyes(actor.position), eyes(point), [actor.collider.handle, playerHandle]);
  }

  function notice(person: Civilian, event: WorldEvent, identified: boolean) {
    if (person.memory && event.time - person.memory.event.time < 3) return;
    if (person.state === 'waiting_bus') person.missedBus = true;
    person.memory = { event, identified };
    person.state = 'reacting';
    person.timer = 0.35 + (allPeople.indexOf(person) % 6) * 0.14;
    person.fearUntil = event.time + 14;
    person.actor.goTo(undefined);
  }

  function findStoreNear(point: Point3) {
    return allShops.find((s) => planarDistance(point, s.counter) < 2.4);
  }

  function stepSinglePerson(
    person: Civilian,
    index: number,
    decisionDt: number,
    now: number,
    player: Point3,
    armed: boolean,
    economy?: Economy,
    transit?: { bus: ManagedVehicle & { stoppedAtId?: string }; metro: ManagedVehicle & { stoppedAtId?: string } },
  ) {
    const { actor } = person;
    person.timer = Math.max(0, person.timer - decisionDt);
    person.chatCooldown = Math.max(0, person.chatCooldown - decisionDt);

    for (const event of journal.since(person.cursor)) {
      person.cursor = event.id;
      if (event.kind === 'report' || now - event.time > 2) continue;
      const visible = sees(person, event.position);
      const distance = planarDistance(actor.position, event.position);
      const audible = ['shot', 'glass', 'collision', 'altercation', 'theft'].includes(event.kind)
        && distance < (sees(person, event.position, false) ? 26 : 9);
      if (visible || audible) notice(person, event, visible && event.identified);
    }

    // Persistent stalking detection on mobile citizens
    if (person.role !== 'cashier' && person.state !== 'fleeing' && person.state !== 'down') {
      const distPlayer = planarDistance(actor.position, player);
      if (person.state !== 'riding' && distPlayer > 0.8 && distPlayer < 6.5 && sees(person, player, false)) {
        person.stalkScore = Math.min(28, person.stalkScore + decisionDt * 1.6);
        if (person.stalkScore >= 8.5 && person.stalkStage === 0) {
          person.stalkStage = 1;
          actor.face(player, decisionDt);
          speak(person, stalkWarningLine(person.name, 1), now, player);
        } else if (person.stalkScore >= 16 && person.stalkStage < 2) {
          person.stalkStage = 2;
          actor.face(player, decisionDt);
          speak(person, stalkWarningLine(person.name, 2), now, player);
          person.state = 'fleeing';
          person.fearUntil = now + 9;
          person.activityLabel = 'alejándose porque lo seguían';
        }
      } else if (distPlayer > 9) {
        person.stalkScore = Math.max(0, person.stalkScore - decisionDt * 0.25);
        if (person.stalkScore < 3) person.stalkStage = 0;
      }
    }

    actor.action('relaxed');
    actor.carry(person.carryItem);

    if (person.state === 'riding' && transit) {
      const veh = person.ridingVehicleId === transit.bus.id ? transit.bus : transit.metro;
      actor.position.set(veh.position.x, veh.position.y + 0.1, veh.position.z);
      person.rideTimer = Math.max(0, person.rideTimer - decisionDt);
      if (person.rideTimer === 0 && veh.stoppedAtId) {
        const exitPoint = veh.id === transit.bus.id
          ? (busStops.find((b) => b.id === veh.stoppedAtId)?.waitPoint ?? busStops[0].waitPoint)
          : (metroStations.find((m) => m.id === veh.stoppedAtId)?.platform ?? metroStations[0].platform);
        actor.collider.setEnabled(true);
        actor.warp(exitPoint);
        actor.goTo(undefined);
        person.state = 'routine';
        person.ridingVehicleId = undefined;
        person.activityLabel = 'bajando del transporte';
      }
      return;
    }

    if (person.state === 'reacting') {
      actor.action('handsUp');
      actor.face(person.memory!.event.position, decisionDt);
      if (person.timer === 0) {
        if (person.personality === 'record' && person.memory?.identified) {
          person.state = 'recording';
          person.timer = 5.5;
          person.recordingEvent = person.memory.event;
        } else {
          person.state = person.personality === 'flee' ? 'fleeing' : 'reporting';
          person.timer = 2.1;
        }
      }
    } else if (person.state === 'recording') {
      actor.action('phone');
      if (person.recordingEvent) actor.face(person.recordingEvent.position, decisionDt);
      if (person.timer === 0 && person.memory) {
        const { event, identified } = person.memory;
        journal.publish('report', event.position, now, person.id, identified, event.id);
        journal.post(person.name, event);
        person.recordingEvent = undefined;
        person.state = 'fleeing';
        person.timer = 8;
      }
    } else if (person.state === 'reporting') {
      actor.action(person.role === 'cashier' ? 'handsUp' : 'phone');
      if (person.timer === 0 && person.memory) {
        const { event, identified } = person.memory;
        journal.publish('report', event.position, now, person.id, identified, event.id);
        if (person.personality === 'record' && identified) journal.post(person.name, event);
        person.state = person.role === 'cashier' ? 'recovering' : 'fleeing';
        person.timer = 9;
      }
    } else if (person.state === 'fleeing') {
      person.activityLabel = 'huyendo del peligro';
      if (actor.arrived || actor.stuck > 2.5) {
        const destinations = (index < 4 ? [...safePlaces] : person.route.length ? [...person.route] : [...safePlaces])
          .sort((a, b) => planarDistance(b, person.memory?.event.position ?? player) - planarDistance(a, person.memory?.event.position ?? player));
        actor.goTo(destinations[(actor.stuck > 2.5 ? 1 : 0) % destinations.length], 3.8);
      }
      if (now >= person.fearUntil) {
        person.state = 'recovering';
        person.timer = 3;
        actor.goTo(undefined);
      }
    } else if (person.state === 'recovering') {
      if (person.role === 'cashier') actor.action('handsUp');
      if (person.timer === 0) {
        person.state = 'routine';
        person.memory = undefined;
        if (person.missedBus && person.id === 'person:pedro') {
          // Missed the bus due to incident -> re-route to Metro Sur!
          person.stop = Math.max(0, person.route.length - 1);
          person.activityLabel = 'caminando al metro tras perder el bus';
        }
      }
    } else if (armed && planarDistance(actor.position, player) < 10 && sees(person, player)) {
      person.state = 'nervous';
      actor.goTo(undefined);
      actor.face(player, decisionDt);
      actor.action('handsUp');
      person.timer = 2;
    } else if (person.state === 'nervous') {
      if (person.timer === 0) person.state = 'routine';
    } else if (person.role === 'cashier') {
      const storeDef = allShops.find((s) => s.id === person.shopId) ?? allShops[0];
      actor.goTo(storeDef.cashier, 1.3);
      person.activityLabel = `atendiendo en ${storeDef.name}`;
      if (planarDistance(actor.position, player) < 5) actor.face(player, decisionDt);
    } else if (person.state === 'chatting') {
      actor.goTo(undefined);
      if (person.timer === 0) {
        person.state = 'routine';
        person.stop = (person.stop + 1) % Math.max(1, person.route.length);
      }
    } else if (person.state === 'waiting_bus') {
      person.activityLabel = 'esperando el autobús';
      if (transit && transit.bus.stoppedAtId === person.transitTargetId) {
        actor.collider.setEnabled(false);
        actor.goTo(undefined);
        person.state = 'riding';
        person.ridingVehicleId = transit.bus.id;
        person.rideTimer = 14;
        person.missedBus = false;
        person.activityLabel = 'viajando en autobús';
      } else if (person.timer === 0) {
        person.state = 'routine';
        person.stop = (person.stop + 1) % Math.max(1, person.route.length);
      }
    } else if (person.state === 'waiting_metro') {
      person.activityLabel = 'esperando el metro';
      if (transit && transit.metro.stoppedAtId === person.transitTargetId) {
        actor.collider.setEnabled(false);
        actor.goTo(undefined);
        person.state = 'riding';
        person.ridingVehicleId = transit.metro.id;
        person.rideTimer = 11;
        person.missedBus = false;
        person.activityLabel = 'viajando en metro';
      } else if (person.timer === 0) {
        person.state = 'routine';
        person.stop = (person.stop + 1) % Math.max(1, person.route.length);
      }
    } else if (person.state === 'browsing') {
      if (person.timer === 0) {
        const curPoint = person.route[person.stop];
        const nearStore = curPoint ? findStoreNear(curPoint) : undefined;
        if (nearStore && economy) {
          const item = nearStore.catalog[0];
          const bought = economy.npcBuyFrom(nearStore.id, item.id, person.budget);
          if (bought) {
            person.budget -= bought.price;
            person.carryItem = 'bag';
          }
        }
        person.stop = (person.stop + 1) % Math.max(1, person.route.length);
        person.state = 'routine';
      }
    } else {
      const target = person.route[person.stop];
      if (!target) return;
      actor.goTo(target, person.stalkStage === 1 ? 2.1 : 1.3 + (index % 4) * 0.12);
      if (actor.arrived || actor.stuck > 3) {
        actor.goTo(undefined);
        const busStop = busStops.find((b) => planarDistance(target, b.waitPoint) < 1.2);
        const metroStop = metroStations.find((m) => planarDistance(target, m.platform) < 1.8);
        if (busStop && transit && !person.missedBus) {
          person.state = 'waiting_bus';
          person.transitTargetId = busStop.id;
          person.timer = 14;
          person.activityLabel = `esperando el bus en ${busStop.name}`;
        } else if (metroStop && transit) {
          person.state = 'waiting_metro';
          person.transitTargetId = metroStop.id;
          person.timer = 16;
          person.activityLabel = `esperando el metro en ${metroStop.name}`;
        } else {
          person.state = 'browsing';
          person.timer = person.role === 'customer' ? 3.5 : 1.4;
          person.activityLabel = findStoreNear(target) ? 'comprando en una tienda' : 'paseando por el barrio';
        }
      }
    }
  }

  const api = {
    people,
    merchants,
    extraCitizens,
    allPeople,
    stats,
    cashier: people[0],
    get ambientSpeech() {
      return speechText;
    },
    get speechActive() {
      return speechText;
    },
    nearestMerchant(point: Point3) {
      let best: { store: typeof allShops[number]; merchant: Civilian; dist: number } | undefined;
      for (const store of allShops) {
        const merchant = merchants.find((m) => m.id === store.merchantId);
        if (!merchant) continue;
        const dist = planarDistance(point, store.counter);
        if (!best || dist < best.dist) best = { store, merchant, dist };
      }
      return best;
    },
    nearestTalkable(point: Point3, maxDist = 2.6): Civilian | undefined {
      let best: Civilian | undefined;
      let bestDist = maxDist;
      for (const person of allPeople) {
        if (person.role === 'cashier' || person.actor.health <= 0) continue;
        if (['fleeing', 'down', 'riding', 'reporting', 'recording'].includes(person.state)) continue;
        const dist = planarDistance(point, person.actor.position);
        if (dist < bestDist) {
          bestDist = dist;
          best = person;
        }
      }
      return best;
    },
    activeSpeech(now: number) {
      return now < speechUntil ? speechText : '';
    },
    ejectFromVehicle(carId: string, pos: Point3, now: number) {
      dynamicCount++;
      const driver = makeCiv({
        id: `person:ejected:${carId}:${dynamicCount}`,
        name: 'Conductor',
        spawn: pos,
        role: 'walker',
        job: 'vecino',
        color: 0xc27b5e,
        personality: 'call',
        carryItem: 'phone',
        route: safePlaces,
      });
      allPeople.push(driver);
      const evt = journal.publish('theft', pos, now, 'player', true);
      notice(driver, evt, true);
      speak(driver, '¡Eh! ¡Ese es mi coche! ¡Llamo a la policía!', now, pos);
      return driver;
    },
    step(
      dt: number,
      now: number,
      player: Point3,
      armed: boolean,
      world?: WorldState,
      economy?: Economy,
      transit?: { bus: ManagedVehicle & { stoppedAtId?: string }; metro: ManagedVehicle & { stoppedAtId?: string } },
    ) {
      stats.decisions = 0;
      if (now >= speechUntil) speechText = '';

      // Ambient NPC-to-NPC altercation / random street event (only after 20s of play so short deterministic tests are unaffected)
      if (now > 20) {
        ambientTimer -= dt;
        if (ambientTimer <= 0) {
          ambientTimer = 36 + rand() * 18;
          const candidates = [...extraCitizens, ...people.slice(4)].filter(
            (p) => p.actor.health > 0 && p.state !== 'riding' && p.state !== 'fleeing' && planarDistance(p.actor.position, player) > 6,
          );
          if (candidates.length >= 2) {
            const actorA = candidates[Math.floor(rand() * candidates.length)];
            const evt = journal.publish(rand() < 0.45 ? 'shot' : 'altercation', actorA.actor.position, now, actorA.id, false);
            speak(actorA, evt.kind === 'shot' ? '¡Cuidado, alguien disparó!' : '¡Oye, suéltame la mochila!', now, player);
          }
        }
      }

      // NPC-to-NPC spontaneous chatter when calm & close (after initial 3s)
      if (now > 3) for (let i = 0; i < allPeople.length; i++) {
        const a = allPeople[i];
        if (a.actor.health <= 0 || a.role === 'cashier' || a.chatCooldown > 0) continue;
        if (!['routine', 'waiting_bus', 'waiting_metro'].includes(a.state)) continue;
        for (let j = i + 1; j < allPeople.length; j++) {
          const b = allPeople[j];
          if (b.actor.health <= 0 || b.role === 'cashier' || b.chatCooldown > 0) continue;
          if (!['routine', 'waiting_bus', 'waiting_metro'].includes(b.state)) continue;
          if (planarDistance(a.actor.position, b.actor.position) < 2.4) {
            a.chatCooldown = 26;
            b.chatCooldown = 26;
            a.actor.face(b.actor.position, 0.4);
            b.actor.face(a.actor.position, 0.4);
            if (a.state === 'routine') { a.state = 'chatting'; a.timer = 3.6; }
            if (b.state === 'routine') { b.state = 'chatting'; b.timer = 3.6; }
            const line = npcPairLine(a.name, a.job, a.state === 'waiting_bus' ? 'wait_bus' : a.state === 'waiting_metro' ? 'wait_metro' : 'walk', journal.events.at(-1));
            speak(a, line, now, player);
            break;
          }
        }
      }

      const first = decisionCursor;
      decisionCursor = (decisionCursor + 1) % allPeople.length;
      for (let offset = 0; offset < allPeople.length; offset++) {
        const index = (first + offset) % allPeople.length;
        const person = allPeople[index];
        const { actor } = person;
        if (actor.health <= 0) {
          person.state = 'down';
          continue;
        }
        if (now < person.nextDecision) continue;
        // Core 10 people respect populationLimits.decisionsPerStep per tick
        if (stats.decisions >= populationLimits.decisionsPerStep && index < people.length) {
          stats.deferred++;
          continue;
        }
        if (index < people.length) stats.decisions++;
        const decisionDt = Math.max(dt, now - person.lastDecision);
        person.lastDecision = now;
        const tier = world?.tier(person.id) ?? 'near';
        const urgent = !['routine', 'browsing', 'waiting_bus', 'waiting_metro'].includes(person.state);
        person.nextDecision = now + (urgent ? 0.05 : tier === 'far' ? 0.6 : tier === 'middle' ? 0.25 : 0.1);
        stepSinglePerson(person, index, decisionDt, now, player, armed, economy, transit);
      }
    },
    reset() {
      decisionCursor = 0;
      ambientTimer = 38;
      speechText = '';
      speechUntil = 0;
      stats.decisions = stats.deferred = 0;
      // Remove dynamically ejected drivers on reset
      while (allPeople.length > people.length + extraMerchants.length + extraCitizens.length) {
        const extra = allPeople.pop()!;
        extra.actor.dispose();
      }
      for (const person of allPeople) {
        person.actor.reset();
        person.state = 'routine';
        person.timer = person.cursor = person.stop = person.fearUntil = person.nextDecision = person.lastDecision = person.stalkScore = person.rideTimer = person.chatCooldown = person.lastSpeechUntil = 0;
        person.stalkStage = 0;
        person.missedBus = false;
        person.ridingVehicleId = undefined;
        person.transitTargetId = undefined;
        person.recordingEvent = undefined;
        person.memory = undefined;
        person.budget = 55;
        person.lastSpeech = '';
        person.actor.carry(person.carryItem);
      }
    },
    dispose() {
      for (const person of allPeople) person.actor.dispose();
    },
  };
  return api;
}
