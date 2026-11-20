import * as THREE from 'three';

export interface AvatarPose {
  effort: number;
  sprint: number;
  verticalSpeed: number;
  grounded: boolean;
  aiming?: boolean;
  weapon?: 'unarmed' | 'pistol' | 'carbine';
}

export function createAvatar(scene: THREE.Scene) {
  const mesh = new THREE.Group();
  mesh.name = 'Player avatar';
  scene.add(mesh);

  const geometry = new THREE.BoxGeometry();
  const materials: THREE.MeshStandardMaterial[] = [];
  const color = (hex: number, roughness = 0.85) => {
    const material = new THREE.MeshStandardMaterial({ color: hex, roughness });
    materials.push(material);
    return material;
  };
  const skin = color(0xbd7855);
  const skinShadow = color(0xa96048);
  const hair = color(0x211927);
  const hairLight = color(0x322332);
  const shirt = color(0x247c81);
  const shirtLight = color(0x318a8b);
  const piping = color(0xf2a772);
  const cream = color(0xffe2a0);
  const pants = color(0x333848);
  const pantsLight = color(0x4a4b55);
  const shoe = color(0xeedfc9);
  const sole = color(0x867676);
  const gunMetal = color(0x20252f, 0.45);
  const gunAccent = color(0x525d6b, 0.35);

  function block(
    parent: THREE.Object3D,
    material: THREE.MeshStandardMaterial,
    x: number, y: number, z: number,
    width: number, height: number, depth: number,
    castsShadow = false,
  ) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.scale.set(width, height, depth);
    part.castShadow = castsShadow;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  }

  function pivot(parent: THREE.Object3D, x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    return group;
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
  let weaponMount: THREE.Group | undefined;
  let carbineBarrel: THREE.Mesh | undefined;
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
      weaponMount = pivot(elbow, 0, -0.23, -0.02);
      block(weaponMount, gunMetal, 0, -0.02, -0.03, 0.06, 0.11, 0.075, true);
      block(weaponMount, gunAccent, 0, 0.03, -0.13, 0.055, 0.065, 0.22, true);
      carbineBarrel = block(weaponMount, gunMetal, 0, 0.03, -0.32, 0.045, 0.05, 0.24, true);
      weaponMount.visible = false;
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

  let phase = 0;
  let effort = 0;
  let airborne = 0;
  let aimBlend = 0;

  function animate({
    effort: targetEffort,
    sprint,
    verticalSpeed,
    grounded,
    aiming = false,
    weapon = 'unarmed',
  }: AvatarPose, dt: number) {
    effort = THREE.MathUtils.damp(effort, targetEffort, 13, dt);
    airborne = THREE.MathUtils.damp(airborne, grounded ? 0 : 1, 17, dt);
    const hasGun = weapon !== 'unarmed';
    aimBlend = THREE.MathUtils.damp(aimBlend, hasGun && aiming ? 1 : 0, 18, dt);
    phase += dt * (8.4 + sprint * 4.8);

    if (weaponMount) {
      weaponMount.visible = hasGun;
      weaponMount.rotation.x = aimBlend * -1.45;
      if (carbineBarrel) carbineBarrel.visible = weapon === 'carbine';
    }

    const stride = Math.sin(phase) * effort * (1 - airborne);
    const bob = Math.cos(phase * 2) * effort * (1 - airborne);
    const breath = Math.sin(phase * 0.25) * (1 - effort) * 0.012;
    hips.position.y = 0.9 + bob * (0.019 + sprint * 0.022) + breath;
    torso.rotation.x = -effort * (0.06 + sprint * 0.15) - airborne * 0.11;
    torso.rotation.z = stride * 0.035;
    head.rotation.x = -torso.rotation.x * 0.65;
    head.rotation.z = -torso.rotation.z * 0.5;

    for (const { side, shoulder, elbow } of arms) {
      const normalShoulder = -stride * side * (0.43 + sprint * 0.4) + airborne * 0.55;
      const normalElbow = 0.12 + effort * (0.14 + sprint * 0.54) + airborne * 0.18;
      if (side > 0 && hasGun) {
        const armedShoulder = Math.max(normalShoulder, 0.12) * (1 - aimBlend) + 1.48 * aimBlend;
        shoulder.rotation.x = armedShoulder;
        shoulder.rotation.z = side * (0.11 + airborne * 0.18) * (1 - aimBlend);
        elbow.rotation.x = normalElbow * (1 - aimBlend) + 0.08 * aimBlend;
      } else {
        shoulder.rotation.x = normalShoulder;
        shoulder.rotation.z = side * (0.11 + airborne * 0.18);
        elbow.rotation.x = normalElbow;
      }
    }
    for (const { side, thigh, knee, ankle } of legs) {
      const swing = stride * side;
      thigh.rotation.x = swing * (0.55 + sprint * 0.32) + airborne * (side > 0 ? 0.49 : -0.19);
      knee.rotation.x = -Math.max(0, -swing) * (0.86 + sprint * 0.3)
        - airborne * (verticalSpeed > 0 ? 0.4 : 0.23);
      ankle.rotation.x = -thigh.rotation.x * 0.25 - knee.rotation.x * 0.2;
    }
  }

  function reset() {
    phase = 0;
    effort = 0;
    airborne = 0;
    aimBlend = 0;
    animate({ effort: 0, sprint: 0, verticalSpeed: 0, grounded: true, aiming: false, weapon: 'unarmed' }, 0);
  }

  reset();

  return {
    mesh,
    animate,
    reset,
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
