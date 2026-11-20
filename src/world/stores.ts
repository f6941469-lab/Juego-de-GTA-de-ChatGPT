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

interface StoreRuntime {
  spec: StoreSpec;
  cooldown: number;
}

const INTERACT_RADIUS = 2.75;
const ROBBERY_COOLDOWN = 90;
const READY_COLOR = new Color('#ffe168');
const BUSY_COLOR = new Color('#586274');

export function createStores(scene: Scene, specs: readonly StoreSpec[]) {
  const entries: StoreRuntime[] = specs.map((spec) => ({ spec, cooldown: 0 }));
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
      const distance = Math.hypot(position.x - entry.spec.doorX, position.z - entry.spec.doorZ);
      if (distance <= bestDistance) {
        bestDistance = distance;
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
