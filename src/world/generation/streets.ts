import { CylinderGeometry } from 'three';
import type { RegisterSectorFeature } from '../streaming';
import type { DistrictGeometry } from './geometry';
import {
  avenues,
  blockSpans,
  bridges,
  centralAvenue,
  centralCrossStreets,
  centralIslandBounds,
  crossStreets,
  eastLandBounds,
  inlandEdge,
  type Street,
  westAvenues,
  westLandBounds,
} from './layout';

const white = '#d9d2bb';
const gold = '#d2a657';
const markingY = 0.006;
const sidewalk = '#c6b8a0';
const pole = new CylinderGeometry(0.5, 0.5, 1, 8);

function addLandmassStreets(
  geometry: DistrictGeometry,
  register: RegisterSectorFeature,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  landAvenues: readonly Street[],
  landCrossStreets: readonly Street[],
  easternEdgeLimit?: number,
): void {
  const xRuns = blockSpans(landAvenues, minX, maxX);
  const zRuns = blockSpans(landCrossStreets, minZ, maxZ);
  const depth = maxZ - minZ;
  const centerZ = (minZ + maxZ) / 2;

  for (const { center, width } of landAvenues) {
    geometry.box('asphalt', '#424a53', center, -0.031, centerZ, width, 0.058, depth);
    for (const [start, end] of zRuns) {
      register(center, (start + end) / 2, (sector) => addLaneMarkings(true, center, width, start, end, sector));
    }
  }
  for (const { center, width } of landCrossStreets) {
    for (const [start, end] of xRuns) {
      geometry.box('asphalt', '#48505a', (start + end) / 2, -0.032, center, end - start, 0.058, width);
      register((start + end) / 2, center, (sector) => addLaneMarkings(false, center, width, start, end, sector));
    }
  }
  for (const [left, right] of xRuns) {
    for (const [near, far] of zRuns) {
      const x = (left + right) / 2;
      const z = (near + far) / 2;
      geometry.box('pavement', sidewalk, x, 0.006, z, right - left, 0.086, far - near);
      register(x, z, (sector, detailed) => {
        if (detailed) addCurbs(sector, left, right, near, far);
      });
    }
  }
  for (const avenue of landAvenues) {
    for (const crossStreet of landCrossStreets) {
      const x = avenue.center;
      const z = crossStreet.center;
      register(x, z, (sector) => {
        if (z + crossStreet.width / 2 + 2 < maxZ) {
          addZebra(true, sector, x, avenue.width, z + crossStreet.width / 2 + 1.15);
        }
        if (z - crossStreet.width / 2 - 2 > minZ) {
          addZebra(true, sector, x, avenue.width, z - crossStreet.width / 2 - 1.15);
        }
        if (easternEdgeLimit === undefined || x < easternEdgeLimit) {
          if (x + avenue.width / 2 + 2 < maxX) {
            addZebra(false, sector, z, crossStreet.width, x + avenue.width / 2 + 1.15);
          }
        }
        if (x - avenue.width / 2 - 2 > minX) {
          addZebra(false, sector, z, crossStreet.width, x - avenue.width / 2 - 1.15);
        }
      });
    }
  }
}

export function addStreets(geometry: DistrictGeometry, register: RegisterSectorFeature): void {
  const eastRoadEdge = inlandEdge + 4;
  addLandmassStreets(
    geometry,
    register,
    eastLandBounds.minX,
    eastRoadEdge,
    eastLandBounds.minZ,
    eastLandBounds.maxZ,
    avenues,
    crossStreets,
    inlandEdge,
  );
  addLandmassStreets(
    geometry,
    register,
    westLandBounds.minX,
    westLandBounds.maxX,
    westLandBounds.minZ,
    westLandBounds.maxZ,
    westAvenues,
    crossStreets,
  );
  addLandmassStreets(
    geometry,
    register,
    centralIslandBounds.minX + 2,
    centralIslandBounds.maxX - 2,
    centralIslandBounds.minZ + 2,
    centralIslandBounds.maxZ - 2,
    [centralAvenue],
    centralCrossStreets,
  );
  addBridges(geometry, register);
}

function addBridges(geometry: DistrictGeometry, register: RegisterSectorFeature): void {
  for (const bridge of bridges) {
    for (const [start, end] of bridge.spans) {
      const length = end - start;
      const centerX = (start + end) / 2;
      geometry.box('asphalt', '#444d57', centerX, -0.032, bridge.z, length + 0.4, 0.064, bridge.width);
      geometry.box('trim', '#c4bcb0', centerX, -0.14, bridge.z, length + 0.5, 0.16, bridge.width + 1.1);
      for (const side of [-1, 1]) {
        const railZ = bridge.z + side * (bridge.width / 2 + 0.28);
        geometry.box('pavement', '#d7ceb9', centerX, 0.36, railZ, length + 0.4, 0.72, 0.42);
        geometry.box('trim', '#5d7382', centerX, 0.76, railZ, length + 0.4, 0.09, 0.34);
      }
      const pierStep = Math.max(16, length / Math.max(2, Math.round(length / 22)));
      for (let x = start + pierStep * 0.5; x < end - 3; x += pierStep) {
        const pierX = x;
        for (const side of [-1, 1]) {
          geometry.box('trim', '#9da3a8', pierX, -1.25, bridge.z + side * (bridge.width / 2 - 0.6), 1.35, 2.2, 1.35);
        }
        register(pierX, bridge.z, (sector, detailed) => {
          if (detailed) {
            addLamppost(sector, pierX, bridge.z - bridge.width / 2 - 0.28, 1);
            addLamppost(sector, pierX, bridge.z + bridge.width / 2 + 0.28, -1);
          }
        });
      }
      register(centerX, bridge.z, (sector) => {
        addLaneMarkings(false, bridge.z, bridge.width, start - 2, end + 2, sector);
      });
    }
  }
}

