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

const defaults = {
  preset: 'pixel-art', target_size: 256, num_inference_steps: 20,
  strength: 0.5, guidance_scale: 7.5, seed: 0,
};

// Synthetic PNG/AI responses below are deterministic orchestration fixtures,
// not model output or evidence of generative model quality.
async function sourcePng() {
  const data = Buffer.alloc(16 * 12 * 4);
  for (let pixel = 0; pixel < 16 * 12; pixel++) {
    data.set([180, pixel % 256, 30, [0, 1, 127, 255][pixel % 4]], pixel * 4);
  }
  return sharp(data, { raw: { width: 16, height: 12, channels: 4 } }).png().toBuffer();
}

async function stylizeFixture({ imagePath, outputPath, parameters }) {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = parameters.seed % 256;
    data[offset + 1] = 70;
    data[offset + 2] = 230;
  }
  await sharp(data, { raw: info }).png().toFile(outputPath);
  // Field names match main.py:_build_stylize_response_payload.
  return {
    status: 'success', original_size: [info.width, info.height],
    target_size: [parameters.target_size, parameters.target_size],
    prompt: parameters.prompt ?? 'fixture pixel art',
    negative_prompt: parameters.negative_prompt ?? 'fixture blur',
    steps_executed: Math.floor(parameters.num_inference_steps * parameters.strength),
    strength: parameters.strength, guidance_scale: parameters.guidance_scale,
    seed: parameters.seed, nsfw_detected: false, execution_time_seconds: 0.125,
    output_path: outputPath,
    save_generated_path: join(outputPath, 'private-generated.png'),
    image_base64: 'PRIVATE_BASE64_FIXTURE', private_metadata: imagePath,
  };
}

async function extractFixture({ imagePath, outputPath, saveMaskPath }) {
  const { width, height } = await sharp(imagePath).metadata();
  await sharp(imagePath).ensureAlpha().png().toFile(outputPath);
  await sharp({ create: { width, height, channels: 3, background: 'white' } }).png().toFile(saveMaskPath);
  return {
    status: 'success', original_size: [width, height], categories_present: [],
    category_pixel_counts: {}, objects: [], execution_time_seconds: 0,
  };
}

async function setup(t, client = {}) {
  const root = await mkdtemp(join(tmpdir(), 'immo-stylizations-'));
  const servers = [];
  const gates = [];
  const pending = new Set();
  const aiClient = {};
  for (const [method, implementation] of Object.entries({
    extractPath: extractFixture, stylizePath: stylizeFixture, ...client,
  })) {
    aiClient[method] = (...args) => {
      const request = Promise.resolve().then(() => implementation(...args));
      pending.add(request);
      request.then(() => pending.delete(request), () => pending.delete(request));
      return request;
    };
  }
  const options = { uploadDir: join(root, 'uploads'), jobDir: join(root, 'jobs'), aiClient };
  t.after(async () => {
    for (const release of gates) release();
    await Promise.allSettled([...pending]);
    for (const server of servers) {
      await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
    }
    await rm(root, { recursive: true, force: true });
  });
  return {
    root, options,
    gate() {
      let release;
      const promise = new Promise(resolve => { release = resolve; });
      gates.push(release);
      return { promise, release };
    },
    async serve() {
      const server = createApp(options).listen(0, '127.0.0.1');
      servers.push(server);
      await once(server, 'listening');
      return `http://127.0.0.1:${server.address().port}`;
    },
    async seed() {
      const jobId = randomUUID();
      const objectId = randomUUID();
      const directory = join(options.jobDir, jobId);
      await mkdir(directory, { recursive: true });
      const png = await sourcePng();
      await writeFile(join(directory, 'extracted.png'), png);
      const manifest = {
        job_id: jobId, upload_id: randomUUID(), status: 'completed', progress: 100,
        objects: [{ id: objectId, category: 'human', file: 'extracted.png', width: 16, height: 12 }],
        extraction: { original_size: [16, 12], categories_present: [], category_pixel_counts: {}, execution_time_seconds: 0 },
        created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', error: null,
      };
      await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest));
      return { jobId, objectId, directory, png, manifest };
    },
  };
}

