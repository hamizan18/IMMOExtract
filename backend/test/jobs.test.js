import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { writeZip } from '../src/zip-export.js';

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
  const buffer = await sharp({ create: { width: 16, height: 12, channels: 3, background: 'red' } }).png().toBuffer();
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
  await sharp({ create: { width: 16, height: 12, channels: 3, background: transparent ? 'black' : 'white' } }).png().toFile(saveMaskPath);
  return {
    status: 'success', original_size: [16, 12], categories_present: [],
    category_pixel_counts: {}, objects: [], execution_time_seconds: 0,
  };
}

async function writeCategoryOutput(args) {
  const result = await writeOutput(args);
  const { data, info } = await sharp(args.imagePath)
    .extract({ left: 2, top: 0, width: 12, height: 12 }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      data[(y * 12 + x) * 4 + 3] = x >= 2 && x < 10 && y >= 2 && y < 10 ? 255 : 0;
    }
  }
  await mkdir(args.objectsDir, { recursive: true });
  await sharp(data, { raw: info }).png().toFile(join(args.objectsDir, 'atr-4.png'));
  result.categories_present = ['Upper-clothes'];
  result.category_pixel_counts = { Background: 128, 'Upper-clothes': 64 };
  result.objects = [{
    class_id: 4, category: 'Upper-clothes', file: 'objects/atr-4.png',
    bbox: [2, 0, 14, 12], width: 12, height: 12, pixel_count: 64,
  }];
  return result;
}

async function assertObjectError(base, jobId, objectId, status, code) {
  for (const suffix of ['', '/download']) {
    const response = await fetch(`${base}/api/jobs/${jobId}/objects/${objectId}${suffix}`);
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
    assert.equal(response.headers.get('content-disposition'), null);
    const body = await response.json();
    assert.equal(body.error.code, code);
    assert.ok(!JSON.stringify(body).includes('immo-jobs-'));
    assert.ok(!JSON.stringify(body).includes('private'));
  }
}

test('category PNG pixels are inventoried with the foreground and polling hides their paths', async t => {
  let requestedDirectory;
  const { base, options, serve } = await setup(t, { async extractPath(args) {
    requestedDirectory = args.objectsDir;
    const result = await writeCategoryOutput(args);
    result.objects[0].id = 'untrusted-id';
    result.objects[0].private_path = args.objectsDir;
    return result;
  } });
  const queued = await submit(base);
  const completed = await poll(base, queued.job_id, 'completed');
  const directory = join(options.jobDir, queued.job_id);
  assert.equal(requestedDirectory, join(directory, 'objects'));
  assert.deepEqual(completed.objects.map(object => object.category), ['human', 'Upper-clothes']);
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json')));
  const object = manifest.objects[1];
  assert.match(object.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(object.id, manifest.objects[0].id);
  assert.deepEqual(object, {
    id: object.id, class_id: 4, category: 'Upper-clothes', file: 'objects/atr-4.png',
    bbox: [2, 0, 14, 12], width: 12, height: 12, pixel_count: 64,
  });
  const { data, info } = await sharp(join(directory, object.file)).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [12, 12, 4]);
  let opaque = 0;
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const offset = (y * 12 + x) * 4;
      assert.deepEqual([...data.subarray(offset, offset + 3)], [255, 0, 0]);
      const expectedAlpha = x >= 2 && x < 10 && y >= 2 && y < 10 ? 255 : 0;
      assert.equal(data[offset + 3], expectedAlpha);
      if (expectedAlpha) opaque++;
    }
  }
  assert.equal(opaque, object.pixel_count);
  for (const publicObject of completed.objects) assert.equal(publicObject.file, undefined);
  assert.ok(!JSON.stringify(completed).includes('objects/atr-'));
  assert.ok(!JSON.stringify(completed).includes(options.jobDir));
  assert.equal(completed.objects[1].private_path, undefined);
  assert.deepEqual(await poll(await serve(), queued.job_id, 'completed'), completed);
  const restarted = await serve();
  for (const stored of manifest.objects) {
    const expected = await readFile(join(directory, stored.file));
    for (const [suffix, disposition] of [['', 'inline'], ['/download', 'attachment']]) {
      const response = await fetch(`${restarted}/api/jobs/${queued.job_id.toUpperCase()}/objects/${stored.id.toUpperCase()}${suffix}?path=manifest.json`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'image/png');
      assert.equal(response.headers.get('content-disposition'), `${disposition}; filename="${stored.id}.png"`);
      assert.equal(response.headers.get('cache-control'), 'no-store, private');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      const png = Buffer.from(await response.arrayBuffer());
      assert.deepEqual(png, expected);
      const metadata = await sharp(png).metadata();
      assert.deepEqual([metadata.width, metadata.height, metadata.channels], [stored.width, stored.height, 4]);
    }
  }
});

