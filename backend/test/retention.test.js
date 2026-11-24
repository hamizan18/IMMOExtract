import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, readdir, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { createJobManager } from '../src/job-manager.js';

const HOUR_MS = 60 * 60 * 1000;
const RETENTION_MS = 24 * HOUR_MS;
const BASE_TIME_MS = Date.parse('2026-11-24T12:00:00.000Z');

function isoAt(offsetMs) {
  return new Date(BASE_TIME_MS + offsetMs).toISOString();
}

async function seedUpload(uploadDir, uploadId, { createdAt, extractedAt } = {}) {
  const dir = join(uploadDir, uploadId);
  await mkdir(dir, { recursive: true });
  const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: 'red' } }).png().toBuffer();
  await writeFile(join(dir, 'original.png'), png);
  const manifest = {
    upload_id: uploadId,
    status: extractedAt ? 'extracted' : 'uploaded',
    image: { format: 'png', width: 8, height: 8, bytes: png.length },
    file: 'original.png',
    created_at: createdAt ?? isoAt(0),
    ...(extractedAt ? { extracted_at: extractedAt } : {}),
  };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
}

async function seedJob(jobDir, jobId, {
  uploadId = randomUUID(),
  status = 'completed',
  createdAt = isoAt(0),
  updatedAt = createdAt,
} = {}) {
  const dir = join(jobDir, jobId);
  await mkdir(dir, { recursive: true });
  const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: 'blue' } }).png().toBuffer();
  await writeFile(join(dir, 'extracted.png'), png);
  const objectId = randomUUID();
  const manifest = {
    job_id: jobId,
    upload_id: uploadId,
    status,
    progress: status === 'completed' ? 100 : 10,
    created_at: createdAt,
    updated_at: updatedAt,
    objects: [{ id: objectId, category: 'human', file: 'extracted.png', width: 8, height: 8 }],
    error: null,
  };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { dir, objectId, uploadId, png };
}

test('configuration validation enforces safe integer retentionMs, sweepIntervalMs, and stylizationTimeoutMs boundary', () => {
  for (const badRetention of [-1, 1.5, NaN, '24', null]) {
    assert.throws(
      () => createJobManager({ retentionMs: badRetention }),
      /retentionMs must be a non-negative integer/,
    );
  }
  for (const badInterval of [-1, 0.5, NaN, '60', null]) {
    assert.throws(
      () => createJobManager({ sweepIntervalMs: badInterval }),
      /sweepIntervalMs must be a non-negative integer/,
    );
  }
  assert.throws(
    () => createJobManager({ retentionMs: 900000, stylizationTimeoutMs: 900000 }),
    /retentionMs must exceed stylizationTimeoutMs when enabled/,
  );
  assert.throws(
    () => createJobManager({ retentionMs: 5000, stylizationTimeoutMs: 10000 }),
    /retentionMs must exceed stylizationTimeoutMs when enabled/,
  );
  assert.throws(
    () => createJobManager({ now: 'not-a-fn' }),
    /now must be a function/,
  );
  for (const badQueue of [0, -1, 1.5, NaN, '10', null]) {
    assert.throws(
      () => createJobManager({ maxQueueLength: badQueue }),
      /maxQueueLength must be a positive integer/,
    );
  }
  // retentionMs: 0 is allowed even when stylizationTimeoutMs > 0 (disables sweep).
  const disabled = createJobManager({ retentionMs: 0, stylizationTimeoutMs: 900000 });
  disabled.stopSweep();
});

