import type { Scene } from 'three';
import type { CarryItem } from '../characters/avatar';
import type { Physics, Point3 } from '../physics/physics';
import { makeRandom } from '../world/generation/layout';
import {
  npcResidentialHomes,
  npcSocialHubs,
  npcWorkplaces,
  type WorldLocation,
} from '../world/generation/expansion';
import { allShops, shop } from '../world/generation/shop';
import { busStops, metroStations } from '../world/generation/transit';
import { createActor, type Actor } from './actor';
import { cityResidents } from './city-residents';
import { armedWarningLine, chaseReactionLine, dodgeCarLine, npcPairLine, stalkWarningLine, type NpcJob } from './dialogue';
import { Economy, eyes, Journal, planarDistance, type WorldEvent } from './model';
import type { Navigation } from './navigation';
import {
  createNpcMind,
  exchangeGossip,
  rememberCustom,
  rememberEvent,
  stepNpcDrives,
  utilityNoise,
  zoneCautionAt,
  type NpcMind,
} from './npc-mind';
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
  initialCarryItem: CarryItem;
  nextDecision: number;
  lastDecision: number;
  state: CivilianState;
  timer: number;
  route: Point3[];
  initialRoute: Point3[];
  stop: number;
  cycleCount: number;
  cursor: number;
  memory?: { event: WorldEvent; identified: boolean };
  mind: NpcMind;
  homeLocation: WorldLocation;
  workLocation: WorldLocation;
  socialHub: WorldLocation;
  districtResident: boolean;
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

const cityLeisureSpots: readonly { name: string; point: Point3 }[] = [
  { name: 'Jardín Coral', point: { x: 34.4, y: 0.08, z: 23.0 } },
  { name: 'Paseo del Mar', point: { x: 53.2, y: 0.08, z: 7.0 } },
  { name: 'Torre Alba', point: { x: 21.6, y: 0.08, z: -51.0 } },
  { name: 'Hotel Miramar', point: { x: -6.8, y: 0.08, z: 20.8 } },
  { name: 'Club Neón', point: { x: 8.4, y: 0.08, z: 21.0 } },
];

