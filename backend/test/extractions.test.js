import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../src/app.js';

async function serve(t, options) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  });
  return { base: `http://127.0.0.1:${server.address().port}`, server };
}

function form(buffer, type = 'image/png', name = 'input.png', field = 'image') {
  const body = new FormData();
  body.append(field, new Blob([buffer], { type }), name);
  return body;
}

class MockAiClient {
  constructor({ shouldFail = false, modelLoaded = true } = {}) {
    this.shouldFail = shouldFail;
    this.modelLoaded = modelLoaded;
  }

  async health() {
    if (this.shouldFail) throw new Error('AI connection refused');
    return { status: 'ok', service: 'ai-service', model_loaded: this.modelLoaded };
  }

  async extractPath({ imagePath, outputPath, saveMaskPath }) {
    if (this.shouldFail) throw new Error('Extraction failed');

    // Create a mock RGBA extracted PNG and mask
    const rgba = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 50, g: 150, b: 250, alpha: 1 } },
    }).png().toBuffer();
    const mask = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } },
    }).toColourspace('b-w').png().toBuffer();

    if (outputPath) await writeFile(outputPath, rgba);
    if (saveMaskPath) await writeFile(saveMaskPath, mask);

    return {
      status: 'success',
      original_size: [100, 100],
      categories_present: ['Upper-clothes', 'Pants'],
      category_pixel_counts: { Background: 2000, 'Upper-clothes': 4000, Pants: 4000 },
      execution_time_seconds: 1.82,
    };
  }

  async extractMultipart(args) {
    return this.extractPath(args);
  }
}

test('health check accepts model_loaded boolean values', async t => {
  // Test model_loaded: true
  const aiClientTrue = new MockAiClient({ modelLoaded: true });
  const { base: baseTrue } = await serve(t, { aiClient: aiClientTrue });
  const resTrue = await fetch(`${baseTrue}/api/health/ai`);
  assert.equal(resTrue.status, 200);
  assert.deepEqual(await resTrue.json(), {
    status: 'ok',
    service: 'ai-service',
    model_loaded: true,
  });

  // Test model_loaded: false
  const aiClientFalse = new MockAiClient({ modelLoaded: false });
  const { base: baseFalse } = await serve(t, { aiClient: aiClientFalse });
  const resFalse = await fetch(`${baseFalse}/api/health/ai`);
  assert.equal(resFalse.status, 200);
  assert.deepEqual(await resFalse.json(), {
    status: 'ok',
    service: 'ai-service',
    model_loaded: false,
  });

  // Test AI failure returns 503
  const aiClientFail = new MockAiClient({ shouldFail: true });
  const { base: baseFail } = await serve(t, { aiClient: aiClientFail });
  const resFail = await fetch(`${baseFail}/api/health/ai`);
  assert.equal(resFail.status, 503);
  const failData = await resFail.json();
  assert.equal(failData.status, 'unavailable');
});

test('end-to-end extraction workflow and assets serving', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'immo-extract-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const uploadDir = join(temporary, 'uploads');
  const aiClient = new MockAiClient({ modelLoaded: true });
  const { base } = await serve(t, { uploadDir, aiClient });

  // 1. Upload valid image
  const sampleImage = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 10, g: 120, b: 200, alpha: 1 } },
  }).png().toBuffer();

  const uploadRes = await fetch(`${base}/api/uploads`, {
    method: 'POST',
    body: form(sampleImage, 'image/png', 'sample.png'),
  });
  assert.equal(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  const uploadId = uploadData.upload_id;
  assert.ok(uploadId);

  // 2. Request GET extracted before extracting -> 404 NOT_EXTRACTED
  const preExtractRes = await fetch(`${base}/api/uploads/${uploadId}/extracted`);
  assert.equal(preExtractRes.status, 404);
  const preExtractData = await preExtractRes.json();
  assert.equal(preExtractData.error.code, 'NOT_EXTRACTED');

  // 3. Trigger extraction
  const extractRes = await fetch(`${base}/api/uploads/${uploadId}/extract`, {
    method: 'POST',
  });
  assert.equal(extractRes.status, 200);
  const extractData = await extractRes.json();
  assert.equal(extractData.status, 'extracted');
  assert.equal(extractData.upload_id, uploadId);
  assert.deepEqual(extractData.extraction.categories_present, ['Upper-clothes', 'Pants']);
  assert.equal(extractData.extraction.execution_time_seconds, 1.82);

  // 4. Verify manifest on disk
  const manifestRaw = await readFile(join(uploadDir, uploadId, 'manifest.json'), 'utf-8');
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.status, 'extracted');
  assert.equal(manifest.extracted_file, 'extracted.png');
  assert.equal(manifest.mask_file, 'mask.png');
  assert.ok(manifest.extracted_at);

  // 5. Retrieve extracted RGBA PNG
  const getExtractedRes = await fetch(`${base}/api/uploads/${uploadId}/extracted`);
  assert.equal(getExtractedRes.status, 200);
  assert.equal(getExtractedRes.headers.get('content-type'), 'image/png');
  const extractedBytes = Buffer.from(await getExtractedRes.arrayBuffer());
  const extractedMeta = await sharp(extractedBytes).metadata();
  assert.equal(extractedMeta.format, 'png');
  assert.equal(extractedMeta.channels, 4);

  // 6. Retrieve Mask PNG
  const getMaskRes = await fetch(`${base}/api/uploads/${uploadId}/mask`);
  assert.equal(getMaskRes.status, 200);
  assert.equal(getMaskRes.headers.get('content-type'), 'image/png');
  const maskBytes = Buffer.from(await getMaskRes.arrayBuffer());
  const maskMeta = await sharp(maskBytes).metadata();
  assert.equal(maskMeta.format, 'png');
});

test('extraction error handling and security validation', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'immo-extract-err-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const uploadDir = join(temporary, 'uploads');
  const aiClient = new MockAiClient({ modelLoaded: true });
  const { base } = await serve(t, { uploadDir, aiClient });

  // 1. Non-existent UUID
  const randomUuid = '11111111-2222-3333-4444-555555555555';
  const notFoundRes = await fetch(`${base}/api/uploads/${randomUuid}/extract`, { method: 'POST' });
  assert.equal(notFoundRes.status, 404);
  const notFoundData = await notFoundRes.json();
  assert.equal(notFoundData.error.code, 'UPLOAD_NOT_FOUND');

  // 2. Invalid UUID format
  const badIdRes = await fetch(`${base}/api/uploads/not-a-uuid/extract`, { method: 'POST' });
  assert.equal(badIdRes.status, 400);
  const badIdData = await badIdRes.json();
  assert.equal(badIdData.error.code, 'INVALID_UPLOAD_ID');

  // 3. AI Service failure during extraction -> 503
  const sampleImage = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 50, g: 50, b: 50 } },
  }).png().toBuffer();

  const failAiClient = new MockAiClient({ shouldFail: true });
  const { base: baseAiFail } = await serve(t, { uploadDir, aiClient: failAiClient });

  const upRes = await fetch(`${baseAiFail}/api/uploads`, {
    method: 'POST',
    body: form(sampleImage, 'image/png', 'test.png'),
  });
  const upId = (await upRes.json()).upload_id;

  const extractFailRes = await fetch(`${baseAiFail}/api/uploads/${upId}/extract`, { method: 'POST' });
  assert.equal(extractFailRes.status, 503);
  const extractFailData = await extractFailRes.json();
  assert.equal(extractFailData.error.code, 'AI_SERVICE_UNAVAILABLE');
});
