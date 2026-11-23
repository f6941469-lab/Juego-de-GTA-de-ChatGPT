import * as THREE from 'three';
import type { ActorSample, CinematicActorId, CinematicProp } from './types';

const sharedBoxGeometry = new THREE.BoxGeometry();
const sharedRigMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 });
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

export interface ActorRigSpec {
  id: CinematicActorId;
  shirt: number;
  shirtLight: number;
  accent: number;
  pants: number;
  pantsLight: number;
  skin: number;
  skinShadow: number;
  hair: number;
  hairLight: number;
  shoe: number;
  style: 'leo' | 'valeria' | 'officer';
}

export const ACTOR_SPECS: Record<CinematicActorId, ActorRigSpec> = {
  leo: {
    id: 'leo',
    shirt: 0x247c81,
    shirtLight: 0x2d969c,
    accent: 0xf2a772,
    pants: 0x333848,
    pantsLight: 0x4a4b55,
    skin: 0xbd7855,
    skinShadow: 0xa96048,
    hair: 0x211927,
    hairLight: 0x322332,
    shoe: 0xeedfc9,
    style: 'leo',
  },
  valeria: {
    id: 'valeria',
    shirt: 0xc42b52,
    shirtLight: 0xdf456c,
    accent: 0xffd57e,
    pants: 0x252836,
    pantsLight: 0x3a3e52,
    skin: 0xc98562,
    skinShadow: 0xb06b4c,
    hair: 0x1b131e,
    hairLight: 0x382235,
    shoe: 0xf5e8d8,
    style: 'valeria',
  },
  officer: {
    id: 'officer',
    shirt: 0x264166,
    shirtLight: 0x355885,
    accent: 0xf3cc58,
    pants: 0x1c2536,
    pantsLight: 0x2b384f,
    skin: 0xb87654,
    skinShadow: 0x9c5e42,
    hair: 0x2a2428,
    hairLight: 0x453d42,
    shoe: 0x1a1c22,
    style: 'officer',
  },
};

