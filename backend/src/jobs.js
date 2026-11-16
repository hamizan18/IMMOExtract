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
      // Filesystem references stay internal; download routes will resolve object IDs.
      const { mask_file, objects, ...publicJob } = job;
      response.json({ ...publicJob, objects: objects.map(({ file, ...object }) => object) });
    } catch (error) {
      fail(error, response);
    }
  });
  return router;
}
