import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { packSpritesheet, SpritesheetError } from '../src/spritesheet.js';

// Helper to create synthetic solid RGBA PNG buffers
async function createSolidPng(width, height, r, g, b, a = 255) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r, g, b, alpha: a / 255 },
    },
  }).png().toBuffer();
}

test('packSpritesheet packs a single sprite with exact coordinates and dimensions', async () => {
  const sprite = await createSolidPng(20, 30, 255, 0, 0, 255);
  const items = [
    { id: 'item-1', category: 'shirt', width: 20, height: 30, buffer: sprite },
  ];

  const result = await packSpritesheet(items, { padding: 5 });

  // Width: padding (5) + width (20) + padding (5) = 30
  // Height: padding (5) + height (30) + padding (5) = 40
  assert.equal(result.width, 30);
  assert.equal(result.height, 40);
  assert.equal(result.padding, 5);
  assert.equal(result.columns, 1);

  // Check atlas
  assert.deepEqual(result.atlas.meta.size, { w: 30, h: 40 });
  assert.equal(result.atlas.meta.format, 'RGBA8888');
  assert.equal(result.atlas.frames['item-1'].frame.x, 5);
  assert.equal(result.atlas.frames['item-1'].frame.y, 5);
  assert.equal(result.atlas.frames['item-1'].frame.w, 20);
  assert.equal(result.atlas.frames['item-1'].frame.h, 30);
  assert.equal(result.atlas.frames['item-1'].category, 'shirt');

  // Verify PNG buffer
  const metadata = await sharp(result.pngBuffer).metadata();
  assert.equal(metadata.width, 30);
  assert.equal(metadata.height, 40);
  assert.equal(metadata.channels, 4);
  assert.equal(metadata.hasAlpha, true);

  // Check pixels: (0, 0) should be transparent (alpha = 0)
  const raw = await sharp(result.pngBuffer).raw().toBuffer({ resolveWithObject: true });
  const getPixel = (x, y) => {
    const idx = (y * 30 + x) * 4;
    return [raw.data[idx], raw.data[idx + 1], raw.data[idx + 2], raw.data[idx + 3]];
  };

  // Corner should be fully transparent
  assert.deepEqual(getPixel(0, 0), [0, 0, 0, 0]);
  // Inside sprite (e.g. at x=10, y=15) should be solid red
  assert.deepEqual(getPixel(10, 15), [255, 0, 0, 255]);
});

test('packSpritesheet arranges multiple items into rows and columns with padding', async () => {
  const spriteA = await createSolidPng(10, 10, 255, 0, 0); // Red
  const spriteB = await createSolidPng(15, 20, 0, 255, 0); // Green
  const spriteC = await createSolidPng(25, 12, 0, 0, 255); // Blue

  const items = [
    { id: 'A', category: 'hat', width: 10, height: 10, buffer: spriteA },
    { id: 'B', category: 'upper', width: 15, height: 20, buffer: spriteB },
    { id: 'C', category: 'pants', width: 25, height: 12, buffer: spriteC },
  ];

  // Request 2 columns, padding 2
  const result = await packSpritesheet(items, { columns: 2, padding: 2 });

  // Row 1: items A & B
  // rowHeight = max(10, 20) = 20
  // rowWidth = 2 + (10 + 2) + (15 + 2) = 31
  // Row 2: item C
  // rowHeight = 12
  // rowWidth = 2 + (25 + 2) = 29
  // Sheet: width = max(31, 29) = 31
  // Height = 2 + (20 + 2) + (12 + 2) = 38
  assert.equal(result.width, 31);
  assert.equal(result.height, 38);

  const frameA = result.atlas.frames['A'].frame;
  assert.deepEqual(frameA, { x: 2, y: 2, w: 10, h: 10 });

  const frameB = result.atlas.frames['B'].frame;
  assert.deepEqual(frameB, { x: 14, y: 2, w: 15, h: 20 });

  const frameC = result.atlas.frames['C'].frame;
  // Row 2 starts at y = 2 + 20 + 2 = 24
  assert.deepEqual(frameC, { x: 2, y: 24, w: 25, h: 12 });

  const metadata = await sharp(result.pngBuffer).metadata();
  assert.equal(metadata.width, 31);
  assert.equal(metadata.height, 38);
});

test('packSpritesheet with zero padding and 1 column', async () => {
  const sprite1 = await createSolidPng(10, 10, 255, 0, 0);
  const sprite2 = await createSolidPng(10, 10, 0, 255, 0);

  const items = [
    { id: '1', category: 'c1', width: 10, height: 10, buffer: sprite1 },
    { id: '2', category: 'c2', width: 10, height: 10, buffer: sprite2 },
  ];

  const result = await packSpritesheet(items, { columns: 1, padding: 0 });
  assert.equal(result.width, 10);
  assert.equal(result.height, 20);

  assert.deepEqual(result.atlas.frames['1'].frame, { x: 0, y: 0, w: 10, h: 10 });
  assert.deepEqual(result.atlas.frames['2'].frame, { x: 0, y: 10, w: 10, h: 10 });
});

test('packSpritesheet validates inputs defensifely', async () => {
  // Empty items
  await assert.rejects(
    () => packSpritesheet([]),
    (err) => err instanceof SpritesheetError && err.code === 'INVALID_SPRITESHEET_ITEMS'
  );

  // Invalid padding
  await assert.rejects(
    () => packSpritesheet([{ id: '1', width: 10, height: 10, buffer: Buffer.from('') }], { padding: -1 }),
    (err) => err instanceof SpritesheetError && err.code === 'INVALID_PADDING'
  );
  await assert.rejects(
    () => packSpritesheet([{ id: '1', width: 10, height: 10, buffer: Buffer.from('') }], { padding: 100 }),
    (err) => err instanceof SpritesheetError && err.code === 'INVALID_PADDING'
  );

  // Invalid columns
  await assert.rejects(
    () => packSpritesheet([{ id: '1', width: 10, height: 10, buffer: Buffer.from('') }], { columns: 0 }),
    (err) => err instanceof SpritesheetError && err.code === 'INVALID_COLUMNS'
  );
  await assert.rejects(
    () => packSpritesheet([{ id: '1', width: 10, height: 10, buffer: Buffer.from('') }], { columns: 20 }),
    (err) => err instanceof SpritesheetError && err.code === 'INVALID_COLUMNS'
  );

  // Invalid item properties
  await assert.rejects(
    () => packSpritesheet([{ id: '', width: 10, height: 10 }]),
    (err) => err instanceof SpritesheetError && err.code === 'INVALID_ITEM_ID'
  );
  await assert.rejects(
    () => packSpritesheet([{ id: '1', width: -5, height: 10 }]),
    (err) => err instanceof SpritesheetError && err.code === 'INVALID_ITEM_DIMENSIONS'
  );
  await assert.rejects(
    () => packSpritesheet([{ id: '1', width: 10, height: 10 }]),
    (err) => err instanceof SpritesheetError && err.code === 'MISSING_ITEM_SOURCE'
  );
});
