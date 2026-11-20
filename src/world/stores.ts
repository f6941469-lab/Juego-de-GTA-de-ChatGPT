import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  type Scene,
} from 'three';
import type { StoreSpec } from './generation/layout';

export interface StoreMapMarker {
  id: string;
  name: string;
  x: number;
  z: number;
  available: boolean;
}

export interface StoreInteraction {
  store: StoreSpec;
  available: boolean;
  cooldown: number;
}

export interface RobberyResult {
  store: StoreSpec;
  loot: number;
}

export interface StoreInteriorLayout {
  store: StoreSpec;
  entranceX: number;
  entranceZ: number;
  interiorX: number;
  interiorZ: number;
  counterFrontX: number;
  counterFrontZ: number;
  clerkX: number;
  clerkZ: number;
  clerkHeading: number;
  halfX: number;
  halfZ: number;
}

export function getStoreInteriorLayout(spec: StoreSpec): StoreInteriorLayout {
  const nx = spec.facing === 'east' ? 1 : spec.facing === 'west' ? -1 : 0;
  const nz = spec.facing === 'south' ? 1 : spec.facing === 'north' ? -1 : 0;
  const width = spec.width ?? 10;
  const depth = spec.depth ?? 10;
  const sideOnX = spec.facing === 'east' || spec.facing === 'west';
  const depthSpan = sideOnX ? width : depth;

  return {
    store: spec,
    entranceX: spec.doorX,
    entranceZ: spec.doorZ,
    interiorX: spec.x + nx * (depthSpan * 0.14),
    interiorZ: spec.z + nz * (depthSpan * 0.14),
    counterFrontX: spec.x + nx * (depthSpan * 0.04),
    counterFrontZ: spec.z + nz * (depthSpan * 0.04),
    clerkX: spec.x - nx * (depthSpan * 0.31),
    clerkZ: spec.z - nz * (depthSpan * 0.31),
    clerkHeading: Math.atan2(nx, -nz),
    halfX: Math.max(2.5, width / 2 - 0.35),
    halfZ: Math.max(2.5, depth / 2 - 0.35),
  };
}

interface StoreRuntime {
  spec: StoreSpec;
  layout: StoreInteriorLayout;
  cooldown: number;
}

const INTERACT_RADIUS = 2.75;
const ROBBERY_COOLDOWN = 90;
const READY_COLOR = new Color('#ffe168');
const BUSY_COLOR = new Color('#586274');

