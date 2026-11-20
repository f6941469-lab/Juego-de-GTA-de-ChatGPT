import {
  BoxGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  type Scene,
} from 'three';
import type { SpatialBoxGrid } from '../physics/spatial-index';

export type WeaponId = 'unarmed' | 'pistol' | 'carbine';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  magSize: number;
  startReserve: number;
  fireInterval: number;
  reloadSeconds: number;
  range: number;
  damage: number;
  threat: number;
  soundRadius: number;
}

export const weaponSpecs: Record<WeaponId, WeaponSpec> = {
  unarmed: {
    id: 'unarmed',
    name: 'Desarmado',
    magSize: 0,
    startReserve: 0,
    fireInterval: 0.45,
    reloadSeconds: 0,
    range: 2.0,
    damage: 15,
    threat: 0,
    soundRadius: 8,
  },
  pistol: {
    id: 'pistol',
    name: 'Pistola 9mm',
    magSize: 12,
    startReserve: 48,
    fireInterval: 0.28,
    reloadSeconds: 1.15,
    range: 58,
    damage: 38,
    threat: 0.55,
    soundRadius: 56,
  },
  carbine: {
    id: 'carbine',
    name: 'Carabina táctica',
    magSize: 24,
    startReserve: 72,
    fireInterval: 0.13,
    reloadSeconds: 1.55,
    range: 76,
    damage: 28,
    threat: 0.72,
    soundRadius: 70,
  },
};

const weaponOrder: readonly WeaponId[] = ['unarmed', 'pistol', 'carbine'];

export interface BallisticTarget {
  id: string;
  x: number;
  z: number;
  radius: number;
  halfX?: number;
  halfZ?: number;
  kind: 'npc' | 'vehicle' | 'prop';
}

export interface ShotOutcome {
  fired: boolean;
  empty: boolean;
  reloaded: boolean;
  weaponChanged: boolean;
  aiming: boolean;
  hitTarget?: BallisticTarget;
  hitDistance: number;
  hitWall: boolean;
  endPoint: { x: number; y: number; z: number };
}

interface Tracer {
  x: number;
  y: number;
  z: number;
  heading: number;
  length: number;
  ttl: number;
}

function rayCircle2D(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  cx: number,
  cz: number,
  radius: number,
): number | null {
  const fx = cx - ox;
  const fz = cz - oz;
  const proj = fx * dx + fz * dz;
  if (proj < 0) return null;
  const distSq = fx * fx + fz * fz - proj * proj;
  if (distSq > radius * radius) return null;
  const thc = Math.sqrt(Math.max(0, radius * radius - distSq));
  const hitDist = proj - thc;
  return hitDist >= 0 ? hitDist : proj + thc;
}

function rayBox2D(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  cx: number,
  cz: number,
  halfX: number,
  halfZ: number,
): number | null {
  const minX = cx - halfX;
  const maxX = cx + halfX;
  const minZ = cz - halfZ;
  const maxZ = cz + halfZ;
  const tx1 = dx === 0 ? (ox >= minX && ox <= maxX ? -Infinity : Infinity) : (minX - ox) / dx;
  const tx2 = dx === 0 ? (ox >= minX && ox <= maxX ? Infinity : -Infinity) : (maxX - ox) / dx;
  const tz1 = dz === 0 ? (oz >= minZ && oz <= maxZ ? -Infinity : Infinity) : (minZ - oz) / dz;
  const tz2 = dz === 0 ? (oz >= minZ && oz <= maxZ ? Infinity : -Infinity) : (maxZ - oz) / dz;
  const enter = Math.max(Math.min(tx1, tx2), Math.min(tz1, tz2));
  const exit = Math.min(Math.max(tx1, tx2), Math.max(tz1, tz2));
  if (exit < 0 || enter > exit) return null;
  return Math.max(0, enter);
}

