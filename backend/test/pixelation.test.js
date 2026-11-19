import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { pixelatePng } from '../src/pixelation.js';

async function png(pixels, width, height) {
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function decode(buffer) {
  return sharp(buffer).raw().toBuffer({ resolveWithObject: true });
}

test('nearest reduction selects centre pixels without blending RGB or alpha', async () => {
  const pixels = Buffer.alloc(32 * 16 * 4);
  const sampled = [137, 79, 203, 127];
  const skipped = [255, 12, 0, 255];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 32; x++) {
      pixels.set(x % 2 && y % 2 ? sampled : skipped, (y * 32 + x) * 4);
    }
  }
  const input = await png(pixels, 32, 16);
  const original = Buffer.from(input);
  const result = await pixelatePng(input, 16);
  const { data, info } = await decode(result);
  assert.equal(info.width, 16);
  assert.equal(info.height, 8);
  assert.equal(info.channels, 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    assert.deepEqual([...data.subarray(offset, offset + 4)], sampled);
  }
  assert.deepEqual(input, original);
  assert.deepEqual(await pixelatePng(input, 16), result);
});

test('enlargement preserves transparent RGB and very low alpha exactly', async () => {
  const left = [123, 77, 201, 1];
  const right = [18, 213, 91, 0];
  const input = await png(Buffer.from([...left, ...right]), 2, 1);
  const { data, info } = await decode(await pixelatePng(input, 16));
  assert.equal(info.width, 16);
  assert.equal(info.height, 8);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 16; x++) {
      const offset = (y * 16 + x) * 4;
      assert.deepEqual([...data.subarray(offset, offset + 4)], x < 8 ? left : right);
    }
  }
});

test('all sizes preserve portrait ratio with integer rounding and no padding', async () => {
  const input = await sharp({ create: {
    width: 200, height: 300, channels: 4, background: { r: 30, g: 90, b: 160, alpha: 1 },
  } }).png().toBuffer();
  for (const [size, width] of [[16, 11], [32, 21], [64, 43], [128, 85]]) {
    const result = await pixelatePng(input, size);
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, size);
    const { data } = await decode(result);
    for (let offset = 0; offset < data.length; offset += 4) {
      assert.deepEqual([...data.subarray(offset, offset + 4)], [30, 90, 160, 255]);
    }
  }
});

test('landscape, square and one-pixel edges stay nonzero without cropping', async () => {
  for (const [width, height, expectedWidth, expectedHeight] of [
    [301, 100, 16, 5], [17, 17, 16, 16], [8192, 1, 16, 1], [1, 8192, 1, 16], [1, 1, 16, 16],
  ]) {
    const input = await sharp({ create: {
      width, height, channels: 4, background: { r: 80, g: 40, b: 20, alpha: 1 },
    } }).png().toBuffer();
    const { data, info } = await decode(await pixelatePng(input, 16));
    assert.equal(info.width, expectedWidth);
    assert.equal(info.height, expectedHeight);
    for (let offset = 0; offset < data.length; offset += 4) {
      assert.deepEqual([...data.subarray(offset, offset + 4)], [80, 40, 20, 255]);
    }
  }
});

test('invalid size, non-buffer input and invalid object images are rejected', async () => {
  const input = await png(Buffer.from([10, 20, 30, 255]), 1, 1);
  for (const size of [undefined, null, '16', 0, 17, 16.5, NaN, Infinity]) {
    await assert.rejects(pixelatePng(input, size), RangeError);
  }
  for (const palette of [null, '', 'unknown', 16, {}, ['retro16']]) {
    await assert.rejects(pixelatePng(input, 16, palette), RangeError);
  }
  for (const value of ['private/path.png', null, Buffer.alloc(0)]) {
    await assert.rejects(pixelatePng(value, 16), TypeError);
  }
  const jpeg = await sharp(input).jpeg().toBuffer();
  const rgb = await sharp(input).removeAlpha().png().toBuffer();
  for (const value of [jpeg, rgb, Buffer.from('not PNG'), input.subarray(0, 40)]) {
    await assert.rejects(pixelatePng(value, 16));
  }
  const oversized = await sharp({ create: {
    width: 8193, height: 1, channels: 4, background: 'transparent',
  } }).png().toBuffer();
  await assert.rejects(pixelatePng(oversized, 16), RangeError);
});

test('retro palette quantizes visible RGB, preserves hidden RGB and partial alpha, and resolves ties', async () => {
  const samples = [
    [12, 20, 30, 255], [20, 80, 180, 127], [200, 80, 10, 1],
    [20, 80, 180, 0], [0, 0, 85, 255], [255, 255, 255, 255],
  ];
  const expected = [
    [0, 0, 0, 255], [0, 0, 170, 127], [170, 85, 0, 1],
    [20, 80, 180, 0], [0, 0, 0, 255], [255, 255, 255, 255],
  ];
  const pixels = Buffer.from(Array.from({ length: 16 }, (_, x) => samples[x % samples.length]).flat());
  const input = await png(pixels, 16, 1);
  const original = Buffer.from(input);
  const result = await pixelatePng(input, 16, 'retro16');
  const { data, info } = await decode(result);
  assert.equal(info.width, 16);
  assert.equal(info.height, 1);
  for (let x = 0; x < 16; x++) {
    assert.deepEqual([...data.subarray(x * 4, x * 4 + 4)], expected[x % samples.length]);
  }
  assert.deepEqual(await pixelatePng(input, 16, 'retro16'), result);
  assert.deepEqual((await decode(await pixelatePng(input, 16, 'original'))).data, pixels);
  assert.deepEqual(input, original);
});

test('retro palette bounds visible colors while leaving an entirely transparent image unchanged', async () => {
  const colors = new Set([
    '0,0,0', '0,0,170', '0,170,0', '0,170,170',
    '170,0,0', '170,0,170', '170,85,0', '170,170,170',
    '85,85,85', '85,85,255', '85,255,85', '85,255,255',
    '255,85,85', '255,85,255', '255,255,85', '255,255,255',
  ]);
  const pixels = Buffer.alloc(16 * 16 * 4);
  for (let i = 0; i < 256; i++) {
    pixels.set([i, (i * 7) % 256, (i * 13) % 256, i], i * 4);
  }
  const result = await decode(await pixelatePng(await png(pixels, 16, 16), 16, 'retro16'));
  for (let i = 0; i < 256; i++) {
    assert.equal(result.data[i * 4 + 3], i);
    if (i > 0) assert.ok(colors.has([...result.data.subarray(i * 4, i * 4 + 3)].join(',')));
    pixels[i * 4 + 3] = 0;
  }
  const hidden = await decode(await pixelatePng(await png(pixels, 16, 16), 16, 'retro16'));
  assert.deepEqual(hidden.data, pixels);
});
