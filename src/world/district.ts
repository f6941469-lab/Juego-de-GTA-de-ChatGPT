import type { Scene } from 'three';
import type { StaticBox } from '../physics/physics';
import { addBuilding, buildingCollider } from './generation/buildings';
import type { BuildingSpec } from './generation/buildings';
import { addCoast } from './generation/coast';
import { DistrictGeometry, DistrictResources, disposeInstances } from './generation/geometry';
import {
  avenues,
  blockSpans,
  crossStreets,
  districtBounds,
  inlandEdge,
  makeRandom,
  roadRectangles,
  shoreline,
} from './generation/layout';
import type { DistrictMap } from './generation/layout';
import { addBench, addLamppost, addStreets } from './generation/streets';
import { addPalm, addPlanter } from './generation/vegetation';
import { createDistrictStreaming, type RegisterSectorFeature, type WorldFocus } from './streaming';

export interface District {
  colliders: StaticBox[];
  spawn: { x: number; y: number; z: number };
  map: DistrictMap;
  update(elapsed: number, hour?: number, focus?: WorldFocus): void;
  stats(): { loaded: number; detailed: number; total: number };
  dispose(): void;
}

const specialLots = new Map<string, BuildingSpec>([
  ['-1:2:0', { x: -107, z: -17.4, width: 18.5, depth: 8.75, floors: 2, palette: 5, style: 'ribbon', entrance: 'south', sign: 'MERCADO' }],
  ['-2:-1:0', { x: -143, z: -132.0, width: 20.4, depth: 10.7, floors: 2, palette: 4, style: 'porch', entrance: 'east', sign: 'TALLER COSTA' }],
  ['4:6:0', { x: 38, z: 123.4, width: 6.7, depth: 9, floors: 3, palette: 1, style: 'deco', entrance: 'east', sign: 'BRISA' }],
  ['2:3:0', { x: -12.15, z: 20.8, width: 8, depth: 12.9, floors: 5, palette: 1, style: 'deco', entrance: 'east', sign: 'HOTEL MIRAMAR' }],
  ['3:3:0', { x: 15.15, z: 21.0, width: 11.9, depth: 12.8, floors: 3, palette: 2, style: 'ribbon', entrance: 'west', sign: 'CLUB NEON' }],
  ['3:1:0', { x: 15, z: -51.2, width: 12.5, depth: 10.1, floors: 12, palette: 0, style: 'tower', entrance: 'west', sign: 'TORRE ALBA' }],
  ['2:2:0', { x: -12.1, z: -16.2, width: 8.25, depth: 10, floors: 3, palette: 3, style: 'deco', entrance: 'east', sign: 'CORAL' }],
]);

const landmarkPins = [
  { x: -12.15, z: 20.8, name: 'Hotel Miramar' },
  { x: 15.15, z: 21, name: 'Club Neón' },
  { x: 15, z: -51.2, name: 'Torre Alba' },
  { x: 37, z: 23, name: 'Jardín Coral' },
  { x: 54.5, z: 7, name: 'Paseo del Mar' },
  { x: -107, z: -17.4, name: 'Mercado de Marea' },
  { x: -143, z: -132, name: 'Taller Costa' },
  { x: -144, z: 130.75, name: 'Plaza Arena' },
  { x: 59, z: 123.4, name: 'Playa Brisa' },
];

