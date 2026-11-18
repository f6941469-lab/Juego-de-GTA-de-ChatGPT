export interface MapRectangle {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface DistrictMap {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  roads: MapRectangle[];
  water: MapRectangle;
  landmarks: { x: number; z: number; name: string }[];
}

export interface Street {
  center: number;
  width: number;
}

export const districtBounds = { minX: -183, maxX: 76, minZ: -208, maxZ: 208 };
export const shoreline = 62;
export const inlandEdge = 47;

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
