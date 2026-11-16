/**
 * IMMOExtract — Extractions Router (Express).
 *
 * Exposes:
 * - POST /api/uploads/:uploadId/extract: Triggers AI human parsing extraction.
 * - GET  /api/uploads/:uploadId/extracted: Serves transparent extracted RGBA PNG.
 * - GET  /api/uploads/:uploadId/mask: Serves binary foreground alpha mask PNG.
 */

import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ExtractionError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createExtractionRouter({ uploadDir, aiClient }) {
  if (!aiClient || typeof aiClient.extractPath !== 'function') {
    throw new Error('Valid aiClient instance must be provided.');
  }

  const root = resolve(uploadDir || fileURLToPath(new URL('../../storage/uploads/', import.meta.url)));
  const router = Router();

  function resolveUploadDirectory(uploadId) {
    if (!UUID_REGEX.test(uploadId)) {
      throw new ExtractionError(400, 'INVALID_UPLOAD_ID', 'ID upload harus berupa UUID v4 yang valid.');
    }
    const targetDir = resolve(join(root, uploadId));
    // Path traversal defense
    if (!targetDir.startsWith(root) || targetDir === root) {
      throw new ExtractionError(403, 'ACCESS_DENIED', 'Akses ke direktori ditolak.');
    }
    return targetDir;
  }

  async function loadManifest(directory) {
    const manifestPath = join(directory, 'manifest.json');
    try {
      const raw = await readFile(manifestPath, 'utf-8');
      return { manifest: JSON.parse(raw), manifestPath };
    } catch {
      throw new ExtractionError(404, 'UPLOAD_NOT_FOUND', 'Upload tidak ditemukan.');
    }
  }

  // POST /api/uploads/:uploadId/extract
  router.post('/:uploadId/extract', async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    const { uploadId } = request.params;

    try {
      const directory = resolveUploadDirectory(uploadId);
      const { manifest, manifestPath } = await loadManifest(directory);

      if (!manifest.file) {
        throw new ExtractionError(500, 'CORRUPT_MANIFEST', 'Manifest upload tidak memiliki referensi file input.');
      }

      const inputFilePath = join(directory, manifest.file);
      try {
        await stat(inputFilePath);
      } catch {
        throw new ExtractionError(404, 'INPUT_FILE_NOT_FOUND', 'File gambar input tidak ditemukan di storage.');
      }

      const extractedFilename = 'extracted.png';
      const maskFilename = 'mask.png';
      const outputRgbaPath = join(directory, extractedFilename);
      const outputMaskPath = join(directory, maskFilename);

      let aiResult;
      try {
        // Attempt fast zero-copy path-based extraction first
        aiResult = await aiClient.extractPath({
          imagePath: inputFilePath,
          outputPath: outputRgbaPath,
          saveMaskPath: outputMaskPath,
          includeBase64: false,
        });
      } catch (pathError) {
        // Fallback to multipart if path cannot be accessed across processes
        try {
          const fileBuffer = await readFile(inputFilePath);
          aiResult = await aiClient.extractMultipart({
            buffer: fileBuffer,
            filename: manifest.file,
            mimeType: manifest.image?.format === 'png' ? 'image/png' : 'image/jpeg',
            outputPath: outputRgbaPath,
            saveMaskPath: outputMaskPath,
            includeBase64: false,
          });
        } catch (multipartError) {
          console.error('AI Service extraction failed:', multipartError.message);
          throw new ExtractionError(
            503,
            'AI_SERVICE_UNAVAILABLE',
            'Layanan AI ekstraksi tidak dapat dihubungi atau gagal memproses gambar.'
          );
        }
      }

      // Update manifest with extraction metadata
      manifest.status = 'extracted';
      manifest.extracted_file = extractedFilename;
      manifest.mask_file = maskFilename;
      manifest.extraction = {
        original_size: aiResult.original_size,
        categories_present: aiResult.categories_present,
        category_pixel_counts: aiResult.category_pixel_counts,
        execution_time_seconds: aiResult.execution_time_seconds,
      };
      manifest.extracted_at = new Date().toISOString();

      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });

      response.status(200).json({
        upload_id: uploadId,
        status: 'extracted',
        extraction: manifest.extraction,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/uploads/:uploadId/extracted
  router.get('/:uploadId/extracted', async (request, response, next) => {
    response.set('Cache-Control', 'no-store, private');
    const { uploadId } = request.params;

    try {
      const directory = resolveUploadDirectory(uploadId);
      const { manifest } = await loadManifest(directory);

      if (!manifest.extracted_file) {
        throw new ExtractionError(404, 'NOT_EXTRACTED', 'Gambar belum diekstrak. Jalankan ekstraksi terlebih dahulu.');
      }

      const filePath = join(directory, manifest.extracted_file);
      try {
        await stat(filePath);
      } catch {
        throw new ExtractionError(404, 'EXTRACTED_FILE_NOT_FOUND', 'File hasil ekstraksi tidak ditemukan di storage.');
      }

      response.sendFile(filePath, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'inline; filename="extracted.png"',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/uploads/:uploadId/mask
  router.get('/:uploadId/mask', async (request, response, next) => {
    response.set('Cache-Control', 'no-store, private');
    const { uploadId } = request.params;

    try {
      const directory = resolveUploadDirectory(uploadId);
      const { manifest } = await loadManifest(directory);

      if (!manifest.mask_file) {
        throw new ExtractionError(404, 'NOT_EXTRACTED', 'Mask belum diekstrak. Jalankan ekstraksi terlebih dahulu.');
      }

      const filePath = join(directory, manifest.mask_file);
      try {
        await stat(filePath);
      } catch {
        throw new ExtractionError(404, 'MASK_FILE_NOT_FOUND', 'File mask tidak ditemukan di storage.');
      }

      response.sendFile(filePath, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'inline; filename="mask.png"',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.use((error, _request, response, _next) => {
    if (error instanceof ExtractionError) {
      response.status(error.status).json({
        error: { code: error.code, message: error.message },
      });
      return;
    }
    console.error('Extraction handler unexpected error:', error);
    response.status(500).json({
      error: { code: 'EXTRACTION_FAILED', message: 'Terjadi kesalahan internal pada proses ekstraksi.' },
    });
  });

  return router;
}
