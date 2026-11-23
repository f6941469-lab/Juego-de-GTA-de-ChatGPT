import RAPIER from '@dimforge/rapier3d-compat';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, Scene, Vector3 } from 'three';
import type { Physics, Point3 } from '../physics/physics';
import { createActor } from './actor';
import { eyes, Journal, planarDistance } from './model';
import type { Navigation } from './navigation';
import { joinRoads, lanePose, turnPose, type RoadLane, type RoadNetwork, type RoadNode, type RoadTurn } from './road-network';

export interface PolicePatrolCar {
  id: string;
  mesh: Group;
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
  const units = patrol.map((point, index) => ({
    id: `person:police:${index}`,
    actor: createActor(scene, physics, navigation, point, 0x304f7c),
    stop: 0,
    arrestTime: 0,
    fireCooldown: 0,
    inCar: false,
    carIndex: -1,
  }));

  // Optional drivable/autonomous Patrol Cars when RoadNetwork is provided
  const patrolGeo = new BoxGeometry();
  const bodyMat = new MeshStandardMaterial({ color: 0x1e2c3d, roughness: 0.55 });
  const roofMat = new MeshStandardMaterial({ color: 0xedf2f7, roughness: 0.5 });
  const sirenMat = new MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x2563eb, emissiveIntensity: 1.2 });
  const sirenRedMat = new MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.2 });
  const barricadeMat = new MeshStandardMaterial({ color: 0xe67e22, roughness: 0.7 });

  const patrolCars: PolicePatrolCar[] = [];
  if (network) {
    const startSeeds = [[-22, -28, -22, 7], [28, -28, 28, 7]];
    for (const [idx, [fx, fz, tx, tz]] of startSeeds.entries()) {
      const lane = network.lanes.find((l) => l.from.x === fx && l.from.z === fz && l.to.x === tx && l.to.z === tz) ?? network.lanes[0];
      const pose = lanePose(lane, 6);
      const mesh = new Group();
      scene.add(mesh);
      const addPart = (mat: MeshStandardMaterial, x: number, y: number, z: number, w: number, h: number, d: number) => {
        const m = new Mesh(patrolGeo, mat);
        m.position.set(x, y, z);
        m.scale.set(w, h, d);
        m.castShadow = m.receiveShadow = true;
        mesh.add(m);
        return m;
      };
      addPart(bodyMat, 0, 0, 0, 1.72, 0.58, 3.65);
      addPart(roofMat, 0, 0.52, 0, 1.46, 0.52, 1.8);
      addPart(sirenMat, -0.35, 0.84, -0.1, 0.45, 0.14, 0.24);
      addPart(sirenRedMat, 0.35, 0.84, -0.1, 0.45, 0.14, 0.24);

      const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pose.x, pose.y, pose.z));
      const collider = physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.88, 0.65, 1.85).setTranslation(0, 0.25, 0), body);
      const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -pose.heading);
      body.setRotation(q, true);
      const pos = new Vector3(pose.x, pose.y, pose.z);
      patrolCars.push({
        id: `vehicle:police:${idx}`,
        mesh, body, collider,
        position: pos, previous: pos.clone(),
        heading: pose.heading, previousHeading: pose.heading,
        lane, initialLane: lane,
        route: [], distance: 6, speed: 0,
        occupied: true, parked: false,
      });

      const officer = createActor(scene, physics, navigation, { x: pose.x, y: 0.08, z: pose.z }, 0x264166);
      officer.collider.setEnabled(false);
      units.push({
        id: `person:police:${2 + idx}`,
        actor: officer,
        stop: 0,
        arrestTime: 0,
        fireCooldown: 0,
        inCar: true,
        carIndex: idx,
      });
    }
  }

  // Dynamic tactical barricades deployed around reported area during high alert
  const barricades: Array<{ mesh: Mesh; collider: RAPIER.Collider; x: number; z: number }> = [];

  let state: 'patrol' | 'respond' | 'pursue' | 'search' = 'patrol';
  let cursor = 0;
  let lastKnown: Point3 | undefined;
  let identified = false;
  let suspectVehicleId: string | undefined;
  let suspectHostile = false;
  let searchTime = 0;
  let lostTime = 0;
  const incidents = new Set<number>();

  function clearBarricades() {
    while (barricades.length) {
      const b = barricades.pop()!;
      b.mesh.removeFromParent();
      physics.world.removeCollider(b.collider, true);
    }
  }

  function deployBarricades(center: Point3) {
    if (!network || barricades.length > 0) return;
    const nearestNodes = [...network.nodes.values()]
      .sort((a, b) => Math.hypot(a.x - center.x, a.z - center.z) - Math.hypot(b.x - center.x, b.z - center.z))
      .slice(1, 3);
    for (const node of nearestNodes) {
      const bx = node.x + 1.8;
      const bz = node.z;
      const mesh = new Mesh(patrolGeo, barricadeMat);
      mesh.position.set(bx, 0.45, bz);
      mesh.scale.set(2.4, 0.9, 0.45);
      mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh);
      const collider = physics.addBox({ x: bx, y: 0.45, z: bz, halfX: 1.2, halfY: 0.45, halfZ: 0.225 });
      barricades.push({ mesh, collider, x: bx, z: bz });
    }
  }

  function sees(index: number, point: Point3, currentVehicleId?: string) {
    const actor = units[index].actor;
    if (units[index].inCar || actor.health <= 0) return false;
    const dist = planarDistance(actor.position, point);
    // Changing vehicle out of sight shrinks police identification radius
    const maxSight = suspectVehicleId && currentVehicleId !== suspectVehicleId ? 11 : 19;
    if (dist > maxSight) return false;
    const dx = point.x - actor.position.x;
    const dz = point.z - actor.position.z;
    if (Math.hypot(dx, dz) > 3 && (dx * Math.sin(actor.heading) - dz * Math.cos(actor.heading)) / Math.hypot(dx, dz) < 0) return false;
    return physics.canSee(eyes(actor.position), eyes(point), [actor.collider.handle, playerHandle]);
  }

  function receive(point: Point3, known: boolean, incident: number, hostile: boolean) {
    if (incidents.has(incident)) return;
    incidents.add(incident);
    if (incidents.size > 96) incidents.delete(incidents.values().next().value!);
    lastKnown = { ...point };
    identified ||= known;
    suspectHostile ||= hostile;
    const footUnits = units.filter((u) => !u.inCar);
    const approach = footUnits.length
      ? Math.min(...footUnits.map((unit) => planarDistance(unit.actor.position, point)))
      : 10;
    searchTime = Math.min(70, 22 + Math.max(0, approach - 35) / 2.8);
    if (state !== 'pursue') state = 'respond';
    if (hostile) deployBarricades(point);
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
    for (const [idx, car] of patrolCars.entries()) {
      car.previous.copy(car.position);
      car.previousHeading = car.heading;
      const unit = units.find((u) => u.carIndex === idx);
      if (!unit) continue;

      if (state === 'patrol') {
        if (!unit.inCar) {
          // Officer returns to patrol car
          unit.actor.goTo(car.position, 2.2);
          if (planarDistance(unit.actor.position, car.position) < 2.2) {
            unit.inCar = true;
            unit.actor.collider.setEnabled(false);
            unit.actor.goTo(undefined);
            car.occupied = true;
            car.parked = false;
          }
        }
      } else if (lastKnown && unit.inCar) {
        if (planarDistance(car.position, lastKnown) < 16) {
          // Park and disembark officer!
          car.parked = true;
          car.speed = 0;
          car.occupied = false;
          unit.inCar = false;
          const exitPoint = navigation.closest({ x: car.position.x + 1.6, y: 0.08, z: car.position.z }, 2.4)
            ?? { x: car.position.x + 1.6, y: 0.08, z: car.position.z };
          unit.actor.collider.setEnabled(true);
          unit.actor.warp(exitPoint);
        }
      }

      if (car.parked || !car.occupied) {
        car.speed = 0;
        car.body.setNextKinematicTranslation(car.position);
        car.body.setNextKinematicRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -car.heading));
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

      const maxSpeed = state === 'patrol' ? 4.8 : 7.8;
      const left = car.lane.length - car.distance;
      const target = Math.min(car.turn ? 3.5 : maxSpeed, Math.sqrt(2 * 6 * Math.max(0.5, left)));
      car.speed += (target - car.speed) * Math.min(1, 5 * dt);
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
      car.body.setNextKinematicRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -car.heading));
      car.position.set(resolved.x, resolved.y, resolved.z);
    }
  }

  return {
    units,
    patrolCars,
    get state() { return state; },
    get lastKnown() { return lastKnown; },
    get identified() { return identified; },
    step(dt: number, now: number, player: Point3, armed: boolean, playerVehicleId?: string) {
      for (const event of journal.since(cursor)) {
        cursor = event.id;
        const hostile = event.kind === 'shot' || event.kind === 'robbery';
        if (event.kind === 'report') {
          receive(event.position, event.identified, event.incident ?? event.id, false);
        } else if (event.source === 'player' && now - event.time < 1 && units.some((_, index) => sees(index, event.position, playerVehicleId))) {
          suspectVehicleId = playerVehicleId;
          receive(event.position, true, event.id, hostile);
        }
      }
      const observed = state !== 'patrol' && units.some((_, index) => sees(index, player, playerVehicleId));
      if (observed && (identified || armed)) {
        identified = true;
        suspectVehicleId = playerVehicleId;
        if (armed) suspectHostile = true;
        state = 'pursue';
        lastKnown = { ...player };
        lostTime = 0;
        searchTime = 22;
      } else if (state === 'pursue') {
        lostTime += dt;
        if (lostTime > 1.1) state = 'search';
      }
      if (state === 'search' || state === 'respond') {
        searchTime = Math.max(0, searchTime - dt);
        if (searchTime === 0) {
          state = 'patrol';
          identified = false;
          suspectHostile = false;
          suspectVehicleId = undefined;
          lastKnown = undefined;
          clearBarricades();
        }
      }

      stepPatrolCars(dt);

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
          if (unit.carIndex >= 0) continue; // Car officers walk back to their car inside stepPatrolCars
          const goal = patrol[(unit.stop + index) % patrol.length];
          actor.goTo(goal, 1.45);
          if (actor.arrived || actor.stuck > 3) unit.stop++;
        } else if (lastKnown) {
          const goal = { ...lastKnown };
          const offset = { ...goal, x: goal.x + (index % 2 === 0 ? -0.85 : 0.85) };
          actor.goTo(navigation.walkable(offset) ? offset : goal, state === 'pursue' ? 4.2 : 2.8);
          if (state === 'respond' && actor.arrived) state = 'search';
          if (observed && sees(index, player, playerVehicleId)) {
            actor.face(player, dt);
            actor.action('aim');
            if (planarDistance(actor.position, player) < 1.7) {
              unit.arrestTime += dt;
            } else {
              unit.arrestTime = 0;
              if (suspectHostile && armed && unit.fireCooldown === 0 && onPlayerShot && planarDistance(actor.position, player) < 18) {
                unit.fireCooldown = 1.15;
                onPlayerShot(10);
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
      cursor = 0;
      identified = false;
      suspectHostile = false;
      suspectVehicleId = undefined;
      lastKnown = undefined;
      searchTime = lostTime = 0;
      incidents.clear();
      clearBarricades();
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
        const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -pose.heading);
        car.body.setRotation(q, true);
        car.body.setNextKinematicRotation(q);
        car.position.set(pose.x, pose.y, pose.z);
        car.previous.copy(car.position);
        car.heading = car.previousHeading = pose.heading;
        const unit = units.find((u) => u.carIndex === idx);
        if (unit) {
          unit.inCar = true;
          unit.actor.reset();
          unit.actor.collider.setEnabled(false);
        }
      }
      for (const unit of units) {
        if (unit.carIndex < 0) unit.actor.reset();
        unit.stop = unit.arrestTime = unit.fireCooldown = 0;
      }
    },
    dispose() {
      clearBarricades();
      for (const car of patrolCars) {
        car.mesh.removeFromParent();
        physics.world.removeRigidBody(car.body);
      }
      for (const unit of units) unit.actor.dispose();
      patrolGeo.dispose();
      bodyMat.dispose();
      roofMat.dispose();
      sirenMat.dispose();
      sirenRedMat.dispose();
      barricadeMat.dispose();
    },
  };
}
