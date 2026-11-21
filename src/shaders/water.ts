import { Color, Vector3 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { abs, cameraPosition, cos, dot, float, Fn, max, mix, normalize, positionWorld, pow, sin, smoothstep, uniform, vec3 } from 'three/tsl';

export function createWaterMaterial(shoreline: number) {
  const clock = uniform(0);
  const daylight = uniform(1);
  const sun = uniform(new Vector3(-0.55, 0.34, 0.45).normalize());
  const deep = uniform(new Color('#216e8b'));
  const teal = uniform(new Color('#288b83'));
  const foamColor = uniform(new Color('#b6d4be'));
  const material = new MeshBasicNodeMaterial();
  material.colorNode = Fn(() => {
    const uv = positionWorld.xz;
    const a = uv.x.mul(0.99).add(uv.y.mul(0.53)).add(clock.mul(1.29));
    const b = uv.x.mul(0.48).sub(uv.y.mul(1.2)).sub(clock.mul(1.91));
    const c = uv.x.mul(1.26).add(uv.y.mul(0.74)).sub(clock.mul(0.73));
    const ripple = sin(a).add(sin(b).mul(0.63)).add(sin(c).mul(0.4)).mul(0.032);
    const normal = normalize(vec3(cos(a).add(cos(b).mul(0.45)).mul(0.093), 1, cos(c).sub(cos(b)).mul(0.076)));
    const view = normalize(cameraPosition.sub(positionWorld));
    const reflectance = pow(float(1).sub(max(dot(normal, view), 0)), 4);
    const stripe = uv.x.sub(shoreline).add(sin(uv.y.mul(0.38).add(clock.mul(0.63))).mul(0.21));
    const first = float(1).sub(smoothstep(0.09, 0.44, abs(stripe.sub(0.47).add(sin(clock.mul(1.2)).mul(0.27))))).mul(0.74);
    const second = float(1).sub(smoothstep(0.06, 0.19, abs(stripe.sub(1.54).add(sin(clock.mul(1.3).add(0.8)).mul(0.32))))).mul(0.22);
    const body = mix(teal, deep, smoothstep(0, 18, stripe));
    const water = mix(body.mul(ripple.mul(5).add(0.79)), foamColor, first.add(second));
    const reflection = mix(water, vec3(0.137, 0.239, 0.314), reflectance.mul(0.56));
    const sparkle = pow(max(dot(normalize(sun.add(view)), normal), 0), 170);
    return reflection.add(vec3(0.92, 0.52, 0.26).mul(sparkle).mul(0.67)).mul(daylight);
  })();
  return { material, clock, daylight, sun };
}