function jsonRequest(base, path, body) {
  return fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

function location(jobId, stylizationId) {
  return `/api/jobs/${jobId}/stylizations/${stylizationId}`;
}

function assertPrivate(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
}

function assertNoPaths(body, root) {
  const serialized = JSON.stringify(body);
  assert.ok(!serialized.includes(root));
  assert.ok(!serialized.includes('immo-stylizations-'));
  assert.ok(!serialized.includes('PRIVATE_BASE64_FIXTURE'));
  for (const key of ['output_path', 'image_path', 'save_generated_path', 'image_base64', 'private_metadata']) {
    assert.ok(!serialized.includes(`"${key}"`), `Public response leaked ${key}`);
  }
}

async function assertError(response, root, status) {
  if (status === undefined) assert.ok(response.status >= 400 && response.status < 600);
  else assert.equal(response.status, status);
  assertPrivate(response);
  assert.equal(response.headers.get('content-disposition'), null);
  const body = await response.json();
  assert.equal(typeof body.error.code, 'string');
  assertNoPaths(body, root);
  return body;
}

async function submit(base, seed, parameters = {}) {
  const response = await jsonRequest(base, `/api/jobs/${seed.jobId}/stylize`, {
    object_id: seed.objectId, ...parameters,
  });
  assert.equal(response.status, 202);
  assertPrivate(response);
  const result = await response.json();
  assert.equal(result.status, 'queued');
  assert.equal(result.progress, 0);
  assert.equal(result.job_id, seed.jobId.toLowerCase());
  assert.equal(result.object_id, seed.objectId.toLowerCase());
  assert.equal(response.headers.get('location'), location(result.job_id, result.stylization_id));
  assert.equal(result.preview_url, undefined);
  assert.equal(result.download_url, undefined);
  return result;
}

async function poll(base, path, status) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    if (body.status === status) return body;
    if (['completed', 'failed'].includes(body.status)) assert.fail(`Expected ${status}, received ${body.status}`);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`Timed out waiting for ${status}`);
}

async function assertUnpublished(base, result, root) {
  assert.equal(result.preview_url, undefined);
  assert.equal(result.download_url, undefined);
  for (const suffix of ['/image', '/download']) {
    await assertError(await fetch(`${base}${location(result.job_id, result.stylization_id)}${suffix}`), root, 409);
  }
}

async function exportJob(base, jobId) {
  const response = await jsonRequest(base, `/api/jobs/${jobId}/exports`, { all: true });
  assert.equal(response.status, 201);
  return response.json();
}

async function zipEntries(bytes, path) {
  await writeFile(path, bytes);
  // Independent stdlib reader checks archive payloads and CRCs, as in jobs.test.js.
  const script = 'import base64,json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n print(json.dumps([[i.filename,base64.b64encode(z.read(i)).decode()] for i in z.infolist()]))';
  const command = process.platform === 'win32' ? 'py' : 'python3';
  const args = process.platform === 'win32' ? ['-3', '-c', script, path] : ['-c', script, path];
  return JSON.parse(execFileSync(command, args, { encoding: 'utf8', timeout: 10000 }));
}