test('invalid category metadata and artifacts fail without publishing partial objects', async t => {
  const cases = [
    ['missing objects contract', result => { delete result.objects; }],
    ['non-array objects', result => { result.objects = {}; }],
    ['missing category inventory', result => { result.objects = []; }],
    ['duplicate categories', result => { result.categories_present.push('Upper-clothes'); }],
    ['unknown category', result => { result.categories_present = ['Invented']; }],
    ['missing counts', result => { delete result.category_pixel_counts; }],
    ['missing category count', result => { delete result.category_pixel_counts['Upper-clothes']; }],
    ['unlisted eligible category', result => { result.category_pixel_counts.Pants = 64; }],
    ['invalid count', result => { result.category_pixel_counts.Background = -1; }],
    ['count mismatch', result => { result.objects[0].pixel_count = 63; }],
    ['tiny category', result => { result.objects[0].pixel_count = result.category_pixel_counts['Upper-clothes'] = 50; }],
    ['duplicate class ID', result => {
      result.categories_present.push('Pants');
      result.category_pixel_counts.Pants = 64;
      result.objects.push({ ...result.objects[0] });
    }],
    ['background class', result => { result.objects[0].class_id = 0; }],
    ['unknown class', result => { result.objects[0].class_id = 18; }],
    ['category class mismatch', result => { result.objects[0].category = 'Pants'; }],
    ['absolute POSIX path', result => { result.objects[0].file = '/objects/atr-4.png'; }],
    ['absolute Windows path', result => { result.objects[0].file = 'C:\\objects\\atr-4.png'; }],
    ['traversal path', result => { result.objects[0].file = 'objects/../atr-4.png'; }],
    ['backslash path', result => { result.objects[0].file = 'objects\\atr-4.png'; }],
    ['wrong category filename', result => { result.objects[0].file = 'objects/atr-6.png'; }],
    ['fractional bbox', result => { result.objects[0].bbox[0] = 2.5; }],
    ['negative bbox', result => { result.objects[0].bbox[0] = -1; }],
    ['out-of-image bbox', result => { result.objects[0].bbox[2] = 17; }],
    ['inverted bbox', result => { result.objects[0].bbox[2] = 1; }],
    ['width mismatch', result => { result.objects[0].width = 11; }],
    ['height mismatch', result => { result.objects[0].height = 11; }],
    ['wrong original dimensions', result => { result.original_size = [12, 16]; }],
    ['missing category PNG', async (result, args) => { await rm(join(args.objectsDir, 'atr-4.png')); }],
    ['missing second category PNG', result => {
      result.categories_present.push('Pants');
      result.category_pixel_counts.Pants = 64;
      result.objects.push({ ...result.objects[0], class_id: 6, category: 'Pants', file: 'objects/atr-6.png' });
    }],
    ['non-PNG artifact', async (result, args) => {
      await writeFile(join(args.objectsDir, 'atr-4.png'), 'not an image');
    }],
    ['RGB-only category PNG', async (result, args) => {
      await sharp({ create: { width: 12, height: 12, channels: 3, background: 'red' } })
        .png().toFile(join(args.objectsDir, 'atr-4.png'));
    }],
    ['wrong PNG dimensions', async (result, args) => {
      await sharp({ create: { width: 10, height: 12, channels: 4, background: 'red' } })
        .png().toFile(join(args.objectsDir, 'atr-4.png'));
    }],
    ['wrong alpha pixel count', async (result, args) => {
      await sharp({ create: { width: 12, height: 12, channels: 4, background: 'red' } })
        .png().toFile(join(args.objectsDir, 'atr-4.png'));
    }],
    ['corrupt compressed PNG pixels', async (result, args) => {
      const path = join(args.objectsDir, 'atr-4.png');
      const bytes = await readFile(path);
      const start = bytes.indexOf(Buffer.from('IDAT')) + 4;
      bytes[start] = 0xff;
      bytes[start + 1] = 0xff;
      await writeFile(path, bytes);
      const metadata = await sharp(path).metadata();
      assert.deepEqual([metadata.width, metadata.height, metadata.channels], [12, 12, 4]);
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, async t => {
      let responseReturned = false;
      const { base, options } = await setup(t, { async extractPath(args) {
        const result = await writeCategoryOutput(args);
        await mutate(result, args);
        responseReturned = true;
        return result;
      } });
      const queued = await submit(base);
      const failed = await poll(base, queued.job_id, 'failed');
      assert.equal(failed.error.code, 'EXTRACTION_FAILED');
      assert.equal(responseReturned, true, 'The fixture must return its malformed response rather than fail during setup');
      assert.deepEqual(failed.objects, []);
      assert.ok(!JSON.stringify(failed).includes(options.jobDir));
      const manifest = JSON.parse(await readFile(join(options.jobDir, queued.job_id, 'manifest.json')));
      assert.equal(manifest.status, 'failed');
      assert.deepEqual(manifest.objects, []);
    });
  }
});

test('tiny-only categories preserve the human foreground without inventing category objects', async t => {
  const { base } = await setup(t, { async extractPath(args) {
    const result = await writeOutput(args);
    result.category_pixel_counts = { Background: 142, Hat: 50 };
    return result;
  } });
  const queued = await submit(base);
  const completed = await poll(base, queued.job_id, 'completed');
  assert.deepEqual(completed.objects.map(object => object.category), ['human']);
  assert.deepEqual(completed.extraction.categories_present, []);
});

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
  await assertObjectError(base, first.job_id, randomUUID(), 409, 'JOB_NOT_COMPLETED');
  await assertObjectError(base, second.job_id, randomUUID(), 409, 'JOB_NOT_COMPLETED');
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
  await assertObjectError(base, first.job_id, randomUUID(), 409, 'JOB_NOT_COMPLETED');
  await assertObjectError(base, second.job_id, randomUUID(), 404, 'OBJECT_NOT_FOUND');
});

