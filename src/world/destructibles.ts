import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  type Scene,
} from 'three';
import type { BallisticTarget } from '../player/weapons';
import type { Physics } from '../physics/physics';
import { makeRandom, type DistrictMap, type StoreSpec } from './generation/layout';

export type DestructibleKind = 'store_glass' | 'hydrant' | 'bollard' | 'crate' | 'bench';

export interface DestructibleProp {
  id: string;
  kind: DestructibleKind;
  x: number;
  y: number;
  z: number;
  halfX: number;
  halfY: number;
  halfZ: number;
  hp: number;
  maxHp: number;
  broken: boolean;
  color: number;
  storeId?: string;
  waterTimer: number;
  waterEmitCooldown: number;
  collider?: RAPIER.Collider;
}

export interface DestructionHit {
  prop: DestructibleProp;
  destroyed: boolean;
}

interface DebrisPiece {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  sx: number;
  sy: number;
  sz: number;
  ttl: number;
  color: number;
}

interface PlumePiece {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  ttl: number;
  maxTtl: number;
  color: number;
}

function insideAnyRoad(x: number, z: number, map: Pick<DistrictMap, 'roads'>, pad = 0.55): boolean {
  for (const road of map.roads) {
    if (
      Math.abs(x - road.x) <= road.width / 2 + pad
      && Math.abs(z - road.z) <= road.depth / 2 + pad
    ) {
      return true;
    }
  }
  return false;
}

function blockedByStaticWorld(
  x: number,
  z: number,
  halfX: number,
  halfZ: number,
  physics: Physics,
  pad = 0.35,
): boolean {
  let hasGround = false;
  for (const box of physics.spatial.boxes) {
    const overlapX = Math.abs(x - box.x) < box.halfX + halfX + pad;
    const overlapZ = Math.abs(z - box.z) < box.halfZ + halfZ + pad;
    if (!overlapX || !overlapZ) continue;
    if (box.y + box.halfY <= 0.12 && box.y + box.halfY >= -0.3) {
      hasGround = true;
      continue;
    }
    if (box.y + box.halfY > 0.12 && box.y - box.halfY < 2.2) {
      return true;
    }
  }
  return !hasGround;
}

