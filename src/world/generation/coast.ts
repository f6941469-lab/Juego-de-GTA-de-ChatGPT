import { Mesh, PlaneGeometry, Vector3 } from 'three';
import { createWaterMaterial } from '../../shaders/water';
import type { DirectionalLight, Scene } from 'three';
import type { DistrictGeometry } from './geometry';
import { districtBounds, inlandEdge, makeRandom, shoreline } from './layout';
import { addBench, addLamppost } from './streets';
import { addPalm, addPlanter } from './vegetation';

export function addCoast(scene: Scene, geometry: DistrictGeometry, seed: number): (elapsed: number, daylight: number) => void {
  const random = makeRandom(seed ^ 26372142);
  const length = districtBounds.maxZ - districtBounds.minZ;
  const sandStart = inlandEdge + 8.3;
  geometry.box('pavement', '#d0b088', (sandStart + shoreline) / 2, -0.068, 0, shoreline - sandStart, 0.122, length);
  geometry.box('pavement', '#be9f7e', shoreline + 0.093, -0.083, 0, 0.19, 0.036, length);
  geometry.box('pavement', '#dfc099', sandStart - 1.6, 0.034, 0, 3.20, 0.089, length);
  geometry.box('trim', '#ece0c5', sandStart - 0.15, 0.072, 0, 0.16, 0.12, length);

  for (let z = districtBounds.minZ + 2; z < districtBounds.maxZ; z += 2.35) {
    geometry.box('paint', '#b39e82', sandStart - 1.6, 0.081, z, 2.93, 0.004, 0.025);
  }
  for (let z = districtBounds.minZ + 4; z < districtBounds.maxZ - 2; z += 8.4) {
    if (Math.abs(z - 7) < 7.8 || Math.abs(z + 63) < 7.8) continue;
    addPalm(geometry, 56.6 + random() * 1.27, z + random() * 1.7, random, 0.84);
    if (Math.round(z / 8.4) % 2 === 0) {
      addBench(geometry, 53.18, z + 2.7);
      addPlanter(geometry, 54.16, z + 5.38, random, 0.64);
    } else {
      addLamppost(geometry, 52.75, z - 2.2, 1);
    }
  }

  const water = createWaterMaterial(shoreline);

  const sea = new Mesh(new PlaneGeometry(362, 760), water.material);
  sea.name = 'Bahía Palmera';
  sea.position.set(shoreline + 180, -0.09, 0);
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);

  const sunDirection = new Vector3();
  let sun: DirectionalLight | undefined;
  return (elapsed, daylight) => {
    water.clock.value = elapsed;
    sun ??= scene.children.find((child): child is DirectionalLight => 'isDirectionalLight' in child);
    if (sun) {
      sunDirection.copy(sun.position).sub(sun.target.position).normalize();
      water.sun.value.copy(sunDirection);
    }
    water.daylight.value = 0.18 + daylight * 0.83;
  };
}
