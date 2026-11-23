import * as THREE from 'three';
import type { VehicleSample } from './types';

const boxGeo = new THREE.BoxGeometry();
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0.22 });
const doorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0.22 });
const wheelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

interface PartSpec {
  c: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

function buildBatch(specs: readonly PartSpec[], material: THREE.Material): THREE.InstancedMesh {
  const batch = new THREE.InstancedMesh(boxGeo, material, specs.length);
  batch.castShadow = true;
  batch.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  specs.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.set(p.w, p.h, p.d);
    dummy.updateMatrix();
    batch.setMatrixAt(i, dummy.matrix);
    batch.setColorAt(i, color.setHex(p.c));
  });
  batch.instanceMatrix.needsUpdate = true;
  batch.instanceColor!.needsUpdate = true;
  batch.computeBoundingSphere();
  return batch;
}

function createDoor(colorHex: number, trimHex: number, glassHex: number, side: -1 | 1): THREE.Group {
  // Hinge sits at the front edge of the door (z = -0.58 relative to car center)
  const hinge = new THREE.Group();
  hinge.position.set(side * 0.90, 0.56, -0.52);
  const parts: PartSpec[] = [
    { c: colorHex, x: 0, y: 0, z: 0.52, w: 0.11, h: 0.50, d: 1.06 },
    { c: trimHex, x: side * 0.055, y: 0.04, z: 0.52, w: 0.025, h: 0.06, d: 1.02 },
    { c: 0xd9e1e8, x: side * 0.065, y: 0.14, z: 0.86, w: 0.04, h: 0.045, d: 0.16 }, // handle
    { c: glassHex, x: -side * 0.02, y: 0.36, z: 0.56, w: 0.06, h: 0.28, d: 0.88 },
  ];
  const mesh = buildBatch(parts, doorMat);
  hinge.add(mesh);
  return hinge;
}

function createWheel(): THREE.Group {
  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  const parts: PartSpec[] = [
    { c: 0x1c1e24, x: 0, y: 0, z: 0, w: 0.28, h: 0.62, d: 0.62 },
    { c: 0xd5dce2, x: 0, y: 0, z: 0, w: 0.30, h: 0.34, d: 0.34 },
    { c: 0x393e4a, x: 0, y: 0, z: 0, w: 0.31, h: 0.12, d: 0.32 },
  ];
  spin.add(buildBatch(parts, wheelMat));
  pivot.add(spin);
  pivot.userData.spin = spin;
  return pivot;
}

