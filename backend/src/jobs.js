import express, { Router } from 'express';
import { createJobManager, JobError } from './job-manager.js';
import { createUploadRouter } from './uploads.js';

export function createJobRouter(options) {
  const router = Router();
  const manager = createJobManager(options);
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

  function serveObject(disposition) {
    return async (request, response, next) => {
      try {
        const { filePath, filename } = await manager.getObject(request.params.id, request.params.objectId);
        response.sendFile(filePath, {
          cacheControl: false,
          lastModified: false,
          acceptRanges: false,
          headers: {
            'Content-Type': 'image/png',
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
            ? new JobError(404, 'OBJECT_FILE_NOT_FOUND', 'File objek tidak ditemukan.')
            : error, response);
        });
      } catch (error) {
        fail(error, response);
      }
    };
  }

  router.get('/:id/objects/:objectId', serveObject('inline'));
  router.get('/:id/objects/:objectId/download', serveObject('attachment'));
  return router;
}
