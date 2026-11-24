import { DataTexture, EquirectangularReflectionMapping, RGBAFormat, UnsignedByteType } from 'three';

/** A richer linear-light tropical sky probe for crisp reflections on glass, metal and automotive paint. */
export function createSkyReflection(): DataTexture {
  const width = 256;
  const height = 128;
  const pixels = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const elevation = Math.sin(((row + 0.5) / height - 0.5) * Math.PI);
    const upper = Math.sqrt(Math.max(0, elevation));
    const lower = Math.sqrt(Math.max(0, -elevation));
    const horizonGlow = Math.exp(-Math.pow(elevation * 4.2, 2));
    for (let col = 0; col < width; col++) {
      const azimuth = (col + 0.5) / width * Math.PI * 2;
      const sunLobe = Math.pow(Math.max(0, Math.cos(azimuth - 3.8)), 18)
        * Math.exp(-Math.pow((elevation - 0.22) * 3.6, 2));
      const offset = (row * width + col) * 4;
      const r = 138 - 108 * upper - 110 * lower + 44 * horizonGlow + 108 * sunLobe;
      const g = 162 - 78 * upper - 118 * lower + 22 * horizonGlow + 64 * sunLobe;
      const b = 194 - 22 * upper - 128 * lower - 8 * horizonGlow + 26 * sunLobe;
      pixels[offset] = Math.max(0, Math.min(255, Math.round(r)));
      pixels[offset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      pixels[offset + 2] = Math.max(0, Math.min(255, Math.round(b)));
      pixels[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(pixels, width, height, RGBAFormat, UnsignedByteType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.name = 'Procedural sky reflection';
  texture.needsUpdate = true;
  return texture;
}
