import sharp from 'sharp';

// Fixed EGA-style RGB palette, ordered for deterministic equal-distance ties.
const retro16 = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
  [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
  [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
  [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255],
];

/**
 * Pixelate a validated, static RGBA8 object PNG. Returns a new PNG buffer;
 * the caller owns manifest/path validation and storage, never overwrites the original.
 * size is the output's longest side, including enlargement of smaller inputs.
 */
export async function pixelatePng(input, size, palette = 'original') {
  if (![16, 32, 64, 128].includes(size)) {
    throw new RangeError('Ukuran pixelation harus 16, 32, 64, atau 128.');
  }
  if (!['original', 'retro16'].includes(palette)) {
    throw new RangeError('Palet harus original atau retro16.');
  }
  if (!Buffer.isBuffer(input) || input.length === 0) {
    throw new TypeError('Input pixelation harus berupa buffer PNG objek.');
  }
  const image = sharp(input, { limitInputPixels: 24_000_000, failOn: 'warning' });
  const metadata = await image.metadata();
  if (metadata.format !== 'png' || metadata.channels !== 4 || !metadata.hasAlpha
      || metadata.depth !== 'uchar' || (metadata.pages || 1) !== 1) {
    throw new TypeError('Pixelation memerlukan PNG objek RGBA 8-bit statis.');
  }
  if (!metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192) {
    throw new RangeError('Batas gambar: sisi 8192 piksel dan 24 megapiksel.');
  }
  const scale = size / Math.max(metadata.width, metadata.height);
  const width = Math.max(1, Math.round(metadata.width * scale));
  const height = Math.max(1, Math.round(metadata.height * scale));
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.allocUnsafe(width * height * 4);
  // Sharp resize premultiplies alpha, which can change RGB at low/zero alpha.
  // Sample whole RGBA pixels instead; nearest-neighbour never blends channels.
  for (let y = 0; y < height; y++) {
    const sourceY = Math.floor((y + 0.5) * info.height / height);
    for (let x = 0; x < width; x++) {
      const sourceX = Math.floor((x + 0.5) * info.width / width);
      const sourceOffset = (sourceY * info.width + sourceX) * 4;
      data.copy(pixels, (y * width + x) * 4, sourceOffset, sourceOffset + 4);
    }
  }
  if (palette === 'retro16') {
    for (let offset = 0; offset < pixels.length; offset += 4) {
      // Keep hidden RGB and every alpha byte intact; quantize visible RGB only.
      if (pixels[offset + 3] === 0) continue;
      let nearest = retro16[0];
      let minimum = Infinity;
      for (const color of retro16) {
        const distance = (pixels[offset] - color[0]) ** 2
          + (pixels[offset + 1] - color[1]) ** 2
          + (pixels[offset + 2] - color[2]) ** 2;
        if (distance < minimum) {
          minimum = distance;
          nearest = color;
        }
      }
      pixels[offset] = nearest[0];
      pixels[offset + 1] = nearest[1];
      pixels[offset + 2] = nearest[2];
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}
