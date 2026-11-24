import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Quaternion,
  Scene,
  Vector3,
} from 'three';
import type { Physics, Point3 } from '../physics/physics';
import { createActor, type Actor } from './actor';
import { eyes, Journal, planarDistance, type EventKind } from './model';
import type { Navigation } from './navigation';
import { joinRoads, lanePose, turnPose, type RoadLane, type RoadNetwork, type RoadNode, type RoadTurn } from './road-network';

export type WantedStars = 0 | 1 | 2 | 3 | 4 | 5;

export interface PolicePatrolCar {
  id: string;
  mesh: Group;
  batch: InstancedMesh;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  position: Vector3;
  previous: Vector3;
  heading: number;
  previousHeading: number;
  lane: RoadLane;
  initialLane: RoadLane;
  route: RoadLane[];
  turn?: RoadTurn & { next: RoadLane; distance: number };
  distance: number;
  speed: number;
  occupied: boolean;
  parked: boolean;
}

export interface PoliceUnit {
  id: string;
  actor: Actor;
  role: 'foot' | 'patrol' | 'swat';
  minStars: WantedStars;
  stop: number;
  arrestTime: number;
  fireCooldown: number;
  inCar: boolean;
  carIndex: number;
  downCounted: boolean;
}

interface WantedTier {
  label: string;
  minHeat: number;
  searchDuration: number;
  carSpeed: number;
  footSpeed: number;
  fireCooldown: number;
  damage: number;
  barricades: number;
  useHelicopter: boolean;
}

export const WANTED_TIERS: readonly WantedTier[] = [
  { label: 'BARRIO TRANQUILO', minHeat: 0, searchDuration: 0, carSpeed: 4.8, footSpeed: 1.5, fireCooldown: 1.5, damage: 6, barricades: 0, useHelicopter: false },
  { label: 'AVISO POLICIAL', minHeat: 15, searchDuration: 18, carSpeed: 7.8, footSpeed: 3.5, fireCooldown: 1.35, damage: 8, barricades: 0, useHelicopter: false },
  { label: 'PERSECUCIÓN ACTIVA', minHeat: 45, searchDuration: 26, carSpeed: 8.8, footSpeed: 4.2, fireCooldown: 1.15, damage: 9, barricades: 0, useHelicopter: false },
  { label: 'ALERTA DE DISTRITO', minHeat: 90, searchDuration: 34, carSpeed: 10.4, footSpeed: 4.6, fireCooldown: 0.95, damage: 10, barricades: 2, useHelicopter: false },
  { label: 'OPERATIVO SWAT', minHeat: 145, searchDuration: 44, carSpeed: 11.4, footSpeed: 4.9, fireCooldown: 0.85, damage: 11, barricades: 4, useHelicopter: true },
  { label: 'ESTADO DE SITIO', minHeat: 210, searchDuration: 54, carSpeed: 12.4, footSpeed: 5.1, fireCooldown: 0.72, damage: 12, barricades: 5, useHelicopter: true },
];

export function starsForHeat(heat: number): WantedStars {
  for (let s = 5; s >= 1; s--) {
    if (heat >= WANTED_TIERS[s].minHeat) return s as WantedStars;
  }
  return 0;
}

const CRIME_HEAT: Record<EventKind, number> = {
  altercation: 18,
  glass: 18,
  collision: 20,
  threat: 24,
  report: 24,
  theft: 34,
  shot: 44,
  robbery: 50,
};

