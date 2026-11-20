import type { StaticBox } from '../../physics/physics';
import type { DistrictGeometry, Finish } from './geometry';

const palettes = [
  { wall: '#e7bd99', band: '#f7e6cf', accent: '#268f90', dark: '#4c6475', glow: 'aquaLight' },
  { wall: '#98c9c4', band: '#edf2d8', accent: '#398883', dark: '#31566f', glow: 'aquaLight' },
  { wall: '#de897d', band: '#f3bd9d', accent: '#a04c65', dark: '#4a455e', glow: 'coralLight' },
  { wall: '#b2a8c6', band: '#e9cfda', accent: '#855b88', dark: '#524368', glow: 'coralLight' },
  { wall: '#ced5ce', band: '#ede5cf', accent: '#647b91', dark: '#354c64', glow: 'goldLight' },
  { wall: '#d9a66e', band: '#f4d1a1', accent: '#5f8881', dark: '#516175', glow: 'goldLight' },
] as const;

export interface BuildingSpec {
  x: number;
  z: number;
  width: number;
  depth: number;
  floors: number;
  palette: number;
  style: 'ribbon' | 'deco' | 'tower' | 'porch';
  entrance: 'west' | 'east' | 'north' | 'south';
  sign?: string;
  interior?: boolean;
}

const storyHeight = 2.65;
const foundation = 0.07;
const interiorWallThickness = 0.36;
const interiorDoorHeight = 2.38;

function interiorFrame(spec: BuildingSpec) {
  const sideOnX = spec.entrance === 'west' || spec.entrance === 'east';
  const nx = spec.entrance === 'east' ? 1 : spec.entrance === 'west' ? -1 : 0;
  const nz = spec.entrance === 'south' ? 1 : spec.entrance === 'north' ? -1 : 0;
  const frontSpan = sideOnX ? spec.depth : spec.width;
  const depthSpan = sideOnX ? spec.width : spec.depth;
  const doorWidth = Math.min(2.6, Math.max(1.85, frontSpan * 0.36));
  const wingSpan = Math.max(0, (frontSpan - doorWidth) / 2);
  const ceilingY = foundation + storyHeight;
  const counterWidth = Math.max(1.6, Math.min(3.4, frontSpan - 2.4));

  const place = (
    cxForward: number,
    cy: number,
    cu: number,
    sizeForward: number,
    sizeY: number,
    sizeU: number,
  ): StaticBox => ({
    x: sideOnX ? spec.x + nx * cxForward : spec.x + cu,
    y: cy,
    z: sideOnX ? spec.z + cu : spec.z + nz * cxForward,
    halfX: (sideOnX ? sizeForward : sizeU) / 2,
    halfY: sizeY / 2,
    halfZ: (sideOnX ? sizeU : sizeForward) / 2,
  });

  return {
    sideOnX,
    nx,
    nz,
    frontSpan,
    depthSpan,
    doorWidth,
    wingSpan,
    ceilingY,
    counterWidth,
    place,
  };
}

export function buildingCollider(spec: BuildingSpec): StaticBox {
  const { x, z, width, depth, floors } = spec;
  const halfY = (floors * storyHeight + foundation) / 2;
  return { x, y: halfY, z, halfX: width / 2, halfY, halfZ: depth / 2 };
}

export function buildingColliders(spec: BuildingSpec): StaticBox[] {
  if (!spec.interior) return [buildingCollider(spec)];

  const {
    frontSpan,
    depthSpan,
    doorWidth,
    wingSpan,
    ceilingY,
    counterWidth,
    place,
  } = interiorFrame(spec);
  const t = interiorWallThickness;
  const frontF = depthSpan / 2 - t / 2;
  const boxes: StaticBox[] = [];

  if (wingSpan > 0.05) {
    const wingCenter = doorWidth / 2 + wingSpan / 2;
    boxes.push(place(frontF, ceilingY / 2, -wingCenter, t, ceilingY, wingSpan));
    boxes.push(place(frontF, ceilingY / 2, wingCenter, t, ceilingY, wingSpan));
  }
  boxes.push(
    place(frontF, (interiorDoorHeight + ceilingY) / 2, 0, t, ceilingY - interiorDoorHeight, doorWidth),
  );
  boxes.push(place(-frontF, ceilingY / 2, 0, t, ceilingY, frontSpan));

  const sideLength = Math.max(0.4, depthSpan - 2 * t);
  const sideU = frontSpan / 2 - t / 2;
  boxes.push(place(0, ceilingY / 2, -sideU, sideLength, ceilingY, t));
  boxes.push(place(0, ceilingY / 2, sideU, sideLength, ceilingY, t));

  const roof = spec.floors * storyHeight + foundation;
  const upperEnd = Math.max(ceilingY + 0.28, roof);
  boxes.push(place(0, (ceilingY + upperEnd) / 2, 0, depthSpan, upperEnd - ceilingY, frontSpan));

  // Physical service counter inside the shop
  boxes.push(place(-depthSpan * 0.16, 0.52, 0, 0.85, 1.04, counterWidth));
  return boxes;
}