test('stylizations publish private independent snapshots and preserve original, pixelation and ZIP across restart', async t => {
  const env = await setup(t);
  const seed = await env.seed();
  const base = await env.serve();
  const jobBefore = await (await fetch(`${base}/api/jobs/${seed.jobId}`)).json();
  const manifestBefore = await readFile(join(seed.directory, 'manifest.json'));
  const zip = await exportJob(base, seed.jobId);
  const zipBefore = Buffer.from(await (await fetch(`${base}${zip.download_url}`)).arrayBuffer());
  const pixelResponse = await jsonRequest(base, `/api/jobs/${seed.jobId}/pixelate`, { object_id: seed.objectId, size: 16 });
  assert.equal(pixelResponse.status, 201);
  const pixel = await pixelResponse.json();
  const pixelBefore = Buffer.from(await (await fetch(`${base}${pixel.download_url}`)).arrayBuffer());
  const parameters = [
    {},
    { preset: 'retro-rpg', target_size: 64, num_inference_steps: 2, strength: 1, guidance_scale: 0, seed: 42, prompt: 'fixture knight', negative_prompt: '' },
    { preset: 'game-boy', target_size: 512, num_inference_steps: 50, strength: 0.02, guidance_scale: 20, seed: Number.MAX_SAFE_INTEGER },
  ];
  const snapshots = [];
  for (const requested of parameters) {
    const queued = await submit(base, { ...seed, jobId: seed.jobId.toUpperCase(), objectId: seed.objectId.toUpperCase() }, requested);
    const completed = await poll(base, location(seed.jobId, queued.stylization_id), 'completed');
    assert.deepEqual(completed.parameters, { ...defaults, ...requested });
    assert.equal(completed.progress, 100);
    assert.equal(completed.error, null);
    assert.deepEqual([completed.width, completed.height], [16, 12]);
    assert.ok(Number.isFinite(Date.parse(completed.created_at)));
    assert.ok(Date.parse(completed.updated_at) >= Date.parse(completed.created_at));
    assert.deepEqual(completed.result.original_size, [16, 12]);
    assert.deepEqual(completed.result.target_size, [completed.parameters.target_size, completed.parameters.target_size]);
    assert.equal(completed.result.seed, completed.parameters.seed);
    assert.equal(completed.result.nsfw_detected, false);
    assertNoPaths(completed, env.root);
    assert.equal(completed.preview_url, `${location(seed.jobId, completed.stylization_id)}/image`);
    assert.equal(completed.download_url, `${location(seed.jobId, completed.stylization_id)}/download`);
    const bytes = await readFile(join(seed.directory, 'stylizations', completed.stylization_id, 'image.png'));
    const pixels = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
    const source = await sharp(seed.png).raw().toBuffer();
    assert.deepEqual([pixels.info.width, pixels.info.height, pixels.info.channels], [16, 12, 4]);
    for (let offset = 3; offset < source.length; offset += 4) assert.equal(pixels.data[offset], source[offset]);
    assert.notDeepEqual(bytes, seed.png);
    snapshots.push({ completed, bytes });
  }
  assert.equal(new Set(snapshots.map(({ completed }) => completed.stylization_id)).size, parameters.length);
  const restarted = await env.serve();
  for (const { completed, bytes } of snapshots) {
    const status = await fetch(`${restarted}${location(seed.jobId, completed.stylization_id)}`);
    assertPrivate(status);
    assert.deepEqual(await status.json(), completed);
    for (const [url, disposition] of [[completed.preview_url, 'inline'], [completed.download_url, 'attachment']]) {
      const response = await fetch(`${restarted}${url}?path=manifest.json`);
      assert.equal(response.status, 200);
      assertPrivate(response);
      assert.equal(response.headers.get('content-type'), 'image/png');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.match(response.headers.get('content-disposition'), new RegExp(`^${disposition};`));
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    }
  }
  assert.deepEqual(await (await fetch(`${restarted}/api/jobs/${seed.jobId}`)).json(), jobBefore);
  assert.deepEqual(await readFile(join(seed.directory, 'manifest.json')), manifestBefore);
  assert.deepEqual(await readFile(join(seed.directory, 'extracted.png')), seed.png);
  const original = await fetch(`${restarted}/api/jobs/${seed.jobId}/objects/${seed.objectId}/download`);
  assert.equal(original.status, 200);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), seed.png);
  assert.deepEqual(Buffer.from(await (await fetch(`${restarted}${zip.download_url}`)).arrayBuffer()), zipBefore);
  assert.deepEqual(Buffer.from(await (await fetch(`${restarted}${pixel.download_url}`)).arrayBuffer()), pixelBefore);
  const afterZip = await exportJob(restarted, seed.jobId);
  const entries = await zipEntries(Buffer.from(await (await fetch(`${restarted}${afterZip.download_url}`)).arrayBuffer()), join(env.root, 'after.zip'));
  assert.deepEqual(entries, [[`${seed.objectId}.png`, seed.png.toString('base64')]]);
});

