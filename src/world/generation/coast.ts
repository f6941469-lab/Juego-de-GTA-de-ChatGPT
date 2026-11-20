import {
  Color,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
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
    addPalm(geometry, 56.6 + random() * 1.27, z + random() * 1.7, random, 0.84);
    if (Math.round(z / 8.4) % 2 === 0) {
      addBench(geometry, 53.18, z + 2.7);
      addPlanter(geometry, 54.16, z + 5.38, random, 0.64);
    } else {
      addLamppost(geometry, 52.75, z - 2.2, 1);
    }
  }

  const water = new ShaderMaterial({
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uShore: { value: shoreline },
        uDaylight: { value: 1 },
        uSun: { value: new Vector3(-0.55, 0.34, 0.45).normalize() },
        uDeep: { value: new Color('#216e8b') },
        uTeal: { value: new Color('#288b83') },
        uFoam: { value: new Color('#b6d4be') },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>

      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = viewMatrix * vec4(vWorld, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>

      uniform float uTime;
      uniform float uShore;
      uniform float uDaylight;
      uniform vec3 uSun;
      uniform vec3 uDeep;
      uniform vec3 uTeal;
      uniform vec3 uFoam;
      varying vec3 vWorld;

      void main() {
        vec2 uv = vWorld.xz;
        float phaseA = uv.x * .99 + uv.y * .53 + uTime * 1.29;
        float phaseB = uv.x * .48 - uv.y * 1.2 - uTime * 1.91;
        float phaseC = uv.x * 1.26 + uv.y * .74 - uTime * .73;
        float ripple = (sin(phaseA) + sin(phaseB) * .63 + sin(phaseC) * .40) * .032;
        vec3 normal = normalize(vec3((cos(phaseA) + cos(phaseB) * .45) * .093, 1.0, (cos(phaseC) - cos(phaseB)) * .076));
        vec3 viewDirection = normalize(cameraPosition - vWorld);
        float reflectance = pow(1.0 - max(dot(normal, viewDirection), 0.0), 4.0);
        float stripe = uv.x - uShore + sin(uv.y * .38 + uTime * .63) * .21;
        float foam = (1.0 - smoothstep(.09, .44, abs(stripe - .47 + sin(uTime * 1.2) * .27))) * .74;
        foam += (1.0 - smoothstep(.06, .19, abs(stripe - 1.54 + sin(uTime * 1.3 + .8) * .32))) * .22;
        vec3 color = mix(uTeal, uDeep, smoothstep(.0, 18.0, stripe));
        color = mix(color * (.79 + ripple * 5.0), uFoam, foam);
        color = mix(color, vec3(.137, .239, .314), reflectance * .56);
        float sparkle = pow(max(dot(normalize(uSun + viewDirection), normal), 0.0), 170.0);
        color += vec3(.92, .52, .26) * sparkle * .67;
        gl_FragColor = vec4(color * uDaylight, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });

  const sea = new Mesh(new PlaneGeometry(362, 760), water);
  sea.name = 'Bahía Palmera';
  sea.position.set(shoreline + 180, -0.09, 0);
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);

  const sunDirection = new Vector3();
  let sun: DirectionalLight | undefined;
  return (elapsed, daylight) => {
    water.uniforms.uTime.value = elapsed;
    sun ??= scene.children.find((child): child is DirectionalLight => 'isDirectionalLight' in child);
    if (sun) {
      sunDirection.copy(sun.position).sub(sun.target.position).normalize();
      water.uniforms.uSun.value.copy(sunDirection);
    }
    water.uniforms.uDaylight.value = 0.18 + daylight * 0.83;
  };
}
