import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { createApp } from '../src/app.js';

async function serve(t, options) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  return { base: `http://127.0.0.1:${server.address().port}`, server };
}

function form(buffer, type = 'image/png', name = 'input.png', field = 'image') {
  const body = new FormData();
  body.append(field, new Blob([buffer], { type }), name);
  return body;
}

async function post(base, body, headers) {
  const response = await fetch(`${base}/api/uploads`, { method: 'POST', body, headers });
  return { response, json: await response.json() };
}

function pngChunk(type, data) {
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
  return chunk;
}

test('private image upload over real HTTP', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'immo-upload-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const uploadDir = join(temporary, 'uploads');
  const { base, server } = await serve(t, { uploadDir });
  const makeImage = (width = 24, height = 16) => sharp({ create: {
    width, height, channels: 4, background: { r: 20, g: 160, b: 80, alpha: 0.5 },
  } });
  const fixtures = {
    png: await makeImage().png().toBuffer(),
    jpeg: await makeImage().jpeg().toBuffer(),
    webp: await makeImage().webp().toBuffer(),
  };
  const ids = new Set();

  for (const [format, mime, name, extension] of [
    ['png', 'image/png', '../../escape.png', 'png'],
    ['jpeg', 'image/jpeg', 'C:\\private\\escape.jpg', 'jpg'],
    ['webp', 'image/webp', '.env', 'webp'],
  ]) {
    await t.test(`accept ${format}, ignore client path, preserve private original`, async () => {
      const { response, json } = await post(base, form(fixtures[format], mime, name));
      assert.equal(response.status, 201, JSON.stringify(json));
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match(json.upload_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.equal(ids.has(json.upload_id), false);
      ids.add(json.upload_id);
      assert.deepEqual(json, {
        upload_id: json.upload_id, status: 'uploaded',
        image: { format, width: 24, height: 16, bytes: fixtures[format].length },
      });
      const directory = join(uploadDir, json.upload_id);
      assert.deepEqual((await readdir(directory)).sort(), ['manifest.json', `original.${extension}`]);
      assert.deepEqual(await readFile(join(directory, `original.${extension}`)), fixtures[format]);
      const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      assert.equal(manifest.upload_id, json.upload_id);
      assert.equal(manifest.status, 'uploaded');
      assert.equal(manifest.file, `original.${extension}`);
      assert.deepEqual(manifest.image, json.image);
      assert.equal(Number.isNaN(Date.parse(manifest.created_at)), false);
      assert.equal(JSON.stringify(manifest).includes(name), false);
      for (const url of [`/storage/uploads/${json.upload_id}/original.${extension}`, `/api/uploads/${json.upload_id}`]) {
        assert.equal((await fetch(base + url)).status, 404);
      }
      assert.deepEqual(await readdir(temporary), ['uploads']);
    });
  }

  const corrupt = Buffer.from(fixtures.png);
  for (let offset = 8; offset < corrupt.length;) {
    const length = corrupt.readUInt32BE(offset);
    if (corrupt.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      corrupt[offset + 8] ^= 0xff; // Invalid zlib stream, with a valid PNG chunk CRC.
      corrupt.writeUInt32BE(crc32(corrupt.subarray(offset + 4, offset + 8 + length)), offset + 8 + length);
      break;
    }
    offset += length + 12;
  }
  assert.equal((await sharp(corrupt).metadata()).width, 24);
  const animationControl = Buffer.alloc(8);
  animationControl.writeUInt32BE(1);
  const frameControl = Buffer.alloc(26);
  frameControl.writeUInt32BE(24, 4);
  frameControl.writeUInt32BE(16, 8);
  frameControl.writeUInt16BE(1, 20);
  frameControl.writeUInt16BE(10, 22);
  const apng = Buffer.concat([fixtures.png.subarray(0, 33), pngChunk('acTL', animationControl), pngChunk('fcTL', frameControl), fixtures.png.subarray(33)]);
  const frames = Buffer.alloc(32);
  for (let pixel = 0; pixel < 8; pixel++) {
    frames.set(pixel < 4 ? [255, 0, 0, 255] : [0, 0, 255, 255], pixel * 4);
  }
  const animatedWebp = await sharp(frames, { raw: {
    width: 2, height: 4, pageHeight: 2, channels: 4,
  } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(animatedWebp).metadata()).pages, 2);
  const duplicate = form(fixtures.png);
  duplicate.append('image', new Blob([fixtures.png], { type: 'image/png' }), 'second.png');
  const extraField = form(fixtures.png);
  extraField.append('path', '../escape');
  const cases = [
    ['missing file', new FormData(), undefined, 400],
    ['empty file', form(Buffer.alloc(0)), undefined, 400],
    ['fake PNG', form(Buffer.from('not a PNG')), undefined, 415],
    ['MIME mismatch', form(fixtures.png, 'image/jpeg'), undefined, 415],
    ['unsupported MIME', form(fixtures.png, 'image/svg+xml'), undefined, 415],
    ['decode corruption after valid metadata', form(corrupt), undefined, 422],
    ['side limit', form(await makeImage(8193, 1).png().toBuffer()), undefined, 422],
    ['pixel limit', form(await makeImage(6000, 4001).png().toBuffer()), undefined, 422],
    ['animated WebP', form(animatedWebp, 'image/webp'), undefined, 422],
    ['APNG', form(apng), undefined, 422],
    ['file above 10 MiB', form(Buffer.alloc(10 * 1024 * 1024 + 1)), undefined, 413],
    ['unexpected file field', form(fixtures.png, 'image/png', 'a.png', 'photo'), undefined, 400],
    ['multiple files', duplicate, undefined, 400],
    ['extra text field', extraField, undefined, 400],
    ['JSON request', '{}', { 'Content-Type': 'application/json' }, 415],
    ['missing boundary', 'broken', { 'Content-Type': 'multipart/form-data' }, 400],
    ['truncated multipart', '--cut\r\nContent-Disposition: form-data; name="image"; filename="a.png"\r\nContent-Type: image/png\r\n\r\npartial', { 'Content-Type': 'multipart/form-data; boundary=cut' }, 400],
  ];
  for (const [name, body, headers, expected] of cases) {
    await t.test(`reject ${name} without persisting or leaking paths`, async () => {
      const before = await readdir(uploadDir);
      const { response, json } = await post(base, body, headers);
      assert.equal(response.status, expected, JSON.stringify(json));
      assert.equal(typeof json.error.code, 'string');
      assert.equal(typeof json.error.message, 'string');
      assert.equal(JSON.stringify(json).includes(temporary), false);
      assert.equal(JSON.stringify(json).includes('escape'), false);
      assert.equal('stack' in json.error, false);
      assert.deepEqual(await readdir(uploadDir), before);
      assert.deepEqual(await (await fetch(base + '/api/health')).json(), { status: 'ok', service: 'backend' });
    });
  }

  await t.test('accept exact configured byte limit, reject one byte more', async subtest => {
    const limited = await serve(subtest, { uploadDir: join(temporary, 'limited'), maxUploadBytes: fixtures.png.length });
    assert.equal((await post(limited.base, form(fixtures.png))).response.status, 201);
    assert.equal((await post(limited.base, form(Buffer.concat([fixtures.png, Buffer.from([0])])))).response.status, 413);
  });

  await t.test('aborted multipart leaves no stored files and backend stays healthy', { timeout: 10000 }, async subtest => {
    const before = await readdir(uploadDir);
    let incoming;
    const received = new Promise(resolve => {
      const listener = request => {
        if (request.originalUrl !== '/api/uploads?abort-test') return;
        server.off('request', listener);
        incoming = request;
        resolve();
      };
      server.on('request', listener);
    });
    const request = http.request(base + '/api/uploads?abort-test', { method: 'POST', headers: {
      'Content-Type': 'multipart/form-data; boundary=abort', 'Content-Length': '1000000',
    } });
    request.on('error', () => {}); // The client intentionally destroys its connection.
    subtest.after(() => request.destroy());
    request.write('--abort\r\nContent-Disposition: form-data; name="image"; filename="a.png"\r\nContent-Type: image/png\r\n\r\npartial');
    await received;
    const aborted = new Promise(resolve => incoming.once('aborted', resolve));
    request.destroy();
    await aborted;
    assert.deepEqual(await readdir(uploadDir), before);
    assert.equal((await fetch(base + '/api/health')).status, 200);
  });

  await t.test('storage failure returns safe JSON and backend stays healthy', async subtest => {
    const blocked = join(temporary, 'not-a-directory');
    await writeFile(blocked, 'test-owned blocking file');
    const unavailable = await serve(subtest, { uploadDir: blocked });
    const { response, json } = await post(unavailable.base, form(fixtures.png));
    assert.equal(response.status, 500);
    assert.equal(json.error.code, 'UPLOAD_FAILED');
    assert.equal(JSON.stringify(json).includes(temporary), false);
    assert.equal((await fetch(unavailable.base + '/api/health')).status, 200);
    assert.equal(await readFile(blocked, 'utf8'), 'test-owned blocking file');
  });
});
