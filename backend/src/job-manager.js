import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { writeZip } from './zip-export.js';
import { pixelatePng } from './pixelation.js';
import { packSpritesheet, SpritesheetError } from './spritesheet.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const atrLabels = [
  'Background', 'Hat', 'Hair', 'Sunglasses', 'Upper-clothes', 'Skirt', 'Pants',
  'Dress', 'Belt', 'Left-shoe', 'Right-shoe', 'Face', 'Left-leg', 'Right-leg',
  'Left-arm', 'Right-arm', 'Bag', 'Scarf',
];

export class JobError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function validateId(id, kind) {
  if (typeof id !== 'string' || !uuid.test(id)) {
    throw new JobError(400, `INVALID_${kind}_ID`, 'ID harus berupa UUID v4 yang valid.');
  }
  return id.toLowerCase();
}

async function validateCategoryObjects(result, directory, width, height) {
  const counts = result.category_pixel_counts;
  if (!Array.isArray(result.objects) || !Array.isArray(result.categories_present)
      || !counts || typeof counts !== 'object' || Array.isArray(counts)) {
    throw new Error('Invalid category response');
  }
  for (const [category, count] of Object.entries(counts)) {
    if (!atrLabels.includes(category) || !Number.isInteger(count) || count < 0 || count > width * height) {
      throw new Error('Invalid category counts');
    }
  }
  const expected = atrLabels.slice(1).filter(category => counts[category] > 50);
  const present = new Set(result.categories_present);
  if (present.size !== result.categories_present.length || present.size !== expected.length
      || expected.some(category => !present.has(category)) || result.objects.length !== expected.length) {
    throw new Error('Incomplete category inventory');
  }
  const objects = [];
  const seen = new Set();
  for (const object of result.objects) {
    if (!object || typeof object !== 'object') throw new Error('Invalid category object');
    const { class_id, category, file, bbox, pixel_count } = object;
    if (!Number.isInteger(class_id) || class_id < 1 || class_id >= atrLabels.length
        || category !== atrLabels[class_id] || !present.has(category) || seen.has(class_id)
        || file !== `objects/atr-${class_id}.png`
        || !Number.isInteger(pixel_count) || pixel_count <= 50 || pixel_count !== counts[category]
        || !Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isInteger)) {
      throw new Error('Invalid category object metadata');
    }
    seen.add(class_id);
    const [left, top, right, bottom] = bbox;
    if (left < 0 || top < 0 || right > width || bottom > height || right <= left || bottom <= top
        || object.width !== right - left || object.height !== bottom - top
        || pixel_count > object.width * object.height) {
      throw new Error('Invalid category bounds');
    }
    const image = sharp(join(directory, file), { limitInputPixels: 24_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== 'png' || metadata.channels !== 4 || !metadata.hasAlpha
        || metadata.width !== object.width || metadata.height !== object.height) {
      throw new Error('Invalid category PNG');
    }
    // Decode every pixel: a readable PNG header alone does not prove a complete artifact.
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 4) throw new Error('Invalid category pixels');
    let opaquePixels = 0;
    for (let offset = 3; offset < data.length; offset += 4) {
      if (data[offset] !== 0 && data[offset] !== 255) throw new Error('Invalid category alpha');
      if (data[offset] === 255) opaquePixels++;
    }
    if (opaquePixels !== pixel_count) throw new Error('Invalid category pixel count');
    objects.push({
      id: randomUUID(), class_id, category, file, bbox: [...bbox],
      width: object.width, height: object.height, pixel_count,
    });
  }
  return objects;
}

function stylizationParameters(input) {
  const defaults = {
    preset: 'pixel-art', target_size: 256, num_inference_steps: 20,
    strength: 0.5, guidance_scale: 7.5, seed: 0,
  };
  const allowed = ['object_id', 'prompt', 'negative_prompt', ...Object.keys(defaults)];
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || !Object.hasOwn(input, 'object_id') || Object.keys(input).some(key => !allowed.includes(key))) {
    throw new JobError(400, 'INVALID_STYLIZATION_INPUT', 'Kirim object_id dan parameter stylization saja.');
  }
  const { object_id, ...options } = input;
  const parameters = { ...defaults, ...options };
  const { preset, target_size, num_inference_steps, strength, guidance_scale, seed } = parameters;
  if (!['pixel-art', 'retro-rpg', 'game-boy'].includes(preset)
      || !Number.isInteger(target_size) || target_size < 64 || target_size > 512 || target_size % 8
      || !Number.isInteger(num_inference_steps) || num_inference_steps < 2 || num_inference_steps > 50
      || !Number.isFinite(strength) || strength <= 0 || strength > 1 || Math.floor(strength * num_inference_steps) < 1
      || !Number.isFinite(guidance_scale) || guidance_scale < 0 || guidance_scale > 20
      || !Number.isSafeInteger(seed) || seed < 0
      || ['prompt', 'negative_prompt'].some(key => Object.hasOwn(options, key) && typeof options[key] !== 'string')) {
    throw new JobError(400, 'INVALID_STYLIZATION_INPUT', 'Parameter stylization tidak valid.');
  }
  return parameters;
}

