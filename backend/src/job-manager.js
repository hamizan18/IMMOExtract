import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
          const result = await aiClient.extractPath({ imagePath, outputPath, saveMaskPath, includeBase64: false });
          if (result.status !== 'success' || !Array.isArray(result.categories_present)) {
            throw new Error('Invalid extraction response');
          }
          const image = sharp(outputPath, { limitInputPixels: 24_000_000, failOn: 'warning' });
          const metadata = await image.metadata();
          const mask = sharp(saveMaskPath, { limitInputPixels: 24_000_000, failOn: 'warning' });
          const maskMetadata = await mask.metadata();
          if (metadata.format !== 'png' || metadata.channels !== 4 || !metadata.hasAlpha
              || maskMetadata.format !== 'png' || maskMetadata.width !== metadata.width
              || maskMetadata.height !== metadata.height) throw new Error('Invalid extraction files');
          const statistics = await image.stats();
          await mask.stats();
          // M3 yields one full-frame foreground, not individual ATR object files.
          job.objects = statistics.channels[3].max > 0 ? [{
            id: randomUUID(), category: 'human', file: 'extracted.png',
            width: metadata.width, height: metadata.height,
          }] : [];
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
      active.set(job.job_id, job);
      queue.push({ job, imagePath });
      setImmediate(() => { void drain(); });
      return { ...job };
    },
    async get(jobId) {
      const id = validateId(jobId, 'JOB');
      await initialize();
      if (active.get(id)?.error?.code === 'JOB_STORAGE_FAILED') return active.get(id);
      try {
        return JSON.parse(await readFile(join(root, id, 'manifest.json'), 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') throw new JobError(404, 'JOB_NOT_FOUND', 'Job tidak ditemukan.');
        throw error;
      }
    },
  };
}
