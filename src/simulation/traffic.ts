import RAPIER from '@dimforge/rapier3d-compat';
import { BoxGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, InstancedMesh, Object3D, Color, MeshStandardMaterial, Quaternion, Scene, Vector3 } from 'three';
import type { Physics } from '../physics/physics';
import type { Journal } from './model';
import { RoadNetwork, joinRoads, lanePose, turnPose, type RoadLane, type RoadTurn } from './road-network';

const COLLIDER_OFFSET_Y = 0.25;
export const trafficPhase = (now: number) => now % 16 < 8 ? 'vertical' : now % 16 >= 9 && now % 16 < 15 ? 'horizontal' : 'red';

export function createTraffic(scene: Scene, physics: Physics, journal: Journal) {
  const network = new RoadNetwork();
  const destinations = [...network.nodes.values()];
  const geometry = new BoxGeometry();
  const materials: MeshStandardMaterial[] = [];
  const material = (color: number, emissive = 0) => { const result = new MeshStandardMaterial({ color, roughness: 0.65, emissive, emissiveIntensity: 0.8 }); materials.push(result); return result; };
  const dark = material(0x27333b); const glass = material(0x769fa5); const tire = material(0x24252c); const skin = material(0xc58e66); const light = material(0xfbe2a1, 0xe9bd69); const brake = material(0xb52939, 0xb52939);
  function block(group: Group, mat: MeshStandardMaterial, x: number, y: number, z: number, w: number, h: number, d: number) {
    const mesh = new Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  const seeds = [[0, 45, 0, 7, 0], [0, 7, 28, 7, 7.65], [28, 7, 28, 45, 21.65]];
  const cars = seeds.map(([fromX, fromZ, toX, toZ, distance], index) => {
    const lane = network.lanes.find(lane => lane.from.x === fromX && lane.from.z === fromZ && lane.to.x === toX && lane.to.z === toZ)!;
    const pose = lanePose(lane, distance); const mesh = new Group(); scene.add(mesh);
    const paint = material([0xe6b06f, 0x71aaa6, 0xb46d83][index]);
    block(mesh, paint, 0, 0, 0, 1.65, 0.55, 3.5);
    block(mesh, glass, 0, 0.5, -0.05, 1.4, 0.55, 1.7);
    block(mesh, paint, 0, 0.8, 0, 1.48, 0.12, 1.8);
    for (const side of [-1, 1]) {
      block(mesh, paint, side * 0.72, 0.5, 0, 0.08, 0.6, 1.8);
      block(mesh, light, side * 0.58, 0.05, -1.77, 0.35, 0.15, 0.06);
      block(mesh, brake, side * 0.58, 0.05, 1.77, 0.35, 0.15, 0.06);
      for (const z of [-1.05, 1.05]) block(mesh, tire, side * 0.83, -0.23, z, 0.18, 0.48, 0.52).name = 'Wheel';
    }
    // An occupied driver's seat belongs to this car, never a duplicate pedestrian.
    block(mesh, dark, 0.34, 0.35, 0, 0.38, 0.4, 0.35);
    block(mesh, skin, 0.34, 0.61, -0.1, 0.25, 0.25, 0.25);
    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pose.x, pose.y, pose.z));
    const collider = physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.86, 0.63, 1.83).setTranslation(0, COLLIDER_OFFSET_Y, 0), body);
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -pose.heading); body.setRotation(rotation, true);
    const position = new Vector3(pose.x, pose.y, pose.z);
    return { lane, initialLane: lane, route: [] as RoadLane[], turn: undefined as (RoadTurn & { next: RoadLane; distance: number }) | undefined, destination: (index * 7) % destinations.length, reserved: false, id: `vehicle:traffic:${index}`, seatId: `seat:traffic:${index}:driver`, mesh, body, collider, position, previous: position.clone(), heading: pose.heading, previousHeading: pose.heading, distance, initialDistance: distance, speed: 0, cooldown: 0, driverId: `person:driver:${index}`, occupiedSeats: 1 };
  });
  const shape = new RAPIER.Cuboid(0.89, 0.63, 1.86);
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
  let time = 0;
  return {
    cars, network,
    prepare(dt: number, now: number) {
      time = now;
      for (const car of cars) {
        car.previous.copy(car.position); car.previousHeading = car.heading; car.cooldown = Math.max(0, car.cooldown - dt);
        let clearance = 8;
        const direction = { x: Math.sin(car.heading), y: 0, z: -Math.cos(car.heading) };
        const origin = { x: car.position.x, y: car.position.y + COLLIDER_OFFSET_Y, z: car.position.z };
        const hit = physics.world.castShape(origin, car.body.rotation(), direction, shape, 0.08, 8, true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, car.collider);
        if (hit) clearance = Math.max(0, hit.time_of_impact - 0.3);
        if (!car.route.length && !car.turn) plan(car);
        const left = car.lane.length - car.distance;
        if (!car.turn && left < 8 && !car.reserved) {
          const green = trafficPhase(now) === (car.lane.axis === 'z' ? 'vertical' : 'horizontal');
          car.reserved = green && network.reserve(car.lane.to, car.id);
        }
        if (!car.turn && !car.reserved) clearance = Math.min(clearance, Math.max(0, left - 0.25));
        const turning = !!car.turn || (left < 6 && car.route[0]?.axis !== car.lane.axis);
        const target = Math.min(turning ? 3.1 : 5.4, Math.sqrt(2 * 6 * Math.max(0, clearance - 0.15)));
        car.speed += MathUtils.clamp(target - car.speed, -7 * dt, 2.1 * dt);
        const advance = Math.min(car.speed * dt, Math.max(0, clearance - 0.05));
        const travel = Math.min(advance, car.turn ? car.turn.length - car.turn.distance : left);
        const pose = car.turn ? turnPose(car.turn, car.turn.distance + travel) : lanePose(car.lane, car.distance + travel);
        const delta = { x: pose.x - car.position.x, y: 0, z: pose.z - car.position.z };
        const collision = physics.world.castShape(origin, car.body.rotation(), delta, shape, 0.03, 1, true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, car.collider);
        const fraction = collision ? Math.max(0, collision.time_of_impact - 0.01) : 1;
        if (fraction < 0.9 && car.speed > 2 && car.cooldown === 0) {
          journal.publish('collision', car.position, now, car.driverId, false); car.cooldown = 3;
        }
        if (car.turn) {
          car.turn.distance += travel * fraction;
          if (car.turn.distance >= car.turn.length - 0.001) {
            network.release(car.lane.to, car.id);
            car.lane = car.turn.next; car.distance = 0; car.turn = undefined; car.reserved = false;
          }
        } else {
          car.distance = Math.min(car.lane.length, car.distance + travel * fraction);
          if (car.distance >= car.lane.length - 0.001 && car.reserved && car.route.length) {
            const next = car.route.shift()!;
            car.turn = { ...joinRoads(car.lane, next), next, distance: 0 };
          }
        }
        const resolved = car.turn ? turnPose(car.turn, car.turn.distance) : lanePose(car.lane, car.distance);
        car.heading += Math.atan2(Math.sin(resolved.heading - car.heading), Math.cos(resolved.heading - car.heading)) * (1 - Math.exp(-14 * dt));
        car.body.setNextKinematicTranslation(resolved);
        car.body.setNextKinematicRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -car.heading));
        if (fraction < 1) car.speed *= fraction;
      }
    },
    finish() { for (const car of cars) { const p = car.body.translation(); car.position.set(p.x, p.y, p.z); } },
    render(alpha: number) {
      const phase = trafficPhase(time);
      if (phase !== previousPhase) {
        const dark = new Color(0x121c22), red = new Color(0xff4b57), green = new Color(0x69dfb1);
        for (const head of signalHeads) {
          const open = phase === (head.axis === 'z' ? 'vertical' : 'horizontal');
          for (let lamp = 0; lamp < 3; lamp++) signals.setColorAt(head.offset + lamp, lamp === (open ? 2 : 0) ? (open ? green : red) : dark);
        }
        signals.instanceColor!.needsUpdate = true; previousPhase = phase;
      }
      for (const car of cars) {
        car.mesh.position.lerpVectors(car.previous, car.position, alpha);
        car.mesh.rotation.y = -(car.previousHeading + Math.atan2(Math.sin(car.heading - car.previousHeading), Math.cos(car.heading - car.previousHeading)) * alpha);
      }
    },
    reset() {
      network.reset();
      time = 0; previousPhase = '';
      for (const [index, car] of cars.entries()) {
        car.destination = (index * 7) % destinations.length;
        car.lane = car.initialLane; car.route = []; car.turn = undefined; car.reserved = false;
        car.distance = car.initialDistance; const pose = lanePose(car.lane, car.distance);
        car.body.setTranslation(pose, true); car.body.setNextKinematicTranslation(pose);
        const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -pose.heading);
        car.body.setRotation(q, true); car.body.setNextKinematicRotation(q);
        car.position.set(pose.x, pose.y, pose.z); car.previous.copy(car.position);
        car.heading = car.previousHeading = pose.heading; car.speed = car.cooldown = 0;
      }
    },
    dispose() { for (const car of cars) { car.mesh.removeFromParent(); physics.world.removeRigidBody(car.body); } signals.removeFromParent(); signals.dispose(); signalMaterial.dispose(); network.reset(); geometry.dispose(); materials.forEach((mat) => mat.dispose()); },
  };
}