export function createDestructibles(
  scene: Scene,
  physics: Physics,
  map: Pick<DistrictMap, 'roads' | 'stores'>,
  stores: readonly StoreSpec[],
  seed = 240817,
) {
  const random = makeRandom(seed ^ 0x91d4f2);
  const props: DestructibleProp[] = [];
  const propById = new Map<string, DestructibleProp>();
  const debris: DebrisPiece[] = [];
  const plumes: PlumePiece[] = [];
  const maxDebris = 96;
  const maxPlumes = 64;

  function attachCollider(prop: DestructibleProp): void {
    if (prop.kind === 'store_glass' || prop.collider) return;
    prop.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(prop.halfX, prop.halfY, prop.halfZ)
        .setTranslation(prop.x, prop.y, prop.z)
        .setFriction(0.6),
    );
  }

  function detachCollider(prop: DestructibleProp): void {
    if (!prop.collider) return;
    physics.world.removeCollider(prop.collider, true);
    prop.collider = undefined;
  }

  function addProp(spec: Omit<DestructibleProp, 'broken' | 'waterTimer' | 'waterEmitCooldown' | 'collider'>): void {
    const prop: DestructibleProp = {
      ...spec,
      broken: false,
      waterTimer: 0,
      waterEmitCooldown: 0,
    };
    attachCollider(prop);
    props.push(prop);
    propById.set(prop.id, prop);
  }

  function nearStoreDoor(x: number, z: number, minDist = 2.75): boolean {
    for (const store of stores) {
      if (Math.hypot(x - store.doorX, z - store.doorZ) < minDist) return true;
    }
    return false;
  }

  // 1. Storefront fracturable glass panes (2 per store) aligned directly in front of each window recess
  for (const store of stores) {
    const width = store.width ?? 10;
    const depth = store.depth ?? 10;
    const sideOnX = store.facing === 'east' || store.facing === 'west';
    const nx = store.facing === 'east' ? 1 : store.facing === 'west' ? -1 : 0;
    const nz = store.facing === 'south' ? 1 : store.facing === 'north' ? -1 : 0;
    const frontSpan = sideOnX ? depth : width;
    const depthSpan = sideOnX ? width : depth;
    const doorWidth = Math.min(2.6, Math.max(1.85, frontSpan * 0.36));
    const wingSpan = Math.max(0, (frontSpan - doorWidth) / 2);
    if (wingSpan <= 1.0) continue;
    const frontOffset = depthSpan / 2 + 0.08;
    const glassW = wingSpan * 0.68;

    for (const side of [-1, 1] as const) {
      const wingCenter = (doorWidth / 2 + wingSpan / 2) * side;
      const x = sideOnX ? store.x + nx * frontOffset : store.x + wingCenter;
      const z = sideOnX ? store.z + wingCenter : store.z + nz * frontOffset;
      const id = `glass-${store.id}-${side > 0 ? 'r' : 'l'}`;
      addProp({
        id,
        kind: 'store_glass',
        x,
        y: 1.32,
        z,
        halfX: (sideOnX ? 0.14 : glassW) / 2,
        halfY: 0.675,
        halfZ: (sideOnX ? glassW : 0.14) / 2,
        hp: 18,
        maxHp: 18,
        color: 0x9ce2ee,
        storeId: store.id,
      });
    }

    // Delivery wooden crates tucked beside store flank / away from door
    const flankOffset = frontSpan / 2 - 0.55;
    const crateX = sideOnX
      ? store.x + nx * (depthSpan / 2 + 0.85)
      : store.x + flankOffset;
    const crateZ = sideOnX
      ? store.z + flankOffset
      : store.z + nz * (depthSpan / 2 + 0.85);
    if (
      !nearStoreDoor(crateX, crateZ, 2.8)
      && !insideAnyRoad(crateX, crateZ, map, 0.35)
      && !blockedByStaticWorld(crateX, crateZ, 0.44, 0.44, physics, 0.25)
    ) {
      addProp({
        id: `crate-${store.id}`,
        kind: 'crate',
        x: crateX,
        y: 0.44,
        z: crateZ,
        halfX: 0.44,
        halfY: 0.44,
        halfZ: 0.44,
        hp: 26,
        maxHp: 26,
        color: 0xc28a52,
      });
    }
  }

  // 2. Deterministic sidewalk hydrants, bollards & benches near key avenues
  const streetCandidates: { x: number; z: number; kind: Exclude<DestructibleKind, 'store_glass'> }[] = [
    { x: -6.2, z: -4.5, kind: 'hydrant' },
    { x: 6.2, z: 32.0, kind: 'hydrant' },
    { x: -6.2, z: 46.0, kind: 'bollard' },
    { x: 6.2, z: -26.0, kind: 'hydrant' },
    { x: -84.0, z: -4.8, kind: 'hydrant' },
    { x: -124.5, z: -123.0, kind: 'crate' },
    { x: -230.0, z: -3.2, kind: 'hydrant' },
    { x: -217.5, z: 16.5, kind: 'bench' },
    { x: -358.8, z: -115.0, kind: 'hydrant' },
    { x: -373.2, z: -92.0, kind: 'bollard' },
    { x: -358.8, z: 16.5, kind: 'hydrant' },
    { x: -294.0, z: 158.0, kind: 'crate' },
  ];

  // Add extra deterministic boulevard bollards and benches along sidewalks
  for (let i = 0; i < 18; i++) {
    const zBase = -110 + i * 14 + (random() - 0.5) * 3.5;
    const xBase = (i % 2 === 0 ? -6.15 : 6.15);
    streetCandidates.push({
      x: xBase,
      z: zBase,
      kind: i % 5 === 0 ? 'hydrant' : i % 3 === 0 ? 'bench' : 'bollard',
    });
  }

  let candidateSerial = 0;
  for (const item of streetCandidates) {
    if (Math.hypot(item.x, item.z - 25) < 4.5) continue;
    if (nearStoreDoor(item.x, item.z, 2.8)) continue;
    const dims = item.kind === 'hydrant'
      ? { halfX: 0.22, halfY: 0.44, halfZ: 0.22, hp: 24, color: 0xd84339 }
      : item.kind === 'bollard'
        ? { halfX: 0.16, halfY: 0.46, halfZ: 0.16, hp: 28, color: 0xe3b448 }
        : item.kind === 'bench'
          ? { halfX: 0.72, halfY: 0.4, halfZ: 0.26, hp: 32, color: 0xb07850 }
          : { halfX: 0.44, halfY: 0.44, halfZ: 0.44, hp: 26, color: 0xc28a52 };

    if (insideAnyRoad(item.x, item.z, map, 0.35)) continue;
    if (blockedByStaticWorld(item.x, item.z, dims.halfX, dims.halfZ, physics, 0.35)) continue;
    if (props.some((other) => Math.hypot(other.x - item.x, other.z - item.z) < 2.2)) continue;

    addProp({
      id: `${item.kind}-${++candidateSerial}`,
      kind: item.kind,
      x: item.x,
      y: dims.halfY,
      z: item.z,
      halfX: dims.halfX,
      halfY: dims.halfY,
      halfZ: dims.halfZ,
      hp: dims.hp,
      maxHp: dims.hp,
      color: dims.color,
    });
  }

  const glassCount = Math.max(1, props.filter((p) => p.kind === 'store_glass').length);
  const solidProps = props.filter((p) => p.kind !== 'store_glass');
  const solidCount = Math.max(1, solidProps.length);
  const glassProps = props.filter((p) => p.kind === 'store_glass');

  const cubeGeometry = new BoxGeometry(1, 1, 1);
  const glassMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.68,
  });
  const solidMaterial = new MeshStandardMaterial({ roughness: 0.62, metalness: 0.18 });
  const debrisMaterial = new MeshStandardMaterial({ roughness: 0.45, metalness: 0.15 });
  const plumeMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.68,
    toneMapped: false,
  });

  const glassMesh = new InstancedMesh(cubeGeometry, glassMaterial, glassCount);
  const propMesh = new InstancedMesh(cubeGeometry, solidMaterial, solidCount);
  const debrisMesh = new InstancedMesh(cubeGeometry, debrisMaterial, maxDebris);
  const plumeMesh = new InstancedMesh(cubeGeometry, plumeMaterial, maxPlumes);

  glassMesh.name = 'Escaparates fracturables';
  propMesh.name = 'Mobiliario destructible';
  debrisMesh.name = 'Escombros físicos';
  plumeMesh.name = 'Efectos de agua y humo';

  for (const mesh of [glassMesh, propMesh, debrisMesh, plumeMesh]) {
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  propMesh.castShadow = true;
  propMesh.receiveShadow = true;
  debrisMesh.castShadow = true;

  const pose = new Object3D();
  const colorScratch = new Color();

  function spawnDebrisBurst(prop: DestructibleProp, dirX = 0, dirZ = 0, pieces = 7): void {
    const isGlass = prop.kind === 'store_glass';
    for (let i = 0; i < pieces; i++) {
      if (debris.length >= maxDebris) debris.shift();
      const angle = random() * Math.PI * 2;
      const speed = (isGlass ? 2.4 : 2.0) + random() * 3.8;
      debris.push({
        x: prop.x + (random() - 0.5) * prop.halfX * 1.4,
        y: Math.max(0.25, prop.y + (random() - 0.5) * prop.halfY),
        z: prop.z + (random() - 0.5) * prop.halfZ * 1.4,
        vx: Math.cos(angle) * speed + dirX * 2.5,
        vy: (isGlass ? 2.2 : 3.2) + random() * 3.4,
        vz: Math.sin(angle) * speed + dirZ * 2.5,
        rx: random() * Math.PI,
        ry: random() * Math.PI,
        sx: isGlass ? 0.14 + random() * 0.16 : 0.18 + random() * 0.22,
        sy: isGlass ? 0.04 : 0.12 + random() * 0.14,
        sz: isGlass ? 0.16 + random() * 0.18 : 0.16 + random() * 0.2,
        ttl: 3.2,
        color: isGlass ? 0xb4eef8 : prop.color,
      });
    }
  }

  function spawnPlume(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    ttl: number,
    color: number,
  ): void {
    if (plumes.length >= maxPlumes) plumes.shift();
    plumes.push({ x, y, z, vx, vy, vz, size, ttl, maxTtl: ttl, color });
  }

  function spawnSmoke(x: number, y: number, z: number, dark = false): void {
    spawnPlume(
      x + (random() - 0.5) * 0.35,
      y,
      z + (random() - 0.5) * 0.35,
      (random() - 0.5) * 0.45,
      1.35 + random() * 0.8,
      (random() - 0.5) * 0.45,
      0.32 + random() * 0.22,
      1.15,
      dark ? 0x3b4048 : 0x7c848e,
    );
  }

  function damageProp(id: string, amount: number, dir?: { x: number; z: number }): DestructionHit | null {
    const prop = propById.get(id);
    if (!prop || prop.broken) return null;
    prop.hp -= amount;
    if (prop.hp > 0) {
      return { prop, destroyed: false };
    }
    prop.hp = 0;
    prop.broken = true;
    detachCollider(prop);
    spawnDebrisBurst(prop, dir?.x ?? 0, dir?.z ?? 0, prop.kind === 'store_glass' ? 9 : 7);
    if (prop.kind === 'hydrant') {
      prop.waterTimer = 5.0;
      prop.waterEmitCooldown = 0;
    }
    return { prop, destroyed: true };
  }

  function collideVehicle(
    x: number,
    z: number,
    radius: number,
    speed: number,
    heading: number,
  ): DestructibleProp[] {
    if (speed < 3.4) return [];
    const hit: DestructibleProp[] = [];
    const dirX = Math.sin(heading);
    const dirZ = -Math.cos(heading);
    for (const prop of props) {
      if (prop.broken) continue;
      if (
        Math.abs(x - prop.x) <= prop.halfX + radius
        && Math.abs(z - prop.z) <= prop.halfZ + radius
      ) {
        const res = damageProp(prop.id, Math.max(40, speed * 8), { x: dirX, z: dirZ });
        if (res?.destroyed) hit.push(res.prop);
      }
    }
    return hit;
  }

  function fillBallisticTargets(out: BallisticTarget[]): void {
    for (const prop of props) {
      if (prop.broken) continue;
      out.push({
        id: prop.id,
        x: prop.x,
        z: prop.z,
        radius: Math.max(prop.halfX, prop.halfZ),
        halfX: prop.halfX,
        halfZ: prop.halfZ,
        kind: 'prop',
      });
    }
  }

  function step(dt: number): void {
    if (!(dt > 0)) return;
    for (const prop of props) {
      if (prop.waterTimer > 0) {
        prop.waterTimer = Math.max(0, prop.waterTimer - dt);
        prop.waterEmitCooldown -= dt;
        if (prop.waterEmitCooldown <= 0) {
          prop.waterEmitCooldown = 0.06;
          spawnPlume(
            prop.x + (random() - 0.5) * 0.14,
            0.35,
            prop.z + (random() - 0.5) * 0.14,
            (random() - 0.5) * 0.9,
            5.6 + random() * 2.2,
            (random() - 0.5) * 0.9,
            0.18 + random() * 0.12,
            0.75,
            0x7ad7f4,
          );
        }
      }
    }

    for (let i = debris.length - 1; i >= 0; i--) {
      const piece = debris[i];
      piece.ttl -= dt;
      if (piece.ttl <= 0) {
        debris.splice(i, 1);
        continue;
      }
      piece.vy -= 19.5 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.z += piece.vz * dt;
      piece.rx += 4.5 * dt;
      piece.ry += 5.2 * dt;
      if (piece.y < 0.04) {
        piece.y = 0.04;
        piece.vy = Math.abs(piece.vy) * 0.25;
        piece.vx *= 0.65;
        piece.vz *= 0.65;
      }
    }

    for (let i = plumes.length - 1; i >= 0; i--) {
      const p = plumes[i];
      p.ttl -= dt;
      if (p.ttl <= 0) {
        plumes.splice(i, 1);
        continue;
      }
      if (p.color === 0x7ad7f4) p.vy -= 11.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
  }

  function render(): void {
    let gIdx = 0;
    for (const prop of glassProps) {
      if (prop.broken) continue;
      pose.position.set(prop.x, prop.y, prop.z);
      pose.rotation.set(0, 0, 0);
      pose.scale.set(prop.halfX * 2, prop.halfY * 2, prop.halfZ * 2);
      pose.updateMatrix();
      glassMesh.setMatrixAt(gIdx, pose.matrix);
      glassMesh.setColorAt(gIdx, colorScratch.setHex(prop.color));
      gIdx += 1;
    }
    glassMesh.count = gIdx;
    glassMesh.instanceMatrix.needsUpdate = true;
    if (glassMesh.instanceColor) glassMesh.instanceColor.needsUpdate = true;

    let sIdx = 0;
    for (const prop of solidProps) {
      if (prop.broken) continue;
      pose.position.set(prop.x, prop.y, prop.z);
      pose.rotation.set(0, 0, 0);
      pose.scale.set(prop.halfX * 2, prop.halfY * 2, prop.halfZ * 2);
      pose.updateMatrix();
      propMesh.setMatrixAt(sIdx, pose.matrix);
      propMesh.setColorAt(sIdx, colorScratch.setHex(prop.color));
      sIdx += 1;
    }
    propMesh.count = sIdx;
    propMesh.instanceMatrix.needsUpdate = true;
    if (propMesh.instanceColor) propMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < debris.length; i++) {
      const piece = debris[i];
      pose.position.set(piece.x, piece.y, piece.z);
      pose.rotation.set(piece.rx, piece.ry, 0);
      pose.scale.set(piece.sx, piece.sy, piece.sz);
      pose.updateMatrix();
      debrisMesh.setMatrixAt(i, pose.matrix);
      debrisMesh.setColorAt(i, colorScratch.setHex(piece.color));
    }
    debrisMesh.count = debris.length;
    debrisMesh.instanceMatrix.needsUpdate = true;
    if (debrisMesh.instanceColor) debrisMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < plumes.length; i++) {
      const p = plumes[i];
      const scale = p.size * Math.max(0.3, p.ttl / p.maxTtl);
      pose.position.set(p.x, p.y, p.z);
      pose.rotation.set(0, 0, 0);
      pose.scale.set(scale, scale, scale);
      pose.updateMatrix();
      plumeMesh.setMatrixAt(i, pose.matrix);
      plumeMesh.setColorAt(i, colorScratch.setHex(p.color));
    }
    plumeMesh.count = plumes.length;
    plumeMesh.instanceMatrix.needsUpdate = true;
    if (plumeMesh.instanceColor) plumeMesh.instanceColor.needsUpdate = true;
  }

  function reset(): void {
    debris.length = 0;
    plumes.length = 0;
    for (const prop of props) {
      prop.hp = prop.maxHp;
      prop.broken = false;
      prop.waterTimer = 0;
      prop.waterEmitCooldown = 0;
      attachCollider(prop);
    }
    render();
  }

  function dispose(): void {
    debris.length = 0;
    plumes.length = 0;
    for (const prop of props) detachCollider(prop);
    for (const mesh of [glassMesh, propMesh, debrisMesh, plumeMesh]) {
      mesh.removeFromParent();
      mesh.dispose();
    }
    cubeGeometry.dispose();
    glassMaterial.dispose();
    solidMaterial.dispose();
    debrisMaterial.dispose();
    plumeMaterial.dispose();
  }

  render();

  return {
    get props(): readonly DestructibleProp[] { return props; },
    get debrisCount(): number { return debris.length; },
    get plumeCount(): number { return plumes.length; },
    get intactCount(): number { return props.reduce((acc, p) => acc + (p.broken ? 0 : 1), 0); },
    get brokenCount(): number { return props.reduce((acc, p) => acc + (p.broken ? 1 : 0), 0); },
    getById(id: string): DestructibleProp | undefined { return propById.get(id); },
    fillBallisticTargets,
    damageProp,
    collideVehicle,
    spawnSmoke,
    step,
    render,
    reset,
    dispose,
  };
}
