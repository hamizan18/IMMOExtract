import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { AiClient } from '../src/ai-client.js';

// Local HTTP transport fixtures only: these do not run or validate an AI model.
async function serve(t, handler) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

const paths = { imagePath: '/private/source.png', outputPath: '/private/image.tmp.png' };


test('stylization uses a separate URL and longer deadline without changing health or extraction', { timeout: 10000 }, async t => {
  const extractionRequests = [];
  const extractionUrl = await serve(t, (request, response) => {
    extractionRequests.push(request.url);
    request.resume();
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/health') {
      response.end(JSON.stringify({ status: 'ok', service: 'ai-service', model_loaded: false }));
    } else {
      const timer = setTimeout(() => response.end('{"fixture":"extraction"}'), 600);
      response.on('close', () => clearTimeout(timer));
    }
  });
  const stylizationRequests = [];
  const stylizationUrl = await serve(t, (request, response) => {
    stylizationRequests.push(request.url);
    request.resume();
    const timer = setTimeout(() => {
      response.setHeader('Content-Type', 'application/json');
      response.end('{"fixture":"stylization"}');
    }, 600);
    response.on('close', () => clearTimeout(timer));
  });
  const client = new AiClient({
    aiServiceUrl: extractionUrl,
    timeoutMs: 200,
    stylizationServiceUrl: stylizationUrl,
    stylizationTimeoutMs: 3000,
  });
  assert.equal((await client.health()).model_loaded, false);
  await assert.rejects(client.extractPath(paths), error => error.name === 'TimeoutError');
  assert.deepEqual(await client.stylizePath({ ...paths, parameters: { preset: 'pixel-art' } }), {
    fixture: 'stylization',
  });
  assert.deepEqual(extractionRequests, ['/health', '/extract-path']);
  assert.deepEqual(stylizationRequests, ['/stylize-path']);
});

test('stylization deadline covers a stalled JSON response body', { timeout: 5000 }, async t => {
  let requests = 0;
  let bodyStarted = false;
  const url = await serve(t, (request, response) => {
    requests += 1;
    request.resume();
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write('{"fixture":');
    bodyStarted = true;
    // Deliberately never finish the body; teardown closes the connection.
  });
  const client = new AiClient({ aiServiceUrl: url, stylizationTimeoutMs: 500 });
  await assert.rejects(client.stylizePath(paths), error => {
    assert.equal(error.name, 'TimeoutError');
    assert.doesNotMatch(error.message, /private|source\.png|image\.tmp/);
    return true;
  });
  assert.equal(bodyStarted, true);
  assert.equal(requests, 1);
});

test('stylization forces server paths and disables base64 after spreading parameters', async t => {
  let received;
  let method;
  let contentType;
  const url = await serve(t, (request, response) => {
    method = request.method;
    contentType = request.headers['content-type'];
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      received = JSON.parse(body);
      response.end('{"fixture":"payload"}');
    });
  });
  const parameters = {
    preset: 'pixel-art', prompt: 'coat', negative_prompt: 'blur', target_size: 256,
    num_inference_steps: 20, strength: 0.5, guidance_scale: 7.5, seed: 0,
    image_path: '/attacker/input.png', output_path: '/attacker/output.png', include_base64: true,
  };
  const client = new AiClient({ aiServiceUrl: url });
  await client.stylizePath({ ...paths, parameters });
  assert.equal(method, 'POST');
  assert.equal(contentType, 'application/json');
  assert.equal(received.image_path, paths.imagePath);
  assert.equal(received.output_path, paths.outputPath);
  assert.equal(received.include_base64, false);
  assert.equal(parameters.include_base64, true);
});

test('non-2xx stylization errors preserve status but not private upstream details and never retry', async t => {
  let requests = 0;
  const url = await serve(t, (request, response) => {
    requests += 1;
    request.resume();
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end('{"detail":"failed at /private/secret.png"}');
  });
  const client = new AiClient({ aiServiceUrl: url });
  await assert.rejects(client.stylizePath(paths), error => {
    assert.equal(error.status, 503);
    assert.doesNotMatch(error.message, /private|secret\.png/);
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(requests, 1);
});

test('network failures are safe and do not retry stylization', async t => {
  let requests = 0;
  const url = await serve(t, (request) => {
    requests += 1;
    request.socket.destroy();
  });
  const client = new AiClient({ aiServiceUrl: url });
  await assert.rejects(client.stylizePath(paths), error => {
    assert.doesNotMatch(error.message, /private|source\.png|image\.tmp/);
    assert.equal(error.status, undefined);
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(requests, 1);
});