export function buildDistrict(scene: Scene, seed = 61865): District {
  const { minX, maxX, minZ, maxZ } = districtBounds;
  const terrainEnd = inlandEdge + 5.5;
  const resources = new DistrictResources();
  const geometry = new DistrictGeometry(resources);
  const streaming = createDistrictStreaming(scene, resources);
  const spawn = { x: 0, y: 0, z: 25 };
  geometry.box('pavement', '#8c918c', -89.5, -0.29, 0, 303, 0.463, 594);
  geometry.box('pavement', '#838e84', (terrainEnd + minX) / 2, -0.114, 0, terrainEnd - minX, 0.211, maxZ - minZ);
  addStreets(geometry, streaming.register);

  const colliders = createTerrainColliders();
  makeCityBlocks(streaming.register, colliders, seed);
  addDistantSkyline(geometry, makeRandom(seed ^ 0x43f27ab));
  addBoulevardGreenery(streaming.register, colliders, makeRandom(seed ^ 0x62cda31));
  const water = addCoast(scene, geometry, seed, streaming.register);
  const landscape = geometry.render();
  scene.add(landscape);
  streaming.update(spawn);

  return {
    colliders,
    spawn,
    map: {
      bounds: { ...districtBounds },
      roads: roadRectangles(),
      water: { x: (shoreline + maxX) / 2, z: 0, width: maxX - shoreline, depth: maxZ - minZ },
      landmarks: landmarkPins.map((landmark) => ({ ...landmark })),
    },
    update(elapsed, hour = 17.25, focus) {
      if (focus) streaming.update(focus);
      const projection = 0.5 + 2.4 * Math.sin((hour - 6) * Math.PI / 12);
      const daylight = Math.max(0, Math.min(1, projection));
      resources.setNightLighting(1 - daylight);
      water.update(elapsed, daylight);
    },
    stats: streaming.stats,
    dispose() {
      streaming.dispose();
      water.dispose();
      disposeInstances(landscape);
      resources.dispose();
    },
  };
}

function addDistantSkyline(geometry: DistrictGeometry, random: () => number): void {
  const colors = ['#8e99a3', '#9db2ba', '#b3aaa9', '#7c8b9d'];
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      const x = -156 + column * 19.5 + random() * 5;
      const z = districtBounds.minZ - 12 - row * 26 - random() * 8;
      const width = 6.9 + random() * 6.3;
      const depth = 6.8 + random() * 5.3;
      const height = 13 + random() * 30 + row * 7;
      const color = colors[(row + column) % colors.length];
      geometry.box('wall', color, x, height / 2 - 0.08, z, width, height, depth);
      geometry.box('trim', '#a8afaf', x, height + 0.5, z, width * 0.76, 1.15, depth * 0.73);
      geometry.box('trim', color, x, height + 1.6, z, width * 0.48, 1.17, depth * 0.49);
      for (let level = 1; level < height; level += 2.2) {
        geometry.box('glass', '#647e95', x, level, z + depth / 2, width * 0.75, 0.72, 0.12);
      }
    }
  }
}

function createTerrainColliders(): StaticBox[] {
  const { minX, minZ, maxZ } = districtBounds;
  const groundWidth = shoreline + 1.12 - minX;
  const groundDepth = maxZ - minZ;
  const centerX = minX + groundWidth / 2;
  const wallHeight = 7;
  const wallWidth = 0.6;
  return [
    { x: centerX, y: -0.5, z: 0, halfX: groundWidth / 2, halfY: 0.5, halfZ: groundDepth / 2 },
    { x: minX, y: wallHeight, z: 0, halfX: wallWidth, halfY: wallHeight, halfZ: groundDepth / 2 },
    { x: shoreline + 0.7, y: wallHeight, z: 0, halfX: wallWidth, halfY: wallHeight, halfZ: groundDepth / 2 },
    { x: centerX, y: wallHeight, z: minZ, halfX: groundWidth / 2, halfY: wallHeight, halfZ: wallWidth },
    { x: centerX, y: wallHeight, z: maxZ, halfX: groundWidth / 2, halfY: wallHeight, halfZ: wallWidth },
  ];
}

