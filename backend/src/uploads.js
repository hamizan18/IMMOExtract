import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';

const maxSide = 8192;
const maxPixels = 24_000_000;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const formats = {
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
  png: { mime: 'image/png', extension: 'png' },
  webp: { mime: 'image/webp', extension: 'webp' },
};

class UploadError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function detectFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.subarray(0, 8).equals(pngSignature)) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF'
      && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

async function validateImage(file) {
  const format = detectFormat(file.buffer);
  if (!format || file.mimetype !== formats[format].mime) {
    throw new UploadError(415, 'UNSUPPORTED_IMAGE', 'Isi gambar dan MIME harus sesuai: JPEG, PNG, atau WebP.');
  }
  // Some PNG decoders only expose the first APNG frame; reject animation explicitly.
  if (format === 'png') {
    for (let offset = 8; offset + 12 <= file.buffer.length;) {
      const length = file.buffer.readUInt32BE(offset);
      if (length > file.buffer.length - offset - 12) break; // Decoder rejects truncated chunks.
      const chunk = file.buffer.toString('ascii', offset + 4, offset + 8);
      if (chunk === 'acTL') {
        throw new UploadError(422, 'ANIMATED_IMAGE', 'Gunakan gambar statis, bukan animasi atau gambar multi-frame.');
      }
      if (chunk === 'IEND') break;
      offset += length + 12;
    }
  }

  try {
    const image = sharp(file.buffer, { limitInputPixels: maxPixels, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height) {
      throw new UploadError(422, 'INVALID_IMAGE', 'Gambar tidak valid atau rusak.');
    }
    if (metadata.width > maxSide || metadata.height > maxSide || metadata.width * metadata.height > maxPixels) {
      throw new UploadError(422, 'IMAGE_DIMENSIONS', 'Batas gambar: sisi 8192 piksel dan 24 megapiksel.');
    }
    if ((metadata.pages || 1) !== 1) {
      throw new UploadError(422, 'ANIMATED_IMAGE', 'Gunakan gambar statis, bukan animasi atau gambar multi-frame.');
    }
    // Metadata alone can accept truncated files. Decode all pixels before persisting.
    await image.stats();
    return { format, width: metadata.width, height: metadata.height, bytes: file.size };
  } catch (error) {
    if (error instanceof UploadError) throw error;
    throw new UploadError(422, 'INVALID_IMAGE', 'Gambar rusak, tidak dapat didekode, atau melebihi batas 24 megapiksel.');
  }
}

export function createUploadRouter({ uploadDir, maxUploadBytes }) {
  if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes < 1) {
    throw new Error('MAX_UPLOAD_BYTES must be a positive integer.');
  }
  const root = resolve(uploadDir || fileURLToPath(new URL('../../storage/uploads/', import.meta.url)));
  const router = Router();
  const receiveImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1, fields: 0, parts: 2, fieldNameSize: 100 },
    fileFilter: (_request, file, callback) => {
      if (!Object.values(formats).some(format => format.mime === file.mimetype)) {
        callback(new UploadError(415, 'UNSUPPORTED_IMAGE', 'Gunakan MIME image/jpeg, image/png, atau image/webp.'));
      } else {
        callback(null, true);
      }
    },
  }).single('image');

  router.post('/', (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (!request.is('multipart/form-data')) {
      next(new UploadError(415, 'MULTIPART_REQUIRED', 'Kirim satu file pada field image dengan multipart/form-data.'));
      return;
    }
    receiveImage(request, response, error => {
      if (!error) return next();
      if (error instanceof UploadError) return next(error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new UploadError(413, 'FILE_TOO_LARGE', 'Ukuran file melebihi batas upload server.'));
      }
      next(new UploadError(400, 'INVALID_MULTIPART', 'Multipart tidak valid; kirim hanya satu file pada field image, tanpa field tambahan.'));
    });
  }, async (request, response) => {
    if (!request.file || request.file.size === 0) {
      throw new UploadError(400, 'IMAGE_REQUIRED', 'Satu file gambar yang tidak kosong wajib disertakan.');
    }
    const image = await validateImage(request.file);
    const uploadId = randomUUID();
    const directory = join(root, uploadId);
    const filename = 'original.' + formats[image.format].extension;
    const manifest = {
      upload_id: uploadId,
      status: 'uploaded',
      image,
      file: filename,
      created_at: new Date().toISOString(),
    };
    await mkdir(root, { recursive: true, mode: 0o700 });
    await mkdir(directory, { mode: 0o700 });
    try {
      // Never use the client filename/path, even in metadata or error messages.
      await writeFile(join(directory, filename), request.file.buffer, { flag: 'wx', mode: 0o600 });
      await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
    response.status(201).json({ upload_id: uploadId, status: 'uploaded', image });
  });

  router.use((error, _request, response, _next) => {
    if (error instanceof UploadError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Upload storage failed:', error.code || error.name);
    response.status(500).json({ error: { code: 'UPLOAD_FAILED', message: 'Gambar tidak dapat disimpan. Periksa storage server.' } });
  });
  return router;
}
