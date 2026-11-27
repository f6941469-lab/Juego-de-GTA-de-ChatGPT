import { Euler } from 'three';
import type { Point3, StaticBox } from '../../physics/physics';
import type { DistrictGeometry, Finish } from './geometry';
import { shoreline, worldBounds, type LandmarkPin, type MapRectangle } from './layout';
import { addLamppost } from './streets';
import { addPalm } from './vegetation';

export type VenueId = 'prison' | 'police_hq' | 'casino' | 'restaurant' | 'house';

export interface FunctionalVenue {
  id: VenueId;
  name: string;
  district: string;
  tagline: string;
  entrance: Point3;
  interactPoint: Point3;
  /** Optional cell spawn point for Cárcel de Palma. */
  cellPoint?: Point3;
  /** Optional exterior release point for Cárcel de Palma. */
  releasePoint?: Point3;
  /** Optional respawn point when player buys Casa del Mirador. */
  spawnPoint?: Point3;
  interactRadius: number;
}

export const functionalVenues: readonly FunctionalVenue[] = [
  {
    id: 'prison',
    name: 'Cárcel de Palma',
    district: 'Distrito Cívico y Penal',
    tagline: 'Centro penitenciario estatal de Costa Palmera.',
    entrance: { x: -38, y: 0.08, z: -119.5 },
    interactPoint: { x: -38, y: 0.08, z: -120.5 },
    cellPoint: { x: -46, y: 0.1, z: -143 },
    releasePoint: { x: -38, y: 0.1, z: -114.5 },
    interactRadius: 3.4,
  },
  {
    id: 'police_hq',
    name: 'Comisaría Central',
    district: 'Distrito Cívico y Penal',
    tagline: 'Cuartel general de la Policía de Costa Palmera.',
    entrance: { x: 24, y: 0.08, z: -119 },
    interactPoint: { x: 24, y: 0.08, z: -127 },
    interactRadius: 3.2,
  },
  {
    id: 'casino',
    name: 'Casino Royale Palma',
    district: 'Isla Fortuna',
    tagline: 'Ruleta, dados 21 y apuestas bajo las luces de la bahía.',
    entrance: { x: 123, y: 0.08, z: 34 },
    interactPoint: { x: 133, y: 0.08, z: 34 },
    interactRadius: 3.4,
  },
  {
    id: 'restaurant',
    name: 'Restaurante El Mirador',
    district: 'Sierra Palmera',
    tagline: 'Cocina costera con terraza panorámica sobre toda la ciudad.',
    entrance: { x: -98, y: 4.28, z: 7 },
    interactPoint: { x: -104, y: 4.28, z: 7 },
    interactRadius: 3.4,
  },
  {
    id: 'house',
    name: 'Casa del Mirador',
    district: 'Isla Fortuna',
    tagline: 'Villa costera con piscina y garaje privado disponible para compra.',
    entrance: { x: 124, y: 0.08, z: -34 },
    interactPoint: { x: 133.5, y: 0.08, z: -34 },
    spawnPoint: { x: 123, y: 0.1, z: -34 },
    interactRadius: 3.4,
  },
];

export const venueById: Readonly<Record<VenueId, FunctionalVenue>> = {
  prison: functionalVenues[0],
  police_hq: functionalVenues[1],
  casino: functionalVenues[2],
  restaurant: functionalVenues[3],
  house: functionalVenues[4],
};

export interface DistrictZone {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const districtZones: readonly DistrictZone[] = [
  { name: 'Isla Fortuna', minX: 90, maxX: 176, minZ: -94, maxZ: 90 },
  { name: 'Distrito Cívico y Penal', minX: -68, maxX: 66, minZ: -176, maxZ: -94 },
  { name: 'Sierra Palmera', minX: -156, maxX: -68, minZ: -176, maxZ: 94 },
  { name: 'Colinas del Sur', minX: -156, maxX: 66, minZ: 94, maxZ: 176 },
  { name: 'Bahía Palmera', minX: 62, maxX: 96, minZ: -176, maxZ: 176 },
  { name: 'Costa Palmera Centro', minX: -68, maxX: 62, minZ: -94, maxZ: 94 },
];

export function districtNameAt(x: number, z: number): string {
  for (const zone of districtZones) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
      return zone.name;
    }
  }
  return 'Costa Palmera';
}

export const bridgeZCenters = [-63, 7] as const;

export const expansionIslands: MapRectangle[] = [
  { x: 134, z: -2, width: 76, depth: 168 },
];

export const expansionBridges: MapRectangle[] = [
  { x: 79, z: 7, width: 54, depth: 10 },
  { x: 79, z: -63, width: 54, depth: 10 },
];

export const expansionMountains: MapRectangle[] = [
  { x: -138, z: -98, width: 32, depth: 82 },
  { x: -138, z: 4, width: 34, depth: 92 },
  { x: -136, z: 106, width: 36, depth: 84 },
];

export const expansionRoads: MapRectangle[] = [
  // Distrito Cívico y Penal (North)
  { x: 0, z: -130, width: 12, depth: 72 },
  { x: -6, z: -110, width: 112, depth: 10 },
  { x: -45, z: -104, width: 9, depth: 20 },
  // Isla Fortuna road network
  { x: 115, z: -4, width: 10, depth: 132 },
  { x: 155, z: -4, width: 9, depth: 132 },
  { x: 135, z: -63, width: 56, depth: 10 },
  { x: 135, z: 7, width: 56, depth: 10 },
  { x: 135, z: 58, width: 50, depth: 9 },
  // Sierra Palmera mountain road (ramps + plateau)
  { x: -86, z: 7, width: 36, depth: 10 },
  { x: -94, z: -6, width: 10, depth: 112 },
  { x: -108, z: -46, width: 28, depth: 18 },
  // Colinas del Sur road loop
  { x: -47, z: 114, width: 104, depth: 10 },
  { x: 0, z: 126, width: 12, depth: 64 },
  { x: 26, z: 134, width: 52, depth: 9 },
];

