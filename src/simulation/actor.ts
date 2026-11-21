import { MathUtils, Scene, Vector3 } from 'three';
import { createAvatar, type AvatarPose } from '../characters/avatar';
import { createCharacterCollider, type Physics, type Point3 } from '../physics/physics';
import { Navigation } from './navigation';
import { planarDistance } from './model';

export function createActor(scene: Scene, physics: Physics, navigation: Navigation, spawn: Point3, color: number, initialHeading = 0) {
  const character = createCharacterCollider(physics, spawn);
  const avatar = createAvatar(scene, color);
  const position = new Vector3(spawn.x, spawn.y, spawn.z);
  const previous = position.clone();
  const visual = position.clone();
  let heading = initialHeading;
  let previousHeading = heading;
  let path: Point3[] = [];
  let passing: Point3 | undefined;
  let destination: Point3 | undefined;
  let routeAge = 0;
  let routeVersion = navigation.version;
  let speed = 0;
  let resolvedSpeed = 0;
  let stuck = 0;
  let grounded = true;
  let movement = { x: 0, y: 0, z: 0 };
  let action: AvatarPose['action'] = 'relaxed';
  let health = 100;
  let stun = 0;
  let opacity = 1;
  const api = {
    position,
    collider: character.collider,
    get heading() { return heading; },
    get health() { return health; },
    get stuck() { return stuck; },
    get arrived() { return !destination || planarDistance(position, destination) < 0.55; },
    action(value: AvatarPose['action']) { action = value; },
    face(target: Point3, dt: number) {
      const angle = Math.atan2(target.x - position.x, position.z - target.z);
      heading += Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading)) * (1 - Math.exp(-10 * dt));
    },
    goTo(target: Point3 | undefined, pace = 1.5) {
      if (!target) { destination = undefined; path = []; passing = undefined; speed = 0; return; }
      if (!destination || planarDistance(target, destination) > 0.7) { destination = { ...target }; path = []; passing = undefined; routeAge = 3; }
      speed = pace;
    },
    prepare(dt: number) {
      previous.copy(position); previousHeading = heading; routeAge += dt; stun = Math.max(0, stun - dt);
      let dx = 0; let dz = 0;
      if (routeVersion !== navigation.version) {
        if (!navigation.pathClear(path)) path = [];
        routeVersion = navigation.version;
        if (!path.length) routeAge = 1;
      }
      if (passing && (planarDistance(position, passing) < 0.19 || stuck > 1.5)) {
        passing = undefined; path = []; routeAge = 1;
      }
      if (destination && health > 0 && stun === 0 && !api.arrived) {
        if (!passing && ((!path.length && routeAge >= 1) || (stuck > 1 && routeAge > 2))) {
          const route = navigation.requestPath(position, destination);
          if (route !== undefined) { path = route; routeAge = 0; routeVersion = navigation.version; }
        }
        while (path.length && planarDistance(position, path[0]) < 0.19) path.shift();
        let target: Point3 | undefined = passing ?? path[0];
        if (target && !navigation.reserveMove(character.collider.handle, target)) {
          passing = navigation.yieldPoint(character.collider.handle, position, target);
          target = passing;
        }
        if (target) {
          const distance = planarDistance(position, target);
          const step = Math.min(speed * dt, distance);
          dx = (target.x - position.x) / distance * step; dz = (target.z - position.z) / distance * step;
          api.face(target, dt);
        }
      }
      if (health > 0) {
        const result = character.move(dt, { x: dx, y: -0.18, z: dz });
        movement = result.movement; grounded = result.grounded;
      } else movement = { x: 0, y: 0, z: 0 };
      stuck = destination && !api.arrived && Math.hypot(movement.x, movement.z) < dt * 0.1 ? stuck + dt : 0;
    },
    finish(dt: number) { const feet = character.readFeet(); position.set(feet.x, feet.y, feet.z); resolvedSpeed = Math.hypot(movement.x, movement.z) / dt; },
    render(alpha: number, dt: number, armed = false, cameraPosition?: Vector3) {
      const distance = cameraPosition ? position.distanceTo(cameraPosition) : 0;
      avatar.mesh.visible = !cameraPosition || distance < 84;
      if (!avatar.mesh.visible) { opacity = 0; return; }
      visual.lerpVectors(previous, position, alpha); avatar.mesh.position.copy(visual);
      avatar.mesh.rotation.y = -(previousHeading + Math.atan2(Math.sin(heading - previousHeading), Math.cos(heading - previousHeading)) * alpha);
      avatar.mesh.rotation.z = health <= 0 ? -Math.PI / 2 : 0;
      if (health <= 0) avatar.mesh.position.y += 0.25;
      if (cameraPosition) {
        const distance = Math.hypot(visual.x - cameraPosition.x, visual.y + 1 - cameraPosition.y, visual.z - cameraPosition.z);
        const visibility = MathUtils.smoothstep(distance, 0.5, 1.4) * (1 - MathUtils.smoothstep(distance, 64, 80));
        opacity = dt > 0 ? MathUtils.damp(opacity, visibility, 18, dt) : visibility;
        avatar.setOpacity(opacity);
      }
      avatar.animate({ effort: MathUtils.clamp(resolvedSpeed / 2, 0, 1), sprint: MathUtils.clamp((resolvedSpeed - 2) / 2, 0, 1), verticalSpeed: 0, grounded, action: stun > 0 ? 'hurt' : action, armed }, dt);
    },
    hurt(amount: number) {
      if (health <= 0) return;
      health = Math.max(0, health - amount); stun = 0.3;
      if (health === 0) { character.collider.setEnabled(false); api.goTo(undefined); }
    },
    reset() {
      character.warp(spawn); character.collider.setEnabled(true); position.set(spawn.x, spawn.y, spawn.z); previous.copy(position);
      heading = previousHeading = initialHeading; health = 100; action = 'relaxed'; stun = routeAge = stuck = resolvedSpeed = 0;
      destination = undefined; path = []; passing = undefined; avatar.reset();
      opacity = 1; avatar.setOpacity(1);
    },
    dispose() { character.dispose(); avatar.dispose(); },
  };
  return api;
}
export type Actor = ReturnType<typeof createActor>;
