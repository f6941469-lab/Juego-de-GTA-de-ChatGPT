import RAPIER from '@dimforge/rapier3d-compat';
import { BoxGeometry, Color, Group, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Quaternion, Scene, Vector3 } from 'three';
import type { Physics, Point3 } from '../physics/physics';
import { busStops, metroStations } from '../world/generation/transit';
import type { Journal } from './model';
import { RoadNetwork, joinRoads, lanePose, turnPose, type RoadLane, type RoadNode, type RoadTurn } from './road-network';

const COLLIDER_OFFSET_Y = 0.25;
export const trafficPhase = (now: number) => now % 16 < 8 ? 'vertical' : now % 16 >= 9 && now % 16 < 15 ? 'horizontal' : 'red';

export interface PlayerDriveInput {
  throttle: number;
  steer: number;
  brake: boolean;
}

export interface ManagedVehicle {
  id: string;
  kind: 'car' | 'bus' | 'metro';
  seatId: string;
  driverId: string | undefined;
  occupiedSeats: number;
  passengerIds: string[];
  color: number;
  mesh: Group;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  position: Vector3;
  previous: Vector3;
  heading: number;
  previousHeading: number;
  speed: number;
  health: number;
  controlledByPlayer: boolean;
  parkedTimer: number;
  stoppedAtId?: string;
}