export const expansionLandmarks: LandmarkPin[] = [
  { x: -38, z: -136, name: 'Cárcel de Palma', kind: 'prison' },
  { x: 24, z: -132, name: 'Comisaría Central', kind: 'police_hq' },
  { x: 136, z: 34, name: 'Casino Royale Palma', kind: 'casino' },
  { x: -108, z: 7, name: 'Restaurante El Mirador', kind: 'restaurant' },
  { x: 136, z: -34, name: 'Casa del Mirador', kind: 'house' },
  { x: 79, z: 7, name: 'Puente Fortuna', kind: 'landmark' },
  { x: 79, z: -63, name: 'Puente Mirador', kind: 'landmark' },
  { x: -108, z: -52, name: 'Alto Mirador Sierra', kind: 'landmark' },
  { x: 42, z: 134, name: 'Mirador del Sur', kind: 'landmark' },
];

/** Exact seam-free sloped ramp along X from (x0, y0) to (x1, y1). */
function addRampX(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
  depth: number,
  finish: Finish = 'asphalt',
  color = '#555b66',
  thickness = 0.56,
): void {
  if (x1 < x0) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const cx = (x0 + x1) / 2 + Math.sin(angle) * (thickness / 2);
  const cy = (y0 + y1) / 2 - Math.cos(angle) * (thickness / 2);
  geometry.rotatedBox(finish, color, cx, cy, z, length, thickness, depth, new Euler(0, 0, angle));
  colliders.push({
    x: cx,
    y: cy,
    z,
    halfX: length / 2,
    halfY: thickness / 2,
    halfZ: depth / 2,
    rotZ: angle,
  });
}

/** Exact seam-free sloped ramp along Z from (z0, y0) to (z1, y1). */
function addRampZ(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  z0: number,
  y0: number,
  z1: number,
  y1: number,
  x: number,
  width: number,
  finish: Finish = 'asphalt',
  color = '#555b66',
  thickness = 0.56,
): void {
  if (z1 < z0) {
    [z0, z1] = [z1, z0];
    [y0, y1] = [y1, y0];
  }
  const dz = z1 - z0;
  const dy = y1 - y0;
  const length = Math.hypot(dz, dy);
  const angle = -Math.atan2(dy, dz);
  const cy = (y0 + y1) / 2 - Math.cos(angle) * (thickness / 2);
  const cz = (z0 + z1) / 2 - Math.sin(angle) * (thickness / 2);
  geometry.rotatedBox(finish, color, x, cy, cz, width, thickness, length, new Euler(angle, 0, 0));
  colliders.push({
    x,
    y: cy,
    z: cz,
    halfX: width / 2,
    halfY: thickness / 2,
    halfZ: length / 2,
    rotX: angle,
  });
}

function addSolidBox(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  finish: Finish,
  color: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  castsShadow = false,
): void {
  geometry.box(finish, color, x, y, z, width, height, depth, castsShadow);
  colliders.push({
    x,
    y,
    z,
    halfX: width / 2,
    halfY: height / 2,
    halfZ: depth / 2,
  });
}

/**
 * Replaces the old tight district perimeter box with the full expanded mainland +
 * Isla Fortuna ground slabs, outer world walls, and bay shoreline barriers with
 * clear openings for Puente Fortuna (z=7) and Puente Mirador (z=-63).
 */
export function createExpandedTerrainColliders(): StaticBox[] {
  const { minX, maxX, minZ, maxZ } = worldBounds;
  const wallH = 10;
  const wallT = 0.8;
  const mainlandMaxX = shoreline + 1.1;
  const mainlandW = mainlandMaxX - minX;
  const mainlandCenterX = (minX + mainlandMaxX) / 2;
  const worldD = maxZ - minZ;

  const islandMinX = 96;
  const islandMaxX = 172;
  const islandMinZ = -86;
  const islandMaxZ = 82;
  const islandW = islandMaxX - islandMinX;
  const islandD = islandMaxZ - islandMinZ;
  const islandCX = (islandMinX + islandMaxX) / 2;
  const islandCZ = (islandMinZ + islandMaxZ) / 2;

  const colliders: StaticBox[] = [
    // Mainland ground (core city + North Civic/Prison + West Sierra + South Foothills)
    { x: mainlandCenterX, y: -0.5, z: 0, halfX: mainlandW / 2, halfY: 0.5, halfZ: worldD / 2 },
    // Isla Fortuna ground
    { x: islandCX, y: -0.5, z: islandCZ, halfX: islandW / 2, halfY: 0.5, halfZ: islandD / 2 },
    // Outer world perimeter walls
    { x: minX, y: wallH, z: 0, halfX: wallT, halfY: wallH, halfZ: worldD / 2 },
    { x: maxX, y: wallH, z: 0, halfX: wallT, halfY: wallH, halfZ: worldD / 2 },
    { x: (minX + maxX) / 2, y: wallH, z: minZ, halfX: (maxX - minX) / 2, halfY: wallH, halfZ: wallT },
    { x: (minX + maxX) / 2, y: wallH, z: maxZ, halfX: (maxX - minX) / 2, halfY: wallH, halfZ: wallT },
    // Isla Fortuna north/south/east water barriers
    { x: islandCX, y: 3, z: islandMinZ - 0.5, halfX: islandW / 2 + 1, halfY: 3, halfZ: 0.5 },
    { x: islandCX, y: 3, z: islandMaxZ + 0.5, halfX: islandW / 2 + 1, halfY: 3, halfZ: 0.5 },
    { x: islandMaxX + 0.5, y: 3, z: islandCZ, halfX: 0.5, halfY: 3, halfZ: islandD / 2 + 1 },
  ];

  // Mainland coastline water barriers along x = shoreline + 0.7 with clear openings for the 2 bridges
  // Bridge portals: [-68.2, -57.8] (Puente Mirador) and [1.8, 12.2] (Puente Fortuna)
  const mainlandShoreSegments: [number, number][] = [
    [minZ, -68.4],
    [-57.6, 1.6],
    [12.4, maxZ],
  ];
  for (const [z0, z1] of mainlandShoreSegments) {
    colliders.push({
      x: shoreline + 0.7,
      y: 3.5,
      z: (z0 + z1) / 2,
      halfX: 0.55,
      halfY: 3.5,
      halfZ: (z1 - z0) / 2,
    });
  }

  // Isla Fortuna west shoreline water barriers along x = 95.8 with matching bridge openings
  const islandWestSegments: [number, number][] = [
    [islandMinZ, -68.4],
    [-57.6, 1.6],
    [12.4, islandMaxZ],
  ];
  for (const [z0, z1] of islandWestSegments) {
    colliders.push({
      x: islandMinX - 0.3,
      y: 3.5,
      z: (z0 + z1) / 2,
      halfX: 0.55,
      halfY: 3.5,
      halfZ: (z1 - z0) / 2,
    });
  }

  return colliders;
}

