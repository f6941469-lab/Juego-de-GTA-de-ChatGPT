import type { Point3, StaticBox } from '../../physics/physics';
import type { DistrictGeometry } from './geometry';

export interface BusStopDef {
  id: string;
  name: string;
  waitPoint: Point3;
  roadStop: Point3;
  facing: number;
}

export interface MetroStationDef {
  id: string;
  name: string;
  entrance: Point3;
  platform: Point3;
  trackX: number;
  trackZ: number;
  center: Point3;
}

export const busStops: readonly BusStopDef[] = [
  {
    id: 'bus:mercado',
    name: 'Parada Mercado Palma',
    waitPoint: { x: 22.0, y: 0.08, z: 39.7 },
    roadStop: { x: 22.0, y: 0.47, z: 43.0 },
    facing: Math.PI,
  },
  {
    id: 'bus:jardin',
    name: 'Parada Jardín Coral',
    waitPoint: { x: 33.6, y: 0.08, z: 26.0 },
    roadStop: { x: 30.0, y: 0.47, z: 26.0 },
    facing: -Math.PI / 2,
  },
  {
    id: 'bus:torre',
    name: 'Parada Torre Alba',
    waitPoint: { x: 22.0, y: 0.08, z: -23.0 },
    roadStop: { x: 22.0, y: 0.47, z: -26.0 },
    facing: 0,
  },
  {
    id: 'bus:oeste',
    name: 'Parada Bulevar Oeste',
    waitPoint: { x: -26.6, y: 0.08, z: 2.2 },
    roadStop: { x: -24.0, y: 0.47, z: 2.2 },
    facing: Math.PI / 2,
  },
];

export const metroStations: readonly MetroStationDef[] = [
  {
    id: 'metro:sur',
    name: 'Metro Sur · Palma',
    center: { x: 15, y: 0, z: 55.8 },
    entrance: { x: 15, y: 0.08, z: 50.4 },
    platform: { x: 15, y: 0.08, z: 55.6 },
    trackX: 15,
    trackZ: 58.9,
  },
  {
    id: 'metro:norte',
    name: 'Metro Norte · Centro',
    center: { x: -58.5, y: 0, z: -52.2 },
    entrance: { x: -58.5, y: 0.08, z: -57.6 },
    platform: { x: -58.5, y: 0.08, z: -52.4 },
    trackX: -58.5,
    trackZ: -49.1,
  },
];

export function addBusStops(geometry: DistrictGeometry, colliders: StaticBox[]): void {
  for (const stop of busStops) {
    const { x, z } = stop.waitPoint;
    const alongX = Math.abs(Math.sin(stop.facing)) < 0.5;
    // Small shelter post + glass back + bench (offset behind waitPoint so waitPoint stays walkable)
    const backOffset = stop.facing === Math.PI ? -0.9 : stop.facing === 0 ? 0.9 : 0;
    const sideOffset = stop.facing === -Math.PI / 2 ? 0.9 : stop.facing === Math.PI / 2 ? -0.9 : 0;
    const sx = x + sideOffset;
    const sz = z + backOffset;
    const w = alongX ? 2.8 : 0.16;
    const d = alongX ? 0.16 : 2.8;
    geometry.box('trim', '#354954', sx, 1.3, sz, w, 2.4, d, true);
    colliders.push({ x: sx, y: 1.2, z: sz, halfX: w / 2, halfY: 1.2, halfZ: d / 2 });
    geometry.box('trim', '#e9d8b5', sx - sideOffset * 0.35, 2.55, sz - backOffset * 0.35, alongX ? 3.0 : 1.1, 0.12, alongX ? 1.1 : 3.0, true);
    geometry.box('aquaLight', '#5ee6cd', sx - sideOffset * 0.35, 2.48, sz - backOffset * 0.35, alongX ? 2.6 : 0.14, 0.05, alongX ? 0.14 : 2.6);
    // Bus stop sign pole
    const px = alongX ? sx - 1.55 : sx;
    const pz = alongX ? sz : sz - 1.55;
    geometry.box('trim', '#4a5a66', px, 1.5, pz, 0.1, 3.0, 0.1);
    geometry.box('goldLight', '#f5c46b', px, 2.82, pz, 0.42, 0.42, 0.14);
    colliders.push({ x: px, y: 1.5, z: pz, halfX: 0.12, halfY: 1.5, halfZ: 0.12 });
  }
}

export function addMetroStation(geometry: DistrictGeometry, colliders: StaticBox[], station: MetroStationDef): void {
  const { x, z } = station.center;
  function solid(finish: 'wall' | 'trim', color: string, bx: number, by: number, bz: number, w: number, h: number, d: number, collide = true) {
    geometry.box(finish, color, bx, by, bz, w, h, d, true);
    if (collide) colliders.push({ x: bx, y: by, z: bz, halfX: w / 2, halfY: h / 2, halfZ: d / 2 });
  }
  // Open-north walkable covered station pavilion (10m x 10m)
  solid('wall', '#334652', x - 4.88, 1.7, z, 0.24, 3.4, 10.2);
  solid('wall', '#334652', x + 4.88, 1.7, z, 0.24, 3.4, 10.2);
  solid('wall', '#253540', x, 1.7, z + 5.0, 10.0, 3.4, 0.24);
  solid('trim', '#dce4e2', x, 3.45, z, 10.4, 0.24, 10.6);
  solid('wall', '#9aa6a2', x, 0.04, z, 9.6, 0.08, 9.8);
  // North facade pillars with wide 3.6m central opening
  for (const dx of [-4.0, -2.5, 2.5, 4.0]) {
    solid('trim', '#2a7f86', x + dx, 1.7, z - 4.95, 0.35, 3.4, 0.28);
  }
  solid('trim', '#2a7f86', x, 3.05, z - 4.95, 10.0, 0.7, 0.32);
  // Metro illuminated header bar
  geometry.box('aquaLight', '#57f0dc', x, 3.12, z - 5.2, 7.2, 0.22, 0.14);
  geometry.box('goldLight', '#ffd57e', x, 3.55, z - 5.15, 3.6, 0.44, 0.14);
  // Platform safety yellow strip and track bed
  geometry.box('paint', '#e5b84b', x, 0.095, z + 2.3, 9.2, 0.02, 0.35);
  geometry.box('asphalt', '#1c2329', x, 0.05, z + 3.6, 9.4, 0.06, 2.3);
  // Interior lighting strip
  geometry.box('goldLight', '#ffdf9e', x, 3.28, z, 5.5, 0.06, 0.3);
}
