import type { Scene } from 'three';
import type { StaticBox } from '../physics/physics';
import { addBuilding, buildingCollider } from './generation/buildings';
import type { BuildingSpec } from './generation/buildings';
import { addCoast } from './generation/coast';
import { DistrictGeometry, DistrictResources, disposeInstances } from './generation/geometry';
import {
  avenues,
  blockSpans,
  bridgeRectangles,
  bridges,
  centralIslandBounds,
  crossStreets,
  districtBounds,
  districtZones,
  eastLandBounds,
  inlandEdge,
  landmassRectangles,
  makeRandom,
  roadRectangles,
  shoreline,
  storeSpecs,
  westAvenues,
  westLandBounds,
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
  ['2:2:0', { x: -12.1, z: -16.2, width: 8.25, depth: 10, floors: 3, palette: 3, style: 'deco', entrance: 'east', sign: 'JOYERIA' }],
]);

const westSpecialBlocks = new Map<string, BuildingSpec>([
  ['3:2', { x: -343.5, z: -124.5, width: 24, depth: 14, floors: 6, palette: 0, style: 'tower', entrance: 'west', sign: 'RELOJ' }],
  ['3:6', { x: -343.5, z: 26, width: 23, depth: 13, floors: 2, palette: 5, style: 'ribbon', entrance: 'west', sign: 'BODEGA' }],
  ['1:5', { x: -432, z: -10.75, width: 23, depth: 12, floors: 2, palette: 1, style: 'deco', entrance: 'east', sign: 'FARMACIA' }],
  ['4:10', { x: -302, z: 169, width: 20, depth: 12, floors: 2, palette: 4, style: 'porch', entrance: 'east', sign: 'BAZAR' }],
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
  { x: -225, z: 7, name: 'Isla Estrella' },
  { x: -366, z: -104, name: 'Centro Financiero' },
  { x: -366, z: 26, name: 'Pequeña Palmera' },
  { x: -282, z: 150, name: 'Puerto y Muelles' },
];

export function buildDistrict(scene: Scene, seed = 61865): District {
  const terrainEnd = inlandEdge + 5.5;
  const resources = new DistrictResources();
  const geometry = new DistrictGeometry(resources);
  const streaming = createDistrictStreaming(scene, resources);
  const spawn = { x: 0, y: 0, z: 25 };

  // Base landmasses
  geometry.box('pavement', '#8c918c', -61, -0.29, 0, 244, 0.463, eastLandBounds.maxZ - eastLandBounds.minZ);
  geometry.box('pavement', '#838e84', (terrainEnd + eastLandBounds.minX) / 2, -0.114, 0, terrainEnd - eastLandBounds.minX, 0.211, eastLandBounds.maxZ - eastLandBounds.minZ);

  const westWidth = westLandBounds.maxX - westLandBounds.minX;
  const westCenterX = (westLandBounds.minX + westLandBounds.maxX) / 2;
  const westDepth = westLandBounds.maxZ - westLandBounds.minZ;
  geometry.box('pavement', '#868b89', westCenterX, -0.29, 0, westWidth, 0.463, westDepth);
  geometry.box('pavement', '#7e8682', westCenterX, -0.114, 0, westWidth, 0.211, westDepth);

  const centralWidth = centralIslandBounds.maxX - centralIslandBounds.minX;
  const centralDepth = centralIslandBounds.maxZ - centralIslandBounds.minZ;
  const centralX = (centralIslandBounds.minX + centralIslandBounds.maxX) / 2;
  const centralZ = (centralIslandBounds.minZ + centralIslandBounds.maxZ) / 2;
  geometry.box('pavement', '#8a9186', centralX, -0.29, centralZ, centralWidth, 0.463, centralDepth);
  geometry.box('pavement', '#77926c', centralX, -0.114, centralZ, centralWidth - 1.5, 0.211, centralDepth - 1.5);

  // Port dock pier extending subtly into the southern bay on the West side
  geometry.box('trim', '#7c6a56', -263.5, -0.05, 174, 7, 0.14, 24);
  geometry.box('trim', '#5d534a', -261.2, -1.1, 165, 0.9, 2.0, 0.9);
  geometry.box('trim', '#5d534a', -261.2, -1.1, 183, 0.9, 2.0, 0.9);

  addStreets(geometry, streaming.register);

  const colliders = createTerrainColliders();
  addSeawalls(geometry, colliders);
  makeCityBlocks(streaming.register, colliders, seed);
  makeWestBlocks(streaming.register, colliders, seed);
  makeCentralIslandBlocks(streaming.register, colliders, seed);
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
      water: { x: (shoreline + districtBounds.maxX) / 2, z: 0, width: districtBounds.maxX - shoreline, depth: districtBounds.maxZ - districtBounds.minZ },
      landmarks: landmarkPins.map((landmark) => ({ ...landmark })),
      landmasses: landmassRectangles(),
      bridges: bridgeRectangles(),
      districts: districtZones.map((zone) => ({ ...zone })),
      stores: storeSpecs.map((store) => ({ ...store })),
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
    for (let column = 0; column < 22; column += 1) {
      const x = -450 + column * 22 + random() * 5;
      const z = districtBounds.minZ - 16 - row * 26 - random() * 8;
      const width = 7.2 + random() * 6.5;
      const depth = 6.8 + random() * 5.3;
      const height = 14 + random() * 32 + row * 7;
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
  const eastGroundWidth = shoreline + 1.12 - eastLandBounds.minX;
  const eastGroundDepth = eastLandBounds.maxZ - eastLandBounds.minZ;
  const eastCenterX = eastLandBounds.minX + eastGroundWidth / 2;

  const westGroundWidth = westLandBounds.maxX - westLandBounds.minX;
  const westGroundDepth = westLandBounds.maxZ - westLandBounds.minZ;
  const westCenterX = (westLandBounds.minX + westLandBounds.maxX) / 2;

  const centralWidth = centralIslandBounds.maxX - centralIslandBounds.minX;
  const centralDepth = centralIslandBounds.maxZ - centralIslandBounds.minZ;
  const centralX = (centralIslandBounds.minX + centralIslandBounds.maxX) / 2;
  const centralZ = (centralIslandBounds.minZ + centralIslandBounds.maxZ) / 2;

  const wallHeight = 7;
  const wallWidth = 0.6;
  const boxes: StaticBox[] = [
    // East Island ground + outer boundaries (east, north, south)
    { x: eastCenterX, y: -0.5, z: 0, halfX: eastGroundWidth / 2, halfY: 0.5, halfZ: eastGroundDepth / 2 },
    { x: shoreline + 0.7, y: wallHeight, z: 0, halfX: wallWidth, halfY: wallHeight, halfZ: eastGroundDepth / 2 },
    { x: eastCenterX, y: wallHeight, z: eastLandBounds.minZ, halfX: eastGroundWidth / 2, halfY: wallHeight, halfZ: wallWidth },
    { x: eastCenterX, y: wallHeight, z: eastLandBounds.maxZ, halfX: eastGroundWidth / 2, halfY: wallHeight, halfZ: wallWidth },

    // West Mainland ground + outer boundaries (west, north, south)
    { x: westCenterX, y: -0.5, z: 0, halfX: westGroundWidth / 2, halfY: 0.5, halfZ: westGroundDepth / 2 },
    { x: westLandBounds.minX, y: wallHeight, z: 0, halfX: wallWidth, halfY: wallHeight, halfZ: westGroundDepth / 2 },
    { x: westCenterX, y: wallHeight, z: westLandBounds.minZ, halfX: westGroundWidth / 2, halfY: wallHeight, halfZ: wallWidth },
    { x: westCenterX, y: wallHeight, z: westLandBounds.maxZ, halfX: westGroundWidth / 2, halfY: wallHeight, halfZ: wallWidth },

    // Isla Estrella ground
    { x: centralX, y: -0.5, z: centralZ, halfX: centralWidth / 2, halfY: 0.5, halfZ: centralDepth / 2 },
  ];

  // Bridge decks and side guardrails over the bay
  for (const bridge of bridges) {
    for (const [start, end] of bridge.spans) {
      const halfX = (end - start) / 2 + 0.3;
      const centerX = (start + end) / 2;
      boxes.push({ x: centerX, y: -0.25, z: bridge.z, halfX, halfY: 0.25, halfZ: bridge.width / 2 });
      for (const side of [-1, 1]) {
        boxes.push({
          x: centerX,
          y: 0.42,
          z: bridge.z + side * (bridge.width / 2 + 0.28),
          halfX,
          halfY: 0.42,
          halfZ: 0.22,
        });
      }
    }
  }

  return boxes;
}

function seawallIntervals(minZ: number, maxZ: number, openings: readonly { z: number; halfWidth: number }[]): [number, number][] {
  const sorted = [...openings].sort((a, b) => a.z - b.z);
  const segments: [number, number][] = [];
  let cursor = minZ;
  for (const gap of sorted) {
    const gapStart = gap.z - gap.halfWidth;
    const gapEnd = gap.z + gap.halfWidth;
    if (gapStart > cursor + 0.5) segments.push([cursor, gapStart]);
    cursor = Math.max(cursor, gapEnd);
  }
  if (maxZ > cursor + 0.5) segments.push([cursor, maxZ]);
  return segments;
}

function addSeawalls(geometry: DistrictGeometry, colliders: StaticBox[]): void {
  const bridgeOpenings = bridges.map((bridge) => ({ z: bridge.z, halfWidth: bridge.width / 2 + 0.1 }));

  for (const xEdge of [eastLandBounds.minX, westLandBounds.maxX]) {
    for (const [start, end] of seawallIntervals(eastLandBounds.minZ, eastLandBounds.maxZ, bridgeOpenings)) {
      const length = end - start;
      const centerZ = (start + end) / 2;
      geometry.box('pavement', '#cfc6b4', xEdge, 0.28, centerZ, 0.62, 0.62, length);
      colliders.push({ x: xEdge, y: 0.45, z: centerZ, halfX: 0.35, halfY: 0.45, halfZ: length / 2 });
    }
  }

  // Isla Estrella perimeter seawall (open at Calzada Central z = 7)
  const centralOpening = [{ z: 7, halfWidth: 5.1 }];
  for (const xEdge of [centralIslandBounds.minX, centralIslandBounds.maxX]) {
    for (const [start, end] of seawallIntervals(centralIslandBounds.minZ, centralIslandBounds.maxZ, centralOpening)) {
      const length = end - start;
      const centerZ = (start + end) / 2;
      geometry.box('pavement', '#d7ceb9', xEdge, 0.28, centerZ, 0.58, 0.6, length);
      colliders.push({ x: xEdge, y: 0.45, z: centerZ, halfX: 0.32, halfY: 0.45, halfZ: length / 2 });
    }
  }
  const centralWidth = centralIslandBounds.maxX - centralIslandBounds.minX;
  const centralX = (centralIslandBounds.minX + centralIslandBounds.maxX) / 2;
  for (const zEdge of [centralIslandBounds.minZ, centralIslandBounds.maxZ]) {
    geometry.box('pavement', '#d7ceb9', centralX, 0.28, zEdge, centralWidth, 0.6, 0.58);
    colliders.push({ x: centralX, y: 0.45, z: zEdge, halfX: centralWidth / 2, halfY: 0.45, halfZ: 0.32 });
  }
}

function makeCityBlocks(register: RegisterSectorFeature, colliders: StaticBox[], seed: number): void {
  const { minX, minZ, maxZ } = eastLandBounds;
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

function makeWestBlocks(register: RegisterSectorFeature, colliders: StaticBox[], seed: number): void {
  const { minX, maxX, minZ, maxZ } = westLandBounds;
  const xSpans = blockSpans(westAvenues, minX, maxX);
  const zSpans = blockSpans(crossStreets, minZ, maxZ);

  for (const [column, [left, right]] of xSpans.entries()) {
    for (const [row, [front, back]] of zSpans.entries()) {
      const random = makeRandom(seed ^ Math.imul(column + 31, 294731) ^ Math.imul(row + 19, 618253));
      const blockWidth = right - left;

      // Easternmost waterfront promenade strip along the bay (column === 5) or park blocks
      if (column === xSpans.length - 1 || (column === 2 && (row === 3 || row === 7))) {
        const variation = Math.floor(random() * 0x100000000);
        if (blockWidth >= 8) {
          register((left + right) / 2, (front + back) / 2,
            (sector, detailed) => makePark(sector, left, right, front, back, makeRandom(variation), detailed));
        }
        continue;
      }

      const special = westSpecialBlocks.get(`${column}:${row}`);
      if (special) {
        const variation = Math.floor(random() * 0x100000000);
        colliders.push(buildingCollider(special));
        register(special.x, special.z, (sector, detailed) =>
          addBuilding(sector, special, makeRandom(variation), detailed));
        continue;
      }

      const centerZ = (front + back) / 2;
      const isFinancial = centerZ < -45;
      const isPort = centerZ >= 95;
      const count = back - front >= 24 && !isPort ? 2 : 1;
      for (let lot = 0; lot < count; lot += 1) {
        const lotDepth = (back - front) / count;
        const lotZ = front + (lot + 0.5) * lotDepth;
        const width = Math.max(4.5, (blockWidth - 4.8) * (0.84 + random() * 0.14));
        const depth = Math.max(4.5, lotDepth - 3.6 - random() * 1.6);
        const floors = isFinancial ? 6 + Math.floor(random() * 8)
          : isPort ? 1 + Math.floor(random() * 3)
          : 2 + Math.floor(random() * 3);
        const specification: BuildingSpec = {
          x: (left + right) / 2 + (random() - 0.5) * 0.75,
          z: lotZ + (random() - 0.5) * 0.55,
          width,
          depth,
          floors,
          palette: isPort ? 4 + (Math.floor(random() * 2)) : Math.floor(random() * 6),
          style: isFinancial ? 'tower' : isPort ? 'porch' : lot % 2 === 0 ? 'ribbon' : 'deco',
          entrance: column % 2 === 0 ? 'east' : 'west',
        };
        const variation = Math.floor(random() * 0x100000000);
        colliders.push(buildingCollider(specification));
        register(specification.x, specification.z, (sector, detailed) =>
          addBuilding(sector, specification, makeRandom(variation), detailed));
      }
    }
  }
}

function makeCentralIslandBlocks(register: RegisterSectorFeature, colliders: StaticBox[], seed: number): void {
  const random = makeRandom(seed ^ 0x7712b9);
  const lots: BuildingSpec[] = [
    { x: -239, z: -11, width: 14, depth: 12, floors: 2, palette: 1, style: 'deco', entrance: 'east', sign: 'CAFE' },
    { x: -211, z: -11, width: 12, depth: 11, floors: 2, palette: 0, style: 'porch', entrance: 'west' },
    { x: -211, z: 23, width: 12, depth: 11, floors: 2, palette: 3, style: 'deco', entrance: 'west' },
  ];
  for (const spec of lots) {
    const variation = Math.floor(random() * 0x100000000);
    colliders.push(buildingCollider(spec));
    register(spec.x, spec.z, (sector, detailed) =>
      addBuilding(sector, spec, makeRandom(variation), detailed));
  }
  const parkVar = Math.floor(random() * 0x100000000);
  register(-238, 23, (sector, detailed) =>
    makePark(sector, -247, -229, 13, 33, makeRandom(parkVar), detailed));
}

function addBoulevardGreenery(register: RegisterSectorFeature, colliders: StaticBox[], random: () => number): void {
  const paths = blockSpans(crossStreets, eastLandBounds.minZ, eastLandBounds.maxZ);
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

  // Main West downtown avenue (-366) palms & streetlights
  for (const [from, to] of paths) {
    for (const direction of [-1, 1]) {
      for (let z = from + 3.2; z < to - 2.4; z += 8.6) {
        const x = -366 + direction * 7.15;
        const plantedZ = z;
        const variation = Math.floor(random() * 0x100000000);
        register(x, plantedZ, (sector, detailed) => {
          if (!detailed) return;
          addPalm(sector, x, plantedZ, makeRandom(variation), 0.92);
          sector.box('pavement', '#8e8c77', x, 0.060, plantedZ, 0.9, 0.026, 0.96);
        });
        colliders.push({ x, y: 2, z: plantedZ, halfX: 0.15, halfY: 2, halfZ: 0.15 });
      }
      if (to - from > 14) {
        const x = -366 + direction * 6.55;
        const z = from + (to - from) * 0.5;
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
  const width = right - left;
  const depth = back - front;
  geometry.box('pavement', '#77926c', x, 0.056, z, Math.max(2, width - 1.65), 0.032, Math.max(2, depth - 1.65));
  if (!detailed) return;
  geometry.box('pavement', '#ded0ad', x, 0.079, z, Math.min(1.82, width * 0.3), 0.017, Math.max(1, depth - 0.8));
  geometry.box('pavement', '#ded0ad', x, 0.081, z, Math.max(1, width - 0.8), 0.017, Math.min(2.24, depth * 0.3));
  const offsetX = Math.min(2.5, Math.max(1.2, width * 0.22));
  const offsetZ = Math.min(5.2, Math.max(2.0, depth * 0.24));
  for (const side of [-1, 1]) {
    for (const street of [-1, 1]) {
      addPalm(geometry, x + side * offsetX, z + street * offsetZ, random, 1.08);
      if (depth > 16) addPlanter(geometry, x + side * offsetX, z + street * (offsetZ * 1.65), random, 1.0);
      addBench(geometry, x + side * (offsetX * 0.92), z + street * (offsetZ * 0.45));
    }
  }
}
