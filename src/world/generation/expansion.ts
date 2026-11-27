import { Euler } from 'three';
import type { Point3, StaticBox } from '../../physics/physics';
import type { DistrictGeometry, Finish } from './geometry';
import { addMountainMansion } from './house-mansion';
import { shoreline, worldBounds, type LandmarkPin, type MapRectangle } from './layout';
import { addBench, addLamppost } from './streets';
import { addPalm, addPlanter } from './vegetation';

export type VenueId = 'prison' | 'police_hq' | 'casino' | 'restaurant' | 'house';

export interface FunctionalVenue {
  id: VenueId;
  name: string;
  district: string;
  tagline: string;
  entrance: Point3;
  interactPoint: Point3;
  cellPoint?: Point3;
  escapeYardPoint?: Point3;
  releasePoint?: Point3;
  spawnPoint?: Point3;
  interactRadius: number;
}

export const functionalVenues: readonly FunctionalVenue[] = [
  {
    id: 'prison',
    name: 'Cárcel de Palma',
    district: 'Distrito Penal Norte',
    tagline: 'Penitenciaría estatal de máxima seguridad de Costa Palmera.',
    entrance: { x: -210, y: 0.08, z: -310 },
    interactPoint: { x: -210, y: 0.08, z: -311.5 },
    cellPoint: { x: -226, y: 0.1, z: -350 },
    escapeYardPoint: { x: -210, y: 0.1, z: -324 },
    releasePoint: { x: -210, y: 0.1, z: -301.5 },
    interactRadius: 3.6,
  },
  {
    id: 'police_hq',
    name: 'Comisaría Central',
    district: 'Distrito Cívico Norte',
    tagline: 'Cuartel general de la Policía de Costa Palmera.',
    entrance: { x: 68, y: 0.08, z: -196 },
    interactPoint: { x: 68, y: 0.08, z: -207 },
    interactRadius: 3.6,
  },
  {
    id: 'casino',
    name: 'Casino Royale Palma',
    district: 'Isla Fortuna',
    tagline: 'Gran palacio Art Deco de ruleta, dados 21 y entretenimiento junto a la bahía.',
    entrance: { x: 296, y: 0.08, z: 72 },
    interactPoint: { x: 314, y: 0.08, z: 72 },
    interactRadius: 3.8,
  },
  {
    id: 'restaurant',
    name: 'Restaurante El Mirador',
    district: 'Colinas del Sur',
    tagline: 'Alta cocina costera en terraza elevada con vistas a la ciudad y la bahía.',
    entrance: { x: -156, y: 6.08, z: 215 },
    interactPoint: { x: -165, y: 6.08, z: 215 },
    interactRadius: 3.8,
  },
  {
    id: 'house',
    name: 'Casa del Mirador',
    district: 'Cumbre de Sierra Palmera',
    tagline: 'Mansión moderna en la montaña con 4 estancias amuebladas, piscina infinita y vistas a toda la ciudad.',
    entrance: { x: -309.5, y: 24.08, z: -26.5 },
    interactPoint: { x: -309.5, y: 24.08, z: -17.0 },
    spawnPoint: { x: -309.5, y: 24.1, z: -30.5 },
    interactRadius: 4.0,
  },
];

export const venueById: Readonly<Record<VenueId, FunctionalVenue>> = {
  prison: functionalVenues[0],
  police_hq: functionalVenues[1],
  casino: functionalVenues[2],
  restaurant: functionalVenues[3],
  house: functionalVenues[4],
};

export interface WorldLocation {
  id: string;
  name: string;
  district: string;
  point: Point3;
}

/** Real residential homes spread across outer districts where NPCs live. */
export const npcResidentialHomes: readonly WorldLocation[] = [
  { id: 'home:sol:1', name: 'Villa Sol Norte 1', district: 'Barrio del Sol', point: { x: -56, y: 0.08, z: -252 } },
  { id: 'home:sol:2', name: 'Villa Sol Norte 2', district: 'Barrio del Sol', point: { x: -18, y: 0.08, z: -252 } },
  { id: 'home:sol:3', name: 'Villa Sol Norte 3', district: 'Barrio del Sol', point: { x: 28, y: 0.08, z: -252 } },
  { id: 'home:sol:4', name: 'Villa Sol Norte 4', district: 'Barrio del Sol', point: { x: 74, y: 0.08, z: -252 } },
  { id: 'home:sol:5', name: 'Casa Pinar Norte', district: 'Barrio del Sol', point: { x: -72, y: 0.08, z: -162 } },
  { id: 'home:fortuna:1', name: 'Villa Coral Isla 1', district: 'Isla Fortuna', point: { x: 266, y: 0.08, z: -132 } },
  { id: 'home:fortuna:2', name: 'Villa Coral Isla 2', district: 'Isla Fortuna', point: { x: 316, y: 0.08, z: -132 } },
  { id: 'home:fortuna:3', name: 'Villa Bahía Este 1', district: 'Isla Fortuna', point: { x: 382, y: 0.08, z: -48 } },
  { id: 'home:fortuna:4', name: 'Villa Bahía Este 2', district: 'Isla Fortuna', point: { x: 382, y: 0.08, z: 32 } },
  { id: 'home:sur:1', name: 'Casa Brisa Sur 1', district: 'Colinas del Sur', point: { x: -56, y: 0.08, z: 232 } },
  { id: 'home:sur:2', name: 'Casa Brisa Sur 2', district: 'Colinas del Sur', point: { x: 42, y: 0.08, z: 232 } },
  { id: 'home:sur:3', name: 'Villa Puerto Sur', district: 'Colinas del Sur', point: { x: 42, y: 0.08, z: 316 } },
  { id: 'home:sierra:1', name: 'Chalet Ladera Sierra', district: 'Sierra Palmera', point: { x: -138, y: 8.08, z: -20 } },
];

export const npcWorkplaces: readonly WorldLocation[] = [
  { id: 'work:casino', name: 'Casino Royale Palma', district: 'Isla Fortuna', point: { x: 294, y: 0.08, z: 72 } },
  { id: 'work:police', name: 'Comisaría Central', district: 'Distrito Cívico Norte', point: { x: 68, y: 0.08, z: -194 } },
  { id: 'work:restaurant', name: 'Restaurante El Mirador', district: 'Colinas del Sur', point: { x: -158, y: 6.08, z: 215 } },
  { id: 'work:resort', name: 'Gran Resort Fortuna', district: 'Isla Fortuna', point: { x: 310, y: 0.08, z: 158 } },
  { id: 'work:torre', name: 'Torre Alba', district: 'Costa Palmera Centro', point: { x: 21.6, y: 0.08, z: -51 } },
  { id: 'work:hotel', name: 'Hotel Miramar', district: 'Costa Palmera Centro', point: { x: -6.8, y: 0.08, z: 20.8 } },
];

export const npcSocialHubs: readonly WorldLocation[] = [
  { id: 'social:oasis', name: 'Plaza Oasis Fortuna', district: 'Isla Fortuna', point: { x: 306, y: 0.08, z: -22 } },
  { id: 'social:civic', name: 'Plaza Cívica del Sol', district: 'Barrio del Sol', point: { x: 0, y: 0.08, z: -185 } },
  { id: 'social:sur', name: 'Paseo Puerto Brisa', district: 'Colinas del Sur', point: { x: 0, y: 0.08, z: 215 } },
  { id: 'social:mirador', name: 'Mirador Ladera Sierra', district: 'Sierra Palmera', point: { x: -130, y: 8.08, z: 12 } },
];