export function addWorldExpansion(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  addExpansionGrounds(geometry);
  addBridge(geometry, colliders, 7, 'aquaLight', '#42f2e0', '#e8d7be');
  addBridge(geometry, colliders, -63, 'goldLight', '#ffcf76', '#e6cfb2');
  addIslaFortuna(geometry, colliders, random);
  addCivicAndPrisonDistrict(geometry, colliders, random);
  addSierraPalmeraAndHills(geometry, colliders, random);
  addSouthFoothills(geometry, colliders, random);
}

function addExpansionGrounds(geometry: DistrictGeometry): void {
  // Extended coastal mainland pavement north, west, and south of the original district
  geometry.box('pavement', '#7f897f', -47, -0.14, -135, 218, 0.24, 82);
  geometry.box('pavement', '#7c877c', -47, -0.14, 135, 218, 0.24, 82);
  geometry.box('pavement', '#7b8779', -112, -0.14, 0, 88, 0.24, 188);

  // North & South sandy beach continuation along shoreline
  geometry.box('pavement', '#cfb089', 58.6, -0.07, -135, 6.8, 0.12, 82);
  geometry.box('pavement', '#cfb089', 58.6, -0.07, 135, 6.8, 0.12, 82);

  // Road ribbons in expanded zones (surface level y = 0.04)
  for (const road of expansionRoads) {
    // Skip elevated Sierra ramp segments drawn directly by ramp/plateau builders
    if (road.x < -72 && road.z < 52 && road.z > -62) continue;
    geometry.box('asphalt', '#4f5560', road.x, 0.036, road.z, road.width, 0.06, road.depth);
    // Dashed center stripe
    if (road.depth > road.width) {
      for (let z = road.z - road.depth / 2 + 3; z < road.z + road.depth / 2 - 2; z += 5.5) {
        geometry.box('paint', '#dcd4b0', road.x, 0.072, z, 0.16, 0.01, 2.2);
      }
    } else {
      for (let x = road.x - road.width / 2 + 3; x < road.x + road.width / 2 - 2; x += 5.5) {
        geometry.box('paint', '#dcd4b0', x, 0.072, road.z, 2.2, 0.01, 0.16);
      }
    }
  }
}

function addBridge(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  centerZ: number,
  lightFinish: 'aquaLight' | 'goldLight',
  lightColor: string,
  stoneColor: string,
): void {
  const deckW = 9.6;
  const deckY = 3.8;
  // Flat approach apron across Paseo del Mar onto west ramp
  geometry.box('asphalt', '#505662', 49.5, 0.045, centerZ, 5.4, 0.06, deckW);
  // West ascending ramp (x: 52 -> 70, y: 0 -> 3.8)
  addRampX(geometry, colliders, 52, 0.05, 70, deckY, centerZ, deckW, 'asphalt', '#505662');
  // Center horizontal bridge span (x: 70 -> 88, y_top = 3.8)
  addSolidBox(geometry, colliders, 'asphalt', '#505662', 79, deckY - 0.28, centerZ, 18.2, 0.56, deckW);
  // East descending ramp (x: 88 -> 106, y: 3.8 -> 0)
  addRampX(geometry, colliders, 88, deckY, 106, 0.05, centerZ, deckW, 'asphalt', '#505662');

  // Center lane markings on horizontal span
  for (let x = 71.5; x <= 86.5; x += 3.6) {
    geometry.box('paint', '#e5dca8', x, deckY + 0.012, centerZ, 1.7, 0.015, 0.16);
  }

  // Side guardrails along center span and angled ramp edges (prevent falling into sea)
  for (const side of [-1, 1]) {
    const rz = centerZ + side * (deckW / 2 + 0.22);
    // Center span solid curb + railing
    addSolidBox(geometry, colliders, 'trim', stoneColor, 79, deckY + 0.45, rz, 18.4, 0.95, 0.44);
    geometry.box(lightFinish, lightColor, 79, deckY + 0.96, rz, 17.8, 0.12, 0.16);
    // West ramp angled guardrail
    addRampX(geometry, colliders, 52, 1.05, 70, deckY + 1.0, rz, 0.42, 'trim', stoneColor, 1.05);
    // East ramp angled guardrail
    addRampX(geometry, colliders, 88, deckY + 1.0, 106, 1.05, rz, 0.42, 'trim', stoneColor, 1.05);

    // Structural concrete bridge piers down into the ocean
    for (const px of [68, 79, 90]) {
      geometry.box('wall', '#c7bfb0', px, 1.5, centerZ + side * 4.2, 1.6, 4.4, 1.4, true);
    }

    // Art Deco suspension arch pylons on the main span
    geometry.box('trim', '#efe3cc', 73, deckY + 3.6, rz, 1.15, 7.2, 0.72, true);
    geometry.box('trim', '#efe3cc', 85, deckY + 3.6, rz, 1.15, 7.2, 0.72, true);
    geometry.box('trim', '#efe3cc', 79, deckY + 7.1, rz, 13.4, 0.65, 0.65);
    geometry.box(lightFinish, lightColor, 79, deckY + 6.72, rz, 12.2, 0.16, 0.18);
  }
  // Overhead bridge portal beam tying north & south pylons
  geometry.box('trim', '#e7d7bd', 73, deckY + 6.9, centerZ, 0.85, 0.55, deckW + 1.0);
  geometry.box('trim', '#e7d7bd', 85, deckY + 6.9, centerZ, 0.85, 0.55, deckW + 1.0);
}

