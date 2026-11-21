import RAPIER from '@dimforge/rapier3d-compat';
import { BoxGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, Quaternion, Scene, Vector3 } from 'three';
import type { Physics, Point3 } from '../physics/physics';
import type { Journal } from './model';
import { avenues, crossStreets } from '../world/generation/layout';

const RIDE_HEIGHT = 0.47;
const COLLIDER_OFFSET_Y = 0.25;
const points: Point3[] = [{ x: 2, y: RIDE_HEIGHT, z: 40 }, { x: 2, y: RIDE_HEIGHT, z: 12 }];
for (const [cx, cz, start] of [[5, 12, Math.PI], [23, 12, Math.PI * 1.5], [23, 40, 0], [5, 40, Math.PI / 2]]) {
  for (let i = 0; i <= 16; i++) {
    const angle = start + i / 16 * Math.PI / 2;
    points.push({ x: cx + Math.cos(angle) * 3, y: RIDE_HEIGHT, z: cz + Math.sin(angle) * 3 });
  }
}
const lengths = points.map((point, i) => i ? Math.hypot(point.x - points[i - 1].x, point.z - points[i - 1].z) : 0);
const total = lengths.reduce((sum, length) => sum + length, 0);
function sample(distance: number) {
  let remaining = ((distance % total) + total) % total;
  for (let i = 1; i < points.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const t = remaining / lengths[i]; const a = points[i - 1]; const b = points[i];
      return { x: MathUtils.lerp(a.x, b.x, t), y: RIDE_HEIGHT, z: MathUtils.lerp(a.z, b.z, t), heading: Math.atan2(b.x - a.x, a.z - b.z) };
    }
    remaining -= lengths[i];
  }
  return { ...points[0], heading: 0 };
}
const stops = [24, 28 + 3 * Math.PI / 2 + 15, 28 + 3 * Math.PI / 2 + 18 + 3 * Math.PI / 2 + 24, total - 3 * Math.PI / 2 - 4.8];
export const trafficPhase = (now: number) => now % 16 < 8 ? 'vertical' : now % 16 >= 9 && now % 16 < 15 ? 'horizontal' : 'red';

export function createTraffic(scene: Scene, physics: Physics, journal: Journal) {
  const geometry = new BoxGeometry();
  const materials: MeshStandardMaterial[] = [];
  const material = (color: number, emissive = 0) => { const result = new MeshStandardMaterial({ color, roughness: 0.65, emissive, emissiveIntensity: 0.8 }); materials.push(result); return result; };
  const dark = material(0x27333b); const glass = material(0x769fa5); const tire = material(0x24252c); const skin = material(0xc58e66); const light = material(0xfbe2a1, 0xe9bd69); const brake = material(0xb52939, 0xb52939);
  function block(group: Group, mat: MeshStandardMaterial, x: number, y: number, z: number, w: number, h: number, d: number) {
    const mesh = new Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  const cars = [0, 42, 79].map((distance, index) => {
    const pose = sample(distance); const mesh = new Group(); scene.add(mesh);
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
    return { id: `vehicle:traffic:${index}`, seatId: `seat:traffic:${index}:driver`, mesh, body, collider, position, previous: position.clone(), heading: pose.heading, previousHeading: pose.heading, distance, initialDistance: distance, speed: 0, cooldown: 0, driverId: `person:driver:${index}`, occupiedSeats: 1 };
  });
  const shape = new RAPIER.Cuboid(0.89, 0.63, 1.86);
  const signalMaterials = [material(0xff4b57, 0xff4b57), material(0xffcc68, 0xffcc68), material(0x69dfb1, 0x69dfb1)];
  const signals: Mesh[][] = [];
  for (const avenue of avenues) for (const street of crossStreets) {
    if (avenue.center !== 0 && (avenue.center !== 28 || street.center === 77)) continue;
    for (const side of [-1, 1]) {
      signals.push(signalMaterials.map((mat, index) => {
        const lamp = new Mesh(geometry, mat);
        lamp.position.set(avenue.center + side * (avenue.width / 2 + 0.65), 3.02 - index * 0.17, street.center + side * (street.width / 2 + 0.72) - side * 0.18);
        lamp.scale.set(0.1, 0.1, 0.045); scene.add(lamp); return lamp;
      }));
    }
  }
  let time = 0;
  return {
    cars,
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
        const phase = trafficPhase(now);
        for (let i = 0; i < stops.length; i++) {
          if (phase === (i % 2 === 0 ? 'vertical' : 'horizontal')) continue;
          const ahead = (stops[i] - car.distance + total) % total;
          if (ahead < 9) clearance = Math.min(clearance, ahead);
        }
        const target = Math.min(5.4, Math.sqrt(2 * 6 * Math.max(0, clearance - 0.15)));
        car.speed += MathUtils.clamp(target - car.speed, -7 * dt, 2.1 * dt);
        const advance = Math.min(car.speed * dt, Math.max(0, clearance - 0.05));
        const pose = sample(car.distance + advance);
        const delta = { x: pose.x - car.position.x, y: 0, z: pose.z - car.position.z };
        const collision = physics.world.castShape(origin, car.body.rotation(), delta, shape, 0.03, 1, true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, car.collider);
        const fraction = collision ? Math.max(0, collision.time_of_impact - 0.01) : 1;
        if (fraction < 0.9 && car.speed > 2 && car.cooldown === 0) {
          journal.publish('collision', car.position, now, car.driverId, false); car.cooldown = 3;
        }
        car.distance = (car.distance + advance * fraction) % total;
        const resolved = sample(car.distance);
        car.heading += Math.atan2(Math.sin(resolved.heading - car.heading), Math.cos(resolved.heading - car.heading)) * (1 - Math.exp(-14 * dt));
        car.body.setNextKinematicTranslation(resolved);
        car.body.setNextKinematicRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -car.heading));
        if (fraction < 1) car.speed *= fraction;
      }
    },
    finish() { for (const car of cars) { const p = car.body.translation(); car.position.set(p.x, p.y, p.z); } },
    render(alpha: number) {
      const phase = trafficPhase(time);
      for (const lamps of signals) lamps.forEach((lamp, index) => { lamp.visible = index === (phase === 'vertical' ? 2 : 0); });
      for (const car of cars) {
        car.mesh.position.lerpVectors(car.previous, car.position, alpha);
        car.mesh.rotation.y = -(car.previousHeading + Math.atan2(Math.sin(car.heading - car.previousHeading), Math.cos(car.heading - car.previousHeading)) * alpha);
      }
    },
    reset() {
      for (const car of cars) {
        car.distance = car.initialDistance; const pose = sample(car.distance);
        car.body.setTranslation(pose, true); car.body.setNextKinematicTranslation(pose);
        const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -pose.heading);
        car.body.setRotation(q, true); car.body.setNextKinematicRotation(q);
        car.position.set(pose.x, pose.y, pose.z); car.previous.copy(car.position);
        car.heading = car.previousHeading = pose.heading; car.speed = car.cooldown = 0;
      }
    },
    dispose() { for (const car of cars) { car.mesh.removeFromParent(); physics.world.removeRigidBody(car.body); } signals.flat().forEach((lamp) => lamp.removeFromParent()); geometry.dispose(); materials.forEach((mat) => mat.dispose()); },
  };
}
