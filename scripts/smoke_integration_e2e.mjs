/**
 * IMMOExtract — Full End-to-End Live Integration Test (Express <-> FastAPI).
 *
 * 1. Boots FastAPI AI Service on 127.0.0.1:8005.
 * 2. Boots Express Backend on 127.0.0.1:3005 pointing to AI Service.
 * 3. Verifies Express /api/health/ai returns model_loaded: true.
 * 4. Uploads synthetic fixture image to POST /api/uploads.
 * 5. Calls POST /api/uploads/:uploadId/extract to trigger real CPU human parsing.
 * 6. Fetches GET /api/uploads/:uploadId/extracted and verifies RGBA PNG channels & size.
 * 7. Fetches GET /api/uploads/:uploadId/mask.
 * 8. Cleans up processes and storage safely.
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from '../backend/node_modules/sharp/dist/index.mjs';
import { createApp } from '../backend/src/app.js';

async function waitForHttp(url, maxAttempts = 30, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const body = await res.json();
        if (body.model_loaded === true) return body;
      }
    } catch {
      // Retry
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  console.log('=== Starting Full E2E Integration Smoke Test ===');
  const tempDir = await mkdtemp(join(tmpdir(), 'immo-e2e-'));
  const uploadDir = join(tempDir, 'uploads');

  const pythonExe = join(process.cwd(), 'ai-service', '.venv-test', 'Scripts', 'python.exe');
  const aiDir = join(process.cwd(), 'ai-service');
  const aiPort = 8005;
  const backendPort = 3005;

  console.log(`1. Launching FastAPI AI service on port ${aiPort}...`);
  const aiProc = spawn(
    pythonExe,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(aiPort), '--app-dir', aiDir],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  let backendServer = null;

  try {
    const health = await waitForHttp(`http://127.0.0.1:${aiPort}/health`, 30, 500);
    console.log('PASS: FastAPI is alive and model is loaded:', health);

    console.log(`2. Starting Express backend on port ${backendPort}...`);
    const app = createApp({
      aiServiceUrl: new URL(`http://127.0.0.1:${aiPort}`),
      aiTimeoutMs: 15000,
      uploadDir,
    });

    backendServer = app.listen(backendPort, '127.0.0.1');
    await new Promise(resolve => backendServer.on('listening', resolve));
    console.log(`PASS: Express backend listening on http://127.0.0.1:${backendPort}`);

    // Check Express proxy health
    const expressHealthRes = await fetch(`http://127.0.0.1:${backendPort}/api/health/ai`);
    assert.equal(expressHealthRes.status, 200);
    const expressHealthData = await expressHealthRes.json();
    assert.equal(expressHealthData.status, 'ok');
    assert.equal(expressHealthData.service, 'ai-service');
    assert.equal(expressHealthData.model_loaded, true);
    console.log('PASS: Express /api/health/ai proxied correctly with model_loaded: true');

    // Create synthetic fixture image (200x300, human figure)
    const fixtureBuffer = await sharp({
      create: { width: 200, height: 300, channels: 3, background: { r: 240, g: 240, b: 240 } },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="200" height="300">
              <ellipse cx="100" cy="40" rx="30" ry="25" fill="#3c2814"/>
              <rect x="50" y="70" width="100" height="100" fill="#1e50b4"/>
              <rect x="55" y="170" width="40" height="100" fill="#282832"/>
              <rect x="105" y="170" width="40" height="100" fill="#282832"/>
            </svg>`
          ),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    console.log('3. Uploading synthetic human image to Express...');
    const form = new FormData();
    form.append('image', new Blob([fixtureBuffer], { type: 'image/png' }), 'person.png');

    const uploadRes = await fetch(`http://127.0.0.1:${backendPort}/api/uploads`, {
      method: 'POST',
      body: form,
    });
    assert.equal(uploadRes.status, 201);
    const uploadData = await uploadRes.json();
    const uploadId = uploadData.upload_id;
    assert.ok(uploadId);
    console.log(`PASS: Image uploaded, uploadId: ${uploadId}`);

    console.log('4. Calling POST /api/uploads/:uploadId/extract to run AI extraction...');
    const extractStartTime = Date.now();
    const extractRes = await fetch(`http://127.0.0.1:${backendPort}/api/uploads/${uploadId}/extract`, {
      method: 'POST',
    });
    assert.equal(extractRes.status, 200);
    const extractData = await extractRes.json();
    const totalElapsedMs = Date.now() - extractStartTime;

    assert.equal(extractData.status, 'extracted');
    assert.equal(extractData.upload_id, uploadId);
    assert.deepEqual(extractData.extraction.original_size, [200, 300]);
    assert.ok(extractData.extraction.categories_present.length > 0);
    console.log(
      `PASS: AI Extraction completed in ${(totalElapsedMs / 1000).toFixed(2)}s (reported AI: ${extractData.extraction.execution_time_seconds}s), ` +
      `categories: ${JSON.stringify(extractData.extraction.categories_present)}`
    );

    console.log('5. Fetching extracted RGBA PNG from Express...');
    const getExtractedRes = await fetch(`http://127.0.0.1:${backendPort}/api/uploads/${uploadId}/extracted`);
    assert.equal(getExtractedRes.status, 200);
    assert.equal(getExtractedRes.headers.get('content-type'), 'image/png');
    const extractedBuffer = Buffer.from(await getExtractedRes.arrayBuffer());
    const extractedMeta = await sharp(extractedBuffer).metadata();
    assert.equal(extractedMeta.format, 'png');
    assert.equal(extractedMeta.width, 200);
    assert.equal(extractedMeta.height, 300);
    assert.equal(extractedMeta.channels, 4);
    console.log('PASS: Extracted PNG verified: 200x300, 4 channels (RGBA).');

    console.log('6. Fetching mask PNG from Express...');
    const getMaskRes = await fetch(`http://127.0.0.1:${backendPort}/api/uploads/${uploadId}/mask`);
    assert.equal(getMaskRes.status, 200);
    assert.equal(getMaskRes.headers.get('content-type'), 'image/png');
    const maskBuffer = Buffer.from(await getMaskRes.arrayBuffer());
    const maskMeta = await sharp(maskBuffer).metadata();
    assert.equal(maskMeta.format, 'png');
    assert.equal(maskMeta.width, 200);
    assert.equal(maskMeta.height, 300);
    console.log('PASS: Mask PNG verified: 200x300.');

    console.log('=== FULL E2E INTEGRATION SMOKE TEST SUCCEEDED 100% ===');
  } finally {
    if (backendServer) {
      backendServer.close();
    }
    aiProc.kill();
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(err => {
  console.error('FAIL: E2E Smoke test encountered error:', err);
  process.exit(1);
});