function wrapAngle(angle: number): number {
  let a = (angle + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

export function createCinematicActorRig(parentScene: THREE.Object3D, spec: ActorRigSpec) {
  const root = new THREE.Group();
  root.name = `CinematicActor:${spec.id}`;
  parentScene.add(root);

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
    w: number, h: number, d: number,
  ) {
    const pivotNode = pivotMap.get(parent)!;
    const localMatrix = new THREE.Matrix4().compose(
      tempPos.set(x, y, z),
      tempQuat.identity(),
      tempScale.set(w, h, d),
    );
    parts.push({
      pivot: pivotNode,
      localMatrix,
      color: new THREE.Color(hexColor),
      index: parts.length,
    });
  }

  const cream = 0xffe2a0;
  const sole = 0x5c5356;
  const slim = spec.style === 'valeria' ? 0.88 : spec.style === 'officer' ? 1.06 : 1.0;

  const hips = pivot(root, 0, 0.9, 0);
  block(hips, spec.pants, 0, 0.008, 0, 0.44 * slim, 0.13, 0.25);
  if (spec.style === 'officer') {
    // Tactical belt & gold buckle
    block(hips, 0x151820, 0, 0.055, 0, 0.48 * slim, 0.06, 0.275);
    block(hips, spec.accent, 0, 0.055, -0.142, 0.08, 0.055, 0.02);
  }

  const torso = pivot(hips, 0, 0.03, 0);
  block(torso, spec.shirt, 0, 0.24, 0, 0.485 * slim, 0.45, 0.27);
  block(torso, spec.shirtLight, 0, 0.422, 0, 0.505 * slim, 0.09, 0.278);
  block(torso, spec.accent, 0, 0.052, 0, 0.488 * slim, 0.034, 0.274);
  block(torso, spec.skinShadow, 0, 0.482, 0, 0.155, 0.105, 0.155);

  if (spec.style === 'leo') {
    // Sunset coastal emblem on Leo's back + chest pocket accent
    block(torso, cream, 0.12, 0.31, -0.138, 0.064, 0.018, 0.006);
    block(torso, cream, 0, 0.294, 0.138, 0.105, 0.088, 0.006);
    block(torso, spec.accent, 0, 0.258, 0.142, 0.19, 0.018, 0.006);
  } else if (spec.style === 'valeria') {
    // Open crimson jacket lapels over cream top
    block(torso, 0xfff0d4, 0, 0.25, -0.137, 0.16, 0.40, 0.012);
    block(torso, spec.shirtLight, -0.125, 0.27, -0.141, 0.09, 0.38, 0.016);
    block(torso, spec.shirtLight, 0.125, 0.27, -0.141, 0.09, 0.38, 0.016);
    // Gold pendant
    block(torso, spec.accent, 0, 0.385, -0.145, 0.045, 0.045, 0.012);
  } else if (spec.style === 'officer') {
    // Police tie, chest badge, shoulder epaulettes
    block(torso, 0x141b28, 0, 0.27, -0.14, 0.055, 0.31, 0.012);
    block(torso, spec.accent, 0.14, 0.33, -0.142, 0.072, 0.082, 0.016);
    block(torso, spec.accent, -0.22, 0.468, 0, 0.09, 0.024, 0.12);
    block(torso, spec.accent, 0.22, 0.468, 0, 0.09, 0.024, 0.12);
  }

  const head = pivot(torso, 0, 0.485, 0);
  block(head, spec.skin, 0, 0.178, 0, 0.335, 0.315, 0.315);
  block(head, spec.skin, 0, 0.148, -0.163, 0.052, 0.058, 0.03);
  // Expressive brow & mouth blocks
  block(head, spec.hair, -0.08, 0.228, -0.16, 0.072, 0.02, 0.008);
  block(head, spec.hair, 0.08, 0.228, -0.16, 0.072, 0.02, 0.008);
  block(head, spec.style === 'valeria' ? 0xb84158 : spec.skinShadow, 0, 0.095, -0.16, 0.082, 0.018, 0.008);

  let ponytail: THREE.Group | undefined;
  if (spec.style === 'valeria') {
    // Long styled dark hair + swinging ponytail pivot
    block(head, spec.hair, 0, 0.322, 0.015, 0.365, 0.11, 0.345);
    block(head, spec.hairLight, -0.07, 0.375, -0.01, 0.18, 0.045, 0.28);
    block(head, spec.hair, -0.165, 0.18, 0.03, 0.055, 0.28, 0.22);
    block(head, spec.hair, 0.165, 0.18, 0.03, 0.055, 0.28, 0.22);
    block(head, spec.hair, 0, 0.20, 0.15, 0.355, 0.24, 0.085);
    // Gold earrings
    block(head, spec.accent, -0.185, 0.12, -0.01, 0.024, 0.05, 0.024);
    block(head, spec.accent, 0.185, 0.12, -0.01, 0.024, 0.05, 0.024);
    ponytail = pivot(head, 0, 0.21, 0.195);
    block(ponytail, spec.accent, 0, 0.01, 0, 0.09, 0.05, 0.05);
    block(ponytail, spec.hair, 0, -0.16, 0.035, 0.14, 0.32, 0.11);
    block(ponytail, spec.hairLight, 0, -0.26, 0.055, 0.10, 0.16, 0.08);
  } else if (spec.style === 'officer') {
    // Short neat hair + police peaked cap with gold badge
    block(head, spec.hair, 0, 0.24, 0.135, 0.35, 0.12, 0.07);
    block(head, 0x1a2d4a, 0, 0.355, 0.01, 0.385, 0.125, 0.365);
    block(head, 0x101824, 0, 0.305, -0.165, 0.365, 0.032, 0.15); // visor
    block(head, spec.accent, 0, 0.37, -0.175, 0.075, 0.06, 0.02); // cap emblem
    // Sunglasses
    block(head, 0x141820, 0, 0.195, -0.164, 0.28, 0.055, 0.02);
  } else {
    // Leo hair
    block(head, spec.hair, 0, 0.325, 0.016, 0.365, 0.108, 0.345);
    block(head, spec.hair, 0, 0.235, 0.142, 0.36, 0.138, 0.072);
    block(head, spec.hairLight, -0.072, 0.378, -0.007, 0.19, 0.045, 0.29);
    block(head, spec.hairLight, 0.102, 0.368, -0.038, 0.13, 0.041, 0.22);
    block(head, spec.hair, 0.09, 0.274, -0.148, 0.165, 0.048, 0.048);
  }

  const arms: Array<{ side: number; shoulder: THREE.Group; elbow: THREE.Group }> = [];
  const legs: Array<{ side: number; thigh: THREE.Group; knee: THREE.Group; ankle: THREE.Group }> = [];

  for (const side of [-1, 1]) {
    if (spec.style !== 'valeria') {
      block(head, spec.hair, side * 0.174, 0.25, 0.024, 0.034, 0.09, 0.19);
    }
    block(head, spec.skin, side * 0.175, 0.164, 0.012, 0.048, 0.08, 0.08);
    if (spec.style !== 'officer') {
      block(head, spec.hair, side * 0.082, 0.193, -0.16, 0.042, 0.034, 0.008);
    }

    const shoulder = pivot(torso, side * (0.315 * slim + 0.01), 0.398, 0);
    block(shoulder, spec.shirtLight, 0, -0.095, 0, 0.165 * slim, 0.23, 0.20);
    block(shoulder, spec.accent, 0, -0.195, 0, 0.168 * slim, 0.026, 0.204);
    const elbow = pivot(shoulder, 0, -0.225, 0);
    const forearmColor = spec.style === 'valeria' ? spec.shirt : spec.skin;
    block(elbow, forearmColor, 0, -0.105, 0, 0.125 * slim, 0.20, 0.145 * slim);
    // Hand block
    block(elbow, spec.skin, 0, -0.225, 0, 0.11 * slim, 0.085, 0.12 * slim);
    if (spec.style === 'leo' && side > 0) {
      block(elbow, spec.pants, 0, -0.166, 0, 0.132, 0.046, 0.154);
      block(elbow, cream, 0, -0.166, 0.078, 0.046, 0.03, 0.012);
    }
    arms.push({ side, shoulder, elbow });

    const thigh = pivot(hips, side * 0.112 * slim, -0.02, 0);
    block(thigh, spec.pants, 0, -0.156, 0, 0.205 * slim, 0.362, 0.22);
    block(thigh, spec.pantsLight, side * 0.102 * slim, -0.159, 0.02, 0.016, 0.18, 0.145);
    const knee = pivot(thigh, 0, -0.333, 0);
    block(knee, spec.pants, 0, -0.183, 0.005, 0.172 * slim, 0.37, 0.184);
    const ankle = pivot(knee, 0, -0.365, 0);
    block(ankle, spec.shoe, 0, -0.08, -0.05, 0.18 * slim, 0.17, 0.31);
    block(ankle, sole, 0, -0.158, -0.05, 0.188 * slim, 0.04, 0.32);
    legs.push({ side, thigh, knee, ankle });
  }

  // Props attached to hands
  const leftElbow = arms[0].elbow;
  const rightElbow = arms[1].elbow;

  const lockpickProp = pivot(rightElbow, 0, -0.25, -0.08, true);
  block(lockpickProp, 0xd4dbe3, 0, 0, -0.09, 0.028, 0.028, 0.24);
  block(lockpickProp, 0x2a2f3a, 0, 0, 0.05, 0.048, 0.048, 0.12);

  const badgeProp = pivot(rightElbow, 0, -0.25, -0.06, true);
  block(badgeProp, 0x1a1e28, 0, 0, 0, 0.11, 0.14, 0.03);
  block(badgeProp, 0xf3cc58, 0, 0.01, -0.018, 0.065, 0.075, 0.012);

  const flashlightProp = pivot(leftElbow, 0, -0.25, -0.06, true);
  block(flashlightProp, 0x1e222b, 0, 0, -0.04, 0.065, 0.065, 0.24);
  block(flashlightProp, 0xfff2b2, 0, 0, -0.165, 0.082, 0.082, 0.025);

  const coffeeProp = pivot(leftElbow, 0, -0.25, -0.05, true);
  block(coffeeProp, 0xf2e7d5, 0, 0, 0, 0.09, 0.135, 0.09);
  block(coffeeProp, 0x2e2629, 0, 0.075, 0, 0.10, 0.025, 0.10);

  const bagProp = pivot(leftElbow, -0.06, -0.35, 0, true);
  block(bagProp, 0xf2a772, 0, 0, 0, 0.15, 0.26, 0.22);
  block(bagProp, cream, 0, 0.14, 0, 0.035, 0.065, 0.12);

  const keysProp = pivot(rightElbow, 0, -0.25, -0.06, true);
  block(keysProp, 0xf3cc58, 0, 0, 0, 0.055, 0.055, 0.018);
  block(keysProp, 0xcad2dc, 0, -0.05, -0.02, 0.024, 0.085, 0.014);

  const propGroups: Record<Exclude<CinematicProp, 'none'>, THREE.Group> = {
    lockpick: lockpickProp,
    badge: badgeProp,
    flashlight: flashlightProp,
    coffee: coffeeProp,
    bag: bagProp,
    keys: keysProp,
  };
  Object.values(propGroups).forEach((g) => { g.visible = false; });

  const batch = new THREE.InstancedMesh(sharedBoxGeometry, sharedRigMaterial, parts.length);
  batch.castShadow = true;
  batch.receiveShadow = true;
  batch.frustumCulled = false;
  for (const part of parts) batch.setColorAt(part.index, part.color);
  batch.instanceColor!.needsUpdate = true;
  root.add(batch);

  function syncMatrices() {
    for (let i = 0; i < pivots.length; i++) {
      const node = pivots[i];
      if (node.parent?.hidden || (node.isProp && !node.group.visible)) {
        node.hidden = true;
        continue;
      }
      node.hidden = false;
      node.group.updateMatrix();
      if (node.parent) node.netMatrix.multiplyMatrices(node.parent.netMatrix, node.group.matrix);
      else node.netMatrix.copy(node.group.matrix);
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

  function applySample(sample: ActorSample, clock: number) {
    root.visible = sample.visible;
    if (!sample.visible) return;

    root.position.set(sample.x, sample.y, sample.z);
    root.rotation.set(0, -sample.heading, 0);

    // Toggle active prop
    const prop = sample.prop ?? 'none';
    for (const [key, group] of Object.entries(propGroups)) {
      group.visible = key === prop;
    }

    const t = sample.actionT ?? 0;
    const talk = sample.talking ?? 0;
    const talkWave = Math.sin(clock * 11.5) * talk;
    const talkNod = Math.sin(clock * 7.2) * talk;
    const breath = Math.sin(clock * 2.4) * 0.014;

    // Reset all joint rotations to neutral
    hips.position.set(0, 0.9 + breath, 0);
    hips.rotation.set(0, 0, 0);
    torso.rotation.set(0, sample.torsoYaw ?? 0, 0);
    head.rotation.set(0, 0, 0);

    const leftArm = arms[0];
    const rightArm = arms[1];
    const leftLeg = legs[0];
    const rightLeg = legs[1];

    leftArm.shoulder.rotation.set(0, 0, -0.11);
    leftArm.elbow.rotation.set(0.14, 0, 0);
    rightArm.shoulder.rotation.set(0, 0, 0.11);
    rightArm.elbow.rotation.set(0.14, 0, 0);

    leftLeg.thigh.rotation.set(0, 0, 0);
    leftLeg.knee.rotation.set(0, 0, 0);
    leftLeg.ankle.rotation.set(0, 0, 0);
    rightLeg.thigh.rotation.set(0, 0, 0);
    rightLeg.knee.rotation.set(0, 0, 0);
    rightLeg.ankle.rotation.set(0, 0, 0);

    // Detailed expressive animation presets
    switch (sample.pose) {
      case 'idle': {
        torso.rotation.z = Math.sin(clock * 1.4) * 0.025;
        if (talk > 0.05) {
          rightArm.shoulder.rotation.x = 0.35 + talkWave * 0.25;
          rightArm.elbow.rotation.x = 0.72 + talkWave * 0.18;
          leftArm.shoulder.rotation.x = 0.22 - talkWave * 0.15;
          leftArm.elbow.rotation.x = 0.55;
        }
        break;
      }

      case 'sneak_lockpick': {
        // Crouched down working intensely on the car lock while glancing around
        hips.position.y = 0.64 + Math.sin(clock * 5) * 0.015;
        torso.rotation.x = -0.34;
        torso.rotation.y = Math.sin(clock * 2.6) * 0.12;
        leftLeg.thigh.rotation.x = 0.72;
        leftLeg.knee.rotation.x = -1.28;
        leftLeg.ankle.rotation.x = 0.55;
        rightLeg.thigh.rotation.x = 0.55;
        rightLeg.knee.rotation.x = -1.12;
        rightLeg.ankle.rotation.x = 0.55;
        // Right arm jiggling lockpick, left arm bracing door
        const jiggle = Math.sin(clock * 18) * 0.16;
        rightArm.shoulder.rotation.set(1.05 + jiggle * 0.35, -0.25, 0.12);
        rightArm.elbow.rotation.x = 0.75 + jiggle;
        leftArm.shoulder.rotation.set(0.92, 0.28, -0.18);
        leftArm.elbow.rotation.x = 0.62;
        // Nervous head glance left and right
        head.rotation.y = Math.sin(clock * 1.7) * 0.58;
        head.rotation.x = 0.24;
        break;
      }

      case 'walk':
      case 'cautious_step': {
        const speedMul = sample.pose === 'cautious_step' ? 5.8 : 8.6;
        const amp = sample.pose === 'cautious_step' ? 0.38 : 0.58;
        const phase = clock * speedMul;
        const stride = Math.sin(phase);
        const bob = Math.cos(phase * 2);
        hips.position.y = 0.9 + bob * 0.025;
        torso.rotation.x = sample.pose === 'cautious_step' ? -0.14 : -0.06;
        torso.rotation.z = stride * 0.04;
        leftLeg.thigh.rotation.x = -stride * amp;
        leftLeg.knee.rotation.x = -Math.max(0, stride) * 0.72;
        rightLeg.thigh.rotation.x = stride * amp;
        rightLeg.knee.rotation.x = -Math.max(0, -stride) * 0.72;
        if (sample.pose === 'cautious_step') {
          // Officer hand hovering near tactical belt, left arm holding flashlight
          rightArm.shoulder.rotation.set(0.18, 0, 0.26);
          rightArm.elbow.rotation.x = 0.85;
          leftArm.shoulder.rotation.set(0.75, 0.1, -0.15);
          leftArm.elbow.rotation.x = 0.68;
        } else {
          leftArm.shoulder.rotation.x = stride * 0.48;
          rightArm.shoulder.rotation.x = -stride * 0.48;
          leftArm.elbow.rotation.x = 0.24;
          rightArm.elbow.rotation.x = 0.24;
        }
        break;
      }

      case 'run': {
        const phase = clock * 13.8;
        const stride = Math.sin(phase);
        const bob = Math.cos(phase * 2);
        hips.position.y = 0.88 + bob * 0.048;
        torso.rotation.x = -0.22;
        torso.rotation.z = stride * 0.065;
        leftLeg.thigh.rotation.x = -stride * 0.88;
        leftLeg.knee.rotation.x = -Math.max(0, stride) * 1.18;
        rightLeg.thigh.rotation.x = stride * 0.88;
        rightLeg.knee.rotation.x = -Math.max(0, -stride) * 1.18;
        leftArm.shoulder.rotation.x = stride * 0.95;
        leftArm.elbow.rotation.x = 0.95;
        rightArm.shoulder.rotation.x = -stride * 0.95;
        rightArm.elbow.rotation.x = 0.95;
        break;
      }

      case 'argue_point': {
        // Heated pointing finger & lean forward
        const jab = Math.sin(clock * 8.5) * 0.22;
        hips.position.y = 0.89 + breath;
        torso.rotation.x = -0.12 - Math.abs(jab) * 0.2;
        torso.rotation.y = -0.18 + jab * 0.3;
        rightArm.shoulder.rotation.set(1.48 + jab, -0.12, 0.14);
        rightArm.elbow.rotation.x = 0.18 - jab * 0.4;
        leftArm.shoulder.rotation.set(0.32, 0.15, -0.34);
        leftArm.elbow.rotation.x = 0.92;
        leftLeg.thigh.rotation.x = 0.12;
        rightLeg.thigh.rotation.x = -0.14;
        break;
      }

      case 'argue_hands': {
        // Dramatic wide open-palm "are you kidding me?" gestures
        const sweep = Math.sin(clock * 6.8);
        torso.rotation.x = -0.05;
        torso.rotation.z = sweep * 0.07;
        leftArm.shoulder.rotation.set(0.82 + sweep * 0.22, 0.28, -0.58 - Math.abs(sweep) * 0.2);
        leftArm.elbow.rotation.x = 0.65;
        rightArm.shoulder.rotation.set(0.86 - sweep * 0.22, -0.28, 0.58 + Math.abs(sweep) * 0.2);
        rightArm.elbow.rotation.x = 0.62;
        break;
      }

      case 'plead': {
        // Dramatic "fake boyfriend" soap-opera pleading posture
        const sway = Math.sin(clock * 5.2);
        torso.rotation.x = -0.14;
        torso.rotation.z = sway * 0.08;
        leftArm.shoulder.rotation.set(1.15 + sway * 0.18, 0.35, -0.32);
        leftArm.elbow.rotation.x = 0.78;
        rightArm.shoulder.rotation.set(1.18 - sway * 0.18, -0.35, 0.32);
        rightArm.elbow.rotation.x = 0.78;
        head.rotation.z = sway * 0.16;
        break;
      }

      case 'arms_crossed': {
        // Defiant crossed arms, weight shifted on one hip
        hips.rotation.z = 0.06;
        torso.rotation.z = -0.06;
        torso.rotation.y = 0.14;
        leftArm.shoulder.rotation.set(0.58, 0.68, -0.22);
        leftArm.elbow.rotation.set(1.25, 0, -0.25);
        rightArm.shoulder.rotation.set(0.62, -0.68, 0.22);
        rightArm.elbow.rotation.set(1.25, 0, 0.25);
        leftLeg.thigh.rotation.z = -0.07;
        rightLeg.thigh.rotation.z = 0.07;
        break;
      }

      case 'inspect': {
        // Officer leaning in suspiciously, flashing badge / holding flashlight
        torso.rotation.x = -0.16;
        rightArm.shoulder.rotation.set(1.15 + Math.sin(clock * 3.5) * 0.08, -0.12, 0.12);
        rightArm.elbow.rotation.x = 0.65;
        leftArm.shoulder.rotation.set(0.45, 0.15, -0.22);
        leftArm.elbow.rotation.x = 0.95;
        head.rotation.y = Math.sin(clock * 1.9) * 0.28;
        break;
      }

      case 'punch_windup': {
        // Coiling back hips and right fist before the knockout blow
        const p = THREE.MathUtils.clamp(t, 0, 1);
        hips.position.y = 0.85 - p * 0.06;
        hips.rotation.y = -p * 0.45;
        torso.rotation.y = -p * 0.68;
        torso.rotation.x = -0.12;
        rightArm.shoulder.rotation.set(0.45 + p * 0.45, -0.55 * p, 0.65 * p + 0.15);
        rightArm.elbow.rotation.x = 1.45;
        leftArm.shoulder.rotation.set(0.95 * p + 0.2, 0.2, -0.25);
        leftArm.elbow.rotation.x = 0.75;
        leftLeg.thigh.rotation.x = 0.28 * p;
        leftLeg.knee.rotation.x = -0.35 * p;
        rightLeg.thigh.rotation.x = -0.28 * p;
        rightLeg.knee.rotation.x = -0.25 * p;
        break;
      }

      case 'punch_strike': {
        // Explosive rotational right cross punch + follow-through!
        const p = THREE.MathUtils.clamp(t, 0, 1);
        const snap = 1 - Math.pow(1 - p, 3);
        hips.position.y = 0.84 + Math.sin(snap * Math.PI) * 0.05;
        hips.rotation.y = THREE.MathUtils.lerp(-0.45, 0.58, snap);
        torso.rotation.y = THREE.MathUtils.lerp(-0.68, 0.82, snap);
        torso.rotation.x = -0.24 * snap;
        // Right fist punches straight forward at head height
        rightArm.shoulder.rotation.set(THREE.MathUtils.lerp(0.85, 1.72, snap), THREE.MathUtils.lerp(-0.55, 0.25, snap), 0.12);
        rightArm.elbow.rotation.x = THREE.MathUtils.lerp(1.45, 0.08, snap);
        // Left guard pulls back for counter-torque
        leftArm.shoulder.rotation.set(THREE.MathUtils.lerp(1.15, -0.35, snap), 0.25, -0.45);
        leftArm.elbow.rotation.x = 1.15;
        leftLeg.thigh.rotation.x = 0.36;
        leftLeg.knee.rotation.x = -0.44;
        rightLeg.thigh.rotation.x = -0.34;
        rightLeg.knee.rotation.x = -0.22;
        break;
      }

      case 'knockback_fall': {
        // Officer recoiling from the jaw punch, staggering back and falling flat
        const p = THREE.MathUtils.clamp(t, 0, 1);
        const ease = p * p * (3 - 2 * p);
        hips.position.y = THREE.MathUtils.lerp(0.9, 0.22, ease);
        hips.rotation.x = THREE.MathUtils.lerp(0.25, 1.48, ease); // falls backward onto back
        hips.rotation.z = Math.sin(p * Math.PI) * 0.22;
        torso.rotation.x = THREE.MathUtils.lerp(0.35, 0.08, ease);
        head.rotation.x = THREE.MathUtils.lerp(0.45, -0.15, ease);
        head.rotation.y = THREE.MathUtils.lerp(0.55, 0.25, ease);
        leftArm.shoulder.rotation.set(1.8 - ease * 0.9, 0.2, -0.95);
        leftArm.elbow.rotation.x = 0.45;
        rightArm.shoulder.rotation.set(1.6 - ease * 0.8, -0.2, 0.95);
        rightArm.elbow.rotation.x = 0.55;
        leftLeg.thigh.rotation.x = 0.55 * (1 - ease * 0.6);
        leftLeg.knee.rotation.x = -0.45;
        rightLeg.thigh.rotation.x = 0.35 * (1 - ease * 0.5);
        rightLeg.knee.rotation.x = -0.32;
        break;
      }

      case 'knocked_out': {
        // Sprawled on the pavement groaning slightly
        hips.position.y = 0.20;
        hips.rotation.x = 1.52;
        hips.rotation.z = 0.08;
        torso.rotation.x = 0.04;
        head.rotation.y = 0.32 + Math.sin(clock * 2.2) * 0.06;
        leftArm.shoulder.rotation.set(0.3, 0, -1.05);
        leftArm.elbow.rotation.x = 0.35;
        rightArm.shoulder.rotation.set(0.45, 0, 0.85);
        rightArm.elbow.rotation.x = 0.65;
        leftLeg.thigh.rotation.set(0.15, 0, -0.18);
        leftLeg.knee.rotation.x = -0.28;
        rightLeg.thigh.rotation.set(0.08, 0, 0.14);
        rightLeg.knee.rotation.x = -0.18;
        break;
      }

      case 'celebrate': {
        // High-five / celebratory cheers in neon night montage
        const pulse = Math.sin(clock * 6.5);
        hips.position.y = 0.9 + Math.abs(pulse) * 0.045;
        torso.rotation.z = pulse * 0.07;
        rightArm.shoulder.rotation.set(2.35 + pulse * 0.25, -0.15, 0.25);
        rightArm.elbow.rotation.x = 0.38;
        leftArm.shoulder.rotation.set(0.65, 0.1, -0.22);
        leftArm.elbow.rotation.x = 0.95;
        break;
      }

      case 'lean_cool': {
        // Relaxed cool stance next to the car
        hips.rotation.z = -0.06;
        torso.rotation.x = 0.06;
        leftArm.shoulder.rotation.set(0.42, 0.1, -0.18);
        leftArm.elbow.rotation.x = 0.88;
        rightArm.shoulder.rotation.set(-0.08, 0, 0.22);
        rightArm.elbow.rotation.x = 0.45;
        leftLeg.thigh.rotation.x = 0.14;
        rightLeg.thigh.rotation.x = -0.08;
        break;
      }

      case 'wave_bye': {
        const wave = Math.sin(clock * 10);
        rightArm.shoulder.rotation.set(2.25, 0, 0.38 + wave * 0.22);
        rightArm.elbow.rotation.x = 0.42 + wave * 0.18;
        leftArm.shoulder.rotation.set(0.25, 0, -0.18);
        leftArm.elbow.rotation.x = 0.45;
        break;
      }

      case 'drive_seated':
      case 'passenger_seated': {
        hips.position.y = 0.48;
        torso.rotation.x = 0.08;
        leftLeg.thigh.rotation.x = 1.42;
        leftLeg.knee.rotation.x = -1.32;
        rightLeg.thigh.rotation.x = 1.42;
        rightLeg.knee.rotation.x = -1.32;
        if (sample.pose === 'drive_seated') {
          const steer = Math.sin(clock * 3.5) * 0.14;
          leftArm.shoulder.rotation.set(1.05 + steer, 0.15, -0.12);
          leftArm.elbow.rotation.x = 0.55;
          rightArm.shoulder.rotation.set(1.05 - steer, -0.15, 0.12);
          rightArm.elbow.rotation.x = 0.55;
        } else {
          leftArm.shoulder.rotation.set(0.55, 0.12, -0.15);
          leftArm.elbow.rotation.x = 0.88;
          rightArm.shoulder.rotation.set(0.55, -0.12, 0.15);
          rightArm.elbow.rotation.x = 0.88;
        }
        break;
      }
    }

    if (sample.bodyPitch !== undefined) torso.rotation.x += sample.bodyPitch;

    // Optional look-at head tracking toward target point
    if (sample.lookAt && sample.pose !== 'knockback_fall' && sample.pose !== 'knocked_out') {
      const dx = sample.lookAt.x - sample.x;
      const dz = sample.lookAt.z - sample.z;
      const dy = sample.lookAt.y - (sample.y + 1.55);
      const dist = Math.max(0.01, Math.hypot(dx, dz));
      const targetHeading = Math.atan2(dx, -dz);
      const relYaw = wrapAngle(targetHeading - sample.heading);
      head.rotation.y = THREE.MathUtils.clamp(-relYaw, -0.78, 0.78);
      head.rotation.x = THREE.MathUtils.clamp(Math.atan2(dy, dist) * 0.75 + talkNod * 0.06, -0.32, 0.34);
    } else if (talk > 0.05) {
      head.rotation.x += talkNod * 0.08;
    }

    // Dynamic secondary motion for Valeria's ponytail
    if (ponytail) {
      const isAction = sample.pose === 'punch_strike' || sample.pose === 'run';
      ponytail.rotation.x = 0.14 + (isAction ? 0.45 : 0) + Math.sin(clock * (isAction ? 13 : 3.5)) * 0.12;
      ponytail.rotation.z = -head.rotation.y * 0.45 - torso.rotation.y * 0.35;
    }

    syncMatrices();
  }

  // Initialize neutral matrices once
  applySample({ visible: false, x: 0, y: 0, z: 0, heading: 0, pose: 'idle' }, 0);
  batch.computeBoundingSphere();

  return {
    root,
    batch,
    applySample,
    dispose() {
      batch.dispose();
      root.removeFromParent();
    },
  };
}

export type CinematicActorRig = ReturnType<typeof createCinematicActorRig>;