export interface DistrictZone {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const districtZones: readonly DistrictZone[] = [
  { name: 'Cumbre de Sierra Palmera', minX: -360, maxX: -265, minZ: -140, maxZ: 35 },
  { name: 'Isla Fortuna', minX: 196, maxX: 500, minZ: -240, maxZ: 240 },
  { name: 'Distrito Penal Norte', minX: -280, maxX: -140, minZ: -410, maxZ: -280 },
  { name: 'Barrio del Sol', minX: -140, maxX: 140, minZ: -360, maxZ: -225 },
  { name: 'Distrito Cívico Norte', minX: -120, maxX: 140, minZ: -225, maxZ: -94 },
  { name: 'Sierra Palmera', minX: -560, maxX: -68, minZ: -460, maxZ: 140 },
  { name: 'Colinas del Sur', minX: -320, maxX: 140, minZ: 94, maxZ: 460 },
  { name: 'Bahía Palmera', minX: 62, maxX: 200, minZ: -560, maxZ: 560 },
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

export const expansionIslands: MapRectangle[] = [
  { x: 340, z: 0, width: 280, depth: 440 },
];

export const expansionBridges: MapRectangle[] = [
  { x: 133, z: 7, width: 162, depth: 11 },
  { x: 133, z: -63, width: 162, depth: 11 },
];

export const expansionMountains: MapRectangle[] = [
  { x: -435, z: -260, width: 170, depth: 230 },
  { x: -445, z: -10, width: 170, depth: 260 },
  { x: -425, z: 255, width: 180, depth: 250 },
];

export const expansionRoads: MapRectangle[] = [
  // Norte: Avenida Norte, Bulevar Cívico, Barrio del Sol y Carretera Penal
  { x: 0, z: -244, width: 12, depth: 300 },
  { x: -24, z: -175, width: 260, depth: 11 },
  { x: 6, z: -272, width: 220, depth: 10 },
  { x: -105, z: -325, width: 230, depth: 10 },
  { x: -155, z: -250, width: 10, depth: 160 },
  // Isla Fortuna: gran red vial perimetral e interior
  { x: 238, z: 0, width: 11, depth: 340 },
  { x: 310, z: 0, width: 11, depth: 340 },
  { x: 408, z: 0, width: 10, depth: 340 },
  { x: 323, z: -155, width: 185, depth: 10 },
  { x: 310, z: -63, width: 210, depth: 11 },
  { x: 310, z: 7, width: 210, depth: 11 },
  { x: 323, z: 115, width: 185, depth: 10 },
  { x: 323, z: 172, width: 180, depth: 10 },
  // Sierra Palmera: carretera panorámica en 3 tramos de subida hasta Casa del Mirador
  { x: -102, z: 7, width: 68, depth: 11 },
  { x: -132, z: -5, width: 11, depth: 204 },
  { x: -180, z: -120, width: 112, depth: 11 },
  { x: -294, z: -76, width: 11, depth: 104 },
  // Colinas del Sur y acceso al Restaurante El Mirador
  { x: 0, z: 238, width: 12, depth: 290 },
  { x: -45, z: 215, width: 220, depth: 11 },
  { x: -132, z: 156, width: 11, depth: 128 },
  { x: -12, z: 336, width: 210, depth: 10 },
];

export const expansionLandmarks: LandmarkPin[] = [
  { x: -210, z: -340, name: 'Cárcel de Palma', kind: 'prison' },
  { x: 68, z: -215, name: 'Comisaría Central', kind: 'police_hq' },
  { x: 318, z: 72, name: 'Casino Royale Palma', kind: 'casino' },
  { x: -170, z: 215, name: 'Restaurante El Mirador', kind: 'restaurant' },
  { x: -315, z: -16, name: 'Casa del Mirador', kind: 'house' },
  { x: 133, z: 7, name: 'Puente Fortuna', kind: 'landmark' },
  { x: 133, z: -63, name: 'Puente Mirador', kind: 'landmark' },
  { x: 306, z: -22, name: 'Plaza Oasis Fortuna', kind: 'landmark' },
  { x: 0, z: -272, name: 'Barrio del Sol', kind: 'landmark' },
  { x: 48, z: 336, name: 'Mirador Puerto Brisa', kind: 'landmark' },
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
  color = '#525864',
  thickness = 0.62,
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
  color = '#525864',
  thickness = 0.62,
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
  colliders.push({ x, y, z, halfX: width / 2, halfY: height / 2, halfZ: depth / 2 });
}

/**
 * Full 1.1km x 1.1km terrain colliders: mainland slab, Isla Fortuna slab,
 * outer perimeter walls, and coastline water barriers with open bridge portals.
 */
export function createExpandedTerrainColliders(): StaticBox[] {
  const { minX, maxX, minZ, maxZ } = worldBounds;
  const wallH = 18;
  const wallT = 1.0;
  const mainlandMaxX = shoreline + 1.1;
  const mainlandW = mainlandMaxX - minX;
  const mainlandCenterX = (minX + mainlandMaxX) / 2;
  const worldD = maxZ - minZ;

  const islandMinX = 200;
  const islandMaxX = 480;
  const islandMinZ = -220;
  const islandMaxZ = 220;
  const islandW = islandMaxX - islandMinX;
  const islandD = islandMaxZ - islandMinZ;
  const islandCX = (islandMinX + islandMaxX) / 2;
  const islandCZ = (islandMinZ + islandMaxZ) / 2;

  const colliders: StaticBox[] = [
    // Mainland ground (Core + North Civic/Sol/Prison + West Sierra + South Foothills)
    { x: mainlandCenterX, y: -0.5, z: 0, halfX: mainlandW / 2, halfY: 0.5, halfZ: worldD / 2 },
    // Isla Fortuna ground
    { x: islandCX, y: -0.5, z: islandCZ, halfX: islandW / 2, halfY: 0.5, halfZ: islandD / 2 },
    // Outer world perimeter walls
    { x: minX, y: wallH, z: 0, halfX: wallT, halfY: wallH, halfZ: worldD / 2 },
    { x: maxX, y: wallH, z: 0, halfX: wallT, halfY: wallH, halfZ: worldD / 2 },
    { x: (minX + maxX) / 2, y: wallH, z: minZ, halfX: (maxX - minX) / 2, halfY: wallH, halfZ: wallT },
    { x: (minX + maxX) / 2, y: wallH, z: maxZ, halfX: (maxX - minX) / 2, halfY: wallH, halfZ: wallT },
    // Isla Fortuna north/south/east water barriers
    { x: islandCX, y: 4, z: islandMinZ - 0.6, halfX: islandW / 2 + 1, halfY: 4, halfZ: 0.6 },
    { x: islandCX, y: 4, z: islandMaxZ + 0.6, halfX: islandW / 2 + 1, halfY: 4, halfZ: 0.6 },
    { x: islandMaxX + 0.6, y: 4, z: islandCZ, halfX: 0.6, halfY: 4, halfZ: islandD / 2 + 1 },
  ];

  // Coastline water barriers along mainland (x = shoreline + 0.7) and Isla Fortuna west edge (x = 199.6)
  // Clear 11.4m bridge portals at Puente Mirador (z = -63) and Puente Fortuna (z = 7)
  const mainlandShoreSegments: [number, number][] = [
    [minZ, -68.8],
    [-57.2, 1.2],
    [12.8, maxZ],
  ];
  for (const [z0, z1] of mainlandShoreSegments) {
    colliders.push({
      x: shoreline + 0.7,
      y: 4,
      z: (z0 + z1) / 2,
      halfX: 0.6,
      halfY: 4,
      halfZ: (z1 - z0) / 2,
    });
  }

  const islandWestSegments: [number, number][] = [
    [islandMinZ, -68.8],
    [-57.2, 1.2],
    [12.8, islandMaxZ],
  ];
  for (const [z0, z1] of islandWestSegments) {
    colliders.push({
      x: islandMinX - 0.4,
      y: 4,
      z: (z0 + z1) / 2,
      halfX: 0.6,
      halfY: 4,
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
  addSuspensionBridge(geometry, colliders, 7, 'aquaLight', '#42f2e0', '#e8dac2');
  addSuspensionBridge(geometry, colliders, -63, 'goldLight', '#ffcf76', '#e6cfb2');
  addIslaFortuna(geometry, colliders, random);
  addNorthDistricts(geometry, colliders, random);
  addSierraPalmeraMountains(geometry, colliders, random);
  addSouthDistricts(geometry, colliders, random);
}

function addExpansionGrounds(geometry: DistrictGeometry): void {
  // Natural coastal meadow & urban terrain outside the core city
  geometry.box('pavement', '#78886e', -249, -0.22, -327, 622, 0.36, 466);
  geometry.box('pavement', '#78886e', -249, -0.22, 327, 622, 0.36, 466);
  geometry.box('pavement', '#728368', -314, -0.22, 0, 492, 0.36, 188);

  // Extended golden sandy coastline north & south of Paseo del Mar
  geometry.box('pavement', '#d4b58c', 56.5, -0.07, -327, 11.5, 0.12, 466);
  geometry.box('pavement', '#d4b58c', 56.5, -0.07, 327, 11.5, 0.12, 466);

  // Flat road ribbons in expanded districts (with crisp sidewalks/curbs and center dashes)
  for (const road of expansionRoads) {
    // Skip elevated Sierra road segments built by ramp/plateau geometry
    if (road.x < -72 && road.z < 96 && road.z > -140) continue;
    // Subtle curb apron slightly wider than road asphalt
    geometry.box('pavement', '#aba79c', road.x, 0.012, road.z, road.width + 2.8, 0.04, road.depth + 2.8);
    geometry.box('asphalt', '#4d535e', road.x, 0.04, road.z, road.width, 0.06, road.depth);
    if (road.depth > road.width) {
      for (let z = road.z - road.depth / 2 + 4; z < road.z + road.depth / 2 - 3; z += 7.5) {
        geometry.box('paint', '#e0d6b0', road.x, 0.076, z, 0.18, 0.012, 2.8);
      }
    } else {
      for (let x = road.x - road.width / 2 + 4; x < road.x + road.width / 2 - 3; x += 7.5) {
        geometry.box('paint', '#e0d6b0', x, 0.076, road.z, 2.8, 0.012, 0.18);
      }
    }
  }
}

/**
 * Architectural human-scale residential house (NOT a plain box):
 * stone plinth, pastel/cream stucco walls, overhanging pitched/terrace roof,
 * columned front porch, framed lit windows, wooden doorway, garden & tree.
 */
function addResidentialHouse(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  x: number,
  floorY: number,
  z: number,
  facing: 'north' | 'south' | 'east' | 'west',
  paletteIdx: number,
  random: () => number,
): void {
  const palettes = [
    { wall: '#f0e6d8', roof: '#b56347', trim: '#825b3d', accent: '#4a7a85' },
    { wall: '#e8dfd1', roof: '#4e5864', trim: '#755339', accent: '#c97458' },
    { wall: '#efe2d2', roof: '#a85a42', trim: '#6f4e35', accent: '#628a6b' },
    { wall: '#f3eee4', roof: '#3d4550', trim: '#8d6342', accent: '#4f7f96' },
  ];
  const pal = palettes[paletteIdx % palettes.length];
  const w = 13.5;
  const d = 10.5;
  const h = 4.2;

  // Landscaped yard & stone garden walkway
  geometry.box('pavement', '#6b8e62', x, floorY + 0.03, z, w + 9, 0.06, d + 9);
  geometry.box('pavement', '#d7cebe', x, floorY + 0.08, z, w + 1.8, 0.12, d + 1.8);
  // Main house body + stone plinth + upper terrace room
  addSolidBox(geometry, colliders, 'wall', pal.wall, x, floorY + h / 2 + 0.1, z, w, h, d, true);
  geometry.box('trim', '#9f9689', x, floorY + 0.34, z, w + 0.25, 0.48, d + 0.25);
  // Overhanging eaves & layered coastal roof
  geometry.box('trim', pal.trim, x, floorY + h + 0.22, z, w + 1.2, 0.26, d + 1.2);
  geometry.box('wall', pal.roof, x, floorY + h + 0.85, z, w * 0.88, 1.0, d * 0.86, true);
  geometry.box('wall', pal.roof, x, floorY + h + 1.55, z, w * 0.62, 0.55, d * 0.6);

  // Front porch, columns, wooden door, lantern & framed windows oriented toward street
  const frontSign = facing === 'south' || facing === 'east' ? 1 : -1;
  const alongZ = facing === 'north' || facing === 'south';
  if (alongZ) {
    const fz = z + frontSign * (d / 2 + 0.08);
    // Porch deck & overhang supported by 2 slim columns
    geometry.box('pavement', '#e3dacb', x, floorY + 0.12, z + frontSign * (d / 2 + 1.35), 7.2, 0.16, 2.7);
    geometry.box('trim', pal.trim, x, floorY + 2.95, z + frontSign * (d / 2 + 1.35), 7.4, 0.2, 2.8);
    for (const cx of [-3.1, 3.1]) {
      geometry.box('trim', '#f2ece1', x + cx, floorY + 1.55, z + frontSign * (d / 2 + 2.45), 0.26, 2.75, 0.26);
    }
    // Front door (human scale 1.15m x 2.3m) + warm porch light
    geometry.box('trim', pal.trim, x, floorY + 1.25, fz, 1.2, 2.3, 0.14);
    geometry.box('goldLight', '#ffda88', x + 0.9, floorY + 2.05, fz + frontSign * 0.08, 0.16, 0.24, 0.12);
    // Framed living room windows
    for (const wx of [-4.2, 4.2]) {
      geometry.box('trim', '#ffffff', x + wx, floorY + 1.85, fz, 2.4, 1.45, 0.14);
      geometry.box('glassLit', '#ffd590', x + wx, floorY + 1.85, fz + frontSign * 0.03, 2.1, 1.2, 0.1);
    }
    addPlanter(geometry, x - 2.3, z + frontSign * (d / 2 + 2.9), random, 0.8);
    addPalm(geometry, x + 6.5, z + frontSign * 4.5, random, 0.92);
  } else {
    const fx = x + frontSign * (w / 2 + 0.08);
    geometry.box('pavement', '#e3dacb', x + frontSign * (w / 2 + 1.35), floorY + 0.12, z, 2.7, 0.16, 6.6);
    geometry.box('trim', pal.trim, x + frontSign * (w / 2 + 1.35), floorY + 2.95, z, 2.8, 0.2, 6.8);
    for (const cz of [-2.8, 2.8]) {
      geometry.box('trim', '#f2ece1', x + frontSign * (w / 2 + 2.45), floorY + 1.55, z + cz, 0.26, 2.75, 0.26);
    }
    geometry.box('trim', pal.trim, fx, floorY + 1.25, z, 0.14, 2.3, 1.2);
    geometry.box('goldLight', '#ffda88', fx + frontSign * 0.08, floorY + 2.05, z + 0.9, 0.12, 0.24, 0.16);
    for (const wz of [-3.3, 3.3]) {
      geometry.box('trim', '#ffffff', fx, floorY + 1.85, z + wz, 0.14, 1.45, 2.2);
      geometry.box('glassLit', '#ffd590', fx + frontSign * 0.03, floorY + 1.85, z + wz, 0.1, 1.2, 1.9);
    }
    addPalm(geometry, x + frontSign * 5.2, z + 5.8, random, 0.96);
  }
}

/** Grand 162m suspension bridge across Bahía Palmera connecting Costa Palmera to Isla Fortuna. */
function addSuspensionBridge(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  centerZ: number,
  lightFinish: 'aquaLight' | 'goldLight',
  lightColor: string,
  stoneColor: string,
): void {
  const deckW = 10.6;
  const deckY = 6.4;

  // Flat approach apron over beach promenade
  geometry.box('asphalt', '#4f5561', 49.5, 0.045, centerZ, 5.4, 0.06, deckW);
  // West ascending ramp (x: 52 -> 92, y: 0.05 -> 6.4m, smooth 9.0° grade)
  addRampX(geometry, colliders, 52, 0.05, 92, deckY, centerZ, deckW, 'asphalt', '#4f5561');
  // Elevated central deck over the ocean (x: 92 -> 174, 82m span at y = 6.4m)
  addSolidBox(geometry, colliders, 'asphalt', '#4f5561', 133, deckY - 0.31, centerZ, 82.4, 0.62, deckW);
  // East descending ramp into Isla Fortuna (x: 174 -> 214, y: 6.4 -> 0.05m)
  addRampX(geometry, colliders, 174, deckY, 214, 0.05, centerZ, deckW, 'asphalt', '#4f5561');

  // Center dashed lane markings along central deck
  for (let x = 95; x <= 171; x += 6.0) {
    geometry.box('paint', '#e5dca8', x, deckY + 0.014, centerZ, 2.4, 0.015, 0.18);
  }

  // Guardrails, elevated sidewalks, concrete ocean piers, twin Art Deco towers & stay cables
  for (const side of [-1, 1]) {
    const rz = centerZ + side * (deckW / 2 + 0.28);
    // Raised pedestrian sidewalk lip + safety barrier along horizontal deck
    geometry.box('pavement', '#d4ccbe', 133, deckY + 0.08, centerZ + side * (deckW / 2 - 0.55), 82.2, 0.16, 1.05);
    addSolidBox(geometry, colliders, 'trim', stoneColor, 133, deckY + 0.56, rz, 82.6, 1.12, 0.46);
    geometry.box(lightFinish, lightColor, 133, deckY + 1.15, rz, 81.8, 0.14, 0.18);

    // Sloped ramp guardrails
    addRampX(geometry, colliders, 52, 1.18, 92, deckY + 1.12, rz, 0.46, 'trim', stoneColor, 1.15);
    addRampX(geometry, colliders, 174, deckY + 1.12, 214, 1.18, rz, 0.46, 'trim', stoneColor, 1.15);

    // Concrete piers into Bahía Palmera
    for (const px of [82, 108, 133, 158, 184]) {
      geometry.box('wall', '#c5bdb0', px, 2.7, centerZ + side * 4.6, 2.1, 6.8, 1.8, true);
    }

    // Twin Art Deco suspension towers (x = 108 & x = 158, rising 18m above deck)
    for (const tx of [108, 158]) {
      geometry.box('trim', '#efe4cf', tx, deckY + 9.0, rz, 1.85, 18.0, 1.25, true);
      geometry.box(lightFinish, lightColor, tx, deckY + 17.6, rz, 2.05, 0.55, 1.4);
      // Angled stay cables fanning down to the bridge deck
      for (const offset of [-18, -10, 10, 18]) {
        const xStart = tx;
        const yStart = deckY + 16.5 - Math.abs(offset) * 0.18;
        const xEnd = tx + offset;
        const yEnd = deckY + 1.1;
        const len = Math.hypot(xEnd - xStart, yEnd - yStart);
        const ang = Math.atan2(yEnd - yStart, xEnd - xStart);
        geometry.rotatedBox('trim', '#d4dce4', (xStart + xEnd) / 2, (yStart + yEnd) / 2, rz, len, 0.12, 0.12, new Euler(0, 0, ang));
      }
    }
  }
  // Cross portal arches linking North & South towers overhead
  for (const tx of [108, 158]) {
    geometry.box('trim', '#e9dac0', tx, deckY + 15.8, centerZ, 1.35, 1.1, deckW + 1.6);
    geometry.box('trim', '#e9dac0', tx, deckY + 10.6, centerZ, 0.95, 0.72, deckW + 1.2);
  }
}

function addIslaFortuna(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  // Golden coastal beaches + landscaped tropical resort island (x in [200, 480], z in [-220, 220])
  geometry.box('pavement', '#d9bc92', 340, -0.075, 0, 280, 0.15, 440);
  geometry.box('pavement', '#b5b8a4', 340, -0.01, 0, 252, 0.09, 404);

  // Central Plaza Oasis Fortuna (x = 306, z = -22) with turquoise reflection pool & palm colonnade
  geometry.box('pavement', '#6d9466', 306, 0.045, -22, 54, 0.05, 50);
  geometry.box('pavement', '#e6dac0', 306, 0.078, -22, 22, 0.05, 22);
  geometry.box('trim', '#f0e7d4', 306, 0.28, -22, 10.5, 0.42, 10.5);
  geometry.box('aquaLight', '#42f2e0', 306, 0.44, -22, 9.2, 0.16, 9.2);
  geometry.box('trim', '#efe5cf', 306, 1.1, -22, 1.8, 1.6, 1.8);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addPalm(geometry, 306 + sx * 16, -22 + sz * 15, random, 1.22);
      addBench(geometry, 306 + sx * 8.2, -22 + sz * 8.2);
    }
  }

  // Coastal palms & lampposts along Isla Fortuna boulevards
  for (let z = -180; z <= 180; z += 28) {
    if (Math.abs(z - 7) > 12 && Math.abs(z + 63) > 12) {
      addPalm(geometry, 214, z, random, 1.05);
    }
    addPalm(geometry, 460, z, random, 1.1);
    addLamppost(geometry, 245, z + 6, 1);
    addLamppost(geometry, 317, z - 6, 1);
  }

  // Functional Venue: GRAND CASINO ROYALE PALMA (x = 318, z = 72)
  addCasinoRoyale(geometry, colliders, random);

  // Luxury coastal residential villas on Isla Fortuna (NPC homes!)
  const islandVillas: { x: number; z: number; facing: 'north' | 'south' | 'west'; p: number }[] = [
    { x: 266, z: -120, facing: 'north', p: 0 },
    { x: 316, z: -120, facing: 'north', p: 1 },
    { x: 366, z: -120, facing: 'north', p: 2 },
    { x: 266, z: -186, facing: 'south', p: 3 },
    { x: 336, z: -186, facing: 'south', p: 0 },
    { x: 382, z: -48, facing: 'west', p: 1 },
    { x: 382, z: 32, facing: 'west', p: 2 },
    { x: 438, z: -26, facing: 'west', p: 3 },
  ];
  for (const v of islandVillas) {
    addResidentialHouse(geometry, colliders, v.x, 0, v.z, v.facing, v.p, random);
  }

  // Gran Hotel & Resort Palma on south Isla Fortuna (x = 344, z = 148)
  addSolidBox(geometry, colliders, 'wall', '#f0dfd0', 344, 15, 148, 36, 30, 20, true);
  geometry.box('wall', '#e7cfbc', 344, 34, 148, 22, 10, 14, true);
  geometry.box('coralLight', '#ff4e88', 344, 30.3, 148, 36.8, 0.45, 20.8);
  geometry.box('goldLight', '#ffcf76', 344, 39.3, 148, 22.8, 0.4, 14.8);
  for (let y = 4; y <= 26; y += 3.6) {
    geometry.box('glassLit', '#ffd28c', 344, y, 137.9, 28, 1.4, 0.16);
    geometry.box('glass', '#5f87a0', 344, y, 158.1, 28, 1.4, 0.16);
  }
}

/** Detailed Art Deco Casino Royale Palma with colonnade, fountain, VIP bar & gaming tables. */
function addCasinoRoyale(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  const cx = 318;
  const cz = 72;
  const w = 36;
  const d = 30;
  const h = 9.2;

  // Marble forecourt, arrival fountain & red carpet entrance
  geometry.box('pavement', '#e8dfd0', cx - 6, 0.06, cz, w + 18, 0.1, d + 10);
  geometry.box('paint', '#a6203b', cx - 12, 0.12, cz, 22, 0.02, 4.4);
  // Decorative fountain in front plaza (clear of road)
  geometry.box('trim', '#efe6d5', cx - 26, 0.34, cz - 9, 5.2, 0.56, 5.2);
  geometry.box('aquaLight', '#42f2e0', cx - 26, 0.58, cz - 9, 4.3, 0.14, 4.3);
  addPalm(geometry, cx - 26, cz + 9, random, 1.15);

  // Grand Art Deco roof crown & glowing dome tiers
  addSolidBox(geometry, colliders, 'trim', '#2a2134', cx, h, cz, w + 1.4, 0.75, d + 1.4, true);
  geometry.box('wall', '#3a2c48', cx, h + 2.2, cz, w * 0.72, 3.8, d * 0.68, true);
  geometry.box('wall', '#4a365b', cx, h + 5.2, cz, w * 0.42, 2.4, d * 0.42, true);
  geometry.box('goldLight', '#ffcf76', cx, h + 0.45, cz, w + 1.6, 0.28, d + 1.6);
  geometry.box('coralLight', '#ff4e88', cx, h + 4.15, cz, w * 0.72 + 0.4, 0.28, d * 0.68 + 0.4);
  geometry.box('goldLight', '#ffcf76', cx, h + 6.5, cz, w * 0.42 + 0.3, 0.25, d * 0.42 + 0.3);

  // Exterior walls (open West grand entrance 8.4m wide)
  addSolidBox(geometry, colliders, 'wall', '#362942', cx + w / 2 - 0.4, h / 2, cz, 0.8, h, d, true);
  addSolidBox(geometry, colliders, 'wall', '#3f304d', cx, h / 2, cz - d / 2 + 0.4, w, h, 0.8, true);
  addSolidBox(geometry, colliders, 'wall', '#3f304d', cx, h / 2, cz + d / 2 - 0.4, w, h, 0.8, true);
  addSolidBox(geometry, colliders, 'wall', '#473657', cx - w / 2 + 0.4, h / 2, cz - 9.6, 0.8, h, 10.8, true);
  addSolidBox(geometry, colliders, 'wall', '#473657', cx - w / 2 + 0.4, h / 2, cz + 9.6, 0.8, h, 10.8, true);
  addSolidBox(geometry, colliders, 'trim', '#241b2e', cx - w / 2 + 0.4, 6.8, cz, 1.0, 4.8, 8.6);

  // Exterior colonnade & illuminated grand marquee canopy
  geometry.box('trim', '#251c30', cx - w / 2 - 2.6, 4.6, cz, 5.4, 0.65, 13.4);
  geometry.box('goldLight', '#ffcf76', cx - w / 2 - 5.2, 4.68, cz, 0.2, 0.42, 13.0);
  geometry.box('coralLight', '#ff4e88', cx - w / 2 - 0.2, 6.2, cz, 0.26, 1.1, 10.4);
  for (const pz of [-5.8, -2.8, 2.8, 5.8]) {
    addSolidBox(geometry, colliders, 'trim', '#efe3cc', cx - w / 2 - 4.4, 2.25, cz + pz, 0.65, 4.5, 0.65);
  }

  // Interior golden chandelier & gaming floor
  geometry.box('goldLight', '#ffdd88', cx, h - 1.2, cz, 4.2, 0.45, 4.2);
  // Central Roulette VIP Table (at interactPoint x=314, z=72)
  addSolidBox(geometry, colliders, 'trim', '#5c3420', cx - 1.2, 0.52, cz, 3.8, 0.92, 5.4);
  geometry.box('paint', '#1b7a4b', cx - 1.2, 1.0, cz, 3.3, 0.05, 4.9);
  geometry.box('goldLight', '#ffcf76', cx - 1.2, 1.08, cz - 1.2, 1.15, 0.14, 1.15);
  // Two flanking Blackjack tables with emerald felt & player stools
  for (const tz of [-7.8, 7.8]) {
    addSolidBox(geometry, colliders, 'trim', '#5c3420', cx + 4.5, 0.5, cz + tz, 3.0, 0.88, 2.2);
    geometry.box('paint', '#1d8252', cx + 4.5, 0.96, cz + tz, 2.6, 0.05, 1.85);
    for (const sx of [-0.9, 0, 0.9]) {
      geometry.box('trim', '#8d2a3d', cx + 4.5 + sx, 0.54, cz + tz + (tz < 0 ? 1.55 : -1.55), 0.42, 0.12, 0.42);
      geometry.box('trim', '#2e2736', cx + 4.5 + sx, 0.28, cz + tz + (tz < 0 ? 1.55 : -1.55), 0.09, 0.48, 0.09);
    }
  }
  // Illuminated slot machine banks & back VIP cocktail bar
  addSolidBox(geometry, colliders, 'trim', '#3a2234', cx + 13.5, 0.58, cz, 1.8, 1.12, 11.4);
  geometry.box('goldLight', '#ffcf76', cx + 12.65, 1.18, cz, 0.14, 0.1, 10.6);
  for (const sz of [-12.2, 12.2]) {
    addSolidBox(geometry, colliders, 'trim', '#2d233a', cx + 1.5, 1.05, cz + sz, 11.5, 2.05, 1.25);
    geometry.box('aquaLight', '#42f2e0', cx + 1.5, 1.38, cz + sz + (sz < 0 ? 0.66 : -0.66), 10.4, 0.52, 0.08);
  }
}

function addNorthDistricts(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  // Streetlights & palms along Bulevar Cívico (z = -175) and Avenida Norte (x = 0)
  for (let x = -120; x <= 96; x += 24) {
    addLamppost(geometry, x, -168.5, 1);
    addPalm(geometry, x + 7, -167.2, random, 0.95);
  }
  for (let z = -115; z >= -340; z -= 32) {
    addLamppost(geometry, 7.2, z, -1);
    addLamppost(geometry, -7.2, z, 1);
  }

  // Plaza Cívica del Sol (roundabout/park at x=0, z=-215)
  geometry.box('pavement', '#6d9466', -32, 0.04, -210, 32, 0.06, 26);
  geometry.box('trim', '#dcd2be', -32, 0.5, -210, 6.2, 0.8, 6.2);
  addBench(geometry, -26, -206);
  addBench(geometry, -38, -214);
  addPalm(geometry, -22, -218, random, 1.1);
  addPalm(geometry, -42, -202, random, 1.05);

  // Functional Venue: COMISARÍA CENTRAL (x = 68, z = -215)
  addPoliceHQ(geometry, colliders);

  // Barrio del Sol — 11 human-scale residential homes for NPCs in North District!
  const northHomes: { x: number; z: number; facing: 'north' | 'south'; p: number }[] = [
    { x: -84, z: -248, facing: 'north', p: 0 },
    { x: -56, z: -248, facing: 'north', p: 1 },
    { x: -24, z: -248, facing: 'north', p: 2 },
    { x: 28, z: -248, facing: 'north', p: 3 },
    { x: 64, z: -248, facing: 'north', p: 0 },
    { x: 96, z: -248, facing: 'north', p: 1 },
    { x: -84, z: -298, facing: 'south', p: 2 },
    { x: -46, z: -298, facing: 'south', p: 3 },
    { x: 28, z: -298, facing: 'south', p: 1 },
    { x: 74, z: -298, facing: 'south', p: 0 },
    { x: -74, z: -152, facing: 'north', p: 2 },
  ];
  for (const h of northHomes) {
    addResidentialHouse(geometry, colliders, h.x, 0, h.z, h.facing, h.p, random);
  }

  // Functional Venue: CÁRCEL DE PALMA (Penitenciaría Estatal at x = -210, z = -340)
  addPrisonComplex(geometry, colliders);
}

/** Detailed Civic Police Headquarters with lobby, reception desk, seating & squad bay. */
function addPoliceHQ(geometry: DistrictGeometry, colliders: StaticBox[]): void {
  const px = 68;
  const pz = -215;
  const w = 32;
  const d = 26;
  const h = 10.6;

  // Civic plaza forecourt & interior floor
  geometry.box('pavement', '#dad7ce', px, 0.06, pz + 4, w + 10, 0.1, d + 14);
  // Roof cornice & command penthouse
  addSolidBox(geometry, colliders, 'trim', '#1f334d', px, h, pz, w + 1.2, 0.75, d + 1.2, true);
  geometry.box('wall', '#294162', px, h + 2.0, pz, w * 0.58, 3.4, d * 0.56, true);
  // Police beacon bars on facade
  geometry.box('aquaLight', '#4da3ff', px - 6.2, 5.4, pz + d / 2 + 0.25, 7.4, 0.34, 0.22);
  geometry.box('coralLight', '#ff4458', px + 6.2, 5.4, pz + d / 2 + 0.25, 7.4, 0.34, 0.22);

  // Walls with wide 6.8m open front lobby entrance
  addSolidBox(geometry, colliders, 'wall', '#dfe4e9', px, h / 2, pz - d / 2 + 0.4, w, h, 0.8, true);
  addSolidBox(geometry, colliders, 'wall', '#d6dce3', px - w / 2 + 0.4, h / 2, pz, 0.8, h, d, true);
  addSolidBox(geometry, colliders, 'wall', '#d6dce3', px + w / 2 - 0.4, h / 2, pz, 0.8, h, d, true);
  addSolidBox(geometry, colliders, 'wall', '#dfe4e9', px - 9.7, h / 2, pz + d / 2 - 0.4, 12.6, h, 0.8, true);
  addSolidBox(geometry, colliders, 'wall', '#dfe4e9', px + 9.7, h / 2, pz + d / 2 - 0.4, 12.6, h, 0.8, true);
  addSolidBox(geometry, colliders, 'trim', '#213652', px, 7.4, pz + d / 2 - 0.4, 7.0, 5.6, 0.95);

  // Classical civic entry columns & upper-floor windows
  for (const cx of [-4.2, 4.2]) {
    addSolidBox(geometry, colliders, 'trim', '#eceae4', px + cx, 2.3, pz + d / 2 + 1.6, 0.65, 4.6, 0.65);
  }
  geometry.box('trim', '#213652', px, 4.75, pz + d / 2 + 1.1, 10.6, 0.5, 2.6);
  for (const side of [-1, 1]) {
    for (const wy of [4.2, 7.8]) {
      geometry.box('glass', '#496b8c', px + side * 9.8, wy, pz + d / 2 + 0.08, 8.2, 1.85, 0.14);
    }
  }

  // Interior reception counter (at interactPoint x = 68, z = -207), waiting benches & dispatch monitors
  addSolidBox(geometry, colliders, 'trim', '#243a56', px, 0.56, pz + 4.8, 7.8, 1.08, 1.3);
  geometry.box('aquaLight', '#62b8ff', px, 1.14, pz + 5.42, 7.2, 0.1, 0.1);
  // Duty officer behind desk
  geometry.box('wall', '#2b4a76', px, 1.38, pz + 3.6, 0.52, 0.66, 0.3);
  geometry.box('wall', '#e4c09e', px, 1.86, pz + 3.6, 0.32, 0.32, 0.32);
  // Waiting benches inside lobby
  for (const bx of [-8.5, 8.5]) {
    addSolidBox(geometry, colliders, 'trim', '#5d4a3a', px + bx, 0.28, pz + 7.2, 3.2, 0.46, 0.72);
  }
  // Dispatch wall screens behind desk
  geometry.box('trim', '#182230', px, 2.6, pz - 1.5, 6.2, 1.6, 0.16);
  geometry.box('aquaLight', '#4fa8d8', px - 1.5, 2.6, pz - 1.38, 2.6, 1.25, 0.06);
  geometry.box('aquaLight', '#6ad4c8', px + 1.5, 2.6, pz - 1.38, 2.6, 1.25, 0.06);
}

/** Realistic walled state penitentiary with guard towers, courtyard, gatehouse & furnished cellblock. */
function addPrisonComplex(geometry: DistrictGeometry, colliders: StaticBox[]): void {
  const cx = -210;
  const cz = -340;
  const halfW = 36;
  const halfD = 28;
  const wallH = 6.8;

  // Concrete penitentiary yard
  geometry.box('pavement', '#969996', cx, 0.055, cz, halfW * 2, 0.09, halfD * 2);

  // Outer perimeter security walls
  addSolidBox(geometry, colliders, 'wall', '#7d8287', cx, wallH / 2, cz - halfD, halfW * 2, wallH, 1.3, true);
  addSolidBox(geometry, colliders, 'wall', '#7d8287', cx - halfW, wallH / 2, cz, 1.3, wallH, halfD * 2, true);
  addSolidBox(geometry, colliders, 'wall', '#7d8287', cx + halfW, wallH / 2, cz, 1.3, wallH, halfD * 2, true);
  // South front wall with main gate portal (x = -210, z = -312, open 7.6m)
  addSolidBox(geometry, colliders, 'wall', '#7d8287', cx - 19.9, wallH / 2, cz + halfD, 32.2, wallH, 1.3, true);
  addSolidBox(geometry, colliders, 'wall', '#7d8287', cx + 19.9, wallH / 2, cz + halfD, 32.2, wallH, 1.3, true);
  addSolidBox(geometry, colliders, 'trim', '#464d55', cx, 5.7, cz + halfD, 8.2, 2.4, 1.6);
  geometry.box('goldLight', '#ffcf76', cx, 5.6, cz + halfD + 0.86, 6.4, 0.28, 0.14);

  // 4 corner security watchtowers with glass guard cabins & floodlights
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = cx + sx * (halfW - 0.8);
      const tz = cz + sz * (halfD - 0.8);
      addSolidBox(geometry, colliders, 'wall', '#686e74', tx, 6.4, tz, 4.0, 12.8, 4.0, true);
      geometry.box('glass', '#557082', tx, 11.2, tz, 4.15, 1.8, 4.15);
      geometry.box('trim', '#40464d', tx, 13.1, tz, 5.0, 0.65, 5.0);
      geometry.box('goldLight', '#ffcf76', tx, 10.1, tz, 4.3, 0.35, 4.3);
    }
  }

  // Cellblock building (NW quadrant) housing the player's real detention cell at cellPoint (-226, 0.1, -350)
  const cellX = -226;
  const cellZ = -351;
  const cbW = 18;
  const cbD = 12;
  const cbH = 5.4;
  geometry.box('pavement', '#808488', cellX, 0.08, cellZ, cbW, 0.06, cbD);
  addSolidBox(geometry, colliders, 'trim', '#585f66', cellX, cbH, cellZ, cbW + 0.8, 0.65, cbD + 0.8, true);
  addSolidBox(geometry, colliders, 'wall', '#8d9296', cellX, cbH / 2, cellZ - cbD / 2 + 0.35, cbW, cbH, 0.7, true);
  addSolidBox(geometry, colliders, 'wall', '#8d9296', cellX - cbW / 2 + 0.35, cbH / 2, cellZ, 0.7, cbH, cbD, true);
  addSolidBox(geometry, colliders, 'wall', '#8d9296', cellX + cbW / 2 - 0.35, cbH / 2, cellZ, 0.7, cbH, cbD, true);
  // Steel cell bars along front of cell (z = -345.3)
  addSolidBox(geometry, colliders, 'trim', '#353c42', cellX, 2.0, cellZ + cbD / 2 - 0.3, cbW - 1.2, 4.0, 0.24);
  for (let bx = cellX - 7.4; bx <= cellX + 7.4; bx += 1.05) {
    geometry.box('trim', '#22272d', bx, 2.4, cellZ + cbD / 2 - 0.12, 0.12, 4.6, 0.16);
  }
  // Cell bunk bed + steel sink/desk inside cell
  addSolidBox(geometry, colliders, 'trim', '#4a535c', cellX - 5.2, 0.42, cellZ - 2.6, 2.5, 0.62, 1.2);
  geometry.box('paint', '#c8c3b8', cellX - 5.2, 0.76, cellZ - 2.6, 2.35, 0.12, 1.05);
  addSolidBox(geometry, colliders, 'trim', '#5c656e', cellX + 4.8, 0.48, cellZ - 2.8, 1.4, 0.84, 0.8);

  // Courtyard basketball court, weight benches & exercise yard
  geometry.box('paint', '#c68a50', cx + 12, 0.1, cz + 2, 16, 0.02, 22);
  geometry.box('paint', '#ebe6dc', cx + 12, 0.11, cz + 2, 15.2, 0.015, 0.18);
  addSolidBox(geometry, colliders, 'trim', '#565c62', cx + 22, 0.45, cz - 14, 5.2, 0.55, 1.1);
}

/**
 * Sierra Palmera Mountain Range (x in [-560, -68]):
 * 3-stage scenic uphill highway (0 -> 8 -> 16 -> 24m), hillside villas,
 * monumental stepped peaks up to 84m, and the luxury mountain mansion (Casa del Mirador)
 * perched at y = 24.0m with unobstructed panoramic views over all of Costa Palmera!
 */
function addSierraPalmeraMountains(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  const tier1Y = 8.0;
  const tier2Y = 16.0;
  const tier3Y = 24.0;

  // === STAGE 1: Ascent from Costa Palmera Centro (x=-68, z=7) to Low Sierra Plateau (x=-118, y=8.0m) ===
  addRampX(geometry, colliders, -68, 0.05, -118, tier1Y, 7, 11, 'asphalt', '#525864');
  // Retaining stone walls flanking Stage 1 ramp
  addSolidBox(geometry, colliders, 'wall', '#8e8475', -93, 3.6, 1.0, 50, 7.6, 0.9);
  addSolidBox(geometry, colliders, 'wall', '#8e8475', -93, 3.6, 13.0, 50, 7.6, 0.9);

  // Low Sierra Plateau (x in [-156, -118], z in [-56, 46], y_top = 8.0m)
  addSolidBox(geometry, colliders, 'pavement', '#839175', -137, tier1Y / 2, -5, 38, tier1Y, 102);
  geometry.box('asphalt', '#525864', -132, tier1Y + 0.035, -5, 11, 0.07, 102);
  // Scenic cliffside safety barriers facing East toward Costa Palmera (clear at z=7 ramp!)
  addSolidBox(geometry, colliders, 'trim', '#d5c8b0', -118.4, tier1Y + 0.55, -27.5, 0.5, 1.1, 56);
  addSolidBox(geometry, colliders, 'trim', '#d5c8b0', -118.4, tier1Y + 0.55, 29.5, 0.5, 1.1, 33);
  // Hillside residential chalet on Low Sierra Plateau (NPC home!)
  addResidentialHouse(geometry, colliders, -145, tier1Y, -20, 'east', 3, random);

  // South Descent from Low Sierra Plateau (z=46 -> 96, y=8.0 -> 0.05m) toward Colinas del Sur & El Mirador
  addRampZ(geometry, colliders, 46, tier1Y, 96, 0.05, -132, 11, 'asphalt', '#525864');

  // === STAGE 2: Ascent North (z=-56 -> -106, y=8.0 -> 16.0m) to Mid-Sierra Ridge ===
  addRampZ(geometry, colliders, -56, tier1Y, -106, tier2Y, -132, 11, 'asphalt', '#525864');
  // Mid-Sierra Ridge Plateau (x in [-226, -118], z in [-144, -106], y_top = 16.0m)
  addSolidBox(geometry, colliders, 'pavement', '#7b896f', -172, tier2Y / 2, -125, 108, tier2Y, 38);
  geometry.box('asphalt', '#525864', -176, tier2Y + 0.035, -120, 99, 0.07, 11);
  // Mid-ridge guardrails
  addSolidBox(geometry, colliders, 'trim', '#d5c8b0', -172, tier2Y + 0.55, -143.5, 108, 1.1, 0.5);
  addSolidBox(geometry, colliders, 'trim', '#d5c8b0', -118.4, tier2Y + 0.55, -125, 0.5, 1.1, 38);
  addPalm(geometry, -162, -135, random, 1.0);
  addPalm(geometry, -196, -135, random, 1.05);

  // === STAGE 3: Ascent West (x=-226 -> -276, y=16.0 -> 24.0m) to Summit Overlook & Casa del Mirador ===
  addRampX(geometry, colliders, -226, tier2Y, -276, tier3Y, -120, 11, 'asphalt', '#525864');

  // Summit Overlook Plateau (x in [-348, -276], z in [-134, 24], y_top = 24.0m)
  addSolidBox(geometry, colliders, 'pavement', '#79886c', -312, tier3Y / 2, -55, 72, tier3Y, 158);
  // Scenic summit driveway from Stage 3 arrival (x=-294, z=-120) directly south to Casa del Mirador carport (z=-36)
  geometry.box('asphalt', '#505662', -285, tier3Y + 0.035, -120, 20, 0.07, 11);
  geometry.box('asphalt', '#505662', -294, tier3Y + 0.035, -76, 11, 0.07, 94);
  // Summit cliffside guardrails along the road north of the mansion (keeping the mansion terrace view wide open!)
  addSolidBox(geometry, colliders, 'trim', '#dcd0b8', -276.4, tier3Y + 0.55, -78, 0.5, 1.1, 74);
  addSolidBox(geometry, colliders, 'trim', '#dcd0b8', -312, tier3Y + 0.55, -133.5, 72, 1.1, 0.5);
  addSolidBox(geometry, colliders, 'trim', '#dcd0b8', -312, tier3Y + 0.55, 23.5, 72, 1.1, 0.5);
  for (let z = -112; z <= -46; z += 22) {
    addLamppost(geometry, -287.5, z, 1);
  }

  // Functional Venue: CASA DEL MIRADOR (Luxury Modern Mountain Mansion at y = 24.0m!)
  addMountainMansion(geometry, colliders, tier3Y, random);

  // === MONUMENTAL SIERRA PALMERA PEAKS (Framing western skyline behind the mansion & valley) ===
  const peaks = [
    { x: -425, z: -310, baseW: 165, baseD: 190, height: 74, rock: '#7a7870', cap: '#a69882' },
    { x: -450, z: -135, baseW: 170, baseD: 210, height: 86, rock: '#72746c', cap: '#ac9d86' },
    { x: -455, z: 45, baseW: 175, baseD: 210, height: 82, rock: '#77766e', cap: '#a89982' },
    { x: -435, z: 235, baseW: 175, baseD: 210, height: 72, rock: '#7d7a70', cap: '#a4957e' },
    { x: -395, z: 395, baseW: 160, baseD: 180, height: 56, rock: '#827e73', cap: '#a1927b' },
  ];

  for (const peak of peaks) {
    const tiers = 6;
    for (let t = 0; t < tiers; t++) {
      const frac = 1 - t * 0.145;
      const tierH = peak.height / tiers;
      const ty = t * tierH + tierH / 2;
      const tw = peak.baseW * frac;
      const td = peak.baseD * frac;
      const color = t >= tiers - 1 ? peak.cap : t === 0 ? '#657a5b' : t === 1 ? '#6e7b63' : peak.rock;
      if (t < 2) {
        addSolidBox(geometry, colliders, 'wall', color, peak.x - t * 2.5, ty, peak.z, tw, tierH, td);
      } else {
        geometry.box('wall', color, peak.x - t * 2.5, ty, peak.z, tw, tierH, td);
      }
    }
    // Foothill palms & trees along accessible mountain slopes
    for (let i = 0; i < 4; i++) {
      const px = peak.x + peak.baseW / 2 + 8 + random() * 14;
      const pz = peak.z + (i - 1.5) * 34 + (random() - 0.5) * 12;
      if (px > -340 && px < -160) {
        addPalm(geometry, px, pz, random, 1.0 + random() * 0.3);
      }
    }
  }
}

function addSouthDistricts(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  random: () => number,
): void {
  const restY = 6.0;

  // Ascending coastal road ramp from Colinas del Sur (x=-110, z=215) to El Mirador promontory (x=-148, y=6.0m)
  addRampX(geometry, colliders, -110, 0.05, -148, restY, 215, 11, 'asphalt', '#525864');
  // El Mirador elevated coastal terrace plateau (x in [-196, -148], z in [190, 240], y_top = 6.0m)
  addSolidBox(geometry, colliders, 'pavement', '#a69881', -172, restY / 2, 215, 48, restY, 50);
  addSolidBox(geometry, colliders, 'trim', '#dcd0b8', -148.4, restY + 0.55, 198, 0.5, 1.1, 16);
  addSolidBox(geometry, colliders, 'trim', '#dcd0b8', -148.4, restY + 0.55, 232, 0.5, 1.1, 16);

  // Functional Venue: GRAN RESTAURANTE EL MIRADOR (x = -170, z = 215, y = 6.0m)
  addMiradorRestaurant(geometry, colliders, restY, random);

  // Colinas del Sur & Puerto Brisa residential homes (NPC homes!)
  const southHomes: { x: number; z: number; facing: 'north' | 'south'; p: number }[] = [
    { x: -86, z: 242, facing: 'north', p: 0 },
    { x: -52, z: 242, facing: 'north', p: 1 },
    { x: 42, z: 242, facing: 'north', p: 2 },
    { x: 78, z: 242, facing: 'north', p: 3 },
    { x: -86, z: 188, facing: 'south', p: 1 },
    { x: -48, z: 188, facing: 'south', p: 2 },
    { x: 42, z: 188, facing: 'south', p: 0 },
    { x: -52, z: 312, facing: 'south', p: 3 },
    { x: 42, z: 312, facing: 'south', p: 1 },
    { x: 42, z: 364, facing: 'north', p: 2 },
  ];
  for (const h of southHomes) {
    addResidentialHouse(geometry, colliders, h.x, 0, h.z, h.facing, h.p, random);
  }

  // Mirador Puerto Brisa coastal promenade (x = 48, z = 336)
  geometry.box('pavement', '#d7c8ab', 48, 0.08, 336, 22, 0.14, 34);
  geometry.box('coralLight', '#ff4e88', 58.5, 1.05, 336, 0.2, 0.2, 30);
  for (let z = 120; z <= 360; z += 34) {
    addLamppost(geometry, 7.2, z, -1);
    addPalm(geometry, -14, z + 10, random, 1.05);
  }
}

/** Detailed Mediterranean panoramic terrace restaurant with dining tables, chairs, pergola & open bar. */
function addMiradorRestaurant(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  floorY: number,
  random: () => number,
): void {
  const rx = -170;
  const rz = 215;
  const w = 22;
  const d = 26;
  const h = 4.6;

  // Warm sandstone terrace deck
  geometry.box('pavement', '#e0ccb0', rx + 2.5, floorY + 0.06, rz, w + 8, 0.12, d + 4);
  // Back, north & south stucco walls (wide open panoramic east terrace overlooking the coast!)
  addSolidBox(geometry, colliders, 'wall', '#cc7f5c', rx - w / 2 + 0.35, floorY + h / 2, rz, 0.7, h, d, true);
  addSolidBox(geometry, colliders, 'wall', '#d68b67', rx, floorY + h / 2, rz - d / 2 + 0.35, w, h, 0.7, true);
  addSolidBox(geometry, colliders, 'wall', '#d68b67', rx, floorY + h / 2, rz + d / 2 - 0.35, w, h, 0.7, true);
  // Roof & slatted cedar pergola canopy with warm string lights
  addSolidBox(geometry, colliders, 'trim', '#784930', rx + 1.5, floorY + h + 0.24, rz, w + 5.0, 0.48, d + 1.8, true);
  geometry.box('goldLight', '#ffcf76', rx + w / 2 + 3.8, floorY + h + 0.14, rz, 0.22, 0.28, d);
  for (const pz of [rz - 11.4, rz - 4.2, rz + 4.2, rz + 11.4]) {
    addSolidBox(geometry, colliders, 'trim', '#784930', rx + w / 2 + 2.5, floorY + h / 2, pz, 0.52, h, 0.52);
  }

  // Open chef bar & host counter (interactPoint: -165, 6.08, 215)
  addSolidBox(geometry, colliders, 'trim', '#6b402b', rx - 3.0, floorY + 0.56, rz, 1.6, 1.05, 9.6);
  geometry.box('trim', '#f2e8d8', rx - 3.0, floorY + 1.11, rz, 1.75, 0.07, 9.8);
  geometry.box('goldLight', '#ffcf76', rx - 2.15, floorY + 1.14, rz, 0.14, 0.12, 8.8);

  // 6 human-scale dining tables with white tablecloths, chairs & glowing table candles
  for (const tz of [-8.2, 0, 8.2]) {
    for (const tx of [rx + 3.6, rx + 9.2]) {
      if (tx === rx + 3.6 && tz === 0) continue; // Keep host walk-up space open
      addSolidBox(geometry, colliders, 'trim', '#86573b', tx, floorY + 0.74, rz + tz, 1.6, 0.08, 1.6);
      geometry.box('trim', '#4a3224', tx, floorY + 0.38, rz + tz, 0.26, 0.68, 0.26);
      geometry.box('paint', '#f4eee2', tx, floorY + 0.79, rz + tz, 1.35, 0.03, 1.35);
      geometry.box('goldLight', '#ffdf8c', tx, floorY + 0.9, rz + tz, 0.18, 0.22, 0.18);
      // 2 chairs per table at human scale (0.46m)
      for (const side of [-1, 1]) {
        geometry.box('trim', '#6d4730', tx, floorY + 0.44, rz + tz + side * 1.08, 0.48, 0.07, 0.48);
        geometry.box('trim', '#6d4730', tx, floorY + 0.68, rz + tz + side * 1.28, 0.48, 0.46, 0.07);
      }
    }
  }
  addPlanter(geometry, rx + 12.5, rz - 10.5, random, 1.0);
  addPlanter(geometry, rx + 12.5, rz + 10.5, random, 1.0);
}