test('missing AI artifacts fail instead of publishing nonexistent gallery files', async t => {
  const { base } = await setup(t, { async extractPath() {
    return {
      status: 'success', original_size: [16, 12], categories_present: [],
      category_pixel_counts: {}, objects: [], execution_time_seconds: 0,
    };
  } });
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

test('object routes reject invalid, unknown and cross-job IDs without serving private files', async t => {
  const { base } = await setup(t, { extractPath: writeCategoryOutput });
  const first = await submit(base);
  const completed = await poll(base, first.job_id, 'completed');
  const second = await submit(base, first.upload_id);
  const other = await poll(base, second.job_id, 'completed');
  const objectId = completed.objects[0].id;
  await assertObjectError(base, 'invalid', objectId, 400, 'INVALID_JOB_ID');
  await assertObjectError(base, randomUUID(), objectId, 404, 'JOB_NOT_FOUND');
  for (const invalid of ['invalid', 'manifest.json', 'extracted.png', 'mask.png', '..%2Fmanifest.json', '..%5Cmanifest.json']) {
    await assertObjectError(base, first.job_id, invalid, 400, 'INVALID_OBJECT_ID');
  }
  await assertObjectError(base, first.job_id, randomUUID(), 404, 'OBJECT_NOT_FOUND');
  await assertObjectError(base, first.job_id, other.objects[0].id, 404, 'OBJECT_NOT_FOUND');
  for (const path of [`/storage/jobs/${first.job_id}/extracted.png`, `/api/jobs/${first.job_id}/objects/atr-4.png`]) {
    const response = await fetch(`${base}${path}`);
    assert.notEqual(response.status, 200);
    await response.arrayBuffer();
  }
});

test('object routes reject unsafe manifest paths and report missing files safely', async t => {
  const { base, options } = await setup(t, { extractPath: writeCategoryOutput });
  const queued = await submit(base);
  await poll(base, queued.job_id, 'completed');
  const directory = join(options.jobDir, queued.job_id);
  const manifestPath = join(directory, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath));
  const object = manifest.objects[1];
  const originalFile = object.file;
  for (const file of [
    '../private.png', 'objects/../../private.png', 'objects\\atr-4.png',
    join(directory, 'extracted.png'), 'C:\\private.png', '//server/private.png',
    'manifest.json', 'mask.png', 'objects/atr-18.png', null,
  ]) {
    object.file = file;
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assertObjectError(base, queued.job_id, object.id, 500, 'JOB_FAILED');
  }
  object.file = originalFile;
  await writeFile(manifestPath, JSON.stringify(manifest));
  for (const stored of manifest.objects) {
    await rm(join(directory, stored.file));
    await assertObjectError(base, queued.job_id, stored.id, 404, 'OBJECT_FILE_NOT_FOUND');
  }
  await mkdir(join(directory, originalFile));
  await assertObjectError(base, queued.job_id, object.id, 404, 'OBJECT_FILE_NOT_FOUND');
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
});

test('object routes refuse a category directory redirected outside its job', async t => {
  const { base, root, options } = await setup(t, { extractPath: writeCategoryOutput });
  const queued = await submit(base);
  const completed = await poll(base, queued.job_id, 'completed');
  const directory = join(options.jobDir, queued.job_id, 'objects');
  const outside = join(root, 'private-objects');
  await rename(directory, outside);
  await symlink(outside, directory, 'junction');
  await assertObjectError(base, queued.job_id, completed.objects[1].id, 500, 'JOB_FAILED');
});

async function exportRequest(base, jobId, body) {
  return fetch(`${base}/api/jobs/${jobId}/exports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

async function assertExportError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  const body = await response.json();
  assert.equal(body.error.code, code);
  assert.ok(!JSON.stringify(body).includes('immo-jobs-'));
}

async function readZipEntries(bytes, path) {
  await writeFile(path, bytes);
  // Independent stdlib ZIP reader validates central directory, payloads and CRCs.
  const script = 'import base64,json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n print(json.dumps([[i.filename,base64.b64encode(z.read(i)).decode()] for i in z.infolist()]))';
  const command = process.platform === 'win32' ? 'py' : 'python3';
  const args = process.platform === 'win32' ? ['-3', '-c', script, path] : ['-c', script, path];
  return JSON.parse(execFileSync(command, args, { encoding: 'utf8' }));
}

test('concurrent ZIP exports contain exactly selected/all original PNGs and survive restart', async t => {
  const { base, root, options, serve } = await setup(t, { extractPath: writeCategoryOutput });
  const queued = await submit(base);
  const job = await poll(base, queued.job_id, 'completed');
  const directory = join(options.jobDir, job.job_id);
  const manifestBytes = await readFile(join(directory, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  const ids = job.objects.map(object => object.id);
  const selections = [{ all: true }, { object_ids: [ids[1].toUpperCase()] }, { object_ids: [...ids].reverse() }];
  const responses = await Promise.all(selections.map(selection => exportRequest(base, job.job_id, selection)));
  const exports = [];
  for (const response of responses) {
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(response.headers.get('location'), result.download_url);
    assert.equal(result.status, 'completed');
    assert.equal(result.job_id, job.job_id);
    assert.ok(!JSON.stringify(result).includes(options.jobDir));
    exports.push(result);
  }
  assert.equal(new Set(exports.map(item => item.export_id)).size, 3);
  const restarted = await serve();
  for (let index = 0; index < exports.length; index++) {
    const result = exports[index];
    const expectedIds = index === 0 ? ids : selections[index].object_ids.map(id => id.toLowerCase());
    assert.deepEqual(result.object_ids, expectedIds);
    const response = await fetch(`${restarted}${result.download_url}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/zip');
    assert.equal(response.headers.get('content-disposition'), `attachment; filename="${result.export_id}.zip"`);
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const entries = await readZipEntries(Buffer.from(await response.arrayBuffer()), join(root, `download-${index}.zip`));
    assert.deepEqual(entries.map(([name]) => name).sort(), expectedIds.map(id => `${id}.png`).sort());
    for (const [name, base64] of entries) {
      const object = manifest.objects.find(object => `${object.id}.png` === name);
      assert.deepEqual(Buffer.from(base64, 'base64'), await readFile(join(directory, object.file)));
    }
  }
  assert.deepEqual(await readFile(join(directory, 'manifest.json')), manifestBytes);
});

