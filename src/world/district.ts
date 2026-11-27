import type { Scene } from 'three';
import type { StaticBox } from '../physics/physics';
import { addBuilding } from './generation/buildings';
import type { BuildingSpec } from './generation/buildings';
import { addCoast } from './generation/coast';
import { DistrictGeometry } from './generation/geometry';
import {
  addWorldExpansion,
  createExpandedTerrainColliders,
  expansionBridges,
  expansionIslands,
  expansionLandmarks,
  expansionMountains,
  expansionRoads,
} from './generation/expansion';
import {
  avenues,
  blockSpans,
  crossStreets,
  districtBounds,
  inlandEdge,
  makeRandom,
  roadRectangles,
  shoreline,
  worldBounds,
} from './generation/layout';
import type { DistrictMap, LandmarkPin } from './generation/layout';
import { addBench, addLamppost, addStreets } from './generation/streets';
import { addPalm, addPlanter } from './generation/vegetation';
import { addShop, addStoreStructure, allShops } from './generation/shop';
import { addBusStops, addMetroStation, metroStations } from './generation/transit';

export interface District {
  colliders: StaticBox[];
  spawn: { x: number; y: number; z: number };
  map: DistrictMap;
  update(elapsed: number, hour?: number, focus?: { x: number; z: number }): void;
}

const specialLots = new Map<string, BuildingSpec>([
  ['2:3:0', { x: -12.15, z: 20.8, width: 8, depth: 12.9, floors: 5, palette: 1, style: 'deco', entrance: 'east', sign: 'HOTEL MIRAMAR' }],
  ['3:3:0', { x: 15.15, z: 21.0, width: 11.9, depth: 12.8, floors: 3, palette: 2, style: 'ribbon', entrance: 'west', sign: 'CLUB NEON' }],
  ['3:1:0', { x: 15, z: -51.2, width: 12.5, depth: 10.1, floors: 12, palette: 0, style: 'tower', entrance: 'west', sign: 'TORRE ALBA' }],
  ['2:2:0', { x: -12.1, z: -16.2, width: 8.25, depth: 10, floors: 3, palette: 3, style: 'deco', entrance: 'east', sign: 'CORAL' }],
]);

const shopByLot = new Map(allShops.map((item) => [item.lotKey, item]));
const metroByLot = new Map([
  ['3:4:0', metroStations[0]],
  ['0:1:0', metroStations[1]],
]);

const landmarkPins: LandmarkPin[] = [
  { x: -12.15, z: 20.8, name: 'Hotel Miramar', kind: 'landmark' },
  { x: 15.15, z: 21, name: 'Club Neón', kind: 'landmark' },
  { x: 15, z: -51.2, name: 'Torre Alba', kind: 'landmark' },
  { x: 37, z: 23, name: 'Jardín Coral', kind: 'landmark' },
  { x: 54.5, z: 7, name: 'Paseo del Mar', kind: 'landmark' },
  ...allShops.map((store): LandmarkPin => ({ x: store.centerX, z: store.centerZ, name: store.name, kind: 'shop' })),
  ...metroStations.map((station): LandmarkPin => ({ x: station.center.x, z: station.center.z, name: station.name, kind: 'transit' })),
  ...expansionLandmarks,
];

export function buildDistrict(scene: Scene, seed = 61865): District {
  const { minX, minZ, maxZ } = districtBounds;
  const terrainEnd = inlandEdge + 5.5;
  const geometry = new DistrictGeometry();
  geometry.box('pavement', '#7b8774', -249, -0.34, 0, 622, 0.46, 1120);
  geometry.box('pavement', '#838e84', (terrainEnd + minX) / 2, -0.114, 0, terrainEnd - minX, 0.211, maxZ - minZ);
  addStreets(geometry);

  const colliders = createExpandedTerrainColliders();
  makeCityBlocks(geometry, colliders, seed);
  addBusStops(geometry, colliders);
  addWorldExpansion(geometry, colliders, makeRandom(seed ^ 0x51a94d3));
  addDistantSkyline(geometry, makeRandom(seed ^ 0x43f27ab));
  addBoulevardGreenery(geometry, colliders, makeRandom(seed ^ 0x62cda31));
  const updateWater = addCoast(scene, geometry, seed);
  scene.add(geometry.render());

  return {
    colliders,
    spawn: { x: 15, y: 0, z: 41.5 },
    map: {
      bounds: { ...worldBounds },
      roads: [...roadRectangles(), ...expansionRoads],
      water: {
        x: (shoreline + worldBounds.maxX) / 2,
        z: 0,
        width: worldBounds.maxX - shoreline,
        depth: worldBounds.maxZ - worldBounds.minZ,
      },
      islands: expansionIslands.map((island) => ({ ...island })),
      bridges: expansionBridges.map((bridge) => ({ ...bridge })),
      mountains: expansionMountains.map((mountain) => ({ ...mountain })),
      landmarks: landmarkPins.map((landmark) => ({ ...landmark })),
    },
    update(elapsed, hour = 17.25, focus) {
      const projection = 0.5 + 2.4 * Math.sin((hour - 6) * Math.PI / 12);
      const daylight = Math.max(0, Math.min(1, projection));
      geometry.setNightLighting(1 - daylight);
      if (focus) geometry.updateVisibility(focus.x, focus.z);
      updateWater(elapsed, daylight);
    },
  };
}

function addDistantSkyline(geometry: DistrictGeometry, random: () => number): void {
  const colors = ['#8e99a3', '#9db2ba', '#b3aaa9', '#7c8b9d'];
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      const x = -180 + column * 32 + random() * 6;
      const z = -475 - row * 34 - random() * 10;
      const width = 10 + random() * 7;
      const depth = 9 + random() * 6;
      const height = 22 + random() * 38 + row * 10;
      const color = colors[(row + column) % colors.length];
      geometry.box('wall', color, x, height / 2 - 0.08, z, width, height, depth);
      geometry.box('trim', '#a8afaf', x, height + 0.5, z, width * 0.76, 1.15, depth * 0.73);
      geometry.box('trim', color, x, height + 1.6, z, width * 0.48, 1.17, depth * 0.49);
      for (let level = 1; level < height; level += 2.6) {
        geometry.box('glass', '#647e95', x, level, z + depth / 2, width * 0.75, 0.72, 0.12);
      }
    }
  }
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
        const lotKey = `${column}:${row}:${lot}`;
        if (lotKey === '3:3:1') {
          addShop(geometry, colliders);
          continue;
        }
        const store = shopByLot.get(lotKey);
        if (store) {
          addStoreStructure(geometry, colliders, store);
          continue;
        }
        const metro = metroByLot.get(lotKey);
        if (metro) {
          addMetroStation(geometry, colliders, metro);
          continue;
        }
        const lotDepth = (back - front) / count;
        const centerZ = front + (lot + 0.5) * lotDepth;
        const isDowntown = row < 2 && column > 0;
        const width = (right - left - 4.6) * (0.85 + random() * 0.15);
        const depth = lotDepth - 3.2 - random() * 1.7;
        const floors = isDowntown ? 5 + Math.floor(random() * 7) : 2 + Math.floor(random() * (column === 2 || column === 3 ? 4 : 3));
        const specification = specialLots.get(lotKey) ?? {
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
