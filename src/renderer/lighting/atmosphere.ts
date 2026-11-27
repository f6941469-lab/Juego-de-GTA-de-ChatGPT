import {
  Color, DirectionalLight, FogExp2, HemisphereLight, Mesh,
  SphereGeometry, Vector3, type Scene,
} from 'three';
import { createSkyMaterial } from '../../shaders/sky';

const shadowExtent = 63;
const worldUp = new Vector3(0, 1, 0);
const palette = {
  noonSun: new Color('#fff5e0'),
  duskSun: new Color('#ff9f5a'),
  moon: new Color('#9cbdff'),
  noonSky: new Color('#bfe0ff'),
  duskSky: new Color('#f2c8d8'),
  nightSky: new Color('#5e82d9'),
  noonBounce: new Color('#b5a388'),
  duskBounce: new Color('#b68c9b'),
  nightBounce: new Color('#2f3954'),
  dayHaze: new Color('#a8d0e6'),
  duskHaze: new Color('#d68b84'),
  nightHaze: new Color('#1f3259'),
};

function smoothstep(low: number, high: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

export function createAtmosphere(scene: Scene, initialHour = 17.25) {
  const sun = new DirectionalLight(palette.noonSun, 2.65);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.09;
  sun.shadow.bias = -0.00022;
  sun.shadow.radius = 2.2;

  const camera = sun.shadow.camera;
  camera.left = camera.bottom = -shadowExtent;
  camera.right = camera.top = shadowExtent;
  camera.near = 1;
  camera.far = 290;
  camera.updateProjectionMatrix();

  const ambient = new HemisphereLight(palette.noonSky, palette.noonBounce, 1.48);
  const fog = new FogExp2(palette.dayHaze, 0.00145);
  scene.fog = fog;

  const skyShader = createSkyMaterial(fog.color);
  const sky = new Mesh(new SphereGeometry(1, 32, 20), skyShader.material);
  sky.name = 'Sky dome';
  // The dome writes far-plane depth in its vertex shader. Draw after opaque geometry
  // so the depth test skips procedural sky shading behind buildings and ground.
  sky.renderOrder = 1000;
  sky.frustumCulled = false;
  scene.add(sky, sun, sun.target, ambient);

  const sunDirection = skyShader.sun.value;
  const moonDirection = skyShader.moon.value;
  const lightDirection = new Vector3();
  const shadowCenter = new Vector3();
  const shadowRight = new Vector3();
  const shadowUp = new Vector3();

  function update(hour: number, focus: Vector3, elapsed = 0): void {
    const arc = (hour - 6) * Math.PI / 12;
    const height = Math.sin(arc);
    const horizon = Math.cos(arc);
    sunDirection.set(0.53 * horizon + 0.12 * height, 0.94 * height, 0.85 * horizon - 0.28 * height).normalize();
    moonDirection.copy(sunDirection).negate();

    const daylight = smoothstep(-0.14, 0.16, sunDirection.y);
    const twilight = 1 - smoothstep(0.05, 0.51, Math.abs(sunDirection.y - 0.05));
    skyShader.daylight.value = daylight;
    skyShader.twilight.value = twilight;
    skyShader.clock.value = elapsed;

    const sunStrength = smoothstep(0.003, 0.115, sunDirection.y);
    const moonStrength = smoothstep(0.12, 0.4, moonDirection.y);
    sun.intensity = sunStrength * (2.55 + twilight * 0.52) + moonStrength * 0.54;
    sun.color.copy(palette.noonSun).lerp(palette.duskSun, twilight).lerp(palette.moon, 1 - sunStrength);
    ambient.intensity = 0.62 + daylight * 0.86;
    ambient.color.copy(palette.noonSky).lerp(palette.duskSky, twilight).lerp(palette.nightSky, 1 - daylight);
    ambient.groundColor.copy(palette.noonBounce).lerp(palette.duskBounce, twilight).lerp(palette.nightBounce, 1 - daylight);
    fog.color.copy(palette.dayHaze).lerp(palette.duskHaze, twilight).lerp(palette.nightHaze, 1 - daylight);
    fog.density = 0.00145 + twilight * 0.00045 + (1 - daylight) * 0.00055;
    scene.environmentIntensity = 0.22 + 0.48 * daylight;

    lightDirection.copy(sunDirection.y >= 0 ? sunDirection : moonDirection);
    lightDirection.y = Math.max(0.24, lightDirection.y);
    lightDirection.normalize();

    // Lock the shadow camera to its own texel grid so motion across town does not crawl across edges.
    shadowCenter.set(focus.x, 1, focus.z);
    shadowRight.crossVectors(worldUp, lightDirection).normalize();
    shadowUp.crossVectors(lightDirection, shadowRight);
    const texel = shadowExtent * 2 / sun.shadow.mapSize.x;
    const shadowX = shadowCenter.dot(shadowRight);
    const shadowY = shadowCenter.dot(shadowUp);
    shadowCenter.addScaledVector(shadowRight, Math.round(shadowX / texel) * texel - shadowX);
    shadowCenter.addScaledVector(shadowUp, Math.round(shadowY / texel) * texel - shadowY);
    sun.target.position.copy(shadowCenter);
    sun.position.copy(shadowCenter).addScaledVector(lightDirection, 135);
  }

  update(initialHour, new Vector3());
  return { update };
}
