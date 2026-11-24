import { BackSide, Color, Vector3 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  cameraProjectionMatrix, cameraViewMatrix, dot, float, floor, Fn, fract, fwidth, length, max, mix, mx_atan2, mx_noise_float,
  normalize, positionLocal, pow, sin, smoothstep, step, uniform, vec2, vec3, vec4,
} from 'three/tsl';

/** TSL emits the same sky for the WebGPU and WebGL 2 backends. */
export function createSkyMaterial(haze: Color) {
  const sun = uniform(new Vector3());
  const moon = uniform(new Vector3());
  const daylight = uniform(1);
  const twilight = uniform(0);
  const clock = uniform(0);
  const groundHaze = uniform(haze);
  const material = new MeshBasicNodeMaterial({ side: BackSide, depthWrite: false, fog: false });
  material.vertexNode = Fn(() => {
    const direction = cameraViewMatrix.mul(vec4(positionLocal, 0));
    const clip = cameraProjectionMatrix.mul(vec4(direction.xyz, 1));
    return vec4(clip.xy, clip.w, clip.w);
  })();
  material.colorNode = Fn(() => {
    const dir = normalize(positionLocal);
    const height = max(dir.y, 0);
    const sunDot = max(dot(dir, sun), 0);
    const day = mix(vec3(0.44, 0.69, 0.91), vec3(0.021, 0.18, 0.49), pow(height, 0.47));
    const horizon = mix(vec3(0.63, 0.25, 0.29), vec3(1.10, 0.42, 0.16), pow(sunDot, 3));
    const dusk = mix(horizon, vec3(0.053, 0.105, 0.36), smoothstep(0.02, 0.55, height));
    const night = mix(vec3(0.033, 0.066, 0.129), vec3(0.0035, 0.009, 0.029), pow(height, 0.38));
    const sky = mix(mix(night, day, daylight), dusk, twilight.mul(0.84)).toVar();
    sky.addAssign(vec3(1, 0.46, 0.17).mul(pow(sunDot, 9)).mul(daylight.mul(0.13).add(twilight.mul(0.22))));
    sky.addAssign(vec3(1, 0.69, 0.38).mul(pow(sunDot, 125)).mul(daylight).mul(0.72));
    sky.addAssign(vec3(6, 3.1, 1.28).mul(smoothstep(0.99969, 0.99980, sunDot)).mul(smoothstep(-0.035, 0.002, sun.y)));
    const moonDot = max(dot(dir, moon), 0);
    const nightVisibility = float(1).sub(daylight).mul(float(1).sub(twilight.mul(0.65)));
    sky.addAssign(vec3(0.43, 0.64, 1).mul(smoothstep(0.99986, 0.99994, moonDot).mul(1.8).add(pow(moonDot, 180).mul(0.12))).mul(nightVisibility));
    const chart = vec2(float(mx_atan2(dir.z, dir.x)).div(Math.PI * 2).add(0.5), dir.y).mul(vec2(570, 210));
    const cell = floor(chart);
    const seed = fract(sin(dot(cell, vec2(127.1, 311.7))).mul(43758.5453));
    const center = vec2(fract(seed.mul(13.7)), fract(seed.mul(8.1))).mul(0.56).add(0.22);
    const pixel = max(fwidth(chart.x), fwidth(chart.y)).mul(0.4).min(0.13);
    const stars = float(1).sub(smoothstep(0.022, pixel.add(0.048), length(fract(chart).sub(center))))
      .mul(step(0.978, seed)).mul(nightVisibility).mul(smoothstep(0.06, 0.42, height));
    sky.addAssign(vec3(0.47, 0.62, 1).mul(stars));
    const point = dir.xz.div(max(dir.y.add(0.2), 0.2)).mul(vec2(2, 2.52)).add(vec2(4.72, 9.19)).add(vec2(clock.mul(0.009), clock.mul(0.003)));
    const cloud = mx_noise_float(vec3(point, 0)).mul(0.54)
      .add(mx_noise_float(vec3(point.mul(2.05).add(14), 0)).mul(0.26))
      .add(mx_noise_float(vec3(point.mul(4.36).add(51), 0)).mul(0.13))
      .add(mx_noise_float(vec3(point.mul(9.15).add(31), 0)).mul(0.07)).mul(0.5).add(0.5);
    const coverage = smoothstep(0.018, 0.16, dir.y).mul(float(1).sub(smoothstep(0.86, 1, dir.y)));
    const warmCloud = mix(vec3(0.56, 0.25, 0.36), vec3(1.52, 0.68, 0.34), pow(sunDot, 2.8));
    const silverLining = vec3(1.15, 0.78, 0.45).mul(pow(sunDot, 6)).mul(daylight.mul(0.35).add(twilight.mul(0.55)));
    const cloudLight = mix(vec3(0.026, 0.044, 0.095), mix(vec3(0.82, 0.88, 0.96), warmCloud, twilight.mul(0.86)), daylight).add(silverLining);
    sky.assign(mix(sky, cloudLight.mul(mix(0.66, 1.04, smoothstep(0.5, 0.76, cloud))), smoothstep(0.51, 0.7, cloud).mul(coverage).mul(0.9)));
    return mix(groundHaze, sky, smoothstep(0, 0.052, dir.y));
  })();
  return { material, sun, moon, daylight, twilight, clock };
}
