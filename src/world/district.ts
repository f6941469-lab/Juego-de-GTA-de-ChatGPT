import type { Scene } from 'three';
import type { StaticBox } from '../physics/physics';
import { addBuilding } from './generation/buildings';
import type { BuildingSpec } from './generation/buildings';
import { addCoast } from './generation/coast';
import { DistrictGeometry } from './generation/geometry';
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
import { addShop } from './generation/shop';

export interface District {
  colliders: StaticBox[];
  spawn: { x: number; y: number; z: number };
  map: DistrictMap;
  update(elapsed: number, hour?: number): void;
}

const specialLots = new Map<string, BuildingSpec>([
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
  { x: 15, z: 34.2, name: 'Mercado Palma' },
];

export function buildDistrict(scene: Scene, seed = 61865): District {
  const { minX, maxX, minZ, maxZ } = districtBounds;
  const terrainEnd = inlandEdge + 5.5;
  const geometry = new DistrictGeometry();
  geometry.box('pavement', '#8c918c', -89.5, -0.29, 0, 303, 0.463, 530);
  geometry.box('pavement', '#838e84', (terrainEnd + minX) / 2, -0.114, 0, terrainEnd - minX, 0.211, maxZ - minZ);
  addStreets(geometry);

  const colliders = createTerrainColliders();
  makeCityBlocks(geometry, colliders, seed);
  addDistantSkyline(geometry, makeRandom(seed ^ 0x43f27ab));
  addBoulevardGreenery(geometry, colliders, makeRandom(seed ^ 0x62cda31));
  const updateWater = addCoast(scene, geometry, seed);
  scene.add(geometry.render());

  return {
    colliders,
    spawn: { x: 15, y: 0, z: 41.5 },
    map: {
      bounds: { ...districtBounds },
      roads: roadRectangles(),
      water: { x: (shoreline + maxX) / 2, z: 0, width: maxX - shoreline, depth: maxZ - minZ },
      landmarks: landmarkPins.map((landmark) => ({ ...landmark })),
    },
    update(elapsed, hour = 17.25) {
      const projection = 0.5 + 2.4 * Math.sin((hour - 6) * Math.PI / 12);
      const daylight = Math.max(0, Math.min(1, projection));
      geometry.setNightLighting(1 - daylight);
      updateWater(elapsed, daylight);
    },
  };
}

function addDistantSkyline(geometry: DistrictGeometry, random: () => number): void {
  const colors = ['#8e99a3', '#9db2ba', '#b3aaa9', '#7c8b9d'];
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      const x = -112 + column * 14.8 + random() * 5;
      const z = -110 - row * 26 - random() * 8;
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

function makeCityBlocks(geometry: DistrictGeometry, colliders: StaticBox[], seed: number): void {
  const { minX, minZ, maxZ } = districtBounds;
  const xSpans = blockSpans(avenues, minX, inlandEdge);
  const zSpans = blockSpans(crossStreets, minZ, maxZ);

  for (const [column, [left, right]] of xSpans.entries()) {
    for (const [row, [front, back]] of zSpans.entries()) {
      const random = makeRandom(seed ^ Math.imul(column + 1, 199423) ^ Math.imul(row + 1, 483817));
      if (column === 4 && row === 3) {
        makePark(geometry, left, right, front, back, random);
        continue;
      }

      const count = back - front >= 19 ? 2 : 1;
      for (let lot = 0; lot < count; lot += 1) {
        if (column === 3 && row === 3 && lot === 1) {
          addShop(geometry, colliders);
          continue;
        }
        const lotDepth = (back - front) / count;
        const centerZ = front + (lot + 0.5) * lotDepth;
        const isDowntown = row < 2 && column > 0;
        const width = (right - left - 4.6) * (0.85 + random() * 0.15);
        const depth = lotDepth - 3.2 - random() * 1.7;
        const floors = isDowntown ? 5 + Math.floor(random() * 7) : 2 + Math.floor(random() * (column === 2 || column === 3 ? 4 : 3));
        const specification = specialLots.get(`${column}:${row}:${lot}`) ?? {
          x: (left + right) / 2 + (random() - 0.5) * 0.84,
          z: centerZ + (random() - 0.5) * 0.62,
          width,
          depth,
          floors,
          palette: Math.floor(random() * 6),
          style: isDowntown ? 'tower' : (lot % 2 === 0 ? 'ribbon' : (floors < 4 ? 'porch' : 'deco')),
          entrance: column > 2 ? 'west' : 'east',
        };
        addBuilding(geometry, colliders, specification, random);
      }
    }
  }
}

function addBoulevardGreenery(geometry: DistrictGeometry, colliders: StaticBox[], random: () => number): void {
  const paths = blockSpans(crossStreets, districtBounds.minZ, districtBounds.maxZ);
  for (const [from, to] of paths) {
    for (const direction of [-1, 1]) {
      for (let z = from + 2.75; z < to - 1.85; z += 7.15) {
        const x = direction * 7.08;
        const plantedZ = z + (direction > 0 ? 0.65 : 0);
        addPalm(geometry, x, plantedZ, random);
        geometry.box('pavement', '#8e8c77', x, 0.060, plantedZ, 0.92, 0.026, 0.98);
        colliders.push({ x, y: 2, z: plantedZ, halfX: 0.15, halfY: 2, halfZ: 0.15 });
      }
      if (to - from > 13) addLamppost(geometry, direction * 6.54, from + (to - from) * 0.62, -direction);
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
): void {
  const x = (left + right) / 2;
  const z = (front + back) / 2;
  geometry.box('pavement', '#77926c', x, 0.056, z, right - left - 1.65, 0.032, back - front - 1.65);
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