function stylizationResult(result, parameters, width, height) {
  if (!result || result.status !== 'success'
      || !Array.isArray(result.original_size) || result.original_size.length !== 2
      || result.original_size[0] !== width || result.original_size[1] !== height
      || !Array.isArray(result.target_size) || result.target_size.length !== 2
      || result.target_size.some(size => size !== parameters.target_size)
      || typeof result.prompt !== 'string' || typeof result.negative_prompt !== 'string'
      || !Number.isInteger(result.steps_executed) || result.steps_executed < 1
      || result.strength !== parameters.strength || result.guidance_scale !== parameters.guidance_scale
      || result.seed !== parameters.seed || typeof result.nsfw_detected !== 'boolean'
      || !Number.isFinite(result.execution_time_seconds) || result.execution_time_seconds < 0) {
    throw new Error('Invalid stylization response');
  }
  return Object.fromEntries([
    'status', 'original_size', 'target_size', 'prompt', 'negative_prompt', 'steps_executed',
    'strength', 'guidance_scale', 'seed', 'nsfw_detected', 'execution_time_seconds',
  ].map(key => [key, result[key]]));
}

async function stylizationPixels(filePath) {
  const image = sharp(filePath, { limitInputPixels: 24_000_000, failOn: 'warning' });
  const metadata = await image.metadata();
  if (metadata.format !== 'png' || !metadata.hasAlpha || metadata.channels !== 4
      || metadata.width > 8192 || metadata.height > 8192 || (metadata.pages ?? 1) !== 1) {
    throw new Error('Invalid stylization PNG');
  }
  return image.raw().toBuffer({ resolveWithObject: true });
}

