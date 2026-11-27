import { Euler } from 'three';
import type { StaticBox } from '../../physics/physics';
import type { DistrictGeometry, Finish } from './geometry';
import { addPalm, addPlanter } from './vegetation';

function solid(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  finish: Finish,
  color: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  castsShadow = false,
): void {
  geometry.box(finish, color, x, y, z, w, h, d, castsShadow);
  colliders.push({ x, y, z, halfX: w / 2, halfY: h / 2, halfZ: d / 2 });
}

function addDiningChair(
  geometry: DistrictGeometry,
  x: number,
  floorY: number,
  z: number,
  facing: 'north' | 'south' | 'east' | 'west',
): void {
  // Human-scale dining chair (seat height 0.46m, backrest 0.88m)
  const wood = '#6d4c34';
  const cushion = '#e5dccb';
  geometry.box('trim', wood, x, floorY + 0.43, z, 0.46, 0.06, 0.46);
  geometry.box('paint', cushion, x, floorY + 0.48, z, 0.42, 0.05, 0.42);
  for (const lx of [-0.18, 0.18]) {
    for (const lz of [-0.18, 0.18]) {
      geometry.box('trim', wood, x + lx, floorY + 0.21, z + lz, 0.05, 0.42, 0.05);
    }
  }
  const backOffset = 0.2;
  if (facing === 'north') geometry.box('trim', wood, x, floorY + 0.68, z + backOffset, 0.46, 0.46, 0.06);
  else if (facing === 'south') geometry.box('trim', wood, x, floorY + 0.68, z - backOffset, 0.46, 0.46, 0.06);
  else if (facing === 'east') geometry.box('trim', wood, x - backOffset, floorY + 0.68, z, 0.06, 0.46, 0.46);
  else geometry.box('trim', wood, x + backOffset, floorY + 0.68, z, 0.06, 0.46, 0.46);
}

function addLounger(geometry: DistrictGeometry, x: number, floorY: number, z: number): void {
  // Sun lounger facing East (+X) toward the city panorama
  geometry.box('trim', '#7c583c', x, floorY + 0.28, z, 1.95, 0.1, 0.72);
  geometry.box('paint', '#f3eee4', x + 0.15, floorY + 0.37, z, 1.35, 0.09, 0.66);
  geometry.rotatedBox('paint', '#f3eee4', x - 0.66, floorY + 0.54, z, 0.62, 0.09, 0.66, new Euler(0, 0, -0.55));
  for (const lx of [-0.75, 0.75]) {
    for (const lz of [-0.28, 0.28]) {
      geometry.box('trim', '#5c412c', x + lx, floorY + 0.14, z + lz, 0.07, 0.26, 0.07);
    }
  }
}

function addIndoorPlant(geometry: DistrictGeometry, x: number, floorY: number, z: number): void {
  geometry.box('trim', '#ece6da', x, floorY + 0.26, z, 0.46, 0.52, 0.46);
  geometry.box('pavement', '#5a4636', x, floorY + 0.53, z, 0.38, 0.04, 0.38);
  geometry.box('foliage', '#4b7e4c', x, floorY + 0.92, z, 0.65, 0.65, 0.65);
  geometry.box('foliage', '#5f9458', x + 0.12, floorY + 1.25, z - 0.08, 0.52, 0.48, 0.52);
}

/**
 * Builds the modern hilltop luxury villa ("Casa del Mirador") perched high on
 * Sierra Palmera overlooking the entire city skyline and ocean bay.
 *
 * Human scale reference: character height = 1.75m, ground floor ceiling = 3.6m.
 * Footprint: interior x in [-326, -304], z in [-26, -6], floorY = 24.0m.
 * Panoramic terrace & infinity pool extend east to x = -284 facing Costa Palmera.
 */
