import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { writeZip } from '../src/zip-export.js';

async function createTempDirectory(prefix = 'immo-zip-test-') {
  return mkdtemp(join(tmpdir(), prefix));
}

async function verifyWithPythonZip(zipPath) {
  const script = `
import base64, json, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.testzip() is None, "ZIP CRC check failed"
    entries = []
    for info in z.infolist():
        entries.append({
            "filename": info.filename,
            "compress_type": info.compress_type,
            "file_size": info.file_size,
            "compress_size": info.compress_size,
            "data_b64": base64.b64encode(z.read(info)).decode()
        })
    print(json.dumps(entries))
`;
  const command = process.platform === 'win32' ? 'py' : 'python3';
  const args = process.platform === 'win32' ? ['-3', '-c', script, zipPath] : ['-c', script, zipPath];
  const output = execFileSync(command, args, { encoding: 'utf8' });
  return JSON.parse(output);
}

test('writeZip creates valid ZIP with STORE mode, valid size and sha256 checksum', async t => {
  const dir = await createTempDirectory();
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const file1 = join(dir, 'test1.png');
  const file2 = join(dir, 'test2.png');
  const buf1 = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
  }).png().toBuffer();
  const buf2 = await sharp({
    create: { width: 64, height: 48, channels: 4, background: { r: 0, g: 255, b: 128, alpha: 0.8 } },
  }).png().toBuffer();

  await writeFile(file1, buf1);
  await writeFile(file2, buf2);

  const outputPath = join(dir, 'output.zip');
  const result = await writeZip([
    { filePath: file1, filename: 'item-1.png' },
    { filePath: file2, filename: 'item-2.png' },
  ], outputPath);

  assert.ok(result);
  assert.equal(typeof result.size, 'number');
  assert.ok(result.size > 0);
  assert.equal(typeof result.sha256, 'string');
  assert.equal(result.sha256.length, 64);
  assert.match(result.sha256, /^[0-9a-f]{64}$/);

  // Verify file on disk matches returned size & SHA-256 exactly
  const zipBytes = await readFile(outputPath);
  assert.equal(zipBytes.length, result.size);
  const calculatedSha256 = createHash('sha256').update(zipBytes).digest('hex');
  assert.equal(calculatedSha256, result.sha256);

  // Verify internal entries with Python zipfile
  const entries = await verifyWithPythonZip(outputPath);
  assert.equal(entries.length, 2);

  const entry1 = entries.find(e => e.filename === 'item-1.png');
  const entry2 = entries.find(e => e.filename === 'item-2.png');
  assert.ok(entry1);
  assert.ok(entry2);

  // STORE mode (compress_type === 0 means ZIP_STORED, no compression overhead)
  assert.equal(entry1.compress_type, 0);
  assert.equal(entry2.compress_type, 0);
  assert.equal(entry1.file_size, buf1.length);
  assert.equal(entry1.compress_size, buf1.length);
  assert.equal(entry2.file_size, buf2.length);
  assert.equal(entry2.compress_size, buf2.length);

  // Exact byte payload match
  assert.deepEqual(Buffer.from(entry1.data_b64, 'base64'), buf1);
  assert.deepEqual(Buffer.from(entry2.data_b64, 'base64'), buf2);
});

test('writeZip fails entirely when an entry file does not exist', async t => {
  const dir = await createTempDirectory();
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const file1 = join(dir, 'exists.png');
  await writeFile(file1, Buffer.from('dummy png data'));

  const missingFile = join(dir, 'does-not-exist.png');
  const outputPath = join(dir, 'partial.zip');

  await assert.rejects(
    async () => {
      await writeZip([
        { filePath: file1, filename: 'exists.png' },
        { filePath: missingFile, filename: 'missing.png' },
      ], outputPath);
    },
    /ENOENT/
  );
});

test('writeZip handles concurrent exports to separate output paths safely', async t => {
  const dir = await createTempDirectory();
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const file1 = join(dir, 'asset1.png');
  const buf = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } },
  }).png().toBuffer();
  await writeFile(file1, buf);

  const tasks = Array.from({ length: 5 }, (_, i) => {
    const out = join(dir, `concurrent-${i}.zip`);
    return writeZip([{ filePath: file1, filename: `asset-${i}.png` }], out);
  });

  const results = await Promise.all(tasks);
  assert.equal(results.length, 5);
  for (let i = 0; i < 5; i++) {
    const res = results[i];
    assert.ok(res.size > 0);
    assert.match(res.sha256, /^[0-9a-f]{64}$/);
    const diskStat = await stat(join(dir, `concurrent-${i}.zip`));
    assert.equal(diskStat.size, res.size);
  }
});