export function addBuilding(
  geometry: DistrictGeometry,
  spec: BuildingSpec,
  random: () => number,
  detailed: boolean,
): void {
  const { x, z, width, depth, floors, style } = spec;
  const { wall, band, accent, dark, glow } = palettes[spec.palette % palettes.length];
  const height = floors * storyHeight;
  const roof = height + foundation;

  if (!detailed) {
    geometry.box('wall', wall, x, height / 2 + foundation, z, width, height, depth, false);
    geometry.box('trim', band, x, roof - 0.07, z, width + 0.36, 0.28, depth + 0.36);
    if (style === 'tower' || style === 'deco') {
      const crown = style === 'tower' ? 2.9 : 0.85;
      geometry.box('wall', accent, x, roof + crown / 2 + 0.28, z, width * 0.74, crown, depth * 0.74);
    }
    return;
  }

  if (spec.interior) {
    const {
      sideOnX,
      frontSpan,
      depthSpan,
      doorWidth,
      wingSpan,
      ceilingY,
      counterWidth,
      place,
    } = interiorFrame(spec);
    const t = interiorWallThickness;
    const frontF = depthSpan / 2 - t / 2;
    const emit = (finish: Finish, color: string, box: StaticBox, castShadow = false) => {
      geometry.box(finish, color, box.x, box.y, box.z, box.halfX * 2, box.halfY * 2, box.halfZ * 2, castShadow);
    };

    // Floor tile & ceiling slab
    emit('pavement', '#d7cbb5', place(0, 0.03, 0, depthSpan - 0.12, 0.06, frontSpan - 0.12));
    emit('trim', '#f2eadc', place(0, ceilingY - 0.05, 0, depthSpan - 0.12, 0.10, frontSpan - 0.12));
    emit(glow, '#fff2cf', place(0, ceilingY - 0.12, 0, Math.min(2.4, depthSpan * 0.35), 0.04, Math.min(2.4, frontSpan * 0.35)));

    // Ground floor hollow walls
    if (wingSpan > 0.05) {
      const wingCenter = doorWidth / 2 + wingSpan / 2;
      emit('wall', wall, place(frontF, ceilingY / 2, -wingCenter, t, ceilingY, wingSpan), true);
      emit('wall', wall, place(frontF, ceilingY / 2, wingCenter, t, ceilingY, wingSpan), true);
      if (wingSpan > 1.0) {
        const glassW = wingSpan * 0.68;
        emit('trim', '#25313c', place(frontF + 0.03, 1.32, -wingCenter, t * 0.4, 1.35, glassW));
        emit('trim', '#25313c', place(frontF + 0.03, 1.32, wingCenter, t * 0.4, 1.35, glassW));
        emit('trim', dark, place(frontF + 0.08, 0.59, -wingCenter, t * 0.65, 0.11, glassW + 0.12));
        emit('trim', dark, place(frontF + 0.08, 0.59, wingCenter, t * 0.65, 0.11, glassW + 0.12));
        emit('trim', dark, place(frontF + 0.08, 2.04, -wingCenter, t * 0.65, 0.09, glassW + 0.12));
        emit('trim', dark, place(frontF + 0.08, 2.04, wingCenter, t * 0.65, 0.09, glassW + 0.12));
      }
    }
    emit('wall', wall, place(frontF, (interiorDoorHeight + ceilingY) / 2, 0, t, ceilingY - interiorDoorHeight, doorWidth), true);
    emit(glow, band, place(frontF + 0.12, interiorDoorHeight + 0.06, 0, 0.08, 0.09, doorWidth + 0.2));
    emit('wall', wall, place(-frontF, ceilingY / 2, 0, t, ceilingY, frontSpan), true);
    const sideLength = Math.max(0.4, depthSpan - 2 * t);
    const sideU = frontSpan / 2 - t / 2;
    emit('wall', wall, place(0, ceilingY / 2, -sideU, sideLength, ceilingY, t), true);
    emit('wall', wall, place(0, ceilingY / 2, sideU, sideLength, ceilingY, t), true);

    // Counter, cash register & back display shelves
    emit('trim', dark, place(-depthSpan * 0.16, 0.48, 0, 0.82, 0.96, counterWidth), true);
    emit('trim', band, place(-depthSpan * 0.16, 0.99, 0, 0.92, 0.08, counterWidth + 0.08));
    emit('goldLight', '#ffe29c', place(-depthSpan * 0.16 + 0.08, 1.15, counterWidth * 0.22, 0.34, 0.24, 0.38));
    emit('trim', accent, place(-depthSpan / 2 + t + 0.28, 1.15, 0, 0.48, 2.1, Math.min(frontSpan - 1.4, 4.2)));
    const shelfGoods = sideOnX ? Math.min(2.2, depthSpan * 0.32) : Math.min(2.2, frontSpan * 0.32);
    emit('trim', band, place(-depthSpan * 0.12, 1.05, -sideU + t + 0.22, shelfGoods, 1.9, 0.36));

    // Solid volume for upper floors (story >= 1)
    if (floors > 1) {
      const upperHeight = roof - ceilingY;
      geometry.box('wall', wall, x, ceilingY + upperHeight / 2, z, width, upperHeight, depth, true);
    }
  } else {
    geometry.box('wall', wall, x, height / 2 + foundation, z, width, height, depth, true);
    geometry.box('wall', band, x, 0.22, z, width + 0.11, 0.40, depth + 0.11);
  }

  geometry.box('trim', band, x, roof - 0.07, z, width + 0.36, 0.28, depth + 0.36, true);
  geometry.box('trim', accent, x, roof + 0.19, z, width + 0.08, 0.28, depth + 0.08);

  for (const side of ['west', 'east', 'north', 'south'] as const) {
    decorateFacade(geometry, spec, side, random);
  }

  if (style === 'tower' || style === 'deco') {
    const crown = style === 'tower' ? 2.9 : 0.85;
    geometry.box('wall', wall, x, roof + crown / 2 + 0.28, z, width * 0.74, crown, depth * 0.74, true);
    geometry.box('trim', band, x, roof + crown + 0.31, z, width * 0.77, 0.24, depth * 0.77, true);
    geometry.box('wall', accent, x, roof + crown + 0.54, z, width * 0.59, 0.3, depth * 0.62, true);
    if (style === 'tower') {
      geometry.box('trim', '#536477', x, roof + crown + 2.2, z, 0.12, 3.5, 0.12);
      geometry.box('coralLight', '#fa6c91', x, roof + crown + 4, z, 0.25, 0.23, 0.25);
    }
  } else {
    geometry.box('trim', '#809496', x + width * 0.23, roof + 0.62, z + depth * 0.26, 1.7, 1.04, 0.95, true);
    geometry.box('trim', '#c6cabc', x + width * 0.23, roof + 1.18, z + depth * 0.26, 1.77, 0.1, 1.02);
  }
}