export function createPolice(
  scene: Scene,
  physics: Physics,
  navigation: Navigation,
  journal: Journal,
  playerHandle: number,
  detained: () => void,
  network?: RoadNetwork,
  onPlayerShot?: (damage: number) => void,
) {
  const patrol = [{ x: 34.3, y: 0.08, z: 41 }, { x: 34.3, y: 0.08, z: 51 }];
  const units: PoliceUnit[] = patrol.map((point, index) => ({
    id: `person:police:${index}`,
    actor: createActor(scene, physics, navigation, point, 0x304f7c),
    role: 'foot',
    minStars: 1,
    stop: 0,
    arrestTime: 0,
    fireCooldown: 0,
    inCar: false,
    carIndex: -1,
    downCounted: false,
  }));

  const patrolGeo = new BoxGeometry();
  const bodyMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.28, envMapIntensity: 1.3 });
  const barricadeMat = new MeshStandardMaterial({ color: 0xe67e22, roughness: 0.65 });
  const searchConeMat = new MeshBasicMaterial({ color: 0xeef6ff, transparent: true, opacity: 0.16, depthWrite: false });
  const partTransform = new Object3D();
  const partColor = new Color();

  const patrolCars: PolicePatrolCar[] = [];
  if (network) {
    const startSeeds = [[-22, -28, -22, 7], [28, -28, 28, 7]];
    const parts = [
      { c: 0x1e2c3d, x: 0, y: 0, z: 0, w: 1.72, h: 0.58, d: 3.65 },
      { c: 0xedf2f7, x: 0, y: 0.52, z: 0, w: 1.46, h: 0.52, d: 1.8 },
      { c: 0x3b82f6, x: -0.35, y: 0.84, z: -0.1, w: 0.45, h: 0.14, d: 0.24 }, // idx 2: blue lightbar
      { c: 0xef4444, x: 0.35, y: 0.84, z: -0.1, w: 0.45, h: 0.14, d: 0.24 },  // idx 3: red lightbar
    ];
    for (const [idx, [fx, fz, tx, tz]] of startSeeds.entries()) {
      const lane = network.lanes.find((l) => l.from.x === fx && l.from.z === fz && l.to.x === tx && l.to.z === tz) ?? network.lanes[0];
      const pose = lanePose(lane, 6);
      const mesh = new Group();
      scene.add(mesh);
      const batch = new InstancedMesh(patrolGeo, bodyMat, parts.length);
      batch.castShadow = batch.receiveShadow = true;
      parts.forEach((p, i) => {
        partTransform.position.set(p.x, p.y, p.z);
        partTransform.scale.set(p.w, p.h, p.d);
        partTransform.updateMatrix();
        batch.setMatrixAt(i, partTransform.matrix);
        batch.setColorAt(i, partColor.setHex(p.c));
      });
      batch.instanceMatrix.needsUpdate = true;
      batch.instanceColor!.needsUpdate = true;
      batch.computeBoundingSphere();
      mesh.add(batch);

      const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pose.x, pose.y, pose.z));
      const collider = physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.88, 0.65, 1.85).setTranslation(0, 0.25, 0), body);
      const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -pose.heading);
      body.setRotation(q, true);
      const pos = new Vector3(pose.x, pose.y, pose.z);
      patrolCars.push({
        id: `vehicle:police:${idx}`,
        mesh, batch, body, collider,
        position: pos, previous: pos.clone(),
        heading: pose.heading, previousHeading: pose.heading,
        lane, initialLane: lane,
        route: [], distance: 6, speed: 0,
        occupied: true, parked: false,
      });

      const officer = createActor(scene, physics, navigation, { x: pose.x, y: 0.08, z: pose.z }, 0x264166);
      officer.setSuspended(true, pose);
      units.push({
        id: `person:police:${2 + idx}`,
        actor: officer,
        role: 'patrol',
        minStars: 2,
        stop: 0,
        arrestTime: 0,
        fireCooldown: 0,
        inCar: true,
        carIndex: idx,
        downCounted: false,
      });
    }
  }

  // Reserve tactical/SWAT response units (suspended at 0-2 stars, deployed dynamically at 3-5 stars!)
  const swatSpawns: Array<{ point: Point3; minStars: WantedStars }> = [
    { point: { x: 8, y: 0.08, z: 51 }, minStars: 3 },
    { point: { x: -16, y: 0.08, z: 12 }, minStars: 3 },
    { point: { x: 24, y: 0.08, z: 12 }, minStars: 4 },
    { point: { x: -16, y: 0.08, z: 41 }, minStars: 5 },
  ];
  for (const [idx, spec] of swatSpawns.entries()) {
    const validSpawn = navigation.closest(spec.point, 4) ?? spec.point;
    const swatActor = createActor(scene, physics, navigation, validSpawn, 0x171d29);
    swatActor.setSuspended(true, validSpawn);
    units.push({
      id: `person:swat:${idx}`,
      actor: swatActor,
      role: 'swat',
      minStars: spec.minStars,
      stop: 0,
      arrestTime: 0,
      fireCooldown: 0,
      inCar: true, // treated as off-field until deployed by star level
      carIndex: -1,
      downCounted: false,
    });
  }

  // 4-5 Star Police Helicopter (1 InstancedMesh fuselage + animated rotor + searchlight; hidden when stars < 4)
  const heliGroup = new Group();
  heliGroup.name = 'PoliceHelicopter';
  heliGroup.visible = false;
  scene.add(heliGroup);

  const heliParts = [
    { c: 0x1a2638, x: 0, y: 0, z: 0, w: 1.9, h: 1.35, d: 4.1 },      // cabin
    { c: 0x6ba6c4, x: 0, y: 0.15, z: -1.7, w: 1.65, h: 0.85, d: 1.1 }, // nose glass
    { c: 0xedf2f7, x: 0, y: -0.25, z: 0.1, w: 1.94, h: 0.28, d: 3.4 }, // white stripe
    { c: 0x1a2638, x: 0, y: 0.2, z: 3.4, w: 0.45, h: 0.48, d: 3.4 },  // tail boom
    { c: 0xef4444, x: 0, y: 0.72, z: 4.8, w: 0.18, h: 0.95, d: 0.65 }, // tail fin
    { c: 0x202530, x: -0.95, y: -0.9, z: -0.1, w: 0.14, h: 0.12, d: 3.2 }, // left skid
    { c: 0x202530, x: 0.95, y: -0.9, z: -0.1, w: 0.14, h: 0.12, d: 3.2 },  // right skid
  ];
  const heliBatch = new InstancedMesh(patrolGeo, bodyMat, heliParts.length);
  heliParts.forEach((p, i) => {
    partTransform.position.set(p.x, p.y, p.z);
    partTransform.scale.set(p.w, p.h, p.d);
    partTransform.updateMatrix();
    heliBatch.setMatrixAt(i, partTransform.matrix);
    heliBatch.setColorAt(i, partColor.setHex(p.c));
  });
  heliBatch.instanceMatrix.needsUpdate = true;
  heliBatch.instanceColor!.needsUpdate = true;
  heliBatch.computeBoundingSphere();
  heliGroup.add(heliBatch);

  const mainRotor = new Mesh(patrolGeo, bodyMat);
  mainRotor.position.set(0, 0.98, 0);
  mainRotor.scale.set(7.4, 0.08, 0.26);
  heliGroup.add(mainRotor);

  const searchlight = new PointLight(0xdceeff, 0, 28, 1.4);
  scene.add(searchlight);
  const searchPool = new Mesh(patrolGeo, searchConeMat);
  searchPool.scale.set(5.4, 0.06, 5.4);
  searchPool.visible = false;
  scene.add(searchPool);

  const heliPos = new Vector3(0, 24, 0);
  let heliAngle = 0;

  const upAxis = new Vector3(0, 1, 0);
  const tempQuat = new Quaternion();

  // Dynamic tactical barricades deployed around reported area during 3-5 stars
  const barricades: Array<{ mesh: Mesh; collider: RAPIER.Collider; x: number; z: number }> = [];

  let state: 'patrol' | 'respond' | 'pursue' | 'search' = 'patrol';
  let stars: WantedStars = 0;
  let heat = 0;
  let maxSearchTime = 22;
  let cursor = 0;
  let lastKnown: Point3 | undefined;
  let identified = false;
  let suspectVehicleId: string | undefined;
  let suspectHostile = false;
  let searchTime = 0;
  let lostTime = 0;
  let sirenClock = 0;
  let lastSirenPhase = -1;
  let onStarsChanged: ((stars: WantedStars, label: string) => void) | undefined;
  const incidents = new Set<number>();

  function setStars(nextStars: WantedStars) {
    if (nextStars === stars) return;
    stars = nextStars;
    onStarsChanged?.(stars, WANTED_TIERS[stars].label);
  }

  function addHeat(amount: number, minStarFloor: WantedStars = 0) {
    const floorHeat = WANTED_TIERS[minStarFloor].minHeat;
    heat = Math.min(260, Math.max(heat + amount, floorHeat));
    setStars(starsForHeat(heat));
  }

  function clearBarricades() {
    while (barricades.length) {
      const b = barricades.pop()!;
      b.mesh.removeFromParent();
      physics.world.removeCollider(b.collider, true);
    }
  }

  function deployBarricades(center: Point3, desiredCount: number) {
    if (!network || desiredCount <= barricades.length) return;
    const nearestNodes = [...network.nodes.values()]
      .sort((a, b) => Math.hypot(a.x - center.x, a.z - center.z) - Math.hypot(b.x - center.x, b.z - center.z))
      .slice(1, 1 + desiredCount);
    for (const node of nearestNodes) {
      if (barricades.length >= desiredCount) break;
      const bx = node.x + 1.8;
      const bz = node.z;
      if (barricades.some((b) => Math.hypot(b.x - bx, b.z - bz) < 4)) continue;
      const mesh = new Mesh(patrolGeo, barricadeMat);
      mesh.position.set(bx, 0.45, bz);
      mesh.scale.set(2.4, 0.9, 0.45);
      mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh);
      const collider = physics.addBox({ x: bx, y: 0.45, z: bz, halfX: 1.2, halfY: 0.45, halfZ: 0.225 });
      barricades.push({ mesh, collider, x: bx, z: bz });
    }
  }

  function deploySwatIfNeeded(center: Point3) {
    for (const unit of units) {
      if (unit.role !== 'swat') continue;
      if (stars >= unit.minStars && unit.inCar && unit.actor.health > 0) {
        // Deploy SWAT at a walkable street point ~22m from last known position
        const angle = (units.indexOf(unit) * 1.7) % (Math.PI * 2);
        const target = {
          x: Math.max(-62, Math.min(56, center.x + Math.cos(angle) * 22)),
          y: 0.08,
          z: Math.max(-86, Math.min(86, center.z + Math.sin(angle) * 22)),
        };
        const spawnPoint = navigation.closest(target, 6) ?? navigation.closest(center, 12) ?? target;
        unit.inCar = false;
        unit.actor.setSuspended(false, spawnPoint);
      } else if (stars === 0 && !unit.inCar) {
        unit.inCar = true;
        unit.actor.setSuspended(true);
      }
    }
  }

  function sees(index: number, point: Point3, currentVehicleId?: string) {
    const unit = units[index];
    const actor = unit.actor;
    if (unit.inCar || actor.health <= 0) return false;
    const dist = planarDistance(actor.position, point);
    const vehicleSwapped = Boolean(suspectVehicleId && currentVehicleId !== suspectVehicleId);
    const baseSight = stars >= 4 ? 24 : stars >= 2 ? 21 : 19;
    const maxSight = vehicleSwapped ? 11 : baseSight;
    if (dist > maxSight) return false;
    const dx = point.x - actor.position.x;
    const dz = point.z - actor.position.z;
    if (Math.hypot(dx, dz) > 3 && (dx * Math.sin(actor.heading) - dz * Math.cos(actor.heading)) / Math.hypot(dx, dz) < 0) return false;
    return physics.canSee(eyes(actor.position), eyes(point), [actor.collider.handle, playerHandle]);
  }

  function receive(point: Point3, known: boolean, incident: number, hostile: boolean, kind: EventKind = 'report') {
    if (incidents.has(incident)) return;
    incidents.add(incident);
    if (incidents.size > 96) incidents.delete(incidents.values().next().value!);
    lastKnown = { ...point };
    identified ||= known;
    suspectHostile ||= hostile;

    const minStar: WantedStars = kind === 'robbery' ? 2 : 1;
    addHeat(CRIME_HEAT[kind] ?? 24, minStar);

    const tier = WANTED_TIERS[stars];
    const footUnits = units.filter((u) => !u.inCar);
    const approach = footUnits.length
      ? Math.min(...footUnits.map((unit) => planarDistance(unit.actor.position, point)))
      : 10;
    const baseDuration = Math.max(22, tier.searchDuration);
    searchTime = Math.min(70, baseDuration + Math.max(0, approach - 35) / 2.8);
    maxSearchTime = Math.max(maxSearchTime, searchTime);
    if (state !== 'pursue') state = 'respond';
    if (hostile || tier.barricades > 0) {
      deployBarricades(point, Math.max(hostile ? 2 : 0, tier.barricades));
    }
    deploySwatIfNeeded(point);
  }

  function nearestNode(point: Point3): RoadNode | undefined {
    if (!network) return undefined;
    let best: RoadNode | undefined;
    let bestD = Infinity;
    for (const node of network.nodes.values()) {
      const d = Math.hypot(node.x - point.x, node.z - point.z);
      if (d < bestD) { bestD = d; best = node; }
    }
    return best;
  }

  function stepPatrolCars(dt: number) {
    if (!network) return;
    const tier = WANTED_TIERS[stars];

    for (const [idx, car] of patrolCars.entries()) {
      car.previous.copy(car.position);
      car.previousHeading = car.heading;
      const unit = units.find((u) => u.carIndex === idx);
      if (!unit) continue;

      if (state === 'patrol') {
        if (!unit.inCar) {
          unit.actor.goTo(car.position, 2.2);
          if (planarDistance(unit.actor.position, car.position) < 2.2) {
            unit.inCar = true;
            unit.actor.setSuspended(true, car.position);
            car.occupied = true;
            car.parked = false;
          }
        }
      } else if (lastKnown && unit.inCar) {
        if (planarDistance(car.position, lastKnown) < 16) {
          car.parked = true;
          car.speed = 0;
          car.occupied = false;
          unit.inCar = false;
          const exitPoint = navigation.closest({ x: car.position.x + 1.6, y: 0.08, z: car.position.z }, 2.4)
            ?? { x: car.position.x + 1.6, y: 0.08, z: car.position.z };
          unit.actor.setSuspended(false, exitPoint);
        }
      }

      if (car.parked || !car.occupied) {
        car.speed = 0;
        car.body.setNextKinematicTranslation(car.position);
        car.body.setNextKinematicRotation(tempQuat.setFromAxisAngle(upAxis, -car.heading));
        continue;
      }

      if (!car.route.length && !car.turn) {
        const destNode = (state !== 'patrol' && lastKnown) ? nearestNode(lastKnown) : [...network.nodes.values()][(idx * 7 + 3) % network.nodes.size];
        if (destNode && destNode !== car.lane.to) {
          car.route = network.route(car.lane.to, destNode, car.lane.from);
        }
        if (!car.route.length) {
          const fallback = network.lanes.find((l) => l.from === car.lane.to && l.to !== car.lane.from);
          if (fallback) car.route = [fallback];
        }
      }

      const maxSpeed = state === 'patrol' ? 4.8 : tier.carSpeed;
      const left = car.lane.length - car.distance;
      const turnCap = stars >= 2 ? 3.8 : 3.5;
      const target = Math.min(car.turn ? turnCap : maxSpeed, Math.sqrt(2 * 6 * Math.max(0.5, left)));
      car.speed += (target - car.speed) * Math.min(1, (stars >= 2 ? 5.5 : 5) * dt);
      const travel = Math.min(car.speed * dt, car.turn ? car.turn.length - car.turn.distance : left);
      if (car.turn) {
        car.turn.distance += travel;
        if (car.turn.distance >= car.turn.length - 0.001) {
          car.lane = car.turn.next; car.distance = 0; car.turn = undefined;
        }
      } else {
        car.distance = Math.min(car.lane.length, car.distance + travel);
        if (car.distance >= car.lane.length - 0.001 && car.route.length) {
          const next = car.route.shift()!;
          car.turn = { ...joinRoads(car.lane, next), next, distance: 0 };
        }
      }
      const resolved = car.turn ? turnPose(car.turn, car.turn.distance) : lanePose(car.lane, car.distance);
      car.heading += Math.atan2(Math.sin(resolved.heading - car.heading), Math.cos(resolved.heading - car.heading)) * (1 - Math.exp(-12 * dt));
      car.body.setNextKinematicTranslation(resolved);
      car.body.setNextKinematicRotation(tempQuat.setFromAxisAngle(upAxis, -car.heading));
      car.position.set(resolved.x, resolved.y, resolved.z);
    }
  }

  function stepHelicopter(dt: number) {
    const active = state !== 'patrol' && WANTED_TIERS[stars].useHelicopter && Boolean(lastKnown);
    heliGroup.visible = active;
    searchPool.visible = active;
    if (!active || !lastKnown) {
      searchlight.intensity = 0;
      return;
    }
    heliAngle += dt * (stars === 5 ? 0.85 : 0.62);
    const orbitR = stars === 5 ? 16 : 20;
    const targetX = lastKnown.x + Math.cos(heliAngle) * orbitR;
    const targetZ = lastKnown.z + Math.sin(heliAngle) * orbitR;
    heliPos.x += (targetX - heliPos.x) * Math.min(1, dt * 2.2);
    heliPos.z += (targetZ - heliPos.z) * Math.min(1, dt * 2.2);
    heliPos.y = 23 + Math.sin(heliAngle * 1.7) * 1.2;
    heliGroup.position.copy(heliPos);
    heliGroup.rotation.y = Math.atan2(lastKnown.x - heliPos.x, lastKnown.z - heliPos.z) + Math.PI;
    heliGroup.rotation.x = 0.12;
    mainRotor.rotation.y += dt * 26;

    // Sweeping searchlight pool on the street around lastKnown
    const sweepX = lastKnown.x + Math.sin(heliAngle * 2.3) * 4.5;
    const sweepZ = lastKnown.z + Math.cos(heliAngle * 1.9) * 4.5;
    searchPool.position.set(sweepX, 0.09, sweepZ);
    searchlight.position.set(sweepX, 4.2, sweepZ);
    searchlight.color.setHex(stars === 5 && Math.floor(sirenClock * 5) % 2 === 0 ? 0xff9292 : 0xdceeff);
    searchlight.intensity = stars === 5 ? 28 : 20;
  }

  function updatePatrolSirens(dt: number) {
    sirenClock += dt;
    const active = state !== 'patrol' && stars >= 2;
    const phase = active ? (Math.floor(sirenClock * 8) % 2) : -1;
    if (phase === lastSirenPhase) return;
    lastSirenPhase = phase;
    for (const car of patrolCars) {
      car.batch.setColorAt(2, partColor.setHex(phase === 0 ? 0x60b8ff : 0x1c3d75));
      car.batch.setColorAt(3, partColor.setHex(phase === 1 ? 0xff4048 : 0x7a1f24));
      if (car.batch.instanceColor) car.batch.instanceColor.needsUpdate = true;
    }
  }

  return {
    units,
    patrolCars,
    get state() { return state; },
    get stars() { return stars; },
    get heat() { return heat; },
    get starLabel() { return WANTED_TIERS[stars].label; },
    get evading() { return stars > 0 && state !== 'pursue'; },
    get cooldownProgress() {
      return stars > 0 && maxSearchTime > 0 ? Math.max(0, Math.min(1, 1 - searchTime / maxSearchTime)) : 0;
    },
    get helicopterPosition(): Point3 | undefined {
      return heliGroup.visible ? { x: heliPos.x, y: heliPos.y, z: heliPos.z } : undefined;
    },
    get lastKnown() { return lastKnown; },
    get identified() { return identified; },
    setOnStarsChanged(handler: (stars: WantedStars, label: string) => void) {
      onStarsChanged = handler;
    },
    /** Allows Session to directly escalate wanted level on severe player actions (e.g., injuring NPCs/officers). */
    reportEscalation(point: Point3, extraHeat: number, hostile = true, minStars: WantedStars = 1) {
      lastKnown = { ...point };
      identified = true;
      suspectHostile ||= hostile;
      addHeat(extraHeat, minStars);
      const tier = WANTED_TIERS[stars];
      searchTime = Math.max(searchTime, tier.searchDuration);
      maxSearchTime = Math.max(maxSearchTime, searchTime);
      if (state !== 'pursue') state = 'respond';
      if (tier.barricades > 0) deployBarricades(point, tier.barricades);
      deploySwatIfNeeded(point);
    },
    step(dt: number, now: number, player: Point3, armed: boolean, playerVehicleId?: string) {
      // Escalate immediately if any police officer is neutralized
      for (const unit of units) {
        if (unit.actor.health <= 0 && !unit.downCounted) {
          unit.downCounted = true;
          lastKnown = { ...player };
          identified = true;
          suspectHostile = true;
          addHeat(72, stars < 3 ? 3 : (Math.min(5, stars + 1) as WantedStars));
          const tier = WANTED_TIERS[stars];
          searchTime = Math.max(searchTime, tier.searchDuration);
          maxSearchTime = Math.max(maxSearchTime, searchTime);
          state = 'pursue';
          deployBarricades(player, tier.barricades);
          deploySwatIfNeeded(player);
        }
      }

      for (const event of journal.since(cursor)) {
        cursor = event.id;
        const hostile = event.kind === 'shot' || event.kind === 'robbery';
        if (event.kind === 'report') {
          receive(event.position, event.identified, event.incident ?? event.id, false, 'report');
        } else if (event.source === 'player' && now - event.time < 1 && units.some((_, index) => sees(index, event.position, playerVehicleId))) {
          suspectVehicleId = playerVehicleId;
          receive(event.position, true, event.id, hostile, event.kind);
        } else if (event.source === 'player' && stars >= 2 && (event.kind === 'shot' || event.kind === 'robbery') && now - event.time < 1) {
          // Ongoing gunplay/robberies during an active chase escalate heat faster!
          receive(event.position, true, event.id, true, event.kind);
        }
      }

      const observed = state !== 'patrol' && units.some((_, index) => sees(index, player, playerVehicleId));
      const heliSpotted = heliGroup.visible && planarDistance(heliPos, player) < 28
        && physics.canSee({ x: heliPos.x, y: heliPos.y - 1, z: heliPos.z }, eyes(player), [playerHandle]);

      if ((observed || heliSpotted) && (identified || armed)) {
        identified = true;
        suspectVehicleId = playerVehicleId;
        if (armed) suspectHostile = true;
        if (stars === 0) addHeat(24, 1);
        state = 'pursue';
        lastKnown = { ...player };
        lostTime = 0;
        const tier = WANTED_TIERS[stars];
        searchTime = Math.max(22, tier.searchDuration);
        maxSearchTime = searchTime;
      } else if (state === 'pursue') {
        lostTime += dt;
        if (lostTime > 1.1) state = 'search';
      }

      if (state === 'search' || state === 'respond') {
        const vehicleSwapped = Boolean(suspectVehicleId && playerVehicleId !== suspectVehicleId);
        const decayRate = state === 'search' && vehicleSwapped ? 1.35 : 1.0;
        searchTime = Math.max(0, searchTime - dt * decayRate);
        if (searchTime === 0) {
          state = 'patrol';
          heat = 0;
          setStars(0);
          identified = false;
          suspectHostile = false;
          suspectVehicleId = undefined;
          lastKnown = undefined;
          clearBarricades();
          deploySwatIfNeeded(player);
        }
      }

      stepPatrolCars(dt);
      stepHelicopter(dt);
      updatePatrolSirens(dt);

      const tier = WANTED_TIERS[stars];

      for (const [index, unit] of units.entries()) {
        const { actor } = unit;
        actor.action('relaxed');
        unit.fireCooldown = Math.max(0, unit.fireCooldown - dt);
        if (actor.health <= 0 || unit.inCar) {
          if (unit.inCar && unit.carIndex >= 0) {
            actor.position.copy(patrolCars[unit.carIndex].position);
          }
          continue;
        }
        if (state === 'patrol') {
          unit.arrestTime = 0;
          if (unit.carIndex >= 0 || unit.role === 'swat') continue;
          const goal = patrol[(unit.stop + index) % patrol.length];
          actor.goTo(goal, 1.45);
          if (actor.arrived || actor.stuck > 3) unit.stop++;
        } else if (lastKnown) {
          const goal = { ...lastKnown };
          const ringOffset = 0.85 + (index % 3) * 0.4;
          const angle = index * 1.4;
          const offset = { ...goal, x: goal.x + Math.cos(angle) * ringOffset, z: goal.z + Math.sin(angle) * ringOffset };
          const moveSpeed = state === 'pursue' ? tier.footSpeed : Math.max(2.8, tier.footSpeed * 0.72);
          actor.goTo(navigation.walkable(offset) ? offset : goal, moveSpeed);
          if (state === 'respond' && actor.arrived) state = 'search';
          if (observed && sees(index, player, playerVehicleId)) {
            actor.face(player, dt);
            actor.action('aim');
            if (planarDistance(actor.position, player) < 1.7) {
              unit.arrestTime += dt;
            } else {
              unit.arrestTime = 0;
              const lethalAllowed = (suspectHostile && (armed || stars >= 3)) || unit.role === 'swat';
              if (lethalAllowed && unit.fireCooldown === 0 && onPlayerShot && planarDistance(actor.position, player) < (stars >= 4 ? 22 : 18)) {
                unit.fireCooldown = tier.fireCooldown;
                onPlayerShot(tier.damage);
              }
            }
          } else {
            unit.arrestTime = 0;
          }
          if (unit.arrestTime >= 1.4) { detained(); break; }
        }
      }
    },
    render(alpha: number) {
      for (const car of patrolCars) {
        car.mesh.position.lerpVectors(car.previous, car.position, alpha);
        car.mesh.rotation.y = -(car.previousHeading + Math.atan2(Math.sin(car.heading - car.previousHeading), Math.cos(car.heading - car.previousHeading)) * alpha);
      }
    },
    reset() {
      state = 'patrol';
      heat = 0;
      setStars(0);
      cursor = 0;
      identified = false;
      suspectHostile = false;
      suspectVehicleId = undefined;
      lastKnown = undefined;
      searchTime = lostTime = 0;
      maxSearchTime = 22;
      lastSirenPhase = -1;
      incidents.clear();
      clearBarricades();
      heliGroup.visible = false;
      searchPool.visible = false;
      searchlight.intensity = 0;
      for (const [idx, car] of patrolCars.entries()) {
        car.lane = car.initialLane;
        car.route = [];
        car.turn = undefined;
        car.distance = 6;
        car.speed = 0;
        car.occupied = true;
        car.parked = false;
        const pose = lanePose(car.lane, car.distance);
        car.body.setTranslation(pose, true);
        car.body.setNextKinematicTranslation(pose);
        tempQuat.setFromAxisAngle(upAxis, -pose.heading);
        car.body.setRotation(tempQuat, true);
        car.body.setNextKinematicRotation(tempQuat);
        car.position.set(pose.x, pose.y, pose.z);
        car.previous.copy(car.position);
        car.heading = car.previousHeading = pose.heading;
        const unit = units.find((u) => u.carIndex === idx);
        if (unit) {
          unit.inCar = true;
          unit.downCounted = false;
          unit.actor.reset();
          unit.actor.setSuspended(true, pose);
        }
      }
      for (const unit of units) {
        unit.downCounted = false;
        if (unit.role === 'swat') {
          unit.inCar = true;
          unit.actor.reset();
          unit.actor.setSuspended(true);
        } else if (unit.carIndex < 0) {
          unit.actor.reset();
        }
        unit.stop = unit.arrestTime = unit.fireCooldown = 0;
      }
    },
    dispose() {
      clearBarricades();
      for (const car of patrolCars) {
        car.batch.dispose();
        car.mesh.removeFromParent();
        physics.world.removeRigidBody(car.body);
      }
      heliBatch.dispose();
      heliGroup.removeFromParent();
      searchPool.removeFromParent();
      searchlight.removeFromParent();
      for (const unit of units) unit.actor.dispose();
      patrolGeo.dispose();
      bodyMat.dispose();
      barricadeMat.dispose();
      searchConeMat.dispose();
    },
  };
}
