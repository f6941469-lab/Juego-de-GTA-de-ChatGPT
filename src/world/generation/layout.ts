export interface MapRectangle {
  x: number;
  z: number;
  width: number;
  depth: number;
  color?: string;
}

export interface DistrictZone {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  color: string;
}

export interface StoreSpec {
  id: string;
  name: string;
  district: string;
  x: number;
  z: number;
  doorX: number;
  doorZ: number;
  facing: 'west' | 'east' | 'north' | 'south';
  loot: number;
  sign: string;
}

export interface DistrictMap {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  roads: MapRectangle[];
  water: MapRectangle;
  landmarks: { x: number; z: number; name: string }[];
  landmasses?: MapRectangle[];
  bridges?: MapRectangle[];
  districts?: DistrictZone[];
  stores?: StoreSpec[];
}

export interface Street {
  center: number;
  width: number;
}

export interface BridgeSpec {
  name: string;
  z: number;
  width: number;
  spans: readonly [number, number][];
}

export const districtBounds = { minX: -480, maxX: 76, minZ: -216, maxZ: 216 };
export const shoreline = 62;
export const inlandEdge = 47;

export const eastLandBounds = { minX: -183, maxX: shoreline, minZ: -208, maxZ: 208 };
export const westLandBounds = { minX: -474, maxX: -267, minZ: -208, maxZ: 208 };
export const centralIslandBounds = { minX: -249, maxX: -201, minZ: -44, maxZ: 48 };

export const avenues: Street[] = [
  { center: -162, width: 10 },
  { center: -126, width: 11 },
  { center: -89, width: 9 },
  { center: -45, width: 9 },
  { center: -22, width: 8 },
  { center: 0, width: 12 },
  { center: 28, width: 10 },
  { center: 47, width: 8 },
];

export const westAvenues: Street[] = [
  { center: -454, width: 10 },
  { center: -410, width: 10 },
  { center: -366, width: 12 },
  { center: -322, width: 10 },
  { center: -282, width: 10 },
];

export const centralAvenue: Street = { center: -225, width: 8 };
export const centralCrossStreets: Street[] = [
  { center: -28, width: 8 },
  { center: 7, width: 10 },
  { center: 38, width: 8 },
];

export const crossStreets: Street[] = [
  { center: -188, width: 9 },
  { center: -145, width: 10 },
  { center: -104, width: 10 },
  { center: -63, width: 9 },
  { center: -28, width: 9 },
  { center: 7, width: 10 },
  { center: 45, width: 10 },
  { center: 77, width: 8 },
  { center: 112, width: 10 },
  { center: 150, width: 11 },
  { center: 187, width: 9 },
];

export const bridges: BridgeSpec[] = [
  { name: 'Puente Norte', z: -104, width: 10, spans: [[-267, -183]] },
  { name: 'Calzada Central', z: 7, width: 10, spans: [[-267, -249], [-201, -183]] },
  { name: 'Puente Sur', z: 150, width: 11, spans: [[-267, -183]] },
];

export const districtZones: DistrictZone[] = [
  { id: 'punta-palmera', name: 'Punta Palmera', minX: -183, maxX: 62, minZ: -208, maxZ: -45, color: '#3b3c49' },
  { id: 'costa-palmera', name: 'Costa Palmera', minX: -183, maxX: 62, minZ: -45, maxZ: 208, color: '#353744' },
  { id: 'isla-estrella', name: 'Isla Estrella', minX: -249, maxX: -201, minZ: -44, maxZ: 48, color: '#39463e' },
  { id: 'centro-financiero', name: 'Centro Financiero', minX: -474, maxX: -267, minZ: -208, maxZ: -45, color: '#333646' },
  { id: 'pequena-palmera', name: 'Pequeña Palmera', minX: -474, maxX: -267, minZ: -45, maxZ: 95, color: '#3d3942' },
  { id: 'puerto-muelles', name: 'Puerto y Muelles', minX: -474, maxX: -267, minZ: 95, maxZ: 208, color: '#343b3f' },
];

