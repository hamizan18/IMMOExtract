import sharp from 'sharp';

const MAX_TOTAL_PIXELS = 24_000_000;
const MAX_DIMENSION = 8192;

export class SpritesheetError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SpritesheetError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Packs multiple image items into a single transparent spritesheet PNG and atlas JSON.
 *
 * @param {Array<{ id: string, category: string, width: number, height: number, buffer?: Buffer, filePath?: string }>} items
 * @param {{ padding?: number, columns?: number }} [options]
 * @returns {Promise<{ pngBuffer: Buffer, atlas: object, width: number, height: number, padding: number, columns: number }>}
 */
export async function packSpritesheet(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new SpritesheetError(400, 'INVALID_SPRITESHEET_ITEMS', 'Minimal satu objek diperlukan untuk membuat spritesheet.');
  }

  const padding = options.padding ?? 4;
  if (!Number.isInteger(padding) || padding < 0 || padding > 64) {
    throw new SpritesheetError(400, 'INVALID_PADDING', 'Padding harus berupa bilangan bulat antara 0 dan 64.');
  }

  const autoColumns = Math.min(Math.max(Math.ceil(Math.sqrt(items.length)), 1), 8);
  const columns = options.columns ?? autoColumns;
  if (!Number.isInteger(columns) || columns < 1 || columns > 16) {
    throw new SpritesheetError(400, 'INVALID_COLUMNS', 'Kolom harus berupa bilangan bulat antara 1 dan 16.');
  }

  // Validate items
  const validatedItems = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new SpritesheetError(400, 'INVALID_ITEM', 'Objek spritesheet tidak valid.');
    }
    if (!item.id || typeof item.id !== 'string') {
      throw new SpritesheetError(400, 'INVALID_ITEM_ID', 'ID objek harus berupa string.');
    }
    if (!Number.isInteger(item.width) || item.width < 1 || !Number.isInteger(item.height) || item.height < 1) {
      throw new SpritesheetError(400, 'INVALID_ITEM_DIMENSIONS', 'Dimensi objek harus berupa bilangan bulat positif.');
    }
    if (!item.buffer && !item.filePath) {
      throw new SpritesheetError(400, 'MISSING_ITEM_SOURCE', 'Sumber file atau buffer objek diperlukan.');
    }
    validatedItems.push({
      id: item.id,
      category: item.category || 'unknown',
      width: item.width,
      height: item.height,
      source: item.buffer || item.filePath,
    });
  }

  // Divide into rows
  const rows = [];
  for (let i = 0; i < validatedItems.length; i += columns) {
    const rowItems = validatedItems.slice(i, i + columns);
    const rowHeight = Math.max(...rowItems.map(it => it.height));
    const rowWidth = padding + rowItems.reduce((acc, it) => acc + it.width + padding, 0);
    rows.push({ items: rowItems, rowHeight, rowWidth });
  }

  const sheetWidth = Math.max(...rows.map(r => r.rowWidth));
  const sheetHeight = padding + rows.reduce((acc, r) => acc + r.rowHeight + padding, 0);

  if (sheetWidth > MAX_DIMENSION || sheetHeight > MAX_DIMENSION || (sheetWidth * sheetHeight) > MAX_TOTAL_PIXELS) {
    throw new SpritesheetError(400, 'SPRITESHEET_DIMENSIONS_EXCEEDED', 'Ukuran total spritesheet melebihi batas yang diizinkan server.');
  }

  // Calculate coordinates and build composite operations
  const frames = {};
  const composites = [];
  let currentY = padding;

  for (const row of rows) {
    let currentX = padding;
    for (const item of row.items) {
      frames[item.id] = {
        frame: { x: currentX, y: currentY, w: item.width, h: item.height },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: item.width, h: item.height },
        sourceSize: { w: item.width, h: item.height },
        category: item.category,
      };

      composites.push({
        input: item.source,
        top: currentY,
        left: currentX,
      });

      currentX += item.width + padding;
    }
    currentY += row.rowHeight + padding;
  }

  // Composite into a single transparent PNG
  const canvas = sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const pngBuffer = await canvas
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const atlas = {
    meta: {
      app: 'IMMOExtract',
      version: '1.0',
      image: 'spritesheet.png',
      format: 'RGBA8888',
      size: { w: sheetWidth, h: sheetHeight },
      scale: 1,
    },
    frames,
  };

  return {
    pngBuffer,
    atlas,
    width: sheetWidth,
    height: sheetHeight,
    padding,
    columns,
  };
}
