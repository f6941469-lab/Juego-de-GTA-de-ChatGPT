import * as THREE from 'three';

export type CameraClearFraction = (origin: THREE.Vector3, offset: THREE.Vector3) => number;
export interface VehicleCamera {
  heading: number;
  clearFraction: CameraClearFraction;
}

const INITIAL_PITCH = 0.20;
const CAMERA_DISTANCE = 5.15;
const LOOK_SENSITIVITY = 0.0032;

export function createFollowCamera(camera: THREE.PerspectiveCamera, clearFraction: CameraClearFraction) {
  const pivot = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let desiredYaw = 0;
  let desiredPitch = INITIAL_PITCH;
  let yaw = desiredYaw;
  let pitch = desiredPitch;
  let boom = 1;

  function update(position: THREE.Vector3, dt: number, vehicle?: VehicleCamera) {
    const targetYaw = desiredYaw + (vehicle?.heading ?? 0);
    const turn = THREE.MathUtils.euclideanModulo(targetYaw - yaw + Math.PI, Math.PI * 2) - Math.PI;
    yaw += turn * (1 - Math.exp(-(vehicle ? 9 : 18) * dt));
    pitch = THREE.MathUtils.damp(pitch, desiredPitch, 18, dt);
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const distance = vehicle ? 8.25 : CAMERA_DISTANCE;
    const planar = Math.cos(pitch) * distance;
    const shoulder = vehicle ? 0 : 0.42;
    offset.set(-sin * planar + cos * shoulder, Math.sin(pitch) * distance, cos * planar + sin * shoulder);
    pivot.copy(position);
    pivot.y += vehicle ? 1.55 : 1.32;

    const clear = (vehicle?.clearFraction ?? clearFraction)(pivot, offset);
    boom = clear < boom ? clear : THREE.MathUtils.damp(boom, clear, 7, dt);
    camera.position.copy(pivot).addScaledVector(offset, boom);
    lookTarget.set(
      pivot.x + cos * 0.29 * boom + sin * 0.2,
      pivot.y - 0.13,
      pivot.z + sin * 0.29 * boom - cos * 0.2,
    );
    camera.lookAt(lookTarget);
    return boom * distance;
  }

  return {
    get yaw() {
      return desiredYaw;
    },

    look(dx: number, dy: number) {
      desiredYaw += dx * LOOK_SENSITIVITY;
      desiredPitch = THREE.MathUtils.clamp(desiredPitch + dy * LOOK_SENSITIVITY, -0.22, 1.05);
    },

    update,

    reset(position: THREE.Vector3, heading = 0, vehicle?: VehicleCamera) {
      yaw = heading;
      desiredYaw = vehicle ? 0 : heading;
      pitch = desiredPitch = vehicle ? 0.34 : INITIAL_PITCH;
      boom = 1;
      update(position, 0, vehicle);
    },
  };
}