test('expired jobs and unreferenced expired uploads are deleted while fresh and future-dated entries remain', async t => {
  const root = await mkdtemp(join(tmpdir(), 'immo-retention-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const uploadDir = join(root, 'uploads');
  const jobDir = join(root, 'jobs');
  let clock = BASE_TIME_MS;

  const expiredUploadId = randomUUID();
  const expiredJobId = randomUUID();
  const freshUploadId = randomUUID();
  const freshJobId = randomUUID();
  const futureJobId = randomUUID();
  const extractedUploadId = randomUUID();

  await seedUpload(uploadDir, expiredUploadId, { createdAt: isoAt(-25 * HOUR_MS) });
  await seedJob(jobDir, expiredJobId, {
    uploadId: expiredUploadId,
    createdAt: isoAt(-25 * HOUR_MS),
    updatedAt: isoAt(-24 * HOUR_MS - 1),
  });

  await seedUpload(uploadDir, freshUploadId, { createdAt: isoAt(-23 * HOUR_MS) });
  await seedJob(jobDir, freshJobId, {
    uploadId: freshUploadId,
    createdAt: isoAt(-23 * HOUR_MS),
    updatedAt: isoAt(-23 * HOUR_MS),
  });

  // Upload with old created_at but recent extracted_at (M3 synchronous extraction) stays alive.
  await seedUpload(uploadDir, extractedUploadId, {
    createdAt: isoAt(-30 * HOUR_MS),
    extractedAt: isoAt(-2 * HOUR_MS),
  });

  // Future timestamp must be treated as non-expired.
  await seedJob(jobDir, futureJobId, {
    createdAt: isoAt(2 * HOUR_MS),
    updatedAt: isoAt(2 * HOUR_MS),
  });

  const app = createApp({
    uploadDir,
    jobDir,
    retentionMs: RETENTION_MS,
    sweepIntervalMs: 0,
    now: () => clock,
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;

  const result = await app.locals.jobManager.sweep();
  assert.deepEqual(result, {
    enabled: true,
    deletedJobs: 1,
    skippedJobs: 0,
    deletedUploads: 1,
    skippedUploads: 0,
  });

  assert.equal(existsSync(join(jobDir, expiredJobId)), false);
  assert.equal(existsSync(join(uploadDir, expiredUploadId)), false);
  assert.equal(existsSync(join(jobDir, freshJobId)), true);
  assert.equal(existsSync(join(uploadDir, freshUploadId)), true);
  assert.equal(existsSync(join(uploadDir, extractedUploadId)), true);
  assert.equal(existsSync(join(jobDir, futureJobId)), true);

  // Expired job returns standard 404 JOB_NOT_FOUND; fresh job returns 200.
  const expiredRes = await fetch(`${base}/api/jobs/${expiredJobId}`);
  assert.equal(expiredRes.status, 404);
  assert.equal((await expiredRes.json()).error.code, 'JOB_NOT_FOUND');

  const freshRes = await fetch(`${base}/api/jobs/${freshJobId}`);
  assert.equal(freshRes.status, 200);
});

test('derivative snapshots (pixelation, export, spritesheet, stylization) extend parent job and upload retention', async t => {
  const root = await mkdtemp(join(tmpdir(), 'immo-retention-deriv-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const uploadDir = join(root, 'uploads');
  const jobDir = join(root, 'jobs');

  const groups = [
    ['pixelations', 'pixelation_id', { created_at: isoAt(-1 * HOUR_MS) }],
    ['exports', 'export_id', { created_at: isoAt(-2 * HOUR_MS) }],
    ['spritesheets', 'spritesheet_id', { created_at: isoAt(-3 * HOUR_MS) }],
    ['stylizations', 'stylization_id', { status: 'completed', created_at: isoAt(-30 * HOUR_MS), updated_at: isoAt(-1 * HOUR_MS) }],
  ];

  const seeded = [];
  for (const [group, idKey, extra] of groups) {
    const uploadId = randomUUID();
    const jobId = randomUUID();
    // Both upload and parent job are older than 24h, but derivative snapshot is recent.
    await seedUpload(uploadDir, uploadId, { createdAt: isoAt(-40 * HOUR_MS) });
    const { dir } = await seedJob(jobDir, jobId, {
      uploadId,
      createdAt: isoAt(-40 * HOUR_MS),
      updatedAt: isoAt(-35 * HOUR_MS),
    });
    const snapId = randomUUID();
    const snapDir = join(dir, group, snapId);
    await mkdir(snapDir, { recursive: true });
    await writeFile(join(snapDir, 'manifest.json'), JSON.stringify({
      [idKey]: snapId,
      job_id: jobId,
      status: 'completed',
      ...extra,
    }, null, 2));
    seeded.push({ jobId, uploadId });
  }

  let clock = BASE_TIME_MS;
  const manager = createJobManager({
    uploadDir,
    jobDir,
    retentionMs: RETENTION_MS,
    sweepIntervalMs: 0,
    now: () => clock,
  });

  const firstSweep = await manager.sweep();
  assert.equal(firstSweep.deletedJobs, 0);
  assert.equal(firstSweep.deletedUploads, 0);
  for (const { jobId, uploadId } of seeded) {
    assert.equal(existsSync(join(jobDir, jobId)), true);
    assert.equal(existsSync(join(uploadDir, uploadId)), true);
  }

  // Advance clock by 25 hours so all derivative snapshots also expire.
  clock = BASE_TIME_MS + 25 * HOUR_MS;
  const secondSweep = await manager.sweep();
  assert.equal(secondSweep.deletedJobs, 4);
  assert.equal(secondSweep.deletedUploads, 4);
  for (const { jobId, uploadId } of seeded) {
    assert.equal(existsSync(join(jobDir, jobId)), false);
    assert.equal(existsSync(join(uploadDir, uploadId)), false);
  }
});

test('active jobs, active stylizations, queued/processing disk states, and busyJobs protect jobs and their uploads', async t => {
  const root = await mkdtemp(join(tmpdir(), 'immo-retention-active-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const uploadDir = join(root, 'uploads');
  const jobDir = join(root, 'jobs');
  let clock = BASE_TIME_MS;

  // 1. Queued job on disk with old timestamp + its old upload
  const diskQueuedUploadId = randomUUID();
  const diskQueuedJobId = randomUUID();
  await seedUpload(uploadDir, diskQueuedUploadId, { createdAt: isoAt(-50 * HOUR_MS) });
  await seedJob(jobDir, diskQueuedJobId, {
    uploadId: diskQueuedUploadId,
    status: 'queued',
    createdAt: isoAt(-50 * HOUR_MS),
    updatedAt: isoAt(-50 * HOUR_MS),
  });

  // 2. Completed old job with a processing stylization on disk + its old upload
  const diskStylizingUploadId = randomUUID();
  const diskStylizingJobId = randomUUID();
  await seedUpload(uploadDir, diskStylizingUploadId, { createdAt: isoAt(-50 * HOUR_MS) });
  const { dir: stylizingDir, objectId: stylizingObjId } = await seedJob(jobDir, diskStylizingJobId, {
    uploadId: diskStylizingUploadId,
    status: 'completed',
    createdAt: isoAt(-50 * HOUR_MS),
    updatedAt: isoAt(-50 * HOUR_MS),
  });
  const diskStyId = randomUUID();
  await mkdir(join(stylizingDir, 'stylizations', diskStyId), { recursive: true });
  await writeFile(join(stylizingDir, 'stylizations', diskStyId, 'manifest.json'), JSON.stringify({
    stylization_id: diskStyId,
    job_id: diskStylizingJobId,
    object_id: stylizingObjId,
    status: 'processing',
    created_at: isoAt(-50 * HOUR_MS),
    updated_at: isoAt(-50 * HOUR_MS),
  }));

  // 3. In-memory active extraction job and busyJobs mutation protection
  let releaseExtraction;
  const extractionGate = new Promise(resolve => { releaseExtraction = resolve; });
  const manager = createJobManager({
    uploadDir,
    jobDir,
    retentionMs: RETENTION_MS,
    sweepIntervalMs: 0,
    now: () => clock,
    aiClient: {
      async extractPath({ imagePath, outputPath, saveMaskPath }) {
        await extractionGate;
        await sharp(imagePath).ensureAlpha().png().toFile(outputPath);
        await sharp({ create: { width: 8, height: 8, channels: 3, background: 'white' } }).png().toFile(saveMaskPath);
        return {
          status: 'success', original_size: [8, 8], categories_present: [],
          category_pixel_counts: {}, objects: [], execution_time_seconds: 0,
        };
      },
    },
  });

  // Create a completed job for busyJobs test
  const busyUploadId = randomUUID();
  const busyJobId = randomUUID();
  await seedUpload(uploadDir, busyUploadId, { createdAt: isoAt(-50 * HOUR_MS) });
  const { objectId: busyObjectId, png: busyPng } = await seedJob(jobDir, busyJobId, {
    uploadId: busyUploadId,
    createdAt: isoAt(-50 * HOUR_MS),
    updatedAt: isoAt(-50 * HOUR_MS),
  });

  // Run sweep directly before initialize() converts disk queued states:
  // diskQueuedJobId and diskStylizingJobId must be protected by their disk status.
  const preInitSweep = await manager.sweep();
  assert.equal(existsSync(join(jobDir, diskQueuedJobId)), true);
  assert.equal(existsSync(join(uploadDir, diskQueuedUploadId)), true);
  assert.equal(existsSync(join(jobDir, diskStylizingJobId)), true);
  assert.equal(existsSync(join(uploadDir, diskStylizingUploadId)), true);
  // busyJobId was not busy yet during preInitSweep, so it was expired and deleted!
  assert.equal(preInitSweep.deletedJobs, 1);
  assert.equal(existsSync(join(jobDir, busyJobId)), false);

  // Re-seed busyJobId with old timestamp and test concurrent updateObject (busyJobs) + active extraction job
  await seedUpload(uploadDir, busyUploadId, { createdAt: isoAt(-50 * HOUR_MS) });
  await seedJob(jobDir, busyJobId, {
    uploadId: busyUploadId,
    createdAt: isoAt(-50 * HOUR_MS),
    updatedAt: isoAt(-50 * HOUR_MS),
  });
  // Write the specific busyObjectId into manifest
  await writeFile(join(jobDir, busyJobId, 'manifest.json'), JSON.stringify({
    job_id: busyJobId,
    upload_id: busyUploadId,
    status: 'completed',
    progress: 100,
    created_at: isoAt(-50 * HOUR_MS),
    updated_at: isoAt(-50 * HOUR_MS),
    objects: [{ id: busyObjectId, category: 'human', file: 'extracted.png', width: 8, height: 8 }],
    error: null,
  }, null, 2));

  const activeUploadId = randomUUID();
  await seedUpload(uploadDir, activeUploadId, { createdAt: isoAt(-50 * HOUR_MS) });

  // Start updateObject (enters busyJobs) and create(activeUploadId) concurrently with sweep()
  const updatePromise = manager.updateObject(busyJobId, busyObjectId, busyPng);
  const activeJob = await manager.create(activeUploadId);

  // Advance clock by 48 hours while activeJob is still blocked on extractionGate
  clock = BASE_TIME_MS + 48 * HOUR_MS;
  await manager.sweep();
  await updatePromise;

  assert.equal(existsSync(join(jobDir, activeJob.job_id)), true, 'In-memory active job must not be deleted');
  assert.equal(existsSync(join(uploadDir, activeUploadId)), true, 'Upload of active job must not be deleted');
  assert.equal(existsSync(join(jobDir, busyJobId)), true, 'Job protected by busyJobs and updated must not be deleted');
  assert.equal(existsSync(join(uploadDir, busyUploadId)), true, 'Upload of busy/updated job must not be deleted');

  releaseExtraction();
  for (let i = 0; i < 100; i++) {
    if ((await manager.get(activeJob.job_id)).status === 'completed') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
});

test('directories without manifest use directory mtime and corrupt manifests or invalid timestamps are skipped safely', async t => {
  const root = await mkdtemp(join(tmpdir(), 'immo-retention-corrupt-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const uploadDir = join(root, 'uploads');
  const jobDir = join(root, 'jobs');

  // 1. Expired directory without manifest.json
  const oldOrphanJobId = randomUUID();
  const oldOrphanJobDir = join(jobDir, oldOrphanJobId);
  await mkdir(oldOrphanJobDir, { recursive: true });
  const oldTime = new Date(BASE_TIME_MS - 30 * HOUR_MS);
  await utimes(oldOrphanJobDir, oldTime, oldTime);

  // 2. Fresh directory without manifest.json
  const freshOrphanUploadId = randomUUID();
  const freshOrphanUploadDir = join(uploadDir, freshOrphanUploadId);
  await mkdir(freshOrphanUploadDir, { recursive: true });
  const freshTime = new Date(BASE_TIME_MS - 1 * HOUR_MS);
  await utimes(freshOrphanUploadDir, freshTime, freshTime);

  // 3. Corrupt JSON job manifest
  const corruptJobId = randomUUID();
  await mkdir(join(jobDir, corruptJobId), { recursive: true });
  await writeFile(join(jobDir, corruptJobId, 'manifest.json'), '{not-valid-json');

  // 4. Job manifest with invalid timestamp + its old upload (upload must also be retained!)
  const badTsUploadId = randomUUID();
  const badTsJobId = randomUUID();
  await seedUpload(uploadDir, badTsUploadId, { createdAt: isoAt(-40 * HOUR_MS) });
  await mkdir(join(jobDir, badTsJobId), { recursive: true });
  await writeFile(join(jobDir, badTsJobId, 'manifest.json'), JSON.stringify({
    job_id: badTsJobId,
    upload_id: badTsUploadId,
    status: 'completed',
    progress: 100,
    created_at: 'invalid-date',
    updated_at: 'invalid-date',
    objects: [],
  }));

  // 5. Corrupt upload manifest
  const corruptUploadId = randomUUID();
  await mkdir(join(uploadDir, corruptUploadId), { recursive: true });
  await writeFile(join(uploadDir, corruptUploadId, 'manifest.json'), '{"upload_id":"wrong"}');

  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  t.after(() => { console.warn = origWarn; });

  const manager = createJobManager({
    uploadDir,
    jobDir,
    retentionMs: RETENTION_MS,
    sweepIntervalMs: 0,
    now: () => BASE_TIME_MS,
  });

  const stats = await manager.sweep();
  assert.equal(stats.deletedJobs, 1, 'Expired orphan job directory without manifest should be deleted via mtime');
  assert.equal(stats.skippedJobs, 2, 'Corrupt job manifest and invalid timestamp job must be skipped');
  assert.equal(stats.deletedUploads, 0);
  assert.equal(stats.skippedUploads, 1, 'Corrupt upload manifest must be skipped');

  assert.equal(existsSync(oldOrphanJobDir), false);
  assert.equal(existsSync(freshOrphanUploadDir), true);
  assert.equal(existsSync(join(jobDir, corruptJobId)), true);
  assert.equal(existsSync(join(jobDir, badTsJobId)), true);
  assert.equal(existsSync(join(uploadDir, badTsUploadId)), true, 'Upload referenced by skipped job must be retained');
  assert.equal(existsSync(join(uploadDir, corruptUploadId)), true);

  // Verify logs contain error codes only and never leak filesystem paths
  const logText = warnings.join('\n');
  assert.ok(logText.includes('CORRUPT_JOB_MANIFEST'));
  assert.ok(logText.includes('INVALID_JOB_TIMESTAMP'));
  assert.ok(logText.includes('CORRUPT_UPLOAD_MANIFEST'));
  assert.equal(logText.includes(root), false, 'Sweep logs must never leak filesystem paths');
});

test('open file handle (Windows EPERM on rename) skips deletion safely and deletes on the next sweep after close', async t => {
  const root = await mkdtemp(join(tmpdir(), 'immo-retention-eperm-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const uploadDir = join(root, 'uploads');
  const jobDir = join(root, 'jobs');

  const uploadId = randomUUID();
  const jobId = randomUUID();
  await seedUpload(uploadDir, uploadId, { createdAt: isoAt(-30 * HOUR_MS) });
  const { dir: jobDirectory } = await seedJob(jobDir, jobId, {
    uploadId,
    createdAt: isoAt(-30 * HOUR_MS),
    updatedAt: isoAt(-30 * HOUR_MS),
  });

  const manager = createJobManager({
    uploadDir,
    jobDir,
    retentionMs: RETENTION_MS,
    sweepIntervalMs: 0,
    now: () => BASE_TIME_MS,
  });

  // Hold an open file handle on extracted.png inside the expired job directory
  const handle = await open(join(jobDirectory, 'extracted.png'), 'r');
  let firstSweep;
  try {
    firstSweep = await manager.sweep();
  } finally {
    await handle.close();
  }

  if (process.platform === 'win32') {
    // On Windows NTFS, an open handle inside the directory blocks rename() with EPERM/EACCES.
    assert.equal(firstSweep.deletedJobs, 0);
    assert.equal(firstSweep.skippedJobs, 1);
    assert.equal(existsSync(jobDirectory), true, 'Locked job directory must remain intact');
    assert.equal(existsSync(join(uploadDir, uploadId)), true, 'Upload of skipped locked job must remain intact');

    // Once the handle is closed, the next sweep deletes both the job and its expired upload.
    const secondSweep = await manager.sweep();
    assert.equal(secondSweep.deletedJobs, 1);
    assert.equal(secondSweep.deletedUploads, 1);
    assert.equal(existsSync(jobDirectory), false);
    assert.equal(existsSync(join(uploadDir, uploadId)), false);
  } else {
    assert.equal(firstSweep.deletedJobs, 1);
  }
});

test('nested junctions inside an expired job, top-level junctions, non-UUID entries, leftover .deleting-*, and disabled retention=0 behave safely', async t => {
  const root = await mkdtemp(join(tmpdir(), 'immo-retention-safety-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const uploadDir = join(root, 'uploads');
  const jobDir = join(root, 'jobs');
  const outsideTarget = join(root, 'outside-protected');
  await mkdir(outsideTarget, { recursive: true });
  await writeFile(join(outsideTarget, 'precious.txt'), 'must-survive');

  // 1. Expired job containing a nested directory junction pointing to outsideTarget
  const expiredJobWithJunction = randomUUID();
  const { dir: expiredDir } = await seedJob(jobDir, expiredJobWithJunction, {
    createdAt: isoAt(-30 * HOUR_MS),
    updatedAt: isoAt(-30 * HOUR_MS),
  });
  await symlink(outsideTarget, join(expiredDir, 'objects'), 'junction');

  // 2. Top-level UUID directory junction pointing to outsideTarget
  const topLevelJunctionId = randomUUID();
  await symlink(outsideTarget, join(jobDir, topLevelJunctionId), 'junction');

  // 3. Non-UUID entries in jobs and uploads
  await mkdir(join(jobDir, 'custom-notes'), { recursive: true });
  await writeFile(join(jobDir, 'README.txt'), 'keep');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, '.gitkeep'), '');

  // 4. Leftover .deleting-* directories from an interrupted sweep
  const leftoverJobDeleting = join(jobDir, `.deleting-${randomUUID()}-abcd1234`);
  const leftoverUploadDeleting = join(uploadDir, `.deleting-${randomUUID()}-ef567890`);
  await mkdir(leftoverJobDeleting, { recursive: true });
  await writeFile(join(leftoverJobDeleting, 'stale.tmp'), 'x');
  await mkdir(leftoverUploadDeleting, { recursive: true });

  // First test retentionMs: 0 (disabled) -> nothing is touched!
  const disabledManager = createJobManager({
    uploadDir,
    jobDir,
    retentionMs: 0,
    sweepIntervalMs: 0,
    now: () => BASE_TIME_MS,
  });
  const disabledResult = await disabledManager.sweep();
  assert.equal(disabledResult.enabled, false);
  assert.equal(existsSync(expiredDir), true);
  assert.equal(existsSync(leftoverJobDeleting), true);

  // Now run with enabled retentionMs
  const activeManager = createJobManager({
    uploadDir,
    jobDir,
    retentionMs: RETENTION_MS,
    sweepIntervalMs: 0,
    now: () => BASE_TIME_MS,
  });
  const result = await activeManager.sweep();
  assert.equal(result.deletedJobs, 1, 'Expired job with nested junction is deleted');
  assert.equal(result.skippedJobs, 1, 'Top-level junction is skipped');

  // Expired job is gone, leftover .deleting-* are gone
  assert.equal(existsSync(expiredDir), false);
  assert.equal(existsSync(leftoverJobDeleting), false);
  assert.equal(existsSync(leftoverUploadDeleting), false);

  // Outside target and its files MUST remain completely intact!
  assert.equal(existsSync(outsideTarget), true);
  assert.equal(await readFile(join(outsideTarget, 'precious.txt'), 'utf8'), 'must-survive');

  // Non-UUID entries must remain untouched
  assert.equal(existsSync(join(jobDir, 'custom-notes')), true);
  assert.equal(existsSync(join(jobDir, 'README.txt')), true);
  assert.equal(existsSync(join(uploadDir, '.gitkeep')), true);
});

test('maxQueueLength rejects excess extraction and stylization requests with HTTP 429 QUEUE_FULL without leaving orphan artifacts, then accepts again after drain', async t => {
  const root = await mkdtemp(join(tmpdir(), 'immo-queue-bound-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const uploadDir = join(root, 'uploads');
  const jobDir = join(root, 'jobs');

  let releaseFirst;
  const firstGate = new Promise(resolve => { releaseFirst = resolve; });

  const app = createApp({
    uploadDir,
    jobDir,
    maxQueueLength: 2,
    retentionMs: 0,
    sweepIntervalMs: 0,
    aiClient: {
      async health() { return { status: 'ok', service: 'ai-service', model_loaded: true }; },
      async extractPath({ imagePath, outputPath, saveMaskPath }) {
        await firstGate;
        await sharp(imagePath).ensureAlpha().png().toFile(outputPath);
        await sharp({ create: { width: 8, height: 8, channels: 3, background: 'white' } }).png().toFile(saveMaskPath);
        return {
          status: 'success', original_size: [8, 8], categories_present: [],
          category_pixel_counts: {}, objects: [], execution_time_seconds: 0,
        };
      },
      async stylizePath({ imagePath, outputPath, parameters }) {
        await sharp(imagePath).ensureAlpha().png().toFile(outputPath);
        return {
          status: 'success', original_size: [8, 8],
          target_size: [parameters.target_size, parameters.target_size],
          prompt: 'p', negative_prompt: 'n', steps_executed: 1,
          strength: parameters.strength, guidance_scale: parameters.guidance_scale,
          seed: parameters.seed, nsfw_detected: false, execution_time_seconds: 0.1,
        };
      },
    },
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;

  // Seed a completed job for stylization queue limit testing, plus 4 uploads for extraction jobs
  const completedJobId = randomUUID();
  const { objectId: completedObjectId } = await seedJob(jobDir, completedJobId);
  const uploadIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  for (const id of uploadIds) {
    await seedUpload(uploadDir, id);
  }

  // 1. Submit Job 1 (becomes active/processing in drain)
  const res1 = await fetch(`${base}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_id: uploadIds[0] }),
  });
  assert.equal(res1.status, 202);
  const job1 = await res1.json();

  // 2. Submit Job 2 (waiting queue count = 1 of 2)
  const res2 = await fetch(`${base}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_id: uploadIds[1] }),
  });
  assert.equal(res2.status, 202);
  const job2 = await res2.json();

  // 3. Submit Stylization 1 on completedJobId (shared FIFO: waiting queue count = 2 of 2)
  const res3 = await fetch(`${base}/api/jobs/${completedJobId}/stylize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ object_id: completedObjectId }),
  });
  assert.equal(res3.status, 202);
  const sty1 = await res3.json();

  // 4. Queue is now at capacity (2 waiting behind active job1).
  // Submitting another extraction via JSON upload_id must return HTTP 429 QUEUE_FULL and preserve the existing upload.
  const jobsBeforeReject = (await readdir(jobDir)).sort();
  const res4 = await fetch(`${base}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_id: uploadIds[2] }),
  });
  assert.equal(res4.status, 429);
  const err4 = await res4.json();
  assert.equal(err4.error.code, 'QUEUE_FULL');
  assert.equal(existsSync(join(uploadDir, uploadIds[2])), true, 'Pre-existing upload must be preserved on 429');
  assert.deepEqual((await readdir(jobDir)).sort(), jobsBeforeReject, 'No orphan job directory on 429');

  // 5. Submitting via multipart POST /api/jobs when queue is full must return 429 and discard the transient upload.
  const uploadsBeforeMultipart = (await readdir(uploadDir)).sort();
  const pngBuffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'green' } }).png().toBuffer();
  const form = new FormData();
  form.append('image', new Blob([pngBuffer], { type: 'image/png' }), 'transient.png');
  const resMultipart = await fetch(`${base}/api/jobs`, { method: 'POST', body: form });
  assert.equal(resMultipart.status, 429);
  assert.equal((await resMultipart.json()).error.code, 'QUEUE_FULL');
  assert.deepEqual((await readdir(uploadDir)).sort(), uploadsBeforeMultipart, 'Transient multipart upload must be cleaned up on 429');

  // 6. Submitting another stylization when queue is full must return 429 without creating an orphan stylization folder.
  const stylizationsDir = join(jobDir, completedJobId, 'stylizations');
  const styBeforeReject = (await readdir(stylizationsDir)).sort();
  const resStyReject = await fetch(`${base}/api/jobs/${completedJobId}/stylize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ object_id: completedObjectId }),
  });
  assert.equal(resStyReject.status, 429);
  assert.equal((await resStyReject.json()).error.code, 'QUEUE_FULL');
  assert.deepEqual((await readdir(stylizationsDir)).sort(), styBeforeReject, 'No orphan stylization directory on 429');

  // 7. Release gate so queue drains, then verify uploadIds[2] is accepted (HTTP 202) and completes.
  releaseFirst();
  for (let i = 0; i < 200; i++) {
    const j1 = await (await fetch(`${base}/api/jobs/${job1.job_id}`)).json();
    const j2 = await (await fetch(`${base}/api/jobs/${job2.job_id}`)).json();
    const s1 = await (await fetch(`${base}/api/jobs/${completedJobId}/stylizations/${sty1.stylization_id}`)).json();
    if (j1.status === 'completed' && j2.status === 'completed' && s1.status === 'completed') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const resAfterDrain = await fetch(`${base}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_id: uploadIds[2] }),
  });
  assert.equal(resAfterDrain.status, 202);
  const jobAfterDrain = await resAfterDrain.json();
  for (let i = 0; i < 100; i++) {
    const polled = await (await fetch(`${base}/api/jobs/${jobAfterDrain.job_id}`)).json();
    if (polled.status === 'completed') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
});

