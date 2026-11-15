import express from 'express';
import { createUploadRouter } from './uploads.js';

export function createApp({
  aiServiceUrl = new URL('http://127.0.0.1:8000'),
  aiTimeoutMs = 3000,
  uploadDir,
  maxUploadBytes = 10 * 1024 * 1024,
} = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'backend' });
  });

  app.get('/api/health/ai', async (_request, response) => {
    try {
      const upstream = await fetch(new URL('/health', aiServiceUrl), {
        signal: AbortSignal.timeout(aiTimeoutMs),
        redirect: 'error',
      });
      if (!upstream.ok) throw new Error('AI health returned a non-success response');
      const health = await upstream.json();
      if (health.status !== 'ok' || health.service !== 'ai-service' || health.model_loaded !== false) {
        throw new Error('AI health returned an unexpected M1 response');
      }
      response.json({ status: 'ok', service: 'ai-service', model_loaded: false });
    } catch (error) {
      console.error('AI health check failed:', error.name);
      response.status(503).json({
        status: 'unavailable',
        service: 'ai-service',
        message: 'Layanan AI tidak dapat dihubungi atau health check gagal.',
      });
    }
  });

  app.use('/api/uploads', createUploadRouter({ uploadDir, maxUploadBytes }));
  return app;
}
