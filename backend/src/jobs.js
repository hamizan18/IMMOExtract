import express, { Router } from 'express';
import { createJobManager, JobError } from './job-manager.js';
import { createUploadRouter } from './uploads.js';

export function createJobRouter(options) {
  const router = Router();
  const manager = createJobManager(options);
  router.manager = manager;
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store, private');
    next();
  });

  function fail(error, response) {
    if (error instanceof JobError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
    } else {
      console.error('Job request failed:', error.code || error.name);
      response.status(500).json({ error: { code: 'JOB_FAILED', message: 'Job tidak dapat dibaca atau disimpan.' } });
    }
  }

  async function submit(uploadId, response) {
    try {
      const job = await manager.create(uploadId);
      response.location(`/api/jobs/${job.job_id}`).status(202).json(job);
    } catch (error) {
      fail(error, response);
    }
  }

  router.post('/', express.json({ limit: '2kb' }), (request, response, next) => {
    if (request.is('multipart/form-data')) return next();
    if (!request.is('application/json')) {
      response.status(415).json({ error: { code: 'JOB_INPUT_REQUIRED', message: 'Kirim JSON upload_id atau multipart image.' } });
      return;
    }
    const body = request.body;
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'upload_id')) {
      response.status(400).json({ error: { code: 'INVALID_JOB_INPUT', message: 'JSON harus berisi hanya upload_id.' } });
      return;
    }
    return submit(body.upload_id, response);
  });
  router.post('/:id/exports', express.json({ limit: '2kb' }), async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({ error: { code: 'EXPORT_INPUT_REQUIRED', message: 'Kirim JSON all atau object_ids.' } });
      return;
    }
    try {
      const result = await manager.createExport(request.params.id, request.body);
      const downloadUrl = `/api/jobs/${result.job_id}/exports/${result.export_id}/download`;
      response.location(downloadUrl).status(201).json({ ...result, download_url: downloadUrl });
    } catch (error) {
      fail(error, response);
    }
  });
  router.get('/:id/exports/:exportId', async (request, response) => {
    try {
      const result = await manager.getExportManifest(request.params.id, request.params.exportId);
      const downloadUrl = `/api/jobs/${result.job_id}/exports/${result.export_id}/download`;
      response.json({ ...result, download_url: downloadUrl });
    } catch (error) {
      fail(error, response);
    }
  });
  router.post('/:id/spritesheet', express.json({ limit: '4kb' }), async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({ error: { code: 'SPRITESHEET_INPUT_REQUIRED', message: 'Kirim JSON all atau object_ids.' } });
      return;
    }
    try {
      const result = await manager.createSpritesheet(request.params.id, request.body);
      const imageUrl = `/api/jobs/${result.job_id}/spritesheets/${result.spritesheet_id}`;
      const downloadUrl = `${imageUrl}/download`;
      const atlasUrl = `${imageUrl}/atlas`;
      const atlasDownloadUrl = `${atlasUrl}/download`;
      response.location(imageUrl).status(201).json({
        ...result,
        image_url: imageUrl,
        download_url: downloadUrl,
        atlas_url: atlasUrl,
        atlas_download_url: atlasDownloadUrl,
      });
    } catch (error) {
      fail(error, response);
    }
  });
  router.post('/:id/pixelate', express.json({ limit: '2kb' }), async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({ error: { code: 'PIXELATION_INPUT_REQUIRED', message: 'Kirim JSON object_id dan size.' } });
      return;
    }
    try {
      const result = await manager.createPixelation(request.params.id, request.body);
      const previewUrl = `/api/jobs/${result.job_id}/pixelations/${result.pixelation_id}`;
      response.location(previewUrl).status(201).json({
        ...result, preview_url: previewUrl, download_url: `${previewUrl}/download`,
      });
    } catch (error) {
      fail(error, response);
    }
  });
  function publicStylization(snapshot) {
    const statusUrl = `/api/jobs/${snapshot.job_id}/stylizations/${snapshot.stylization_id}`;
    return snapshot.status === 'completed'
      ? { ...snapshot, preview_url: `${statusUrl}/image`, download_url: `${statusUrl}/download` }
      : snapshot;
  }

  router.post('/:id/stylize', express.json({ limit: '8kb' }), async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({ error: { code: 'STYLIZATION_INPUT_REQUIRED', message: 'Kirim JSON object_id dan parameter stylization.' } });
      return;
    }
    try {
      const snapshot = await manager.createStylization(request.params.id, request.body);
      response.location(`/api/jobs/${snapshot.job_id}/stylizations/${snapshot.stylization_id}`)
        .status(202).json(publicStylization(snapshot));
    } catch (error) {
      fail(error, response);
    }
  });
  router.get('/:id/stylizations/:stylizationId', async (request, response) => {
    try {
      response.json(publicStylization(await manager.getStylization(request.params.id, request.params.stylizationId)));
    } catch (error) {
      fail(error, response);
    }
  });
  router.use((error, _request, response, _next) => {
    const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
    response.status(status).json({ error: { code: 'INVALID_JOB_REQUEST', message: 'Permintaan job tidak dapat diproses.' } });
  });
  router.use(createUploadRouter({ ...options, onUploaded: submit }));

  router.get('/:id', async (request, response) => {
    try {
      const job = await manager.get(request.params.id);
      // Filesystem references stay internal; asset routes resolve manifest object IDs.
      const { mask_file, objects, ...publicJob } = job;
      response.json({ ...publicJob, objects: objects.map(({ file, ...object }) => object) });
    } catch (error) {
      fail(error, response);
    }
  });

  router.put('/:id/objects/:objectId', express.raw({ type: ['image/png', 'application/octet-stream'], limit: '10mb' }), async (request, response) => {
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      response.status(400).json({ error: { code: 'PNG_BUFFER_REQUIRED', message: 'Kirim payload biner PNG dengan Content-Type image/png.' } });
      return;
    }
    try {
      const result = await manager.updateObject(request.params.id, request.params.objectId, request.body);
      response.json(result);
    } catch (error) {
      fail(error, response);
    }
  });

  function serveFile(resolveFile, contentType, disposition, missingCode) {
    return async (request, response, next) => {
      try {
        const { filePath, filename } = await resolveFile(request.params);
        response.sendFile(filePath, {
          cacheControl: false,
          lastModified: false,
          acceptRanges: false,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `${disposition}; filename="${filename}"`,
            'X-Content-Type-Options': 'nosniff',
          },
        }, error => {
          if (!error) return;
          if (response.headersSent) return next(error);
          response.removeHeader('Content-Disposition');
          response.removeHeader('Content-Type');
          response.removeHeader('Content-Length');
          fail(error.code === 'ENOENT' || error.status === 404
            ? new JobError(404, missingCode, 'File hasil tidak ditemukan.')
            : error, response);
        });
      } catch (error) {
        fail(error, response);
      }
    };
  }

  const objectFile = params => manager.getObject(params.id, params.objectId);
  router.get('/:id/objects/:objectId', serveFile(objectFile, 'image/png', 'inline', 'OBJECT_FILE_NOT_FOUND'));
  router.get('/:id/objects/:objectId/download', serveFile(objectFile, 'image/png', 'attachment', 'OBJECT_FILE_NOT_FOUND'));
  router.get('/:id/exports/:exportId/download', serveFile(
    params => manager.getExport(params.id, params.exportId), 'application/zip', 'attachment', 'EXPORT_NOT_FOUND',
  ));
  const pixelationFile = params => manager.getPixelation(params.id, params.pixelationId);
  router.get('/:id/pixelations/:pixelationId', serveFile(pixelationFile, 'image/png', 'inline', 'PIXELATION_NOT_FOUND'));
  router.get('/:id/pixelations/:pixelationId/download', serveFile(pixelationFile, 'image/png', 'attachment', 'PIXELATION_NOT_FOUND'));
  const stylizationFile = params => manager.getStylizationFile(params.id, params.stylizationId);
  router.get('/:id/stylizations/:stylizationId/image', serveFile(stylizationFile, 'image/png', 'inline', 'STYLIZATION_NOT_FOUND'));
  router.get('/:id/stylizations/:stylizationId/download', serveFile(stylizationFile, 'image/png', 'attachment', 'STYLIZATION_NOT_FOUND'));
  const spritesheetFile = params => manager.getSpritesheetFile(params.id, params.spritesheetId);
  router.get('/:id/spritesheets/:spritesheetId', serveFile(spritesheetFile, 'image/png', 'inline', 'SPRITESHEET_NOT_FOUND'));
  router.get('/:id/spritesheets/:spritesheetId/download', serveFile(spritesheetFile, 'image/png', 'attachment', 'SPRITESHEET_NOT_FOUND'));
  const spritesheetAtlas = params => manager.getSpritesheetAtlas(params.id, params.spritesheetId);
  router.get('/:id/spritesheets/:spritesheetId/atlas', serveFile(spritesheetAtlas, 'application/json', 'inline', 'ATLAS_NOT_FOUND'));
  router.get('/:id/spritesheets/:spritesheetId/atlas/download', serveFile(spritesheetAtlas, 'application/json', 'attachment', 'ATLAS_NOT_FOUND'));
  return router;
}