test('stylize rejects malformed bodies, parameters, private paths and cross-job object IDs', async t => {
  const env = await setup(t, { stylizePath() { assert.fail('Rejected request must not reach the fixture'); } });
  const seed = await env.seed();
  const other = await env.seed();
  const base = await env.serve();
  const path = `/api/jobs/${seed.jobId}/stylize`;
  const badParameters = [
    { preset: 'unknown' }, { preset: null }, { preset: 1 },
    ...[63, 513, 65, 64.5, '64', null].map(target_size => ({ target_size })),
    ...[1, 51, 2.5, '20', null].map(num_inference_steps => ({ num_inference_steps })),
    ...[0, -0.5, 1.1, '0.5', null].map(strength => ({ strength })),
    { num_inference_steps: 2, strength: 0.49 },
    ...[-1, 21, '7.5', null].map(guidance_scale => ({ guidance_scale })),
    ...[-1, 0.5, Number.MAX_SAFE_INTEGER + 1, '0', null].map(seed => ({ seed })),
    { prompt: null }, { prompt: [] }, { negative_prompt: false },
    { image_path: 'C:\\private\\source.png' }, { output_path: '/private/result.png' },
    { save_generated_path: '/private/raw.png' }, { include_base64: true },
    { parameters: { seed: 0 } }, { unknown: true },
  ];
  for (const body of [null, [], 'text', {}, { object_id: null }, { object_id: 'not-a-uuid' },
    ...badParameters.map(parameters => ({ object_id: seed.objectId, ...parameters }))]) {
    await assertError(await jsonRequest(base, path, body), env.root, 400);
  }
  for (const raw of ['{', `{"object_id":"${seed.objectId}","strength":1e999}`,
    `{"object_id":"${seed.objectId}","guidance_scale":1e999}`]) {
    await assertError(await fetch(`${base}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw,
    }), env.root, 400);
  }
  await assertError(await fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ object_id: seed.objectId }),
  }), env.root, 415);
  await assertError(await jsonRequest(base, path, { object_id: other.objectId }), env.root, 404);
  await assertError(await jsonRequest(base, `/api/jobs/${randomUUID()}/stylize`, { object_id: seed.objectId }), env.root, 404);
  for (const id of ['invalid', 'manifest.json', '..%5Cmanifest.json']) {
    await assertError(await jsonRequest(base, `/api/jobs/${id}/stylize`, { object_id: seed.objectId }), env.root, 400);
  }
  assert.deepEqual(await readFile(join(seed.directory, 'extracted.png')), seed.png);
  assert.deepEqual(await readdir(seed.directory), ['extracted.png', 'manifest.json']);
});

test('stylization requires a completed parent and a canonical existing source object', async t => {
  const env = await setup(t, { stylizePath() { assert.fail('Unsafe source must not reach the fixture'); } });
  const seed = await env.seed();
  const base = await env.serve();
  const path = `/api/jobs/${seed.jobId}/stylize`;
  // Initialize recovery before mutating status: these are unavailable jobs, not restart fixtures.
  await fetch(`${base}/api/jobs/${seed.jobId}`);
  for (const status of ['queued', 'processing', 'failed']) {
    await writeFile(join(seed.directory, 'manifest.json'), JSON.stringify({ ...seed.manifest, status }));
    await assertError(await jsonRequest(base, path, { object_id: seed.objectId }), env.root, 409);
  }
  for (const file of ['../private.png', 'C:\\private.png', 'mask.png', 'objects\\atr-4.png']) {
    await writeFile(join(seed.directory, 'manifest.json'), JSON.stringify({
      ...seed.manifest, objects: [{ ...seed.manifest.objects[0], file }],
    }));
    await assertError(await jsonRequest(base, path, { object_id: seed.objectId }), env.root);
  }
  await writeFile(join(seed.directory, 'manifest.json'), JSON.stringify(seed.manifest));
  await rm(join(seed.directory, 'extracted.png'));
  await assertError(await jsonRequest(base, path, { object_id: seed.objectId }), env.root, 404);
  await mkdir(join(seed.directory, 'extracted.png'));
  await assertError(await jsonRequest(base, path, { object_id: seed.objectId }), env.root, 404);
});

test('failed inference is private, unpublished, not retried after restart, and does not stall later requests', async t => {
  let fail = true;
  const env = await setup(t, { async stylizePath(args) {
    if (fail) {
      fail = false;
      await stylizeFixture(args);
      throw new Error(`private model failed at ${args.outputPath}`);
    }
    return stylizeFixture(args);
  } });
  const seed = await env.seed();
  const base = await env.serve();
  const first = await submit(base, seed);
  const failed = await poll(base, location(seed.jobId, first.stylization_id), 'failed');
  assert.equal(failed.error.code, 'STYLIZATION_FAILED');
  assertNoPaths(failed, env.root);
  await assertUnpublished(base, failed, env.root);
  await assert.rejects(readFile(join(seed.directory, 'stylizations', first.stylization_id, 'image.png')), { code: 'ENOENT' });
  const next = await submit(base, seed, { seed: 7 });
  await poll(base, location(seed.jobId, next.stylization_id), 'completed');
  const restarted = await env.serve();
  assert.deepEqual(await poll(restarted, location(seed.jobId, first.stylization_id), 'failed'), failed);
  await assertUnpublished(restarted, failed, env.root);
  assert.deepEqual(await readFile(join(seed.directory, 'extracted.png')), seed.png);
});

test('restart marks queued and processing snapshots interrupted without publishing partial PNGs or retrying', async t => {
  const env = await setup(t, { stylizePath() { assert.fail('Interrupted fixture must never be retried'); } });
  const seed = await env.seed();
  const interrupted = [];
  for (const status of ['queued', 'processing']) {
    const stylizationId = randomUUID();
    const directory = join(seed.directory, 'stylizations', stylizationId);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'image.tmp.png'), seed.png);
    // Even an orphan final filename is not a published result without a completed manifest.
    await writeFile(join(directory, 'image.png'), seed.png);
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({
      stylization_id: stylizationId, job_id: seed.jobId, object_id: seed.objectId,
      status, progress: status === 'queued' ? 0 : 10, parameters: defaults,
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', error: null,
    }));
    interrupted.push(stylizationId);
  }
  for (const base of [await env.serve(), await env.serve()]) {
    for (const id of interrupted) {
      const result = await poll(base, location(seed.jobId, id), 'failed');
      assert.equal(result.error.code, 'STYLIZATION_INTERRUPTED');
      assertNoPaths(result, env.root);
      await assertUnpublished(base, result, env.root);
      const stored = JSON.parse(await readFile(join(seed.directory, 'stylizations', id, 'manifest.json')));
      assert.equal(stored.status, 'failed');
      assert.equal(stored.error.code, 'STYLIZATION_INTERRUPTED');
    }
  }
});

test('malformed AI metadata and missing, corrupt, wrong-sized or alpha-modified output never publish', async t => {
  const cases = [
    ['null response', () => null],
    ['unsuccessful response', result => ({ ...result, status: 'failed' })],
    ['wrong original size', result => ({ ...result, original_size: [12, 16] })],
    ['wrong diffusion size', result => ({ ...result, target_size: [64, 64] })],
    ['invalid steps', result => ({ ...result, steps_executed: -1 })],
    ['invalid seed', result => ({ ...result, seed: -1 })],
    ['invalid prompt', result => ({ ...result, prompt: [] })],
    ['invalid negative prompt', result => ({ ...result, negative_prompt: null })],
    ['invalid safety metadata', result => ({ ...result, nsfw_detected: 'false' })],
    ['invalid elapsed time', result => ({ ...result, execution_time_seconds: -1 })],
    ['invalid strength', result => ({ ...result, strength: Infinity })],
    ['invalid guidance', result => ({ ...result, guidance_scale: NaN })],
    ['missing file', async (result, args) => { await rm(args.outputPath); return result; }],
    ['directory artifact', async (result, args) => { await rm(args.outputPath); await mkdir(args.outputPath); return result; }],
    ['non-PNG bytes', async (result, args) => { await writeFile(args.outputPath, 'private corrupt fixture'); return result; }],
    ['truncated PNG', async (result, args) => { await writeFile(args.outputPath, (await readFile(args.outputPath)).subarray(0, 48)); return result; }],
    ['RGB PNG', async (result, args) => {
      await sharp({ create: { width: 16, height: 12, channels: 3, background: 'blue' } }).png().toFile(args.outputPath);
      return result;
    }],
    ['wrong dimensions', async (result, args) => {
      await sharp({ create: { width: 12, height: 16, channels: 4, background: 'blue' } }).png().toFile(args.outputPath);
      return result;
    }],
    ['changed partial alpha', async (result, args) => {
      const { data, info } = await sharp(args.outputPath).raw().toBuffer({ resolveWithObject: true });
      data[7] = 2;
      await sharp(data, { raw: info }).png().toFile(args.outputPath);
      return result;
    }],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async t => {
      let fixtureReturned = false;
      const env = await setup(t, { async stylizePath(args) {
        const result = await corrupt(await stylizeFixture(args), args);
        fixtureReturned = true;
        return result;
      } });
      const seed = await env.seed();
      const base = await env.serve();
      const queued = await submit(base, seed);
      const failed = await poll(base, location(seed.jobId, queued.stylization_id), 'failed');
      assert.equal(fixtureReturned, true, 'Fixture must finish fault injection rather than fail during setup');
      assert.equal(failed.error.code, 'STYLIZATION_FAILED');
      assertNoPaths(failed, env.root);
      await assertUnpublished(base, failed, env.root);
      await assert.rejects(readFile(join(seed.directory, 'stylizations', queued.stylization_id, 'image.png')), { code: 'ENOENT' });
      assert.deepEqual(await readFile(join(seed.directory, 'extracted.png')), seed.png);
    });
  }
});

test('status and downloads require matching manifests and reject private IDs, missing snapshots and cross-job IDs', async t => {
  const env = await setup(t);
  const seed = await env.seed();
  const other = await env.seed();
  const base = await env.serve();
  const queued = await submit(base, seed);
  const completed = await poll(base, location(seed.jobId, queued.stylization_id), 'completed');
  const directory = join(seed.directory, 'stylizations', completed.stylization_id);
  const manifestPath = join(directory, 'manifest.json');
  const bytes = await readFile(manifestPath);
  const manifest = JSON.parse(bytes);
  for (const suffix of ['', '/image', '/download']) {
    for (const invalid of ['invalid', 'manifest.json', '..%5Cmanifest.json']) {
      await assertError(await fetch(`${base}${location(seed.jobId, invalid)}${suffix}`), env.root, 400);
    }
    await assertError(await fetch(`${base}${location(seed.jobId, randomUUID())}${suffix}`), env.root, 404);
    await assertError(await fetch(`${base}${location(other.jobId, completed.stylization_id)}${suffix}`), env.root, 404);
  }
  for (const changes of [
    { job_id: other.jobId }, { stylization_id: randomUUID() }, { object_id: other.objectId },
    { width: 0 }, { height: 12.5 }, { parameters: { ...defaults, target_size: 65 } },
  ]) {
    await writeFile(manifestPath, JSON.stringify({ ...manifest, ...changes }));
    for (const suffix of ['', '/image', '/download']) {
      await assertError(await fetch(`${base}${location(seed.jobId, completed.stylization_id)}${suffix}`), env.root);
    }
  }
  await writeFile(manifestPath, '{');
  await assertError(await fetch(`${base}${completed.download_url}`), env.root);
  await rm(manifestPath);
  await assertError(await fetch(`${base}${completed.download_url}`), env.root, 404);
  await writeFile(manifestPath, bytes);
  await rm(join(directory, 'image.png'));
  await assertError(await fetch(`${base}${completed.download_url}`), env.root, 404);
  await mkdir(join(directory, 'image.png'));
  await assertError(await fetch(`${base}${completed.preview_url}`), env.root, 404);
});

test('junctions cannot redirect source jobs, stylization storage or published snapshots', async t => {
  for (const target of ['job', 'stylizations', 'snapshot']) {
    await t.test(target, async t => {
      const env = await setup(t);
      const seed = await env.seed();
      const base = await env.serve();
      const queued = await submit(base, seed);
      const completed = await poll(base, location(seed.jobId, queued.stylization_id), 'completed');
      const path = target === 'job' ? seed.directory : target === 'stylizations'
        ? join(seed.directory, 'stylizations') : join(seed.directory, 'stylizations', completed.stylization_id);
      const outside = join(env.root, 'private-redirect');
      await rename(path, outside);
      await symlink(outside, path, 'junction');
      for (const suffix of ['', '/image', '/download']) {
        await assertError(await fetch(`${base}${location(seed.jobId, completed.stylization_id)}${suffix}`), env.root);
      }
      if (target !== 'snapshot') {
        const before = await readdir(outside);
        await assertError(await jsonRequest(base, `/api/jobs/${seed.jobId}/stylize`, { object_id: seed.objectId }), env.root);
        assert.deepEqual(await readdir(outside), before);
      }
    });
  }
});

test('published manifest and image file symlinks are rejected', async t => {
  for (const filename of ['manifest.json', 'image.png']) {
    await t.test(filename, async t => {
      const env = await setup(t);
      const seed = await env.seed();
      const base = await env.serve();
      const queued = await submit(base, seed);
      const completed = await poll(base, location(seed.jobId, queued.stylization_id), 'completed');
      const path = join(seed.directory, 'stylizations', completed.stylization_id, filename);
      const outside = join(env.root, `private-${filename}`);
      await rename(path, outside);
      try {
        await symlink(outside, path, 'file');
      } catch (error) {
        if (process.platform === 'win32' && error.code === 'EPERM') {
          t.skip('Windows file symlinks require Developer Mode or elevated privilege; junction coverage remains active');
          return;
        }
        throw error;
      }
      for (const suffix of ['/image', '/download']) {
        await assertError(await fetch(`${base}${location(seed.jobId, completed.stylization_id)}${suffix}`), env.root);
      }
      if (filename === 'manifest.json') {
        await assertError(await fetch(`${base}${location(seed.jobId, completed.stylization_id)}`), env.root);
      }
    });
  }
});

test('one FIFO serializes extraction and stylization in both directions while pending files stay private', async t => {
  const events = [];
  let extractionGate;
  let stylizationGate;
  const env = await setup(t, {
    async extractPath(args) {
      events.push('extraction started');
      await extractionGate.promise;
      const result = await extractFixture(args);
      events.push('extraction finished');
      return result;
    },
    async stylizePath(args) {
      events.push('stylization started');
      await stylizationGate.promise;
      const result = await stylizeFixture(args);
      events.push('stylization finished');
      return result;
    },
  });
  const seed = await env.seed();
  const base = await env.serve();
  extractionGate = env.gate();
  stylizationGate = env.gate();
  const form = new FormData();
  form.append('image', new Blob([seed.png], { type: 'image/png' }), 'fixture.png');
  const extractionResponse = await fetch(`${base}/api/jobs`, { method: 'POST', body: form });
  assert.equal(extractionResponse.status, 202);
  const extraction = await extractionResponse.json();
  await poll(base, `/api/jobs/${extraction.job_id}`, 'processing');
  const stylization = await submit(base, seed);
  const queued = await poll(base, location(seed.jobId, stylization.stylization_id), 'queued');
  assert.equal(queued.progress, 0);
  await assertUnpublished(base, queued, env.root);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.deepEqual(events, ['extraction started']);
  extractionGate.release();
  await poll(base, `/api/jobs/${extraction.job_id}`, 'completed');
  const processing = await poll(base, location(seed.jobId, stylization.stylization_id), 'processing');
  assert.equal(processing.progress, 10);
  await assertUnpublished(base, processing, env.root);
  extractionGate = env.gate();
  const secondResponse = await jsonRequest(base, '/api/jobs', { upload_id: extraction.upload_id });
  assert.equal(secondResponse.status, 202);
  const second = await secondResponse.json();
  await poll(base, `/api/jobs/${second.job_id}`, 'queued');
  const third = await submit(base, seed, { seed: 9 });
  await poll(base, location(seed.jobId, third.stylization_id), 'queued');
  assert.deepEqual(events, ['extraction started', 'extraction finished', 'stylization started']);
  stylizationGate.release();
  await poll(base, location(seed.jobId, stylization.stylization_id), 'completed');
  await poll(base, `/api/jobs/${second.job_id}`, 'processing');
  await poll(base, location(seed.jobId, third.stylization_id), 'queued');
  assert.deepEqual(events, ['extraction started', 'extraction finished', 'stylization started', 'stylization finished', 'extraction started']);
  extractionGate.release();
  await poll(base, `/api/jobs/${second.job_id}`, 'completed');
  await poll(base, location(seed.jobId, third.stylization_id), 'completed');
  assert.deepEqual(events, [
    'extraction started', 'extraction finished', 'stylization started', 'stylization finished',
    'extraction started', 'extraction finished', 'stylization started', 'stylization finished',
  ]);
});

test('a stylization timeout reports its dedicated safe error without publishing or blocking the FIFO', async t => {
  const env = await setup(t, { async stylizePath(args) {
    if (args.parameters.seed === 0) {
      const error = new Error(`private timeout at ${args.outputPath}`);
      error.name = 'TimeoutError';
      throw error;
    }
    return stylizeFixture(args);
  } });
  const seed = await env.seed();
  const base = await env.serve();
  const timedOut = await submit(base, seed);
  const successor = await submit(base, seed, { seed: 1 });
  const failed = await poll(base, location(seed.jobId, timedOut.stylization_id), 'failed');
  assert.equal(failed.error.code, 'STYLIZATION_TIMEOUT');
  assertNoPaths(failed, env.root);
  await assertUnpublished(base, failed, env.root);
  await poll(base, location(seed.jobId, successor.stylization_id), 'completed');
  const restarted = await env.serve();
  assert.deepEqual(await poll(restarted, location(seed.jobId, timedOut.stylization_id), 'failed'), failed);
});

test('source and inference output file symlinks cannot publish a stylization', async t => {
  for (const target of ['source', 'output']) {
    await t.test(target, async t => {
      let outside;
      const env = await setup(t, { async stylizePath(args) {
        assert.equal(target, 'output', 'A redirected source must not reach inference');
        const result = await stylizeFixture(args);
        await rename(args.outputPath, outside);
        await symlink(outside, args.outputPath, 'file');
        return result;
      } });
      const seed = await env.seed();
      outside = join(env.root, 'private-file.png');
      const probe = join(env.root, 'symlink-probe');
      try {
        await symlink(join(seed.directory, 'extracted.png'), probe, 'file');
      } catch (error) {
        if (process.platform === 'win32' && error.code === 'EPERM') {
          t.skip('Windows file symlinks require Developer Mode or elevated privilege; junction coverage remains active');
          return;
        }
        throw error;
      }
      await rm(probe);
      const base = await env.serve();
      if (target === 'source') {
        const source = join(seed.directory, 'extracted.png');
        await rename(source, outside);
        await symlink(outside, source, 'file');
        await assertError(await jsonRequest(base, `/api/jobs/${seed.jobId}/stylize`, { object_id: seed.objectId }), env.root);
        assert.deepEqual(await readFile(outside), seed.png);
      } else {
        const queued = await submit(base, seed);
        const failed = await poll(base, location(seed.jobId, queued.stylization_id), 'failed');
        assert.equal(failed.error.code, 'STYLIZATION_FAILED');
        await assertUnpublished(base, failed, env.root);
        const metadata = await sharp(outside).metadata();
        assert.deepEqual([metadata.width, metadata.height], [16, 12]);
        assert.deepEqual(await readFile(join(seed.directory, 'extracted.png')), seed.png);
      }
    });
  }
});