function addIslaFortuna(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  // Golden sandy perimeter + elevated resort island terrace
  geometry.box('pavement', '#d8ba90', 134, -0.075, -2, 76, 0.14, 168);
  geometry.box('pavement', '#c8beaa', 135, -0.005, -2, 66, 0.08, 152);
  // Central palm park oasis on Isla Fortuna (between Casino and Casa del Mirador)
  geometry.box('pavement', '#6d9468', 136, 0.055, -2, 24, 0.04, 24);
  geometry.box('pavement', '#e3d6b8', 136, 0.082, -2, 5.4, 0.03, 5.4);
  geometry.box('aquaLight', '#42f2e0', 136, 0.25, -2, 3.2, 0.34, 3.2);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addPalm(geometry, 136 + sx * 8.5, -2 + sz * 8.5, random, 1.18);
    }
  }
  // Coastal palm promenade around Isla Fortuna
  for (let z = -76; z <= 70; z += 18) {
    if (Math.abs(z - 7) > 9 && Math.abs(z + 63) > 9) {
      addPalm(geometry, 102, z, random, 0.95);
    }
    addPalm(geometry, 165, z, random, 1.05);
    addLamppost(geometry, 121.5, z + 4, 1);
  }

  // Functional Venue #1: CASINO ROYALE PALMA (x=136, z=34, open entrance on west x=125)
  addCasinoRoyale(geometry, colliders);

  // Functional Venue #2: CASA DEL MIRADOR (x=136, z=-34, open entrance on west x=126)
  addBuyableHouse(geometry, colliders, random);

  // Accent resort tower on southern Isla Fortuna (skyline landmark)
  addSolidBox(geometry, colliders, 'wall', '#ead8c5', 136, 11, 70, 18, 22, 12, true);
  geometry.box('coralLight', '#ff4e88', 136, 22.3, 70, 16.5, 0.4, 10.5);
  for (let y = 3; y <= 19; y += 3.2) {
    geometry.box('glassLit', '#ffcf86', 136, y, 63.9, 13.5, 1.1, 0.16);
    geometry.box('glass', '#587f96', 136, y, 76.1, 13.5, 1.1, 0.16);
  }
}

function addCasinoRoyale(geometry: DistrictGeometry, colliders: StaticBox[]): void {
  const cx = 136;
  const cz = 34;
  const w = 22;
  const d = 22;
  const h = 8.4;
  // Marble lobby floor + red carpet entrance
  geometry.box('pavement', '#e6decb', cx, 0.06, cz, w, 0.08, d);
  geometry.box('paint', '#a8223e', cx - 6, 0.105, cz, 12, 0.015, 3.8);
  // Roof & Art Deco crown
  addSolidBox(geometry, colliders, 'trim', '#2a2232', cx, h, cz, w + 0.8, 0.7, d + 0.8, true);
  geometry.box('wall', '#3a2b46', cx, h + 1.8, cz, w * 0.68, 3.1, d * 0.68, true);
  geometry.box('goldLight', '#ffcf76', cx, h + 0.45, cz, w + 1.0, 0.25, d + 1.0);
  geometry.box('coralLight', '#ff4e88', cx, h + 3.45, cz, w * 0.68 + 0.3, 0.26, d * 0.68 + 0.3);

  // Back wall (east), north wall, south wall
  addSolidBox(geometry, colliders, 'wall', '#352940', cx + w / 2 - 0.35, h / 2, cz, 0.7, h, d, true);
  addSolidBox(geometry, colliders, 'wall', '#3d2f4a', cx, h / 2, cz - d / 2 + 0.35, w, h, 0.7, true);
  addSolidBox(geometry, colliders, 'wall', '#3d2f4a', cx, h / 2, cz + d / 2 - 0.35, w, h, 0.7, true);

  // West front facade with wide 6.4m open entrance portal
  addSolidBox(geometry, colliders, 'wall', '#443352', cx - w / 2 + 0.35, h / 2, cz - 7.1, 0.7, h, 7.8, true);
  addSolidBox(geometry, colliders, 'wall', '#443352', cx - w / 2 + 0.35, h / 2, cz + 7.1, 0.7, h, 7.8, true);
  addSolidBox(geometry, colliders, 'trim', '#251c2e', cx - w / 2 + 0.35, 6.4, cz, 0.9, 3.6, 6.6);
  // Illuminated Casino marquee canopy over entrance
  geometry.box('trim', '#261d30', cx - w / 2 - 1.7, 4.4, cz, 3.6, 0.5, 9.6);
  geometry.box('goldLight', '#ffcf76', cx - w / 2 - 3.45, 4.45, cz, 0.18, 0.34, 9.2);
  geometry.box('coralLight', '#ff4e88', cx - w / 2 - 0.2, 5.7, cz, 0.24, 0.9, 7.2);

  // Walkable interior: central emerald roulette & blackjack table + glowing VIP bar
  addSolidBox(geometry, colliders, 'trim', '#5c3422', cx + 1.2, 0.52, cz, 3.6, 1.0, 5.2);
  geometry.box('paint', '#1e784c', cx + 1.2, 1.04, cz, 3.1, 0.05, 4.7);
  geometry.box('goldLight', '#ffcf76', cx + 1.2, 1.09, cz - 1.1, 1.1, 0.06, 1.1);
  // Decorative side slot cabinets
  for (const sz of [-7.5, 7.5]) {
    addSolidBox(geometry, colliders, 'trim', '#2d2438', cx + 3, 1.1, cz + sz, 6.5, 2.2, 1.2);
    geometry.box('aquaLight', '#42f2e0', cx + 3, 1.4, cz + sz + (sz < 0 ? 0.65 : -0.65), 5.6, 0.5, 0.08);
  }
}

