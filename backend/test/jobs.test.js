import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../src/app.js';

async function setup(t, aiClient) {
  const root = await mkdtemp(join(tmpdir(), 'immo-jobs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = { uploadDir: join(root, 'uploads'), jobDir: join(root, 'jobs'), aiClient };
  async function serve() {
    const server = createApp(options).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
    return `http://127.0.0.1:${server.address().port}`;
  }
  return { root, options, serve, base: await serve() };
}

async function imageForm() {
  const buffer = await sharp({ create: { width: 8, height: 6, channels: 3, background: 'red' } }).png().toBuffer();
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'image/png' }), 'private-name.png');
  return form;
}

async function submit(base, uploadId) {
  const response = await fetch(`${base}/api/jobs`, uploadId ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upload_id: uploadId }),
  } : { method: 'POST', body: await imageForm() });
  assert.equal(response.status, 202);
  const job = await response.json();
  assert.equal(job.status, 'queued');
  assert.equal(response.headers.get('location'), `/api/jobs/${job.job_id}`);
  return job;
}

async function poll(base, id, status) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const response = await fetch(`${base}/api/jobs/${id}`);
    assert.equal(response.status, 200);
    const job = await response.json();
    if (job.status === status) return job;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`Job did not reach ${status}`);
}

async function writeOutput({ imagePath, outputPath, saveMaskPath }, transparent = false) {
  await sharp(imagePath).ensureAlpha(transparent ? 0 : 1).png().toFile(outputPath);
  await sharp({ create: { width: 8, height: 6, channels: 3, background: transparent ? 'black' : 'white' } }).png().toFile(saveMaskPath);
  return { status: 'success', original_size: [8, 6], categories_present: [], category_pixel_counts: {}, execution_time_seconds: 0 };
}

test('jobs serialize inference, preserve results and expose no private file paths', async t => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  let calls = 0;
  const { base, serve, options } = await setup(t, { async extractPath(args) {
    calls++;
    if (calls === 1) await gate;
    return writeOutput(args);
  } });
  const first = await submit(base);
  await poll(base, first.job_id, 'processing');
  const second = await submit(base, first.upload_id);
  const queued = await poll(base, second.job_id, 'queued');
  assert.equal(queued.progress, 0);
  assert.equal(calls, 1);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  release();
  const completed = await poll(base, first.job_id, 'completed');
  const other = await poll(base, second.job_id, 'completed');
  assert.equal(calls, 2);
  assert.equal(completed.progress, 100);
  assert.equal(completed.objects[0].category, 'human');
  assert.notEqual(completed.objects[0].id, other.objects[0].id);
  assert.equal(completed.objects[0].file, undefined);
  assert.equal(completed.mask_file, undefined);
  assert.ok(!JSON.stringify(completed).includes(options.jobDir));
  const manifest = JSON.parse(await readFile(join(options.jobDir, first.job_id, 'manifest.json')));
  assert.equal(manifest.objects[0].file, 'extracted.png');
  assert.equal((await sharp(join(options.jobDir, first.job_id, manifest.objects[0].file)).metadata()).channels, 4);
  const restarted = await serve();
  assert.deepEqual(await poll(restarted, first.job_id, 'completed'), completed);
});

test('failed inference does not stall the queue; empty output creates no invented objects', async t => {
  let calls = 0;
  const { base } = await setup(t, { async extractPath(args) {
    if (++calls === 1) throw new Error('private/path/model.pth');
    return writeOutput(args, true);
  } });
  const first = await submit(base);
  const second = await submit(base, first.upload_id);
  const failed = await poll(base, first.job_id, 'failed');
  assert.equal(failed.error.code, 'EXTRACTION_FAILED');
  assert.ok(!JSON.stringify(failed).includes('private/path'));
  assert.deepEqual(failed.objects, []);
  const completed = await poll(base, second.job_id, 'completed');
  assert.deepEqual(completed.objects, []);
});

test('missing AI artifacts fail instead of publishing nonexistent gallery files', async t => {
  const { base } = await setup(t, { async extractPath() { return { status: 'success', categories_present: [] }; } });
  const job = await submit(base);
  assert.deepEqual((await poll(base, job.job_id, 'failed')).objects, []);
});

test('restart marks interrupted jobs failed without rerunning inference', async t => {
  const { base, options } = await setup(t, { extractPath() { assert.fail('Must not retry interrupted jobs'); } });
  for (const status of ['queued', 'processing']) {
    const id = randomUUID();
    const directory = join(options.jobDir, id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ job_id: id, status, progress: 10, objects: [] }));
  }
  // Initialization is lazy; both persisted jobs are present before the first request.
  const { readdir } = await import('node:fs/promises');
  for (const id of await readdir(options.jobDir)) {
    const job = await poll(base, id, 'failed');
    assert.equal(job.error.code, 'JOB_INTERRUPTED');
  }
});

test('job API rejects malformed IDs, mixed inputs, malformed JSON and corrupt uploads', async t => {
  const { base } = await setup(t, { extractPath() { assert.fail('Invalid input must not reach AI'); } });
  for (const [body, status] of [
    ['{', 400], [JSON.stringify({ upload_id: '../secret' }), 400],
    [JSON.stringify({ upload_id: randomUUID() }), 404],
    [JSON.stringify({ upload_id: randomUUID(), image_path: 'private' }), 400],
    [JSON.stringify({ upload_id: 'x'.repeat(3000) }), 413],
  ]) {
    const response = await fetch(`${base}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(response.status, status);
    assert.ok((await response.json()).error.code);
  }
  assert.equal((await fetch(`${base}/api/jobs/invalid`)).status, 400);
  assert.equal((await fetch(`${base}/api/jobs/${randomUUID()}`)).status, 404);
  const form = new FormData();
  form.append('image', new Blob(['not a PNG'], { type: 'image/png' }), 'fake.png');
  assert.equal((await fetch(`${base}/api/jobs`, { method: 'POST', body: form })).status, 415);
});
