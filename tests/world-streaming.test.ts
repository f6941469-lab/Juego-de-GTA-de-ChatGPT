import { InstancedMesh, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { buildDistrict } from '../src/world/district';

describe('distritos y sectores', () => {
  it('descarga instancias fuera del alcance y reproduce las mismas fachadas al volver', () => {
    const scene = new Scene();
    const district = buildDistrict(scene, 42);
    const coreName = 'Sector 0:0 · detalle';
    const core = scene.getObjectByName(coreName);

    expect(district.stats().detailed).toBeGreaterThan(1);
    expect(district.stats().loaded).toBeGreaterThan(district.stats().detailed);
    expect(district.stats().loaded).toBeLessThan(district.stats().total);
    expect(core).toBeDefined();

    const original = core?.children.find((object) => object instanceof InstancedMesh) as InstancedMesh;
    const originalMatrices = Array.from(original.instanceMatrix.array);
    const staticColliderCount = district.colliders.length;
    let released = false;
    original.addEventListener('dispose', () => { released = true; });

    const distant = { x: -160, z: 172 };
    district.update(1, 17, distant);
    expect(scene.getObjectByName(coreName)).toBeUndefined();
    expect(released).toBe(true);
    expect(district.colliders).toHaveLength(staticColliderCount);

    district.update(2, 17, district.spawn);
    const restored = scene.getObjectByName(coreName)?.children.find((object) => object instanceof InstancedMesh) as InstancedMesh;
    expect(restored).not.toBe(original);
    expect(Array.from(restored.instanceMatrix.array)).toEqual(originalMatrices);

    district.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('conserva rutas y suelo al otro lado de los antiguos límites', () => {
    const district = buildDistrict(new Scene(), 42);
    const samples = [{ x: -69, z: 7 }, { x: 0, z: -101 }, { x: 0, z: 106 }];

    for (const point of samples) {
      expect(district.map.roads.some((road) =>
        Math.abs(road.x - point.x) < road.width / 2 &&
        Math.abs(road.z - point.z) < road.depth / 2,
      )).toBe(true);
      const beneathOrInside = district.colliders.filter((box) =>
        Math.abs(box.x - point.x) <= box.halfX && Math.abs(box.z - point.z) <= box.halfZ,
      );
      expect(beneathOrInside.some((box) => Math.abs(box.y + box.halfY) < 0.01)).toBe(true);
      expect(beneathOrInside.some((box) => box.y + box.halfY > 0.1)).toBe(false);
    }
    district.dispose();
  });
});