export function createWeaponSystem(scene: Scene) {
  let equippedIndex = 0;
  const ammo: Record<WeaponId, { mag: number; reserve: number }> = {
    unarmed: { mag: 0, reserve: 0 },
    pistol: { mag: weaponSpecs.pistol.magSize, reserve: weaponSpecs.pistol.startReserve },
    carbine: { mag: weaponSpecs.carbine.magSize, reserve: weaponSpecs.carbine.startReserve },
  };
  let cooldown = 0;
  let reloadTimer = 0;

  const maxTracers = 16;
  const tracers: Tracer[] = [];
  const beamGeometry = new BoxGeometry(0.035, 0.035, 1);
  const beamMaterial = new MeshBasicMaterial({ color: '#ffd97a', toneMapped: false });
  const beamMesh = new InstancedMesh(beamGeometry, beamMaterial, maxTracers);
  beamMesh.name = 'Trazadores balísticos';
  beamMesh.frustumCulled = false;
  beamMesh.count = 0;
  scene.add(beamMesh);
  const pose = new Object3D();

  function currentId(): WeaponId {
    return weaponOrder[equippedIndex];
  }

  function currentSpec(): WeaponSpec {
    return weaponSpecs[currentId()];
  }

  function finishReload(): void {
    const id = currentId();
    const spec = weaponSpecs[id];
    const state = ammo[id];
    const needed = Math.max(0, spec.magSize - state.mag);
    const transfer = Math.min(needed, state.reserve);
    state.mag += transfer;
    state.reserve -= transfer;
    reloadTimer = 0;
  }

  function selectSlot(slot: 0 | 1 | 2): boolean {
    if (slot === equippedIndex) return false;
    equippedIndex = slot;
    reloadTimer = 0;
    cooldown = 0.14;
    return true;
  }

  function cycle(): boolean {
    return selectSlot(((equippedIndex + 1) % weaponOrder.length) as 0 | 1 | 2);
  }

  function triggerReload(): boolean {
    const id = currentId();
    const spec = weaponSpecs[id];
    const state = ammo[id];
    if (id === 'unarmed' || reloadTimer > 0) return false;
    if (state.mag >= spec.magSize || state.reserve <= 0) return false;
    reloadTimer = spec.reloadSeconds;
    return true;
  }

  function addTracer(x: number, y: number, z: number, heading: number, length: number): void {
    if (tracers.length >= maxTracers) tracers.shift();
    tracers.push({ x, y, z, heading, length, ttl: 0.1 });
  }

  function step(
    dt: number,
    input: { aim: boolean; fire: boolean; reload: boolean; cycleWeapon: boolean; weaponSlot?: 0 | 1 | 2 },
    shooter: { x: number; y: number; z: number; heading: number; inVehicle: boolean },
    spatial: SpatialBoxGrid,
    targets: readonly BallisticTarget[],
  ): ShotOutcome {
    let weaponChanged = false;
    let reloaded = false;
    let fired = false;
    let empty = false;

    if (!shooter.inVehicle) {
      if (input.weaponSlot !== undefined) {
        weaponChanged = selectSlot(input.weaponSlot);
      } else if (input.cycleWeapon) {
        weaponChanged = cycle();
      }
      if (input.reload) {
        reloaded = triggerReload();
      }
    }

    cooldown = Math.max(0, cooldown - dt);
    if (reloadTimer > 0) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) finishReload();
    }

    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].ttl -= dt;
      if (tracers[i].ttl <= 0) tracers.splice(i, 1);
    }

    const id = currentId();
    const spec = currentSpec();
    const aiming = !shooter.inVehicle && id !== 'unarmed' && input.aim;
    const muzzleOrigin = {
      x: shooter.x + Math.sin(shooter.heading) * 0.45,
      y: shooter.y + 1.32,
      z: shooter.z - Math.cos(shooter.heading) * 0.45,
    };
    const dirX = Math.sin(shooter.heading);
    const dirZ = -Math.cos(shooter.heading);
    let hitDistance = spec.range;
    let hitWall = false;
    let hitTarget: BallisticTarget | undefined;

    if (!shooter.inVehicle && id !== 'unarmed' && input.fire && cooldown <= 0 && reloadTimer <= 0) {
      const state = ammo[id];
      if (state.mag <= 0) {
        empty = true;
        cooldown = 0.25;
        if (state.reserve > 0) {
          reloaded = triggerReload();
        }
      } else {
        state.mag -= 1;
        cooldown = spec.fireInterval;
        fired = true;

        const wallHit = spatial.raycast(
          { x: muzzleOrigin.x, z: muzzleOrigin.z },
          { x: muzzleOrigin.x + dirX * spec.range, z: muzzleOrigin.z + dirZ * spec.range },
          { minY: 1.15, maxY: 1.8 },
        );
        if (wallHit) {
          const wallDistance = wallHit.fraction * spec.range;
          if (wallDistance < hitDistance) {
            hitDistance = wallDistance;
            hitWall = true;
          }
        }

        for (const target of targets) {
          const dist = target.halfX && target.halfZ
            ? rayBox2D(
                muzzleOrigin.x,
                muzzleOrigin.z,
                dirX,
                dirZ,
                target.x,
                target.z,
                target.halfX,
                target.halfZ,
              )
            : rayCircle2D(
                muzzleOrigin.x,
                muzzleOrigin.z,
                dirX,
                dirZ,
                target.x,
                target.z,
                target.radius,
              );
          if (dist !== null && dist < hitDistance) {
            hitDistance = dist;
            hitTarget = target;
            hitWall = false;
          }
        }

        addTracer(
          muzzleOrigin.x + dirX * (hitDistance * 0.5),
          muzzleOrigin.y,
          muzzleOrigin.z + dirZ * (hitDistance * 0.5),
          shooter.heading,
          Math.max(0.4, hitDistance),
        );
      }
    }

    return {
      fired,
      empty,
      reloaded,
      weaponChanged,
      aiming,
      hitTarget,
      hitDistance,
      hitWall,
      endPoint: {
        x: muzzleOrigin.x + dirX * hitDistance,
        y: muzzleOrigin.y,
        z: muzzleOrigin.z + dirZ * hitDistance,
      },
    };
  }

  function render(): void {
    const count = Math.min(tracers.length, maxTracers);
    for (let i = 0; i < count; i++) {
      const tracer = tracers[i];
      pose.position.set(tracer.x, tracer.y, tracer.z);
      pose.rotation.set(0, -tracer.heading, 0);
      pose.scale.set(1, 1, tracer.length);
      pose.updateMatrix();
      beamMesh.setMatrixAt(i, pose.matrix);
    }
    beamMesh.count = count;
    beamMesh.instanceMatrix.needsUpdate = true;
  }

  function hudLabel(): string {
    const id = currentId();
    const spec = currentSpec();
    if (id === 'unarmed') return spec.name;
    if (reloadTimer > 0) return `${spec.name} · Recargando…`;
    const state = ammo[id];
    return `${spec.name} · ${state.mag}/${state.reserve}`;
  }

  function reset(): void {
    equippedIndex = 0;
    cooldown = 0;
    reloadTimer = 0;
    tracers.length = 0;
    beamMesh.count = 0;
    ammo.pistol = { mag: weaponSpecs.pistol.magSize, reserve: weaponSpecs.pistol.startReserve };
    ammo.carbine = { mag: weaponSpecs.carbine.magSize, reserve: weaponSpecs.carbine.startReserve };
  }

  function dispose(): void {
    tracers.length = 0;
    beamMesh.removeFromParent();
    beamMesh.dispose();
    beamGeometry.dispose();
    beamMaterial.dispose();
  }

  return {
    get equipped(): WeaponId { return currentId(); },
    get spec(): WeaponSpec { return currentSpec(); },
    get reloading(): boolean { return reloadTimer > 0; },
    get ammo(): { mag: number; reserve: number } { return { ...ammo[currentId()] }; },
    addTracer,
    selectSlot,
    cycle,
    triggerReload,
    step,
    render,
    hudLabel,
    reset,
    dispose,
  };
}