export function createJobManager({ uploadDir, jobDir, aiClient }) {
  const uploads = resolve(uploadDir || fileURLToPath(new URL('../../storage/uploads/', import.meta.url)));
  const root = resolve(jobDir || join(dirname(uploads), 'jobs'));
  const queue = [];
  const active = new Map();
  const activeStylizations = new Map();
  let running = false;
  let ready;

  async function save(job) {
    const directory = join(root, job.job_id);
    const temporary = join(directory, 'manifest.tmp');
    await writeFile(temporary, JSON.stringify(job, null, 2) + '\n', { mode: 0o600 });
    await rename(temporary, join(directory, 'manifest.json'));
    // Poll committed snapshots while active: Windows cannot replace an open manifest.
    if (active.has(job.job_id)) active.set(job.job_id, { ...job });
  }

  async function canonicalFile(...parts) {
    const expected = join(await realpath(root), ...parts);
    if (await realpath(expected) !== expected) throw new Error('Invalid stylization file location');
    if (!(await stat(expected)).isFile()) {
      throw new JobError(404, 'STYLIZATION_NOT_FOUND', 'File hasil tidak ditemukan.');
    }
    return expected;
  }

  async function saveStylization(snapshot) {
    const directory = join(await realpath(root), snapshot.job_id, 'stylizations', snapshot.stylization_id);
    if (await realpath(directory) !== directory) throw new Error('Invalid stylization directory');
    await writeFile(join(directory, 'manifest.tmp'), JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600 });
    await rename(join(directory, 'manifest.tmp'), join(directory, 'manifest.json'));
    if (activeStylizations.has(snapshot.stylization_id)) {
      activeStylizations.set(snapshot.stylization_id, { ...snapshot });
    }
  }

  async function recoverStylizations(jobId) {
    const directory = join(await realpath(root), jobId, 'stylizations');
    let entries;
    try {
      if (await realpath(directory) !== directory) throw new Error('Invalid stylization directory');
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !uuid.test(entry.name)) continue;
      let snapshot;
      try {
        const manifest = await canonicalFile(jobId, 'stylizations', entry.name, 'manifest.json');
        snapshot = JSON.parse(await readFile(manifest, 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      if (snapshot.job_id !== jobId || snapshot.stylization_id !== entry.name) {
        throw new Error('Invalid stored stylization ID');
      }
      if (['queued', 'processing'].includes(snapshot.status)) {
        snapshot.status = 'failed';
        snapshot.error = {
          code: 'STYLIZATION_INTERRUPTED', message: 'Backend berhenti sebelum stylization selesai. Buat permintaan baru.',
        };
        snapshot.updated_at = new Date().toISOString();
        await saveStylization(snapshot);
      }
    }
  }

  async function processStylization(snapshot) {
    const key = snapshot.stylization_id;
    try {
      snapshot.status = 'processing';
      snapshot.progress = 10;
      snapshot.updated_at = new Date().toISOString();
      await saveStylization(snapshot);
      // Resolve again when dequeued: a source can disappear while waiting.
      const { filePath } = await manager.getObject(snapshot.job_id, snapshot.object_id);
      const source = await stylizationPixels(filePath);
      const directory = join(await realpath(root), snapshot.job_id, 'stylizations', key);
      if (await realpath(directory) !== directory) throw new Error('Invalid stylization directory');
      const result = await aiClient.stylizePath({
        imagePath: filePath, outputPath: join(directory, 'image.tmp.png'), parameters: snapshot.parameters,
      });
      const outputPath = await canonicalFile(snapshot.job_id, 'stylizations', key, 'image.tmp.png');
      const output = await stylizationPixels(outputPath);
      if (source.info.width !== output.info.width || source.info.height !== output.info.height
          || source.info.channels !== 4 || output.info.channels !== 4) throw new Error('Invalid stylization dimensions');
      for (let offset = 3; offset < source.data.length; offset += 4) {
        if (source.data[offset] !== output.data[offset]) throw new Error('Invalid stylization alpha');
      }
      snapshot.result = stylizationResult(result, snapshot.parameters, output.info.width, output.info.height);
      snapshot.width = output.info.width;
      snapshot.height = output.info.height;
      await rename(outputPath, join(directory, 'image.png'));
      snapshot.status = 'completed';
      snapshot.progress = 100;
    } catch (error) {
      console.error('Job stylization failed:', error.code || error.name);
      snapshot.status = 'failed';
      delete snapshot.result;
      delete snapshot.width;
      delete snapshot.height;
      snapshot.error = {
        code: error.name === 'TimeoutError' ? 'STYLIZATION_TIMEOUT' : 'STYLIZATION_FAILED',
        message: 'Stylization gagal. Periksa layanan AI, batas waktu dan storage server.',
      };
      // A timeout does not cancel the remote model: retain its private staging directory.
    }
    snapshot.updated_at = new Date().toISOString();
    try {
      await saveStylization(snapshot);
      activeStylizations.delete(key);
    } catch (error) {
      snapshot.status = 'failed';
      snapshot.error = { code: 'STYLIZATION_STORAGE_FAILED', message: 'Hasil stylization tidak dapat disimpan.' };
      delete snapshot.result;
      delete snapshot.width;
      delete snapshot.height;
      activeStylizations.set(key, { ...snapshot });
      console.error('Stylization persistence failed:', error.code || error.name);
    }
  }

  function initialize() {
    // One backend process owns this directory. Interrupted work is never silently retried.
    ready ??= (async () => {
      await mkdir(root, { recursive: true, mode: 0o700 });
      for (const entry of await readdir(root, { withFileTypes: true })) {
        if (!entry.isDirectory() || !uuid.test(entry.name)) continue;
        let job;
        try {
          job = JSON.parse(await readFile(join(root, entry.name, 'manifest.json'), 'utf8'));
        } catch (error) {
          if (error.code === 'ENOENT') continue;
          throw error;
        }
        if (job.job_id !== entry.name) throw new Error('Invalid stored job ID');
        if (['queued', 'processing'].includes(job.status)) {
          job.status = 'failed';
          job.error = { code: 'JOB_INTERRUPTED', message: 'Backend berhenti sebelum job selesai. Buat job baru untuk mencoba lagi.' };
          job.updated_at = new Date().toISOString();
          await save(job);
        }
        await recoverStylizations(entry.name);
      }
    })();
    return ready;
  }

  async function drain() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const work = queue.shift();
        if (work.stylization) {
          await processStylization(work.stylization);
          continue;
        }
        const { job, imagePath } = work;
        try {
          job.status = 'processing';
          job.progress = 10;
          job.updated_at = new Date().toISOString();
          await save(job);
          const directory = join(root, job.job_id);
          const outputPath = join(directory, 'extracted.png');
          const saveMaskPath = join(directory, 'mask.png');
          const result = await aiClient.extractPath({
            imagePath, outputPath, saveMaskPath, objectsDir: join(directory, 'objects'), includeBase64: false,
          });
          if (!result || result.status !== 'success') {
            throw new Error('Invalid extraction response');
          }
          const image = sharp(outputPath, { limitInputPixels: 24_000_000, failOn: 'warning' });
          const metadata = await image.metadata();
          const sourceMetadata = await sharp(imagePath, { limitInputPixels: 24_000_000 }).metadata();
          const mask = sharp(saveMaskPath, { limitInputPixels: 24_000_000, failOn: 'warning' });
          const maskMetadata = await mask.metadata();
          if (metadata.format !== 'png' || metadata.channels !== 4 || !metadata.hasAlpha
              || maskMetadata.format !== 'png' || maskMetadata.width !== metadata.width
              || maskMetadata.height !== metadata.height || metadata.width !== sourceMetadata.width
              || metadata.height !== sourceMetadata.height
              || !Array.isArray(result.original_size) || result.original_size.length !== 2
              || result.original_size[0] !== sourceMetadata.width
              || result.original_size[1] !== sourceMetadata.height) throw new Error('Invalid extraction files');
          const statistics = await image.stats();
          await mask.stats();
          const categoryObjects = await validateCategoryObjects(result, directory, metadata.width, metadata.height);
          // Retain the full-frame foreground alongside the semantic ATR crops.
          const foregroundObjects = statistics.channels[3].max > 0 ? [{
            id: randomUUID(), category: 'human', file: 'extracted.png',
            width: metadata.width, height: metadata.height,
          }] : [];
          job.objects = [...foregroundObjects, ...categoryObjects];
          job.extraction = {
            original_size: result.original_size,
            categories_present: result.categories_present,
            category_pixel_counts: result.category_pixel_counts,
            execution_time_seconds: result.execution_time_seconds,
          };
          job.mask_file = 'mask.png';
          job.status = 'completed';
          job.progress = 100;
        } catch (error) {
          console.error('Job extraction failed:', error.code || error.name);
          job.status = 'failed';
          job.objects = [];
          job.error = { code: 'EXTRACTION_FAILED', message: 'Ekstraksi gagal. Periksa layanan AI dan storage server.' };
        }
        job.updated_at = new Date().toISOString();
        try {
          await save(job);
          active.delete(job.job_id);
        } catch (error) {
          // Keep a truthful terminal state available for polling even if disk writes fail.
          job.status = 'failed';
          job.objects = [];
          job.error = { code: 'JOB_STORAGE_FAILED', message: 'Hasil job tidak dapat disimpan.' };
          active.set(job.job_id, { ...job });
          console.error('Job persistence failed:', error.code || error.name);
        }
      }
    } finally {
      running = false;
    }
  }

  const manager = {
    async create(uploadId) {
      const id = validateId(uploadId, 'UPLOAD');
      await initialize();
      const directory = join(uploads, id);
      let manifest;
      try {
        manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') throw new JobError(404, 'UPLOAD_NOT_FOUND', 'Upload tidak ditemukan.');
        throw error;
      }
      if (manifest.upload_id !== id || !/^original\.(png|jpg|webp)$/.test(manifest.file)) {
        throw new Error('Invalid upload manifest');
      }
      const imagePath = join(directory, manifest.file);
      try {
        if (!(await stat(imagePath)).isFile()) throw new Error('Input is not a file');
      } catch (error) {
        if (error.code === 'ENOENT') throw new JobError(404, 'INPUT_NOT_FOUND', 'Gambar input tidak ditemukan.');
        throw error;
      }
      const now = new Date().toISOString();
      const job = {
        job_id: randomUUID(), upload_id: id, status: 'queued', progress: 0,
        created_at: now, updated_at: now, objects: [], error: null,
      };
      await mkdir(join(root, job.job_id), { mode: 0o700 });
      await save(job);
      active.set(job.job_id, { ...job });
      queue.push({ job, imagePath });
      setImmediate(() => { void drain(); });
      return { ...job };
    },
    async get(jobId) {
      const id = validateId(jobId, 'JOB');
      await initialize();
      if (active.has(id)) return active.get(id);
      try {
        return JSON.parse(await readFile(join(root, id, 'manifest.json'), 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') throw new JobError(404, 'JOB_NOT_FOUND', 'Job tidak ditemukan.');
        throw error;
      }
    },
    async getObject(jobId, objectId) {
      const id = validateId(jobId, 'JOB');
      const objectKey = validateId(objectId, 'OBJECT');
      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') {
        throw new JobError(409, 'JOB_NOT_COMPLETED', 'Hasil hanya tersedia setelah job selesai.');
      }
      const object = job.objects.find(object => object.id === objectKey);
      if (!object) throw new JobError(404, 'OBJECT_NOT_FOUND', 'Objek tidak ditemukan pada job ini.');
      // Only generated PNG names are valid, even if a stored manifest is damaged.
      if (typeof object.file !== 'string'
          || !/^(extracted\.png|objects\/atr-([1-9]|1[0-7])\.png)$/.test(object.file)) {
        throw new Error('Invalid object file');
      }
      try {
        const directory = join(await realpath(root), id);
        const expected = join(directory, object.file);
        const filePath = await realpath(expected);
        // Reject symlinks/junctions redirecting a job or its files elsewhere.
        if (filePath !== expected) throw new Error('Invalid object file location');
        if (!(await stat(filePath)).isFile()) {
          throw new JobError(404, 'OBJECT_FILE_NOT_FOUND', 'File objek tidak ditemukan.');
        }
        return { filePath, filename: `${objectKey}.png` };
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new JobError(404, 'OBJECT_FILE_NOT_FOUND', 'File objek tidak ditemukan.');
        }
        throw error;
      }
    },
    async updateObject(jobId, objectId, buffer) {
      const id = validateId(jobId, 'JOB');
      const objectKey = validateId(objectId, 'OBJECT');
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new JobError(400, 'INVALID_PNG_INPUT', 'Kirim file PNG biner yang valid.');
      }
      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') {
        throw new JobError(409, 'JOB_NOT_COMPLETED', 'Hanya job yang selesai yang dapat dikoreksi.');
      }
      const object = job.objects.find(obj => obj.id === objectKey);
      if (!object) throw new JobError(404, 'OBJECT_NOT_FOUND', 'Objek tidak ditemukan pada job ini.');
      const { filePath } = await this.getObject(id, objectKey);

      let metadata;
      try {
        const image = sharp(buffer, { limitInputPixels: 24_000_000, failOn: 'warning' });
        metadata = await image.metadata();
      } catch {
        throw new JobError(400, 'INVALID_PNG_IMAGE', 'File harus berupa PNG yang valid.');
      }

      if (metadata.format !== 'png' || metadata.channels !== 4 || !metadata.hasAlpha) {
        throw new JobError(400, 'INVALID_PNG_FORMAT', 'PNG harus memiliki saluran warna RGBA dengan transparansi alpha.');
      }
      if (metadata.width !== object.width || metadata.height !== object.height) {
        throw new JobError(400, 'INVALID_PNG_DIMENSIONS', `Dimensi gambar harus sama persis dengan objek asli (${object.width} × ${object.height} piksel).`);
      }

      const { data, info } = await sharp(buffer, { limitInputPixels: 24_000_000 }).raw().toBuffer({ resolveWithObject: true });
      if (info.width !== object.width || info.height !== object.height || info.channels !== 4) {
        throw new JobError(400, 'INVALID_PNG_PIXELS', 'Data piksel PNG tidak valid.');
      }

      let opaquePixels = 0;
      for (let offset = 3; offset < data.length; offset += 4) {
        if (data[offset] > 0) opaquePixels++;
      }

      const directory = dirname(filePath);
      const tempPath = join(directory, `${basename(filePath)}.tmp`);
      await writeFile(tempPath, buffer, { mode: 0o600 });
      await rename(tempPath, filePath);

      object.updated_at = new Date().toISOString();
      if (typeof object.pixel_count === 'number') {
        object.pixel_count = opaquePixels;
      }
      job.updated_at = new Date().toISOString();
      await save(job);

      return {
        id: object.id,
        category: object.category,
        width: object.width,
        height: object.height,
        pixel_count: object.pixel_count,
        updated_at: object.updated_at,
      };
    },
    async createStylization(jobId, input) {
      const id = validateId(jobId, 'JOB');
      const parameters = stylizationParameters(input);
      const objectId = validateId(input.object_id, 'OBJECT');
      await this.getObject(id, objectId);
      const jobDirectory = join(await realpath(root), id);
      if (await realpath(jobDirectory) !== jobDirectory) throw new Error('Invalid job directory');
      const resultsDirectory = join(jobDirectory, 'stylizations');
      await mkdir(resultsDirectory, { recursive: true, mode: 0o700 });
      if (await realpath(resultsDirectory) !== resultsDirectory) throw new Error('Invalid stylization directory');
      const key = randomUUID();
      await mkdir(join(resultsDirectory, key), { mode: 0o700 });
      const now = new Date().toISOString();
      const snapshot = {
        stylization_id: key, job_id: id, object_id: objectId,
        status: 'queued', progress: 0, parameters, created_at: now, updated_at: now, error: null,
      };
      await saveStylization(snapshot);
      activeStylizations.set(key, { ...snapshot });
      queue.push({ stylization: snapshot });
      setImmediate(() => { void drain(); });
      return { ...snapshot };
    },
    async getStylization(jobId, stylizationId) {
      const id = validateId(jobId, 'JOB');
      const key = validateId(stylizationId, 'STYLIZATION');
      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') throw new JobError(409, 'JOB_NOT_COMPLETED', 'Job ekstraksi belum selesai.');
      let snapshot = activeStylizations.get(key);
      if (snapshot && snapshot.job_id !== id) {
        throw new JobError(404, 'STYLIZATION_NOT_FOUND', 'Hasil stylization tidak ditemukan.');
      }
      if (!snapshot) {
        try {
          const path = await canonicalFile(id, 'stylizations', key, 'manifest.json');
          snapshot = JSON.parse(await readFile(path, 'utf8'));
        } catch (error) {
          if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            throw new JobError(404, 'STYLIZATION_NOT_FOUND', 'Hasil stylization tidak ditemukan.');
          }
          throw error;
        }
      }
      if (snapshot.job_id !== id || snapshot.stylization_id !== key
          || !job.objects.some(object => object.id === snapshot.object_id)
          || !['queued', 'processing', 'completed', 'failed'].includes(snapshot.status)
          || !snapshot.parameters || typeof snapshot.parameters !== 'object' || Array.isArray(snapshot.parameters)
          || ![0, 10, 100].includes(snapshot.progress)
          || typeof snapshot.created_at !== 'string' || typeof snapshot.updated_at !== 'string') {
        throw new Error('Invalid stylization manifest');
      }
      const parameters = stylizationParameters({ ...snapshot.parameters, object_id: snapshot.object_id });
      let error = null;
      if (snapshot.status === 'failed') {
        if (!['STYLIZATION_FAILED', 'STYLIZATION_TIMEOUT', 'STYLIZATION_STORAGE_FAILED', 'STYLIZATION_INTERRUPTED']
          .includes(snapshot.error?.code)) throw new Error('Invalid stylization error');
        error = { code: snapshot.error.code, message: 'Stylization gagal. Periksa layanan AI, batas waktu dan storage server.' };
      }
      const output = {
        stylization_id: key, job_id: id, object_id: snapshot.object_id, status: snapshot.status,
        progress: snapshot.progress, parameters, created_at: snapshot.created_at, updated_at: snapshot.updated_at,
        error,
      };
      if (snapshot.status === 'completed') {
        if (!Number.isInteger(snapshot.width) || !Number.isInteger(snapshot.height)
            || snapshot.width < 1 || snapshot.height < 1 || Math.max(snapshot.width, snapshot.height) > 8192
            || snapshot.width * snapshot.height > 24_000_000) throw new Error('Invalid stylization dimensions');
        output.width = snapshot.width;
        output.height = snapshot.height;
        output.result = stylizationResult(snapshot.result, parameters, snapshot.width, snapshot.height);
      }
      return output;
    },
    async getStylizationFile(jobId, stylizationId) {
      const snapshot = await this.getStylization(jobId, stylizationId);
      if (snapshot.status !== 'completed') {
        throw new JobError(409, 'STYLIZATION_NOT_COMPLETED', 'PNG hanya tersedia setelah stylization selesai.');
      }
      try {
        const filePath = await canonicalFile(snapshot.job_id, 'stylizations', snapshot.stylization_id, 'image.png');
        return { filePath, filename: `${snapshot.stylization_id}.png` };
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new JobError(404, 'STYLIZATION_NOT_FOUND', 'File stylization tidak ditemukan.');
        }
        throw error;
      }
    },
    async createPixelation(jobId, input) {
      const id = validateId(jobId, 'JOB');
      if (!input || typeof input !== 'object' || Array.isArray(input)
          || Object.keys(input).some(key => !['object_id', 'size', 'palette'].includes(key))
          || !Object.hasOwn(input, 'object_id') || ![16, 32, 64, 128].includes(input.size)
          || (Object.hasOwn(input, 'palette') && !['original', 'retro16'].includes(input.palette))) {
        throw new JobError(400, 'INVALID_PIXELATION_INPUT', 'Kirim object_id, size angka 16/32/64/128, dan opsional palette original/retro16.');
      }
      const palette = input.palette ?? 'original';
      const objectId = validateId(input.object_id, 'OBJECT');
      const { filePath } = await this.getObject(id, objectId);
      const png = await pixelatePng(await readFile(filePath), input.size, palette);
      const { width, height } = await sharp(png).metadata();
      const jobDirectory = join(await realpath(root), id);
      if (await realpath(jobDirectory) !== jobDirectory) throw new Error('Invalid job directory');
      const resultsDirectory = join(jobDirectory, 'pixelations');
      await mkdir(resultsDirectory, { recursive: true, mode: 0o700 });
      if (await realpath(resultsDirectory) !== resultsDirectory) throw new Error('Invalid pixelation directory');
      const pixelationId = randomUUID();
      const directory = join(resultsDirectory, pixelationId);
      await mkdir(directory, { mode: 0o700 });
      try {
        await writeFile(join(directory, 'image.tmp'), png, { flag: 'wx', mode: 0o600 });
        await rename(join(directory, 'image.tmp'), join(directory, 'image.png'));
        const manifest = {
          pixelation_id: pixelationId, job_id: id, object_id: objectId, status: 'completed',
          size: input.size, palette, width, height, created_at: new Date().toISOString(),
        };
        await writeFile(join(directory, 'manifest.tmp'), JSON.stringify(manifest, null, 2) + '\n', {
          flag: 'wx', mode: 0o600,
        });
        // Publish last; the terminal job and its original PNG/ZIP files stay untouched.
        await rename(join(directory, 'manifest.tmp'), join(directory, 'manifest.json'));
        return manifest;
      } catch (error) {
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
    },
    async getPixelation(jobId, pixelationId) {
      const id = validateId(jobId, 'JOB');
      const key = validateId(pixelationId, 'PIXELATION');
      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') {
        throw new JobError(409, 'JOB_NOT_COMPLETED', 'Hasil hanya tersedia setelah job selesai.');
      }
      try {
        const directory = join(await realpath(root), id, 'pixelations', key);
        const manifestPath = join(directory, 'manifest.json');
        if (await realpath(manifestPath) !== manifestPath) throw new Error('Invalid pixelation manifest location');
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        if (manifest.pixelation_id !== key || manifest.job_id !== id || manifest.status !== 'completed'
            || !job.objects.some(object => object.id === manifest.object_id)
            || ![16, 32, 64, 128].includes(manifest.size)
            || (Object.hasOwn(manifest, 'palette') && !['original', 'retro16'].includes(manifest.palette))
            || !Number.isInteger(manifest.width) || manifest.width < 1
            || !Number.isInteger(manifest.height) || manifest.height < 1
            || Math.max(manifest.width, manifest.height) !== manifest.size) {
          throw new Error('Invalid pixelation manifest');
        }
        const expected = join(directory, 'image.png');
        const filePath = await realpath(expected);
        if (filePath !== expected) throw new Error('Invalid pixelation file location');
        if (!(await stat(filePath)).isFile()) {
          throw new JobError(404, 'PIXELATION_NOT_FOUND', 'File pixelation tidak ditemukan.');
        }
        return { filePath, filename: `${key}.png` };
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new JobError(404, 'PIXELATION_NOT_FOUND', 'File pixelation tidak ditemukan.');
        }
        throw error;
      }
    },
    async createExport(jobId, selection) {
      const id = validateId(jobId, 'JOB');
      if (!selection || typeof selection !== 'object' || Array.isArray(selection)
          || Object.keys(selection).length !== 1
          || !(selection.all === true || (Array.isArray(selection.object_ids) && selection.object_ids.length > 0))) {
        throw new JobError(400, 'INVALID_EXPORT_INPUT', 'Kirim hanya all: true atau object_ids yang tidak kosong.');
      }
      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') {
        throw new JobError(409, 'JOB_NOT_COMPLETED', 'Hasil hanya tersedia setelah job selesai.');
      }
      const objectIds = (selection.all === true ? job.objects.map(object => object.id) : selection.object_ids)
        .map(objectId => validateId(objectId, 'OBJECT'));
      if (!objectIds.length) throw new JobError(409, 'EXPORT_EMPTY', 'Tidak ada objek untuk diekspor.');
      if (new Set(objectIds).size !== objectIds.length) {
        throw new JobError(400, 'DUPLICATE_OBJECT_ID', 'Setiap objek hanya boleh dipilih satu kali.');
      }
      const files = [];
      for (const objectId of objectIds) files.push(await this.getObject(id, objectId));
      const jobDirectory = join(await realpath(root), id);
      if (await realpath(jobDirectory) !== jobDirectory) throw new Error('Invalid job directory');
      const exportsDirectory = join(jobDirectory, 'exports');
      await mkdir(exportsDirectory, { recursive: true, mode: 0o700 });
      if (await realpath(exportsDirectory) !== exportsDirectory) throw new Error('Invalid export directory');
      const exportId = randomUUID();
      const directory = join(exportsDirectory, exportId);
      await mkdir(directory, { mode: 0o700 });
      try {
        const { size, sha256 } = await writeZip(files, join(directory, 'archive.tmp'));
        await rename(join(directory, 'archive.tmp'), join(directory, 'archive.zip'));
        const manifest = {
          export_id: exportId,
          job_id: id,
          status: 'completed',
          object_ids: objectIds,
          files_count: objectIds.length,
          archive_size: size,
          sha256,
          created_at: new Date().toISOString(),
        };
        await writeFile(join(directory, 'manifest.tmp'), JSON.stringify(manifest, null, 2) + '\n', {
          flag: 'wx', mode: 0o600,
        });
        // Publish only after ZIP completion, without rewriting the job manifest.
        await rename(join(directory, 'manifest.tmp'), join(directory, 'manifest.json'));
        return manifest;
      } catch (error) {
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
    },
    async getExportManifest(jobId, exportId) {
      const id = validateId(jobId, 'JOB');
      const key = validateId(exportId, 'EXPORT');
      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') {
        throw new JobError(409, 'JOB_NOT_COMPLETED', 'Hasil hanya tersedia setelah job selesai.');
      }
      try {
        const directory = join(await realpath(root), id, 'exports', key);
        const manifestPath = join(directory, 'manifest.json');
        if (await realpath(manifestPath) !== manifestPath) throw new Error('Invalid export manifest location');
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        if (manifest.export_id !== key || manifest.job_id !== id || manifest.status !== 'completed'
            || !Array.isArray(manifest.object_ids) || !manifest.object_ids.length
            || new Set(manifest.object_ids).size !== manifest.object_ids.length
            || manifest.object_ids.some(objectId => !job.objects.some(object => object.id === objectId))) {
          throw new Error('Invalid export manifest');
        }
        const expected = join(directory, 'archive.zip');
        const filePath = await realpath(expected);
        if (filePath !== expected) throw new Error('Invalid export file location');
        const archiveStat = await stat(filePath);
        if (!archiveStat.isFile()) throw new JobError(404, 'EXPORT_NOT_FOUND', 'File ekspor tidak ditemukan.');
        return {
          export_id: manifest.export_id,
          job_id: manifest.job_id,
          status: manifest.status,
          object_ids: manifest.object_ids,
          files_count: typeof manifest.files_count === 'number' ? manifest.files_count : manifest.object_ids.length,
          archive_size: typeof manifest.archive_size === 'number' ? manifest.archive_size : archiveStat.size,
          sha256: typeof manifest.sha256 === 'string' ? manifest.sha256 : null,
          created_at: manifest.created_at,
        };
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new JobError(404, 'EXPORT_NOT_FOUND', 'File ekspor tidak ditemukan.');
        }
        throw error;
      }
    },
    async getExport(jobId, exportId) {
      const id = validateId(jobId, 'JOB');
      const key = validateId(exportId, 'EXPORT');
      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') {
        throw new JobError(409, 'JOB_NOT_COMPLETED', 'Hasil hanya tersedia setelah job selesai.');
      }
      try {
        const directory = join(await realpath(root), id, 'exports', key);
        const manifestPath = join(directory, 'manifest.json');
        if (await realpath(manifestPath) !== manifestPath) throw new Error('Invalid export manifest location');
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        if (manifest.export_id !== key || manifest.job_id !== id || manifest.status !== 'completed'
            || !Array.isArray(manifest.object_ids) || !manifest.object_ids.length
            || new Set(manifest.object_ids).size !== manifest.object_ids.length
            || manifest.object_ids.some(objectId => !job.objects.some(object => object.id === objectId))) {
          throw new Error('Invalid export manifest');
        }
        const expected = join(directory, 'archive.zip');
        const filePath = await realpath(expected);
        if (filePath !== expected) throw new Error('Invalid export file location');
        if (!(await stat(filePath)).isFile()) throw new JobError(404, 'EXPORT_NOT_FOUND', 'File ekspor tidak ditemukan.');
        return { filePath, filename: `${key}.zip` };
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new JobError(404, 'EXPORT_NOT_FOUND', 'File ekspor tidak ditemukan.');
        }
        throw error;
      }
    },
    async createSpritesheet(jobId, input) {
      const id = validateId(jobId, 'JOB');
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new JobError(400, 'INVALID_SPRITESHEET_INPUT', 'Kirim JSON all: true atau object_ids.');
      }
      if (Object.keys(input).some(k => !['all', 'object_ids', 'padding', 'columns'].includes(k))) {
        throw new JobError(400, 'INVALID_SPRITESHEET_INPUT', 'Parameter tidak dikenal.');
      }
      if (!(input.all === true || (Array.isArray(input.object_ids) && input.object_ids.length > 0))) {
        throw new JobError(400, 'INVALID_SPRITESHEET_INPUT', 'Kirim all: true atau object_ids yang tidak kosong.');
      }

      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') {
        throw new JobError(409, 'JOB_NOT_COMPLETED', 'Hasil hanya tersedia setelah job selesai.');
      }

      const objectIds = (input.all === true ? job.objects.map(object => object.id) : input.object_ids)
        .map(objectId => validateId(objectId, 'OBJECT'));
      if (!objectIds.length) throw new JobError(409, 'SPRITESHEET_EMPTY', 'Tidak ada objek untuk dibuat spritesheet.');
      if (new Set(objectIds).size !== objectIds.length) {
        throw new JobError(400, 'DUPLICATE_OBJECT_ID', 'Setiap objek hanya boleh dipilih satu kali.');
      }

      const items = [];
      for (const objectId of objectIds) {
        const object = job.objects.find(obj => obj.id === objectId);
        if (!object) throw new JobError(404, 'OBJECT_NOT_FOUND', 'Objek tidak ditemukan pada job ini.');
        const { filePath } = await this.getObject(id, objectId);
        items.push({
          id: object.id,
          category: object.category,
          width: object.width,
          height: object.height,
          filePath,
        });
      }

      let packResult;
      try {
        packResult = await packSpritesheet(items, { padding: input.padding, columns: input.columns });
      } catch (err) {
        if (err instanceof SpritesheetError) {
          throw new JobError(err.status, err.code, err.message);
        }
        throw err;
      }

      const jobDirectory = join(await realpath(root), id);
      if (await realpath(jobDirectory) !== jobDirectory) throw new Error('Invalid job directory');
      const spritesheetsDirectory = join(jobDirectory, 'spritesheets');
      await mkdir(spritesheetsDirectory, { recursive: true, mode: 0o700 });
      if (await realpath(spritesheetsDirectory) !== spritesheetsDirectory) throw new Error('Invalid spritesheet directory');

      const spritesheetId = randomUUID();
      const directory = join(spritesheetsDirectory, spritesheetId);
      await mkdir(directory, { mode: 0o700 });

      try {
        await writeFile(join(directory, 'spritesheet.tmp'), packResult.pngBuffer, { flag: 'wx', mode: 0o600 });
        await rename(join(directory, 'spritesheet.tmp'), join(directory, 'spritesheet.png'));

        await writeFile(join(directory, 'atlas.tmp'), JSON.stringify(packResult.atlas, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await rename(join(directory, 'atlas.tmp'), join(directory, 'atlas.json'));

        const manifest = {
          spritesheet_id: spritesheetId,
          job_id: id,
          status: 'completed',
          object_ids: objectIds,
          width: packResult.width,
          height: packResult.height,
          padding: packResult.padding,
          columns: packResult.columns,
          created_at: new Date().toISOString(),
        };

        await writeFile(join(directory, 'manifest.tmp'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await rename(join(directory, 'manifest.tmp'), join(directory, 'manifest.json'));

        return manifest;
      } catch (error) {
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
    },
    async getSpritesheet(jobId, spritesheetId) {
      const id = validateId(jobId, 'JOB');
      const key = validateId(spritesheetId, 'SPRITESHEET');
      const job = await this.get(id);
      if (job.job_id !== id || !Array.isArray(job.objects)) throw new Error('Invalid job manifest');
      if (job.status !== 'completed') {
        throw new JobError(409, 'JOB_NOT_COMPLETED', 'Hasil hanya tersedia setelah job selesai.');
      }
      try {
        const directory = join(await realpath(root), id, 'spritesheets', key);
        const manifestPath = join(directory, 'manifest.json');
        if (await realpath(manifestPath) !== manifestPath) throw new Error('Invalid spritesheet manifest location');
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        if (manifest.spritesheet_id !== key || manifest.job_id !== id || manifest.status !== 'completed'
            || !Array.isArray(manifest.object_ids) || !manifest.object_ids.length
            || new Set(manifest.object_ids).size !== manifest.object_ids.length
            || manifest.object_ids.some(objectId => !job.objects.some(object => object.id === objectId))) {
          throw new Error('Invalid spritesheet manifest');
        }
        return manifest;
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new JobError(404, 'SPRITESHEET_NOT_FOUND', 'Spritesheet tidak ditemukan.');
        }
        throw error;
      }
    },
    async getSpritesheetFile(jobId, spritesheetId) {
      await this.getSpritesheet(jobId, spritesheetId);
      const id = validateId(jobId, 'JOB');
      const key = validateId(spritesheetId, 'SPRITESHEET');
      try {
        const expected = join(await realpath(root), id, 'spritesheets', key, 'spritesheet.png');
        const filePath = await realpath(expected);
        if (filePath !== expected) throw new Error('Invalid spritesheet file location');
        if (!(await stat(filePath)).isFile()) throw new JobError(404, 'SPRITESHEET_NOT_FOUND', 'File spritesheet tidak ditemukan.');
        return { filePath, filename: `${key}.png` };
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new JobError(404, 'SPRITESHEET_NOT_FOUND', 'File spritesheet tidak ditemukan.');
        }
        throw error;
      }
    },
    async getSpritesheetAtlas(jobId, spritesheetId) {
      await this.getSpritesheet(jobId, spritesheetId);
      const id = validateId(jobId, 'JOB');
      const key = validateId(spritesheetId, 'SPRITESHEET');
      try {
        const expected = join(await realpath(root), id, 'spritesheets', key, 'atlas.json');
        const filePath = await realpath(expected);
        if (filePath !== expected) throw new Error('Invalid atlas file location');
        if (!(await stat(filePath)).isFile()) throw new JobError(404, 'ATLAS_NOT_FOUND', 'File atlas tidak ditemukan.');
        return { filePath, filename: `${key}.atlas.json` };
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new JobError(404, 'ATLAS_NOT_FOUND', 'File atlas tidak ditemukan.');
        }
        throw error;
      }
    },
  };
  return manager;
}
