import {
  BoxGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

import type { BufferGeometry, ColorRepresentation, MeshStandardMaterialParameters } from 'three';
import { makeRandom } from './layout';

const surfaceMarkings = { roughness: 0.78 };
const presets = {
  wall: { roughness: 0.84, metalness: 0.02 },
  trim: { roughness: 0.50, metalness: 0.14 },
  glass: { roughness: 0.12, metalness: 0.62, emissive: '#1e4a5e', emissiveIntensity: 0.24, envMapIntensity: 1.55 },
  glassLit: { roughness: 0.26, metalness: 0.18, emissive: '#ffb868', emissiveIntensity: 0.72 },
  coralLight: { emissive: '#ff4e88', emissiveIntensity: 1.75, roughness: 0.35 },
  aquaLight: { emissive: '#42f2e0', emissiveIntensity: 1.5, roughness: 0.35 },
  goldLight: { emissive: '#ffcf76', emissiveIntensity: 1.55, roughness: 0.35 },
  asphalt: { roughness: 0.86, metalness: 0.04 },
  pavement: { roughness: 0.88, metalness: 0.02 },
  paint: surfaceMarkings,
  foliage: { roughness: 0.72, side: DoubleSide, vertexColors: true },
} satisfies Record<string, MeshStandardMaterialParameters>;

export type Finish = keyof typeof presets;

type Placement = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: ColorRepresentation;
  rotation?: Euler;
};

type Batch = {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  castsShadow: boolean;
  detail: boolean;
  sectorKey: string;
  centerX: number;
  centerZ: number;
  instances: Placement[];
};

const SECTOR_SIZE = 64;

export class DistrictGeometry {
  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly batches = new Map<string, Batch>();
  private readonly materials = new Map<Finish, MeshStandardMaterial>();
  private readonly detailGroups: Array<{ mesh: InstancedMesh; x: number; z: number; visible: boolean }> = [];
  private lastFocusX = Number.NaN;
  private lastFocusZ = Number.NaN;
  private lastDarkness = Number.NaN;

  box(
    finish: Finish,
    color: ColorRepresentation,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    castsShadow = false,
  ): void {
    this.add(this.boxGeometry, finish, castsShadow, { x, y, z, width, height, depth, color });
  }

  rotatedBox(
    finish: Finish,
    color: ColorRepresentation,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    rotation: Euler,
    castsShadow = false,
  ): void {
    this.add(this.boxGeometry, finish, castsShadow, { x, y, z, width, height, depth, color, rotation });
  }

  add(
    geometry: BufferGeometry,
    finish: Finish,
    castsShadow: boolean,
    placement: Placement,
  ): void {
    const maxDim = Math.max(placement.width, placement.height, placement.depth);
    const isSkyline = placement.z < -176;
    const isDetail = !isSkyline && (
      finish === 'foliage'
      || (finish !== 'asphalt' && finish !== 'pavement' && finish !== 'wall' && maxDim < 1.45)
    );
    const shadow = castsShadow && !isDetail && finish !== 'foliage';
    // Core structural geometry is batched globally per material/geometry (minimal draw calls);
    // fine detail and foliage are bucketed by 64m sectors for distance culling.
    const sx = isDetail ? Math.floor(placement.x / SECTOR_SIZE) : 0;
    const sz = isDetail ? Math.floor(placement.z / SECTOR_SIZE) : 0;
    const sectorKey = isDetail ? `${sx}:${sz}` : 'core';
    const key = `${sectorKey}:${geometry.id}:${finish}:${shadow}:${isDetail ? 'd' : 'c'}`;
    let batch = this.batches.get(key);
    if (!batch) {
      batch = {
        geometry,
        material: this.getMaterial(finish),
        castsShadow: shadow,
        detail: isDetail,
        sectorKey,
        centerX: isDetail ? (sx + 0.5) * SECTOR_SIZE : 0,
        centerZ: isDetail ? (sz + 0.5) * SECTOR_SIZE : 0,
        instances: [],
      };
      this.batches.set(key, batch);
    }
    batch.instances.push(placement);
  }