export const storeSpecs: StoreSpec[] = [
  {
    id: 'joyeria-coral',
    name: 'Joyería Coral',
    district: 'Costa Palmera',
    x: -12.1,
    z: -16.2,
    doorX: -6.9,
    doorZ: -16.2,
    facing: 'east',
    loot: 2400,
    sign: 'JOYERIA',
  },
  {
    id: 'licoreria-brisa',
    name: 'Licorería Brisa',
    district: 'Costa Palmera',
    x: 38,
    z: 123.4,
    doorX: 42.1,
    doorZ: 123.4,
    facing: 'east',
    loot: 850,
    sign: 'BRISA',
  },
  {
    id: 'mercado-marea',
    name: 'Mercado de Marea',
    district: 'Punta Palmera',
    x: -107,
    z: -17.4,
    doorX: -107,
    doorZ: -11.9,
    facing: 'south',
    loot: 1250,
    sign: 'MERCADO',
  },
  {
    id: 'taller-costa',
    name: 'Taller Costa',
    district: 'Punta Palmera',
    x: -143,
    z: -132.0,
    doorX: -132.0,
    doorZ: -132.0,
    facing: 'east',
    loot: 950,
    sign: 'TALLER COSTA',
  },
  {
    id: 'cafe-estrella',
    name: 'Cafetería Estrella',
    district: 'Isla Estrella',
    x: -239,
    z: -11,
    doorX: -230.6,
    doorZ: -11,
    facing: 'east',
    loot: 1450,
    sign: 'CAFE',
  },
  {
    id: 'relojeria-alba',
    name: 'Relojería del Centro',
    district: 'Centro Financiero',
    x: -343.5,
    z: -124.5,
    doorX: -357.1,
    doorZ: -124.5,
    facing: 'west',
    loot: 3200,
    sign: 'RELOJ',
  },
  {
    id: 'bodega-palmera',
    name: 'Bodega Palmera',
    district: 'Pequeña Palmera',
    x: -343.5,
    z: 26,
    doorX: -356.6,
    doorZ: 26,
    facing: 'west',
    loot: 700,
    sign: 'BODEGA',
  },
  {
    id: 'farmacia-palmera',
    name: 'Farmacia Sol',
    district: 'Pequeña Palmera',
    x: -432,
    z: -10.75,
    doorX: -418.8,
    doorZ: -10.75,
    facing: 'east',
    loot: 1100,
    sign: 'FARMACIA',
  },
  {
    id: 'bazar-puerto',
    name: 'Bazar del Puerto',
    district: 'Puerto y Muelles',
    x: -302,
    z: 169,
    doorX: -290.2,
    doorZ: 169,
    facing: 'east',
    loot: 1350,
    sign: 'BAZAR',
  },
];

export function getDistrictAt(x: number, z: number): string {
  for (const bridge of bridges) {
    if (Math.abs(z - bridge.z) <= bridge.width / 2 + 1.5) {
      for (const [start, end] of bridge.spans) {
        if (x >= start && x <= end) return bridge.name;
      }
    }
  }
  for (const zone of districtZones) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
      return zone.name;
    }
  }
  if (x > shoreline) return 'Bahía Palmera';
  return 'Bahía Central';
}

export function blockSpans(streets: readonly Street[], min: number, max: number): [number, number][] {
  const starts = [min, ...streets.map(({ center, width }) => center + width / 2)];
  const ends = [...streets.map(({ center, width }) => center - width / 2), max];
  return starts.flatMap((start, index) => {
    const end = ends[index];
    return end - start > 1 ? [[start, end]] : [];
  });
}

export function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function landmassRectangles(): MapRectangle[] {
  return [
    ...districtZones.map((zone) => ({
      x: (zone.minX + zone.maxX) / 2,
      z: (zone.minZ + zone.maxZ) / 2,
      width: zone.maxX - zone.minX,
      depth: zone.maxZ - zone.minZ,
      color: zone.color,
    })),
  ];
}

export function bridgeRectangles(): MapRectangle[] {
  return bridges.flatMap((bridge) =>
    bridge.spans.map(([start, end]) => ({
      x: (start + end) / 2,
      z: bridge.z,
      width: end - start,
      depth: bridge.width,
    })),
  );
}

export function roadRectangles(): MapRectangle[] {
  const east = inlandEdge + 4;
  const bridgeZ = new Set(bridges.map((bridge) => bridge.z));
  const eastDepth = eastLandBounds.maxZ - eastLandBounds.minZ;
  const westDepth = westLandBounds.maxZ - westLandBounds.minZ;
  const eastCenterZ = (eastLandBounds.minZ + eastLandBounds.maxZ) / 2;
  const westCenterZ = (westLandBounds.minZ + westLandBounds.maxZ) / 2;

  const roads: MapRectangle[] = [
    ...avenues.map(({ center, width }) => ({
      x: center,
      z: eastCenterZ,
      width,
      depth: eastDepth,
    })),
    ...westAvenues.map(({ center, width }) => ({
      x: center,
      z: westCenterZ,
      width,
      depth: westDepth,
    })),
    {
      x: centralAvenue.center,
      z: (centralIslandBounds.minZ + centralIslandBounds.maxZ) / 2,
      width: centralAvenue.width,
      depth: centralIslandBounds.maxZ - centralIslandBounds.minZ - 4,
    },
  ];

  for (const { center, width } of crossStreets) {
    if (bridgeZ.has(center)) {
      roads.push({
        x: (westLandBounds.minX + east) / 2,
        z: center,
        width: east - westLandBounds.minX,
        depth: width,
      });
    } else {
      roads.push({
        x: (eastLandBounds.minX + east) / 2,
        z: center,
        width: east - eastLandBounds.minX,
        depth: width,
      });
      roads.push({
        x: (westLandBounds.minX + westLandBounds.maxX) / 2,
        z: center,
        width: westLandBounds.maxX - westLandBounds.minX,
        depth: width,
      });
    }
  }

  for (const { center, width } of centralCrossStreets) {
    if (bridgeZ.has(center)) continue;
    roads.push({
      x: (centralIslandBounds.minX + centralIslandBounds.maxX) / 2,
      z: center,
      width: centralIslandBounds.maxX - centralIslandBounds.minX - 4,
      depth: width,
    });
  }

  return roads;
}
