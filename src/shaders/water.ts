import { Color, Vector3 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { abs, cameraPosition, cos, dot, float, Fn, max, mix, normalize, positionWorld, pow, sin, smoothstep, uniform, vec3 } from 'three/tsl';

export function createWaterMaterial(shoreline: number) {
  const clock = uniform(0);
  const daylight = uniform(1);
  const sun = uniform(new Vector3(-0.55, 0.34, 0.45).normalize());
  const deep = uniform(new Color('#15547a'));
  const teal = uniform(new Color('#2ea89b'));
  const foamColor = uniform(new Color('#e4f3ea'));
  const material = new MeshBasicNodeMaterial();
  material.colorNode = Fn(() => {
    const uv = positionWorld.xz;
    const a = uv.x.mul(0.99).add(uv.y.mul(0.53)).add(clock.mul(1.32));
    const b = uv.x.mul(0.48).sub(uv.y.mul(1.2)).sub(clock.mul(1.94));
    const c = uv.x.mul(1.26).add(uv.y.mul(0.74)).sub(clock.mul(0.78));
    const ripple = sin(a).add(sin(b).mul(0.63)).add(sin(c).mul(0.4)).mul(0.036);
    const normal = normalize(vec3(cos(a).add(cos(b).mul(0.45)).mul(0.115), 1, cos(c).sub(cos(b)).mul(0.092)));
    const view = normalize(cameraPosition.sub(positionWorld));
    const reflectance = pow(float(1).sub(max(dot(normal, view), 0)), 3.6);
    const stripe = uv.x.sub(shoreline).add(sin(uv.y.mul(0.38).add(clock.mul(0.68))).mul(0.24));
    const first = float(1).sub(smoothstep(0.08, 0.48, abs(stripe.sub(0.45).add(sin(clock.mul(1.22)).mul(0.29))))).mul(0.82);
    const second = float(1).sub(smoothstep(0.06, 0.22, abs(stripe.sub(1.56).add(sin(clock.mul(1.34).add(0.8)).mul(0.34))))).mul(0.28);
    const body = mix(teal, deep, smoothstep(0, 19, stripe));
    const water = mix(body.mul(ripple.mul(5.5).add(0.84)), foamColor, first.add(second).min(1));
    const skyTint = mix(vec3(0.07, 0.14, 0.26), vec3(0.28, 0.44, 0.56), daylight);
    const reflection = mix(water, skyTint, reflectance.mul(0.68));
    const sparkle = pow(max(dot(normalize(sun.add(view)), normal), 0), 140);
    const glint = vec3(1.0, 0.68, 0.34).mul(sparkle).mul(0.95);
    return reflection.mul(daylight.mul(0.82).add(0.18)).add(glint.mul(daylight.mul(0.85).add(0.15)));
  })();
  return { material, clock, daylight, sun };
}
