import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { ZipArchive } from 'archiver';

export async function writeZip(files, outputPath) {
  // PNG is already compressed; STORE preserves bytes without redundant deflation.
  const archive = new ZipArchive({ store: true });
  const output = createWriteStream(outputPath, { flags: 'wx', mode: 0o600 });
  // A missing entry must fail the entire export, never silently produce a partial ZIP.
  archive.on('warning', error => archive.destroy(error));
  const written = pipeline(archive, output);
  try {
    for (const { filePath, filename } of files) {
      archive.file(filePath, { name: filename });
    }
    await Promise.all([archive.finalize(), written]);
  } catch (error) {
    archive.abort();
    archive.destroy();
    output.destroy();
    await written.catch(() => {});
    throw error;
  }
}