function addLaneMarkings(
  vertical: boolean,
  center: number,
  width: number,
  start: number,
  end: number,
  geometry: DistrictGeometry,
): void {
  const inset = 3.25;
  const run = end - start - inset * 2;
  if (run <= 1) return;
  const paint = (offset: number, along: number, across: number, length: number, color: string) => {
    if (vertical) geometry.box('paint', color, center + offset, markingY, along, across, 0.013, length);
    else geometry.box('paint', color, along, markingY, center + offset, length, 0.013, across);
  };
  for (const side of [-1, 1]) {
    paint(side * (width / 2 - 0.76), (start + end) / 2, 0.085, run, white);
    if (width >= 11) {
      paint(side * (width / 2 - 2.45), (start + end) / 2, 0.065, run, '#9dada9');
    }
  }
  const count = Math.max(1, Math.floor(run / 4.9));
  for (let i = 0; i < count; i += 1) {
    const along = start + inset + (i + 0.5) * run / count;
    const length = Math.min(run * 0.63, 2.28);
    paint(0.12, along, 0.092, length, gold);
    if (width >= 11) paint(-0.120, along, 0.092, length, gold);
  }
}

function addZebra(
  vertical: boolean,
  geometry: DistrictGeometry,
  center: number,
  roadWidth: number,
  along: number,
): void {
  const span = roadWidth - 1.55;
  const count = Math.floor(span / 0.75);
  const pitch = span / count;
  for (let i = 0; i < count; i += 1) {
    const across = center + (i + 0.5 - count / 2) * pitch;
    const variables = { x: vertical ? across : along, z: vertical ? along : across };
    geometry.box('paint', white, variables.x, markingY, variables.z, vertical ? 0.43 : 1.55, 0.013, vertical ? 1.55 : 0.43);
  }
}

function addCurbs(
  geometry: DistrictGeometry,
  left: number,
  right: number,
  near: number,
  far: number,
): void {
  const x = (left + right) / 2;
  const z = (near + far) / 2;
  const width = right - left;
  const depth = far - near;
  // The inset curb frames each city block and breaks up the wide curb cuts.
  for (const xEdge of [left + 0.14, right - 0.14]) {
    geometry.box('pavement', '#ddd0b5', xEdge, 0.040, z, 0.25, 0.065, depth - 0.44);
    for (let seam = near + 1.6; seam < far - 0.7; seam += 1.55) {
      geometry.box('paint', '#a9a79b', xEdge + (xEdge < x ? 0.83 : -0.83), 0.051, seam, 1.58, 0.005, 0.029);
    }
  }
  for (const zEdge of [near + 0.14, far - 0.14]) {
    geometry.box('pavement', '#ddd0b5', x, 0.040, zEdge, width - 0.44, 0.065, 0.25);
    for (let seam = left + 1.6; seam < right - 0.7; seam += 1.55) {
      geometry.box('paint', '#a9a79b', seam, 0.051, zEdge + (zEdge < z ? 0.83 : -0.83), 0.029, 0.005, 1.58);
    }
  }
}

export function addLamppost(geometry: DistrictGeometry, x: number, z: number, direction: number): void {
  const metal = '#526775';
  geometry.add(pole, 'trim', true, { x, y: 2.25, z, width: 0.12, height: 4.5, depth: 0.12, color: metal });
  geometry.box('trim', metal, x, 0.23, z, 0.26, 0.46, 0.26);
  geometry.box('trim', metal, x + direction * 0.45, 4.47, z, 0.98, 0.09, 0.1);
  geometry.box('trim', '#637986', x + direction * 0.96, 4.40, z, 0.45, 0.111, 0.21);
  geometry.box('goldLight', '#fcce94', x + direction * 0.96, 4.339, z, 0.38, 0.021, 0.17);
}

export function addBench(geometry: DistrictGeometry, x: number, z: number): void {
  for (const offset of [-0.68, 0.68]) {
    geometry.box('trim', '#566470', x + offset, 0.32, z, 0.10, 0.54, 0.48);
    geometry.box('trim', '#566470', x + offset, 0.62, z - 0.19, 0.075, 0.46, 0.09);
  }
  for (let slat = -1; slat <= 1; slat += 1) {
    geometry.box('wall', '#a56f51', x, 0.53, z + 0.14 * slat, 1.63, 0.064, 0.111, true);
    geometry.box('wall', '#c38157', x, 0.81 + 0.09 * slat, z - 0.213, 1.63, 0.063, 0.052);
  }
}