export function addMountainMansion(
  geometry: DistrictGeometry,
  colliders: StaticBox[],
  floorY: number,
  random: () => number,
): void {
  const minX = -326;
  const maxX = -304;
  const minZ = -26;
  const maxZ = -6;
  const cx = (minX + maxX) / 2; // -315
  const cz = (minZ + maxZ) / 2; // -16
  const w = maxX - minX; // 22m
  const d = maxZ - minZ; // 20m
  const h = 3.7; // 3.7m modern luxury ceiling height
  const wallT = 0.36;

  // === 1. EXTERIOR STONE PLAZA, FLOATING WALKWAY & MODERN CARPORT (North side z in [-42, -26]) ===
  geometry.box('pavement', '#cfc7b9', -306, floorY + 0.04, -34, 34, 0.08, 16);
  // Floating stepping stones from driveway to front door (x = -309.5, z = -26)
  for (let i = 0; i < 6; i++) {
    const sz = -34.2 + i * 1.45;
    geometry.box('trim', '#ece6db', -309.5, floorY + 0.09, sz, 2.2, 0.08, 0.92);
    if (i % 2 === 0) {
      geometry.box('goldLight', '#ffcf76', -308.1, floorY + 0.2, sz, 0.14, 0.24, 0.14);
    }
  }
  // Modern steel-and-teak carport pergola for parking player's car (x in [-302, -291], z in [-39, -30])
  for (const px of [-301.5, -291.5]) {
    for (const pz of [-38.5, -30.5]) {
      solid(geometry, colliders, 'trim', '#353a42', px, floorY + 1.65, pz, 0.24, 3.3, 0.24);
    }
  }
  geometry.box('trim', '#353a42', -296.5, floorY + 3.32, -34.5, 10.6, 0.2, 8.6);
  for (let bx = -301; bx <= -292; bx += 1.1) {
    geometry.box('trim', '#9e6d45', bx, floorY + 3.24, -34.5, 0.16, 0.14, 8.2);
  }
  // Real estate sign ("EN VENTA · CASA DEL MIRADOR") near entrance path
  solid(geometry, colliders, 'trim', '#2f343b', -306.4, floorY + 0.95, -29.2, 0.14, 1.9, 0.14);
  geometry.box('goldLight', '#ffd27a', -306.4, floorY + 1.68, -29.2, 1.55, 0.72, 0.14);

  // Garden landscaping & palms framing the villa (leaving east view completely unobstructed!)
  addPlanter(geometry, -315, -27.5, random, 1.0);
  addPlanter(geometry, -321, -27.5, random, 1.0);
  addPalm(geometry, -327, -29, random, 1.05);
  addPalm(geometry, -329, -3, random, 1.12);
  addPalm(geometry, -287, -33, random, 0.95);

  // === 2. INTERIOR FLOORS (Zoned by room: Oak Parquet + Travertine Marble) ===
  // Living + Kitchen/Dining oak parquet (x in [-315.2, -304], z in [-26, -6])
  geometry.box('pavement', '#b98d5f', -309.6, floorY + 0.06, cz, 11.2, 0.12, d);
  // Master Bedroom warm light oak (x in [-326, -315.2], z in [-26, -14])
  geometry.box('pavement', '#c59d72', -320.6, floorY + 0.06, -20, 10.8, 0.12, 12);
  // Luxury Bathroom travertine marble (x in [-326, -315.2], z in [-14, -6])
  geometry.box('pavement', '#e6dfd3', -320.6, floorY + 0.06, -10, 10.8, 0.12, 8);

  // === 3. ARCHITECTURAL SHELL & ROOM PARTITIONS ===
  // West back wall (solid architectural stucco + slate accent panel)
  solid(geometry, colliders, 'wall', '#f3eee5', minX + wallT / 2, floorY + h / 2, cz, wallT, h, d, true);
  geometry.box('trim', '#4a5059', minX - 0.12, floorY + h / 2, -19, 0.24, h, 8.4);

  // South side wall with panoramic horizontal window strip
  solid(geometry, colliders, 'wall', '#f1ebe0', cx, floorY + 0.7, maxZ - wallT / 2, w, 1.4, wallT, true);
  solid(geometry, colliders, 'wall', '#f1ebe0', cx, floorY + 3.2, maxZ - wallT / 2, w, 1.0, wallT, true);
  solid(geometry, colliders, 'wall', '#f1ebe0', -322.5, floorY + h / 2, maxZ - wallT / 2, 7.0, h, wallT, true);
  solid(geometry, colliders, 'wall', '#f1ebe0', -306.5, floorY + h / 2, maxZ - wallT / 2, 5.0, h, wallT, true);
  geometry.box('glass', '#7aa0b8', -314, floorY + 2.05, maxZ - wallT / 2, 10.0, 1.3, 0.12);

  // North entrance wall with wide open walnut pivot doorway (x in [-311, -308], height 2.75m)
  solid(geometry, colliders, 'wall', '#f3eee5', -318.5, floorY + h / 2, minZ + wallT / 2, 15.0, h, wallT, true);
  solid(geometry, colliders, 'wall', '#f3eee5', -306.0, floorY + h / 2, minZ + wallT / 2, 4.0, h, wallT, true);
  solid(geometry, colliders, 'trim', '#6b482f', -309.5, floorY + 3.22, minZ + wallT / 2, 3.2, 0.96, wallT + 0.08);
  // Walnut entrance door frame & recessed warm entry light
  geometry.box('trim', '#6b482f', -311.08, floorY + 1.38, minZ + wallT / 2, 0.16, 2.76, 0.44);
  geometry.box('trim', '#6b482f', -307.92, floorY + 1.38, minZ + wallT / 2, 0.16, 2.76, 0.44);
  geometry.box('goldLight', '#ffcf76', -309.5, floorY + 2.8, minZ - 0.18, 2.6, 0.1, 0.12);
  // Open pivot door leaf angled invitingly inside
  geometry.rotatedBox('trim', '#7c5436', -310.75, floorY + 1.36, minZ + 0.95, 1.15, 2.68, 0.1, new Euler(0, 1.18, 0));

  // East panoramic facade (facing Costa Palmera): wide open sliding glass portal (z in [-23.5, -8.5])
  solid(geometry, colliders, 'wall', '#f3eee5', maxX - wallT / 2, floorY + h / 2, -24.75, wallT, h, 2.5, true);
  solid(geometry, colliders, 'wall', '#f3eee5', maxX - wallT / 2, floorY + h / 2, -7.25, wallT, h, 2.5, true);
  // Two slim architectural slate columns framing the panoramic view
  solid(geometry, colliders, 'trim', '#3b414a', maxX - 0.22, floorY + h / 2, -16.0, 0.36, h, 0.36);
  geometry.box('trim', '#3b414a', maxX - 0.22, floorY + 3.46, cz, 0.42, 0.48, d);
  // Retracted glass sliding panels tucked beside walls
  geometry.box('glass', '#7aa9c4', maxX - 0.22, floorY + 1.68, -22.6, 0.08, 3.2, 2.0);
  geometry.box('glass', '#7aa9c4', maxX - 0.22, floorY + 1.68, -9.4, 0.08, 3.2, 2.0);

  // Interior partition N-S at x = -315.2 (separates Private Suite from Living/Kitchen)
  // Doorway 1 to Master Bedroom: z in [-20.4, -18.0]; Doorway 2 to Bathroom: z in [-11.0, -8.6]
  solid(geometry, colliders, 'wall', '#ece6db', -315.2, floorY + h / 2, -23.2, 0.26, h, 5.6);
  solid(geometry, colliders, 'wall', '#ece6db', -315.2, floorY + h / 2, -14.5, 0.26, h, 7.0);
  solid(geometry, colliders, 'wall', '#ece6db', -315.2, floorY + h / 2, -7.3, 0.26, h, 2.6);
  solid(geometry, colliders, 'trim', '#7c583c', -315.2, floorY + 3.15, -19.2, 0.3, 1.1, 2.45);
  solid(geometry, colliders, 'trim', '#7c583c', -315.2, floorY + 3.15, -9.8, 0.3, 1.1, 2.45);

  // Interior partition E-W at z = -14.0 (separates Bedroom from En-suite Bathroom, open doorway x in [-318.2, -315.8])
  solid(geometry, colliders, 'wall', '#ece6db', -322.1, floorY + h / 2, -14.0, 7.8, h, 0.26);
  solid(geometry, colliders, 'trim', '#7c583c', -317.0, floorY + 3.15, -14.0, 2.6, 1.1, 0.3);

  // Ground-floor ceiling slab + modern cantilevered 2nd story architectural suite
  solid(geometry, colliders, 'trim', '#f0eae0', cx + 1.2, floorY + h + 0.22, cz, w + 4.4, 0.44, d + 2.4, true);
  // Warm recessed ceiling strips inside living room & bedroom
  geometry.box('goldLight', '#ffdf9e', -309.5, floorY + h - 0.04, -19.5, 4.6, 0.06, 0.22);
  geometry.box('goldLight', '#ffdf9e', -309.5, floorY + h - 0.04, -10.0, 4.6, 0.06, 0.22);
  geometry.box('goldLight', '#ffdf9e', -320.5, floorY + h - 0.04, -20.0, 4.2, 0.06, 0.22);
  geometry.box('aquaLight', '#bdeeff', -320.5, floorY + h - 0.04, -10.0, 3.2, 0.06, 0.22);

  // Upper level cantilevered glass penthouse (iconic modern skyline silhouette)
  const upBaseY = floorY + h + 0.44;
  solid(geometry, colliders, 'wall', '#f5f1e9', -317.5, upBaseY + 1.75, -17.5, 16.5, 3.5, 14.5, true);
  geometry.box('trim', '#8f623e', -309.2, upBaseY + 1.75, -17.5, 0.28, 3.5, 14.7);
  geometry.box('glassLit', '#ffd89a', -309.05, upBaseY + 1.8, -17.5, 0.14, 2.35, 11.8);
  geometry.box('glassLit', '#ffd89a', -317.5, upBaseY + 1.8, -10.18, 12.6, 2.2, 0.14);
  geometry.box('trim', '#e7dfd2', -316.5, upBaseY + 3.68, -17.5, 19.6, 0.36, 16.2, true);
  geometry.box('goldLight', '#ffd584', -306.7, upBaseY + 3.52, -17.5, 0.16, 0.14, 15.4);
  // Upper balcony glass railing
  geometry.box('glass', '#86b5cf', -302.5, upBaseY + 0.58, cz, 0.08, 1.05, d + 1.4);

  // =========================================================================
  // === 4. ROOM 1: PANORAMIC LIVING ROOM (x in [-314.8, -304.8], z in [-25.5, -14.5]) ===
  // =========================================================================
  // Woven cream rug
  geometry.box('paint', '#e8dfd0', -309.6, floorY + 0.135, -19.2, 5.2, 0.03, 4.2);
  geometry.box('paint', '#d2c2a8', -309.6, floorY + 0.14, -19.2, 4.7, 0.03, 3.7);

  // Modern L-shaped sectional sofa (seat height 0.44m, back 0.84m) facing TV & East panorama
  solid(geometry, colliders, 'trim', '#e3d9c8', -307.6, floorY + 0.26, -19.2, 1.05, 0.44, 3.4);
  solid(geometry, colliders, 'trim', '#d9cebc', -307.18, floorY + 0.58, -19.2, 0.24, 0.52, 3.4);
  solid(geometry, colliders, 'trim', '#e3d9c8', -309.1, floorY + 0.26, -17.95, 2.0, 0.44, 0.95);
  solid(geometry, colliders, 'trim', '#d9cebc', -309.1, floorY + 0.58, -17.55, 2.0, 0.52, 0.22);
  // Throw pillows in terracotta, teal & sand
  geometry.box('paint', '#c96b4d', -307.45, floorY + 0.62, -20.3, 0.22, 0.34, 0.38);
  geometry.box('paint', '#46848c', -307.45, floorY + 0.62, -19.2, 0.22, 0.34, 0.38);
  geometry.box('paint', '#c96b4d', -309.5, floorY + 0.62, -17.85, 0.38, 0.34, 0.22);

  // Designer accent armchair
  solid(geometry, colliders, 'trim', '#7c563a', -309.8, floorY + 0.24, -21.5, 0.92, 0.38, 0.88);
  geometry.box('paint', '#b86c52', -309.8, floorY + 0.46, -21.5, 0.82, 0.12, 0.78);
  geometry.box('paint', '#b86c52', -309.8, floorY + 0.68, -21.86, 0.82, 0.44, 0.16);

  // Travertine marble coffee table (0.42m tall) with art book & cups
  solid(geometry, colliders, 'trim', '#ece5d8', -309.6, floorY + 0.39, -19.6, 1.55, 0.08, 0.95);
  geometry.box('trim', '#3a3f46', -309.6, floorY + 0.21, -19.6, 1.2, 0.32, 0.65);
  geometry.box('paint', '#2d5d73', -309.3, floorY + 0.46, -19.5, 0.38, 0.06, 0.28);
  geometry.box('trim', '#d8b26e', -310.0, floorY + 0.46, -19.7, 0.32, 0.04, 0.32);
  geometry.box('paint', '#f5f2eb', -310.0, floorY + 0.53, -19.7, 0.1, 0.11, 0.1);

  // Walnut media console + wide 4K TV mounted on partition wall (x = -314.6, z = -22.8)
  solid(geometry, colliders, 'trim', '#68472e', -314.6, floorY + 0.32, -22.6, 0.62, 0.52, 3.2);
  geometry.box('trim', '#181c22', -314.88, floorY + 1.48, -22.6, 0.09, 1.15, 2.05);
  geometry.box('aquaLight', '#5bc4d6', -314.82, floorY + 1.48, -22.6, 0.04, 1.0, 1.9);
  // Warm floor lamp beside console
  geometry.box('trim', '#b89452', -314.5, floorY + 0.85, -24.7, 0.08, 1.55, 0.08);
  geometry.box('goldLight', '#ffdf9a', -314.5, floorY + 1.66, -24.7, 0.36, 0.28, 0.36);

  // Bookshelf with colorful books + abstract framed artwork on north wall
  solid(geometry, colliders, 'trim', '#724f35', -313.2, floorY + 1.15, -25.4, 1.85, 2.15, 0.42);
  for (let shelf = 0; shelf < 4; shelf++) {
    const sy = floorY + 0.48 + shelf * 0.48;
    geometry.box('paint', shelf % 2 === 0 ? '#c9624c' : '#4a7f8c', -313.6, sy, -25.35, 0.55, 0.26, 0.26);
    geometry.box('paint', shelf % 2 === 0 ? '#e3c078' : '#739168', -312.9, sy, -25.35, 0.48, 0.24, 0.26);
  }
  // Framed modern abstract painting on wall beside entrance
  geometry.box('trim', '#23272e', -306.2, floorY + 1.75, -25.55, 1.85, 1.25, 0.08);
  geometry.box('paint', '#f2e8d5', -306.2, floorY + 1.75, -25.49, 1.65, 1.05, 0.04);
  geometry.box('paint', '#d8664e', -306.55, floorY + 1.82, -25.46, 0.62, 0.62, 0.03);
  geometry.box('paint', '#3f8c96', -305.85, floorY + 1.65, -25.46, 0.54, 0.48, 0.03);
  addIndoorPlant(geometry, -305.1, floorY + 0.12, -24.6);

  // =========================================================================
  // === 5. ROOM 2: DESIGNER KITCHEN & DINING (x in [-314.8, -304.8], z in [-14.0, -6.5]) ===
  // =========================================================================
  // Kitchen counter run along partition wall (x = -314.5, z in [-15.2, -11.4]) & south wall (z = -6.9)
  solid(geometry, colliders, 'trim', '#efeae1', -314.55, floorY + 0.46, -13.6, 0.85, 0.88, 3.8);
  geometry.box('trim', '#3e434b', -314.55, floorY + 0.92, -13.6, 0.9, 0.06, 3.88);
  // Upper wood cabinets & warm under-cabinet LED strip
  geometry.box('trim', '#8b6140', -314.7, floorY + 2.28, -13.6, 0.46, 0.86, 3.6);
  geometry.box('goldLight', '#ffdc96', -314.52, floorY + 1.82, -13.6, 0.1, 0.05, 3.3);
  // Stainless steel double-door fridge (2.08m tall)
  solid(geometry, colliders, 'trim', '#bcc4cc', -314.48, floorY + 1.08, -7.2, 0.92, 2.08, 1.15);
  geometry.box('trim', '#4a525c', -314.0, floorY + 1.15, -7.2, 0.04, 1.1, 0.08);
  // South counter with sink & cooktop
  solid(geometry, colliders, 'trim', '#efeae1', -311.8, floorY + 0.46, -7.0, 3.6, 0.88, 0.85);
  geometry.box('trim', '#3e434b', -311.8, floorY + 0.92, -7.0, 3.66, 0.06, 0.9);
  geometry.box('trim', '#8894a0', -312.4, floorY + 0.95, -7.0, 0.85, 0.04, 0.55); // sink basin
  geometry.box('trim', '#1a1e24', -310.8, floorY + 0.95, -7.0, 0.85, 0.04, 0.55); // induction cooktop

  // Marble kitchen island (0.90m tall) + 3 bar stools
  solid(geometry, colliders, 'trim', '#f2ece2', -311.8, floorY + 0.46, -12.6, 0.98, 0.88, 2.8);
  geometry.box('trim', '#fcf8f0', -311.8, floorY + 0.92, -12.6, 1.08, 0.07, 2.92);
  for (const sz of [-13.4, -12.6, -11.8]) {
    geometry.box('trim', '#785438', -310.95, floorY + 0.65, sz, 0.38, 0.08, 0.38);
    geometry.box('trim', '#333840', -310.95, floorY + 0.33, sz, 0.08, 0.62, 0.08);
  }

  // Oak dining table (0.76m tall) for 6 with chairs & golden pendant light
  const dtX = -307.6;
  const dtZ = -10.8;
  solid(geometry, colliders, 'trim', '#8a5f3e', dtX, floorY + 0.74, dtZ, 1.25, 0.08, 2.75);
  geometry.box('trim', '#3a3f46', dtX, floorY + 0.38, dtZ - 0.95, 0.85, 0.68, 0.14);
  geometry.box('trim', '#3a3f46', dtX, floorY + 0.38, dtZ + 0.95, 0.85, 0.68, 0.14);
  geometry.box('trim', '#e0c078', dtX, floorY + 0.84, dtZ, 0.35, 0.12, 0.35);
  for (const dz of [-0.82, 0, 0.82]) {
    addDiningChair(geometry, dtX - 0.84, floorY + 0.08, dtZ + dz, 'east');
    addDiningChair(geometry, dtX + 0.84, floorY + 0.08, dtZ + dz, 'west');
  }
  geometry.box('trim', '#383d45', dtX, floorY + 3.05, dtZ, 0.06, 1.2, 0.06);
  geometry.box('goldLight', '#ffda88', dtX, floorY + 2.42, dtZ, 0.42, 0.18, 1.45);

  // =========================================================================
  // === 6. ROOM 3: MASTER BEDROOM SUITE (x in [-325.6, -315.4], z in [-25.6, -14.4]) ===
  // =========================================================================
  // Soft sand bedroom rug
  geometry.box('paint', '#dfd4c1', -321.5, floorY + 0.135, -20.2, 4.4, 0.03, 4.0);
  // King-size bed against West wall (headboard height 1.38m, mattress top 0.56m)
  solid(geometry, colliders, 'trim', '#6b4a32', -323.5, floorY + 0.26, -20.2, 2.35, 0.36, 2.25);
  geometry.box('paint', '#3d444d', -324.85, floorY + 0.78, -20.2, 0.24, 1.28, 2.45); // upholstered headboard
  geometry.box('paint', '#f7f4ee', -323.5, floorY + 0.50, -20.2, 2.22, 0.18, 2.12); // mattress
  geometry.box('paint', '#c46c50', -322.95, floorY + 0.58, -20.2, 1.35, 0.11, 2.16); // terracotta duvet
  geometry.box('paint', '#ffffff', -324.3, floorY + 0.64, -20.75, 0.48, 0.14, 0.72); // pillow 1
  geometry.box('paint', '#ffffff', -324.3, floorY + 0.64, -19.65, 0.48, 0.14, 0.72); // pillow 2

  // Twin nightstands with glowing bedside lamps
  for (const nz of [-22.0, -18.4]) {
    solid(geometry, colliders, 'trim', '#785438', -324.3, floorY + 0.32, nz, 0.62, 0.52, 0.62);
    geometry.box('trim', '#c29b55', -324.3, floorY + 0.68, nz, 0.1, 0.22, 0.1);
    geometry.box('goldLight', '#ffdf9a', -324.3, floorY + 0.88, nz, 0.28, 0.24, 0.28);
  }

  // Walk-in open wardrobe along north wall (z = -25.1, x in [-324.2, -319.6])
  solid(geometry, colliders, 'trim', '#6e4d34', -321.8, floorY + 1.25, -25.25, 4.4, 2.35, 0.72);
  geometry.box('paint', '#3a6a7d', -323.1, floorY + 1.45, -25.05, 0.75, 0.95, 0.35);
  geometry.box('paint', '#d8a868', -322.1, floorY + 1.45, -25.05, 0.65, 0.95, 0.35);
  geometry.box('paint', '#c86862', -321.1, floorY + 1.45, -25.05, 0.7, 0.95, 0.35);
  geometry.box('paint', '#ece7de', -320.2, floorY + 1.1, -25.05, 0.75, 0.35, 0.4);

  // Vanity desk + chair + full-height mirror
  solid(geometry, colliders, 'trim', '#865e40', -318.0, floorY + 0.74, -25.15, 1.85, 0.08, 0.68);
  geometry.box('trim', '#3a3f46', -318.8, floorY + 0.38, -25.15, 0.08, 0.68, 0.56);
  geometry.box('trim', '#3a3f46', -317.2, floorY + 0.38, -25.15, 0.08, 0.68, 0.56);
  geometry.box('glass', '#a8d0e4', -318.0, floorY + 1.45, -25.48, 1.35, 1.15, 0.06);
  addDiningChair(geometry, -318.0, floorY + 0.08, -24.3, 'south');
  addIndoorPlant(geometry, -324.6, floorY + 0.12, -15.4);

  // =========================================================================
  // === 7. ROOM 4: LUXURY EN-SUITE BATHROOM (x in [-325.6, -315.4], z in [-13.6, -6.4]) ===
  // =========================================================================
  // Double vanity with marble top & backlit LED mirror (along north bathroom wall z = -13.4)
  solid(geometry, colliders, 'trim', '#7d5a3f', -321.6, floorY + 0.45, -13.3, 2.8, 0.84, 0.65);
  geometry.box('trim', '#f7f4ee', -321.6, floorY + 0.89, -13.3, 2.86, 0.06, 0.7);
  geometry.box('paint', '#ffffff', -322.3, floorY + 0.96, -13.3, 0.62, 0.12, 0.42);
  geometry.box('paint', '#ffffff', -320.9, floorY + 0.96, -13.3, 0.62, 0.12, 0.42);
  geometry.box('glass', '#b0d8ec', -321.6, floorY + 1.65, -13.68, 2.4, 1.05, 0.06);
  geometry.box('aquaLight', '#bdeeff', -321.6, floorY + 2.22, -13.66, 2.45, 0.07, 0.07);

  // Freestanding modern white soaking tub (West corner)
  solid(geometry, colliders, 'trim', '#f8f6f2', -324.0, floorY + 0.36, -8.2, 1.25, 0.64, 2.25);
  geometry.box('aquaLight', '#6be0da', -324.0, floorY + 0.64, -8.2, 0.96, 0.08, 1.92);

  // Walk-in glass rain shower (South-east corner of bathroom)
  geometry.box('pavement', '#5a6068', -318.2, floorY + 0.13, -7.6, 2.2, 0.06, 1.8);
  geometry.box('glass', '#9bc6dc', -319.3, floorY + 1.18, -7.6, 0.06, 2.15, 1.8);
  geometry.box('trim', '#c2cad2', -318.2, floorY + 2.25, -6.75, 0.32, 0.06, 0.32);

  // =========================================================================
  // === 8. PANORAMIC TERRACE & INFINITY POOL OVERLOOKING COSTA PALMERA (x in [-304, -283]) ===
  // =========================================================================
  // Warm teakwood terrace deck extending to the cliff edge (x = -284)
  geometry.box('pavement', '#a4754d', -294, floorY + 0.05, cz, 20.4, 0.1, d + 2.4);
  // Infinity pool along the panoramic cliff edge (x = -289.2, z in [-20, -8.5])
  geometry.box('trim', '#efe8da', -289.2, floorY + 0.13, -14.2, 5.4, 0.14, 12.2);
  geometry.box('aquaLight', '#3ce8db', -289.2, floorY + 0.17, -14.2, 4.7, 0.1, 11.4);

  // Sleek low-profile transparent glass cliffside railing (height 1.05m) for unobstructed city view
  solid(geometry, colliders, 'glass', '#8cc0d8', -283.9, floorY + 0.56, cz, 0.12, 1.05, d + 2.4);
  geometry.box('trim', '#353b44', -283.9, floorY + 1.09, cz, 0.14, 0.08, d + 2.4);
  solid(geometry, colliders, 'glass', '#8cc0d8', -294, floorY + 0.56, maxZ + 1.15, 20.4, 1.05, 0.12);
  geometry.box('trim', '#353b44', -294, floorY + 1.09, maxZ + 1.15, 20.4, 0.08, 0.14);

  // 3 poolside sun loungers + 2 cream beach umbrellas
  addLounger(geometry, -295.4, floorY + 0.08, -10.4);
  addLounger(geometry, -295.4, floorY + 0.08, -13.2);
  addLounger(geometry, -295.4, floorY + 0.08, -16.0);
  for (const uz of [-11.8, -14.6]) {
    geometry.box('trim', '#6b4d35', -296.8, floorY + 1.25, uz, 0.08, 2.35, 0.08);
    geometry.box('paint', '#f4ecdc', -296.8, floorY + 2.38, uz, 2.15, 0.14, 2.15);
  }

  // Outdoor sunset lounge corner + glowing stone fire pit (x = -298.5, z = -22.5)
  solid(geometry, colliders, 'trim', '#525861', -296.5, floorY + 0.34, -22.5, 1.45, 0.52, 1.45);
  geometry.box('goldLight', '#ffbe55', -296.5, floorY + 0.66, -22.5, 0.72, 0.24, 0.72);
  solid(geometry, colliders, 'trim', '#7c593e', -299.2, floorY + 0.28, -22.5, 0.95, 0.44, 2.6);
  geometry.box('paint', '#efe7d8', -299.1, floorY + 0.52, -22.5, 0.82, 0.1, 2.45);
  solid(geometry, colliders, 'trim', '#7c593e', -296.5, floorY + 0.28, -25.1, 2.6, 0.44, 0.95);
  geometry.box('paint', '#efe7d8', -296.5, floorY + 0.52, -25.0, 2.45, 0.1, 0.82);
}