test('ZIP selection rejects malformed JSON, IDs, duplicate IDs and unregistered objects', async t => {
  const { base } = await setup(t, { extractPath: writeCategoryOutput });
  const first = await submit(base);
  const job = await poll(base, first.job_id, 'completed');
  const second = await submit(base, first.upload_id);
  const other = await poll(base, second.job_id, 'completed');
  for (const body of [[], {}, { all: false }, { all: 'true' }, { object_ids: [] },
    { object_ids: 'all' }, { all: true, object_ids: [job.objects[0].id] }, { all: true, path: '../private' }]) {
    await assertExportError(await exportRequest(base, job.job_id, body), 400, 'INVALID_EXPORT_INPUT');
  }
  await assertExportError(await exportRequest(base, 'invalid', { all: true }), 400, 'INVALID_JOB_ID');
  await assertExportError(await exportRequest(base, randomUUID(), { all: true }), 404, 'JOB_NOT_FOUND');
  await assertExportError(await exportRequest(base, job.job_id, { object_ids: ['../private.png'] }), 400, 'INVALID_OBJECT_ID');
  await assertExportError(await exportRequest(base, job.job_id, {
    object_ids: [job.objects[0].id, job.objects[0].id.toUpperCase()],
  }), 400, 'DUPLICATE_OBJECT_ID');
  for (const id of [randomUUID(), other.objects[0].id]) {
    await assertExportError(await exportRequest(base, job.job_id, { object_ids: [id] }), 404, 'OBJECT_NOT_FOUND');
  }
  for (const [body, status] of [['null', 400], ['{', 400], [JSON.stringify({ object_ids: ['x'.repeat(3000)] }), 413]]) {
    await assertExportError(await fetch(`${base}/api/jobs/${job.job_id}/exports`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    }), status, 'INVALID_JOB_REQUEST');
  }
  await assertExportError(await fetch(`${base}/api/jobs/${job.job_id}/exports`, {
    method: 'POST', body: 'all',
  }), 415, 'EXPORT_INPUT_REQUIRED');
});

