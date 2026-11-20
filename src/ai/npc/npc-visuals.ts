import {
  BoxGeometry,
  Color,
  InstancedMesh,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  type Scene,
} from 'three';
import type { NpcEmotionalState, NpcIntent } from './npc-brain';
import type { NpcAppearance } from './profiles';

export interface NpcVisualAgent {
  x: number;
  z: number;
  previousX: number;
  previousZ: number;
  heading: number;
  previousHeading: number;
  speed: number;
  stridePhase: number;
  state: NpcEmotionalState;
  intent: NpcIntent;
  appearance: NpcAppearance;
}

export function createNpcVisuals(scene: Scene, capacity = 72) {
  const cube = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });

  const torsos = new InstancedMesh(cube, material, capacity);
  const heads = new InstancedMesh(cube, material, capacity);
  const hairs = new InstancedMesh(cube, material, capacity);
  const leftArms = new InstancedMesh(cube, material, capacity);
  const rightArms = new InstancedMesh(cube, material, capacity);
  const leftLegs = new InstancedMesh(cube, material, capacity);
  const rightLegs = new InstancedMesh(cube, material, capacity);

  const allMeshes = [torsos, heads, hairs, leftArms, rightArms, leftLegs, rightLegs];
  for (const mesh of allMeshes) {
    mesh.name = 'Ciudadanos NPC';
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  hairs.castShadow = false;

  const pose = new Object3D();
  const scratchColor = new Color();

  function render(agents: readonly NpcVisualAgent[], alpha: number): void {
    const blend = MathUtils.clamp(alpha, 0, 1);
    const limit = Math.min(agents.length, capacity);

    for (let i = 0; i < limit; i++) {
      const npc = agents[i];
      const x = MathUtils.lerp(npc.previousX, npc.x, blend);
      const z = MathUtils.lerp(npc.previousZ, npc.z, blend);
      const deltaAngle = MathUtils.euclideanModulo(
        npc.heading - npc.previousHeading + Math.PI,
        2 * Math.PI,
      ) - Math.PI;
      const yaw = npc.previousHeading + deltaAngle * blend;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);

      const injured = npc.state === 'injured' || npc.state === 'disoriented' || npc.intent === 'recover';
      const raisedHands = npc.state === 'cooperating' || npc.state === 'panicking'
        || npc.intent === 'call_help' || npc.intent === 'record';
      const effort = Math.min(1, npc.speed / 4.2);
      const stride = injured ? 0 : Math.sin(npc.stridePhase) * effort;
      const bob = injured ? 0 : Math.abs(Math.cos(npc.stridePhase)) * effort * 0.04;

      const placePart = (
        mesh: InstancedMesh,
        localX: number,
        localY: number,
        localZ: number,
        sx: number,
        sy: number,
        sz: number,
        tiltX: number,
        hexColor: number,
      ) => {
        if (injured) {
          // Downed horizontal posture slightly rotated from heading
          pose.position.set(x + cos * localX - sin * (localY - 0.9), 0.2, z + sin * localX + cos * (localY - 0.9));
          pose.rotation.set(Math.PI * 0.48, -yaw, 0);
        } else {
          pose.position.set(x + cos * localX - sin * localZ, localY + bob, z + sin * localX + cos * localZ);
          pose.rotation.set(tiltX, -yaw, 0);
        }
        pose.scale.set(sx, sy, sz);
        pose.updateMatrix();
        mesh.setMatrixAt(i, pose.matrix);
        scratchColor.setHex(hexColor);
        mesh.setColorAt(i, scratchColor);
      };

      const armSwing = stride * 0.65;
      const legSwing = stride * 0.72;
      const raisedPitch = npc.state === 'cooperating' || npc.state === 'panicking'
        ? -2.15
        : (npc.intent === 'call_help' || npc.intent === 'record' ? -1.35 : 0);

      placePart(torsos, 0, 1.12, 0, 0.46, 0.48, 0.26, effort * 0.08, npc.appearance.shirt);
      placePart(heads, 0, 1.54, 0, 0.32, 0.31, 0.31, 0, npc.appearance.skin);
      placePart(hairs, 0, 1.69, 0.02, 0.35, 0.11, 0.34, 0, npc.appearance.hair);

      const leftPitch = raisedHands ? raisedPitch : -armSwing;
      const rightPitch = npc.intent === 'call_help' || npc.intent === 'record' ? -1.45 : (raisedHands ? raisedPitch : armSwing);
      const armOffsetY = raisedHands ? 1.38 : 1.09;
      const armOffsetZ = npc.intent === 'call_help' || npc.intent === 'record' ? -0.18 : 0;

      placePart(leftArms, -0.31, armOffsetY, armOffsetZ, 0.14, 0.44, 0.16, leftPitch, npc.appearance.shirt);
      placePart(rightArms, 0.31, armOffsetY, armOffsetZ, 0.14, 0.44, 0.16, rightPitch, npc.appearance.shirt);
      placePart(leftLegs, -0.12, 0.45, stride * 0.16, 0.19, 0.72, 0.21, legSwing, npc.appearance.pants);
      placePart(rightLegs, 0.12, 0.45, -stride * 0.16, 0.19, 0.72, 0.21, -legSwing, npc.appearance.pants);
    }

    for (const mesh of allMeshes) {
      mesh.count = limit;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  return {
    render,
    dispose() {
      for (const mesh of allMeshes) {
        scene.remove(mesh);
        mesh.dispose();
      }
      cube.dispose();
      material.dispose();
    },
  };
}