  render(): Group {
    const group = new Group();
    group.name = 'Constructed district';
    const transform = new Object3D();
    const color = new Color();
    this.detailGroups.length = 0;

    for (const { geometry, material, castsShadow, detail, centerX, centerZ, instances } of this.batches.values()) {
      const mesh = new InstancedMesh(geometry, material, instances.length);
      instances.forEach((placement, index) => {
        transform.position.set(placement.x, placement.y, placement.z);
        transform.scale.set(placement.width, placement.height, placement.depth);
        if (placement.rotation) transform.rotation.copy(placement.rotation);
        else transform.rotation.set(0, 0, 0);
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
        mesh.setColorAt(index, color.set(placement.color));
      });

      mesh.castShadow = castsShadow;
      mesh.receiveShadow = !detail;
      mesh.computeBoundingSphere();
      if (detail) this.detailGroups.push({ mesh, x: centerX, z: centerZ, visible: true });
      group.add(mesh);
    }
    this.batches.clear();
    return group;
  }

  updateVisibility(focusX: number, focusZ: number): void {
    if (Math.hypot(focusX - this.lastFocusX, focusZ - this.lastFocusZ) < 2.0) return;
    this.lastFocusX = focusX;
    this.lastFocusZ = focusZ;
    for (const entry of this.detailGroups) {
      const dist = Math.hypot(entry.x - focusX, entry.z - focusZ);
      const next = entry.visible ? dist < 96 : dist < 84;
      if (next !== entry.visible) {
        entry.visible = next;
        entry.mesh.visible = next;
      }
    }
  }

  setNightLighting(darkness: number): void {
    if (Math.abs(darkness - this.lastDarkness) < 0.004) return;
    this.lastDarkness = darkness;
    for (const finish of ['glassLit', 'coralLight', 'aquaLight', 'goldLight'] as const) {
      const material = this.materials.get(finish);
      if (material) material.emissiveIntensity = presets[finish].emissiveIntensity * (0.72 + darkness * 1.45);
    }
  }

  private getMaterial(finish: Finish): MeshStandardMaterial {
    const existing = this.materials.get(finish);
    if (existing) return existing;

    const material = new MeshStandardMaterial(presets[finish]);
    material.name = `District · ${finish}`;
    if (finish === 'asphalt') {
      const tex = grainTexture(24, 18, 61231);
      material.map = tex;
      material.bumpMap = tex;
      material.bumpScale = 0.04;
    } else if (finish === 'pavement') {
      const tex = sidewalkTileTexture();
      material.map = tex;
      material.bumpMap = tex;
      material.bumpScale = 0.032;
    } else if (finish === 'wall') {
      const tex = stuccoTexture();
      material.map = tex;
      material.bumpMap = tex;
      material.bumpScale = 0.028;
    }
    this.materials.set(finish, material);
    return material;
  }
}

function configureProceduralTexture(texture: DataTexture, repeat: number): DataTexture {
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function grainTexture(strength: number, repeat: number, seed: number): DataTexture {
  const random = makeRandom(seed);
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const micro = random() ** 2.1;
      const tarStreak = Math.sin(x * 0.25 + y * 0.07) * 4;
      const grain = Math.max(185, Math.min(255, Math.round(252 - strength * micro + tarStreak)));
      data[offset] = grain;
      data[offset + 1] = grain;
      data[offset + 2] = Math.min(255, grain + 2);
      data[offset + 3] = 255;
    }
  }
  return configureProceduralTexture(new DataTexture(data, size, size), repeat);
}

function sidewalkTileTexture(): DataTexture {
  const random = makeRandom(77321);
  const size = 128;
  const tile = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const gx = x % tile;
      const gy = y % tile;
      const isJoint = gx === 0 || gy === 0 || gx === tile - 1 || gy === tile - 1;
      const tileTint = ((Math.floor(x / tile) + Math.floor(y / tile)) % 2) * 5;
      const noise = Math.round(random() * 11);
      const v = isJoint ? 206 : Math.min(255, 244 - tileTint - noise);
      data[offset] = v;
      data[offset + 1] = v;
      data[offset + 2] = Math.max(0, v - 3);
      data[offset + 3] = 255;
    }
  }
  return configureProceduralTexture(new DataTexture(data, size, size), 14);
}

function stuccoTexture(): DataTexture {
  const random = makeRandom(88417);
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const wave = Math.sin(x * 0.19) * Math.cos(y * 0.23) * 5;
      const plaster = Math.round(248 - random() * 14 + wave);
      const v = Math.max(218, Math.min(255, plaster));
      data[offset] = v;
      data[offset + 1] = v;
      data[offset + 2] = Math.max(214, v - 2);
      data[offset + 3] = 255;
    }
  }
  return configureProceduralTexture(new DataTexture(data, size, size), 4);
}
