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

const surfaceMarkings = { roughness: 0.81 };
const presets = {
  wall: { roughness: 0.89 },
  trim: { roughness: 0.62, metalness: 0.07 },
  glass: { roughness: 0.21, metalness: 0.4, emissive: '#224658', emissiveIntensity: 0.18 },
  glassLit: { roughness: 0.34, emissive: '#ffaf63', emissiveIntensity: 0.56 },
  coralLight: { emissive: '#ff598b', emissiveIntensity: 1.45, roughness: 0.45 },
  aquaLight: { emissive: '#52eddc', emissiveIntensity: 1.2, roughness: 0.45 },
  goldLight: { emissive: '#ffc77e', emissiveIntensity: 1.3, roughness: 0.45 },
  asphalt: { roughness: 0.96 },
  pavement: { roughness: 0.92 },
  paint: surfaceMarkings,
  foliage: { roughness: 0.88, side: DoubleSide, vertexColors: true },
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

const SECTOR_SIZE = 48;

export class DistrictGeometry {
  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly batches = new Map<string, Batch>();
  private readonly materials = new Map<Finish, MeshStandardMaterial>();
  private readonly detailGroups: Array<{ mesh: InstancedMesh; x: number; z: number; visible: boolean }> = [];

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

  add(
    geometry: BufferGeometry,
    finish: Finish,
    castsShadow: boolean,
    placement: Placement,
  ): void {
    const maxDim = Math.max(placement.width, placement.height, placement.depth);
    const isSkyline = placement.z < -95 || placement.x < -70;
    const isDetail = !isSkyline && (
      finish === 'foliage'
      || (finish !== 'asphalt' && finish !== 'pavement' && finish !== 'wall' && maxDim < 1.35)
    );
    const shadow = castsShadow && !isDetail && finish !== 'foliage';
    const sx = isSkyline ? 99 : Math.floor(placement.x / SECTOR_SIZE);
    const sz = isSkyline ? 99 : Math.floor(placement.z / SECTOR_SIZE);
    const sectorKey = isSkyline ? 'sky' : `${sx}:${sz}`;
    const key = `${sectorKey}:${geometry.id}:${finish}:${shadow}:${isDetail ? 'd' : 'c'}`;
    let batch = this.batches.get(key);
    if (!batch) {
      batch = {
        geometry,
        material: this.getMaterial(finish),
        castsShadow: shadow,
        detail: isDetail,
        sectorKey,
        centerX: isSkyline ? -40 : (sx + 0.5) * SECTOR_SIZE,
        centerZ: isSkyline ? -120 : (sz + 0.5) * SECTOR_SIZE,
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
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      if (detail) this.detailGroups.push({ mesh, x: centerX, z: centerZ, visible: true });
      group.add(mesh);
    }
    this.batches.clear();
    return group;
  }

  updateVisibility(focusX: number, focusZ: number): void {
    for (const entry of this.detailGroups) {
      const dist = Math.hypot(entry.x - focusX, entry.z - focusZ);
      const next = entry.visible ? dist < 118 : dist < 104;
      if (next !== entry.visible) {
        entry.visible = next;
        entry.mesh.visible = next;
      }
    }
  }

  setNightLighting(darkness: number): void {
    for (const finish of ['glassLit', 'coralLight', 'aquaLight', 'goldLight'] as const) {
      const material = this.materials.get(finish);
      if (material) material.emissiveIntensity = presets[finish].emissiveIntensity * (0.78 + darkness * 1.20);
    }
  }

  private getMaterial(finish: Finish): MeshStandardMaterial {
    const existing = this.materials.get(finish);
    if (existing) return existing;

    const material = new MeshStandardMaterial(presets[finish]);
    material.name = `District · ${finish}`;
    if (finish === 'asphalt' || finish === 'pavement') {
      material.map = grainTexture(finish === 'asphalt' ? 17 : 27);
    }
    this.materials.set(finish, material);
    return material;
  }
}

function grainTexture(strength: number): DataTexture {
  const random = makeRandom(61231);
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    const grain = Math.round(255 - strength * random() ** 2.4);
    data[offset] = grain;
    data[offset + 1] = grain;
    data[offset + 2] = grain;
    data[offset + 3] = 255;
  }

  const texture = new DataTexture(data, size, size);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}