function addBuyableHouse(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  const hx = 136;
  const hz = -34;
  const w = 18;
  const d = 16;
  const h = 4.4;

  // Landscaped villa yard & turquoise swimming pool on south side
  geometry.box('pavement', '#709768', hx + 1, 0.04, hz, 26, 0.06, 26);
  geometry.box('pavement', '#e8dec8', hx, 0.075, hz, w + 2.4, 0.06, d + 2.4);
  geometry.box('trim', '#efe8d8', hx - 1, 0.14, hz + 10.6, 10.6, 0.18, 5.6);
  geometry.box('aquaLight', '#3ce8db', hx - 1, 0.18, hz + 10.6, 9.4, 0.12, 4.4);
  addPalm(geometry, hx - 10, hz - 9, random, 1.08);
  addPalm(geometry, hx + 10, hz + 10, random, 1.12);

  // Modern white-and-teak cubic villa (open entrance facing west x = hx - 9)
  addSolidBox(geometry, colliders, 'wall', '#f2ece1', hx + w / 2 - 0.3, h / 2, hz, 0.6, h, d, true);
  addSolidBox(geometry, colliders, 'wall', '#f2ece1', hx, h / 2, hz - d / 2 + 0.3, w, h, 0.6, true);
  addSolidBox(geometry, colliders, 'wall', '#ede5d7', hx, h / 2, hz + d / 2 - 0.3, w, h, 0.6, true);
  // West front wall with wide 4.6m open doorway
  addSolidBox(geometry, colliders, 'wall', '#f2ece1', hx - w / 2 + 0.3, h / 2, hz - 5.15, 0.6, h, 5.7, true);
  addSolidBox(geometry, colliders, 'wall', '#f2ece1', hx - w / 2 + 0.3, h / 2, hz + 5.15, 0.6, h, 5.7, true);
  addSolidBox(geometry, colliders, 'trim', '#8d6445', hx - w / 2 + 0.3, 3.65, hz, 0.7, 1.5, 4.7);

  // Second story cantilevered modern glass suite
  addSolidBox(geometry, colliders, 'trim', '#e5dccb', hx, h + 0.25, hz, w + 1.4, 0.5, d + 1.4, true);
  addSolidBox(geometry, colliders, 'wall', '#f5f0e6', hx + 2, h + 2.2, hz - 1, 13, 3.6, 11, true);
  geometry.box('glassLit', '#ffd596', hx - 4.55, h + 2.2, hz - 1, 0.14, 2.2, 8.8);
  geometry.box('trim', '#8d6445', hx + 2, h + 4.15, hz - 1, 13.8, 0.32, 11.8);

  // Glowing "EN VENTA / CASA" sign post near entrance
  addSolidBox(geometry, colliders, 'trim', '#3b3532', hx - 10.6, 1.0, hz - 4.2, 0.22, 2.0, 0.22);
  geometry.box('goldLight', '#ffcf76', hx - 10.6, 1.8, hz - 4.2, 0.26, 0.75, 1.45);

  // Walkable interior furniture: bed, lounge table, wardrobe
  addSolidBox(geometry, colliders, 'trim', '#7c563c', hx + 4.2, 0.42, hz - 3.6, 3.0, 0.7, 2.2);
  geometry.box('paint', '#3f7688', hx + 4.2, 0.8, hz - 3.6, 2.8, 0.14, 2.0);
  addSolidBox(geometry, colliders, 'trim', '#6b4d37', hx + 1.5, 0.48, hz + 2.8, 2.4, 0.85, 1.4);
  geometry.box('goldLight', '#ffcf76', hx + 1.5, 1.05, hz + 2.8, 0.35, 0.35, 0.35);
}

function addCivicAndPrisonDistrict(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  // Street lighting and palms along Bulevar Cívico (z = -110)
  for (let x = -54; x <= 44; x += 16) {
    addLamppost(geometry, x, -104.2, 1);
    addPalm(geometry, x + 5, -103.5, random, 0.92);
  }

  // Functional Venue #3: COMISARÍA CENTRAL (x=24, z=-132, open lobby facing south z=-119)
  addPoliceHQ(geometry, colliders);

  // Functional Venue #4: CÁRCEL DE PALMA (x=-38, z=-138, walled penitentiary + walkable cellblock)
  addPrisonComplex(geometry, colliders);
}