function decorateFacade(
  geometry: DistrictGeometry,
  spec: BuildingSpec,
  side: BuildingSpec['entrance'],
  random: () => number,
): void {
  const sideOnX = side === 'west' || side === 'east';
  const direction = side === 'west' || side === 'north' ? -1 : 1;
  const span = sideOnX ? spec.depth : spec.width;
  const face = sideOnX ? spec.width / 2 : spec.depth / 2;
  const publicFace = side === spec.entrance;
  // Reverse the sign coordinate on the north and east façades so it reads
  // left to right from the street, regardless of the extrusion axis.
  const right = side === 'east' || side === 'north' ? -1 : 1;
  const { band, accent, dark, glow } = palettes[spec.palette % palettes.length];

  function mount(finish: Finish, color: string, u: number, y: number, width: number, height: number, relief: number, gap = 0): void {
    const offset = direction * (face + gap + relief / 2 - 0.01);
    if (sideOnX) geometry.box(finish, color, spec.x + offset, y, spec.z + u * right, relief, height, width);
    else geometry.box(finish, color, spec.x + u * right, y, spec.z + offset, width, height, relief);
  }

  const bays = Math.max(2, Math.floor((span - 1) / (spec.style === 'tower' ? 1.50 : 2)));
  const pitch = (span - 0.68) / bays;
  const windowWidth = spec.style === 'ribbon' ? pitch * 0.84 : pitch * 0.67;

  const startStory = spec.interior ? 1 : 0;
  for (let story = startStory; story < spec.floors; story += 1) {
    const lowerEdge = foundation + story * storyHeight;
    const centerY = lowerEdge + (story === 0 ? 1.29 : 1.48);
    const windowHeight = story === 0 ? 1.46 : (spec.style === 'tower' ? 1.36 : 1.13);
    if (story > 0) {
      const stripe = spec.style === 'tower' || spec.style === 'porch' ? 0.11 : 0.22;
      mount('trim', band, 0, lowerEdge + 0.31, span + 0.11, stripe, 0.22);
      if (spec.style === 'ribbon') mount('trim', accent, 0, lowerEdge + 0.45, span + 0.13, 0.077, 0.18);
    }
    for (let bay = 0; bay < bays; bay += 1) {
      const u = (bay + 0.5 - bays / 2) * pitch;
      const isEntry = publicFace && story === 0 && bay === Math.floor((bays - 1) / 2);
      const localHeight = isEntry ? 1.87 : windowHeight;
      const y = isEntry ? 1.05 : centerY;
      mount('trim', dark, u, y, windowWidth + 0.16, localHeight + 0.17, 0.075);
      const interior = random() < (publicFace ? 0.32 : 0.20);
      mount(
        interior ? 'glassLit' : 'glass',
        interior ? '#b27860' : (random() > 0.5 ? '#305d6e' : '#477780'),
        u, y, windowWidth, localHeight, 0.085, 0.045,
      );
      mount('trim', accent, u, y, 0.056, localHeight, 0.055, 0.10);
      mount('trim', band, u, y - localHeight / 2 - 0.03, windowWidth + 0.2, 0.11, 0.24);
      if (story === 0) {
        mount('trim', accent, u, y + localHeight * 0.28, windowWidth, 0.05, 0.06, 0.09);
      }
    }
  }

  if (spec.style === 'deco' || spec.style === 'tower') {
    const fullHeight = spec.floors * storyHeight;
    for (const u of [-span / 2 + 0.23, span / 2 - 0.23]) {
      mount('trim', band, u, fullHeight / 2 + 0.16, 0.29, fullHeight + 0.15, 0.24);
      mount('trim', accent, u, fullHeight / 2 + 0.45, 0.10, fullHeight + 0.16, 0.33);
    }
    if (publicFace && spec.style === 'deco') {
      const top = fullHeight + 0.31;
      for (let bearing = -2; bearing <= 2; bearing += 1) {
        const height = 1.7 - Math.abs(bearing) * 0.32;
        mount('trim', band, bearing * 0.32, top + 0.37 - height / 2, 0.20, height, 0.28);
      }
    }
  }

  if (!publicFace) return;

  const awningWidth = Math.min(span * 0.86, spec.sign ? 8.8 : 5.3);
  mount('trim', band, 0, 2.66, awningWidth, 0.24, 0.93);
  mount('trim', accent, 0, 2.70, awningWidth + 0.04, 0.16, 0.1, 0.91);
  mount(glow, band, 0, 2.63, awningWidth - 0.2, 0.048, 0.079, 0.98);
  if (spec.sign) {
    const signY = 3.45;
    mount('trim', dark, 0, signY, awningWidth * 0.92, 0.82, 0.16);
    mount(glow, band, 0, signY - 0.36, awningWidth * 0.86, 0.025, 0.055, 0.152);
    drawWordmark(spec.sign, signY, Math.min(0.069, (awningWidth * 0.81) / (spec.sign.length * 6)), mount, glow);
  }
}

type SignMount = (finish: Finish, color: string, u: number, y: number, width: number, height: number, relief: number, gap: number) => void;

const glyphs: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 14],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [1, 1, 1, 1, 17, 17, 14],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
};

function drawWordmark(word: string, y: number, pixel: number, mount: SignMount, finish: Finish): void {
  for (const [index, letter] of Array.from(word).entries()) {
    const glyph = glyphs[letter];
    if (!glyph) continue;
    for (const [row, bits] of glyph.entries()) {
      for (let column = 0; column < 5; column += 1) {
        if ((bits & (1 << (4 - column))) === 0) continue;
        const u = (index * 6 + column - (word.length * 6 - 2) / 2) * pixel;
        mount(finish, '#ffe7bf', u, y + (3 - row) * pixel, pixel * 1.02, pixel * 1.02, 0.045, 0.163);
      }
    }
  }
}