export function createStores(scene: Scene, specs: readonly StoreSpec[]) {
  const entries: StoreRuntime[] = specs.map((spec) => ({
    spec,
    layout: getStoreInteriorLayout(spec),
    cooldown: 0,
  }));
  const count = entries.length;

  const ringGeometry = new CylinderGeometry(0.95, 1.05, 0.08, 16, 1, true);
  const beaconGeometry = new BoxGeometry(0.32, 0.32, 0.32);
  const material = new MeshBasicMaterial({
    toneMapped: false,
    transparent: true,
    opacity: 0.9,
  });

  const rings = new InstancedMesh(ringGeometry, material, Math.max(1, count));
  const beacons = new InstancedMesh(beaconGeometry, material, Math.max(1, count));
  rings.name = 'Marcadores de tiendas';
  beacons.name = 'Balizas de tiendas';
  rings.instanceMatrix.setUsage(DynamicDrawUsage);
  beacons.instanceMatrix.setUsage(DynamicDrawUsage);
  rings.frustumCulled = beacons.frustumCulled = false;
  rings.count = beacons.count = count;

  if (count > 0) scene.add(rings, beacons);

  const pose = new Object3D();
  let dirtyColors = true;

  function updateVisuals(elapsed: number): void {
    if (count === 0) return;
    entries.forEach((entry, index) => {
      const available = entry.cooldown <= 0;
      const pulse = available ? 1 + Math.sin(elapsed * 4.2 + index * 0.9) * 0.1 : 0.72;
      pose.position.set(entry.spec.doorX, 0.08, entry.spec.doorZ);
      pose.rotation.set(0, 0, 0);
      pose.scale.set(pulse, 1, pulse);
      pose.updateMatrix();
      rings.setMatrixAt(index, pose.matrix);

      const bob = available ? 1.55 + Math.sin(elapsed * 3.4 + index) * 0.14 : 1.3;
      pose.position.set(entry.spec.doorX, bob, entry.spec.doorZ);
      pose.rotation.set(0.35, elapsed * (available ? 1.6 : 0.25) + index, 0.35);
      const beaconScale = available ? 1 : 0.55;
      pose.scale.set(beaconScale, beaconScale, beaconScale);
      pose.updateMatrix();
      beacons.setMatrixAt(index, pose.matrix);

      if (dirtyColors) {
        const color = available ? READY_COLOR : BUSY_COLOR;
        rings.setColorAt(index, color);
        beacons.setColorAt(index, color);
      }
    });
    rings.instanceMatrix.needsUpdate = true;
    beacons.instanceMatrix.needsUpdate = true;
    if (dirtyColors) {
      if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
      if (beacons.instanceColor) beacons.instanceColor.needsUpdate = true;
      dirtyColors = false;
    }
  }

  function findNearby(position: { x: number; y: number; z: number }): StoreInteraction | null {
    if (Math.abs(position.y) > 1.35) return null;
    let closest: StoreRuntime | undefined;
    let bestDistance = INTERACT_RADIUS;
    for (const entry of entries) {
      const inside = Math.abs(position.x - entry.spec.x) <= entry.layout.halfX
        && Math.abs(position.z - entry.spec.z) <= entry.layout.halfZ;
      const doorDistance = Math.hypot(position.x - entry.spec.doorX, position.z - entry.spec.doorZ);
      const counterDistance = Math.hypot(
        position.x - entry.layout.counterFrontX,
        position.z - entry.layout.counterFrontZ,
      );
      const effectiveDistance = inside ? Math.min(counterDistance, doorDistance, 1.5) : doorDistance;
      if (effectiveDistance <= bestDistance) {
        bestDistance = effectiveDistance;
        closest = entry;
      }
    }
    if (!closest) return null;
    return {
      store: closest.spec,
      available: closest.cooldown <= 0,
      cooldown: closest.cooldown,
    };
  }

  let activeHeist: {
    entry: StoreRuntime;
    progress: number;
    duration: number;
    intimidated: boolean;
  } | null = null;

  function rob(position: { x: number; y: number; z: number }): RobberyResult | null {
    const nearby = findNearby(position);
    if (!nearby || !nearby.available) return null;
    const entry = entries.find((item) => item.spec.id === nearby.store.id);
    if (!entry) return null;
    entry.cooldown = ROBBERY_COOLDOWN;
    dirtyColors = true;
    return { store: entry.spec, loot: entry.spec.loot };
  }

  function findStoreContaining(position: { x: number; y: number; z: number }): StoreInteriorLayout | null {
    if (Math.abs(position.y) > 1.35) return null;
    for (const entry of entries) {
      if (
        Math.abs(position.x - entry.spec.x) <= entry.layout.halfX
        && Math.abs(position.z - entry.spec.z) <= entry.layout.halfZ
      ) {
        return entry.layout;
      }
    }
    return null;
  }

  function beginHeist(
    position: { x: number; y: number; z: number },
    armed = false,
  ): StoreInteriorLayout | null {
    if (activeHeist) return null;
    const nearby = findNearby(position);
    if (!nearby || !nearby.available) return null;
    const entry = entries.find((item) => item.spec.id === nearby.store.id);
    if (!entry) return null;
    activeHeist = {
      entry,
      progress: 0,
      duration: armed ? 2.6 : 4.5,
      intimidated: armed,
    };
    return entry.layout;
  }

  function stepHeist(
    dt: number,
    playerPos: { x: number; z: number },
    options: { aimingWeapon: boolean; recentShot: boolean },
  ):
    | { status: 'in_progress'; store: StoreSpec; progress: number }
    | { status: 'completed'; store: StoreSpec; loot: number }
    | { status: 'cancelled'; store: StoreSpec; loot: number }
    | null {
    if (!activeHeist || !(dt > 0)) return null;
    const { entry } = activeHeist;
    const inside = Math.abs(playerPos.x - entry.spec.x) <= entry.layout.halfX + 2.5
      && Math.abs(playerPos.z - entry.spec.z) <= entry.layout.halfZ + 2.5;
    const nearDoor = Math.hypot(playerPos.x - entry.spec.doorX, playerPos.z - entry.spec.doorZ) <= 3.6;

    if (!inside && !nearDoor) {
      const partialLoot = activeHeist.progress >= 0.45
        ? Math.round((entry.spec.loot * activeHeist.progress * 0.55) / 10) * 10
        : 0;
      entry.cooldown = activeHeist.progress >= 0.45 ? 45 : 12;
      dirtyColors = true;
      activeHeist = null;
      return { status: 'cancelled', store: entry.spec, loot: partialLoot };
    }

    if (options.aimingWeapon || options.recentShot) activeHeist.intimidated = true;
    const speedFactor = options.aimingWeapon ? 1.45 : 1.0;
    const shotBoost = options.recentShot ? 0.14 : 0;
    activeHeist.progress = Math.min(1, activeHeist.progress + (dt / activeHeist.duration) * speedFactor + shotBoost);

    if (activeHeist.progress >= 1) {
      entry.cooldown = ROBBERY_COOLDOWN;
      dirtyColors = true;
      activeHeist = null;
      return { status: 'completed', store: entry.spec, loot: entry.spec.loot };
    }

    return { status: 'in_progress', store: entry.spec, progress: activeHeist.progress };
  }

  function step(dt: number): void {
    if (!(dt > 0)) return;
    for (const entry of entries) {
      if (entry.cooldown > 0) {
        entry.cooldown = Math.max(0, entry.cooldown - dt);
        if (entry.cooldown === 0) dirtyColors = true;
      }
    }
  }

  function getMarkers(): StoreMapMarker[] {
    return entries.map((entry) => ({
      id: entry.spec.id,
      name: entry.spec.name,
      x: entry.spec.doorX,
      z: entry.spec.doorZ,
      available: entry.cooldown <= 0,
    }));
  }

  function getInteriors(): StoreInteriorLayout[] {
    return entries.map((entry) => entry.layout);
  }

  function reset(): void {
    activeHeist = null;
    for (const entry of entries) entry.cooldown = 0;
    dirtyColors = true;
  }

  updateVisuals(0);

  return {
    get activeHeist() {
      return activeHeist
        ? { store: activeHeist.entry.spec, progress: activeHeist.progress, intimidated: activeHeist.intimidated }
        : null;
    },
    findNearby,
    findStoreContaining,
    rob,
    beginHeist,
    stepHeist,
    step,
    render: updateVisuals,
    getMarkers,
    getInteriors,
    reset,
    dispose() {
      rings.removeFromParent();
      beacons.removeFromParent();
      rings.dispose();
      beacons.dispose();
      ringGeometry.dispose();
      beaconGeometry.dispose();
      material.dispose();
    },
  };
}
