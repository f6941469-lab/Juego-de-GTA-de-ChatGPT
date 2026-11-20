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

  function rob(position: { x: number; y: number; z: number }): RobberyResult | null {
    const nearby = findNearby(position);
    if (!nearby || !nearby.available) return null;
    const entry = entries.find((item) => item.spec.id === nearby.store.id);
    if (!entry) return null;
    entry.cooldown = ROBBERY_COOLDOWN;
    dirtyColors = true;
    return { store: entry.spec, loot: entry.spec.loot };
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
    for (const entry of entries) entry.cooldown = 0;
    dirtyColors = true;
  }

  updateVisuals(0);

  return {
    findNearby,
    rob,
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