function makeCityBlocks(register: RegisterSectorFeature, colliders: StaticBox[], seed: number): void {
  const { minX, minZ, maxZ } = districtBounds;
  const xSpans = blockSpans(avenues, minX, inlandEdge);
  const zSpans = blockSpans(crossStreets, minZ, maxZ);

  // The original boulevard blocks keep their logical indices when the map grows west and north.
  const firstOriginalColumn = avenues.findIndex((street) => street.center === -45);
  const firstOriginalRow = crossStreets.findIndex((street) => street.center === -63);
  for (const [columnIndex, [left, right]] of xSpans.entries()) {
    const column = columnIndex - firstOriginalColumn;
    for (const [rowIndex, [front, back]] of zSpans.entries()) {
      const row = rowIndex - firstOriginalRow;
      const random = makeRandom(seed ^ Math.imul(column + 1, 199423) ^ Math.imul(row + 1, 483817));
      if ((column === 4 && row === 3) || (column === -2 && row === 6) || (column === -3 && row === 2)) {
        const variation = Math.floor(random() * 0x100000000);
        register((left + right) / 2, (front + back) / 2,
          (sector, detailed) => makePark(sector, left, right, front, back, makeRandom(variation), detailed));
        continue;
      }

      const count = back - front >= 19 ? 2 : 1;
      for (let lot = 0; lot < count; lot += 1) {
        const lotDepth = (back - front) / count;
        const centerZ = front + (lot + 0.5) * lotDepth;
        const isDowntown = row >= 0 && row < 2 && column > 0;
        const isIndustrial = row < 0 && column < 0;
        const width = (right - left - 4.6) * (0.85 + random() * 0.15);
        const depth = lotDepth - 3.2 - random() * 1.7;
        const floors = isDowntown ? 5 + Math.floor(random() * 7)
          : isIndustrial ? 1 + Math.floor(random() * 3)
          : 2 + Math.floor(random() * (column === 2 || column === 3 ? 4 : 3));
        const specification = specialLots.get(`${column}:${row}:${lot}`) ?? {
          x: (left + right) / 2 + (random() - 0.5) * 0.84,
          z: centerZ + (random() - 0.5) * 0.62,
          width,
          depth,
          floors,
          palette: Math.floor(random() * 6),
          style: isDowntown ? 'tower' : isIndustrial || floors < 3 ? 'porch' : lot % 2 === 0 ? 'ribbon' : 'deco',
          entrance: column > 2 ? 'west' : 'east',
        };
        const variation = Math.floor(random() * 0x100000000);
        colliders.push(buildingCollider(specification));
        register(specification.x, specification.z, (sector, detailed) =>
          addBuilding(sector, specification, makeRandom(variation), detailed));
      }
    }
  }
}

function addBoulevardGreenery(register: RegisterSectorFeature, colliders: StaticBox[], random: () => number): void {
  const paths = blockSpans(crossStreets, districtBounds.minZ, districtBounds.maxZ);
  for (const [from, to] of paths) {
    for (const direction of [-1, 1]) {
      for (let z = from + 2.75; z < to - 1.85; z += 7.15) {
        const x = direction * 7.08;
        const plantedZ = z + (direction > 0 ? 0.65 : 0);
        const variation = Math.floor(random() * 0x100000000);
        register(x, plantedZ, (sector, detailed) => {
          if (!detailed) return;
          addPalm(sector, x, plantedZ, makeRandom(variation));
          sector.box('pavement', '#8e8c77', x, 0.060, plantedZ, 0.92, 0.026, 0.98);
        });
        colliders.push({ x, y: 2, z: plantedZ, halfX: 0.15, halfY: 2, halfZ: 0.15 });
      }
      if (to - from > 13) {
        const x = direction * 6.54;
        const z = from + (to - from) * 0.62;
        register(x, z, (sector, detailed) => {
          if (detailed) addLamppost(sector, x, z, -direction);
        });
      }
    }
  }
}

function makePark(
  geometry: DistrictGeometry,
  left: number,
  right: number,
  front: number,
  back: number,
  random: () => number,
  detailed: boolean,
): void {
  const x = (left + right) / 2;
  const z = (front + back) / 2;
  geometry.box('pavement', '#77926c', x, 0.056, z, right - left - 1.65, 0.032, back - front - 1.65);
  if (!detailed) return;
  geometry.box('pavement', '#ded0ad', x, 0.079, z, 1.82, 0.017, back - front - 0.8);
  geometry.box('pavement', '#ded0ad', x, 0.081, z, right - left - 0.8, 0.017, 2.24);
  for (const side of [-1, 1]) {
    for (const street of [-1, 1]) {
      addPalm(geometry, x + side * 2.5, z + street * 5.2, random, 1.14);
      addPlanter(geometry, x + side * 2.6, z + street * 9.7, random, 1.08);
      addBench(geometry, x + side * 2.36, z + street * 2.2);
    }
  }
}
