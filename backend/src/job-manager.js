import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { writeZip } from './zip-export.js';

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

export function createJobManager({ uploadDir, jobDir, aiClient }) {
  const uploads = resolve(uploadDir || fileURLToPath(new URL('../../storage/uploads/', import.meta.url)));
  const root = resolve(jobDir || join(dirname(uploads), 'jobs'));
  const queue = [];
  const active = new Map();
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
      }
    })();
    return ready;
  }

  async function drain() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const { job, imagePath } = queue.shift();
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

  return {
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
        await writeZip(files, join(directory, 'archive.tmp'));
        await rename(join(directory, 'archive.tmp'), join(directory, 'archive.zip'));
        const manifest = {
          export_id: exportId, job_id: id, status: 'completed',
          object_ids: objectIds, created_at: new Date().toISOString(),
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
  };
}