function addPoliceHQ(geometry: DistrictGeometry, colliders: StaticBox[]): void {
  const px = 24;
  const pz = -132;
  const w = 24;
  const d = 22;
  const h = 9.2;

  // Civic plaza apron & lobby floor
  geometry.box('pavement', '#d7d5cc', px, 0.055, pz + 2, w + 4, 0.08, d + 8);
  // Roof & police command penthouse
  addSolidBox(geometry, colliders, 'trim', '#223650', px, h, pz, w + 0.8, 0.7, d + 0.8, true);
  geometry.box('wall', '#2c4464', px, h + 1.8, pz, w * 0.62, 3.0, d * 0.56, true);
  // Iconic blue & red police beacon strips on facade
  geometry.box('aquaLight', '#4da3ff', px - 4.5, 5.2, pz + d / 2 + 0.2, 6.2, 0.32, 0.22);
  geometry.box('coralLight', '#ff4458', px + 4.5, 5.2, pz + d / 2 + 0.2, 6.2, 0.32, 0.22);

  // Back (north), west, east walls
  addSolidBox(geometry, colliders, 'wall', '#dce1e6', px, h / 2, pz - d / 2 + 0.35, w, h, 0.7, true);
  addSolidBox(geometry, colliders, 'wall', '#d3d9e0', px - w / 2 + 0.35, h / 2, pz, 0.7, h, d, true);
  addSolidBox(geometry, colliders, 'wall', '#d3d9e0', px + w / 2 - 0.35, h / 2, pz, 0.7, h, d, true);

  // South front wall with wide 6.0m open lobby entrance
  addSolidBox(geometry, colliders, 'wall', '#dce1e6', px - 7.5, h / 2, pz + d / 2 - 0.35, 9.0, h, 0.7, true);
  addSolidBox(geometry, colliders, 'wall', '#dce1e6', px + 7.5, h / 2, pz + d / 2 - 0.35, 9.0, h, 0.7, true);
  addSolidBox(geometry, colliders, 'trim', '#223650', px, 6.8, pz + d / 2 - 0.35, 6.2, 4.2, 0.85);

  // Windows on upper floors
  for (const side of [-1, 1]) {
    geometry.box('glass', '#4a6b8a', px + side * 7.5, 6.8, pz + d / 2 + 0.08, 6.4, 1.8, 0.14);
  }

  // Interior reception desk (at interactPoint x=24, z=-127)
  addSolidBox(geometry, colliders, 'trim', '#273d59', px, 0.56, pz + 2.5, 6.2, 1.1, 1.2);
  geometry.box('aquaLight', '#62b8ff', px, 1.15, pz + 3.05, 5.6, 0.12, 0.12);
  // Decorative reception officer bust behind desk
  geometry.box('wall', '#2d4b75', px, 1.38, pz + 1.3, 0.52, 0.65, 0.32);
  geometry.box('wall', '#e5c2a0', px, 1.85, pz + 1.3, 0.32, 0.32, 0.32);
}

function addPrisonComplex(geometry: DistrictGeometry, colliders: StaticBox[]): void {
  const cx = -38;
  const cz = -138;
  const halfW = 22;
  const halfD = 18;
  const wallH = 6.2;

  // Concrete prison courtyard ground
  geometry.box('pavement', '#9b9d9a', cx, 0.055, cz, halfW * 2, 0.08, halfD * 2);

  // High perimeter security walls (north, west, east)
  addSolidBox(geometry, colliders, 'wall', '#7f8488', cx, wallH / 2, cz - halfD, halfW * 2, wallH, 1.1, true);
  addSolidBox(geometry, colliders, 'wall', '#7f8488', cx - halfW, wallH / 2, cz, 1.1, wallH, halfD * 2, true);
  addSolidBox(geometry, colliders, 'wall', '#7f8488', cx + halfW, wallH / 2, cz, 1.1, wallH, halfD * 2, true);

  // South front wall with main penitentiary gate portal (centered at x = -38, z = -120, width 6.4m)
  addSolidBox(geometry, colliders, 'wall', '#7f8488', cx - 12.6, wallH / 2, cz + halfD, 18.8, wallH, 1.1, true);
  addSolidBox(geometry, colliders, 'wall', '#7f8488', cx + 12.6, wallH / 2, cz + halfD, 18.8, wallH, 1.1, true);
  addSolidBox(geometry, colliders, 'trim', '#4a5158', cx, 5.2, cz + halfD, 6.8, 2.2, 1.35);
  geometry.box('goldLight', '#ffcf76', cx, 5.1, cz + halfD + 0.72, 5.2, 0.25, 0.14);

  // 4 corner security watchtowers
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = cx + sx * (halfW - 0.6);
      const tz = cz + sz * (halfD - 0.6);
      addSolidBox(geometry, colliders, 'wall', '#6b7075', tx, 5.6, tz, 3.4, 11.2, 3.4, true);
      geometry.box('trim', '#454b52', tx, 11.4, tz, 4.2, 0.6, 4.2);
      geometry.box('goldLight', '#ffcf76', tx, 9.8, tz, 3.6, 0.5, 3.6);
    }
  }

  // Cellblock building inside the north-west quadrant of the compound (x = -46, z = -144)
  // Houses the player's real detention cell at cellPoint (-46, 0.1, -143)
  const cellX = -46;
  const cellZ = -144;
  const cbW = 14;
  const cbD = 10;
  const cbH = 5.0;
  geometry.box('pavement', '#83878a', cellX, 0.08, cellZ, cbW, 0.06, cbD);
  addSolidBox(geometry, colliders, 'trim', '#5c6268', cellX, cbH, cellZ, cbW + 0.6, 0.6, cbD + 0.6, true);
  // Cell walls (north, west, east) enclosing cellPoint (-46, 0.1, -143)
  addSolidBox(geometry, colliders, 'wall', '#8f9498', cellX, cbH / 2, cellZ - cbD / 2 + 0.3, cbW, cbH, 0.6, true);
  addSolidBox(geometry, colliders, 'wall', '#8f9498', cellX - cbW / 2 + 0.3, cbH / 2, cellZ, 0.6, cbH, cbD, true);
  addSolidBox(geometry, colliders, 'wall', '#8f9498', cellX + cbW / 2 - 0.3, cbH / 2, cellZ, 0.6, cbH, cbD, true);
  // Steel cell bars along the front of the cell (z = -139.2)
  // Solid bar collider blocks walking out while detained (escape action teleports past the bars into the yard!)
  addSolidBox(geometry, colliders, 'trim', '#353c42', cellX, 1.9, cellZ + cbD / 2 - 0.25, cbW - 1.0, 3.8, 0.22);
  for (let bx = cellX - 5.5; bx <= cellX + 5.5; bx += 1.1) {
    geometry.box('trim', '#242a30', bx, 2.2, cellZ + cbD / 2 - 0.1, 0.12, 4.2, 0.16);
  }
  // Bunk inside the cell
  addSolidBox(geometry, colliders, 'trim', '#4d565e', cellX - 4.2, 0.45, cellZ - 2.2, 2.6, 0.65, 1.3);

  // Courtyard exercise benches & basketball court markings
  geometry.box('paint', '#c88d52', cx + 8, 0.095, cz + 2, 11, 0.015, 15);
  addSolidBox(geometry, colliders, 'trim', '#565c62', cx + 14, 0.45, cz - 10, 4.5, 0.6, 1.2);
}