test('ZIP creation/download rejects non-completed jobs and empty results', async t => {
  const { base, options } = await setup(t, { extractPath: writeCategoryOutput });
  const queued = await submit(base);
  const job = await poll(base, queued.job_id, 'completed');
  const response = await exportRequest(base, job.job_id, { all: true });
  assert.equal(response.status, 201);
  const result = await response.json();
  const path = join(options.jobDir, job.job_id, 'manifest.json');
  const manifest = JSON.parse(await readFile(path));
  for (const status of ['queued', 'processing', 'failed']) {
    await writeFile(path, JSON.stringify({ ...manifest, status }));
    await assertExportError(await exportRequest(base, job.job_id, { all: true }), 409, 'JOB_NOT_COMPLETED');
    await assertExportError(await fetch(`${base}${result.download_url}`), 409, 'JOB_NOT_COMPLETED');
  }
  await writeFile(path, JSON.stringify({ ...manifest, objects: [] }));
  await assertExportError(await exportRequest(base, job.job_id, { all: true }), 409, 'EXPORT_EMPTY');
});

test('missing selected PNG fails ZIP creation without artifacts; unselected missing PNG does not block', async t => {
  const { base, options } = await setup(t, { extractPath: writeCategoryOutput });
  const queued = await submit(base);
  const job = await poll(base, queued.job_id, 'completed');
  const directory = join(options.jobDir, job.job_id);
  await rm(join(directory, 'objects', 'atr-4.png'));
  await assertExportError(await exportRequest(base, job.job_id, { all: true }), 404, 'OBJECT_FILE_NOT_FOUND');
  assert.ok(!(await readdir(directory)).includes('exports'));
  const response = await exportRequest(base, job.job_id, { object_ids: [job.objects[0].id] });
  assert.equal(response.status, 201);
  const result = await response.json();
  await rm(join(directory, 'extracted.png'));
  // The completed archive is a snapshot; it does not need to reopen source PNGs.
  const download = await fetch(`${base}${result.download_url}`);
  assert.equal(download.status, 200);
  await download.arrayBuffer();
});

