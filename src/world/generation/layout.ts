export interface MapRectangle {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export type LandmarkKind = 'landmark' | 'shop' | 'transit' | 'prison' | 'police_hq' | 'casino' | 'restaurant' | 'house';

export interface LandmarkPin {
  x: number;
  z: number;
  name: string;
  kind?: LandmarkKind;
}

export interface DistrictMap {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  roads: MapRectangle[];
  water: MapRectangle;
  islands?: MapRectangle[];
  bridges?: MapRectangle[];
  mountains?: MapRectangle[];
  landmarks: LandmarkPin[];
}

export interface Street {
  center: number;
  width: number;
}

export const districtBounds = { minX: -68, maxX: 68, minZ: -94, maxZ: 94 };
export const worldBounds = { minX: -560, maxX: 540, minZ: -560, maxZ: 540 };
export const shoreline = 62;
export const inlandEdge = 47;

export const avenues: Street[] = [
  { center: -45, width: 9 },
  { center: -22, width: 8 },
  { center: 0, width: 12 },
  { center: 28, width: 10 },
  { center: 47, width: 8 },
];

export const crossStreets: Street[] = [
  { center: -63, width: 9 },
  { center: -28, width: 9 },
  { center: 7, width: 10 },
  { center: 45, width: 10 },
  { center: 77, width: 8 },
];

export function blockSpans(streets: Street[], min: number, max: number): [number, number][] {
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

export function roadRectangles(): MapRectangle[] {
  const { minX, minZ, maxZ } = districtBounds;
  const east = inlandEdge + 4;
  return [
    ...avenues.map(({ center, width }) => ({
      x: center,
      z: (minZ + maxZ) / 2,
      width,
      depth: maxZ - minZ,
    })),
    ...crossStreets.map(({ center, width }) => ({
      x: (minX + east) / 2,
      z: center,
      width: east - minX,
      depth: width,
    })),
  ];
}