function addSierraPalmeraAndHills(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  const plateauY = 4.2;
  const highY = 7.8;

  // 1. Ascending ramp from Costa Palmera Centro (x=-68, z=7) up to Mirador Sierra plateau (x=-90, y=4.2)
  addRampX(geometry, colliders, -68, 0.05, -90, plateauY, 7, 10, 'asphalt', '#535964');
  // Ramp retaining skirts & side curbs
  addSolidBox(geometry, colliders, 'wall', '#988976', -79, 1.6, 1.6, 22, 3.6, 0.8);
  addSolidBox(geometry, colliders, 'wall', '#988976', -79, 1.6, 12.4, 22, 3.6, 0.8);

  // 2. Mirador Sierra Main Elevated Plateau (x in [-124, -90], z in [-24, 34], y_top = 4.2)
  addSolidBox(geometry, colliders, 'pavement', '#a69882', -107, plateauY / 2, 5, 34, plateauY, 58);
  // Road strip across the plateau
  geometry.box('asphalt', '#535964', -94.5, plateauY + 0.03, 5, 9.6, 0.06, 58);
  // Scenic eastern cliffside guardrails overlooking Costa Palmera (clear at z=7 ramp)
  addSolidBox(geometry, colliders, 'trim', '#d5c7af', -90.3, plateauY + 0.55, -10.5, 0.5, 1.1, 25);
  addSolidBox(geometry, colliders, 'trim', '#d5c7af', -90.3, plateauY + 0.55, 23.5, 0.5, 1.1, 21);

  // 3. Secondary climb north from Mirador Sierra (z=-24, y=4.2) to Alto Mirador (z=-44, y=7.8)
  addRampZ(geometry, colliders, -24, plateauY, -44, highY, -94.5, 9.6, 'asphalt', '#535964');
  // Alto Mirador scenic high plateau (x in [-124, -89], z in [-66, -44], y_top = 7.8)
  addSolidBox(geometry, colliders, 'pavement', '#9d907b', -106.5, highY / 2, -55, 35, highY, 22);
  geometry.box('pavement', '#d4c3a4', -106.5, highY + 0.04, -55, 28, 0.08, 16);
  // Guardrails around Alto Mirador overlook
  addSolidBox(geometry, colliders, 'trim', '#ded0b6', -89.3, highY + 0.55, -55, 0.5, 1.1, 22);
  addSolidBox(geometry, colliders, 'trim', '#ded0b6', -106.5, highY + 0.55, -65.7, 34, 1.1, 0.5);
  // Iconic overlook beacon & palm trees at Alto Mirador
  geometry.box('goldLight', '#ffcf76', -92, highY + 1.4, -55, 0.5, 2.6, 0.5);
  geometry.box('pavement', '#6d9164', -116, highY + 0.1, -55, 8, 0.2, 14);

  // 4. Descending mountain road south from Mirador Sierra (z=34, y=4.2) down to Colinas del Sur (z=56, y=0)
  addRampZ(geometry, colliders, 34, plateauY, 56, 0.05, -94.5, 9.6, 'asphalt', '#535964');
  // Lower road continuation south from z=56 to z=118 (connecting to Colinas del Sur avenue)
  geometry.box('asphalt', '#505662', -94.5, 0.036, 87, 9.6, 0.06, 62);

  // 5. Functional Venue #5: GRAN RESTAURANTE EL MIRADOR (perched on Mirador Sierra at y = 4.2)
  addMiradorRestaurant(geometry, colliders, plateauY);

  // 6. Sierra Palmera Stepped Prismatic Mountains (low-poly large batched terraces -> 0 extra draw calls)
  const peaks = [
    { x: -138, z: -124, baseW: 36, baseD: 48, height: 34, rock: '#7d7a72', cap: '#9a8e7a' },
    { x: -140, z: -64, baseW: 34, baseD: 54, height: 44, rock: '#74756e', cap: '#a4957e' },
    { x: -140, z: 2, baseW: 34, baseD: 56, height: 42, rock: '#787870', cap: '#9f907a' },
    { x: -138, z: 68, baseW: 36, baseD: 54, height: 36, rock: '#7f7a70', cap: '#a19079' },
    { x: -134, z: 128, baseW: 40, baseD: 48, height: 28, rock: '#827c71', cap: '#9d8f78' },
  ];

  for (const peak of peaks) {
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const frac = 1 - t * 0.17;
      const tierH = peak.height / tiers;
      const ty = t * tierH + tierH / 2;
      const tw = peak.baseW * frac;
      const td = peak.baseD * frac;
      const color = t >= tiers - 1 ? peak.cap : t === 0 ? '#677c5f' : peak.rock;
      // Add physics collider only on lower accessible tiers (reduces collider count while blocking mountain walls)
      if (t < 2) {
        addSolidBox(geometry, colliders, 'wall', color, peak.x - t * 1.2, ty, peak.z, tw, tierH, td, t === 0);
      } else {
        geometry.box('wall', color, peak.x - t * 1.2, ty, peak.z, tw, tierH, td);
      }
    }
    // Foothill greenery along mountain base
    for (let i = 0; i < 3; i++) {
      const px = peak.x + peak.baseW / 2 + 2 + random() * 3;
      const pz = peak.z + (i - 1) * 14 + (random() - 0.5) * 4;
      if (px > -124 && Math.abs(pz - 7) > 16) {
        addPalm(geometry, px, pz, random, 0.92 + random() * 0.25);
      }
    }
  }
}