export function createCinematicVehicle(parentScene: THREE.Object3D, kind: 'sportsCar' | 'patrolCar') {
  const root = new THREE.Group();
  root.name = `CinematicVehicle:${kind}`;
  parentScene.add(root);

  const chassis = new THREE.Group();
  root.add(chassis);

  const isPolice = kind === 'patrolCar';
  const mainColor = isPolice ? 0x1b2a40 : 0xe85a3c;
  const roofColor = isPolice ? 0xf2f6fa : 0xde4f33;
  const accentColor = isPolice ? 0xf3cc58 : 0xfff0c8;
  const glassColor = 0x4b7485;

  const chassisParts: PartSpec[] = isPolice
    ? [
      // Lower body
      { c: mainColor, x: 0, y: 0.54, z: 0, w: 1.82, h: 0.56, d: 4.15 },
      // White side stripe & doors core
      { c: roofColor, x: 0, y: 0.56, z: 0.05, w: 1.85, h: 0.44, d: 1.48 },
      { c: accentColor, x: 0, y: 0.56, z: 0.05, w: 1.87, h: 0.08, d: 1.52 },
      // Cabin roof & pillars
      { c: roofColor, x: 0, y: 1.08, z: 0.12, w: 1.56, h: 0.48, d: 1.98 },
      { c: glassColor, x: 0, y: 1.04, z: -0.78, w: 1.44, h: 0.38, d: 0.22 },
      { c: glassColor, x: 0, y: 1.04, z: 1.04, w: 1.44, h: 0.36, d: 0.20 },
      // Front bullbar & grille
      { c: 0x151820, x: 0, y: 0.50, z: -2.14, w: 1.25, h: 0.36, d: 0.16 },
      { c: 0x2a313d, x: 0, y: 0.32, z: -2.08, w: 1.86, h: 0.16, d: 0.20 },
      { c: 0x2a313d, x: 0, y: 0.32, z: 2.08, w: 1.86, h: 0.16, d: 0.20 },
      // Taillights
      { c: 0xd92b3a, x: -0.66, y: 0.64, z: 2.08, w: 0.36, h: 0.14, d: 0.08 },
      { c: 0xd92b3a, x: 0.66, y: 0.64, z: 2.08, w: 0.36, h: 0.14, d: 0.08 },
    ]
    : [
      // Palma GT Sports Car — sleek hood, cabin, rear wing, racing stripe
      { c: mainColor, x: 0, y: 0.48, z: 0, w: 1.84, h: 0.48, d: 4.18 },
      // Cream center racing stripe along hood and trunk
      { c: accentColor, x: 0, y: 0.73, z: -1.18, w: 0.34, h: 0.025, d: 1.65 },
      { c: accentColor, x: 0, y: 0.73, z: 1.45, w: 0.34, h: 0.025, d: 1.05 },
      // Sculpted cabin (slightly further back like a coupe)
      { c: roofColor, x: 0, y: 0.96, z: 0.22, w: 1.54, h: 0.44, d: 1.82 },
      { c: accentColor, x: 0, y: 1.19, z: 0.22, w: 0.34, h: 0.025, d: 1.78 },
      // Tinted wrap windshields
      { c: glassColor, x: 0, y: 0.94, z: -0.64, w: 1.44, h: 0.36, d: 0.24 },
      { c: glassColor, x: 0, y: 0.94, z: 1.08, w: 1.44, h: 0.34, d: 0.20 },
      // Dark interior seat backs visible when door opens
      { c: 0x24262e, x: 0, y: 0.62, z: 0.18, w: 1.42, h: 0.36, d: 1.38 },
      // Chrome bumpers & grille
      { c: 0xd8dfe6, x: 0, y: 0.28, z: -2.10, w: 1.88, h: 0.14, d: 0.16 },
      { c: 0xd8dfe6, x: 0, y: 0.28, z: 2.10, w: 1.88, h: 0.14, d: 0.16 },
      { c: 0x20232b, x: 0, y: 0.48, z: -2.09, w: 1.08, h: 0.20, d: 0.08 },
      // Sport rear spoiler
      { c: 0x20232b, x: -0.62, y: 0.80, z: 1.92, w: 0.08, h: 0.18, d: 0.16 },
      { c: 0x20232b, x: 0.62, y: 0.80, z: 1.92, w: 0.08, h: 0.18, d: 0.16 },
      { c: mainColor, x: 0, y: 0.90, z: 1.94, w: 1.78, h: 0.07, d: 0.28 },
      // Taillights
      { c: 0xff3b47, x: -0.66, y: 0.56, z: 2.09, w: 0.42, h: 0.14, d: 0.08 },
      { c: 0xff3b47, x: 0.66, y: 0.56, z: 2.09, w: 0.42, h: 0.14, d: 0.08 },
    ];

  const chassisBatch = buildBatch(chassisParts, bodyMat);
  chassis.add(chassisBatch);

  // Emissive headlights
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff5cf });
  const headlightGeo = new THREE.BoxGeometry(0.36, 0.15, 0.08);
  const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
  leftHeadlight.position.set(-0.66, isPolice ? 0.60 : 0.54, -2.09);
  const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
  rightHeadlight.position.set(0.66, isPolice ? 0.60 : 0.54, -2.09);
  chassis.add(leftHeadlight, rightHeadlight);

  // Police roof lightbar (emissive red & blue meshes)
  let sirenBlueMat: THREE.MeshBasicMaterial | undefined;
  let sirenRedMat: THREE.MeshBasicMaterial | undefined;
  const sirenMeshes: THREE.Mesh[] = [];
  if (isPolice) {
    const barGeo = new THREE.BoxGeometry(0.46, 0.15, 0.24);
    sirenBlueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    sirenRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const blueMesh = new THREE.Mesh(barGeo, sirenBlueMat);
    blueMesh.position.set(-0.34, 1.38, 0.04);
    const redMesh = new THREE.Mesh(barGeo, sirenRedMat);
    redMesh.position.set(0.34, 1.38, 0.04);
    chassis.add(blueMesh, redMesh);
    sirenMeshes.push(blueMesh, redMesh);
  }

  // Articulated driver (-X) and passenger (+X) doors
  const driverDoor = createDoor(isPolice ? roofColor : mainColor, accentColor, glassColor, -1);
  const passengerDoor = createDoor(isPolice ? roofColor : mainColor, accentColor, glassColor, 1);
  chassis.add(driverDoor, passengerDoor);

  // Four animated wheels
  const wheelOffsets: Array<[number, number, number, boolean]> = [
    [-0.92, 0.31, -1.28, true],
    [0.92, 0.31, -1.28, true],
    [-0.92, 0.31, 1.28, false],
    [0.92, 0.31, 1.28, false],
  ];
  const wheels = wheelOffsets.map(([x, y, z, front]) => {
    const wheel = createWheel();
    wheel.position.set(x, y, z);
    root.add(wheel);
    return { pivot: wheel, spin: wheel.userData.spin as THREE.Group, front };
  });

  let spinAngle = 0;

  function applySample(sample: VehicleSample, dt: number, clock: number) {
    root.visible = sample.visible;
    if (!sample.visible) return;

    root.position.set(sample.x, sample.y, sample.z);
    root.rotation.set(0, -sample.heading, 0);

    // Subtle chassis suspension pitch/roll + engine idle vibration
    const rumble = (sample.wheelSpeed ?? 0) > 0.5 ? Math.sin(clock * 32) * 0.008 : 0;
    chassis.position.y = rumble;
    chassis.rotation.x = sample.pitch ?? 0;
    chassis.rotation.z = sample.roll ?? 0;

    // Articulated doors
    driverDoor.rotation.y = -(sample.driverDoor ?? 0);
    passengerDoor.rotation.y = sample.passengerDoor ?? 0;

    // Wheels spin & steering
    spinAngle += (sample.wheelSpeed ?? 0) * dt;
    const steer = sample.steer ?? 0;
    for (const wheel of wheels) {
      if (wheel.front) wheel.pivot.rotation.y = steer;
      wheel.spin.rotation.x = -spinAngle;
    }

    // Headlights brightness
    const lightsOn = sample.headlights ?? false;
    headlightMat.color.setHex(lightsOn ? 0xfff8d6 : 0x7a766a);

    // Alternating police siren lightbar flash
    if (sirenBlueMat && sirenRedMat) {
      if (sample.sirens) {
        const phase = Math.floor(clock * 9) % 2 === 0;
        sirenBlueMat.color.setHex(phase ? 0x60b5ff : 0x1a3366);
        sirenRedMat.color.setHex(phase ? 0x661a1a : 0xff4048);
      } else {
        sirenBlueMat.color.setHex(0x284c82);
        sirenRedMat.color.setHex(0x822830);
      }
    }
  }

  root.visible = false;

  return {
    root,
    applySample,
    dispose() {
      chassisBatch.dispose();
      headlightGeo.dispose();
      headlightMat.dispose();
      sirenBlueMat?.dispose();
      sirenRedMat?.dispose();
      sirenMeshes.forEach((m) => m.geometry.dispose());
      root.traverse((obj) => {
        if (obj instanceof THREE.InstancedMesh) obj.dispose();
      });
      root.removeFromParent();
    },
  };
}

export type CinematicVehicle = ReturnType<typeof createCinematicVehicle>;
