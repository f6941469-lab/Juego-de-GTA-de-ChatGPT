export const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    gl_Position = clip.xyww;
  }
`;

export const skyFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uMoonDirection;
  uniform vec3 uGroundHaze;
  uniform float uDaylight;
  uniform float uTwilight;
  uniform float uTime;
  varying vec3 vDirection;

  float hash(vec2 point) {
    vec3 p = fract(vec3(point.xyx) * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 f = fract(point);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), f.x),
      f.y
    );
  }

  float cloudFractals(vec2 point) {
    mat2 turn = mat2(0.80, 0.60, -0.60, 0.80);
    float density = noise(point) * 0.54;
    point = turn * point * 2.05 + vec2(14.0, 27.0);
    density += noise(point) * 0.26;
    point = turn * point * 2.13 + vec2(51.0, 5.0);
    density += noise(point) * 0.13;
    density += noise(turn * point * 2.1 + 31.0) * 0.07;
    return density;
  }

  float stars(vec3 dir) {
    vec2 chart = vec2(atan(dir.z, dir.x) / 6.283185 + 0.5, dir.y) * vec2(570.0, 210.0);
    vec2 cell = floor(chart);
    float seed = hash(cell);
    vec2 center = vec2(hash(cell + 8.1), hash(cell + 13.7)) * 0.56 + 0.22;
    vec2 local = fract(chart) - center;
    float pixel = min(0.13, max(fwidth(chart.x), fwidth(chart.y)) * 0.40);
    float star = 1.0 - smoothstep(0.022, 0.048 + pixel, length(local));
    return star * step(0.978, seed) * (0.4 + 0.6 * hash(cell + 4.0));
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float height = max(dir.y, 0.0);
    float altitudeBlend = pow(height, 0.47);
    float sunDot = max(dot(dir, uSunDirection), 0.0);

    vec3 daySky = mix(vec3(0.44, 0.69, 0.91), vec3(0.021, 0.18, 0.49), altitudeBlend);
    vec3 lowTwilight = mix(vec3(0.63, 0.25, 0.29), vec3(1.10, 0.42, 0.16), pow(sunDot, 3.0));
    vec3 twilightSky = mix(lowTwilight, vec3(0.053, 0.105, 0.36), smoothstep(0.02, 0.55, height));
    vec3 nightSky = mix(vec3(0.033, 0.066, 0.129), vec3(0.0035, 0.009, 0.029), pow(height, 0.38));
    vec3 sky = mix(nightSky, daySky, uDaylight);
    sky = mix(sky, twilightSky, uTwilight * 0.84);

    float solarHalo = pow(sunDot, 9.0) * (uDaylight * 0.13 + uTwilight * 0.22);
    sky += vec3(1.0, 0.46, 0.17) * solarHalo;
    sky += vec3(1.0, 0.69, 0.38) * pow(sunDot, 125.0) * uDaylight * 0.72;
    float solarDisc = smoothstep(0.99969, 0.99980, sunDot);
    sky += vec3(6.0, 3.1, 1.28) * solarDisc * smoothstep(-0.035, 0.002, uSunDirection.y);

    float nightVisibility = (1.0 - smoothstep(0.03, 0.52, uDaylight)) * (1.0 - uTwilight * 0.65);
    if (nightVisibility > 0.01) {
      sky += vec3(0.47, 0.62, 1.0) * stars(dir) * nightVisibility * smoothstep(0.06, 0.42, height);
      float moonDot = max(dot(dir, uMoonDirection), 0.0);
      float moonDisc = smoothstep(0.99986, 0.99994, moonDot);
      sky += vec3(0.43, 0.64, 1.0) * (moonDisc * 1.8 + pow(moonDot, 180.0) * 0.12)
        * nightVisibility * smoothstep(-0.025, 0.035, uMoonDirection.y);
    }

    if (dir.y > 0.018) {
      vec2 cloudPoint = dir.xz / (dir.y + 0.20) * vec2(2.00, 2.52) + vec2(4.72, 9.19);
      cloudPoint += vec2(uTime * 0.009, uTime * 0.003);
      float cloud = cloudFractals(cloudPoint);
      float cloudShape = smoothstep(0.52, 0.70, cloud);
      float edge = smoothstep(0.48, 0.58, cloud) * (1.0 - smoothstep(0.56, 0.71, cloud));
      float coverage = smoothstep(0.018, 0.16, dir.y) * (1.0 - smoothstep(0.86, 1.0, dir.y));
      vec3 cloudLight = mix(
        vec3(0.75, 0.82, 0.91),
        mix(vec3(0.50, 0.26, 0.31), vec3(1.37, 0.60, 0.32), pow(sunDot, 3.0)),
        uTwilight * 0.82
      );
      cloudLight = mix(vec3(0.022, 0.036, 0.077), cloudLight, uDaylight);
      vec3 cloudShadow = cloudLight * mix(vec3(0.55, 0.66, 0.85), vec3(0.65, 0.63, 0.72), uTwilight);
      vec3 cloudColor = mix(cloudShadow, cloudLight, smoothstep(0.50, 0.76, cloud));
      sky = mix(sky, cloudColor, cloudShape * coverage * 0.88);
      sky += edge * coverage * pow(sunDot, 11.0) * uDaylight * vec3(0.17, 0.087, 0.035);

      vec2 cirrusPoint = cloudPoint * vec2(0.60, 2.45) + vec2(15.5, 3.0);
      float cirrus = smoothstep(0.61, 0.85, noise(cirrusPoint) * 0.75 + noise(cirrusPoint * 2.3) * 0.25);
      sky = mix(sky, cloudLight, cirrus * coverage * (1.0 - cloudShape) * 0.25);
    }

    gl_FragColor = vec4(sky, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    // Match the output-space fog in Three's surface shaders at the horizon.
    gl_FragColor.rgb = mix(linearToOutputTexel(vec4(uGroundHaze, 1.0)).rgb, gl_FragColor.rgb,
      smoothstep(0.0, 0.052, dir.y));
  }
`;
