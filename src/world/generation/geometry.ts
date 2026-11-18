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
  instances: Placement[];
};

export class DistrictGeometry {
  private readonly batches = new Map<string, Batch>();

  constructor(private readonly resources = new DistrictResources()) {}

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
    this.add(this.resources.box, finish, castsShadow, { x, y, z, width, height, depth, color });
  }

  add(
    geometry: BufferGeometry,
    finish: Finish,
    castsShadow: boolean,
    placement: Placement,
  ): void {
    const key = `${geometry.id}:${finish}:${castsShadow}`;
    let batch = this.batches.get(key);
    if (!batch) {
      batch = {
        geometry,
        material: this.resources.material(finish),
        castsShadow,
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

    for (const { geometry, material, castsShadow, instances } of this.batches.values()) {
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
      group.add(mesh);
    }
    this.batches.clear();
    return group;
  }
}

export class DistrictResources {
  readonly box = new BoxGeometry(1, 1, 1);
  private readonly materials = new Map<Finish, MeshStandardMaterial>();
  private darkness = 0;

  setNightLighting(darkness: number): void {
    if (this.darkness === darkness) return;
    this.darkness = darkness;
    for (const finish of ['glassLit', 'coralLight', 'aquaLight', 'goldLight'] as const) {
      const material = this.materials.get(finish);
      if (material) material.emissiveIntensity = presets[finish].emissiveIntensity * (0.78 + darkness * 1.20);
    }
  }

  material(finish: Finish): MeshStandardMaterial {
    const existing = this.materials.get(finish);
    if (existing) return existing;

    const material = new MeshStandardMaterial(presets[finish]);
    material.name = `District · ${finish}`;
    if (finish === 'asphalt' || finish === 'pavement') {
      material.map = grainTexture(finish === 'asphalt' ? 17 : 27);
      // Sampling by world position keeps the same grain on long roads and short sidewalk blocks.
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `
          #include <uv_vertex>
          #ifdef USE_MAP
            vec4 surfacePosition = vec4(position, 1.0);
            #ifdef USE_INSTANCING
              surfacePosition = instanceMatrix * surfacePosition;
            #endif
            vMapUv = (modelMatrix * surfacePosition).xz * 0.19;
          #endif
        `);
      };
    }
    if ('emissiveIntensity' in presets[finish] && finish !== 'glass') {
      material.emissiveIntensity *= 0.78 + this.darkness * 1.20;
    }
    this.materials.set(finish, material);
    return material;
  }

  dispose(): void {
    this.box.dispose();
    for (const material of this.materials.values()) {
      material.map?.dispose();
      material.dispose();
    }
    this.materials.clear();
  }
}

export function disposeInstances(group: Group): void {
  group.removeFromParent();
  for (const instance of group.children) {
    if (instance instanceof InstancedMesh) instance.dispose();
  }
  group.clear();
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
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}
