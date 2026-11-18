import { DataTexture, EquirectangularReflectionMapping, RGBAFormat, UnsignedByteType } from 'three';

/** A small linear-light sky probe for rough reflections on glass, metal and paint. */
export function createSkyReflection(): DataTexture {
  const width = 128;
  const height = 64;
  const pixels = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const elevation = Math.sin(((row + 0.5) / height - 0.5) * Math.PI);
    const upper = Math.sqrt(Math.max(0, elevation));
    const lower = Math.sqrt(Math.max(0, -elevation));
    for (let col = 0; col < width; col++) {
      const azimuth = (col + 0.5) / width * Math.PI * 2;
      const warmth = Math.pow(Math.max(0, Math.cos(azimuth - 3.8)), 14)
        * Math.exp(-Math.pow((elevation - 0.24) * 3.4, 2));
      const offset = (row * width + col) * 4;
      pixels[offset] = Math.round(152 - 121 * upper - 130 * lower + 66 * warmth);
      pixels[offset + 1] = Math.round(160 - 90 * upper - 132 * lower + 33 * warmth);
      pixels[offset + 2] = Math.round(174 - 37 * upper - 140 * lower + 13 * warmth);
      pixels[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(pixels, width, height, RGBAFormat, UnsignedByteType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.name = 'Procedural sky reflection';
  texture.needsUpdate = true;
  return texture;
}
