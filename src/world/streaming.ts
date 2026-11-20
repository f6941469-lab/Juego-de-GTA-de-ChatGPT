import { Group, type Scene } from 'three';
import { DistrictGeometry, disposeInstances, type DistrictResources } from './generation/geometry';

export interface WorldFocus {
  x: number;
  z: number;
}

export type SectorFeature = (geometry: DistrictGeometry, detailed: boolean) => void;
export type RegisterSectorFeature = (x: number, z: number, feature: SectorFeature) => void;

const sectorSize = 64;
const detailRadius = 69;
const loadRadius = 142;
const transitionMargin = 15;
const updateDistance = 5;

interface Sector {
  left: number;
  near: number;
  draw: SectorFeature[];
  instance?: Group;
  detailed?: boolean;
}

function distanceToSector(sector: Sector, focus: WorldFocus): number {
  const dx = Math.max(0, sector.left - focus.x, focus.x - sector.left - sectorSize);
  const dz = Math.max(0, sector.near - focus.z, focus.z - sector.near - sectorSize);
  return Math.hypot(dx, dz);
}

export function createDistrictStreaming(scene: Scene, resources: DistrictResources) {
  const root = new Group();
  root.name = 'Sectores de Costa Palmera';
  scene.add(root);

  const sectors = new Map<string, Sector>();
  let lastX = Infinity;
  let lastZ = Infinity;
  let loaded = 0;
  let detailedCount = 0;
  let pendingCount = 0;

  function register(x: number, z: number, feature: SectorFeature): void {
    const col = Math.floor(x / sectorSize);
    const row = Math.floor(z / sectorSize);
    const key = `${col}:${row}`;
    let sector = sectors.get(key);
    if (!sector) {
      sector = { left: col * sectorSize, near: row * sectorSize, draw: [] };
      sectors.set(key, sector);
    }
    sector.draw.push(feature);
  }

  function rebuildSector(key: string, sector: Sector, detailed: boolean): void {
    if (sector.instance) {
      disposeInstances(sector.instance);
      sector.instance = undefined;
      sector.detailed = undefined;
    }
    const geometry = new DistrictGeometry(resources);
    for (const feature of sector.draw) feature(geometry, detailed);
    sector.instance = geometry.render();
    sector.instance.name = `Sector ${key} · ${detailed ? 'detalle' : 'silueta'}`;
    sector.detailed = detailed;
    root.add(sector.instance);
  }

  function update(focus: WorldFocus, maxRebuilds = 1): void {
    const initialLoad = !Number.isFinite(lastX) || !Number.isFinite(lastZ);
    const movedEnough = initialLoad || Math.hypot(focus.x - lastX, focus.z - lastZ) >= updateDistance;
    if (!movedEnough && pendingCount === 0) return;
    if (movedEnough) {
      lastX = focus.x;
      lastZ = focus.z;
    }

    const budget = initialLoad ? Infinity : Math.max(1, maxRebuilds);
    let dirtyClosestKey: string | undefined;
    let dirtyClosestSector: Sector | undefined;
    let dirtyClosestDetailed = false;
    let dirtyClosestDist = Infinity;
    let queued = 0;

    loaded = 0;
    detailedCount = 0;

    for (const [key, sector] of sectors) {
      const distance = distanceToSector(sector, focus);
      const visible = distance <= loadRadius + (sector.instance ? transitionMargin : 0);
      const detailed = distance <= detailRadius + (sector.detailed ? transitionMargin : 0);

      if (!visible) {
        if (sector.instance) {
          disposeInstances(sector.instance);
          sector.instance = undefined;
          sector.detailed = undefined;
        }
        continue;
      }

      const needsRebuild = !sector.instance || sector.detailed !== detailed;
      if (needsRebuild) {
        if (budget === Infinity) {
          rebuildSector(key, sector, detailed);
        } else {
          queued++;
          if (distance < dirtyClosestDist) {
            dirtyClosestDist = distance;
            dirtyClosestKey = key;
            dirtyClosestSector = sector;
            dirtyClosestDetailed = detailed;
          }
        }
      }

      if (sector.instance) {
        loaded += 1;
        if (sector.detailed) detailedCount += 1;
      }
    }

    if (budget !== Infinity && dirtyClosestKey && dirtyClosestSector) {
      const wasLoaded = Boolean(dirtyClosestSector.instance);
      const wasDetailed = Boolean(dirtyClosestSector.detailed);
      rebuildSector(dirtyClosestKey, dirtyClosestSector, dirtyClosestDetailed);
      if (!wasLoaded) loaded += 1;
      if (dirtyClosestDetailed && !wasDetailed) detailedCount += 1;
      else if (!dirtyClosestDetailed && wasDetailed) detailedCount = Math.max(0, detailedCount - 1);
      queued = Math.max(0, queued - 1);
    }

    pendingCount = queued;
  }

  return {
    register,
    update,
    flush(focus: WorldFocus) {
      update(focus, Infinity);
    },
    stats: () => ({ loaded, detailed: detailedCount, total: sectors.size, pending: pendingCount }),
    dispose() {
      for (const sector of sectors.values()) {
        if (sector.instance) disposeInstances(sector.instance);
      }
      sectors.clear();
      root.removeFromParent();
      loaded = detailedCount = pendingCount = 0;
      lastX = lastZ = Infinity;
    },
  };
}