function addMiradorRestaurant(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  floorY: number,
): void {
  const rx = -108;
  const rz = 7;
  const w = 16;
  const d = 20;
  const h = 4.6;

  // Warm stone terrace deck
  geometry.box('pavement', '#dec9a8', rx + 1.5, floorY + 0.05, rz, w + 4, 0.1, d + 3);
  // Terracotta restaurant back, north, and south walls (open panoramic east side overlooking city!)
  addSolidBox(geometry, colliders, 'wall', '#c97b58', rx - w / 2 + 0.35, floorY + h / 2, rz, 0.7, h, d, true);
  addSolidBox(geometry, colliders, 'wall', '#d68965', rx, floorY + h / 2, rz - d / 2 + 0.35, w, h, 0.7, true);
  addSolidBox(geometry, colliders, 'wall', '#d68965', rx, floorY + h / 2, rz + d / 2 - 0.35, w, h, 0.7, true);
  // Roof & timber pergola canopy
  addSolidBox(geometry, colliders, 'trim', '#7c4c34', rx + 0.5, floorY + h + 0.25, rz, w + 2.4, 0.5, d + 1.4, true);
  geometry.box('goldLight', '#ffcf76', rx + w / 2 + 1.5, floorY + h + 0.15, rz, 0.22, 0.28, d);
  // Front decorative pergola pillars (wide open entrance across east terrace)
  for (const pz of [rz - 8.8, rz - 3.6, rz + 3.6, rz + 8.8]) {
    addSolidBox(geometry, colliders, 'trim', '#7c4c34', rx + w / 2 + 0.5, floorY + h / 2, pz, 0.55, h, 0.55);
  }
  // Host & kitchen bar counter inside (interactPoint: -104, 4.28, 7)
  addSolidBox(geometry, colliders, 'trim', '#6a3f2b', rx - 2.2, floorY + 0.56, rz, 1.5, 1.1, 7.6);
  geometry.box('goldLight', '#ffcf76', rx - 1.45, floorY + 1.15, rz, 0.2, 0.16, 6.8);
  // Dining tables with warm table lanterns
  for (const tz of [-6.2, 6.2]) {
    for (const tx of [rx + 3.5, rx + 7.4]) {
      addSolidBox(geometry, colliders, 'trim', '#8d5b3e', tx, floorY + 0.45, rz + tz, 1.7, 0.85, 1.7);
      geometry.box('goldLight', '#ffcf76', tx, floorY + 0.96, rz + tz, 0.24, 0.24, 0.24);
    }
  }
}

function addSouthFoothills(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  // Scenic coastal hill & overlook in Colinas del Sur (Mirador del Sur)
  const hillY = 2.6;
  addRampX(geometry, colliders, 26, 0.05, 40, hillY, 134, 9, 'asphalt', '#535964');
  addSolidBox(geometry, colliders, 'pavement', '#a99e87', 49, hillY / 2, 134, 18, hillY, 22);
  addSolidBox(geometry, colliders, 'trim', '#dcd0b8', 57.7, hillY + 0.5, 134, 0.5, 1.0, 22);
  geometry.box('coralLight', '#ff4e88', 57.5, hillY + 1.1, 134, 0.2, 0.2, 18);

  // Residential hillside villas & palms framing Colinas del Sur
  const villas = [
    { x: -64, z: 136, w: 14, d: 12, h: 6.4, color: '#e6d4be' },
    { x: -34, z: 136, w: 15, d: 11, h: 7.2, color: '#dccab6' },
    { x: -24, z: 102, w: 12, d: 10, h: 5.8, color: '#e8d8c6' },
    { x: 24, z: 108, w: 14, d: 12, h: 6.8, color: '#d7c5b2' },
  ];
  for (const v of villas) {
    addSolidBox(geometry, colliders, 'wall', v.color, v.x, v.h / 2, v.z, v.w, v.h, v.d, true);
    geometry.box('trim', '#9f6a4d', v.x, v.h + 0.3, v.z, v.w + 0.8, 0.6, v.d + 0.8);
    geometry.box('glassLit', '#ffd088', v.x, v.h * 0.55, v.z - v.d / 2 - 0.08, v.w * 0.65, 1.2, 0.14);
  }
  for (let x = -78; x <= 46; x += 18) {
    addPalm(geometry, x, 121 + (random() - 0.5) * 4, random, 1.0);
    if (Math.abs(x) > 10) addLamppost(geometry, x, 108.5, -1);
  }
}
