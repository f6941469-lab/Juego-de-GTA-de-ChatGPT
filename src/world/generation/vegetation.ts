import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  Float32BufferAttribute,
  Quaternion,
  Vector3,
} from 'three';
import type { DistrictGeometry } from './geometry';

const trunk = new CylinderGeometry(0.43, 0.5, 1, 7);
const crown = new DodecahedronGeometry(0.56, 0);
const leaf = makePalmFrond();
const up = new Vector3(0, 1, 0);

export function addPalm(geometry: DistrictGeometry, x: number, z: number, random: () => number, scale = 1): void {
  const height = (4.75 + random() * 2) * scale;
  const bearing = random() * Math.PI * 2;
  const lean = (0.26 + random() * 0.41) * scale;
  const point = (fraction: number) => new Vector3(
    x + Math.cos(bearing) * lean * fraction ** 2,
    0.075 + height * fraction,
    z + Math.sin(bearing) * lean * fraction ** 2,
  );

  for (let section = 0; section < 6; section += 1) {
    const start = point(section / 6);
    const end = point((section + 1) / 6);
    const axis = end.clone().sub(start);
    const center = start.addScaledVector(axis, 0.5);
    const size = (0.31 - section * 0.02) * scale;
    const rotation = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(up, axis.clone().normalize()));
    geometry.add(trunk, 'wall', true, {
      x: center.x, y: center.y, z: center.z, width: size, height: axis.length() + 0.01, depth: size,
      rotation, color: section % 2 === 0 ? '#8a7365' : '#a18b72',
    });
  }

  const top = point(1);
  geometry.add(crown, 'wall', false, {
    x: top.x, y: top.y - 0.13, z: top.z, width: 0.65 * scale, height: 0.9 * scale, depth: 0.63 * scale,
    color: '#586649',
  });
  for (let branch = 0; branch < 7; branch += 1) {
    const size = (1.37 + random() * 0.47) * scale;
    geometry.add(leaf, 'foliage', false, {
      x: top.x, y: top.y, z: top.z, width: size, height: size, depth: size,
      rotation: new Euler((random() - 0.4) * 0.38, bearing + branch * Math.PI * 2 / 7, (random() - 0.5) * 0.24, 'YXZ'),
      color: branch % 3 === 0 ? '#709a54' : '#43856a',
    });
  }
}

export function addPlanter(geometry: DistrictGeometry, x: number, z: number, random: () => number, size = 1): void {
  geometry.box('pavement', '#b7a893', x, 0.16, z, 2.16 * size, 0.22, 1.75 * size, true);
  geometry.box('pavement', '#74695e', x, 0.274, z, 1.92 * size, 0.019, 1.52 * size);
  for (let shrub = 0; shrub < 5; shrub += 1) {
    const radius = (0.34 + random() * 0.27) * size;
    const offsetX = (random() - 0.5) * 1.45 * size;
    const offsetZ = (random() - 0.5) * 1.19 * size;
    geometry.add(crown, 'wall', false, {
      x: x + offsetX, y: 0.27 + radius * 0.31, z: z + offsetZ,
      width: radius * 1.8, height: radius, depth: radius * 1.49,
      color: shrub % 4 === 0 ? '#bd5969' : (shrub % 2 === 0 ? '#629167' : '#468270'),
    });
  }
}

function makePalmFrond(): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const shades = ['#c8d8a8', '#d8e7b6', '#8ca78c', '#e5e4ae'].map((color) => new Color(color));

  function triangle(a: Vector3, b: Vector3, c: Vector3, shade: number): void {
    for (const point of [a, b, c]) {
      positions.push(point.x, point.y, point.z);
      const color = shades[shade];
      colors.push(color.r, color.g, color.b);
    }
  }

  const spine = (t: number) => new Vector3(0, Math.sin(t * Math.PI) * 0.35 - 0.26 * t * t, t * 1.8);
  for (let index = 0; index < 7; index += 1) {
    const t = (index + 0.15) / 7;
    const root = spine(t);
    const end = spine(Math.min(1, t + 1 / 7));
    const expansion = Math.sin(Math.PI * t ** 0.83);
    for (const side of [-1, 1]) {
      const tip = end.clone().add(new Vector3(side * (0.06 + expansion * 0.41), -0.09 - expansion * 0.1, 0.20));
      const vane = root.clone().lerp(tip, 0.46).add(new Vector3(side * 0.054, 0.036, -0.063));
      triangle(root, end, vane, (index + (side === 1 ? 0 : 1)) % 3);
      triangle(vane, end, tip, (index + 1) % 4);
    }
  }

  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