export function createPopulation(scene: Scene, physics: Physics, navigation: Navigation, journal: Journal, playerHandle: number) {
  const walk = [{ x: 8, y: 0.08, z: 41 }, { x: 22, y: 0.08, z: 41 }, { x: 22, y: 0.08, z: 36 }];
  const specs = [
    { id: 'person:mara', name: 'Mara', spawn: shop.cashier, role: 'cashier' as const, job: 'cashier' as NpcJob, shopId: allShops[0].id, color: 0xd69751, personality: 'call' as const, carryItem: 'none' as CarryItem, route: [] },
    { id: 'person:luz', name: 'Luz', spawn: shop.products, role: 'customer' as const, job: 'estudiante' as NpcJob, shopId: allShops[0].id, color: 0xb76378, personality: 'record' as const, carryItem: 'bag' as CarryItem, route: [shop.products, shop.counter, shop.entrance, walk[1], allShops[1].entrance] },
    { id: 'person:tomas', name: 'Tomás', spawn: walk[1], role: 'walker' as const, job: 'oficinista' as NpcJob, color: 0x7096b1, personality: 'call' as const, carryItem: 'briefcase' as CarryItem, route: [walk[0], walk[1], busStops[0].waitPoint] },
    { id: 'person:sol', name: 'Sol', spawn: walk[0], role: 'walker' as const, job: 'barista' as NpcJob, color: 0xe1ad6a, personality: 'flee' as const, carryItem: 'coffee' as CarryItem, route: [walk[1], allShops[3].entrance, allShops[3].counter] },
  ];

  const residentSpecs = cityResidents(navigation).map((res, idx) => ({
    ...res,
    job: (['vecino', 'repartidor', 'estudiante', 'oficinista', 'tecnico', 'turista'] as NpcJob[])[idx % 6],
    carryItem: (['none', 'bag', 'phone', 'briefcase', 'coffee', 'none'] as CarryItem[])[idx % 6],
    shopId: undefined as string | undefined,
  }));

  let civIndex = 0;
  const makeCiv = (spec: {
    id: string; name: string; spawn: Point3; role: 'cashier' | 'customer' | 'walker';
    job: NpcJob; shopId?: string; color: number; personality: 'flee' | 'call' | 'record';
    carryItem: CarryItem; route: Point3[]; heading?: number;
    homeLocation?: WorldLocation; workLocation?: WorldLocation; socialHub?: WorldLocation;
    districtResident?: boolean;
  }): Civilian => {
    const idx = civIndex++;
    const homeLocation = spec.homeLocation ?? npcResidentialHomes[idx % npcResidentialHomes.length];
    const workLocation = spec.workLocation ?? npcWorkplaces[idx % npcWorkplaces.length];
    const socialHub = spec.socialHub ?? npcSocialHubs[idx % npcSocialHubs.length];
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
      initialCarryItem: spec.carryItem,
      nextDecision: 0,
      lastDecision: 0,
      state: 'routine',
      timer: 0,
      stop: 0,
      cycleCount: 0,
      cursor: 0,
      mind: createNpcMind(spec.id, spec.personality),
      homeLocation,
      workLocation,
      socialHub,
      districtResident: spec.districtResident ?? false,
      fearUntil: 0,
      route: [...spec.route],
      initialRoute: [...spec.route],
      budget: 65,
      stalkScore: 0,
      stalkStage: 0,
      missedBus: false,
      rideTimer: 0,
      chatCooldown: 0,
      lastSpeech: '',
      lastSpeechUntil: 0,
      activityLabel: spec.role === 'cashier'
        ? 'atendiendo el mostrador'
        : spec.districtResident
          ? `viviendo en ${homeLocation.district}`
          : 'recorriendo Costa Palmera',
    };
  };

  // Preserve length-10 core population array for existing tests
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

  // Extra commuters including Pedro (multimodal bus/metro/shop routine)
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

  // 12 outer-district residents living in distant homes, commuting to work & gathering at social hubs
  const outerDistrictResidents: Civilian[] = [
    // Isla Fortuna (Casino, Resort, Plaza Oasis & coastal villas)
    makeCiv({
      id: 'person:fortuna:camila', name: 'Camila', color: 0xd86b82, role: 'walker', job: 'oficinista', personality: 'record', carryItem: 'phone',
      spawn: { x: 294, y: 0.08, z: 68 }, districtResident: true,
      homeLocation: npcResidentialHomes[5], workLocation: npcWorkplaces[0], socialHub: npcSocialHubs[0],
      route: [npcWorkplaces[0].point, npcSocialHubs[0].point, npcResidentialHomes[5].point],
    }),
    makeCiv({
      id: 'person:fortuna:rodrigo', name: 'Rodrigo', color: 0x4f8ca8, role: 'walker', job: 'tecnico', personality: 'call', carryItem: 'briefcase',
      spawn: { x: 306, y: 0.08, z: -18 }, districtResident: true,
      homeLocation: npcResidentialHomes[6], workLocation: npcWorkplaces[3], socialHub: npcSocialHubs[0],
      route: [npcSocialHubs[0].point, npcWorkplaces[3].point, npcResidentialHomes[6].point],
    }),
    makeCiv({
      id: 'person:fortuna:sofia', name: 'Sofía', color: 0xe2a85e, role: 'walker', job: 'vecino', personality: 'flee', carryItem: 'coffee',
      spawn: { x: 374, y: 0.08, z: -48 }, districtResident: true,
      homeLocation: npcResidentialHomes[7], workLocation: npcWorkplaces[0], socialHub: npcSocialHubs[0],
      route: [npcResidentialHomes[7].point, npcSocialHubs[0].point, npcWorkplaces[0].point],
    }),
    makeCiv({
      id: 'person:fortuna:andres', name: 'Andrés', color: 0x6f9e73, role: 'walker', job: 'turista', personality: 'record', carryItem: 'bag',
      spawn: { x: 292, y: 0.08, z: 78 }, districtResident: true,
      homeLocation: npcResidentialHomes[8], workLocation: npcWorkplaces[3], socialHub: npcSocialHubs[0],
      route: [npcWorkplaces[0].point, npcResidentialHomes[8].point, npcSocialHubs[0].point],
    }),
    // Barrio del Sol & Distrito Cívico Norte (Comisaría Central & residential villas)
    makeCiv({
      id: 'person:sol:elena', name: 'Elena', color: 0x7b6ba8, role: 'walker', job: 'oficinista', personality: 'call', carryItem: 'briefcase',
      spawn: { x: 64, y: 0.08, z: -192 }, districtResident: true,
      homeLocation: npcResidentialHomes[0], workLocation: npcWorkplaces[1], socialHub: npcSocialHubs[1],
      route: [npcWorkplaces[1].point, npcSocialHubs[1].point, npcResidentialHomes[0].point],
    }),
    makeCiv({
      id: 'person:sol:braulio', name: 'Braulio', color: 0x5c8596, role: 'walker', job: 'tecnico', personality: 'call', carryItem: 'coffee',
      spawn: { x: -18, y: 0.08, z: -260 }, districtResident: true,
      homeLocation: npcResidentialHomes[1], workLocation: npcWorkplaces[1], socialHub: npcSocialHubs[1],
      route: [npcResidentialHomes[1].point, npcSocialHubs[1].point, npcWorkplaces[1].point],
    }),
    makeCiv({
      id: 'person:sol:isabel', name: 'Isabel', color: 0xc97b5d, role: 'walker', job: 'vecino', personality: 'flee', carryItem: 'bag',
      spawn: { x: 28, y: 0.08, z: -260 }, districtResident: true,
      homeLocation: npcResidentialHomes[2], workLocation: npcWorkplaces[1], socialHub: npcSocialHubs[1],
      route: [npcResidentialHomes[2].point, npcSocialHubs[1].point, npcResidentialHomes[3].point],
    }),
    makeCiv({
      id: 'person:sol:raul', name: 'Raúl', color: 0x8a9c5a, role: 'walker', job: 'repartidor', personality: 'record', carryItem: 'phone',
      spawn: { x: -4, y: 0.08, z: -185 }, districtResident: true,
      homeLocation: npcResidentialHomes[3], workLocation: npcWorkplaces[1], socialHub: npcSocialHubs[1],
      route: [npcSocialHubs[1].point, npcResidentialHomes[3].point, npcResidentialHomes[4].point],
    }),
    // Colinas del Sur & Restaurante El Mirador
    makeCiv({
      id: 'person:sur:nadia', name: 'Nadia', color: 0xd48466, role: 'walker', job: 'barista', personality: 'call', carryItem: 'coffee',
      spawn: { x: -158, y: 6.08, z: 211 }, districtResident: true,
      homeLocation: npcResidentialHomes[9], workLocation: npcWorkplaces[2], socialHub: npcSocialHubs[2],
      route: [npcWorkplaces[2].point, { x: -156, y: 6.08, z: 222 }, { x: -156, y: 6.08, z: 206 }],
    }),
    makeCiv({
      id: 'person:sur:javier', name: 'Javier', color: 0x527d8c, role: 'walker', job: 'vecino', personality: 'flee', carryItem: 'bag',
      spawn: { x: 4, y: 0.08, z: 218 }, districtResident: true,
      homeLocation: npcResidentialHomes[10], workLocation: npcWorkplaces[2], socialHub: npcSocialHubs[2],
      route: [npcSocialHubs[2].point, npcResidentialHomes[10].point, npcResidentialHomes[9].point],
    }),
    makeCiv({
      id: 'person:sur:carmen', name: 'Carmen', color: 0xb86e8a, role: 'walker', job: 'vecino', personality: 'record', carryItem: 'phone',
      spawn: { x: 42, y: 0.08, z: 320 }, districtResident: true,
      homeLocation: npcResidentialHomes[11], workLocation: npcWorkplaces[2], socialHub: npcSocialHubs[2],
      route: [npcResidentialHomes[11].point, npcSocialHubs[2].point, npcResidentialHomes[10].point],
    }),
    // Sierra Palmera (Ladera residencial a y = 8m)
    makeCiv({
      id: 'person:sierra:martin', name: 'Martín', color: 0x6b8f64, role: 'walker', job: 'tecnico', personality: 'call', carryItem: 'coffee',
      spawn: { x: -131, y: 8.08, z: -12 }, districtResident: true,
      homeLocation: npcResidentialHomes[12], workLocation: npcSocialHubs[3], socialHub: npcSocialHubs[3],
      route: [npcResidentialHomes[12].point, npcSocialHubs[3].point, { x: -130, y: 8.08, z: -38 }],
    }),
  ];

  const merchants: Civilian[] = [people[0], ...extraMerchants];
  const allPeople: Civilian[] = [...people, ...extraMerchants, ...extraCitizens, ...outerDistrictResidents];
  const safePlaces = [
    { x: 8, y: 0.08, z: 51 },
    { x: 22, y: 0.08, z: 51 },
    { x: 34.3, y: 0.08, z: 41 },
    ...busStops.map((b) => b.waitPoint),
    ...metroStations.map((m) => m.entrance),
  ];
  const rand = makeRandom(91377);
  let decisionCursor = 0;
  let ambientTimer = 34;
  let chatterAcc = 0;
  let speechText = '';
  let speechUntil = 0;
  let dynamicCount = 0;
  let populationVersion = 1;
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
    if (actor.suspended) return false;
    const distance = planarDistance(actor.position, point);
    if (distance > 22) return false;
    if (fov && distance > 2 && ((point.x - actor.position.x) * Math.sin(actor.heading) - (point.z - actor.position.z) * Math.cos(actor.heading)) / distance < 0.25) return false;
    return physics.canSee(eyes(actor.position), eyes(point), [actor.collider.handle, playerHandle]);
  }

  function notice(person: Civilian, event: WorldEvent, identified: boolean) {
    if (person.actor.suspended) return;
    if (person.memory && event.time - person.memory.event.time < 3) return;
    if (person.state === 'waiting_bus') person.missedBus = true;
    person.memory = { event, identified };
    rememberEvent(person.mind, event, identified);
    person.state = 'reacting';
    person.timer = 0.35 + (allPeople.indexOf(person) % 6) * 0.14;
    person.fearUntil = event.time + 14;
    person.actor.goTo(undefined);
  }

  function findStoreNear(point: Point3) {
    return allShops.find((s) => planarDistance(point, s.counter) < 2.8 || planarDistance(point, s.products) < 2.8);
  }

  function nearestMetroPlatform(point: Point3) {
    let best = metroStations[0];
    let bestD = Infinity;
    for (const st of metroStations) {
      const d = planarDistance(point, st.platform);
      if (d < bestD) { bestD = d; best = st; }
    }
    return best;
  }

  function findSocialBuddy(person: Civilian): Civilian | undefined {
    let best: Civilian | undefined;
    let bestScore = -Infinity;
    for (const other of allPeople) {
      if (other === person || other.role === 'cashier' || other.actor.health <= 0 || other.actor.suspended) continue;
      if (!['routine', 'waiting_bus', 'waiting_metro'].includes(other.state)) continue;
      const d = planarDistance(person.actor.position, other.actor.position);
      if (d > 2.5 && d < 18) {
        const familiarity = person.mind.relationships[other.id] ?? 0;
        const score = 30 - d + familiarity * 0.4;
        if (score > bestScore) { bestScore = score; best = other; }
      }
    }
    return best;
  }

  /**
   * Procedural Utility-AI goal selector: scores candidate goals dynamically based on
   * internal drives (hunger, energy, social, errands, safety), traits, time of day,
   * episodic zone caution, and nearby social companions.
   */
  function advanceAutonomousLife(person: Civilian, index: number, hour = 17) {
    person.stop++;
    if (person.stop < person.route.length) return;
    person.stop = 0;
    person.cycleCount++;

    const { mind } = person;
    const { drives, traits } = mind;
    const isNight = hour >= 20 || hour < 6;
    const isMorning = hour >= 6 && hour < 11.5;

    // Outer-district residents live a full home <-> work <-> social-hub cycle across their district
    if (person.districtResident) {
      const buddy = findSocialBuddy(person);
      const homeUtility = (100 - drives.energy) * 0.95 + (isNight ? 42 : 0) + utilityNoise(mind, person.cycleCount, 1);
      const workUtility = drives.errands * 0.85 + traits.punctuality * 34 + (isMorning ? 36 : isNight ? -18 : 14) + utilityNoise(mind, person.cycleCount, 2);
      const hubUtility = (100 - drives.social) * 0.8 + traits.curiosity * 28 + (!isNight ? 18 : 8) + utilityNoise(mind, person.cycleCount, 3);
      const socialUtility = buddy
        ? (100 - drives.social) * 0.95 + traits.sociability * 38 + utilityNoise(mind, person.cycleCount, 4)
        : -Infinity;

      const best = Math.max(homeUtility, workUtility, hubUtility, socialUtility);
      if (best === socialUtility && buddy) {
        mind.currentGoalKind = 'socialize';
        person.route = [{ ...buddy.actor.position }];
        person.activityLabel = `charlando con ${buddy.name} en ${person.homeLocation.district}`;
      } else if (best === homeUtility) {
        mind.currentGoalKind = 'home';
        person.route = [person.homeLocation.point];
        person.activityLabel = `volviendo a casa (${person.homeLocation.name})`;
      } else if (best === workUtility) {
        mind.currentGoalKind = 'work';
        person.route = [person.workLocation.point];
        person.activityLabel = `trabajando en ${person.workLocation.name}`;
      } else {
        mind.currentGoalKind = 'leisure';
        person.route = [person.socialHub.point];
        person.activityLabel = `conviviendo en ${person.socialHub.name}`;
      }
      return;
    }

    // 1. Score food / shopping options (preferring safer zones & time-appropriate venues)
    const morningStores = [allShops[2], allShops[3], allShops[0], allShops[8]];
    const nightStores = [allShops[4], allShops[8], allShops[0], allShops[5]];
    const storePool = isMorning ? morningStores : isNight ? nightStores : allShops;
    let bestStore = storePool[0];
    let bestStoreUtility = -Infinity;
    for (let i = 0; i < storePool.length; i++) {
      const st = storePool[i];
      const caution = zoneCautionAt(mind, st.entrance);
      const isFood = st.id.includes('cafeteria') || st.id.includes('panaderia') || st.id.includes('restaurante') || st.id.includes('palma');
      const u = (isFood ? drives.hunger * 0.85 : drives.errands * 0.72)
        + (person.budget >= 18 ? 16 : -22)
        - caution * (1.1 - traits.curiosity * 0.4)
        + utilityNoise(mind, person.cycleCount, i);
      if (u > bestStoreUtility) { bestStoreUtility = u; bestStore = st; }
    }

    // 2. Score leisure / rest spots
    let bestSpot = cityLeisureSpots[0];
    let bestSpotUtility = -Infinity;
    for (let i = 0; i < cityLeisureSpots.length; i++) {
      const sp = cityLeisureSpots[i];
      const caution = zoneCautionAt(mind, sp.point);
      const nightBoost = isNight && (sp.name === 'Club Neón' || sp.name === 'Hotel Miramar') ? 26 : 0;
      const dayBoost = !isNight && (sp.name === 'Jardín Coral' || sp.name === 'Paseo del Mar') ? 16 : 0;
      const u = (100 - drives.energy) * 0.75 + traits.curiosity * 28 + nightBoost + dayBoost
        - caution * 0.9 + utilityNoise(mind, person.cycleCount, 20 + i);
      if (u > bestSpotUtility) { bestSpotUtility = u; bestSpot = sp; }
    }

    // 3. Score bus / metro commuting
    const busStop = busStops[(index + person.cycleCount + Math.floor(mind.seed % 4)) % busStops.length];
    const metro = metroStations[(index + person.cycleCount) % metroStations.length];
    const busUtility = drives.errands * 0.65 + traits.punctuality * 22
      - (person.missedBus ? 28 : 0)
      - zoneCautionAt(mind, busStop.waitPoint) * 0.7
      + utilityNoise(mind, person.cycleCount, 40);
    const metroUtility = drives.errands * 0.60 + (person.missedBus ? 35 : 8)
      - zoneCautionAt(mind, metro.platform) * 0.5
      + utilityNoise(mind, person.cycleCount, 41);

    // 4. Score socializing with a nearby citizen
    const buddy = findSocialBuddy(person);
    const socialUtility = buddy
      ? (100 - drives.social) * 0.92 + traits.sociability * 34 + utilityNoise(mind, person.cycleCount, 50)
      : -Infinity;

    // Pick highest-utility procedural goal
    const maxScore = Math.max(bestStoreUtility, bestSpotUtility, busUtility, metroUtility, socialUtility);
    if (maxScore === socialUtility && buddy) {
      mind.currentGoalKind = 'socialize';
      const meetPoint = navigation.closest(buddy.actor.position, 2.2) ?? buddy.actor.position;
      person.route = [meetPoint];
      person.activityLabel = `acercándose a saludar a ${buddy.name}`;
    } else if (maxScore === bestStoreUtility) {
      mind.currentGoalKind = 'shop';
      person.shopId = bestStore.id;
      person.route = [bestStore.entrance, bestStore.products, bestStore.counter, bestStore.entrance];
      person.activityLabel = `yendo a comprar a ${bestStore.name}`;
    } else if (maxScore === busUtility) {
      mind.currentGoalKind = 'bus';
      person.route = [busStop.waitPoint, bestStore.entrance];
      person.activityLabel = `camino a ${busStop.name}`;
    } else if (maxScore === metroUtility) {
      mind.currentGoalKind = 'metro';
      person.route = person.initialRoute.length >= 2
        ? [metro.platform, ...person.initialRoute.slice(0, 2)]
        : [metro.platform, bestStore.entrance];
      person.activityLabel = isNight ? 'volviendo en metro' : `yendo hacia ${metro.name}`;
    } else {
      mind.currentGoalKind = 'leisure';
      const walkPoint = navigation.closest(bestSpot.point, 3.6) ?? bestSpot.point;
      person.route = person.initialRoute.length >= 1
        ? [person.initialRoute[0], walkPoint]
        : [walkPoint];
      person.activityLabel = isNight ? `saliendo por ${bestSpot.name}` : `pasando por ${bestSpot.name}`;
    }
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
    hour = 17,
    policeStars = 0,
    fastVehicles?: readonly { position: Point3; heading: number; speed: number }[],
  ) {
    const { actor, mind } = person;
    person.timer = Math.max(0, person.timer - decisionDt);
    person.chatCooldown = Math.max(0, person.chatCooldown - decisionDt);
    stepNpcDrives(mind, decisionDt, person.state);

    for (const event of journal.since(person.cursor)) {
      person.cursor = event.id;
      if (event.kind === 'report' || now - event.time > 2 || person.state === 'riding') continue;
      const visible = sees(person, event.position);
      const distance = planarDistance(actor.position, event.position);
      const audible = ['shot', 'glass', 'collision', 'altercation', 'theft'].includes(event.kind)
        && distance < (sees(person, event.position, false) ? 26 : 9);
      if (visible || audible) notice(person, event, visible && event.identified);
    }

    // Active fast-vehicle evasion only when a speeding vehicle's actual forward corridor threatens this pedestrian
    if (
      fastVehicles && person.role !== 'cashier' && !actor.suspended
      && ['routine', 'browsing', 'chatting', 'nervous'].includes(person.state)
    ) {
      for (const veh of fastVehicles) {
        if (Math.abs(veh.speed) < 4.5) continue;
        const dx = actor.position.x - veh.position.x;
        const dz = actor.position.z - veh.position.z;
        const fx = Math.sin(veh.heading);
        const fz = -Math.cos(veh.heading);
        const forward = dx * fx + dz * fz;
        const lateral = dx * (-fz) + dz * fx;
        if (forward > 0.4 && forward < 5.5 && Math.abs(lateral) < 1.85) {
          const side = lateral >= 0 ? 1 : -1;
          const dodgePoint = {
            x: actor.position.x + (-fz) * side * 2.6,
            y: 0.08,
            z: actor.position.z + fx * side * 2.6,
          };
          const safeSpot = navigation.closest(dodgePoint, 2.5);
          if (safeSpot) actor.goTo(safeSpot, 4.1);
          person.state = 'nervous';
          person.timer = 1.6;
          person.activityLabel = 'esquivando un coche';
          if (person.chatCooldown <= 0) {
            person.chatCooldown = 7;
            speak(person, dodgeCarLine(person.name, index), now, player);
          }
          return;
        }
      }
    }

    // Organic civilian reaction to active multi-star police chases passing nearby
    if (
      policeStars >= 2 && person.role !== 'cashier' && !actor.suspended
      && ['routine', 'browsing', 'chatting', 'waiting_bus', 'waiting_metro'].includes(person.state)
    ) {
      const distPlayer = planarDistance(actor.position, player);
      if (distPlayer < 13 && sees(person, player, false)) {
        if (person.chatCooldown <= 0) {
          person.chatCooldown = 14;
          speak(person, chaseReactionLine(person.name, policeStars, person.personality), now, player);
        }
        if (person.personality === 'record' && distPlayer > 5) {
          actor.face(player, decisionDt);
          actor.action('phone');
          person.activityLabel = 'grabando la persecución policial';
          return;
        }
        person.state = 'fleeing';
        person.fearUntil = now + 7;
        person.activityLabel = 'apartándose de la persecución';
      }
    }

    // Persistent stalking detection on all mobile citizens
    if (person.role !== 'cashier' && person.state !== 'fleeing' && person.state !== 'down' && person.state !== 'riding') {
      const distPlayer = planarDistance(actor.position, player);
      if (distPlayer > 0.8 && distPlayer < 6.5 && sees(person, player, false)) {
        person.stalkScore = Math.min(28, person.stalkScore + decisionDt * 1.6);
        if (person.stalkScore >= 8.5 && person.stalkStage === 0) {
          person.stalkStage = 1;
          actor.face(player, decisionDt);
          speak(person, stalkWarningLine(person.name, 1), now, player);
          rememberCustom(mind, 'stalking', actor.position, now, 'me estuvo siguiendo por la acera', true, -10, 20);
        } else if (person.stalkScore >= 16 && person.stalkStage < 2) {
          person.stalkStage = 2;
          actor.face(player, decisionDt);
          speak(person, stalkWarningLine(person.name, 2), now, player);
          rememberCustom(mind, 'stalking', actor.position, now, 'me acosó persiguiéndome varias calles', true, -35, 38);
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
      actor.position.set(veh.position.x, Math.max(0.08, veh.position.y + 0.1), veh.position.z);
      person.rideTimer = Math.max(0, person.rideTimer - decisionDt);
      if (person.rideTimer === 0 && veh.stoppedAtId) {
        const exitPoint = veh.id === transit.bus.id
          ? (busStops.find((b) => b.id === veh.stoppedAtId)?.waitPoint ?? busStops[0].waitPoint)
          : (metroStations.find((m) => m.id === veh.stoppedAtId)?.platform ?? metroStations[0].platform);
        actor.setSuspended(false, exitPoint);
        person.state = 'routine';
        person.ridingVehicleId = undefined;
        person.activityLabel = 'bajando del transporte';
        advanceAutonomousLife(person, index, hour);
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
        if (event.kind !== 'collision' || event.source === 'player') {
          journal.publish('report', event.position, now, person.id, identified, event.id);
        }
        journal.post(person.name, event);
        person.recordingEvent = undefined;
        person.state = 'fleeing';
        person.timer = 8;
      }
    } else if (person.state === 'reporting') {
      actor.action(person.role === 'cashier' ? 'handsUp' : 'phone');
      if (person.timer === 0 && person.memory) {
        const { event, identified } = person.memory;
        if (event.kind !== 'collision' || event.source === 'player') {
          journal.publish('report', event.position, now, person.id, identified, event.id);
        }
        if (person.personality === 'record' && identified) journal.post(person.name, event);
        person.state = person.role === 'cashier' ? 'recovering' : 'fleeing';
        person.timer = 9;
      }
    } else if (person.state === 'fleeing') {
      person.activityLabel = 'huyendo del peligro';
      if (actor.arrived || actor.stuck > 2.5) {
        const hazard = person.memory?.event.position ?? player;
        const candidates = person.route.length ? [...person.route, ...safePlaces] : safePlaces;
        let best = candidates[0];
        let bestScore = -Infinity;
        for (const pt of candidates) {
          const score = planarDistance(pt, hazard) - planarDistance(pt, actor.position) * 0.35;
          if (score > bestScore) { bestScore = score; best = pt; }
        }
        actor.goTo(best, 3.8);
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
        if (person.missedBus && person.role !== 'cashier') {
          // Any commuter who missed their bus reroutes to the nearest Metro station!
          const st = nearestMetroPlatform(actor.position);
          person.route = [st.platform, ...person.initialRoute];
          person.stop = 0;
          person.activityLabel = `caminando a ${st.name} tras perder el bus`;
        }
      }
    } else if (armed && planarDistance(actor.position, player) < 10 && sees(person, player)) {
      person.state = 'nervous';
      actor.goTo(undefined);
      actor.face(player, decisionDt);
      actor.action('handsUp');
      person.timer = 2;
      rememberCustom(mind, 'threat', actor.position, now, 'sacó un arma delante de mí', true, -18, 30);
      if (person.chatCooldown <= 0) {
        person.chatCooldown = 10;
        speak(person, armedWarningLine(person.name), now, player);
      }
    } else if (person.state === 'nervous') {
      if (armed && planarDistance(actor.position, player) < 5) actor.action('handsUp');
      actor.face(player, decisionDt);
      if (person.timer === 0) person.state = 'routine';
    } else if (person.role === 'cashier') {
      const storeDef = allShops.find((s) => s.id === person.shopId) ?? allShops[0];
      if (planarDistance(actor.position, storeDef.cashier) > 0.45) {
        actor.goTo(storeDef.cashier, 1.3);
      } else {
        actor.goTo(undefined);
      }
      person.activityLabel = `atendiendo en ${storeDef.name}`;
      if (planarDistance(actor.position, player) < 5) actor.face(player, decisionDt);
    } else if (person.state === 'chatting') {
      actor.goTo(undefined);
      if (person.timer === 0) {
        person.state = 'routine';
        advanceAutonomousLife(person, index, hour);
      }
    } else if (person.state === 'waiting_bus') {
      person.activityLabel = 'esperando el autobús';
      if (planarDistance(actor.position, player) < 3.0) actor.face(player, decisionDt);
      if (transit && transit.bus.stoppedAtId === person.transitTargetId) {
        actor.setSuspended(true, transit.bus.position);
        person.state = 'riding';
        person.ridingVehicleId = transit.bus.id;
        person.rideTimer = 12;
        person.missedBus = false;
        person.activityLabel = 'viajando en autobús';
      } else if (person.timer === 0) {
        // Bus took too long -> take the metro or continue routine
        person.missedBus = true;
        const st = nearestMetroPlatform(actor.position);
        person.route = [st.platform, ...person.route];
        person.stop = 0;
        person.state = 'routine';
        person.activityLabel = `yendo a ${st.name} porque tardó el bus`;
      }
    } else if (person.state === 'waiting_metro') {
      person.activityLabel = 'esperando el metro';
      if (transit && transit.metro.stoppedAtId === person.transitTargetId) {
        actor.setSuspended(true, transit.metro.position);
        person.state = 'riding';
        person.ridingVehicleId = transit.metro.id;
        person.rideTimer = 8;
        person.missedBus = false;
        person.activityLabel = 'viajando en metro';
      } else if (person.timer === 0) {
        person.state = 'routine';
        advanceAutonomousLife(person, index);
      }
    } else if (person.state === 'browsing') {
      if (person.timer === 0) {
        const curPoint = person.route[person.stop];
        const nearStore = curPoint ? findStoreNear(curPoint) : undefined;
        if (nearStore && economy) {
          const item = nearStore.catalog[(index + person.cycleCount) % nearStore.catalog.length] ?? nearStore.catalog[0];
          const bought = economy.npcBuyFrom(nearStore.id, item.id, person.budget);
          if (bought) {
            person.budget -= bought.price;
            mind.drives.hunger = Math.max(0, mind.drives.hunger - 45);
            mind.drives.errands = Math.max(0, mind.drives.errands - 38);
            rememberCustom(mind, 'purchase', actor.position, now, `compré ${bought.name.toLowerCase()} en ${nearStore.name}`, false, 0, 12);
            person.carryItem = bought.id === 'coffee' || nearStore.id.includes('cafeteria') ? 'coffee' : 'bag';
            person.activityLabel = `saliendo de ${nearStore.name} con ${bought.name.toLowerCase()}`;
          } else if (person.budget < 12) {
            person.budget = 55; // Salary top-up after work cycle
          }
        }
        advanceAutonomousLife(person, index);
        person.state = 'routine';
      }
    } else {
      const target = person.route[person.stop];
      if (!target) {
        advanceAutonomousLife(person, index);
        return;
      }
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
          person.timer = 15;
          person.activityLabel = `esperando el metro en ${metroStop.name}`;
        } else {
          const storeHere = findStoreNear(target);
          person.state = 'browsing';
          person.timer = storeHere ? 3.0 : 1.4;
          person.activityLabel = storeHere ? `comprando en ${storeHere.name}` : 'paseando por el barrio';
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
    get version() { return populationVersion; },
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
        if (person.role === 'cashier' || person.actor.health <= 0 || person.actor.suspended) continue;
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
      populationVersion++;
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
      hour = 17,
      policeStars = 0,
      fastVehicles?: readonly { position: Point3; heading: number; speed: number }[],
    ) {
      stats.decisions = 0;
      if (now >= speechUntil) speechText = '';

      // Ambient NPC-to-NPC altercation / street event (after 20s so short deterministic tests are unaffected)
      if (now > 20) {
        ambientTimer -= dt;
        if (ambientTimer <= 0) {
          ambientTimer = 34 + rand() * 18;
          const candidates = [...extraCitizens, ...people.slice(4)].filter(
            (p) => p.actor.health > 0 && !p.actor.suspended && p.state !== 'riding' && p.state !== 'fleeing' && planarDistance(p.actor.position, player) > 6,
          );
          if (candidates.length >= 2) {
            const actorA = candidates[Math.floor(rand() * candidates.length)];
            const evt = journal.publish(rand() < 0.4 ? 'shot' : 'altercation', actorA.actor.position, now, actorA.id, false);
            speak(actorA, evt.kind === 'shot' ? '¡Cuidado, alguien disparó en la calle!' : '¡Oye, ten más cuidado por dónde caminas!', now, player);
          }
        }
      }

      // Throttled NPC-to-NPC spontaneous chatter when calm & close (every 0.45s after initial 3s)
      if (now > 3) {
        chatterAcc += dt;
        if (chatterAcc >= 0.45) {
          chatterAcc = 0;
          for (let i = 0; i < allPeople.length; i++) {
            const a = allPeople[i];
            if (a.actor.health <= 0 || a.actor.suspended || a.role === 'cashier' || a.chatCooldown > 0) continue;
            if (!['routine', 'waiting_bus', 'waiting_metro'].includes(a.state)) continue;
            for (let j = i + 1; j < allPeople.length; j++) {
              const b = allPeople[j];
              if (b.actor.health <= 0 || b.actor.suspended || b.role === 'cashier' || b.chatCooldown > 0) continue;
              if (!['routine', 'waiting_bus', 'waiting_metro'].includes(b.state)) continue;
              if (planarDistance(a.actor.position, b.actor.position) < 2.4) {
                a.chatCooldown = 26;
                b.chatCooldown = 26;
                a.actor.face(b.actor.position, 0.4);
                b.actor.face(a.actor.position, 0.4);
                if (a.state === 'routine') { a.state = 'chatting'; a.timer = 3.4; a.activityLabel = `conversando con ${b.name}`; }
                if (b.state === 'routine') { b.state = 'chatting'; b.timer = 3.4; b.activityLabel = `conversando con ${a.name}`; }
                const sharedGossip = exchangeGossip(a.id, a.name, a.mind, b.id, b.name, b.mind, now)
                  ?? exchangeGossip(b.id, b.name, b.mind, a.id, a.name, a.mind, now);
                const familiarity = a.mind.relationships[b.id] ?? 0;
                const line = npcPairLine(
                  a.name,
                  a.job,
                  a.state === 'waiting_bus' ? 'wait_bus' : a.state === 'waiting_metro' ? 'wait_metro' : 'walk',
                  journal.events.at(-1),
                  hour,
                  sharedGossip,
                  b.name,
                  familiarity,
                );
                speak(a, line, now, player);
                break;
              }
            }
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
        // Skip stationary idle cashiers when no new events or armed player are near so they don't consume mobile decision slots
        if (person.role === 'cashier' && person.state === 'routine' && !armed && journal.since(person.cursor).length === 0 && actor.arrived) {
          person.nextDecision = now + 0.35;
          person.lastDecision = now;
          continue;
        }
        if (stats.decisions >= populationLimits.decisionsPerStep) {
          stats.deferred++;
          continue;
        }
        stats.decisions++;
        const decisionDt = Math.max(dt, now - person.lastDecision);
        person.lastDecision = now;
        const tier = world?.tier(person.id) ?? 'near';
        const urgent = !['routine', 'browsing', 'waiting_bus', 'waiting_metro'].includes(person.state);
        person.nextDecision = now + (urgent ? 0.05 : tier === 'far' ? 0.6 : tier === 'middle' ? 0.25 : 0.1);
        stepSinglePerson(person, index, decisionDt, now, player, armed, economy, transit, hour, policeStars, fastVehicles);
      }
    },
    recordPlayerChat(person: Civilian, topic: string, now: number) {
      person.mind.drives.social = Math.min(100, person.mind.drives.social + 22);
      if (person.mind.playerTrust > -20 && person.mind.playerWitnessedCrimes === 0) {
        person.mind.playerChats++;
        rememberCustom(
          person.mind,
          'chat',
          person.actor.position,
          now,
          `conversé tranquilamente con el recién llegado (${topic})`,
          true,
          6,
          10,
        );
      }
    },
    reset() {
      decisionCursor = 0;
      ambientTimer = 34;
      chatterAcc = 0;
      speechText = '';
      speechUntil = 0;
      stats.decisions = stats.deferred = 0;
      populationVersion++;
      // Remove dynamically ejected drivers on reset
      while (allPeople.length > people.length + extraMerchants.length + extraCitizens.length) {
        const extra = allPeople.pop()!;
        extra.actor.dispose();
      }
      for (const person of allPeople) {
        person.actor.reset();
        person.state = 'routine';
        person.route = [...person.initialRoute];
        person.carryItem = person.initialCarryItem;
        person.timer = person.cursor = person.stop = person.cycleCount = person.fearUntil = person.nextDecision = person.lastDecision = person.stalkScore = person.rideTimer = person.chatCooldown = person.lastSpeechUntil = 0;
        person.stalkStage = 0;
        person.missedBus = false;
        person.ridingVehicleId = undefined;
        person.transitTargetId = undefined;
        person.recordingEvent = undefined;
        person.memory = undefined;
        person.mind = createNpcMind(person.id, person.personality);
        person.budget = 65;
        person.lastSpeech = '';
        person.activityLabel = person.role === 'cashier' ? 'atendiendo el mostrador' : 'recorriendo Costa Palmera';
        person.actor.carry(person.carryItem);
      }
    },
    dispose() {
      for (const person of allPeople) person.actor.dispose();
    },
  };
  return api;
}
