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

  function update(focus: WorldFocus): void {
    if (Math.hypot(focus.x - lastX, focus.z - lastZ) < updateDistance) return;
    lastX = focus.x;
    lastZ = focus.z;
    loaded = 0;
    detailedCount = 0;

    for (const [key, sector] of sectors) {
      const distance = distanceToSector(sector, focus);
      const visible = distance <= loadRadius + (sector.instance ? transitionMargin : 0);
      const detailed = distance <= detailRadius + (sector.detailed ? transitionMargin : 0);
      if (sector.instance && (!visible || sector.detailed !== detailed)) {
        disposeInstances(sector.instance);
        sector.instance = undefined;
        sector.detailed = undefined;
      }
      if (!visible) continue;
      if (!sector.instance) {
        const geometry = new DistrictGeometry(resources);
        for (const feature of sector.draw) feature(geometry, detailed);
        sector.instance = geometry.render();
        sector.instance.name = `Sector ${key} · ${detailed ? 'detalle' : 'silueta'}`;
        sector.detailed = detailed;
        root.add(sector.instance);
      }
      loaded += 1;
      if (detailed) detailedCount += 1;
    }
  }

  return {
    register,
    update,
    stats: () => ({ loaded, detailed: detailedCount, total: sectors.size }),
    dispose() {
      for (const sector of sectors.values()) {
        if (sector.instance) disposeInstances(sector.instance);
      }
      sectors.clear();
      root.removeFromParent();
      loaded = detailedCount = 0;
    },
  };
}