test('ZIP downloads require a matching published manifest and reject missing archives or junctions', async t => {
  const { base, root, options } = await setup(t, { extractPath: writeCategoryOutput });
  const queued = await submit(base);
  const job = await poll(base, queued.job_id, 'completed');
  const response = await exportRequest(base, job.job_id, { all: true });
  assert.equal(response.status, 201);
  const result = await response.json();
  const second = await submit(base, queued.upload_id);
  await poll(base, second.job_id, 'completed');
  const url = id => `${base}/api/jobs/${job.job_id}/exports/${id}/download`;
  await assertExportError(await fetch(url('invalid')), 400, 'INVALID_EXPORT_ID');
  await assertExportError(await fetch(url(randomUUID())), 404, 'EXPORT_NOT_FOUND');
  await assertExportError(await fetch(`${base}/api/jobs/${second.job_id}/exports/${result.export_id}/download`), 404, 'EXPORT_NOT_FOUND');
  const directory = join(options.jobDir, job.job_id, 'exports', result.export_id);
  const manifestPath = join(directory, 'manifest.json');
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  for (const changes of [{ job_id: second.job_id }, { export_id: randomUUID() }, { status: 'processing' }, { object_ids: [randomUUID()] }]) {
    await writeFile(manifestPath, JSON.stringify({ ...manifest, ...changes }));
    await assertExportError(await fetch(url(result.export_id)), 500, 'JOB_FAILED');
  }
  await rm(manifestPath);
  await assertExportError(await fetch(url(result.export_id)), 404, 'EXPORT_NOT_FOUND');
  await writeFile(manifestPath, manifestBytes);
  const outside = join(root, 'outside-export');
  await rename(directory, outside);
  await symlink(outside, directory, 'junction');
  await assertExportError(await fetch(url(result.export_id)), 500, 'JOB_FAILED');
  await rm(directory);
  await rename(outside, directory);
  await rm(join(directory, 'archive.zip'));
  await assertExportError(await fetch(url(result.export_id)), 404, 'EXPORT_NOT_FOUND');
});

test('ZIP storage failures and redirected export folders do not expose files outside the job', async t => {
  const { base, root, options } = await setup(t, { extractPath: writeCategoryOutput });
  const queued = await submit(base);
  const job = await poll(base, queued.job_id, 'completed');
  const exportsPath = join(options.jobDir, job.job_id, 'exports');
  await writeFile(exportsPath, 'not a directory');
  await assertExportError(await exportRequest(base, job.job_id, { all: true }), 500, 'JOB_FAILED');
  await rm(exportsPath);
  const outside = join(root, 'private-exports');
  await mkdir(outside);
  await symlink(outside, exportsPath, 'junction');
  await assertExportError(await exportRequest(base, job.job_id, { all: true }), 500, 'JOB_FAILED');
  assert.deepEqual(await readdir(outside), []);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
});

test('ZIP streaming treats missing entry warnings and output failures as errors', async t => {
  const root = await mkdtemp(join(tmpdir(), 'immo-zip-stream-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(writeZip([{ filePath: join(root, 'missing.png'), filename: 'object.png' }], join(root, 'partial.zip')));
  const source = join(root, 'source.png');
  await sharp({ create: { width: 2, height: 2, channels: 4, background: 'transparent' } }).png().toFile(source);
  await assert.rejects(writeZip([{ filePath: source, filename: 'object.png' }], join(root, 'missing-directory', 'archive.zip')));
});
