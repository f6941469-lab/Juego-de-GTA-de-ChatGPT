import * as THREE from 'three';

export type CarryItem = 'none' | 'coffee' | 'bag' | 'phone' | 'briefcase';

export interface AvatarPose {
  effort: number;
  sprint: number;
  verticalSpeed: number;
  grounded: boolean;
  action?: 'relaxed' | 'aim' | 'handsUp' | 'phone' | 'hurt';
  armed?: boolean;
  recoil?: number;
  carry?: CarryItem;
}

const sharedBoxGeometry = new THREE.BoxGeometry();
const sharedAvatarMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74, metalness: 0.04 });
const ZERO_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);
const tempMatrix = new THREE.Matrix4();
const tempPos = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempScale = new THREE.Vector3();

interface PivotNode {
  group: THREE.Group;
  parent?: PivotNode;
  netMatrix: THREE.Matrix4;
  isProp: boolean;
  hidden: boolean;
}

interface PartEntry {
  pivot: PivotNode;
  localMatrix: THREE.Matrix4;
  color: THREE.Color;
  index: number;
}

export function createAvatar(scene: THREE.Scene, shirtColor = 0x247c81) {
  const mesh = new THREE.Group();
  mesh.name = 'Player avatar';
  scene.add(mesh);

  const skin = 0xbd7855;
  const skinShadow = 0xa96048;
  const hair = 0x211927;
  const hairLight = 0x322332;
  const shirt = shirtColor;
  const shirtLight = new THREE.Color(shirtColor).multiplyScalar(1.15).getHex();
  const piping = 0xf2a772;
  const cream = 0xffe2a0;
  const pants = 0x333848;
  const pantsLight = 0x4a4b55;
  const shoe = 0xeedfc9;
  const sole = 0x867676;

  const pivotMap = new Map<THREE.Object3D, PivotNode>();
  const pivots: PivotNode[] = [];
  const parts: PartEntry[] = [];

  function pivot(parent: THREE.Object3D, x: number, y: number, z: number, isProp = false) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const parentNode = pivotMap.get(parent);
    const node: PivotNode = {
      group,
      parent: parentNode,
      netMatrix: new THREE.Matrix4(),
      isProp: isProp || Boolean(parentNode?.isProp),
      hidden: false,
    };
    pivotMap.set(group, node);
    pivots.push(node);
    return group;
  }

  function block(
    parent: THREE.Object3D,
    hexColor: number,
    x: number, y: number, z: number,
    width: number, height: number, depth: number,
    _castsShadow = false,
  ) {
    const pivotNode = pivotMap.get(parent)!;
    const localMatrix = new THREE.Matrix4().compose(
      tempPos.set(x, y, z),
      tempQuat.identity(),
      tempScale.set(width, height, depth),
    );
    parts.push({
      pivot: pivotNode,
      localMatrix,
      color: new THREE.Color(hexColor),
      index: parts.length,
    });
  }

  const hips = pivot(mesh, 0, 0.9, 0);
  block(hips, pants, 0, 0.006, 0, 0.445, 0.12, 0.25, true);

  const torso = pivot(hips, 0, 0.026, 0);
  block(torso, shirt, 0, 0.243, 0, 0.49, 0.45, 0.275, true);
  block(torso, shirtLight, 0, 0.424, 0, 0.51, 0.093, 0.282);
  block(torso, piping, 0, 0.051, 0, 0.492, 0.035, 0.277);
  block(torso, cream, 0.125, 0.312, -0.139, 0.064, 0.018, 0.004);
  block(torso, skinShadow, 0, 0.482, 0, 0.163, 0.105, 0.16);
  // A small coastal sunset emblem, built from raised stitching on the back.
  block(torso, cream, 0, 0.294, 0.14, 0.105, 0.088, 0.004);
  block(torso, cream, 0, 0.29, 0.141, 0.137, 0.052, 0.005);
  block(torso, piping, 0, 0.259, 0.145, 0.192, 0.018, 0.005);
  block(torso, piping, -0.024, 0.232, 0.145, 0.145, 0.012, 0.005);

  const head = pivot(torso, 0, 0.485, 0);
  block(head, skin, 0, 0.178, 0, 0.345, 0.32, 0.323, true);
  block(head, hair, 0, 0.325, 0.016, 0.372, 0.109, 0.349, true);
  block(head, hair, 0, 0.235, 0.144, 0.367, 0.138, 0.072);
  block(head, hairLight, -0.073, 0.379, -0.007, 0.195, 0.045, 0.295);
  block(head, hairLight, 0.105, 0.369, -0.038, 0.13, 0.041, 0.225);
  block(head, hair, 0.091, 0.274, -0.15, 0.167, 0.048, 0.049);
  block(head, skin, 0, 0.148, -0.167, 0.055, 0.06, 0.031);
  block(head, skinShadow, 0.012, 0.098, -0.163, 0.078, 0.015, 0.004);

  const arms: Array<{ side: number; shoulder: THREE.Group; elbow: THREE.Group }> = [];
  const legs: Array<{ side: number; thigh: THREE.Group; knee: THREE.Group; ankle: THREE.Group }> = [];
  for (const side of [-1, 1]) {
    block(head, hair, side * 0.177, 0.25, 0.024, 0.034, 0.091, 0.20);
    block(head, skin, side * 0.18, 0.164, 0.012, 0.05, 0.081, 0.083);
    block(head, hair, side * 0.083, 0.193, -0.163, 0.044, 0.034, 0.006);

    const shoulder = pivot(torso, side * 0.325, 0.4, 0);
    block(shoulder, shirtLight, 0, -0.095, 0, 0.173, 0.233, 0.212, true);
    block(shoulder, piping, 0, -0.196, 0, 0.176, 0.027, 0.214);
    const elbow = pivot(shoulder, 0, -0.226, 0);
    block(elbow, skin, 0, -0.119, 0, 0.128, 0.247, 0.149, true);
    if (side > 0) {
      block(elbow, pants, 0, -0.166, 0, 0.131, 0.048, 0.154);
      block(elbow, cream, 0, -0.166, 0.08, 0.047, 0.031, 0.011);
    }
    arms.push({ side, shoulder, elbow });

    const thigh = pivot(hips, side * 0.113, -0.02, 0);
    block(thigh, pants, 0, -0.156, 0, 0.211, 0.363, 0.226, true);
    block(thigh, pantsLight, side * 0.106, -0.159, 0.02, 0.015, 0.183, 0.15);
    const knee = pivot(thigh, 0, -0.333, 0);
    block(knee, pants, 0, -0.183, 0.005, 0.176, 0.372, 0.188, true);
    const ankle = pivot(knee, 0, -0.365, 0);
    block(ankle, shoe, 0, -0.08, -0.051, 0.185, 0.173, 0.315, true);
    block(ankle, sole, 0, -0.159, -0.051, 0.192, 0.041, 0.325);
    block(ankle, piping, 0, -0.102, 0.108, 0.134, 0.065, 0.018);
    legs.push({ side, thigh, knee, ankle });
  }

  const leftHand = arms[0].elbow;
  const hand = arms[1].elbow;
  const pistol = pivot(hand, 0, -0.25, 0, true);
  pistol.rotation.x = -Math.PI / 2;
  block(pistol, pants, 0, 0, -0.09, 0.09, 0.12, 0.28);
  block(pistol, hair, 0, -0.075, 0, 0.08, 0.16, 0.1);
  pistol.visible = false;

  const phoneProp = pivot(hand, 0, -0.24, -0.06, true);
  block(phoneProp, hair, 0, 0, 0, 0.085, 0.15, 0.025);
  block(phoneProp, shirtLight, 0, 0, -0.015, 0.065, 0.11, 0.01);
  phoneProp.visible = false;

  const coffeeProp = pivot(leftHand, 0, -0.25, -0.05, true);
  block(coffeeProp, shoe, 0, 0, 0, 0.09, 0.13, 0.09);
  block(coffeeProp, hair, 0, 0.075, 0, 0.1, 0.025, 0.1);
  coffeeProp.visible = false;

  const bagProp = pivot(leftHand, -0.05, -0.34, 0, true);
  block(bagProp, piping, 0, 0, 0, 0.14, 0.24, 0.20);
  block(bagProp, cream, 0, 0.13, 0, 0.03, 0.06, 0.12);
  bagProp.visible = false;

  const briefcaseProp = pivot(leftHand, -0.04, -0.35, 0, true);
  block(briefcaseProp, pants, 0, 0, 0, 0.10, 0.25, 0.34);
  block(briefcaseProp, hair, 0, 0.14, 0, 0.04, 0.04, 0.12);
  briefcaseProp.visible = false;

  // One single InstancedMesh per avatar (1 draw call instead of 16)
  const batch = new THREE.InstancedMesh(sharedBoxGeometry, sharedAvatarMaterial, parts.length);
  batch.castShadow = true;
  batch.receiveShadow = true;
  for (const part of parts) {
    batch.setColorAt(part.index, part.color);
  }
  batch.instanceColor!.needsUpdate = true;
  mesh.add(batch);

  function syncBatchMatrices() {
    for (let i = 0; i < pivots.length; i++) {
      const node = pivots[i];
      if (node.parent?.hidden || (node.isProp && !node.group.visible)) {
        node.hidden = true;
        continue;
      }
      node.hidden = false;
      node.group.updateMatrix();
      if (node.parent) {
        node.netMatrix.multiplyMatrices(node.parent.netMatrix, node.group.matrix);
      } else {
        node.netMatrix.copy(node.group.matrix);
      }
    }
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.pivot.hidden) {
        batch.setMatrixAt(part.index, ZERO_MATRIX);
      } else {
        tempMatrix.multiplyMatrices(part.pivot.netMatrix, part.localMatrix);
        batch.setMatrixAt(part.index, tempMatrix);
      }
    }
    batch.instanceMatrix.needsUpdate = true;
  }

  let phase = 0;
  let effort = 0;
  let airborne = 0;
  const upperWeights = { aim: 0, handsUp: 0, phone: 0, hurt: 0 };

  function animate({ effort: targetEffort, sprint, verticalSpeed, grounded, action = 'relaxed', armed = false, recoil = 0, carry = 'none' }: AvatarPose, dt: number) {
    effort = THREE.MathUtils.damp(effort, targetEffort, 13, dt);
    airborne = THREE.MathUtils.damp(airborne, grounded ? 0 : 1, 17, dt);
    for (const pose of ['aim', 'handsUp', 'phone', 'hurt'] as const) {
      upperWeights[pose] = THREE.MathUtils.damp(upperWeights[pose], action === pose ? 1 : 0, 12, dt);
    }
    pistol.visible = armed;
    phoneProp.visible = !armed && (action === 'phone' || carry === 'phone');
    coffeeProp.visible = carry === 'coffee';
    bagProp.visible = carry === 'bag';
    briefcaseProp.visible = carry === 'briefcase';
    phase += dt * (8.4 + sprint * 4.8);

    const stride = Math.sin(phase) * effort * (1 - airborne);
    const bob = Math.cos(phase * 2) * effort * (1 - airborne);
    const breath = Math.sin(phase * 0.25) * (1 - effort) * 0.012;
    hips.position.y = 0.9 + bob * (0.019 + sprint * 0.022) + breath;
    torso.rotation.x = -effort * (0.06 + sprint * 0.15) - airborne * 0.11;
    torso.rotation.z = stride * 0.035;
    head.rotation.x = -torso.rotation.x * 0.65;
    head.rotation.z = -torso.rotation.z * 0.5;

    const weight = upperWeights.aim + upperWeights.handsUp + upperWeights.phone + upperWeights.hurt;
    for (const { side, shoulder, elbow } of arms) {
      shoulder.rotation.x = -stride * side * (0.43 + sprint * 0.4) + airborne * 0.55;
      shoulder.rotation.z = side * (0.11 + airborne * 0.18);
      elbow.rotation.x = 0.12 + effort * (0.14 + sprint * 0.54) + airborne * 0.18;
      if (side > 0 || action !== 'phone') {
        shoulder.rotation.x = shoulder.rotation.x * (1 - weight) + upperWeights.aim * (1.5 + recoil)
          + upperWeights.handsUp * 2.6 + upperWeights.phone * 0.8 + upperWeights.hurt * 0.4;
        elbow.rotation.x = elbow.rotation.x * (1 - weight) + upperWeights.phone * 1.4
          + (weight - upperWeights.phone) * 0.15;
      }
      if (side < 0 && carry === 'coffee' && weight < 0.2) {
        shoulder.rotation.x = 0.42;
        elbow.rotation.x = 0.85;
      }
    }
    for (const { side, thigh, knee, ankle } of legs) {
      const swing = stride * side;
      thigh.rotation.x = swing * (0.55 + sprint * 0.32) + airborne * (side > 0 ? 0.49 : -0.19);
      knee.rotation.x = -Math.max(0, -swing) * (0.86 + sprint * 0.3)
        - airborne * (verticalSpeed > 0 ? 0.4 : 0.23);
      ankle.rotation.x = -thigh.rotation.x * 0.25 - knee.rotation.x * 0.2;
    }

    syncBatchMatrices();
  }

  function reset() {
    phase = 0;
    effort = 0;
    airborne = 0;
    for (const pose of ['aim', 'handsUp', 'phone', 'hurt'] as const) upperWeights[pose] = 0;
    animate({ effort: 0, sprint: 0, verticalSpeed: 0, grounded: true }, 0);
    batch.computeBoundingSphere();
  }

  reset();

  return {
    mesh,
    animate,
    reset,
    setShadow(enabled: boolean) {
      if (batch.castShadow !== enabled) batch.castShadow = enabled;
    },
    setOpacity(_value: number) {
      // Opaque shared material prevents mid-frame shader recompilation hitches
    },
    dispose() {
      batch.dispose();
      mesh.removeFromParent();
    },
  };
}
