import * as THREE from 'three';
import { createAvatar } from '../characters/avatar';
import { createCharacterCollider } from '../physics/physics';
import type { Physics, Point3 } from '../physics/physics';
import { createFollowCamera } from './follow-camera';

export interface MovementInput {
  x: number;
  z: number;
  run: boolean;
  jump: boolean;
}

const WALK_SPEED = 4.4;
const RUN_SPEED = 7.25;
const JUMP_SPEED = 6.1;
const JUMP_BUFFER = 0.125;
const COYOTE_TIME = 0.09;
const FALL_RESET_HEIGHT = -16;

export function createPlayer(scene: THREE.Scene, camera: THREE.PerspectiveCamera, physics: Physics, spawn: Point3) {
  const initialFeet = { ...spawn };
  const character = createCharacterCollider(physics, initialFeet);
  const avatar = createAvatar(scene);
  const follow = createFollowCamera(camera, character.cameraClearFraction);
  const position = new THREE.Vector3();
  const previousPosition = new THREE.Vector3();
  const interpolated = new THREE.Vector3();
  const horizontalVelocity = new THREE.Vector2();

  let heading = 0;
  let previousHeading = 0;
  let verticalSpeed = 0;
  let groundTime = 0;
  let bufferedJump = 0;
  let previousJump = false;
  let grounded = false;
  let resolvedSpeed = 0;
  let pendingMovement = { x: 0, y: 0, z: 0 };
  let pendingGrounded = false;
  let pendingMoveY = 0;
  let aiming = false;
  let armed = false;
  let recoil = 0;

  // Wrap only differences so interpolation always follows the shortest arc.
  function turnDelta(from: number, to: number) {
    return THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
  }

  function reset() {
    character.warp(initialFeet);
    position.set(initialFeet.x, initialFeet.y, initialFeet.z);
    previousPosition.copy(position);
    horizontalVelocity.set(0, 0);
    heading = previousHeading = 0;
    resolvedSpeed = verticalSpeed = groundTime = bufferedJump = 0;
    armed = aiming = false;
    recoil = 0;
    grounded = previousJump = false;
    avatar.reset();
    follow.reset(position);
    render(1, 0);
  }

  function prepareStep(dt: number, input: MovementInput) {
    previousPosition.copy(position);
    previousHeading = heading;
    if (input.jump && !previousJump) bufferedJump = JUMP_BUFFER;
    previousJump = input.jump;

    if (bufferedJump > 0 && groundTime > 0) {
      verticalSpeed = JUMP_SPEED;
      grounded = false;
      groundTime = bufferedJump = 0;
    } else {
      bufferedJump = Math.max(0, bufferedJump - dt);
    }

    const magnitude = Math.max(1, Math.hypot(input.x, input.z));
    const speed = (aiming ? 2.4 : input.run ? RUN_SPEED : WALK_SPEED) / magnitude;
    const sin = Math.sin(follow.yaw);
    const cos = Math.cos(follow.yaw);
    const targetX = (input.x * cos + input.z * sin) * speed;
    const targetZ = (input.x * sin - input.z * cos) * speed;
    const acceleration = grounded ? 17 : 7.5;
    horizontalVelocity.x = THREE.MathUtils.damp(horizontalVelocity.x, targetX, acceleration, dt);
    horizontalVelocity.y = THREE.MathUtils.damp(horizontalVelocity.y, targetZ, acceleration, dt);

    if (aiming || Math.hypot(targetX, targetZ) > 0.05) {
      const targetHeading = aiming ? follow.yaw : Math.atan2(targetX, -targetZ);
      heading += turnDelta(heading, targetHeading) * (1 - Math.exp(-16 * dt));
    }

    // Maintain a downward probe while grounded and let Rapier resolve curbs and walls.
    verticalSpeed = Math.max(-30, verticalSpeed + physics.world.gravity.y * dt);
    const moveY = verticalSpeed * dt;
    const result = character.move(dt, {
      x: horizontalVelocity.x * dt,
      y: moveY,
      z: horizontalVelocity.y * dt,
    });
    pendingMovement = result.movement;
    pendingGrounded = result.grounded;
    pendingMoveY = moveY;
  }

  function finishStep(dt: number) {
    const feet = character.readFeet();
    position.set(feet.x, feet.y, feet.z);
    resolvedSpeed = Math.hypot(pendingMovement.x, pendingMovement.z) / dt;

    grounded = pendingGrounded && verticalSpeed <= 0;
    if (grounded) {
      groundTime = COYOTE_TIME;
      verticalSpeed = 0;
    } else {
      groundTime = Math.max(0, groundTime - dt);
      if (verticalSpeed > 0 && pendingMovement.y < pendingMoveY - 0.004) verticalSpeed = 0;
    }

    if (position.y < FALL_RESET_HEIGHT) reset();
  }

  function step(dt: number, input: MovementInput) {
    prepareStep(dt, input);
    physics.step(dt);
    finishStep(dt);
  }

  function render(alpha: number, dt: number) {
    const blend = THREE.MathUtils.clamp(alpha, 0, 1);
    interpolated.lerpVectors(previousPosition, position, blend);
    recoil = THREE.MathUtils.damp(recoil, 0, 17, dt);
    const cameraDistance = follow.update(interpolated, dt, aiming, recoil);
    avatar.mesh.position.copy(interpolated);
    avatar.mesh.rotation.y = -(previousHeading + turnDelta(previousHeading, heading) * blend);
    avatar.mesh.visible = cameraDistance > 0.75;
    avatar.animate({
      effort: THREE.MathUtils.clamp(resolvedSpeed / WALK_SPEED, 0, 1),
      sprint: THREE.MathUtils.clamp((resolvedSpeed - WALK_SPEED) / (RUN_SPEED - WALK_SPEED), 0, 1),
      verticalSpeed,
      grounded,
      action: aiming ? 'aim' : 'relaxed',
      armed,
      recoil,
    }, dt);
  }

  reset();

  return {
    position,
    collider: character.collider,
    get aimHeading() { return follow.yaw; },
    get heading() {
      return heading;
    },
    step,
    prepareStep,
    finishStep,
    setWeapon(equipped: boolean, aim: boolean) { armed = equipped; aiming = equipped && aim; },
    kick() { recoil = 0.13; },
    look: follow.look,
    render,
    reset,
    dispose() {
      character.dispose();
      avatar.dispose();
    },
  };
}