export function createTraffic(scene: Scene, physics: Physics, journal: Journal) {
  const network = new RoadNetwork();
  const destinations = [...network.nodes.values()];
  const geometry = new BoxGeometry();
  const vehicleMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 });
  const materials: MeshStandardMaterial[] = [vehicleMaterial];
  const dark = 0x27333b; const glass = 0x769fa5; const tire = 0x24252c; const skin = 0xc58e66; const light = 0xfbe2a1; const brake = 0xb52939;
  const busPaint = 0x3a8c84; const metroPaint = 0xd99b43;
  const partTransform = new Object3D();
  const partColor = new Color();
  const zeroMatrix = new Object3D();
  zeroMatrix.scale.set(0, 0, 0);
  zeroMatrix.updateMatrix();

  function buildVehicleBatch(
    group: Group,
    specs: readonly { color: number; x: number; y: number; z: number; w: number; h: number; d: number; name?: string }[],
  ) {
    const batch = new InstancedMesh(geometry, vehicleMaterial, specs.length);
    batch.castShadow = true;
    batch.receiveShadow = true;
    const matrices: Float32Array[] = [];
    specs.forEach((s, i) => {
      partTransform.position.set(s.x, s.y, s.z);
      partTransform.scale.set(s.w, s.h, s.d);
      partTransform.updateMatrix();
      batch.setMatrixAt(i, partTransform.matrix);
      batch.setColorAt(i, partColor.setHex(s.color));
      matrices.push(new Float32Array(partTransform.matrix.elements));
      if (s.name === 'Wheel') {
        const wheelAnchor = new Object3D();
        wheelAnchor.name = 'Wheel';
        wheelAnchor.position.set(s.x, s.y, s.z);
        wheelAnchor.scale.set(s.w, s.h, s.d);
        group.add(wheelAnchor);
      }
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.instanceColor!.needsUpdate = true;
    batch.computeBoundingSphere();
    group.add(batch);
    return {
      batch,
      setPartVisible(index: number, visible: boolean) {
        if (visible) {
          partTransform.matrix.fromArray(matrices[index]);
          batch.setMatrixAt(index, partTransform.matrix);
        } else {
          batch.setMatrixAt(index, zeroMatrix.matrix);
        }
        batch.instanceMatrix.needsUpdate = true;
      },
    };
  }

  const carColors = [0xe6b06f, 0x71aaa6, 0xb46d83];
  const seeds = [[0, 45, 0, 7, 0], [0, 7, 28, 7, 7.65], [28, 7, 28, 45, 21.65]];
  const cars = seeds.map(([fromX, fromZ, toX, toZ, distance], index) => {
    const lane = network.lanes.find(lane => lane.from.x === fromX && lane.from.z === fromZ && lane.to.x === toX && lane.to.z === toZ)!;
    const pose = lanePose(lane, distance); const mesh = new Group(); scene.add(mesh);
    const hex = carColors[index];
    const carParts: { color: number; x: number; y: number; z: number; w: number; h: number; d: number; name?: string }[] = [
      { color: hex, x: 0, y: 0, z: 0, w: 1.65, h: 0.55, d: 3.5 },
      { color: glass, x: 0, y: 0.5, z: -0.05, w: 1.4, h: 0.55, d: 1.7 },
      { color: hex, x: 0, y: 0.8, z: 0, w: 1.48, h: 0.12, d: 1.8 },
    ];
    for (const side of [-1, 1]) {
      carParts.push(
        { color: hex, x: side * 0.72, y: 0.5, z: 0, w: 0.08, h: 0.6, d: 1.8 },
        { color: light, x: side * 0.58, y: 0.05, z: -1.77, w: 0.35, h: 0.15, d: 0.06 },
        { color: brake, x: side * 0.58, y: 0.05, z: 1.77, w: 0.35, h: 0.15, d: 0.06 },
      );
      for (const z of [-1.05, 1.05]) {
        carParts.push({ color: tire, x: side * 0.83, y: -0.23, z, w: 0.18, h: 0.48, d: 0.52, name: 'Wheel' });
      }
    }
    const seatIdx = carParts.length;
    carParts.push({ color: dark, x: 0.34, y: 0.35, z: 0, w: 0.38, h: 0.4, d: 0.35 });
    const headIdx = carParts.length;
    carParts.push({ color: skin, x: 0.34, y: 0.61, z: -0.1, w: 0.25, h: 0.25, d: 0.25 });
    const batched = buildVehicleBatch(mesh, carParts);
    let driverVisible = true;
    const toggleDriver = (vis: boolean) => {
      if (driverVisible === vis) return;
      driverVisible = vis;
      batched.setPartVisible(seatIdx, vis);
      batched.setPartVisible(headIdx, vis);
    };
    const driverSeatMesh = { get visible() { return driverVisible; }, set visible(v: boolean) { toggleDriver(v); } };
    const driverHeadMesh = { get visible() { return driverVisible; }, set visible(v: boolean) { toggleDriver(v); } };
    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pose.x, pose.y, pose.z));
    const collider = physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.86, 0.63, 1.83).setTranslation(0, COLLIDER_OFFSET_Y, 0), body);
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -pose.heading); body.setRotation(rotation, true);
    const position = new Vector3(pose.x, pose.y, pose.z);
    return {
      kind: 'car' as const,
      color: hex,
      lane, initialLane: lane,
      route: [] as RoadLane[],
      turn: undefined as (RoadTurn & { next: RoadLane; distance: number }) | undefined,
      destination: (index * 7) % destinations.length,
      reserved: false,
      id: `vehicle:traffic:${index}`,
      seatId: `seat:traffic:${index}:driver`,
      driverId: `person:driver:${index}`,
      initialDriverId: `person:driver:${index}`,
      occupiedSeats: 1,
      passengerIds: [] as string[],
      mesh, driverSeatMesh, driverHeadMesh,
      body, collider, position, previous: position.clone(),
      heading: pose.heading, previousHeading: pose.heading,
      distance, initialDistance: distance,
      speed: 0, cooldown: 0, health: 100,
      controlledByPlayer: false,
      abandoned: false,
      parkedTimer: 0,
      stoppedAtId: undefined as string | undefined,
    };
  });

  // City Bus cycling through busStops on RoadNetwork
  const busRouteNodes: RoadNode[] = [
    network.nodes.get('road:28:45')!,
    network.nodes.get('road:28:7')!,
    network.nodes.get('road:28:-28')!,
    network.nodes.get('road:0:-28')!,
    network.nodes.get('road:-22:-28')!,
    network.nodes.get('road:-22:7')!,
    network.nodes.get('road:-22:45')!,
    network.nodes.get('road:0:45')!,
  ];
  const busStartLane = network.lanes.find((l) => l.from === busRouteNodes[7] && l.to === busRouteNodes[0])!;
  const busPose = lanePose(busStartLane, 4);
  const busMesh = new Group(); scene.add(busMesh);
  const busParts: { color: number; x: number; y: number; z: number; w: number; h: number; d: number }[] = [
    { color: busPaint, x: 0, y: 0.35, z: 0, w: 2.05, h: 1.35, d: 5.4 },
    { color: glass, x: 0, y: 0.72, z: -2.1, w: 1.85, h: 0.55, d: 1.1 },
  ];
  for (const side of [-1, 1]) {
    busParts.push({ color: glass, x: side * 1.03, y: 0.72, z: 0.1, w: 0.05, h: 0.55, d: 3.4 });
    for (const z of [-1.7, 1.7]) busParts.push({ color: tire, x: side * 0.96, y: -0.22, z, w: 0.22, h: 0.52, d: 0.58 });
  }
  buildVehicleBatch(busMesh, busParts);
  const busBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(busPose.x, busPose.y, busPose.z));
  const busCollider = physics.world.createCollider(RAPIER.ColliderDesc.cuboid(1.05, 0.9, 2.75).setTranslation(0, 0.4, 0), busBody);
  const busPos = new Vector3(busPose.x, busPose.y, busPose.z);
  const bus = {
    kind: 'bus' as const,
    color: 0x3a8c84,
    id: 'vehicle:bus:0',
    seatId: 'seat:bus:0:driver',
    driverId: 'person:bus:driver' as string | undefined,
    occupiedSeats: 1,
    passengerIds: [] as string[],
    mesh: busMesh,
    body: busBody,
    collider: busCollider,
    position: busPos,
    previous: busPos.clone(),
    heading: busPose.heading,
    previousHeading: busPose.heading,
    lane: busStartLane,
    initialLane: busStartLane,
    route: [] as RoadLane[],
    turn: undefined as (RoadTurn & { next: RoadLane; distance: number }) | undefined,
    distance: 4,
    routeStopIndex: 0,
    dwellTimer: 0,
    stopCooldown: 0,
    reserved: false,
    speed: 0,
    health: 150,
    controlledByPlayer: false,
    parkedTimer: 0,
    stoppedAtId: undefined as string | undefined,
  };

  // Metro Shuttle connecting Metro Sur (trackX: 15, trackZ: 58.9) & Metro Norte (trackX: -58.5, trackZ: -49.1)
  const metroMesh = new Group(); scene.add(metroMesh);
  buildVehicleBatch(metroMesh, [
    { color: metroPaint, x: 0, y: 0.65, z: 0, w: 6.2, h: 1.4, d: 1.85 },
    { color: glass, x: 0, y: 0.85, z: 0, w: 5.2, h: 0.55, d: 1.9 },
  ]);
  const metroPos = new Vector3(metroStations[0].trackX, 0.1, metroStations[0].trackZ);
  const metroBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(metroPos.x, metroPos.y, metroPos.z));
  const metroCollider = physics.world.createCollider(RAPIER.ColliderDesc.cuboid(3.1, 0.75, 0.95).setTranslation(0, 0.65, 0), metroBody);
  const metro = {
    kind: 'metro' as const,
    color: 0xd99b43,
    id: 'vehicle:metro:0',
    seatId: 'seat:metro:0:driver',
    driverId: 'person:metro:driver' as string | undefined,
    occupiedSeats: 1,
    passengerIds: [] as string[],
    mesh: metroMesh,
    body: metroBody,
    collider: metroCollider,
    position: metroPos,
    previous: metroPos.clone(),
    heading: 0,
    previousHeading: 0,
    speed: 0,
    health: 999,
    controlledByPlayer: false,
    parkedTimer: 0,
    stationIndex: 0,
    phase: 'dwell' as 'dwell' | 'depart' | 'transit' | 'arrive',
    timer: 5.5,
    stoppedAtId: metroStations[0].id as string | undefined,
  };

  const shape = new RAPIER.Cuboid(0.89, 0.63, 1.86);
  const busShape = new RAPIER.Cuboid(1.07, 0.9, 2.75);
  const signalMaterial = new MeshBasicMaterial();
  const signals = new InstancedMesh(geometry, signalMaterial, network.nodes.size * 12);
  const transform = new Object3D();
  const signalHeads: { axis: 'x' | 'z'; offset: number }[] = [];
  for (const node of network.nodes.values()) {
    for (const axis of ['x', 'z'] as const) for (const side of [-1, 1]) {
      const x = node.x + side * (node.width / 2 + 0.65);
      const z = node.z + (axis === 'z' ? side : -side) * (node.depth / 2 + 0.54);
      const offset = signalHeads.length * 3;
      signalHeads.push({ axis, offset });
      for (let lamp = 0; lamp < 3; lamp++) {
        transform.position.set(x, 3.02 - lamp * 0.17, z); transform.scale.set(0.1, 0.1, 0.045); transform.updateMatrix();
        signals.setMatrixAt(offset + lamp, transform.matrix); signals.setColorAt(offset + lamp, new Color(0x121c22));
      }
    }
  }
  signals.name = 'Señales de la red vial';
  scene.add(signals);
  let previousPhase = '';

  function plan(car: typeof cars[number]) {
    for (let attempt = 0; attempt < destinations.length; attempt++) {
      car.destination = (car.destination + 7) % destinations.length;
      const route = network.route(car.lane.to, destinations[car.destination], car.lane.from);
      if (route.length) { car.route = route; return; }
    }
  }

  function planBus() {
    bus.routeStopIndex = (bus.routeStopIndex + 1) % busRouteNodes.length;
    const nextNode = busRouteNodes[bus.routeStopIndex];
    const route = network.route(bus.lane.to, nextNode, bus.lane.from);
    if (route.length) bus.route = route;
  }

  const upAxis = new Vector3(0, 1, 0);
  const tempQuat = new Quaternion();

  function stepRoadVehicle(
    veh: {
      id: string; lane: RoadLane; route: RoadLane[]; turn: (RoadTurn & { next: RoadLane; distance: number }) | undefined;
      reserved: boolean; position: Vector3; heading: number; distance: number; speed: number;
      body: RAPIER.RigidBody; collider: RAPIER.Collider; driverId?: string;
    },
    vehShape: RAPIER.Cuboid,
    maxSpeed: number,
    dt: number,
    now: number,
    forceStop: boolean,
    replan: () => void,
    onImpact?: () => void,
  ) {
    let clearance = 8;
    const direction = { x: Math.sin(veh.heading), y: 0, z: -Math.cos(veh.heading) };
    const origin = { x: veh.position.x, y: veh.position.y + COLLIDER_OFFSET_Y, z: veh.position.z };
    const hit = physics.world.castShape(origin, veh.body.rotation(), direction, vehShape, 0.08, 8, true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, veh.collider);
    if (hit) clearance = Math.max(0, hit.time_of_impact - 0.3);
    if (!veh.route.length && !veh.turn) replan();
    const left = veh.lane.length - veh.distance;
    if (!veh.turn && left < 8 && !veh.reserved) {
      const green = trafficPhase(now) === (veh.lane.axis === 'z' ? 'vertical' : 'horizontal');
      veh.reserved = green && network.reserve(veh.lane.to, veh.id);
    }
    if (!veh.turn && !veh.reserved) clearance = Math.min(clearance, Math.max(0, left - 0.25));
    const turning = !!veh.turn || (left < 6 && veh.route[0]?.axis !== veh.lane.axis);
    const target = forceStop ? 0 : Math.min(turning ? Math.min(3.1, maxSpeed) : maxSpeed, Math.sqrt(2 * 6 * Math.max(0, clearance - 0.15)));
    veh.speed += MathUtils.clamp(target - veh.speed, -7 * dt, 2.1 * dt);
    const advance = Math.min(veh.speed * dt, Math.max(0, clearance - 0.05));
    const travel = Math.min(advance, veh.turn ? veh.turn.length - veh.turn.distance : left);
    const pose = veh.turn ? turnPose(veh.turn, veh.turn.distance + travel) : lanePose(veh.lane, veh.distance + travel);
    let fraction = 1;
    if (veh.turn || clearance < 2.2) {
      const delta = { x: pose.x - veh.position.x, y: 0, z: pose.z - veh.position.z };
      const collision = physics.world.castShape(origin, veh.body.rotation(), delta, vehShape, 0.03, 1, true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, veh.collider);
      fraction = collision ? Math.max(0, collision.time_of_impact - 0.01) : 1;
      if (fraction < 0.9 && veh.speed > 2 && onImpact) onImpact();
    }
    if (veh.turn) {
      veh.turn.distance += travel * fraction;
      if (veh.turn.distance >= veh.turn.length - 0.001) {
        network.release(veh.lane.to, veh.id);
        veh.lane = veh.turn.next; veh.distance = 0; veh.turn = undefined; veh.reserved = false;
      }
    } else {
      veh.distance = Math.min(veh.lane.length, veh.distance + travel * fraction);
      if (veh.distance >= veh.lane.length - 0.001 && veh.reserved && veh.route.length) {
        const next = veh.route.shift()!;
        veh.turn = { ...joinRoads(veh.lane, next), next, distance: 0 };
      }
    }
    const resolved = veh.turn ? turnPose(veh.turn, veh.turn.distance) : lanePose(veh.lane, veh.distance);
    veh.heading += Math.atan2(Math.sin(resolved.heading - veh.heading), Math.cos(resolved.heading - veh.heading)) * (1 - Math.exp(-14 * dt));
    veh.body.setNextKinematicTranslation(resolved);
    veh.body.setNextKinematicRotation(tempQuat.setFromAxisAngle(upAxis, -veh.heading));
    if (fraction < 1) veh.speed *= fraction;
  }

  let time = 0;
  let playerInput: PlayerDriveInput = { throttle: 0, steer: 0, brake: false };
  const allVehiclesList: ManagedVehicle[] = [...cars, bus, metro];

  return {
    cars,
    bus,
    metro,
    network,
    get allVehicles(): ManagedVehicle[] {
      return allVehiclesList;
    },
    setPlayerDrive(input: PlayerDriveInput) {
      playerInput = input;
    },
    nearestBoardable(point: Point3, maxDist = 3.2): ManagedVehicle | undefined {
      let best: ManagedVehicle | undefined;
      let bestDist = maxDist;
      for (const veh of allVehiclesList) {
        const d = Math.hypot(veh.position.x - point.x, veh.position.z - point.z);
        if (d < bestDist) {
          bestDist = d;
          best = veh;
        }
      }
      return best;
    },
    prepare(dt: number, now: number) {
      time = now;

      // 1. Traffic cars (autonomous or player-driven)
      for (const car of cars) {
        car.previous.copy(car.position);
        car.previousHeading = car.heading;
        car.cooldown = Math.max(0, car.cooldown - dt);
        car.driverSeatMesh.visible = car.occupiedSeats > 0;
        car.driverHeadMesh.visible = car.occupiedSeats > 0;

        if (car.controlledByPlayer) {
          if (car.reserved) {
            network.release(car.lane.to, car.id);
            car.reserved = false;
          }
          car.parkedTimer = 0;
          const accel = playerInput.throttle > 0 ? 11 : playerInput.throttle < 0 ? -7 : 0;
          if (playerInput.brake) {
            car.speed = MathUtils.damp(car.speed, 0, 9, dt);
          } else if (accel !== 0) {
            car.speed = MathUtils.clamp(car.speed + accel * dt, -6.5, 14.5);
          } else {
            car.speed = MathUtils.damp(car.speed, 0, 2.2, dt);
          }
          if (Math.abs(car.speed) > 0.25 && playerInput.steer !== 0) {
            const sign = car.speed >= 0 ? 1 : -1;
            car.heading += playerInput.steer * sign * Math.min(1, Math.abs(car.speed) / 3) * 2.15 * dt;
          }
          const stepDist = car.speed * dt;
          const dx = Math.sin(car.heading) * stepDist;
          const dz = -Math.cos(car.heading) * stepDist;
          const origin = { x: car.position.x, y: car.position.y + COLLIDER_OFFSET_Y, z: car.position.z };
          const hit = Math.abs(stepDist) > 0.0005
            ? physics.world.castShape(origin, car.body.rotation(), { x: dx, y: 0, z: dz }, shape, 0.02, 1, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, car.collider)
            : null;
          const frac = hit ? Math.max(0, hit.time_of_impact - 0.02) : 1;
          if (frac < 0.9 && Math.abs(car.speed) > 3.5 && car.cooldown === 0) {
            journal.publish('collision', car.position, now, 'player', true);
            car.cooldown = 2.5;
            car.speed *= 0.2;
          }
          const nextPos = { x: car.position.x + dx * frac, y: 0.47, z: car.position.z + dz * frac };
          car.body.setNextKinematicTranslation(nextPos);
          car.body.setNextKinematicRotation(tempQuat.setFromAxisAngle(upAxis, -car.heading));
          continue;
        }

        if (car.abandoned) {
          car.speed = MathUtils.damp(car.speed, 0, 5, dt);
          car.parkedTimer += dt;
          // Recover abandoned car after 24s so road intersections never stay permanently blocked
          if (car.parkedTimer >= 24) {
            car.abandoned = false;
            car.parkedTimer = 0;
            car.driverId = car.initialDriverId;
            car.occupiedSeats = 1;
            car.turn = undefined;
            car.route = [];
            let bestLane = car.initialLane;
            let bestDist = Infinity;
            for (const candidate of network.lanes) {
              const mid = lanePose(candidate, candidate.length * 0.5);
              const d = Math.hypot(mid.x - car.position.x, mid.z - car.position.z);
              if (d < bestDist) { bestDist = d; bestLane = candidate; }
            }
            car.lane = bestLane;
            car.distance = Math.min(bestLane.length * 0.5, 4);
          } else {
            car.body.setNextKinematicTranslation(car.position);
            car.body.setNextKinematicRotation(tempQuat.setFromAxisAngle(upAxis, -car.heading));
            continue;
          }
        }

        stepRoadVehicle(car, shape, 5.4, dt, now, false, () => plan(car), () => {
          if (car.cooldown === 0) {
            journal.publish('collision', car.position, now, car.driverId ?? car.id, false);
            car.cooldown = 3;
          }
        });
      }

      // 2. City Bus (stops cleanly at busStops)
      bus.previous.copy(bus.position);
      bus.previousHeading = bus.heading;
      bus.stopCooldown = Math.max(0, bus.stopCooldown - dt);
      if (bus.dwellTimer > 0) {
        bus.dwellTimer = Math.max(0, bus.dwellTimer - dt);
        bus.speed = 0;
        if (bus.dwellTimer === 0) bus.stoppedAtId = undefined;
        bus.body.setNextKinematicTranslation(bus.position);
        bus.body.setNextKinematicRotation(tempQuat.setFromAxisAngle(upAxis, -bus.heading));
      } else {
        if (bus.stopCooldown === 0) {
          for (const stop of busStops) {
            if (Math.hypot(bus.position.x - stop.roadStop.x, bus.position.z - stop.roadStop.z) < 2.2) {
              bus.dwellTimer = 6.0;
              bus.stopCooldown = 10.0;
              bus.stoppedAtId = stop.id;
              bus.speed = 0;
              break;
            }
          }
        }
        stepRoadVehicle(bus, busShape, 4.6, dt, now, bus.dwellTimer > 0, planBus);
      }

      // 3. Metro Shuttle (arrives/dwells at Metro Sur & Metro Norte with smooth coordinate interpolation)
      metro.previous.copy(metro.position);
      metro.previousHeading = metro.heading;
      metro.timer = Math.max(0, metro.timer - dt);
      const currentSt = metroStations[metro.stationIndex];
      const nextSt = metroStations[(metro.stationIndex + 1) % metroStations.length];
      if (metro.phase === 'dwell') {
        metro.stoppedAtId = currentSt.id;
        metro.speed = 0;
        metro.position.set(currentSt.trackX, 0.1, currentSt.trackZ);
        if (metro.timer === 0) {
          metro.phase = 'depart';
          metro.stoppedAtId = undefined;
          metro.timer = 1.4;
        }
      } else if (metro.phase === 'depart') {
        const dir = metro.stationIndex === 0 ? 1 : -1;
        metro.position.set(currentSt.trackX + dir * (1.4 - metro.timer) * 6, 0.1, currentSt.trackZ);
        metro.speed = 6;
        if (metro.timer === 0) {
          metro.phase = 'transit';
          metro.timer = 3.8;
        }
      } else if (metro.phase === 'transit') {
        const progress = 1 - metro.timer / 3.8;
        metro.position.set(
          MathUtils.lerp(currentSt.trackX, nextSt.trackX, progress),
          -6,
          MathUtils.lerp(currentSt.trackZ, nextSt.trackZ, progress),
        );
        metro.speed = 14;
        if (metro.timer === 0) {
          metro.stationIndex = (metro.stationIndex + 1) % metroStations.length;
          metro.phase = 'arrive';
          metro.timer = 1.4;
        }
      } else if (metro.phase === 'arrive') {
        const destSt = metroStations[metro.stationIndex];
        const dir = metro.stationIndex === 0 ? -1 : 1;
        metro.position.set(destSt.trackX + dir * metro.timer * 6, 0.1, destSt.trackZ);
        metro.speed = 4;
        if (metro.timer === 0) {
          metro.phase = 'dwell';
          metro.timer = 6.0;
          metro.stoppedAtId = destSt.id;
        }
      }
      metro.body.setNextKinematicTranslation(metro.position);
    },
    finish() {
      for (const car of cars) { const p = car.body.translation(); car.position.set(p.x, p.y, p.z); }
      const bp = bus.body.translation(); bus.position.set(bp.x, bp.y, bp.z);
    },
    render(alpha: number) {
      const phase = trafficPhase(time);
      if (phase !== previousPhase) {
        const darkC = new Color(0x121c22), red = new Color(0xff4b57), green = new Color(0x69dfb1);
        for (const head of signalHeads) {
          const open = phase === (head.axis === 'z' ? 'vertical' : 'horizontal');
          for (let lamp = 0; lamp < 3; lamp++) signals.setColorAt(head.offset + lamp, lamp === (open ? 2 : 0) ? (open ? green : red) : darkC);
        }
        signals.instanceColor!.needsUpdate = true; previousPhase = phase;
      }
      for (const veh of allVehiclesList) {
        veh.mesh.visible = veh.position.y > -2;
        if (!veh.mesh.visible) continue;
        veh.mesh.position.lerpVectors(veh.previous, veh.position, alpha);
        veh.mesh.rotation.y = -(veh.previousHeading + Math.atan2(Math.sin(veh.heading - veh.previousHeading), Math.cos(veh.heading - veh.previousHeading)) * alpha);
      }
    },
    reset() {
      network.reset();
      time = 0; previousPhase = '';
      playerInput = { throttle: 0, steer: 0, brake: false };
      for (const [index, car] of cars.entries()) {
        car.destination = (index * 7) % destinations.length;
        car.lane = car.initialLane; car.route = []; car.turn = undefined; car.reserved = false;
        car.controlledByPlayer = false; car.abandoned = false; car.parkedTimer = 0;
        car.driverId = car.initialDriverId; car.occupiedSeats = 1; car.passengerIds.length = 0;
        car.health = 100; car.driverSeatMesh.visible = true; car.driverHeadMesh.visible = true;
        car.distance = car.initialDistance; const pose = lanePose(car.lane, car.distance);
        car.body.setTranslation(pose, true); car.body.setNextKinematicTranslation(pose);
        tempQuat.setFromAxisAngle(upAxis, -pose.heading);
        car.body.setRotation(tempQuat, true); car.body.setNextKinematicRotation(tempQuat);
        car.position.set(pose.x, pose.y, pose.z); car.previous.copy(car.position);
        car.heading = car.previousHeading = pose.heading; car.speed = car.cooldown = 0;
      }
      bus.lane = bus.initialLane; bus.route = []; bus.turn = undefined; bus.reserved = false;
      bus.distance = 4; bus.routeStopIndex = 0; bus.dwellTimer = 0; bus.stopCooldown = 0;
      bus.stoppedAtId = undefined; bus.passengerIds.length = 0; bus.occupiedSeats = 1; bus.speed = 0;
      const bp = lanePose(bus.lane, bus.distance);
      bus.body.setTranslation(bp, true); bus.body.setNextKinematicTranslation(bp);
      tempQuat.setFromAxisAngle(upAxis, -bp.heading);
      bus.body.setRotation(tempQuat, true); bus.body.setNextKinematicRotation(tempQuat);
      bus.position.set(bp.x, bp.y, bp.z); bus.previous.copy(bus.position);
      bus.heading = bus.previousHeading = bp.heading;

      metro.stationIndex = 0; metro.phase = 'dwell'; metro.timer = 5.5;
      metro.stoppedAtId = metroStations[0].id; metro.passengerIds.length = 0; metro.speed = 0;
      metro.position.set(metroStations[0].trackX, 0.1, metroStations[0].trackZ);
      metro.previous.copy(metro.position);
      metro.body.setTranslation(metro.position, true); metro.body.setNextKinematicTranslation(metro.position);
    },
    dispose() {
      for (const veh of allVehiclesList) { veh.mesh.removeFromParent(); physics.world.removeRigidBody(veh.body); }
      signals.removeFromParent(); signals.dispose(); signalMaterial.dispose();
      network.reset(); geometry.dispose(); materials.forEach((mat) => mat.dispose());
    },
  };
}
